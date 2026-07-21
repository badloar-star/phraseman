import { renderPaywallAnalyticsCategory } from './admin-analytics-trends-view.js';

const LEGACY_ANALYTICS_WORKSPACE_IDS = Object.freeze([
  'monthly-decision-pack-panel',
  'product-analytics-panel',
  'subscription-analytics-panel',
]);

export function captureLegacyAnalyticsWorkspaces(root) {
  if (!root || typeof root.querySelector !== 'function') return [];
  return LEGACY_ANALYTICS_WORKSPACE_IDS.map((id) => ({
    id,
    node: root.querySelector(`#${id}`),
  })).filter((entry) => entry.node);
}

export function restoreLegacyAnalyticsWorkspaces(root, workspaces) {
  if (!root || typeof root.querySelector !== 'function' || !Array.isArray(workspaces)) return 0;
  let restored = 0;
  for (const workspace of workspaces) {
    if (!LEGACY_ANALYTICS_WORKSPACE_IDS.includes(workspace?.id) || !workspace?.node) continue;
    const placeholder = root.querySelector(`#${workspace.id}`);
    if (!placeholder || placeholder === workspace.node) continue;
    if (typeof placeholder.replaceWith === 'function') placeholder.replaceWith(workspace.node);
    else if (placeholder.parentNode?.replaceChild) placeholder.parentNode.replaceChild(workspace.node, placeholder);
    else continue;
    restored += 1;
  }
  return restored;
}

export async function settleIndependentAnalyticsRefreshes(snapshotOperation, trendOperation) {
  return Promise.allSettled([
    Promise.resolve().then(snapshotOperation),
    Promise.resolve().then(trendOperation),
  ]);
}

