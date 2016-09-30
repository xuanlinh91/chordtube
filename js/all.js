$.scrollbarWidth=function(){var a,b,c;if(c===undefined){a=$('<div style="width:50px;height:50px;overflow:auto"><div/></div>').appendTo('body');b=a.children();c=b.innerWidth()-b.height(99).innerWidth();a.remove()}return c};

if(window.Chordify === undefined) {
	window.Chordify = {};
}

var weboramaRef = null,
	chordifyBox = {
	hide: function(){

		Chordify.fadeOut(0);
		$('#sidebar').addClass('collapse');
		$('#youtube').animate({left: -$('#youtube').width()+50});
		$('#slidebarOverlay').click();
		setTimeout(function(){
			$('#content').animate({top: window.innerHeight - 50});
		}, 250);
		$('#suggestions').hide();
		$('#sidebar, #song').on('mousedown mouseenter mousemove', function(e){
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			$('#sidebar, #song').off('mousedown mouseenter mousemove');
			weboramaRef.closeVideo();
			return false;
		});
		Chordify.player.action('stop');
	},
	show: function(){
		$('#sidebar').removeClass('collapse');
		$('#youtube').animate({left: ''});
		$('#content').animate({top: ''});
		$('#suggestions').show();
		Chordify.fadeIn();
	}
},
bgTimer = {
	active: true,
	play: function(){
		bgTimer.active = true;
	},
	pause: function(){
		bgTimer.active = false;
	}
};

window.onerror = function(msg, url, line, column, errorObj){
	if( url !== undefined && url.indexOf('cloudfront') == -1 ){
		return;
	}

	if( column == undefined ){
		column = '-';
	}

	if( errorObj === undefined || errorObj.stack === undefined  ){
		errorObj = {stack: 'none'};
	}

	if( msg && msg.indexOf('SecurityError') >= 0 ){
		return;
	}

	$.post('/js/debug', {data: 'JSERROR:' + url + ':' + msg + ':' + line + ':' + column, stack: errorObj.stack});
}

if( window.console === undefined || window.console.log === undefined ){
	window.console = {}
	window.console.log = function(){}
}

// http://tosbourn.com/2013/08/javascript/a-fix-for-window-location-origin-in-internet-explorer/
if( !window.location.origin ){
	window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
}

Chordify.isCordovaApp = !!window.cordova;

