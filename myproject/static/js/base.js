window.isAuthenticated = 0;
    window.useExternalGtmCode = 0;
    window.clientUserId = 0;
    window.clientUserName = '';
    window.userCountryCode = '';
    window.logPageEvent = 1;
    window.userHasAdsParams = 0;
    window.utmSourceFromReferrer = 0;
    window.currentLang = '';
    window.baseUrl = 'html-templates';
    window.currentUrl = 'html-templates';
    window.np_userId = '';
    window.isAmplitudeInitialized = false;
    window.sha256Email = '';
    window.skipSetCountryCode = 0;

    function getCookieOrLocalStorage(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) {
                return c.substring(nameEQ.length, c.length);
            }
        }
        var lsValue = localStorage.getItem(name);
        return !!lsValue;
    }

    function sendAnalyticsData(eventType, props, cb) {
        var json = { data: {} };
        json.userToken = np_userId;
        json.data.adsParams = $.cookie('AdsParameters');
        json.data.ga = $.cookie('_ga');
        json.data.gac = $.cookie('_gac_UA-88868916-2');
        json.data.userAgent = navigator.userAgent;
        json.data.eventType = eventType;
        json.data.props = props;
        $.ajax({
            'type': 'POST',
            'url': '/Feedback/SendAdsLog',
            'contentType': 'application/json; charset=utf-8',
            'data': JSON.stringify(json),
            'dataType': 'json',
            'complete': cb || function() {}
        });
    }

    function initializeAmplitudeUser() {
        if (isAmplitudeInitialized) {
            return;
        }
        isAmplitudeInitialized = true;

        if (clientUserId > 0)
        {
            identifyAmplitudeUser(clientUserId, clientUserName);
        }
        else
        {
            identifyAmplitudeUser(null);
        }
    }

    function sendAmplitudeAnalyticsData(eventName, eventProperties, userProperties, callback_function) {
        initializeAmplitudeUser();

        if (userProperties) {
            if(userProperties.utm_source || userProperties.utm_campaign) {
                var identify = new amplitude.Identify();
                identify.setOnce("utm_campaign", userProperties.utm_campaign);
                identify.setOnce("utm_source", userProperties.utm_source);
                identify.setOnce("utm_content", userProperties.utm_content);
                identify.setOnce("utm_group", userProperties.utm_group);
                identify.setOnce("utm_term", userProperties.utm_term);
                identify.setOnce("utm_page", userProperties.utm_page);
                identify.setOnce("utm_page2", userProperties.utm_page);
                identify.setOnce("referrer", userProperties.referrer);

                amplitude.getInstance().identify(identify);

                userProperties.utm_source_last = userProperties.utm_source;
                userProperties.utm_campaign_last = userProperties.utm_campaign;
                userProperties.utm_content_last = userProperties.utm_content;
                userProperties.utm_group_last = userProperties.utm_group;
                userProperties.utm_term_last = userProperties.utm_term;
                userProperties.utm_page_last = userProperties.utm_page;
            }

            var userProps = objectWithoutProperties(userProperties, ["utm_campaign", "utm_source","utm_content", "utm_term", "utm_page", "utm_group", "referrer"]);
            amplitude.getInstance().setUserProperties(userProps);
        }

        if (!eventProperties) {
            eventProperties = {};
        }

        eventProperties.WebSite = 'true';
        eventProperties.IsAuthenticated = window.isAuthenticated;
        eventProperties.country_code = getCountryCode();
        eventProperties.lang = window.currentLang || '';

        var fullPageUrl = window.location.pathname.split('?')[0];
        eventProperties.full_page_url = fullPageUrl;
        eventProperties.page_url = clearPageUrl(fullPageUrl);

        if (typeof callback_function === 'function') {
            amplitude.getInstance().logEvent(eventName, eventProperties, callback_function);
        } else {
            amplitude.getInstance().logEvent(eventName, eventProperties);
        }
    }

    function identifyAmplitudeUser(userId, token) {
        if (userId) {
            amplitude.getInstance().setUserProperties({
                "Token": token,
                "UserId": userId
            });
        }

        var identify = new amplitude.Identify();
        amplitude.getInstance().identify(identify);
        if (userId) {
            amplitude.getInstance().setUserId(userId);
        }
    }

    function getUtmParamsFromUrl() {
        var hash = window.location.hash;
        var url = new URL(window.location.href);
        if (hash && hash.indexOf('utm_') >= 0) {
            url = new URL(window.location.origin + window.location.pathname + hash.replace('#', '?'));
        }

        if (!url.searchParams) {
            return '';
        }
        return getUtmParams(url);
    }

    function hasGoogleIdFromUrl() {
        var url = new URL(window.location.href);
        if (!url.searchParams) {
            return false;
        }
        return !!url.searchParams.get('gclid');
    }

    function waitForDOMAndAmplitude(callback) {
        var domReady = false;
        var ampReady = false;
        let hasRun = false;

        function tryRun() {
            if (domReady && ampReady && !hasRun) {
                hasRun = true;
                callback();
            }
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () {
                domReady = true;
                tryRun();
            });
        } else {
            domReady = true;
            tryRun();
        }

        window._onAmplitudeReady = function () {
            var urlParams = new URLSearchParams(window.location.search);
            var passedDeviceId = urlParams.get('amp_device_id');
            var amplitudeConfig = passedDeviceId ? { deviceId: passedDeviceId } : {};
            amplitude.getInstance().init("878f4709123a5451aff838c1f870b849", null, amplitudeConfig, function() {
                ampReady = true;
                tryRun();
            });
        };
    }

    function sendAnalyticsFromUrl(referrer, pageType) {
        var urlIsAvailable = typeof URL === "function" || (navigator.userAgent.indexOf('MSIE') !== -1 && typeof URL === 'object');
        if (!urlIsAvailable) {
            return;
        }

        var utmParams = getUtmParamsFromUrl();
        if (!utmParams) {
            return;
        }

        var gclidFromUrl = utmParams.gclid;
        var utmParamsFromUrl = !!utmParams.utmSource || !!utmParams.utmCampaign || !!utmParams.gclid;
        if (!utmParamsFromUrl && userHasAdsParams)
        {
            utmParams = getUtmParamsFromCookie();
        }

        var canLog = canLogToAmplitude(pageType);
        if (utmParamsFromUrl || utmSourceFromReferrer) {
            var fullPageUrl = window.location.pathname.split('?')[0];
            var pageUrl = clearPageUrl(fullPageUrl);
            var userProps = {
                "utm_source": utmParams.utmSource,
                "utm_campaign": utmParams.utmCampaign,
                "utm_content": utmParams.utmContent,
                "utm_group": utmParams.utmGroup,
                "utm_term": utmParams.utmTerm,
                "utm_page": getUtmPageValue(pageUrl),
                "utm_lang": window.currentLang || '',
                "referrer": referrer
            };

            if (gclidFromUrl) {
                var landingUrl = pageUrl.startsWith('/') && pageUrl !== '/' ? pageUrl.substr(1) : pageUrl;
                userProps.landing_page = landingUrl;

                var event = {
                    'Page': landingUrl,
                    'Url': window.location.href,
                    'utm_campaign_event': utmParams.utmCampaign,
                    'utm_group_event': utmParams.utmGroup

                }
                sendAmplitudeAnalyticsData('Landing Page', event, userProps);
            } else {
                var eventProps = {
                    "utm_source": utmParams.utmSource,
                    "utm_campaign": utmParams.utmCampaign,
                    "utm_content": utmParams.utmContent,
                    "utm_group": utmParams.utmGroup,
                    "utm_term": utmParams.utmTerm
                };

                if (utmParams.utmSource === "elastic") {
                    sendAmplitudeAnalyticsData('Email Click', eventProps);
                }

                if (canLog) {
                    sendAmplitudeAnalyticsData('Campaign', eventProps, userProps);
                }
            }
        }

        if (logPageEvent && canLog || (pageType === 'Pricing Page' && window.isValidCountry(true))) {
            var pageEventProps = {
                'type': pageType,
                'accepted_country': isValidCountry(),
                'force_log': !canLog
            };

            if (utmParams.gclid) {
                pageEventProps.googleClickId = utmParams.gclid;
            }

            sendAmplitudeAnalyticsData('Page View', pageEventProps);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (window.skipInitCookieConsent !== 1 && location.href.indexOf('/frame/') === -1 && window.location.href.indexOf('skipCookie') === -1) {
            PureCookie.initCookieConsent();
        }
        if(!skipSetCountryCode) {
            setCountryCode('https://location.nicepagesrv.com/country');
        }
        setUserIdCookie();
    });

