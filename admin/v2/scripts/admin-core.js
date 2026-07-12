import { capabilitiesForRoute, capabilityById, capabilityUrl } from './admin-capabilities.js';
import { renderAdminAnalytics } from './admin-analytics-view.js';
import { buildOperationalSnapshot } from './admin-operational-snapshot.js';

const ICONS = {
  overview: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/></svg>',
  application: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v3m0 12v3M3 12h3m12 0h3m-3.4-6.6-2.1 2.1m-7 7-2.1 2.1m0-11.2 2.1 2.1m7 7 2.1 2.1"/><circle cx="12" cy="12" r="4"/></svg>',
  users: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c.5-3.3 2.4-5 6-5s5.5 1.7 6 5m3-8v6m-3-3h6"/></svg>',
  money: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>',
  content: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 5.5V21m4-14h8m-8 4h8"/></svg>',
  community: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-11.7 6.2L4 19l1.3-3.5A7.5 7.5 0 1 1 20 11.5Z"/></svg>',
  diagnostics: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
  empty: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8m-8 4h5"/></svg>',
};

export const ADMIN_SECTIONS = Object.freeze([
  { route: 'overview', label: 'Обзор', title: 'Ежедневный обзор' },
  { route: 'application', label: 'Приложение', title: 'Настройки приложения' },
  { route: 'users', label: 'Пользователи', title: 'Пользователи и поддержка' },
  { route: 'money', label: 'Деньги', title: 'Оплаты и подписки' },
  { route: 'content', label: 'Контент', title: 'Контент и языки' },
  { route: 'community', label: 'Комьюнити', title: 'Комьюнити и модерация' },
  { route: 'diagnostics', label: 'Диагностика', title: 'Состояние и аудит' },
]);

const PAGES = Object.freeze({
  overview: { title: 'Обзор', description: 'Сигналы, требующие решения сегодня, и последние управленческие действия.' },
  'control-panel': { title: 'Пульт управления', description: 'Главные рычаги старой админки, сгруппированные по безопасным рабочим процессам.' },
  application: { title: 'Приложение', description: 'Обновления, баннеры, технические работы и конфигурация приложения.' },
  users: { title: 'Пользователи', description: 'Единый поиск, профиль, обращения, покупки и история действий пользователя.' },
  money: { title: 'Деньги', description: 'Подписки, платежи, промокоды и подтверждённые показатели выручки.' },
  content: { title: 'Контент', description: 'Уроки, языковые пакеты и безопасная фабрика новых языков.' },
  community: { title: 'Комьюнити', description: 'Жалобы, пользовательский контент, чат и состояние Арены.' },
  diagnostics: { title: 'Диагностика', description: 'Состояние системы, ошибки, журнал действий и восстановление.' },
  support: { title: 'Почта поддержки', description: 'Входящие письма людей и системные сообщения с явной категорией, без скрытой потери.' },
  analytics: { title: 'Аналитика', description: 'Серверные показатели с отдельным состоянием каждого источника.' },
  'daily-briefing': { title: 'Product Manager Digest', description: 'Утренний управленческий отчёт: рост, деньги, риски, очереди и действия на сегодня.' },
  'report-center': { title: 'Центр репортов', description: 'Единая ограниченная очередь ошибок, жалоб и контентных репортов без смешивания исходных статусов.' },
  'asset-studio': { title: 'DALL-E Asset Studio', description: 'Генерация изображений и ассетов через безопасный серверный workflow Generate → Review → Publish.' },
});

const ADMIN_ROLE_PERMISSIONS = Object.freeze({
  owner: new Set(['users.read', 'money.read', 'content.read', 'content.draft.write', 'content.publish', 'application.config.write', 'briefing.read', 'briefing.generate', 'reports.read', 'reports.status.write', 'reports.reply.draft', 'reports.reply.send', 'diagnostics.read', 'diagnostics.status.write']),
  admin: new Set(['users.read', 'money.read', 'content.read', 'content.draft.write', 'content.publish', 'application.config.write', 'briefing.read', 'briefing.generate', 'reports.read', 'reports.status.write', 'reports.reply.draft', 'reports.reply.send', 'diagnostics.read', 'diagnostics.status.write']),
  content_editor: new Set(['content.read', 'content.draft.write']),
  analyst: new Set(['users.read', 'money.read', 'content.read', 'briefing.read', 'reports.read', 'diagnostics.read']),
  developer: new Set(['content.read', 'briefing.read', 'diagnostics.read', 'diagnostics.status.write']),
  support: new Set(['users.read', 'reports.read', 'reports.status.write', 'reports.reply.draft', 'reports.reply.send', 'diagnostics.read']),
  moderator: new Set(['users.read', 'reports.read', 'reports.status.write']),
});

const FACTORY_STEPS = Object.freeze([
  { id: 1, title: 'Язык и объём', subtitle: 'Направление и уроки' },
  { id: 2, title: 'Генерация', subtitle: 'Задания и превью' },
  { id: 3, title: 'Проверка', subtitle: 'Качество и источники' },
  { id: 4, title: 'Публикация', subtitle: 'Активация и откат' },
]);

const SURFACE_LABELS = Object.freeze({
  lesson: 'Урок, словарь и упражнения',
  quiz: 'Квиз',
  flashcard: 'Карточки',
  arena: 'Арена',
});

const state = {
  route: 'overview',
  authorized: false,
  authReady: false,
  adminEmail: '',
  adminRole: '',
  authGeneration: 0,
  busy: false,
  message: '',
  messageKind: 'info',
  factoryStep: 1,
  jobs: [],
  jobsLoaded: false,
  selectedJobId: '',
  detail: null,
  preview: null,
  workspace: null,
  generation: null,
  support: { loaded: false, items: [], signature: '', signatureRevision: 0, filter: 'new', pendingReply: null },
  analytics: { status: 'idle', snapshot: null, error: '' },
  budget: null,
  selectedCapabilityId: '',
  remoteConfig: null,
  remoteConfigPreview: null,
  users: { query: '', searched: false, items: [], profile: null, profileLoading: false, searchState: 'idle', searchErrors: [] },
  briefing: { state: 'idle', digest: null, fetchedAtMs: 0, error: '', generationOutcome: '' },
  reports: { state: 'idle', items: [], sourceHealth: [], source: 'all', lane: '', rawStatus: '', uid: '', category: '', sinceDays: 7, nextCursor: '', error: '', replyDrafts: {} },
  audit: { state: 'idle', items: [], action: '', query: '', sinceDays: 7, nextCursor: '', fetchedAtMs: 0, error: '' },
  ops: { state: 'idle', items: [], sourceHealth: [], kpis: null, source: '', type: '', query: '', copyText: '', fetchedAtMs: 0, error: '' },
  assetStudio: { state: 'idle', items: [], selectedJobId: '', error: '' },
};

let actions = null;
let initialized = false;
const STALE_AUTH_RESULT = Symbol('stale-auth-result');

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function id(prefix) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}-${random}`.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 160);
}

function errorMessage(error) {
  const message = error instanceof Error ? error.message : String(error ?? 'Неизвестная ошибка');
  return message.replace(/^FirebaseError:\s*/i, '').replace(/^functions\//i, '');
}

function setMessage(message, kind = 'info') {
  state.message = message;
  state.messageKind = kind;
  const banner = document.getElementById('global-message');
  if (!banner) return;
  banner.hidden = !message;
  banner.textContent = message;
  banner.className = `global-message ${kind}`;
}

function statusLabel(value) {
  return ({
    queued: 'В очереди', leased: 'Выполняется', generated: 'Сохранено в контрольной точке', succeeded: 'Готово', failed: 'Ошибка',
    needs_review: 'Нужна проверка', approved: 'Одобрено', partial: 'Частично готово', rejected: 'Отклонено',
  })[String(value)] ?? String(value || 'Неизвестно');
}

function badgeClass(value) {
  if (['succeeded', 'approved', 'ready', 'active'].includes(String(value))) return 'success';
  if (['failed', 'rejected', 'error'].includes(String(value))) return 'danger';
  if (['queued', 'generated', 'needs_review', 'partial', 'stale'].includes(String(value))) return 'warning';
  return '';
}

function pageHeader(page, eyebrow, actionHtml = '') {
  return `<header class="page-header"><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.description)}</p></div>${actionHtml ? `<div class="actions">${actionHtml}</div>` : ''}</header>`;
}

function emptyState(message) {
  return `<div class="empty-state">${ICONS.empty}<div>${escapeHtml(message)}</div></div>`;
}

function renderCapabilityHub(route) {
  const capabilities = capabilitiesForRoute(route);
  if (!capabilities.length) return '';
  return `<section class="card section capability-hub"><div class="card-header"><div><h2>Все рабочие инструменты раздела</h2><p>${capabilities.length} ${capabilities.length === 1 ? 'модуль' : capabilities.length < 5 ? 'модуля' : 'модулей'} из действующей админки, сгруппированные без потери функций.</p></div><span class="badge">Полный реестр</span></div><div class="capability-grid">${capabilities.map((capability) => `<button class="capability-item" type="button" data-capability-id="${escapeHtml(capability.id)}" title="Открыть ${escapeHtml(capability.label)}"><span><strong>${escapeHtml(capability.label)}</strong><small>${escapeHtml(capability.description)}</small></span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>`).join('')}</div></section>`;
}

function renderCapabilityWorkspace(capability) {
  const url = capabilityUrl(capability);
  return `${pageHeader(PAGES[capability.route] ?? PAGES.overview, capability.label, `<button class="button" data-action="close-capability" type="button" title="Вернуться к разделу">К списку инструментов</button><a class="button primary" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="Открыть модуль в отдельной вкладке">Открыть отдельно</a>`)}
    <div class="notice">Это действующий рабочий модуль текущей админки внутри нового семираздельного пульта. Все его кнопки и обработчики сохранены; опасные операции продолжают использовать собственные подтверждения и серверные проверки.</div>
    <section class="legacy-workspace section"><div class="legacy-workspace-bar"><div><strong>${escapeHtml(capability.label)}</strong><small>${escapeHtml(capability.description)}</small></div><span class="badge">Рабочий модуль</span></div><iframe id="legacy-module-frame" title="${escapeHtml(capability.label)}" src="${escapeHtml(url)}" loading="eager" referrerpolicy="same-origin"></iframe></section>`;
}

function can(permission) {
  return state.authorized && (ADMIN_ROLE_PERMISSIONS[state.adminRole]?.has(permission) ?? false);
}

function disabledWhenUnauthorized(permission = '') {
  return state.authorized && !state.busy && (!permission || can(permission)) ? '' : ' disabled';
}

function authStillValid(authGeneration, permission) {
  return authGeneration === state.authGeneration && can(permission);
}

function renderNavigation() {
  const nav = document.getElementById('primary-nav');
  if (!nav) return;
  nav.innerHTML = ADMIN_SECTIONS.map((section) => `<button class="nav-button" type="button" data-route="${section.route}" aria-current="${state.route === section.route ? 'page' : 'false'}" title="${escapeHtml(section.title)}">${ICONS[section.route]}<span>${escapeHtml(section.label)}</span></button>`).join('');
  const current = ADMIN_SECTIONS.find((section) => section.route === state.route);
  const page = PAGES[state.route] ?? PAGES.overview;
  const breadcrumbs = document.getElementById('breadcrumbs');
  if (breadcrumbs) breadcrumbs.innerHTML = current ? `Админка&nbsp;&nbsp;/&nbsp;&nbsp;<strong>${escapeHtml(current.label)}</strong>` : `Админка&nbsp;&nbsp;/&nbsp;&nbsp;<strong>${escapeHtml(page.title)}</strong>`;
}

function renderAuthStatus() {
  const target = document.getElementById('auth-status');
  if (!target) return;
  if (!state.authReady) {
    target.textContent = 'Проверка доступа…';
  } else if (!state.authorized && state.adminEmail) {
    target.innerHTML = `${escapeHtml(state.adminEmail)} · доступ запрещён · <button class="button small" data-action="sign-out" type="button" title="Выйти">Выйти</button>`;
  } else if (!state.authorized) {
    target.innerHTML = '<button class="button small" data-action="sign-in" type="button" title="Войти через Google">Войти</button>';
  } else {
    target.innerHTML = `${escapeHtml(state.adminEmail || 'Администратор')} · ${escapeHtml(state.adminRole)} · <button class="button small" data-action="sign-out" type="button" title="Выйти">Выйти</button>`;
  }
}

function operationalMetric(label, value, badge, badgeKind = '') {
  return `<article class="card metric"><label>${escapeHtml(label)}</label><strong>${escapeHtml(value)}</strong><span class="badge ${badgeKind}">${escapeHtml(badge)}</span></article>`;
}

function metricValue(value) {
  if (value == null || value === '') return '—';
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU') : '—';
}

function renderOverviewOperationalState(view) {
  const noDataMetrics = [
    operationalMetric('Критические сигналы', '—', view.stateLabel),
    operationalMetric('Новые подачи паков · 24 ч', '—', view.stateLabel),
    operationalMetric('Открытые репорты и события очередей · 24 ч', '—', view.stateLabel),
    operationalMetric('Снимок обновлён', '—', view.stateLabel),
  ];
  const metrics = view.hasData ? [
    operationalMetric('Критические сигналы', metricValue(view.metrics.criticalSignals), 'ошибки + безопасность', view.metrics.criticalSignals ? 'danger' : ''),
    operationalMetric('Новые подачи паков · 24 ч', metricValue(view.metrics.packSubmissions24h), 'community_pack_submissions', view.metrics.packSubmissions24h ? 'warning' : ''),
    operationalMetric('Открытые репорты и события очередей · 24 ч', metricValue(view.metrics.queueSignals24h), 'репорты + рабочие очереди', view.metrics.queueSignals24h ? 'warning' : ''),
    operationalMetric('Снимок обновлён', dateTime(view.generatedAtMs), view.stateLabel, badgeClass(view.state)),
  ] : noDataMetrics;
  let notice = '';
  if (view.state === 'loading') notice = '<div class="notice" role="status" aria-live="polite">Загружаю последний сохранённый оперативный снимок…</div>';
  if (view.state === 'empty' || view.state === 'idle') notice = '<div class="notice warning">Сохранённый снимок ещё не загружен. Нули не показываются, пока источники не подтверждены.</div>';
  if (view.state === 'error') notice = `<div class="notice danger" role="alert"><strong>Оперативный снимок не прочитан.</strong><br>${escapeHtml(view.error || 'Сервер не вернул данные.')}<div class="actions section"><button class="button" data-action="load-daily-briefing" type="button"${disabledWhenUnauthorized('briefing.read')} title="Повторно прочитать последний сохранённый снимок">Повторить чтение</button></div></div>`;
  if (view.state === 'stale') notice += '<div class="notice warning"><strong>Снимок старше 36 часов.</strong> Значения показаны для контекста, но не подходят для свежего управленческого решения.</div>';
  if (view.state === 'legacy') notice += '<div class="notice warning"><strong>Старый формат снимка.</strong> Часть современных проверок полноты могла не выполняться; неизвестные показатели показаны как —.</div>';
  if (view.isPartial) notice += '<div class="notice warning"><strong>Данные частичные.</strong> Один или несколько источников достигли лимита; это не считается подтверждением спокойного состояния.</div>';
  return `${notice}<section class="metrics section">${metrics.join('')}</section>`;
}

function renderOverviewDecisions(view) {
  if (!view.hasData) return emptyState(view.state === 'loading' ? 'Ожидаю сохранённый снимок.' : 'Нет подтверждённых данных для списка решений.');
  const rows = [];
  if (view.metrics.criticalSignals > 0) rows.push(['Критические сигналы', `${view.metrics.criticalSignals} сигналов ошибок и безопасности за окно снимка`, '#diagnostics', 'Открыть диагностику', 'danger']);
  if (view.metrics.queueSignals24h > 0) rows.push(['Репорты и очереди за 24 часа', `${view.metrics.queueSignals24h} новых открытых репортов и событий очередей за окно снимка`, '#report-center', 'Открыть центр репортов', 'warning']);
  if (view.metrics.packSubmissions24h > 0) rows.push(['Новые подачи паков', `${view.metrics.packSubmissions24h} подач за последние 24 часа; статус каждой проверьте в комьюнити`, '#community', 'Открыть комьюнити', 'warning']);
  if (view.metrics.sourceErrors > 0) rows.push(['Источники данных', `${view.metrics.sourceErrors} источников не прочитано`, '#diagnostics', 'Проверить источники', 'danger']);
  if (view.metrics.sourceTruncated > 0) rows.push(['Ограниченные выборки', `${view.metrics.sourceTruncated} источников вернули неполную выборку`, '#diagnostics', 'Проверить полноту', 'warning']);
  if (view.hasUnknownMetrics) rows.push(['Неизвестные показатели', 'Часть полей отсутствует в сохранённом снимке, поэтому админка не подставляет нули.', '#diagnostics', 'Проверить источники', 'warning']);
  if (!rows.length) return emptyState(view.state === 'ready' ? 'По подтверждённому снимку отслеживаемых приоритетов нет.' : 'Подтверждённых приоритетов нет, но снимок неполный или устарел.');
  return `<div class="data-list">${rows.map(([title, detail, href, action, kind]) => `<div class="list-row"><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div><a class="button small ${kind === 'danger' ? '' : 'ghost'}" href="${href}" title="${escapeHtml(action)}">${escapeHtml(action)}</a></div>`).join('')}</div>`;
}

const CONTROL_PANEL_WORKFLOWS = Object.freeze([
  { title: 'Обновления и обслуживание', description: 'Manual update modal, force update, store links, rollout и maintenance text.', primary: '#application', primaryLabel: 'Открыть v2 приложение', fallback: 'control-panel', risk: 'Высокий риск', coverage: '5 старых кнопок', guarded: true },
  { title: 'Remote Config и живые флаги', description: 'Промокоды, лига по XP, lifetime, идеи, arena bots, onboarding, paywall timers, video button и intro gift.', primary: '#application', primaryLabel: 'Открыть v2 конфигурацию', fallback: 'remote-config', risk: 'Guarded publish', coverage: '8 переключателей', guarded: true },
  { title: 'Промокоды и промо-баннер', description: 'Создание кода, список кодов, quick-link в большой раздел и баннер кампании.', primary: '#promo-codes', primaryLabel: 'Старый модуль промокодов', fallback: 'promo-codes', risk: 'Legacy write module', coverage: '5 старых кнопок', guarded: false },
  { title: 'Plus-доступ и уроки', description: 'Глобальные Plus-функции, free limits и поурочное открытие 1–32.', primary: '#premium', primaryLabel: 'Старый модуль Plus', fallback: 'control-panel', risk: 'Legacy write module', coverage: '5 старых кнопок', guarded: false },
  { title: 'Недельные бонусы', description: 'Расписание бонусов, включение бонусов и дефолтный reset.', primary: '#remote-config', primaryLabel: 'Открыть v2 Remote Config', fallback: 'control-panel', risk: 'Content/economy', coverage: '3 старые кнопки', guarded: true },
  { title: 'ИИ и бюджеты', description: 'Theo model, daily caps, фоновые AI jobs, OpenAI budget и Asset Studio.', primary: '#asset-studio', primaryLabel: 'Открыть v2 Asset Studio', fallback: 'openai-budget', risk: 'AI budget', coverage: '5 старых кнопок', guarded: true },
  { title: 'Кампании и коммуникации', description: 'Paywall A/B, app messages, Telegram alerts и push-notify.', primary: '#app-messages', primaryLabel: 'Старый модуль сообщений', fallback: 'app-messages', risk: 'Legacy campaign module', coverage: '5 переходов', guarded: false },
]);

function renderControlPanel() {
  const headerActions = `<a class="button" href="#overview" title="Вернуться к ежедневному обзору">К обзору</a><a class="button primary" href="#application" title="Открыть основной v2 workflow для конфигурации приложения">Открыть v2 конфигурацию</a><a class="button ghost" href="../../admin/index.html#control-panel" target="_blank" rel="noopener" title="Открыть старый пульт только для аварийной сверки">Старый пульт</a>`;
  return `${pageHeader(PAGES['control-panel'], 'Обзор / Пульт', headerActions)}
    <div class="notice"><strong>Native v2 слой.</strong> Здесь собраны все группы старого control-panel. Опасные write-действия не копируются прямым onclick: они ведут в guarded workflow или в старый рабочий модуль до полноценного переноса конкретной формы.</div>
    <section class="card section"><div class="card-header"><div><h2>Карта старого пульта</h2><p>29 старых кнопок разложены по рабочим процессам, чтобы ничего не потерять и не смешивать рискованные действия.</p></div><span class="badge">control-panel</span></div>
      <div class="card-body"><div class="control-panel-workflows">${CONTROL_PANEL_WORKFLOWS.map((item) => `<article class="control-panel-workflow"><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p><div class="control-panel-tags"><span class="badge">${escapeHtml(item.coverage)}</span><span class="badge ${item.guarded ? 'success' : 'warning'}">${escapeHtml(item.risk)}</span></div></div><div class="actions"><a class="button ${item.guarded ? '' : 'ghost'} small" href="${escapeHtml(item.primary)}" title="${item.guarded ? 'Открыть основной v2 workflow' : 'Открыть legacy working module'}: ${escapeHtml(item.title)}">${escapeHtml(item.primaryLabel)}</a><a class="button ghost small" href="../../admin/index.html#${encodeURIComponent(item.fallback)}" target="_blank" rel="noopener" title="Открыть старый рабочий модуль отдельно. Его действия могут менять production.">Старый модуль отдельно</a></div></article>`).join('')}</div></div></section>
    <section class="card section"><div class="card-header"><div><h2>Правило переноса write-кнопок</h2><p>Каждая опасная кнопка переезжает отдельно: preview, reason, expected revision, audit log и rollback.</p></div></div><div class="card-body"><div class="control-panel-transfer-list"><span>Manual update / force update — следующий кандидат на native wizard.</span><span>Premium lesson locks — переносить после проверки клиентских ключей и paywall gates.</span><span>AI jobs — уже частично covered через budget diagnostics и Asset Studio; нужен отдельный config editor.</span></div></div></section>`;
}

function renderOverview() {
  const view = buildOperationalSnapshot(state.briefing);
  const headerActions = `<button class="button primary" data-action="load-daily-briefing" type="button"${disabledWhenUnauthorized('briefing.read')} title="Прочитать последний сохранённый снимок без запуска генерации">Обновить снимок</button><a class="button" href="#daily-briefing" title="Открыть подробный ежедневный брифинг">Подробный брифинг</a><a class="button" href="#diagnostics" title="Открыть диагностику источников">Диагностика</a>`;
  return `${pageHeader(PAGES.overview, 'Управление сегодня', headerActions)}
    ${renderOverviewOperationalState(view)}
    <div class="columns section"><section class="card"><div class="card-header"><div><h2>Требует решения</h2><p>Только подтверждённые сигналы с понятным следующим действием.</p></div></div><div class="card-body">${renderOverviewDecisions(view)}</div></section>
    <section class="card"><div class="card-header"><div><h2>Быстрые переходы</h2><p>Частые рабочие задачи.</p></div></div><div class="card-body actions"><a class="button" href="#daily-briefing">Брифинг</a><a class="button" href="#report-center">Репорты</a><a class="button" href="#support">Почта</a><a class="button" href="#content">Контент</a><a class="button" href="#analytics">Аналитика</a></div></section></div>`;
}

function remoteConfigBranch(branch) {
  const previewBranch = state.remoteConfigPreview?.nextConfig?.[branch];
  const configBranch = state.remoteConfig?.config?.[branch];
  const current = configBranch && typeof configBranch === 'object' ? configBranch : {};
  const hasPreviewBranch = previewBranch && typeof previewBranch === 'object';
  const shouldMergePreview = ['release-maintenance', 'partial-restore-remote-config'].includes(String(state.remoteConfigPreview?.source || ''));
  const value = hasPreviewBranch && shouldMergePreview ? { ...current, ...previewBranch } : hasPreviewBranch ? previewBranch : current;
  return JSON.stringify(value, null, 2);
}

function remoteConfigValue(branch, key, fallback = '') {
  const previewBranch = state.remoteConfigPreview?.nextConfig?.[branch];
  const configBranch = state.remoteConfig?.config?.[branch];
  const current = configBranch && typeof configBranch === 'object' ? configBranch : {};
  const source = previewBranch && typeof previewBranch === 'object' ? { ...current, ...previewBranch } : current;
  return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : fallback;
}

function selectedBool(value, expected) {
  return (value === true) === expected ? ' selected' : '';
}

function renderReleaseMaintenanceWorkflow() {
  const releasePreview = state.remoteConfigPreview?.source === 'release-maintenance' ? state.remoteConfigPreview : null;
  const releaseFormLocked = state.remoteConfigPreview?.source === 'partial-restore-remote-config';
  const releaseControlDisabled = releaseFormLocked || !can('application.config.write') || state.busy;
  const reason = releasePreview?.reason ?? '';
  const manualMode = String(remoteConfigValue('texts', 'manual_update_mode', 'optional')) === 'force' ? 'force' : 'optional';
  const manualPlatform = String(remoteConfigValue('texts', 'manual_update_platform', ''));
  const rollout = remoteConfigValue('numbers', 'force_update_enabled_rollout_pct', '');
  return `<section class="card section"><div class="card-header"><div><h2>Обновления и обслуживание</h2><p>Manual update, force update и maintenance через один безопасный preview → publish workflow.</p></div><span class="badge warning">Влияет на production</span></div><div class="card-body">
    <div class="notice warning"><strong>Это массовые настройки.</strong> Перед публикацией проверьте превью, target build, rollout и причину. Сервер проверит ревизию и запишет audit/rollback reference. Если поменять поля после предпросмотра, публикация остановится и попросит пересобрать preview.</div>
    <div class="fields">
      <div class="field"><label for="release-force-enabled">Force update включён</label><select id="release-force-enabled"${releaseFormLocked ? ' disabled' : ''}><option value="false"${selectedBool(remoteConfigValue('bools', 'force_update_enabled', false), false)}>Выключено</option><option value="true"${selectedBool(remoteConfigValue('bools', 'force_update_enabled', false), true)}>Включено</option></select></div>
      <div class="field"><label for="release-force-version">Минимальная версия</label><input id="release-force-version" value="${escapeHtml(remoteConfigValue('texts', 'min_app_version', ''))}" placeholder="например 1.5.44"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-force-rollout">Rollout force update, %</label><input id="release-force-rollout" type="number" min="0" max="100" value="${escapeHtml(rollout === '' ? '' : String(rollout))}" placeholder="100"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-store-ios">App Store URL</label><input id="release-store-ios" value="${escapeHtml(remoteConfigValue('texts', 'store_url_ios', ''))}" placeholder="https://apps.apple.com/app/id..."${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-store-android">Google Play URL</label><input id="release-store-android" value="${escapeHtml(remoteConfigValue('texts', 'store_url_android', ''))}" placeholder="https://play.google.com/store/apps/details?id=..."${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-manual-enabled">Manual update modal</label><select id="release-manual-enabled"${releaseFormLocked ? ' disabled' : ''}><option value="false"${selectedBool(remoteConfigValue('bools', 'manual_update_enabled', false), false)}>Выключено</option><option value="true"${selectedBool(remoteConfigValue('bools', 'manual_update_enabled', false), true)}>Включено</option></select></div>
      <div class="field"><label for="release-manual-mode">Режим modal</label><select id="release-manual-mode"${releaseFormLocked ? ' disabled' : ''}><option value="optional"${manualMode === 'optional' ? ' selected' : ''}>Voluntary: можно закрыть</option><option value="force"${manualMode === 'force' ? ' selected' : ''}>Force: держит окно</option></select></div>
      <div class="field"><label for="release-manual-platform">Платформа modal</label><select id="release-manual-platform"${releaseFormLocked ? ' disabled' : ''}><option value=""${manualPlatform ? '' : ' selected'}>iOS и Android</option><option value="ios"${manualPlatform === 'ios' ? ' selected' : ''}>Только iOS</option><option value="android"${manualPlatform === 'android' ? ' selected' : ''}>Только Android</option></select></div>
      <div class="field"><label for="release-manual-campaign">Campaign ID</label><input id="release-manual-campaign" value="${escapeHtml(remoteConfigValue('texts', 'manual_update_campaign_id', ''))}" placeholder="manual_update_2026_07_11_a"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-manual-target">Target build/version</label><input id="release-manual-target" value="${escapeHtml(remoteConfigValue('texts', 'manual_update_target_build', ''))}" placeholder="1.5.44 или 81"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field full"><label for="release-manual-title-ru">Заголовок RU</label><input id="release-manual-title-ru" value="${escapeHtml(remoteConfigValue('texts', 'manual_update_title_ru', ''))}" placeholder="Доступно обновление"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field full"><label for="release-manual-body-ru">Текст RU</label><textarea id="release-manual-body-ru" rows="2" placeholder="Мы улучшили приложение. Обновите его в сторе."${releaseFormLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigValue('texts', 'manual_update_body_ru', ''))}</textarea></div>
      <div class="field"><label for="release-manual-cta-ru">Кнопка RU</label><input id="release-manual-cta-ru" value="${escapeHtml(remoteConfigValue('texts', 'manual_update_cta_ru', ''))}" placeholder="Обновить"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-maint-banner">Maintenance banner</label><select id="release-maint-banner"${releaseFormLocked ? ' disabled' : ''}><option value="false"${selectedBool(remoteConfigValue('bools', 'maintenance_banner', false), false)}>Выключен</option><option value="true"${selectedBool(remoteConfigValue('bools', 'maintenance_banner', false), true)}>Включён</option></select></div>
      <div class="field"><label for="release-maint-block">Maintenance hard block</label><select id="release-maint-block"${releaseFormLocked ? ' disabled' : ''}><option value="false"${selectedBool(remoteConfigValue('bools', 'maintenance_block', false), false)}>Выключен</option><option value="true"${selectedBool(remoteConfigValue('bools', 'maintenance_block', false), true)}>Включён</option></select></div>
      <div class="field"><label for="release-maint-campaign">Maintenance campaign ID</label><input id="release-maint-campaign" value="${escapeHtml(remoteConfigValue('texts', 'maintenance_campaign_id', ''))}" placeholder="maintenance_2026_07_11_a"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field full"><label for="release-maint-text-ru">Maintenance text RU</label><textarea id="release-maint-text-ru" rows="2" placeholder="Идут технические работы. Скоро вернёмся."${releaseFormLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigValue('texts', 'maintenance_ru', ''))}</textarea></div>
      <div class="field full"><label for="release-maintenance-reason">Причина публикации</label><textarea id="release-maintenance-reason" maxlength="500" placeholder="Что изменится, кто увидит, как откатить"${releaseFormLocked ? ' disabled' : ''}>${escapeHtml(reason)}</textarea></div>
    </div>
    ${releaseFormLocked ? '<div class="notice warning section">Активен предпросмотр восстановления значений. Форма обновлений заблокирована, чтобы не изменить restored snapshot перед публикацией.</div>' : ''}
    ${releasePreview ? `<div class="notice ${releasePreview.changes?.length ? 'warning' : ''} section"><strong>${escapeHtml(releasePreview.title || 'Предпросмотр релиза и обслуживания')}</strong><br>${releasePreview.summary ? `${escapeHtml(releasePreview.summary)}<br>` : ''}${Array.isArray(releasePreview.details) && releasePreview.details.length ? `<div class="code-preview section">${releasePreview.details.map((line) => escapeHtml(line)).join('<br>')}</div>` : ''}${releasePreview.changes?.length ? releasePreview.changes.map((change) => escapeHtml(change)).join('<br>') : 'Изменений нет.'}</div>` : ''}
    <div class="actions end section">${releasePreview ? '<button class="button" data-action="discard-remote-config-preview" type="button">Изменить ещё</button>' : ''}<button class="button" data-action="preview-release-maintenance-stop" type="button"${releaseControlDisabled ? ' disabled' : ''} title="Подготовить audited preview для выключения force update, manual update и maintenance">Быстрый стоп</button><button class="button" data-action="preview-release-maintenance" type="button"${releaseControlDisabled ? ' disabled' : ''} title="Собрать безопасный предпросмотр только по ключам обновления и обслуживания">Предпросмотр релиза и обслуживания</button>${releasePreview?.changes?.length ? `<button class="button primary" data-action="publish-remote-config" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Опубликовать через серверную команду с ревизией, причиной и audit log">Опубликовать</button>` : ''}</div>
  </div></section>`;
}

function renderRemoteConfigHistory() {
  const history = Array.isArray(state.remoteConfig?.history) ? state.remoteConfig.history.slice(0, 12) : [];
  if (!history.length) return emptyState('История изменений пока пуста.');
  return `<div class="data-list">${history.map((item) => `<div class="list-row"><div><strong>${escapeHtml(item.action || 'Изменение конфигурации')}</strong><small>${escapeHtml(item.timestamp || item.at || '')} · ${escapeHtml(item.reason || item.by || 'Причина не указана')}</small>${item.rollbackReference ? `<small>Rollback reference: <code>${escapeHtml(item.rollbackReference)}</code></small>` : ''}</div><div class="actions"><span class="badge">ревизия ${Number(item.revision ?? 0)}</span>${item.before && typeof item.before === 'object' ? `<button class="button small" data-action="preview-remote-config-restore" data-rollback-reference="${escapeHtml(item.id || item.rollbackReference || '')}" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Подготовить предпросмотр восстановления значений из состояния до этой публикации. Новые ключи не удаляются.">Восстановить значения</button>` : ''}</div></div>`).join('')}</div>`;
}

function renderApplication() {
  const workspace = state.remoteConfig;
  const config = workspace?.config ?? {};
  const releasePreviewActive = state.remoteConfigPreview?.source === 'release-maintenance';
  const restorePreviewActive = state.remoteConfigPreview?.source === 'partial-restore-remote-config';
  const editorLocked = releasePreviewActive || restorePreviewActive;
  const preview = releasePreviewActive ? null : state.remoteConfigPreview;
  const keyCount = (branch) => Object.keys(config[branch] && typeof config[branch] === 'object' ? config[branch] : {}).length;
  const loadButton = `<button class="button" data-action="load-remote-config" type="button" title="Загрузить текущую конфигурацию и историю"${disabledWhenUnauthorized('application.config.write')}>${workspace ? 'Обновить данные' : 'Загрузить конфигурацию'}</button>`;
  return `${pageHeader(PAGES.application, 'Приложение', loadButton)}
    <div class="notice">Изменения проходят путь: загрузка текущей ревизии → предпросмотр → подтверждение причины → серверная публикация → журнал и восстановление значений из истории.</div>
    <section class="metrics section">
      <article class="card metric"><label>Ревизия</label><strong>${workspace ? Number(config.revision ?? 0) : '—'}</strong><span class="badge ${workspace ? 'success' : ''}">${workspace ? 'Серверное значение' : 'Не загружено'}</span></article>
      <article class="card metric"><label>Переключатели</label><strong>${workspace ? keyCount('bools') : '—'}</strong><span class="badge">ключей</span></article>
      <article class="card metric"><label>Числа</label><strong>${workspace ? keyCount('numbers') : '—'}</strong><span class="badge">ключей</span></article>
      <article class="card metric"><label>Тексты</label><strong>${workspace ? keyCount('texts') : '—'}</strong><span class="badge">ключей</span></article>
    </section>
    ${!workspace ? `<section class="card section">${emptyState(state.authorized ? 'Загрузите конфигурацию, чтобы редактировать её без прямой записи из браузера.' : 'Войдите с ролью администратора.')}</section>` : `
      ${renderReleaseMaintenanceWorkflow()}
      <section class="card section"><div class="card-header"><div><h2>Редактор конфигурации</h2><p>Формат JSON позволяет сохранить все существующие и новые ключи. Тип каждого значения проверяется до публикации и повторно на сервере.</p></div><span class="badge">ревизия ${Number(config.revision ?? 0)}</span></div><div class="card-body">
        <div class="fields">
          <div class="field"><label for="remote-config-bools">Переключатели · только true/false</label><textarea id="remote-config-bools" class="mono config-editor" spellcheck="false"${editorLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigBranch('bools'))}</textarea></div>
          <div class="field"><label for="remote-config-numbers">Числа · только конечные числа</label><textarea id="remote-config-numbers" class="mono config-editor" spellcheck="false"${editorLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigBranch('numbers'))}</textarea></div>
          <div class="field full"><label for="remote-config-texts">Тексты · только строки</label><textarea id="remote-config-texts" class="mono config-editor" spellcheck="false"${editorLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigBranch('texts'))}</textarea></div>
          <div class="field full"><label for="remote-config-reason">Причина изменения</label><textarea id="remote-config-reason" maxlength="500" placeholder="Что меняется, зачем и кто проверил"${editorLocked ? ' disabled' : ''}>${escapeHtml(preview?.reason ?? '')}</textarea></div>
        </div>
        ${releasePreviewActive ? '<div class="notice warning section">Активен предпросмотр релиза и обслуживания выше. Завершите публикацию или нажмите «Изменить ещё», прежде чем использовать общий JSON-редактор.</div>' : ''}
        ${restorePreviewActive ? '<div class="notice warning section">Активен предпросмотр восстановления значений. JSON-редактор заблокирован, чтобы не отправить устаревший snapshot; нажмите «Изменить ещё», если нужно править вручную.</div>' : ''}
        ${preview ? `<div class="notice ${preview.changes.length ? 'warning' : ''} section"><strong>${escapeHtml(preview.title || 'Предпросмотр изменений')}</strong><br>${preview.summary ? `${escapeHtml(preview.summary)}<br>` : ''}${preview.changes.length ? preview.changes.map((change) => escapeHtml(change)).join('<br>') : 'Значения не отличаются от текущей ревизии.'}</div>` : ''}
        <div class="actions end section">${preview ? '<button class="button" data-action="discard-remote-config-preview" type="button">Изменить ещё</button>' : ''}<button class="button ${preview || editorLocked ? '' : 'primary'}" data-action="preview-remote-config" type="button"${can('application.config.write') && !state.busy && !editorLocked ? '' : ' disabled'}>Предпросмотр</button>${preview?.changes.length ? `<button class="button primary" data-action="publish-remote-config" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'}>Опубликовать</button>` : ''}</div>
      </div></section>
      <section class="card section"><div class="card-header"><div><h2>Последние изменения</h2><p>Серверный журнал с причиной и ревизией.</p></div></div><div class="card-body">${renderRemoteConfigHistory()}</div></section>
    `}`;
}

