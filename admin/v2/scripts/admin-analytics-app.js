import { createAnalyticsAdminActions } from './admin-analytics-firebase.js';

let actions = null;
let authState = { authorized: false, email: '', role: '' };

function analyticsWorkspaceMarkup() {
  return `<header class="page-header">
    <div><div class="eyebrow">Деньги / Аналитика</div><h1>Аналитика продукта и подписок</h1><p>Отдельная read-only панель. Она показывает только агрегированные данные и не содержит действий, изменяющих приложение или пользователей.</p></div>
    <a class="button" href="../index.html" title="Вернуться ко всем прежним инструментам админки">Открыть legacy‑админку</a>
  </header>
  <div class="notice warning section"><strong>Границы данных.</strong> Аналитика продукта включает только события пользователей, разрешивших аналитику. Установка приложения не равна уникальному человеку. Сырые тексты и прямые идентификаторы здесь не показываются.</div>

  <nav class="actions section" aria-label="Разделы аналитики">
    <a class="button" href="#product" title="Перейти к аналитике продукта">Продукт</a>
    <a class="button" href="#subscriptions" title="Перейти к жизненному циклу подписок">Подписки</a>
    <a class="button" href="#monthly" title="Перейти к ежемесячному пакету решений">Пакет решений</a>
  </nav>

  <section id="product" aria-labelledby="product-analytics-title">
    <section id="product-analytics-panel" class="card section" aria-labelledby="product-analytics-title">
      <div class="card-header analytics-detail-header"><div><h2 id="product-analytics-title">Экраны, сессии и уроки</h2><p>Детальная диагностика только по событиям пользователей, разрешивших аналитику. Установка приложения не равна уникальному человеку.</p></div><div class="analytics-detail-controls"><label for="product-analytics-range">Период</label><select id="product-analytics-range" data-admin-auth disabled title="За какой период показать события продукта"><option value="7">7 дней</option><option value="28" selected>28 дней</option><option value="90">90 дней</option></select><label for="product-analytics-platform">Платформа</label><select id="product-analytics-platform" data-admin-auth disabled title="Показывать все платформы или только одну"><option value="all">Все платформы</option><option value="ios">iOS</option><option value="android">Android</option></select><button class="button" data-admin-auth disabled type="button" onclick="loadProductAnalytics(true)" title="Обновить детальную аналитику продукта">Обновить данные</button></div></div>
      <div id="product-analytics-status" class="analytics-detail-status" role="status">Войдите с ролью, имеющей право money.read.</div>
      <div id="product-analytics-summary" class="an2-grid"><article class="an2-card"><div class="an2-kicker">Установки приложения</div><div class="an2-value" data-pa="instances">—</div><div class="an2-note">Не гарантированно уникальные люди.</div></article><article class="an2-card"><div class="an2-kicker">Сессии</div><div class="an2-value" data-pa="sessions">—</div></article><article class="an2-card"><div class="an2-kicker">Показы экранов</div><div class="an2-value" data-pa="views">—</div></article><article class="an2-card"><div class="an2-kicker">Нераспознанные экраны</div><div class="an2-value" data-pa="unknown">—</div></article></div>
      <section id="product-analytics-sessions" class="analytics-detail-block"><h3>Сессии использования приложения</h3><div class="reports-empty">Ожидаем данные…</div></section>
      <section class="analytics-detail-block"><h3>Последние наблюдаемые экраны</h3><div id="product-analytics-screens" class="table-scroll"><div class="reports-empty">Ожидаем данные…</div></div></section>
      <section class="analytics-detail-block"><h3>Завершение уроков и явные выходы</h3><div id="product-analytics-lessons" class="table-scroll"><div class="reports-empty">Ожидаем данные…</div></div></section>
      <section class="analytics-detail-block"><h3>На каких фразах возникают трудности</h3><div id="product-analytics-learning-dropoff"><div class="reports-empty">Ожидаем данные…</div></div></section>
      <section class="analytics-detail-block"><h3>Результаты обучения и отложенное вспоминание</h3><p class="analytics-detail-copy">Только успешно сохранённые ответы SRS и агрегаты по экземплярам приложения, давшим согласие на аналитику. Тексты фраз и ответов не выгружаются.</p><div id="product-analytics-learning-outcomes"><div class="reports-empty">Ожидаем данные…</div></div></section>
      <section class="analytics-detail-block"><h3>Путь от показа оплаты до покупки</h3><div id="product-analytics-conversion"><div class="reports-empty">Ожидаем данные…</div></div></section>
      <section class="analytics-detail-block"><h3>Активация, каналы и удержание</h3><p class="analytics-detail-copy">Путь от первого измеримого касания до обучения и возврата. Старый расчёт по первому событию внутри окна сохранён в диагностике.</p><div id="product-analytics-retention"><div class="reports-empty">Ожидаем данные…</div></div></section>
      <section class="analytics-detail-block"><h3>Эксперименты</h3><p class="analytics-detail-copy">Только фактически показанные варианты с governed passport. Наблюдаемая разница не доказывает причинный эффект.</p><div id="product-analytics-experiments"><div class="reports-empty">Ожидаем данные…</div></div></section>
      <section class="analytics-detail-block"><h3>Версии и надёжность</h3><p class="analytics-detail-copy">Нормализованные агрегаты без текста ошибок. Недоступные Crashlytics‑показатели обозначаются явно.</p><div id="product-analytics-reliability"><div class="reports-empty">Ожидаем данные…</div></div></section>
      <section class="analytics-detail-block"><h3>Полнота и качество данных</h3><div id="product-analytics-quality" class="reports-empty">Ожидаем данные…</div></section>
    </section>
  </section>

  <section id="subscriptions" aria-labelledby="subscription-analytics-title">
    <section id="subscription-analytics-panel" class="card section" aria-labelledby="subscription-analytics-title">
      <div class="card-header analytics-detail-header"><div><h2 id="subscription-analytics-title">Подписки и платежные события</h2><p>Серверные агрегаты RevenueCat: покупки, продления, отключения продления, окончание доступа, проблемы со списанием и возвраты.</p></div><div class="analytics-detail-controls"><label for="subscription-analytics-range">Период</label><select id="subscription-analytics-range" data-admin-auth disabled title="За какой период показать серверные события"><option value="7">7 дней</option><option value="28" selected>28 дней</option><option value="90">90 дней</option><option value="365">365 дней</option></select><label for="subscription-analytics-store">Магазин</label><select id="subscription-analytics-store" data-admin-auth disabled title="Показывать все магазины или только один"><option value="all">Все магазины</option><option value="APP_STORE">App Store</option><option value="PLAY_STORE">Google Play</option><option value="STRIPE">Stripe</option></select><button class="button" data-admin-auth disabled type="button" onclick="loadSubscriptionAnalytics(true)" title="Обновить серверные события подписок">Обновить данные</button></div></div>
      <div id="subscription-analytics-status" class="analytics-detail-status" role="status">Войдите с ролью, имеющей право money.read.</div>
      <div id="subscription-analytics-content"><div class="reports-empty">Ожидаем серверные данные RevenueCat…</div></div>
    </section>
  </section>

  <section id="monthly" aria-labelledby="monthly-decision-pack-title">
    <section id="monthly-decision-pack-panel" class="card section" aria-labelledby="monthly-decision-pack-title">
      <div class="card-header analytics-detail-header"><div><h2 id="monthly-decision-pack-title">Ежемесячный пакет решений</h2><p>Безопасная агрегированная выгрузка за календарный месяц и базовый период из 12 предыдущих полных месяцев. Сырые события, тексты и идентификаторы пользователей не включаются.</p></div></div>
      <div class="analytics-detail-controls"><label for="monthly-decision-pack-month">Месяц</label><input id="monthly-decision-pack-month" data-admin-auth disabled type="month" title="По умолчанию используется последний полностью завершённый календарный месяц"><label for="monthly-decision-pack-timezone">Часовой пояс</label><select id="monthly-decision-pack-timezone" data-admin-auth disabled title="Границы календарного месяца считаются в выбранном часовом поясе"><option value="UTC">UTC</option><option value="Europe/Dublin" selected>Europe/Dublin</option><option value="America/Los_Angeles">America/Los_Angeles</option></select><button id="monthly-decision-pack-download" class="button primary" data-admin-auth disabled type="button" onclick="generateMonthlyDecisionPack()" title="Сформировать на сервере и скачать агрегированный ZIP">Сформировать и скачать ZIP</button></div>
      <div id="monthly-decision-pack-status" class="analytics-detail-status" role="status">По умолчанию будет выбран последний завершённый месяц.</div>
      <div id="monthly-decision-pack-preview" class="reports-empty">После формирования здесь появятся полнота источников, ограничения и список файлов.</div>
    </section>
  </section>`;
}