// Define dataLayer and the gtag function.
        window.dataLayer = window.dataLayer || [];
        function gtag() {
            dataLayer.push(arguments);
        }

        var consentDefaultValue = 'granted';
        gtag('consent', 'default', {
            'ad_storage': consentDefaultValue,
            'ad_user_data': consentDefaultValue,
            'ad_personalization': consentDefaultValue,
            'analytics_storage': consentDefaultValue
        });
        
        if (hasGoogleIdFromUrl()) {
            useExternalGtmCode = 1;
        }
        
        function loadGTM() {
            var w = window, d = document, s = 'script', l = 'dataLayer';
            var i = useExternalGtmCode ? 'W76XGFR' : 'GTM-W76XGFR';
            var src = useExternalGtmCode
                ? 'https://load.api9.nicepage.com/nldlswob.js?st=' + i
                : 'https://www.googletagmanager.com/gtm.js?id=' + i;

            w[l] = w[l] || [];
            w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

            var f = d.getElementsByTagName(s)[0];
            var j = d.createElement(s);
            var dl = l !== 'dataLayer' ? '&l=' + l : '';
            j.async = true;
            j.src = src + dl;
            f.parentNode.insertBefore(j, f);
        }

        if ('requestIdleCallback' in window) {
            requestIdleCallback(loadGTM);
        } else {
            setTimeout(loadGTM, 2000);
        }

