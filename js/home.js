if (window.Chordify === undefined) {
    window.Chordify = {};
}

/* statusupdater jquery plugin  */
(function ($) {

    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    var methods = {
        init: function (options) {
            return this.each(function () {
                var $this = $(this);
                $this.data('bar', $this.find('.bar'));
                $this.data('name', $this.find('.name'));
            });
        },
        update: function (value, name) {

            console.log(value, name);

            if (value === undefined) {
                value = 0;
            }

            if (name === undefined) {
                name = '';
            }

            var valueText = value;

            if (isNumber(value)) {
                valueText += '%';
            }

            document.title = name + '.. ' + valueText;

            return this.each(function () {
                var $this = $(this).addClass('progress');

                $this.data('name').html(name + ' ' + valueText);

                $this.data('bar').css({width: $this.width() / 100 * value});

                if (value >= 100) {
                    $this.removeClass('progress');
                }
            });
        }
    };

    $.fn.statusUpdater = function (method) {

        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.statusupdater');
        }

    };
})(jQuery);

(function () {

    $(document).ready(function () {

        var $window = $(window),
            width = $window.width(),
            height = $window.height(),
            $body = $('body'),
            $statusBar = $('#statusBar'),
            $urlInput = $('#url'),
            $fileupload = $('#fileupload'),
            title = document.title;

        $body.on('dragenter', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if ($('#drop').length > 0) {
                return;
            }
            $body.append('<div id="drop" style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:3;background:rgba(0,0,0,0.5);"><div style="position:fixed;top:0;left:0;right:0;bottom:0;margin:40px;border: 6px dashed white;border-radius:30px;text-align:center;padding:300px 0 0 0;font-size:20pt;color:white;">Drop the bass!</div></div>');
        }).on('dragleave', function (e) {
            if ($(e.target).is('#main,#drop')) {
                $('#drop').remove();
            }
        }).on('drop', function (e) {
            e.preventDefault();
            $('#drop').remove();
        }).on('dragover', function (e) {
            e.preventDefault();
        });
        $body.on('click', '#drop', function () {
            $('#drop').remove();
        });

        function resetForm() {
            $('#notify').remove();
            $urlInput.show();
            $statusBar.hide();
            document.title = title;
        }

        function startProgress() {
            $urlInput.hide();
            $statusBar.html('<div class="bar"></div><div class="name"></div>').show().statusUpdater().statusUpdater('update', 0, 'Chordify!');
        }

        function onUpload(data) {

            $statusBar.statusUpdater('update', 0, 'Chordify!');

            var pseudoId = data.pseudoId,
                callCount = 0;

            function poll() {
                $.getJSON('/song/' + data.pseudoId, function (data) {
                    handleData(data, callCount++);
                }).fail(function () {
                    showPopup(Lang.error_out_of_tune + ' ' + Lang.error_wrong_strings);
                    resetForm();
                });
            }

            function handleData(data, callCount) {

                if (data.status && data.status == 'error') {

                    if (data.show_signup !== undefined && data.show_signup == true) {
                        popupSignup(Lang.new_songs_signup, null, location.pathname);
                    } else if (data.msg) {
                        showPopup(data.msg);
                    } else {
                        showPopup(Lang.error_out_of_tune + ' ' + Lang.error_wrong_strings);
                    }
                    resetForm();
                    return true;
                }

                if (data.redirect !== undefined) {
                    return;
                }

                if (data.status == 'done' && data.slug) {
                    // small delay for non-premium users
                    if (callCount >= 1 && !$body.hasClass('user-premium')) {
                        var loadPercentage = 0,
                            loadInterval = setInterval(function () {

                                if (loadPercentage >= 99) {
                                    self.location.href = '/chords/' + data.slug;
                                    clearInterval(loadInterval);
                                    return;
                                }
                                loadPercentage += Math.round((Math.random() * 10) + 23);

                                $statusBar.statusUpdater('update', Math.min(100, loadPercentage), Lang.loading);

                            }, 300);
                        return;
                    } else {
                        $statusBar.statusUpdater('update', 100, 'Chordify!');
                    }
                    self.location.href = '/chords/' + data.slug;
                    return true;
                }

                if (callCount >= 3 && data.status == 'inqueue') {
                    $statusBar.statusUpdater('update', data.progress, Lang.waiting);
                } else {
                    $statusBar.statusUpdater('update', data.progress, 'Chordify!');
                }

                setTimeout(function () {
                    poll();
                }, 1000);
            }

            handleData(data, callCount);
        }

        function startUpload(data, file) {
            data.submit();

            ga('send', 'event', 'Chordify', 'File', file.name);

            window.onbeforeunload = function () {
                return Lang.upload_navigate_away;
            };

            startProgress();
        }

        function initFileUpload() {
            if ($fileupload.length == 0) {
                return;
            }
            $fileupload.fileupload({
                dataType: 'json',
                autoUpload: false,
                add: function (e, data) {
                    // do additional validation on uploads left (drag&drop)
                    var canUpload = validateUploadsLeft(e);

                    if (!canUpload) {
                        return false;
                    }

                    for (var f = 0; f < data.files.length; f++) {
                        var file = data.files[f];

                        console.log(file, "|" + file.type + "|", file.type.indexOf('video/x-ms-wma'));

                        if (/\.m4p$/.test(file.name)) {
                            showPopup(Lang.error_apple_drm);
                            continue;
                        }

                        if (file.size !== undefined) {
                            var maxFilesize = parseFloat($fileupload.data('max-filesize')).toFixed(2),
                                size = (file.size / 1024 / 1024).toFixed(2);

                            if (size > maxFilesize * 1.01) {
                                showPopup(
                                    '<h2>' + Lang.oops + '..</h2><p>' +
                                    Lang.file_too_large.replace('%d', size) + ' ' + Lang.upload_maximum.replace('%d', maxFilesize) + '</p>'
                                );
                                continue;
                            }
                        }

                        if (file.type !== undefined && ( file.type.indexOf('audio') >= 0 || file.type.indexOf('video/ogg') >= 0 || file.type.indexOf('video/x-ms-wma') >= 0 )) {
                            // file is ok!
                        } else if (navigator.userAgent.indexOf('Android') >= 0) {
                            // all android files are okay..
                        } else if (!/(\.mp3|\.m4a|\.ogg|\.wma)$/.test(file.name.toLowerCase())) {
                            // fallback check based on extension
                            showPopup(Lang.file_not_supported + ' ' + file.name + ' ' + file.type);
                            continue;
                        }

                        if ($body.hasClass('user-free') && $('#user').data('creditsleft') >= 1) {
                            showPopup('<p>' + Lang.one_credit + '</p><div id="uploadConfirm" class="button-premium" style="margin:0;">' + Lang.confirm + '</div>', {width: 300});
                            $('#uploadConfirm').click(function () {
                                ga('send', 'event', 'Credits', 'Unlock File Upload');
                                startUpload(data, file);
                                hidePopup();
                            });
                        } else {
                            startUpload(data, file);
                        }
                        // return for now, comment the return if multiple files are enabled
                        return true;
                    }
                },
                progress: function (e, data) {
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    $statusBar.statusUpdater('update', progress, Lang.uploading);
                },
                done: function (e, data) {
                    data = data.result;
                    // remove event
                    window.onbeforeunload = null;
                    onUpload(data);
                }
            });
        }

        // fileupload for iOS is not supported
        $fileupload.on('touchstart', function (e) {
            if (!/ios|ipad|iphone|ipod/i.test(navigator.userAgent)) {
                // everything ok, return
                return;
            }

            alert(Lang.upload_ios_support);

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        });

        $fileupload.on('click', function (e) {
            validateUploadsLeft(e);
        });

        initFileUpload();

        window.doChordify = function (url, type, pseudoId, parms) {

            if (url && url.indexOf('chordify.net') >= 0) {
                self.location.href = 'https://' + (url.replace('http://', '').replace('https://', ''));
                return;
            }

            startProgress();
            hideResults();

            if (parms === undefined) {
                parms = {};
            }

            parms.pseudoId = pseudoId;
            parms.url = url;
            parms.retry = !!Chordify.getParameter('retry');

            if (window.dzInfo !== undefined && type == 'deezer') {
                parms.accessToken = window.dzInfo.accessToken;
            }

            ga('send', 'event', 'Chordify', type, pseudoId.replace(type + ':', ''));

            jqXHR = $.post('/song', parms, onUpload, 'json');
        };

        var requests = {},
            searches = {},
            showMore = false,
            maxResults = 5, // max results per source, "more results" is this value times 4
            typeTimeout = null,
            maxDuration = $urlInput.data('max-duration'),
            $active = $(),
            $searchResults = $('<div class="slidebar-content search-results"></div>'),
            showResults = function () {
                toggleSlideBar(true, $searchResults.appendTo('body'), function () {

                    $searchResults.off('mouseenter click');

                    $searchResults.on('mouseenter', 'div', function (e) {
                        $active.removeClass('active');
                        $active = $(e.target).addClass('active');
                    }).on('click', 'div', function (e) {
                        var $target = $(this);
                        if ($target.hasClass('show-more')) {
                            showMore = true;
                            $('.active').removeClass('active');
                            $target.remove();
                            $searchResults.find('.result-more').show();
                            $searchResults.stop().animate({scrollTop: 0}, 'fast');
                            return;
                        }
                        // set the global active row
                        $active = $target.addClass('active');
                        if (!$active.hasClass('exists') && !$body.hasClass('signedin')) {
                            popupSignup(Lang.new_songs_signup, null, location.pathname + '?search=' + $urlInput.val());
                        } else if ($active.hasClass('disabled')) {
                            tooltip($active.find('.button-chordify'));
                        } else {
                            doChordify($active.data('url'), $active.data('type'), $active.data('id'));
                        }
                    });
                });
            },
            hideResults = function () {
                if (!$searchResults.is(':visible')) {
                    return;
                }
                $('.active').removeClass('active');
                toggleSlideBar(false);

                showMore = false;
                maxResults = 5;
            },
            callback = function (items) {
                showResults();
                $searchResults.empty();

                var $rows = $();

                for (i in items) {
                    // TODO add duration check for soundcloud
                    $rows = $rows.add(
                        $('<div class="' + (items[i].exists ? ' exists' : '') + '"></div>')
                            .text(items[i].title)
                            .prepend('<span style="background-image:url(' + (items[i].artwork_url ? items[i].artwork_url : '/img/bg-gradient.png') + ');" class="thumb"></span>')
                            .prepend('<span class="button-chordify">' + (items[i].exists ? 'open' : '<img src="/img/logo_white.png" /> now') + '</span>')
                            .append('<span class="source">' + items[i].type + '</span>').data(items[i])
                    );
                }

                if ($rows.length == 0) {
                    $searchResults.append('<b class="slidebar-section" style="margin:20px 20px 10px 20px;display:block;">' + Lang.no_search_results + '</b>')
                } else {
                    $searchResults.append($rows);
                }

                $urlInput.removeClass('search-loader');
            };

        var xhrs = [];

        function apiSearch(sources, term, callback) {
            requests.all = term;

            for (x in xhrs) {
                xhrs[x].abort();
            }

            var xhr = $.ajax({
                url: '/song/search',
                data: {q: term, sources: sources},
                term: term,
                success: function (data) {
                    if (this.term != requests.all) {
                        // ignore this request as it's superceeded by a new one
                        return;
                    }
                    callback(data.items);
                },
                error: function () {
                    $urlInput.removeClass('search-loader');
                }
            });

            xhrs.push(xhr);
        }

        $urlInput.focus(function (e) {
            if (!Chordify.dzSupport) {
                $('.result-deezer').remove();
            }
            if ($urlInput.val().length > 0) {
                toggleSlideBar(true, $('.search-results'));
            } else {
                toggleSlideBar(true, $('.slidebar-upload'));
            }
        }).keypress(function (e) {
            if (e.which == 13) {
                if ($active.hasClass('disabled')) {
                    tooltip($active.find('.button-chordify'));
                } else if ($urlInput.val().indexOf('http') === 0 && $('.search-results').children().not('.show-more').length == 0) {
                    console.log('no search result, but is an URL');
                } else {
                    $active.click();
                }
            }
            $urlInput.data('typedVal', $urlInput.val());
        }).on('keyup keydown keypress paste', function (e) {

            if (e.type == 'keydown' && (e.which == 38 || e.which == 40)) {
                $active = $searchResults.find('.active');

                // handle the arrow buttons to select items
                if (e.which == 38) { // up
                    if ($active.length == 0) {
                        $active = $searchResults.children(':visible').last().addClass('active');
                    } else {
                        $active = $active.removeClass('active').prev();
                        while ($active.length > 0) {
                            if ($active.is(':visible')) {
                                break;
                            }
                            $active = $active.prev();
                        }
                        $active.addClass('active');
                    }
                } else if (e.which == 40) { // down
                    if ($active.length == 0) {
                        $active = $searchResults.children(':visible').first().addClass('active');
                        $searchResults.scrollTop(0);
                    } else {
                        $active = $active.removeClass('active').next();
                        while ($active.length > 0) {
                            if ($active.is(':visible')) {
                                break;
                            }
                            $active = $active.next();
                        }
                        $active.addClass('active');
                    }
                }
                if (($active.index() * $active.outerHeight(false)) - $searchResults.scrollTop() > $searchResults.height() - 20) {
                    $searchResults.scrollTop(($active.index() * $active.outerHeight(false)) - 15);
                } else if (($active.index() * $active.outerHeight(false)) - $searchResults.scrollTop() + $searchResults.height() < $searchResults.height()) {
                    $searchResults.scrollTop(($active.index() * $active.outerHeight(false)) - 15);
                }

                if ($active.hasClass('show-more')) {
                    return;
                }

                return false;
            }

            if (e.type == 'paste') {
                setTimeout(function () {
                    var term = $urlInput.val().trim();
                    if (term.indexOf('http') >= 0) {
                        $searchResults.empty();
                        apiSearch('youtube,soundcloud,deezer', term, callback);
                    }
                }, 10);
            }


            /* }).blur(function(){
             // http://stackoverflow.com/questions/7970389/ios-5-fixed-positioning-and-virtual-keyboard
             $window.scrollTop(0); */
        }).keyup(function () {
            // searching all sources
            var term = $urlInput.val().trim(),
                sources = 'youtube,soundcloud';

            if (Chordify.dzSupport) {
                sources += ',deezer';
            }

            if (term.length <= 0 || term.indexOf('http') == 0 || term == $urlInput.data('prevTerm')) {
                return true;
            }

            $urlInput.data('prevTerm', term);

            if (typeTimeout !== null) {
                clearTimeout(typeTimeout);
            }

            if (!$urlInput.hasClass('search-loader')) {
                $urlInput.addClass('search-loader');
            }

            console.log('start timer', Date.now(), term);

            typeTimeout = setTimeout(function () {
                console.log('do search', Date.now(), term);
                apiSearch(sources, term, callback)
            }, term.length <= 1 ? 10 : 300);

        });

        if (Chordify.getParameter('search')) {
            $urlInput.val(Chordify.getParameter('search')).keyup();
        } else if (self.location.hash == '#search') {
            $urlInput.focus();
        }

        if (Chordify.getParameter('url') && Chordify.getParameter('stream_url')) {

            var url = Chordify.getParameter('url'),
                pseudoId = 'rocketsongs' + ':' + Chordify.getParameter('external_id');

            if (url.indexOf('clips') >= 0) {
                pseudoId += ':c';
            }

            doChordify(url, 'rocketsongs', pseudoId, {stream_url: Chordify.getParameter('stream_url')});

        } else if (Chordify.getParameter('url')) {
            $urlInput.val(Chordify.getParameter('url')).trigger('paste');
            setTimeout(function () {
                $('.search-results .active').click();
            }, 2000);
        }

        function validateUploadsLeft(e) {
            var uploadsLeft = parseInt($fileupload.data('uploads-left'), 10);
            console.log(uploadsLeft);
            if (uploadsLeft <= 0) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }

                Checkout.showPopup();
                return false;
            }
            return true;
        }

        setInterval(function () {
            var $thumbs = $('.homepage .thumbnails').not('.no-carousel').find('a').not('.thumbnail-big').filter(':visible'),
                $rand = $thumbs.eq(Math.round(Math.random() * $thumbs.length - 1)),
                $clone = $rand.clone(),
                $thumbnails = $rand.closest('.thumbnails'),
                $replace = $thumbnails.find('a:hidden').first();

            if ($replace.length == 0) {
                return;
            }

            $replace.css({opacity: ''});

            $rand.animate({opacity: 0}, function () {
                $clone.hide();
                $rand.replaceWith($replace.fadeIn());
                $thumbnails.append($clone);
            });

        }, 3000);

        $('.homepage .thumbnails').mouseenter(function (e) {
            $(e.target).closest('.thumbnails').addClass('no-carousel');
        }).mouseleave(function (e) {
            $(e.target).closest('.thumbnails').removeClass('no-carousel');
        });

        if (Chordify.getParameter('welcome')) {
            var welcome = '<h2 style="margin-bottom:20px;">' + ($('.home-welcome').length > 0 ? $('.home-welcome h1').text() : Lang.welcome ) + '</h2>';

            welcome += '&quot;<i>' + Lang.quote + '</i>&quot;<br/>- Oliver<br/><br/>';

            welcome += '<b>' + Lang.emails_curated + '</b><br/>';

            welcome += '<form class="form-newsletter form-ajax" action="/user/newsletter">';
            welcome += '<label style="display:block;"><input type="checkbox" name="mail_followup" value="1" checked>' + Lang.mail_followup + '</label>';
            welcome += '<label style="display:block;"><input type="checkbox" name="mail_newsletter" value="1" checked>' + Lang.mail_newsletter + '</label>';
            welcome += '<input type="submit" style="float:right;margin-top:12px;" name="info" value="' + Lang.save + '" />';
            welcome += '</form>';

            showPopup(welcome, {width: 350}, function () {

                var $checked = $('.form-newsletter input[type=checkbox]'),
                    label = [];

                $checked.each(function (i, el) {
                    label.push($(el).attr('name') + '=' + ($(el).is(':checked') ? 1 : 0));
                });

                ga('send', 'event', 'User', 'Newsletter', label.join(','));

                tooltip($urlInput.data({
                    tooltip: '<h6>Tip</h6><p>Chordify gets the chords for any song! Give it a try and search for your favorite tunes.</p>' +
                    '<div class="sources"><span class="icon-youtube"></span><span class="icon-soundcloud"></span><span class="icon-deezer"></span></div>',
                    'tooltip-style': 'light'
                }));
            });

            $('.form-newsletter input[type=submit]').click(function () {
                setTimeout(hidePopup, 500);
            });

        }

    });
})();
