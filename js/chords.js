function wrap(value, min, max){
	var range = max - min +1;

	value = ((value - min) % range);
	
	if( value < 0 ){
		return max + 1 + value;
	}

	return min + value;
}

if(window.Chordify === undefined) {
	window.Chordify = {};
}
Chordify.scaleMapping = {'A#':'Bb', 'Db':'C#', 'D#': 'Eb', 'Gb': 'F#', 'G#': 'Ab'};
Chordify.scale = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G' , 'Ab' , 'A' , 'Bb' , 'B'];
Chordify.langMapping = {
	latin: {'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa', 'G': 'Sol', 'A': 'La', 'B': 'Ti', 'N': 'N'} 
};
Chordify.getValidChord = function(chordHandle){
	var parts = chordHandle.split(':');
	if( Chordify.scaleMapping[parts[0]] === undefined ){
		return chordHandle;
	}
	parts[0] = Chordify.scaleMapping[parts[0]];
	return parts.join(':');
}
Chordify.chordToHtml = function(chordHandle, withText){

	if (chordHandle === undefined || chordHandle == 'undefined')
		return;

	if (withText === undefined)
		withText = true;

	// Create the jquery chord container element
	var $chord = $('<div class="chord"></div>'),
		parts = chordHandle.split(':');

	// Add some metadata
	$chord.data({
		handle: chordHandle,
		visible: withText
	});

	// Hide the label if necessary
	if( !withText )
		$chord.addClass('nolabel');

	// Is this a rest?
	if( parts[0] == 'N' ){
		// we don't want to display the actual chord name
		// this to prevent repeated chords
		return $chord.addClass('icon-rest');
	}

	$chord.addClass('label-' + chordHandle.replace(':', '_').replace('#', 's'));

	return $chord;
}
Chordify.replaceChord = function( $chord, $newChord ){
	var chordIndex = $chord.data('i');

	$chord.attr('class', $newChord.attr('class'));

	$chord.data('handle', $newChord.data('handle'));
	$chord.data('visible', $newChord.data('visible'));

	Chordify.song.chords[chordIndex].c = $chord.data('handle');

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

Chordify.renderDiagrams = function(){
	clearTimeout(Chordify.gripTimeout);

	var summary		= {},
		chords		= Chordify.song.chords,
		$player		= $('#song'),
		$grips		= $('.grips'),
		instrument  = $('.grips-instruments button.active').attr('name'),
		leftHanded	= instrument != 'piano' && $grips.hasClass('diagrams-left'),
		i			= chords.length,
		cdn 		= location.host == 'chordify.net' ? '//dakj3r0k8hnld.cloudfront.net' : '//d3i8ia3q0f4qwd.cloudfront.net';

	$grips.empty();

	if( leftHanded ){
		$grips.html('<p style="text-align: right; padding-right: 12px;">Diagrams are left-handed</p>');
	}

	while( i-- ){
		if( chords[i] == undefined || chords[i].c == undefined )
			continue;

		var parts = chords[i].c.split(':'),
			handle = chords[i].c;

		if( parts[0].toUpperCase() == 'N') 
			continue;

		if( summary[handle] === undefined)
			summary[handle] = 0;
			
		summary[handle]++;
	}

	var sortable = [];
	for( handle in summary )
		sortable.push([handle, summary[handle]])

	sortable.sort(function(a, b) {return a[1] - b[1]})

	i = sortable.length;

	while( i-- ){
		var handle = sortable[i][0],
			$chord = Chordify.chordToHtml(handle),
			imgHandle = handle.replace('#', 's').replace(':', '_');

		if( $chord === undefined ) continue;

		$('<div id="grip-' + imgHandle + '"/>')
			.data({handle: handle})
			.append($chord)
			.append('<br/>')
			.append('<span class="grip-wrap"><img alt="' + instrument + ' chord ' + imgHandle.replace('_', ' ') + 
				'" src="' + cdn + '/img/diagrams/' + instrument + (leftHanded ? '_left' : '') + '/' + imgHandle + '.png" /></span>')
			.appendTo($grips);
	}

	$('.grips').on('dragstart', 'img', function(e){
		e.preventDefault();
	});
}

Chordify.renderChords = function()
{
	var $window = $(window),
		$player = $('#song'),
		$chords = $player.find('.chords').data('offset', offset).empty().removeClass('loading'),
		
		chords = Chordify.song.initChords.slice(0),
		offset = Chordify.song.offset,
		barLength = Chordify.song.barLength;


	$chords[0].className = $chords[0].className.replace(/barlength-[0-9]/, '');
	$chords.addClass('barlength-' + barLength);	

	barCount = 0;
	hasFirst = false;
	var prevChordHandle = null,
		lazyLoad = Chordify.isCordovaApp ? 64 : 128,
		lazyChords = [];

	function appendChord( $chord ){
		if ($chord.data('shiftedBeat') == 1) {
			barCount++;

			if (barCount % 4 != 1)
				$chords.append('<div class="bar"></div>');
		}

		$chords.append($chord);
	}

	var i = 0;

	// delete upbeat chords
	while( true ){
		if( i > 5 || chords[0].b == 1 ){
			break;
		}
		//console.log('splice chord', chords[0], chords[0].b);
		i++;
		chords.splice(0, 1);
	}

	if( offset > 0 ){	
		// prepend empty chord blocks with positive offsets
		for( i=0; i < offset; i++ ){
			//console.log('prepend chord', 4-i);
			chords.unshift({
				b: 4 - i,
				c: 'n',
				f: 0,
				d: 0
			});
		}
	} else if( offset < 0 ){
		for( i=offset; i < 0; i++ ){
			//console.log('zplice');
			chords.splice(0, 1);
		}
	}

	//console.log(chords);

	// Go through all the chords in the delivered data
	for( i=0; i < chords.length; i++ ){

		// Pull chord information from the data
		var chordHandle = chords[i]['c'], // c, c#7, etc.
			beat = chords[i]['b'], // 1, 2, 3, 4, 5, 6, etc.
			from = chords[i]['f'], // time code
			duration = chords[i]['d'], // duration (in time code)
			shiftedBeat = beat;

		if( offset != 0 || barLength != 4 ){
			shiftedBeat = wrap(i + 1, 1, barLength);
		}

		//console.log(offset, i, i + offset, beat, shiftedBeat);

		if (shiftedBeat == 1)
			hasFirst = true;

		if (!hasFirst)
			continue;

		// Find out the full chord duration, and what the next chord handle is
		var chordDuration = 0,
			nextChordHandle = undefined;

		for (var j=i; j < chords.length; j++)
		{
			if (chordHandle == chords[j]['c'])
			{
				chordDuration += chords[j]['d'];
			} else {
				nextChordHandle = chords[j]['c'];
				break;
			}
		}

		// Convert the chord to HTML
		var $chord = Chordify.chordToHtml(chordHandle, chordHandle != prevChordHandle).data({
			beat: beat,
			shiftedBeat: shiftedBeat,
			from: from,
			duration: duration,
			chordDuration: chordDuration,
			nextChordHandle: nextChordHandle,
			i: i
		});

		if (Chordify.getParameter('debug')) {
			$chord.attr('title', 'from:' + from + ' duration:' + duration + ' beat:' + beat + ' shiftedBeat:' + shiftedBeat);
		}
	
		prevChordHandle = chordHandle;

		 if (i > lazyLoad) {
			// append to lazy list
			lazyChords.push($chord);
		} else {
			appendChord($chord);
		}

		chords[i].from = from;
		chords[i].dur = duration;
		chords[i].el = $chord,
		chords[i].beat = beat;
	}

	Chordify.song.chords = chords;

	function calculateChordPositions(){
		for( var i = 0; i < Chordify.song.chords.length; i++ ){
			if( Chordify.song.chords[i].el == undefined ){
				continue;
			}
			Chordify.song.chords[i].top = Chordify.song.chords[i].el.offset().top;
		}
	}

	function appendSongEnd(){
		// append song end
		$chords.append('<div class="bar"></div>').append('<div class="bar bar-end"></div>').append('<div class="clearb"></div>');	
		Chordify.setCurrentChord($('.chords .chord').first());
		$(window).resize();
	}

	if (lazyChords.length > 0)
	{
		setTimeout(function(){
			for( var i = 0; i < lazyChords.length; i++ ){
				appendChord(lazyChords[i]);
			}
			appendSongEnd();
			calculateChordPositions();
		}, 300);
	} else {
		appendSongEnd();
		setTimeout(calculateChordPositions, 300);
	}

	player.init();

	return chords;
}

Chordify.fadeIn = function(){

	var $body = $('body'),
		$mm = $('#mm');

	if( !$body.hasClass('faded') ){
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

	$('#backgroundOverlay').click(function(){
		Chordify.fadeOut(0);		
	});

	setTimeout(function(){
		$('body').removeClass('animate faded pre-animate');
		$('#content').css({top: '', left: ''});
		$(window).resize();
	}, 500);

	if(!$tooltip.data('sticky')) {
		$tooltip.remove();
	}
}
Chordify.fadeOut = function(timeout){
	if( window.innerWidth < 500 ){
		return;
	}
	var $mm = $('#mm'),
		$body = $('body').addClass('pre-animate');

	/*if( window.canRunAds === undefined ){
		$mm.html('<a style="display:block;width:970px;height:250px;" href="/premium"><img src="/img/premium/premium-billboard.jpg" /></a>');
	}*/
	if( timeout == undefined ){
		timeout = 1000;
	}
	setTimeout(function(){

		if( $('#exitPopup').length > 0 ){
			return;
		}

		var $content = $('#content');
			
		$content.css({left: $content.offset().left});
			
		$body.removeClass('animate');

		if( $mm.length > 0 ){
			$content.css({top: 262});
			$mm.hide();
			$body.addClass('animate faded');
			setTimeout(function(){
				$mm.css({display: ''});
				setTimeout(function(){
					$content.css({top: $(window).height()-170});
				}, 400);
			}, 10);
		} else {
			$content.css({top: $content.offset().top});
			$body.addClass('animate faded');
			setTimeout(function(){
				$content.css({top: $(window).height()-170});
			}, 10);
		}

	}, timeout);
	setTimeout(function(){
		$('#backgroundOverlay').fadeOut('fast', function(){
			$(this).remove();
		});
		$('#background').css({opacity: 1});
	}, timeout + 200);	
	setTimeout(function(){
		$('#song').on('mousemove mousedown touchstart', function(e){
			e.preventDefault();
			Chordify.fadeIn();	
		});
		$(window).on('scroll.faded', function(){
			Chordify.fadeIn();		
		});
	}, timeout + 1000);
};

$(document).ready(function(){

	$('#backgroundOverlay').click(function(){
		Chordify.fadeOut(0);		
	});

	if( !/\/chords|\/embed.+/.test(location.pathname) ){
		return true;
	}

	setTimeout(function(){
		$('#mm').css({opacity: 1});
	}, 500);
	
	function checkIframe( ifr ) {
		var key = ( +new Date ) + "" + Math.random();

		try {
	   		var cWindow = ifr.contentWindow;
			cWindow[key] = "asd";
			return cWindow[key] === "asd";
		} catch( e ) {
			return false;
		}
	}

	var	$player			= $('#song'),
		$controls		= $('.controls'),
		$window			= $(window),
		slug			= location.pathname.replace(/.*\/chords|embed\//, '');

	if( Chordify.isCordovaApp && location.search.indexOf('load') >= 0 ){
		slug = location.search.replace('?load=', '');
	}	

	Chordify.chordLang = 'english';

	if( $('.chordlang-latin').length >= 1 ){
		Chordify.chordLang = 'latin';
	} else if( $('.chordlang-german').length >= 1 ){
		Chordify.chordLang = 'german';
	}

	var $gripsArea = $('#gripsArea'),
		scrollPos = {chords: 0, grips: 0};

	$controls.find('button').on('click touchend', function(e){

		if( e.type == 'touchend' ){
			e.stopPropagation();
		}

		var $target = $(this),
			func = $target.attr('name'),
			$chordsArea = $('#chordsArea');	
		
		e.preventDefault();

		if( func == 'grips' ){
	
			$target.toggleClass('active'); 
			if( $chordsArea.is(':visible') ){

				Chordify.renderDiagrams();
				Chordify.diagramsVisible = true;

				scrollPos.chords = $window.scrollTop();

				$chordsArea.fadeOut('fast', function(){
					if( Chordify.mode == 'edit' ){
						$('.chord-edit-bar, .edit-owner').hide();
					}
					$('#gripsArea').fadeIn('fast');
					$window.scrollTop(scrollPos.grips);
				});
			} else {
				scrollPos.grips = $window.scrollTop();
				Chordify.diagramsVisible = false;

				$('#gripsArea').fadeOut('fast', function(){
					if( Chordify.mode == 'edit' ){
						$('.chord-edit-bar, .edit-owner').show();
					}
					$chordsArea.fadeIn('fast');
					$window.scrollTop(scrollPos.chords);
					Chordify.scrollToChord($('.currentChord'));
				});
			}
		} else if( func == 'edit' ){
			var editMode = $target.toggleClass('active').hasClass('active');
			Chordify.toggleEdit(editMode);
			/*if( editMode && $('body').hasClass('user-premium') ){
				$('.function-mute[name=chord-playback]').not('.active').click();
			}*/
		}
	});

	$gripsArea.find('a[href=#back]').click(function(e){
		e.preventDefault();
		$('.controls button[name=grips]').click();
	});

	$gripsArea.find('a.grips-download').click(function(e){
		e.preventDefault();
		window.open('/diagrams/' + Chordify.chordLang + '/Chordify-' + $('.grips-instruments button.active').attr('name') + '-diagrams.pdf');
	});

	$('.grips-instruments button').click(function(e){
		e.preventDefault();

		var $target = $(e.target),
			transpose = Chordify.transpose || 0;

		$('.grips-instruments button').removeClass('active');
		$target.addClass('active');
		$('.grips').removeClass('grips-guitar grips-piano grips-ukulele').addClass('grips-' + $target.attr('name'));

		Chordify.renderDiagrams();
	});

	var $body = $('body');

	if( !$body.hasClass('user-premium') ){

		var $song = $('#song');	

		var $premiumOverlay = $('#premiumOverlay').on('mouseenter click touchstart', function(){
			var $firstFunction = $('.function-premium:visible').first();
			$premiumOverlay.css({opacity: 1, left: $firstFunction.offset().left - $('.player-top').offset().left});
		});
		$premiumOverlay.on('mouseleave', function(e){
			if( $premiumOverlay.hasClass('unlock-confirm') ){
				return;
			}
			$premiumOverlay.css({opacity: 0});
		}).click(function(e){
			e.preventDefault();

			if( $(e.target).hasClass('unlock-cancel') ){
				$premiumOverlay.css({opacity: 0, display: 'none'}).html($premiumOverlay.data('prevHtml')).removeClass('unlock-confirm');
				setTimeout(function(){
					$premiumOverlay.css({display: 'block'});
				}, 1000);
				return;
			}

			if( $('#user').data('creditsleft') > 0 ){
				if( $premiumOverlay.hasClass('unlock-confirm') ){
					$.getJSON('/song/unlock/' + $song.data('songid'), function(data){
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
		$('body').on('mouseup', function(){
			$('#premiumOverlay').not('.unlock-confirm').css({opacity: 0});
		});
	}

	var loadPath = '';

	if( Chordify.isCordovaApp ){
		loadPath = 'http://chordify.net';
	}

	if( Chordify.LANG ){
		loadPath += '/' + Chordify.LANG;
	}	
			
	var $playerArea = $('#song'),
		options = $playerArea.data(),
		$audioPlayer = options.type == 'youtube' ? $('#youtube') : $('.jplayer');

	var playerWidth = $playerArea.width();
	$(window).resize(function(){
		playerWidth = $playerArea.width();
	});

	if( $('#suggestions').is(':visible') ){
		if( $('#suggestions a').length == 0 ){
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

	var loadUrl = loadPath + '/song/getdata/' + slug;

	if( Chordify.getParameter('edit') ){
		loadUrl += '?edit=' + Chordify.getParameter('edit');
	}

	if( Chordify.song == undefined ){
		Chordify.song = {};
	}

	// load chords via ajax
	$.getJSON( loadUrl, function(data)
	{
		Chordify.song = data.song;
		Chordify.song.initChords = Chordify.song.chords;
		Chordify.song.id = $('#song').data('songid');

		Chordify.song.chord_edits_id = data.song.chord_edits_id === undefined ? null : data.song.chord_edits_id;

		console.log(Chordify.song);

		var chords = Chordify.renderChords();
		var transpose = parseInt(Chordify.getParameter('transpose'), 10) || 0;

		if (Chordify.song.hasEdits) {
			if (Chordify.song['default']) {
				$('.admin-default').text('remove default status');
				$('.admin-good').remove();

			} else if (Chordify.song.good_edit) {
				$('.admin-good').text('remove good edit status');
			}
		}
	
		if(transpose != 0 && Chordify.transposeChords !== undefined) {
			Chordify.transposeChords(transpose);
			$('.function-transpose').toggleClass('active').find('.value').text(transpose);
		}

		if( location.hash == '#edit' ){
			$('.controls button[name=edit]').click();
		}

		if( Chordify.showEditor ){
			Chordify.showEditor();
		}
		$(window).resize();

		if( Chordify.setinitialRating ){
			Chordify.setinitialRating(data.userVote);
		}

	});

	HtmlPlayer.prototype.onStop = function() {
		if(!doAnimateDiagrams) return; // prevent diagram animations
		Chordify.setDiagramsForPlayback(true);
	}

	HtmlPlayer.prototype.onPlay = function() {
		if(!doAnimateDiagrams) return; // prevent diagram animations
		Chordify.setDiagramsForPlayback(false);
	};

	HtmlPlayer.prototype.onPause = function() {
		if(!doAnimateDiagrams) return; // prevent diagram animations
		Chordify.setDiagramsForPlayback(true);
	}

	var $currentChord,
		$currentGrip,
		$nextGrip,
		gripAnimationOffset=500,
		doAnimateDiagrams = false;

	HtmlPlayer.prototype.onChordChange = function(newChord, type) {
		if(!doAnimateDiagrams) return; // prevent diagram animations

		setCurrentChord(newChord);
		// $currentChord = newChord;

		var $grips = $('.grips');

		Chordify.currentChordHandle  = $currentChord.data('handle');
		Chordify.nextChordHandle	 = $currentChord.data('nextChordHandle');

		$currentGrip	= $grips.find('#grip' + Chordify.currentChordHandle);
		$nextGrip	   = $grips.find('#grip' + Chordify.nextChordHandle);

		if(Chordify.currentChordHandle === Chordify.prevChordHandle)
			return;

		Chordify.prevChordHandle = Chordify.currentChordHandle;
		var animationDuration = Chordify.getDiagramAnimationDuration($currentChord);
		if(animationDuration < gripAnimationOffset) {
			$nextGrip.animate({opacity: 1}, 300);
		} else {
			console.log('onChordChange: animate from', Chordify.currentChordHandle, 'to next', Chordify.nextChordHandle);
			Chordify.gripTimeout = setTimeout(function() {
				$nextGrip.animate({opacity: 1}, 300);
				$currentGrip.animate({opacity: 0.25}, 300);
			}, animationDuration); // animate 500ms before chord endsplaying
		}
	}

	Chordify.setDiagramsForPlayback = function(active) {
		clearTimeout(Chordify.gripTimeout);
		var $grips = $('.grips'),
			$el;

		$grips.children().each(function(i, el) {
			$el = $(el);
			var gripChordHandle = $el.data('handle');
			if(!active && gripChordHandle === Chordify.nextChordHandle) {
				var animationDuration = Chordify.getDiagramAnimationDuration($currentChord);
				if(animationDuration < gripAnimationOffset) {
					console.log('onPlaybackChange: animate next', Chordify.nextChordHandle);
					$nextGrip.animate({opacity: 1}, 300);
					return;
				}

				if($currentGrip !== undefined) {
					console.log('onPlaybackChange: animate current', Chordify.currentChordHandle);
					$currentGrip.animate({opacity: 1}, 300);
					return;
				}

				console.log('onPlaybackChange: animate from', Chordify.currentChordHandle, 'to', Chordify.nextChordHandle);
				Chordify.gripTimeout = setTimeout(function() {
					$nextGrip.animate({opacity: 1}, 300);
					$currentGrip.animate({opacity: 0.25}, 300);
				}, animationDuration);
			}else{
				$el.animate({opacity: active ? 1 : 0.25}, 300);
			}
		});
	}

	Chordify.getDiagramAnimationDuration = function(currentChord) {
		if(currentChord === undefined) return 0;
		var chordDuration = currentChord.data('chordDuration')*1000;
		return (chordDuration-gripAnimationOffset < 0) ? 0 : chordDuration-gripAnimationOffset;
	}
});