(function() {
            var hasRefParam = window.location.search.includes('fpr=');
            var hasFromCookie = document.cookie.includes('_fprom_ref') || document.cookie.includes('_fprom_tid');

            if (hasRefParam || hasFromCookie) {
                window.fpr = window.fpr || function() {
                    window.fpr.q = window.fpr.q || [];
                    window.fpr.q[arguments[0] == 'set' ? 'unshift' : 'push'](arguments);
                };
                fpr("init", {cid: "yek6q14u"}); 
                fpr("click");

                const script = document.createElement('script');
                script.src = "https://cdn.firstpromoter.com/fpr.js";
                script.async = true;
                document.head.appendChild(script);
            }
        })();

if(window.hideFacebookPixelCode !== true) {
                !function (f, b, e, v, n, t, s) {
                    if (f.fbq) return; n = f.fbq = function () {
                        n.callMethod ?
                            n.callMethod.apply(n, arguments) : n.queue.push(arguments)
                    };
                    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
                    n.queue = []; t = b.createElement(e); t.async = !0;
                    t.src = v; s = b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t, s)
                }(window, document, 'script',
                    'https://connect.facebook.net/en_US/fbevents.js');

                var fbInitOptions = { em: '' };
                if (clientUserId > 0) {
                    fbInitOptions.external_id = clientUserId;
                }

                fbq('init', '251025992170426', fbInitOptions);
                fbq('track', 'PageView');
            }