(function(){
	var dirParts = location.pathname.split(/\//);
	Chordify.LANG = /^[a-z]{2}(-[a-z]{2})?$/.test(dirParts[1]) ? dirParts[1] : null;
})();

Chordify.parameters = location.search;
Chordify.getParameter = function(name, text) {
	if( text === undefined ){
		text = Chordify.parameters;
	}
	name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	var regexS = "[\\?&]" + name + "=([^&#]*)",
		regex = new RegExp(regexS),
		results = regex.exec(text);
	if(results == null)
		return false;
	else
		return decodeURIComponent(results[1].replace(/\+/g, " "));
};

function toggleSlideBar(toggle, $el, callback){
	var $slidebar = $('.slidebar'),
		$overlay = $('#slidebarOverlay');

	if( toggle === null ){
		// no toggle set, decide what to do
		toggle = !($slidebar.length > 0 && $slidebar.attr('class') == $el.attr('class'));
	}

	if( !toggle ){
		$overlay.stop().animate({opacity: 0}, 'fast', function(){
			$overlay.remove();
		});
		$slidebar = $slidebar.stop().animate({left: -130}, 'fast', function(){
			$slidebar.removeClass('slidebar');		
		});	
		return null;
	}

	if( toggle && $slidebar.length > 0 ){
		// slider is already open
		if( $slidebar.attr('class') == $el.attr('class') ){
			// the same slidebar is already visible, return
			return $slidebar;
		}
		// new slidebar content should be displayed
		$('.slidebar').removeClass('slidebar');
		$slidebar = $el.addClass('slidebar').css({left: $('#sidebar').width()});
	} else {
		$slidebar = $el.addClass('slidebar').animate({left: $('#sidebar').width()}, 'fast');

		$('#slidebarOverlay').remove();
		$('<div id="slidebarOverlay"></div>').appendTo('body').stop().animate({opacity: 0.5}, 'fast').click(function(){
			toggleSlideBar(false)	
		});
	}
	if( callback !== undefined ){
		callback($slidebar, true);
	}
	return $slidebar;
}

function tooltip($el, sticky){
	// prevent other tooltip to render on same element if sticky is shown
	if( $el.length === 0 || $el.data('tooltip') == null || $el.data('has-sticky-tooltip')){
		return;
	}

	if( $el.hasClass('dropdown') && $el.hasClass('nav-active') ){
		// prevent open dropdowns from showing a tooltip
		return;
	}

	var sticky = sticky === undefined ? false : sticky;
	$el.data('has-sticky-tooltip', sticky);

	// remove the trailing stops from created tooltips
	var text = $.trim($el.data('tooltip'));
	if(text[text.length-1] == '.') {
		$el.data('tooltip', text.substr(0, text.length-1));
	}

	var $tooltip = $('<div class="tooltip" data-sticky="' + sticky + '"><div class="icon-up"></div>' + $el.data('tooltip') + '<div class="icon-down"></div></div>');

	if( $el.data('tooltip-style') ){
		$tooltip.addClass('tooltip-' + $el.data('tooltip-style'));
	}

	if( $el.data('tooltip-sticky') ){
		$tooltip.addClass('tooltip-sticky');
	}

	if( $el.data('tooltip-inline') ){
		$tooltip.insertAfter($el);
		$tooltip.css({top: 140, left: $el.data('tooltip-offset'), marginLeft: -($tooltip.outerWidth(false) / 2)});
	} else {
		$tooltip.appendTo($('body'));
		$tooltip.css({left: $el.offset().left + ($el.outerWidth(false) / 2), top: $el.offset().top + $el.outerHeight(false) + 20, marginLeft: -($tooltip.outerWidth(false) / 2)})
	}	

	$tooltip.animate({opacity:1}, 100);

	if( $el.data('tooltip-pos') == 'above' ){
		$tooltip.addClass('tooltip-above').css({top: $el.offset().top - $tooltip.outerHeight(false) - 20});
	}
}


function hideTooltips(){
	var $tooltips = $('.tooltip');

	$tooltips.each(function(i, el){
		var $tooltip = $(el);
		if( !$tooltip.data('sticky') && !$tooltip.hasClass('tooltip-sticky') ){
			$tooltip.remove();
		}
	});
}

function showMsg(content){
	var $mm = $('#mm'),
		$msg = $('#msg'),
		$stickable = $('.stickable'),
		$newMsg = $('<div id="msg" style="display:none;"><span class="icon-close"></span><div class="msg-content">' + content + '</div></div>');

	if( $msg.length > 0 ){
		$msg.animate({opacity: 0}, 'fast', function(){
			$msg.find('.msg-content').html(content);
			$msg.animate({opacity: 1}, 'fast');	
		})
		return;
	}

	if( $stickable.length > 0 ){
		$stickable.prepend($newMsg);
	} else if( $mm.length > 0 ){
		$mm.after($newMsg);
	} else {
		$('#content').prepend($newMsg);
	}

	$newMsg.find('.icon-close').click(function(){
		$newMsg.slideUp(function(){
			$newMsg.remove();		
			$(window).resize();		
		});		
	});
		
	$newMsg.slideDown(function(){
		$(window).resize();		
	});
}

$(window).resize(function(e){
	var $popup = $('.popup .box-content'),
		topOffset = 0;

	if( $popup.length == 0 ){
		return;
	}

	$popup.each(function(i, el){
		$(el).css({marginTop: Math.round(($(window).height() - $(el).height() - topOffset) / 2) });
	});
});


function showPopup(content, options, closeCallback){
	hideTooltips();
	$popup = $(
		'<div class="popup">' +
			'<div class="box-content">' +
				'<a href="#close" class="icon-close"></a><div class="clearb"></div>' +
				'<div class="popup-content">' + content + '<div class="clearb"></div></div>' +
			'</div>' +
		'</div>'
	).appendTo($('body'));

	var $popupWin = $popup.find('.box-content');

	if( options === undefined ){
		options = {};	
	}

	if( options.maxWidth == undefined ){
		options.maxWidth = Math.min(500, window.innerWidth-10);
	}
	if( options.maxHeight == undefined ){
		options.maxHeight = Math.min(600, window.innerHeight-30);
	}
	if( options.height !== undefined ){
		$popupWin.height(options.height);
	}
	if( options.width !== undefined ){
		$popupWin.width(options.width);
	}
	if( options.maxWidth !== undefined ){
		$popupWin.css({maxWidth: options.maxWidth});
	}
	if( options.maxHeight !== undefined ){
		$popupWin.css({maxHeight: options.maxHeight});
		$popupWin.find('.box-content').css({maxHeight: options.maxHeight -10, overflow: 'auto'});
	}

	// trigger resize to set position
	var $window = $(window).resize();

	$('.popup').on('click touchend', function(e){
		if( e.type == 'touchend' ){
			e.stopPropagation();
		}
		if( $(e.target).hasClass('popup') || $(e.target).hasClass('icon-close') ){
			e.preventDefault();
			$(this).remove();
			if( closeCallback ){
				closeCallback();
			}
		}
	});
	$('.box-content').on('click', '.input-disabled', function(e){
		e.preventDefault();	
	});		
}
function hidePopup(){
	$('.popup').click();
}

function popupSignup(title, closeCallback, redirect){
	if( !redirect ){
		redirect = location.origin + location.pathname;
	}
	showPopup(
		'<div class="popup-title">' + title + '</div>' + 
		'<iframe src="/user/signup/simple?redirect=' + redirect + '" style="height:280px;width:100%;background-image:url(/img/loader.gif);background-repeat:no-repeat;background-position:50% 50%;" scrolling="no"></iframe>', 
		{height: 330, width: 400},
		closeCallback
	);
	$('.popup .box-content').css({overflow:'hidden'});
}

var Checkout = {
	unlockFeatures: function(){

		if( $('#song').length == 0 ){
			return;
		}

		ga('send', 'event', 'Credits', 'Unlock Song', $('#song').data('songid'));

		Chordify.fadeIn();
		$('head')
			.append('<link rel="stylesheet" href="/css/print.css" type="text/css" media="print" />')
			.append($('head link[href*="chordify.css"]').clone().prop('media', 'print'));
					
		$('#freeCss').attr('disabled', true).remove();
		$.getScript('/js/subscriptions.js?song=' + $('#song').data('songid'));

		$('#premiumOverlay').remove();
		$('body').addClass('user-premium').removeClass('user-free');

		$('#mm').slideUp(function(){
			$('#mm').remove();	
			$(window).resize();
		});
	},
	submit: function($button){
		
		var product = $button.attr('name'),
			$body = $('body');	
		
		if( $body.hasClass('user-recurring') ){

			if( $button.hasClass('button-premium') ){
				$button.addClass('loading-button');
			} else {
				$button.find('.button-label').addClass('loading-button');
			}

			$.getJSON('/adyen/hasRecurringProfile', {key: $('#checkoutForm').data('key')}, function(data){

				$button.removeClass('loading-button');
				$button.find('.button-label').removeClass('loading-button');

				if( data.recurring ){
						
					showPopup('<p style="margin-top:40px;">' + Lang.amount_debited.replace('%d', $button.data('amount')) + '</p><button id="charge" class="floatr button-premium" style="margin:0;width:auto;padding-left:30px;padding-right:30px;">' + Lang.confirm + '</button>', {width: 400});
					$('#charge').click(function(){
						$('#charge').addClass('loading-button');
						setCookie('checkPayment', 1);
						Checkout.doPayment(product);
					});
				} else {
					Checkout.doPayment(product);
				}
			});
			return;
		}
		Checkout.doPayment(product);
	},
	doPayment: function(product){

		var $adyenForm = $('#adyenForm'),
			productUrl = product,
			$song = $('#song');

		if( $adyenForm.data('songid') ){
			productUrl += '/' + $adyenForm.data('songid');
		}

		$.getJSON('/adyen/getFormFields/' + productUrl, {key: $('#checkoutForm').data('key')}, function(data){
			if( data.status == 'ok' && data.payment == 'success' ){
				if( $song.length > 0 && $song.data('songid') == $adyenForm.data('songid') ){
					hidePopup();
					Checkout.unlockFeatures();
				} else {
					hidePopup();
					showPopup('<p>' + Lang.payment_wait + '</p><img src="/img/loader.gif"/>');
					poll = setInterval(function(){
						$.getJSON('/user/checkPayment/' + productUrl, function(data){
							if( data.payment == 'success' ){
								self.location.href = '/user/subscription';
							}
						});
					}, 2000);
				}
				return;
			}
			if( !data.adyenUrl ){
				return;
			}
			$adyenForm.empty().attr('action', data.adyenUrl);
			for( field in data.adyenFields){
				$adyenForm.append('<input type="hidden" name="' + field + '" value="' + data.adyenFields[field] + '" />');
			}
			setCookie('payment', productUrl + '|' + data.adyenFields.currencyCode + '|' + data.friendlyPrice);
			$adyenForm.submit();
		});
	},
	showPopup: function(songId){
		var $body = $('body'),
			variation = 0; //Chordify.getParameter('variation') || cxApi.chooseVariation();

		ga('send', 'event', 'Premium', 'Show Checkout Popup', null, {nonInteraction: 1});

		$('.checkout-products').show();
		showPopup(
			'<div class="checkout-popup checkout-variation-' + variation + '">' + 
			$('#checkoutForm').html() +
			'<form id="adyenForm" method="post"></form></div>',
			{maxWidth: 650}
		);

		if( songId ){
			$('#adyenForm').data('songid', songId);
		}

		if( !$body.hasClass('signedin') ){
			$.get('/user/signupForm', function(html){
				$('.checkout-signup').html(html);
			});
		}

		Checkout.bindEvents();
	},
	bindEvents: function(){

		$('.checkout-signup form').append('<input type="hidden" name="checkout" value="1" />')

		$('.checkout-products .big-number').each(function(i, el){
			if( $(el).text().length > 5 ){
				$(el).css('font-size', '19pt');
			}
		});

		$('.button-checkout').click(function(e){
			e.preventDefault();

			var $body = $('body'),
				$button = $(this),
				$checkout = $button.closest('.checkout'),
				$products = $checkout.closest('.checkout-products'),
				$checked = $checkout.find('input[type=radio]:checked'),
				$terms = $checkout.find('input[name=terms]');

			/*if( $checked.length == 0 ){
				tooltip($button.closest('form').find('input[type=radio]').last().data('tooltip', 'Please choose a product'));
				return;
			} else*/ if( $terms.length > 0 && !$terms.is(':checked') ){
				tooltip($terms.data('tooltip', Lang.please_accept));
				return;
			}

			if( !$body.hasClass('signedin') ){
				$checkout.find('.checkout-signup').show();
				
				var width = $products.find('.checkout-premium').outerWidth();
				
				$products.find('.checkout-basic').before('<a id="cartBack" href="#back" style="float:left;margin-right:-200px;">&lt;- ' + Lang.change_plan + '</a>');

				if( window.innerWidth <= 660 ){
					$('#cartBack').css({marginBottom: 10});
				}

				if( $checkout.hasClass('checkout-premium') ){
					if( window.innerWidth > 660 ){
						$products.find('.checkout-basic').css({marginLeft: -width, opacity: 0});
						$products.find('.checkout-premium').css({marginRight: width/2});
					} else {
						$products.find('.checkout-basic').css({display: 'none'});
					}

					$checkout.find('.checkout-summary').show().html($checkout.find('.premium-selected').html());
				} else {
					if( window.innerWidth > 660 ){
						$products.find('.checkout-premium').css({marginRight: -width, opacity: 0});
						$products.find('.checkout-basic').css({marginLeft: width/2});
					} else {
						$products.find('.checkout-premium').css({display: 'none'});
					}
					
					$checkout.find('.checkout-summary').show().html($button.html());
				}

				var $hideElements = $checkout.find('.signup-hide:visible').hide();

				$('#cartBack').click(function(e){
					e.preventDefault();
					$('.checkout-signup, .checkout-summary').hide();
					$('#cartBack').remove();
					$hideElements.show();
					$products.find('.checkout').css({marginRight: '', marginLeft: '', opacity: '', display: ''});
				});

				$('form.form-signup').on('submitted', function(){
					$button.addClass('loading-button');
					Checkout.submit($button);	
				});	

				return;
			}	

			Checkout.submit($button);
		});

		$('.premium-toggle').mousedown(function(){
			var $target = $(this),
				$checkout = $target.closest('.checkout');

			$checkout.find('.premium-toggle').removeClass('active');
			$checkout.find('.premium-month, .premium-year').hide().removeClass('premium-selected');
			
			$target.addClass('active');

			if( $target.hasClass('toggle-year') ){
				$checkout.find('.premium-year').show().addClass('premium-selected');
				$checkout.find('.button-checkout').attr('name', 'subscription/year').data('amount', $checkout.find('.premium-year').data('amount'));
			} else {
				$checkout.find('.premium-month').show().addClass('premium-selected');
				$checkout.find('.button-checkout').attr('name', 'subscription/month').data('amount', $checkout.find('.premium-month').data('amount'));
			}

		});

	}
};

Chordify.convertISO8601ToSeconds = function(input){

	var reptms = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/,
		hours = 0, minutes = 0, seconds = 0, totalseconds;

	if (reptms.test(input)) {
		var matches = reptms.exec(input);
		if (matches[1]) hours = Number(matches[1]);
		if (matches[2]) minutes = Number(matches[2]);
		if (matches[3]) seconds = Number(matches[3]);
		return hours * 3600  + minutes * 60 + seconds;
	}

	return 0;
}

Chordify.showSuggestions = function(type, externalId, limit){

		if( limit == undefined ){
			limit = 4;
		}

		if( type != 'youtube' || externalId === undefined ){
			return;
		}

		function appendThumb(url, title, image){
			$('.suggestions').append('<a href="' + url + '" data-track="Engagement|Similar Song Click|' + url + '">' + 
				'<div class="thumb" style="background-image:url(' + image + ')"></div>' + 
				'<div class="song-title">' + title + '</div>' +
				'<span class="icon-right"></span>' + 
			'</a>');
		}

		$.getJSON('/song/suggestions/' + externalId, function(suggestions){
			for( s in suggestions ){
				appendThumb(
					suggestions[s].slug ? '/chords/' + suggestions[s].slug : '/?url=https://www.youtube.com/watch?v=' + suggestions[s].id,
					suggestions[s].title,
					suggestions[s].artwork_url
				);
				limit--;
				if( limit <= 0 ){
					break;
				}
			}
			$('#suggestions').show();
		});
	}

window.isTouch = false;
$(document).ready(function() {
	
	var $window = $(window),
		$body = $('body'),
		$sidebar = $('#sidebar');

	$('body.mobile').click(function(e){
		if( $sidebar.css('left').replace('px', '') * 1 > -100 ){
			if( $(e.target).closest('#sidebar').length > 0 || $(e.target).closest('.slidebar').length > 0 || $(e.target).closest('#topbar').length > 0 ){
				return;
			}
			$sidebar.removeClass('expand');
			toggleSlideBar(false);	
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			return false;
		}
	});

	$('body.mobile .icon-search').click(function(e){
		if( $('#url').is(':focus') ){
			$('#url').blur();
			toggleSlideBar(false);
		} else {
			$('#sidebar').addClass('expand');
			$('#url').focus();
		}
	});

	$body.on('click', '.toggleLogin', function(e){
		e.preventDefault();
		var $form = $(e.target).closest('form'),
			$h3 = $form.find('h3'),
			$submit = $form.find('input[type=submit]'),
			$firstname = $form.find('input[name=firstname]');

		$form.find('.show-next').show();
		$form.find('.button-next').hide();

		if( $form.attr('action') == '/user/signup' ){
			$h3.data('origTitle', $h3.contents().filter(function(){return this.nodeType === 3}).text()).text(Lang.log_into_chordify);
			$form.attr('action', '/user/signin');
			$(this).text(Lang.no_account);
			$submit.val(Lang.login);
			$firstname.hide().removeAttr('required').attr('disabled', true);
		} else {
			$form.attr('action', '/user/signup');
			$h3.text($h3.data('origTitle'));
			$(this).text(Lang.have_account);
			$submit.val(Lang.create_account);
			$firstname.show().attr('required', 'required').removeAttr('disabled');
		}
	});
	if( $body.hasClass('premiumpage') || $body.hasClass('ukulelepage') ){
		Checkout.bindEvents();
	}
	function endTransaction(){
		expireCookie('payment');
		expireCookie('checkPayment');
	}

	function getSongIdFromCookie(){
		var songId = null,
			paymentCookie = getCookie('payment');

		if( !paymentCookie ){
			return songId;
		}

		var paymentDetails = paymentCookie.split('|');

		if( paymentDetails[0] ){
			songId = paymentDetails[0].split('/')[2];
		}

		return songId;
	}

	if( getCookie('checkPayment') && getCookie('payment') ){
		if( $body.hasClass('user-premium') ){
			if( $body.hasClass('songpage') && getCookie('payment').indexOf('credits') != -1 ){
				ga('send', 'event', 'Credits', 'Unlock Song', $('#song').data('songid'));
			}
			endTransaction();
		} else {
			showPopup('<p>' + Lang.payment_wait + '</p><img src="/img/loader.gif"/>');
			var cookieParts = getCookie('payment').split('|');
			poll = setInterval(function(){
				$.getJSON('/user/checkPayment/' + cookieParts[0], function(data){
					if( data.payment == 'success' ){
						hidePopup();
						clearInterval(poll);
						if( $('#song').length > 0 && $('#song').data('songid') == getSongIdFromCookie() ){
							Checkout.unlockFeatures();
							endTransaction();
						} else {
							endTransaction();
							self.location.href = '/user/subscription';
						}
					}
				});
			}, 2000);
		}
	} else if( getCookie('payment') ){
		Checkout.showPopup(getSongIdFromCookie());
		expireCookie('payment');
	}
	if( $body.hasClass('premiumpage') || $body.hasClass('page-id-698') ){
		function hashchange(hash, jump){
			hash = typeof(hash) == "string" ? hash : $(this).attr("href");

			var $target = $(hash);
			if( $target.length == 0 ){
				return;
			}
			if( jump ){
				$window.scrollTop($target.offset().top - 112);
			} else {
				$('html,body').animate({scrollTop: $target.offset().top - 112});
			}
		}
		$body.on('click', "a[href^='#']", hashchange);
		hashchange(location.hash, true);
		$window.on('load', function(){
			hashchange(location.hash);
		});
		/*setInterval(function(){
			hashchange(location.hash, true);
		}, 10);*/
	}

	(function(){
		// enable add to chrome button
		if( window.chrome === undefined || chrome.app === undefined ){
			return;
		}
		if( !chrome.app.isInstalled ){
			$('.social .icon-addstore').data('tooltip', Lang.add_to + ' Chrome').show().click(function(e){
				e.preventDefault();
				chrome.webstore.install('', function(){
					$('.social .icon-addstore').hide();		
				});
			});
		}
	})();

	(function(){
		// enabled add to firefox button
		if( navigator.mozApps === undefined || typeof navigator.mozApps.checkInstalled !== 'function' ){
			return;
		}

		var manifestUrl = 'http://' + location.host + '/chordify-firefox.webapp',
			installCheck = navigator.mozApps.checkInstalled(manifestUrl);	

		installCheck.onsuccess = function(){
			if( !installCheck.result ){
				$('.social .icon-addstore').data('tooltip', Lang.add_to + ' Firefox').show().click(function(e){
					if( e !== undefined ){
						e.preventDefault();
					}
					var installer = navigator.mozApps.install(manifestUrl);
					
					installer.onsuccess = function(){
						$('.social .icon-addstore').hide();		
					};
					installer.onerror = function(){
						console.log(installer);
					};
				});
			}
		};

	})();
	
	$('.sidebar-slide').on('mousedown touchstart', function(e){
		e.preventDefault();
		if( e.type == 'touchstart' ){
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
		toggleSlideBar(null, $('.slidebar' + $(this).attr('href').replace(new RegExp('/', 'g'), '-')));
	}).click(function(e){
		e.preventDefault();
		$('#url').blur();
	});

	$body.on('mousedown touchstart', '.dropdown', function(e){	

		if( $(e.target).closest('.dropdown-items').length > 0 ){
			return;
		}

		if( e.type == 'touchstart' ){
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		}	

		if( $(this).hasClass('nav-active') ){
			$('.dropdown-items').hide();
			$('.dropdown.nav-active').removeClass('nav-active');
			return;
		}
	
		if( $('.dropdown.nav-active').length > 0 ){
			$('.dropdown-items').hide();
			$('.dropdown.nav-active').removeClass('nav-active');
		}

		var $items = $(this).toggleClass('nav-active').siblings('.dropdown-items');

		if( $items.length == 0 ){
			$items = $(this).find('.dropdown-items');
		}

		var dir = $items.css('float');

		$items.show().css('opacity', 0.1);
		if( dir == 'right' ){
			$items.css('marginLeft', -200);
			$items.css('marginLeft', - $items.outerWidth() + $(this).width() );
		}
		$items.animate({opacity: 1}, 'fast');
		
		$items.css('min-width', $(this).outerWidth());

	}).on('click', '.dropdown', function(e){

		if( $(e.target).closest('.filters').length > 0 ){
			return;
		}

		if( $(e.target).closest('.dropdown-items').length > 0 ){
			$('.dropdown-items').hide();
			$('.dropdown.nav-active').removeClass('nav-active');
			return;
		}

		e.preventDefault();
	});	

	$body.on('mousedown touchstart', function(e){

		if( e.type == 'touchstart' ){
			window.isTouch = true;
		}

		if( $(e.target).closest('.dropdown,.dropdown-items').length == 0 ){
			$('.dropdown-items').hide();
			$('.dropdown.nav-active').removeClass('nav-active');
			// commented in favor of chord edits
			//e.stopPropagation();
			//e.stopImmediatePropagation();
		}
		
		hideTooltips();
	});

	$body.on('keydown', hideTooltips);

	$(document).keydown(function(e){
		if( e.keyCode == 27 ){ // esc
			hidePopup();
			toggleSlideBar(false);
			$('#url').blur();
		}
	});
	
	var tooltipTimer = null;	

	tooltip($('.tooltip-hint[data-tooltip]'));

	//$('[data-tooltip]').not('.tooltip-click').hover(function(e){
	$('body').on('mouseenter mouseleave', '[data-tooltip]:not(.tooltip-click)', function(e){
		var $this = $(this),
			$tooltip = $('.tooltip[data-sticky="false"]').not('.tooltip-sticky'),
			$stickyTooltip = $('.tooltip[data-sticky="true"]').not('.tooltip-sticky');

		if( e.type == 'mouseenter' ){
			tooltipTimer = setTimeout(function(){
				tooltip($this);
			}, 300);
		
		} else {
			clearTimeout(tooltipTimer);
			$tooltip.remove();
			setTimeout(function() {
				$this.data('has-sticky-tooltip', false);
				$stickyTooltip.remove();
			}, 1000);
		}
	}).on('mousedown', '[data-tooltip]:not(.tooltip-click)', function(){
		clearTimeout(tooltipTimer);
		$('.tooltip[data-sticky="false"]').remove();
	});

	$body.on('click', '.tooltip-sticky', function(e){
		$(this).remove();
	});

	$('.tooltip-click').on('touchstart mousedown', function(){
		var $tooltip = $('.tooltip');

		if($tooltip.length > 0) {
			$tooltip.remove();
		} else {
			// show two tooltips
			if( $(this).hasClass('button-upload') ){
				tooltip($('#betaThanks').data('tooltip', Lang.do_here));
			}
			tooltip($(this));
		}
		return false;
	});	

	var $library = $('.library');
	$('.filters').on('click', 'button', function(e){
		var $button = $(e.target).toggleClass('active');
		
		$library.css('min-height', $library.outerHeight()).toggleClass('show-' + $button.attr('name'));
		if( !$library.is('[class*=show]') ){
			$library.addClass('show-all');
		} else {
			$library.removeClass('show-all');
		}
	});

	var $songs = $('.song-link'),
		$filter = $('#filter');

	$filter.keyup(function(){
		setTimeout(function(){
			$songs.removeClass('hidden');
			$songs.each(function(i, el){
				if( el.getAttribute('data-filter').indexOf($filter.val().toLowerCase()) == -1 ){
					$(el).addClass('hidden');
				}
			});
		}, 1);
	});

	var $ytSongs = $('.suggestions-source .song-youtube');

	if( $ytSongs.length > 0 ){	
		var rand = Math.round(Math.random() * $ytSongs.length-1);
		Chordify.showSuggestions('youtube', $ytSongs.eq(rand).data('externalid'), 3);
		if( $ytSongs.length > 1 ){
			Chordify.showSuggestions('youtube', $ytSongs.eq(rand+1).data('externalid'), 2);
		}
	}

	var $userLibrary = $('#user-library');

	// library management actions
	$('.library-mgmt button').on('click touchend', function(e){
			var $target = $(this),
				action = $target.data('action'),
				songId = $target.closest('[data-songid]').data('songid'),
				$libraryMgmt = $target.closest('.library-mgmt'),
				$songLink = $target.closest('.song-link');

			e.preventDefault();

			if( e.type == 'touchend' ){
				e.stopPropagation();
			}

			// two evil fallbacks
			if( $libraryMgmt.length == 0 ){
				$libraryMgmt = $songLink.find('.library-mgmt');
			}
			if( $libraryMgmt.length == 0 ){
				$libraryMgmt = $('.metadata').find('.library-mgmt');
			}

			if( action == 'edit' ){
				self.location.href = $songLink.attr('href') + '#edit';
				return;
			} else if( action == 'embed' ){
				var iframe = '<iframe src="https://' + location.host + location.pathname.replace('\/chords\/', '\/embed\/') + '" frameborder="0" width="100%" height="500"></iframe>';
				showPopup(
					'<div class="popup-title">' + Lang.embed + '</div>' + Lang.embed_explanation+ '<br/><br/><input type="text" style="width:100%;color:#333;" value="" readonly /><br/>' + 
					'<a href="#" class="floatr embed-copy">' + Lang.copy + '</a>'
				);
				$('.popup .embed-copy').click(function(e){
					e.preventDefault();
					$('.popup input[type=text]').select();
					document.execCommand('copy');
				});
				setTimeout(function(){
					$('.popup input[type=text]').val(iframe).select();
				}, 50);
				return;
			} 
	
			if( !action ){
				// the link is clicked, just return
				return;
			}
	
			if( !$body.hasClass('signedin') && action != 'buy' ){
				popupSignup(Lang.library_mgmt_signup);
				return false;
			} else {
		
				var actionUrl = '/song/' + action + '/' + songId,
					page = $libraryMgmt.data('page');

				if( action == 'buy' ){
					window.open($target.data('href'));
				} else if( action == 'delete' ){
					if( !confirm(Lang.delete_confirm) ){
						return;
					}
				} else if( action == 'rename' ){
					var	title = $libraryMgmt.data('title'),
						artist = $libraryMgmt.data('artist'),
						originalMetadataTitle = $libraryMgmt.data('original-metadata-title'),
						originalMetadataArtist = $libraryMgmt.data('original-metadata-artist'),
						originalMetadata = originalMetadataTitle + ' - ' + originalMetadataArtist,
						currentMetadata = title + ' - ' + artist,
						originalMetadataHtml = '';
					;
					if(originalMetadataTitle !== undefined && originalMetadataArtist !== undefined && currentMetadata != originalMetadata) {
						originalMetadataHtml =
							'<tr><td class="label" style="padding-bottom:10px;padding-top:13px;">' + Lang.original + ' <br/>' + 
							'<span style="font-weight:normal;font-size:8pt;"><a href="#" id="renameFormReset">' + Lang.reset + '</a></span></td>' + 
							'<td id="originalMetadata" style="vertical-align:top;padding-top:13px;">' + originalMetadata + '</td></tr>';
					}

					showPopup(
						'<div>' +
							'<h2>' + Lang.rename + '</h2>' +
							'<form id="renameForm" action="/song/rename" method="post">' +
								'<input name="songid" type="hidden" value="' + songId + '" />' +
								'<table width="100%" style="margin-top:10px;>"' +
								'<tr><td class="label">' + Lang.title + '</td><td><input name="title" type="text" value="" /></td></tr>' +
								'<tr><td class="label">' + Lang.artist + '</td><td><input name="artist" type="text" value="" /></td></tr>' +
							 	originalMetadataHtml +
								'<tr><td><input type="submit" value="' + Lang.save  + '" /></td><td></td></tr>' +
								'</table>' +
							'</form>' +
						'</div>',
						{},
						function() {
							$songLink.add('.metadata').find('.icon-rename').animate({opacity: 1});
						}
					);

					$('#renameFormReset').click(function(e) {
						e.preventDefault();
						$('#renameForm input[name=title]').val(originalMetadataTitle);
						$('#renameForm input[name=artist]').val(originalMetadataArtist);
					});

					// add data to form here to prevent htmlentities from going haywire
					$('#renameForm input[name=title]').val(title);
					$('#renameForm input[name=artist]').val(artist);


					$('#renameForm').submit(function(e){
						e.preventDefault();

						var $form = $(this),
							metadata = $form.serialize();

						$form.find('[type=submit]').prop('disabled', true).animate({opacity: 0.8});

						$.post($form.attr('action'), metadata, function(){
							var title = $form.find('[name=title]').val(),
								artist = $form.find('[name=artist]').val();

							if(page == 'single') {
								$('.metadata-title h1').text(title);
								$('.metadata-artist').text(artist);
								document.title = title + ' | Chords';
							}else if(page == 'library') {
								$target.closest('.song-link').find('.song-title').text(artist + ' - ' + title);
							}

							$libraryMgmt.data({'title': title, 'artist': artist})
							hidePopup();
						});
					});
				}

				// renames are handled above via post
				if(action == 'rename') return;

				$.get(actionUrl, function(data){

					try {
						data = JSON.parse(data);
						if( data.status !== undefined ){
							if( data.status == 'error' ){
								if( data.msg ){
									alert(data.msg);
								}
								return false;
							}
						}
					} catch(e) {
						// ignore invalid json if action is delete
						if( action != 'delete' ){
							alert(Lang.error_occured_during + ' ' + Lang[action].toLowerCase() );
							return;
						}
					}

					if( action == 'add' ) {

						// animate the user-song inner shadow
						var steps = 3,
							phase = 0, // 0 = fadein, 1 = fadeout, 2 = last fadein
							$thumbnail = $songLink.find('.song-thumbnail'),
							interval = setInterval(function(){
									
								if( steps >= 20 && phase == 0 ){
									// go from first fadein to fadeout
									phase = 1;
								}

								if( steps == 3 && phase == 1 ){
									// go to the last fade in
									phase = 2;
								}

								if( steps >= 20 && phase == 2 ){
									clearInterval(interval);		
									$thumbnail.css('box-shadow', '');
									return;
								}
									
								if( phase == 1 ){
									steps--;
								} else {
									steps++;
								}
								$thumbnail.css('box-shadow', 'inset 0 0 0 3px rgba(136, 163, 152, ' + (steps / 20) + ')');

							}, 10);

						$libraryMgmt.addClass('song-user');
						$thumbnail.addClass('song-user').css('box-shadow', 'none');	

					} else if( action == 'delete' ){
						if( page == 'library' ){
							$userLibrary.find('.song-link[data-songid=' + songId + ']').animate({'opacity': 0}, function() {
								$(this).remove();	
							});
						}
						$libraryMgmt.removeClass('song-user');
					} else if( action == 'love' ){
						$libraryMgmt.addClass('song-loved');
					} else if( action == 'unlove' ){
						$libraryMgmt.removeClass('song-loved');
					}
		
				});
			}
		});

	var $bgIframe = $('#background iframe');

	$bgIframe.on('load', function(){
		if( $bgIframe.css('opacity') == 0){
			$bgIframe.animate({opacity: 1}, 1000);
		}
	});

	// only backgroundTitle is clickable for premium users
	if( $body.hasClass('user-premium') ){
		$('#background a').css('cursor', 'default').click(function(e){
			if( $(e.target).is('#backgroundTitle') ){
				return true;
			}
			e.preventDefault();
		});
	}

	$('#messages').click(function(e) {
		e.preventDefault();
		
		var $slidebar = toggleSlideBar(null, $('.slidebar-messages'));

		if( $slidebar === null ){
			// the toggle removed the slidebar
			return;
		}

		$.getJSON('/user/getMessages/', function(d) {
			if(d.messages === undefined) return;

			var messagesHTML = '', 
				i = d.messages.length,
				dismiss = true;

			while(i--) {
				messagesHTML += d.messages[i].message;
				if( i > 0 ){
					messagesHTML += '<div class="clearb"></div><hr/>'
				}
				if( d.messages[i].no_dismiss !== undefined ){
					dismiss = false;
				}
			}

			if( dismiss ){
				messagesHTML += '<a class="floatl input-lookalike input-submit" href="#dismiss" style="margin-top: 12px;">' + Lang.dismiss + '</a>';
			}

			$slidebar.html('<div class="slidebar-section">' + Lang.my_messages + '</div><div class="messages-list">' + messagesHTML + '</div>');

			$('a[href="#dismiss"]').click(function(e) {
				e.preventDefault();
				toggleSlideBar(false);
				$('#messages').fadeOut();
				$.getJSON('/user/dismissMessages');
			});
		});
	});

	var $ad = $('#mm'),
		$msg = $('#msg'),
		hasAd = $ad.length > 0,
		hasMsg = $msg.length > 0,
		isPremiumPage = location.pathname == '/premium',
		hasTopMargin = hasAd || hasMsg,
		topMargin = null,
		isSticky = !hasTopMargin,
		showFooter = false,
		$stickable = $('.stickable'),
		stickableTop = $stickable.length > 0 ? $stickable.offset().top : 0,
		stickableHeight = 0,
		$content = $('#content'),
		$suggestions = $('#suggestions'),
		$footer = $('#footer'),
		contentTop = $content.length > 0 ? $content.offset().top : 0,
		suggestionsBottom = $suggestions.length > 0 ? parseInt($suggestions.css('bottom').replace('px', ''), 10) : 0;
		suggestionsHeight = 0,
		footerHeight = 0,
		$body = $('body'),
		hasVideo = $body.hasClass('song-video'),
		bodyHeight = 0,
		windowScrollTop = 0;

	function calcSizes(){		
		bodyHeight = $body.height();
		contentTop = $content.length > 0 ? $content.offset().top : 0;
		if( !$stickable.hasClass('sticky') ){
			stickableHeight = $stickable.outerHeight() + 6;
			stickableTop = $stickable.length > 0 ? $stickable.offset().top : 0;
		}
		footerTop = $footer.length > 0 ? $footer.offset().top - $footer.css('marginTop').replace('px', '') : null;
		suggestionsHeight = $suggestions.outerHeight();
	}

	function resizeElements(){

		$ad = $('#mm');
		$msg = $('#msg');

		hasAd = $ad.length > 0;
		hasMsg = $msg.length > 0;
		hasTopMargin = hasAd || hasMsg;

		// alterations
		if( hasVideo ){
			if( window.innerWidth < 950 ){
				$suggestions.css({paddingLeft: 210 - $suggestions.offset().left});
			} else {
				$suggestions.css({paddingLeft: ''});
			}
		}
		$stickable.width($content.width());

		if( !hasTopMargin ){
			isSticky = true;
			$stickable.addClass('sticky');
			$content.css({paddingTop: $stickable.outerHeight()});
		}
	}

	var timer;
	$window.scroll(function(){

		if( !isTouch ){
			clearTimeout(timer);
			// speed up scrolling by removing hover state checks
			timer = setTimeout(function(){
				$body.css('pointer-events', '');
			}, 50);
			$body.css('pointer-events', 'none');
		}

		windowScrollTop = $window.scrollTop();
		if( windowScrollTop > stickableTop - contentTop ){
			if( !isSticky) {
				if( window.innerWidth < 500 ){
					$stickable.width($stickable.width());
				}
				// make sticky
				$stickable.addClass('sticky');

				if( !isPremiumPage ){
					$content.css({paddingTop: stickableHeight});
				}
			}
			isSticky = true;
			if( $suggestions.length > 0 ){
				if( !showFooter && windowScrollTop + window.innerHeight > footerTop + suggestionsHeight ){
					showFooter = true;
					$body.addClass('footer-show');
					calcSizes();
				} else if( showFooter && windowScrollTop + window.innerHeight < footerTop ){
					$body.removeClass('footer-show');
					showFooter = false;
					calcSizes();
				}
			}

		} else if( hasTopMargin ){
			if( isSticky ){
				$stickable.removeClass('sticky');
				if( !isPremiumPage ){
					$content.css({paddingTop: ''});
				}
				isSticky = false;
			}
			
			// scroll suggestions up. TODO: only do this if needed
			if( $suggestions.length > 0 ){
				$suggestions.css({bottom: Math.min(0, windowScrollTop+suggestionsBottom)});
			}
		}
	});	

	$window.on('resize orientationchange', resizeElements);
	$window.on('load resize orientationchange', calcSizes);
	calcSizes();
	resizeElements();

	$('#msg .icon-close').click(function(e){
		e.preventDefault();
		$('#msg').slideUp(function(){
			$('#msg').remove();
			$(window).resize();
		});	
	});
	
	$('body').on('click', '[data-track]', function(e) {
		var trackData,
			me = $(e.target);

		trackData = me.data('track');
		if(!trackData) {
			trackData = me.closest('[data-track]').data('track');
		}

		if(trackData !== undefined) {
			var eventParts = trackData.split('|');
			if( eventParts.length > 2 ){
				ga('send', 'event', eventParts[0], eventParts[1], eventParts[2]);
			} else {
				ga('send', 'event', eventParts[0], eventParts[1]);
			} 
		}
	});

	$('form').submit(function(e){
		var form = this,
			$submit = $(form).find('[type=submit]');

		if( !$submit.data('track') ){
			return true;
		}

		// delay submit of form so GA events above can finish
		e.preventDefault();
		setTimeout(function(){
			form.submit();
		}, 80);

	});

	$('body').on('submit', '.form-ajax', function(e){
		e.preventDefault();

		var $form = $(e.target),
			$submit = $form.find('input[type=submit]').attr('disabled', true).addClass('loading-button'),
			$emptyField = $form.find('input.required').filter(function(i, el){
				return !this.value;
			}).first(),
			formData = $form.serialize();

		if( $emptyField.length > 0 ){
			$emptyField.focus();
			return false;
		}

		formData += '&pathname=' + location.pathname;

		ga('send', 'event', 'Form', $form.attr('action'), 'Submit');

		$.ajax({url: $form.attr('action'), data: formData, dataType: 'json', method: 'post', success: function(data){

			if( data.redirect === undefined ){
				$submit.prop('disabled', false).removeClass('loading-button');
			}

			if( data.formError !== undefined ){
				ga('send', 'event', 'Form', $form.attr('action'), 'Error');
				tooltip($form.find('input[name=' + data.formError + ']').data('tooltip', data.msg));
			} else if( data['status'] !== undefined && data['status'] == 'error' && data.msg !== undefined ){
				ga('send', 'event', 'Form', $form.attr('action'), 'Error');
				tooltip($form.find('input[type=submit]').data('tooltip', data.msg));
			} else {
				ga('send', 'event', 'Form', $form.attr('action'), 'SubmitOK');
				$form.trigger('submitted', data);
				return;
			}

			if( $form.closest('.popup') ){
				$('.tooltip').css('z-index', 1339);
			}
		}});
	});
	$(document).ajaxSuccess(function(e, jqXhr, opts, data){
		if( data.redirect !== undefined ){
			if( self.location.pathname + location.hash == data.redirect ){
				self.location.reload();
			} else {
				parent.location.href = data.redirect;
			}
		}
	});

	$body.on('click', 'a[href^="/?url="]', function(e){
		e.preventDefault();
		var $thumb = $(this),
			offset = $thumb.offset(),
			$animThumb = $thumb.clone(),
			$sidebar = $('#sidebar'),
			$thumbnails = $('<div class="thumbnails"></div>').append($animThumb);

		$thumbnails.css({position:'fixed', top: offset.top - $(window).scrollTop(), left: offset.left, zIndex: 100}).appendTo($body).animate({left: 0, top: 0, opacity: 0}, function(){
			$thumbnails.remove();		
		});

		if( $sidebar.width() < 100 ){
			$sidebar.addClass('expand');
		}

		doChordify($thumb.attr('href').replace('/?url=',''), 'youtube', 'youtube:' + $thumb.attr('href').replace('/?url=https://www.youtube.com/watch?v=',''));
	});

	$('#koekie button').click(function(){
		setCookie('KOEKIE', 1, 315576000); // 10 years
		$('#koekie').slideUp(function(){
			$(this).remove();		
		});
		$('#content, .stickable').animate({marginTop: 0}, function(){
			$body.removeClass('cookie-consent');
			calcSizes();		
		});
	});

	Chordify.dzSupport = false;

	if( location.pathname.indexOf('/embed/') == -1 ){

		var dzSupportCookie = getCookie('dzSupport');

		function dzSupport(hasSupport){
			Chordify.dzSupport = hasSupport;
			if( hasSupport ){
				setCookie('dzSupport', 1, 3600 * 24 * 7);
			} else {
				setCookie('dzSupport', 0, 3600 * 24 * 7);
				if( $('.filters .dropdown').length > 0 ){
					$('.library').removeClass('show-all').addClass('show-youtube show-soundcloud show-file');
				}
				$('.result-deezer').remove();
				$('.library-top .filters').find('button').not('[name=deezer]').addClass('active');
			}
		}

		if( dzSupportCookie === null ){
			$.ajax({url: 'https://api.deezer.com/infos', jsonp: 'callback', dataType: 'jsonp', data: {output:'jsonp'}, success: function(info){
				if( !info.open ){
					dzSupport(false);
				} else if( $('#song').data('type') != 'deezer' ){
					$body.append('<div id="dz-root"></div>');
					window.dzAsyncInit = function(){
						DZ.init({
							//appId: 132771,
							appId: 114161,
							channelUrl: '//' + self.location.host + '/deezer/channel'
						});
						DZ.getLoginStatus(function(data){
							if( data['status'] == 'unknown' ){
								dzSupport(false);
							} else {
								dzSupport(true);
							}
						});
					};
					var e = document.createElement('script');
					e.src = 'https://cdns-files.deezer.com/js/min/dz.js';
					e.async = true;
					document.getElementsByTagName('head')[0].appendChild(e);
				}
			}});
		} else {
			dzSupport(parseInt(dzSupportCookie, 10) ? true : false);
		}
	}

	var shareUrls = {
		facebook: {
			url: 'https://www.facebook.com/dialog/feed?display=popup&app_id=584573584902944&link={url}&description={text}&redirect_uri=' + location.protocol + '//' + location.host + '/closewindow.html',
			width: 500,
			height: 600
		},
		twitter: {
			url: 'https://twitter.com/intent/tweet?text={text}&source=chordify&related=chordify&via=chordify&url={url}',
			width: 500,
			height: 300
		},
		googleplus: {
			url: 'https://plus.google.com/share?url={url}',
			width: 500,
			height: 650
		},
		linkedin: {
			url: 'https://www.linkedin.com/shareArticle?mini=true&url={url}&title=' + document.title + '&summary={text}',
			width: 550,
			height: 504
		},
		vkontakte: {
			url: 'http://vk.com/share.php?url={url}&description={text}',
			width: 650,
			height: 430
		},
		gmail: {
			url: 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&su={text}&body={text}%0a%0a{url}',
			width: 500,
			height: 600
		},
		yahoo: {
			url: 'http://compose.mail.yahoo.com/?subject={text}&body={text}%0a%0a{url}',
			width: 700,
			height: 500
		},
		outlook: {
			url: 'http://mail.live.com/mail/EditMessageLight.aspx?n=&subject={text}&body={text}%0a%0a{url}',
			width: 600,
			height: 500
		},
		email_open: {
			url: 'mailto:?Subject={text}&Body={text}%0a%0a{url}'
		}
	};
	
	// http://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
	function windowCenter(url, title, w, h) {
		// Fixes dual-screen position												 Most browsers		  Firefox
		var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
		var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

		width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
		height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

		var left = ((width / 2) - (w / 2)) + dualScreenLeft;
		var top = ((height / 2) - (h / 2)) + dualScreenTop;
		var newWindow = window.open(url, title, 'scrollbars=no, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);

		// Puts focus on the newWindow
		if (window.focus) {
				newWindow.focus();
		}
	}

	$('.sharing span').click(function(e){
		e.preventDefault();

		var $target = $(e.target).closest('span'),
			network = $target.attr('class'),
			width = 400,
			height = 400,
			url = '',
			text = $('#shareText').val() || $target.closest('.sharing').data('sharetext');

		if( shareUrls[network] === undefined ){
			return;
		}

		ga('send', 'event', 'Share', network, self.location.href);

		if( network == 'yahoo' ){
			text = text.replace(/"|'/g, '');
		}

		if( network == 'twitter' ){
			text += ' #chords #music';
		}

		url = shareUrls[network].url.replace(/\{text\}/g, encodeURIComponent(text)).replace(/\{url\}/g, self.location.href);

		if( network == 'email_open' ){
			self.location.href = url;
			return;
		}		

		windowCenter(url, 'Share', shareUrls[network].width, shareUrls[network].height);
	});


	if( window.cxApi === undefined ){
		window.cxApi = {
			getChosenVariation: function(){},
			setChosenVariation: function(){}
		}
	}

	var expId = 'xA_jQZt8TQi1R3VqE_EHgQ',
		variation = cxApi.getChosenVariation(expId); // 0 = Play, 1 = Premium Checkout, 2 = suggestion

	if( variation == -1 ){
		variation = Math.random() < 0.5 ? 0 : 1;
	}

	function exitPopup(){	

		if( variation == -1 ){
			// don't show any variation
			return;
		}

		if( variation == 0 || variation == 1 ){
			if( !$('.chords div.chord:first').hasClass('currentChord') ){
				// User has pressed play (spacebar or youtube vid) show the suggestion exit popup instead
				variation = 2;
			}
			if( Chordify.player !== undefined && Chordify.player.state != 'stopped' ){
				variation = 2;
			}
		}

		var $firstSuggestion = $('.suggestions a').first();

		if( variation == 2 && $firstSuggestion.length == 0 ){
			// there are no suggestions, do not show exit popup
			return;
		}

		if( variation == 0 || variation == 1 ){
			cxApi.setChosenVariation(variation, expId);
		}

		var exitType = 'play';

		if( variation == 1 ){
			exitType = 'premium';
		} else if( variation == 2 ){
			exitType = 'suggestion';
		}
	
		ga('send', 'event', 'ExitPopup', 'show', exitType, {nonInteraction: 1});

		if( variation == 1 ){
			if( $('.popup').length == 0 ){
				Checkout.showPopup();
			}
			variation = -1;
			return;
		}

		$body.on('scroll.exit mousewheel.exit touchmove.exit', function(e) {
			e.preventDefault();
		});

		$('#exitPopup').remove();

		function closeExitPopup(){
			$body.off('scroll.exit mousewheel.exit touchmove.exit');
			$('#exitPopup').remove();
			$body.removeClass('exit-popup');
		}

		Chordify.fadeIn();
		var $overlay = $('<div id="exitPopup"></div>').addClass('variation-' + variation),
			offset = $('#content').offset();

		if( variation == 0 ){
			$overlay.html('<a href="#" id="exitPlay" style="display:block;height:90px;width:90px;"></a>');
		} else if( variation == 1 ) {
			$overlay.css({position: 'fixed', width: 'auto', height: 'auto', left: 0, 'top': 0, right: 0, bottom: 0, border: 0, borderRadius: 0, background: 'rgba(0,0,0,.7)'});
		}

		$overlay.append('<div class="exit-container"></div>');
		$body.append($overlay);

		var $container = $overlay.find('.exit-container');
		
		if( variation == 0 ){
			$container.html('<img src="/img/exit-arrow.png?1" width="160" style="margin-left:-86px;" /><br/><h1 style="margin:0 0 6px 0;">' + Lang.press_play + '</h1>' +Lang.learn_more.replace('Chordify', '<a href="/pages/how-to-use-chordify">Chordify</a>'));
		} else {
			$container.css({margin: '90px auto 0 auto', 'float': 'none'});
			$container.html('<h1 style="margin:0 0 6px 0;">' + Lang.other_song.replace('%s', '<br/><span style="font-weight:300;">') + '</span></h1>');
			$container.append('<img src="/img/exit-arrow-down.png" height="122" style="float:left;margin:-50px 0 0 -100px;" />');
			$container.append('<div class="thumbnails"></div>');
			$container.find('.thumbnails').append($firstSuggestion.clone())
			.append('<a href="/chords/led-zeppelin-stairway-to-heaven-official-music-lyrics-saadist13s" style="margin-left:50px"><div class="thumb" style="background-image: url(//i3.ytimg.com/vi/8pPvNqOb6RA/0.jpg);"></div><span data-action="play" class="icon-right"></span><div class="song-title">Led Zeppelin - Stairway to Heaven (Music-Lyrics)</div></a>');
			$container.find('.thumbnails a .icon-youtube').remove();
		}

		// don't show any exit popups later
		variation = -1;

		$(window).resize();

		$('#exitPlay').click(function(e){
			e.preventDefault();
			ga('send', 'event', 'ExitPopup', 'play', null, {nonInteraction: 1});
			Chordify.player.action('play');	
			$(e.target).parent().fadeOut('fast', function(){
				closeExitPopup();
			});
		});

		$('#exitPopup .thumbnails a').click(function(){	
			ga('send', 'event', 'ExitPopup', 'suggestion', null, {nonInteraction: 1});
		});

		$('#exitPopup').click(function(e){
			if( !$(e.target).is('a') ){
				closeExitPopup();
			}
		});
	}

	if( $body.hasClass('user-first') ){
		$body.append('<div id="exitTracker" style="z-index:2000;position:fixed;top:0;left:0;right:0;height:10px;"><div class="exit-tracker" style="height:3px;"></div><div class="exit-tracker" style="height:3px;"></div></div>');	

		var $play = $('.controls .icon-right');
		$(window).resize(function(){
			var $exitPopup = $('#exitPopup'),
				offset = {};

			if( $exitPopup.length <= 0 ){
				return;
			}
			offset = $play.offset();

			if( $exitPopup.hasClass('variation-0') ){
				$exitPopup.css({left: - 3015 + offset.left, 'top': - 3010 + offset['top']});
			}
		});

		$(document).mouseleave(function(){
			if( location.pathname.indexOf('/chords/') >= 0 ){
				exitPopup();
			} else if( location.pathname == '/' && $('#slidebarOverlay').length == 0 && $('.popup').length == 0 ){
				$body.addClass('exit-popup').scrollTop(0);
				var $creditButton = $('.checkout-basic button[name="credits/1"]');

				ga('send', 'event', 'ExitPopup', 'signup', null, {nonInteraction: 1});

				$('.home-welcome').append('<div id="signupExit" style="margin:-138px 0 0 -77px;"><img src="/img/exit-arrow-down.png" style="float:left;width:66px;margin:90px 17px 0 -1px;"><h1 style="margin:1px 0;">' + Lang.wait + '</h1><h2 style="font-style: italic;font-weight:300;margin-bottom:26px;">' + Lang.join_free_credit.replace('%s', $creditButton.data('currency') + ' ' + $creditButton.data('amount')) + '</h2></div>');

				$(document).off('mouseleave');

				$body.append('<span id="closeExitPopup" class="icon-close" style="position:fixed;top:10px;right:10px;font-size:50px;color:#eee;cursor:pointer;z-index:1;"></span>');

				$('#closeExitPopup').click(function(){
					$('#closeExitPopup, #signupExit').remove();
					$body.removeClass('exit-popup');
				});

				setCookie('free_product', 'credits/1', 24*3600);				
			}
		});

		$('#exitTracker div').mouseleave(function(e){
			var $target = $(e.target),
				$relatedTarget = $(e.relatedTarget);

			if( !$target.hasClass('exit-tracker') || !$relatedTarget.hasClass('exit-tracker') ){
				return;
			}

			if( $target.index() == 1 && $relatedTarget.index() == 0 ){
				exitPopup();
			}
		});
	}
});

$(document).ready(function(){
	$('.homepage, .artistaction, .featuredaction').find('.thumbnails,.list').find('a.song-youtube').each(function(i, el){
		var $el = $(el),
			$thumb = $el.children('.thumb'),
			img = new Image();

		img.onload = function(){
			if( img.width == 120 ){
				if( $('body').hasClass('homepage') && $el.is(':visible') ){
					$el.closest('.thumbnails').find('a').filter(':hidden').first().show();
				}
				// remove default youtube img
				$el.remove();
			}
		};
		if( $thumb.css('background-image') ){
			img.src = $thumb.css('background-image').replace('url(', '').replace(')', '').replace(/"/g, '');
		}
	});		
});

function setCookie(name, value, exp){
	var d = new Date();

	if( !exp ){
		exp = 3600*4;
	}

	d.setTime(d.getTime() + (exp*1000) );
	document.cookie = name + '=' + value + '; expires=' + d.toGMTString() + '; path=/';
}
function getCookie(name) {
	var value = "; " + document.cookie,
		parts = value.split("; " + name + "=");

	if (parts.length == 2)
		 return parts.pop().split(";").shift();

	return null;
}

function expireCookie(name){
	setCookie(name, "", -1);
}



// http://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-money-in-javascript
Number.prototype.formatMoney = function(c, d, t){
var n = this, 
	c = isNaN(c = Math.abs(c)) ? 2 : c, 
	// european notation
	d = d == undefined ? "," : d, 
	t = t == undefined ? "." : t, 
	s = n < 0 ? "-" : "", 
	i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
	j = (j = i.length) > 3 ? j % 3 : 0;
	return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};
