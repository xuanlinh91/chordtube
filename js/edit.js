/**
 * Created by linhnx on 10/27/2016.
 */

Chordify.toggleEdit = function(editMode){
    var $chordsArea = $('#chordsArea'),
        $currentChord = $('.currentChord'),
        $transpose = $('.function-transpose');

    $('#song').toggleClass('chords-edit', editMode);

    $('.pulsate').removeClass('pulsate');

    //$('.library-mgmt').toggle(!editMode);
    Chordify.mode = editMode ? 'edit' : 'play';

    if( editMode ){

        var userId = $('body').data('userid');
        var editUserId = Chordify.getParameter('edit') || userId;

        if (userId != editUserId && editUserId != 'original')
            $('a[href="#copyEdit"]').click();


        // reset transpose (only if the method is available)
        if( Chordify.transpose != 0 && Chordify.transposeChords !== undefined ){
            Chordify.transposeChords(-Chordify.transpose);
            Chordify.transpose = 0;
            $transpose.removeClass('active').find('.value').text(0);
        }

        $transpose.css({color: '#eee'});

        $('.metadata-title').before('<div class="chord-edit-bar">' +
            '<div><a style="text-decoration:none;" href="/song/deleteEdit/' + $('#song').data('songid') +
            '" onclick="var yes = confirm(\'' + Lang.confirm_revert + '\'); if( yes ) $(window).off(\'beforeunload\'); return yes;" ' +
            'data-tooltip="' + Lang.revert_edit_tooltip + '">' + Lang.revert_edit + '</a></div>' +
            '<div><span class="barlength">' + Chordify.song.barLength + '/4</span></div>' +
            '<div data-tooltip="' + Lang.shift_chords_tooltip + '">' + Lang.shift_chords + '<span class="icon-right"></span><span class="icon-left"></span></div></div>'
        );
        // open currentChord for edit, unless the currentchord is the first chord
        if( $currentChord.index() > 0 ){
            $currentChord.click();
        }
    } else {

        if( $('.currentChord').length == 0 ){
            Chordify.setCurrentChord($('.chord-edit'));
        }

        $('.chord-edit-bar, .chord-edit-tooltip').remove();
        $('.chord-edit').removeClass('chord-edit');
        $transpose.css({color: ''});

        location.hash = '';
    }
    if( !$chordsArea.is(':visible') ){
        $('.controls button[name=grips]').click();
    }
    $(window).resize();
}

function markAsEdited(){
    if( !Chordify.hasEdit && $('body').data('userid').indexOf('_fake') == 0 ){
        $(window).on('beforeunload', function(){
            setTimeout(function(){
                setTimeout(function(){
                    $('#saveEdits').click();
                    $(window).off('beforeunload');
                }, 500);
            }, 1);
            return Lang.edit_create_account;
        });
    }

    Chordify.hasEdit = true;
    Chordify.song.editBy = $('#user').data('firstname') || "Anonymous";
    Chordify.song.hasEdits = true;
    Chordify.song.isEditedByUser = true;

    var $editOwner = $('.edit-owner');

    if( $editOwner.length == 0 ){
        $('.metadata').append('<div class="edit-owner"><div class="dropdown"></div></div>');
        $editOwner = $('.edit-owner');
    }

    var $editDropdown = $editOwner.find('.dropdown'),
        $dropdownItems = $editDropdown.find('.dropdown-items');

    if( $dropdownItems.length == 0 ){
        // turn into dropdown
        if( $editDropdown.find('a').length > 0 ){
            $editDropdown.find('a').wrap('<div class="dropdown-items"></div>');
        } else {
            $editDropdown.append('<div class="dropdown-items"></div>');
            $dropdownItems = $editDropdown.find('.dropdown-items');
        }
        $dropdownItems = $editDropdown.find('.dropdown-items');
        $dropdownItems.before(Lang.edit_by + ' ' + Chordify.song.editBy);
        $dropdownItems.before('<span class="dropdown-arrow"> &#9660;</span>');
        if( !$('#user').data('firstname') ){
            $dropdownItems.append('<a href="#saveEdits" id="saveEdits" data-tooltip="' + Lang.edit_create_account + '">' + Lang.edit_not_saved + '</a>');
        }
        $dropdownItems.append('<a href="?edit=original">' + Lang.show_original + '</a>');
    }
}

