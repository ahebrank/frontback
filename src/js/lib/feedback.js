// feedback.js
// 2013, Kázmér Rapavi, https://github.com/ivoviz/feedback
// Licensed under the MIT license.
// Version 2.0

(function($){

    $.feedback = function(options) {

        var getMaxZ = function(selector){
            return Math.max.apply(null, $(selector).map(function(){
                var z;
                return isNaN(z = parseInt($(this).css("z-index"), 10)) ? 0 : z;
            }));
        };

        var cookieEmail = require('./email.js');
        var dropzone = require('./dropzone.js');

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

            if (!settings.options) {
                settings.options = {};
            }

            var supportedBrowser = !!window.HTMLCanvasElement;
            var isFeedbackButtonNative = settings.feedbackButton == '.ftbk-feedback-btn';
            if (supportedBrowser) {
                if(isFeedbackButtonNative && !settings.options.hideButton) {
                    var button = require('./templates/feedback-button.tpl')
                    $('body').append(button({'text': settings.initButtonText}));
                }
                highlightqps();

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

                    $('html, body').addClass('ftbk-fixed');
                    $('#ftbk-feedback-module').css(moduleStyle);

                    var maxZ = 30000;
                    $('#ftbk-feedback-canvas').attr(canvasAttr).css('z-index', maxZ);


                    if (!settings.initialBox) {
                        $('#ftbk-feedback-highlighter-back').remove();
                        canDraw = true;
                        $('#ftbk-feedback-canvas').css('cursor', 'crosshair');
                        $('#ftbk-feedback-helpers').show();
                        $('#ftbk-feedback-welcome').hide();
                        $('#ftbk-feedback-highlighter').show().css('z-index', maxZ + 10000);
                    }

                    if (fullScreen) {
                        if(settings.isDraggable) {
                            $('#ftbk-feedback-highlighter').on('mousedown', function(e) {
                                var $d = $(this).addClass('ftbk-feedback-draggable'),
                                    drag_h 	= $d.outerHeight(),
                                    drag_w 	= $d.outerWidth(),
                                    pos_y 	= $d.offset().top + drag_h - e.pageY,
                                    pos_x 	= $d.offset().left + drag_w - e.pageX;
                                $d.css('z-index', maxZ + 10000).parents().on('mousemove', function(e) {
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

                    // fetch assignee
                    if (settings.options.hideAssigneeOptions) {
                        $('#ftbk-feedback-assignee-text').remove();
                    }
                    else {
                        $.ajax({
                            url: settings.ajaxURL + 'assignee',
                            dataType: 'json',
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify(post),
                            success: function(data) {
                                if (data.username) {
                                    $('#ftbk-feedback-assignee').val(data.username);
                                }
                            }
                        });
                    }

                    // fetch user select options
                    if (!settings.options.hideAssigneeOptions || !settings.options.hideReporterOptions) {
                        $.ajax({
                            url: settings.ajaxURL + 'users',
                            dataType: 'json',
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify(post),
                            success: function(data) {
                                if (data.usernames.length) {
                                    var i;

                                    if (!settings.options.hideReporterOptions) {
                                        var $user_dropdown = $('<select name="feedback-email" id="ftbk-feedback-email">');
                                        for (i = 0; i < data.usernames.length; i++) {
                                            $user_dropdown.append('<option value=' +  data.usernames[i].username + '>' + data.usernames[i].name + ' (' + data.usernames[i].username + ')</option>');
                                        }
                                        var email = cookieEmail.overviewEmail();
                                        $('#ftbk-feedback-email')
                                            .replaceWith($user_dropdown)
                                            .val(email);
                                        $('#ftbk-feedback-email option[value="' + email + '"]').attr('selected', 'selected');
                                    }

                                    if (!settings.options.hideAssigneeOptions) {
                                        var $assignee_dropdown = $('<select name="feedback-assignee" id="ftbk-feedback-assignee">');
                                        for (i = 0; i < data.usernames.length; i++) {
                                            $assignee_dropdown.append('<option value=' + data.usernames[i].username + '>' + data.usernames[i].name + ' (' + data.usernames[i].username + ')</option>');
                                        }
                                        var assignee = $('#ftbk-feedback-assignee').val();
                                        $('#ftbk-feedback-assignee')
                                            .replaceWith($assignee_dropdown)
                                            .val(assignee);
                                        $('#ftbk-feedback-assignee option[value="' + assignee + '"]').attr('selected', 'selected');
                                    }
                                }
                            }
                        });
                    }

                    if (settings.postBrowserInfo) {
                        post.browser 				= {};
                        post.browser.appCodeName	= navigator.appCodeName;
                        post.browser.appName		= navigator.appName;
                        post.browser.appVersion		= navigator.appVersion;
                        post.browser.cookieEnabled	= navigator.cookieEnabled;
                        post.browser.onLine			= navigator.onLine;
                        post.browser.platform		= navigator.platform;
                        post.browser.userAgent		= navigator.userAgent;
                        post.browser.windowDims     = $(window).width() + ' x ' + $(window).height();
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

                                $('#ftbk-feedback-helpers').append('<div class="ftbk-feedback-helper" data-type="' + dtype + '" data-time="' + Date.now() + '" style="position:absolute;top:' + dtop + 'px;left:' + dleft + 'px;width:' + dwidth + 'px;height:' + dheight + 'px;z-index:' + maxZ + ';"></div>');

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
                                            if (!('dompath' in post)) {
                                                post.dompath = [];
                                            }
                                            post.dompath.push(getdompath($toHighlight));
                                            $('#ftbk-feedback-helpers').append('<div class="ftbk-feedback-helper" data-highlight-id="' + hidx + '" data-type="' + dtype + '" data-time="' + Date.now() + '" style="position:absolute;top:' + _y + 'px;left:' + _x + 'px;width:' + _w + 'px;height:' + _h + 'px;z-index:' + maxZ +';"></div>');
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
                                $(this).css('z-index', maxZ + 1);
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
                                $(this).css('z-index',maxZ);
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
                        if (settings.highlightElement && $(this).parent().attr('data-highlight-id')) {
                            var _hidx = $(this).parent().attr('data-highlight-id');
                        }

                        $(this).parent().remove();

                        if (settings.highlightElement && _hidx)
                            $('[data-highlight-id="' + _hidx + '"]').removeAttr('data-highlighted').removeAttr('data-highlight-id');

                        redraw(ctx);
                    });

                    $('#ftbk-feedback-module').on('click', '.ftbk-feedback-wizard-close, .ftbk-feedback-close-btn', function() {
                        close();
                    });
                    $('#ftbk-feedback-module').on('click', '.ftbk-feedback-wizard-minimize, #ftbk-feedback-restore', function() {
                        toggleMinimize();
                    });

                    $(document).on('keyup', function(e) {
                        if (e.keyCode == 27)
                            close();
                    });

                    function screenshot(shading) {
                        canDraw = false;

                        $('#ftbk-feedback-canvas').css('cursor', 'default');
                        var dh = $(window).height();
                        $('#ftbk-feedback-helpers').hide();
                        $('#ftbk-feedback-highlighter').hide();
                        if (!settings.screenshotStroke) {
                            redraw(ctx, false, !shading);
                        } else {
                            if (!shading) {
                                redraw(ctx, true, true);
                            }
                        }
                        var html2canvas_opts = {
                            proxy: settings.proxy,
                            letterRendering: settings.letterRendering
                        };
                        html2canvas($('body'), html2canvas_opts).then(function(canvas) {
                                if (!settings.screenshotStroke) {
                                    redraw(ctx);
                                }

                                _canvas = $('<canvas id="ftbk-feedback-canvas-tmp" width="'+ w +'" height="'+ dh +'"/>').hide().appendTo('body');
                                _ctx = _canvas.get(0).getContext('2d');
                                _ctx.drawImage(canvas, 0, 0, w, dh, 0, 0, w, dh);
                                // blank image
                                img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
                                try {
                                    img = _canvas.get(0).toDataURL();
                                }
                                catch (err) {
                                    console.log(err.message);
                                }
                                if(settings.showDescriptionModal) {
                                    $('#ftbk-feedback-canvas-tmp').remove();
                                    $('#ftbk-feedback-overview').show();
                                    $('#ftbk-feedback-email').val(cookieEmail.overviewEmail());
                                    $('#ftbk-feedback-overview').find('input').filter(function() { return $(this).val() == ""; }).first().focus();
                                    $('#ftbk-feedback-overview-screenshot>img').remove();
                                    $('#ftbk-feedback-overview-screenshot').append('<img id="ftbk-feedback-screenshot" class="ftbk-feedback-screenshot" src="' + img + '" />');
                                    dropzone.handleDrop('ftbk-feedback-image-dropzone', 'ftbk-feedback-screenshot');
                                }
                                else {
                                    post.img = img;
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
                            
                            if (!('img' in post)) {
                                img = document.getElementById('ftbk-feedback-screenshot').getAttribute('src');
                                post.img = img;
                            }
                            settings.onScreenshotTaken(post.img);
                            
                            $('#ftbk-feedback-overview').hide();

                            post.email = $('#ftbk-feedback-email').val();
                            cookieEmail.overviewEmail($('#ftbk-feedback-email').val());
                            post.title = $('#ftbk-feedback-overview-title').val();
                            post.note = $('#ftbk-feedback-note').val();
                            post.assignee_id = $('#ftbk-feedback-assignee').val();
                            $.ajax({
                                url: settings.ajaxURL,
                                dataType: 'json',
                                type: 'POST',
                                contentType: 'application/json',
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

                $('html, body').removeClass('ftbk-fixed');

                settings.onClose.call(this);
            }

            function toggleMinimize() {
                $('html, body').toggleClass('ftbk-fixed');
                if ($('body').hasClass('ftbk-fixed')) {
                    $('#ftbk-feedback-overview, #ftbk-feedback-canvas').show();
                    $('#ftbk-feedback-restore').hide();
                }
                else {
                    $('#ftbk-feedback-overview, #ftbk-feedback-canvas').hide();
                    $('#ftbk-feedback-restore').show();
                }
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

            // from https://stackoverflow.com/a/16742828/5729027
            function getdompath($e) {
                var el = $e[0];
                var stack = [];
                while ( el.parentNode != null ) {
                  var sibCount = 0;
                  var sibIndex = 0;
                  for ( var i = 0; i < el.parentNode.childNodes.length; i++ ) {
                    var sib = el.parentNode.childNodes[i];
                    if ( sib.nodeName == el.nodeName ) {
                      if ( sib === el ) {
                        sibIndex = sibCount;
                      }
                      sibCount++;
                    }
                  }
                  if ( el.hasAttribute('id') && el.id != '' ) {
                    stack.unshift(el.nodeName.toLowerCase() + '#' + el.id);
                  } else if ( sibCount > 1 ) {
                    stack.unshift(el.nodeName.toLowerCase() + ':eq(' + sibIndex + ')');
                  } else {
                    stack.unshift(el.nodeName.toLowerCase());
                  }
                  el = el.parentNode;
                }
              
                return stack.slice(1).join('>');
            }

            function getqp() {
                var url = window.location.href;

                var base = 'fb_dompath';
                var paths = [];
                var name;

                for (var i = 0; ; i++) {
                    name = encodeURIComponent(base + '[' + i + ']');
                    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                        results = regex.exec(url);
                    if (!results || !results[2]) {
                        break;
                    }
                    paths.push(decodeURIComponent(results[2].replace(/\+/g, " ")));
                }

                return paths;
            }

            function highlightqps() {
                var paths = getqp();
                var maxZ = getMaxZ();
                paths.map(function(p) {
                    var $toHighlight = $(p);
                    var _x = $toHighlight.offset().left - 10,
                        _y = $toHighlight.offset().top - 10,
                        _w = $toHighlight.width() + parseInt($toHighlight.css('padding-left'), 10) + parseInt($toHighlight.css('padding-right'), 10) + 20,
                        _h = $toHighlight.height() + parseInt($toHighlight.css('padding-top'), 10) + parseInt($toHighlight.css('padding-bottom'), 10) + 20;
                    // place just below the element to be highlighted
                    var zindex = getZIndex($toHighlight[0]) - 1;
                    $('body').append('<div class="ftbk-feedback-rehighlighted" style="top:' + _y + 'px;left:' + _x + 'px;width:' + _w + 'px;height:' + _h + 'px;z-index:' + zindex +';"></div>');
                    var scrollY = _y - (document.body.clientHeight / 2);
                    if (scrollY > 0) {
                        $('html, body').animate({
                            scrollTop: scrollY
                        }, 500);
                    }
                });
            }

            function getZIndex(e) {
                var z = window.getComputedStyle(e).getPropertyValue('z-index');
                if (isNaN(z)) {
                    var p = e.parentNode;
                    if (p instanceof HTMLElement) {
                        return getZIndex(p);
                    }
                    return 0;
                }
                return z; 
            }

        };

    }(frontback.jQuery));
