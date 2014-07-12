var orthogami = require('orthogami')

module.exports = function(voxels, colors) {
    
  //Set up options (can skip this if you like)
  var options = {
    bounds: [300, 300],   //Page size
    scale: 50,            //Size of each voxel face
    colorMap: colors, //Colors (can be a function)
    convexColor: 'magenta',   //Color for crease lines
    concaveColor: 'turquoise',
    lineWidth: 1   //Width for lines
  }

  //Then run orthogami
  var svgs = orthogami(voxels, options)
  return svgs
}
