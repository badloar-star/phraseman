import { capabilitiesForRoute, capabilityById, capabilityUrl } from './admin-capabilities.js';
import { completeAnalyticsLoad } from './admin-analytics-state.js';
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
  emails: { title: 'Email-контакты', description: 'Защищённый каталог адресов приложения и сайта с явной пригодностью для рассылок.' },
  'explain-cache': { title: 'Кэш объяснений', description: 'Проверка и безопасное обслуживание общих AI-объяснений без запуска генерации.' },
  compass: { title: 'Компас', description: 'Состояние, кэш и защищённые настройки учебного Компаса.' },
  analytics: { title: 'Аналитика', description: 'Серверные показатели с отдельным состоянием каждого источника.' },
  'daily-briefing': { title: 'Product Manager Digest', description: 'Утренний управленческий отчёт: рост, деньги, риски, очереди и действия на сегодня.' },
  'report-center': { title: 'Центр репортов', description: 'Единая ограниченная очередь ошибок, жалоб и контентных репортов без смешивания исходных статусов.' },
  'asset-studio': { title: 'DALL-E Asset Studio', description: 'Генерация изображений и ассетов через безопасный серверный процесс «Создать → Проверить → Опубликовать».' },
  campaigns: { title: 'Кампании', description: 'Сообщения внутри приложения, аудитории, опросы и история откликов.' },
});

