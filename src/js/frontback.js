global.jQuery = require('../bower_components/jquery/dist/jquery.js');
require('../bower_components/html2canvas/build/html2canvas.js');
require('./lib/feedback.js');

function addstylesheet(url) {
   var $link = '<link rel="stylesheet" type="text/css" href="' + url + '">';
   jQuery('head').append($link);
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

	jQuery.feedback({
		repoID: frontbackRepo,
	    ajaxURL: frontbackPostURL,
	});
}