global.frontback = {};
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

if (!frontbackRepo) {
	console.log('Frontback: need frontbackRepo set with repository homepage.');
}
if (!frontbackPostURL) {
	console.log('Frontback: need frontbackPostURL set with endpoint.');
}
if (frontbackRepo && frontbackPostURL) {
	css = frontbackPostURL + '/assets/css/styles.css';
	addstylesheet(css);

	frontback.jQuery.feedback({
		repoID: frontbackRepo,
	    ajaxURL: frontbackPostURL,
	});
}
