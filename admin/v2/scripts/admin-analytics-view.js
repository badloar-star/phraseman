function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

const language = window.AdminAnalyticsLanguage;

function number(value, available = true) {
  const parsed = Number(value);
  return available && Number.isFinite(parsed) ? parsed.toLocaleString('ru-RU') : '—';
}

function percent(value, available = true) {
  if (value == null || value === '') return '—';
  const parsed = Number(value);
  return available && Number.isFinite(parsed) ? `${(parsed * 100).toFixed(1)}%` : '—';
}

function dateTime(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? new Date(parsed).toLocaleString('ru-RU') : 'Нет данных';
}

function sourceAvailable(snapshot, key) {
  return ['ready', 'empty'].includes(String(snapshot?.sources?.[key]?.state || ''));
}

function sourceTone(state) {
  if (state === 'ready') return 'success';
  if (state === 'partial') return 'warning';
  if (state === 'error') return 'danger';
  return '';
}

function sourceLabel(state) {
  return ({ ready: 'Готов', empty: 'Пусто', partial: 'Неполно', error: 'Ошибка' })[state] || 'Не загружен';
}

function metric(label, value, note, available = true) {
  return `<article class="metric analytics-metric"><label>${escapeHtml(label)}</label><strong>${escapeHtml(number(value, available))}</strong><small>${escapeHtml(note)}</small></article>`;
}

function skeletonMetrics() {
  return `<div class="analytics-summary-grid analytics-skeleton" aria-hidden="true">${Array.from({ length: 4 }, () => '<div class="metric analytics-metric"><span></span><strong></strong><small></small></div>').join('')}</div>`;
}

function stateNotice(model) {
  const hasSnapshot = Boolean(model.snapshot);
  if (!model.authorized) return '<div class="notice warning" role="status">Для просмотра нужна роль с разрешением «Деньги: чтение».</div>';
  if (model.status === 'loading') return `<div class="notice" role="status">${hasSnapshot ? 'Обновляем серверный снимок. Предыдущие проверенные данные остаются на экране.' : 'Загружаем серверный снимок и проверяем полноту источников…'}</div>`;
  if (model.status === 'partial') return '<div class="notice warning" role="status"><strong>Снимок неполный.</strong> Не принимайте решения по источникам со статусом «Неполно» или «Ошибка».</div>';
  if (model.status === 'empty') return '<div class="notice" role="status">Источники прочитаны, но за выбранный период событий пока нет.</div>';
  if (model.status === 'error') return `<div class="notice danger" role="alert"><strong>Не удалось обновить снимок.</strong> ${escapeHtml(model.error || 'Проверьте доступность серверной функции и повторите загрузку.')}${hasSnapshot ? ' Ниже сохранён последний успешный снимок.' : ''}</div>`;
  return '<div class="notice" role="status">Выберите период и загрузите серверный снимок.</div>';
}

function accessSection(snapshot) {
  const access = snapshot?.access || {};
  const kinds = access.byKind || {};
  const available = sourceAvailable(snapshot, 'users');
  return `<section class="section" aria-labelledby="analytics-access-title">
    <div class="section-heading"><div><h2 id="analytics-access-title">Активные доступы</h2><p>Доступ к Plus сейчас. Магазинные, VIP, административные и подарочные доступы не смешиваются.</p></div>${snapshot?.sources?.users?.state === 'partial' ? '<span class="badge warning">Неполная база</span>' : ''}</div>
    <div class="analytics-summary-grid">
      ${metric('Всего активных доступов', access.activeAccessTotal, 'Все взаимоисключающие категории', available)}
      ${metric('Оплачено через магазин', access.storeBackedTotal, 'Подписки, пробный период и покупка навсегда', available)}
      ${metric('Активные пробные периоды', access.activeTrials, 'Только действующий пробный период магазина', available)}
      ${metric('Документов проверено', access.scannedUsers, 'Скрытые неканонические записи исключены', available)}
    </div>
    <div class="analytics-breakdown-grid section">
      ${metric('Подписки магазина', kinds.store_subscription, 'Действующая месячная или годовая подписка', available)}
      ${metric('Покупка навсегда', kinds.store_lifetime, 'Разовая бессрочная покупка', available)}
      ${metric('VIP', kinds.vip, 'Активный привилегированный доступ', available)}
      ${metric('Административная выдача', kinds.admin_grant, 'Ручной доступ от администратора', available)}
      ${metric('Подарочный доступ', kinds.gift, 'Активный приветственный или loyalty gift', available)}
      ${metric('Неподтверждённый источник', kinds.manual_or_unknown, 'Нужно проверить происхождение доступа', available)}
    </div>
  </section>`;
}

