function wrap(value, min, max) {
    var range = max - min + 1;

    value = ((value - min) % range);

    if (value < 0) {
        return max + 1 + value;
    }

    return min + value;
}

if (window.Chordify === undefined) {
    window.Chordify = {};
}

// please keep this order for the chord playback
var rootNotes = ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'];

// please keep this order for the chord playback
var extensions = ['maj', 'min', '7', 'maj7', 'min7', 'sus4'];

Chordify.allChords = [];
Chordify.mapping = {};

Chordify.scaleMapping = {'A#': 'Bb', 'Db': 'C#', 'D#': 'Eb', 'Gb': 'F#', 'G#': 'Ab'};

var i = 0;
for (n in rootNotes) {
    for (e in extensions) {
        Chordify.allChords.push(rootNotes[n] + ':' + extensions[e]);
        Chordify.mapping[rootNotes[n] + ':' + extensions[e]] = i;
        i++;
    }
}
for (m in Chordify.scaleMapping) {
    for (e in extensions) {
        Chordify.allChords.push(m + ':' + extensions[e]);
    }
}

Chordify.scale = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
Chordify.langMapping = {
    latin: {'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa', 'G': 'Sol', 'A': 'La', 'B': 'Ti', 'N': 'N'}
};
Chordify.getValidChord = function (chordHandle) {
    var parts = chordHandle.split(':');
    if (Chordify.scaleMapping[parts[0]] === undefined) {
        return chordHandle;
    }
    parts[0] = Chordify.scaleMapping[parts[0]];
    return parts.join(':');
}
Chordify.chordToHtml = function (chordHandle, withText) {

    if (chordHandle === undefined || chordHandle == 'undefined')
        return;

    if (withText === undefined)
        withText = true;

    // Create the jquery chord container element
    var $chord = $('<div class="chord"></div>'),
        parts = chordHandle.split(':');

    // Add some metadata
    $chord.data({
        handle: chordHandle
    });

    // Hide the label if necessary
    if (!withText)
        $chord.addClass('nolabel');

    // Is this a rest?
    if (parts[0] == 'N') {
        // we don't want to display the actual chord name
        // this to prevent repeated chords
        return $chord.addClass('icon-rest');
    }

    // replace some crappy data, can be removed after full migration
    chordHandle = chordHandle.replace(':Maj', ':maj').replace(':Min', ':min');

    $chord.addClass('label-' + chordHandle.replace(':', '_').replace('#', 's'));

    return $chord;
}
Chordify.replaceChord = function ($chord, $newChord) {
    var chordIndex = $chord.data('i');

    $chord.attr('class', $newChord.attr('class'));

    $chord.data('handle', $newChord.data('handle'));

    Chordify.song.chords[chordIndex].handle = $chord.data('handle');

    return $chord;
}
// Chordify.getChordDuration = function(chords) {
// 	var chordDurations = {},
// 		prevChord = null;

// 	var duration = 0;
// 	for(var i = 0; i < chords.length; i++) {
// 		var chordHandle = chords[i]['c'],
// 			chordDuration = chords[i]['d'];

// 		duration += chordDuration;
// 		if(chordHandle != prevChord) {
// 			chordDurations[i] = duration;
// 			duration = 0;
// 		}
// 		prevChord = chordHandle;
// 	}
// 	return chordDurations;
// }

Chordify.renderDiagrams = function () {
    clearTimeout(Chordify.gripTimeout);

    var summary = {},
        chords = Chordify.song.chords,
        $player = $('#song'),
        $grips = $('.grips'),
        instrument = $('.grips-instruments button.active').attr('name'),
        leftHanded = instrument != 'piano' && $grips.hasClass('diagrams-left'),
        i = chords.length,
        cdn = location.host == 'chordify.net' ? '//dakj3r0k8hnld.cloudfront.net' : '//d3i8ia3q0f4qwd.cloudfront.net';

    $grips.empty();

    if (leftHanded) {
        $grips.html('<p style="text-align: right; padding-right: 12px;">Diagrams are left-handed</p>');
    }

    for (i in chords) {

        if (chords[i] == undefined)
            continue;

        if (chords[i].handle[0].toUpperCase() == 'N')
            continue;

        var handle = chords[i].handle;

        if (summary[handle] === undefined)
            summary[handle] = 0;

        summary[handle]++;
    }

    var sortable = [];
    for (handle in summary)
        sortable.push([handle, summary[handle]])

    sortable.sort(function (a, b) {
        return a[1] - b[1]
    })

    console.log(sortable);

    i = sortable.length;

    while (i--) {
        var handle = sortable[i][0],
            $chord = Chordify.chordToHtml(handle),
            imgHandle = handle.replace('#', 's').replace(':', '_');

        if ($chord === undefined) continue;

        $('<div id="grip-' + imgHandle + '"/>')
            .data({handle: handle})
            .append($chord)
            .append('<br/>')
            .append('<span class="grip-wrap"><img alt="' + instrument + ' chord ' + imgHandle.replace('_', ' ') +
                '" src="' + cdn + '/img/diagrams/' + instrument + (leftHanded ? '_left' : '') + '/' + imgHandle + '.png" /></span>')
            .appendTo($grips);
    }

    $('.grips').on('dragstart', 'img', function (e) {
        e.preventDefault();
    });
}