$(document).ready(function(){

    var $body = $('body'),
        $chords = $('.chords'),
        $chordsArea = $('#chordsArea'),
        songId = $('#song').data('songid');

    // open edit tooltip on double click
    $chords.on('dblclick', '.chord', function(e){
        var $chord = $(this);

        if( Chordify.mode != 'edit' ){
            return;
        }

        if( !$chord.find('.chord-edit-list').is(':visible') ){
            $chord.find('.icon-edit').click();
        }
    });

    $(document).keydown(function(e){

        if( e.metaKey || e.ctrlKey || Chordify.mode != 'edit' || e.target.tagName.toLowerCase() == 'input' ){
            return;
        }
        if( e.which == 8 || e.which == 46 ){
            // delete and backspace
            e.preventDefault();
            $('.chord-edit-tooltip .icon-delete').click();
        }
        var letter = String.fromCharCode(e.which || e.keyCode).toLowerCase(),
            allowedChars = Chordify.chordLang == 'latin' ? 'drmfsltn~' : 'abcdefgmn~r';

        if( (e.which || e.keyCode) == 192 ){
            letter = '~';
        };

        if( allowedChars.indexOf(letter) == -1 ){
            return;
        }

        e.stopPropagation();
        e.stopImmediatePropagation();
        $('.chord-edit-tooltip .icon-edit').click();

        var $input = $('.chord-edit-input'),
            val = $input.val();

        if( Chordify.chordLang != 'latin' && letter == 'm' ){
            // toggle minor
            if( val.indexOf('m') > 0 ){
                $input.val(val.replace('m', ''));
            } else {
                $input.val(val + 'm');
            }
        } else if( allowedChars.indexOf(letter) >= 0 ){
            $input.val(letter);
        }
        $input.keyup();
        return false;
    });

    $body.on('mousedown', function(e){
        if( $(e.target).closest('.chord').length > 0 || $(e.target).is('.icon-right, .icon-pause') ){
            return true;
        }
        $('.chord-edit').removeClass('chord-edit');
        $('.chord-edit-tooltip').remove();
        return true;
    });

    var $chordsArea = $('#chordsArea');

    // move everything one beat left or right
    $('.metadata').on('click', '.chord-edit-bar span', function(e){
        var action = $(e.target).attr('class').replace('icon-', ''),
            $bars = $('.bar'),
            offset = Chordify.song.offset;

        console.log(action, offset);

        if (action == 'left' && offset > -2){
            saveOffset(--Chordify.song.offset);
            $('.chords .chord').first().remove();
        } else if( action == 'right' && offset < 2 ){
            saveOffset(++Chordify.song.offset);
            $('.chords').prepend(Chordify.chordToHtml('N', false));
        } else if (action == 'barlength') {
            var newLength = Chordify.song.barLength == 4 ? 3 : 4;

            saveBarLength(Chordify.song.barLength = newLength);

            $('.chords').removeClass('barlength-4 barlength-3').addClass('barlength-' + newLength);

            $(e.target).html(newLength + '/4');
        }
    }).on('click', 'a[href=#copyEdit]', function(e){
        var $target = $(e.target),
            $song = $('#song');

        e.preventDefault();

        showPopup(Lang.loading_wait + '<br/> <img src="/img/loader.gif" width="16" height="11" />');
        $.get('/song/checkCopyEdit/' + $song.data('pseudoid') + '/' + $song.data('songid') + '/' + $target.data('userid') + '/' + Chordify.song.version_id, function(data){
            hidePopup();
            showPopup(data);
        });
    }).on('click', '#saveEdits', function(e){
        e.preventDefault();
        popupSignup(Lang.edit_create_account);
    });

    $chords.on('mouseenter', '.icon-paste', function(e){
        var $target = $(e.target),
            action = $target.attr('class').replace('icon-', ''),
            $chord = $target.closest('.chord');

        if( $target.css('opacity') < 1 ){
            return;
        }

        $chord.addClass('chord-paste-hint chord-paste-hint-first');

        if( action == 'paste' && Chordify.loopChords ){
            var i = Chordify.loopChords.length-1;
            while( i-- ){
                $chord = $chord.nextFirst('.chord').addClass('chord-paste-hint');
            }
            $chord.addClass('chord-paste-hint-last')
        }
    }).on('mouseleave', '.icon-paste', function(){
        $('.chord-paste-hint').removeClass('chord-paste-hint chord-paste-hint-first chord-paste-hint-last');
    });

    $chords.on('click', '.chord-edit-tooltip', function(e){
        var $target = $(e.target),
            action = $target.attr('class').replace('icon-', ''),
            $chord = $target.closest('.chord'),
            chordI = $chord.data('i'),
            chordHandle = $chord.data('handle'),
            $newChord = null;

        if( $chord.closest('.chord-edit-list').length > 0 || $target.css('opacity') < 1 ){
            // this is a click on a search result
            return;
        }

        if( action == 'paste' ){
            var $newChords = $(),
                prevHandle = null;

            Chordify.loopChords.each(function(i, el){
                var newHandle = $(el).data('handle'),
                    $newChord = Chordify.chordToHtml(newHandle, newHandle != prevHandle);

                console.log([prevHandle, newHandle, newHandle != prevHandle, $newChord.attr('class'), $newChord.data()]);

                replaceChord(Chordify.song.chords[chordI + i].el, $newChord);

                $newChords = $newChords.add($newChord);
                prevHandle = newHandle;

            });

            //console.log($newChords);

            $newChords.css('transition', 'background 200ms ease-in');
            setTimeout(function(){
                $newChords.css('background', '#88A398');
                setTimeout(function(){
                    $newChords.css('background', '');
                    setTimeout(function(){
                        $newChords.css('transition', '');
                    }, 200);
                }, 200);
            }, 10);
            return;
        }

        e.stopPropagation();

        var $nextChord = Chordify.song.chords[chordI + 1].el,
            $prevChord = null,
            prevChordHandle = null;

        if( Chordify.song.chords[chordI - 1] ){
            $prevChord = Chordify.song.chords[chordI - 1].el;
            prevChordHandle = $prevChord.data('handle');
        } else {
            $prevChord = $();
            // if there is no prev chord, turn it into a rest
            prevChordHandle = 'N';
        }

        if( !$target.is('span') ){
            return;
        }

        if( action != 'edit' ){
            $chord.removeClass('chord-edit').addClass('nolabel').data({visible: false}).find('.chord-edit-tooltip').remove();
        }

        if( action == 'right' || action == 'delete' ){
            replaceChord($chord, Chordify.chordToHtml(prevChordHandle, $prevChord.length == 0 ? true : false));
        }

        $newChord = Chordify.chordToHtml(chordHandle);

        if( action == 'left' ){
            replaceChord($prevChord, $newChord);
            Chordify.openEditTooltip($prevChord);
        } else if( action == 'right' ){
            replaceChord($nextChord, $newChord);
            Chordify.openEditTooltip($nextChord);
        } else if( action == 'delete' ){
            resetNextChords($nextChord, chordHandle, prevChordHandle);
            Chordify.setCurrentChord($prevChord.nextFirst('.chord'));
            $('.currentChord').removeClass('currentChord');
            $prevChord.nextFirst('.chord').addClass('chord-edit');
            //Chordify.openEditTooltip($prevChord.nextFirst('.chord'));
        } else if( action == 'edit' ){
            var dropdownOpen = !$('.chord-edit-move').toggle().is(':visible');
            val = '',
                $editInput = $('.chord-edit-tooltip input').toggle(dropdownOpen);

            $('.chord-edit-list').toggle(dropdownOpen);
            //console.log(chordHandle, $chord);

            if( chordHandle[0] != 'N' ){
                if( Chordify.chordLang == 'latin' ){
                    var parts = chordHandle.split(':');
                    val = Chordify.langMapping.latin[parts[0][0]] + (parts[0][1] || '') + parts[1];
                } else {
                    val = chordHandle.replace(':', '').replace('min', 'm').replace(/maj$/, '');
                }
            }

            if( dropdownOpen ){
                $editInput.val(val).keyup().focus().val('').val(val);
            }
        }
    });

    var chordEditSearchActive = false,
        $chordEditList = $(),
        saveTimeout = null,
        chordData = {};

    function postEdit(songId, data){
        if( Chordify.song.version_id ){
            data.version_id = Chordify.song.version_id;
        } else {
            data.mongo_id = Chordify.song.id;
        }
        $.post('/song/edit/' + songId + '/' + Chordify.song.type + ':' + Chordify.song.external_id, data)
    }

    function saveChange(chordIndex){
        markAsEdited();
        var chord = Chordify.song.chords[chordIndex];
        chordData[chordIndex] = chordIndex + ':' + [chord.beat, chord.handle, chord.from, chord.to].join(';');
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(function(){
            postEdit(songId, {chords: $.map(chordData, function(val, i){return [val];}).join('\n')});
            chordData = {};
        }, 100);
    }

    function saveOffset(offset){
        markAsEdited();
        postEdit(songId, {offset: offset});
    }

    function saveBarLength(barLength){
        markAsEdited();
        postEdit(songId, {barLength: barLength});
    }

    function replaceChord($chord, $newChord){
        $chord.empty();
        Chordify.replaceChord($chord, $newChord);
        saveChange($chord.data('i'));
    }

    // loop over next chords and compare handle to "toChordHandle" to continue doing so or not
    function resetNextChords($chord, chordHandle, toChordHandle){
        while( $chord.hasClass('nolabel') && $chord.data('handle') == chordHandle ){
            var $newChord = Chordify.chordToHtml(toChordHandle, false);
            replaceChord($chord, $newChord);
            $chord = $chord.nextFirst('.chord');
        }
    }

    // this method smartly selects the "first" item from the list of matches
    function selectMatch(){
        var $selectedChord = $('.chord-select');
        if( $selectedChord.length > 0 ){
            $selectedChord.click();
        } else {
            if( $('.chord-edit-input').val().toLowerCase().lastIndexOf('m') > 0 && $('.chord-edit-list .chord:visible:eq(1)').attr('class').indexOf('_min') >= 1 ){
                // if there is a 'm' (minor) in the input, select the first visible minor
                $('.chord-edit-list .chord:visible:eq(1)').first().click();
            } else {
                $('.chord-edit-list .chord:visible').first().click();
            }
            $('.chord-edit-tooltip').remove();
        }
    }

    function bindChordEditSearch() {
        if( chordEditSearchActive ) return;

        $body.on('keydown', function(e){
            if( e.which == 27 ){ // esc
                $('.chord-edit-tooltip').remove();
                return;
            }

            if( !$(e.target).is('.chord-edit-input') ){
                return;
            }

            if( e.which == 13 ){ // enter
                selectMatch();
            }
        });

        $body.on('keyup', '.chord-edit-input', function(e){
            var val = $(e.target).val().toLowerCase(),
                $selectedChord = $('.chord-select');

            if( e.which == 40 ){ // arrow down
                if( $selectedChord.length == 0 && !$selectedChord.is(':visible') ){
                    $('.chord-edit-list').children('.chord:visible').first().addClass('chord-select');
                } else {
                    $selectedChord.removeClass('chord-select').nextAll('.chord:visible:first').addClass('chord-select');
                }
                return true;
            } else if( e.which == 38 ){ // arrow up
                $selectedChord.removeClass('chord-select').prevAll('.chord:visible:first').addClass('chord-select');
                return true;
            }
            $chordEditList.children('.chord-search').each(function(i, el){
                var $row = $(el),
                    handle = $row.data('handle'),
                    parts = handle.split(':'),
                    searchStr = '';

                if( $row.data('search') == null ){
                    // build string to search in
                    if( handle == 'N' ){
                        searchStr = ' ~ rest pause';
                    } else {

                        if( Chordify.chordLang == 'latin' ){
                            searchStr = Chordify.langMapping.latin[parts[0][0]] + (parts[0][1] || '') + parts[1];
                        } else {
                            searchStr = handle.replace(':', '');
                        }

                        if( parts[0][1] == 's' ){
                            searchStr += ' ' + parts[0] + '#' + parts[1];
                        }

                        if( parts[1].indexOf('min') >= 0){
                            searchStr += ' ' + searchStr.replace('min', 'm');
                        }

                        if( Chordify.chordLang == 'german' ){
                            if( parts[0][0] == 'B' ){
                                if( parts[0][1] != undefined && parts[0][1] == 'b' ){
                                    searchStr = searchStr.replace('Bb', 'B');
                                } else {
                                    searchStr = searchStr.replace('B', 'H');
                                }
                            }
                        }
                    }
                    $row.data('search', searchStr.toLowerCase());
                    //console.log(handle, searchStr.toLowerCase());
                }

                if( val.lastIndexOf('m') > 0 ){
                    // the minor doesn't count
                    val = val.replace(/m$/, '');
                } else if( val.length == 0 ){
                    val = '~';
                }

                val = val.replace('3', '#');

                if( val.length == 1 && $row.data('search').indexOf(val) == 0 ){
                    $row.show();
                } else if( new RegExp(' ' + val).test(' ' + $row.data('search')) ){
                    $row.show();
                } else {
                    $row.hide();
                }
            });
        }).on('click', '.chord-edit-list', function(e){
            var newHandle = $(e.target).closest('.chord').data('handle'),
                $chord = $(e.target).closest('.chord-edit-tooltip').closest('.chord'),
                chordHandle = $chord.data('handle'),
                $nextChord = $chord.nextFirst('.chord'),
                $newChord = Chordify.chordToHtml(newHandle, true);

            if( newHandle == chordHandle ){
                $chord.find('.chord-edit-tooltip').remove();
                return;
            }

            replaceChord($chord, $newChord);
            $chord.addClass('chord-edit');

            resetNextChords($nextChord, chordHandle, newHandle);
        });

        chordEditSearchActive = true;
    }

    var scrollbarWidth = $.scrollbarWidth();

    Chordify.openEditTooltip = function($chord){
        if( $chord.closest('.chord-edit-list').length > 0 ){
            return;
        }
        if( $chord.length == 0 ){
            $chord = $('.currentChord');
        }

        $('.chord-edit').removeClass('chord-edit').find('.chord-edit-tooltip').remove();

        var cmdKey = navigator.userAgent.indexOf('OS X') > 0 ? '&#x2318;' : 'ctrl';

        $chord.addClass('chord-edit')
            .prepend('<div class="chord-edit-tooltip">' +
                '<span class="icon-edit" title="' + Lang.edit_this_chord + '"></span>' +
                '<div class="chord-edit-move"><span class="icon-left" title="' + Lang.edit_move_left + ' (' + cmdKey + ' + &#11013;)"></span>' +
                '<span class="icon-right" title="' + Lang.edit_move_right + ' (' + cmdKey + ' + &#10145;)"></span><span class="icon-delete" title="' + Lang.remove_chord + '"></span>' +
                '<span class="icon-paste" title="Select multiple chords to to copy and paste"></span>' +
                '</div><input class="chord-edit-input" type="text" />' +
                '<div class="chord-edit-list"></div>' +
                '</div>');

        if( Chordify.loopChords && !$chord.hasClass('loop') ){
            $('.icon-paste').css({opacity: 1, cursor: 'pointer'}).attr('title', 'Paste copied chords from this chord onwards');
        }

        // append rest
        $chordEditList = $('.chord-edit-list').append(Chordify.chordToHtml('N'));

        // add the whole chord library
        for( c in Chordify.allChords ){
            $chordEditList.append(Chordify.chordToHtml(Chordify.allChords[c]));
        }
        $searchChords = $chordEditList.children();
        $chordEditList.append('<div style="border-top:1px solid #ddd;float:left;width:59px;margin:3px 0;"></div>');
        $chordEditList.append($searchChords.clone(true));
        $searchChords.addClass('chord-search');
        bindChordEditSearch();

        if( scrollbarWidth > 10 ){
            $chordEditList.width($chordEditList.width() + scrollbarWidth);
        }
    }

    $('.setDefault').click(function(e){
        e.preventDefault();
        $('.edit-owner').css({opacity: 0.5}).find('.dropdown').append('<img src="/img/loader.gif" />');
        $.get($(e.target).attr('href'), function(){
            $('.edit-owner').animate({opacity: 1}, 'fast').find('img').remove();
        });
    });
});