export function classifyAnalyticsRefreshResults(results, staleResult, authChanged = false) {
  if (authChanged || results.some((result) => (
    result.status === 'fulfilled' && result.value === staleResult
  ))) return 'stale';
  const failures = results.filter((result) => result.status === 'rejected').length;
  if (failures === 0) return 'success';
  if (failures === results.length) return 'failed';
  return 'partial';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

const language = window.AdminAnalyticsLanguage;

const ANALYTICS_REPORTS = Object.freeze([
  { id: 'overview', label: 'Сегодня', description: 'Что показывает: текущие сигналы оплаты и источники. Решение: есть ли проблема, требующая действия сегодня.' },
  { id: 'product', label: 'Рост', description: 'Что показывает: активацию и возвращаемость. Решение: где проверить путь пользователя и удержание.' },
  { id: 'subscriptions', label: 'Деньги', description: 'Что показывает: подтверждённые подписки и возвраты. Решение: нужно ли разбирать выручку или возвраты.' },
  { id: 'exports', label: 'Обучение', description: 'Что показывает: качество данных обучения и покрытие. Решение: достаточно ли данных для продуктового вывода.' },
]);

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

function sourceCompleteness(source) {
  if (source?.state === 'error' || source?.state === 'unavailable') return 'Неизвестно';
  if (source?.truncated === true) return 'Достигнут лимит';
  if (source?.truncated === false) return 'Лимит не достигнут';
  return 'Неизвестно';
}

function metric(label, value, note, available = true) {
  return `<article class="metric analytics-metric"><label>${escapeHtml(label)}</label><strong>${escapeHtml(number(value, available))}</strong><small>${escapeHtml(note)}</small></article>`;
}

function skeletonMetrics() {
  return `<div class="analytics-summary-grid analytics-skeleton" aria-hidden="true">${Array.from({ length: 4 }, () => '<div class="metric analytics-metric"><span></span><strong></strong><small></small></div>').join('')}</div>`;
}

function reportOption(report, activeReport) {
  return `<option value="${escapeHtml(report.id)}"${report.id === activeReport ? ' selected' : ''}>${escapeHtml(report.label)}</option>`;
}

function compactSnapshotMetrics(snapshot) {
  const access = snapshot?.access || {};
  const store = snapshot?.storeActivity || {};
  const funnel = snapshot?.funnelSignals || {};
  const events = funnel.events || {};
  return `<section class="analytics-canonical-strip" aria-label="Ключевые показатели выбранного периода">
    ${metric('Активные доступы', access.activeAccessTotal, 'Текущий Plus-доступ по всем категориям', sourceAvailable(snapshot, 'users'))}
    ${metric('Покупки RevenueCat', store.newPurchases, 'Начало подписки и разовые покупки за период', sourceAvailable(snapshot, 'revenuecat_premium_events'))}
    ${metric('Продления', store.renewals, 'Подтверждено RevenueCat за период', sourceAvailable(snapshot, 'revenuecat_premium_events'))}
    ${metric('Показы paywall', events.shown, 'Поведенческие события приложения', sourceAvailable(snapshot, 'paywall_funnel'))}
  </section>`;
}

function snapshotSummaryPanel(snapshot) {
  if (!snapshot) return skeletonMetrics();
  return `<section id="analytics-snapshot" class="analytics-report-panel" aria-labelledby="analytics-snapshot-title">
    <div class="section-heading"><div><h2 id="analytics-snapshot-title">Снимок периода</h2><p>Только самые важные числа сверху. Подробные разрезы лежат в выбранных отчётах ниже.</p></div></div>
    ${compactSnapshotMetrics(snapshot)}
  </section>`;
}

function reportShell(id, activeReport, title, description, body) {
  return `<section id="${escapeHtml(id)}" class="analytics-report-panel" data-analytics-report-panel="${escapeHtml(id)}"${id === activeReport ? '' : ' hidden'} aria-labelledby="analytics-report-${escapeHtml(id)}-title">
    <div class="section-heading"><div><h2 id="analytics-report-${escapeHtml(id)}-title">${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div></div>
    ${body}
  </section>`;
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
      ${metric('Начало подписки', store.initialSubscriptionEvents, 'События INITIAL_PURCHASE; включают старт пробного периода', premiumAvailable)}
      ${metric('Разовые покупки', store.nonRenewingPurchaseEvents, 'События NON_RENEWING_PURCHASE', premiumAvailable)}
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
      <article class="metric analytics-metric"><label>Сигналы завершения на 100 показов</label><strong>${escapeHtml(percent(funnel.purchaseSignalRate, available))}</strong><small>Не конверсия пользователей и не подтверждённые покупки: отношение событий приложения к показам paywall</small></article>
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
      return `<section class="card section" aria-labelledby="analytics-source-title"><div class="card-header"><div><h2 id="analytics-source-title">Качество источников</h2><p>Полнота и свежесть проверяются отдельно. Усечённый источник нельзя считать точным.</p></div></div><div class="card-body"><div class="analytics-source-grid">${rows.map(([key, source]) => `<article><div><strong>${escapeHtml(labels[key] || 'Неизвестный источник данных')}</strong><span class="badge ${sourceTone(source?.state)}">${escapeHtml(sourceLabel(source?.state))}</span></div>${labels[key] ? '' : `<small class="muted">Технический ключ: <code>${escapeHtml(key)}</code></small>`}<dl><dt>Строк</dt><dd>${escapeHtml(number(source?.count))}</dd><dt>Данные до</dt><dd>${escapeHtml(dateTime(source?.latestAtMs))}</dd><dt>Полнота</dt><dd>${escapeHtml(sourceCompleteness(source))}</dd>${source?.errorCode ? `<dt>Код ошибки</dt><dd><code>${escapeHtml(source.errorCode)}</code></dd>` : ''}</dl></article>`).join('')}</div></div></section>`;
}

function integritySection(snapshot, trends) {
  const events = snapshot?.funnelSignals?.events || {};
  const ids = ['paywall.shown.v1', 'paywall.cta_click.v1', 'paywall.trial_started.v1', 'paywall.purchase_completed.v1'];
  const sections = trends?.data?.sections || {};
  const allSeries = [
    ...(Array.isArray(sections.behavioralPaywall?.series) ? sections.behavioralPaywall.series : []),
  ];
  const totals = ids.map((id) => {
    const series = allSeries.find((item) => String(item?.metricId || '') === id);
    if (!series || ['error', 'partial', 'unavailable'].includes(String(series.status || ''))) return null;
    const values = (Array.isArray(series.points) ? series.points : []).map((point) => Number(point?.value));
    return values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) : null;
  });
  const aggregateTotal = ['shown', 'ctaClick', 'trialStarted', 'purchaseCompleted']
    .reduce((sum, key) => sum + (Number(events[key]) || 0), 0);
  const seriesTotal = totals.some((value) => value === null) ? null : totals.reduce((sum, value) => sum + value, 0);
  const request = trends?.data?.request || trends?.request || {};
  const filters = request.filters && typeof request.filters === 'object' ? request.filters : {};
  const compatibleWindow = request.scope === 'paywall'
    && Number(request.presetDays) === Number(snapshot?.rangeDays)
    && Object.keys(filters).length === 0;
  const sourceFailed = !compatibleWindow || ['error', 'partial', 'unavailable'].includes(String(snapshot?.sources?.paywall_funnel?.state || 'unavailable'));
  const blocked = !sourceFailed && seriesTotal !== null && aggregateTotal !== seriesTotal;
  const status = sourceFailed || seriesTotal === null ? 'unavailable' : blocked ? 'blocked' : 'ready';
  const copy = status === 'ready'
    ? ['Данные согласованы', 'Сумма дневных значений совпадает со сводкой. Поведенческий paywall-фаннел можно использовать как сигнал, но не как подтверждение денег.']
    : status === 'blocked'
      ? ['Нельзя принимать решение по paywall', 'Сводка и дневной ряд расходятся. Не выбирайте вариант paywall и не считайте конверсию, пока источник не будет сверён.']
      : ['Paywall-фаннел недоступен для решения', compatibleWindow ? 'Нет полного ряда или источник завершился ошибкой. Отсутствие данных не означает нулевую конверсию.' : 'Сводка и график относятся к разным периодам или фильтрам. Не сравнивайте их до загрузки одного и того же среза.'];
  const tone = status === 'ready' ? 'success' : status === 'blocked' ? 'danger' : 'warning';
  return `<section class="card section" aria-labelledby="analytics-integrity-title"><div class="card-header"><div><h2 id="analytics-integrity-title">Проверка пригодности данных</h2><p>Сверка итоговой воронки и дневного ряда перед продуктовым решением.</p></div><span class="badge ${tone}">${escapeHtml(copy[0])}</span></div><div class="card-body"><p>${escapeHtml(copy[1])}</p><dl class="analytics-integrity-values"><dt>Сумма сводки</dt><dd>${escapeHtml(number(aggregateTotal))}</dd><dt>Сумма дневного ряда</dt><dd>${seriesTotal === null ? '—' : escapeHtml(number(seriesTotal))}</dd></dl></div></section>`;
}