Chordify.renderChords = function () {

    var $window = $(window),
        $player = $('#song'),
        $chords = $player.find('.chords').data('offset', offset).empty().removeClass('loading'),

        chords = Chordify.song.chords.trim().split("\n"),
        offset = Chordify.song.offset,
        barLength = Chordify.song.barLength;

    Chordify.song.chords = {};

    $chords.addClass('barlength-' + barLength);

    barCount = 0;
    hasFirst = false;
    var prevChordHandle = null,
        lazyLoad = Chordify.isCordovaApp ? 64 : 128,
        lazyChords = [],
        debug = Chordify.getParameter('debug');

    // Go through all the chords in the delivered data
    for (i = 0; i < chords.length; i++) {

        // Pull chord information from the data
        var chord = chords[i].split(';');

        if (chord.count < 4) {
            continue;
        }

        var beat = parseInt(chord[0], 10),
            chordHandle = chord[1], // c, c#7, etc.
            from = parseFloat(chord[2], 10), // time code
            to = parseFloat(chord[3], 10); // to (in time code)

        if (beat == 1)
            hasFirst = true;

        if (!hasFirst)
            continue;

        // Convert the chord to HTML
        var $chord = Chordify.chordToHtml(chordHandle, chordHandle != prevChordHandle).data({
            i: i
        });

        if (debug) {
            $chord.attr('title', 'from:' + from + ' to:' + to + ' beat:' + beat);
        }

        prevChordHandle = chordHandle;

        if (i > lazyLoad) {
            // append to lazy list
            lazyChords.push($chord);
        } else {
            $chords.append($chord);
        }

        Chordify.song.chords[i] = {
            handle: chordHandle,
            from: from,
            to: to,
            el: $chord,
            beat: beat
        }
    }

    function calculateChordPositions() {
        for (i in Chordify.song.chords) {
            if (Chordify.song.chords[i] == undefined || Chordify.song.chords[i].el == undefined) {
                continue;
            }
            Chordify.song.chords[i].top = Chordify.song.chords[i].el.offset().top;
        }
    }

    function appendSongEnd() {
        Chordify.setCurrentChord($('.chords .chord').first());
        $(window).resize();
    }

    if (lazyChords.length > 0) {
        setTimeout(function () {
            for (var i = 0; i < lazyChords.length; i++) {
                $chords.append(lazyChords[i]);
            }
            appendSongEnd();
            calculateChordPositions();
        }, 300);
    } else {
        appendSongEnd();
        setTimeout(calculateChordPositions, 300);
    }

    $(window).resize(calculateChordPositions);

    player.init();

    return chords;
}

Chordify.fadeIn = function () {

    var $body = $('body'),
        $mm = $('#mm');

    if (!$body.hasClass('faded')) {
        return;
    }

    var $tooltip = $('.tooltip');

    $('#song').off('mousemove mousedown touchstart');
    $(window).off('scroll.faded');

    $('#content').css({top: $mm.length > 0 ? 262 : 0});
    $('#backgroundOverlay').remove();
    $('<div id="backgroundOverlay" style="opacity:0;"></div>').prependTo($('#background')).animate({opacity: 1}, 'fast');
    $('body').css({background: 'black'});
    $('#mm').css({opacity: 1});

    $('#backgroundOverlay').click(function () {
        Chordify.fadeOut(0);
    });

    setTimeout(function () {
        $('body').removeClass('animate faded pre-animate');
        $('#content').css({top: '', left: ''});
        $(window).resize();
    }, 500);

    if (!$tooltip.data('sticky')) {
        $tooltip.remove();
    }
}
Chordify.fadeOut = function (timeout) {
    if (window.innerWidth < 500) {
        return;
    }
    var $mm = $('#mm'),
        $body = $('body').addClass('pre-animate');

    /*if( window.canRunAds === undefined ){
     $mm.html('<a style="display:block;width:970px;height:250px;" href="/premium"><img src="/img/premium/premium-billboard.jpg" /></a>');
     }*/
    if (timeout == undefined) {
        timeout = 1000;
    }
    setTimeout(function () {

        if ($('#exitPopup').length > 0) {
            return;
        }

        var $content = $('#content');

        $content.css({left: $content.offset().left});

        $body.removeClass('animate');

        if ($mm.length > 0) {
            $content.css({top: 262});
            $mm.hide();
            $body.addClass('animate faded');
            setTimeout(function () {
                $mm.css({display: ''});
                setTimeout(function () {
                    $content.css({top: $(window).height() - 170});
                }, 400);
            }, 10);
        } else {
            $content.css({top: $content.offset().top});
            $body.addClass('animate faded');
            setTimeout(function () {
                $content.css({top: $(window).height() - 170});
            }, 10);
        }

    }, timeout);
    setTimeout(function () {
        $('#backgroundOverlay').fadeOut('fast', function () {
            $(this).remove();
        });
        $('#background').css({opacity: 1});
    }, timeout + 200);
    setTimeout(function () {
        $('#song').on('mousemove mousedown touchstart', function (e) {
            e.preventDefault();
            Chordify.fadeIn();
        });
        $(window).on('scroll.faded', function () {
            Chordify.fadeIn();
        });
    }, timeout + 1000);
};

