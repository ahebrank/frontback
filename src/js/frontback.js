
global.jQuery = require('../bower_components/jquery/dist/jquery.js');
require('../bower_components/html2canvas/build/html2canvas.js');
require('./lib/feedback.js');

function addstylesheet(url) {
   var $link = '<link rel="stylesheet" type="text/css" href="' + url + '">';
   jQuery('head').append($link);
}

if (!frontbackID) {
	console.log('Frontback: need frontbackID set with repository identifier.');
}
if (!frontbackPostURL) {
	console.log('Frontback: need frontbackPostURL set with endpoint.');
}
if (frontbackID && frontbackPostURL) {
	css = frontbackPostURL + '/assets/css/styles.css';
	addstylesheet(css);

	jQuery.feedback({
		repoID: frontbackID,
	    ajaxURL: frontbackPostURL,
	});
}