function dateTime(value) {
  const ms = Number(value || 0);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toLocaleString('ru-RU') : '—';
}

function sourceBadge(source) {
  const stateValue = String(source?.state || 'empty');
  const labels = { ready: 'Данные получены', empty: 'Данных нет', partial: 'Частично', error: 'Источник не прочитан' };
  return `<span class="badge ${stateValue === 'error' ? 'danger' : stateValue === 'partial' ? 'warning' : stateValue === 'ready' ? 'success' : ''}">${escapeHtml(labels[stateValue] || stateValue)}</span>`;
}

function sourceNotice(source) {
  if (!source) return '<div class="notice warning">Источник ещё не загружен.</div>';
  if (source.state === 'error') return `<div class="notice danger"><strong>Источник не прочитан</strong><br>${escapeHtml(source.error || 'Неизвестная ошибка источника')}</div>`;
  if (source.state === 'partial') return `<div class="notice warning">Показана ограниченная выборка${source.degradedReason ? `: ${escapeHtml(source.degradedReason)}` : '.'}</div>`;
  if (source.state === 'empty') return '<div class="profile-empty">Записей нет.</div>';
  return '';
}

function compactEvent(row) {
  const title = row.eventType || row.type || row.category || row.screen || row.packTitle || row.packId || row.status || row.id || 'Событие';
  const detail = row.comment || row.reason || row.text || row.messageText || row.productId || row.reportedName || row.reporterName || '';
  const when = dateTime(row.createdAt?.seconds ? row.createdAt.seconds * 1000 : row.createdAt || row.eventTimestampMs || row.updatedAt);
  return `<li><div><strong>${escapeHtml(title)}</strong>${detail ? `<small>${escapeHtml(String(detail).slice(0, 240))}</small>` : ''}</div><time>${escapeHtml(when)}</time></li>`;
}

function renderSourceBlock(title, source) {
  const rows = Array.isArray(source?.data) ? source.data : [];
  return `<div class="profile-source"><header><strong>${escapeHtml(title)}</strong>${sourceBadge(source)}</header>${sourceNotice(source)}${rows.length ? `<ul class="profile-events">${rows.slice(0, 8).map(compactEvent).join('')}</ul>` : ''}</div>`;
}

function renderUserSearchResults() {
  const items = state.users.items;
  if (state.users.searchState === 'loading') return `<div class="profile-loading" role="status" aria-live="polite"><span class="loading-bar"></span><span>Ищу по защищённым серверным источникам…</span></div>`;
  if (state.users.searchState === 'error') return `<div class="notice danger section"><strong>Поиск не выполнен</strong><br>${escapeHtml(state.users.searchErrors.join(' · ') || 'Серверные источники поиска недоступны.')}</div>`;
  if (!state.users.searched) return emptyState('Введите UID, точное имя или почту. Общий список пользователей не сканируется.');
  if (!items.length) return emptyState('Совпадений не найдено. Проверьте точное имя, UID или почту.');
  return `${state.users.searchState === 'partial' ? `<div class="notice warning section">Результаты частичные: ${escapeHtml(state.users.searchErrors.join(' · ') || 'один из источников поиска недоступен')}</div>` : ''}<div class="user-search-results">${items.map((user) => `<button type="button" class="user-result${state.users.profile?.canonicalUid === user.uid ? ' selected' : ''}" data-user-profile-uid="${escapeHtml(user.uid)}" title="Открыть единый профиль"><span class="user-avatar">${escapeHtml(String(user.name || '?').slice(0, 1).toUpperCase())}</span><span><strong>${escapeHtml(user.name || user.uid)}</strong><small>${escapeHtml(user.email || user.uid)} · ${Number(user.xp || 0).toLocaleString('ru-RU')} XP</small></span><span class="badge ${user.banned ? 'danger' : user.banState === 'unknown' ? 'warning' : user.premiumPlan ? 'success' : ''}">${user.banned ? 'Заблокирован' : user.banState === 'unknown' ? 'Статус неизвестен' : user.premiumPlan ? 'Plus' : 'Free'}</span></button>`).join('')}</div>`;
}