function storeSection(snapshot) {
  const store = snapshot?.storeActivity || {};
  const shard = snapshot?.shardActivity || {};
  const premiumAvailable = sourceAvailable(snapshot, 'revenuecat_premium_events');
  const shardAvailable = sourceAvailable(snapshot, 'revenuecat_shard_transactions');
  return `<section class="card section" aria-labelledby="analytics-store-title"><div class="card-header"><div><h2 id="analytics-store-title">События магазина</h2><p>Только подтверждённые рабочие события RevenueCat за выбранный период. Это история уведомлений магазина, а не текущие доступы пользователей.</p></div><span class="badge ${sourceTone(snapshot?.sources?.revenuecat_premium_events?.state)}">${escapeHtml(sourceLabel(snapshot?.sources?.revenuecat_premium_events?.state))}</span></div><div class="card-body">
    <div class="analytics-summary-grid">
      ${metric('Начальные покупки', store.newPurchases, 'Первая подписка или разовая покупка', premiumAvailable)}
      ${metric('Продления', store.renewals, 'Подписка успешно продлена', premiumAvailable)}
      ${metric('Начало пробного периода', store.trialStarts, 'Первая покупка с пробным периодом', premiumAvailable)}
      ${metric('Возвраты', store.refunds, 'Магазин подтвердил возврат', premiumAvailable)}
      ${metric('Покупки осколков', shard.productionPurchases, 'Только подтверждённые рабочие покупки', shardAvailable)}
    </div>
    <div class="notice section">Тестовые покупки и события без подтверждённого рабочего окружения исключены. Событие подписки с признаком пробного периода само по себе не считается началом пробного периода.</div>
  </div></section>`;
}

function funnelSection(snapshot) {
  const funnel = snapshot?.funnelSignals || {};
  const events = funnel.events || {};
  const available = sourceAvailable(snapshot, 'paywall_funnel');
  return `<section class="card section" aria-labelledby="analytics-funnel-title"><div class="card-header"><div><h2 id="analytics-funnel-title">Сигналы экрана оплаты</h2><p>События, не уникальные пользователи и не деньги. Только пользователи, разрешившие аналитику.</p></div><span class="badge ${sourceTone(snapshot?.sources?.paywall_funnel?.state)}">${escapeHtml(sourceLabel(snapshot?.sources?.paywall_funnel?.state))}</span></div><div class="card-body">
    <div class="analytics-funnel-grid">
      ${metric('Показы', events.shown, 'Сколько раз открыли экран оплаты', available)}
      ${metric('Нажатия главной кнопки', events.ctaClick, 'Сколько раз нажали кнопку покупки', available)}
      ${metric('Сигналы пробного периода', events.trialStarted, 'Сигнал приложения, ещё не подтверждение магазина', available)}
      ${metric('Сигналы завершённой покупки', events.purchaseCompleted, 'Сигнал приложения, ещё не подтверждение магазина', available)}
      <article class="metric analytics-metric"><label>Доля завершённых покупок</label><strong>${escapeHtml(percent(funnel.purchaseSignalRate, available))}</strong><small>Завершённые покупки относительно показов экрана оплаты</small></article>
    </div>
  </div></section>`;
}