$(document).ready(function () {
    $('#search_btn').click(function () {
        var loadUrl_test = 'https://crossorigin.me/https://chordify.net/song/data/youtube:' + $('#search_input').val();
        console.log(loadUrl_test);
        $.getJSON(loadUrl_test, function (data) {
            Chordify.song = data;
            Chordify.song.id = $('#song').data('songid');
            console.log(Chordify.song);
            var chords = Chordify.renderChords();

        });
    });

    $('#backgroundOverlay').click(function () {
        Chordify.fadeOut(0);
    });

    if (!/\/chords|\/embed.+/.test(location.pathname)) {
        return true;
    }

    setTimeout(function () {
        $('#mm').css({opacity: 1});
    }, 500);

    function checkIframe(ifr) {
        var key = ( +new Date ) + "" + Math.random();

        try {
            var cWindow = ifr.contentWindow;
            cWindow[key] = "asd";
            return cWindow[key] === "asd";
        } catch (e) {
            return false;
        }
    }

    var $player = $('#song'),
        $controls = $('.controls'),
        $window = $(window),
        slug = location.pathname.replace(/.*\/(chords|embed)\//, '');

    if (Chordify.isCordovaApp && location.search.indexOf('load') >= 0) {
        slug = location.search.replace('?load=', '');
    }

    Chordify.chordLang = 'english';

    if ($('.chordlang-latin').length >= 1) {
        Chordify.chordLang = 'latin';
    } else if ($('.chordlang-german').length >= 1) {
        Chordify.chordLang = 'german';
    }

    var $gripsArea = $('#gripsArea'),
        scrollPos = {chords: 0, grips: 0};

    $controls.find('button').on('click touchend', function (e) {

        if (e.type == 'touchend') {
            e.stopPropagation();
        }

        var $target = $(this),
            func = $target.attr('name'),
            $chordsArea = $('#chordsArea');

        e.preventDefault();

        if (func == 'grips') {

            $target.toggleClass('active');
            if ($chordsArea.is(':visible')) {

                Chordify.renderDiagrams();
                Chordify.diagramsVisible = true;

                scrollPos.chords = $window.scrollTop();

                $chordsArea.fadeOut('fast', function () {
                    if (Chordify.mode == 'edit') {
                        $('.chord-edit-bar, .edit-owner').hide();
                    }
                    $('#gripsArea').fadeIn('fast');
                    $window.scrollTop(scrollPos.grips);
                });
            } else {
                scrollPos.grips = $window.scrollTop();
                Chordify.diagramsVisible = false;

                $('#gripsArea').fadeOut('fast', function () {
                    if (Chordify.mode == 'edit') {
                        $('.chord-edit-bar, .edit-owner').show();
                    }
                    $chordsArea.fadeIn('fast');
                    $window.scrollTop(scrollPos.chords);
                    Chordify.scrollToChord($('.currentChord'));
                });
            }
        } else if (func == 'edit') {
            var editMode = $target.toggleClass('active').hasClass('active');
            Chordify.toggleEdit(editMode);
            /*if( editMode && $('body').hasClass('user-premium') ){
             $('.function-mute[name=chord-playback]').not('.active').click();
             }*/
        }
    });

    $gripsArea.find('a[href=#back]').click(function (e) {
        e.preventDefault();
        $('.controls button[name=grips]').click();
    });

    $gripsArea.find('a.grips-download').click(function (e) {
        e.preventDefault();
        window.open('/diagrams/' + Chordify.chordLang + '/Chordify-' + $('.grips-instruments button.active').attr('name') + '-diagrams.pdf');
    });

    $('.grips-instruments button').click(function (e) {
        e.preventDefault();

        var $target = $(e.target),
            transpose = Chordify.transpose || 0;

        $('.grips-instruments button').removeClass('active');
        $target.addClass('active');
        $('.grips').removeClass('grips-guitar grips-piano grips-ukulele').addClass('grips-' + $target.attr('name'));

        Chordify.renderDiagrams();
    });

    var $body = $('body');

    if (!$body.hasClass('user-premium')) {

        var $song = $('#song'),
            $premiumOverlay = $('#premiumOverlay')

        function alignPremiumOverlay() {
            var $firstFunction = $('.function-premium:visible').first();
            $premiumOverlay.css({left: $firstFunction.offset().left - $('.player-top').offset().left});
        }

        $premiumOverlay.on('mouseenter click touchstart', function () {
            alignPremiumOverlay();
            $premiumOverlay.css('opacity', 1);
        });

        $(window).on('load resize', alignPremiumOverlay);

        $premiumOverlay.on('mouseleave', function (e) {
            if ($premiumOverlay.hasClass('unlock-confirm')) {
                return;
            }
            $premiumOverlay.css({opacity: 0});
        }).click(function (e) {
            e.preventDefault();

            if ($(e.target).hasClass('unlock-cancel')) {
                $premiumOverlay.css({
                    opacity: 0,
                    display: 'none'
                }).html($premiumOverlay.data('prevHtml')).removeClass('unlock-confirm');
                setTimeout(function () {
                    $premiumOverlay.css({display: 'block'});
                }, 1000);
                return;
            }

            if ($('#user').data('creditsleft') > 0) {
                if ($premiumOverlay.hasClass('unlock-confirm')) {
                    $.getJSON('/song/unlock/' + $song.data('songid'), function (data) {
                        Checkout.unlockFeatures();
                    });
                } else {
                    $premiumOverlay.data('prevHtml', $premiumOverlay.html());
                    $premiumOverlay.html('<p style="color:#444;margin-top:10px;">' + Lang.one_credit + '</p>' +
                        '<div class="unlock-cancel button-premium" style="width:auto;display:inline-block;padding:5px 10px;margin-top:5px;background:#ddd;color:#777 !important;margin-right:6px;">x</div>' +
                        '<div class="button-premium" style="width:auto;display:inline-block;padding:5px 10px;margin-top:5px;">' + Lang.confirm + '</div>').addClass('unlock-confirm');
                }
                return;
            }

            Checkout.showPopup($song.data('songid'));

        });
        $('body').on('mouseup', function () {
            $('#premiumOverlay').not('.unlock-confirm').css({opacity: 0});
        });
    }

    var $song = $('#song'),
        options = $song.data(),
        $audioPlayer = options.type == 'youtube' ? $('#youtube') : $('.jplayer'),
        playerWidth = $song.width();

    $(window).resize(function () {
        playerWidth = $song.width();
    });

    if ($('#suggestions').is(':visible')) {
        if ($('#suggestions a').length == 0) {
            Chordify.showSuggestions(options.type, options.audio);
        } else {
            $('#suggestions').show();
        }
    }

    options.controls = $('.controls');

    player = createPlayer($audioPlayer, options);

    // yes, make it global
    Chordify.player = player;
    Chordify.playerType = options.type;

    var loadUrl = '/song/data/',
        transpose = parseInt(Chordify.getParameter('transpose'), 10) || 0,
        editParm = $('.edit-owner').data('editid');

    loadUrl += $song.data('pseudoid') ? $song.data('pseudoid') : slug;

    if (editParm && editParm != 'original') {
        // load edit + uncache force
        loadUrl += '?edit=' + editParm + '&uncache=' + Date.now();
    }

    if (Chordify.song == undefined) {
        Chordify.song = {};
    }

    // load chords via ajax
    $.getJSON(loadUrl, function (data) {
        Chordify.song = data;
        Chordify.song.barLength = parseInt(Chordify.song.meter.replace('/4', ''), 10);
        Chordify.song.id = $song.data('songid');

        Chordify.renderChords();

        if (transpose != 0 && Chordify.transposeChords !== undefined) {
            Chordify.transposeChords(transpose);
            $('.function-transpose').toggleClass('active').find('.value').text(transpose);
        }

        if (location.hash == '#edit') {
            $('.controls button[name=edit]').click();
        }

        if (Chordify.song.current_default && $('.setDefault').length > 0) {
            $('.setDefault').attr('href', $('.setDefault').attr('href').replace('setDefault', 'deleteDefault')).text('Remove default state');
            $('.setDefault').css({background: '#699'});
        }

        $(window).resize();
    });
});