function renderProfile() {
  const profile = state.users.profile;
  if (!profile) return `<section class="card profile-placeholder"><div class="card-header"><div><h2>Единый профиль</h2><p>Идентичность, обучение, деньги, обращения и события.</p></div></div>${state.users.profileLoading ? `<div class="profile-loading profile-loading-panel" role="status" aria-live="polite"><span class="loading-bar"></span><span>Собираю согласованный снимок профиля…</span><div class="loading-blocks"><i></i><i></i><i></i></div></div>` : emptyState('Выберите пользователя в результатах поиска.')}</section>`;
  const summary = profile.summary || {};
  const sections = profile.sections || {};
  const competition = sections.competition || {};
  const money = sections.money || {};
  const community = sections.community || {};
  const moderation = sections.moderation || {};
  const sourceStates = sections.diagnostics?.sourceStates || {};
  const failed = Object.values(sourceStates).filter((source) => source?.state === 'error').length;
  const partial = Object.values(sourceStates).filter((source) => source?.state === 'partial').length;
  const legacyUrl = `../../admin/index.html?openUser=${encodeURIComponent(profile.canonicalUid)}#users`;
  return `<div class="profile-workspace">
    ${state.users.profileLoading ? '<div class="notice" role="status" aria-live="polite">Обновляю источники; текущий снимок остаётся на экране.</div>' : ''}
    <section class="card profile-hero"><div><div class="eyebrow">Канонический профиль</div><h2>${escapeHtml(summary.name || profile.canonicalUid)}</h2><p class="mono">${escapeHtml(profile.canonicalUid)}</p><div class="actions"><span class="badge ${summary.banned ? 'danger' : 'success'}">${summary.banned ? 'Заблокирован' : 'Активен'}</span><span class="badge">${escapeHtml(profile.identity?.reason || 'requested')}</span>${profile.state === 'partial' ? '<span class="badge warning">Неполный снимок</span>' : '<span class="badge success">Снимок готов</span>'}</div></div><div class="profile-hero-actions"><button class="button" data-action="reload-user-profile" type="button" title="Обновить все источники профиля" data-tooltip="Обновить все источники профиля">Обновить</button><a class="button" href="${escapeHtml(legacyUrl)}" target="_blank" rel="noopener" title="Открыть защищённое управление аккаунтом" data-tooltip="Открыть защищённое управление аккаунтом">Управление аккаунтом</a></div></section>
    <div class="notice warning">Изменяющие действия пока открываются в действующем модуле: имя, XP, streak, Plus, осколки, награды, merge, сбросы, предупреждение, бан и удаление. Для каждого будет отдельный защищённый протокол с причиной, подтверждением и аудитом.</div>
    <div class="profile-section-grid">
      <section class="card profile-section"><div class="card-header"><div><h3>1. Личность и аккаунт</h3><p>Канонический UID и привязка входа.</p></div></div><dl class="profile-facts"><dt>Почта</dt><dd>${escapeHtml(summary.auth?.email || '—')}</dd><dt>Провайдер</dt><dd>${escapeHtml(summary.auth?.provider || '—')}</dd><dt>Язык / платформа</dt><dd>${escapeHtml(summary.language || '—')} · ${escapeHtml(summary.platform || '—')}</dd><dt>Последняя активность</dt><dd>${escapeHtml(dateTime(summary.lastActiveAtMs))}</dd><dt>Алиасы</dt><dd>${escapeHtml((profile.identity?.aliases || []).join(', ') || 'нет')}</dd></dl></section>
      <section class="card profile-section"><div class="card-header"><div><h3>2. Обучение</h3><p>Прогресс без выдачи сырого документа.</p></div></div><div class="profile-metrics"><div><strong>${Number(summary.xp || 0).toLocaleString('ru-RU')}</strong><small>XP</small></div><div><strong>${Number(summary.streak || 0)}</strong><small>дней streak</small></div><div><strong>${Number(summary.lessonsCompleted || 0)}</strong><small>уроков</small></div><div><strong>${escapeHtml(summary.placementLevel || '—')}</strong><small>уровень</small></div></div></section>
      <section class="card profile-section"><div class="card-header"><div><h3>3. Рейтинг и Арена</h3><p>Отдельные серверные источники.</p></div></div>${renderSourceBlock('Leaderboard', competition.leaderboard)}${renderSourceBlock('Арена', competition.arena)}</section>
      <section class="card profile-section"><div class="card-header"><div><h3>4. Деньги и доступ</h3><p>Plus, осколки, покупки и рефералы.</p></div><span class="badge ${summary.premiumPlan ? 'success' : ''}">${escapeHtml(summary.premiumPlan || 'Free')}</span></div><div class="profile-metrics compact"><div><strong>${Number(summary.shards || 0)}</strong><small>осколков</small></div><div><strong>${Number(money.premiumEvents?.count || 0)}</strong><small>Plus-событий</small></div><div><strong>${Number(money.referrals?.count || 0)}</strong><small>приглашено</small></div></div>${renderSourceBlock('Платёжные события', money.premiumEvents)}${renderSourceBlock('Осколки', money.shardTransactions)}</section>
      <section class="card profile-section"><div class="card-header"><div><h3>5. Комьюнити</h3><p>Чат и пользовательские покупки.</p></div></div>${renderSourceBlock('Сообщения', community.chatMessages)}${renderSourceBlock('Покупки наборов', community.ugcBuys)}${renderSourceBlock('Продажи наборов', community.ugcSells)}</section>
      <section class="card profile-section"><div class="card-header"><div><h3>6. Модерация и репорты</h3><p>Жалобы от пользователя и на него не смешиваются.</p></div></div>${renderSourceBlock('Репорты приложения', moderation.errorReports)}${renderSourceBlock('Жалобы на пользователя', moderation.reportsAgainst)}${renderSourceBlock('Жалобы пользователя', moderation.reportsBy)}</section>
      <section class="card profile-section diagnostics-section"><div class="card-header"><div><h3>7. Диагностика источников</h3><p>Пустой источник не равен ошибке чтения.</p></div><div class="actions"><span class="badge ${failed ? 'danger' : 'success'}">Ошибок: ${failed}</span><span class="badge ${partial ? 'warning' : ''}">Частично: ${partial}</span></div></div><div class="source-health-grid">${Object.entries(sourceStates).map(([name, source]) => `<div><span>${escapeHtml(name)}</span>${sourceBadge(source)}<small>${Number(source?.count || 0)} записей · ${escapeHtml(dateTime(source?.fetchedAtMs))}</small></div>`).join('')}</div></section>
    </div>
  </div>`;
}

function renderUsers() {
  if (!can('users.read')) return `${pageHeader(PAGES.users, 'Пользователи')}<div class="notice warning">Для просмотра профилей нужна роль с разрешением users.read. Сохранённые результаты скрыты.</div>`;
  return `${pageHeader(PAGES.users, 'Пользователи', '<a class="button" href="#support" title="Открыть почту поддержки">Почта</a><a class="button primary" href="#report-center" title="Открыть единый центр репортов">Центр репортов</a>')}
    <section class="card user-search-card"><div class="card-header"><div><h2>Найти пользователя</h2><p>Точный серверный поиск без загрузки всей базы в браузер.</p></div><span class="badge">users.read</span></div><div class="card-body"><div class="user-search-form"><div class="field"><label for="user-search">Почта, точное имя или UID</label><input id="user-search" type="search" value="${escapeHtml(state.users.query)}" placeholder="alice@example.com или stable UID" autocomplete="off"></div><button class="button primary" data-action="search-admin-users" type="button" title="Найти пользователя без загрузки всей базы" data-tooltip="Найти пользователя без загрузки всей базы"${disabledWhenUnauthorized('users.read')}>Найти</button></div>${renderUserSearchResults()}</div></section>
    <div class="section">${renderProfile()}</div>`;
}

function renderMoney() {
  return `${pageHeader(PAGES.money, 'Деньги', '<a class="button primary" href="../../admin/index.html#promo-codes" title="Открыть рабочее управление промокодами">Промокоды</a>')}
    <div class="notice warning">События нажатия «Купить» не считаются выручкой. Денежные показатели должны приходить из платёжного источника.</div>
    <section class="metrics section">${['Активные подписки', 'Выручка за период', 'Платёжные проблемы', 'Возвраты'].map((label) => `<article class="card metric"><label>${label}</label><strong>—</strong><span class="badge">Не загружено</span></article>`).join('')}</section>
    <section class="card section"><div class="card-header"><div><h2>Платёжные инструменты</h2><p>Текущие рабочие операции доступны без потери функций.</p></div><div class="actions"><a class="button" href="#analytics">Аналитика</a><a class="button" href="../../admin/index.html#subscriptions">Подписки</a></div></div></section>`;
}

function renderFactorySteps() {
  return `<div class="factory-steps" aria-label="Этапы Фабрики языков">${FACTORY_STEPS.map((step) => `<button class="factory-step" type="button" data-factory-step="${step.id}" aria-current="${state.factoryStep === step.id ? 'step' : 'false'}" title="${escapeHtml(step.title)}"><span class="factory-step-number">${step.id}</span><span><strong>${escapeHtml(step.title)}</strong><small>${escapeHtml(step.subtitle)}</small></span></button>`).join('')}</div>`;
}

function renderFactoryCreate() {
  return `<section class="card factory-panel"><div class="card-header"><div><h2>Создать языковой пакет</h2><p>Создаётся черновик. Теория не генерируется автоматически и остаётся редакторской работой.</p></div><span class="badge">Этап 1 из 4</span></div>
    <div class="card-body">
      <div class="fields">
        <div class="field"><label for="factory-target">Новый язык, код</label><input id="factory-target" list="language-presets" value="fr" maxlength="12" pattern="[a-z]{2,12}(-[A-Z]{2})?" aria-describedby="target-hint"><datalist id="language-presets"><option value="fr">Французский</option><option value="de">Немецкий</option><option value="it">Итальянский</option><option value="pt">Португальский</option><option value="pl">Польский</option></datalist><small id="target-hint" class="hint">Например: fr, de, it.</small></div>
        <div class="field"><label for="factory-source">Язык объяснений пользователя</label><select id="factory-source"><option value="ru" selected>Русский · ru</option><option value="uk">Украинский · uk</option><option value="en">Английский · en</option></select></div>
        <div class="field"><label for="factory-start">Первый урок</label><input id="factory-start" type="number" min="1" max="100" value="1"></div>
        <div class="field"><label for="factory-count">Количество уроков</label><input id="factory-count" type="number" min="1" max="100" value="10"><small class="hint">Можно указать 10, 20, 30, 32, 35 или другое число до 100.</small></div>
        <div class="field full"><label for="factory-blueprint">Проверенный учебный шаблон</label><select id="factory-blueprint"><option value="english-core-32:v1">English Core 32 · версия 1</option></select><small class="hint">Темы, сложность и структура берутся из проверенного английского курса и реестра источников.</small></div>
        <div class="field full"><span class="fieldset-label">Что подготовить</span><div class="checkbox-grid">
          ${[
            ['lessons', 'Фразы урока'], ['vocabulary', 'Словарь'], ['drills', 'Упражнения и части речи'],
            ['quizzes', 'Квизы'], ['cards', 'Карточки'], ['arena_questions', 'Вопросы Арены'],
          ].map(([value, label]) => `<label class="check"><input type="checkbox" name="factory-surface" value="${value}" checked><span>${label}</span></label>`).join('')}
        </div></div>
      </div>
      <div class="notice section">Полный пакет публикуется только со всеми четырьмя рабочими поверхностями: урок, квиз, карточки и Арена. Словарь и упражнения входят в артефакт урока.</div>
      <div class="actions end section"><button class="button" data-action="load-factory-jobs" type="button" title="Открыть существующие задания"${disabledWhenUnauthorized('content.read')}>Мои черновики</button><button class="button primary" data-action="create-factory-job" type="button" title="Создать черновик без публикации"${disabledWhenUnauthorized('content.draft.write')}>Создать черновик</button></div>
    </div></section>`;
}

function renderJobPicker() {
  if (!state.jobsLoaded) return emptyState(state.authorized ? 'Нажмите «Загрузить черновики».' : 'Войдите с ролью администратора.');
  if (!state.jobs.length) return emptyState('Черновиков пока нет. Создайте первый языковой пакет.');
  return `<div class="job-list">${state.jobs.map((job) => {
    const progress = job.progress ?? {};
    return `<div class="list-row"><div><strong>${escapeHtml(job.studyTarget)} · ${escapeHtml(job.id)}</strong><small>${escapeHtml(statusLabel(job.state))} · ${Number(progress.completed ?? 0)}/${Number(progress.total ?? 0)} · ${escapeHtml(job.learnerSourceLocale ?? job.sourceLocale)}</small></div><button class="button small" data-select-job="${escapeHtml(job.id)}" type="button" title="Открыть это задание">Открыть</button></div>`;
  }).join('')}</div>`;
}

function renderFactoryGeneration() {
  const detail = state.detail;
  const job = detail?.job;
  const units = Array.isArray(detail?.units) ? detail.units : [];
  const completed = Number(job?.progress?.completed ?? units.filter((unit) => unit.state === 'succeeded').length);
  const total = Number(job?.progress?.total ?? units.length);
  const percent = total ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const pending = units.filter((unit) => unit.state !== 'succeeded').length;
  return `<section class="card factory-panel"><div class="card-header"><div><h2>Генерация и предпросмотр</h2><p>Задание можно безопасно продолжить после закрытия браузера: готовые юниты и контрольные точки не создаются повторно.</p></div><span class="badge">Этап 2 из 4</span></div>
    <div class="card-body">
      <div class="actions"><button class="button" data-action="load-factory-jobs" type="button"${disabledWhenUnauthorized('content.read')}>Загрузить черновики</button>${detail ? `<button class="button" data-action="refresh-factory-detail" type="button"${disabledWhenUnauthorized('content.read')}>Обновить</button>` : ''}</div>
      ${!detail ? `<div class="section">${renderJobPicker()}</div>` : `
        <div class="notice section"><strong>${escapeHtml(job.studyTarget)} ← ${escapeHtml(job.learnerSourceLocale ?? job.sourceLocale)}</strong><br><span class="mono">${escapeHtml(detail.jobId)}</span></div>
        <div class="section"><div class="actions" style="justify-content:space-between"><span class="hint">Готово ${completed} из ${total}</span><span class="badge ${badgeClass(job.state)}">${escapeHtml(statusLabel(job.state))}</span></div><div class="progress" aria-label="Прогресс ${percent}%"><span style="width:${percent}%"></span></div></div>
        ${state.generation ? `<div class="notice ${state.generation.failed ? 'warning' : ''} section">Обработано в этом запуске: ${state.generation.done}/${state.generation.total}. Ошибок: ${state.generation.failed}.</div>` : ''}
        <div class="actions end section"><button class="button" data-action="back-to-factory-jobs" type="button">Другой черновик</button>${pending ? `<button class="button primary" data-action="run-factory-generation" type="button" title="Сгенерировать или продолжить оставшиеся части"${disabledWhenUnauthorized('content.draft.write')}>${state.generation ? 'Продолжить генерацию' : 'Запустить генерацию'}</button>` : `<button class="button primary" data-factory-step="3" type="button">Перейти к проверке</button>`}</div>
        <div class="unit-grid section">${units.map((unit) => `<article class="unit-card"><div class="actions" style="justify-content:space-between"><strong>Урок ${Number(unit.lessonId)} · ${escapeHtml(SURFACE_LABELS[unit.surface] ?? unit.surface)}</strong><span class="badge ${badgeClass(unit.state)}">${escapeHtml(statusLabel(unit.state))}</span></div><div class="actions"><button class="button small" data-preview-unit="${escapeHtml(unit.id ?? unit.unitId)}" type="button" title="Проверить неизменяемый файл и открыть содержимое"${unit.state === 'succeeded' && can('content.read') ? '' : ' disabled'}>Предпросмотр</button></div></article>`).join('')}</div>
      `}
    </div></section>`;
}

function renderPreview() {
  if (!state.preview) return emptyState('Откройте предпросмотр хотя бы одного готового юнита перед решением.');
  return `<div class="preview-layout"><div><div class="notice success"><strong>Целостность подтверждена сервером</strong><br>Поколение файла и SHA‑256 совпали с квитанцией генерации.</div><h3>Квитанция качества</h3><pre class="code-preview">${escapeHtml(JSON.stringify(state.preview.qaReceipt ?? {}, null, 2))}</pre></div><div><h3>Содержимое</h3><pre class="code-preview">${escapeHtml(JSON.stringify(state.preview.payload ?? {}, null, 2))}</pre></div></div>`;
}

function renderFactoryReview() {
  const detail = state.detail;
  const allReady = Boolean(detail?.units?.length) && detail.units.every((unit) => unit.state === 'succeeded');
  const review = detail?.review;
  return `<section class="card factory-panel"><div class="card-header"><div><h2>Проверка качества и источников</h2><p>Решение доступно только после фактического предпросмотра. Сервер повторно проверит все юниты, хеш шаблона и реестр источников.</p></div><span class="badge">Этап 3 из 4</span></div>
    <div class="card-body">
      ${!detail ? `<div class="notice warning">Сначала выберите черновик на втором этапе.</div><div class="actions end section"><button class="button primary" data-factory-step="2" type="button">Выбрать черновик</button></div>` : `
        <div class="actions" style="justify-content:space-between"><div><strong>${escapeHtml(detail.job.studyTarget)} · ${escapeHtml(detail.jobId)}</strong><div class="hint">Готовых частей: ${detail.units.filter((unit) => unit.state === 'succeeded').length}/${detail.units.length}</div></div>${review ? `<span class="badge ${badgeClass(review.status)}">${escapeHtml(statusLabel(review.status))}</span>` : '<span class="badge">Решения ещё нет</span>'}</div>
        <div class="section">${renderPreview()}</div>
        <div class="field full section"><label for="factory-review-reason">Комментарий проверяющего</label><textarea id="factory-review-reason" maxlength="500" placeholder="Что проверено: язык, соответствие источникам, структура, варианты ответов…">${escapeHtml(review?.reason ?? '')}</textarea></div>
        <div class="notice section">Одобрение не публикует пакет. Оно только разрешает запечатать неизменяемый релиз на следующем этапе.</div>
        <div class="actions end section"><button class="button danger" data-action="reject-factory-job" type="button"${allReady && state.preview && can('content.publish') && !state.busy ? '' : ' disabled'} title="Отклонить и вернуть на доработку">Отклонить</button><button class="button primary" data-action="approve-factory-job" type="button"${allReady && state.preview && can('content.publish') && !state.busy ? '' : ' disabled'} title="Одобрить после проверки содержимого и источников">Одобрить проверку</button></div>
      `}
    </div></section>`;
}

function releaseOption(release) {
  return `<option value="${escapeHtml(release.releaseId ?? release.id)}">${escapeHtml(release.releaseId ?? release.id)}</option>`;
}

function renderFactoryPublish() {
  const detail = state.detail;
  const release = detail?.release;
  const catalog = detail?.catalog;
  const activeReleaseId = String(catalog?.activeRelease?.releaseId ?? '');
  const releaseId = String(release?.releaseId ?? release?.id ?? '');
  const revision = Number(catalog?.revision ?? 0);
  const approved = detail?.review?.status === 'approved';
  const releases = Array.isArray(state.workspace?.releases) ? state.workspace.releases : [];
  const rollbackTargets = releases.filter((item) => String(item.releaseId ?? item.id) !== activeReleaseId);
  return `<section class="card factory-panel"><div class="card-header"><div><h2>Запечатывание, активация и откат</h2><p>Активный указатель меняется атомарно по ожидаемой ревизии. Любое изменение получает журнал и ключ повторной операции.</p></div><span class="badge">Этап 4 из 4</span></div>
    <div class="card-body">
      ${!detail ? `<div class="notice warning">Сначала выберите и проверьте черновик.</div><div class="actions end section"><button class="button primary" data-factory-step="2" type="button">Выбрать черновик</button></div>` : `
        <div class="metrics">
          <article class="card metric"><label>Проверка</label><strong>${approved ? 'Да' : 'Нет'}</strong><span class="badge ${approved ? 'success' : 'warning'}">${escapeHtml(statusLabel(detail.review?.status))}</span></article>
          <article class="card metric"><label>Релиз запечатан</label><strong>${release ? 'Да' : 'Нет'}</strong><span class="badge ${release ? 'success' : ''}">${release ? 'Неизменяемый' : 'Не создан'}</span></article>
          <article class="card metric"><label>Ревизия каталога</label><strong>${revision}</strong><span class="badge">Серверное значение</span></article>
          <article class="card metric"><label>Активен</label><strong>${releaseId && activeReleaseId === releaseId ? 'Да' : 'Нет'}</strong><span class="badge ${releaseId && activeReleaseId === releaseId ? 'success' : ''}">${escapeHtml(activeReleaseId || 'Нет активного релиза')}</span></article>
        </div>
        <div class="columns section">
          <section><h3>Текущий черновик</h3><div class="notice"><span class="mono">${escapeHtml(detail.jobId)}</span><br>${escapeHtml(detail.job.studyTarget)} ← ${escapeHtml(detail.job.learnerSourceLocale ?? detail.job.sourceLocale)}</div>
            ${!release ? `<div class="actions section"><button class="button primary" data-action="seal-factory-release" type="button"${approved && can('content.publish') && !state.busy ? '' : ' disabled'} title="Создать неизменяемый релиз из одобренного черновика">Запечатать релиз</button></div>` : `
              <div class="field section"><label for="factory-activation-reason">Причина активации</label><textarea id="factory-activation-reason" maxlength="500" placeholder="Например: проверен и готов для пользователей"></textarea></div>
              <div class="actions section"><button class="button primary" data-action="activate-factory-release" type="button"${releaseId && activeReleaseId !== releaseId && can('content.publish') && !state.busy ? '' : ' disabled'} title="Сделать этот релиз активным без обновления приложения">Активировать релиз</button></div>`}
          </section>
          <section><h3>Откат</h3><p class="hint">Можно вернуть только релиз, который уже был активен в этом каталоге. Сервер проверит членство и текущую ревизию.</p>
            <div class="field"><label for="factory-rollback-target">Целевой релиз</label><select id="factory-rollback-target"><option value="">Выберите релиз</option>${rollbackTargets.map(releaseOption).join('')}</select></div>
            <div class="field section"><label for="factory-rollback-reason">Причина отката</label><textarea id="factory-rollback-reason" maxlength="500" placeholder="Что обнаружено и почему нужен откат"></textarea></div>
            <div class="actions section"><button class="button danger" data-action="rollback-factory-release" type="button"${activeReleaseId && rollbackTargets.length && can('content.publish') && !state.busy ? '' : ' disabled'} title="Вернуть ранее активный релиз">Выполнить откат</button></div>
          </section>
        </div>
      `}
    </div></section>`;
}

function renderContent() {
  const panel = state.factoryStep === 1 ? renderFactoryCreate() : state.factoryStep === 2 ? renderFactoryGeneration() : state.factoryStep === 3 ? renderFactoryReview() : renderFactoryPublish();
  return `${pageHeader(PAGES.content, 'Фабрика языков', '<a class="button" href="../../admin/index.html#content" title="Открыть существующие инструменты контента">Текущие инструменты</a>')}
    <div class="factory-layout">${renderFactorySteps()}${panel}</div>`;
}

function renderCommunity() {
  return `${pageHeader(PAGES.community, 'Комьюнити', '<a class="button primary" href="../../admin/index.html#reports" title="Открыть рабочую очередь жалоб">Открыть очередь</a>')}
    <div class="notice">Пустая очередь не считается подтверждённым хорошим состоянием, пока источник не загружен.</div>
    <section class="metrics section">${['Жалобы без ответа', 'Контент на модерации', 'Инциденты Арены', 'Сообщения чата'].map((label) => `<article class="card metric"><label>${label}</label><strong>—</strong><span class="badge">Не загружено</span></article>`).join('')}</section>`;
}

const SOURCE_LABELS = Object.freeze({
  app_errors: 'Ошибки приложения',
  support_inbox: 'Почта поддержки',
  community_pack_submissions: 'Паки сообщества',
  reports: 'Репорты пользователей',
  user_reports: 'Репорты пользователей',
  safety_reports: 'Безопасность и жалобы',
  analytics_events: 'События аналитики',
  admin_audit: 'Журнал администратора',
});

const AUDIT_ACTION_LABELS = Object.freeze({
  'remote_config.publish': 'Публикация настроек приложения',
  'support.reply.send': 'Ответ пользователю',
  'support.reply.prepare': 'Подготовка ответа',
  'support.reply.delivery_unknown': 'Неизвестный статус доставки',
  'support.inbox.pull': 'Синхронизация почты',
  reply_to_report: 'Ответ на репорт',
  'content_factory.job.create': 'Создание задания контента',
  'content_factory.publish': 'Публикация контента',
  'content_factory.rollback': 'Откат контента',
  'content_factory.course_release.activate': 'Активация релиза курса',
  'content_factory.course_release.rollback': 'Откат релиза курса',
  'report.status.update': 'Изменение статуса репорта',
  grant_reward: 'Выдача награды',
  email_contacts_backfill: 'Обновление контактов почты',
  email_campaign_send: 'Отправка email-кампании',
  ai_daily_digest: 'Ежедневный дайджест',
  ai_daily_digest_blocked: 'Дайджест заблокирован',
  promo_code_upsert: 'Изменение промокода',
  promo_codes_batch_upsert: 'Пакетное изменение промокодов',
});

const AUDIT_STATE_LABELS = Object.freeze({
  idle: 'Не загружено',
  loading: 'Загрузка',
  ready: 'Готово',
  empty: 'Пусто',
  truncated: 'Ограниченная выборка',
  error: 'Ошибка',
});

function auditActionLabel(action) {
  const value = String(action || 'unknown');
  if (AUDIT_ACTION_LABELS[value]) return AUDIT_ACTION_LABELS[value];
  return value === 'unknown' ? 'Неизвестное действие' : 'Действие администратора';
}

function auditStateLabel(state) {
  return AUDIT_STATE_LABELS[state] || 'Неизвестное состояние';
}