function setMessage(message, kind = '') {
  const element = document.getElementById('global-message');
  if (!element) return;
  element.hidden = !message;
  element.className = `global-message${kind ? ` ${kind}` : ''}`;
  element.textContent = message;
}

function syncAuthorizedControls() {
  document.querySelectorAll('[data-admin-auth]').forEach((element) => {
    element.disabled = !authState.authorized;
  });
}

function renderAuth() {
  const status = document.getElementById('auth-status');
  const button = document.getElementById('auth-action');
  if (!status || !button) return;
  status.textContent = authState.authorized
    ? `${authState.email} · ${authState.role}`
    : authState.email
      ? 'Нет права money.read'
      : 'Требуется вход';
  button.textContent = authState.email ? 'Выйти' : 'Войти';
  button.disabled = !actions;
  syncAuthorizedControls();
}

function installCallableAdapters() {
  globalThis.callAdminProductAnalytics = async (input) => ({ data: await actions.loadProductAnalytics(input) });
  globalThis.callAdminSubscriptionAnalytics = async (input) => ({ data: await actions.loadSubscriptionAnalytics(input) });
  globalThis.callAdminMonthlyDecisionPack = async (input) => ({ data: await actions.generateMonthlyDecisionPack(input) });
}

function installUnavailableCallableAdapters() {
  const unavailableCallable = async () => {
    const error = new Error('Сервис аналитики ещё запускается. Повторите через несколько секунд.');
    error.code = 'unavailable';
    throw error;
  };
  globalThis.callAdminProductAnalytics = unavailableCallable;
  globalThis.callAdminSubscriptionAnalytics = unavailableCallable;
  globalThis.callAdminMonthlyDecisionPack = unavailableCallable;
}

async function onAuth(nextAuthState) {
  authState = nextAuthState;
  renderAuth();
  if (!authState.authorized) return;
  setMessage('');
  globalThis.initializeMonthlyDecisionPack?.();
  await Promise.allSettled([
    globalThis.loadProductAnalytics?.(),
    globalThis.loadSubscriptionAnalytics?.(),
  ]);
}

document.getElementById('app').innerHTML = analyticsWorkspaceMarkup();
globalThis.initializeMonthlyDecisionPack?.();
renderAuth();

document.getElementById('auth-action')?.addEventListener('click', async () => {
  if (!actions) return;
  try {
    if (authState.email) await actions.signOut();
    else await actions.signIn();
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'Не удалось выполнить вход.', 'danger');
  }
});

installUnavailableCallableAdapters();
createAnalyticsAdminActions({ onAuth }).then((createdActions) => {
  actions = createdActions;
  installCallableAdapters();
  renderAuth();
}).catch((error) => {
  setMessage(error instanceof Error ? error.message : 'Не удалось инициализировать аналитику.', 'danger');
});
