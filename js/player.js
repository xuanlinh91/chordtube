if(window.Chordify === undefined) {
	window.Chordify = {};
}

(function($){
	
	$.fn.nextFirst = function(selector){
		var $next = $(this).next();
		
		if( !$next.is(selector) ){
			$next = $next.next();
		}
		
		return $next;
	};
	
	$.fn.prevFirst = function(selector){
		var $prev = $(this).prev();
		
		if( !$prev.is(selector) ){
			$prev = $prev.prev();
		}
		
		return $prev;
	};
	
})(jQuery);

function createPlayer($el, options){

	var isDragging = false,
		hasLoop = false,
		hasMoved = false,
		isEditable = false,
		$body = $('body'),
		currentChordIndex = 0,
		$controls = options.controls,
		$scrollArea = $(window),
		scrollAreaTop = 0;
		scrollAreaScrollTop = $scrollArea.scrollTop(),
		$chords = $('.chords'),
		offset = $chords.offset(),
		$currentChord = $(),
		chordHeight = 50,
		$loopChords = null,
		player = null,
		scrollAreaHeight = $scrollArea.innerHeight() - 200;	

	$scrollArea.scroll(function(){
		scrollAreaScrollTop = $scrollArea.scrollTop();		
	});

	if( options.type == 'youtube' ){
		player = new YoutubePlayer();	
		player.initialize($el, options.audio);
	} else if( options.type == 'deezer' ){
		player = new DeezerPlayer();
		console.log(player);
		player.initialize($el, options.audio);
	} else if( options.type == 'rocketsongs' || options.type == 'soundcloud' ){
		player = new HtmlPlayer();
		player.initialize($el, options.type, options.audio);
	} else {
		player = new HtmlPlayer();
		player.initialize($el, options.type, '//' + self.location.host + '/stream?file=' + options.file);
	}	

	/*console.log(
		'cachedTop', nextChord.top, 
		'realTop', $(nextChord.el).offset().top, 
		'saTop', scrollAreaTop,
		'realSeTop', $('.scrollArea').first().offset().top, 
		'saScrollTop', scrollAreaScrollTop, 
		'realSaScrollTop', $('.scrollArea').first().scrollTop(),
		'saHeight', scrollAreaHeight,
		'realSaHeight', $('.scrollArea').first().height(),
		'this is:', $(nextChord.el).offset().top - scrollAreaScrollTop + (chordHeight*2), 
		'more than:', scrollAreaTop + scrollAreaHeight
	);*/

	function playerAction(action, $fromChord){

		$('.pulsate').removeClass('pulsate');

		if(action == 'play')
			player.fire('chordchange', $fromChord || $currentChord, 'play');

		if( $fromChord === undefined ){
			player.action(action);
		} else {
			setCurrentChord($fromChord);
			var from = 0;
			if( Chordify.song.chords[$fromChord.data('i')] ){
				from = Chordify.song.chords[$fromChord.data('i')].from;
			}
			player.action(action, from);
		}
	}
	
	function togglePlay(){
		var action = player.state == 'playing' ? 'pause' : 'play';

		console.log('togglePlay', action, player.state, $currentChord);
	
		if( Chordify.mode == 'edit' && action == 'play' ){
			var $editChord = $('.chord-edit');
			if( $editChord.length == 0 ){
				$editChord = $currentChord;
			}
			playerAction('play', $editChord);
		} else {
			if( action == 'play' ){
				scrollToChord($currentChord);
			}
			playerAction(action, $currentChord);
		}
	}
	
	function updateButtonState(){
		$controls.children('.icon-clear').toggleClass('disabled', !hasLoop);
	}

	function setCurrentChord($chordElement){
		if( !$chordElement.hasClass('chord') ){
			return;
		}

		currentChordIndex = $chordElement.data('i') || 0;
		if( $currentChord ){
			$currentChord.removeClass('currentChord');
		}

		$currentChord = $chordElement.addClass('currentChord');
	}

	Chordify.setCurrentChord = setCurrentChord;

	player.onPulse = function(currentTime){
		var nextChord = Chordify.song.chords[currentChordIndex+1];

		if( !nextChord ){
			return;
		}

		// see if we should jump to next chord
		if( currentTime + 0.1 >= nextChord.from ){

			currentChordIndex++;

			// double check if this chord isn't already skipped
			while( Chordify.song.chords[currentChordIndex] !== undefined && currentTime + 0.1 >= nextChord.to ){
				nextChord = Chordify.song.chords[++currentChordIndex];
			}

			// detect end of a loop
			if( hasLoop && $currentChord.hasClass('loop') && !nextChord.el.hasClass('loop') ){
				console.log('jump');
				setCurrentChord($loopChords.first());
				player.fire('chordchange', $currentChord, 'loop');
				// play loop again
				player.action('play', Chordify.song.chords[$currentChord.data('i')].from);

				// scroll up to chord if needed
				if( Chordify.song.chords[currentChordIndex].top < scrollAreaTop ){
					var newScrollTop = scrollAreaScrollTop + scrollAreaTop + Chordify.song.chords[currentChordIndex].top - (chordHeight*2)
					$('html,body').stop().animate({scrollTop: newScrollTop }, function(){
						scrollAreaScrollTop = $scrollArea.scrollTop();
					});
				}
				return true;
			} else {
				player.fire('chordchange', nextChord.el);
			}

			setCurrentChord(nextChord.el);
				
			if( nextChord.top - scrollAreaScrollTop + (chordHeight*2) > scrollAreaTop + scrollAreaHeight ){
				if( !Chordify.diagramsVisible ){
					$('html,body').stop().animate({scrollTop: scrollAreaScrollTop + (chordHeight*2)}, function(){
						scrollAreaScrollTop = $scrollArea.scrollTop();					
					});
				}
			}
			
		} else if( currentChordIndex > 1 && currentTime + 0.5 < Chordify.song.chords[currentChordIndex].from ){
			// if currentChord is ahead of the actual playtime, search for the correct chord
			while( currentTime + 0.1 < Chordify.song.chords[currentChordIndex].from ){
				//console.log('searching backwards', currentTime, Chordify.song.chords[currentChordIndex]);
				currentChordIndex--;
				if( !Chordify.song.chords[currentChordIndex] ){
					currentChordIndex++;
					break;
				}
			}
			if( Chordify.song.chords[currentChordIndex] !== undefined ){
				setCurrentChord(Chordify.song.chords[currentChordIndex].el);
			}
		}

	};

	player.on('preview', function(){
		// deezer preview, gray out certain area's

		ga('send', 'event', 'Notifications', 'DeezerPreviewOnly');

		var stop = setInterval(function(){
			console.log(player.state);
			if( player.state == 'playing' ){
				DZ.player.seek(100);
				player.stopTween();
			} else {
				setCurrentChord($('.chord').first());
				DZ.player.setMute(false);
				clearInterval(stop);
			}
		}, 500);
		DZ.player.seek(100);
		player.stopTween();
		DZ.player.setMute(true);
		setCurrentChord($('.chord').first());
		for( i in Chordify.song.chords ){
			if( Chordify.song.chords[i].to < 30.5 || Chordify.song.chords[i].from > 61.5 ){
				Chordify.song.chords[i].el.css({backgroundColor: '#ddd', color: '#aaa'})
				.prev('.bar').css('background', '#aaa');
			}
		}
		$('#chordsArea').css({position: 'relative'});
		$('.chords').before('<div id="deezerNotification" style="position:absolute;border: 2px dashed #DDD;border-radius:6px;color:#DB512C;left:80px;top:25px;right:80px;padding:20px;background:rgba(255,255,255,0.8);text-align:center;">' +
			'<span class="icon-close" style="float:right;cursor:pointer;margin: -10px -10px 0 0;"></span>' + 
			'<span class="icon-deezer" style="font-size:60pt;line-height:10px;margin-top:10px;"></span><br/>' +
			'Full-length Deezer tracks are only available if you have a <a href="http://www.deezer.com?app_id=114161" target="_blank">(free) Deezer account</a>.<br/>' + 
			'Alternatively you can also search for "<a href="#" onclick="$(\'#url\').val($(this).text()).keyup().focus();return false;">' + $('.metadata h1 span').first().text().trim() +  ' ' + $('.metadata h1 span').last().text().trim() + '</a>" on YouTube and SoundCloud.' +
		'</div>');
		$('#chordsArea a').first().click(function(e){
			e.preventDefault();
			DZ.login();
		});
		$('#deezerNotification .icon-close').click(function(){
			$('#deezerNotification').fadeOut();
		});
	});

	player.on('ready', function(){
		console.log(player);
		if( $body.hasClass('user-premium') && player.speeds && Object.keys(player.speeds).length <= 1 ){
			$('.function-premium[data-type=speed]').on('click mousedown touchstart', function(e){
				// make sure this playback function does not work
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();

				// show tooltip
				var $tooltip = $('.tooltip');
				if(!$tooltip.data('sticky')) {
					$tooltip.remove();
				}
				tooltip($(this));

				return false;
			}).css({opacity: 0.5})
			.data('tooltip', Lang.speed_not_supported);		
		}

		$('.play .icon-right').removeClass('disabled').data('tooltip', null);
	
		$('.play .icon-right, .currentChord').addClass('pulsate');

		if( Chordify.getParameter('play') == 1 ){
			player.action('play');
		}
	});
	
	var playTS = null; 

	function playbackEvent(action){
		
		var songId = Chordify.song.id + (Chordify.song.version_id ? ('-' + Chordify.song.version_id) : ''),
			playDuration = playTS == null ? null : Date.now() - playTS;

		if( action == 'Play' ){
			playTS = Date.now();
		} else if( action == 'Stop' || action == 'Pause' ){
			playTS = null;
		} else {
			return;
		}
		
		if( !playDuration ){
			ga('send', 'event', 'Playback', action, songId);
		} else {
			ga('send', 'event', 'Playback', action, songId, playDuration);
		}
	}

	player.on('stop', function(){
		console.log('onStop');
		$controls.find('.icon-pause').removeClass('icon-pause').addClass('icon-right');
		$controls.find('.icon-rewind').css('opacity', '');
		playbackEvent('Stop');
		setCurrentChord($chords.children('.chord').first());
	});
	
	player.on('pause', function(){
		console.log('onPause');
		playbackEvent('Pause');
		// turn button into play
		$controls.find('.icon-pause').removeClass('icon-pause').addClass('icon-right');
		if( Chordify.mode == 'edit' && $('.chord-edit').length > 0 ){
			setCurrentChord($('.chord-edit'));
		}	

		if( Chordify.player.currentTime > 10 ){
			premiumTooltip();
		}
	});

	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function premiumTooltip(){
		var expId = '9opiXRUlQHqdW95oU9HRBA',
			variation = cxApi.getChosenVariation(expId);

		if( $body.hasClass('user-premium') || Chordify.mode != 'play' ){
			return;
		}

		if( getCookie('ttExp') && location.host == 'chordify.net' ){
			// don't show again
			return;
		}

		if( location.host != 'chordify.net' ){
			variation = -1;
		}
		if( variation == -1 ){
			variation = getRandomInt(0, 4);
		}

		var ttText = '',
			offset = 0,
			$feature = null;

		if( variation == 0 ){
			ttText = Lang.tt_transpose;
			$feature = $('.function-transpose');
		} else if( variation == 1 ){
			ttText = Lang.tt_speed;
			$feature = $('.function-speed');
		} else if( variation == 2 ){
			ttText = Lang.tt_print;
			$feature = $('.controls li').last();
		} else if( variation == 3 ){
			ttText = Lang.tt_midi;
			$feature = $('.controls li').last().prev();
		} else if( variation == 4 ){
			ttText = Lang.tt_chord_playback;
			$feature = $('.controls li').last().prev().prev();
		}

		if( !$feature.is(':visible') ){
			return;
		}
		
		setCookie('ttExp', 1, 3600 * 24 * 20);
		
		if( location.host == 'chordify.net' ){
			cxApi.setChosenVariation(variation, expId);
		}
			
		offset = $feature.offset().left - $('.controls').offset().left + ($feature.outerWidth(false) / 2) ;

		tooltip($('#premiumOverlay').data({'tooltip-offset': offset,'tooltip-sticky' : true, 'tooltip-inline': true, 'tooltip-style': 'blue', tooltip: ttText}));

		if( variation == 2 ){
			$('.tooltip-blue').css({marginLeft: -120});
			$('.tooltip-blue .icon-up').css({'float': 'right', 'margin-right': 3});
		}
	}
	
	player.on('play', function(){
		console.log('onPlay');
		playbackEvent('Play');
		player.onPlay();
		$controls.find('.icon-rewind').css('opacity', 1);
		$controls.find('.play .icon-right').removeClass('icon-right').addClass('icon-pause');

		$('.pulsate').removeClass('pulsate');

		hideTooltips();
		$('.tooltip-sticky').remove();

		Chordify.fadeIn();
	});
	
	// controls
	$controls.find('button').on('touchend click', function(e){

		if( e.type == 'touchend' ){
			e.stopPropagation();
		}

		var $target = $(e.target),
			action = $target.attr('name');
		
		if( $target.hasClass('icon-close') ){
			return true;	
		}

		e.preventDefault();

		if( $target.hasClass('disabled') ){
			if( action == 'play' ){
				if( options.type == 'youtube' ){
					$target.data('tooltip', 'The YouTube player has not been loaded yet.' + 
						' Please note that some browser plugins might prevent the Youtube video from loading correctly.');
				} else if( options.type == 'deezer' ){
					$target.data('tooltip', 'Please wait while the Deezer player is loading.');
				}
				tooltip($target);
			}
			return true;
		}
		
		if( action == 'play' ){
			togglePlay();
		} else if( action == 'rewind' ){

			if( Chordify.player.currentTime > 10 ){
				premiumTooltip();
			}

			setCurrentChord($chords.children('.chord').first());
			player.action('playHead', 0);
			currentTime = 0;
			$('html,body').stop().animate({scrollTop: 0}, function(){	
				scrollAreaScrollTop = 0;
			});
	
		} else if( $target.hasClass('edit') ){
			$target.toggleClass('active');
			isEditable = $target.hasClass('active');
			
			if( isEditable ){
				playerAction('pause');
			}
		}
	});		

	// TODO: in the future we will set this boolean based on 'loop mode' for touch device
	var canCreateLoop = true,
		hasTouchMoved = false;

	Chordify.mode = 'play';
	Chordify.diagramsVisible = false;
	
	$chords.on('click touchend', function(e){

		if( e.type == 'touchend' ){
			if( hasTouchMoved ){
				hasTouchMoved = false;
				return;
			}
			e.stopPropagation();
		}

		var $target = $(e.target);
			$chord = $target.closest('.chord');

		if( $chord.length == 0 || $target.closest('.loop-options').length > 0 ){
			e.preventDefault();
			return true;
		}

		if( Chordify.mode == 'edit' ){
			Chordify.openEditTooltip($chord);
			if( player.state != 'playing' ){
				$('.currentChord').removeClass('currentChord');
			}
			return true;
		}

		playerAction('play', $chord);
		player.fire('chordchange', $chord, 'click');

	}).on('mousedown touchstart', function(e){
		if( e.type == 'mousedown' && e.which != 1 ){
			// only left button
			return true;
		}

		if( e.type == 'touchstart' ){
			// we use this event to detect touch support
			canCreateLoop = false;
			return true;
		}

		var $target = $(e.target).closest('.chord'),
			href = $(e.target).attr('href');

		// handle remove and copy loop buttons
		if( href == '#remove' ){
			$('.loop').removeClass('loop loop-first');
			$('.loop-options').remove();
			hasLoop = false;
			isDragging = false;
			e.stopImmediatePropagation();
			return false;
		} else if( href == '#copy' ){

			Chordify.copyChords = $('.loop').animate({opacity: 0.5}, 'fast', function(){$('.loop').animate({opacity: 1}, 'fast')});
			isDragging = false;

		} else if( $target.hasClass('chord') ){
			
			isDragging = true;
			hasMoved = false;
			$loopStart = $target;

			// disabled text selection via js, using for chrome, probably IE too
			document.onselectstart = function(){ return false; };
		}
		
		$chords.toggleClass('chords-loop', hasLoop);

		// return so mousedown won't get fired when touchstart already ocurred
		if( e.type == 'touchstart' ) return false;

		return true;

	}).on('mouseover touchmove', function(e){

		if( e.type == 'touchmove' ){
			hasTouchMoved = true;
		}

		if( !canCreateLoop ){
			return;
		}

		var $target = $(e.target).closest('.chord');
		
		if( e.originalEvent.touches !== undefined ){
			e.preventDefault();
			var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0],
				x = touch.pageX - offset.left,
				y = touch.pageY - $body.scrollTop();
			$target = $(document.elementFromPoint(x, y));	
		}
				
		if( isDragging && $target.hasClass('chord') ){
			
			hasMoved = true;
			
			e.preventDefault();
			$chords.find('.loop').removeClass('loop loop-first');
			$('.loop-options').remove();
			$loopStart.addClass('loop');
			$target.addClass('loop');

			// find previous elements to give 'loop' class in case it missed it
			if( $target.index() > $loopStart.index() ){ 
				$target.prevUntil($loopStart).filter('.chord').addClass('loop');
			} else if( $target.index() < $loopStart.index() ){
				$target.nextUntil($loopStart).filter('.chord').addClass('loop');
			}
		}
		// return so mouseover won't get fired when touchmove already ocurred
		return false;
	});
	
	$body.on('mouseup touchend', function(e){
		// the end of dragging a loop
		if( isDragging && hasMoved ){
			var numOfChords = $('.loop').length;

			if( numOfChords > 1 ){
				$('.loop-options').remove();

				// make sure the $loopStart element is the first in the loop (in case you drag from right to left)
				$loopStart = $chords.find('.loop').first().addClass('loop-first');
				
				$chords.find('.loop').last().append('<div class="loop-options"><a href="#copy" class="loop-copy">' + Lang.copy + 
					'</a><a href="#remove" class="icon-close"></a></div>');

				hasLoop = true;
				$loopChords = $chords.children('.loop');
				Chordify.loopChords = $loopChords;
				if( Chordify.mode != 'edit' ){
					playerAction('play', $loopStart);
				}
			} else {
				$('.loop').removeClass('loop');
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				isDragging = false;
				hasLoop = false;
				hasMoved = false;
				return false;
			}
			updateButtonState();
		}
		$chords.toggleClass('chords-loop', hasLoop);
		document.onselectstart = null;
		isDragging = false;	
		hasMoved = false;
		// return false;
	});

	$(document).on('keyup keypress', function(e){
		if( e.target.tagName.toLowerCase() == 'input' ){
			return;
		}
		if( e.which == 32 ){ // spacebar
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			return false;
		}
	});
	
	// keyboard shortcuts
	$(document).keydown(function(e){

		if( e.target.tagName.toLowerCase() == 'input' || e.target.tagName.toLowerCase() == 'textarea' ){
			// allow all keys in an input field
			// spacebar in edit mode is still a key control
			if( !(Chordify.mode == 'edit' && e.which == 32 && $(e.target).hasClass('chord-edit-input')) ){
				return;
			}
		}

		if( e.which == 13 && Chordify.mode == 'edit' ){
			Chordify.openEditTooltip($('.chord-edit'));
			$('.chord-edit-tooltip .icon-edit').click();
		} else if( e.which == 32 ){ // spacebar
			e.preventDefault();
			togglePlay();
			return false;
		} else if( e.which == 39 ){ // arrow right 
			e.preventDefault();
			if( Chordify.mode == 'edit' ){
				if( e.metaKey || e.ctrlKey ){
					$('.chord-edit-tooltip .icon-right').click();
				} else {
					Chordify.openEditTooltip($('.chord-edit').nextFirst('.chord'));
				}
			} else {
				setCurrentChord($currentChord.nextFirst('.chord'));	
			}
		} else if( e.which == 37 ){ // arrow left
			e.preventDefault();
			if( Chordify.mode == 'edit' ){
				if( e.metaKey || e.ctrlKey ){
					$('.chord-edit-tooltip .icon-left').click();
				} else {
					Chordify.openEditTooltip($('.chord-edit').prevFirst('.chord'));	
				}
			} else {
				setCurrentChord($currentChord.prevFirst('.chord'));
			}
		} else if( e.which == 40 ){ // arrow down
			var lineOffset = $chords.hasClass('barlength-3') ? 11 : 15; 
			if( Chordify.mode == 'edit' ){
				Chordify.openEditTooltip($('.chord-edit').siblings().eq($('.chord-edit').index() + lineOffset).filter('.chord'));
			} else {
				setCurrentChord($currentChord.siblings().eq($currentChord.index() + lineOffset).filter('.chord'));
			}
			e.preventDefault();
		} else if( e.which == 38 ){ // arrow up	
			var lineOffset = $chords.hasClass('barlength-3') ? 12 : 16; 
			if( Chordify.mode == 'edit' ){
				if( $('.chord-edit').index() <= lineOffset -3 ){
					return; // already on top
				}
				Chordify.openEditTooltip($('.chord-edit').siblings().eq($('.chord-edit').index() - lineOffset).filter('.chord'));
			} else {
				if( $currentChord.index() <= lineOffset -3 ){
					return; // already on top
				}
				setCurrentChord($currentChord.siblings().eq($currentChord.index() - lineOffset).filter('.chord'));
			}
			e.preventDefault();
		}

		if( e.which == 39 || e.which == 37 || e.which == 40 || e.which == 38 ){
			// check if current or edit chord is out of sight and scroll
			var $scrollChord = $('.chord-edit');
			if( $scrollChord.length == 0 ){
				$scrollChord = $('.currentChord');
			}
			scrollToChord($scrollChord);
		}
	});

	function scrollToChord($scrollChord){
		if( !$scrollChord || $scrollChord.length == 0 ){
			return;
		}
		var scrollChordTop = $scrollChord.offset().top;
		
		if( scrollChordTop < 60 ){
			return;
		}

		if( scrollChordTop + (chordHeight * 2) - scrollAreaScrollTop > scrollAreaHeight ){
			$('html,body').stop(false, true).animate({scrollTop: scrollChordTop - scrollAreaHeight + (chordHeight * 2)}, 'fast');
		} else if( scrollChordTop < scrollAreaScrollTop + 109 ){
			$('html,body').stop(false, true).animate({scrollTop: scrollChordTop - (chordHeight * 2)}, 'fast');
		}
	}
	Chordify.scrollToChord = scrollToChord;

	if( Chordify.getParameter('loop') ){
		var loop = Chordify.getParameter('loop').split(/,/);
		$loopChords = $chords.find('.chord:gt(' + (loop[0]-1) + '):lt(' + loop[1] + ')').addClass('loop');
		hasLoop = true;
		$chords.toggleClass('chords-loop', hasLoop);
	}

	if( Chordify.getParameter('from') ){
		setCurrentChord($chords.children('.chord').eq(Chordify.getParameter('from')-1));
	}

	player.init = function()
	{
		$('.currentChord').removeClass('currentChord');
		$currentChord = $();

		setCurrentChord($chords.children('.chord').first());

		chordHeight = $currentChord.height();	

		$(window).resize(function(){
			scrollAreaHeight = $scrollArea.innerHeight() - (self.location.pathname.indexOf('/embed/') >= 0 ? 300 : 200);
			scrollAreaScrollTop = $scrollArea.scrollTop();
			chordHeight = $currentChord.height();
		});
	};
		
	return player;
}

