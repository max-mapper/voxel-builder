var THREE = window.three = require('three')
var container
var camera, scene, renderer, brush
var projector, plane
var mouse2D, mouse3D, raycaster, objectHovered
var isShiftDown = false, isCtrlDown = false, isMouseDown = false
var onMouseDownPosition = new THREE.Vector2(), onMouseDownPhi = 60, onMouseDownTheta = 45
var radius = 1600, theta = 90, phi = 60
target = new THREE.Vector3( 0, 200, 0 )
var color = 0
var colors = [ 0xDF1F1F, 0xDFAF1F, 0x80DF1F, 0x1FDF50, 0x1FDFDF, 0x1F4FDF, 0x7F1FDF, 0xDF1FAF, 0xEFEFEF, 0x303030 ]

init()
animate()

function init() {

	container = document.createElement( 'div' )
	document.body.appendChild( container )

	camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 )
	camera.position.x = radius * Math.sin( theta * Math.PI / 360 ) * Math.cos( phi * Math.PI / 360 )
	camera.position.y = radius * Math.sin( phi * Math.PI / 360 )
	camera.position.z = radius * Math.cos( theta * Math.PI / 360 ) * Math.cos( phi * Math.PI / 360 )

	scene = new THREE.Scene()

	// Grid

	var size = 500, step = 50

	var geometry = new THREE.Geometry()

	for ( var i = - size; i <= size; i += step ) {

		geometry.vertices.push( new THREE.Vector3( - size, 0, i ) )
		geometry.vertices.push( new THREE.Vector3(   size, 0, i ) )

		geometry.vertices.push( new THREE.Vector3( i, 0, - size ) )
		geometry.vertices.push( new THREE.Vector3( i, 0,   size ) )

	}

	var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2 } )

	var line = new THREE.Line( geometry, material )
	line.type = THREE.LinePieces
	scene.add( line )

	// Plane

	projector = new THREE.Projector()

	plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() )
	plane.rotation.x = - Math.PI / 2
	plane.visible = false
	scene.add( plane )

	mouse2D = new THREE.Vector3( 0, 10000, 0.5 )

  // Brush
  
  var cube = new THREE.CubeGeometry( 50, 50, 50 )
	var cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, wireframeLinewidth: 2 })
	brush = new THREE.Mesh( cube, cubeMaterial)
	brush.position.y = 2000
	brush.overdraw = true
	scene.add( brush )

	// Lights

	var ambientLight = new THREE.AmbientLight( 0x606060 )
	scene.add( ambientLight )

	var directionalLight = new THREE.DirectionalLight( 0xffffff )
	directionalLight.position.x = Math.random() - 0.5
	directionalLight.position.y = Math.random() - 0.5
	directionalLight.position.z = Math.random() - 0.5
	directionalLight.position.normalize()
	scene.add( directionalLight )

	var directionalLight = new THREE.DirectionalLight( 0x808080 )
	directionalLight.position.x = Math.random() - 0.5
	directionalLight.position.y = Math.random() - 0.5
	directionalLight.position.z = Math.random() - 0.5
	directionalLight.position.normalize()
	scene.add( directionalLight )

	renderer = new THREE.CanvasRenderer()
	renderer.setSize( window.innerWidth, window.innerHeight )

	container.appendChild(renderer.domElement)

	document.addEventListener( 'mousemove', onDocumentMouseMove, false )
	document.addEventListener( 'mousedown', onDocumentMouseDown, false )
	document.addEventListener( 'mouseup', onDocumentMouseUp, false )
	document.addEventListener( 'keydown', onDocumentKeyDown, false )
	document.addEventListener( 'keyup', onDocumentKeyUp, false )

	//

	window.addEventListener( 'resize', onWindowResize, false )

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()

	renderer.setSize( window.innerWidth, window.innerHeight )

}

