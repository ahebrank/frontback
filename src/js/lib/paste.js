module.exports = {
  on: function($) {
    $('#ftbk-feedback-overview').on('paste', function(event) {
      var items = (event.clipboardData || event.originalEvent.clipboardData).items;
      for (index in items) {
        var item = items[index];
        if (item.kind === 'file') {
          var blob = item.getAsFile();
          var reader = new FileReader();
          reader.onload = function(event){
            $('#ftbk-feedback-screenshot').attr('src', event.target.result);
          }; 
          reader.readAsDataURL(blob);
        }
      }
    });
  },
  
  off: function($) {
    $('#ftbk-feedback-overview').off('paste');
  }
}