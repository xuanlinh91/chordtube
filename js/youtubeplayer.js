var YoutubeReady = false;

function onYouTubePlayerAPIReady(){
	YoutubeReady = true;
}


function YoutubePlayer(){
}

//'extend' html player to youtube player
YoutubePlayer.prototype = new HtmlPlayer();

YoutubePlayer.prototype.initialize = function($el, videoId){
	this.state = 'stopped';
	this.timer = null;
	this.lastSeek = (new Date()).getTime();
	this.yt = null;
	this.currentTime = 0;

	var me = this;
	
	if( YoutubeReady && window.YT !== undefined ){
		this.loadPlayer($el, videoId);
	} else {
		console.log('Youtube not ready');
		var loadTimer = null;
		
		loadTimer = setInterval(function(){
			console.log('Check for YoutubeReady');
			if( YoutubeReady && window.YT !== undefined ){
				console.log(' - success, start loading youtube');
				clearInterval(loadTimer);
				me.loadPlayer($el, videoId);
			} else {
				console.log(' - failed');
			}
		}, 200);

		var loadTimeout = 30000;

		setTimeout(function(){
			clearInterval(loadTimer);
			
			// just force a load and stop trying
			if( me.yt === null ){
				me.loadPlayer($el, videoId);
			}
			if( !me.yt ){
				showPopup(
					'The Youtube player cannot be loaded. ' +
					'Please reload the page and make sure your browser is up to date.'
				);
				$('#youtube').remove();
			}

		}, loadTimeout);
	}
};

YoutubePlayer.prototype.isUserInited = false;

YoutubePlayer.prototype.loadPlayer = function($el, videoId){
	
	if( window.YT === undefined || window.YT.Player === undefined ){
		return;
	}

	var me = this,
		playerVars = {
			modestbranding: 1,
			playsinline: 1,
			disablekb: 1,
			/*
			 * if html5 is set to 1, some vids might not play if they want to serve ads.
			 * however, speed control only works with html5 playback
			 * perhaps iv_load_policy setting might have influence to this
			 */
			html5: 1,
			autohide: 1,
			controls: (window.innerHeight <= 530 && window.innerWidth <= 900 ? 1 : 0),
			color: 'white',
			fs: 0,
			origin: self.location.origin,
			theme: 'light',
			showinfo: 0,
			rel: 0,
			wmode: 'opaque'
			,iv_load_policy: 3 // do not show annotations
		};

	if( Chordify.isCordovaApp ){
		playerVars.controls = 1;
		playerVars.origin = 'https://chordify.net';
	}
	
	this.yt = new YT.Player($el.attr('id'), {
		height: $el.height(),
		width: $el.width(),
		videoId: videoId,
		playerVars: playerVars,
		events: {
			onReady: function(e){
				var vidData = me.yt.getVideoData();
				if( vidData && vidData.title == '' ){
					ga('send', 'event', 'Offline Songs', 'youtube', self.location.pathname, {nonInteraction: 1});
				} 

				if( me.yt && me.yt.unMute !== undefined ){
					me.yt.unMute();
					me.yt.setVolume(100);
				}

				if( me.speeds != undefined ){
					var playbackRates = me.yt.getAvailablePlaybackRates(),
						i = playbackRates.length,
						minSpeed = Math.floor(playbackRates.length / 2) -1;

					while( i-- ){
						me.speeds['' + (i - minSpeed)] = playbackRates[i];
					}

					delete me.speeds['-2']; // YouTube does not support audio playback for 0.25x
				}

				me.isReady = true;
				$(window).focus();
				me.fire('ready', me);
			},
			onPlaybackRateChange: function(e){
				console.log('speed');
				me.fire('speed', me);
			},
			onStateChange: function(e){

				if( e === undefined ){
					return;
				}
			
				// focus on window te remove focus from the flash vid. better key command support
				$(window).focus();
				
				//console.log('STATE CHANGE, from:', me.state, me.yt, e.data, e, YT.PlayerState);
				
				if( e.data == YT.PlayerState.UNSTARTED ){
					me.state = 'unstarted';
				} else if( e.data == YT.PlayerState.BUFFERING ){
					me.state = 'buffering';
				} else if( e.data == YT.PlayerState.PLAYING ){
					console.log('PLAYING');
					if( me.state != 'playing' ){
						if( me.state == 'stopped' ){
							me.isUserInited = true;
							if( isTouch ){
								// fake play from currentChord when touch device
								$('.currentChord').click();
							}
						}
						me.state = 'playing';
						//me.onPlay();
                        me.fire('play');
					}
					setTimeout(function(){
						me.tween();
					}, 1000);
						
				} else if (e.data == YT.PlayerState.PAUSED ) {
					console.log('PAUSED');
					me.state = 'paused';
					console.log(me.timer);
					clearInterval(me.timer);
					
					me.fire('pause');
				} else if( e.data == YT.PlayerState.ENDED ){
					console.log('ENDED');
					me.state = 'stopped';
					//me.onStop();
                    me.fire('stop');
					clearInterval(me.timer);
				}
			}
		}
	});	
};

