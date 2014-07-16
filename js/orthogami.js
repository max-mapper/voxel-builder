var orthogami = require('orthogami')

module.exports = function(voxels, colors) {
    
  //Set up options (can skip this if you like)
  var options = {
    units: 'mm',            //Units
    bounds: [210, 297],     //Page size
    scale: 10,              //Size of voxel
    lineWidth: 0.1,          //Size of dashed line
    colorMap: colors
  }

  //Then run orthogami
  var svgs = orthogami(voxels, options)
  return svgs
}