function loadAmplitude() {
        (function(e,t){
            var n=e.amplitude||{_q:[],_iq:{}};
            var r=t.createElement("script");
            r.type="text/javascript";
            r.integrity="sha384-d/yhnowERvm+7eCU79T/bYjOiMmq4F11ElWYLmt0ktvYEVgqLDazh4+gW9CKMpYW";
            r.crossOrigin="anonymous";
            r.async=true;
            r.src="https://cdn.amplitude.com/libs/amplitude-5.2.2-min.gz.js";
            r.onload=function(){
                if (!e.amplitude.runQueuedFunctions) {
                    console.log("[Amplitude] Error: could not load SDK");
                }
                if (typeof window._onAmplitudeReady === 'function') {
                    window._onAmplitudeReady();
                }
            };
            var i=t.getElementsByTagName("script")[0];
            i.parentNode.insertBefore(r,i);

            function s(e,t){e.prototype[t]=function(){this._q.push([t].concat(Array.prototype.slice.call(arguments,0)));return this;}}
            var o=function(){this._q=[];return this;}
            var a=["add","append","clearAll","prepend","set","setOnce","unset"];
            for(var u=0;u<a.length;u++){s(o,a[u]);}
            n.Identify=o;
            var c=function(){this._q=[];return this;}
            var l=["setProductId","setQuantity","setPrice","setRevenueType","setEventProperties"];
            for(var p=0;p<l.length;p++){s(c,l[p]);}
            n.Revenue=c;
            var d=["init","logEvent","logRevenue","setUserId","setUserProperties","setOptOut","setVersionName","setDomain","setDeviceId","setGlobalUserProperties","identify","clearUserProperties","setGroup","logRevenueV2","regenerateDeviceId","groupIdentify","onInit","logEventWithTimestamp","logEventWithGroups","setSessionId","resetSessionId"];
            function v(e){for(var t=0;t<d.length;t++){(function(t){e[d[t]]=function(){e._q.push([d[t]].concat(Array.prototype.slice.call(arguments,0)));};})(t);}}
            v(n);
            n.getInstance=function(e){e=(!e||0===e.length?"$default_instance":e).toLowerCase();if(!n._iq.hasOwnProperty(e)){n._iq[e]={_q:[]};v(n._iq[e]);}return n._iq[e];};
            e.amplitude=n;
        })(window,document);

        waitForDOMAndAmplitude(function() {
            var referrer = '';
            var pageType = 'Template Page Preview';
            sendAnalyticsFromUrl(referrer, pageType);
        });
    }

    if ('requestIdleCallback' in window) {
        requestIdleCallback(loadAmplitude);
    } else {
        setTimeout(loadAmplitude, 2000);
    }

    var shareasaleSSCID=shareasaleGetParameterByName("sscid");function shareasaleSetCookie(e,a,r,s,t){if(e&&a){var o,n=s?"; path="+s:"",i=t?"; domain="+t:"",S="";r&&((o=new Date).setTime(o.getTime()+r),S="; expires="+o.toUTCString()),document.cookie=e+"="+a+S+n+i+"; SameSite=None;Secure"}}function shareasaleGetParameterByName(e,a){a||(a=window.location.href),e=e.replace(/[\[\]]/g,"\\$&");var r=new RegExp("[?&]"+e+"(=([^&#]*)|&|#|$)").exec(a);return r?r[2]?decodeURIComponent(r[2].replace(/\+/g," ")):"":null}shareasaleSSCID&&shareasaleSetCookie("shareasaleSSCID",shareasaleSSCID,94670778e4,"/");

window.newAuthUri = 'https://auth.nicepage.com/authorize';
        document.addEventListener("DOMContentLoaded", function () {
            if (typeof google === 'undefined') {
                return;
            }
            try {
                google.accounts.id.initialize({
                    context: 'signin',
                    client_id: '13150095650-mo8psu2colep6uv90a2mu6r87u87s35a.apps.googleusercontent.com',
                    callback: window.handleCredentialResponse,
                    use_fedcm_for_prompt: true,
                });

                if (window.renderGoogleSignIdButton) {
                    google.accounts.id.renderButton(
                        document.getElementById('google-signin-button'),
                        {
                            theme: 'filled_blue',
                            size: 'large',
                            text: window.renderSignUpGoogleButton ? 'signup_with' : 'signin_with',
                            width: '250',
                            locale: 'en',
                        }
                    );
                }

                // display the One Tap dialog
                if (!window.hideGoogleSignIdPromt) {
                    google.accounts.id.prompt();
                }
            } catch (e) {
                console.error(e);
                if (typeof sendMessageOnServer === 'function') {
                    sendMessageOnServer('auth.js google.accounts.id.initialize error', { error: JSON.stringify(e, Object.getOwnPropertyNames(e)) });
                }
            }
        });

