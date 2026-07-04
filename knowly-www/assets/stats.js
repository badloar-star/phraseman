/* Счётчик посещений и кликов по сторам. Без cookies и персональных данных:
   шлёт анонимные события (view / visit раз в сессию / click_ios / click_android)
   в Cloud Function siteStatsTrack, которая инкрементит агрегаты в Firestore.
   Плюс Meta Pixel (если задан KNOWLY_SITE.metaPixelId) — один на все страницы:
   PageView здесь, событийные track() зовут страницы сами через window.fbq. */
(function () {
  var cfg = window.KNOWLY_SITE || {};

  function initMetaPixel() {
    var id = cfg.metaPixelId;
    if (!id || window.fbq) return;
    /* стандартный загрузчик Meta Pixel */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }

  try {
    if (!/bot|crawl|spider|headless|lighthouse|preview/i.test(navigator.userAgent || '')) initMetaPixel();
  } catch (_) { /* noop */ }

  var endpoint = cfg.statsEndpoint;
  if (!endpoint) return;

  function send(payload) {
    try {
      var body = JSON.stringify(payload);
      // Строка (text/plain) — простой запрос без CORS-preflight; beacon переживает уход со страницы.
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
      fetch(endpoint, { method: 'POST', body: body, keepalive: true }).catch(function () {});
    } catch (_) {
      /* счётчик никогда не должен ломать страницу */
    }
  }

  try {
    if (/bot|crawl|spider|headless|lighthouse|preview/i.test(navigator.userAgent || '')) return;
    var page = (location && location.pathname) || '/';

    var firstInSession = false;
    try {
      if (!sessionStorage.getItem('pm_session')) {
        sessionStorage.setItem('pm_session', '1');
        firstInSession = true;
      }
    } catch (_) {
      firstInSession = false;
    }
    var initialEvents = [{ type: 'view', page: page }];
    if (firstInSession) initialEvents.push({ type: 'visit', page: page });
    send(initialEvents.length > 1 ? { events: initialEvents } : initialEvents[0]);

    document.addEventListener(
      'click',
      function (e) {
        var target = e.target;
        if (!target || !target.closest) return;
        var link = target.closest('[data-store]');
        if (!link) return;
        var store = link.getAttribute('data-store');
        if (store === 'ios') send({ type: 'click_ios', page: page });
        else if (store === 'android') send({ type: 'click_android', page: page });
      },
      true,
    );
  } catch (_) {
    /* noop */
  }
})();