function purchaseReconciliationSection(snapshot) {
  const reconciliation = snapshot?.purchaseSignalReconciliation || {};
  const unavailable = reconciliation.status === 'unavailable';
  const clientSignals = reconciliation.clientPurchaseSignals ?? snapshot?.funnelSignals?.events?.purchaseCompleted;
  const confirmedPurchases = reconciliation.confirmedPurchaseEvents ?? snapshot?.storeActivity?.newPurchases;
  const title = unavailable ? 'Сверка покупок недоступна' : 'Не сравнивать как конверсию';
  const description = unavailable
    ? 'Один из источников неполный или недоступен. Отсутствие данных не означает нулевые покупки.'
    : 'Сигналы приложения собираются только при согласии на аналитику, а RevenueCat подтверждает покупки магазина. У источников разное покрытие и нет связки по конкретному человеку.';
  return `<section class="card section" aria-labelledby="analytics-purchase-reconciliation-title"><div class="card-header"><div><h2 id="analytics-purchase-reconciliation-title">Сверка сигналов покупки</h2><p>Контроль доставки событий, а не атрибуция оплаты или выручки.</p></div><span class="badge ${unavailable ? 'warning' : 'neutral'}">${escapeHtml(title)}</span></div><div class="card-body"><div class="analytics-summary-grid">${metric('Сигналы покупки в приложении', clientSignals, 'Не уникальные пользователи; только consent-based события', !unavailable)}${metric('Подтверждённые покупки RevenueCat', confirmedPurchases, 'Production events покупки за выбранный период', !unavailable)}</div><p class="muted">${escapeHtml(description)}</p></div></section>`;
}

function renderConsentCoverageOnly(snapshot) {
  const consent = snapshot?.analyticsConsent || {};
  const observedUsers = Number(consent.observedUsers);
  const grantedRate = Number(consent.grantedRate);
  const available = Number.isFinite(observedUsers) && observedUsers > 0;
  return `<section class="card section" aria-labelledby="analytics-consent-coverage-title"><div class="card-header"><div><h2 id="analytics-consent-coverage-title">Покрытие согласия на аналитику</h2><p>Поведенческие отчёты включают только людей, давших явное согласие. Эта карточка не измеряет установки и не раскрывает пользователей.</p></div></div><div class="card-body"><div class="analytics-summary-grid"><article class="metric analytics-metric"><label>Доля согласившихся на аналитику</label><strong>${escapeHtml(percent(grantedRate, available))}</strong><small>От наблюдаемых пользовательских записей</small></article>${metric('Согласились', consent.granted, 'Можно включать в consent-based продуктовые отчёты', available)}${metric('Отказались', consent.denied, 'Не попадают в поведенческую продуктовую аналитику', available)}${metric('Ещё не выбрали', consent.unset, 'До выбора считаются без согласия', available)}</div><p class="muted">Проверено записей: ${escapeHtml(number(consent.observedUsers, available))}. Скрытых из агрегата: ${escapeHtml(number(consent.hiddenUsersExcluded, available))}.</p></div></section>`;
}

function consentCoverageSection(snapshot) {
  return `${purchaseReconciliationSection(snapshot)}${renderConsentCoverageOnly(snapshot)}`;
}

