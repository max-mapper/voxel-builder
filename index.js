var THREE = require('three')
var raf = require('raf')
var lsb = require('lsb')
var voxelShare = require('voxel-share')

module.exports = function() {
  var container
  var camera, renderer, brush
  var projector, plane, scene, grid, shareDialog
  var mouse2D, mouse3D, raycaster, objectHovered
  var isShiftDown = false, isCtrlDown = false, isMouseDown = false, isAltDown = false
  var onMouseDownPosition = new THREE.Vector2(), onMouseDownPhi = 60, onMouseDownTheta = 45
  var radius = 1600, theta = 90, phi = 60
  var target = new THREE.Vector3( 0, 200, 0 )
  var color = 0
  var CubeMaterial = THREE.MeshBasicMaterial
  var cube = new THREE.CubeGeometry( 50, 50, 50 )
  var wireframe = true, fill = true
  
  var colors = ['2ECC71', '3498DB', '34495E', 'E67E22', 'ECF0F1'].map(function(c) { return hex2rgb(c) })
  for( var c = 0; c < 5; c++ ) {
    addColorToPalette(c)
  }

  showWelcome()
  init()
  raf(window).on('data', render)
  
  function showWelcome() {
    var seenWelcome = localStorage.getItem('seenWelcome')
    if (seenWelcome) return
    $('#welcome').modal()
    localStorage.setItem('seenWelcome', true)
  }

  exports.viewInstructions = function() {
    $('#welcome').modal()
  }
  
  exports.share = function() {
    var fakeGame = {
      renderer: {
        render: function() {}
      },
      scene: {},
      camera: {},
      element: getExportCanvas(800, 600)
    }
    shareDialog = voxelShare({
      game: fakeGame,
      // api v3 key from imgur.com
      key: 'cda7e5d26c82bea',
      message: 'Check out my voxel critter! Made with ' + window.location.href,
      hashtags: 'voxelcritter'
    })
    $('#share .modal-footer .btn-primary').remove()
    $('#share').modal()
    var modalBody = $('#share .modal-body')
    modalBody.html('This photo will be attached to your tweet after you fill out a tweet form.')
    shareDialog.open(modalBody[0])
    $('#share .voxel-share button').addClass('btn btn-primary').prependTo($('#share .modal-footer'))
    shareDialog.close = function() {
      $('#share .modal-footer .btn-cancel').click()
    }
  }
  
  // bunny
  exports.loadExample = function() {
    window.location.replace( '#A/bfhkSfdihfShaefShahfShahhYfYfYfSfSfSfYhYhYhahjSdechjYhYhYhadfQUhchfYhYhSfYdQYhYhaefQYhYhYhYhSjcchQYhYhYhYhSfSfWehSfUhShecheQYhYhYhYhachYhYhafhYhahfShXdfhShcihYaVhfYmfbihhQYhYhYhaddQShahfYhYhYhShYfYfYfafhQUhchfYhYhYhShechdUhUhcheUhUhcheUhUhcheUhUhcheUhUhWehUhUhcfeUhUhcfeUhUhcfeUhUhcfeUhUhehehUhUhcheUhUhcheUhUhcheUhUhWehUhUhcfeUhUhcfeUhUhcfeUhUhcfeUhUhWffUhWheQYhYhYhYhachQYiYhYhShYfYfYfYfShYhYhYhYhadeakiQSfSfSfUfShShShUfSfSfSfUfShShShUfSfSfSfcakQShShWfeQShShWeeQUhWfhUhShUfWjhQUfUfUfWfdQShShShWkhQUfUfUfchjQYhYhYhYhUfYfYfYeYhUfYhYhcifQYfYfYfYeQcffQYhYhYiYiYfcdhckjUfUfZfeYcciefhleiYhYcYhcfhYhcfhYhcifYhcfhYhcfhYhYcYh')
    buildFromHash()
  }
  
  exports.browseTwitter = function() {
    $('#browse').modal()
    var content = $('#browse .demo-browser-content')
    content.html('')
    var links = $("iframe:first").contents().find('.tweet .e-entry-title a')
    links = links.filter(function(i, link) {
      var url = $(link).attr('data-expanded-url')
      if (!url) return
      if (url.match(/imgur/)) return true
      return false
    })
    links = links.map(function(i, link) {
      var url = $(link).attr('data-expanded-url')
      content.append('<img src="' + url + '"/>')
    })
  }
  
  exports.getProxyImage = function(imgURL, cb) {
    var withoutHTTP = imgURL.split('http://')[1]
    var proxyURL = 'http://corsproxy.com/' + withoutHTTP // until imgur gets CORS on GETs
    var img = new Image()
    img.crossOrigin = ''
    img.src = proxyURL
    img.onload = function() {
      cb(img)
    }
  }

  exports.export = function() {
    var voxels = updateHash()
    if (voxels.length === 0) return
    window.open(exportImage(800, 600).src, 'voxel-painter-window')
  }

  exports.reset = function() {
    window.location.replace('#/')
    scene.children
      .filter(function(el) { return el.isVoxel })
      .map(function(mesh) { scene.remove(mesh) })
  }

  exports.setColor = function(idx) {
    $('i[data-color="' + idx + '"]').click()
  }

  exports.setWireframe = function(bool) {
    wireframe = bool
    scene.children
      .filter(function(el) { return el.isVoxel })
      .map(function(mesh) { mesh.children[1].visible = bool })
  }

  exports.setFill = function(bool) {
    fill = bool
    scene.children
      .filter(function(el) { return el.isVoxel })
      .map(function(mesh) { mesh.children[0].material.visible = bool })
  }

  exports.showGrid = function(bool) {
    grid.material.visible = bool
  }

  exports.setShadows = function(bool) {
    if (bool) CubeMaterial = THREE.MeshLambertMaterial
    else CubeMaterial = THREE.MeshBasicMaterial
    scene.children
      .filter(function(el) { return el !== brush && el.isVoxel })
      .map(function(cube) { scene.remove(cube) })
    buildFromHash()
  }

  function addVoxel() {
    if (brush.position.y === 2000) return
    var materials = [
      new CubeMaterial( { vertexColors: THREE.VertexColors } ),
      new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } )
    ]
    materials[0].color.setRGB( colors[color][0], colors[color][1], colors[color][2] )
    var voxel = THREE.SceneUtils.createMultiMaterialObject( cube, materials )
    voxel.isVoxel = true
    voxel.overdraw = true
    voxel.position.copy(brush.position)
    voxel.matrixAutoUpdate = false
    voxel.updateMatrix()
    scene.add( voxel )
  }

  function v2h(value) {
    value = parseInt(value).toString(16)
    return value.length < 2 ? '0' + value : value
  }
  function rgb2hex(rgb) {
    return v2h( rgb[ 0 ] * 255 ) + v2h( rgb[ 1 ] * 255 ) + v2h( rgb[ 2 ] * 255 );
  }

  function hex2rgb(hex) {
    if(hex[0]=='#') hex = hex.substr(1)
    return [parseInt(hex.substr(0,2), 16)/255, parseInt(hex.substr(2,2), 16)/255, parseInt(hex.substr(4,2), 16)/255]
  }

  function scale( x, fromLow, fromHigh, toLow, toHigh ) {
    return ( x - fromLow ) * ( toHigh - toLow ) / ( fromHigh - fromLow ) + toLow
  }

  function addColorToPalette(idx) {
    // add a button to the group
    var colorBox = $('i[data-color="' + idx + '"]')
    if(!colorBox.length) {
      var base = $('.colorAddButton')
      var clone = base.clone()
      clone.removeClass('colorAddButton')
      clone.addClass('colorPickButton')
      colorBox = clone.find('.colorAdd')
      colorBox.removeClass('colorAdd')
      colorBox.addClass('color')
      colorBox.attr('data-color',idx)
      colorBox.text('')
      base.before(clone)
      clone.click(pickColor)
      clone.on("contextmenu", changeColor)
    }

    colorBox.parent().attr('data-color','#'+rgb2hex(colors[idx]))
    colorBox.css('background',"#"+rgb2hex(colors[idx]))

    if( color == idx && brush )
      brush.children[0].material.color.setRGB(colors[idx][0], colors[idx][1], colors[idx][2])
  }

  function zoom(delta) {
    var origin = {x: 0, y: 0, z: 0}
    var distance = camera.position.distanceTo(origin)
    var tooFar = distance  > 2000
    var tooClose = distance < 300
    if (delta > 0 && tooFar) return
    if (delta < 0 && tooClose) return
    radius = distance // for mouse drag calculations to be correct
    camera.translateZ( delta )
  }

  function addColor(e) {
    //add new color
    colors.push([0.0,0.0,0.0])
    idx = colors.length-1

    color = idx;

    addColorToPalette(idx)

    updateHash()

    updateColor(idx)
  }

  function updateColor(idx) {
    color = idx
    var picker = $('i[data-color="' + idx + '"]').parent().colorpicker('show')

    picker.on('changeColor', function(e) {
      colors[idx]=hex2rgb(e.color.toHex())
      addColorToPalette(idx)

      // todo:  better way to update color of existing blocks
      scene.children
        .filter(function(el) { return el.isVoxel })
        .map(function(mesh) { scene.remove(mesh) })
      buildFromHash('A')
    })
    picker.on('hide', function(e) {
      // todo:  add a better remove for the colorpicker.
      picker.unbind('click.colorpicker')
    })
  }

  function changeColor(e) {
    var target = $(e.currentTarget)
    var idx = +target.find('.color').attr('data-color')
    updateColor(idx)
    return false // eat the event
  }

  function pickColor(e) {
    var target = $(e.currentTarget)
    var idx = +target.find('.color').attr('data-color')

    color = idx
    brush.children[0].material.color.setRGB(colors[idx][0], colors[idx][1], colors[idx][2])
  }
  
  function bindEventsAndPlugins() {
    
    $('#browse img').live('click', function(ev) {
      var url = $(ev.target).attr('src')
      $('#browse button').click()
      exports.getProxyImage(url, function(img) {
        importImage(img)
      })
    })
    
    $('#shareButton').click(function(e) {
      e.preventDefault()
      exports.share()
      return false
    })

    $('.colorPickButton').click(pickColor)
    $('.colorPickButton').on("contextmenu", changeColor)
    $('.colorAddButton').click(addColor)

    $('.toggle input').click(function(e) {
      // setTimeout ensures this fires after the input value changes
      setTimeout(function() {
        var el = $(e.target).parent()
        var state = !el.hasClass('toggle-off')
        exports[el.attr('data-action')](state)
      }, 0)
    })

    var actionsMenu = $(".actionsMenu")
    actionsMenu.dropkick({
      change: function(value, label) {
        if (value === 'noop') return
        if (value in exports) exports[value]()
        setTimeout(function() {
          actionsMenu.dropkick('reset')
        }, 0)
      }
    })
    
    // Todo list
    $(".todo li").click(function() {
        $(this).toggleClass("todo-done");
    });

    // Init tooltips
    $("[data-toggle=tooltip]").tooltip("show");

    // Init tags input
    $("#tagsinput").tagsInput();

    // Init jQuery UI slider
    $("#slider").slider({
        min: 1,
        max: 4,
        value: 1,
        orientation: "horizontal",
        range: "min",
    });

    // JS input/textarea placeholder
    $("input, textarea").placeholder();

    // Make pagination demo work
    $(".pagination a").click(function() {
        if (!$(this).parent().hasClass("previous") && !$(this).parent().hasClass("next")) {
            $(this).parent().siblings("li").removeClass("active");
            $(this).parent().addClass("active");
        }
    });

    $(".btn-group a").click(function() {
        $(this).siblings().removeClass("active");
        $(this).addClass("active");
    });

    // Disable link click not scroll top
    $("a[href='#']").click(function() {
        return false
    });

  }

  function init() {
    
    bindEventsAndPlugins()
    setupImageDropImport(document.body)

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
    grid = line
    scene.add( line )

    // Plane

    projector = new THREE.Projector()

    plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() )
    plane.rotation.x = - Math.PI / 2
    plane.visible = false
    scene.add( plane )

    mouse2D = new THREE.Vector3( 0, 10000, 0.5 )

    // Brush
    var brushMaterials = [
      new CubeMaterial( { vertexColors: THREE.VertexColors, opacity: 0.5 } ),
      new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } )
    ]
    brushMaterials[0].color.setRGB(colors[0][0], colors[0][1], colors[0][2])
    brush = THREE.SceneUtils.createMultiMaterialObject( cube, brushMaterials )
    brush.isBrush = true
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
    window.addEventListener('DOMMouseScroll', mousewheel, false);
    window.addEventListener('mousewheel', mousewheel, false);

    function mousewheel( event ) {
      zoom(event.wheelDeltaY)
    }

    window.addEventListener( 'resize', onWindowResize, false )

    if ( window.location.hash ) buildFromHash()

  }

  function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize( window.innerWidth, window.innerHeight )

  }

  function getIntersecting() {
    var intersectable = scene.children.map(function(c) { if (c.isVoxel) return c.children[0]; return c; })
    var intersections = raycaster.intersectObjects( intersectable )
    if (intersections.length > 0) {
      var intersect = intersections[ 0 ].object.isBrush ? intersections[ 1 ] : intersections[ 0 ]
      return intersect
    }
  }

  function interact() {
    if (typeof raycaster === 'undefined') return

    if ( objectHovered ) {
      objectHovered.material.opacity = 1
      objectHovered = null
    }

    var intersect = getIntersecting()

    if ( intersect ) {
      var normal = intersect.face.normal.clone()
      normal.applyMatrix4( intersect.object.matrixRotationWorld )
      var position = new THREE.Vector3().addVectors( intersect.point, normal )
      var newCube = [Math.floor( position.x / 50 ), Math.floor( position.y / 50 ), Math.floor( position.z / 50 )]

      function updateBrush() {
        brush.position.x = Math.floor( position.x / 50 ) * 50 + 25
        brush.position.y = Math.floor( position.y / 50 ) * 50 + 25
        brush.position.z = Math.floor( position.z / 50 ) * 50 + 25
      }

      if (isAltDown) {
        if (!brush.currentCube) brush.currentCube = newCube
        if (brush.currentCube.join('') !== newCube.join('')) {
          if ( isShiftDown ) {
            if ( intersect.object !== plane ) {
              scene.remove( intersect.object.parent )
            }
          } else {
            addVoxel()
          }
        }
        updateBrush()
        updateHash()
        return brush.currentCube = newCube
      } else if ( isShiftDown ) {
        if ( intersect.object !== plane ) {
          objectHovered = intersect.object
          objectHovered.material.opacity = 0.5
          return
        }
      } else {
        updateBrush()
        return
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

    var intersect = getIntersecting()

    if ( intersect ) {

      if ( isShiftDown ) {

        if ( intersect.object != plane ) {

          scene.remove( intersect.object.parent )

        }
      } else {
        addVoxel()
      }

    }


    updateHash()
    render()
    interact()
  }

  function onDocumentKeyDown( event ) {
    switch( event.keyCode ) {
      case 189: zoom(100); break
      case 187: zoom(-100); break
      case 49: exports.setColor(0); break
      case 50: exports.setColor(1); break
      case 51: exports.setColor(2); break
      case 52: exports.setColor(3); break
      case 53: exports.setColor(4); break
      case 54: exports.setColor(5); break
      case 55: exports.setColor(6); break
      case 56: exports.setColor(7); break
      case 57: exports.setColor(8); break
      case 48: exports.setColor(9); break
      case 16: isShiftDown = true; break
      case 17: isCtrlDown = true; break
      case 18: isAltDown = true; break
    }

  }

  function onDocumentKeyUp( event ) {

    switch( event.keyCode ) {

      case 16: isShiftDown = false; break
      case 17: isCtrlDown = false; break
      case 18: isAltDown = false; break

    }
  }


  function buildFromHash(hashMask) {

    var hash = window.location.hash.substr( 1 ),
    hashChunks = hash.split(':'),
    chunks = {}

    for( var j = 0, n = hashChunks.length; j < n; j++ ) {
      chunks[hashChunks[j][0]] = hashChunks[j].substr(2)
    }

    if ( (!hashMask || hashMask == 'C') && chunks['C'] )
    {
      // decode colors
      var hexColors = chunks['C']
      for(var c = 0, nC = hexColors.length/6; c < nC; c++) {
        var hex = hexColors.substr(c*6,6)
        colors[c] = hex2rgb(hex)

        addColorToPalette(c)
      }
    }

    if ( (!hashMask || hashMask == 'A') && chunks['A'] ) {
      // decode geo
      var current = { x: 0, y: 0, z: 0, c: 0 }
      var data = decode( chunks['A'] )
      var i = 0, l = data.length

      while ( i < l ) {

        var code = data[ i ++ ].toString( 2 )
        if ( code.charAt( 1 ) == "1" ) current.x += data[ i ++ ] - 32
        if ( code.charAt( 2 ) == "1" ) current.y += data[ i ++ ] - 32
        if ( code.charAt( 3 ) == "1" ) current.z += data[ i ++ ] - 32
        if ( code.charAt( 4 ) == "1" ) current.c += data[ i ++ ] - 32
        if ( code.charAt( 0 ) == "1" ) {
          var materials = [
            new CubeMaterial( { vertexColors: THREE.VertexColors } ),
            new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } )
          ]
          var col = colors[current.c] || colors[0]
          materials[0].color.setRGB( col[0], col[1], col[2] )
          var voxel = THREE.SceneUtils.createMultiMaterialObject( cube, materials )
          voxel.isVoxel = true
          voxel.position.x = current.x * 50 + 25
          voxel.position.y = current.y * 50 + 25
          voxel.position.z = current.z * 50 + 25
          voxel.overdraw = true
          scene.add( voxel )
        }
      }
    }


    updateHash()

  }

  function updateHash() {

    var data = [], voxels = [], code
    var current = { x: 0, y: 0, z: 0, c: 0 }
    var last = { x: 0, y: 0, z: 0, c: 0 }
    for ( var i in scene.children ) {

      var object = scene.children[ i ]

      if ( object.isVoxel && object !== plane && object !== brush ) {

        current.x = ( object.position.x - 25 ) / 50
        current.y = ( object.position.y - 25 ) / 50
        current.z = ( object.position.z - 25 ) / 50

        var colorString = ['r', 'g', 'b'].map(function(col) { return object.children[0].material.color[col] }).join('')
        // this string matching of floating point values to find an index seems a little sketchy
        for (var i = 0; i < colors.length; i++) if (colors[i].join('') === colorString) current.c = i
        voxels.push({x: current.x, y: current.y + 1, z: current.z , c: current.c + 1})

        code = 0

        if ( current.x != last.x ) code += 1000
        if ( current.y != last.y ) code += 100
        if ( current.z != last.z ) code += 10
        if ( current.c != last.c ) code += 1

        code += 10000

        data.push( parseInt( code, 2 ) )

        if ( current.x != last.x ) {

          data.push( current.x - last.x + 32 )
          last.x = current.x

        }

        if ( current.y != last.y ) {

          data.push( current.y - last.y + 32 )
          last.y = current.y

        }

        if ( current.z != last.z ) {

          data.push( current.z - last.z + 32 )
          last.z = current.z

        }

        if ( current.c != last.c ) {

          data.push( current.c - last.c + 32 )
          last.c = current.c

        }

      }

    }
    data = encode( data )

    var cData = '';
    for( var c in colors ) {
      cData+=rgb2hex(colors[c]);
    }

    var outHash = "#"+(data.length?("A/" + data):'')+(data.length&&cData?':':'')+(cData?("C/"+cData):'')
    window.location.replace(outHash)
    return voxels
  }

  function exportFunction(voxels) {
    var dimensions = getDimensions(voxels)
    voxels = voxels.map(function(v) { return [v.x, v.y, v.z, v.c + 1]})
    var funcString = "var voxels = " + JSON.stringify(voxels) + ";"
    funcString += 'var dimensions = ' + JSON.stringify(dimensions) + ';'
    funcString += 'voxels.map(function(voxel) {' +
      'game.setBlock([position.x + voxel[0], position.y + voxel[1], position.z + voxel[2]], voxel[3])' +
    '});'
    return funcString
  }

  // skips every fourth byte when encoding images,
  // i.e. leave the alpha channel
  // alone and only change RGB
  function pickRGB(idx) {
    return idx + (idx/3) | 0
  }

  function getExportCanvas(width, height) {
    var canvas = document.createElement('canvas')
    var ctx = canvas.getContext('2d')
    var source = renderer.domElement
    var width = canvas.width = width || source.width
    var height = canvas.height = height || source.height

    renderer.setSize(width, height)
    camera.aspect = width/height
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)

    ctx.fillStyle = 'rgb(255,255,255)'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(source, 0, 0, width, height)

    updateHash()

    var imageData = ctx.getImageData(0, 0, width, height)
    var voxelData = window.location.hash
    var text = 'voxel-painter:' + voxelData

    lsb.encode(imageData.data, text, pickRGB)

    ctx.putImageData(imageData, 0, 0)

    onWindowResize()
    
    return canvas
  }
  
  function exportImage(width, height) {
    var canvas = getExportCanvas(width, height)
    var image = new Image
    image.src = canvas.toDataURL()
    return image
  }

  function importImage(image) {
    var canvas = document.createElement('canvas')
    var ctx = canvas.getContext('2d')
    var width = canvas.width = image.width
    var height = canvas.height = image.height

    ctx.fillStyle = 'rgb(255,255,255)'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0)

    var imageData = ctx.getImageData(0, 0, width, height)
    var text = lsb.decode(imageData.data, pickRGB)

    // ignore images that weren't generated by voxel-painter
    if (text.slice(0, 14) !== 'voxel-painter:') return false

    window.location.hash = text.slice(14)
    buildFromHash()
    return true
  }

  function setupImageDropImport(element) {
    element.ondragover = function(event) {
      return event.preventDefault(event) && false
    }
    element.ondrop = function(event) {
      event.preventDefault()
      event.stopPropagation()

      if (!event.dataTransfer) return false

      var file = event.dataTransfer.files[0]
      if (!file) return false
      if (!file.type.match(/image/)) return false

      var reader = new FileReader
      reader.onload = function(event) {
        var image = new Image
        image.src = event.target.result
        image.onload = function() {
          if (importImage(image)) return
          window.alert('Looks like that image doesn\'t have any voxels inside it...')
        }
      }
      reader.readAsDataURL(file)
      return false
    }
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

    var output = []
    string.split('').forEach( function ( v ) { output.push( "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf( v ) ) } )
    return output

  }

  function encode( array ) {

    var output = ""
    array.forEach( function ( v ) { output += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt( v ) } )
    return output

  }

  function save() {

    window.open( renderer.domElement.toDataURL('image/png'), 'mywindow' )

  }

  function render() {
    camera.lookAt( target )
    raycaster = projector.pickingRay( mouse2D.clone(), camera )
    renderer.render( scene, camera )
  }
  
}