function activitySection(snapshot) {
  const entries = Object.entries(snapshot?.appActivity || {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  const available = sourceAvailable(snapshot, 'app_activity');
  return `<section class="card section" aria-labelledby="analytics-activity-title"><div class="card-header"><div><h2 id="analytics-activity-title">Активность приложения</h2><p>Что именно пользователи делали в приложении за выбранный период.</p></div><span class="badge ${sourceTone(snapshot?.sources?.app_activity?.state)}">${escapeHtml(sourceLabel(snapshot?.sources?.app_activity?.state))}</span></div><div class="card-body">${available && entries.length ? `<div class="table-scroll"><table><thead><tr><th>Что произошло</th><th>Сколько раз</th></tr></thead><tbody>${entries.slice(0, 20).map(([key, value]) => `<tr><td><strong>${escapeHtml(language.label('action', key))}</strong><small class="muted" title="Технический ключ события">Технический ключ: <code>${escapeHtml(key)}</code></small></td><td>${escapeHtml(number(value))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="analytics-empty">За выбранный период действий не зарегистрировано.</div>'}</div></section>`;
}

function sourceSection(snapshot) {
  const labels = {
    users: 'Пользователи', app_activity: 'Активность приложения', revenuecat_premium_events: 'RevenueCat: Plus',
    revenuecat_shard_transactions: 'RevenueCat: шарды', paywall_funnel: 'Воронка оплаты',
  };
  const rows = Object.entries(snapshot?.sources || {});
      return `<section class="card section" aria-labelledby="analytics-source-title"><div class="card-header"><div><h2 id="analytics-source-title">Качество источников</h2><p>Полнота и свежесть проверяются отдельно. Усечённый источник нельзя считать точным.</p></div></div><div class="card-body"><div class="analytics-source-grid">${rows.map(([key, source]) => `<article><div><strong>${escapeHtml(labels[key] || 'Неизвестный источник данных')}</strong><span class="badge ${sourceTone(source?.state)}">${escapeHtml(sourceLabel(source?.state))}</span></div>${labels[key] ? '' : `<small class="muted">Технический ключ: <code>${escapeHtml(key)}</code></small>`}<dl><dt>Строк</dt><dd>${escapeHtml(number(source?.count))}</dd><dt>Данные до</dt><dd>${escapeHtml(dateTime(source?.latestAtMs))}</dd><dt>Полнота</dt><dd>${source?.truncated ? 'Достигнут лимит' : 'Лимит не достигнут'}</dd>${source?.errorCode ? `<dt>Код ошибки</dt><dd><code>${escapeHtml(source.errorCode)}</code></dd>` : ''}</dl></article>`).join('')}</div></div></section>`;
}

export function renderAdminAnalytics(model) {
  const rangeDays = Number(model.rangeDays || model.snapshot?.rangeDays || 28);
  const loading = model.status === 'loading';
  const controlsDisabled = Boolean(model.controlsDisabled || !model.authorized || model.busy || loading);
  const snapshot = model.snapshot;
  return `<header class="page-header"><div><div class="eyebrow">Деньги / Аналитика</div><h1>Аналитика</h1><p>Серверные показатели с отдельным состоянием каждого источника и честными определениями.</p></div><div class="analytics-toolbar"><label for="analytics-range">Период</label><select id="analytics-range"${controlsDisabled ? ' disabled' : ''}><option value="7"${rangeDays === 7 ? ' selected' : ''}>7 дней</option><option value="28"${rangeDays === 28 ? ' selected' : ''}>28 дней</option><option value="90"${rangeDays === 90 ? ' selected' : ''}>90 дней</option></select><button class="button primary" data-action="load-analytics" type="button" title="Обновить серверный снимок аналитики"${controlsDisabled ? ' disabled' : ''}>${loading ? 'Обновление…' : 'Обновить'}</button></div></header>
    <div class="analytics-status" aria-live="polite">${stateNotice(model)}${snapshot ? `<small>Снимок: ${escapeHtml(dateTime(snapshot.generatedAtMs))} · период ${escapeHtml(snapshot.rangeDays)} дней · ${escapeHtml(snapshot.definitionVersion || '')}</small>` : ''}</div>
    ${snapshot ? `${accessSection(snapshot)}${storeSection(snapshot)}${funnelSection(snapshot)}${activitySection(snapshot)}${sourceSection(snapshot)}` : skeletonMetrics()}`;
}
