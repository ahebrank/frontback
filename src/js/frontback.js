
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
else {
	postURL = frontbackDev? 'http://localhost:9000': 'https://magicyeti.us/feedback';
	css = frontbackDev? 'http://localhost:3000/css/styles.css': 'https://magicyeti.us/feedback/css/styles.css';
	addstylesheet(css);

	jQuery.feedback({
		repoID: frontbackID,
	    ajaxURL: postURL,
	});
}