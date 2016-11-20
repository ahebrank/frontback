// feedback.js
// 2013, Kázmér Rapavi, https://github.com/ivoviz/feedback
// Licensed under the MIT license.
// Version 2.0

(function($){

	$.feedback = function(options) {

	var settings = $.extend({
			ajaxURL: 				'',
			repoID:                 null,
			postBrowserInfo: 		true,
			postHTML:				false,
			postURL:				true,
			proxy:					undefined,
			letterRendering:		false,
			initButtonText: 		'Feedback',
			strokeStyle:			'black',
			shadowColor:			'black',
			shadowOffsetX:			1,
			shadowOffsetY:			1,
			shadowBlur:				10,
			lineJoin:				'bevel',
			lineWidth:				3,
			feedbackButton: 		'.ftbk-feedback-btn',
			showDescriptionModal: 	true,
			isDraggable: 			true,
			onScreenshotTaken: 		function(){},
			tpl: {
				description:	'<div class="ftbk-feedback" id="ftbk-feedback-welcome"><div class="ftbk-feedback-logo">Feedback</div><p>Feedback lets you send us suggestions about our products. We welcome problem reports, feature ideas and general comments.</p><p>Start by writing a brief description:</p><textarea id="ftbk-feedback-note-tmp"></textarea><p>Next we\'ll let you identify areas of the page related to your description.</p><button id="ftbk-feedback-welcome-next" class="ftbk-feedback-next-btn feedback-btn-gray">Next</button><div id="ftbk-feedback-welcome-error">Please enter a description.</div><div class="ftbk-feedback-wizard-close"></div></div>',
				highlighter:	'<div class="ftbk-feedback" id="ftbk-feedback-highlighter"><div class="ftbk-feedback-logo">Feedback</div><p>Click and drag on the page to help us better understand your feedback. You can move this dialog if it\'s in the way.</p><div class="ftbk-feedback-buttons"><button id="ftbk-feedback-highlighter-next" class="ftbk-feedback-next-btn feedback-btn-gray">Next</button><button id="ftbk-feedback-highlighter-back" class="ftbk-feedback-back-btn ftbk-feedback-btn-gray">Back</button></div><div class="ftbk-feedback-wizard-close"></div></div>',
				overview:		'<div class="ftbk-feedback" id="ftbk-feedback-overview"><div class="ftbk-feedback-logo">Feedback</div><div id="ftbk-feedback-overview-description"><div id="ftbk-feedback-email-text"><h3>Username / Email</h3><input type="text" name="feedback-email" id="ftbk-feedback-email"></div><div id="ftbk-feedback-overview-title-text"><h3>Issue title</h3><input type="text" name="feedback-overview-title" id="ftbk-feedback-overview-title"></div><div id="ftbk-feedback-overview-description-text"><h3>Description</h3><h3 class="ftbk-feedback-additional">Additional info</h3><div id="ftbk-feedback-additional-none"><span>None</span></div><div id="ftbk-feedback-browser-info"><span>Browser Info</span></div><div id="ftbk-feedback-page-info"><span>URL</span></div><div id="ftbk-feedback-page-structure"><span>Markup</span></div></div></div><div id="ftbk-feedback-overview-screenshot"><h3>Screenshot</h3></div><div class="ftbk-feedback-buttons"><button id="ftbk-feedback-submit" class="ftbk-feedback-submit-btn feedback-btn-blue">Submit</button><button id="ftbk-feedback-overview-back" class="ftbk-feedback-back-btn feedback-btn-gray">Back</button></div><div id="ftbk-feedback-overview-error">Please enter an email and a title/description.</div><div class="ftbk-feedback-wizard-close"></div></div>',
				submitSuccess:	'<div class="ftbk-feedback" id="ftbk-feedback-submit-success"><div class="ftbk-feedback-logo">Feedback</div><p>Thank you for your feedback. We value every piece of feedback we receive.</p><p>We cannot respond individually to every one, but we will use your comments as we strive to improve your experience.</p><button class="ftbk-feedback-close-btn feedback-btn-blue">OK</button><div class="ftbk-feedback-wizard-close"></div></div>',
				submitError:	'<div class="ftbk-feedback" id="ftbk-feedback-submit-error"><div class="ftbk-feedback-logo">Feedback</div><p>An error occured while sending your feedback. Please try again.</p><button class="ftbk-feedback-close-btn ftbk-feedback-btn-blue">OK</button><div class="ftbk-feedback-wizard-close"></div></div>'
			},
			onClose: 				function() {},
			screenshotStroke:		true,
			highlightElement:		true,
			initialBox:				false
	}, options);
		var supportedBrowser = !!window.HTMLCanvasElement;
		var isFeedbackButtonNative = settings.feedbackButton == '.ftbk-feedback-btn';
		if (supportedBrowser) {
			if(isFeedbackButtonNative) {
				$('body').append('<button class="ftbk-feedback-btn ftbk-feedback-btn-gray">' + settings.initButtonText + '</button>');
			}
			$(document).on('click', settings.feedbackButton, function(){
				if(isFeedbackButtonNative) {
					$(this).hide();
				}

				var canDraw = false,
					img = '',
					h 	= $(document).height(),
					w 	= $(document).width(),
					tpl = '<div id="ftbk-feedback-module">';

				if (settings.initialBox) {
					tpl += settings.tpl.description;
				}

				tpl += settings.tpl.highlighter + settings.tpl.overview + '<canvas id="ftbk-feedback-canvas"></canvas><div id="ftbk-feedback-helpers"></div><input id="ftbk-feedback-note" name="feedback-note" type="hidden"></div>';

				$('body').append(tpl);

				moduleStyle = {
					'position':	'absolute',
					'left': 	'0px',
					'top':		'0px'
				};
				canvasAttr = {
					'width': w,
					'height': h
				};

				$('#ftbk-feedback-module').css(moduleStyle);
				$('#ftbk-feedback-canvas').attr(canvasAttr).css('z-index', '30000');

				if (!settings.initialBox) {
					$('#ftbk-feedback-highlighter-back').remove();
					canDraw = true;
					$('#ftbk-feedback-canvas').css('cursor', 'crosshair');
					$('#ftbk-feedback-helpers').show();
					$('#ftbk-feedback-welcome').hide();
					$('#ftbk-feedback-highlighter').show();
				}

				if(settings.isDraggable) {
					$('#ftbk-feedback-highlighter').on('mousedown', function(e) {
						var $d = $(this).addClass('feedback-draggable'),
							drag_h 	= $d.outerHeight(),
							drag_w 	= $d.outerWidth(),
							pos_y 	= $d.offset().top + drag_h - e.pageY,
							pos_x 	= $d.offset().left + drag_w - e.pageX;
						$d.css('z-index', 40000).parents().on('mousemove', function(e) {
							_top 	= e.pageY + pos_y - drag_h;
							_left 	= e.pageX + pos_x - drag_w;
							_bottom = drag_h - e.pageY;
							_right 	= drag_w - e.pageX;

							if (_left < 0) _left = 0;
							if (_top < 0) _top = 0;
							if (_right > $(window).width())
								_left = $(window).width() - drag_w;
							if (_left > $(window).width() - drag_w)
								_left = $(window).width() - drag_w;
							if (_bottom > $(document).height())
								_top = $(document).height() - drag_h;
							if (_top > $(document).height() - drag_h)
								_top = $(document).height() - drag_h;

							$('.ftbk-feedback-draggable').offset({
								top:	_top,
								left:	_left
							}).on("mouseup", function() {
								$(this).removeClass('feedback-draggable');
							});
						});
						e.preventDefault();
					}).on('mouseup', function(){
						$(this).removeClass('feedback-draggable');
						$(this).parents().off('mousemove mousedown');
					});
				}

				var ctx = $('#ftbk-feedback-canvas')[0].getContext('2d');

				ctx.fillStyle = 'rgba(102,102,102,0.5)';
				ctx.fillRect(0, 0, $('#ftbk-feedback-canvas').width(), $('#ftbk-feedback-canvas').height());

				rect 		= {};
				drag 		= false;
				highlight 	= 1,
				post		= {};

				post.repoID = settings.repoID;

				if (settings.postBrowserInfo) {
					post.browser 				= {};
					post.browser.appCodeName	= navigator.appCodeName;
					post.browser.appName		= navigator.appName;
					post.browser.appVersion		= navigator.appVersion;
					post.browser.cookieEnabled	= navigator.cookieEnabled;
					post.browser.onLine			= navigator.onLine;
					post.browser.platform		= navigator.platform;
					post.browser.userAgent		= navigator.userAgent;
					post.browser.plugins		= [];

					$.each(navigator.plugins, function(i) {
						post.browser.plugins.push(navigator.plugins[i].name);
					});
					$('#ftbk-feedback-browser-info').show();
				}

				if (settings.postURL) {
					post.url = document.URL;
					$('#ftbk-feedback-page-info').show();
				}

				if (settings.postHTML) {
					post.html = $('html').html();
					$('#ftbk-feedback-page-structure').show();
				}

				if (!settings.postBrowserInfo && !settings.postURL && !settings.postHTML)
					$('#ftbk-feedback-additional-none').show();

				$(document).on('mousedown', '#ftbk-feedback-canvas', function(e) {
					if (canDraw) {

						rect.startX = e.pageX - $(this).offset().left;
						rect.startY = e.pageY - $(this).offset().top;
						rect.w = 0;
						rect.h = 0;
						drag = true;
					}
				});

				$(document).on('mouseup', function(){
					if (canDraw) {
						drag = false;

						var dtop	= rect.startY,
							dleft	= rect.startX,
							dwidth	= rect.w,
							dheight	= rect.h;
							dtype	= 'highlight';

						if (dwidth == 0 || dheight == 0) return;

						if (dwidth < 0) {
							dleft 	+= dwidth;
							dwidth 	*= -1;
						}
						if (dheight < 0) {
							dtop 	+= dheight;
							dheight *= -1;
						}

						if (dtop + dheight > $(document).height())
							dheight = $(document).height() - dtop;
						if (dleft + dwidth > $(document).width())
							dwidth = $(document).width() - dleft;

						if (highlight == 0)
							dtype = 'blackout';

						$('#ftbk-feedback-helpers').append('<div class="ftbk-feedback-helper" data-type="' + dtype + '" data-time="' + Date.now() + '" style="position:absolute;top:' + dtop + 'px;left:' + dleft + 'px;width:' + dwidth + 'px;height:' + dheight + 'px;z-index:30000;"></div>');

						redraw(ctx);
						rect.w = 0;
					}

				});

				$(document).on('mousemove', function(e) {
					if (canDraw && drag) {
						$('#ftbk-feedback-highlighter').css('cursor', 'default');

						rect.w = (e.pageX - $('#ftbk-feedback-canvas').offset().left) - rect.startX;
						rect.h = (e.pageY - $('#ftbk-feedback-canvas').offset().top) - rect.startY;

						ctx.clearRect(0, 0, $('#ftbk-feedback-canvas').width(), $('#ftbk-feedback-canvas').height());
						ctx.fillStyle = 'rgba(102,102,102,0.5)';
						ctx.fillRect(0, 0, $('#ftbk-feedback-canvas').width(), $('#ftbk-feedback-canvas').height());
						$('.ftbk-feedback-helper').each(function() {
							if ($(this).attr('data-type') == 'highlight')
								drawlines(ctx, parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height());
						});
						if (highlight==1) {
							drawlines(ctx, rect.startX, rect.startY, rect.w, rect.h);
							ctx.clearRect(rect.startX, rect.startY, rect.w, rect.h);
						}
						$('.ftbk-feedback-helper').each(function() {
							if ($(this).attr('data-type') == 'highlight')
								ctx.clearRect(parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height());
						});
						$('.ftbk-feedback-helper').each(function() {
							if ($(this).attr('data-type') == 'blackout') {
								ctx.fillStyle = 'rgba(0,0,0,1)';
								ctx.fillRect(parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height())
							}
						});
						if (highlight == 0) {
							ctx.fillStyle = 'rgba(0,0,0,0.5)';
							ctx.fillRect(rect.startX, rect.startY, rect.w, rect.h);
						}
					}
				});

				if (settings.highlightElement) {
					var highlighted = [],
						tmpHighlighted = [],
						hidx = 0;

					$(document).on('mousemove click', '#ftbk-feedback-canvas',function(e) {
						if (canDraw) {
							redraw(ctx);
							tmpHighlighted = [];

							$('#ftbk-feedback-canvas').css('cursor', 'crosshair');

							$('* :not(body,script,iframe,div,section,.feedback-btn,#ftbk-feedback-module *)').each(function(){
								if ($(this).attr('data-highlighted') === 'true')
									return;

								if (e.pageX > $(this).offset().left && e.pageX < $(this).offset().left + $(this).width() && e.pageY > $(this).offset().top + parseInt($(this).css('padding-top'), 10) && e.pageY < $(this).offset().top + $(this).height() + parseInt($(this).css('padding-top'), 10)) {
										tmpHighlighted.push($(this));
								}
							});

							var $toHighlight = tmpHighlighted[tmpHighlighted.length - 1];

							if ($toHighlight && !drag) {
								$('#ftbk-feedback-canvas').css('cursor', 'pointer');

								var _x = $toHighlight.offset().left - 2,
									_y = $toHighlight.offset().top - 2,
									_w = $toHighlight.width() + parseInt($toHighlight.css('padding-left'), 10) + parseInt($toHighlight.css('padding-right'), 10) + 6,
									_h = $toHighlight.height() + parseInt($toHighlight.css('padding-top'), 10) + parseInt($toHighlight.css('padding-bottom'), 10) + 6;

								if (highlight == 1) {
									drawlines(ctx, _x, _y, _w, _h);
									ctx.clearRect(_x, _y, _w, _h);
									dtype = 'highlight';
								}

								$('.ftbk-feedback-helper').each(function() {
									if ($(this).attr('data-type') == 'highlight')
										ctx.clearRect(parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height());
								});

								if (highlight == 0) {
									dtype = 'blackout';
									ctx.fillStyle = 'rgba(0,0,0,0.5)';
									ctx.fillRect(_x, _y, _w, _h);
								}

								$('.ftbk-feedback-helper').each(function() {
									if ($(this).attr('data-type') == 'blackout') {
										ctx.fillStyle = 'rgba(0,0,0,1)';
										ctx.fillRect(parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height());
									}
								});

								if (e.type == 'click' && e.pageX == rect.startX && e.pageY == rect.startY) {
									$('#ftbk-feedback-helpers').append('<div class="ftbk-feedback-helper" data-highlight-id="' + hidx + '" data-type="' + dtype + '" data-time="' + Date.now() + '" style="position:absolute;top:' + _y + 'px;left:' + _x + 'px;width:' + _w + 'px;height:' + _h + 'px;z-index:30000;"></div>');
									highlighted.push(hidx);
									++hidx;
									redraw(ctx);
								}
							}
						}
					});
				}

				$(document).on('mouseleave', 'body,#ftbk-feedback-canvas', function() {
					redraw(ctx);
				});

				$(document).on('mouseenter', '.ftbk-feedback-helper', function() {
					redraw(ctx);
				});

				$(document).on('click', '#ftbk-feedback-welcome-next', function() {
					if ($('#ftbk-feedback-note').val().length > 0) {
						canDraw = true;
						$('#ftbk-feedback-canvas').css('cursor', 'crosshair');
						$('#ftbk-feedback-helpers').show();
						$('#ftbk-feedback-welcome').hide();
						$('#ftbk-feedback-highlighter').show();
					}
					else {
						$('#ftbk-feedback-welcome-error').show();
					}
				});

				$(document).on('mouseenter mouseleave', '.ftbk-feedback-helper', function(e) {
					if (drag)
						return;

					rect.w = 0;
					rect.h = 0;

					if (e.type === 'mouseenter') {
						$(this).css('z-index', '30001');
						$(this).append('<div class="ftbk-feedback-helper-inner" style="width:' + ($(this).width() - 2) + 'px;height:' + ($(this).height() - 2) + 'px;position:absolute;margin:1px;"></div>');
						$(this).append('<div id="ftbk-feedback-close"></div>');
						$(this).find('#ftbk-feedback-close').css({
							'top' 	: -1 * ($(this).find('#ftbk-feedback-close').height() / 2) + 'px',
							'left' 	: $(this).width() - ($(this).find('#ftbk-feedback-close').width() / 2) + 'px'
						});

						if ($(this).attr('data-type') == 'blackout') {
							/* redraw white */
							ctx.clearRect(0, 0, $('#ftbk-feedback-canvas').width(), $('#ftbk-feedback-canvas').height());
							ctx.fillStyle = 'rgba(102,102,102,0.5)';
							ctx.fillRect(0, 0, $('#ftbk-feedback-canvas').width(), $('#ftbk-feedback-canvas').height());
							$('.ftbk-feedback-helper').each(function() {
								if ($(this).attr('data-type') == 'highlight')
									drawlines(ctx, parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height());
							});
							$('.ftbk-feedback-helper').each(function() {
								if ($(this).attr('data-type') == 'highlight')
									ctx.clearRect(parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height());
							});

							ctx.clearRect(parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height())
							ctx.fillStyle = 'rgba(0,0,0,0.75)';
							ctx.fillRect(parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height());

							ignore = $(this).attr('data-time');

							/* redraw black */
							$('.ftbk-feedback-helper').each(function() {
								if ($(this).attr('data-time') == ignore)
									return true;
								if ($(this).attr('data-type') == 'blackout') {
									ctx.fillStyle = 'rgba(0,0,0,1)';
									ctx.fillRect(parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height())
								}
							});
						}
					}
					else {
						$(this).css('z-index','30000');
						$(this).children().remove();
						if ($(this).attr('data-type') == 'blackout') {
							redraw(ctx);
						}
					}
				});

				$(document).on('click', '#ftbk-feedback-close', function() {
					if (settings.highlightElement && $(this).parent().attr('data-highlight-id'))
						var _hidx = $(this).parent().attr('data-highlight-id');

					$(this).parent().remove();

					if (settings.highlightElement && _hidx)
						$('[data-highlight-id="' + _hidx + '"]').removeAttr('data-highlighted').removeAttr('data-highlight-id');

					redraw(ctx);
				});

				$('#ftbk-feedback-module').on('click', '.ftbk-feedback-wizard-close,.ftbk-feedback-close-btn', function() {
					close();
				});

				$(document).on('keyup', function(e) {
					if (e.keyCode == 27)
						close();
				});

				$(document).on('selectstart dragstart', document, function(e) {
					e.preventDefault();
				});

				$(document).on('click', '#ftbk-feedback-highlighter-back', function() {
					canDraw = false;
					$('#ftbk-feedback-canvas').css('cursor', 'default');
					$('#ftbk-feedback-helpers').hide();
					$('#ftbk-feedback-highlighter').hide();
					$('#ftbk-feedback-welcome-error').hide();
					$('#ftbk-feedback-welcome').show();
				});

				$(document).on('click', '#ftbk-feedback-highlighter-next', function() {
					canDraw = false;
					$('#ftbk-feedback-canvas').css('cursor', 'default');
					var sy = $(document).scrollTop(),
						dh = $(window).height();
					$('#ftbk-feedback-helpers').hide();
					$('#ftbk-feedback-highlighter').hide();
					if (!settings.screenshotStroke) {
						redraw(ctx, false);
					}
					html2canvas($('body'), {
						onrendered: function(canvas) {
							if (!settings.screenshotStroke) {
								redraw(ctx);
							}
							_canvas = $('<canvas id="ftbk-feedback-canvas-tmp" width="'+ w +'" height="'+ dh +'"/>').hide().appendTo('body');
							_ctx = _canvas.get(0).getContext('2d');
							_ctx.drawImage(canvas, 0, sy, w, dh, 0, 0, w, dh);
							img = _canvas.get(0).toDataURL();
							$(document).scrollTop(sy);
							post.img = img;
							settings.onScreenshotTaken(post.img);
							if(settings.showDescriptionModal) {
								$('#ftbk-feedback-canvas-tmp').remove();
								$('#ftbk-feedback-overview').show();
								$('#ftbk-feedback-email').val(overviewEmail());
								$('#ftbk-feedback-overview').find('input').filter(function() { return $(this).val() == ""; }).first().focus();
								$('#ftbk-feedback-overview-description-text>textarea').remove();
								$('#ftbk-feedback-overview-screenshot>img').remove();
								$('<textarea id="ftbk-feedback-overview-note">' + $('#ftbk-feedback-note').val() + '</textarea>').insertAfter('#ftbk-feedback-overview-description-text h3:eq(0)');
								$('#ftbk-feedback-overview-screenshot').append('<img class="ftbk-feedback-screenshot" src="' + img + '" />');
							}
							else {
								$('#ftbk-feedback-module').remove();
								close();
								_canvas.remove();
							}
						},
						proxy: settings.proxy,
						letterRendering: settings.letterRendering
					});
				});

				$(document).on('click', '#ftbk-feedback-overview-back', function(e) {
					canDraw = true;
					$('#ftbk-feedback-canvas').css('cursor', 'crosshair');
					$('#ftbk-feedback-overview').hide();
					$('#ftbk-feedback-helpers').show();
					$('#ftbk-feedback-highlighter').show();
					$('#ftbk-feedback-overview-error').hide();
				});

				$(document).on('keyup', '#ftbk-feedback-note-tmp,#ftbk-feedback-overview-note', function(e) {
					var tx;
					if (e.target.id === 'feedback-note-tmp')
						tx = $('#ftbk-feedback-note-tmp').val();
					else {
						tx = $('#ftbk-feedback-overview-note').val();
						$('#ftbk-feedback-note-tmp').val(tx);
					}

					$('#ftbk-feedback-note').val(tx);
				});

				$(document).on('click', '#ftbk-feedback-submit', function() {
					canDraw = false;

					if ($('#ftbk-feedback-email').val().length > 0 && ($('#ftbk-feedback-note').val().length > 0 || $('#ftbk-feedback-overview-title').val().length)) {
						$('#ftbk-feedback-submit-success,#ftbk-feedback-submit-error').remove();
						$('#ftbk-feedback-overview').hide();

						post.img = img;
						post.email = $('#ftbk-feedback-email').val();
						overviewEmail($('#ftbk-feedback-email').val());
						post.title = $('#ftbk-feedback-overview-title').val();
						post.note = $('#ftbk-feedback-note').val();
						$.ajax({
							url: settings.ajaxURL,
							dataType: 'json',
							type: 'POST',
							data: JSON.stringify(post),
							success: function() {
								//$('#ftbk-feedback-module').append(settings.tpl.submitSuccess);
								close();
							},
							error: function(){
								$('#ftbk-feedback-module').append(settings.tpl.submitError);
							}
						});
					}
					else {
						$('#ftbk-feedback-overview-error').show();
					}
				});
			});
		}

		function close() {
			canDraw = false;
			$(document).off('mouseenter mouseleave', '.ftbk-feedback-helper');
			$(document).off('mouseup keyup');
			$(document).off('mousedown', '.ftbk-feedback-setblackout');
			$(document).off('mousedown', '.ftbk-feedback-sethighlight');
			$(document).off('mousedown click', '#ftbk-feedback-close');
			$(document).off('mousedown', '#ftbk-feedback-canvas');
			$(document).off('click', '#ftbk-feedback-highlighter-next');
			$(document).off('click', '#ftbk-feedback-highlighter-back');
			$(document).off('click', '#ftbk-feedback-welcome-next');
			$(document).off('click', '#ftbk-feedback-overview-back');
			$(document).off('mouseleave', 'body');
			$(document).off('mouseenter', '.ftbk-feedback-helper');
			$(document).off('selectstart dragstart', document);
			$('#ftbk-feedback-module').off('click', '.ftbk-feedback-wizard-close,.ftbk-feedback-close-btn');
			$(document).off('click', '#ftbk-feedback-submit');

			if (settings.highlightElement) {
				$(document).off('click', '#ftbk-feedback-canvas');
				$(document).off('mousemove', '#ftbk-feedback-canvas');
			}
			$('[data-highlighted="true"]').removeAttr('data-highlight-id').removeAttr('data-highlighted');
			$('#ftbk-feedback-module').remove();
			$('.ftbk-feedback-btn').show();

			settings.onClose.call(this);
		}

		function redraw(ctx, border) {
			border = typeof border !== 'undefined' ? border : true;
			ctx.clearRect(0, 0, $('#ftbk-feedback-canvas').width(), $('#ftbk-feedback-canvas').height());
			ctx.fillStyle = 'rgba(102,102,102,0.5)';
			ctx.fillRect(0, 0, $('#ftbk-feedback-canvas').width(), $('#ftbk-feedback-canvas').height());
			$('.ftbk-feedback-helper').each(function() {
				if ($(this).attr('data-type') == 'highlight')
					if (border)
						drawlines(ctx, parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height());
			});
			$('.ftbk-feedback-helper').each(function() {
				if ($(this).attr('data-type') == 'highlight')
					ctx.clearRect(parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height());
			});
			$('.ftbk-feedback-helper').each(function() {
				if ($(this).attr('data-type') == 'blackout') {
					ctx.fillStyle = 'rgba(0,0,0,1)';
					ctx.fillRect(parseInt($(this).css('left'), 10), parseInt($(this).css('top'), 10), $(this).width(), $(this).height());
				}
			});
		}

		function drawlines(ctx, x, y, w, h) {
			ctx.strokeStyle		= settings.strokeStyle;
			ctx.shadowColor		= settings.shadowColor;
			ctx.shadowOffsetX	= settings.shadowOffsetX;
			ctx.shadowOffsetY	= settings.shadowOffsetY;
			ctx.shadowBlur		= settings.shadowBlur;
			ctx.lineJoin		= settings.lineJoin;
			ctx.lineWidth		= settings.lineWidth;

			ctx.strokeRect(x,y,w,h);

			ctx.shadowOffsetX	= 0;
			ctx.shadowOffsetY	= 0;
			ctx.shadowBlur		= 0;
			ctx.lineWidth		= 1;
		}

	};

	function createCookie(name,value,days) {
		var expires;
		if (days) {
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			expires = "; expires="+date.toGMTString();
		}
		else expires = "";
		document.cookie = name+"="+value+expires+"; path=/";
	}

	function readCookie(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) === 0) {
				return c.substring(nameEQ.length,c.length);
			}
		}
		return null;
	}

	function overviewEmail(val) {
		var key = 'ftbk-feedback-email';
		var email;
		if (val && val.length) {
			// set cookie
			email = val;
			createCookie(key, email);
		}
		else {
			// get cookie
			email = readCookie(key);
		}
		return email;
	}

}(jQuery));
