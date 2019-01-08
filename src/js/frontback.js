if (global.frontback.repo && global.frontback.postUrl) {
  global.frontback.jQuery = require('../../node_modules/jquery/dist/jquery.js');
  require('../../node_modules/promise-polyfill/dist/polyfill.js');
  if (!global.html2canvas) {
    //global.fabric = require('../bower_components/fabric.js/dist/fabric.js');
    global.html2canvas = require('../../node_modules/html2canvas/dist/html2canvas.js');
  }

  require('./lib/feedback.js');

  var addstylesheet = function(url) {
     var $link = '<link rel="stylesheet" type="text/css" href="' + url + '">';
     frontback.jQuery('head').append($link);
  };

	css = frontback.postUrl+ '/assets/css/styles.css?v=DEPLOY_KEY';
  addstylesheet(css);

	frontback.jQuery.feedback({
    repoID: frontback.repo,
    ajaxURL: frontback.postUrl,
    options: frontback.options,
    extra: frontback.extra
	});
}
else {
  if (!frontback.repo) {
  	console.log('Frontback: need frontback.repo set with repository homepage.');
  }
  if (!frontback.postUrl) {
  	console.log('Frontback: need frontback.postUrl set with endpoint.');
  }
}