export function renderAdminAnalytics(model) {
  globalThis.AdminV2RenderAnalyticsPlanAction = typeof model.renderPlanAction === 'function' ? model.renderPlanAction : undefined;
  globalThis.AdminV2HydrateAnalyticsPlanAction = typeof model.hydratePlanAction === 'function' ? model.hydratePlanAction : undefined;
  const rangeDays = Number(model.rangeDays || model.snapshot?.rangeDays || 28);
  const loading = model.status === 'loading';
  const controlsDisabled = Boolean(model.controlsDisabled || !model.authorized || model.busy || loading);
  const snapshot = model.snapshot;
  const activeReport = ANALYTICS_REPORTS.some((report) => report.id === model.activeReport) ? model.activeReport : 'overview';
  const activeReportMeta = ANALYTICS_REPORTS.find((report) => report.id === activeReport) || ANALYTICS_REPORTS[0];
  const paywallCategory = renderPaywallAnalyticsCategory({
    ...(model.analyticsTrends || {}),
    authorized: model.authorized,
    controlsDisabled: model.controlsDisabled,
    busy: model.busy,
    draft: model.analyticsTrendsDraft,
    onToggleSeries: model.onToggleAnalyticsSeries,
  });
  return `<header class="page-header analytics-canonical-header"><div><div class="eyebrow">Деньги / Аналитика</div><h1>Аналитика</h1><p>Четыре отчёта для ежедневного решения; источник и свежесть данных показаны рядом с результатом.</p></div><div class="analytics-toolbar"><label for="analytics-report-select">Отчёт</label><select id="analytics-report-select" data-action="select-analytics-report"${controlsDisabled ? ' disabled' : ''}>${ANALYTICS_REPORTS.map((report) => reportOption(report, activeReport)).join('')}</select><label for="analytics-range">Период</label><select id="analytics-range"${controlsDisabled ? ' disabled' : ''}><option value="7"${rangeDays === 7 ? ' selected' : ''}>7 дней</option><option value="28"${rangeDays === 28 ? ' selected' : ''}>28 дней</option><option value="90"${rangeDays === 90 ? ' selected' : ''}>90 дней</option></select><button class="button primary" data-action="load-analytics" type="button" title="Обновить серверный снимок аналитики, сохраняя последний подтверждённый результат на экране"${controlsDisabled ? ' disabled' : ''}>${loading ? 'Обновление…' : 'Обновить'}</button></div></header>
    <section class="analytics-report-switcher" aria-label="Выбранный аналитический отчёт"><div><strong>${escapeHtml(activeReportMeta.label)}</strong><small>${escapeHtml(activeReportMeta.description)}</small></div><div class="analytics-report-tabs" role="tablist" aria-label="Типы аналитики">${ANALYTICS_REPORTS.map((report) => `<button class="button small ${report.id === activeReport ? 'primary' : 'ghost'}" data-action="select-analytics-report" data-analytics-report="${escapeHtml(report.id)}" type="button" role="tab" aria-selected="${report.id === activeReport ? 'true' : 'false'}" title="Показать отчёт: ${escapeHtml(report.label)}">${escapeHtml(report.label)}</button>`).join('')}</div></section>
    <div class="analytics-status" aria-live="polite">${stateNotice(model)}${snapshot ? `<small>Снимок: ${escapeHtml(dateTime(snapshot.generatedAtMs))} · период ${escapeHtml(snapshot.rangeDays)} дней · ${escapeHtml(snapshot.definitionVersion || '')}</small>` : ''}</div>
    ${snapshotSummaryPanel(snapshot)}
    ${reportShell('overview', activeReport, 'Сегодня', 'Что показывает: текущие сигналы оплаты и источники. Какое решение принять: есть ли проблема, требующая действия сегодня.', paywallCategory)}
    ${reportShell('product', activeReport, 'Рост', 'Что показывает: активацию, возвращаемость и продуктовые изменения. Какое решение принять: что улучшать в следующем цикле.', '<div class="analytics-empty">Ниже откроется существующий продуктовый отчёт. Остальные тяжёлые разделы скрыты.</div>')}
    ${reportShell('subscriptions', activeReport, 'Деньги', 'Что показывает: подписки и денежные разрезы RevenueCat. Какое решение принять: где требуется действие по выручке или возвратам.', '<div class="analytics-empty">Ниже откроется существующий отчёт подписок. Остальные тяжёлые разделы скрыты.</div>')}
    ${reportShell('exports', activeReport, 'Обучение', 'Что показывает: полноту и качество данных для отчёта об обучении. Какое решение принять: можно ли доверять данным перед продуктовым решением.', `${integritySection(snapshot || {}, model.analyticsTrends || {})}${consentCoverageSection(snapshot || {})}${sourceSection(snapshot || {})}`)}`;
}
