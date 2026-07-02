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
     Цены пейвол берёт С СЕРВЕРА (pricesEndpoint → web_checkout/config — то же
     место, по которому списываются деньги; меняются в админке «🌐 Сайт»).
     webPrices ниже — только фоллбек на случай недоступности сервера:
     держи его примерно актуальным, но источник правды — админка. */
  webPrices: {
    monthly: { amount: 9.99, label: '$9.99' },
    yearly: { amount: 49.99, label: '$49.99', perMonth: '$4.17' },
    lifetime: { amount: 99.99, label: '$99.99' },
  },
  pricesEndpoint: (function () {
    try {
      var h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        return 'http://127.0.0.1:5001/phraseman-ea0b3/us-central1/webPrices';
      }
    } catch (_) { /* noop */ }
    return 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/webPrices';
  })(),
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
  /* PayPal Client ID (публичный, из PayPal Developer Dashboard). Пусто = кнопка PayPal скрыта.
     ⚠️ Сейчас SANDBOX-ключ (тестовый режим, серверный paypalLive=false в web_checkout/config).
     Для боевого PayPal: взять Live-ключи на developer.paypal.com (вкладка Live), заменить здесь,
     обновить секреты PAYPAL_* и переключить «PayPal режим» на LIVE в админке «Сайт». */
  paypalClientId: 'AYCVDjHk2hTGzAzMl1GoZv1PBpeGH53ijvUOXAqw5AVqMJPpcc-15k6y3g_6YIf7xJf0T4Cnhfdv-bFi',
  /* Meta Pixel ID (из Meta Events Manager). Пусто = пиксель не грузится. */
  metaPixelId: '',
};