var device = '';
        function init($) {
            $('#previewDesktopBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });

            $('#previewLaptopBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewTabletBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewPhoneHorizontalBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewPhoneBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });

            detectActiveResponsiveButton();
        }

        if (jQuery.isReady) {
            init(jQuery);
        } else {
            jQuery(function ($) {
                init($);
            });
        }

        function setActiveResponsiveButton(btn) {
            $(".page-preview-header > a").removeClass("active");
            $(btn).addClass("active");
        }

        function detectActiveResponsiveButton() {
            var d = device;
            if (!d) {
                d = 'desktop';
            }
            $("#preview" + d.charAt(0).toUpperCase() + d.substr(1) + "Btn").click();
        }

        function getDataPreviewSizeAttr(el) {
            return el.closest("[data-preview-size]").attr("data-preview-size");
        }

        function setLivePreviewFrameSize(srcEl) {
            var getScrollbarWidth = function () {
                var s = $('<div class="base-inline-style-2"><div class="base-inline-style-3"></div></div>')
                    .appendTo("body");
                var res = s.width() - s.find("div").last().width();
                s.remove();
                return res;
            };
            var attr = getDataPreviewSizeAttr(srcEl);
            $('#livePreviewFrame').width(attr.indexOf("%") !== -1 ? attr : parseInt(attr, 10) + getScrollbarWidth());
        }

if (window.parent) {
                        var _w = 0, _h = 0;
                        var updateFormSize = function () {
                            var form = $('form.shaped-form-extended,form.shaped-form');
                            var w = form.outerWidth(true);
                            var h = form.outerHeight(true);
                            if (Math.abs(_w - w) > 5 || Math.abs(_h - h) > 5) {
                                _w = w;
                                _h = h;
                                var msg = { key: 'login-frame-size', width: w, height: h };
                                window.parent.postMessage(msg, "*");
                            }
                            setTimeout(updateFormSize, 300);
                        }
                        updateFormSize();
                    }

var device = '';
        function init($) {
            $('#previewDesktopBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });

            $('#previewLaptopBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewTabletBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewPhoneHorizontalBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewPhoneBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });

            detectActiveResponsiveButton();
        }

        if (jQuery.isReady) {
            init(jQuery);
        } else {
            jQuery(function ($) {
                init($);
            });
        }

        function setActiveResponsiveButton(btn) {
            $(".page-preview-header > a").removeClass("active");
            $(btn).addClass("active");
        }

        function detectActiveResponsiveButton() {
            var d = device;
            if (!d) {
                d = 'desktop';
            }
            $("#preview" + d.charAt(0).toUpperCase() + d.substr(1) + "Btn").click();
        }

        function getDataPreviewSizeAttr(el) {
            return el.closest("[data-preview-size]").attr("data-preview-size");
        }

        function setLivePreviewFrameSize(srcEl) {
            var getScrollbarWidth = function () {
                var s = $('<div class="base-inline-style-7"><div class="base-inline-style-8"></div></div>')
                    .appendTo("body");
                var res = s.width() - s.find("div").last().width();
                s.remove();
                return res;
            };
            var attr = getDataPreviewSizeAttr(srcEl);
            $('#livePreviewFrame').width(attr.indexOf("%") !== -1 ? attr : parseInt(attr, 10) + getScrollbarWidth());
        }

var device = '';
        function init($) {
            $('#previewDesktopBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });

            $('#previewLaptopBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewTabletBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewPhoneHorizontalBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });
            $('#previewPhoneBtn').click(function (e) {
                setLivePreviewFrameSize($(this));
                setActiveResponsiveButton(this);
                e.preventDefault();
            });

            detectActiveResponsiveButton();
        }

        if (jQuery.isReady) {
            init(jQuery);
        } else {
            jQuery(function ($) {
                init($);
            });
        }

        function setActiveResponsiveButton(btn) {
            $(".page-preview-header > a").removeClass("active");
            $(btn).addClass("active");
        }

        function detectActiveResponsiveButton() {
            var d = device;
            if (!d) {
                d = 'desktop';
            }
            $("#preview" + d.charAt(0).toUpperCase() + d.substr(1) + "Btn").click();
        }

        function getDataPreviewSizeAttr(el) {
            return el.closest("[data-preview-size]").attr("data-preview-size");
        }

        function setLivePreviewFrameSize(srcEl) {
            var getScrollbarWidth = function () {
                var s = $('<div class="base-inline-style-12"><div class="base-inline-style-13"></div></div>')
                    .appendTo("body");
                var res = s.width() - s.find("div").last().width();
                s.remove();
                return res;
            };
            var attr = getDataPreviewSizeAttr(srcEl);
            $('#livePreviewFrame').width(attr.indexOf("%") !== -1 ? attr : parseInt(attr, 10) + getScrollbarWidth());
        }