YoutubePlayer.prototype.tween = function (){
	
	this.onTween();
	
	if( this.yt ){
		this.currentTime = this.yt.getCurrentTime();
	}
	
	clearInterval(this.timer);
	
	var me = this,
		ytTime = 0;
	
	this.timer = setInterval(function(){
		
		// we get youtubes time
		ytTime = me.yt.getCurrentTime();

		if( ytTime == me.prevYtTime && (new Date()).getTime() - me.lastSeek < 1000 ){		
			// if the ytTime and previous are the same while lastseek is very recent, 
			// ignore these timestamps because they are from an old playback position
			return;
		}

		me.prevYtTime = ytTime;
		
		// we always add time ourselves
		me.currentTime += 0.02;

		// only update if offset with youtube's player is positive
		if( ytTime - me.currentTime > 0 ){
			//console.log('positive fix', me.currentTime, ytTime, ytTime - me.currentTime);
			me.currentTime = ytTime;
		} else if( ytTime - me.currentTime < -0.3) {
			// also update if the actual time is x ms earlier
			//console.log('negative fix', me.currentTime, ytTime, ytTime - me.currentTime);
			me.currentTime = ytTime;
		}
		if( me.currentTime > 0 ){
			me.onPulse(me.currentTime);
		}
	}, 20);
};

/**
 * function to seek to position. 
 * Some throttling is built in, because this should not happen too much
 */
YoutubePlayer.prototype.seekTo = function(time){

	var currentEpoch = (new Date()).getTime();
	
	if( currentEpoch - this.lastSeek < 1000 ){		
		return false;
	}

	if( time == 0 ){
		// for youtube we somehow cannot use 0
		time = 0.0001;
	}
	
	if( !this.isReady || this.yt === undefined || this.yt.seekTo === undefined ){
		var me = this;
		setTimeout(function(){
			me.seekTo(time);
		}, 500);
		this.currentTime = time;
		return;
	}

	this.lastSeek = currentEpoch;
		
	this.yt.seekTo(time);
	this.tween();
	
	this.currentTime = time;
};

YoutubePlayer.prototype.action = function(action, parms){

	if( !this.isReady || this.yt === undefined || this.yt.playVideo === undefined ){
		var me = this;
		setTimeout(function(){
			me.action(action, parms);
		}, 500);
		return;
	}

	console.log(action, parms);
	
	if( action == 'play' ){

		this.yt.playVideo();

		if( parms !== undefined ){
			this.seekTo(parms);
		}
			
		if( isTouch && !this.isUserInited && !Chordify.isCordovaApp ){
			var me = this;
			setTimeout(function(){
				if( me.state == 'buffering' && !me.isUserInited ){
					me.yt.pauseVideo();
					$('#youtube').data({'tooltip': 'When using a tablet or smartphone, press the video to play.', tooltipPos: 'above'});
					tooltip($('#youtube'));
				}
			}, 1000);
		}

		return;

	} else if ( action == 'playHead' ){
		this.seekTo(parms);
		return;
	}
	
	if( action == 'pause' ){
		this.yt.pauseVideo();
	} else if( action == 'stop' ){
		this.yt.stopVideo();
	} else if( action == 'mute' ){
		if( parms ){
			this.yt.mute();
		} else {
			this.yt.unMute();
		}
	}
	this.currentTime = this.yt.getCurrentTime();
};

YoutubePlayer.prototype.loadVideo = function(videoId){
	this.yt.loadVideoById(videoId);
};