const ADMIN_ROLE_PERMISSIONS = Object.freeze({
  owner: new Set(['users.read', 'money.read', 'money.manual_access.write', 'content.read', 'content.draft.write', 'content.publish', 'content.cache.read', 'content.cache.export', 'content.cache.reset', 'application.config.write', 'application.compass.read', 'application.compass.write', 'application.compass.approve', 'campaigns.read', 'campaigns.write', 'briefing.read', 'briefing.generate', 'reports.read', 'reports.status.write', 'reports.reply.draft', 'reports.reply.send', 'diagnostics.read', 'diagnostics.status.write', 'emails.directory.read', 'emails.directory.export', 'emails.directory.backfill', 'emails.campaigns.read', 'emails.campaigns.write', 'emails.campaigns.approve', 'emails.campaigns.cancel']),
  admin: new Set(['users.read', 'money.read', 'money.manual_access.write', 'content.read', 'content.draft.write', 'content.publish', 'content.cache.read', 'content.cache.export', 'content.cache.reset', 'application.config.write', 'application.compass.read', 'application.compass.write', 'application.compass.approve', 'campaigns.read', 'campaigns.write', 'briefing.read', 'briefing.generate', 'reports.read', 'reports.status.write', 'reports.reply.draft', 'reports.reply.send', 'diagnostics.read', 'diagnostics.status.write', 'emails.directory.read', 'emails.directory.export', 'emails.directory.backfill', 'emails.campaigns.read', 'emails.campaigns.write', 'emails.campaigns.approve', 'emails.campaigns.cancel']),
  content_editor: new Set(['content.read', 'content.draft.write', 'content.cache.read', 'content.cache.export', 'application.compass.read']),
  analyst: new Set(['users.read', 'money.read', 'content.read', 'content.cache.read', 'application.compass.read', 'campaigns.read', 'briefing.read', 'reports.read', 'diagnostics.read']),
  developer: new Set(['content.read', 'content.cache.read', 'application.compass.read', 'briefing.read', 'diagnostics.read', 'diagnostics.status.write']),
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

const PREMIUM_ACCESS_FEATURES = Object.freeze([
  { key: 'gate_lessons_premium', label: 'Уроки сверх бесплатных' },
  { key: 'gate_speaking_premium', label: 'Устно и произношение' },
  { key: 'gate_ai_dialog_premium', label: 'Theo / ИИ-диалоги' },
  { key: 'gate_smart_trainer_premium', label: 'Умный тренажёр' },
  { key: 'gate_trainer_modes_premium', label: 'Лимит тренажёра' },
  { key: 'gate_diagnosis_training_premium', label: 'Разбор ошибок' },
  { key: 'gate_personal_plan_premium', label: 'Личный план / Компас' },
  { key: 'gate_stats_premium', label: 'Статистика и инсайты' },
  { key: 'gate_flashcards_premium', label: 'Карточки сверх лимита' },
  { key: 'gate_themes_premium', label: 'Темы оформления' },
  { key: 'gate_avatar_auras_premium', label: 'Ауры аватара' },
  { key: 'gate_mastery_premium', label: 'Мастерство / повтор урока' },
  { key: 'gate_quizzes_premium', label: 'Квизы сверх лимита' },
  { key: 'gate_arena_premium', label: 'Арена сверх лимита' },
  { key: 'gate_energy_premium', label: 'Энергия' },
]);

const PREMIUM_ACCESS_LIMITS = Object.freeze([
  { key: 'free_lesson_limit', label: 'Бесплатных уроков', def: 8, min: 1, max: 32 },
  { key: 'free_daily_quiz_limit', label: 'Квизов в день', def: 3, min: 0, max: 999 },
  { key: 'free_trainer_sessions_per_day', label: 'Сессий тренажёра/день', def: 2, min: 0, max: 99 },
  { key: 'arena_daily_max', label: 'Матчей Арены/день', def: 5, min: 0, max: 999 },
  { key: 'max_energy', label: 'Максимум энергии', def: 5, min: 1, max: 99 },
]);

const LESSON_LOCK_COUNT = 32;
const APP_MESSAGE_LANGUAGES = Object.freeze([
  { key: 'ru', label: 'RU', suffix: 'Ru' }, { key: 'uk', label: 'UK', suffix: 'Uk' }, { key: 'es', label: 'ES', suffix: 'Es' }, { key: 'ptBr', label: 'PT-BR', suffix: 'PtBr' },
  { key: 'vi', label: 'VI', suffix: 'Vi' }, { key: 'id', label: 'ID', suffix: 'Id' }, { key: 'tr', label: 'TR', suffix: 'Tr' }, { key: 'pl', label: 'PL', suffix: 'Pl' },
]);

const state = {
  route: 'overview',
  authorized: false,
  authReady: false,
  adminEmail: '',
  adminUid: '',
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
  support: {
    loaded: false, loading: false, items: [], signature: '', signatureRevision: 0, filter: 'new', pendingReply: null,
    website: { loaded: false, loading: false, items: [], pendingReadId: '', error: '', truncated: false },
  },
  analytics: { status: 'idle', snapshot: null, error: '' },
  budget: null,
  selectedCapabilityId: '',
  remoteConfig: null,
  remoteConfigPreview: null,
  paywallAb: { status: 'idle', workspace: null, draft: null, preview: null, rangeDays: 28, includeDev: false, error: '' },
  users: { query: '', searched: false, items: [], profile: null, profileLoading: false, searchState: 'idle', searchErrors: [] },
  betaTesters: { state: 'idle', items: [], pending: null, error: '', truncated: false },
  briefing: { state: 'idle', digest: null, fetchedAtMs: 0, error: '', generationOutcome: '' },
  reports: { state: 'idle', items: [], sourceHealth: [], source: 'all', lane: '', rawStatus: '', uid: '', category: '', sinceDays: 7, nextCursor: '', error: '', replyDrafts: {} },
  audit: { state: 'idle', items: [], action: '', query: '', sinceDays: 7, nextCursor: '', fetchedAtMs: 0, error: '' },
  ops: { state: 'idle', items: [], sourceHealth: [], kpis: null, source: '', type: '', query: '', copyText: '', fetchedAtMs: 0, error: '' },
  assetStudio: { state: 'idle', items: [], selectedJobId: '', error: '' },
  promo: { state: 'idle', codes: [], redemptions: [], generatedCodes: [], preview: null, error: '' },
  campaigns: { state: 'idle', items: [], preview: null, draft: null, editingId: '', cleanupPreview: null, operationKeys: {}, error: '' },
  pushCampaigns: { state: 'idle', jobs: [], approvals: [], draft: { mode: 'uid' }, preview: null, operationKeys: {}, error: '' },
  emails: {
    state: 'idle', items: [], counts: null, filteredCount: 0, nextCursor: '', source: 'all', eligibility: 'all', suppression: 'all', query: '', error: '',
    campaignState: 'idle', campaigns: [], approvals: [], draft: { audienceKind: 'all' }, preview: null, operationKeys: {}, campaignError: '',
  },
  cache: { state: 'idle', source: 'choice_explanations', status: '', lang: '', query: '', items: [], summary: null, nextCursor: '', hasMore: false, error: '', resetPreview: null, operationKeys: {} },
  compass: { state: 'idle', workspace: null, draft: null, preview: null, approvals: [], approvalReason: '', operationKeys: {}, error: '', cacheItems: [], cacheSummary: null, cacheNextCursor: '', cacheStatus: '', cacheLang: '', cacheQuery: '' },
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
  const parentRoutes = { campaigns: 'application' };
  const activeRoute = parentRoutes[state.route] || state.route;
  nav.innerHTML = ADMIN_SECTIONS.map((section) => `<button class="nav-button" type="button" data-route="${section.route}" aria-current="${activeRoute === section.route ? 'page' : 'false'}" title="${escapeHtml(section.title)}">${ICONS[section.route]}<span>${escapeHtml(section.label)}</span></button>`).join('');
  const current = ADMIN_SECTIONS.find((section) => section.route === activeRoute);
  const page = PAGES[state.route] ?? PAGES.overview;
  const breadcrumbs = document.getElementById('breadcrumbs');
  if (breadcrumbs) breadcrumbs.innerHTML = current ? `Админка&nbsp;&nbsp;/&nbsp;&nbsp;${escapeHtml(current.label)}${state.route !== activeRoute ? `&nbsp;&nbsp;/&nbsp;&nbsp;<strong>${escapeHtml(page.title)}</strong>` : ''}` : `Админка&nbsp;&nbsp;/&nbsp;&nbsp;<strong>${escapeHtml(page.title)}</strong>`;
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
  { title: 'Промокоды', description: 'Создание пачек и собственных кодов, список кодов и активации перенесены в раздел «Деньги».', primary: '#money', primaryLabel: 'Открыть v2 промокоды', fallback: 'promo-codes', risk: 'Server callable', coverage: 'перенесено', guarded: true },
  { title: 'Промо-баннер', description: 'Текст, ссылка, срок, аудитория, платформа и безопасное выключение перенесены в раздел «Приложение».', primary: '#application', primaryLabel: 'Открыть v2 промо-баннер', fallback: 'control-panel', risk: 'Guarded Remote Config', coverage: 'перенесено', guarded: true },
  { title: 'Plus-доступ и уроки', description: 'Глобальные Plus-функции, free limits и поурочное открытие 1–32.', primary: '#application', primaryLabel: 'Открыть v2 Free / Plus', fallback: 'control-panel', risk: 'Guarded publish', coverage: '5 старых кнопок', guarded: true },
  { title: 'Недельные бонусы', description: 'Расписание бонусов, включение бонусов и дефолтный reset.', primary: '#remote-config', primaryLabel: 'Открыть v2 Remote Config', fallback: 'control-panel', risk: 'Content/economy', coverage: '3 старые кнопки', guarded: true },
  { title: 'ИИ и бюджеты', description: 'Theo model, daily caps, фоновые AI jobs, OpenAI budget и Asset Studio.', primary: '#asset-studio', primaryLabel: 'Открыть v2 Asset Studio', fallback: 'openai-budget', risk: 'AI budget', coverage: '5 старых кнопок', guarded: true },
  { title: 'Кампании и коммуникации', description: 'App messages и опросы создаются и включаются в v2; push, Paywall A/B, Plus survey и Telegram остаются следующими переносами.', primary: '#campaigns', primaryLabel: 'Открыть v2 кампании', fallback: 'app-messages', risk: 'App messages guarded; push pending', coverage: 'частично перенесено', guarded: true },
]);

function renderControlPanel() {
  const headerActions = `<a class="button" href="#overview" title="Вернуться к ежедневному обзору">К обзору</a><a class="button primary" href="#application" title="Открыть основной процесс настройки приложения">Открыть конфигурацию</a><a class="button ghost" href="../../admin/index.html#control-panel" target="_blank" rel="noopener" title="Открыть старый пульт только для аварийной сверки">Старый пульт</a>`;
  return `${pageHeader(PAGES['control-panel'], 'Обзор / Пульт', headerActions)}
    <div class="notice"><strong>Новый защищённый пульт.</strong> Здесь собраны все группы старого пульта управления. Действия, меняющие данные, ведут в процесс с предпросмотром и журналом либо во временно встроенный рабочий модуль до переноса конкретной формы.</div>
    <section class="card section"><div class="card-header"><div><h2>Карта старого пульта</h2><p>29 старых кнопок разложены по рабочим процессам, чтобы ничего не потерять и не смешивать рискованные действия.</p></div><span class="badge">control-panel</span></div>
      <div class="card-body"><div class="control-panel-workflows">${CONTROL_PANEL_WORKFLOWS.map((item) => `<article class="control-panel-workflow"><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p><div class="control-panel-tags"><span class="badge">${escapeHtml(item.coverage)}</span><span class="badge ${item.guarded ? 'success' : 'warning'}">${escapeHtml(item.risk)}</span></div></div><div class="actions"><a class="button ${item.guarded ? '' : 'ghost'} small" href="${escapeHtml(item.primary)}" title="${item.guarded ? 'Открыть основной защищённый процесс' : 'Открыть временно встроенный рабочий модуль'}: ${escapeHtml(item.title)}">${escapeHtml(item.primaryLabel)}</a><a class="button ghost small" href="../../admin/index.html#${encodeURIComponent(item.fallback)}" target="_blank" rel="noopener" title="Открыть старый рабочий модуль отдельно. Его действия могут менять рабочие данные.">Старый модуль отдельно</a></div></article>`).join('')}</div></div></section>
    <section class="card section"><div class="card-header"><div><h2>Правило переноса изменяющих действий</h2><p>Каждая опасная кнопка переезжает отдельно: предпросмотр, причина, ожидаемая ревизия, журнал действий и восстановление.</p></div></div><div class="card-body"><div class="control-panel-transfer-list"><span>Ручное и принудительное обновление — перенесено в защищённый процесс.</span><span>Ограничения уроков Plus — перенесены в управление доступом Free / Plus.</span><span>Задания ИИ частично покрыты диагностикой бюджета и Asset Studio; редактор конфигурации переносится отдельно.</span></div></div></section>`;
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
  const shouldMergePreview = ['release-maintenance', 'partial-restore-remote-config', 'premium-access', 'promo-banner'].includes(String(state.remoteConfigPreview?.source || ''));
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
  const releaseFormLocked = ['partial-restore-remote-config', 'premium-access', 'promo-banner'].includes(String(state.remoteConfigPreview?.source || ''));
  const releaseControlDisabled = releaseFormLocked || !can('application.config.write') || state.busy;
  const reason = releasePreview?.reason ?? '';
  const manualMode = String(remoteConfigValue('texts', 'manual_update_mode', 'optional')) === 'force' ? 'force' : 'optional';
  const manualPlatform = String(remoteConfigValue('texts', 'manual_update_platform', ''));
  const rollout = remoteConfigValue('numbers', 'force_update_enabled_rollout_pct', '');
  return `<section class="card section"><div class="card-header"><div><h2>Обновления и обслуживание</h2><p>Ручное обновление, принудительное обновление и обслуживание через единый процесс «Предпросмотр → Публикация».</p></div><span class="badge warning">Влияет на рабочее приложение</span></div><div class="card-body">
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
    <div class="actions end section">${releasePreview ? '<button class="button" data-action="discard-remote-config-preview" type="button" title="Отменить предпросмотр без изменения production">Изменить ещё</button>' : ''}<button class="button" data-action="preview-release-maintenance-stop" type="button"${releaseControlDisabled ? ' disabled' : ''} title="Подготовить audited preview для выключения force update, manual update и maintenance">Быстрый стоп</button><button class="button" data-action="preview-release-maintenance" type="button"${releaseControlDisabled ? ' disabled' : ''} title="Собрать безопасный предпросмотр только по ключам обновления и обслуживания">Предпросмотр релиза и обслуживания</button>${releasePreview?.changes?.length ? `<button class="button primary" data-action="publish-remote-config" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Опубликовать через серверную команду с ревизией, причиной и audit log">Опубликовать</button>` : ''}</div>
  </div></section>`;
}

function renderPremiumAccessWorkflow() {
  const premiumPreview = state.remoteConfigPreview?.source === 'premium-access' ? state.remoteConfigPreview : null;
  const source = String(state.remoteConfigPreview?.source || '');
  const premiumFormLocked = Boolean(source && source !== 'premium-access');
  const controlDisabled = premiumFormLocked || !can('application.config.write') || state.busy;
  const featureControls = PREMIUM_ACCESS_FEATURES.map((feature) => {
    const premium = remoteConfigValue('bools', feature.key, true) === true;
    return `<div class="field"><label for="premium-gate-${escapeHtml(feature.key)}">${escapeHtml(feature.label)}</label><select id="premium-gate-${escapeHtml(feature.key)}"${premiumFormLocked ? ' disabled' : ''}><option value="premium"${premium ? ' selected' : ''}>Plus</option><option value="free"${premium ? '' : ' selected'}>Free</option></select></div>`;
  }).join('');
  const limitControls = PREMIUM_ACCESS_LIMITS.map((limit) => {
    const value = remoteConfigValue('numbers', limit.key, limit.def);
    return `<div class="field"><label for="premium-limit-${escapeHtml(limit.key)}">${escapeHtml(limit.label)}</label><input id="premium-limit-${escapeHtml(limit.key)}" type="number" min="${limit.min}" max="${limit.max}" value="${escapeHtml(value)}"${premiumFormLocked ? ' disabled' : ''}><span class="hint">${limit.min}–${limit.max}</span></div>`;
  }).join('');
  const freeExtra = remoteConfigValue('texts', 'free_lessons_extra', '');
  const premiumExtra = remoteConfigValue('texts', 'premium_lessons_extra', '');
  return `<section class="card section"><div class="card-header"><div><h2>Free / Plus доступ и уроки</h2><p>Глобальные ограничения оплаты, лимиты бесплатного тарифа и исключения для уроков 1–32 через процесс «Предпросмотр → Публикация».</p></div><span class="badge warning">Влияет на монетизацию</span></div><div class="card-body">
    <div class="notice"><strong>Не выдаёт VIP пользователю.</strong> Это только глобальная конфигурация приложения. Ручная выдача Plus/VIP остаётся отдельным защищённым действием пользователя.</div>
    <div class="fields">${featureControls}</div>
    <div class="fields section">${limitControls}</div>
    <div class="fields section">
      <div class="field"><label for="premium-free-lessons-extra">Уроки дополнительно Free</label><input id="premium-free-lessons-extra" value="${escapeHtml(formatLessonList(freeExtra))}" placeholder="например 9, 10, 12"${premiumFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="premium-premium-lessons-extra">Уроки принудительно Plus</label><input id="premium-premium-lessons-extra" value="${escapeHtml(formatLessonList(premiumExtra))}" placeholder="например 2, 3"${premiumFormLocked ? ' disabled' : ''}></div>
      <div class="field full"><label for="premium-access-reason">Причина публикации</label><textarea id="premium-access-reason" maxlength="500" placeholder="Что меняется в доступе Free/Plus, кого затронет, как откатить"${premiumFormLocked ? ' disabled' : ''}>${escapeHtml(premiumPreview?.reason ?? '')}</textarea></div>
    </div>
    ${premiumFormLocked ? '<div class="notice warning section">Активен другой предпросмотр Remote Config. Завершите публикацию или нажмите «Изменить ещё», прежде чем менять Free/Plus доступ.</div>' : ''}
    ${premiumPreview ? `<div class="notice ${premiumPreview.changes?.length ? 'warning' : ''} section"><strong>Предпросмотр Free / Plus доступа</strong><br>${premiumPreview.summary ? `${escapeHtml(premiumPreview.summary)}<br>` : ''}${Array.isArray(premiumPreview.details) && premiumPreview.details.length ? `<div class="code-preview section">${premiumPreview.details.map((line) => escapeHtml(line)).join('<br>')}</div>` : ''}${premiumPreview.changes?.length ? premiumPreview.changes.map((change) => escapeHtml(change)).join('<br>') : 'Изменений нет.'}</div>` : ''}
    <div class="actions end section">${premiumPreview ? '<button class="button" data-action="discard-remote-config-preview" type="button" title="Отменить предпросмотр доступа без изменения production">Изменить ещё</button>' : ''}<button class="button" data-action="preview-premium-access" type="button"${controlDisabled ? ' disabled' : ''} title="Собрать предпросмотр изменения Free/Plus доступа без прямой записи">Предпросмотр Free / Plus</button>${premiumPreview?.changes?.length ? `<button class="button primary" data-action="publish-remote-config" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Опубликовать через серверную команду с ревизией, причиной и audit log">Опубликовать</button>` : ''}</div>
  </div></section>`;
}

function promoBannerDateValue(rawValue) {
  const raw = String(rawValue ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (!/^\d{10,}$/.test(raw)) return '';
  const date = new Date(Number(raw));
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderPromoBannerWorkflow() {
  const promoPreview = state.remoteConfigPreview?.source === 'promo-banner' ? state.remoteConfigPreview : null;
  const source = String(state.remoteConfigPreview?.source || '');
  const promoFormLocked = Boolean(source && source !== 'promo-banner');
  const controlDisabled = promoFormLocked || !can('application.config.write') || state.busy;
  const audience = String(remoteConfigValue('texts', 'promo_banner_audience', ''));
  const platform = String(remoteConfigValue('texts', 'promo_banner_platform', ''));
  return `<section class="card section"><div class="card-header"><div><h2>Промо-баннер</h2><p>Выгодное предложение в верхней части приложения: текст, ссылка, срок и аудитория без релиза приложения.</p></div><span class="badge warning">Массовая кампания</span></div><div class="card-body">
    <div class="notice"><strong>Баннер не меняет цену в сторе.</strong> Он только ведёт пользователя по указанной ссылке. Закрытие сохраняется по campaign ID; новый контент публикуйте с новым campaign ID. Агрегированный счётчик закрытий пока недоступен: текущее приложение хранит закрытие локально на устройстве.</div>
    <div class="fields">
      <div class="field"><label for="promo-banner-enabled">Показать верхний баннер</label><select id="promo-banner-enabled"${promoFormLocked ? ' disabled' : ''}><option value="false"${selectedBool(remoteConfigValue('bools', 'promo_banner_enabled', false), false)}>Выключен</option><option value="true"${selectedBool(remoteConfigValue('bools', 'promo_banner_enabled', false), true)}>Включён</option></select></div>
      <div class="field"><label for="promo-banner-campaign">Campaign ID промо-баннера</label><input id="promo-banner-campaign" maxlength="80" value="${escapeHtml(remoteConfigValue('texts', 'promo_banner_campaign_id', ''))}" placeholder="promo_2026_07_offer_a"${promoFormLocked ? ' disabled' : ''}><span class="hint">Не переиспользуйте ID закрытой кампании для нового содержания.</span></div>
      <div class="field full"><label for="promo-banner-text-ru">Текст RU</label><input id="promo-banner-text-ru" maxlength="240" value="${escapeHtml(remoteConfigValue('texts', 'promo_banner_text_ru', ''))}" placeholder="Специальное предложение — успейте воспользоваться"${promoFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="promo-banner-text-uk">Текст UK</label><input id="promo-banner-text-uk" maxlength="240" value="${escapeHtml(remoteConfigValue('texts', 'promo_banner_text_uk', ''))}" placeholder="Пусто = локализованный текст приложения"${promoFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="promo-banner-text-es">Текст ES</label><input id="promo-banner-text-es" maxlength="240" value="${escapeHtml(remoteConfigValue('texts', 'promo_banner_text_es', ''))}" placeholder="Пусто = локализованный текст приложения"${promoFormLocked ? ' disabled' : ''}></div>
      <div class="field full"><label for="promo-banner-url">Ссылка по нажатию</label><input id="promo-banner-url" maxlength="400" value="${escapeHtml(remoteConfigValue('texts', 'promo_banner_url', ''))}" placeholder="https://... или phraseman://... (пусто = без перехода)"${promoFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="promo-banner-until">Показывать до конца дня</label><input id="promo-banner-until" type="date" value="${escapeHtml(promoBannerDateValue(remoteConfigValue('texts', 'promo_banner_until', '')))}"${promoFormLocked ? ' disabled' : ''}><span class="hint">Пусто = бессрочно, пока баннер не выключен.</span></div>
      <div class="field"><label for="promo-banner-audience">Аудитория</label><select id="promo-banner-audience"${promoFormLocked ? ' disabled' : ''}><option value="all"${!audience || audience === 'all' ? ' selected' : ''}>Все пользователи</option><option value="free"${audience === 'free' ? ' selected' : ''}>Только Free</option><option value="premium"${audience === 'premium' ? ' selected' : ''}>Только Plus</option></select></div>
      <div class="field"><label for="promo-banner-platform">Платформа</label><select id="promo-banner-platform"${promoFormLocked ? ' disabled' : ''}><option value=""${platform ? '' : ' selected'}>iOS и Android</option><option value="ios"${platform === 'ios' ? ' selected' : ''}>Только iOS</option><option value="android"${platform === 'android' ? ' selected' : ''}>Только Android</option></select></div>
      <div class="field full"><label for="promo-banner-reason">Причина публикации</label><textarea id="promo-banner-reason" maxlength="500" placeholder="Что показываем, кому, до какого момента и как остановить"${promoFormLocked ? ' disabled' : ''}>${escapeHtml(promoPreview?.reason ?? '')}</textarea></div>
    </div>
    ${promoFormLocked ? '<div class="notice warning section">Активен другой предпросмотр Remote Config. Завершите его или отмените, прежде чем менять промо-баннер.</div>' : ''}
    ${promoPreview ? `<div class="notice ${promoPreview.changes?.length ? 'warning' : ''} section"><strong>${escapeHtml(promoPreview.title)}</strong><br>${escapeHtml(promoPreview.summary)}${Array.isArray(promoPreview.details) && promoPreview.details.length ? `<div class="code-preview section">${promoPreview.details.map((line) => escapeHtml(line)).join('<br>')}</div>` : ''}${promoPreview.changes?.length ? promoPreview.changes.map((change) => `<div>${escapeHtml(change)}</div>`).join('') : '<div>Изменений нет.</div>'}</div>` : ''}
    <div class="actions end section">${promoPreview ? '<button class="button" data-action="discard-remote-config-preview" type="button" title="Отменить предпросмотр без изменения production">Изменить ещё</button>' : ''}<button class="button" data-action="preview-promo-banner-stop" type="button"${controlDisabled ? ' disabled' : ''} title="Подготовить безопасное выключение баннера для всех пользователей">Выключить баннер</button><button class="button ${promoPreview ? '' : 'primary'}" data-action="preview-promo-banner" type="button"${controlDisabled ? ' disabled' : ''} title="Показать точные изменения баннера до публикации">Предпросмотр баннера</button>${promoPreview?.changes?.length ? `<button class="button primary" data-action="publish-remote-config" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Опубликовать баннер через серверную команду с audit log и возможностью восстановления">Опубликовать</button>` : ''}</div>
  </div></section>`;
}

function renderRemoteConfigHistory() {
  const history = Array.isArray(state.remoteConfig?.history) ? state.remoteConfig.history.slice(0, 12) : [];
  if (!history.length) return emptyState('История изменений пока пуста.');
  return `<div class="data-list">${history.map((item) => `<div class="list-row"><div><strong>${escapeHtml(item.action || 'Изменение конфигурации')}</strong><small>${escapeHtml(item.timestamp || item.at || '')} · ${escapeHtml(item.reason || item.by || 'Причина не указана')}</small>${item.rollbackReference ? `<small>Rollback reference: <code>${escapeHtml(item.rollbackReference)}</code></small>` : ''}</div><div class="actions"><span class="badge">ревизия ${Number(item.revision ?? 0)}</span>${item.before && typeof item.before === 'object' ? `<button class="button small" data-action="preview-remote-config-restore" data-rollback-reference="${escapeHtml(item.id || item.rollbackReference || '')}" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Подготовить предпросмотр восстановления значений из состояния до этой публикации. Новые ключи не удаляются.">Восстановить значения</button>` : ''}</div></div>`).join('')}</div>`;
}

const PAYWALL_AB_PRESETS = Object.freeze({
  off: { aPct: 0, bPct: 0, cPct: 0 },
  soft: { aPct: 10, bPct: 10, cPct: 80 },
  even: { aPct: 33, bPct: 33, cPct: 34 },
  atrium: { aPct: 0, bPct: 0, cPct: 100 },
});

function paywallAbDraft() {
  const config = state.paywallAb.draft ?? state.paywallAb.workspace?.config ?? {};
  return {
    aPct: Number(config.aPct ?? 0), bPct: Number(config.bPct ?? 0), cPct: Number(config.cPct ?? 0),
    salt: String(config.salt || 'v3'), ratingX10: Number(config.ratingX10 ?? 0), ratingsCount: Number(config.ratingsCount ?? 0),
  };
}

function paywallAbRate(purchases, shown) {
  return Number(shown) > 0 ? `${(Number(purchases || 0) / Number(shown) * 100).toFixed(1)}%` : '—';
}

function renderPaywallAbWorkflow() {
  const view = state.paywallAb;
  const workspace = view.workspace;
  const draft = paywallAbDraft();
  const analytics = workspace?.analytics ?? {};
  const variants = analytics.variants ?? {};
  const preview = view.preview;
  const locked = state.busy || !can('application.config.write') || !!preview;
  const rows = ['A', 'B', 'C', 'v1'].map((variant) => {
    const item = variants[variant] ?? {};
    return `<tr><td><strong>${escapeHtml(variant === 'v1' ? 'Архив v1' : `Вариант ${variant}`)}</strong></td><td>${Number(item.shown || 0).toLocaleString('ru-RU')}</td><td>${Number(item.trialStarted || 0).toLocaleString('ru-RU')}</td><td>${Number(item.purchaseCompleted || 0).toLocaleString('ru-RU')}</td><td>${escapeHtml(paywallAbRate(item.purchaseCompleted, item.shown))}</td></tr>`;
  }).join('');
  const history = Array.isArray(workspace?.history) ? workspace.history : [];
  return `<section class="card section" id="paywall-ab-workspace"><div class="card-header"><div><h2>A/B экрана оплаты</h2><p>Распределение трафика, оценка на экране и фактическая воронка в одном защищённом рабочем месте.</p></div><div class="actions"><span class="badge ${workspace ? 'success' : ''}">${workspace ? `ревизия ${Number(workspace.config?.revision || 0)}` : 'не загружено'}</span><button class="button" data-action="load-paywall-ab" type="button"${disabledWhenUnauthorized('application.config.write')} title="Загрузить настройки и агрегированную воронку с сервера">${workspace ? 'Обновить' : 'Загрузить'}</button></div></div><div class="card-body">
    ${view.error ? `<div class="notice danger" role="alert">${escapeHtml(view.error)}</div>` : ''}
    ${!workspace ? emptyState('Загрузите A/B-настройки. Браузер не читает и не записывает коллекции напрямую.') : `
      <div class="metrics"><article class="card metric"><label>События</label><strong>${Number(analytics.totalEvents || 0).toLocaleString('ru-RU')}</strong><span class="badge">${Number(workspace.rangeDays || view.rangeDays)} дней</span></article><article class="card metric"><label>Тестовые исключены</label><strong>${Number(analytics.excludedDevEvents || 0).toLocaleString('ru-RU')}</strong><span class="badge">dev</span></article><article class="card metric"><label>Источник</label><strong>${workspace.source?.truncated ? 'Частично' : 'Готов'}</strong><span class="badge ${workspace.source?.truncated ? 'warning' : 'success'}">${Number(workspace.source?.count || 0).toLocaleString('ru-RU')} строк</span></article></div>
      <div class="fields section"><div class="field full"><label>Быстрые сценарии</label><div class="actions"><button class="button small" data-action="set-paywall-ab-preset" data-preset="off" type="button"${locked ? ' disabled' : ''} title="Все пользователи увидят вариант C через fallback приложения">Без теста</button><button class="button small" data-action="set-paywall-ab-preset" data-preset="soft" type="button"${locked ? ' disabled' : ''} title="10% A, 10% B и 80% C">Осторожный 10/10/80</button><button class="button small" data-action="set-paywall-ab-preset" data-preset="even" type="button"${locked ? ' disabled' : ''} title="Почти равное распределение A/B/C">Поровну</button><button class="button small" data-action="set-paywall-ab-preset" data-preset="atrium" type="button"${locked ? ' disabled' : ''} title="Весь трафик направить в вариант C">Только C</button></div></div>
      <div class="field"><label for="paywall-ab-a">Вариант A, %</label><input id="paywall-ab-a" type="number" min="0" max="100" value="${draft.aPct}"${locked ? ' disabled' : ''}></div><div class="field"><label for="paywall-ab-b">Вариант B, %</label><input id="paywall-ab-b" type="number" min="0" max="100" value="${draft.bPct}"${locked ? ' disabled' : ''}></div><div class="field"><label for="paywall-ab-c">Вариант C, %</label><input id="paywall-ab-c" type="number" min="0" max="100" value="${draft.cPct}"${locked ? ' disabled' : ''}></div><div class="field"><label for="paywall-ab-rating">Оценка 1–5; 0 — скрыть</label><input id="paywall-ab-rating" type="number" min="0" max="5" step="0.1" value="${draft.ratingX10 ? (draft.ratingX10 / 10).toFixed(1) : '0'}"${locked ? ' disabled' : ''}></div><div class="field"><label for="paywall-ab-count">Количество оценок</label><input id="paywall-ab-count" type="number" min="0" step="1" value="${draft.ratingsCount}"${locked ? ' disabled' : ''}></div><div class="field full"><label for="paywall-ab-reason">Причина изменения</label><textarea id="paywall-ab-reason" maxlength="500" placeholder="Гипотеза, аудитория, срок проверки и условие остановки"${locked ? ' disabled' : ''}>${escapeHtml(preview?.reason || '')}</textarea></div></div>
      ${preview ? `<div class="notice warning section"><strong>Предпросмотр A/B</strong><br>${preview.changes.map(escapeHtml).join('<br>')}<br><small>Откат: восстановить значения из истории или опубликовать предыдущий сплит новой ревизией.</small></div>` : ''}
      <div class="actions end section">${preview ? '<button class="button" data-action="discard-paywall-ab-preview" type="button" title="Вернуться к редактированию без записи">Изменить ещё</button>' : ''}<button class="button ${preview ? '' : 'primary'}" data-action="preview-paywall-ab" type="button"${locked ? ' disabled' : ''} title="Проверить доли, оценку и причину без записи">Предпросмотр</button>${preview ? `<button class="button primary" data-action="publish-paywall-ab" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Опубликовать с контролем ревизии и записью аудита">Опубликовать</button>` : ''}</div>
      <div class="card-header section"><div><h3>Воронка</h3><p>Только агрегаты; персональные идентификаторы в браузер не передаются.</p></div><div class="actions"><label class="checkbox"><input id="paywall-ab-include-dev" type="checkbox"${view.includeDev ? ' checked' : ''}> включая мои/тестовые</label>${[7, 28, 90].map((days) => `<button class="button small${Number(workspace.rangeDays) === days ? ' primary' : ''}" data-action="load-paywall-ab-range" data-range="${days}" type="button" title="Загрузить агрегаты за ${days} дней">${days} дн.</button>`).join('')}</div></div>
      <div class="table-wrap"><table><thead><tr><th>Экран</th><th>Показы</th><th>Пробный период</th><th>Покупки</th><th>Конверсия</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="section"><h3>История изменений</h3>${history.length ? `<div class="data-list">${history.map((item) => `<div class="list-row"><div><strong>${escapeHtml(item.action || 'paywall_ab.publish')}</strong><small>${escapeHtml(item.timestamp || item.at || '')} · ${escapeHtml(item.reason || 'без причины')}</small></div><span class="badge">ревизия ${Number(item.revision || 0)}</span></div>`).join('')}</div>` : emptyState('История A/B пока пуста.')}</div>
    `}
  </div></section>`;
}

function readPaywallAbPreview() {
  if (!state.paywallAb.workspace) throw new Error('Сначала загрузите A/B-настройки.');
  const number = (id) => Number(document.getElementById(id)?.value ?? 0);
  const config = { aPct: Math.round(number('paywall-ab-a')), bPct: Math.round(number('paywall-ab-b')), cPct: Math.round(number('paywall-ab-c')), salt: String(state.paywallAb.workspace.config?.salt || 'v3'), ratingX10: Math.round(number('paywall-ab-rating') * 10), ratingsCount: Math.round(number('paywall-ab-count')) };
  if ([config.aPct, config.bPct, config.cPct].some((value) => !Number.isInteger(value) || value < 0 || value > 100) || config.aPct + config.bPct + config.cPct > 100) throw new Error('Доли A, B и C должны быть целыми от 0 до 100, а сумма — не больше 100%.');
  if (!Number.isInteger(config.ratingX10) || config.ratingX10 < 0 || config.ratingX10 > 50 || (config.ratingX10 > 0 && config.ratingX10 < 10)) throw new Error('Оценка должна быть 0 или от 1.0 до 5.0.');
  if (!Number.isInteger(config.ratingsCount) || config.ratingsCount < 0) throw new Error('Количество оценок должно быть целым неотрицательным числом.');
  const reason = String(document.getElementById('paywall-ab-reason')?.value ?? '').trim();
  if (!reason) throw new Error('Укажите причину изменения и условие остановки теста.');
  const before = state.paywallAb.workspace.config ?? {};
  const labels = { aPct: 'A, %', bPct: 'B, %', cPct: 'C, %', ratingX10: 'оценка ×10', ratingsCount: 'число оценок' };
  const changes = Object.keys(labels).filter((key) => Number(before[key] ?? 0) !== Number(config[key])).map((key) => `${labels[key]}: ${Number(before[key] ?? 0)} → ${Number(config[key])}`);
  return { config, reason, changes };
}

function renderApplication() {
  const workspace = state.remoteConfig;
  const config = workspace?.config ?? {};
  const releasePreviewActive = state.remoteConfigPreview?.source === 'release-maintenance';
  const restorePreviewActive = state.remoteConfigPreview?.source === 'partial-restore-remote-config';
  const premiumPreviewActive = state.remoteConfigPreview?.source === 'premium-access';
  const promoPreviewActive = state.remoteConfigPreview?.source === 'promo-banner';
  const editorLocked = releasePreviewActive || restorePreviewActive || premiumPreviewActive || promoPreviewActive;
  const preview = releasePreviewActive || premiumPreviewActive || promoPreviewActive ? null : state.remoteConfigPreview;
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
      ${renderReleaseMaintenanceWorkflow() + renderPromoBannerWorkflow()}
      ${renderPremiumAccessWorkflow()}
      <section class="card section"><div class="card-header"><div><h2>Редактор конфигурации</h2><p>Формат JSON позволяет сохранить все существующие и новые ключи. Тип каждого значения проверяется до публикации и повторно на сервере.</p></div><span class="badge">ревизия ${Number(config.revision ?? 0)}</span></div><div class="card-body">
        <div class="fields">
          <div class="field"><label for="remote-config-bools">Переключатели · только true/false</label><textarea id="remote-config-bools" class="mono config-editor" spellcheck="false"${editorLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigBranch('bools'))}</textarea></div>
          <div class="field"><label for="remote-config-numbers">Числа · только конечные числа</label><textarea id="remote-config-numbers" class="mono config-editor" spellcheck="false"${editorLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigBranch('numbers'))}</textarea></div>
          <div class="field full"><label for="remote-config-texts">Тексты · только строки</label><textarea id="remote-config-texts" class="mono config-editor" spellcheck="false"${editorLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigBranch('texts'))}</textarea></div>
          <div class="field full"><label for="remote-config-reason">Причина изменения</label><textarea id="remote-config-reason" maxlength="500" placeholder="Что меняется, зачем и кто проверил"${editorLocked ? ' disabled' : ''}>${escapeHtml(preview?.reason ?? '')}</textarea></div>
        </div>
        ${releasePreviewActive ? '<div class="notice warning section">Активен предпросмотр релиза и обслуживания выше. Завершите публикацию или нажмите «Изменить ещё», прежде чем использовать общий JSON-редактор.</div>' : ''}
        ${restorePreviewActive ? '<div class="notice warning section">Активен предпросмотр восстановления значений. JSON-редактор заблокирован, чтобы не отправить устаревший snapshot; нажмите «Изменить ещё», если нужно править вручную.</div>' : ''}
        ${premiumPreviewActive ? '<div class="notice warning section">Активен предпросмотр Free / Plus доступа выше. JSON-редактор заблокирован, чтобы не отправить устаревший snapshot.</div>' : ''}
        ${promoPreviewActive ? '<div class="notice warning section">Активен предпросмотр промо-баннера выше. JSON-редактор заблокирован, чтобы не отправить устаревший snapshot.</div>' : ''}
        ${preview ? `<div class="notice ${preview.changes.length ? 'warning' : ''} section"><strong>${escapeHtml(preview.title || 'Предпросмотр изменений')}</strong><br>${preview.summary ? `${escapeHtml(preview.summary)}<br>` : ''}${preview.changes.length ? preview.changes.map((change) => escapeHtml(change)).join('<br>') : 'Значения не отличаются от текущей ревизии.'}</div>` : ''}
        <div class="actions end section">${preview ? '<button class="button" data-action="discard-remote-config-preview" type="button" title="Отменить предпросмотр без изменения production">Изменить ещё</button>' : ''}<button class="button ${preview || editorLocked ? '' : 'primary'}" data-action="preview-remote-config" type="button"${can('application.config.write') && !state.busy && !editorLocked ? '' : ' disabled'} title="Показать точные изменения конфигурации до публикации">Предпросмотр</button>${preview?.changes.length ? `<button class="button primary" data-action="publish-remote-config" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Опубликовать подтверждённый предпросмотр через серверную команду">Опубликовать</button>` : ''}</div>
      </div></section>
      <section class="card section"><div class="card-header"><div><h2>Последние изменения</h2><p>Серверный журнал с причиной и ревизией.</p></div></div><div class="card-body">${renderRemoteConfigHistory()}</div></section>
    `}
    ${renderPaywallAbWorkflow()}`;
}

function appMessageDraftValue(draft, language, field, fallback = '') {
  return draft?.translations?.[language]?.[field] ?? fallback;
}

function renderAppMessageTranslations(draft, locked) {
  return APP_MESSAGE_LANGUAGES.filter((language) => language.key !== 'ru').map((language) => {
    const options = Array.isArray(appMessageDraftValue(draft, language.key, 'pollOptions', [])) ? appMessageDraftValue(draft, language.key, 'pollOptions', []).join('\n') : '';
    return `<div class="fields section"><div class="field"><label for="app-message-title-${language.key}">Тема ${language.label}</label><input id="app-message-title-${language.key}" maxlength="160" value="${escapeHtml(appMessageDraftValue(draft, language.key, 'title'))}" placeholder="Пусто = RU"${locked ? ' disabled' : ''}></div><div class="field"><label for="app-message-body-${language.key}">Текст ${language.label}</label><textarea id="app-message-body-${language.key}" rows="2" maxlength="2000" placeholder="Пусто = RU"${locked ? ' disabled' : ''}>${escapeHtml(appMessageDraftValue(draft, language.key, 'body'))}</textarea></div><div class="field"><label for="app-message-poll-question-${language.key}">Вопрос опроса ${language.label}</label><input id="app-message-poll-question-${language.key}" maxlength="300" value="${escapeHtml(appMessageDraftValue(draft, language.key, 'pollQuestion'))}" placeholder="Пусто = RU"${locked ? ' disabled' : ''}></div><div class="field"><label for="app-message-poll-options-${language.key}">Варианты ${language.label}, по строке</label><textarea id="app-message-poll-options-${language.key}" rows="3" maxlength="1000" placeholder="Пусто = варианты RU"${locked ? ' disabled' : ''}>${escapeHtml(options)}</textarea></div></div>`;
  }).join('');
}

function appMessageItemPayload(item) {
  const translations = {};
  for (const language of APP_MESSAGE_LANGUAGES) {
    translations[language.key] = {
      title: String(item?.[`title${language.suffix}`] || ''),
      body: String(item?.[`message${language.suffix}`] || ''),
      pollQuestion: String(item?.poll?.[`question${language.suffix}`] || ''),
      pollOptions: Array.isArray(item?.poll?.options)
        ? item.poll.options.map((option) => String(option?.[`text${language.suffix}`] || ''))
        : [],
    };
  }
  return {
    kind: item?.poll ? 'poll' : 'message',
    active: false,
    audience: item?.audience || 'all',
    priority: Number(item?.priority || 0),
    ttlDays: Number(item?.ttlDays || 30),
    translations,
  };
}

function appMessageEditResetsPoll(item, payload) {
  const before = Array.isArray(item?.poll?.options) ? item.poll.options : [];
  const after = payload?.kind === 'poll' && Array.isArray(payload?.translations?.ru?.pollOptions)
    ? payload.translations.ru.pollOptions
    : [];
  if (Boolean(item?.poll) !== (payload?.kind === 'poll')) return true;
  if (before.length !== after.length) return true;
  return before.some((option, index) => String(option?.textRu || '').trim() !== String(after[index] || '').trim());
}

const PUSH_MODE_LABELS = Object.freeze({ uid: 'Один пользователь', segment: 'Сегмент', reactivate: 'Возврат неактивных', scheduled: 'По расписанию' });

function pushDraft() {
  return state.pushCampaigns.preview?.payload || state.pushCampaigns.draft || { mode: 'uid' };
}

function pushApprovalIsLive(approval) {
  const expiresAtMs = Math.min(Number(approval?.expiresAtMs || 0), Number(approval?.previewExpiresAtMs || approval?.expiresAtMs || 0));
  return (approval?.status === 'pending' || approval?.status === 'approved') && expiresAtMs > Date.now();
}

function pushApprovalStatusLabel(approval) {
  if (approval.status === 'consumed') return 'consumed';
  if (approval.status === 'cancelled' || approval.status === 'rejected') return approval.status;
  return pushApprovalIsLive(approval) ? (approval.status || 'pending') : 'expired';
}

function pushOperationKey(scope) {
  const key = String(scope || 'command');
  const existing = state.pushCampaigns.operationKeys?.[key];
  if (existing) return existing;
  const storageKey = `phraseman_admin_push_operation_${key}`;
  try {
    const persisted = globalThis.sessionStorage?.getItem(storageKey);
    if (persisted) {
      state.pushCampaigns.operationKeys = { ...(state.pushCampaigns.operationKeys || {}), [key]: persisted };
      return persisted;
    }
  } catch { /* Session storage is an optional retry aid. */ }
  const operationId = id(`push-${key.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 60)}`);
  state.pushCampaigns.operationKeys = { ...(state.pushCampaigns.operationKeys || {}), [key]: operationId };
  try { globalThis.sessionStorage?.setItem(storageKey, operationId); } catch { /* Keep the in-memory key. */ }
  return operationId;
}

function clearPushOperationKey(scope) {
  const key = String(scope || 'command');
  const keys = { ...(state.pushCampaigns.operationKeys || {}) };
  delete keys[key];
  state.pushCampaigns.operationKeys = keys;
  try { globalThis.sessionStorage?.removeItem(`phraseman_admin_push_operation_${key}`); } catch { /* No-op. */ }
}

function renderPushApprovalPacket(approval) {
  const summary = approval?.summary || {};
  const exactAudience = summary.mode === 'segment'
    ? JSON.stringify(summary.segment || {})
    : summary.mode === 'reactivate'
      ? JSON.stringify(summary.reactivation || {})
      : summary.mode === 'scheduled'
        ? `${summary.audience || 'all'} · ${dateTime(summary.scheduledAtMs)}`
        : summary.uid || '—';
  const live = pushApprovalIsLive(approval);
  const statusLabel = pushApprovalStatusLabel(approval);
  const own = approval.requestedBy === state.adminUid;
  const canWrite = can('campaigns.write');
  return `<div class="list-row"><div><strong>${escapeHtml(summary.title || 'Массовый push')}</strong><small>${escapeHtml(PUSH_MODE_LABELS[summary.mode] || summary.mode || '')} · аудитория: ${escapeHtml(exactAudience)} · получателей на preview: ${Number(approval.audienceCount || 0)}</small><small>${escapeHtml(summary.body || '')}</small><small>Действие: ${escapeHtml(summary.action || 'нет')} · Запросил: ${escapeHtml(approval.requestedBy || '—')} · Истекает: ${escapeHtml(dateTime(Math.min(Number(approval.expiresAtMs || 0), Number(approval.previewExpiresAtMs || approval.expiresAtMs || 0))))}</small><small>Preview: ${escapeHtml(approval.previewId || '—')} · Причина / stop condition: ${escapeHtml(approval.reason || '')}</small><small>Риск: массовая отправка. До создания задания запрос можно оставить истечь; созданное pending/scheduled задание отменяется в истории ниже.</small></div><div class="actions"><span class="badge ${statusLabel === 'approved' ? 'success' : statusLabel === 'pending' ? 'warning' : ''}">${escapeHtml(statusLabel)}</span>${approval.status === 'pending' && live && !own && canWrite ? `<button class="button primary small" data-action="approve-push-campaign" data-approval-id="${escapeHtml(approval.id)}" type="button" title="Одобрить неизменяемый пакет массового push как второй администратор">Одобрить</button>` : ''}${approval.status === 'pending' && own && live ? '<span class="badge">нужен второй администратор</span>' : ''}${approval.status === 'approved' && live && canWrite ? `<button class="button primary small" data-action="publish-approved-push" data-approval-id="${escapeHtml(approval.id)}" data-preview-id="${escapeHtml(approval.previewId)}" type="button" title="Создать push-задание по одобренному preview">Создать задание</button>` : ''}</div></div>`;
}

function renderPushModeFields(draft, locked) {
  if (draft.mode === 'uid') return `<div class="field full"><label for="push-campaign-uid">UID пользователя</label><input id="push-campaign-uid" value="${escapeHtml(draft.uid || '')}" placeholder="Канонический stable UID"${locked ? ' disabled' : ''}></div>`;
  if (draft.mode === 'segment') return `<div class="field"><label for="push-campaign-language">Язык</label><select id="push-campaign-language"${locked ? ' disabled' : ''}><option value=""${draft.segment?.language ? '' : ' selected'}>Любой</option><option value="ru"${draft.segment?.language === 'ru' ? ' selected' : ''}>ru</option><option value="uk"${draft.segment?.language === 'uk' ? ' selected' : ''}>uk</option></select></div><div class="field"><label for="push-campaign-premium">Доступ</label><select id="push-campaign-premium"${locked ? ' disabled' : ''}><option value=""${typeof draft.segment?.premium === 'boolean' ? '' : ' selected'}>Любой</option><option value="true"${draft.segment?.premium === true ? ' selected' : ''}>Только Plus</option><option value="false"${draft.segment?.premium === false ? ' selected' : ''}>Только Free</option></select></div><div class="field"><label for="push-campaign-streak">Минимальный streak</label><input id="push-campaign-streak" type="number" min="0" value="${Number(draft.segment?.streakMin || 0)}"${locked ? ' disabled' : ''}></div>`;
  if (draft.mode === 'reactivate') return `<div class="field"><label for="push-campaign-days-min">Неактивен минимум, дней</label><input id="push-campaign-days-min" type="number" min="1" value="${Number(draft.reactivation?.daysMin || 7)}"${locked ? ' disabled' : ''}></div><div class="field"><label for="push-campaign-days-max">Неактивен максимум, дней</label><input id="push-campaign-days-max" type="number" min="1" value="${Number(draft.reactivation?.daysMax || 30)}"${locked ? ' disabled' : ''}></div>`;
  const localTime = draft.scheduledAt ? String(draft.scheduledAt).slice(0, 16) : '';
  return `<div class="field"><label for="push-campaign-scheduled-at">Дата и время</label><input id="push-campaign-scheduled-at" type="datetime-local" value="${escapeHtml(localTime)}"${locked ? ' disabled' : ''}></div><div class="field"><label for="push-campaign-audience">Аудитория</label><select id="push-campaign-audience"${locked ? ' disabled' : ''}><option value="all"${draft.audience === 'all' || !draft.audience ? ' selected' : ''}>Все</option><option value="premium"${draft.audience === 'premium' ? ' selected' : ''}>Plus</option><option value="free"${draft.audience === 'free' ? ' selected' : ''}>Free</option><option value="inactive7"${draft.audience === 'inactive7' ? ' selected' : ''}>Неактивны 7+ дней</option></select></div>`;
}

function renderPushCampaigns() {
  const view = state.pushCampaigns;
  const draft = pushDraft();
  const locked = state.busy || !!view.preview || !can('campaigns.write');
  const preview = view.preview;
  const approvals = Array.isArray(view.approvals) ? view.approvals : [];
  const jobs = Array.isArray(view.jobs) ? view.jobs : [];
  const jobsHtml = view.state === 'loading' ? '<div class="profile-loading" role="status"><span class="loading-bar"></span><span>Загружаю push-кампании…</span></div>' : view.error ? `<div class="notice danger">${escapeHtml(view.error)}</div>` : !jobs.length ? emptyState('Push-заданий пока нет.') : `<div class="data-list">${jobs.map((job) => `<div class="list-row"><div><strong>${escapeHtml(job.notification?.title || 'Без заголовка')}</strong><small>${escapeHtml(PUSH_MODE_LABELS[job.mode] || job.mode)} · ${escapeHtml(job.notification?.body || '')}</small><small>${escapeHtml(job.createdAt || dateTime(job.createdAtMs))} · ${escapeHtml(job.createdBy || '—')} · preview: ${Number(job.audiencePreviewCount || 0)} · фактически при отправке: ${Number(job.targetCount || 0)} · доставлено ${Number(job.sentCount || 0)} · ошибок ${Number(job.failedCount || 0)}</small>${job.error ? `<small class="danger-text">${escapeHtml(job.error)}</small>` : ''}</div><div class="actions"><span class="badge ${job.status === 'done' ? 'success' : job.status === 'error' ? 'danger' : job.status === 'cancelled' ? '' : 'warning'}">${escapeHtml(job.status || 'pending')}</span>${job.cancelable ? `<button class="button danger small" data-action="cancel-push-job" data-push-job-id="${escapeHtml(job.id)}" type="button"${disabledWhenUnauthorized('campaigns.write')} title="Отменить только ещё не начатое push-задание">Отменить</button>` : ''}</div></div>`).join('')}</div>`;
  const approvalsHtml = !approvals.length ? emptyState('Запросов на одобрение массовых push нет.') : `<div class="data-list">${approvals.slice(0, 30).map(renderPushApprovalPacket).join('')}</div>`;
  return `<section class="card section"><div class="card-header"><div><h2>Push-кампании</h2><p>Серверный расчёт аудитории, обязательный preview и двухэтапное одобрение массовых отправок.</p></div><button class="button" data-action="load-push-campaigns" type="button"${disabledWhenUnauthorized('campaigns.read')} title="Обновить задания и запросы одобрения">${view.state === 'idle' ? 'Загрузить' : 'Обновить'}</button></div><div class="card-body">
    <div class="notice">Для push одному UID достаточно preview и подтверждения. Сегменты, возврат неактивных и расписание требуют одобрения другого администратора. Для scheduled аудитория будет повторно рассчитана непосредственно перед отправкой.</div>
    <div class="fields section"><div class="field"><label for="push-campaign-mode">Режим</label><select id="push-campaign-mode" data-action="change-push-mode"${locked ? ' disabled' : ''}><option value="uid"${draft.mode === 'uid' ? ' selected' : ''}>Один пользователь</option><option value="segment"${draft.mode === 'segment' ? ' selected' : ''}>Сегмент</option><option value="reactivate"${draft.mode === 'reactivate' ? ' selected' : ''}>Возврат неактивных</option><option value="scheduled"${draft.mode === 'scheduled' ? ' selected' : ''}>По расписанию</option></select></div>${renderPushModeFields(draft, locked)}<div class="field full"><label for="push-campaign-title">Заголовок</label><input id="push-campaign-title" maxlength="120" value="${escapeHtml(draft.notification?.title || '')}"${locked ? ' disabled' : ''}></div><div class="field full"><label for="push-campaign-body">Текст</label><textarea id="push-campaign-body" maxlength="500"${locked ? ' disabled' : ''}>${escapeHtml(draft.notification?.body || '')}</textarea></div><div class="field full"><label for="push-campaign-action">Действие по нажатию</label><input id="push-campaign-action" maxlength="160" value="${escapeHtml(draft.action || '')}" placeholder="например open_lessons"${locked ? ' disabled' : ''}></div><div class="field full"><label for="push-campaign-reason">Причина и условие остановки</label><textarea id="push-campaign-reason" maxlength="500"${locked ? ' disabled' : ''}>${escapeHtml(preview?.reason || '')}</textarea></div></div>
    ${preview ? `<div class="notice warning section"><strong>Предпросмотр готов</strong><br>${escapeHtml(PUSH_MODE_LABELS[preview.payload.mode])} · получателей сейчас: ${Number(preview.audienceCount || 0)} · создан ${escapeHtml(dateTime(preview.generatedAtMs))}<br>${escapeHtml(preview.payload.notification.title)} — ${escapeHtml(preview.payload.notification.body)}${preview.scheduledAudienceRecomputedAtSend ? '<br><strong>Важно:</strong> scheduled-аудитория будет пересчитана перед фактической отправкой.' : ''}</div>` : ''}
    <div class="actions end section">${preview ? '<button class="button" data-action="discard-push-preview" type="button" title="Отменить preview без создания задания">Изменить ещё</button>' : ''}<button class="button ${preview ? '' : 'primary'}" data-action="preview-push-campaign" type="button"${locked ? ' disabled' : ''} title="Серверно рассчитать получателей и показать итог без отправки">Предпросмотр</button>${preview && !preview.requiresApproval ? `<button class="button primary" data-action="publish-push-campaign" type="button" title="Создать UID push-задание после подтверждения">Создать задание</button>` : ''}${preview?.requiresApproval ? `<button class="button primary" data-action="request-push-approval" type="button" title="Запросить обязательное одобрение другого администратора">Запросить одобрение</button>` : ''}</div>
    <div class="fields section"><div class="field"><label for="push-approval-reason">Комментарий одобряющего</label><input id="push-approval-reason" maxlength="500" placeholder="Что проверено перед одобрением"></div><div class="field"><label for="push-cancel-reason">Причина отмены задания</label><input id="push-cancel-reason" maxlength="500" placeholder="Почему задание нужно остановить"></div></div>
    <div class="section"><h3>Запросы одобрения</h3>${approvalsHtml}</div><div class="section"><h3>История заданий</h3>${jobsHtml}</div>
  </div></section>`;
}

function readPushCampaignForm() {
  const mode = String(document.getElementById('push-campaign-mode')?.value || 'uid');
  const title = String(document.getElementById('push-campaign-title')?.value || '').trim();
  const body = String(document.getElementById('push-campaign-body')?.value || '').trim();
  const action = String(document.getElementById('push-campaign-action')?.value || '').trim();
  const reason = String(document.getElementById('push-campaign-reason')?.value || '').trim();
  if (!title || !body || !reason) throw new Error('Заполните заголовок, текст и причину кампании.');
  const payload = { mode, notification: { title, body }, ...(action ? { action } : {}) };
  if (mode === 'uid') { const uid = String(document.getElementById('push-campaign-uid')?.value || '').trim(); if (!uid) throw new Error('Укажите UID пользователя.'); payload.uid = uid; }
  if (mode === 'segment') { const language = String(document.getElementById('push-campaign-language')?.value || ''); const premiumRaw = String(document.getElementById('push-campaign-premium')?.value || ''); const streakMin = Number(document.getElementById('push-campaign-streak')?.value || 0); payload.segment = { ...(language ? { language } : {}), ...(premiumRaw ? { premium: premiumRaw === 'true' } : {}), ...(streakMin > 0 ? { streakMin } : {}) }; }
  if (mode === 'reactivate') { const daysMin = Number(document.getElementById('push-campaign-days-min')?.value || 7); const daysMax = Number(document.getElementById('push-campaign-days-max')?.value || 30); if (daysMin < 1 || daysMax < daysMin) throw new Error('Проверьте диапазон неактивных дней.'); payload.reactivation = { daysMin, daysMax }; }
  if (mode === 'scheduled') { const local = String(document.getElementById('push-campaign-scheduled-at')?.value || ''); if (!local || !Number.isFinite(Date.parse(local)) || Date.parse(local) <= Date.now()) throw new Error('Выберите будущую дату и время.'); payload.scheduledAt = new Date(local).toISOString(); payload.audience = String(document.getElementById('push-campaign-audience')?.value || 'all'); }
  return { payload, reason };
}

async function loadPushCampaigns() {
  state.pushCampaigns = { ...state.pushCampaigns, state: 'loading', error: '' };
  renderCurrentPage();
  try {
    const result = await actions.listPushJobs();
    state.pushCampaigns = { ...state.pushCampaigns, state: 'ready', jobs: Array.isArray(result?.jobs) ? result.jobs : [], approvals: Array.isArray(result?.approvals) ? result.approvals : [], error: '' };
  } catch (error) {
    state.pushCampaigns = { ...state.pushCampaigns, state: 'error', error: errorMessage(error) };
    throw error;
  }
}

function renderCampaigns() {
  const campaignState = state.campaigns;
  const draft = campaignState.preview?.payload || campaignState.draft || {};
  const editingId = String(campaignState.editingId || '');
  const locked = !can('campaigns.write') || state.busy;
  const now = Date.now();
  const items = Array.isArray(campaignState.items) ? campaignState.items : [];
  const expiredItems = items.filter((item) => Number(item.expiresAtMs || 0) > 0 && Number(item.expiresAtMs) <= now);
  const activeCount = items.filter((item) => item.active !== false && (Number(item.expiresAtMs || 0) <= 0 || Number(item.expiresAtMs) > now)).length;
  const reads = items.reduce((sum, item) => sum + Number(item.readCount || 0), 0);
  const reactions = items.reduce((sum, item) => sum + Number(item.likeCount || 0) + Number(item.dislikeCount || 0), 0);
  const list = campaignState.state === 'loading' ? emptyState('Загрузка сообщений…') : campaignState.state === 'error' ? `<div class="notice danger">${escapeHtml(campaignState.error)}</div>` : !items.length ? emptyState('Сообщений пока нет. Создайте draft и проверьте preview.') : `<div class="data-list">${items.map((item) => {
    const expired = Number(item.expiresAtMs || 0) > 0 && Number(item.expiresAtMs) <= now;
    const active = item.active !== false && !expired;
    const nextActive = item.active === false;
    const generic = item.kind === 'message' || item.kind === 'poll' || !item.kind;
    const editDisabled = locked || active || expired || !generic;
    const kindLabel = item.kind === 'poll' ? 'Опрос' : item.kind === 'vip_survey' ? 'Plus Survey' : generic ? 'Сообщение' : `Специальное: ${item.kind}`;
    return `<article class="list-row"><div><strong>${escapeHtml(item.titleRu || 'Без темы')}</strong><small>${escapeHtml(kindLabel)} · ${escapeHtml(item.audience || 'all')} · приоритет ${Number(item.priority || 0)} · до ${escapeHtml(dateTime(item.expiresAtMs))}</small><small>Прочтения ${Number(item.readCount || 0)} · лайки ${Number(item.likeCount || 0)} · дизлайки ${Number(item.dislikeCount || 0)} · голоса ${Number(item.pollVoteCount || 0)}</small><small><code>${escapeHtml(item.id)}</code></small></div><div class="actions"><span class="badge ${active ? 'success' : expired ? 'warning' : ''}">${expired ? 'Истекло' : active ? 'Активно' : 'Черновик / выключено'}</span>${!generic ? '<span class="badge warning">Профильный процесс</span>' : ''}<button class="button" data-app-message-edit="${escapeHtml(item.id)}" type="button"${editDisabled ? ' disabled' : ''} title="${!generic ? 'Специальным сообщением управляет профильный процесс' : active ? 'Сообщение нужно сначала выключить, чтобы во время редактирования не появились новые голоса' : 'Открыть выключенное сообщение в форме редактирования с preview и проверкой устаревших данных'}">Изменить</button><button class="button" data-app-message-toggle="${escapeHtml(item.id)}" data-next-active="${nextActive}" type="button"${locked || expired || !generic ? ' disabled' : ''} title="${generic ? 'Включить или выключить сообщение через серверную команду с причиной и audit log' : 'Специальным сообщением управляет профильный процесс'}">${nextActive ? 'Включить' : 'Выключить'}</button><button class="button danger" data-app-message-delete="${escapeHtml(item.id)}" type="button"${locked || !generic ? ' disabled' : ''} title="${generic ? 'Удалить сообщение и связанные данные: реакции, голоса и состояния inbox' : 'Специальным сообщением управляет профильный процесс'}">Удалить</button></div></article>`;
  }).join('')}</div>`;
  const options = Array.from({ length: 6 }, (_, index) => `<div class="field"><label for="app-message-poll-option-${index + 1}">Вариант ${index + 1}</label><input id="app-message-poll-option-${index + 1}" maxlength="160" value="${escapeHtml(draft?.translations?.ru?.pollOptions?.[index] || '')}" placeholder="${index < 2 ? 'Обязательно для опроса' : 'Необязательно'}"${locked ? ' disabled' : ''}></div>`).join('');
  const headerActions = `<a class="button" href="#application" title="Вернуться к настройкам приложения">К приложению</a><a class="button ghost" href="../../admin/index.html#app-messages" target="_blank" rel="noopener" title="Открыть старый модуль для Plus Survey и аварийной сверки">Старый модуль сообщений</a><button class="button" data-action="load-app-messages" type="button"${disabledWhenUnauthorized('campaigns.read')} title="Загрузить до 120 последних сообщений и агрегированные счётчики">${items.length ? 'Обновить список' : 'Загрузить сообщения'}</button><button class="button danger" data-action="preview-app-message-cleanup" type="button"${locked || !expiredItems.length ? ' disabled' : ''} title="Сначала показать список истёкших сообщений; удаление выполняется только после отдельного подтверждения">Очистить истёкшие (${expiredItems.length})</button>`;
  return `${pageHeader(PAGES.campaigns, 'Приложение / Кампании', headerActions)}
    <div class="notice"><strong>Новый экран: полный жизненный цикл обычного сообщения и опроса.</strong> Активную кампанию сначала выключают. Изменение вариантов опроса явно сбрасывает старые голоса; удаление каскадно очищает реакции, голоса и состояния inbox. Plus Survey остаётся в профильном процессе старой админки до его отдельного переноса.</div>
    ${renderPushCampaigns()}
    <section class="metrics section"><article class="card metric"><label>Активные</label><strong>${items.length ? activeCount : '—'}</strong><span class="badge success">сейчас</span></article><article class="card metric"><label>Всего</label><strong>${items.length || '—'}</strong><span class="badge">до 120</span></article><article class="card metric"><label>Прочтения</label><strong>${items.length ? reads : '—'}</strong><span class="badge">агрегировано</span></article><article class="card metric"><label>Реакции</label><strong>${items.length ? reactions : '—'}</strong><span class="badge">like + dislike</span></article></section>
    <section class="card section"><div class="card-header"><div><h2>${editingId ? 'Редактирование сообщения' : 'Новое сообщение'}</h2><p>${editingId ? 'Сообщение выключено. Срок окончания не продлевается; изменение вариантов опроса будет отдельно показано в preview.' : 'Создайте обычное inbox-сообщение или опрос. Draft никому не показывается; active появляется у выбранной аудитории после публикации.'}</p></div><span class="badge warning">Production campaign</span></div><div class="card-body">
      <div class="fields"><div class="field"><label for="app-message-kind">Формат</label><select id="app-message-kind"${locked ? ' disabled' : ''}><option value="message"${draft.kind === 'poll' ? '' : ' selected'}>Сообщение</option><option value="poll"${draft.kind === 'poll' ? ' selected' : ''}>Сообщение + опрос</option></select></div><div class="field"><label for="app-message-active">Статус после публикации</label><select id="app-message-active"${locked || editingId ? ' disabled' : ''}><option value="false"${draft.active === true ? '' : ' selected'}>Draft / выключено</option><option value="true"${draft.active === true ? ' selected' : ''}>Активно</option></select></div><div class="field"><label for="app-message-audience">Аудитория</label><select id="app-message-audience"${locked ? ' disabled' : ''}><option value="all"${draft.audience && draft.audience !== 'all' ? '' : ' selected'}>Все пользователи</option><option value="free"${draft.audience === 'free' ? ' selected' : ''}>Только Free</option><option value="premium"${draft.audience === 'premium' ? ' selected' : ''}>Только Plus</option></select></div><div class="field"><label for="app-message-priority">Приоритет</label><input id="app-message-priority" type="number" min="0" max="99" value="${escapeHtml(draft.priority ?? 0)}"${locked ? ' disabled' : ''}></div><div class="field"><label for="app-message-ttl-days">Срок, дней</label><input id="app-message-ttl-days" type="number" min="1" max="30" value="${escapeHtml(draft.ttlDays ?? 30)}"${locked || editingId ? ' disabled' : ''}></div><div class="field full"><label for="app-message-title-ru">Тема RU</label><input id="app-message-title-ru" maxlength="160" value="${escapeHtml(appMessageDraftValue(draft, 'ru', 'title'))}"${locked ? ' disabled' : ''}></div><div class="field full"><label for="app-message-body-ru">Текст RU</label><textarea id="app-message-body-ru" rows="3" maxlength="2000"${locked ? ' disabled' : ''}>${escapeHtml(appMessageDraftValue(draft, 'ru', 'body'))}</textarea></div><div class="field full"><label for="app-message-poll-question-ru">Вопрос опроса RU</label><input id="app-message-poll-question-ru" maxlength="300" value="${escapeHtml(appMessageDraftValue(draft, 'ru', 'pollQuestion'))}" placeholder="Только для формата «Опрос»"${locked ? ' disabled' : ''}></div>${options}<div class="field full"><label for="app-message-reason">${editingId ? 'Причина изменения' : 'Причина публикации'}</label><textarea id="app-message-reason" maxlength="500" placeholder="Цель, аудитория, срок и stop condition"${locked ? ' disabled' : ''}>${escapeHtml(campaignState.preview?.reason || '')}</textarea></div></div>
      <details class="section"><summary>Переводы на 8 языков</summary><div class="notice section">Пустое поле безопасно наследует RU. Для опроса варианты вводятся по одному на строку в том же порядке.</div>${renderAppMessageTranslations(draft, locked)}</details>
      ${campaignState.preview ? `<div class="notice warning section"><strong>Предпросмотр кампании</strong><br>${escapeHtml(campaignState.preview.summary)}<div class="code-preview section">${campaignState.preview.details.map((line) => escapeHtml(line)).join('<br>')}</div></div>` : ''}
      <div class="actions end section">${editingId ? '<button class="button" data-action="cancel-app-message-edit" type="button" title="Закрыть редактирование без записи в production">Отменить редактирование</button>' : ''}${campaignState.preview ? '<button class="button" data-action="discard-app-message-preview" type="button" title="Отменить preview без записи в production">Изменить ещё</button>' : ''}<button class="button ${campaignState.preview ? '' : 'primary'}" data-action="preview-app-message" type="button"${locked ? ' disabled' : ''} title="Сначала показать точное сообщение, аудиторию и срок без записи в production">Предпросмотр</button>${campaignState.preview ? `<button class="button primary" data-action="publish-app-message" type="button"${locked ? ' disabled' : ''} title="${editingId ? 'Сохранить выключенное сообщение с проверкой версии, reason и audit log' : 'Создать сообщение через серверную команду с reason, idempotency и audit log'}">${editingId ? 'Сохранить изменения' : 'Опубликовать'}</button>` : ''}</div>
    </div></section>
    <section class="card section"><div class="card-header"><div><h2>История сообщений</h2><p>Статус, срок, аудитория, прочтения, реакции и голоса опросов.</p></div></div><div class="card-body"><div class="field full"><label for="app-message-operation-reason">Причина операции со списком</label><input id="app-message-operation-reason" maxlength="500" value="${escapeHtml(campaignState.cleanupPreview?.reason || '')}" placeholder="Почему сообщение включается, выключается или удаляется"></div>${campaignState.cleanupPreview ? `<div class="notice danger section"><strong>Предпросмотр очистки</strong><br>Будут удалены ${campaignState.cleanupPreview.ids.length} истёкших сообщений вместе с реакциями, голосами и состояниями inbox.<div class="actions end section"><button class="button" data-action="discard-app-message-cleanup" type="button" title="Отменить очистку без изменений">Отмена</button><button class="button danger" data-action="run-app-message-cleanup" type="button" title="Подтвердить каскадное удаление показанного списка">Удалить истёкшие</button></div></div>` : ''}${list}</div></section>`;
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
    <div class="notice warning">Остальные изменяющие действия пока открываются в действующем модуле: имя, XP, streak, осколки, награды, merge, сбросы, предупреждение, бан и удаление. Бета-статус, «Нимб», постоянный Plus и команды энергии уже перенесены ниже.</div>
    <section class="card section"><div class="card-header"><div><h3>Бета-тестер и тестовый доступ</h3><p>Команды применяются к каноническому UID через сервер, с причиной и обязательным аудитом.</p></div><div class="actions"><span class="badge ${summary.betaTester ? 'success' : ''}">${summary.betaTester ? 'Бета-тестер' : 'Обычный пользователь'}</span><span class="badge ${summary.activeAura === 'aura_beta_nimbus' ? 'success' : ''}">${summary.activeAura === 'aura_beta_nimbus' ? 'Нимб активен' : 'Нимб не активен'}</span><span class="badge ${summary.plusForever ? 'success' : ''}">${summary.plusForever ? 'Plus навсегда' : 'Без постоянного Plus'}</span></div></div><div class="card-body"><div class="field full"><label for="beta-tester-reason">Причина операции</label><textarea id="beta-tester-reason" maxlength="500" placeholder="Кто запросил, зачем нужна операция и как проверить результат">${escapeHtml(state.betaTesters.pending?.reason || '')}</textarea></div><div class="actions section"><button class="button" data-action="preview-beta-tester-action" data-beta-action="${summary.betaTester ? 'unset_beta' : 'set_beta'}" type="button"${disabledWhenUnauthorized('users.write')} title="${summary.betaTester ? 'Снять только бета-флаг; Нимб останется у пользователя' : 'Выдать бета-флаг и активировать Нимб'}">${summary.betaTester ? 'Снять бета-статус' : 'Назначить + выдать Нимб'}</button><button class="button" data-action="preview-beta-tester-action" data-beta-action="grant_plus" type="button"${disabledWhenUnauthorized('money.manual_access.write')} title="Выдать административный Plus без срока окончания">Выдать Plus навсегда</button><button class="button" data-action="preview-beta-tester-action" data-beta-action="energy_fill" type="button"${disabledWhenUnauthorized('users.write')} title="Поставить одноразовую команду заполнения энергии">Заполнить энергию</button><button class="button danger" data-action="preview-beta-tester-action" data-beta-action="energy_drain" type="button"${disabledWhenUnauthorized('users.write')} title="Поставить одноразовую команду обнуления энергии">Обнулить энергию</button></div>${state.betaTesters.pending ? `<div class="notice warning section"><strong>Предпросмотр операции</strong><br>${escapeHtml(state.betaTesters.pending.label)} для <code>${escapeHtml(profile.canonicalUid)}</code><br>Причина: ${escapeHtml(state.betaTesters.pending.reason)}<div class="actions end section"><button class="button" data-action="cancel-beta-tester-action" type="button" title="Отменить без записи">Отмена</button><button class="button primary" data-action="confirm-beta-tester-action" type="button" title="Выполнить серверную команду и записать аудит">Подтвердить</button></div></div>` : ''}</div></section>
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

function renderBetaTesters() {
  const view = state.betaTesters;
  const content = view.state === 'loading' ? '<div class="profile-loading" role="status"><span class="loading-bar"></span><span>Загружаю бета-тестеров…</span></div>' : view.error ? `<div class="notice danger">${escapeHtml(view.error)}</div>` : !view.items.length ? emptyState(view.state === 'idle' ? 'Нажмите «Загрузить список».' : 'Активных бета-тестеров нет.') : `<div class="data-list">${view.items.map((item) => `<div class="list-row"><div><strong>${escapeHtml(item.name || item.uid)}</strong><small>${escapeHtml(item.email || item.uid)} · с ${escapeHtml(dateTime(item.betaSinceMs))}</small></div><div class="actions"><span class="badge ${item.ownsNimbus ? 'success' : 'warning'}">${item.ownsNimbus ? 'Нимб' : 'Без Нимба'}</span><span class="badge ${item.plusForever ? 'success' : ''}">${item.plusForever ? 'Plus ∞' : 'Free'}</span><button class="button small" data-action="open-beta-tester" data-beta-uid="${escapeHtml(item.uid)}" type="button" title="Открыть канонический профиль и защищённые действия">Открыть</button></div></div>`).join('')}</div>`;
  return `<section class="card section"><div class="card-header"><div><h2>Бета-тестеры</h2><p>Список объединён с единым профилем; отдельная административная страница больше не нужна для ежедневной работы.</p></div><div class="actions"><span class="badge ${view.truncated ? 'warning' : ''}">${view.items.length || '—'}${view.truncated ? '+' : ''}</span><button class="button" data-action="load-beta-testers" type="button"${disabledWhenUnauthorized('users.read')} title="Загрузить до 300 активных бета-тестеров с сервера">${view.state === 'idle' ? 'Загрузить список' : 'Обновить'}</button></div></div><div class="card-body">${content}</div></section>`;
}

function renderUsers() {
  if (!can('users.read')) return `${pageHeader(PAGES.users, 'Пользователи')}<div class="notice warning">Для просмотра профилей нужна роль с разрешением users.read. Сохранённые результаты скрыты.</div>`;
  return `${pageHeader(PAGES.users, 'Пользователи', '<a class="button" href="#support" title="Открыть почту поддержки">Почта</a><a class="button primary" href="#report-center" title="Открыть единый центр репортов">Центр репортов</a>')}
    ${renderBetaTesters()}
    <section class="card user-search-card"><div class="card-header"><div><h2>Найти пользователя</h2><p>Точный серверный поиск без загрузки всей базы в браузер.</p></div><span class="badge">users.read</span></div><div class="card-body"><div class="user-search-form"><div class="field"><label for="user-search">Почта, точное имя или UID</label><input id="user-search" type="search" value="${escapeHtml(state.users.query)}" placeholder="alice@example.com или stable UID" autocomplete="off"></div><button class="button primary" data-action="search-admin-users" type="button" title="Найти пользователя без загрузки всей базы" data-tooltip="Найти пользователя без загрузки всей базы"${disabledWhenUnauthorized('users.read')}>Найти</button></div>${renderUserSearchResults()}</div></section>
    <div class="section">${renderProfile()}</div>`;
}

function formatPromoDate(ms) {
  const value = Number(ms || 0);
  if (!(value > 0) || !Number.isFinite(value)) return '—';
  return dateTime(value);
}

function formatPromoReward(row) {
  return row?.rewardKind === 'lifetime' ? 'lifetime' : `${Number(row?.rewardDays || 0)} дн.`;
}

function renderPromoCodesList() {
  if (state.promo.state === 'loading') return '<div class="profile-loading" role="status"><span class="loading-bar"></span><span>Загружаю промокоды…</span></div>';
  if (state.promo.error) return `<div class="notice danger">${escapeHtml(state.promo.error)}</div>`;
  const generated = state.promo.generatedCodes.length ? `<div class="notice success section"><strong>Создано кодов: ${state.promo.generatedCodes.length}</strong><br><div class="code-preview">${state.promo.generatedCodes.map((code) => escapeHtml(code)).join('<br>')}</div></div>` : '';
  const codes = state.promo.codes.length ? state.promo.codes.map((row) => {
    const limit = Number(row.maxRedemptions || 0) > 0 ? `${Number(row.usedCount || 0)}/${Number(row.maxRedemptions || 0)}` : `${Number(row.usedCount || 0)}/∞`;
    return `<div class="list-row"><div><strong class="mono">${escapeHtml(row.code)}</strong><small>${escapeHtml(formatPromoReward(row))} · ${escapeHtml(limit)} · до ${escapeHtml(formatPromoDate(row.expiresAtMs))}</small>${row.note ? `<small>${escapeHtml(row.note)}</small>` : ''}</div><span class="badge ${row.enabled ? 'success' : 'warning'}">${row.enabled ? 'Включён' : 'Выключен'}</span></div>`;
  }).join('') : emptyState('Промокоды ещё не загружены или список пуст.');
  return `${generated}<div class="data-list">${codes}</div>`;
}

function renderPromoRedemptionsList() {
  if (!state.promo.redemptions.length) return emptyState('Активации ещё не загружены или их нет.');
  return `<div class="data-list">${state.promo.redemptions.map((row) => `<div class="list-row"><div><strong class="mono">${escapeHtml(row.code)}</strong><small>${escapeHtml(row.userLabel || row.uid || 'Пользователь')} · ${escapeHtml(formatPromoDate(row.redeemedAtMs))}</small><small>Plus до: ${row.rewardKind === 'lifetime' ? 'lifetime' : escapeHtml(formatPromoDate(row.vipUntilMs))}</small></div><div class="actions"><span class="badge">${escapeHtml(formatPromoReward(row))}</span>${row.uid ? `<button class="button small" data-open-promo-user="${escapeHtml(row.uid)}" type="button" title="Открыть единый профиль пользователя, активировавшего промокод">Открыть пользователя</button>` : ''}</div></div>`).join('')}</div>`;
}

function renderPromoWorkflow() {
  const preview = state.promo.preview;
  const promoDraft = preview?.payload || {};
  const promoMode = Array.isArray(promoDraft.codes) ? 'custom' : 'generated';
  const promoExpires = String(promoDraft.expiresDate || '');
  return `<section class="card section"><div class="card-header"><div><h2>Промокоды</h2><p>Создание кодов идёт через серверные callable, без прямой записи Firestore из браузера.</p></div><span class="badge success">Native v2</span></div><div class="card-body">
    <div class="fields">
      <div class="field"><label for="promo-mode">Тип</label><select id="promo-mode"><option value="generated"${promoMode === 'generated' ? ' selected' : ''}>Сгенерировать пачку</option><option value="custom"${promoMode === 'custom' ? ' selected' : ''}>Свои коды</option></select></div>
      <div class="field"><label for="promo-count">Количество</label><input id="promo-count" type="number" min="1" max="200" value="${escapeHtml(promoDraft.count || 10)}"></div>
      <div class="field"><label for="promo-prefix">Префикс</label><input id="promo-prefix" value="${escapeHtml(promoDraft.prefix || 'PM')}" maxlength="16"></div>
      <div class="field"><label for="promo-max-redemptions">Лимит активаций</label><input id="promo-max-redemptions" type="number" min="0" value="${escapeHtml(promoDraft.maxRedemptions ?? 1)}"><small class="hint">0 = без общего лимита; одноразовые ставят 1.</small></div>
      <div class="field"><label for="promo-reward-kind">Награда</label><select id="promo-reward-kind"><option value="days"${promoDraft.rewardKind === 'lifetime' ? '' : ' selected'}>Plus дни</option><option value="lifetime"${promoDraft.rewardKind === 'lifetime' ? ' selected' : ''}>Lifetime</option></select></div>
      <div class="field"><label for="promo-days">Дней Plus</label><input id="promo-days" type="number" min="1" max="3650" value="${escapeHtml(promoDraft.rewardDays || 7)}"></div>
      <div class="field"><label for="promo-expires">Код действует до</label><input id="promo-expires" type="date" value="${escapeHtml(promoExpires)}"></div>
      <div class="field"><label for="promo-enabled">Статус</label><select id="promo-enabled"><option value="on"${promoDraft.enabled === false ? '' : ' selected'}>Включён сразу</option><option value="off"${promoDraft.enabled === false ? ' selected' : ''}>Создать выключенным</option></select></div>
      <div class="field full"><label for="promo-custom-codes">Свои коды</label><textarea id="promo-custom-codes" placeholder="WELCOME7, PARTNER-30">${escapeHtml(Array.isArray(promoDraft.codes) ? promoDraft.codes.join(', ') : '')}</textarea></div>
      <div class="field full"><label for="promo-note">Заметка</label><input id="promo-note" maxlength="200" placeholder="Кампания / партнёр / причина" value="${escapeHtml(promoDraft.note || '')}"></div>
      <div class="field full"><label for="promo-reason">Причина публикации</label><textarea id="promo-reason" maxlength="500" placeholder="Зачем создаём коды, кому выдаём, как остановить кампанию">${escapeHtml(preview?.reason || '')}</textarea></div>
    </div>
    <div class="notice section">Глобальный рубильник видимости/активации промокодов находится в Remote Config: <code>promo_codes_enabled</code>.</div>
    ${preview ? `<div class="notice warning section"><strong>Предпросмотр промокодов</strong><br>${escapeHtml(preview.summary)}<div class="code-preview section">${preview.details.map((line) => escapeHtml(line)).join('<br>')}</div></div>` : ''}
    <div class="actions end section"><button class="button" data-action="load-promo-codes" type="button"${disabledWhenUnauthorized('money.read')} title="Загрузить последние промокоды и последние активации через сервер">Обновить список</button>${preview ? '<button class="button" data-action="discard-promo-preview" type="button" title="Отменить текущий предпросмотр и вернуться к редактированию">Изменить ещё</button>' : ''}<button class="button" data-action="preview-one-time-promo-codes" type="button"${disabledWhenUnauthorized('money.manual_access.write')} title="Собрать предпросмотр пачки одноразовых промокодов без публикации">Предпросмотр одноразовых</button><button class="button ${preview ? '' : 'primary'}" data-action="preview-promo-codes" type="button"${disabledWhenUnauthorized('money.manual_access.write')} title="Собрать предпросмотр промокодов без создания кодов">Предпросмотр промокодов</button>${preview ? `<button class="button primary" data-action="publish-promo-codes" type="button"${disabledWhenUnauthorized('money.manual_access.write')} title="Создать промокоды по проверенному предпросмотру и записать аудит">Опубликовать</button>` : ''}</div>
  </div></section>
  <section class="card section"><div class="card-header"><div><h2>Последние коды и активации</h2><p>Серверный список: последние коды и последние user redemptions.</p></div></div><div class="card-body"><div class="split-grid"><div>${renderPromoCodesList()}</div><div>${renderPromoRedemptionsList()}</div></div></div></section>`;
}

function renderMoney() {
  return `${pageHeader(PAGES.money, 'Деньги', '<a class="button ghost" href="../../admin/index.html#promo-codes" title="Аварийно открыть старый модуль промокодов">Старый модуль промокодов</a>')}
    <div class="notice warning">События нажатия «Купить» не считаются выручкой. Денежные показатели должны приходить из платёжного источника.</div>
    <section class="metrics section">${['Активные подписки', 'Выручка за период', 'Платёжные проблемы', 'Возвраты'].map((label) => `<article class="card metric"><label>${label}</label><strong>—</strong><span class="badge">Не загружено</span></article>`).join('')}</section>
    ${renderPromoWorkflow()}
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
      <div class="actions"><button class="button" data-action="load-factory-jobs" type="button"${disabledWhenUnauthorized('content.read')} title="Загрузить последние черновики генерации">Загрузить черновики</button>${detail ? `<button class="button" data-action="refresh-factory-detail" type="button"${disabledWhenUnauthorized('content.read')} title="Обновить состояние выбранного задания">Обновить</button>` : ''}</div>
      ${!detail ? `<div class="section">${renderJobPicker()}</div>` : `
        <div class="notice section"><strong>${escapeHtml(job.studyTarget)} ← ${escapeHtml(job.learnerSourceLocale ?? job.sourceLocale)}</strong><br><span class="mono">${escapeHtml(detail.jobId)}</span></div>
        <div class="section"><div class="actions" style="justify-content:space-between"><span class="hint">Готово ${completed} из ${total}</span><span class="badge ${badgeClass(job.state)}">${escapeHtml(statusLabel(job.state))}</span></div><div class="progress" aria-label="Прогресс ${percent}%"><span style="width:${percent}%"></span></div></div>
        ${state.generation ? `<div class="notice ${state.generation.failed ? 'warning' : ''} section">Обработано в этом запуске: ${state.generation.done}/${state.generation.total}. Ошибок: ${state.generation.failed}.</div>` : ''}
        <div class="actions end section"><button class="button" data-action="back-to-factory-jobs" type="button" title="Вернуться к списку черновиков">Другой черновик</button>${pending ? `<button class="button primary" data-action="run-factory-generation" type="button" title="Сгенерировать или продолжить оставшиеся части"${disabledWhenUnauthorized('content.draft.write')}>${state.generation ? 'Продолжить генерацию' : 'Запустить генерацию'}</button>` : `<button class="button primary" data-factory-step="3" type="button" title="Перейти к проверке готового содержимого">Перейти к проверке</button>`}</div>
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
      ${!detail ? `<div class="notice warning">Сначала выберите черновик на втором этапе.</div><div class="actions end section"><button class="button primary" data-factory-step="2" type="button" title="Вернуться к выбору черновика">Выбрать черновик</button></div>` : `
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
      ${!detail ? `<div class="notice warning">Сначала выберите и проверьте черновик.</div><div class="actions end section"><button class="button primary" data-factory-step="2" type="button" title="Вернуться к выбору черновика">Выбрать черновик</button></div>` : `
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
  'app_message.create': 'Создание сообщения в приложении',
  'app_message.toggle': 'Изменение показа сообщения',
  'app_message.update': 'Редактирование сообщения в приложении',
  'app_message.delete': 'Удаление сообщения в приложении',
  'app_message.cleanup_expired': 'Очистка истёкших сообщений',
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
    <div class="columns section"><section class="card"><div class="card-header"><div><h2>Бюджет генерации</h2><p>Только чтение серверных коллекций расходов.</p></div><button class="button primary" data-action="load-openai-budget" type="button"${disabledWhenUnauthorized()} title="Загрузить текущие расходы и лимиты генерации">Загрузить</button></div><div class="card-body">${budget ? `<pre class="code-preview">${escapeHtml(JSON.stringify(budget, null, 2))}</pre>` : '<p class="hint">Данные не загружены.</p>'}</div></section></div>`;
}

function renderWebsiteInbox() {
  const website = state.support.website;
  const items = Array.isArray(website.items) ? website.items : [];
  const unread = items.filter((item) => String(item.status || 'new') === 'new').length;
  const pending = items.find((item) => item.id === website.pendingReadId) ?? null;
  const body = !website.loaded
    ? emptyState(website.loading ? 'Загружаем обращения с сайта…' : 'Обращения с сайта ещё не загружены.')
    : website.error
      ? `<div class="notice danger" role="alert">${escapeHtml(website.error)}</div>`
      : !items.length
        ? emptyState('Обращений с сайта пока нет.')
        : `<div class="support-list">${items.map((item) => {
          const status = String(item.status || 'new');
          return `<article class="support-message"><header><div><strong>${escapeHtml(item.topic || 'Общее')}</strong><small>${escapeHtml(item.name || 'Без имени')} &lt;${escapeHtml(item.email || 'без email')}&gt; · ${escapeHtml(dateTime(item.createdAtMs))}</small></div><div class="actions"><span class="badge">сайт</span><span class="badge ${status === 'new' ? 'warning' : 'success'}">${status === 'new' ? 'Новое' : 'Прочитано'}</span></div></header><div class="support-body">${escapeHtml(String(item.message || '').slice(0, 12_000)) || '<span class="muted">Пустое сообщение</span>'}</div>${item.pageUrl ? `<small class="section">Страница: ${escapeHtml(item.pageUrl)}</small>` : ''}${status === 'new' ? `<div class="actions section"><button class="button small" data-action="preview-website-inbox-read" data-website-message-id="${escapeHtml(item.id)}" type="button"${state.authorized && !state.busy ? '' : ' disabled'} title="Сначала показать подтверждение и запросить причину">Пометить прочитанным</button></div>` : ''}</article>`;
        }).join('')}</div>`;
  const confirmation = pending ? `<div class="notice warning section"><strong>Подтвердите изменение статуса</strong><br>${escapeHtml(pending.topic || 'Обращение')} · ${escapeHtml(pending.email || 'без email')}<div class="field section"><label for="website-inbox-read-reason">Причина</label><textarea id="website-inbox-read-reason" maxlength="500" placeholder="Например: обращение проверено и передано в работу"></textarea></div><div class="actions end section"><button class="button" data-action="cancel-website-inbox-read" type="button" title="Отменить без изменения данных">Отмена</button><button class="button primary" data-action="confirm-website-inbox-read" data-website-message-id="${escapeHtml(pending.id)}" type="button"${state.busy ? ' disabled' : ''} title="Пометить обращение прочитанным через защищённую серверную операцию">Подтвердить</button></div></div>` : '';
  return `<section class="card section"><div class="card-header"><div><h2>Обращения с сайта</h2><p>Форма сайта хранится отдельно от Gmail, но показывается в этой же рабочей очереди.</p></div><div class="actions"><span class="badge ${unread ? 'warning' : 'success'}">новых ${unread}</span><button class="button" data-action="load-website-inbox" type="button"${disabledWhenUnauthorized()} title="Загрузить до 200 последних обращений с сайта">${website.loaded ? 'Обновить сайт' : 'Загрузить сайт'}</button></div></div><div class="card-body">${website.truncated ? '<div class="notice warning">Показаны последние 200 записей; список обрезан.</div>' : ''}${confirmation}${body}</div></section>`;
}

function renderSelectOptions(values, selected) {
  return values.map(([value, label]) => `<option value="${escapeHtml(value)}"${selected === value ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function emailOperationKey(scope) {
  const key = String(scope || 'command');
  const existing = state.emails.operationKeys?.[key];
  if (existing) return existing;
  const storageKey = `phraseman_admin_email_operation_${key}`;
  try {
    const persisted = globalThis.sessionStorage?.getItem(storageKey);
    if (persisted) {
      state.emails.operationKeys = { ...(state.emails.operationKeys || {}), [key]: persisted };
      return persisted;
    }
  } catch { /* Session storage is an optional retry aid. */ }
  const operationId = id(`email-${key.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 60)}`);
  state.emails.operationKeys = { ...(state.emails.operationKeys || {}), [key]: operationId };
  try { globalThis.sessionStorage?.setItem(storageKey, operationId); } catch { /* Keep the in-memory key. */ }
  return operationId;
}

function clearEmailOperationKey(scope) {
  const key = String(scope || 'command');
  const keys = { ...(state.emails.operationKeys || {}) };
  delete keys[key];
  state.emails.operationKeys = keys;
  try { globalThis.sessionStorage?.removeItem(`phraseman_admin_email_operation_${key}`); } catch { /* No-op. */ }
}

function protectedOperationKey(area, scope) {
  const key = String(scope || 'command');
  const bucket = state[area];
  const existing = bucket?.operationKeys?.[key];
  if (existing) return existing;
  const storageKey = `phraseman_admin_${area}_operation_${key}`;
  try {
    const persisted = globalThis.sessionStorage?.getItem(storageKey);
    if (persisted) {
      bucket.operationKeys = { ...(bucket.operationKeys || {}), [key]: persisted };
      return persisted;
    }
  } catch { /* Session storage is only a retry aid. */ }
  const operationId = id(`${area}-${key.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 60)}`);
  bucket.operationKeys = { ...(bucket.operationKeys || {}), [key]: operationId };
  try { globalThis.sessionStorage?.setItem(storageKey, operationId); } catch { /* Keep the in-memory key. */ }
  return operationId;
}

function clearProtectedOperationKey(area, scope) {
  const key = String(scope || 'command');
  const bucket = state[area];
  const keys = { ...(bucket?.operationKeys || {}) };
  delete keys[key];
  bucket.operationKeys = keys;
  try { globalThis.sessionStorage?.removeItem(`phraseman_admin_${area}_operation_${key}`); } catch { /* No-op. */ }
}

function emailApprovalIsLive(approval) {
  const expiresAtMs = Math.min(Number(approval?.expiresAtMs || 0), Number(approval?.previewExpiresAtMs || approval?.expiresAtMs || 0));
  return (approval?.status === 'pending' || approval?.status === 'approved') && expiresAtMs > Date.now();
}

function readEmailCampaignForm() {
  const subject = String(document.getElementById('email-campaign-subject')?.value || '').trim();
  const text = String(document.getElementById('email-campaign-text')?.value || '').trim();
  const reason = String(document.getElementById('email-campaign-reason')?.value || '').trim();
  const kind = String(document.getElementById('email-campaign-audience')?.value || 'all');
  if (subject.length < 3 || text.length < 10 || !reason) throw new Error('Заполните тему, текст и причину кампании.');
  const audience = kind === 'current' ? { kind, filter: emailDirectoryInput() } : { kind };
  delete audience.filter?.pageSize;
  delete audience.filter?.cursor;
  return { payload: { subject, text, audience }, reason };
}

async function loadEmailCampaigns() {
  state.emails = { ...state.emails, campaignState: 'loading', campaignError: '' };
  renderCurrentPage();
  try {
    const result = await actions.listEmailCampaigns();
    state.emails = {
      ...state.emails,
      campaignState: 'ready',
      campaigns: Array.isArray(result?.campaigns) ? result.campaigns : [],
      approvals: Array.isArray(result?.approvals) ? result.approvals : [],
      campaignError: '',
    };
  } catch (error) {
    state.emails = { ...state.emails, campaignState: 'error', campaignError: errorMessage(error) };
    throw error;
  }
}

function renderEmailCampaigns() {
  const view = state.emails;
  const preview = view.preview;
  const draft = preview?.payload || view.draft || { audienceKind: 'all' };
  const locked = state.busy || !!preview || !can('emails.campaigns.write');
  const summary = preview?.summary || {};
  const campaignRows = view.campaignState === 'loading'
    ? emptyState('Загружаем кампании…')
    : view.campaignError
      ? `<div class="notice danger">${escapeHtml(view.campaignError)}</div>`
      : !view.campaigns.length
        ? emptyState('Email-кампаний пока нет.')
        : `<div class="data-list">${view.campaigns.map((campaign) => {
          const acceptedLabel = campaign.providerMetricLabel === 'accepted_by_provider' || Number(campaign.acceptedCount || 0) > 0 ? 'принято провайдером' : 'принято провайдером';
          return `<div class="list-row"><div><strong>${escapeHtml(campaign.subject || 'Без темы')}</strong><small>${escapeHtml(dateTime(campaign.createdAtMs))} · ${escapeHtml(campaign.createdBy || '—')} · аудитория preview: ${Number(campaign.recipientPreviewCount || 0)} · фактически проверено: ${Number(campaign.targetCount || 0)}</small><small>${acceptedLabel}: ${Number(campaign.acceptedCount || 0)} · ошибок: ${Number(campaign.failedCount || 0)} · отписок перед отправкой: ${Number(campaign.suppressedAtSendCount || 0)}</small>${campaign.error ? `<small class="danger-text">${escapeHtml(campaign.error)}</small>` : ''}</div><div class="actions"><span class="badge ${campaign.status === 'completed' ? 'success' : ['failed','partial_failed','delivery_uncertain'].includes(campaign.status) ? 'danger' : ['queued_hold','processing','cancel_requested'].includes(campaign.status) ? 'warning' : ''}">${escapeHtml(campaign.status || 'queued_hold')}</span>${campaign.cancelable ? `<button class="button danger small" data-action="cancel-email-campaign" data-email-campaign-id="${escapeHtml(campaign.id)}" type="button"${disabledWhenUnauthorized('emails.campaigns.cancel')} title="Отменить кампанию; уже принятые провайдером письма вернуть нельзя">Отменить</button>` : ''}</div></div>`;
        }).join('')}</div>`;
  const approvalRows = !view.approvals.length ? emptyState('Запросов на одобрение email-кампаний нет.') : `<div class="data-list">${view.approvals.map((approval) => {
    const live = emailApprovalIsLive(approval);
    const own = approval.requestedBy === state.adminUid;
    const status = live ? approval.status : (approval.status === 'consumed' ? 'consumed' : 'expired');
    return `<div class="list-row"><div><strong>${escapeHtml(approval.content?.subject || 'Email-кампания')}</strong><small>Получателей: ${Number(approval.recipientCount || 0)} · точная аудитория: ${escapeHtml(JSON.stringify(approval.audience || {}))}</small><small>Исключения: отписаны ${Number(approval.summary?.suppressed || 0)}, назначение не подтверждено ${Number(approval.summary?.unknownPurpose || 0)}, недопустимы ${Number(approval.summary?.ineligible || 0)}, скрыты ${Number(approval.summary?.hidden || 0)}, Apple relay ${Number(approval.summary?.relay || 0)}</small><small>Запросил: ${escapeHtml(approval.requestedBy || '—')} · Preview: ${escapeHtml(approval.previewId || '—')} · действует до ${escapeHtml(dateTime(Math.min(Number(approval.expiresAtMs || 0), Number(approval.previewExpiresAtMs || approval.expiresAtMs || 0))))}</small><small>Причина / условие остановки: ${escapeHtml(approval.reason || '')}</small><details open class="section"><summary>Полный неизменяемый текст письма</summary><div class="support-body" style="white-space:pre-wrap">${escapeHtml(approval.content?.text || '')}</div></details><div class="notice warning section">Риск: массовая отправка. После постановки в очередь есть 5 минут на отмену; уже принятые провайдером письма вернуть нельзя.</div></div><div class="actions"><span class="badge ${status === 'approved' ? 'success' : status === 'pending' ? 'warning' : ''}">${escapeHtml(status)}</span>${approval.status === 'pending' && live && !own && can('emails.campaigns.approve') ? `<button class="button primary small" data-action="approve-email-campaign" data-approval-id="${escapeHtml(approval.id)}" type="button" title="Одобрить неизменяемый пакет вторым администратором">Одобрить</button>` : ''}${approval.status === 'pending' && live && own ? '<span class="badge">нужен второй администратор</span>' : ''}${approval.status === 'approved' && live && can('emails.campaigns.write') ? `<button class="button primary small" data-action="publish-approved-email" data-approval-id="${escapeHtml(approval.id)}" data-preview-id="${escapeHtml(approval.previewId)}" type="button" title="Поставить одобренную кампанию в очередь с пятиминутной задержкой отмены">В очередь</button>` : ''}</div></div>`;
  }).join('')}</div>`;
  return `<section class="card section"><div class="card-header"><div><h2>Email-кампании</h2><p>Preview → одобрение вторым администратором → очередь с 5-минутным окном отмены → отправка пакетами без дублей.</p></div><button class="button" data-action="load-email-campaigns" type="button"${disabledWhenUnauthorized('emails.campaigns.read')} title="Обновить кампании и запросы одобрения">${view.campaignState === 'idle' ? 'Загрузить' : 'Обновить'}</button></div><div class="card-body">
    <div class="notice">Адреса подбирает сервер. Отписки и пригодность проверяются ещё раз непосредственно перед каждым пакетом. Счётчик <strong>«принято провайдером»</strong> не означает гарантированную доставку.</div>
    <div class="fields section"><div class="field full"><label for="email-campaign-subject">Тема письма</label><input id="email-campaign-subject" maxlength="140" value="${escapeHtml(draft.subject || '')}"${locked ? ' disabled' : ''}></div><div class="field full"><label for="email-campaign-text">Текст письма</label><textarea id="email-campaign-text" rows="8" maxlength="6000"${locked ? ' disabled' : ''}>${escapeHtml(draft.text || '')}</textarea></div><div class="field"><label for="email-campaign-audience">Аудитория</label><select id="email-campaign-audience"${locked ? ' disabled' : ''}>${renderSelectOptions([['all','Все допустимые'],['plus','Plus'],['active','Активные'],['free','Free'],['dormant','Неактивные'],['app','Приложение'],['site','Сайт'],['current','Текущий фильтр каталога']], draft.audience?.kind || draft.audienceKind || 'all')}</select></div><div class="field full"><label for="email-campaign-reason">Причина и условие остановки</label><textarea id="email-campaign-reason" maxlength="500"${locked ? ' disabled' : ''}>${escapeHtml(preview?.reason || '')}</textarea></div></div>
    ${preview ? `<div class="notice warning section"><strong>Предпросмотр готов, письма не отправлены.</strong><br>Получателей: ${Number(preview.recipientCount || 0)} · найдено: ${Number(summary.directoryMatched || 0)} · отписаны: ${Number(summary.suppressed || 0)} · назначение не подтверждено: ${Number(summary.unknownPurpose || 0)} · недопустимы: ${Number(summary.ineligible || 0)} · скрыты: ${Number(summary.hidden || 0)} · Apple relay: ${Number(summary.relay || 0)}<br>Preview: ${escapeHtml(preview.previewId || '')} · истекает ${escapeHtml(dateTime(preview.expiresAtMs))}</div>` : ''}
    <div class="actions end section">${preview ? '<button class="button" data-action="discard-email-preview" type="button" title="Отменить предпросмотр и вернуться к редактированию">Изменить ещё</button>' : ''}<button class="button ${preview ? '' : 'primary'}" data-action="preview-email-campaign" type="button"${locked ? ' disabled' : ''} title="Рассчитать аудиторию без отправки">Предпросмотр</button>${preview ? '<button class="button primary" data-action="request-email-approval" type="button" title="Запросить обязательное одобрение второго администратора">Запросить одобрение</button>' : ''}</div>
    <div class="field section"><label for="email-approval-reason">Что проверено перед одобрением</label><input id="email-approval-reason" maxlength="500" placeholder="Аудитория, текст, ссылки, цель и условие остановки"></div>${approvalRows}
    <div class="field section"><label for="email-cancel-reason">Причина отмены</label><input id="email-cancel-reason" maxlength="500" placeholder="Почему очередь нужно остановить"></div>${campaignRows}
  </div></section>`;
}

function renderEmails() {
  const directory = state.emails;
  const counts = directory.counts || {};
  const options = (values, selected) => values.map(([value, label]) => `<option value="${value}"${selected === value ? ' selected' : ''}>${label}</option>`).join('');
  const rows = directory.items.map((item) => `<tr><td><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a>${item.displayName ? `<small>${escapeHtml(item.displayName)}</small>` : ''}</td><td>${(item.sources || []).map((source) => `<span class="badge">${source === 'app' ? 'приложение' : 'сайт'}</span>`).join(' ')}</td><td><span class="badge ${item.bulkEligibility === 'eligible' ? 'success' : item.bulkEligibility === 'ineligible' ? 'danger' : 'warning'}">${item.bulkEligibility === 'eligible' ? 'допустим' : item.bulkEligibility === 'ineligible' ? 'только контакт' : 'не проверен'}</span>${item.suppressed ? ' <span class="badge danger">отписан</span>' : ''}<small>${escapeHtml(item.eligibilitySource || '')}</small></td><td>${escapeHtml(item.contextLabel || '—')}</td><td>${escapeHtml(dateTime(item.lastSeenAtMs))}</td></tr>`).join('');
  return `${pageHeader(PAGES.emails, 'Пользователи / Email-контакты', `<button class="button primary" data-action="load-email-directory" type="button"${can('emails.directory.read') && !state.busy ? '' : ' disabled'} title="Обновить защищённый каталог контактов">Обновить каталог</button>`)}
    <section class="metrics section"><article class="card metric"><label>Все контакты</label><strong>${directory.state === 'ready' ? Number(counts.all || 0) : '—'}</strong><span class="badge">каталог</span></article><article class="card metric"><label>Приложение</label><strong>${directory.state === 'ready' ? Number(counts.app || 0) : '—'}</strong><span class="badge">app</span></article><article class="card metric"><label>Сайт</label><strong>${directory.state === 'ready' ? Number(counts.site || 0) : '—'}</strong><span class="badge">site</span></article><article class="card metric"><label>Отписаны</label><strong>${directory.state === 'ready' ? Number(counts.suppressed || 0) : '—'}</strong><span class="badge danger">не отправлять</span></article></section>
    <section class="card section"><div class="card-header"><div><h2>Каталог контактов</h2><p>Поиск выполняется на сервере. Закрытые UID и номера заказов используются для поиска, но не передаются в браузер.</p></div></div><div class="card-body">
      <div class="form-grid"><div class="field"><label for="email-directory-query">Поиск</label><input id="email-directory-query" value="${escapeHtml(directory.query)}" placeholder="Email, имя, UID или заказ"></div><div class="field"><label for="email-directory-source">Источник</label><select id="email-directory-source" data-email-source>${options([['all','Все'],['app','Приложение'],['site','Сайт']], directory.source)}</select></div><div class="field"><label for="email-directory-eligibility">Для рассылки</label><select id="email-directory-eligibility" data-email-eligibility>${options([['all','Все'],['eligible','Допустимые'],['unknown','Не проверены'],['ineligible','Только контакты']], directory.eligibility)}</select></div><div class="field"><label for="email-directory-suppression">Отписка</label><select id="email-directory-suppression" data-email-suppression>${options([['all','Все'],['active','Не отписаны'],['suppressed','Отписаны']], directory.suppression)}</select></div></div>
      <div class="actions section"><button class="button" data-action="load-email-directory" type="button"${can('emails.directory.read') && !state.busy ? '' : ' disabled'} title="Применить поиск и фильтры">Найти контакты</button><span class="hint">Найдено: ${Number(directory.filteredCount || 0)}</span></div>
      ${directory.state === 'loading' ? emptyState('Загружаем защищённый каталог…') : directory.error ? `<div class="notice danger">${escapeHtml(directory.error)}</div>` : !rows ? emptyState('Контактов по выбранным условиям нет.') : `<div class="table-wrap section"><table><thead><tr><th>Email</th><th>Источник</th><th>Статус</th><th>Контекст</th><th>Последний сигнал</th></tr></thead><tbody>${rows}</tbody></table></div>${directory.nextCursor ? '<div class="actions end section"><button class="button" data-action="load-email-directory-next" type="button" title="Загрузить следующую страницу">Показать ещё</button></div>' : ''}`}
    </div></section>
    <section class="card section"><div class="card-header"><div><h2>Экспорт и синхронизация</h2><p>Обе операции требуют причины и записываются в аудит. Синхронизация безопасно повторно собирает каталог из канонических источников.</p></div></div><div class="card-body"><div class="field"><label for="email-export-reason">Причина экспорта или синхронизации</label><input id="email-export-reason" maxlength="500" placeholder="Для какой проверенной задачи нужны адреса или синхронизация"></div><div class="actions end section"><button class="button" data-action="backfill-email-directory" type="button"${can('emails.directory.backfill') && !state.busy ? '' : ' disabled'} title="Повторно собрать защищённый каталог из пользователей, заказов и обращений">Синхронизировать каталог</button><button class="button" data-action="export-email-directory" type="button"${can('emails.directory.export') && !state.busy ? '' : ' disabled'} title="Скопировать отфильтрованные адреса с записью в аудит">Скопировать адреса</button></div></div></section>
    ${renderEmailCampaigns()}`;
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
  const headerAction = `<div class="actions"><button class="button" data-action="load-support" type="button"${disabledWhenUnauthorized()} title="Обновить сохранённую очередь писем">Обновить</button><button class="button primary" data-action="pull-support" type="button"${disabledWhenUnauthorized()} title="Получить новые письма из Gmail и обновить очередь">Проверить Gmail</button></div>`;
  return `${pageHeader(PAGES.support, 'Пользователи / Почта', headerAction)}
    <div class="notice">Письма людей не удаляются и не скрываются системным фильтром. Категория показывается отдельно, а в список возвращаются все статусы.</div>
    <section class="metrics section"><article class="card metric"><label>Всего загружено</label><strong>${state.support.loaded ? items.length : '—'}</strong><span class="badge">до 500</span></article><article class="card metric"><label>Новые</label><strong>${state.support.loaded ? count('new') : '—'}</strong><span class="badge warning">нужен ответ</span></article><article class="card metric"><label>Письма людей</label><strong>${state.support.loaded ? humanCount : '—'}</strong><span class="badge">не скрываются</span></article><article class="card metric"><label>Отвечено</label><strong>${state.support.loaded ? count('answered') : '—'}</strong><span class="badge success">готово</span></article></section>
    <div class="columns section"><section class="card"><div class="card-header"><div><h2>Рабочая очередь Gmail</h2><p>Черновики можно редактировать перед отправкой.</p></div><div class="actions"><button class="button small" data-support-filter="new" type="button" title="Показать письма, требующие ответа">Новые ${count('new')}</button><button class="button small" data-support-filter="answered" type="button" title="Показать письма с отправленным ответом">Отвечено ${count('answered')}</button><button class="button small" data-support-filter="archived" type="button" title="Показать архивные письма">Архив ${count('archived')}</button><button class="button small" data-support-filter="all" type="button" title="Показать все загруженные письма">Все</button></div></div>
      <div class="card-body"><div class="actions"><button class="button" data-action="generate-support-reply" data-message-id="" type="button"${state.support.loaded && count('new') && state.authorized && !state.busy && !pending ? '' : ' disabled'} title="Сгенерировать черновики для новых писем без ответа">Сгенерировать черновики</button><button class="button" data-action="prepare-support-reply-batch" type="button"${state.authorized && !state.busy && !pending && readyDrafts ? '' : ' disabled'} title="Сначала будет создан точный запечатанный список до 200 писем">Подготовить пакет (${readyDrafts})</button><span class="hint">Показано: ${filtered.length} из ${items.length}</span></div>
      ${!state.support.loaded ? emptyState('Загрузите входящие после авторизации.') : !filtered.length ? emptyState('В этом фильтре писем нет.') : `<div class="support-list section">${filtered.map((item) => {
        const messageId = escapeHtml(item.id);
        const status = String(item.status || 'new');
        const when = item.receivedAtMs ? new Date(Number(item.receivedAtMs)).toLocaleString('ru-RU') : String(item.receivedAtIso || item.receivedAt || '');
        const gateState = String(item.replyGate?.state || '');
        return `<article class="support-message"><header><div><strong>${escapeHtml(item.subject || '(без темы)')}</strong><small>${escapeHtml(item.fromName || '')} &lt;${escapeHtml(item.fromEmail || 'неизвестный отправитель')}&gt; · ${escapeHtml(when)}</small></div><div class="actions"><span class="badge">${escapeHtml(item.mailCategory || 'не определено')}</span><span class="badge ${badgeClass(status)}">${escapeHtml(statusName(status))}</span>${gateState ? `<span class="badge ${gateState === 'delivery_unknown' ? 'danger' : ''}">${escapeHtml(gateState)}</span>` : ''}</div></header><div class="support-body">${escapeHtml(String(item.bodyText || '').slice(0, 8000)) || '<span class="muted">Пустое тело письма</span>'}</div>${status !== 'archived' ? `<div class="field section"><label for="support-reply-${messageId}">Ответ</label><textarea id="support-reply-${messageId}" class="support-reply" placeholder="Введите ответ или сгенерируйте черновик">${escapeHtml(item.draftReply || '')}</textarea></div><div class="actions section"><button class="button small" data-action="generate-support-reply" data-message-id="${messageId}" type="button"${state.authorized && !state.busy && !pending ? '' : ' disabled'} title="Создать редактируемый черновик ответа без отправки">Сгенерировать</button><button class="button small primary" data-action="prepare-support-reply" data-message-id="${messageId}" type="button"${state.authorized && !state.busy && !pending && status === 'new' && gateState !== 'delivery_unknown' && gateState !== 'dispatching' ? '' : ' disabled'} title="Сначала будет показан точный текст с подписью">Подготовить отправку</button></div>` : ''}${gateState === 'delivery_unknown' ? `<div class="notice danger section">Gmail мог принять письмо, но подтверждение потеряно. Автоматический повтор заблокирован; владелец должен проверить папку «Отправленные».</div><div class="actions section"><button class="button small" data-action="resolve-support-reply" data-operation-id="${escapeHtml(item.replyGate?.operationId || '')}" data-resolution="accepted" type="button"${['owner', 'admin'].includes(state.adminRole) && !state.busy ? '' : ' disabled'} title="Подтвердить, что письмо найдено в отправленных">В отправленных: да</button><button class="button small" data-action="resolve-support-reply" data-operation-id="${escapeHtml(item.replyGate?.operationId || '')}" data-resolution="verified_not_sent" type="button"${['owner', 'admin'].includes(state.adminRole) && !state.busy ? '' : ' disabled'} title="Подтвердить, что письмо не было отправлено">В отправленных: нет</button></div>` : ''}<div class="actions section"><button class="button ghost small" data-action="set-support-status" data-message-id="${messageId}" data-status="${status === 'archived' ? 'new' : 'archived'}" type="button"${state.authorized && !state.busy && !pending ? '' : ' disabled'} title="${status === 'archived' ? 'Вернуть письмо в рабочую очередь' : 'Переместить письмо в архив'}">${status === 'archived' ? 'Вернуть в новые' : 'В архив'}</button></div></article>`;
      }).join('')}</div>`}</div></section>
      <section class="card"><div class="card-header"><div><h2>${pending ? (pendingIsBatch ? 'Подтверждение пакета' : 'Подтверждение отправки') : 'Подпись'}</h2><p>${pending ? (pendingIsBatch ? 'Проверьте состав запечатанного пакета.' : 'Проверьте точного получателя и итоговый текст.') : 'Добавляется сервером после текста ответа.'}</p></div></div><div class="card-body">${pending ? (pendingIsBatch ? `<div class="confirmation-panel"><dl><dt>Писем</dt><dd>${Number(pending.count || 0)}</dd><dt>Пакет</dt><dd><code>${escapeHtml(pending.batchId || '')}</code></dd><dt>Манифест</dt><dd><code>${escapeHtml(pending.manifestHash || '')}</code></dd><dt>До</dt><dd>${escapeHtml(pending.confirmationExpiresAt ? new Date(pending.confirmationExpiresAt).toLocaleString('ru-RU') : '')}</dd><dt>Состояние</dt><dd><span class="badge ${pending.state === 'attention_required' ? 'danger' : ''}">${escapeHtml(pending.state || 'prepared')}</span></dd></dl><div class="batch-preview section">${(Array.isArray(pending.items) ? pending.items : []).map((item, index) => `<details${index < 2 ? ' open' : ''}><summary>${index + 1}. ${escapeHtml(item.payload?.to || '')} — ${escapeHtml(item.payload?.subject || '')}</summary><div class="support-body confirmation-text">${escapeHtml(item.payload?.finalText || '')}</div></details>`).join('')}</div><div class="notice section">Каждое письмо имеет отдельную защищённую операцию. При частичном сбое пакет продолжит только ещё не начатые операции и никогда автоматически не повторит неопределённую доставку.</div><div class="actions end section"><button class="button" data-action="cancel-support-reply-batch" type="button"${state.busy || pending.state !== 'prepared' ? ' disabled' : ''} title="Отменить подготовленный пакет без отправки">Отменить пакет</button><button class="button primary" data-action="dispatch-support-reply-batch" type="button"${state.busy || !['prepared', 'dispatching', 'attention_required'].includes(pending.state) ? ' disabled' : ''} title="Подтвердить запечатанный пакет и начать защищённую отправку">Подтвердить пакет</button></div></div>` : `<div class="confirmation-panel"><dl><dt>Кому</dt><dd>${escapeHtml(pending.payload?.to || '')}</dd><dt>Тема</dt><dd>${escapeHtml(pending.payload?.subject || '')}</dd><dt>Операция</dt><dd><code>${escapeHtml(pending.operationId || '')}</code></dd><dt>До</dt><dd>${escapeHtml(pending.confirmationExpiresAt ? new Date(pending.confirmationExpiresAt).toLocaleString('ru-RU') : '')}</dd><dt>Состояние</dt><dd><span class="badge ${pending.state === 'delivery_unknown' ? 'danger' : ''}">${escapeHtml(pending.state || 'prepared')}</span></dd></dl><div class="support-body confirmation-text">${escapeHtml(pending.payload?.finalText || '')}</div><div class="notice section">После подтверждения этот запечатанный текст уже не изменяется. Повторный клик не создаст вторую SMTP-отправку.</div><div class="actions end section"><button class="button" data-action="cancel-support-reply" type="button"${state.busy ? ' disabled' : ''} title="Отменить подготовленную отправку">Отменить</button><button class="button primary" data-action="dispatch-support-reply" type="button"${state.busy || pending.state !== 'prepared' ? ' disabled' : ''} title="Подтвердить точный текст и отправить один раз">Подтвердить и отправить</button></div></div>`) : `<div class="field"><label for="support-signature">Подпись поддержки</label><textarea id="support-signature" maxlength="2000" placeholder="С уважением, команда Phraseman">${escapeHtml(state.support.signature || '')}</textarea></div><div class="hint">Ревизия подписи: ${Number(state.support.signatureRevision || 0)}</div><div class="actions end section"><button class="button primary" data-action="save-support-signature" type="button"${state.authorized && !state.busy ? '' : ' disabled'} title="Сохранить подпись для будущих ответов">Сохранить подпись</button></div><div class="notice section">Одиночная и пакетная отправка защищены неизменяемыми операциями, явным предпросмотром и блокировкой автоматического повтора при неопределённом ответе Gmail.</div><a class="button section" href="../../admin/index.html#gmail-support" target="_blank" rel="noopener">Открыть прежний модуль</a>`}</div></section></div>${renderWebsiteInbox()}`;
}

function renderAnalytics() {
  return renderAdminAnalytics({
    ...state.analytics,
    rangeDays: state.analytics.snapshot?.rangeDays ?? 28,
    authorized: can('money.read'),
    controlsDisabled: Boolean(disabledWhenUnauthorized('money.read')),
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

const CACHE_SOURCE_LABELS = Object.freeze({
  choice_explanations: 'Выбор ответа',
  phrase_explanations: 'Фразы',
  mistake_explanations: 'Ошибки',
  quiz_explanations: 'Квизы',
  compass_briefings: 'Compass',
});

const COMPASS_BOOL_LABELS = Object.freeze({
  compass_enabled: 'Compass включён',
  compass_ai_voice_enabled: 'AI-голос',
  compass_deep_dive_enabled: 'Углубление темы',
  compass_lesson_invite_enabled: 'Приглашение в урок',
  compass_economy_enabled: 'Экономика',
  compass_retention_enabled: 'Удержание',
  compass_topic_map_enabled: 'Карта тем',
});

const COMPASS_TEXT_LABELS = Object.freeze({
  compass_voice_fallback_ru: 'Резервный текст голоса · RU',
  compass_voice_fallback_uk: 'Резервный текст голоса · UK',
  compass_voice_fallback_es: 'Резервный текст голоса · ES',
});

function cacheListInput(area = 'cache', cursor = '') {
  const compass = area === 'compass';
  return {
    source: compass ? 'compass_briefings' : String(document.getElementById('cache-source')?.value || state.cache.source),
    status: String(document.getElementById(compass ? 'compass-cache-status' : 'cache-status')?.value || (compass ? state.compass.cacheStatus : state.cache.status) || ''),
    lang: String(document.getElementById(compass ? 'compass-cache-lang' : 'cache-lang')?.value || (compass ? state.compass.cacheLang : state.cache.lang) || '').trim(),
    query: String(document.getElementById(compass ? 'compass-cache-query' : 'cache-query')?.value || (compass ? state.compass.cacheQuery : state.cache.query) || '').trim(),
    pageSize: 25,
    cursor,
  };
}

function applyCachePage(result, area = 'cache', append = false) {
  if (area === 'compass') {
    state.compass = {
      ...state.compass,
      cacheItems: append ? [...state.compass.cacheItems, ...(result?.items || [])] : (result?.items || []),
      cacheSummary: result?.summary || null,
      cacheNextCursor: String(result?.nextCursor || ''),
      error: '',
    };
    return;
  }
  state.cache = {
    ...state.cache,
    state: 'ready',
    items: append ? [...state.cache.items, ...(result?.items || [])] : (result?.items || []),
    summary: result?.summary || null,
    nextCursor: String(result?.nextCursor || ''),
    hasMore: result?.hasMore === true,
    error: '',
  };
}

async function loadCacheEntries(area = 'cache', append = false) {
  const cursor = append ? (area === 'compass' ? state.compass.cacheNextCursor : state.cache.nextCursor) : '';
  const input = cacheListInput(area, cursor);
  if (area === 'compass') {
    state.compass = { ...state.compass, cacheStatus: input.status, cacheLang: input.lang, cacheQuery: input.query };
  } else {
    state.cache = { ...state.cache, state: 'loading', source: input.source, status: input.status, lang: input.lang, query: input.query };
  }
  const result = await actions.listCacheEntries(input);
  applyCachePage(result, area, append);
  return result;
}

function cacheEntryTitle(item) {
  return item.correctEn || item.phraseEn || item.targetEn || item.questionPrompt || item.comment || item.id;
}

function renderCacheEntries(items, area) {
  if (!items.length) return emptyState('По выбранным фильтрам записей нет.');
  return `<div class="support-list">${items.map((item) => `<article class="support-message">
    <header><div><strong>${escapeHtml(String(cacheEntryTitle(item)).slice(0, 180))}</strong><small>${escapeHtml(item.id)} · ${escapeHtml(item.lang || 'язык не указан')} · схема ${Number(item.schemaVersion || 0)}</small></div><div class="actions"><span class="badge ${item.status === 'ready' ? 'success' : item.status === 'pending' ? 'warning' : item.status === 'rejected' ? 'danger' : ''}">${escapeHtml(item.status || 'unknown')}</span></div></header>
    <details><summary>Безопасная проекция записи</summary><pre class="code-preview">${escapeHtml(JSON.stringify(item, null, 2))}</pre></details>
    ${can('content.cache.reset') ? `<footer><button class="button danger small" data-action="preview-cache-reset" data-cache-area="${area}" data-cache-source="${escapeHtml(item.source)}" data-cache-document-id="${escapeHtml(item.id)}" type="button" title="Подготовить удаление ровно одной записи; генерация не запускается">Подготовить сброс</button></footer>` : ''}
  </article>`).join('')}</div>`;
}

function renderCacheResetPreview(area) {
  const preview = area === 'compass' ? state.compass.cacheResetPreview : state.cache.resetPreview;
  if (!preview) return '';
  return `<div class="notice warning section"><strong>Сброс одной записи подготовлен</strong><br>
    ${escapeHtml(preview.source)}/${escapeHtml(preview.documentId)} · ${escapeHtml(preview.status || 'unknown')}<br>
    Удалится только эта запись. Новая генерация возможна позже только по запросу пользователя.
    <div class="field section"><label for="${area}-cache-reset-confirmation">Введите точное подтверждение</label><input id="${area}-cache-reset-confirmation" value="" placeholder="${escapeHtml(preview.confirmation)}" autocomplete="off"></div>
    <div class="actions end"><button class="button" data-action="discard-cache-reset" data-cache-area="${area}" type="button" title="Отменить без удаления">Отмена</button><button class="button danger" data-action="confirm-cache-reset" data-cache-area="${area}" type="button" title="Удалить ровно одну подтверждённую запись">Удалить одну запись</button></div>
  </div>`;
}

function renderCacheFilters(area = 'cache') {
  const compass = area === 'compass';
  const model = compass ? state.compass : state.cache;
  return `<div class="report-filters">
    ${compass ? '' : `<div class="field"><label for="cache-source">Источник</label><select id="cache-source">${renderSelectOptions(Object.entries(CACHE_SOURCE_LABELS), model.source)}</select></div>`}
    <div class="field"><label for="${compass ? 'compass-cache-status' : 'cache-status'}">Статус</label><select id="${compass ? 'compass-cache-status' : 'cache-status'}">${renderSelectOptions([['', 'Все'], ['ready', 'Готово'], ['pending', 'В работе'], ['rejected', 'Отклонено']], compass ? model.cacheStatus : model.status)}</select></div>
    <div class="field"><label for="${compass ? 'compass-cache-lang' : 'cache-lang'}">Язык</label><input id="${compass ? 'compass-cache-lang' : 'cache-lang'}" value="${escapeHtml(compass ? model.cacheLang : model.lang)}" placeholder="en"></div>
    <div class="field"><label for="${compass ? 'compass-cache-query' : 'cache-query'}">Поиск</label><input id="${compass ? 'compass-cache-query' : 'cache-query'}" value="${escapeHtml(compass ? model.cacheQuery : model.query)}" placeholder="Фраза или текст"></div>
    ${compass ? '<button class="button primary" data-action="load-compass-cache" type="button" title="Применить фильтры и загрузить безопасную серверную проекцию Compass">Применить</button>' : '<button class="button primary" data-action="load-cache" type="button" title="Применить фильтры и загрузить безопасную серверную проекцию">Применить</button>'}
  </div>`;
}

function renderExplainCache() {
  const cache = state.cache;
  const summary = cache.summary || {};
  return `${pageHeader(PAGES['explain-cache'], 'Контент / Кэш объяснений', '<a class="button" href="#diagnostics">Журнал операций</a>')}
    <div class="notice">Здесь используются те же рабочие коллекции, что и в старой админке. Чтение, экспорт и точечный сброс выполняются через защищённые серверные операции; этот экран никогда не запускает генерацию.</div>
    ${cache.error ? `<div class="notice danger section">${escapeHtml(cache.error)}</div>` : ''}
    <section class="metrics section">${operationalMetric('Всего', summary.total ?? '—', 'выбранная коллекция')}${operationalMetric('Готово', summary.ready ?? '—', 'ready', 'success')}${operationalMetric('В работе', summary.pending ?? '—', 'pending', 'warning')}${operationalMetric('Отклонено', summary.rejected ?? '—', 'rejected', 'danger')}</section>
    <section class="card section"><div class="card-header"><div><h2>Фильтры и экспорт</h2><p>Выгрузка ограничена 500 записями и фиксируется в журнале аудита.</p></div></div><div class="card-body">${renderCacheFilters('cache')}<div class="field section"><label for="cache-operation-reason">Причина экспорта или сброса</label><input id="cache-operation-reason" maxlength="500" placeholder="Что проверяем и зачем"></div><div class="actions"><button class="button" data-action="export-cache-json" type="button" title="Скопировать ограниченную JSON-выгрузку и записать действие в аудит"${disabledWhenUnauthorized('content.cache.export')}>Копировать JSON</button><button class="button" data-action="export-cache-review" type="button" title="Скопировать пакет ручной проверки и записать действие в аудит"${disabledWhenUnauthorized('content.cache.export')}>Копировать пакет проверки</button></div>${renderCacheResetPreview('cache')}</div></section>
    <section class="card section"><div class="card-header"><div><h2>Записи</h2><p>Показано ${cache.items.length}; свежие блокировки pending защищены от сброса.</p></div><span class="badge ${badgeClass(cache.state)}">${escapeHtml(cache.state)}</span></div><div class="card-body">${renderCacheEntries(cache.items, 'cache')}${cache.nextCursor ? '<div class="actions end section"><button class="button" data-action="load-cache-next" type="button" title="Загрузить следующую страницу текущей выборки">Показать ещё</button></div>' : ''}</div></section>`;
}

function compassDraftFromDom() {
  const bools = {};
  Object.keys(COMPASS_BOOL_LABELS).forEach((key) => { bools[key] = document.getElementById(`compass-bool-${key}`)?.checked === true; });
  const texts = {};
  Object.keys(COMPASS_TEXT_LABELS).forEach((key) => { texts[key] = String(document.getElementById(`compass-text-${key}`)?.value || '').trim(); });
  return { bools, texts };
}

function compassPatchFromDraft(draft, config) {
  const patch = { bools: {}, texts: {} };
  Object.keys(COMPASS_BOOL_LABELS).forEach((key) => { if (draft.bools[key] !== config.bools[key]?.effective) patch.bools[key] = draft.bools[key]; });
  Object.keys(COMPASS_TEXT_LABELS).forEach((key) => { if (draft.texts[key] !== (config.texts[key]?.configured ?? '')) patch.texts[key] = draft.texts[key]; });
  if (!Object.keys(patch.bools).length) delete patch.bools;
  if (!Object.keys(patch.texts).length) delete patch.texts;
  return patch;
}

function compassReviewPacket(item, requestedBy = '') {
  return {
    previewId: item.previewId,
    revision: item.revision,
    requestedBy: item.requestedBy || requestedBy,
    previewRequestId: item.previewRequestId || item.requestId,
    reason: item.reason,
    expiresAtMs: item.expiresAtMs,
    risk: item.risk,
    rollbackPath: item.rollbackPath,
    before: item.before,
    patch: item.patch,
    after: item.after,
    fingerprint: item.fingerprint,
    confirmation: item.confirmation,
  };
}

function renderCompassApprovals(approvals) {
  const live = approvals.filter((item) => ['pending', 'approved'].includes(item.status) && Math.min(Number(item.expiresAtMs || 0), Number(item.previewExpiresAtMs || 0)) > Date.now());
  if (!live.length) return emptyState('Активных запросов на изменение нет.');
  return `<div class="support-list">${live.map((item) => `<article class="support-message"><header><div><strong>${item.status === 'pending' ? 'Ожидает второго администратора' : 'Одобрено'}</strong><small>${escapeHtml(item.id)} · автор ${escapeHtml(item.requestedBy)} · истекает ${escapeHtml(dateTime(item.expiresAtMs))}</small></div><span class="badge ${item.status === 'approved' ? 'success' : 'warning'}">${escapeHtml(item.status)}</span></header><details open><summary>Неизменяемый пакет решения</summary><pre class="code-preview">${escapeHtml(JSON.stringify(compassReviewPacket(item), null, 2))}</pre></details>${item.status === 'approved' && item.requestedBy === state.adminUid ? `<div class="field"><label for="compass-approved-confirmation-${escapeHtml(item.id)}">Точное подтверждение</label><input id="compass-approved-confirmation-${escapeHtml(item.id)}" placeholder="${escapeHtml(item.confirmation)}" autocomplete="off"></div>` : ''}<footer class="actions">${item.status === 'pending' && item.requestedBy !== state.adminUid && can('application.compass.approve') ? `<button class="button primary small" data-action="approve-compass-change" data-approval-id="${escapeHtml(item.id)}" type="button" title="Одобрить изменение как второй администратор">Одобрить</button>` : ''}${item.status === 'approved' && item.requestedBy === state.adminUid && can('application.compass.write') ? `<button class="button primary small" data-action="apply-approved-compass-change" data-approval-id="${escapeHtml(item.id)}" type="button" title="Опубликовать одобренные настройки после точного подтверждения">Применить</button>` : ''}</footer></article>`).join('')}</div>`;
}

function renderCompass() {
  const model = state.compass;
  const workspace = model.workspace;
  if (!workspace) return `${pageHeader(PAGES.compass, 'Контент / Compass')}<section class="card section"><div class="card-body">${model.error ? `<div class="notice danger">${escapeHtml(model.error)}</div>` : emptyState(model.state === 'loading' ? 'Загружаем Compass…' : 'Данные Compass ещё не загружены.')}<div class="actions section"><button class="button primary" data-action="load-compass" type="button" title="Загрузить настройки, аналитику, одобрения и кэш Compass">Загрузить</button></div></div></section>`;
  const config = workspace.config || { bools: {}, texts: {}, revision: 0 };
  const analytics = workspace.analytics || { cache: {}, billing: {} };
  const draft = model.draft || { bools: Object.fromEntries(Object.entries(config.bools).map(([key, value]) => [key, value.effective])), texts: Object.fromEntries(Object.entries(config.texts).map(([key, value]) => [key, value.configured ?? ''])) };
  const preview = model.preview;
  return `${pageHeader(PAGES.compass, 'Контент / Compass', '<a class="button" href="#explain-cache">Все кэши</a><a class="button" href="#diagnostics">Диагностика</a>')}
    <div class="notice">Настройки читаются и публикуются в том же документе Remote Config, который использует приложение. Экстренное выключение доступно сразу; включение и любые другие изменения требуют второго администратора.</div>
    ${model.error ? `<div class="notice danger section">${escapeHtml(model.error)}</div>` : ''}
    <section class="metrics section">${operationalMetric('Кэш всего', analytics.cache?.total ?? 0, 'compass_briefings')}${operationalMetric('Готово', analytics.cache?.ready ?? 0, 'ready', 'success')}${operationalMetric(`Попытки · ${analytics.rangeDays || 28} дн.`, analytics.billing?.attempts ?? 0, 'compass_billing')}${operationalMetric('Опубликовано', analytics.billing?.published ?? 0, 'published', 'success')}</section>
    <div class="columns section"><section class="card"><div class="card-header"><div><h2>Переключатели</h2><p>Ревизия ${Number(config.revision || 0)}. Зелёный означает включённую функцию.</p></div></div><div class="card-body">${Object.entries(COMPASS_BOOL_LABELS).map(([key, label]) => `<label class="check-row" for="compass-bool-${key}"><input id="compass-bool-${key}" type="checkbox"${draft.bools[key] ? ' checked' : ''}><span><strong>${escapeHtml(label)}</strong><small>${config.bools[key]?.configured === null ? 'Встроенное значение по умолчанию' : 'Явно настроено'}</small></span></label>`).join('')}</div></section>
    <section class="card"><div class="card-header"><div><h2>Резервные тексты</h2><p>Пустое значение оставляет встроенный текст приложения.</p></div></div><div class="card-body">${Object.entries(COMPASS_TEXT_LABELS).map(([key, label]) => `<div class="field"><label for="compass-text-${key}">${escapeHtml(label)}</label><textarea id="compass-text-${key}" maxlength="500">${escapeHtml(draft.texts[key] || '')}</textarea></div>`).join('')}<div class="field"><label for="compass-change-reason">Причина изменения</label><textarea id="compass-change-reason" maxlength="500" placeholder="Что меняем, зачем и что проверено"></textarea></div><button class="button primary" data-action="preview-compass-change" type="button" title="Проверить ревизию и подготовить серверный предпросмотр без публикации"${disabledWhenUnauthorized('application.compass.write')}>Подготовить изменения</button></div></section></div>
    ${preview ? `<section class="card section"><div class="card-header"><div><h2>Серверный предпросмотр</h2><p>${preview.requiresApproval ? 'Нужно одобрение другого администратора.' : 'Экстренное выключение можно применить сразу.'}</p></div><span class="badge ${preview.requiresApproval ? 'warning' : 'danger'}">${preview.requiresApproval ? '2 администратора' : 'emergency off'}</span></div><div class="card-body"><details open><summary>Полный пакет до принятия решения</summary><pre class="code-preview">${escapeHtml(JSON.stringify(compassReviewPacket(preview, state.adminUid), null, 2))}</pre></details><div class="field"><label for="compass-confirmation">Точное подтверждение</label><input id="compass-confirmation" placeholder="${escapeHtml(preview.confirmation)}" autocomplete="off"></div><div class="actions end"><button class="button" data-action="discard-compass-preview" type="button" title="Отменить предпросмотр без изменения настроек">Отмена</button>${preview.requiresApproval ? '<button class="button primary" data-action="request-compass-approval" type="button" title="Отправить изменение на проверку другому администратору">Запросить одобрение</button>' : '<button class="button danger" data-action="apply-compass-change" type="button" title="Применить только экстренное выключение после точного подтверждения">Применить выключение</button>'}</div></div></section>` : ''}
    <section class="card section"><div class="card-header"><div><h2>Одобрения</h2><p>Для решения укажите, что именно проверено.</p></div><button class="button" data-action="load-compass" type="button" title="Обновить настройки, аналитику и очередь одобрений">Обновить</button></div><div class="card-body"><div class="field"><label for="compass-approval-reason">Комментарий администратора</label><input id="compass-approval-reason" maxlength="500" placeholder="Проверены значения и влияние на приложение"></div>${renderCompassApprovals(workspace.approvals || [])}</div></section>
    <section class="card section"><div class="card-header"><div><h2>Кэш Compass</h2><p>Показатель попаданий в кэш пока недоступен: чтения готовых записей не логируются.</p></div></div><div class="card-body">${renderCacheFilters('compass')}<div class="field section"><label for="compass-cache-operation-reason">Причина точечного сброса</label><input id="compass-cache-operation-reason" maxlength="500" placeholder="Почему запись надо перестроить"></div>${renderCacheResetPreview('compass')}${renderCacheEntries(model.cacheItems, 'compass')}${model.cacheNextCursor ? '<div class="actions end section"><button class="button" data-action="load-compass-cache-next" type="button" title="Загрузить следующую страницу кэша Compass">Показать ещё</button></div>' : ''}</div></section>`;
}

function renderCurrentPage() {
  const target = document.getElementById('app');
  if (!target) return;
  const renderers = { overview: renderOverview, 'control-panel': renderControlPanel, application: renderApplication, campaigns: renderCampaigns, users: renderUsers, money: renderMoney, content: renderContent, community: renderCommunity, diagnostics: renderDiagnostics, support: renderSupport, emails: renderEmails, analytics: renderAnalytics, 'daily-briefing': renderDailyBriefing, 'report-center': renderReportQueue, 'asset-studio': renderAssetStudio, 'explain-cache': renderExplainCache, compass: renderCompass };
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

function applyWebsiteInboxResult(result) {
  state.support.website = {
    ...state.support.website,
    loaded: true,
    loading: false,
    items: Array.isArray(result?.items) ? result.items : [],
    truncated: result?.truncated === true,
    error: '',
  };
}

function maybeLoadSupportQueues() {
  if (state.route !== 'support' || !state.authorized || !actions) return;
  const generation = state.authGeneration;
  if (!state.support.loaded && !state.support.loading) {
    state.support.loading = true;
    void actions.loadSupport({ limit: 500 }).then((result) => {
      if (generation !== state.authGeneration || state.route !== 'support') return;
      applySupportListResult(result);
      state.support.loading = false;
      renderCurrentPage();
    }).catch((error) => {
      if (generation !== state.authGeneration) return;
      state.support.loading = false;
      setMessage(`Не удалось загрузить Gmail: ${errorMessage(error)}`, 'danger');
      renderCurrentPage();
    });
  }
  if (!state.support.website.loaded && !state.support.website.loading) {
    state.support.website.loading = true;
    void actions.listWebsiteInbox({ limit: 200 }).then((result) => {
      if (generation !== state.authGeneration || state.route !== 'support') return;
      applyWebsiteInboxResult(result);
      renderCurrentPage();
    }).catch((error) => {
      if (generation !== state.authGeneration) return;
      state.support.website = { ...state.support.website, loaded: true, loading: false, error: errorMessage(error) };
      renderCurrentPage();
    });
  }
}

function emailDirectoryInput(cursor = '') {
  return {
    source: String(document.getElementById('email-directory-source')?.value || state.emails.source || 'all'),
    eligibility: String(document.getElementById('email-directory-eligibility')?.value || state.emails.eligibility || 'all'),
    suppression: String(document.getElementById('email-directory-suppression')?.value || state.emails.suppression || 'all'),
    query: String(document.getElementById('email-directory-query')?.value || state.emails.query || '').trim(),
    pageSize: 50,
    cursor,
  };
}

function applyEmailDirectory(result, append = false) {
  state.emails = {
    ...state.emails,
    state: 'ready',
    items: append ? [...state.emails.items, ...(Array.isArray(result?.items) ? result.items : [])] : (Array.isArray(result?.items) ? result.items : []),
    counts: result?.counts || null,
    filteredCount: Number(result?.filteredCount || 0),
    nextCursor: String(result?.nextCursor || ''),
    error: '',
  };
}

function maybeLoadEmailDirectory() {
  if (state.route !== 'emails' || !state.authorized || !actions || !can('emails.directory.read') || state.emails.state !== 'idle') return;
  state.emails.state = 'loading';
  const generation = state.authGeneration;
  actions.listEmailContacts(emailDirectoryInput()).then((result) => {
    if (generation !== state.authGeneration || state.route !== 'emails') return;
    applyEmailDirectory(result);
    renderCurrentPage();
  }).catch((error) => {
    state.emails = { ...state.emails, state: 'error', error: errorMessage(error) };
    renderCurrentPage();
  });
}

function maybeLoadEmailCampaigns() {
  if (state.route !== 'emails' || !state.authorized || !actions || !can('emails.campaigns.read') || state.emails.campaignState !== 'idle') return;
  const generation = state.authGeneration;
  state.emails.campaignState = 'loading';
  actions.listEmailCampaigns().then((result) => {
    if (generation !== state.authGeneration || state.route !== 'emails') return;
    state.emails = { ...state.emails, campaignState: 'ready', campaigns: Array.isArray(result?.campaigns) ? result.campaigns : [], approvals: Array.isArray(result?.approvals) ? result.approvals : [], campaignError: '' };
    renderCurrentPage();
  }).catch((error) => {
    if (generation !== state.authGeneration) return;
    state.emails = { ...state.emails, campaignState: 'error', campaignError: errorMessage(error) };
    renderCurrentPage();
  });
}

function maybeLoadCacheWorkspace() {
  if (state.route !== 'explain-cache' || !state.authorized || !actions || !can('content.cache.read') || state.cache.state !== 'idle') return;
  const generation = state.authGeneration;
  state.cache.state = 'loading';
  actions.listCacheEntries(cacheListInput('cache')).then((result) => {
    if (generation !== state.authGeneration || state.route !== 'explain-cache') return;
    applyCachePage(result);
    renderCurrentPage();
  }).catch((error) => {
    if (generation !== state.authGeneration) return;
    state.cache = { ...state.cache, state: 'error', error: errorMessage(error) };
    renderCurrentPage();
  });
}

function applyCompassWorkspace(result) {
  const config = result?.config || { revision: 0, bools: {}, texts: {} };
  state.compass = {
    ...state.compass,
    state: 'ready',
    workspace: result || null,
    approvals: Array.isArray(result?.approvals) ? result.approvals : [],
    draft: {
      bools: Object.fromEntries(Object.entries(config.bools || {}).map(([key, value]) => [key, value.effective])),
      texts: Object.fromEntries(Object.entries(config.texts || {}).map(([key, value]) => [key, value.configured ?? ''])),
    },
    error: '',
  };
}

async function loadCompassWorkspace() {
  const [workspace, cache] = await Promise.all([
    actions.getCompassWorkspace({ rangeDays: 28 }),
    actions.listCacheEntries(cacheListInput('compass')),
  ]);
  applyCompassWorkspace(workspace);
  applyCachePage(cache, 'compass');
}

function maybeLoadCompassWorkspace() {
  if (state.route !== 'compass' || !state.authorized || !actions || !can('application.compass.read') || state.compass.state !== 'idle') return;
  const generation = state.authGeneration;
  state.compass.state = 'loading';
  loadCompassWorkspace().then(() => {
    if (generation !== state.authGeneration || state.route !== 'compass') return;
    renderCurrentPage();
  }).catch((error) => {
    if (generation !== state.authGeneration) return;
    state.compass = { ...state.compass, state: 'error', error: errorMessage(error) };
    renderCurrentPage();
  });
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

function parseLessonList(raw) {
  if (Array.isArray(raw)) {
    const parsed = [];
    for (const value of raw) {
      const number = Number(value);
      if (!Number.isInteger(number) || number < 1 || number > LESSON_LOCK_COUNT) throw new Error('Список уроков должен содержать только целые числа 1–32.');
      parsed.push(number);
    }
    return [...new Set(parsed)].sort((a, b) => a - b);
  }
  const text = String(raw ?? '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try { return parseLessonList(JSON.parse(text)); } catch { throw new Error('Список уроков должен быть числами 1–32 через запятую или JSON-массивом.'); }
  }
  const parsed = [];
  for (const token of text.split(/[,\s]+/).filter(Boolean)) {
    if (!/^\d+$/.test(token)) throw new Error(`Некорректный номер урока: ${token}. Используйте целые числа 1–32.`);
    const number = Number(token);
    if (!Number.isInteger(number) || number < 1 || number > LESSON_LOCK_COUNT) throw new Error(`Урок вне диапазона 1–32: ${token}.`);
    parsed.push(number);
  }
  return [...new Set(parsed)].sort((a, b) => a - b);
}

function formatLessonList(raw) {
  try {
    return parseLessonList(raw).join(', ');
  } catch {
    return String(raw ?? '');
  }
}

function lessonListText(list) {
  return list.length ? JSON.stringify(list) : '';
}

function premiumLessonAccessSummary(limit, freeExtra, premiumExtra, lessonsGatePremium) {
  const free = [];
  const plus = [];
  for (let lessonId = 1; lessonId <= LESSON_LOCK_COUNT; lessonId += 1) {
    let isFree = !lessonsGatePremium;
    if (lessonsGatePremium) {
      isFree = lessonId <= limit;
      if (premiumExtra.includes(lessonId)) isFree = false;
    }
    if (freeExtra.includes(lessonId)) isFree = true;
    (isFree ? free : plus).push(lessonId);
  }
  return { free, plus };
}

function readPremiumAccessLimit(limit) {
  const raw = readTextInput(`premium-limit-${limit.key}`, 12);
  const value = raw === '' ? limit.def : Math.round(Number(raw));
  if (!Number.isFinite(value) || value < limit.min || value > limit.max) throw new Error(`${limit.label}: укажите число ${limit.min}–${limit.max}.`);
  return value;
}

function buildPremiumAccessPreview() {
  if (!state.remoteConfig?.config) throw new Error('Сначала загрузите текущую конфигурацию.');
  const bools = {};
  for (const feature of PREMIUM_ACCESS_FEATURES) {
    const value = String(document.getElementById(`premium-gate-${feature.key}`)?.value ?? 'premium');
    bools[feature.key] = value !== 'free';
  }
  const numbers = {};
  for (const limit of PREMIUM_ACCESS_LIMITS) numbers[limit.key] = readPremiumAccessLimit(limit);
  const freeExtra = parseLessonList(document.getElementById('premium-free-lessons-extra')?.value ?? '');
  const premiumExtra = parseLessonList(document.getElementById('premium-premium-lessons-extra')?.value ?? '');
  const overlap = freeExtra.filter((lessonId) => premiumExtra.includes(lessonId));
  if (overlap.length) throw new Error(`Уроки не могут быть одновременно Free и Plus: ${overlap.join(', ')}.`);
  const reason = readTextInput('premium-access-reason', 500);
  if (!reason) throw new Error('Укажите причину изменения Free / Plus доступа.');
  const texts = {
    free_lessons_extra: lessonListText(freeExtra),
    premium_lessons_extra: lessonListText(premiumExtra),
  };
  const nextConfig = { bools, numbers, texts };
  const version = Number(state.remoteConfig.config.version);
  if (Number.isInteger(version) && version > 0) nextConfig.version = version;
  const changes = remoteConfigChanges(nextConfig);
  const lessonAccess = premiumLessonAccessSummary(numbers.free_lesson_limit, freeExtra, premiumExtra, bools.gate_lessons_premium);
  const freeFeatureCount = Object.values(bools).filter((value) => value === false).length;
  const summary = `Free features: ${freeFeatureCount}/${PREMIUM_ACCESS_FEATURES.length}. Free lessons: ${lessonAccess.free.length}/${LESSON_LOCK_COUNT}.`;
  const details = [
    `Free lessons: ${lessonAccess.free.join(', ') || 'нет'}.`,
    `Plus lessons: ${lessonAccess.plus.join(', ') || 'нет'}.`,
    `Limits: уроки ${numbers.free_lesson_limit}; квизы ${numbers.free_daily_quiz_limit}/день; тренажёр ${numbers.free_trainer_sessions_per_day}/день; арена ${numbers.arena_daily_max}/день; энергия ${numbers.max_energy}.`,
    `Free feature gates: ${PREMIUM_ACCESS_FEATURES.filter((feature) => bools[feature.key] === false).map((feature) => feature.label).join(', ') || 'нет'}.`,
    'Stop condition: восстановить значения из истории Remote Config или собрать новый preview с прежними лимитами.',
  ];
  return { nextConfig, reason, changes, source: 'premium-access', title: 'Предпросмотр Free / Plus доступа', summary, details };
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

function appMessageLines(id, maxItems = 6) {
  return readTextInput(id, 1000).split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, maxItems);
}

function buildAppMessagePreview() {
  const kind = String(document.getElementById('app-message-kind')?.value || 'message') === 'poll' ? 'poll' : 'message';
  const active = String(document.getElementById('app-message-active')?.value || 'false') === 'true';
  const audienceRaw = String(document.getElementById('app-message-audience')?.value || 'all');
  const audience = ['all', 'free', 'premium'].includes(audienceRaw) ? audienceRaw : 'all';
  const priority = Math.floor(Number(readTextInput('app-message-priority', 4) || 0));
  const ttlDays = Math.floor(Number(readTextInput('app-message-ttl-days', 3) || 30));
  if (!Number.isFinite(priority) || priority < 0 || priority > 99) throw new Error('Приоритет должен быть от 0 до 99.');
  if (!Number.isFinite(ttlDays) || ttlDays < 1 || ttlDays > 30) throw new Error('Срок сообщения должен быть от 1 до 30 дней.');
  const translations = {};
  for (const language of APP_MESSAGE_LANGUAGES) {
    const pollOptions = language.key === 'ru'
      ? Array.from({ length: 6 }, (_, index) => readTextInput(`app-message-poll-option-${index + 1}`, 160)).filter(Boolean)
      : appMessageLines(`app-message-poll-options-${language.key}`);
    translations[language.key] = {
      title: readTextInput(`app-message-title-${language.key}`, 160),
      body: readTextInput(`app-message-body-${language.key}`, 2000),
      pollQuestion: readTextInput(`app-message-poll-question-${language.key}`, 300),
      pollOptions,
    };
  }
  if (!translations.ru.title || !translations.ru.body) throw new Error('Заполните тему и текст RU.');
  if (kind === 'poll' && (!translations.ru.pollQuestion || translations.ru.pollOptions.length < 2)) throw new Error('Для опроса заполните вопрос RU и минимум два варианта.');
  const reason = readTextInput('app-message-reason', 500);
  if (!reason) throw new Error(state.campaigns.editingId ? 'Укажите причину изменения сообщения.' : 'Укажите причину публикации сообщения.');
  const payload = { kind, active, audience, priority, ttlDays, translations };
  const editingItem = state.campaigns.editingId
    ? state.campaigns.items.find((item) => String(item.id) === String(state.campaigns.editingId))
    : null;
  if (state.campaigns.editingId && !editingItem) throw new Error('Редактируемое сообщение больше не найдено. Обновите список.');
  if (editingItem?.active !== false) throw new Error('Сообщение нужно сначала выключить, затем снова открыть редактирование.');
  if (editingItem?.poll?.options) payload.pollOptionIds = editingItem.poll.options.map((option) => String(option?.id || '')).filter(Boolean);
  const resetPollEngagement = editingItem ? appMessageEditResetsPoll(editingItem, payload) : false;
  const summary = `${editingItem ? 'Изменение' : kind === 'poll' ? 'Опрос' : 'Сообщение'} · ${active ? 'сразу активно' : 'draft'} · аудитория ${audience} · ${editingItem ? 'исходный срок сохраняется' : `${ttlDays} дней`}.`;
  const details = [
    `Тема RU: ${translations.ru.title}`,
    `Текст RU: ${translations.ru.body}`,
    `Аудитория: ${audience}; приоритет ${priority}.`,
    editingItem ? `Срок: остаётся ${dateTime(editingItem.expiresAtMs)}; редактирование его не продлевает.` : `Срок: ${ttlDays} дней; после истечения клиент перестанет показывать сообщение.`,
    kind === 'poll' ? `Опрос: ${translations.ru.pollQuestion}; вариантов ${translations.ru.pollOptions.length}.` : 'Опрос: нет.',
    `Переводы: ${APP_MESSAGE_LANGUAGES.filter((language) => translations[language.key].title || language.key === 'ru').map((language) => language.label).join(', ')}; пустые значения наследуют RU.`,
    active ? 'Stop condition: выключить сообщение в истории с обязательной причиной.' : 'Draft не виден пользователям до отдельного включения.',
    resetPollEngagement ? 'Внимание: структура опроса меняется — старые голоса и выбранные варианты будут сброшены.' : 'Голоса и реакции сохраняются.',
  ];
  return { payload, reason, summary, details, resetPollEngagement, expectedUpdatedAtMs: Number(editingItem?.updatedAtMs || 0) };
}

function sameAppMessagePayload(left, right) {
  return JSON.stringify(left || {}) === JSON.stringify(right || {});
}

function buildPromoBannerPreview() {
  if (!state.remoteConfig?.config) throw new Error('Сначала загрузите текущую конфигурацию.');
  const enabled = readReleaseMaintenanceBoolean('promo-banner-enabled');
  const campaignId = readTextInput('promo-banner-campaign', 80);
  if (enabled && !/^[A-Za-z0-9_.:-]{3,80}$/.test(campaignId)) throw new Error('Campaign ID промо-баннера: 3–80 символов A-Z, 0-9, _, ., :, -.');
  const url = readTextInput('promo-banner-url', 400);
  if (url && !/^(https:\/\/|phraseman:\/\/)/i.test(url)) throw new Error('Ссылка промо-баннера должна начинаться с https:// или phraseman://');
  const date = readTextInput('promo-banner-until', 10);
  let until = '';
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Срок промо-баннера должен быть календарной датой.');
    const untilMs = Date.parse(`${date}T23:59:59`);
    if (!Number.isFinite(untilMs)) throw new Error('Срок промо-баннера указан некорректно.');
    until = String(untilMs);
  }
  const audienceRaw = String(document.getElementById('promo-banner-audience')?.value ?? 'all');
  const audience = ['free', 'premium'].includes(audienceRaw) ? audienceRaw : 'all';
  const platformRaw = String(document.getElementById('promo-banner-platform')?.value ?? '');
  const platform = ['ios', 'android'].includes(platformRaw) ? platformRaw : '';
  const reason = readTextInput('promo-banner-reason', 500);
  if (!reason) throw new Error('Укажите причину изменения промо-баннера.');
  const nextConfig = {
    bools: { promo_banner_enabled: enabled },
    texts: {
      promo_banner_text_ru: readTextInput('promo-banner-text-ru', 240),
      promo_banner_text_uk: readTextInput('promo-banner-text-uk', 240),
      promo_banner_text_es: readTextInput('promo-banner-text-es', 240),
      promo_banner_url: url,
      promo_banner_until: until,
      promo_banner_campaign_id: campaignId,
      promo_banner_audience: audience,
      promo_banner_platform: platform,
    },
  };
  const version = Number(state.remoteConfig.config.version);
  if (Number.isInteger(version) && version > 0) nextConfig.version = version;
  const changes = remoteConfigChanges(nextConfig);
  const expiry = date || 'бессрочно';
  return {
    nextConfig,
    reason,
    changes,
    source: 'promo-banner',
    kind: 'standard',
    title: 'Предпросмотр промо-баннера',
    summary: enabled ? `Баннер включён: campaign ${campaignId}, аудитория ${audience}, платформа ${platform || 'all'}, срок ${expiry}.` : 'Баннер будет выключен; тексты кампании сохранятся для истории и повторного использования.',
    details: [
      `Promo banner audience: ${audience}; platform ${platform || 'ios+android'}.`,
      `Campaign ID: ${campaignId || 'не задан'}.`,
      `Destination: ${url || 'баннер без ссылки'}.`,
      `Expiry: ${expiry}.`,
      'Close/swipe: пользователь может закрыть баннер; закрытие хранится по campaign ID.',
      'Promo banner stop condition: подготовить «Выключить баннер» и опубликовать audited preview.',
    ],
  };
}

function buildPromoBannerStopPreview() {
  if (!state.remoteConfig?.config) throw new Error('Сначала загрузите текущую конфигурацию.');
  const reason = readTextInput('promo-banner-reason', 500);
  if (!reason) throw new Error('Укажите причину изменения промо-баннера.');
  const nextConfig = { bools: { promo_banner_enabled: false } };
  const version = Number(state.remoteConfig.config.version);
  if (Number.isInteger(version) && version > 0) nextConfig.version = version;
  return {
    nextConfig,
    reason,
    changes: remoteConfigChanges(nextConfig),
    source: 'promo-banner',
    kind: 'quick-stop',
    title: 'Предпросмотр выключения промо-баннера',
    summary: 'Баннер будет скрыт у всех пользователей. Тексты, ссылка, срок и campaign ID не изменятся.',
    details: [
      'Promo banner audience: все пользователи, которым баннер виден сейчас.',
      'Promo banner stop condition: публикация этого preview выключает только promo_banner_enabled.',
      'Rollback: восстановить значение из истории Remote Config.',
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

function ensurePromoBannerPreviewIsFresh(preview) {
  if (preview?.source !== 'promo-banner') return true;
  const current = preview.kind === 'quick-stop' ? buildPromoBannerStopPreview() : buildPromoBannerPreview();
  const stale = JSON.stringify(current.nextConfig) !== JSON.stringify(preview.nextConfig) || current.reason !== preview.reason;
  if (!stale) return true;
  state.remoteConfigPreview = current;
  setMessage('Поля баннера изменились после предпросмотра. Предпросмотр обновлён — проверьте его перед публикацией.', 'warning');
  renderCurrentPage();
  return false;
}

function ensureRemoteConfigPreviewIsFresh(preview) {
  if (preview?.source === 'release-maintenance') return ensureReleaseMaintenancePreviewIsFresh(preview);
  if (preview?.source === 'promo-banner') return ensurePromoBannerPreviewIsFresh(preview);
  let current = null;
  if (preview?.source === 'partial-restore-remote-config') current = buildRemoteConfigRestorePreview(preview.reference);
  if (preview?.source === 'premium-access') current = buildPremiumAccessPreview();
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
  if (preview?.source === 'premium-access') risks.push('Free / Plus gates меняют монетизацию и доступ к урокам');
  if (preview?.source === 'promo-banner') risks.push('промо-баннер изменится для выбранной массовой аудитории');
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

function readPromoCreatePayload(oneTime = false) {
  const mode = String(document.getElementById('promo-mode')?.value || 'generated') === 'custom' ? 'custom' : 'generated';
  const rewardKind = String(document.getElementById('promo-reward-kind')?.value || 'days') === 'lifetime' ? 'lifetime' : 'days';
  const rewardDays = rewardKind === 'lifetime' ? 0 : Math.trunc(Number(document.getElementById('promo-days')?.value || 0));
  if (rewardKind === 'days' && (!Number.isInteger(rewardDays) || rewardDays < 1 || rewardDays > 3650)) throw new Error('Срок Plus должен быть 1–3650 дней.');
  const maxRaw = Math.trunc(Number(document.getElementById('promo-max-redemptions')?.value || 0));
  if (!Number.isInteger(maxRaw) || maxRaw < 0) throw new Error('Лимит активаций должен быть 0 или больше.');
  const expiresRaw = String(document.getElementById('promo-expires')?.value || '').trim();
  let expiresAtMs = 0;
  if (expiresRaw) {
    const parsed = Date.parse(`${expiresRaw}T23:59:59`);
    if (!Number.isFinite(parsed)) throw new Error('Дата окончания промокода некорректна.');
    expiresAtMs = parsed;
  }
  const payload = {
    rewardKind,
    rewardDays,
    maxRedemptions: oneTime ? 1 : maxRaw,
    expiresAtMs,
    expiresDate: expiresRaw,
    enabled: String(document.getElementById('promo-enabled')?.value || 'on') !== 'off',
    note: String(document.getElementById('promo-note')?.value || '').trim().slice(0, 200),
    reason: String(document.getElementById('promo-reason')?.value || '').trim().slice(0, 500),
  };
  if (!payload.reason) throw new Error('Укажите причину создания промокодов.');
  if (mode === 'custom') {
    const codes = String(document.getElementById('promo-custom-codes')?.value || '').split(/[\s,;]+/).map((code) => code.trim().toUpperCase()).filter(Boolean);
    if (!codes.length) throw new Error('Введите хотя бы один свой код.');
    return { ...payload, codes, createOnly: true };
  }
  const count = Math.trunc(Number(document.getElementById('promo-count')?.value || 0));
  if (!Number.isInteger(count) || count < 1 || count > 200) throw new Error('Количество кодов должно быть 1–200.');
  return { ...payload, count, prefix: String(document.getElementById('promo-prefix')?.value || 'PM').trim().toUpperCase().slice(0, 16) || 'PM' };
}

function buildPromoPreview(oneTime = false) {
  const payload = readPromoCreatePayload(oneTime);
  const count = Array.isArray(payload.codes) ? payload.codes.length : Number(payload.count || 0);
  const reward = payload.rewardKind === 'lifetime' ? 'lifetime Plus' : `${payload.rewardDays} дней Plus`;
  const limit = Number(payload.maxRedemptions || 0) > 0 ? `${payload.maxRedemptions} активаций на код` : 'без общего лимита';
  const details = [
    `Кодов: ${count}.`,
    `Награда: ${reward}.`,
    `Лимит: ${limit}.`,
    `Статус: ${payload.enabled ? 'включены сразу' : 'создать выключенными'}.`,
    `Истекают: ${payload.expiresAtMs ? formatPromoDate(payload.expiresAtMs) : 'не истекают'}.`,
    `Причина: ${payload.reason}.`,
  ];
  if (Array.isArray(payload.codes)) details.push(`Свои коды: ${payload.codes.join(', ')}.`);
  else details.push(`Генерация: prefix ${payload.prefix}.`);
  return { payload, reason: payload.reason, summary: `${count} промокодов · ${reward} · ${limit}`, details, oneTime };
}

function samePromoPayload(left, right) {
  return JSON.stringify(left || {}) === JSON.stringify(right || {});
}

async function loadPromoCodes() {
  const authGeneration = state.authGeneration;
  state.promo = { ...state.promo, state: 'loading', error: '' };
  renderCurrentPage();
  try {
    const result = await actions.listPromoCodes({ limit: 100 });
    if (authGeneration !== state.authGeneration) return STALE_AUTH_RESULT;
    state.promo = {
      ...state.promo,
      state: 'ready',
      codes: Array.isArray(result?.codes) ? result.codes : [],
      redemptions: Array.isArray(result?.redemptions) ? result.redemptions : [],
      error: '',
    };
    renderCurrentPage();
    return result;
  } catch (error) {
    if (authGeneration === state.authGeneration) {
      state.promo = { ...state.promo, state: 'error', error: errorMessage(error) };
      renderCurrentPage();
    }
    throw error;
  }
}

async function loadAppMessages() {
  const authGeneration = state.authGeneration;
  state.campaigns = { ...state.campaigns, state: 'loading', error: '' };
  renderCurrentPage();
  try {
    const result = await actions.listAppMessages({ limit: 120 });
    if (!authStillValid(authGeneration, 'campaigns.read')) return STALE_AUTH_RESULT;
    state.campaigns = { ...state.campaigns, state: 'ready', items: Array.isArray(result?.items) ? result.items : [], error: '' };
    renderCurrentPage();
    return result;
  } catch (error) {
    if (authGeneration === state.authGeneration) {
      state.campaigns = { ...state.campaigns, state: 'error', error: errorMessage(error) };
      renderCurrentPage();
    }
    throw error;
  }
}

async function toggleAppMessage(messageId, active) {
  const reason = readTextInput('app-message-operation-reason', 500);
  if (!reason) return setMessage('Укажите причину включения или выключения сообщения.', 'warning');
  const item = state.campaigns.items.find((candidate) => String(candidate.id) === String(messageId));
  if (!item) return setMessage('Сообщение не найдено в загруженном списке.', 'warning');
  const actionLabel = active ? 'включить' : 'выключить';
  if (!globalThis.confirm(`${actionLabel === 'включить' ? 'Включить' : 'Выключить'} сообщение «${item.titleRu || item.id}»?\n\nПричина: ${reason}`)) return;
  return runBusy(async () => {
    await actions.setAppMessageActive({ messageId, active, reason, idempotencyKey: id('app-message-toggle'), requestId: id('request-app-message-toggle') });
    await loadAppMessages();
  }, active ? 'Сообщение включено.' : 'Сообщение выключено.');
}

function appMessageOperationKey(scope) {
  const key = String(scope || 'command');
  const existing = state.campaigns.operationKeys?.[key];
  if (existing) return existing;
  const storageKey = `phraseman_admin_campaign_operation_${key}`;
  try {
    const persisted = globalThis.sessionStorage?.getItem(storageKey);
    if (persisted) {
      state.campaigns.operationKeys = { ...(state.campaigns.operationKeys || {}), [key]: persisted };
      return persisted;
    }
  } catch { /* Session storage is an optional retry aid. */ }
  const operationId = id(`app-message-${key.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 60)}`);
  state.campaigns.operationKeys = { ...(state.campaigns.operationKeys || {}), [key]: operationId };
  try { globalThis.sessionStorage?.setItem(storageKey, operationId); } catch { /* Keep the in-memory key. */ }
  return operationId;
}

function clearAppMessageOperationKey(scope) {
  const keys = { ...(state.campaigns.operationKeys || {}) };
  delete keys[String(scope || 'command')];
  state.campaigns.operationKeys = keys;
  try { globalThis.sessionStorage?.removeItem(`phraseman_admin_campaign_operation_${String(scope || 'command')}`); } catch { /* No-op. */ }
}

function startAppMessageEdit(messageId) {
  const item = state.campaigns.items.find((candidate) => String(candidate.id) === String(messageId));
  if (!item) return setMessage('Сообщение не найдено в загруженном списке.', 'warning');
  if (item.active !== false) return setMessage('Сообщение нужно сначала выключить, затем открыть редактирование.', 'warning');
  state.campaigns = { ...state.campaigns, editingId: item.id, draft: appMessageItemPayload(item), preview: null, cleanupPreview: null };
  renderCurrentPage();
  globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  return setMessage('Сообщение открыто для редактирования. Срок окончания не изменится.', 'success');
}

async function deleteAppMessage(messageId) {
  const reason = readTextInput('app-message-operation-reason', 500);
  if (!reason) return setMessage('Укажите причину удаления сообщения.', 'warning');
  const item = state.campaigns.items.find((candidate) => String(candidate.id) === String(messageId));
  if (!item) return setMessage('Сообщение не найдено в загруженном списке.', 'warning');
  const impact = `Прочтения: ${Number(item.readCount || 0)}, реакции: ${Number(item.likeCount || 0) + Number(item.dislikeCount || 0)}, голоса: ${Number(item.pollVoteCount || 0)}.`;
  if (!globalThis.confirm(`Удалить сообщение и связанные данные «${item.titleRu || item.id}»?\n\n${impact}\nБудут удалены реакции, голоса и состояния inbox.\n\nПричина: ${reason}`)) return;
  const operationScope = `delete-${messageId}`;
  const operationId = appMessageOperationKey(operationScope);
  return runBusy(async () => {
    await actions.deleteAppMessage({ messageId, reason, idempotencyKey: operationId, requestId: id('request-app-message-delete') });
    clearAppMessageOperationKey(operationScope);
    if (state.campaigns.editingId === messageId) state.campaigns = { ...state.campaigns, editingId: '', draft: null, preview: null };
    await loadAppMessages();
  }, 'Сообщение и связанные данные удалены.');
}

function previewExpiredAppMessageCleanup() {
  const reason = readTextInput('app-message-operation-reason', 500);
  if (!reason) return setMessage('Укажите причину очистки истёкших сообщений.', 'warning');
  const now = Date.now();
  const ids = state.campaigns.items
    .filter((item) => Number(item.expiresAtMs || 0) > 0 && Number(item.expiresAtMs) <= now)
    .map((item) => String(item.id))
    .slice(0, 120);
  if (!ids.length) return setMessage('Истёкших сообщений в загруженном списке нет.', 'warning');
  state.campaigns = { ...state.campaigns, cleanupPreview: { ids, reason } };
  renderCurrentPage();
  return setMessage('Предпросмотр очистки готов. Проверьте количество перед удалением.', 'success');
}

async function handleAction(action, target) {
  if (!actions) return;
  if (action === 'sign-in') return actions.signIn();
  if (action === 'sign-out') return actions.signOut();
  if (!state.authorized) return setMessage('Сначала войдите с ролью администратора.', 'warning');
  if (action === 'load-cache' || action === 'load-cache-next') {
    const input = cacheListInput('cache', action.endsWith('-next') ? state.cache.nextCursor : '');
    state.cache = { ...state.cache, source: input.source, status: input.status, lang: input.lang, query: input.query };
    return runBusy(() => loadCacheEntries('cache', action.endsWith('-next')), 'Кэш загружен через защищённую серверную проекцию.');
  }
  if (action === 'load-compass-cache' || action === 'load-compass-cache-next') {
    const input = cacheListInput('compass', action.endsWith('-next') ? state.compass.cacheNextCursor : '');
    state.compass = { ...state.compass, cacheStatus: input.status, cacheLang: input.lang, cacheQuery: input.query };
    return runBusy(() => loadCacheEntries('compass', action.endsWith('-next')), 'Кэш Compass обновлён.');
  }
  if (action === 'export-cache-json' || action === 'export-cache-review') {
    const reason = String(document.getElementById('cache-operation-reason')?.value || '').trim();
    if (!reason) return setMessage('Укажите причину выгрузки кэша.', 'warning');
    const format = action === 'export-cache-json' ? 'json' : 'review_packet_v1';
    const input = cacheListInput('cache');
    const scope = `export:${format}:${input.source}:${input.status}:${input.lang}:${input.query}`;
    return runBusy(async () => {
      const result = await actions.exportCacheEntries({ ...input, format, reason, requestId: id('cache-export-request'), idempotencyKey: protectedOperationKey('cache', scope) });
      await navigator.clipboard.writeText(String(result?.payload || ''));
      clearProtectedOperationKey('cache', scope);
      setMessage(result?.truncated
        ? `Скопировано ${Number(result.count || 0)} записей, но выборка обрезана после проверки ${Number(result.scannedCount || 0)} документов. Сузьте фильтры.`
        : `${format === 'json' ? 'JSON' : 'Пакет проверки'} скопирован полностью; экспорт записан в аудит.`, result?.truncated ? 'warning' : 'success');
    });
  }
  if (action === 'preview-cache-reset') {
    const area = String(target.getAttribute('data-cache-area') || 'cache');
    const reasonId = area === 'compass' ? 'compass-cache-operation-reason' : 'cache-operation-reason';
    const reason = String(document.getElementById(reasonId)?.value || '').trim();
    if (!reason) return setMessage('Укажите причину точечного сброса.', 'warning');
    const source = String(target.getAttribute('data-cache-source') || '');
    const documentId = String(target.getAttribute('data-cache-document-id') || '');
    return runBusy(async () => {
      const preview = await actions.previewCacheReset({ source, documentId, reason, requestId: id('cache-reset-preview') });
      const stored = { ...preview, reason };
      if (area === 'compass') state.compass.cacheResetPreview = stored;
      else state.cache.resetPreview = stored;
    }, 'Предпросмотр точечного сброса готов. Проверьте запись и точное подтверждение.');
  }
  if (action === 'discard-cache-reset') {
    const area = String(target.getAttribute('data-cache-area') || 'cache');
    if (area === 'compass') state.compass.cacheResetPreview = null;
    else state.cache.resetPreview = null;
    renderCurrentPage();
    return;
  }
  if (action === 'confirm-cache-reset') {
    const area = String(target.getAttribute('data-cache-area') || 'cache');
    const preview = area === 'compass' ? state.compass.cacheResetPreview : state.cache.resetPreview;
    const confirmation = String(document.getElementById(`${area}-cache-reset-confirmation`)?.value || '').trim();
    if (!preview || confirmation !== preview.confirmation) return setMessage('Точное подтверждение не совпадает.', 'warning');
    const scope = `reset:${preview.previewId}`;
    return runBusy(async () => {
      await actions.resetCacheEntry({ previewId: preview.previewId, confirmation, reason: preview.reason, requestId: id('cache-reset-request'), idempotencyKey: protectedOperationKey(area, scope) });
      clearProtectedOperationKey(area, scope);
      if (area === 'compass') state.compass.cacheResetPreview = null;
      else state.cache.resetPreview = null;
      await loadCacheEntries(area, false);
    }, 'Удалена ровно одна запись кэша; генерация не запускалась.');
  }
  if (action === 'load-compass') return runBusy(loadCompassWorkspace, 'Рабочая область Compass обновлена.');
  if (action === 'discard-compass-preview') { state.compass.preview = null; renderCurrentPage(); return; }
  if (action === 'preview-compass-change') {
    const reason = String(document.getElementById('compass-change-reason')?.value || '').trim();
    if (!reason) return setMessage('Укажите причину изменения Compass.', 'warning');
    const config = state.compass.workspace?.config;
    if (!config) return setMessage('Сначала загрузите рабочую область Compass.', 'warning');
    const draft = compassDraftFromDom();
    const patch = compassPatchFromDraft(draft, config);
    if (!patch.bools && !patch.texts) return setMessage('Настройки не изменились.', 'warning');
    return runBusy(async () => {
      const preview = await actions.previewCompassChange({ expectedRevision: Number(config.revision || 0), patch, reason, requestId: id('compass-preview-request') });
      state.compass = { ...state.compass, draft, preview: { ...preview, reason }, error: '' };
    }, 'Серверный предпросмотр Compass готов.');
  }
  if (action === 'request-compass-approval') {
    const preview = state.compass.preview;
    if (!preview?.requiresApproval) return;
    const scope = `approval-request:${preview.previewId}`;
    return runBusy(async () => {
      await actions.requestCompassApproval({ previewId: preview.previewId, reason: preview.reason, requestId: id('compass-approval-request'), idempotencyKey: protectedOperationKey('compass', scope) });
      clearProtectedOperationKey('compass', scope);
      state.compass.preview = null;
      await loadCompassWorkspace();
    }, 'Запрос создан. Изменения ещё не применены; нужен второй администратор.');
  }
  if (action === 'approve-compass-change') {
    const approvalId = String(target.getAttribute('data-approval-id') || '');
    const reason = String(document.getElementById('compass-approval-reason')?.value || '').trim();
    if (!reason) return setMessage('Укажите, что проверено перед одобрением.', 'warning');
    const scope = `approve:${approvalId}`;
    return runBusy(async () => {
      await actions.approveCompassChange({ approvalId, reason, requestId: id('compass-approval-decision'), idempotencyKey: protectedOperationKey('compass', scope) });
      clearProtectedOperationKey('compass', scope);
      await loadCompassWorkspace();
    }, 'Изменение одобрено. Настройки ещё не опубликованы.');
  }
  if (action === 'apply-compass-change') {
    const preview = state.compass.preview;
    const confirmation = String(document.getElementById('compass-confirmation')?.value || '').trim();
    if (!preview || confirmation !== preview.confirmation) return setMessage('Точное подтверждение не совпадает.', 'warning');
    const scope = `apply:${preview.previewId}`;
    return runBusy(async () => {
      await actions.applyCompassChange({ previewId: preview.previewId, approvalId: '', confirmation, reason: preview.reason, requestId: id('compass-apply-request'), idempotencyKey: protectedOperationKey('compass', scope) });
      clearProtectedOperationKey('compass', scope);
      state.compass.preview = null;
      await loadCompassWorkspace();
    }, 'Экстренное выключение Compass применено и записано в аудит.');
  }
  if (action === 'apply-approved-compass-change') {
    const approvalId = String(target.getAttribute('data-approval-id') || '');
    const approval = (state.compass.workspace?.approvals || []).find((item) => item.id === approvalId);
    const confirmation = String(document.getElementById(`compass-approved-confirmation-${approvalId}`)?.value || '').trim();
    if (!approval || confirmation !== approval.confirmation) return setMessage('Точное подтверждение не совпадает.', 'warning');
    const reason = String(approval.reason || '');
    const scope = `apply-approved:${approvalId}`;
    return runBusy(async () => {
      await actions.applyCompassChange({ previewId: approval.previewId, approvalId, confirmation, reason, requestId: id('compass-approved-apply'), idempotencyKey: protectedOperationKey('compass', scope) });
      clearProtectedOperationKey('compass', scope);
      await loadCompassWorkspace();
    }, 'Одобренные настройки Compass опубликованы и записаны в аудит.');
  }
  if (action === 'load-app-messages') return runBusy(loadAppMessages, 'Сообщения загружены.');
  if (action === 'change-push-mode') return;
  if (action === 'load-push-campaigns') return runBusy(loadPushCampaigns, 'Push-кампании загружены.');
  if (action === 'preview-push-campaign') {
    let form;
    try { form = readPushCampaignForm(); } catch (error) { setMessage(errorMessage(error), 'warning'); return; }
    return runBusy(async () => {
      const result = await actions.previewPushAudience(form.payload);
      state.pushCampaigns = { ...state.pushCampaigns, draft: form.payload, preview: { ...result, payload: form.payload, reason: form.reason }, error: '' };
    }, 'Серверный предпросмотр аудитории готов. Отправка не выполнялась.');
  }
  if (action === 'discard-push-preview') { state.pushCampaigns.preview = null; renderCurrentPage(); return; }
  if (action === 'publish-push-campaign') {
    const preview = state.pushCampaigns.preview;
    if (!preview || preview.requiresApproval) return;
    if (!globalThis.confirm(`Создать push-задание для UID?\n\nПолучателей: ${Number(preview.audienceCount || 0)}\n${preview.payload.notification.title}\n${preview.payload.notification.body}`)) return;
    return runBusy(async () => {
      const operationScope = `job:${preview.previewId}`;
      await actions.createPushJob({ previewId: preview.previewId, reason: preview.reason, idempotencyKey: pushOperationKey(operationScope), requestId: id('request-push-job') });
      clearPushOperationKey(operationScope);
      state.pushCampaigns.preview = null;
      await loadPushCampaigns();
    }, 'UID push-задание создано и записано в аудит.');
  }
  if (action === 'request-push-approval') {
    const preview = state.pushCampaigns.preview;
    if (!preview?.requiresApproval) return;
    if (!globalThis.confirm(`Запросить одобрение массового push?\n\nАудитория на preview: ${Number(preview.audienceCount || 0)}\n${preview.payload.notification.title}`)) return;
    return runBusy(async () => {
      const operationScope = `approval-request:${preview.previewId}`;
      await actions.requestPushApproval({ previewId: preview.previewId, reason: preview.reason, idempotencyKey: pushOperationKey(operationScope), requestId: id('request-push-approval') });
      clearPushOperationKey(operationScope);
      state.pushCampaigns.preview = null;
      await loadPushCampaigns();
    }, 'Запрос одобрения создан. Другой администратор должен проверить кампанию.');
  }
  if (action === 'approve-push-campaign') {
    const approvalId = String(target.getAttribute('data-approval-id') || '');
    const approval = state.pushCampaigns.approvals.find((item) => String(item.id) === approvalId);
    if (!approval || !pushApprovalIsLive(approval) || approval.status !== 'pending' || approval.requestedBy === state.adminUid || !can('campaigns.write')) return setMessage('Этот запрос нельзя одобрить: проверьте срок, статус, права и автора запроса.', 'warning');
    const reason = String(document.getElementById('push-approval-reason')?.value || '').trim();
    if (!reason) return setMessage('Укажите, что проверено перед одобрением.', 'warning');
    if (!globalThis.confirm('Одобрить массовую push-кампанию как второй администратор?')) return;
    return runBusy(async () => {
      const operationScope = `approve:${approvalId}`;
      await actions.approvePushCampaign({ approvalId, reason, idempotencyKey: pushOperationKey(operationScope), requestId: id('request-push-approval-decision') });
      clearPushOperationKey(operationScope);
      await loadPushCampaigns();
    }, 'Массовая push-кампания одобрена. Задание ещё не создано.');
  }
  if (action === 'publish-approved-push') {
    const approvalId = String(target.getAttribute('data-approval-id') || '');
    const previewId = String(target.getAttribute('data-preview-id') || '');
    const approval = state.pushCampaigns.approvals.find((item) => String(item.id) === approvalId);
    if (!approval || !pushApprovalIsLive(approval) || approval.status !== 'approved' || !can('campaigns.write')) return setMessage('Одобрение истекло, уже использовано или недоступно для этой роли.', 'warning');
    const reason = String(document.getElementById('push-approval-reason')?.value || '').trim() || `Approved push: ${String(approval?.reason || '').slice(0, 450)}`;
    if (!globalThis.confirm(`Создать одобренное массовое push-задание?\n\nАудитория на preview: ${Number(approval?.audienceCount || 0)}\nПосле создания немедленный режим начнёт отправку.`)) return;
    return runBusy(async () => {
      const operationScope = `approved-job:${approvalId}`;
      await actions.createPushJob({ previewId, approvalId, reason, idempotencyKey: pushOperationKey(operationScope), requestId: id('request-push-job-approved') });
      clearPushOperationKey(operationScope);
      await loadPushCampaigns();
    }, 'Одобренное push-задание создано и записано в аудит.');
  }
  if (action === 'cancel-push-job') {
    const jobId = String(target.getAttribute('data-push-job-id') || '');
    const reason = String(document.getElementById('push-cancel-reason')?.value || '').trim();
    if (!reason) return setMessage('Укажите причину отмены push-задания.', 'warning');
    if (!globalThis.confirm('Отменить ещё не начатое push-задание?')) return;
    return runBusy(async () => {
      const operationScope = `cancel:${jobId}`;
      await actions.cancelPushJob({ jobId, reason, idempotencyKey: pushOperationKey(operationScope), requestId: id('request-push-job-cancel') });
      clearPushOperationKey(operationScope);
      await loadPushCampaigns();
    }, 'Push-задание отменено и записано в аудит.');
  }
  if (action === 'cancel-app-message-edit') {
    state.campaigns = { ...state.campaigns, editingId: '', draft: null, preview: null };
    renderCurrentPage();
    return;
  }
  if (action === 'preview-app-message-cleanup') return previewExpiredAppMessageCleanup();
  if (action === 'discard-app-message-cleanup') { state.campaigns.cleanupPreview = null; renderCurrentPage(); return; }
  if (action === 'run-app-message-cleanup') {
    const preview = state.campaigns.cleanupPreview;
    if (!preview?.ids?.length) return setMessage('Сначала соберите preview очистки.', 'warning');
    if (!globalThis.confirm(`Удалить ${preview.ids.length} истёкших сообщений и все связанные данные?\n\nПричина: ${preview.reason}`)) return;
    return runBusy(async () => {
      const operationScope = `cleanup-${preview.ids.join('-')}`;
      await actions.cleanupExpiredAppMessages({ messageIds: preview.ids, reason: preview.reason, idempotencyKey: appMessageOperationKey(operationScope), requestId: id('request-app-message-cleanup') });
      clearAppMessageOperationKey(operationScope);
      state.campaigns.cleanupPreview = null;
      await loadAppMessages();
    }, `Истёкшие сообщения удалены: ${preview.ids.length}.`);
  }
  if (action === 'preview-app-message') {
    try { state.campaigns.preview = buildAppMessagePreview(); setMessage('Предпросмотр сообщения готов.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
    renderCurrentPage();
    return;
  }
  if (action === 'discard-app-message-preview') { state.campaigns.preview = null; renderCurrentPage(); return; }
  if (action === 'publish-app-message') {
    const preview = state.campaigns.preview;
    if (!preview?.payload) return setMessage('Сначала соберите preview сообщения.', 'warning');
    let current;
    try { current = buildAppMessagePreview(); } catch (error) { setMessage(errorMessage(error), 'warning'); return; }
    if (!sameAppMessagePayload(current.payload, preview.payload) || current.reason !== preview.reason || current.resetPollEngagement !== preview.resetPollEngagement || current.expectedUpdatedAtMs !== preview.expectedUpdatedAtMs) {
      state.campaigns.preview = current;
      setMessage('Форма изменилась после preview. Проверьте обновлённый предпросмотр и опубликуйте ещё раз.', 'warning');
      renderCurrentPage();
      return;
    }
    const editingId = String(state.campaigns.editingId || '');
    if (!globalThis.confirm(`${editingId ? 'Сохранить изменения сообщения' : `Создать ${preview.payload.kind === 'poll' ? 'опрос' : 'сообщение'}`}?\n\n${preview.summary}\n${preview.resetPollEngagement ? '\nСтарые голоса опроса будут сброшены.\n' : ''}\nПричина: ${preview.reason}`)) return;
    return runBusy(async () => {
      if (editingId) {
        const operationScope = `update-${editingId}-${preview.expectedUpdatedAtMs}`;
        await actions.updateAppMessage({ ...preview.payload, messageId: editingId, expectedUpdatedAtMs: preview.expectedUpdatedAtMs, resetPollEngagement: preview.resetPollEngagement, reason: preview.reason, idempotencyKey: appMessageOperationKey(operationScope), requestId: id('request-app-message-update') });
        clearAppMessageOperationKey(operationScope);
      } else {
        await actions.createAppMessage({ ...preview.payload, reason: preview.reason, idempotencyKey: id('app-message-create'), requestId: id('request-app-message-create') });
      }
      state.campaigns = { ...state.campaigns, preview: null, editingId: '', draft: null };
      await loadAppMessages();
    }, editingId ? 'Изменения сообщения сохранены.' : preview.payload.active ? 'Сообщение опубликовано и активно.' : 'Draft сообщения создан.');
  }
  if (action === 'load-promo-codes') return runBusy(loadPromoCodes, 'Промокоды и активации загружены.');
  if (action === 'preview-promo-codes' || action === 'preview-one-time-promo-codes') {
    try {
      state.promo.preview = buildPromoPreview(action === 'preview-one-time-promo-codes');
      setMessage('Предпросмотр промокодов готов. Проверьте и нажмите «Опубликовать».', 'success');
    } catch (error) {
      setMessage(errorMessage(error), 'warning');
    }
    renderCurrentPage();
    return;
  }
  if (action === 'discard-promo-preview') { state.promo.preview = null; renderCurrentPage(); return; }
  if (action === 'publish-promo-codes') {
    const preview = state.promo.preview;
    if (!preview?.payload) return setMessage('Сначала соберите preview промокодов.', 'warning');
    let current;
    try { current = buildPromoPreview(preview.oneTime); } catch (error) { setMessage(errorMessage(error), 'warning'); return; }
    if (!samePromoPayload(current.payload, preview.payload)) {
      setMessage('Форма промокодов изменилась после preview. Соберите preview заново.', 'warning');
      state.promo.preview = null;
      renderCurrentPage();
      return;
    }
    if (!globalThis.confirm(`Опубликовать промокоды?\n\n${preview.summary}\n\nПричина: ${preview.reason}`)) return;
    return runBusy(async () => {
      const result = await actions.promoCodeBatchUpsert(preview.payload);
      state.promo.generatedCodes = Array.isArray(result?.codes) ? result.codes.map(String) : [];
      state.promo.preview = null;
      await loadPromoCodes();
    }, 'Промокоды созданы через защищённый серверный процесс.');
  }
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
  if (action === 'load-beta-testers') return runBusy(async () => {
    state.betaTesters.state = 'loading';
    const result = await actions.listBetaTesters();
    state.betaTesters = { state: 'ready', items: Array.isArray(result?.items) ? result.items : [], pending: null, error: '', truncated: result?.truncated === true };
  }, 'Список бета-тестеров загружен.');
  if (action === 'open-beta-tester') {
    const uid = String(target.getAttribute('data-beta-uid') || '').trim();
    if (!uid) return;
    state.users.profileLoading = true;
    return runBusy(() => loadAdminUserProfile(uid), 'Профиль бета-тестера загружен.');
  }
  if (action === 'preview-beta-tester-action') {
    const command = String(target.getAttribute('data-beta-action') || '');
    const reason = String(document.getElementById('beta-tester-reason')?.value || '').trim();
    if (!reason) return setMessage('Укажите причину операции с бета-тестером.', 'warning');
    const labels = { set_beta: 'Назначить бета-тестером и выдать «Нимб»', unset_beta: 'Снять только бета-статус, сохранив «Нимб»', grant_plus: 'Выдать Plus навсегда', energy_fill: 'Поставить команду заполнения энергии', energy_drain: 'Поставить команду обнуления энергии' };
    if (!labels[command]) return setMessage('Неизвестная операция.', 'warning');
    state.betaTesters.pending = { action: command, reason, label: labels[command] };
    renderCurrentPage();
    return;
  }
  if (action === 'cancel-beta-tester-action') { state.betaTesters.pending = null; renderCurrentPage(); return; }
  if (action === 'confirm-beta-tester-action') {
    const pending = state.betaTesters.pending;
    const uid = String(state.users.profile?.canonicalUid || '');
    if (!pending || !uid) return;
    if (!globalThis.confirm(`${pending.label}?\n\nUID: ${uid}\nПричина: ${pending.reason}`)) return;
    return runBusy(async () => {
      await actions.updateBetaTester({ uid, action: pending.action, reason: pending.reason, idempotencyKey: id(`beta-tester:${uid}`), requestId: id('request-beta-tester') });
      state.betaTesters.pending = null;
      await loadAdminUserProfile(uid);
      if (state.betaTesters.state === 'ready') {
        const result = await actions.listBetaTesters();
        state.betaTesters = { state: 'ready', items: Array.isArray(result?.items) ? result.items : [], pending: null, error: '', truncated: result?.truncated === true };
      }
    }, 'Операция выполнена и записана в аудит.');
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
  if (action === 'preview-promo-banner') {
    try { state.remoteConfigPreview = buildPromoBannerPreview(); setMessage('Предпросмотр промо-баннера готов.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
    renderCurrentPage();
    return;
  }
  if (action === 'preview-promo-banner-stop') {
    try { state.remoteConfigPreview = buildPromoBannerStopPreview(); setMessage('Предпросмотр выключения промо-баннера готов.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
    renderCurrentPage();
    return;
  }
  if (action === 'preview-premium-access') {
    try { state.remoteConfigPreview = buildPremiumAccessPreview(); setMessage('Предпросмотр Free / Plus доступа готов.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
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
  if (action === 'load-paywall-ab') {
    return runBusy(async () => {
      const workspace = await actions.getPaywallAbWorkspace({ rangeDays: state.paywallAb.rangeDays, includeDev: state.paywallAb.includeDev });
      state.paywallAb = { ...state.paywallAb, status: 'ready', workspace, draft: workspace.config, preview: null, error: '', rangeDays: Number(workspace.rangeDays || state.paywallAb.rangeDays), includeDev: workspace.includeDev === true };
    }, 'A/B-настройки и воронка загружены.');
  }
  if (action === 'load-paywall-ab-range') {
    const rangeDays = Number(target.getAttribute('data-range') || 28);
    const includeDev = document.getElementById('paywall-ab-include-dev')?.checked === true;
    state.paywallAb.rangeDays = rangeDays;
    state.paywallAb.includeDev = includeDev;
    return runBusy(async () => {
      const workspace = await actions.getPaywallAbWorkspace({ rangeDays, includeDev });
      state.paywallAb = { ...state.paywallAb, status: 'ready', workspace, draft: state.paywallAb.draft ?? workspace.config, preview: null, error: '', rangeDays, includeDev };
    }, `Воронка за ${rangeDays} дней загружена.`);
  }
  if (action === 'set-paywall-ab-preset') {
    const preset = PAYWALL_AB_PRESETS[String(target.getAttribute('data-preset') || '')];
    if (!preset) return;
    state.paywallAb.draft = { ...paywallAbDraft(), ...preset };
    state.paywallAb.preview = null;
    renderCurrentPage();
    return;
  }
  if (action === 'preview-paywall-ab') {
    try { state.paywallAb.preview = readPaywallAbPreview(); state.paywallAb.draft = state.paywallAb.preview.config; setMessage('Предпросмотр A/B готов. Проверьте точные изменения.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
    renderCurrentPage();
    return;
  }
  if (action === 'discard-paywall-ab-preview') { state.paywallAb.preview = null; renderCurrentPage(); return; }
  if (action === 'publish-paywall-ab') {
    const preview = state.paywallAb.preview;
    if (!preview?.changes?.length) return setMessage('Нет изменений A/B для публикации.', 'warning');
    if (!globalThis.confirm(`Опубликовать A/B экрана оплаты?\n\n${preview.changes.join('\n')}\n\nПричина: ${preview.reason}`)) return;
    const expectedRevision = Number(state.paywallAb.workspace?.config?.revision || 0);
    return runBusy(async () => {
      await actions.publishPaywallAb({ config: preview.config, expectedRevision, idempotencyKey: id('paywall-ab'), reason: preview.reason, requestId: id('request-paywall-ab') });
      const workspace = await actions.getPaywallAbWorkspace({ rangeDays: state.paywallAb.rangeDays, includeDev: state.paywallAb.includeDev });
      state.paywallAb = { ...state.paywallAb, status: 'ready', workspace, draft: workspace.config, preview: null, error: '' };
    }, 'A/B экрана оплаты опубликован и записан в аудит.');
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
  if (action === 'load-website-inbox') return runBusy(async () => { applyWebsiteInboxResult(await actions.listWebsiteInbox({ limit: 200 })); }, 'Обращения с сайта загружены.');
  if (action === 'preview-website-inbox-read') {
    state.support.website.pendingReadId = String(target.getAttribute('data-website-message-id') || '');
    renderCurrentPage();
    return;
  }
  if (action === 'cancel-website-inbox-read') {
    state.support.website.pendingReadId = '';
    renderCurrentPage();
    return;
  }
  if (action === 'confirm-website-inbox-read') {
    const messageId = String(target.getAttribute('data-website-message-id') || state.support.website.pendingReadId || '');
    const reason = String(document.getElementById('website-inbox-read-reason')?.value || '').trim();
    if (!reason) { setMessage('Укажите причину изменения статуса обращения.', 'warning'); return; }
    return runBusy(async () => {
      await actions.markWebsiteInboxRead({ messageId, reason, requestId: id('website-inbox-read'), idempotencyKey: id(`website-inbox-read:${messageId}`) });
      state.support.website.pendingReadId = '';
      applyWebsiteInboxResult(await actions.listWebsiteInbox({ limit: 200 }));
    }, 'Обращение с сайта помечено прочитанным.');
  }
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
  if (action === 'load-email-directory' || action === 'load-email-directory-next') {
    const append = action === 'load-email-directory-next';
    const input = emailDirectoryInput(append ? state.emails.nextCursor : '');
    state.emails = { ...state.emails, state: 'loading', source: input.source, eligibility: input.eligibility, suppression: input.suppression, query: input.query, error: '' };
    return runBusy(async () => { applyEmailDirectory(await actions.listEmailContacts(input), append); }, append ? 'Следующая страница контактов загружена.' : 'Каталог контактов обновлён.');
  }
  if (action === 'export-email-directory') {
    const reason = String(document.getElementById('email-export-reason')?.value || '').trim();
    if (!reason) { setMessage('Укажите причину экспорта.', 'warning'); return; }
    const input = emailDirectoryInput('');
    return runBusy(async () => {
      const result = await actions.exportEmailContacts({ ...input, reason, requestId: id('email-export-request'), idempotencyKey: id('email-export') });
      await navigator.clipboard.writeText((result?.emails || []).join('\n'));
      setMessage(`Скопировано адресов: ${Number(result?.count || 0)}. Экспорт записан в аудит.`, 'success');
    });
  }
  if (action === 'backfill-email-directory') {
    const reason = String(document.getElementById('email-export-reason')?.value || '').trim();
    if (!reason) return setMessage('Укажите причину синхронизации каталога.', 'warning');
    if (!globalThis.confirm('Повторно собрать каталог email-контактов из пользователей, заказов и обращений?')) return;
    return runBusy(async () => {
      const scope = 'directory-backfill-v2';
      const result = await actions.backfillEmailContacts({ reason, requestId: id('email-backfill-request'), idempotencyKey: emailOperationKey(scope) });
      clearEmailOperationKey(scope);
      applyEmailDirectory(await actions.listEmailContacts(emailDirectoryInput()), false);
      setMessage(`Синхронизация завершена: приложение ${Number(result?.writtenApp || 0)}, сайт ${Number(result?.writtenSite || 0)}.`, 'success');
    });
  }
  if (action === 'load-email-campaigns') return runBusy(loadEmailCampaigns, 'Email-кампании и одобрения загружены.');
  if (action === 'preview-email-campaign') {
    let form;
    try { form = readEmailCampaignForm(); } catch (error) { setMessage(errorMessage(error), 'warning'); return; }
    return runBusy(async () => {
      const result = await actions.previewEmailCampaign(form.payload);
      state.emails = { ...state.emails, draft: form.payload, preview: { ...result, payload: form.payload, reason: form.reason }, campaignError: '' };
    }, 'Предпросмотр аудитории готов. Письма не отправлялись.');
  }
  if (action === 'discard-email-preview') {
    state.emails.preview = null;
    renderCurrentPage();
    return;
  }
  if (action === 'request-email-approval') {
    const preview = state.emails.preview;
    if (!preview?.previewId) return;
    if (!globalThis.confirm(`Запросить одобрение email-кампании у второго администратора?\n\nПолучателей: ${Number(preview.recipientCount || 0)}\nТема: ${preview.payload?.subject || ''}`)) return;
    return runBusy(async () => {
      const scope = `approval-request:${preview.previewId}`;
      await actions.requestEmailApproval({ previewId: preview.previewId, reason: preview.reason, requestId: id('request-email-approval'), idempotencyKey: emailOperationKey(scope) });
      clearEmailOperationKey(scope);
      state.emails.preview = null;
      await loadEmailCampaigns();
    }, 'Запрос создан. Кампанию должен проверить другой администратор.');
  }
  if (action === 'approve-email-campaign') {
    const approvalId = String(target.getAttribute('data-approval-id') || '');
    const approval = state.emails.approvals.find((item) => String(item.id) === approvalId);
    const reason = String(document.getElementById('email-approval-reason')?.value || '').trim();
    if (!reason) return setMessage('Укажите, что именно проверено перед одобрением.', 'warning');
    if (!approval || !emailApprovalIsLive(approval) || approval.status !== 'pending' || approval.requestedBy === state.adminUid || !can('emails.campaigns.approve')) return setMessage('Запрос нельзя одобрить: проверьте срок, статус, права и автора.', 'warning');
    if (!globalThis.confirm('Одобрить неизменяемую email-кампанию как второй администратор?')) return;
    return runBusy(async () => {
      const scope = `approve:${approvalId}`;
      await actions.approveEmailCampaign({ approvalId, reason, requestId: id('approve-email-campaign'), idempotencyKey: emailOperationKey(scope) });
      clearEmailOperationKey(scope);
      await loadEmailCampaigns();
    }, 'Email-кампания одобрена. Она ещё не поставлена в очередь.');
  }
  if (action === 'publish-approved-email') {
    const approvalId = String(target.getAttribute('data-approval-id') || '');
    const previewId = String(target.getAttribute('data-preview-id') || '');
    const approval = state.emails.approvals.find((item) => String(item.id) === approvalId);
    if (!approval || !emailApprovalIsLive(approval) || approval.status !== 'approved' || !can('emails.campaigns.write')) return setMessage('Одобрение истекло, уже использовано или недоступно.', 'warning');
    const reason = String(document.getElementById('email-approval-reason')?.value || '').trim() || `Approved email campaign: ${String(approval.reason || '').slice(0, 450)}`;
    if (!globalThis.confirm(`Поставить email-кампанию в очередь?\n\nПолучателей: ${Number(approval.recipientCount || 0)}\nПосле создания будет 5 минут на отмену. Затем начнётся пакетная отправка.`)) return;
    return runBusy(async () => {
      const scope = `campaign:${approvalId}`;
      await actions.createEmailCampaign({ previewId, approvalId, reason, requestId: id('create-email-campaign'), idempotencyKey: emailOperationKey(scope) });
      clearEmailOperationKey(scope);
      await loadEmailCampaigns();
    }, 'Email-кампания поставлена в очередь. Доступно пятиминутное окно отмены.');
  }
  if (action === 'cancel-email-campaign') {
    const campaignId = String(target.getAttribute('data-email-campaign-id') || '');
    const reason = String(document.getElementById('email-cancel-reason')?.value || '').trim();
    if (!reason) return setMessage('Укажите причину отмены кампании.', 'warning');
    if (!globalThis.confirm('Остановить email-кампанию? Уже принятые почтовым провайдером письма вернуть нельзя.')) return;
    return runBusy(async () => {
      const scope = `cancel:${campaignId}`;
      await actions.cancelEmailCampaign({ campaignId, reason, requestId: id('cancel-email-campaign'), idempotencyKey: emailOperationKey(scope) });
      clearEmailOperationKey(scope);
      await loadEmailCampaigns();
    }, 'Запрос отмены email-кампании записан в аудит.');
  }
  if (action === 'load-analytics') {
    const rangeDays = Number(document.getElementById('analytics-range')?.value ?? 28);
    state.analytics = { status: 'loading', snapshot: state.analytics.snapshot, error: '', rangeDays };
    return runBusy(async () => {
      try {
        const snapshot = await actions.loadAnalytics({ rangeDays });
        state.analytics = completeAnalyticsLoad(state.analytics, snapshot, rangeDays);
        if (state.analytics.status === 'error') throw new Error(state.analytics.error);
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
  const promoUserUid = target.getAttribute('data-open-promo-user');
  if (promoUserUid) {
    state.users.profileLoading = true;
    state.users.query = promoUserUid;
    globalThis.location.hash = 'users';
    return runBusy(() => loadAdminUserProfile(promoUserUid), 'Единый профиль загружен из активации промокода.');
  }
  const appMessageToggleId = target.getAttribute('data-app-message-toggle');
  if (appMessageToggleId) return toggleAppMessage(appMessageToggleId, target.getAttribute('data-next-active') === 'true');
  const appMessageEditId = target.getAttribute('data-app-message-edit');
  if (appMessageEditId) return startAppMessageEdit(appMessageEditId);
  const appMessageDeleteId = target.getAttribute('data-app-message-delete');
  if (appMessageDeleteId) return deleteAppMessage(appMessageDeleteId);
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
  maybeLoadSupportQueues();
  maybeLoadEmailDirectory();
  maybeLoadEmailCampaigns();
  maybeLoadCacheWorkspace();
  maybeLoadCompassWorkspace();
}

export function setAuthState(auth) {
  state.authGeneration += 1;
  state.authReady = true;
  state.authorized = auth.authorized === true;
  state.adminEmail = String(auth.email ?? '');
  state.adminUid = String(auth.uid ?? '');
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
    state.promo = { state: 'idle', codes: [], redemptions: [], generatedCodes: [], preview: null, error: '' };
    state.campaigns = { state: 'idle', items: [], preview: null, draft: null, editingId: '', cleanupPreview: null, operationKeys: {}, error: '' };
    state.pushCampaigns = { state: 'idle', jobs: [], approvals: [], draft: { mode: 'uid' }, preview: null, operationKeys: {}, error: '' };
    state.support = { loaded: false, loading: false, items: [], signature: '', signatureRevision: 0, filter: 'new', pendingReply: null, website: { loaded: false, loading: false, items: [], pendingReadId: '', error: '', truncated: false } };
  }
  if (!state.authorized || !can('users.read')) {
    state.users = { query: '', searched: false, items: [], profile: null, profileLoading: false, searchState: 'idle', searchErrors: [] };
    state.betaTesters = { state: 'idle', items: [], pending: null, error: '', truncated: false };
  }
  if (!state.authorized || !can('briefing.read')) state.briefing = { state: 'idle', digest: null, fetchedAtMs: 0, error: '', generationOutcome: '' };
  if (!state.authorized || !can('reports.read')) state.reports = { state: 'idle', items: [], sourceHealth: [], source: 'all', lane: '', rawStatus: '', uid: '', category: '', sinceDays: 7, nextCursor: '', error: '', replyDrafts: {} };
  if (!state.authorized || !can('money.read')) state.analytics = { status: 'idle', snapshot: null, error: '' };
  if (!state.authorized || (!can('application.config.write') && !can('money.read'))) state.paywallAb = { status: 'idle', workspace: null, draft: null, preview: null, rangeDays: 28, includeDev: false, error: '' };
  if (!state.authorized || !can('diagnostics.read')) state.audit = { state: 'idle', items: [], action: '', query: '', sinceDays: 7, nextCursor: '', fetchedAtMs: 0, error: '' };
  if (!state.authorized || !can('diagnostics.read')) state.ops = { state: 'idle', items: [], sourceHealth: [], kpis: null, source: '', type: '', query: '', copyText: '', fetchedAtMs: 0, error: '' };
  if (!state.authorized || !can('content.read')) state.assetStudio = { state: 'idle', items: [], selectedJobId: '', error: '' };
  if (!state.authorized || !can('money.read')) state.promo = { state: 'idle', codes: [], redemptions: [], generatedCodes: [], preview: null, error: '' };
  if (!state.authorized || !can('campaigns.read')) state.campaigns = { state: 'idle', items: [], preview: null, draft: null, editingId: '', cleanupPreview: null, operationKeys: {}, error: '' };
  if (!state.authorized || !can('campaigns.read')) state.pushCampaigns = { state: 'idle', jobs: [], approvals: [], draft: { mode: 'uid' }, preview: null, operationKeys: {}, error: '' };
  if (!state.authorized || !can('emails.directory.read')) state.emails = {
    state: 'idle', items: [], counts: null, filteredCount: 0, nextCursor: '', source: 'all', eligibility: 'all', suppression: 'all', query: '', error: '',
    campaignState: 'idle', campaigns: [], approvals: [], draft: { audienceKind: 'all' }, preview: null, operationKeys: {}, campaignError: '',
  };
  if (!state.authorized || !can('content.cache.read')) state.cache = { state: 'idle', source: 'choice_explanations', status: '', lang: '', query: '', items: [], summary: null, nextCursor: '', hasMore: false, error: '', resetPreview: null, operationKeys: {} };
  if (!state.authorized || !can('application.compass.read')) state.compass = { state: 'idle', workspace: null, draft: null, preview: null, approvals: [], approvalReason: '', operationKeys: {}, error: '', cacheItems: [], cacheSummary: null, cacheNextCursor: '', cacheStatus: '', cacheLang: '', cacheQuery: '', cacheResetPreview: null };
  renderCurrentPage();
  maybeLoadOperationalBriefing();
  maybeLoadSupportQueues();
  maybeLoadEmailDirectory();
  maybeLoadEmailCampaigns();
  maybeLoadCacheWorkspace();
  maybeLoadCompassWorkspace();
}

export function renderRoute(route, capabilityId = '') {
  state.route = PAGES[route] ? route : 'overview';
  const capability = capabilityById(capabilityId);
  state.selectedCapabilityId = capability?.route === state.route && !capability.nativeRoute ? capability.id : '';
  renderCurrentPage();
  maybeLoadOperationalBriefing();
  maybeLoadSupportQueues();
  maybeLoadEmailDirectory();
  maybeLoadEmailCampaigns();
  maybeLoadCacheWorkspace();
  maybeLoadCompassWorkspace();
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
  document.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLSelectElement) || event.target.id !== 'push-campaign-mode') return;
    state.pushCampaigns = { ...state.pushCampaigns, draft: { mode: event.target.value }, preview: null };
    renderCurrentPage();
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
