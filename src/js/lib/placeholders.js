module.exports = {
  replace: function($, url_attr) {
    var base_url = window.location.protocol + '//' + window.location.host;
    $('[' + url_attr + ']').each(function() {
      var $el = $(this);
      var url = $el.attr(url_attr);
      // remote domain?
      if (!(url.indexOf('/') === 0 || url.indexOf(base_url) === 0)) {
        var height = $el.outerHeight();
        var width = $el.outerWidth();

        if (height > 0) {
          var style = [
            'height: ' + height + 'px',
            'width: ' + width + 'px',
            'color: white',
            'background-color: black',
            'overflow: hidden',
            'padding: 5px'
          ];
          var $placeholder = $('<div data-ftbk-screenshot-placeholder style="' + style.join('; ') + '">');
          var lines = [
            $el.prop('tagName'),
            "Source URL: " + url,
            "Dimensions: (" + width + ' x ' + height + ")"
          ];
          $placeholder.html(lines.join('<br>'));
          $el.css('display', 'none');
          $placeholder.insertAfter($el);
        }
      }
    });
  },

  remove: function($) {
    $('[data-ftbk-screenshot-placeholder]').each(function() {
      var $el = $(this);
      $el.prev().css('display', 'inherit');
      $el.remove();
    });
  }
}