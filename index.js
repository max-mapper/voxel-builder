var THREE = window.three = require('three')
var raf = require('raf')
var container
var output = document.querySelector('#output')
var camera, scene, renderer, brush
var projector, plane
var mouse2D, mouse3D, raycaster, objectHovered
var isShiftDown = false, isCtrlDown = false, isMouseDown = false
var onMouseDownPosition = new THREE.Vector2(), onMouseDownPhi = 60, onMouseDownTheta = 45
var radius = 1600, theta = 90, phi = 60
target = new THREE.Vector3( 0, 200, 0 )
var color = 0
var colors = [ 0xDF1F1F, 0xDFAF1F, 0x80DF1F, 0x1FDF50, 0x1FDFDF, 0x1F4FDF, 0x7F1FDF, 0xDF1FAF, 0xEFEFEF, 0x303030 ]
var cube = new THREE.CubeGeometry( 50, 50, 50 )

init()
raf(window).on('data', render)

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

	renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false )
	renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false )
	renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false )
	document.addEventListener( 'keydown', onDocumentKeyDown, false )
	document.addEventListener( 'keyup', onDocumentKeyUp, false )

	//

	window.addEventListener( 'resize', onWindowResize, false )
	
	if ( window.location.hash ) buildFromHash()

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

      	var newMaterial = new THREE.MeshBasicMaterial({ color: colors[color], wireframe: true })
      	var voxel = new THREE.Mesh( cube, newMaterial )
      	voxel.position.copy(brush.position)
      	voxel.matrixAutoUpdate = false
      	voxel.updateMatrix()
      	scene.add( voxel )
			}

		}

	}
	
	updateHash()
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


function buildFromHash() {

	var hash = window.location.hash.substr( 1 ),
	version = hash.substr( 0, 2 );

	if ( version == "A/" ) {

		var current = { x: 0, y: 0, z: 0, c: 0 }
		var data = decode( hash.substr( 2 ) );
		var i = 0, l = data.length;

		while ( i < l ) {

			var code = data[ i ++ ].toString( 2 );

			if ( code.charAt( 1 ) == "1" ) current.x += data[ i ++ ] - 32;
			if ( code.charAt( 2 ) == "1" ) current.y += data[ i ++ ] - 32;
			if ( code.charAt( 3 ) == "1" ) current.z += data[ i ++ ] - 32;
			if ( code.charAt( 4 ) == "1" ) current.c += data[ i ++ ] - 32;
			if ( code.charAt( 0 ) == "1" ) {
				var voxel = new THREE.Mesh( cube, new THREE.MeshBasicMaterial({ color: colors[current.c], wireframe: true }));
				voxel.position.x = current.x * 50 + 25;
				voxel.position.y = current.y * 50 + 25;
				voxel.position.z = current.z * 50 + 25;
				voxel.overdraw = true;
				scene.add( voxel );

			}
		}

	} else {

		var data = decode( hash );

		for ( var i = 0; i < data.length; i += 4 ) {
      
			var voxel = new THREE.Mesh( cube, new THREE.MeshBasicMaterial({ color: colors[ data[ i + 3 ] ], wireframe: true }) );
			voxel.position.x = ( data[ i ] - 20 ) * 25;
			voxel.position.y = ( data[ i + 1 ] + 1 ) * 25;
			voxel.position.z = ( data[ i + 2 ] - 20 ) * 25;
			voxel.overdraw = true;
			scene.add( voxel );

		}

	}

	updateHash();

}

function updateHash() {

	var data = [], voxels = [], code
	var current = { x: 0, y: 0, z: 0, c: 0 }
	var last = { x: 0, y: 0, z: 0, c: 0 }
	for ( var i in scene.children ) {

		var object = scene.children[ i ]

		if ( object instanceof THREE.Mesh && object !== plane && object !== brush ) {

			current.x = ( object.position.x - 25 ) / 50;
			current.y = ( object.position.y - 25 ) / 50;
			current.z = ( object.position.z - 25 ) / 50;

			current.c = colors.indexOf( object.material.color.getHex() & 0xffffff );
      voxels.push({x: current.x, y: current.y + 1, z: current.z , c: current.c + 1})
      
			code = 0;

			if ( current.x != last.x ) code += 1000;
			if ( current.y != last.y ) code += 100;
			if ( current.z != last.z ) code += 10;
			if ( current.c != last.c ) code += 1;

			code += 10000;

			data.push( parseInt( code, 2 ) );

			if ( current.x != last.x ) {

				data.push( current.x - last.x + 32 );
				last.x = current.x;

			}

			if ( current.y != last.y ) {

				data.push( current.y - last.y + 32 );
				last.y = current.y;

			}

			if ( current.z != last.z ) {

				data.push( current.z - last.z + 32 );
				last.z = current.z;

			}

			if ( current.c != last.c ) {

				data.push( current.c - last.c + 32 );
				last.c = current.c;

			}

		}

	}
  if (voxels.length > 0) updateFunction(voxels)
	data = encode( data );
	window.location.hash = "A/" + data;
}

function updateFunction(voxels) {
  var dimensions = getDimensions(voxels)
  voxels = voxels.map(function(v) { return [v.x, v.y, v.z, v.c]})
  var funcString = "var voxels = " + JSON.stringify(voxels) + "<br>"
  funcString += 'var dimensions = ' + JSON.stringify(dimensions) + '<br>'
  funcString += 'var size = game.cubeSize<br>'
  funcString += 'voxels.map(function(voxel) {<br>' +
    '&nbsp;&nbsp;game.setBlock({x: position.x + voxel[0] * size, y: position.y + voxel[1] * size, z: position.z + voxel[2] * size}, voxel[3])<br>' +
  '})'
  output.innerHTML = funcString
}

function getDimensions(voxels) {
  var low = [0, 0, 0], high = [0, 0, 0]
  voxels.map(function(voxel) {
    if (voxel.x < low[0]) low[0] = voxel.x
    if (voxel.x > high[0]) high[0] = voxel.x
    if (voxel.y < low[1]) low[1] = voxel.y
    if (voxel.y > high[1]) high[1] = voxel.y
    if (voxel.z < low[2]) low[2] = voxel.z
    if (voxel.z > high[2]) high[2] = voxel.z
  })
  return [ high[0]-low[0], high[1]-low[1], high[2]-low[2] ]
}

// https://gist.github.com/665235

function decode( string ) {

	var output = [];
	string.split('').forEach( function ( v ) { output.push( "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf( v ) ); } );
	return output;

}

function encode( array ) {

	var output = "";
	array.forEach( function ( v ) { output += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt( v ); } );
	return output;

}

function save() {

	window.open( renderer.domElement.toDataURL('image/png'), 'mywindow' )

}

function render() {
	camera.lookAt( target )
	raycaster = projector.pickingRay( mouse2D.clone(), camera )
	renderer.render( scene, camera )
}