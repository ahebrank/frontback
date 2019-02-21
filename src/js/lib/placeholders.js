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
            'position: relative',
            'height: ' + height + 'px',
            'width: ' + width + 'px',
            'color: white',
            'background-color: black',
            'overflow: hidden',
            'padding: 5px',
            'box-sizing: border-box',
            'border: 3px dotted white'
          ];
          var $placeholder = $('<div data-ftbk-screenshot-placeholder style="' + style.join('; ') + '">');
          var lines = [
            $el.prop('tagName'),
            "Source: " + url,
            "Dimensions: (" + width + ' x ' + height + ")"
          ];
          var $inner = $('<div style="width: 100%; text-align: center; position: absolute; top: 50%; transform: translateY(-50%);">');
          $inner.html(lines.join('<br>'))
          $placeholder.append($inner);
          $el.addClass('ftbk-hide');
          $placeholder.insertAfter($el);
        }
      }
    });
  },

  remove: function($) {
    $('[data-ftbk-screenshot-placeholder]').each(function() {
      var $el = $(this);
      $el.prev().removeClass('ftbk-hide');
      $el.remove();
    });
  }
}