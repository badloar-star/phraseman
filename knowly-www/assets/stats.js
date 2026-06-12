/* Счётчик посещений и кликов по сторам. Без cookies и персональных данных:
   шлёт анонимные события (view / visit раз в сессию / click_ios / click_android)
   в Cloud Function siteStatsTrack, которая инкрементит агрегаты в Firestore. */
(function () {
  var cfg = window.KNOWLY_SITE || {};
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

    send({ type: 'view', page: page });

    var firstInSession = false;
    try {
      if (!sessionStorage.getItem('pm_session')) {
        sessionStorage.setItem('pm_session', '1');
        firstInSession = true;
      }
    } catch (_) {
      firstInSession = false;
    }
    if (firstInSession) send({ type: 'visit', page: page });

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