const OPS_SOURCE_LABELS = Object.freeze({
  '': 'Все источники',
  admin: 'Админ-действия',
  error_report: 'Баг-репорты',
  user_report: 'Жалобы пользователей',
});

const OPS_TYPE_LABELS = Object.freeze({
  '': 'Все типы',
  mark_fixed: 'Репорт отмечен исправленным',
  grant_reward: 'Выдача награды',
  refund_pack_purchase: 'Возврат за пакет',
  global_broadcast_send: 'Глобальная рассылка',
  global_broadcast_deactivate: 'Отключение рассылки',
  premium_change: 'Изменение Plus',
  ban: 'Блокировка или разблокировка',
  delete_user_dupe: 'Удаление дубля',
  report_created: 'Создан баг-репорт',
  user_report_created: 'Создана жалоба',
});

const OPS_STATE_LABELS = Object.freeze({
  idle: 'Не загружено',
  loading: 'Загрузка',
  ready: 'Готово',
  empty: 'Пусто',
  partial: 'Частично',
  truncated: 'Ограниченная выборка',
  error: 'Ошибка',
});

function opsTypeLabel(type) {
  const value = String(type || '');
  return OPS_TYPE_LABELS[value] || 'Операционное событие';
}

function opsStateLabel(state) {
  return OPS_STATE_LABELS[state] || 'Неизвестное состояние';
}

function opsDetailsSummary(value) {
  if (!value || typeof value !== 'object') return '—';
  const pairs = Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== '').slice(0, 5);
  return pairs.length ? pairs.map(([key, item]) => `${key}: ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`).join(' · ') : '—';
}

function sourceHealthBadge(source) {
  const labels = { ready: 'Получен', empty: 'Нет записей', error: 'Ошибка', truncated: 'Достигнут лимит', partial: 'Частично' };
  const kind = source.state === 'error' ? 'danger' : ['truncated', 'partial'].includes(source.state) ? 'warning' : source.state === 'ready' ? 'success' : '';
  return `<span class="badge ${kind}">${escapeHtml(labels[source.state] || source.state)}</span>`;
}

function renderDiagnosticsSourceHealth(view) {
  if (view.state === 'loading') return '<div class="profile-loading" role="status" aria-live="polite"><span class="loading-bar"></span><span>Читаю состояние источников…</span></div>';
  if (view.state === 'error') return `<div class="notice danger" role="alert"><strong>Источники не загружены.</strong><br>${escapeHtml(view.error || 'Сервер не вернул снимок.')}<div class="actions section"><button class="button" data-action="load-daily-briefing" type="button"${disabledWhenUnauthorized('briefing.read')} title="Повторно прочитать состояние источников">Повторить чтение</button></div></div>`;
  if (!view.hasData) return emptyState('Сохранённый снимок источников ещё не загружен.');
  if (!view.sources.length) return emptyState('В сохранённом снимке нет сведений об источниках.');
  return `<div class="source-health-grid">${view.sources.map((source) => `<div><span>${escapeHtml(SOURCE_LABELS[source.source] || source.source.replaceAll('_', ' '))}</span><small class="mono">${escapeHtml(source.source)}</small>${sourceHealthBadge(source)}<small>Записей: ${source.count.toLocaleString('ru-RU')}${source.limit ? ` · лимит ${source.limit.toLocaleString('ru-RU')}` : ''}</small><small>Проверен: ${escapeHtml(dateTime(source.checkedAtMs))}</small><small>Последнее событие: ${escapeHtml(dateTime(source.latestEventAtMs))}</small>${source.error ? `<small class="source-error">${escapeHtml(source.error)}</small>` : ''}</div>`).join('')}</div>`;
}

function auditSummary(value) {
  if (!value || typeof value !== 'object') return '—';
  const pairs = Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== '').slice(0, 4);
  return pairs.length ? pairs.map(([key, item]) => `${key}: ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`).join(' · ') : '—';
}

function auditActor(row) {
  return row.adminEmail || row.actorUid || 'неизвестный администратор';
}

function renderAuditLogPanel() {
  const audit = state.audit;
  const items = Array.isArray(audit.items) ? audit.items : [];
  const actionOptions = [''].concat([...new Set(items.map((item) => String(item.action || '')).filter(Boolean))].sort())
    .map((value) => `<option value="${escapeHtml(value)}"${audit.action === value ? ' selected' : ''}>${escapeHtml(value ? auditActionLabel(value) : 'Все действия')}</option>`).join('');
  const filterBar = `<div class="toolbar-grid">
    <div class="field"><label for="audit-action-filter">Действие</label><select id="audit-action-filter">${actionOptions}</select></div>
    <div class="field"><label for="audit-search-filter">Поиск</label><input id="audit-search-filter" value="${escapeHtml(audit.query)}" maxlength="160" placeholder="email, UID, requestId, причина"></div>
    <div class="field"><label for="audit-days-filter">Период</label><select id="audit-days-filter"><option value="1"${audit.sinceDays === 1 ? ' selected' : ''}>24 часа</option><option value="7"${audit.sinceDays === 7 ? ' selected' : ''}>7 дней</option><option value="30"${audit.sinceDays === 30 ? ' selected' : ''}>30 дней</option><option value="90"${audit.sinceDays === 90 ? ' selected' : ''}>90 дней</option></select></div>
    <div class="actions end"><button class="button primary" data-action="load-audit-log" type="button"${disabledWhenUnauthorized('diagnostics.read')} title="Загрузить журнал действий через серверную проверку прав">Обновить журнал</button></div>
  </div>`;
  let body = '';
  if (audit.state === 'loading') body = '<div class="profile-loading" role="status" aria-live="polite"><span class="loading-bar"></span><span>Загружаю журнал действий…</span></div>';
  else if (audit.state === 'error') body = `<div class="notice danger" role="alert"><strong>Журнал не загружен.</strong><br>${escapeHtml(audit.error || 'Сервер не вернул данные.')}<div class="actions section"><button class="button" data-action="load-audit-log" type="button"${disabledWhenUnauthorized('diagnostics.read')} title="Повторно загрузить журнал действий">Повторить чтение</button></div></div>`;
  else if (!items.length) body = emptyState(audit.state === 'idle' ? 'Загрузите журнал после входа с правом диагностики.' : 'За выбранный период действий не найдено.');
  else body = `<div class="data-list audit-list">${items.map((row) => {
    const entity = row.entity && typeof row.entity === 'object' ? row.entity : {};
    const profileUid = entity.uid || entity.targetUid || entity.userUid || entity.reporterUid || (entity.collection === 'users' ? entity.id : '');
    return `<article class="list-row audit-row"><div><strong>${escapeHtml(auditActionLabel(row.action))}</strong><small><code>${escapeHtml(row.action || 'unknown')}</code> · ${escapeHtml(dateTime(row.timestampMs))} · ${escapeHtml(auditActor(row))} · ${escapeHtml(row.role || 'роль не указана')}</small><small>${escapeHtml(entity.collection || 'entity')}${entity.id ? ` / ${escapeHtml(entity.id)}` : ''}${row.requestId ? ` · request ${escapeHtml(row.requestId)}` : ''}</small><small>Причина и откат: ${escapeHtml(row.reason || 'причина не указана')}${row.rollbackReference ? ` · rollback ${escapeHtml(row.rollbackReference)}` : ''}</small><small>До: ${escapeHtml(auditSummary(row.before))}</small><small>После: ${escapeHtml(auditSummary(row.after))}</small></div><div class="actions">${profileUid ? `<button class="button small ghost" data-audit-user-uid="${escapeHtml(profileUid)}" type="button" title="Открыть профиль связанного пользователя">Профиль</button>` : ''}<a class="button small ghost" href="../../admin/index.html#audit" target="_blank" rel="noopener" title="Открыть старый модуль аудита для расширенной сверки">Старый журнал</a></div></article>`;
  }).join('')}</div>${audit.nextCursor ? '<div class="actions end section"><button class="button" data-action="load-audit-next" type="button" title="Загрузить более старые записи журнала">Показать ещё</button></div>' : ''}`;
  return `<section class="card section"><div class="card-header"><div><h2>Журнал действий</h2><p>Изменения здесь только читаются: кто, что поменял, причина, before/after и ссылка на откат.</p></div><div class="actions"><span class="badge ${badgeClass(audit.state)}">${escapeHtml(auditStateLabel(audit.state))}</span><a class="button small ghost" href="../../admin/index.html#audit" target="_blank" rel="noopener" title="Открыть старый модуль аудита для сверки">Старый журнал</a></div></div><div class="card-body">${filterBar}<div class="hint section">Показано ${items.length}${audit.fetchedAtMs ? ` · обновлено ${escapeHtml(dateTime(audit.fetchedAtMs))}` : ''}</div>${body}</div></section>`;
}

