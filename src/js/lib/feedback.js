// feedback.js
// 2013, Kázmér Rapavi, https://github.com/ivoviz/feedback
// Licensed under the MIT license.
// Version 2.0

(function($){

	$.feedback = function(options) {

	var cookieEmail = require('./email.js');

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
				description:	require('./templates/description.tpl')(),
				highlighter:	require('./templates/highlighter.tpl')(),
				overview:		require('./templates/overview.tpl')(),
				submitSuccess:	require('./templates/success.tpl')(),
				submitError:	require('./templates/error.tpl')()
			},
			onClose: 				function() {},
			screenshotStroke:		true,
			highlightElement:		true,
			initialBox:				false,
	}, options);

		// flask/wsgi routing is picky -- POST URL must have a trailing slash
		if (settings.ajaxURL.slice(-1) != '/') {
			settings.ajaxURL += '/';
		}

		var supportedBrowser = !!window.HTMLCanvasElement;
		var isFeedbackButtonNative = settings.feedbackButton == '.ftbk-feedback-btn';
		if (supportedBrowser) {
			if(isFeedbackButtonNative) {
				var button = require('./templates/feedback-button.tpl')
				$('body').append(button({'text': settings.initButtonText}));
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

				var canvas = require('./templates/canvas.tpl');

				var fullScreen = ($(window).width() > 640);

				if (fullScreen) {
					tpl += settings.tpl.highlighter;
				}
				tpl += settings.tpl.overview + canvas() + '</div>';

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

				if (fullScreen) {
					if(settings.isDraggable) {
						$('#ftbk-feedback-highlighter').on('mousedown', function(e) {
							var $d = $(this).addClass('ftbk-feedback-draggable'),
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
									$(this).removeClass('ftbk-feedback-draggable');
								});
							});
							e.preventDefault();
						}).on('mouseup', function(){
							$(this).removeClass('ftbk-feedback-draggable');
							$(this).parents().off('mousemove mousedown');
						});
					}
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
				}

				if (settings.postURL) {
					post.url = document.URL;
				}

				if (settings.postHTML) {
					post.html = $('html').html();
				}

				if (fullScreen) {
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

								$('* :not(body,script,iframe,div,section,.ftbk-feedback-btn,#ftbk-feedback-module *)').each(function(){
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
						$('#ftbk-feedback-overview-back').text('Back');
						screenshot(true);
					});

					$(document).on('click', '#ftbk-feedback-overview-back', function(e) {
						canDraw = true;
						$('#ftbk-feedback-canvas').css('cursor', 'crosshair');
						$('#ftbk-feedback-overview').hide();
						$('#ftbk-feedback-helpers').show();
						$('#ftbk-feedback-highlighter').show();
						$('#ftbk-feedback-overview-error').hide();
					});
				}
				else {
					// for mobile, go directly to overview
					$('#ftbk-feedback-overview-back').text('Cancel');
					screenshot(false);

					$(document).on('click', '#ftbk-feedback-overview-back', function(e) {
						close();
					});
				}

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

				function screenshot(shading) {
					canDraw = false;

					$('#ftbk-feedback-canvas').css('cursor', 'default');
					var sy = $(document).scrollTop(),
						dh = $(window).height();
					$('#ftbk-feedback-helpers').hide();
					$('#ftbk-feedback-highlighter').hide();
					if (!settings.screenshotStroke) {
						redraw(ctx, false, !shading);
					} else {
						if (!shading) {
							redraw(ctx, true, true);
						}
					}
					html2canvas(document.body).then(function(canvas) {
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
								$('#ftbk-feedback-email').val(cookieEmail.overviewEmail());
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
						}
					);
				}

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
						cookieEmail.overviewEmail($('#ftbk-feedback-email').val());
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

		function redraw(ctx, border, noshading) {
			border = typeof border !== 'undefined' ? border : true;
			noshading = typeof border !== 'undefined' ? noshading : false;
			ctx.clearRect(0, 0, $('#ftbk-feedback-canvas').width(), $('#ftbk-feedback-canvas').height());
			if (noshading) {
				ctx.fillStyle = 'transparent';
			} else {
				ctx.fillStyle = 'rgba(102,102,102,0.5)';
			}
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

}(jQuery));