function constructEditorsDiv() {

    var slug = location.pathname.replace(/.*\/chords\//, ''),
        songId = $('#song').data('songid'),
        pseudoId = $('#song').data('pseudoid')

    $.get('/song/editors/' + pseudoId, function(response) {

        if( response.length === 0 ){
            hidePopup();
            showPopup('<div class="editors">' + Lang.no_edits + '</div>', {width: 250});
            return;
        }

        text = '';
        response.forEach(function (item){
            text += '<li><a href="/chords/' + slug + '?edit=' + item['id'] + '">';
            if ('facebook' in item)
                text += '<img class="user-pic" src="//graph.facebook.com/' + item['facebook'] + '/picture?type=square"/>';
            else
                text += '<span class="icon-profile"></span>';
            text += Lang.edit_by + ' ' + item['name'] + '</a></li>';
        });
        hidePopup();
        showPopup('<div class="editors"><ul>' + text + '</ul></div>', {width: 250});
    });
    showPopup('<div class="editors">' + Lang.edits_load + ' <img src="/img/loader.gif" width="16" height="11" /></div>', {width: 250});
    return false;
}
// ratings
$(document).ready(function() {

    var playTS = null,
        totalPlayTime = 0,
        isPlaying = false,
        songName = $(".metadata h1 span").text(),
        $qualityControls = $('.qualityControls');

    //Action when clicking on a star (for both the normal and the popup stars)
    $qualityControls.find('button').click(function(e){
        if (isPlaying) {
            playDuration = Date.now() - playTS;
            totalPlayTime += playDuration;
        }

        var $target = $(e.target);
        vote = $target.attr("value")/*,
         votePopupContent = Lang.you_have_rated.replace('%s', '<i>' + songName + '</i>').replace('%d', vote) + ' ' + (vote > 1 ? Lang.stars : Lang.star) +
         '. <a href="https://chordify.uservoice.com" target="_blank">' + Lang.additional_feedback + '.</a>';*/

        if( !vote ){
            return;
        }

        applyVote(vote, totalPlayTime);

        //showMsg(votePopupContent);

        $qualityControls.find('[value=' + vote + ']').addClass("voted").removeClass("unvoted").prevAll().addClass("voted").removeClass("unvoted");
        $qualityControls.find('[value=' + vote + ']').nextAll().addClass("unvoted").removeClass("voted");

    }).on("mouseenter", function(e){
        // Orange glow for hover over stars
        $(e.target).addClass("hover").prevAll().addClass("hover");
    }).on("mouseleave", function(e){
        $(e.target).removeClass("hover").prevAll().removeClass("hover");
    });

    //Record how much playtime the song has
    Chordify.player.on("play", function(){
        playTS = Date.now();
        isPlaying = true;
    });

    Chordify.player.on("stop", function(){
        totalPlayTime += Date.now() - playTS;
        isPlaying = false;
    });

    Chordify.player.on("pause", function(){
        totalPlayTime += Date.now() - playTS;
        isPlaying = false;
    });
});

function applyVote(vote, playTime) {
    var songId = $("#song").data("songid"),
        data = {version_id: 'original'},
        gaEventId = songId;

    if( Chordify.song.version_id ){
        data.version_id = Chordify.song.version_id;
        gaEventId += '-' + data.version_id;
    }

    if( Chordify.getParameter('edit') ){
        data.edit_user_id = Chordify.getParameter('edit');
    }

    ga('send', 'event', 'Rating', 'Rate ' + vote, gaEventId, vote);

    $.get('/song/rate/'+ vote + '/' + songId + '/' + playTime, data);
}

