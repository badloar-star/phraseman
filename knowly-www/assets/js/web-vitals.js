/* Consent-gated, aggregate-only Core Web Vitals observer.
 * Query strings and hash fragments are intentionally never read or sent.
 * The endpoint is opt-in: without KNOWLY_SITE.webVitalsEndpoint this is inert.
 */
(function () {
  'use strict';
  var cfg = window.KNOWLY_SITE || {};
  var endpoint = typeof cfg.webVitalsEndpoint === 'string' ? cfg.webVitalsEndpoint : '';
  var consentKey = 'pm_consent';
  var sent = { lcp: false, inp: false, cls: false };
  var lcpValue = 0;
  var inpValue = 0;
  var clsValue = 0;

  function consentGranted() {
    try { return window.localStorage.getItem(consentKey) || ''; } catch (_) { return ''; }
  }
  function routeTemplate() {
    var pathname = String(window.location.pathname || '/').replace(/\/{2,}/g, '/');
    if (pathname === '/') return 'home';
    if (pathname.indexOf('/guides/') === 0) return 'guides';
    if (pathname.indexOf('/legal/') === 0) return 'legal';
    if (pathname.indexOf('/english-level-test') === 0) return 'level-test';
    if (pathname.indexOf('/start') === 0) return 'start';
    if (pathname.indexOf('/download') === 0) return 'download';
    return 'other';
  }
  function deviceClass() {
    try { return window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop'; } catch (_) { return 'unknown'; }
  }
  function send(type, value) {
    var consent = consentGranted();
    if (!endpoint || sent[type] || consent !== 'yes' || !Number.isFinite(value)) return;
    sent[type] = true;
    var body = JSON.stringify({
      type: type,
      value: Math.round(value * 100) / 100,
      route: routeTemplate(),
      deviceClass: deviceClass(),
      release: String(document.body && document.body.getAttribute('data-approved-studio') || 'unknown').slice(0, 32),
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
      window.fetch(endpoint, { method: 'POST', body: body, keepalive: true }).catch(function () {});
    } catch (_) { /* metrics must never affect the page */ }
  }
  function observe(type, callback) {
    if (!window.PerformanceObserver) return;
    try {
      var observer = new PerformanceObserver(function (list) { list.getEntries().forEach(callback); });
      observer.observe({ type: type, buffered: true });
    } catch (_) { /* unsupported metric */ }
  }
  observe('largest-contentful-paint', function (entry) { lcpValue = Math.max(lcpValue, entry.startTime); });
  observe('event', function (entry) { if (entry.interactionId) inpValue = Math.max(inpValue, entry.duration); });
  observe('layout-shift', function (entry) { if (!entry.hadRecentInput) clsValue += entry.value; });
  function flush() {
    var lcp = performance.getEntriesByType && performance.getEntriesByType('largest-contentful-paint');
    if (lcp && lcp.length) lcpValue = Math.max(lcpValue, lcp[lcp.length - 1].startTime);
    send('lcp', lcpValue);
    send('inp', inpValue);
    send('cls', clsValue);
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
})();
