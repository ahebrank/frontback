module.exports = {
  handleDrop: function(dropid, imageid) {
    
    // from https://bl.ocks.org/nitaku/dc69a4c83ffccca34d9f
    // Setup the dnd listeners.
    document.addEventListener('drop', function(evt) {
      if (evt.target.id == dropid) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.target.classList.remove('replace-image');
        
        var file = evt.dataTransfer.files[0]; // File object.
        
        // file must be an image
        if (!file.type.match('image.*'))
        return;
        
        var reader = new FileReader();
        
        // capture the file information.
        reader.onload = (function(theFile) {
          return function(e) {
            var data = e.target.result;
            document.getElementById(imageid).setAttribute('src',data);
          };
        })(file);
        
        // Read in the image file as a data URL.
        reader.readAsDataURL(file);
      }
    }, false);
    
    
    document.addEventListener('dragover', function(evt) {
      if (evt.target.id == dropid) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
      }
    }, false);
    document.addEventListener('dragenter', function(evt) {
      if (evt.target.id == dropid) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.target.classList.add('replace-image');
      }
    }, false);
    document.addEventListener('dragleave', function(evt) {
      if (evt.target.id == dropid) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.target.classList.remove('replace-image');
      }
    }, false);
  }
}