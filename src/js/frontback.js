if (global.frontback.repo && global.frontback.postUrl) {
  global.frontback.jQuery = require('../bower_components/jquery/dist/jquery.js');
  require('../bower_components/promise-polyfill/promise.js');
  if (!global.html2canvas) {
    global.fabric = require('../bower_components/fabric.js/dist/fabric.js');
    global.html2canvas = require('../bower_components/html2canvas/dist/html2canvas.js');
  }

  require('./lib/feedback.js');

  function addstylesheet(url) {
     var $link = '<link rel="stylesheet" type="text/css" href="' + url + '">';
     frontback.jQuery('head').append($link);
  }

	css = frontback.postUrl+ '/assets/css/styles.css';
	addstylesheet(css);

	frontback.jQuery.feedback({
    repoID: frontback.repo,
	  ajaxURL: frontback.postUrl,
	});
}
else {
  if (!frontback.repo) {
  	console.log('Frontback: need frontbackRepo set with repository homepage.');
  }
  if (!frontback.postUrl) {
  	console.log('Frontback: need frontbackPostURL set with endpoint.');
  }
}
