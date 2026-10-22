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
  /* Сверено с боевым webPrices 2026-10-15: eur 799 / 3999 (lifetime 9999 — на сайте не продаётся с 15.10).
     зачем: фолбэк — то, что человек увидит при недоступном сервере, поэтому
     он обязан совпадать с реальным списанием. Разошёлся с админкой — обнови. */
  webPrices: {
    monthly: { amount: 7.99, label: '€7.99' },
    yearly: { amount: 39.99, label: '€39.99', perMonth: '€3.33' },
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
  /* Рубильник «Как вручить» (письмом / ссылкой) на /gift/.
     зачем: страница может уехать на хостинг раньше функций — без них
     ссылка-подарок и отмена не работали бы. Включать ВМЕСТЕ с выкладкой функций
     подарка, по «да» владельца. false = страница работает как раньше (код письмом). */
  // 22.10: включено — функции подарка выложены Ядром в 07:36Z, 15 минут логов чистые.
  giftDeliveryEnabled: true,
  /* Подарок Plus (functions/src/web_gift_endpoints.ts).
     зачем: /g/<КОД> — что за подарок;
     отмена кода или ссылки до активации со страницы «спасибо». */
  giftLinkInfoEndpoint: (function () {
    try {
      var h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        return 'http://127.0.0.1:5001/phraseman-ea0b3/us-central1/giftLinkInfo';
      }
    } catch (_) { /* noop */ }
    return 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/giftLinkInfo';
  })(),
  giftCancelEndpoint: (function () {
    try {
      var h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        return 'http://127.0.0.1:5001/phraseman-ea0b3/us-central1/giftCancel';
      }
    } catch (_) { /* noop */ }
    return 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/giftCancel';
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
