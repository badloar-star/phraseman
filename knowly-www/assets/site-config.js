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
  /* Сверено с боевым webPrices 2026-08-27: eur 399 / 2799 / 9999.
     зачем: фолбэк — то, что человек увидит при недоступном сервере, поэтому
     он обязан совпадать с реальным списанием. Разошёлся с админкой — обнови. */
  webPrices: {
    monthly: { amount: 3.99, label: '€3.99' },
    yearly: { amount: 27.99, label: '€27.99', perMonth: '€2.33' },
    lifetime: { amount: 99.99, label: '€99.99' },
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
  /* Захват email из квиза («куда прислать план?») — письмо с планом + до двух
     догоняющих писем неоплатившим (functions/src/web_leads.ts). */
  leadEndpoint: (function () {
    try {
      var h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        return 'http://127.0.0.1:5001/phraseman-ea0b3/us-central1/webLeadCapture';
      }
    } catch (_) { /* noop */ }
    return 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/webLeadCapture';
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
  /* PayPal Client ID (публичный, LIVE-приложение «knowlyapps» из PayPal Developer Dashboard).
     Пусто = кнопка PayPal скрыта. Серверный режим: web_checkout/config.paypalLive (админка «Сайт»). */
  paypalClientId: 'ATnteMlsxgXXXZjVclzsfJqHNQ3U4tth9fkoMS26opImYEsRmeO082QxM9np-tiB8xcAB3rJY0z2qq0l',
  /* Meta Pixel ID (из Meta Events Manager). Пусто = пиксель не грузится.
     ⚠️ ВЛАДЕЛЬЦУ: вставь сюда ID пикселя — без него реклама не видит покупок
     (PageView шлёт stats.js на всех страницах; Lead/InitiateCheckout — квиз;
     Purchase с суммой — страница «спасибо»). */
  metaPixelId: '',
};
