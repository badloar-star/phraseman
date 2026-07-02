/** Публичный сайт (отдельный хостинг для домена). Форма шлёт данные в ту же Cloud Function, что и раньше — она пишет в Firestore, админку смотри по привычному адресу Firebase. */
window.KNOWLY_SITE = {
  /** Адрес этой страницы для QR (лучше основной домен, не поддомен Firebase). */
  publicDownloadPageUrl: 'https://knowlyapps.com/download/',
  storeIos: 'https://apps.apple.com/app/id6764800879',
  storeAndroid: 'https://play.google.com/store/apps/details?id=app.phraseman',
  contactEndpoint: (function () {
    try {
      var h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        return 'http://127.0.0.1:5001/phraseman-ea0b3/us-central1/submitWebsiteContact';
      }
    } catch (_) { /* noop */ }
    return 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/submitWebsiteContact';
  })(),
  statsEndpoint: (function () {
    try {
      var h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        return 'http://127.0.0.1:5001/phraseman-ea0b3/us-central1/siteStatsTrack';
      }
    } catch (_) { /* noop */ }
    return 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/siteStatsTrack';
  })(),

  /* ── Воронка /start/ (квиз + оплата) ─────────────────────────────────────
     Цены ниже — ТОЛЬКО отображение на пейволе. Реальную сумму задаёт сервер:
     Firestore web_checkout/config.priceCents (дефолты в functions/src/web_checkout.ts).
     Меняешь цену — меняй в ОБОИХ местах. */
  webPrices: {
    monthly: { amount: 9.99, label: '$9.99' },
    yearly: { amount: 49.99, label: '$49.99', perMonth: '$4.17' },
    lifetime: { amount: 99.99, label: '$99.99' },
  },
  checkoutEndpoint: (function () {
    try {
      var h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        return 'http://127.0.0.1:5001/phraseman-ea0b3/us-central1/webCheckoutCreate';
      }
    } catch (_) { /* noop */ }
    return 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/webCheckoutCreate';
  })(),
  paypalCreateEndpoint: 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/paypalOrderCreate',
  paypalCaptureEndpoint: 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/paypalOrderCapture',
  /* Статус заказа + код активации для страницы «спасибо». */
  orderStatusEndpoint: (function () {
    try {
      var h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        return 'http://127.0.0.1:5001/phraseman-ea0b3/us-central1/webOrderStatus';
      }
    } catch (_) { /* noop */ }
    return 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/webOrderStatus';
  })(),
  /* PayPal Client ID (публичный, из PayPal Developer Dashboard). Пусто = кнопка PayPal скрыта. */
  paypalClientId: '',
  /* Meta Pixel ID (из Meta Events Manager). Пусто = пиксель не грузится. */
  metaPixelId: '',
};
