function HtmlPlayer($el, source){
}

HtmlPlayer.prototype.initialize = function($el, type, streamUrl){
	this.$el = $el;
	this.isReady = false;
	this.isTweening = false;
	this.state = 'stopped';
	
	var me = this,
		media = {
			mp3: streamUrl
		};
		
	if( type == 'file' ){
		media.webma = media.mp3 + '&format=webm'; 
		media.mp3 += '&format=mp3';
	}
		
	// initialize jPlayer
	this.$el.jPlayer({
		ready: function () {
			me.action('setMedia', media);
			me.isReady = true;
			me.fire('ready');
		},
		size: {width: '1px', height: '1px'},
		volume: 100,
		errorAlerts: false,
		warningAlerts: false,
		solution: 'html, flash',
		swfPath: "/js/jplayer/",
		wmmode: 'window',
		supplied: $.jPlayer.platform.android ? 'webma,mp3' : 'mp3,webma'	
	}).on($.jPlayer.event.play, function(e){
		console.log('play');
		me.state = 'playing';
		
		// turn this button into pause
		//me.onPlay();
        me.fire('play');
		
	}).on($.jPlayer.event.pause, function(e){
		console.log('pause');
		me.state = 'paused';
		me.stopTween();
		me.fire('pause');
		
		if( e.jPlayer.status.currentTime === 0 ){
			me.state = 'stopped';
            me.fire('stop');
			console.log('stop via pause');
		} else {
		}
	}).on($.jPlayer.event.ended, function(e){
		console.log('ended');
		me.state = 'stopped';
		me.stopTween();
        me.fire('stop');
		
	}).on($.jPlayer.event.timeupdate, function(e){
		if( !me.isTweening && e.jPlayer.status.currentTime > 0 && !e.jPlayer.status.waitForPlay && !e.jPlayer.status.paused ){
			console.log('start tween', e.jPlayer.status.currentTime, e.jPlayer.status);
			// only start tween when curentTIme is not yet updated and the timeupdate from jPlayer is higher than 0
			me.tween();
		}
		
		//console.log(' - ' + e.jPlayer.status.currentTime);
		// keep the currentTime in shape
		me.currentTime = e.jPlayer.status.currentTime;
		//console.log(currentTime, e.jPlayer.status);
	}).on($.jPlayer.event.error, function(e){
		if( type == 'soundcloud' ){
			alert('Cannot stream the audio, perhaps the track is not available on SoundCloud anymore');
		} else{
			//alert('Cannot stream the file, a re-upload might work');
		}
	});
	
};

// can be overridden in other js files to be notified about chord changes during playback
HtmlPlayer.prototype.onChordChange = function(){
};

HtmlPlayer.prototype.stopTween = function(){
	this.isTweening = false;
	clearInterval(this.timer);
};

HtmlPlayer.prototype.tween = function (){
	if( this.isTweening == true ){
		return;
	}
	this.isTweening = true;	
	var me = this;
	
	this.onTween();
	
	this.timer = setInterval(function(){
		me.onPulse(me.currentTime);
		me.currentTime += 0.05;
		//console.log(' - tween ' + me.currentTime);
	}, 50);
};

HtmlPlayer.prototype.action = function(action, parms){
	
	console.log('action', action, parms);
	
	if( parms === undefined ){
		this.$el.jPlayer(action);
	} else {		
		
		if( action == 'play' ){
			this.currentTime = parms;
		}
		
		this.$el.jPlayer(action, parms);
	}
};

/* 
 * easy event handling for multiple listeners
*/

HtmlPlayer.prototype.events = {};
HtmlPlayer.prototype.on = function(eventName, callback){
	if( this.events[eventName] === undefined ){
		this.events[eventName] = [];
	}
	this.events[eventName].push(callback);
};
HtmlPlayer.prototype.fire = function(eventName){
	for( callback in this.events[eventName] ){
		if( this.events[eventName][callback] === undefined || !this.events[eventName][callback] ){
			continue;
		}
		this.events[eventName][callback].apply(this||window,$.makeArray(arguments).slice(1));
	}
};

/*
 * Html player events
 */

HtmlPlayer.prototype.onTween = function(){};

HtmlPlayer.prototype.onPulse = function(currentTime){};

HtmlPlayer.prototype.onStop = function(){};

HtmlPlayer.prototype.onPlay = function(){};

HtmlPlayer.prototype.onPause = function(){};
