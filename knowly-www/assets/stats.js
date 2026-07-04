/* Счётчик посещений и кликов по сторам. Без cookies и персональных данных:
   шлёт анонимные события (view / visit раз в сессию / click_ios / click_android)
   в Cloud Function siteStatsTrack, которая инкрементит агрегаты в Firestore.

   Плюс Meta Pixel (если задан KNOWLY_SITE.metaPixelId) — один на все страницы:
   PageView здесь, событийные track() зовут страницы сами через window.fbq.
   GDPR: в таймзонах ЕС/ЕЭЗ пиксель включается только после согласия
   (маленький баннер, выбор хранится в localStorage pm_consent); вне ЕС —
   сразу, согласие подразумевается региональным правом. */
(function () {
  var cfg = window.KNOWLY_SITE || {};
  var CONSENT_KEY = 'pm_consent';

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

  /* ЕС/ЕЭЗ + Великобритания и Швейцария — где нужен opt-in до трекинга. */
  function isEuTimezone() {
    try {
      var tz = String((Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '');
      var eu = [
        'Europe/Vienna', 'Europe/Brussels', 'Europe/Sofia', 'Europe/Zagreb', 'Europe/Prague',
        'Europe/Copenhagen', 'Europe/Tallinn', 'Europe/Helsinki', 'Europe/Paris', 'Europe/Berlin',
        'Europe/Busingen', 'Europe/Athens', 'Europe/Budapest', 'Europe/Dublin', 'Europe/Rome',
        'Europe/Riga', 'Europe/Vilnius', 'Europe/Luxembourg', 'Europe/Malta', 'Europe/Amsterdam',
        'Europe/Warsaw', 'Europe/Lisbon', 'Atlantic/Madeira', 'Atlantic/Azores', 'Europe/Bucharest',
        'Europe/Bratislava', 'Europe/Ljubljana', 'Europe/Madrid', 'Atlantic/Canary', 'Europe/Stockholm',
        'Asia/Nicosia', 'Europe/Nicosia', 'Europe/Oslo', 'Atlantic/Reykjavik', 'Europe/Vaduz',
        'Europe/London', 'Europe/Gibraltar', 'Europe/Zurich', 'Europe/Monaco', 'Europe/Andorra',
        'Europe/San_Marino', 'Europe/Vatican',
      ];
      return eu.indexOf(tz) !== -1;
    } catch (_) {
      return true; // не смогли определить — ведём себя как в ЕС (строже)
    }
  }

  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY) || ''; } catch (_) { return ''; }
  }

  function writeConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (_) { /* noop */ }
  }

  function showConsentBanner() {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Согласие на куки');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;'
      + 'max-width:560px;margin-inline:auto;display:flex;flex-wrap:wrap;gap:10px;align-items:center;'
      + 'padding:14px 16px;border-radius:14px;background:#14161d;color:#e8e9ee;'
      + 'border:1px solid rgba(232,197,102,.35);box-shadow:0 8px 30px rgba(0,0,0,.45);'
      + 'font:500 13.5px/1.5 Inter,system-ui,sans-serif';
    var text = document.createElement('span');
    text.style.cssText = 'flex:1 1 260px';
    text.innerHTML = 'Используем куки, чтобы понимать, какая реклама работает. '
      + '<a href="/legal/privacy/" style="color:#e8c566">Подробнее</a>';
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = 'Хорошо';
    ok.style.cssText = 'padding:9px 18px;border-radius:10px;border:none;cursor:pointer;'
      + 'background:linear-gradient(135deg,#e8c566,#c8a24a);color:#101319;font:700 13.5px Inter,system-ui,sans-serif';
    var no = document.createElement('button');
    no.type = 'button';
    no.textContent = 'Нет';
    no.style.cssText = 'padding:9px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.2);'
      + 'cursor:pointer;background:none;color:#a4a5ae;font:600 13.5px Inter,system-ui,sans-serif';
    ok.addEventListener('click', function () { writeConsent('yes'); bar.remove(); initMetaPixel(); });
    no.addEventListener('click', function () { writeConsent('no'); bar.remove(); });
    bar.appendChild(text);
    bar.appendChild(ok);
    bar.appendChild(no);
    document.body.appendChild(bar);
  }

  function bootMetaPixel() {
    if (!cfg.metaPixelId) return;
    if (!isEuTimezone()) { initMetaPixel(); return; }
    var consent = readConsent();
    if (consent === 'yes') { initMetaPixel(); return; }
    if (consent === 'no') return;
    if (document.body) showConsentBanner();
    else document.addEventListener('DOMContentLoaded', showConsentBanner);
  }

  try {
    if (!/bot|crawl|spider|headless|lighthouse|preview/i.test(navigator.userAgent || '')) bootMetaPixel();
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