function renderOpsLogPanel() {
  const ops = state.ops;
  const items = Array.isArray(ops.items) ? ops.items : [];
  const sourceOptions = Object.entries(OPS_SOURCE_LABELS)
    .map(([value, label]) => `<option value="${escapeHtml(value)}"${ops.source === value ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
  const presentTypes = [...new Set(items.map((item) => String(item.type || '')).filter(Boolean))].sort();
  const typeOptions = [''].concat(presentTypes)
    .map((value) => `<option value="${escapeHtml(value)}"${ops.type === value ? ' selected' : ''}>${escapeHtml(opsTypeLabel(value))}</option>`).join('');
  const kpis = ops.kpis && typeof ops.kpis === 'object' ? ops.kpis : {};
  const metric = (label, value, hint) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(metricValue(value))}</strong><small>${escapeHtml(hint || 'в загруженной выборке')}</small></div>`;
  const health = Array.isArray(ops.sourceHealth) ? ops.sourceHealth : [];
  const filterBar = `<div class="toolbar-grid">
    <div class="field"><label for="ops-source-filter">Источник</label><select id="ops-source-filter">${sourceOptions}</select></div>
    <div class="field"><label for="ops-type-filter">Тип события</label><select id="ops-type-filter">${typeOptions}</select></div>
    <div class="field"><label for="ops-search-filter">Поиск</label><input id="ops-search-filter" value="${escapeHtml(ops.query)}" maxlength="160" placeholder="UID, статус, тип или деталь"></div>
    <div class="actions end"><button class="button primary" data-action="load-ops-log" type="button"${disabledWhenUnauthorized('diagnostics.read')} title="Загрузить операционный журнал через серверную проверку прав">Обновить журнал</button><button class="button" data-action="copy-ops-snapshot" type="button"${disabledWhenUnauthorized('diagnostics.read')} title="Скопировать безопасный снимок загруженной выборки">Копировать снимок</button></div>
  </div>`;
  let body = '';
  if (ops.state === 'loading') body = '<div class="profile-loading" role="status" aria-live="polite"><span class="loading-bar"></span><span>Загружаю операционный журнал…</span></div>';
  else if (ops.state === 'error') body = `<div class="notice danger" role="alert"><strong>Операционный журнал не загружен.</strong><br>${escapeHtml(ops.error || 'Сервер не вернул данные.')}<div class="actions section"><button class="button" data-action="load-ops-log" type="button"${disabledWhenUnauthorized('diagnostics.read')} title="Повторно загрузить операционный журнал">Повторить чтение</button></div></div>`;
  else if (!items.length) body = emptyState(ops.state === 'idle' ? 'Загрузите журнал после входа с правом диагностики.' : 'В выбранной серверной выборке событий не найдено.');
  else body = `<div class="data-list ops-list">${items.map((row) => `<article class="list-row ops-row"><div><strong>${escapeHtml(opsTypeLabel(row.type))}</strong><small><code>${escapeHtml(row.type || 'event')}</code> · ${escapeHtml(row.sourceLabel || OPS_SOURCE_LABELS[row.source] || 'Источник')} · ${escapeHtml(dateTime(row.timestampMs))}</small><small>UID: <code>${escapeHtml(row.uid || '—')}</code>${row.name ? ` · ${escapeHtml(row.name)}` : ''}${row.status ? ` · статус ${escapeHtml(row.status)}` : ''}</small><small>Детали: ${escapeHtml(opsDetailsSummary(row.details))}</small></div><div class="actions"><span class="badge ${row.source === 'admin' ? 'success' : row.source === 'error_report' ? 'warning' : 'danger'}">${escapeHtml(OPS_SOURCE_LABELS[row.source] || row.source || 'Источник')}</span></div></article>`).join('')}</div>`;
  return `<section class="card section"><div class="card-header"><div><h2>Операционный журнал</h2><p>Серверные действия, баг-репорты и жалобы в одном безопасном снимке только для чтения.</p></div><div class="actions"><span class="badge ${badgeClass(ops.state)}">${escapeHtml(opsStateLabel(ops.state))}</span><a class="button small ghost" href="../../admin/index.html#ops-log" target="_blank" rel="noopener" title="Открыть старый операционный журнал для сверки">Старый ops-log</a></div></div><div class="card-body">${filterBar}${['partial', 'truncated'].includes(ops.state) ? '<div class="notice warning section"><strong>Выборка неполная.</strong> Один из источников вернул ошибку или достиг серверного лимита. Числа ниже относятся только к загруженной части.</div>' : ''}<section class="metrics section">${[
    metric('Событий', kpis.events ?? items.length),
    metric('Баг-репорты', kpis.reportCreated ?? 0),
    metric('Исправлено', kpis.fixed ?? 0),
    metric('Plus', kpis.premiumChanges ?? 0),
    metric('Блокировки', kpis.banActions ?? 0),
  ].join('')}</section>${health.length ? `<section class="report-health section" aria-label="Состояние источников">${health.map((source) => `<span class="badge ${source.state === 'error' ? 'danger' : source.state === 'truncated' ? 'warning' : source.state === 'ready' ? 'success' : ''}" title="${escapeHtml(source.error || '')}">${escapeHtml(source.source === 'admin_log' ? 'Админ-действия' : source.source === 'error_reports' ? 'Баг-репорты' : 'Жалобы')} · ${escapeHtml(opsStateLabel(source.state))} · ${Number(source.count || 0)}</span>`).join('')}</section>` : ''}<div class="hint section">Показано ${items.length}${ops.fetchedAtMs ? ` · обновлено ${escapeHtml(dateTime(ops.fetchedAtMs))}` : ''}</div>${body}</div></section>`;
}

function renderDiagnostics() {
  const budget = state.budget;
  const view = buildOperationalSnapshot(state.briefing);
  const metrics = view.hasData ? [
    operationalMetric('Источники в снимке', metricValue(view.metrics.sourceTotal), view.stateLabel, badgeClass(view.state)),
    operationalMetric('Ошибки источников', metricValue(view.metrics.sourceErrors), 'не прочитано', view.metrics.sourceErrors ? 'danger' : ''),
    operationalMetric('Ограниченные выборки', metricValue(view.metrics.sourceTruncated), 'лимит или частичные данные', view.metrics.sourceTruncated ? 'warning' : ''),
    operationalMetric('Ошибки приложения', metricValue(view.metrics.appErrors), 'за окно снимка', view.metrics.appErrors ? 'warning' : ''),
  ] : ['Источники в снимке', 'Ошибки источников', 'Ограниченные выборки', 'Ошибки приложения'].map((label) => operationalMetric(label, '—', view.stateLabel));
  const headerActions = `<button class="button primary" data-action="load-daily-briefing" type="button"${disabledWhenUnauthorized('briefing.read')} title="Прочитать последний сохранённый снимок без запуска генерации">Обновить диагностику</button><a class="button" href="./migration.html" title="Открыть полный реестр переноса функций">Реестр переноса</a>`;
  return `${pageHeader(PAGES.diagnostics, 'Диагностика', headerActions)}
    ${view.isPartial ? '<div class="notice warning"><strong>Диагностика частичная.</strong> Минимум один источник достиг лимита или вернул неполную выборку.</div>' : ''}
    ${view.state === 'stale' ? '<div class="notice warning"><strong>Диагностика устарела.</strong> Снимок старше 36 часов.</div>' : ''}
    <section class="metrics section">${metrics.join('')}</section>
    <section class="card section"><div class="card-header"><div><h2>Состояние источников</h2><p>Для каждого источника отдельно показаны полнота, время проверки и последнее событие.</p></div><span class="badge ${badgeClass(view.state)}">${escapeHtml(view.stateLabel)}</span></div><div class="card-body">${renderDiagnosticsSourceHealth(view)}</div></section>
    ${renderAuditLogPanel()}
    ${renderOpsLogPanel()}
    <div class="columns section"><section class="card"><div class="card-header"><div><h2>Бюджет генерации</h2><p>Только чтение серверных коллекций расходов.</p></div><button class="button primary" data-action="load-openai-budget" type="button"${disabledWhenUnauthorized()}>Загрузить</button></div><div class="card-body">${budget ? `<pre class="code-preview">${escapeHtml(JSON.stringify(budget, null, 2))}</pre>` : '<p class="hint">Данные не загружены.</p>'}</div></section></div>`;
}

function renderSupport() {
  const items = state.support.items;
  const pending = state.support.pendingReply;
  const pendingIsBatch = Boolean(pending?.batchId);
  const filter = state.support.filter || 'new';
  const filtered = items.filter((item) => filter === 'all' || String(item.status || 'new') === filter).slice(0, 50);
  const count = (status) => items.filter((item) => String(item.status || 'new') === status).length;
  const humanCount = items.filter((item) => item.mailCategory === 'human' || item.mailCategory === 'user').length;
  const readyDrafts = items.filter((item) => String(item.status || 'new') === 'new' && String(item.draftReply || '').trim()).length;
  const statusName = (status) => ({ new: 'Новое', answered: 'Отвечено', archived: 'Архив' })[status] ?? status;
  const headerAction = `<div class="actions"><button class="button" data-action="load-support" type="button"${disabledWhenUnauthorized()}>Обновить</button><button class="button primary" data-action="pull-support" type="button"${disabledWhenUnauthorized()}>Проверить Gmail</button></div>`;
  return `${pageHeader(PAGES.support, 'Пользователи / Почта', headerAction)}
    <div class="notice">Письма людей не удаляются и не скрываются системным фильтром. Категория показывается отдельно, а в список возвращаются все статусы.</div>
    <section class="metrics section"><article class="card metric"><label>Всего загружено</label><strong>${state.support.loaded ? items.length : '—'}</strong><span class="badge">до 500</span></article><article class="card metric"><label>Новые</label><strong>${state.support.loaded ? count('new') : '—'}</strong><span class="badge warning">нужен ответ</span></article><article class="card metric"><label>Письма людей</label><strong>${state.support.loaded ? humanCount : '—'}</strong><span class="badge">не скрываются</span></article><article class="card metric"><label>Отвечено</label><strong>${state.support.loaded ? count('answered') : '—'}</strong><span class="badge success">готово</span></article></section>
    <div class="columns section"><section class="card"><div class="card-header"><div><h2>Рабочая очередь</h2><p>Черновики можно редактировать перед отправкой.</p></div><div class="actions"><button class="button small" data-support-filter="new" type="button">Новые ${count('new')}</button><button class="button small" data-support-filter="answered" type="button">Отвечено ${count('answered')}</button><button class="button small" data-support-filter="archived" type="button">Архив ${count('archived')}</button><button class="button small" data-support-filter="all" type="button">Все</button></div></div>
      <div class="card-body"><div class="actions"><button class="button" data-action="generate-support-reply" data-message-id="" type="button"${state.support.loaded && count('new') && state.authorized && !state.busy && !pending ? '' : ' disabled'} title="Сгенерировать черновики для новых писем без ответа">Сгенерировать черновики</button><button class="button" data-action="prepare-support-reply-batch" type="button"${state.authorized && !state.busy && !pending && readyDrafts ? '' : ' disabled'} title="Сначала будет создан точный запечатанный список до 200 писем">Подготовить пакет (${readyDrafts})</button><span class="hint">Показано: ${filtered.length} из ${items.length}</span></div>
      ${!state.support.loaded ? emptyState('Загрузите входящие после авторизации.') : !filtered.length ? emptyState('В этом фильтре писем нет.') : `<div class="support-list section">${filtered.map((item) => {
        const messageId = escapeHtml(item.id);
        const status = String(item.status || 'new');
        const when = item.receivedAtMs ? new Date(Number(item.receivedAtMs)).toLocaleString('ru-RU') : String(item.receivedAtIso || item.receivedAt || '');
        const gateState = String(item.replyGate?.state || '');
        return `<article class="support-message"><header><div><strong>${escapeHtml(item.subject || '(без темы)')}</strong><small>${escapeHtml(item.fromName || '')} &lt;${escapeHtml(item.fromEmail || 'неизвестный отправитель')}&gt; · ${escapeHtml(when)}</small></div><div class="actions"><span class="badge">${escapeHtml(item.mailCategory || 'не определено')}</span><span class="badge ${badgeClass(status)}">${escapeHtml(statusName(status))}</span>${gateState ? `<span class="badge ${gateState === 'delivery_unknown' ? 'danger' : ''}">${escapeHtml(gateState)}</span>` : ''}</div></header><div class="support-body">${escapeHtml(String(item.bodyText || '').slice(0, 8000)) || '<span class="muted">Пустое тело письма</span>'}</div>${status !== 'archived' ? `<div class="field section"><label for="support-reply-${messageId}">Ответ</label><textarea id="support-reply-${messageId}" class="support-reply" placeholder="Введите ответ или сгенерируйте черновик">${escapeHtml(item.draftReply || '')}</textarea></div><div class="actions section"><button class="button small" data-action="generate-support-reply" data-message-id="${messageId}" type="button"${state.authorized && !state.busy && !pending ? '' : ' disabled'}>Сгенерировать</button><button class="button small primary" data-action="prepare-support-reply" data-message-id="${messageId}" type="button"${state.authorized && !state.busy && !pending && status === 'new' && gateState !== 'delivery_unknown' && gateState !== 'dispatching' ? '' : ' disabled'} title="Сначала будет показан точный текст с подписью">Подготовить отправку</button></div>` : ''}${gateState === 'delivery_unknown' ? `<div class="notice danger section">Gmail мог принять письмо, но подтверждение потеряно. Автоматический повтор заблокирован; владелец должен проверить папку «Отправленные».</div><div class="actions section"><button class="button small" data-action="resolve-support-reply" data-operation-id="${escapeHtml(item.replyGate?.operationId || '')}" data-resolution="accepted" type="button"${['owner', 'admin'].includes(state.adminRole) && !state.busy ? '' : ' disabled'}>В отправленных: да</button><button class="button small" data-action="resolve-support-reply" data-operation-id="${escapeHtml(item.replyGate?.operationId || '')}" data-resolution="verified_not_sent" type="button"${['owner', 'admin'].includes(state.adminRole) && !state.busy ? '' : ' disabled'}>В отправленных: нет</button></div>` : ''}<div class="actions section"><button class="button ghost small" data-action="set-support-status" data-message-id="${messageId}" data-status="${status === 'archived' ? 'new' : 'archived'}" type="button"${state.authorized && !state.busy && !pending ? '' : ' disabled'}>${status === 'archived' ? 'Вернуть в новые' : 'В архив'}</button></div></article>`;
      }).join('')}</div>`}</div></section>
      <section class="card"><div class="card-header"><div><h2>${pending ? (pendingIsBatch ? 'Подтверждение пакета' : 'Подтверждение отправки') : 'Подпись'}</h2><p>${pending ? (pendingIsBatch ? 'Проверьте состав запечатанного пакета.' : 'Проверьте точного получателя и итоговый текст.') : 'Добавляется сервером после текста ответа.'}</p></div></div><div class="card-body">${pending ? (pendingIsBatch ? `<div class="confirmation-panel"><dl><dt>Писем</dt><dd>${Number(pending.count || 0)}</dd><dt>Пакет</dt><dd><code>${escapeHtml(pending.batchId || '')}</code></dd><dt>Манифест</dt><dd><code>${escapeHtml(pending.manifestHash || '')}</code></dd><dt>До</dt><dd>${escapeHtml(pending.confirmationExpiresAt ? new Date(pending.confirmationExpiresAt).toLocaleString('ru-RU') : '')}</dd><dt>Состояние</dt><dd><span class="badge ${pending.state === 'attention_required' ? 'danger' : ''}">${escapeHtml(pending.state || 'prepared')}</span></dd></dl><div class="batch-preview section">${(Array.isArray(pending.items) ? pending.items : []).map((item, index) => `<details${index < 2 ? ' open' : ''}><summary>${index + 1}. ${escapeHtml(item.payload?.to || '')} — ${escapeHtml(item.payload?.subject || '')}</summary><div class="support-body confirmation-text">${escapeHtml(item.payload?.finalText || '')}</div></details>`).join('')}</div><div class="notice section">Каждое письмо имеет отдельную защищённую операцию. При частичном сбое пакет продолжит только ещё не начатые операции и никогда автоматически не повторит неопределённую доставку.</div><div class="actions end section"><button class="button" data-action="cancel-support-reply-batch" type="button"${state.busy || pending.state !== 'prepared' ? ' disabled' : ''}>Отменить пакет</button><button class="button primary" data-action="dispatch-support-reply-batch" type="button"${state.busy || !['prepared', 'dispatching', 'attention_required'].includes(pending.state) ? ' disabled' : ''}>Подтвердить пакет</button></div></div>` : `<div class="confirmation-panel"><dl><dt>Кому</dt><dd>${escapeHtml(pending.payload?.to || '')}</dd><dt>Тема</dt><dd>${escapeHtml(pending.payload?.subject || '')}</dd><dt>Операция</dt><dd><code>${escapeHtml(pending.operationId || '')}</code></dd><dt>До</dt><dd>${escapeHtml(pending.confirmationExpiresAt ? new Date(pending.confirmationExpiresAt).toLocaleString('ru-RU') : '')}</dd><dt>Состояние</dt><dd><span class="badge ${pending.state === 'delivery_unknown' ? 'danger' : ''}">${escapeHtml(pending.state || 'prepared')}</span></dd></dl><div class="support-body confirmation-text">${escapeHtml(pending.payload?.finalText || '')}</div><div class="notice section">После подтверждения этот запечатанный текст уже не изменяется. Повторный клик не создаст вторую SMTP-отправку.</div><div class="actions end section"><button class="button" data-action="cancel-support-reply" type="button"${state.busy ? ' disabled' : ''}>Отменить</button><button class="button primary" data-action="dispatch-support-reply" type="button"${state.busy || pending.state !== 'prepared' ? ' disabled' : ''}>Подтвердить и отправить</button></div></div>`) : `<div class="field"><label for="support-signature">Подпись поддержки</label><textarea id="support-signature" maxlength="2000" placeholder="С уважением, команда Phraseman">${escapeHtml(state.support.signature || '')}</textarea></div><div class="hint">Ревизия подписи: ${Number(state.support.signatureRevision || 0)}</div><div class="actions end section"><button class="button primary" data-action="save-support-signature" type="button"${state.authorized && !state.busy ? '' : ' disabled'}>Сохранить подпись</button></div><div class="notice section">Одиночная и пакетная отправка защищены неизменяемыми операциями, явным предпросмотром и блокировкой автоматического повтора при неопределённом ответе Gmail.</div><a class="button section" href="../../admin/index.html#gmail-support" target="_blank" rel="noopener">Открыть прежний модуль</a>`}</div></section></div>`;
}

function renderAnalytics() {
  return renderAdminAnalytics({
    ...state.analytics,
    rangeDays: state.analytics.snapshot?.rangeDays ?? 28,
    authorized: can('money.read'),
    permissionDisabled: disabledWhenUnauthorized('money.read'),
    busy: state.busy,
  });
}

function renderAssetStudio() {
  if (!can('content.read')) return `${pageHeader(PAGES['asset-studio'], 'Контент / Asset Studio')}<div class="notice warning">У вашей роли нет разрешения content.read.</div>`;
  const items = state.assetStudio.items || [];
  const selected = items.find((item) => String(item.id) === String(state.assetStudio.selectedJobId)) || items[0] || null;
  const headerAction = `<div class="actions"><button class="button" data-action="load-asset-jobs" type="button"${disabledWhenUnauthorized('content.read')} title="Загрузить последние задания генерации ассетов">Обновить очередь</button><a class="button" href="../../admin/index.html#openai-budget" target="_blank" rel="noopener" title="Архивная сверка бюджета и старых OpenAI настроек">Старый бюджет</a></div>`;
  const rows = items.length ? items.map((job) => `<article class="list-row asset-job-row"><div><strong>${escapeHtml(job.title || 'Asset job')}</strong><small><code>${escapeHtml(job.id)}</code> · ${escapeHtml(job.kind || 'generic')} · ${escapeHtml(dateTime(job.updatedAtMs || job.createdAtMs))}</small><small>${escapeHtml(job.targetPath || 'без target path')} ${job.slotKey ? `· slot ${escapeHtml(job.slotKey)}` : ''}</small>${job.error ? `<small class="source-error">${escapeHtml(job.error)}</small>` : ''}</div><div class="actions"><span class="badge ${badgeClass(job.status)}">${escapeHtml(statusLabel(job.status))}</span><button class="button small" data-select-asset-job="${escapeHtml(job.id)}" type="button" title="Открыть предпросмотр задания">Открыть</button>${['draft', 'failed'].includes(String(job.status)) ? `<button class="button small primary" data-action="run-asset-job" data-asset-job-id="${escapeHtml(job.id)}" type="button"${disabledWhenUnauthorized('content.draft.write')} title="Запустить server-side генерацию изображений по этому черновику">Сгенерировать</button>` : ''}</div></article>`).join('') : emptyState('Создайте первый DALL-E job или обновите очередь.');
  const previews = selected?.results?.length ? `<div class="asset-preview-grid">${selected.results.map((result, index) => `<a class="asset-preview" href="${escapeHtml(result.previewUrl || '#')}" target="_blank" rel="noopener"><span>Вариант ${index + 1}</span>${result.previewUrl ? `<img src="${escapeHtml(result.previewUrl)}" alt="Generated asset preview ${index + 1}" loading="lazy">` : `<code>${escapeHtml(result.gsPath || '')}</code>`}</a>`).join('')}</div>` : emptyState('После генерации здесь появятся signed preview links из Storage.');
  return `${pageHeader(PAGES['asset-studio'], 'Контент / Asset Studio', headerAction)}
    <div class="notice">Generate → Review → Publish. OpenAI key stays on the server; в браузере создаётся только безопасный job. Публикация в bundled assets остаётся отдельным review шагом, чтобы не сломать asset hygiene.</div>
    <div class="columns section">
      <section class="card"><div class="card-header"><div><h2>Новый asset job</h2><p>Сформируйте черновик генерации: тип, слот, target path и промпт.</p></div></div><div class="card-body">
        <div class="fields">
          <div class="field"><label for="asset-kind">Тип ассета</label><select id="asset-kind"><option value="generic">Обычный ассет</option><option value="onboarding_icon">Onboarding icon</option><option value="quiz_level_card">Quiz level card</option><option value="background">Background</option></select></div>
          <div class="field"><label for="asset-count">Количество вариантов</label><input id="asset-count" type="number" min="1" max="4" value="1"></div>
          <div class="field"><label for="asset-title">Название</label><input id="asset-title" maxlength="120" placeholder="Например: Cinema easy card"></div>
          <div class="field"><label for="asset-slot">Slot key</label><input id="asset-slot" maxlength="120" placeholder="quiz-card-easy-cinema"></div>
          <div class="field full"><label for="asset-target">Target path</label><input id="asset-target" maxlength="240" placeholder="assets/images/quizzes/level_cards/quiz-card-easy-cinema.webp"></div>
          <div class="field"><label for="asset-quality">Качество</label><select id="asset-quality"><option value="low">low — быстрый черновик</option><option value="medium">medium — рабочий вариант</option><option value="high">high — дорогой финал</option></select></div>
          <div class="field"><label for="asset-size">Размер</label><select id="asset-size"><option value="1024x1024">1024×1024</option></select></div>
          <div class="field full"><label for="asset-prompt">Промпт</label><textarea id="asset-prompt" maxlength="4000" placeholder="Опишите ассет. Укажите: no text, no letters, app icon quality, transparent background если нужно."></textarea></div>
        </div>
        <div class="actions end section"><button class="button primary" data-action="create-asset-job" type="button"${disabledWhenUnauthorized('content.draft.write')} title="Создать черновик job без вызова OpenAI">Создать черновик</button></div>
      </div></section>
      <section class="card"><div class="card-header"><div><h2>Предпросмотр и результаты</h2><p>Сначала проверьте варианты, потом отдельно публикуйте в app assets.</p></div></div><div class="card-body">${selected ? `<div class="notice"><strong>${escapeHtml(selected.title)}</strong><br><code>${escapeHtml(selected.targetPath || 'без target path')}</code></div>${previews}` : previews}</div></section>
    </div>
    <section class="card section"><div class="card-header"><div><h2>Очередь генераций</h2><p>Последние server-side jobs с audit log и Storage output.</p></div></div><div class="card-body">${state.assetStudio.error ? `<div class="notice danger">${escapeHtml(state.assetStudio.error)}</div>` : ''}<div class="data-list">${rows}</div></div></section>`;
}

function numberValue(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function compactCount(label, value, tone = '') {
  return `<span class="briefing-count ${tone}"><strong>${numberValue(value)}</strong>${escapeHtml(label)}</span>`;
}

function buildPmDigestActions(facts, stateName) {
  const actions = [];
  const safetyOpen = numberValue(facts.safety?.open);
  const refunds = numberValue(facts.revenue?.refunds);
  const criticalErrors = numberValue(facts.appErrors?.critical);
  const openReports = numberValue(facts.reports?.open);
  const cancels = numberValue(facts.cancels?.total);
  const queueItems = Array.isArray(facts.queues) ? facts.queues : [];
  const ideas = numberValue(facts.ideas?.total);
  if (stateName === 'partial') actions.push({ tone: 'warning', title: 'Не принимать решение по пустым зонам', text: 'Сводка неполная: часть источников достигла лимита. Сначала проверьте полноту источников ниже.' });
  if (stateName === 'stale') actions.push({ tone: 'warning', title: 'Сформировать свежий digest', text: 'Сводка старше 36 часов. Перед решениями нажмите «Сформировать».' });
  if (safetyOpen) actions.push({ tone: 'danger', title: 'Разобрать safety-флаги', text: `${safetyOpen} открытых safety-событий. Это первый приоритет.` });
  if (refunds) actions.push({ tone: 'danger', title: 'Проверить возвраты', text: `${refunds} возвратов за окно отчёта. Найдите причину в Деньгах и репортах.` });
  if (criticalErrors) actions.push({ tone: 'danger', title: 'Исправить критические ошибки', text: `${criticalErrors} критических ошибок. Смотрите группы ошибок и affected feature.` });
  if (openReports) actions.push({ tone: 'warning', title: 'Разобрать открытые репорты', text: `${openReports} открытых репортов. Начните с тревожных комментариев и повторяющихся экранов.` });
  if (cancels) actions.push({ tone: 'warning', title: 'Посмотреть отмены Plus', text: `${cancels} отмен за окно отчёта. Особенно важны свободные причины пользователей.` });
  if (queueItems.length) actions.push({ tone: 'warning', title: 'Очистить рабочие очереди', text: `${queueItems.length} очередей требуют ручного разбора: репорты, письма, модерация или контент.` });
  if (ideas) actions.push({ tone: '', title: 'Просмотреть новые идеи', text: `${ideas} идей от пользователей. Заберите 1–3 хорошие в продуктовый backlog.` });
  if (!actions.length) actions.push({ tone: 'success', title: 'Спокойные сутки', text: 'Критичных действий по данным digest нет. Можно перейти к плановым продуктовым задачам.' });
  return actions.slice(0, 6);
}

function renderPmDigestActions(facts, stateName) {
  return `<div class="briefing-action-list">${buildPmDigestActions(facts, stateName).map((item, index) => `<article class="briefing-action ${item.tone || ''}"><span class="briefing-action-rank">${index + 1}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div></article>`).join('')}</div>`;
}

function renderPmDigestGrowthRevenue(facts) {
  return `<div class="briefing-count-grid">
    ${compactCount('новых пользователей', facts.growth?.newUsers, 'success')}
    ${compactCount('новых оплат', facts.revenue?.newPaying, numberValue(facts.revenue?.newPaying) ? 'success' : '')}
    ${compactCount('продлений', facts.revenue?.renewals)}
    ${compactCount('trial-событий', facts.revenue?.trials)}
    ${compactCount('возвратов', facts.revenue?.refunds, numberValue(facts.revenue?.refunds) ? 'danger' : '')}
    ${compactCount('paywall purchases', facts.revenue?.paywallPurchases)}
  </div>`;
}

function renderPmDigestRiskBoard(facts) {
  const errors = Array.isArray(facts.appErrors?.topGroups) ? facts.appErrors.topGroups : [];
  const samples = Array.isArray(facts.reports?.samples) ? facts.reports.samples : [];
  const rows = [
    { label: 'Safety', value: facts.safety?.open, note: 'открытые флаги', tone: numberValue(facts.safety?.open) ? 'danger' : 'success' },
    { label: 'Критические ошибки', value: facts.appErrors?.critical, note: errors[0] ? `${errors[0].context || 'ошибка'} · ${errors[0].message || ''}` : 'нет топ-группы', tone: numberValue(facts.appErrors?.critical) ? 'danger' : 'success' },
    { label: 'Открытые репорты', value: facts.reports?.open, note: samples[0] ? `${samples[0].screen || 'screen'} · ${samples[0].comment || ''}` : 'нет примеров', tone: numberValue(facts.reports?.open) ? 'warning' : 'success' },
    { label: 'Отмены Plus', value: facts.cancels?.total, note: Array.isArray(facts.cancels?.sampleTexts) && facts.cancels.sampleTexts[0] ? facts.cancels.sampleTexts[0] : 'нет свободного текста', tone: numberValue(facts.cancels?.total) ? 'warning' : 'success' },
  ];
  return `<div class="briefing-risk-board">${rows.map((row) => `<article><span class="badge ${row.tone}">${numberValue(row.value)}</span><div><strong>${escapeHtml(row.label)}</strong><p>${escapeHtml(row.note || '—')}</p></div></article>`).join('')}</div>`;
}

function renderPmDigestQueues(facts) {
  const queues = Array.isArray(facts.queues) ? facts.queues : [];
  if (!queues.length) return emptyState('Очередей для ручного разбора нет.');
  return `<div class="briefing-queue-list">${queues.slice(0, 8).map((q) => `<article><strong>${escapeHtml(q.name || 'Очередь')}</strong><span class="badge warning">${numberValue(q.total)}</span><small>${escapeHtml(q.note || 'Разобрать по приоритету.')}</small></article>`).join('')}</div>`;
}

function renderPmDigestIdeas(facts) {
  const items = Array.isArray(facts.ideas?.items) ? facts.ideas.items : [];
  if (!items.length) return emptyState('Новых пользовательских идей в digest нет.');
  return `<div class="briefing-idea-list">${items.slice(0, 3).map((idea) => `<article><strong>${escapeHtml(idea.title || '(без заголовка)')}</strong><p>${escapeHtml(idea.description || idea.benefit || 'Без описания.')}</p><small>${escapeHtml(idea.category || 'other')}${idea.userName ? ` · ${escapeHtml(idea.userName)}` : ''}</small></article>`).join('')}</div>`;
}

function renderBriefingHealth(health) {
  return `<div class="briefing-health">${health.length ? health.map((source) => `<div><strong>${escapeHtml(source.source || source.collection || 'источник')}</strong><span class="badge ${source.state === 'error' ? 'danger' : source.state === 'truncated' ? 'warning' : source.state === 'ready' ? 'success' : ''}">${escapeHtml(source.state || 'unknown')}</span><small>${Number(source.count || 0)} записей${source.error ? ` · ${escapeHtml(source.error)}` : ''}</small></div>`).join('') : emptyState('Старый документ не содержит диагностику источников.')}</div>`;
}

function renderDailyBriefing() {
  if (!can('briefing.read')) return `${pageHeader(PAGES['daily-briefing'], 'Обзор / Брифинг')}<div class="notice warning">У вашей роли нет разрешения briefing.read.</div>`;
  const digest = state.briefing.digest;
  const facts = digest?.facts || {};
  const health = Array.isArray(digest?.sourceHealth) ? digest.sourceHealth : [];
  const stateLabel = ({ ready: 'Полная', partial: 'Неполная', stale: 'Устарела', legacy: 'Старый формат', empty: 'Нет данных', loading: 'Загрузка' })[state.briefing.state] || state.briefing.state;
  const headerAction = `<div class="actions"><a class="button" href="#overview" title="Вернуться в обзор">К обзору</a><button class="button" data-action="load-daily-briefing" type="button"${disabledWhenUnauthorized('briefing.read')} title="Загрузить последнюю сохранённую сводку без запуска генерации">Обновить</button><button class="button primary" data-action="generate-daily-briefing" type="button"${disabledWhenUnauthorized('briefing.generate')} title="Собрать свежий Product Manager Digest за последние 24 часа">Сформировать digest</button></div>`;
  return `${pageHeader(PAGES['daily-briefing'], 'Обзор / Product Manager Digest', headerAction)}
    ${state.briefing.state === 'partial' || digest?.generationState === 'partial' ? '<div class="notice warning"><strong>Неполная сводка.</strong> Один или несколько источников достигли лимита. Это не считается «спокойными сутками».</div>' : ''}
    ${state.briefing.generationOutcome === 'preserved' ? '<div class="notice success"><strong>Полная сводка сохранена.</strong> Новый неполный прогон не заменил уже готовую сводку за этот день.</div>' : ''}
    ${state.briefing.state === 'stale' ? '<div class="notice warning">Сводка старше 36 часов. Сформируйте новую перед управленческими решениями.</div>' : ''}
    ${state.briefing.error ? `<div class="notice danger"><strong>Брифинг не загружен</strong><br>${escapeHtml(state.briefing.error)}</div>` : ''}
    <section class="metrics section">
      <article class="card metric"><label>Состояние</label><strong>${digest ? escapeHtml(stateLabel) : '—'}</strong><span class="badge ${badgeClass(state.briefing.state)}">${digest ? escapeHtml(digest.dayKey || '') : 'Не загружено'}</span></article>
      <article class="card metric"><label>Репорты</label><strong>${digest ? Number(facts.reports?.total || 0) : '—'}</strong><span class="badge">24 часа</span></article>
      <article class="card metric"><label>Критические ошибки</label><strong>${digest ? Number(facts.appErrors?.critical || 0) : '—'}</strong><span class="badge ${Number(facts.appErrors?.critical || 0) ? 'danger' : ''}">app_errors</span></article>
      <article class="card metric"><label>Новые пользователи</label><strong>${digest ? Number(facts.growth?.newUsers || 0) : '—'}</strong><span class="badge">сервер</span></article>
    </section>
    ${!digest ? `<section class="card section">${state.briefing.state === 'loading' ? '<div class="profile-loading" role="status" aria-live="polite"><span class="loading-bar"></span><span>Загружаю сохранённый Product Manager Digest…</span></div>' : emptyState('Загрузите последний digest или сформируйте новый.')}</section>` : `
      <div class="briefing-board section">
        <section class="card briefing-main"><div class="card-header"><div><h2>Сделать сегодня</h2><p>${escapeHtml(dateTime(digest.generatedAtMs))} · ${escapeHtml(digest.model || 'без модели')} · ${escapeHtml(digest.generatedBy || 'система')}</p></div><span class="badge ${badgeClass(state.briefing.state)}">${escapeHtml(stateLabel)}</span></div><div class="card-body">${renderPmDigestActions(facts, state.briefing.state)}</div></section>
        <section class="card"><div class="card-header"><div><h2>Рост и деньги</h2><p>События RevenueCat и paywall без выдумывания выручки.</p></div></div><div class="card-body">${renderPmDigestGrowthRevenue(facts)}</div></section>
        <section class="card"><div class="card-header"><div><h2>Риски продукта</h2><p>Safety, ошибки, репорты и отмены в одном месте.</p></div></div><div class="card-body">${renderPmDigestRiskBoard(facts)}</div></section>
        <section class="card"><div class="card-header"><div><h2>Короткая сводка</h2><p>Текстовый вывод генератора без markdown-шума.</p></div></div><div class="card-body"><div class="briefing-summary">${escapeHtml(digest.summary || 'Сводка пуста.')}</div></div></section>
        <section class="card"><div class="card-header"><div><h2>Очереди</h2><p>Где накопилась ручная работа.</p></div></div><div class="card-body">${renderPmDigestQueues(facts)}</div></section>
        <section class="card"><div class="card-header"><div><h2>Идеи пользователей</h2><p>Кандидаты для продуктового backlog.</p></div></div><div class="card-body">${renderPmDigestIdeas(facts)}</div></section>
      </div>
      <div class="columns section"><section class="card"><div class="card-header"><div><h2>Полнота источников</h2><p>Пустой источник, ошибка и обрезанная выборка различаются.</p></div><span class="badge">${health.length} источников</span></div><div class="card-body">${renderBriefingHealth(health)}</div></section>
      <section class="card"><div class="card-header"><div><h2>Проверяемые факты</h2><p>Сырой JSON оставлен для аудита и отладки, но не мешает работе.</p></div></div><div class="card-body"><details class="briefing-raw"><summary>Показать server facts JSON</summary><pre class="code-preview">${escapeHtml(JSON.stringify(facts, null, 2))}</pre></details></div></section></div>`}`;
}

const REPORT_SOURCE_LABELS = Object.freeze({
  all: 'Все источники', error_reports: 'Ошибки от пользователей', user_reports: 'Жалобы на пользователей', community_pack_reports: 'Жалобы на наборы', explain_report_entries: 'Репорты объяснений', app_errors: 'Ошибки приложения',
});
const REPORT_LANE_LABELS = Object.freeze({ open: 'Открыто', reviewed: 'Проверено', known: 'Известно', resolved: 'Решено', answered: 'Отвечено', escalated: 'Эскалация', archived: 'Архив' });
const REPORT_TRANSITIONS = Object.freeze({
  error_reports: { new: ['fixed', 'archived'], open: ['fixed', 'archived'], fixed: ['open', 'archived'], archived: ['open'] },
  user_reports: { new: ['reviewed', 'archived'], reviewed: ['new', 'archived'], archived: ['new'] },
  community_pack_reports: { new: ['reviewed'], reviewed: ['new'] },
  explain_report_entries: { new: ['done'], done: ['new'] },
  app_errors: { new: ['reviewed', 'known', 'fixed'], open: ['reviewed', 'known', 'fixed'], reviewed: ['open', 'known', 'fixed'], known: ['open', 'fixed'], fixed: ['open'] },
});

function reportStatusLabel(status) {
  return ({ new: 'Новое', open: 'Открыто', reviewed: 'Проверено', known: 'Известно', fixed: 'Исправлено', done: 'Готово', answered: 'Отвечено', archived: 'Архив' })[status] || status;
}

function renderReportQueue() {
  const reports = state.reports;
  const items = Array.isArray(reports.items) ? reports.items : [];
  const canChange = (item) => item.source === 'app_errors' ? can('diagnostics.status.write') : can('reports.status.write');
  const sourceOptions = Object.entries(REPORT_SOURCE_LABELS).map(([value, label]) => `<option value="${value}"${reports.source === value ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
  const laneOptions = `<option value="">Все состояния</option>${Object.entries(REPORT_LANE_LABELS).map(([value, label]) => `<option value="${value}"${reports.lane === value ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}`;
  const health = Array.isArray(reports.sourceHealth) ? reports.sourceHealth : [];
  return `${pageHeader(PAGES['report-center'], 'Пользователи / Репорты', '<a class="button" href="#users" title="Вернуться к пользователям">К пользователям</a>')}
    <div class="notice">Каждая запись сохраняет исходную коллекцию и исходный статус. Массовые, блокирующие и удаляющие действия остаются в защищённых рабочих модулях.</div>
    ${reports.error ? `<div class="notice danger section"><strong>Очередь не загружена</strong><br>${escapeHtml(reports.error)}</div>` : ''}
    <section class="card section"><div class="card-header"><div><h2>Фильтры очереди</h2><p>Сервер возвращает не более 100 записей за запрос.</p></div><span class="badge">reports.read</span></div><div class="card-body"><div class="report-filters">
      <div class="field"><label for="report-source-filter">Источник</label><select id="report-source-filter">${sourceOptions}</select></div>
      <div class="field"><label for="report-lane-filter">Рабочее состояние</label><select id="report-lane-filter">${laneOptions}</select></div>
      <div class="field"><label for="report-raw-status-filter">Исходный статус</label><input id="report-raw-status-filter" value="${escapeHtml(reports.rawStatus)}" placeholder="например, new"></div>
      <div class="field"><label for="report-uid-filter">UID пользователя</label><input id="report-uid-filter" value="${escapeHtml(reports.uid)}" placeholder="необязательно"></div>
      <div class="field"><label for="report-category-filter">Категория / серьёзность</label><input id="report-category-filter" value="${escapeHtml(reports.category)}" placeholder="например, critical"></div>
      <div class="field"><label for="report-days-filter">Период</label><select id="report-days-filter">${[1, 7, 30, 90].map((days) => `<option value="${days}"${Number(reports.sinceDays) === days ? ' selected' : ''}>${days} дн.</option>`).join('')}</select></div>
      <button class="button primary" data-action="load-report-queue" type="button"${disabledWhenUnauthorized('reports.read')} title="Загрузить ограниченную очередь с сервера">Загрузить</button>
    </div></div></section>
    ${health.length ? `<section class="report-health section" aria-label="Состояние источников">${health.map((source) => `<span class="badge ${source.state === 'error' ? 'danger' : source.state === 'truncated' ? 'warning' : source.state === 'ready' ? 'success' : ''}" title="${escapeHtml(source.error || '')}">${escapeHtml(REPORT_SOURCE_LABELS[source.source] || source.source)} · ${escapeHtml(source.state)} · ${Number(source.count || 0)}</span>`).join('')}</section>` : ''}
    <section class="card section"><div class="card-header"><div><h2>Рабочая очередь</h2><p>${reports.state === 'idle' ? 'Выберите фильтры и загрузите данные.' : `Показано ${items.length} записей.`}</p></div><span class="badge ${badgeClass(reports.state)}">${escapeHtml(reports.state)}</span></div><div class="card-body">
      ${reports.state === 'loading' ? '<div class="profile-loading" role="status" aria-live="polite"><span class="loading-bar"></span><span>Загружаю репорты из выбранных источников…</span></div>' : !items.length ? emptyState(reports.state === 'idle' ? 'Очередь ещё не загружена.' : ['partial', 'truncated'].includes(reports.state) ? 'В просмотренной части совпадений нет; источник ограничен, поэтому это не означает, что репортов нет вообще.' : 'По выбранным фильтрам репортов нет.') : `<div class="report-list">${items.map((item) => {
        const users = item.users || {};
        const context = item.context || {};
        const transitions = REPORT_TRANSITIONS[item.source]?.[item.rawStatus] || [];
        const reasonId = `report-reason-${String(item.source).replace(/[^A-Za-z0-9_-]/g, '-')}-${String(item.id).replace(/[^A-Za-z0-9_-]/g, '-')}`;
        const replyKey = `${item.source}:${item.id}`;
        const replyId = `report-reply-${String(item.source).replace(/[^A-Za-z0-9_-]/g, '-')}-${String(item.id).replace(/[^A-Za-z0-9_-]/g, '-')}`;
        const replyDraft = reports.replyDrafts?.[replyKey] || {};
        const replySupported = item.source !== 'app_errors' && item.rawStatus !== 'answered';
        const userButtons = [...new Set([users.primaryUid, users.reporterUid, users.reportedUid, users.authorUid].filter(Boolean))].map((uid) => `<button class="button ghost small" data-report-user-uid="${escapeHtml(uid)}" type="button" title="Открыть единый профиль ${escapeHtml(uid)}">Профиль · ${escapeHtml(String(uid).slice(0, 14))}</button>`).join('');
        return `<article class="report-card"><header><div><div class="report-source">${escapeHtml(REPORT_SOURCE_LABELS[item.source] || item.source)} · <code>${escapeHtml(item.id)}</code></div><h3>${escapeHtml(item.summary || '(без описания)')}</h3><small>${escapeHtml(item.category || context.feature || context.screen || 'без категории')} · ${escapeHtml(dateTime(item.createdAtMs))}</small></div><div class="actions"><span class="badge">${escapeHtml(item.source)}</span><span class="badge">raw: ${escapeHtml(item.rawStatus)}</span><span class="badge ${item.lane === 'resolved' || item.lane === 'answered' ? 'success' : item.lane === 'escalated' ? 'danger' : 'warning'}">${escapeHtml(REPORT_LANE_LABELS[item.lane] || item.lane)}</span></div></header>
          ${userButtons ? `<div class="actions report-users">${userButtons}</div>` : ''}
          <div class="report-context">${Object.entries(context).filter(([, value]) => value).map(([key, value]) => `<span><b>${escapeHtml(key)}:</b> ${escapeHtml(value)}</span>`).join('')}</div>
          ${canChange(item) && transitions.length ? `<div class="report-status-controls"><div class="field"><label for="${escapeHtml(reasonId)}">Причина изменения статуса</label><input id="${escapeHtml(reasonId)}" maxlength="500" placeholder="Что проверено и почему меняется статус"></div><div class="actions">${transitions.map((next) => `<button class="button small" data-report-source="${escapeHtml(item.source)}" data-report-id="${escapeHtml(item.id)}" data-report-current-status="${escapeHtml(item.rawStatus)}" data-report-next-status="${escapeHtml(next)}" data-report-reason-id="${escapeHtml(reasonId)}" type="button" title="Изменить статус с обязательным аудитом">${escapeHtml(reportStatusLabel(next))}</button>`).join('')}</div></div>` : ''}
          ${replySupported && (can('reports.reply.draft') || can('reports.reply.send')) ? `<details class="report-reply"><summary>Ответить пользователю</summary><div class="report-reply-grid">
            <div class="field"><label for="${replyId}-verdict">Результат проверки</label><select id="${replyId}-verdict"><option value="confirmed">Подтверждено</option><option value="rejected">Не подтвердилось</option></select></div>
            <div class="field"><label for="${replyId}-lang">Язык ответа</label><input id="${replyId}-lang" value="ru" maxlength="8"></div>
            <div class="field full"><label for="${replyId}-note">Что исправлено или почему отклонено</label><input id="${replyId}-note" maxlength="600" placeholder="Короткая фактическая заметка для черновика"></div>
            <div class="actions full"><button class="button small" data-action="draft-report-reply" data-report-source="${escapeHtml(item.source)}" data-report-id="${escapeHtml(item.id)}" data-report-reply-id="${escapeHtml(replyId)}" type="button"${disabledWhenUnauthorized('reports.reply.draft')} title="Создать редактируемый черновик ответа">Создать черновик</button></div>
            <div class="field full"><label for="${replyId}-title">Заголовок</label><input id="${replyId}-title" maxlength="120" value="${escapeHtml(replyDraft.title || '')}" placeholder="Спасибо за сообщение"></div>
            <div class="field full"><label for="${replyId}-body">Ответ</label><textarea id="${replyId}-body" maxlength="1200" placeholder="Проверьте и отредактируйте текст перед отправкой">${escapeHtml(replyDraft.body || '')}</textarea></div>
            <div class="field"><label for="${replyId}-shards">Награда осколками</label><input id="${replyId}-shards" type="number" min="0" max="100" value="0"></div>
            <div class="actions end"><button class="button primary" data-action="send-report-reply" data-report-source="${escapeHtml(item.source)}" data-report-id="${escapeHtml(item.id)}" data-report-reply-id="${escapeHtml(replyId)}" type="button"${disabledWhenUnauthorized('reports.reply.send')} title="Отправить только владельцу исходного репорта">Проверить и отправить</button></div>
          </div></details>` : ''}
          <footer><a class="button ghost small" href="../../admin/index.html#${encodeURIComponent(item.source === 'app_errors' ? 'app-health' : 'reports')}" target="_blank" rel="noopener" title="Открыть расширенный рабочий модуль">Расширенные действия</a></footer></article>`;
      }).join('')}</div>${reports.nextCursor ? '<div class="actions end section"><button class="button" data-action="load-report-next" type="button" title="Загрузить следующую страницу этого источника">Показать ещё</button></div>' : ''}`}
    </div></section>`;
}

function renderCurrentPage() {
  const target = document.getElementById('app');
  if (!target) return;
  const renderers = { overview: renderOverview, 'control-panel': renderControlPanel, application: renderApplication, users: renderUsers, money: renderMoney, content: renderContent, community: renderCommunity, diagnostics: renderDiagnostics, support: renderSupport, analytics: renderAnalytics, 'daily-briefing': renderDailyBriefing, 'report-center': renderReportQueue, 'asset-studio': renderAssetStudio };
  const capability = capabilityById(state.selectedCapabilityId);
  if (capability && capability.route === state.route && !capability.nativeRoute) {
    target.innerHTML = renderCapabilityWorkspace(capability);
  } else {
    const page = (renderers[state.route] ?? renderOverview)();
    target.innerHTML = `${page}${ADMIN_SECTIONS.some((section) => section.route === state.route) ? renderCapabilityHub(state.route) : ''}`;
  }
  renderNavigation();
  renderAuthStatus();
  setMessage(state.message, state.messageKind);
}

async function runBusy(operation, successMessage = '') {
  if (state.busy) return null;
  const busyAuthGeneration = state.authGeneration;
  state.busy = true;
  renderCurrentPage();
  try {
    const result = await operation();
    if (successMessage && result !== STALE_AUTH_RESULT && busyAuthGeneration === state.authGeneration) setMessage(successMessage, 'success');
    return result;
  } catch (error) {
    if (busyAuthGeneration === state.authGeneration) setMessage(`Ошибка: ${errorMessage(error)}`, 'danger');
    return null;
  } finally {
    state.busy = false;
    renderCurrentPage();
  }
}

async function loadJobs(selectJobId = '') {
  const result = await actions.listFactoryJobs({ limit: 100 });
  state.jobs = Array.isArray(result?.jobs) ? result.jobs : [];
  state.jobsLoaded = true;
  if (selectJobId) await loadJobDetail(selectJobId);
}

async function loadJobDetail(jobId) {
  const result = await actions.getFactoryJobDetail({ jobId });
  state.selectedJobId = jobId;
  state.detail = result;
  state.preview = null;
  const job = result?.job ?? {};
  state.workspace = await actions.getFactoryWorkspace({ studyTarget: job.studyTarget, learnerSourceLocale: job.learnerSourceLocale ?? job.sourceLocale, limit: 100 });
}

function maybeLoadOperationalBriefing() {
  if (!actions || !can('briefing.read')) return;
  if (!['overview', 'diagnostics'].includes(state.route)) return;
  if (state.briefing.state !== 'idle') return;
  void loadDailyBriefing(false)
    .then((result) => {
      if (result !== STALE_AUTH_RESULT) renderCurrentPage();
    })
    .catch(() => renderCurrentPage());
}

function applySupportListResult(result) {
  const serverPending = [
    ...(Array.isArray(result?.pendingBatches) ? result.pendingBatches : []),
    ...(Array.isArray(result?.pendingReplies) ? result.pendingReplies : []),
  ];
  const currentPending = state.support.pendingReply;
  const restoredPending = serverPending.find((candidate) => (
    currentPending?.batchId ? candidate.batchId === currentPending.batchId : candidate.operationId === currentPending?.operationId
  )) ?? serverPending[0] ?? null;
  state.support = {
    ...state.support,
    loaded: true,
    items: Array.isArray(result?.items) ? result.items : [],
    signature: String(result?.signature ?? ''),
    signatureRevision: Number(result?.signatureRevision ?? 0),
    pendingReply: restoredPending,
  };
}

function readCreateForm() {
  const studyTarget = String(document.getElementById('factory-target')?.value ?? '').trim();
  const sourceLocale = String(document.getElementById('factory-source')?.value ?? '').trim();
  const start = Number(document.getElementById('factory-start')?.value ?? 1);
  const count = Number(document.getElementById('factory-count')?.value ?? 1);
  const blueprintVersion = String(document.getElementById('factory-blueprint')?.value ?? '').trim();
  const surfaces = [...document.querySelectorAll('input[name="factory-surface"]:checked')].map((input) => input.value);
  if (!/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(studyTarget) || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(sourceLocale)) throw new Error('Проверьте коды языков.');
  if (!Number.isInteger(start) || !Number.isInteger(count) || start < 1 || count < 1 || start + count - 1 > 100) throw new Error('Диапазон уроков должен находиться между 1 и 100.');
  if (surfaces.length !== 6) throw new Error('Для публикуемого пакета выберите все шесть групп контента.');
  const jobId = id(`admin-${studyTarget}-${sourceLocale}`);
  return { projectId: `${studyTarget}-${sourceLocale}-course`, studyTarget, sourceLocale, lessonIds: Array.from({ length: count }, (_, index) => start + index), surfaces, idempotencyKey: jobId, blueprintVersion, requestId: jobId };
}

function parseRemoteConfigEditor(id, branch) {
  const raw = String(document.getElementById(id)?.value ?? '').trim();
  let value;
  try { value = JSON.parse(raw || '{}'); } catch { throw new Error(`Ветка «${branch}» содержит неверный JSON.`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Ветка «${branch}» должна быть объектом.`);
  for (const [key, item] of Object.entries(value)) {
    if (!key.trim()) throw new Error(`Ветка «${branch}» содержит пустой ключ.`);
    if (branch === 'bools' && typeof item !== 'boolean') throw new Error(`Значение bools.${key} должно быть true или false.`);
    if (branch === 'numbers' && (typeof item !== 'number' || !Number.isFinite(item))) throw new Error(`Значение numbers.${key} должно быть конечным числом.`);
    if (branch === 'texts' && typeof item !== 'string') throw new Error(`Значение texts.${key} должно быть строкой.`);
  }
  return value;
}

function remoteConfigChanges(nextConfig, options = {}) {
  const changes = [];
  for (const branch of ['bools', 'numbers', 'texts']) {
    if (!nextConfig[branch] || typeof nextConfig[branch] !== 'object') continue;
    const before = state.remoteConfig.config[branch] && typeof state.remoteConfig.config[branch] === 'object' ? state.remoteConfig.config[branch] : {};
    const after = nextConfig[branch];
    const keys = options.includeRemoved ? [...new Set([...Object.keys(before), ...Object.keys(after)])] : Object.keys(after);
    for (const key of keys.sort()) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changes.push(`${branch}.${key}: ${JSON.stringify(before[key]) ?? '∅'} → ${JSON.stringify(after[key]) ?? '∅'}`);
    }
  }
  return changes;
}

function readReleaseMaintenanceBoolean(id) {
  return String(document.getElementById(id)?.value ?? 'false') === 'true';
}

function readTextInput(id, max = 500) {
  return String(document.getElementById(id)?.value ?? '').trim().slice(0, max);
}

function requireSemverish(value, label) {
  if (value && !/^\d+(\.\d+){0,3}$/.test(value)) throw new Error(`${label}: используйте формат 1.2.3 или 81.`);
}

function requireHttpUrl(value, label) {
  if (!value) throw new Error(`${label}: укажите ссылку на стор.`);
  if (!/^https:\/\/[^\s]+$/i.test(value)) throw new Error(`${label}: используйте https-ссылку.`);
}

function requireAnyStoreUrl(platform, iosUrl, androidUrl) {
  if (platform === 'ios') return requireHttpUrl(iosUrl, 'App Store URL');
  if (platform === 'android') return requireHttpUrl(androidUrl, 'Google Play URL');
  requireHttpUrl(iosUrl, 'App Store URL');
  requireHttpUrl(androidUrl, 'Google Play URL');
}

function buildReleaseMaintenancePreview() {
  if (!state.remoteConfig?.config) throw new Error('Сначала загрузите текущую конфигурацию.');
  const rolloutRaw = readTextInput('release-force-rollout', 8);
  let rollout = 100;
  if (rolloutRaw !== '') {
    rollout = Math.round(Number(rolloutRaw));
    if (!Number.isFinite(rollout) || rollout < 0 || rollout > 100) throw new Error('Rollout force update должен быть числом 0–100.');
  }
  const minVersion = readTextInput('release-force-version', 40);
  const targetBuild = readTextInput('release-manual-target', 40);
  requireSemverish(minVersion, 'Минимальная версия');
  requireSemverish(targetBuild, 'Target build/version');
  const forceEnabled = readReleaseMaintenanceBoolean('release-force-enabled');
  const manualEnabled = readReleaseMaintenanceBoolean('release-manual-enabled');
  const manualCampaign = readTextInput('release-manual-campaign', 80);
  if (manualEnabled && !/^[A-Za-z0-9_.:-]{3,80}$/.test(manualCampaign)) throw new Error('Manual update: campaign_id 3–80 символов: A-Z, 0-9, _, ., :, -.');
  const manualPlatform = ['ios', 'android'].includes(String(document.getElementById('release-manual-platform')?.value ?? '')) ? String(document.getElementById('release-manual-platform')?.value ?? '') : '';
  const maintenanceBanner = readReleaseMaintenanceBoolean('release-maint-banner');
  const maintenanceBlock = readReleaseMaintenanceBoolean('release-maint-block');
  const maintenanceEnabled = maintenanceBanner || maintenanceBlock;
  const maintenanceCampaign = readTextInput('release-maint-campaign', 80);
  if (maintenanceEnabled && !/^[A-Za-z0-9_.:-]{3,80}$/.test(maintenanceCampaign)) throw new Error('Maintenance campaign_id 3–80 символов: A-Z, 0-9, _, ., :, -.');
  const iosUrl = readTextInput('release-store-ios', 400);
  const androidUrl = readTextInput('release-store-android', 400);
  if (forceEnabled && !minVersion) throw new Error('Force update: укажите минимальную версию.');
  if (forceEnabled) requireAnyStoreUrl('', iosUrl, androidUrl);
  const manualTitle = readTextInput('release-manual-title-ru', 160);
  const manualBody = readTextInput('release-manual-body-ru', 500);
  const manualCta = readTextInput('release-manual-cta-ru', 80);
  if (manualEnabled && !targetBuild) throw new Error('Manual update: укажите target build/version.');
  if (manualEnabled) requireAnyStoreUrl(manualPlatform, iosUrl, androidUrl);
  if (manualEnabled && (!manualTitle || !manualBody || !manualCta)) throw new Error('Manual update: заполните RU заголовок, текст и кнопку.');
  const maintenanceTextRu = readTextInput('release-maint-text-ru', 500);
  if (maintenanceEnabled && !maintenanceTextRu) throw new Error('Maintenance: заполните RU текст.');
  const reason = readTextInput('release-maintenance-reason', 500);
  if (!reason) throw new Error('Укажите причину публикации.');
  const nextConfig = {
    bools: {
      force_update_enabled: forceEnabled,
      manual_update_enabled: manualEnabled,
      maintenance_banner: maintenanceBanner,
      maintenance_block: maintenanceBlock,
    },
    numbers: { force_update_enabled_rollout_pct: rollout },
    texts: {
      min_app_version: minVersion,
      store_url_ios: iosUrl,
      store_url_android: androidUrl,
      manual_update_campaign_id: manualCampaign,
      manual_update_mode: String(document.getElementById('release-manual-mode')?.value ?? 'optional') === 'force' ? 'force' : 'optional',
      manual_update_platform: manualPlatform,
      manual_update_target_build: targetBuild,
      manual_update_title_ru: manualTitle,
      manual_update_body_ru: manualBody,
      manual_update_cta_ru: manualCta,
      maintenance_campaign_id: maintenanceCampaign,
      maintenance_ru: maintenanceTextRu,
    },
  };
  const version = Number(state.remoteConfig.config.version);
  if (Number.isInteger(version) && version > 0) nextConfig.version = version;
  const changes = remoteConfigChanges(nextConfig);
  if (maintenanceBlock) changes.unshift('Внимание: maintenance_block=true — приложение может стать недоступным для пользователей.');
  if (nextConfig.bools.force_update_enabled) changes.unshift(`Внимание: force_update_enabled=true — rollout ${rollout}% для устаревших сборок.`);
  const summary = [
    forceEnabled ? `Force update: min ${minVersion}, rollout ${rollout}%.` : 'Force update выключен.',
    manualEnabled ? `Manual modal: campaign ${manualCampaign}, target ${targetBuild}, platform ${manualPlatform || 'all'}.` : 'Manual update modal выключен.',
    maintenanceEnabled ? `Maintenance: ${maintenanceBlock ? 'hard block' : 'banner'}, campaign ${maintenanceCampaign}.` : 'Maintenance выключен.',
  ].join(' ');
  const details = [
    `Force audience: iOS и Android; rollout ${rollout}%; min version ${minVersion || 'не задана'}.`,
    `Manual modal audience: ${manualEnabled ? (manualPlatform ? `только ${manualPlatform}` : 'iOS и Android') : 'выключена'}.`,
    `Maintenance audience: ${maintenanceEnabled ? 'iOS и Android' : 'выключен'}.`,
    `Store destination: iOS ${iosUrl || 'не задан'}; Android ${androidUrl || 'не задан'}.`,
    `Manual modal: ${manualEnabled ? (nextConfig.texts.manual_update_mode === 'force' ? 'нельзя закрыть' : 'можно закрыть') : 'выключена'}.`,
    `Campaign ID: manual ${manualCampaign || 'не задан'}; maintenance ${maintenanceCampaign || 'не задан'}.`,
    `RU title: ${manualTitle || '—'}`,
    `RU body: ${manualBody || '—'}`,
    `RU CTA: ${manualCta || '—'}`,
    `Stop condition: нажать «Быстрый стоп» и опубликовать audited preview, либо восстановить значения из истории.`,
  ];
  return { nextConfig, reason, changes, source: 'release-maintenance', kind: 'standard', title: 'Предпросмотр релиза и обслуживания', summary, details };
}

function buildReleaseMaintenanceStopPreview() {
  if (!state.remoteConfig?.config) throw new Error('Сначала загрузите текущую конфигурацию.');
  const reason = readTextInput('release-maintenance-reason', 500);
  if (!reason) throw new Error('Укажите причину быстрого стопа.');
  const nextConfig = {
    bools: {
      force_update_enabled: false,
      manual_update_enabled: false,
      maintenance_banner: false,
      maintenance_block: false,
    },
    numbers: { force_update_enabled_rollout_pct: 0 },
  };
  const version = Number(state.remoteConfig.config.version);
  if (Number.isInteger(version) && version > 0) nextConfig.version = version;
  const changes = remoteConfigChanges(nextConfig);
  return {
    nextConfig,
    reason,
    changes,
    source: 'release-maintenance',
    kind: 'quick-stop',
    title: 'Предпросмотр быстрого стопа',
    summary: 'Выключает force update, manual update modal, maintenance banner и maintenance hard block через audited publish.',
    details: [
      'Аудитория: все пользователи, на которых сейчас действуют force/manual/maintenance flags.',
      'Store destination: не меняется.',
      'Manual modal: выключается.',
      'Stop condition: публикация этого preview сбрасывает опасные флаги; значения можно частично восстановить из истории.',
    ],
  };
}

function remoteConfigSnapshotPatch(snapshot) {
  const patch = {};
  for (const branch of ['bools', 'numbers', 'texts']) {
    if (snapshot?.[branch] && typeof snapshot[branch] === 'object') patch[branch] = { ...snapshot[branch] };
  }
  const version = Number(state.remoteConfig?.config?.version);
  if (Number.isInteger(version) && version > 0) patch.version = version;
  return patch;
}

function buildRemoteConfigRestorePreview(reference) {
  if (!state.remoteConfig?.config) throw new Error('Сначала загрузите текущую конфигурацию.');
  const history = Array.isArray(state.remoteConfig?.history) ? state.remoteConfig.history : [];
  const item = history.find((entry) => String(entry.id || entry.rollbackReference || '') === String(reference || ''));
  if (!item?.before || typeof item.before !== 'object') throw new Error('Для этой записи нет снимка before для восстановления.');
  const reason = readTextInput('remote-config-reason', 500);
  if (!reason) throw new Error('Укажите явную причину восстановления значений.');
  const nextConfig = remoteConfigSnapshotPatch(item.before);
  const changes = remoteConfigChanges(nextConfig);
  return {
    nextConfig,
    reason,
    changes,
    source: 'partial-restore-remote-config',
    reference: String(item.id || item.rollbackReference || ''),
    title: 'Предпросмотр восстановления значений Remote Config',
    summary: 'Восстанавливает значения из before-снимка через audited publish. Новые ключи, добавленные позже, не удаляются текущей merge-командой.',
  };
}

function ensureReleaseMaintenancePreviewIsFresh(preview) {
  if (preview?.source !== 'release-maintenance') return true;
  const current = preview.kind === 'quick-stop' ? buildReleaseMaintenanceStopPreview() : buildReleaseMaintenancePreview();
  const stale = JSON.stringify(current.nextConfig) !== JSON.stringify(preview.nextConfig) || current.reason !== preview.reason;
  if (!stale) return true;
  state.remoteConfigPreview = current;
  setMessage('Поля изменились после предпросмотра. Я обновил preview — проверьте его и нажмите публикацию ещё раз.', 'warning');
  renderCurrentPage();
  return false;
}

function ensureRemoteConfigPreviewIsFresh(preview) {
  if (preview?.source === 'release-maintenance') return ensureReleaseMaintenancePreviewIsFresh(preview);
  let current = null;
  if (preview?.source === 'partial-restore-remote-config') current = buildRemoteConfigRestorePreview(preview.reference);
  if (preview?.source === 'generic-remote-config') current = buildRemoteConfigPreview();
  if (!current) return true;
  const stale = JSON.stringify(current.nextConfig) !== JSON.stringify(preview.nextConfig) || current.reason !== preview.reason;
  if (!stale) return true;
  state.remoteConfigPreview = current;
  setMessage('Поля изменились после предпросмотра. Я обновил preview — проверьте его и нажмите публикацию ещё раз.', 'warning');
  renderCurrentPage();
  return false;
}

function buildRemoteConfigPreview() {
  if (!state.remoteConfig?.config) throw new Error('Сначала загрузите текущую конфигурацию.');
  const nextConfig = {
    bools: parseRemoteConfigEditor('remote-config-bools', 'bools'),
    numbers: parseRemoteConfigEditor('remote-config-numbers', 'numbers'),
    texts: parseRemoteConfigEditor('remote-config-texts', 'texts'),
  };
  const version = Number(state.remoteConfig.config.version);
  if (Number.isInteger(version) && version > 0) nextConfig.version = version;
  const reason = String(document.getElementById('remote-config-reason')?.value ?? '').trim();
  if (!reason) throw new Error('Укажите причину изменения.');
  const changes = remoteConfigChanges(nextConfig, { includeRemoved: true });
  return { nextConfig, reason, changes, source: 'generic-remote-config' };
}

function remoteConfigPublishQuestion(preview) {
  const bools = preview?.nextConfig?.bools && typeof preview.nextConfig.bools === 'object' ? preview.nextConfig.bools : {};
  const risks = [];
  if (bools.force_update_enabled === true) risks.push('force update заставит пользователей на старых версиях обновиться');
  if (bools.maintenance_block === true) risks.push('maintenance hard block может закрыть доступ к приложению');
  if (!risks.length) return `Опубликовать ${preview.changes.length} изменений конфигурации?`;
  return `Опубликовать ${preview.changes.length} изменений production-конфигурации?\n\nРиск: ${risks.join('; ')}.\n\nПроверьте audience, store links, campaign ID и stop condition перед подтверждением.`;
}

async function runGeneration() {
  const units = [...(state.detail?.units ?? [])].filter((unit) => unit.state !== 'succeeded');
  if (!units.length) return;
  state.generation = { total: units.length, done: 0, failed: 0 };
  renderCurrentPage();
  let cursor = 0;
  const worker = async () => {
    while (cursor < units.length) {
      const unit = units[cursor++];
      try {
        await actions.runFactoryUnit({ jobId: state.selectedJobId, surface: unit.surface, lessonId: Number(unit.lessonId) });
      } catch {
        state.generation.failed += 1;
      } finally {
        state.generation.done += 1;
        renderCurrentPage();
      }
    }
  };
  await Promise.all([worker(), worker()]);
  await loadJobDetail(state.selectedJobId);
}

async function loadAdminUserProfile(uid) {
  const authGeneration = state.authGeneration;
  try {
    const profile = await actions.getUserProfile({ uid });
    if (authGeneration !== state.authGeneration || !can('users.read')) return;
    state.users.profile = profile;
  } finally {
    if (authGeneration === state.authGeneration) state.users.profileLoading = false;
  }
}

async function loadDailyBriefing(generate = false) {
  const authGeneration = state.authGeneration;
  state.briefing = { ...state.briefing, state: 'loading', error: '' };
  renderCurrentPage();
  try {
    let generationResult = null;
    if (generate) {
      generationResult = await actions.generateDailyBriefing();
      if (!authStillValid(authGeneration, 'briefing.generate')) return STALE_AUTH_RESULT;
    }
    const result = await actions.getDailyBriefing();
    if (!authStillValid(authGeneration, 'briefing.read')) return STALE_AUTH_RESULT;
    state.briefing = {
      state: String(result?.state || (result?.digest ? 'ready' : 'empty')),
      digest: result?.digest || null,
      fetchedAtMs: Number(result?.fetchedAtMs || Date.now()),
      error: '',
      generationOutcome: generate ? (generationResult?.preservedExisting ? 'preserved' : 'generated') : '',
    };
    return generationResult || result;
  } catch (error) {
    if (!authStillValid(authGeneration, 'briefing.read')) return STALE_AUTH_RESULT;
    if (authStillValid(authGeneration, 'briefing.read')) {
      state.briefing = { ...state.briefing, state: 'error', error: errorMessage(error) };
    }
    throw error;
  }
}

async function loadReportQueue(append = false) {
  const authGeneration = state.authGeneration;
  if (!append) state.reports = { ...state.reports, state: 'loading', error: '' };
  renderCurrentPage();
  try {
    const result = await actions.listReportQueue({
      source: state.reports.source,
      lane: state.reports.lane,
      rawStatus: state.reports.rawStatus,
      uid: state.reports.uid,
      category: state.reports.category,
      sinceDays: Number(state.reports.sinceDays || 7),
      limit: 100,
      ...(append && state.reports.nextCursor ? { cursor: state.reports.nextCursor } : {}),
    });
    if (!authStillValid(authGeneration, 'reports.read')) return STALE_AUTH_RESULT;
    state.reports = {
      ...state.reports,
      state: String(result?.state || 'ready'),
      items: append ? [...new Map([...state.reports.items, ...(Array.isArray(result?.items) ? result.items : [])].map((item) => [`${item.source}:${item.id}`, item])).values()] : Array.isArray(result?.items) ? result.items : [],
      sourceHealth: Array.isArray(result?.sourceHealth) ? result.sourceHealth : [],
      nextCursor: String(result?.nextCursor || ''),
      error: '',
    };
  } catch (error) {
    if (!authStillValid(authGeneration, 'reports.read')) return STALE_AUTH_RESULT;
    if (authStillValid(authGeneration, 'reports.read')) {
      state.reports = { ...state.reports, state: 'error', error: errorMessage(error) };
    }
    throw error;
  }
}

async function loadAuditLog(append = false) {
  const authGeneration = state.authGeneration;
  if (!append) state.audit = { ...state.audit, state: 'loading', error: '', nextCursor: '' };
  renderCurrentPage();
  try {
    const result = await actions.listAuditLog({
      action: state.audit.action,
      query: state.audit.query,
      sinceDays: Number(state.audit.sinceDays || 7),
      limit: 100,
      ...(append && state.audit.nextCursor ? { cursor: state.audit.nextCursor } : {}),
    });
    if (!authStillValid(authGeneration, 'diagnostics.read')) return STALE_AUTH_RESULT;
    state.audit = {
      ...state.audit,
      state: String(result?.state || 'ready'),
      items: append ? [...state.audit.items, ...(Array.isArray(result?.items) ? result.items : [])] : Array.isArray(result?.items) ? result.items : [],
      nextCursor: String(result?.nextCursor || ''),
      fetchedAtMs: Number(result?.fetchedAtMs || Date.now()),
      error: '',
    };
  } catch (error) {
    if (!authStillValid(authGeneration, 'diagnostics.read')) return STALE_AUTH_RESULT;
    if (authStillValid(authGeneration, 'diagnostics.read')) state.audit = { ...state.audit, state: 'error', error: errorMessage(error) };
    throw error;
  }
}

async function loadOpsLog() {
  const authGeneration = state.authGeneration;
  state.ops = { ...state.ops, state: 'loading', error: '' };
  renderCurrentPage();
  try {
    const result = await actions.listOpsLog({
      source: state.ops.source,
      type: state.ops.type,
      query: state.ops.query,
      limit: 250,
    });
    if (!authStillValid(authGeneration, 'diagnostics.read')) return STALE_AUTH_RESULT;
    state.ops = {
      ...state.ops,
      state: String(result?.state || 'ready'),
      items: Array.isArray(result?.items) ? result.items : [],
      sourceHealth: Array.isArray(result?.sourceHealth) ? result.sourceHealth : [],
      kpis: result?.kpis && typeof result.kpis === 'object' ? result.kpis : null,
      copyText: String(result?.copyText || ''),
      fetchedAtMs: Number(result?.fetchedAtMs || Date.now()),
      error: '',
    };
  } catch (error) {
    if (!authStillValid(authGeneration, 'diagnostics.read')) return STALE_AUTH_RESULT;
    state.ops = { ...state.ops, state: 'error', error: errorMessage(error) };
    throw error;
  }
}

async function loadAssetJobs() {
  const authGeneration = state.authGeneration;
  state.assetStudio = { ...state.assetStudio, state: 'loading', error: '' };
  renderCurrentPage();
  try {
    const result = await actions.listAssetJobs({ limit: 25 });
    if (!authStillValid(authGeneration, 'content.read')) return STALE_AUTH_RESULT;
    const items = Array.isArray(result?.items) ? result.items : [];
    state.assetStudio = {
      ...state.assetStudio,
      state: items.length ? 'ready' : 'empty',
      items,
      selectedJobId: state.assetStudio.selectedJobId || String(items[0]?.id || ''),
      error: '',
    };
    return result;
  } catch (error) {
    if (!authStillValid(authGeneration, 'content.read')) return STALE_AUTH_RESULT;
    state.assetStudio = { ...state.assetStudio, state: 'error', error: errorMessage(error) };
    throw error;
  }
}

async function copyOpsSnapshot() {
  if (!state.ops.copyText) {
    setMessage('Сначала загрузите операционный журнал, потом скопируйте снимок.', 'warning');
    return;
  }
  try {
    await navigator.clipboard.writeText(state.ops.copyText);
    setMessage('Снимок операционного журнала скопирован.', 'success');
  } catch (error) {
    setMessage(`Не удалось скопировать снимок: ${errorMessage(error)}`, 'danger');
  }
}

async function updateReportStatus(target) {
  const source = String(target.getAttribute('data-report-source') || '');
  const reportId = String(target.getAttribute('data-report-id') || '');
  const expectedStatus = String(target.getAttribute('data-report-current-status') || '');
  const nextStatus = String(target.getAttribute('data-report-next-status') || '');
  const reasonId = String(target.getAttribute('data-report-reason-id') || '');
  const reason = String(document.getElementById(reasonId)?.value || '').trim();
  if (!reason) return setMessage('Укажите причину изменения статуса.', 'warning');
  if (!globalThis.confirm(`Изменить статус «${reportStatusLabel(expectedStatus)}» на «${reportStatusLabel(nextStatus)}»?`)) return;
  const authGeneration = state.authGeneration;
  const requiredPermission = source === 'app_errors' ? 'diagnostics.status.write' : 'reports.status.write';
  return runBusy(async () => {
    await actions.updateReportStatus({
      source,
      reportId,
      expectedStatus,
      nextStatus,
      reason,
      idempotencyKey: id('report-status'),
      requestId: id('report-status-request'),
    });
    if (!authStillValid(authGeneration, requiredPermission)) return STALE_AUTH_RESULT;
    const loaded = await loadReportQueue();
    return loaded === STALE_AUTH_RESULT ? STALE_AUTH_RESULT : true;
  }, 'Статус репорта изменён и записан в журнал.');
}

async function handleAction(action, target) {
  if (!actions) return;
  if (action === 'sign-in') return actions.signIn();
  if (action === 'sign-out') return actions.signOut();
  if (!state.authorized) return setMessage('Сначала войдите с ролью администратора.', 'warning');
  if (action === 'load-daily-briefing') return runBusy(() => loadDailyBriefing(false), 'Последняя сводка загружена.');
  if (action === 'generate-daily-briefing') return runBusy(async () => {
    const result = await loadDailyBriefing(true);
    if (result === STALE_AUTH_RESULT) return STALE_AUTH_RESULT;
    setMessage(result?.preservedExisting ? 'Полная сводка уже существовала; неполный прогон не был сохранён.' : 'Новая сводка сформирована и сохранена.', result?.preservedExisting ? 'warning' : 'success');
    return result;
  });
  if (action === 'load-report-queue') {
    state.reports = {
      ...state.reports,
      source: String(document.getElementById('report-source-filter')?.value || 'all'),
      lane: String(document.getElementById('report-lane-filter')?.value || ''),
      rawStatus: String(document.getElementById('report-raw-status-filter')?.value || '').trim().toLowerCase(),
      uid: String(document.getElementById('report-uid-filter')?.value || '').trim(),
      category: String(document.getElementById('report-category-filter')?.value || '').trim().toLowerCase(),
      sinceDays: Number(document.getElementById('report-days-filter')?.value || 7),
    };
    return runBusy(loadReportQueue, 'Очередь репортов загружена.');
  }
  if (action === 'load-report-next') {
    if (!state.reports.nextCursor) return;
    return runBusy(() => loadReportQueue(true), 'Следующая страница репортов загружена.');
  }
  if (action === 'load-audit-log') {
    state.audit = {
      ...state.audit,
      action: String(document.getElementById('audit-action-filter')?.value || ''),
      query: String(document.getElementById('audit-search-filter')?.value || '').trim(),
      sinceDays: Number(document.getElementById('audit-days-filter')?.value || 7),
    };
    return runBusy(loadAuditLog, 'Журнал действий загружен.');
  }
  if (action === 'load-audit-next') {
    if (!state.audit.nextCursor) return;
    return runBusy(() => loadAuditLog(true), 'Следующая страница журнала загружена.');
  }
  if (action === 'load-ops-log') {
    state.ops = {
      ...state.ops,
      source: String(document.getElementById('ops-source-filter')?.value || ''),
      type: String(document.getElementById('ops-type-filter')?.value || ''),
      query: String(document.getElementById('ops-search-filter')?.value || '').trim(),
    };
    return runBusy(loadOpsLog, 'Операционный журнал загружен.');
  }
  if (action === 'copy-ops-snapshot') return copyOpsSnapshot();
  if (action === 'draft-report-reply') {
    const source = String(target.getAttribute('data-report-source') || '');
    const reportId = String(target.getAttribute('data-report-id') || '');
    const replyId = String(target.getAttribute('data-report-reply-id') || '');
    const item = state.reports.items.find((candidate) => candidate.source === source && String(candidate.id) === reportId);
    if (!item) return setMessage('Репорт устарел. Обновите очередь.', 'warning');
    const verdict = String(document.getElementById(`${replyId}-verdict`)?.value || 'confirmed');
    const fixNote = String(document.getElementById(`${replyId}-note`)?.value || '').trim();
    const lang = String(document.getElementById(`${replyId}-lang`)?.value || 'ru').trim();
    const authGeneration = state.authGeneration;
    return runBusy(async () => {
      const draft = await actions.draftReportReply({
        reportText: JSON.stringify({ summary: item.summary, category: item.category, context: item.context }),
        verdict,
        fixNote,
        lang,
      });
      if (!authStillValid(authGeneration, 'reports.reply.draft')) return STALE_AUTH_RESULT;
      state.reports.replyDrafts = { ...state.reports.replyDrafts, [`${source}:${reportId}`]: { title: String(draft?.title || ''), body: String(draft?.body || '') } };
    }, 'Черновик создан. Проверьте и отредактируйте его перед отправкой.');
  }
  if (action === 'send-report-reply') {
    const source = String(target.getAttribute('data-report-source') || '');
    const reportId = String(target.getAttribute('data-report-id') || '');
    const replyId = String(target.getAttribute('data-report-reply-id') || '');
    const title = String(document.getElementById(`${replyId}-title`)?.value || '').trim();
    const body = String(document.getElementById(`${replyId}-body`)?.value || '').trim();
    const shards = Number(document.getElementById(`${replyId}-shards`)?.value || 0);
    if (!title || !body) return setMessage('Заполните заголовок и текст ответа.', 'warning');
    if (!Number.isInteger(shards) || shards < 0 || shards > 100) return setMessage('Награда должна быть целым числом от 0 до 100.', 'warning');
    if (!globalThis.confirm(`Отправить владельцу репорта?\n\n${title}\n\n${body}${shards ? `\n\nНаграда: ${shards}` : ''}`)) return;
    const authGeneration = state.authGeneration;
    return runBusy(async () => {
      await actions.sendReportReply({ reportCollection: source, reportId, title, body, shards });
      if (!authStillValid(authGeneration, 'reports.reply.send')) return STALE_AUTH_RESULT;
      const nextDrafts = { ...state.reports.replyDrafts };
      delete nextDrafts[`${source}:${reportId}`];
      state.reports.replyDrafts = nextDrafts;
      const loaded = await loadReportQueue();
      return loaded === STALE_AUTH_RESULT ? STALE_AUTH_RESULT : true;
    }, 'Ответ отправлен владельцу репорта; повторная отправка заблокирована сервером.');
  }
  if (action === 'search-admin-users') {
    const query = String(document.getElementById('user-search')?.value ?? '').trim();
    if (query.length < 2) return setMessage('Введите не менее двух символов.', 'warning');
    state.users.query = query;
    state.users.searchState = 'loading';
    state.users.searchErrors = [];
    const authGeneration = state.authGeneration;
    return runBusy(async () => {
      try {
        const result = await actions.searchUsers({ query, limit: 20 });
        if (authGeneration !== state.authGeneration || !can('users.read')) return;
        state.users.searched = true;
        state.users.items = Array.isArray(result?.items) ? result.items : [];
        state.users.profile = null;
        state.users.searchState = String(result?.state || 'ready');
        state.users.searchErrors = Array.isArray(result?.errors) ? result.errors.map(String).slice(0, 12) : [];
      } catch (error) {
        if (authGeneration === state.authGeneration && can('users.read')) {
          state.users.searched = true;
          state.users.searchState = 'error';
          state.users.searchErrors = [errorMessage(error)];
        }
        throw error;
      }
    }, 'Поиск завершён.');
  }
  if (action === 'reload-user-profile') {
    const uid = String(state.users.profile?.canonicalUid || '').trim();
    if (!uid) return;
    state.users.profileLoading = true;
    return runBusy(() => loadAdminUserProfile(uid), 'Профиль обновлён.');
  }
  if (action === 'load-remote-config') return runBusy(async () => { state.remoteConfig = await actions.getRemoteConfigWorkspace(); state.remoteConfigPreview = null; }, 'Конфигурация и история загружены.');
  if (action === 'preview-remote-config') {
    try { state.remoteConfigPreview = buildRemoteConfigPreview(); setMessage('Предпросмотр готов. Проверьте изменения перед публикацией.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
    renderCurrentPage();
    return;
  }
  if (action === 'preview-release-maintenance') {
    try { state.remoteConfigPreview = buildReleaseMaintenancePreview(); setMessage('Предпросмотр релиза и обслуживания готов.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
    renderCurrentPage();
    return;
  }
  if (action === 'preview-release-maintenance-stop') {
    try { state.remoteConfigPreview = buildReleaseMaintenanceStopPreview(); setMessage('Предпросмотр быстрого стопа готов.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
    renderCurrentPage();
    return;
  }
  if (action === 'preview-remote-config-restore') {
    try { state.remoteConfigPreview = buildRemoteConfigRestorePreview(target?.dataset?.rollbackReference); setMessage('Предпросмотр восстановления готов. Проверьте изменения перед публикацией.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
    renderCurrentPage();
    return;
  }
  if (action === 'discard-remote-config-preview') { state.remoteConfigPreview = null; renderCurrentPage(); return; }
  if (action === 'publish-remote-config') {
    const preview = state.remoteConfigPreview;
    if (!preview?.changes.length) return setMessage('Нет изменений для публикации.', 'warning');
    try {
      if (!ensureRemoteConfigPreviewIsFresh(preview)) return;
    } catch (error) {
      setMessage(errorMessage(error), 'warning');
      renderCurrentPage();
      return;
    }
    if (!globalThis.confirm(remoteConfigPublishQuestion(preview))) return;
    const expectedRevision = Number(state.remoteConfig?.config?.revision ?? 0);
    return runBusy(async () => {
      await actions.publishRemoteConfig({ nextConfig: preview.nextConfig, expectedRevision, idempotencyKey: id('remote-config'), reason: preview.reason, requestId: id('request-remote-config') });
      state.remoteConfig = await actions.getRemoteConfigWorkspace();
      state.remoteConfigPreview = null;
    }, 'Конфигурация опубликована и записана в журнал.');
  }
  if (action === 'load-factory-jobs') return runBusy(async () => { await loadJobs(); state.factoryStep = 2; }, 'Черновики загружены.');
  if (action === 'back-to-factory-jobs') { state.detail = null; state.preview = null; renderCurrentPage(); return; }
  if (action === 'create-factory-job') {
    let input;
    try { input = readCreateForm(); } catch (error) { setMessage(errorMessage(error), 'warning'); return; }
    return runBusy(async () => { const result = await actions.createFactoryJob(input); await loadJobs(result.jobId); state.factoryStep = 2; }, 'Черновик создан. Публикация не выполнялась.');
  }
  if (action === 'refresh-factory-detail') return runBusy(() => loadJobDetail(state.selectedJobId), 'Данные задания обновлены.');
  if (action === 'run-factory-generation') return runBusy(runGeneration, 'Генерация завершила текущий проход. Проверьте результат и ошибки.');
  if (action === 'approve-factory-job' || action === 'reject-factory-job') {
    const reason = String(document.getElementById('factory-review-reason')?.value ?? '').trim();
    if (!reason) return setMessage('Добавьте комментарий проверяющего.', 'warning');
    const status = action === 'approve-factory-job' ? 'approved' : 'rejected';
    const question = status === 'approved' ? 'Подтвердить, что содержимое и источники проверены?' : 'Отклонить пакет и вернуть его на доработку?';
    if (!globalThis.confirm(question)) return;
    return runBusy(async () => { await actions.reviewFactoryJob({ jobId: state.selectedJobId, status, reason, requestId: id(`review-${status}`) }); await loadJobDetail(state.selectedJobId); if (status === 'approved') state.factoryStep = 4; }, status === 'approved' ? 'Проверка одобрена.' : 'Пакет отклонён.');
  }
  if (action === 'seal-factory-release') {
    if (!globalThis.confirm('Создать неизменяемый релиз из одобренного пакета?')) return;
    return runBusy(async () => { await actions.sealFactoryRelease({ jobId: state.selectedJobId, idempotencyKey: id('seal'), requestId: id('request-seal') }); await loadJobDetail(state.selectedJobId); }, 'Релиз запечатан. Он ещё не активирован.');
  }
  if (action === 'activate-factory-release') {
    const reason = String(document.getElementById('factory-activation-reason')?.value ?? '').trim();
    if (!reason) return setMessage('Укажите причину активации.', 'warning');
    if (!globalThis.confirm('Сделать этот релиз активным для пользователей без обновления приложения?')) return;
    const releaseId = String(state.detail?.release?.releaseId ?? state.detail?.release?.id ?? '');
    return runBusy(async () => { await actions.activateFactoryRelease({ releaseId, expectedRevision: Number(state.detail?.catalog?.revision ?? 0), idempotencyKey: id('activate'), reason, requestId: id('request-activate') }); await loadJobDetail(state.selectedJobId); }, 'Релиз активирован.');
  }
  if (action === 'rollback-factory-release') {
    const targetReleaseId = String(document.getElementById('factory-rollback-target')?.value ?? '').trim();
    const reason = String(document.getElementById('factory-rollback-reason')?.value ?? '').trim();
    if (!targetReleaseId || !reason) return setMessage('Выберите релиз и укажите причину отката.', 'warning');
    if (!globalThis.confirm('Вернуть выбранный ранее активный релиз? Это изменит контент для пользователей.')) return;
    const catalog = state.detail?.catalog ?? {};
    return runBusy(async () => { await actions.rollbackFactoryRelease({ targetReleaseId, expectedCurrentReleaseId: String(catalog.activeRelease?.releaseId ?? ''), expectedRevision: Number(catalog.revision ?? 0), idempotencyKey: id('rollback'), reason, requestId: id('request-rollback') }); await loadJobDetail(state.selectedJobId); }, 'Откат выполнен.');
  }
  if (action === 'load-support') return runBusy(async () => { applySupportListResult(await actions.loadSupport({ limit: 500 })); }, 'Входящие загружены.');
  if (action === 'pull-support') return runBusy(async () => { const result = await actions.pullSupport({ requestId: id('support-pull') }); applySupportListResult(await actions.loadSupport({ limit: 500 })); setMessage(result?.parseFailed ? `Почта проверена: сохранено ${Number(result?.saved ?? 0)}, но одно или несколько писем не удалось разобрать. Они останутся в окне повторного чтения.` : `Почта проверена: найдено ${Number(result?.fetched ?? 0)}, сохранено ${Number(result?.saved ?? 0)}.`, result?.parseFailed ? 'warning' : 'success'); });
  if (action === 'generate-support-reply') {
    const messageDocId = String(target.getAttribute('data-message-id') ?? '').trim();
    return runBusy(async () => { const generated = await actions.generateSupportReply({ ...(messageDocId ? { messageDocId } : {}), requestId: id('support-draft') }); applySupportListResult(await actions.loadSupport({ limit: 500 })); setMessage(`Черновиков создано: ${Number(generated?.generated ?? 0)}${generated?.remaining ? `, осталось: ${Number(generated.remaining)}` : ''}.`, 'success'); });
  }
  if (action === 'prepare-support-reply-batch') {
    return runBusy(async () => {
      state.support.pendingReply = await actions.prepareSupportReplyBatch({ limit: 200, idempotencyKey: id('support-batch'), requestId: id('support-batch-request') });
    }, 'Пакет запечатан. Проверьте получателей и точные тексты.');
  }
  if (action === 'prepare-support-reply') {
    const messageDocId = String(target.getAttribute('data-message-id') ?? '').trim();
    const item = state.support.items.find((candidate) => String(candidate.id) === messageDocId);
    const replyText = String(document.getElementById(`support-reply-${messageDocId}`)?.value ?? '').trim();
    if (!replyText) return setMessage('Введите или сгенерируйте ответ.', 'warning');
    return runBusy(async () => {
      state.support.pendingReply = await actions.prepareSupportReply({
        messageDocId,
        replyText,
        expectedDraftRevision: Number(item?.draftRevision ?? 0),
        idempotencyKey: id('support-prepare'),
        requestId: id('support-prepare-request'),
      });
    }, 'Ответ запечатан. Проверьте предпросмотр и подтвердите отправку.');
  }
  if (action === 'dispatch-support-reply') {
    const pendingReply = state.support.pendingReply;
    if (!pendingReply) return setMessage('Нет подготовленного ответа.', 'warning');
    return runBusy(async () => {
      const result = await actions.dispatchSupportReply({ operationId: pendingReply.operationId, confirmationNonce: pendingReply.confirmationNonce, payloadHash: pendingReply.payloadHash });
      state.support.pendingReply = { ...pendingReply, ...result };
      const list = await actions.loadSupport({ limit: 500 });
      state.support = { ...state.support, loaded: true, items: Array.isArray(list?.items) ? list.items : [], signature: String(list?.signature ?? ''), signatureRevision: Number(list?.signatureRevision ?? 0), pendingReply: result?.state === 'accepted' ? null : state.support.pendingReply };
      if (result?.state === 'delivery_unknown') setMessage('Результат Gmail неизвестен. Повтор заблокирован; проверьте «Отправленные».', 'warning');
      else if (result?.state === 'accepted') setMessage('Ответ принят Gmail и отмечен как отправленный.', 'success');
      else setMessage(`Операция не отправлена: ${String(result?.state || 'неизвестное состояние')}.`, 'warning');
    });
  }
  if (action === 'cancel-support-reply') {
    const pendingReply = state.support.pendingReply;
    if (!pendingReply) return;
    return runBusy(async () => { await actions.cancelSupportReply({ operationId: pendingReply.operationId, confirmationNonce: pendingReply.confirmationNonce, requestId: id('support-cancel') }); state.support.pendingReply = null; }, 'Подготовленная отправка отменена.');
  }
  if (action === 'dispatch-support-reply-batch') {
    const pendingReply = state.support.pendingReply;
    if (!pendingReply?.batchId) return setMessage('Нет подготовленного пакета.', 'warning');
    return runBusy(async () => {
      const result = await actions.dispatchSupportReplyBatch({ batchId: pendingReply.batchId, confirmationNonce: pendingReply.confirmationNonce, manifestHash: pendingReply.manifestHash });
      state.support.pendingReply = { ...pendingReply, ...result };
      const list = await actions.loadSupport({ limit: 500 });
      state.support = { ...state.support, loaded: true, items: Array.isArray(list?.items) ? list.items : [], signature: String(list?.signature ?? ''), signatureRevision: Number(list?.signatureRevision ?? 0), pendingReply: result?.state === 'accepted' ? null : state.support.pendingReply };
      if (result?.state === 'accepted') setMessage(`Пакет отправлен: ${Number(result.accepted || 0)} писем принято Gmail.`, 'success');
      else if (result?.state === 'attention_required') setMessage(`Пакет требует проверки: принято ${Number(result.accepted || 0)}, неопределённо ${Number(result.attention || 0)}, ещё не начато ${Number(result.pending || 0)}.`, 'warning');
      else setMessage(`Пакет завершён частично: принято ${Number(result?.accepted || 0)}, не отправлено ${Number(result?.failed || 0)}.`, 'warning');
    });
  }
  if (action === 'cancel-support-reply-batch') {
    const pendingReply = state.support.pendingReply;
    if (!pendingReply?.batchId) return;
    return runBusy(async () => { await actions.cancelSupportReplyBatch({ batchId: pendingReply.batchId, confirmationNonce: pendingReply.confirmationNonce, requestId: id('support-batch-cancel') }); state.support.pendingReply = null; }, 'Пакет отменён; ни одна не начатая операция не будет отправлена.');
  }
  if (action === 'save-support-signature') {
    const signature = String(document.getElementById('support-signature')?.value ?? '').slice(0, 2000);
    return runBusy(async () => { const result = await actions.saveSupportSignature({ signature, requestId: id('support-signature') }); state.support.signature = String(result?.signature ?? signature); state.support.signatureRevision = Number(result?.signatureRevision ?? state.support.signatureRevision); }, 'Подпись сохранена.');
  }
  if (action === 'set-support-status') {
    const messageDocId = String(target.getAttribute('data-message-id') ?? '').trim();
    const status = String(target.getAttribute('data-status') ?? '').trim();
    return runBusy(async () => { await actions.setSupportStatus({ messageDocId, status, requestId: id('support-status') }); applySupportListResult(await actions.loadSupport({ limit: 500 })); }, status === 'archived' ? 'Письмо перемещено в архив.' : 'Письмо возвращено в новые.');
  }
  if (action === 'resolve-support-reply') {
    const operationId = String(target.getAttribute('data-operation-id') ?? '').trim();
    const resolution = String(target.getAttribute('data-resolution') ?? '').trim();
    const sent = resolution === 'accepted';
    if (!globalThis.confirm(sent ? 'Вы проверили папку «Отправленные» и нашли это письмо?' : 'Вы проверили папку «Отправленные» и уверены, что этого письма там нет?')) return;
    return runBusy(async () => {
      await actions.resolveSupportReplyDelivery({ operationId, resolution, reason: sent ? 'Verified in Gmail Sent folder' : 'Verified absent from Gmail Sent folder', requestId: id('support-reconcile') });
      applySupportListResult(await actions.loadSupport({ limit: 500 }));
    }, sent ? 'Доставка подтверждена вручную.' : 'Подтверждено: письмо не отправлено, можно подготовить новую операцию.');
  }
  if (action === 'load-analytics') {
    const rangeDays = Number(document.getElementById('analytics-range')?.value ?? 28);
    state.analytics = { status: 'loading', snapshot: state.analytics.snapshot, error: '', rangeDays };
    return runBusy(async () => {
      try {
        const snapshot = await actions.loadAnalytics({ rangeDays });
        state.analytics = { status: snapshot?.state || 'ready', snapshot, error: '', rangeDays };
      } catch (error) {
        state.analytics = { status: 'error', snapshot: state.analytics.snapshot, error: errorMessage(error), rangeDays };
        throw error;
      }
    }, 'Аналитика загружена.');
  }
  if (action === 'load-asset-jobs') return runBusy(loadAssetJobs, 'Очередь ассетов загружена.');
  if (action === 'create-asset-job') {
    const input = {
      kind: document.getElementById('asset-kind')?.value || 'generic',
      count: Number(document.getElementById('asset-count')?.value || 1),
      title: String(document.getElementById('asset-title')?.value || '').trim(),
      slotKey: String(document.getElementById('asset-slot')?.value || '').trim(),
      targetPath: String(document.getElementById('asset-target')?.value || '').trim(),
      quality: document.getElementById('asset-quality')?.value || 'low',
      size: document.getElementById('asset-size')?.value || '1024x1024',
      prompt: String(document.getElementById('asset-prompt')?.value || '').trim(),
    };
    if (!input.prompt) return setMessage('Введите промпт для DALL-E asset job.', 'warning');
    return runBusy(async () => {
      const result = await actions.createAssetJob(input);
      const job = result?.job || null;
      if (job?.id) state.assetStudio.selectedJobId = String(job.id);
      await loadAssetJobs();
    }, 'Черновик asset job создан.');
  }
  if (action === 'run-asset-job') {
    const jobId = String(target.getAttribute('data-asset-job-id') || state.assetStudio.selectedJobId || '').trim();
    if (!jobId) return setMessage('Выберите asset job для генерации.', 'warning');
    if (!globalThis.confirm('Запустить DALL-E генерацию на сервере? Это потратит OpenAI бюджет.')) return;
    return runBusy(async () => {
      const result = await actions.runAssetJob({ jobId });
      if (result?.job?.id) state.assetStudio.selectedJobId = String(result.job.id);
      await loadAssetJobs();
    }, 'DALL-E asset job сгенерирован и сохранён в Storage.');
  }
  if (action === 'load-openai-budget') return runBusy(async () => { state.budget = await actions.loadOpenAiBudgetDashboard(); }, 'Данные бюджета загружены.');
  void target;
}

async function handleClick(event) {
  const target = event.target instanceof Element ? event.target.closest('button, a') : null;
  if (!target) return;
  const route = target.getAttribute('data-route');
  if (route) {
    event.preventDefault();
    globalThis.location.hash = route;
    document.body.classList.remove('nav-open');
    return;
  }
  const step = Number(target.getAttribute('data-factory-step'));
  if (step >= 1 && step <= 4) {
    state.factoryStep = step;
    if (step === 4 && state.detail && actions && state.authorized) await runBusy(() => loadJobDetail(state.selectedJobId));
    else renderCurrentPage();
    return;
  }
  const jobId = target.getAttribute('data-select-job');
  if (jobId) return runBusy(async () => { await loadJobDetail(jobId); state.factoryStep = 2; }, 'Черновик открыт.');
  const assetJobId = target.getAttribute('data-select-asset-job');
  if (assetJobId) {
    state.assetStudio.selectedJobId = assetJobId;
    renderCurrentPage();
    return;
  }
  const unitId = target.getAttribute('data-preview-unit');
  if (unitId) return runBusy(async () => { state.preview = await actions.previewFactoryUnit({ unitId }); state.factoryStep = 3; }, 'Предпросмотр проверен и загружен.');
  const profileUid = target.getAttribute('data-user-profile-uid');
  if (profileUid) {
    state.users.profileLoading = true;
    return runBusy(() => loadAdminUserProfile(profileUid), 'Единый профиль загружен.');
  }
  const reportUserUid = target.getAttribute('data-report-user-uid');
  if (reportUserUid) {
    state.users.profileLoading = true;
    state.users.query = reportUserUid;
    globalThis.location.hash = 'users';
    return runBusy(() => loadAdminUserProfile(reportUserUid), 'Единый профиль загружен из репорта.');
  }
  const auditUserUid = target.getAttribute('data-audit-user-uid');
  if (auditUserUid) {
    state.users.profileLoading = true;
    state.users.query = auditUserUid;
    globalThis.location.hash = 'users';
    return runBusy(() => loadAdminUserProfile(auditUserUid), 'Единый профиль загружен из журнала.');
  }
  if (target.hasAttribute('data-report-next-status')) return updateReportStatus(target);
  const capabilityId = target.getAttribute('data-capability-id');
  if (capabilityId) {
    const capability = capabilityById(capabilityId);
    if (capability) globalThis.location.hash = capability.nativeRoute || `${capability.route}:${capability.id}`;
    return;
  }
  const supportFilter = target.getAttribute('data-support-filter');
  if (supportFilter) {
    state.support.filter = supportFilter;
    renderCurrentPage();
    return;
  }
  const action = target.getAttribute('data-action');
  if (action === 'close-capability') {
    globalThis.location.hash = state.route;
    return;
  }
  if (action) await handleAction(action, target);
}

export function setAdminActions(nextActions) {
  actions = nextActions;
  maybeLoadOperationalBriefing();
}

export function setAuthState(auth) {
  state.authGeneration += 1;
  state.authReady = true;
  state.authorized = auth.authorized === true;
  state.adminEmail = String(auth.email ?? '');
  state.adminRole = String(auth.role ?? '');
  if (!state.authorized) {
    state.detail = null;
    state.preview = null;
    state.message = '';
    state.briefing = { state: 'idle', digest: null, fetchedAtMs: 0, error: '', generationOutcome: '' };
    state.reports = { state: 'idle', items: [], sourceHealth: [], source: 'all', lane: '', rawStatus: '', uid: '', category: '', sinceDays: 7, nextCursor: '', error: '', replyDrafts: {} };
    state.audit = { state: 'idle', items: [], action: '', query: '', sinceDays: 7, nextCursor: '', fetchedAtMs: 0, error: '' };
    state.ops = { state: 'idle', items: [], sourceHealth: [], kpis: null, source: '', type: '', query: '', copyText: '', fetchedAtMs: 0, error: '' };
    state.assetStudio = { state: 'idle', items: [], selectedJobId: '', error: '' };
  }
  if (!state.authorized || !can('users.read')) {
    state.users = { query: '', searched: false, items: [], profile: null, profileLoading: false, searchState: 'idle', searchErrors: [] };
  }
  if (!state.authorized || !can('briefing.read')) state.briefing = { state: 'idle', digest: null, fetchedAtMs: 0, error: '', generationOutcome: '' };
  if (!state.authorized || !can('reports.read')) state.reports = { state: 'idle', items: [], sourceHealth: [], source: 'all', lane: '', rawStatus: '', uid: '', category: '', sinceDays: 7, nextCursor: '', error: '', replyDrafts: {} };
  if (!state.authorized || !can('money.read')) state.analytics = { status: 'idle', snapshot: null, error: '' };
  if (!state.authorized || !can('diagnostics.read')) state.audit = { state: 'idle', items: [], action: '', query: '', sinceDays: 7, nextCursor: '', fetchedAtMs: 0, error: '' };
  if (!state.authorized || !can('diagnostics.read')) state.ops = { state: 'idle', items: [], sourceHealth: [], kpis: null, source: '', type: '', query: '', copyText: '', fetchedAtMs: 0, error: '' };
  if (!state.authorized || !can('content.read')) state.assetStudio = { state: 'idle', items: [], selectedJobId: '', error: '' };
  renderCurrentPage();
  maybeLoadOperationalBriefing();
}

export function renderRoute(route, capabilityId = '') {
  state.route = PAGES[route] ? route : 'overview';
  const capability = capabilityById(capabilityId);
  state.selectedCapabilityId = capability?.route === state.route && !capability.nativeRoute ? capability.id : '';
  renderCurrentPage();
  maybeLoadOperationalBriefing();
}

export function initAdminUi() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.id === 'user-search') {
      event.preventDefault();
      document.querySelector('[data-action="search-admin-users"]')?.click();
    }
  });
  document.addEventListener('load', (event) => {
    const frame = event.target;
    if (!(frame instanceof HTMLIFrameElement) || frame.id !== 'legacy-module-frame') return;
    try {
      const doc = frame.contentDocument;
      if (!doc?.head) return;
      const style = doc.createElement('style');
      style.dataset.adminV2Bridge = 'true';
      style.textContent = '.tabs{display:none!important}body{margin-top:0!important}#admin-app{max-width:none!important}.admin-tab-search-wrap{display:none!important}';
      doc.head.appendChild(style);
    } catch { /* Same-origin on Firebase Hosting; a standalone deployment may keep its original chrome. */ }
  }, true);
  document.getElementById('mobile-nav-toggle')?.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  renderCurrentPage();
}

export function reportInitializationError(error) {
  state.authReady = true;
  setMessage(`Не удалось запустить админку: ${errorMessage(error)}`, 'danger');
  renderCurrentPage();
}