function interact() {
  var intersects = raycaster.intersectObjects( scene.children )

	if ( objectHovered ) {
		objectHovered.material.opacity = 1
		objectHovered = null
	}

	if ( intersects.length > 0 ) {
		var intersect = intersects[ 0 ].object !== brush ? intersects[ 0 ] : intersects[ 1 ]
		if ( intersect ) {
			if ( isShiftDown ) {
				if ( intersect.object != plane ) {
					objectHovered = intersect.object
					objectHovered.material.opacity = 0.5
					return
				}
			} else {
			  var normal = intersect.face.normal.clone()
				normal.applyMatrix4( intersect.object.matrixRotationWorld )
				var position = new THREE.Vector3().addVectors( intersect.point, normal )
				brush.position.x = Math.floor( position.x / 50 ) * 50 + 25
				brush.position.y = Math.floor( position.y / 50 ) * 50 + 25
				brush.position.z = Math.floor( position.z / 50 ) * 50 + 25
				return
			}
		}
	}
	brush.position.y = 2000
}

function onDocumentMouseMove( event ) {

	event.preventDefault()
	
	if ( isMouseDown ) {

		theta = - ( ( event.clientX - onMouseDownPosition.x ) * 0.5 ) + onMouseDownTheta
		phi = ( ( event.clientY - onMouseDownPosition.y ) * 0.5 ) + onMouseDownPhi

		phi = Math.min( 180, Math.max( 0, phi ) )

		camera.position.x = radius * Math.sin( theta * Math.PI / 360 ) * Math.cos( phi * Math.PI / 360 )
		camera.position.y = radius * Math.sin( phi * Math.PI / 360 )
		camera.position.z = radius * Math.cos( theta * Math.PI / 360 ) * Math.cos( phi * Math.PI / 360 )
		camera.updateMatrix()

	}

	mouse2D.x = ( event.clientX / window.innerWidth ) * 2 - 1
	mouse2D.y = - ( event.clientY / window.innerHeight ) * 2 + 1

  interact()
}

function onDocumentMouseDown( event ) {
	event.preventDefault()
	isMouseDown = true
	onMouseDownTheta = theta
	onMouseDownPhi = phi
	onMouseDownPosition.x = event.clientX
	onMouseDownPosition.y = event.clientY
}

function onDocumentMouseUp( event ) {
	event.preventDefault()
	isMouseDown = false
	onMouseDownPosition.x = event.clientX - onMouseDownPosition.x
	onMouseDownPosition.y = event.clientY - onMouseDownPosition.y
	
	if ( onMouseDownPosition.length() > 5 ) return
	
  var intersects = raycaster.intersectObjects( scene.children )
	if ( intersects.length > 0 ) {

		var intersect = intersects[ 0 ].object !== brush ? intersects[ 0 ] : intersects[ 1 ]

		if ( intersect ) {

			if ( isShiftDown ) {

				if ( intersect.object != plane ) {

					scene.remove( intersect.object );

				}

			} else {

      	var geometry = new THREE.CubeGeometry( 50, 50, 50 )
      	var newMaterial = new THREE.MeshBasicMaterial({ color: colors[color], wireframe: true })
      	var voxel = new THREE.Mesh( geometry, newMaterial )
      	voxel.position.copy(brush.position)
      	voxel.matrixAutoUpdate = false
      	voxel.updateMatrix()
      	scene.add( voxel )
			}

		}

	}

	render()
	interact()
}

function onDocumentKeyDown( event ) {

	switch( event.keyCode ) {

		case 16: isShiftDown = true; break
		case 17: isCtrlDown = true; break

	}

}

function onDocumentKeyUp( event ) {

	switch( event.keyCode ) {

		case 16: isShiftDown = false; break
		case 17: isCtrlDown = false; break

	}
}

function save() {

	window.open( renderer.domElement.toDataURL('image/png'), 'mywindow' )

}

function animate() {
	requestAnimationFrame( animate )
	render()
}

function render() {
	camera.lookAt( target )
	raycaster = projector.pickingRay( mouse2D.clone(), camera )
	renderer.render( scene, camera )
}