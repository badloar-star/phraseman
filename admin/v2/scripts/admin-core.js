import { capabilitiesForRoute, capabilityById, capabilityUrl } from './admin-capabilities.js';
import { completeAnalyticsLoad } from './admin-analytics-state.js';
import { renderAdminAnalytics } from './admin-analytics-view.js';
import { buildOperationalSnapshot } from './admin-operational-snapshot.js';
import { specificGuidanceForControl } from './admin-guidance.js';

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
  'daily-briefing': { title: 'Утренний отчёт руководителя', description: 'Рост, деньги, риски, очереди и действия на сегодня.' },
  'report-center': { title: 'Центр репортов', description: 'Единая ограниченная очередь ошибок, жалоб и контентных репортов без смешивания исходных статусов.' },
  'asset-studio': { title: 'Студия изображений', description: 'Создание изображений через безопасный серверный процесс: создать → проверить → опубликовать.' },
  campaigns: { title: 'Кампании', description: 'Сообщения внутри приложения, аудитории, опросы и история откликов.' },
  'admin-settings': { title: 'Настройки админки', description: 'Личный вид, рабочие привычки, репорты, алерты и защитные правила этой панели.' },
});

const ADMIN_V2_SETTINGS_STORAGE_KEY = 'phraseman.admin.v2.settings';
const ADMIN_ACCENT_PRESETS = Object.freeze({
  lime: { label: 'Салатовый', color: '#b7e35b', hover: '#a8d149', soft: '#eff8d7', ink: '#07110a' },
  blue: { label: 'Синий', color: '#60a5fa', hover: '#3b82f6', soft: '#dbeafe', ink: '#0b1220' },
  purple: { label: 'Фиолетовый', color: '#a78bfa', hover: '#8b5cf6', soft: '#ede9fe', ink: '#14101f' },
  red: { label: 'Красный', color: '#fb7185', hover: '#f43f5e', soft: '#ffe4e6', ink: '#1f0b10' },
  amber: { label: 'Янтарный', color: '#fbbf24', hover: '#f59e0b', soft: '#fef3c7', ink: '#1c1203' },
  custom: { label: 'Свой', color: '#b7e35b', hover: '#a8d149', soft: '#eff8d7', ink: '#07110a' },
});
const DEFAULT_ADMIN_UI_SETTINGS = Object.freeze({
  theme: 'light',
  accent: 'lime',
  customAccent: '#b7e35b',
  density: 'comfortable',
  startPage: 'overview',
  autoRefreshSeconds: 30,
  importantAlertsOnly: false,
  rememberSectionFilters: true,
  expandedAdvancedActions: false,
  defaultSinceDays: 7,
  defaultSource: 'all',
  defaultLane: 'open',
  reportGrouping: 'status',
  showAnsweredBelowOpen: true,
  hideArchivedByDefault: true,
  criticalAlertSound: false,
  sidebarCounters: true,
  quietMode: false,
  strongProductionWarning: true,
  requireReasonForStatus: true,
  collapseDangerousActions: true,
});
const ADMIN_REPORT_SOURCE_DEFAULT_OPTIONS = Object.freeze(['all', 'error_reports', 'user_reports', 'community_pack_reports', 'explain_report_entries', 'app_errors']);

const ADMIN_ROLE_PERMISSIONS = Object.freeze({
  owner: new Set(['users.read', 'money.read', 'money.manual_access.write', 'content.read', 'content.draft.write', 'content.publish', 'application.config.write', 'campaigns.read', 'campaigns.write', 'briefing.read', 'briefing.generate', 'reports.read', 'reports.status.write', 'reports.reply.draft', 'reports.reply.send', 'diagnostics.read', 'diagnostics.status.write']),
  admin: new Set(['users.read', 'money.read', 'money.manual_access.write', 'content.read', 'content.draft.write', 'content.publish', 'application.config.write', 'campaigns.read', 'campaigns.write', 'briefing.read', 'briefing.generate', 'reports.read', 'reports.status.write', 'reports.reply.draft', 'reports.reply.send', 'diagnostics.read', 'diagnostics.status.write']),
  content_editor: new Set(['content.read', 'content.draft.write']),
  analyst: new Set(['users.read', 'money.read', 'content.read', 'campaigns.read', 'briefing.read', 'reports.read', 'diagnostics.read']),
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
  { key: 'ru', label: 'RU' }, { key: 'uk', label: 'UK' }, { key: 'es', label: 'ES' }, { key: 'ptBr', label: 'PT-BR' },
  { key: 'vi', label: 'VI' }, { key: 'id', label: 'ID' }, { key: 'tr', label: 'TR' }, { key: 'pl', label: 'PL' },
]);

function clampChoice(value, allowed, fallback) {
  return allowed.includes(String(value)) ? String(value) : fallback;
}

function clampBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function clampNumberChoice(value, allowed, fallback) {
  const number = Number(value);
  return allowed.includes(number) ? number : fallback;
}

function sanitizeHexColor(value, fallback = DEFAULT_ADMIN_UI_SETTINGS.customAccent) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function normalizeAdminUiSettings(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    theme: clampChoice(source.theme, ['light', 'dark', 'system'], DEFAULT_ADMIN_UI_SETTINGS.theme),
    accent: clampChoice(source.accent, Object.keys(ADMIN_ACCENT_PRESETS), DEFAULT_ADMIN_UI_SETTINGS.accent),
    customAccent: sanitizeHexColor(source.customAccent),
    density: clampChoice(source.density, ['comfortable', 'compact'], DEFAULT_ADMIN_UI_SETTINGS.density),
    startPage: clampChoice(source.startPage, Object.keys(PAGES), DEFAULT_ADMIN_UI_SETTINGS.startPage),
    autoRefreshSeconds: clampNumberChoice(source.autoRefreshSeconds, [0, 15, 30, 60], DEFAULT_ADMIN_UI_SETTINGS.autoRefreshSeconds),
    importantAlertsOnly: clampBoolean(source.importantAlertsOnly, DEFAULT_ADMIN_UI_SETTINGS.importantAlertsOnly),
    rememberSectionFilters: clampBoolean(source.rememberSectionFilters, DEFAULT_ADMIN_UI_SETTINGS.rememberSectionFilters),
    expandedAdvancedActions: clampBoolean(source.expandedAdvancedActions, DEFAULT_ADMIN_UI_SETTINGS.expandedAdvancedActions),
    defaultSinceDays: clampNumberChoice(source.defaultSinceDays, [1, 7, 30, 90], DEFAULT_ADMIN_UI_SETTINGS.defaultSinceDays),
    defaultSource: clampChoice(source.defaultSource, ADMIN_REPORT_SOURCE_DEFAULT_OPTIONS, DEFAULT_ADMIN_UI_SETTINGS.defaultSource),
    defaultLane: clampChoice(source.defaultLane, ['', 'open', 'answered', 'resolved', 'escalated'], DEFAULT_ADMIN_UI_SETTINGS.defaultLane),
    reportGrouping: clampChoice(source.reportGrouping, ['status', 'source', 'time'], DEFAULT_ADMIN_UI_SETTINGS.reportGrouping),
    showAnsweredBelowOpen: clampBoolean(source.showAnsweredBelowOpen, DEFAULT_ADMIN_UI_SETTINGS.showAnsweredBelowOpen),
    hideArchivedByDefault: clampBoolean(source.hideArchivedByDefault, DEFAULT_ADMIN_UI_SETTINGS.hideArchivedByDefault),
    criticalAlertSound: clampBoolean(source.criticalAlertSound, DEFAULT_ADMIN_UI_SETTINGS.criticalAlertSound),
    sidebarCounters: clampBoolean(source.sidebarCounters, DEFAULT_ADMIN_UI_SETTINGS.sidebarCounters),
    quietMode: clampBoolean(source.quietMode, DEFAULT_ADMIN_UI_SETTINGS.quietMode),
    strongProductionWarning: clampBoolean(source.strongProductionWarning, DEFAULT_ADMIN_UI_SETTINGS.strongProductionWarning),
    requireReasonForStatus: clampBoolean(source.requireReasonForStatus, DEFAULT_ADMIN_UI_SETTINGS.requireReasonForStatus),
    collapseDangerousActions: clampBoolean(source.collapseDangerousActions, DEFAULT_ADMIN_UI_SETTINGS.collapseDangerousActions),
  };
}

function loadAdminUiSettings() {
  try {
    const raw = globalThis.localStorage?.getItem(ADMIN_V2_SETTINGS_STORAGE_KEY);
    return normalizeAdminUiSettings(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizeAdminUiSettings({});
  }
}

function saveAdminUiSettings(settings) {
  const normalized = normalizeAdminUiSettings(settings);
  globalThis.localStorage?.setItem(ADMIN_V2_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function accentForSettings(settings) {
  if (settings.accent !== 'custom') return ADMIN_ACCENT_PRESETS[settings.accent] || ADMIN_ACCENT_PRESETS.lime;
  return { ...ADMIN_ACCENT_PRESETS.custom, color: settings.customAccent, hover: settings.customAccent, soft: '#f3f6f8' };
}

function applyAdminUiSettings(settings) {
  const root = globalThis.document?.documentElement;
  if (!root) return;
  const normalized = normalizeAdminUiSettings(settings);
  const accent = accentForSettings(normalized);
  root.dataset.adminTheme = normalized.theme;
  root.dataset.adminAccent = normalized.accent;
  root.dataset.adminDensity = normalized.density;
  root.dataset.adminQuietMode = normalized.quietMode ? 'true' : 'false';
  root.dataset.adminStrongProductionWarning = normalized.strongProductionWarning ? 'true' : 'false';
  root.dataset.adminCollapseDangerousActions = normalized.collapseDangerousActions ? 'true' : 'false';
  root.dataset.adminSidebarCounters = normalized.sidebarCounters ? 'true' : 'false';
  root.style.setProperty('--admin-accent', accent.color);
  root.style.setProperty('--admin-accent-hover', accent.hover);
  root.style.setProperty('--admin-accent-soft', accent.soft);
  root.style.setProperty('--admin-accent-ink', accent.ink);
  root.style.setProperty('--lime', accent.color);
  root.style.setProperty('--lime-hover', accent.hover);
  root.style.setProperty('--lime-soft', accent.soft);
  root.style.setProperty('--lime-ink', accent.ink);
}

function defaultReportState(settings = DEFAULT_ADMIN_UI_SETTINGS) {
  const normalized = normalizeAdminUiSettings(settings);
  return {
    state: 'idle',
    items: [],
    sourceHealth: [],
    source: normalized.defaultSource,
    lane: normalized.defaultLane,
    rawStatus: normalized.hideArchivedByDefault ? '' : '',
    uid: '',
    category: '',
    sinceDays: normalized.defaultSinceDays,
    nextCursor: '',
    error: '',
    replyDrafts: {},
  };
}

const initialAdminUiSettings = loadAdminUiSettings();

const state = {
  route: 'overview',
  authorized: false,
  authReady: false,
  adminEmail: '',
  adminRole: '',
  authGeneration: 0,
  adminSettings: initialAdminUiSettings,
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
  reports: defaultReportState(initialAdminUiSettings),
  audit: { state: 'idle', items: [], action: '', query: '', sinceDays: 7, nextCursor: '', fetchedAtMs: 0, error: '' },
  ops: { state: 'idle', items: [], sourceHealth: [], kpis: null, source: '', type: '', query: '', copyText: '', fetchedAtMs: 0, error: '' },
  assetStudio: { state: 'idle', items: [], selectedJobId: '', error: '' },
  promo: { state: 'idle', codes: [], redemptions: [], generatedCodes: [], preview: null, error: '' },
  campaigns: { state: 'idle', items: [], preview: null, error: '' },
};

let actions = null;
let initialized = false;
let reportFilterTimer = 0;
let reportRequestId = 0;
let adminAutoRefreshTimer = 0;
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
  const баннер = document.getElementById('global-message');
  if (!баннер) return;
  баннер.hidden = !message;
  баннер.textContent = message;
  баннер.className = `global-message ${kind}`;
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
  return `${pageHeader(PAGES[capability.route] ?? PAGES.overview, capability.label, `<button class="button" data-action="close-capability" type="button" title="Вернуться к разделу">К списку инструментов</button>`)}
    <section class="card section"><div class="card-header"><div><h2>${escapeHtml(capability.label)}</h2><p>${escapeHtml(capability.description)}</p></div><span class="badge warning">Старая версия</span></div><div class="card-body"><div class="notice warning"><strong>Этот инструмент ещё переносится.</strong> Он откроется в отдельной вкладке, потому что политика безопасности запрещает встраивать старую админку внутрь Admin 2.</div><div class="actions section"><a class="button primary" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="Открыть рабочий инструмент «${escapeHtml(capability.label)}» в старой админке">Открыть рабочий инструмент</a></div></div></section>`;
}

function settingsSelect(id, label, value, options, title) {
  return `<div class="field"><label for="${id}">${escapeHtml(label)}</label><select id="${id}" data-admin-setting="${id.replace('admin-setting-', '')}" title="${escapeHtml(title)}">${options.map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}"${String(value) === String(optionValue) ? ' selected' : ''}>${escapeHtml(optionLabel)}</option>`).join('')}</select></div>`;
}

function settingsCheckbox(id, label, checked, title) {
  return `<label class="check settings-check" title="${escapeHtml(title)}"><input id="${id}" data-admin-setting="${id.replace('admin-setting-', '')}" type="checkbox"${checked ? ' checked' : ''}><span>${escapeHtml(label)}</span></label>`;
}

function renderAdminSettings() {
  const settings = state.adminSettings;
  const accentOptions = Object.entries(ADMIN_ACCENT_PRESETS).map(([key, preset]) => [key, preset.label]);
  const startPageOptions = Object.entries(PAGES).filter(([route]) => ADMIN_SECTIONS.some((section) => section.route === route) || route === 'report-center' || route === 'daily-briefing').map(([route, page]) => [route, page.title]);
  const sourceOptions = Object.entries(REPORT_SOURCE_LABELS).map(([value, label]) => [value, label]);
  return `${pageHeader(PAGES['admin-settings'], 'Админка / Страница', '<button class="button" data-action="reset-admin-settings" type="button" title="Вернуть стандартные настройки этой админки">Сбросить</button><button class="button primary" data-action="save-admin-settings" type="button" title="Сохранить настройки в этом браузере">Сохранить</button>')}
    <section class="card section"><div class="card-header"><div><h2>Настройки только этой панели</h2><p>Хранятся локально в браузере администратора и не меняют приложение для пользователей.</p></div><span class="badge">localStorage</span></div><div class="card-body">
      <nav class="settings-tabs" aria-label="Разделы настроек админки">
        <button type="button" data-settings-target="settings-appearance" title="Перейти к теме, акценту и плотности">Внешний вид</button>
        <button type="button" data-settings-target="settings-workflow" title="Перейти к рабочему режиму">Рабочий режим</button>
        <button type="button" data-settings-target="settings-reports" title="Перейти к дефолтам центра репортов">Центр репортов</button>
        <button type="button" data-settings-target="settings-alerts" title="Перейти к алертам интерфейса">Уведомления</button>
        <button type="button" data-settings-target="settings-safety" title="Перейти к защитным правилам">Безопасность</button>
      </nav>
    </div></section>
    <div class="settings-layout">
      <section id="settings-appearance" class="card settings-panel" data-admin-settings-panel="appearance" tabindex="-1"><div class="card-header"><div><h2>Внешний вид</h2><p>Тема, основной акцент и плотность рабочей панели.</p></div></div><div class="card-body fields">
        ${settingsSelect('admin-setting-theme', 'Тема', settings.theme, [['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Как в системе']], 'Выбрать светлую, тёмную или системную тему')}
        ${settingsSelect('admin-setting-accent', 'Акцент', settings.accent, accentOptions, 'Выбрать основной цвет кнопок, активных пунктов и подсветок')}
        <div class="field"><label for="admin-setting-customAccent">Свой акцент</label><input id="admin-setting-customAccent" data-admin-setting="customAccent" type="color" value="${escapeHtml(settings.customAccent)}" title="Выбрать произвольный цвет акцента"></div>
        ${settingsSelect('admin-setting-density', 'Плотность', settings.density, [['comfortable', 'Комфортно'], ['compact', 'Компактно']], 'Выбрать расстояния между элементами интерфейса')}
        <div class="accent-swatch" aria-label="Предпросмотр акцента"><span style="background:${escapeHtml(accentForSettings(settings).color)}"></span><strong>${escapeHtml(ADMIN_ACCENT_PRESETS[settings.accent]?.label || 'Свой')}</strong><small>Текст на ярком акценте остаётся тёмным для контраста.</small></div>
      </div></section>
      <section id="settings-workflow" class="card settings-panel" data-admin-settings-panel="workflow" tabindex="-1"><div class="card-header"><div><h2>Рабочий режим</h2><p>Как админка ведёт себя в обычной ежедневной работе.</p></div></div><div class="card-body fields">
        ${settingsSelect('admin-setting-startPage', 'Стартовая страница', settings.startPage, startPageOptions, 'Выбрать страницу, которую удобнее открывать первой')}
        ${settingsSelect('admin-setting-autoRefreshSeconds', 'Автообновление', settings.autoRefreshSeconds, [[0, 'Выключено'], [15, '15 секунд'], [30, '30 секунд'], [60, '1 минута']], 'Выбрать частоту автообновления рабочих очередей')}
        ${settingsCheckbox('admin-setting-importantAlertsOnly', 'На главной показывать только важные алерты', settings.importantAlertsOnly, 'Скрывать тихие информационные сигналы на обзорной странице')}
        ${settingsCheckbox('admin-setting-rememberSectionFilters', 'Запоминать последние фильтры разделов', settings.rememberSectionFilters, 'Оставлять выбранные фильтры при возврате в раздел')}
        ${settingsCheckbox('admin-setting-expandedAdvancedActions', 'Расширенные действия раскрыты по умолчанию', settings.expandedAdvancedActions, 'Показывать дополнительные действия без ручного раскрытия')}
      </div></section>
      <section id="settings-reports" class="card settings-panel" data-admin-settings-panel="reports" tabindex="-1"><div class="card-header"><div><h2>Центр репортов</h2><p>Дефолты очереди, чтобы открытые обращения сразу были выше шума.</p></div></div><div class="card-body fields">
        ${settingsSelect('admin-setting-defaultSinceDays', 'Период по умолчанию', settings.defaultSinceDays, [[1, '24 часа'], [7, '7 дней'], [30, '30 дней'], [90, '90 дней']], 'Выбрать период, который центр репортов ставит при первом открытии')}
        ${settingsSelect('admin-setting-defaultSource', 'Источник по умолчанию', settings.defaultSource, sourceOptions, 'Выбрать источник репортов при первом открытии')}
        ${settingsSelect('admin-setting-defaultLane', 'Статус по умолчанию', settings.defaultLane, [['', 'Все состояния'], ['open', 'Открытые'], ['answered', 'Отвеченные'], ['resolved', 'Закрытые'], ['escalated', 'Эскалированные']], 'Выбрать рабочее состояние репортов при первом открытии')}
        ${settingsSelect('admin-setting-reportGrouping', 'Группировка', settings.reportGrouping, [['status', 'По статусу'], ['source', 'По источнику'], ['time', 'По времени']], 'Выбрать основную группировку очереди')}
        ${settingsCheckbox('admin-setting-showAnsweredBelowOpen', 'Отвеченные показывать ниже открытых', settings.showAnsweredBelowOpen, 'Сначала показывать то, что ещё ждёт решения')}
        ${settingsCheckbox('admin-setting-hideArchivedByDefault', 'Архив скрыт по умолчанию', settings.hideArchivedByDefault, 'Не смешивать архив с рабочей очередью')}
      </div></section>
      <section id="settings-alerts" class="card settings-panel" data-admin-settings-panel="alerts" tabindex="-1"><div class="card-header"><div><h2>Уведомления и алерты</h2><p>Сколько внимания админка просит у человека.</p></div></div><div class="card-body fields">
        ${settingsCheckbox('admin-setting-criticalAlertSound', 'Звук для критических событий', settings.criticalAlertSound, 'Разрешить звуковой сигнал только для критических алертов')}
        ${settingsCheckbox('admin-setting-sidebarCounters', 'Показывать счётчики в меню', settings.sidebarCounters, 'Показывать полезные счётчики рядом с разделами, когда они доступны')}
        ${settingsCheckbox('admin-setting-quietMode', 'Тихий режим без лишних вспышек', settings.quietMode, 'Уменьшить визуальное внимание второстепенных уведомлений')}
      </div></section>
      <section id="settings-safety" class="card settings-panel" data-admin-settings-panel="safety" tabindex="-1"><div class="card-header"><div><h2>Безопасность интерфейса</h2><p>Защитные привычки для production и опасных действий.</p></div></div><div class="card-body fields">
        ${settingsCheckbox('admin-setting-strongProductionWarning', 'Production-предупреждение показывать ярче', settings.strongProductionWarning, 'Сильнее выделять рабочее окружение, где действия влияют на пользователей')}
        ${settingsCheckbox('admin-setting-requireReasonForStatus', 'Требовать причину при смене статуса', settings.requireReasonForStatus, 'Не давать менять статус репорта без понятной причины')}
        ${settingsCheckbox('admin-setting-collapseDangerousActions', 'Опасные действия держать свернутыми', settings.collapseDangerousActions, 'Скрывать destructive-действия до явного раскрытия')}
      </div></section>
    </div>`;
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
  { title: 'Обновления и обслуживание', description: 'Окно обновления, обязательное обновление, ссылки магазинов, доля показа и сообщение о технических работах.', primary: '#application', primaryLabel: 'Открыть настройки приложения', fallback: 'control-panel', risk: 'Высокий риск', coverage: '5 старых кнопок', guarded: true },
  { title: 'Настройки и переключатели', description: 'Промокоды, лига по опыту, постоянный доступ, идеи, боты Арены, первый запуск, таймеры оплаты, видеокнопка и стартовый подарок.', primary: '#application', primaryLabel: 'Открыть настройки приложения', fallback: 'remote-config', risk: 'Защищённая публикация', coverage: '8 переключателей', guarded: true },
  { title: 'Промокоды', description: 'Создание пачек и собственных кодов, список кодов и активации перенесены в раздел «Деньги».', primary: '#money', primaryLabel: 'Открыть промокоды', fallback: 'promo-codes', risk: 'Серверная команда', coverage: 'перенесено', guarded: true },
  { title: 'Промо-баннер', description: 'Текст, ссылка, срок, аудитория, платформа и безопасное выключение перенесены в раздел «Приложение».', primary: '#application', primaryLabel: 'Открыть промо-баннер', fallback: 'control-panel', risk: 'Защищённая публикация', coverage: 'перенесено', guarded: true },
  { title: 'Plus-доступ и уроки', description: 'Глобальные возможности Plus, бесплатные лимиты и поурочное открытие 1–32.', primary: '#application', primaryLabel: 'Открыть доступ Бесплатный / Plus', fallback: 'control-panel', risk: 'Защищённая публикация', coverage: '5 старых кнопок', guarded: true },
  { title: 'Недельные бонусы', description: 'Расписание бонусов, включение бонусов и возврат к исходным значениям.', primary: '#remote-config', primaryLabel: 'Открыть удалённую конфигурацию', fallback: 'control-panel', risk: 'Контент и экономика', coverage: '3 старые кнопки', guarded: true },
  { title: 'ИИ и бюджеты', description: 'Модель Theo, дневные лимиты, фоновые задания ИИ, бюджет и Студия изображений.', primary: '#asset-studio', primaryLabel: 'Открыть Студию изображений', fallback: 'openai-budget', risk: 'Бюджет ИИ', coverage: '5 старых кнопок', guarded: true },
  { title: 'Кампании и коммуникации', description: 'Сообщения и опросы создаются и включаются в новой версии; push-уведомления, варианты экрана оплаты, опрос Plus и Telegram будут перенесены следующими.', primary: '#campaigns', primaryLabel: 'Открыть кампании', fallback: 'app-messages', risk: 'Сообщения защищены; push-уведомления ещё переносятся', coverage: 'частично перенесено', guarded: true },
]);

function renderControlPanel() {
  const headerActions = `<a class="button" href="#overview" title="Вернуться к ежедневному обзору">К обзору</a><a class="button primary" href="#application" title="Открыть основной процесс настройки приложения">Открыть конфигурацию</a><a class="button ghost" href="../../admin/index.html#control-panel" target="_blank" rel="noopener" title="Открыть старый пульт только для аварийной сверки">Старый пульт</a>`;
  return `${pageHeader(PAGES['control-panel'], 'Обзор / Пульт', headerActions)}
    <div class="notice"><strong>Рабочий слой Admin 2.</strong> Здесь собраны группы старого пульта. Опасные действия не копируются прямой записью: они ведут в защищённый процесс или во временный старый модуль до полноценного переноса формы.</div>
    <section class="card section"><div class="card-header"><div><h2>Карта старого пульта</h2><p>29 старых кнопок разложены по рабочим процессам, чтобы ничего не потерять и не смешивать рискованные действия.</p></div><span class="badge">control-panel</span></div>
      <div class="card-body"><div class="control-panel-workflows">${CONTROL_PANEL_WORKFLOWS.map((item) => `<article class="control-panel-workflow"><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p><div class="control-panel-tags"><span class="badge">${escapeHtml(item.coverage)}</span><span class="badge ${item.guarded ? 'success' : 'warning'}">${escapeHtml(item.risk)}</span></div></div><div class="actions"><a class="button ${item.guarded ? '' : 'ghost'} small" href="${escapeHtml(item.primary)}" title="${item.guarded ? 'Открыть основной процесс Admin 2' : 'Открыть старый рабочий модуль'}: ${escapeHtml(item.title)}">${escapeHtml(item.primaryLabel)}</a><a class="button ghost small" href="../../admin/index.html#${encodeURIComponent(item.fallback)}" target="_blank" rel="noopener" title="Открыть старый рабочий модуль отдельно. Его действия могут менять рабочее приложение.">Старый модуль отдельно</a></div></article>`).join('')}</div></div></section>
    <section class="card section"><div class="card-header"><div><h2>Правило переноса опасных кнопок</h2><p>Каждая опасная кнопка переносится отдельно: предпросмотр, причина, ожидаемая версия, журнал действий и восстановление.</p></div></div><div class="card-body"><div class="control-panel-transfer-list"><span>Ручное и обязательное обновление перенесены в защищённый процесс.</span><span>Ограничения уроков Plus перенесены в защищённый процесс Бесплатный / Plus.</span><span>Задания ИИ частично доступны через контроль бюджета и Студию изображений; редактор настроек переносится отдельно.</span></div></div></section>`;
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

const ONBOARDING_ENABLED_STEPS_KEY = 'onboarding_enabled_steps_v1';
const ONBOARDING_STEP_CATALOG = [
  ['welcome', 'Приветствие'], ['source', 'Источник'], ['language', 'Выбор языка'], ['level', 'Уровень языка'],
  ['goal', 'Цель обучения'], ['minutes', 'Время занятий'], ['aha', 'Практическая демонстрация'],
  ['notifications', 'Уведомления'], ['plusBenefits', 'Преимущества Plus'], ['startMode', 'Режим старта'],
  ['planComparison', 'Сравнение планов'], ['onboardingPaywall', 'Предложение подписки'],
  ['name', 'Имя, возраст и обязательные согласия'],
];

function currentOnboardingSteps() {
  try {
    const parsed = JSON.parse(String(remoteConfigValue('texts', ONBOARDING_ENABLED_STEPS_KEY, '')));
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')) return new Set(parsed);
  } catch {}
  return new Set(ONBOARDING_STEP_CATALOG.map(([id]) => id));
}

function renderOnboardingStepsWorkflow() {
  const preview = state.remoteConfigPreview?.source === 'onboarding-steps' ? state.remoteConfigPreview : null;
  const locked = Boolean(state.remoteConfigPreview?.source && !preview) || state.busy || !can('application.config.write');
  const formLocked = locked || Boolean(preview);
  const enabled = currentOnboardingSteps();
  const rows = ONBOARDING_STEP_CATALOG.map(([id, label]) => {
    const mandatory = id === 'name';
    const unavailable = id === 'language';
    const checked = mandatory || enabled.has(id);
    const status = mandatory ? 'Обязательный экран: возраст и юридические согласия нельзя отключить.' : unavailable ? 'Недоступен в текущей версии приложения.' : checked ? 'Показывается пользователям.' : 'Временно пропускается.';
    return `<label class="onboarding-step-row"><input type="checkbox" data-onboarding-step="${id}"${checked ? ' checked' : ''}${mandatory || unavailable || formLocked ? ' disabled' : ''}><span><strong>${label}</strong><small>${status}</small></span>${mandatory ? '<span class="badge">Обязательный</span>' : ''}</label>`;
  }).join('');
  return `<section class="card section"><div class="card-header"><div><h2>Экраны онбординга</h2><p>Снимите галочку, чтобы временно пропустить экран. Путь продолжится со следующего включённого шага.</p></div></div><div class="card-body">${rows}<div class="field full section"><label for="onboarding-steps-reason">Причина изменения</label><textarea id="onboarding-steps-reason" maxlength="500" placeholder="Что отключаем или возвращаем и зачем"${formLocked ? ' disabled' : ''}>${escapeHtml(preview?.reason ?? '')}</textarea></div>${preview ? `<div class="notice warning section"><strong>Предпросмотр</strong><br>${preview.changes.map(escapeHtml).join('<br>') || 'Изменений нет.'}</div>` : ''}<div class="actions end section">${preview ? '<button class="button" data-action="discard-remote-config-preview" type="button">Изменить ещё</button>' : ''}<button class="button primary" data-action="preview-onboarding-steps" type="button"${formLocked ? ' disabled' : ''} title="Показать точные изменения экранов до публикации">Предпросмотр</button>${preview?.changes.length ? '<button class="button primary" data-action="publish-remote-config" type="button" title="Опубликовать с ревизией, причиной и записью в журнал">Опубликовать</button>' : ''}</div></div></section>`;
}

function renderReleaseMaintenanceWorkflow() {
  const releasePreview = state.remoteConfigPreview?.source === 'release-maintenance' ? state.remoteConfigPreview : null;
  const releaseFormLocked = ['partial-restore-remote-config', 'premium-access', 'promo-banner'].includes(String(state.remoteConfigPreview?.source || ''));
  const releaseControlDisabled = releaseFormLocked || !can('application.config.write') || state.busy;
  const reason = releasePreview?.reason ?? '';
  const manualMode = String(remoteConfigValue('texts', 'manual_update_mode', 'optional')) === 'force' ? 'force' : 'optional';
  const manualPlatform = String(remoteConfigValue('texts', 'manual_update_platform', ''));
  const rollout = remoteConfigValue('numbers', 'force_update_enabled_rollout_pct', '');
  return `<section class="card section"><div class="card-header"><div><h2>Обновления и обслуживание</h2><p>Ручное обновление, обязательное обновление и технические работы через один безопасный процесс с предпросмотром.</p></div><span class="badge warning">Влияет на рабочее приложение</span></div><div class="card-body">
    <div class="notice warning"><strong>Это массовые настройки.</strong> Перед публикацией проверьте превью, целевую сборку и процент запуска и причину. Сервер проверит ревизию и запишет запись в журнал и данные для восстановления. Если поменять поля после предпросмотра, публикация остановится и попросит пересобрать предпросмотр.</div>
    <div class="fields">
      <div class="field"><label for="release-force-enabled">Force update включён</label><select id="release-force-enabled"${releaseFormLocked ? ' disabled' : ''}><option value="false"${selectedBool(remoteConfigValue('bools', 'force_update_enabled', false), false)}>Выключено</option><option value="true"${selectedBool(remoteConfigValue('bools', 'force_update_enabled', false), true)}>Включено</option></select></div>
      <div class="field"><label for="release-force-version">Минимальная версия</label><input id="release-force-version" value="${escapeHtml(remoteConfigValue('texts', 'min_app_version', ''))}" placeholder="например 1.5.44"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-force-rollout">Процент пользователей для обязательного обновления</label><input id="release-force-rollout" type="number" min="0" max="100" value="${escapeHtml(rollout === '' ? '' : String(rollout))}" placeholder="100"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-store-ios">App Store URL</label><input id="release-store-ios" value="${escapeHtml(remoteConfigValue('texts', 'store_url_ios', ''))}" placeholder="https://apps.apple.com/app/id..."${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-store-android">Google Play URL</label><input id="release-store-android" value="${escapeHtml(remoteConfigValue('texts', 'store_url_android', ''))}" placeholder="https://play.google.com/store/apps/details?id=..."${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-manual-enabled">Окно ручного обновления</label><select id="release-manual-enabled"${releaseFormLocked ? ' disabled' : ''}><option value="false"${selectedBool(remoteConfigValue('bools', 'manual_update_enabled', false), false)}>Выключено</option><option value="true"${selectedBool(remoteConfigValue('bools', 'manual_update_enabled', false), true)}>Включено</option></select></div>
      <div class="field"><label for="release-manual-mode">Режим modal</label><select id="release-manual-mode"${releaseFormLocked ? ' disabled' : ''}><option value="optional"${manualMode === 'optional' ? ' selected' : ''}>Voluntary: можно закрыть</option><option value="force"${manualMode === 'force' ? ' selected' : ''}>Force: держит окно</option></select></div>
      <div class="field"><label for="release-manual-platform">Платформа modal</label><select id="release-manual-platform"${releaseFormLocked ? ' disabled' : ''}><option value=""${manualPlatform ? '' : ' selected'}>iOS и Android</option><option value="ios"${manualPlatform === 'ios' ? ' selected' : ''}>Только iOS</option><option value="android"${manualPlatform === 'android' ? ' selected' : ''}>Только Android</option></select></div>
      <div class="field"><label for="release-manual-campaign">Код кампании</label><input id="release-manual-campaign" value="${escapeHtml(remoteConfigValue('texts', 'manual_update_campaign_id', ''))}" placeholder="manual_update_2026_07_11_a"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-manual-target">Целевая сборка или версия</label><input id="release-manual-target" value="${escapeHtml(remoteConfigValue('texts', 'manual_update_target_build', ''))}" placeholder="1.5.44 или 81"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field full"><label for="release-manual-title-ru">Заголовок RU</label><input id="release-manual-title-ru" value="${escapeHtml(remoteConfigValue('texts', 'manual_update_title_ru', ''))}" placeholder="Доступно обновление"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field full"><label for="release-manual-body-ru">Текст на русском</label><textarea id="release-manual-body-ru" rows="2" placeholder="Мы улучшили приложение. Обновите его в сторе."${releaseFormLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigValue('texts', 'manual_update_body_ru', ''))}</textarea></div>
      <div class="field"><label for="release-manual-cta-ru">Кнопка RU</label><input id="release-manual-cta-ru" value="${escapeHtml(remoteConfigValue('texts', 'manual_update_cta_ru', ''))}" placeholder="Обновить"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="release-maint-banner">Баннер технических работ</label><select id="release-maint-banner"${releaseFormLocked ? ' disabled' : ''}><option value="false"${selectedBool(remoteConfigValue('bools', 'maintenance_banner', false), false)}>Выключен</option><option value="true"${selectedBool(remoteConfigValue('bools', 'maintenance_banner', false), true)}>Включён</option></select></div>
      <div class="field"><label for="release-maint-block">Полная блокировка на время работ</label><select id="release-maint-block"${releaseFormLocked ? ' disabled' : ''}><option value="false"${selectedBool(remoteConfigValue('bools', 'maintenance_block', false), false)}>Выключен</option><option value="true"${selectedBool(remoteConfigValue('bools', 'maintenance_block', false), true)}>Включён</option></select></div>
      <div class="field"><label for="release-maint-campaign">Код кампании технических работ</label><input id="release-maint-campaign" value="${escapeHtml(remoteConfigValue('texts', 'maintenance_campaign_id', ''))}" placeholder="maintenance_2026_07_11_a"${releaseFormLocked ? ' disabled' : ''}></div>
      <div class="field full"><label for="release-maint-text-ru">Текст технических работ на русском</label><textarea id="release-maint-text-ru" rows="2" placeholder="Идут технические работы. Скоро вернёмся."${releaseFormLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigValue('texts', 'maintenance_ru', ''))}</textarea></div>
      <div class="field full"><label for="release-maintenance-reason">Причина публикации</label><textarea id="release-maintenance-reason" maxlength="500" placeholder="Что изменится, кто увидит, как откатить"${releaseFormLocked ? ' disabled' : ''}>${escapeHtml(reason)}</textarea></div>
    </div>
    ${releaseFormLocked ? '<div class="notice warning section">Активен предпросмотр восстановления значений. Форма обновлений заблокирована, чтобы не изменить restored snapshot перед публикацией.</div>' : ''}
    ${releasePreview ? `<div class="notice ${releasePreview.changes?.length ? 'warning' : ''} section"><strong>${escapeHtml(releasePreview.title || 'Предпросмотр релиза и обслуживания')}</strong><br>${releasePreview.summary ? `${escapeHtml(releasePreview.summary)}<br>` : ''}${Array.isArray(releasePreview.details) && releasePreview.details.length ? `<div class="code-preview section">${releasePreview.details.map((line) => escapeHtml(line)).join('<br>')}</div>` : ''}${releasePreview.changes?.length ? releasePreview.changes.map((change) => escapeHtml(change)).join('<br>') : 'Изменений нет.'}</div>` : ''}
    <div class="actions end section">${releasePreview ? '<button class="button" data-action="discard-remote-config-preview" type="button">Изменить ещё</button>' : ''}<button class="button" data-action="preview-release-maintenance-stop" type="button"${releaseControlDisabled ? ' disabled' : ''} title="Подготовить проверяемый предпросмотр для выключения обязательного обновления, предложения обновиться и режима технических работ">Быстрый стоп</button><button class="button" data-action="preview-release-maintenance" type="button"${releaseControlDisabled ? ' disabled' : ''} title="Собрать безопасный предпросмотр только по ключам обновления и обслуживания">Предпросмотр релиза и обслуживания</button>${releasePreview?.changes?.length ? `<button class="button primary" data-action="publish-remote-config" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Опубликовать через серверную команду с ревизией, причиной и журнал действий">Опубликовать</button>` : ''}</div>
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
  return `<section class="card section"><div class="card-header"><div><h2>Бесплатный / Plus доступ и уроки</h2><p>Глобальные ограничения экрана оплаты, лимиты бесплатного тарифа и поурочные исключения 1–32 через безопасный предпросмотр и защищённую публикацию.</p></div><span class="badge warning">Влияет на монетизацию</span></div><div class="card-body">
    <div class="notice"><strong>Не выдаёт VIP пользователю.</strong> Это только глобальная конфигурация приложения. Админский Plus/VIP остаётся отдельной защищённой командой для пользователя.</div>
    <div class="fields">${featureControls}</div>
    <div class="fields section">${limitControls}</div>
    <div class="fields section">
      <div class="field"><label for="premium-free-lessons-extra">Уроки дополнительно Free</label><input id="premium-free-lessons-extra" value="${escapeHtml(formatLessonList(freeExtra))}" placeholder="например 9, 10, 12"${premiumFormLocked ? ' disabled' : ''}></div>
      <div class="field"><label for="premium-premium-lessons-extra">Уроки принудительно Plus</label><input id="premium-premium-lessons-extra" value="${escapeHtml(formatLessonList(premiumExtra))}" placeholder="например 2, 3"${premiumFormLocked ? ' disabled' : ''}></div>
      <div class="field full"><label for="premium-access-reason">Причина публикации</label><textarea id="premium-access-reason" maxlength="500" placeholder="Что меняется в доступе бесплатного / Plus, кого затронет, как откатить"${premiumFormLocked ? ' disabled' : ''}>${escapeHtml(premiumPreview?.reason ?? '')}</textarea></div>
    </div>
    ${premiumFormLocked ? '<div class="notice warning section">Активен другой предпросмотр Remote Config. Завершите публикацию или нажмите «Изменить ещё», прежде чем менять бесплатного / Plus доступ.</div>' : ''}
    ${premiumPreview ? `<div class="notice ${premiumPreview.changes?.length ? 'warning' : ''} section"><strong>Предпросмотр Бесплатный / Plus доступа</strong><br>${premiumPreview.summary ? `${escapeHtml(premiumPreview.summary)}<br>` : ''}${Array.isArray(premiumPreview.details) && premiumPreview.details.length ? `<div class="code-preview section">${premiumPreview.details.map((line) => escapeHtml(line)).join('<br>')}</div>` : ''}${premiumPreview.changes?.length ? premiumPreview.changes.map((change) => escapeHtml(change)).join('<br>') : 'Изменений нет.'}</div>` : ''}
    <div class="actions end section">${premiumPreview ? '<button class="button" data-action="discard-remote-config-preview" type="button">Изменить ещё</button>' : ''}<button class="button" data-action="preview-premium-access" type="button"${controlDisabled ? ' disabled' : ''} title="Собрать предпросмотр изменения бесплатного / Plus доступа без прямой записи">Предпросмотр Бесплатный / Plus</button>${premiumPreview?.changes?.length ? `<button class="button primary" data-action="publish-remote-config" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Опубликовать через серверную команду с ревизией, причиной и журнал действий">Опубликовать</button>` : ''}</div>
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
    <div class="notice"><strong>Баннер не меняет цену в сторе.</strong> Он только ведёт пользователя по указанной ссылке. Закрытие сохраняется по кампания ID; новый контент публикуйте с новым кампания ID. Агрегированный счётчик закрытий пока недоступен: текущее приложение хранит закрытие локально на устройстве.</div>
    <div class="fields">
      <div class="field"><label for="promo-banner-enabled">Показать верхний баннер</label><select id="promo-banner-enabled"${promoFormLocked ? ' disabled' : ''}><option value="false"${selectedBool(remoteConfigValue('bools', 'promo_banner_enabled', false), false)}>Выключен</option><option value="true"${selectedBool(remoteConfigValue('bools', 'promo_banner_enabled', false), true)}>Включён</option></select></div>
      <div class="field"><label for="promo-banner-campaign">Код кампании промо-баннера</label><input id="promo-banner-campaign" maxlength="80" value="${escapeHtml(remoteConfigValue('texts', 'promo_banner_campaign_id', ''))}" placeholder="promo_2026_07_offer_a"${promoFormLocked ? ' disabled' : ''}><span class="hint">Не переиспользуйте ID закрытой кампании для нового содержания.</span></div>
      <div class="field full"><label for="promo-banner-text-ru">Текст на русском</label><input id="promo-banner-text-ru" maxlength="240" value="${escapeHtml(remoteConfigValue('texts', 'promo_banner_text_ru', ''))}" placeholder="Специальное предложение — успейте воспользоваться"${promoFormLocked ? ' disabled' : ''}></div>
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
    <div class="actions end section">${promoPreview ? '<button class="button" data-action="discard-remote-config-preview" type="button" title="Отменить предпросмотр без изменения рабочего приложения">Изменить ещё</button>' : ''}<button class="button" data-action="preview-promo-banner-stop" type="button"${controlDisabled ? ' disabled' : ''} title="Подготовить безопасное выключение баннера для всех пользователей">Выключить баннер</button><button class="button ${promoPreview ? '' : 'primary'}" data-action="preview-promo-banner" type="button"${controlDisabled ? ' disabled' : ''} title="Показать точные изменения баннера до публикации">Предпросмотр баннера</button>${promoPreview?.changes?.length ? `<button class="button primary" data-action="publish-remote-config" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Опубликовать баннер через серверную команду с журнал действий и возможностью восстановления">Опубликовать</button>` : ''}</div>
  </div></section>`;
}

function renderRemoteConfigHistory() {
  const history = Array.isArray(state.remoteConfig?.history) ? state.remoteConfig.history.slice(0, 12) : [];
  if (!history.length) return emptyState('История изменений пока пуста.');
  return `<div class="data-list">${history.map((item) => `<div class="list-row"><div><strong>${escapeHtml(auditActionLabel(item.action || 'Изменение конфигурации'))}</strong><small>${escapeHtml(item.timestamp || item.at || '')} · ${escapeHtml(item.reason || item.by || 'Причина не указана')}</small>${item.rollbackReference ? `<small>Код восстановления: <code>${escapeHtml(item.rollbackReference)}</code></small>` : ''}</div><div class="actions"><span class="badge">ревизия ${Number(item.revision ?? 0)}</span>${item.before && typeof item.before === 'object' ? `<button class="button small" data-action="preview-remote-config-restore" data-rollback-reference="${escapeHtml(item.id || item.rollbackReference || '')}" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'} title="Подготовить предпросмотр восстановления значений из состояния до этой публикации. Новые ключи не удаляются.">Восстановить значения</button>` : ''}</div></div>`).join('')}</div>`;
}

function renderApplication() {
  const workspace = state.remoteConfig;
  const config = workspace?.config ?? {};
  const releasePreviewActive = state.remoteConfigPreview?.source === 'release-maintenance';
  const restorePreviewActive = state.remoteConfigPreview?.source === 'partial-restore-remote-config';
  const premiumPreviewActive = state.remoteConfigPreview?.source === 'premium-access';
  const promoPreviewActive = state.remoteConfigPreview?.source === 'promo-banner';
  const onboardingPreviewActive = state.remoteConfigPreview?.source === 'onboarding-steps';
  const editorLocked = releasePreviewActive || restorePreviewActive || premiumPreviewActive || promoPreviewActive || onboardingPreviewActive;
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
      ${renderOnboardingStepsWorkflow()}
      <section class="card section"><div class="card-header"><div><h2>Редактор конфигурации</h2><p>Формат JSON позволяет сохранить все существующие и новые ключи. Тип каждого значения проверяется до публикации и повторно на сервере.</p></div><span class="badge">ревизия ${Number(config.revision ?? 0)}</span></div><div class="card-body">
        <div class="fields">
          <div class="field"><label for="remote-config-bools">Переключатели · только true/false</label><textarea id="remote-config-bools" class="mono config-editor" spellcheck="false"${editorLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigBranch('bools'))}</textarea></div>
          <div class="field"><label for="remote-config-numbers">Числа · только конечные числа</label><textarea id="remote-config-numbers" class="mono config-editor" spellcheck="false"${editorLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigBranch('numbers'))}</textarea></div>
          <div class="field full"><label for="remote-config-texts">Тексты · только строки</label><textarea id="remote-config-texts" class="mono config-editor" spellcheck="false"${editorLocked ? ' disabled' : ''}>${escapeHtml(remoteConfigBranch('texts'))}</textarea></div>
          <div class="field full"><label for="remote-config-reason">Причина изменения</label><textarea id="remote-config-reason" maxlength="500" placeholder="Что меняется, зачем и кто проверил"${editorLocked ? ' disabled' : ''}>${escapeHtml(preview?.reason ?? '')}</textarea></div>
        </div>
        ${releasePreviewActive ? '<div class="notice warning section">Активен предпросмотр релиза и обслуживания выше. Завершите публикацию или нажмите «Изменить ещё», прежде чем использовать общий JSON-редактор.</div>' : ''}
        ${restorePreviewActive ? '<div class="notice warning section">Активен предпросмотр восстановления значений. JSON-редактор заблокирован, чтобы не отправить устаревший snapshot; нажмите «Изменить ещё», если нужно править вручную.</div>' : ''}
        ${premiumPreviewActive ? '<div class="notice warning section">Активен предпросмотр Бесплатный / Plus доступа выше. JSON-редактор заблокирован, чтобы не отправить устаревший snapshot.</div>' : ''}
        ${promoPreviewActive ? '<div class="notice warning section">Активен предпросмотр промо-баннера выше. JSON-редактор заблокирован, чтобы не отправить устаревший snapshot.</div>' : ''}
        ${preview ? `<div class="notice ${preview.changes.length ? 'warning' : ''} section"><strong>${escapeHtml(preview.title || 'Предпросмотр изменений')}</strong><br>${preview.summary ? `${escapeHtml(preview.summary)}<br>` : ''}${preview.changes.length ? preview.changes.map((change) => escapeHtml(change)).join('<br>') : 'Значения не отличаются от текущей ревизии.'}</div>` : ''}
        <div class="actions end section">${preview ? '<button class="button" data-action="discard-remote-config-preview" type="button">Изменить ещё</button>' : ''}<button class="button ${preview || editorLocked ? '' : 'primary'}" data-action="preview-remote-config" type="button"${can('application.config.write') && !state.busy && !editorLocked ? '' : ' disabled'}>Предпросмотр</button>${preview?.changes.length ? `<button class="button primary" data-action="publish-remote-config" type="button"${can('application.config.write') && !state.busy ? '' : ' disabled'}>Опубликовать</button>` : ''}</div>
      </div></section>
      <section class="card section"><div class="card-header"><div><h2>Последние изменения</h2><p>Серверный журнал с причиной и ревизией.</p></div></div><div class="card-body">${renderRemoteConfigHistory()}</div></section>
    `}`;
}

function appMessageDraftValue(draft, language, field, fallback = '') {
  return draft?.translations?.[language]?.[field] ?? fallback;
}

function renderAppMessageTranslations(draft, locked) {
  return APP_MESSAGE_LANGUAGES.filter((language) => language.key !== 'ru').map((language) => {
    const options = Array.isArray(appMessageDraftValue(draft, language.key, 'pollOptions', [])) ? appMessageDraftValue(draft, language.key, 'pollOptions', []).join('\n') : '';
    return `<div class="fields section"><div class="field"><label for="app-message-title-${language.key}">Тема ${language.label}</label><input id="app-message-title-${language.key}" maxlength="160" value="${escapeHtml(appMessageDraftValue(draft, language.key, 'title'))}" placeholder="Пусто — использовать русский текст"${locked ? ' disabled' : ''}></div><div class="field"><label for="app-message-body-${language.key}">Текст ${language.label}</label><textarea id="app-message-body-${language.key}" rows="2" maxlength="2000" placeholder="Пусто — использовать русский текст"${locked ? ' disabled' : ''}>${escapeHtml(appMessageDraftValue(draft, language.key, 'body'))}</textarea></div><div class="field"><label for="app-message-poll-question-${language.key}">Вопрос опроса ${language.label}</label><input id="app-message-poll-question-${language.key}" maxlength="300" value="${escapeHtml(appMessageDraftValue(draft, language.key, 'pollQuestion'))}" placeholder="Пусто — использовать русский текст"${locked ? ' disabled' : ''}></div><div class="field"><label for="app-message-poll-options-${language.key}">Варианты ${language.label}, по строке</label><textarea id="app-message-poll-options-${language.key}" rows="3" maxlength="1000" placeholder="Пусто — использовать варианты на русском"${locked ? ' disabled' : ''}>${escapeHtml(options)}</textarea></div></div>`;
  }).join('');
}

function renderCampaigns() {
  const campaignState = state.campaigns;
  const draft = campaignState.preview?.payload || {};
  const locked = !can('campaigns.write') || state.busy;
  const now = Date.now();
  const items = Array.isArray(campaignState.items) ? campaignState.items : [];
  const activeCount = items.filter((item) => item.active !== false && Number(item.expiresAtMs || 0) > now).length;
  const reads = items.reduce((sum, item) => sum + Number(item.readCount || 0), 0);
  const reactions = items.reduce((sum, item) => sum + Number(item.likeCount || 0) + Number(item.dislikeCount || 0), 0);
  const list = campaignState.state === 'loading' ? emptyState('Загрузка сообщений…') : campaignState.state === 'error' ? `<div class="notice danger">${escapeHtml(campaignState.error)}</div>` : !items.length ? emptyState('Сообщений пока нет. Создайте черновик и проверьте предпросмотр.') : `<div class="data-list">${items.map((item) => {
    const expired = Number(item.expiresAtMs || 0) > 0 && Number(item.expiresAtMs) <= now;
    const active = item.active !== false && !expired;
    const nextActive = item.active === false;
    return `<article class="list-row"><div><strong>${escapeHtml(item.titleRu || 'Без темы')}</strong><small>${escapeHtml(item.kind === 'poll' ? 'Опрос' : 'Сообщение')} · ${escapeHtml(audienceLabel(item.audience || 'all'))} · приоритет ${Number(item.priority || 0)} · до ${escapeHtml(dateTime(item.expiresAtMs))}</small><small>Прочтения ${Number(item.readCount || 0)} · лайки ${Number(item.likeCount || 0)} · дизлайки ${Number(item.dislikeCount || 0)} · голоса ${Number(item.pollVoteCount || 0)}</small><small><code>${escapeHtml(item.id)}</code></small></div><div class="actions"><span class="badge ${active ? 'success' : expired ? 'warning' : ''}">${expired ? 'Истекло' : active ? 'Активно' : 'Черновик / выключено'}</span><button class="button small" data-app-message-toggle="${escapeHtml(item.id)}" data-next-active="${nextActive}" type="button"${locked || expired ? ' disabled' : ''} title="Включить или выключить сообщение через серверную команду с причиной и журнал действий">${nextActive ? 'Включить' : 'Выключить'}</button></div></article>`;
  }).join('')}</div>`;
  const options = Array.from({ length: 6 }, (_, index) => `<div class="field"><label for="app-message-poll-option-${index + 1}">Вариант ${index + 1}</label><input id="app-message-poll-option-${index + 1}" maxlength="160" value="${escapeHtml(draft?.translations?.ru?.pollOptions?.[index] || '')}" placeholder="${index < 2 ? 'Обязательно для опроса' : 'Необязательно'}"${locked ? ' disabled' : ''}></div>`).join('');
  const headerActions = `<a class="button" href="#application" title="Вернуться к настройкам приложения">К приложению</a><a class="button ghost" href="../../admin/index.html#app-messages" target="_blank" rel="noopener" title="Открыть старый модуль для редактирования, удаления и аварийной сверки">Старый модуль сообщений</a><button class="button" data-action="load-app-messages" type="button"${disabledWhenUnauthorized('campaigns.read')} title="Загрузить до 120 последних сообщений и агрегированные счётчики">${items.length ? 'Обновить список' : 'Загрузить сообщения'}</button>`;
  return `${pageHeader(PAGES.campaigns, 'Приложение / Кампании', headerActions)}
    <div class="notice"><strong>Новая версия: создание сообщения и управление его показом.</strong> Редактирование и удаление будут перенесены следующим безопасным срезом после политики сохранения голосов. До этого старый модуль остаётся доступен для этих двух операций.</div>
    <section class="metrics section"><article class="card metric"><label>Активные</label><strong>${items.length ? activeCount : '—'}</strong><span class="badge success">сейчас</span></article><article class="card metric"><label>Всего</label><strong>${items.length || '—'}</strong><span class="badge">до 120</span></article><article class="card metric"><label>Прочтения</label><strong>${items.length ? reads : '—'}</strong><span class="badge">агрегировано</span></article><article class="card metric"><label>Реакции</label><strong>${items.length ? reactions : '—'}</strong><span class="badge">нравится и не нравится</span></article></section>
    <section class="card section"><div class="card-header"><div><h2>Новое сообщение</h2><p>Создайте обычное сообщение для входящих или опрос. Черновик никому не показывается; активное сообщение появляется у выбранной аудитории после публикации.</p></div><span class="badge warning">Рабочая кампания</span></div><div class="card-body">
      <div class="fields"><div class="field"><label for="app-message-kind">Формат</label><select id="app-message-kind"${locked ? ' disabled' : ''}><option value="message"${draft.kind === 'poll' ? '' : ' selected'}>Сообщение</option><option value="poll"${draft.kind === 'poll' ? ' selected' : ''}>Сообщение + опрос</option></select></div><div class="field"><label for="app-message-active">Статус после публикации</label><select id="app-message-active"${locked ? ' disabled' : ''}><option value="false"${draft.active === true ? '' : ' selected'}>Черновик / выключено</option><option value="true"${draft.active === true ? ' selected' : ''}>Активно</option></select></div><div class="field"><label for="app-message-audience">Аудитория</label><select id="app-message-audience"${locked ? ' disabled' : ''}><option value="all"${draft.audience && draft.audience !== 'all' ? '' : ' selected'}>Все пользователи</option><option value="free"${draft.audience === 'free' ? ' selected' : ''}>Только Free</option><option value="premium"${draft.audience === 'premium' ? ' selected' : ''}>Только Plus</option></select></div><div class="field"><label for="app-message-priority">Приоритет</label><input id="app-message-priority" type="number" min="0" max="99" value="${escapeHtml(draft.priority ?? 0)}"${locked ? ' disabled' : ''}></div><div class="field"><label for="app-message-ttl-days">Срок, дней</label><input id="app-message-ttl-days" type="number" min="1" max="30" value="${escapeHtml(draft.ttlDays ?? 30)}"${locked ? ' disabled' : ''}></div><div class="field full"><label for="app-message-title-ru">Тема на русском</label><input id="app-message-title-ru" maxlength="160" value="${escapeHtml(appMessageDraftValue(draft, 'ru', 'title'))}"${locked ? ' disabled' : ''}></div><div class="field full"><label for="app-message-body-ru">Текст на русском</label><textarea id="app-message-body-ru" rows="3" maxlength="2000"${locked ? ' disabled' : ''}>${escapeHtml(appMessageDraftValue(draft, 'ru', 'body'))}</textarea></div><div class="field full"><label for="app-message-poll-question-ru">Вопрос опроса на русском</label><input id="app-message-poll-question-ru" maxlength="300" value="${escapeHtml(appMessageDraftValue(draft, 'ru', 'pollQuestion'))}" placeholder="Только для формата «Опрос»"${locked ? ' disabled' : ''}></div>${options}<div class="field full"><label for="app-message-reason">Причина публикации</label><textarea id="app-message-reason" maxlength="500" placeholder="Цель, аудитория, срок и условие остановки"${locked ? ' disabled' : ''}>${escapeHtml(campaignState.preview?.reason || '')}</textarea></div></div>
      <details class="section"><summary>Переводы на 8 языков</summary><div class="notice section">Пустое поле безопасно наследует RU. Для опроса варианты вводятся по одному на строку в том же порядке.</div>${renderAppMessageTranslations(draft, locked)}</details>
      ${campaignState.preview ? `<div class="notice warning section"><strong>Предпросмотр кампании</strong><br>${escapeHtml(campaignState.preview.summary)}<div class="code-preview section">${campaignState.preview.details.map((line) => escapeHtml(line)).join('<br>')}</div></div>` : ''}
      <div class="actions end section">${campaignState.preview ? '<button class="button" data-action="discard-app-message-preview" type="button" title="Отменить предпросмотр без записи в рабочее приложение">Изменить ещё</button>' : ''}<button class="button ${campaignState.preview ? '' : 'primary'}" data-action="preview-app-message" type="button"${locked ? ' disabled' : ''} title="Сначала показать точное сообщение, аудиторию и срок без записи в рабочее приложение">Предпросмотр</button>${campaignState.preview ? `<button class="button primary" data-action="publish-app-message" type="button"${locked ? ' disabled' : ''} title="Создать сообщение через серверную команду с указанной причиной, защитой от повторной отправки и записью в журнал">Опубликовать</button>` : ''}</div>
    </div></section>
    <section class="card section"><div class="card-header"><div><h2>История сообщений</h2><p>Статус, срок, аудитория, прочтения, реакции и голоса опросов.</p></div></div><div class="card-body"><div class="field full"><label for="app-message-toggle-reason">Причина включения или выключения</label><input id="app-message-toggle-reason" maxlength="500" placeholder="Почему меняется показ и как вернуть прежнее состояние"></div>${list}</div></section>`;
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
    <section class="card profile-hero"><div><div class="eyebrow">Канонический профиль</div><h2>${escapeHtml(summary.name || profile.canonicalUid)}</h2><p class="mono">${escapeHtml(profile.canonicalUid)}</p><div class="actions"><span class="badge ${summary.banned ? 'danger' : 'success'}">${summary.banned ? 'Заблокирован' : 'Активен'}</span><span class="badge">${escapeHtml(identityReasonLabel(profile.identity?.reason || 'requested'))}</span>${profile.state === 'partial' ? '<span class="badge warning">Неполный снимок</span>' : '<span class="badge success">Снимок готов</span>'}</div></div><div class="profile-hero-actions"><button class="button" data-action="reload-user-profile" type="button" title="Обновить все источники профиля" data-tooltip="Обновить все источники профиля">Обновить</button><a class="button" href="${escapeHtml(legacyUrl)}" target="_blank" rel="noopener" title="Открыть защищённое управление аккаунтом" data-tooltip="Открыть защищённое управление аккаунтом">Управление аккаунтом</a></div></section>
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
  return `<section class="card section"><div class="card-header"><div><h2>Промокоды</h2><p>Создание кодов идёт через серверные callable, без прямой записи Firestore из браузера.</p></div><span class="badge success">Новая версия</span></div><div class="card-body">
    <div class="fields">
      <div class="field"><label for="promo-mode">Тип</label><select id="promo-mode"><option value="generated"${promoMode === 'generated' ? ' selected' : ''}>Сгенерировать пачку</option><option value="custom"${promoMode === 'custom' ? ' selected' : ''}>Свои коды</option></select></div>
      <div class="field"><label for="promo-count">Количество</label><input id="promo-count" type="number" min="1" max="200" value="${escapeHtml(promoDraft.count || 10)}"></div>
      <div class="field"><label for="promo-prefix">Префикс</label><input id="promo-prefix" value="${escapeHtml(promoDraft.prefix || 'PM')}" maxlength="16"></div>
      <div class="field"><label for="promo-max-redemptions">Лимит активаций</label><input id="promo-max-redemptions" type="number" min="0" value="${escapeHtml(promoDraft.maxRedemptions ?? 1)}"><small class="hint">0 = без общего лимита; одноразовые ставят 1.</small></div>
      <div class="field"><label for="promo-reward-kind">Награда</label><select id="promo-reward-kind"><option value="days"${promoDraft.rewardKind === 'lifetime' ? '' : ' selected'}>Plus дни</option><option value="lifetime"${promoDraft.rewardKind === 'lifetime' ? ' selected' : ''}>Навсегда</option></select></div>
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
  const releaseCandidate = job?.releaseCandidate === true;
  const units = Array.isArray(detail?.units) ? detail.units : [];
  const completed = Number(job?.progress?.completed ?? units.filter((unit) => unit.state === 'succeeded').length);
  const total = Number(job?.progress?.total ?? units.length);
  const percent = total ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const runnable = units.filter((unit) => unit.state !== 'succeeded' && (unit.state !== 'failed' || unit.retryable === true));
  const pending = runnable.length;
  const incomplete = units.some((unit) => unit.state !== 'succeeded');
  return `<section class="card factory-panel"><div class="card-header"><div><h2>Генерация и предпросмотр</h2><p>Задание можно безопасно продолжить после закрытия браузера: готовые юниты и контрольные точки не создаются повторно.</p></div><span class="badge">Этап 2 из 4</span></div>
    <div class="card-body">
      <div class="actions"><button class="button" data-action="load-factory-jobs" type="button"${disabledWhenUnauthorized('content.read')}>Загрузить черновики</button>${detail ? `<button class="button" data-action="refresh-factory-detail" type="button"${disabledWhenUnauthorized('content.read')}>Обновить</button>` : ''}</div>
      ${!detail ? `<div class="section">${renderJobPicker()}</div>` : `
        <div class="notice section"><strong>${escapeHtml(job.studyTarget)} ← ${escapeHtml(job.learnerSourceLocale ?? job.sourceLocale)}</strong><br><span class="mono">${escapeHtml(detail.jobId)}</span></div>
        <div class="section"><div class="actions" style="justify-content:space-between"><span class="hint">Готово ${completed} из ${total}</span><span class="badge ${badgeClass(job.state)}">${escapeHtml(statusLabel(job.state))}</span></div><div class="progress" aria-label="Прогресс ${percent}%"><span style="width:${percent}%"></span></div></div>
        ${state.generation ? `<div class="notice ${state.generation.failed ? 'warning' : ''} section" role="status">Обработано в этом запуске: ${state.generation.done}/${state.generation.total}. Ошибок: ${state.generation.failed}.${state.generation.errors?.length ? `<br>${state.generation.errors.map((message) => escapeHtml(message)).join('<br>')}` : ''}</div>` : ''}
        ${incomplete && !pending ? '<div class="notice warning section" role="alert">Есть ошибки, которые нельзя повторить без изменения входных данных. Откройте причину в карточке операции.</div>' : ''}
        ${!incomplete && !releaseCandidate ? '<div class="notice success section">Черновик готов; для публикационной проверки нужны урок, квиз, карточки и Арена.</div>' : ''}
        <div class="actions end section"><button class="button" data-action="back-to-factory-jobs" type="button">Другой черновик</button>${pending ? `<button class="button primary" data-action="run-factory-generation" type="button" title="Сгенерировать или продолжить оставшиеся части"${disabledWhenUnauthorized('content.draft.write')}>${state.generation ? 'Продолжить генерацию' : 'Запустить генерацию'}</button>` : incomplete || !releaseCandidate ? '' : `<button class="button primary" data-factory-step="3" type="button">Перейти к проверке</button>`}</div>
        <div class="unit-grid section">${units.map((unit) => `<article class="unit-card"><div class="actions" style="justify-content:space-between"><strong>Урок ${Number(unit.lessonId)} · ${escapeHtml(SURFACE_LABELS[unit.surface] ?? unit.surface)}</strong><span class="badge ${badgeClass(unit.state)}">${escapeHtml(statusLabel(unit.state))}</span></div>${unit.errorCode ? `<div class="notice danger" role="alert"><strong>${escapeHtml(unit.errorCode)}</strong><br>${escapeHtml(unit.errorMessage || 'Причина не указана.')}<br><small>${unit.retryable ? 'Можно безопасно повторить.' : 'Повтор без изменения входных данных заблокирован.'} · попыток: ${Array.isArray(unit.attemptHistory) ? unit.attemptHistory.length : Number(unit.attempts || 0)}</small></div>` : ''}<div class="actions"><button class="button small" data-preview-unit="${escapeHtml(unit.id ?? unit.unitId)}" type="button" title="Проверить неизменяемый файл и открыть содержимое"${unit.state === 'succeeded' && can('content.read') ? '' : ' disabled'}>Предпросмотр</button>${unit.state !== 'succeeded' && unit.retryable === true ? `<button class="button small" data-retry-factory-unit="${escapeHtml(unit.id ?? unit.unitId)}" type="button" title="Повторить только эту временно неудачную операцию"${disabledWhenUnauthorized('content.draft.write')}>Повторить</button>` : ''}</div></article>`).join('')}</div>
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
  const releaseCandidate = detail?.job?.releaseCandidate === true;
  const review = detail?.review;
  return `<section class="card factory-panel"><div class="card-header"><div><h2>Проверка качества и источников</h2><p>Решение доступно только после фактического предпросмотра. Сервер повторно проверит все юниты, хеш шаблона и реестр источников.</p></div><span class="badge">Этап 3 из 4</span></div>
    <div class="card-body">
      ${!detail ? `<div class="notice warning">Сначала выберите черновик на втором этапе.</div><div class="actions end section"><button class="button primary" data-factory-step="2" type="button">Выбрать черновик</button></div>` : `
        ${!releaseCandidate ? '<div class="notice warning">Черновик готов; для публикационной проверки нужны урок, квиз, карточки и Арена.</div>' : ''}
        <div class="actions" style="justify-content:space-between"><div><strong>${escapeHtml(detail.job.studyTarget)} · ${escapeHtml(detail.jobId)}</strong><div class="hint">Готовых частей: ${detail.units.filter((unit) => unit.state === 'succeeded').length}/${detail.units.length}</div></div>${review ? `<span class="badge ${badgeClass(review.status)}">${escapeHtml(statusLabel(review.status))}</span>` : '<span class="badge">Решения ещё нет</span>'}</div>
        <div class="section">${renderPreview()}</div>
        <div class="field full section"><label for="factory-review-reason">Комментарий проверяющего</label><textarea id="factory-review-reason" maxlength="500" placeholder="Что проверено: язык, соответствие источникам, структура, варианты ответов…">${escapeHtml(review?.reason ?? '')}</textarea></div>
        <div class="notice section">Одобрение не публикует пакет. Оно только разрешает запечатать неизменяемый релиз на следующем этапе.</div>
        <div class="actions end section"><button class="button danger" data-action="reject-factory-job" type="button"${allReady && releaseCandidate && state.preview && can('content.publish') && !state.busy ? '' : ' disabled'} title="Отклонить и вернуть на доработку">Отклонить</button><button class="button primary" data-action="approve-factory-job" type="button"${allReady && releaseCandidate && state.preview && can('content.publish') && !state.busy ? '' : ' disabled'} title="Одобрить после проверки содержимого и источников">Одобрить проверку</button></div>
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
  'app_message.create': 'Создание сообщения в приложении',
  'app_message.toggle': 'Изменение показа сообщения',
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
  return `<span class="badge ${kind}">${escapeHtml(labels[source.state] || 'Неизвестное состояние')}</span>`;
}

function renderDiagnosticsSourceHealth(view) {
  if (view.state === 'loading') return '<div class="profile-loading" role="status" aria-live="polite"><span class="loading-bar"></span><span>Читаю состояние источников…</span></div>';
  if (view.state === 'error') return `<div class="notice danger" role="alert"><strong>Источники не загружены.</strong><br>${escapeHtml(view.error || 'Сервер не вернул снимок.')}<div class="actions section"><button class="button" data-action="load-daily-briefing" type="button"${disabledWhenUnauthorized('briefing.read')} title="Повторно прочитать состояние источников">Повторить чтение</button></div></div>`;
  if (!view.hasData) return emptyState('Сохранённый снимок источников ещё не загружен.');
  if (!view.sources.length) return emptyState('В сохранённом снимке нет сведений об источниках.');
  return `<div class="source-health-grid">${view.sources.map((source) => `<div><span>${escapeHtml(SOURCE_LABELS[source.source] || 'Неизвестный источник')}</span><small class="mono">${escapeHtml(source.source)}</small>${sourceHealthBadge(source)}<small>Записей: ${source.count.toLocaleString('ru-RU')}${source.limit ? ` · лимит ${source.limit.toLocaleString('ru-RU')}` : ''}</small><small>Проверен: ${escapeHtml(dateTime(source.checkedAtMs))}</small><small>Последнее событие: ${escapeHtml(dateTime(source.latestEventAtMs))}</small>${source.error ? `<small class="source-error">${escapeHtml(source.error)}</small>` : ''}</div>`).join('')}</div>`;
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
    return `<article class="list-row audit-row"><div><strong>${escapeHtml(auditActionLabel(row.action))}</strong><small><code>${escapeHtml(row.action || 'unknown')}</code> · ${escapeHtml(dateTime(row.timestampMs))} · ${escapeHtml(auditActor(row))} · ${escapeHtml(row.role || 'роль не указана')}</small><small>${escapeHtml(SOURCE_LABELS[entity.collection] || 'Неизвестный объект')}${entity.id ? ` / ${escapeHtml(entity.id)}` : ''}${row.requestId ? ` · код запроса: <code>${escapeHtml(row.requestId)}</code>` : ''}</small><small>Причина и откат: ${escapeHtml(row.reason || 'причина не указана')}${row.rollbackReference ? ` · код восстановления: <code>${escapeHtml(row.rollbackReference)}</code>` : ''}</small><small>До: ${escapeHtml(auditSummary(row.before))}</small><small>После: ${escapeHtml(auditSummary(row.after))}</small></div><div class="actions">${profileUid ? `<button class="button small ghost" data-audit-user-uid="${escapeHtml(profileUid)}" type="button" title="Открыть профиль связанного пользователя">Профиль</button>` : ''}<a class="button small ghost" href="../../admin/index.html#audit" target="_blank" rel="noopener" title="Открыть старый модуль аудита для расширенной сверки">Старый журнал</a></div></article>`;
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
  else body = `<div class="data-list ops-list">${items.map((row) => `<article class="list-row ops-row"><div><strong>${escapeHtml(opsTypeLabel(row.type))}</strong><small><code>${escapeHtml(row.type || 'event')}</code> · ${escapeHtml(row.sourceLabel || OPS_SOURCE_LABELS[row.source] || 'Источник')} · ${escapeHtml(dateTime(row.timestampMs))}</small><small>UID: <code>${escapeHtml(row.uid || '—')}</code>${row.name ? ` · ${escapeHtml(row.name)}` : ''}${row.status ? ` · статус: ${escapeHtml(operationalStateLabel(row.status))} <code>${escapeHtml(row.status)}</code>` : ''}</small><small>Детали: ${escapeHtml(opsDetailsSummary(row.details))}</small></div><div class="actions"><span class="badge ${row.source === 'admin' ? 'success' : row.source === 'error_report' ? 'warning' : 'danger'}">${escapeHtml(OPS_SOURCE_LABELS[row.source] || row.source || 'Источник')}</span></div></article>`).join('')}</div>`;
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
        return `<article class="support-message"><header><div><strong>${escapeHtml(item.subject || '(без темы)')}</strong><small>${escapeHtml(item.fromName || '')} &lt;${escapeHtml(item.fromEmail || 'неизвестный отправитель')}&gt; · ${escapeHtml(when)}</small></div><div class="actions"><span class="badge">${escapeHtml(mailCategoryLabel(item.mailCategory))}</span><span class="badge ${badgeClass(status)}">${escapeHtml(statusName(status))}</span>${gateState ? `<span class="badge ${gateState === 'delivery_unknown' ? 'danger' : ''}">${escapeHtml(operationalStateLabel(gateState))}</span>` : ''}</div></header><div class="support-body">${escapeHtml(String(item.bodyText || '').slice(0, 8000)) || '<span class="muted">Пустое тело письма</span>'}</div>${status !== 'archived' ? `<div class="field section"><label for="support-reply-${messageId}">Ответ</label><textarea id="support-reply-${messageId}" class="support-reply" placeholder="Введите ответ или сгенерируйте черновик">${escapeHtml(item.draftReply || '')}</textarea></div><div class="actions section"><button class="button small" data-action="generate-support-reply" data-message-id="${messageId}" type="button"${state.authorized && !state.busy && !pending ? '' : ' disabled'}>Сгенерировать</button><button class="button small primary" data-action="prepare-support-reply" data-message-id="${messageId}" type="button"${state.authorized && !state.busy && !pending && status === 'new' && gateState !== 'delivery_unknown' && gateState !== 'dispatching' ? '' : ' disabled'} title="Сначала будет показан точный текст с подписью">Подготовить отправку</button></div>` : ''}${gateState === 'delivery_unknown' ? `<div class="notice danger section">Gmail мог принять письмо, но подтверждение потеряно. Автоматический повтор заблокирован; владелец должен проверить папку «Отправленные».</div><div class="actions section"><button class="button small" data-action="resolve-support-reply" data-operation-id="${escapeHtml(item.replyGate?.operationId || '')}" data-resolution="accepted" type="button"${['owner', 'admin'].includes(state.adminRole) && !state.busy ? '' : ' disabled'}>В отправленных: да</button><button class="button small" data-action="resolve-support-reply" data-operation-id="${escapeHtml(item.replyGate?.operationId || '')}" data-resolution="verified_not_sent" type="button"${['owner', 'admin'].includes(state.adminRole) && !state.busy ? '' : ' disabled'}>В отправленных: нет</button></div>` : ''}<div class="actions section"><button class="button ghost small" data-action="set-support-status" data-message-id="${messageId}" data-status="${status === 'archived' ? 'new' : 'archived'}" type="button"${state.authorized && !state.busy && !pending ? '' : ' disabled'}>${status === 'archived' ? 'Вернуть в новые' : 'В архив'}</button></div></article>`;
      }).join('')}</div>`}</div></section>
      <section class="card"><div class="card-header"><div><h2>${pending ? (pendingIsBatch ? 'Подтверждение пакета' : 'Подтверждение отправки') : 'Подпись'}</h2><p>${pending ? (pendingIsBatch ? 'Проверьте состав запечатанного пакета.' : 'Проверьте точного получателя и итоговый текст.') : 'Добавляется сервером после текста ответа.'}</p></div></div><div class="card-body">${pending ? (pendingIsBatch ? `<div class="confirmation-panel"><dl><dt>Писем</dt><dd>${Number(pending.count || 0)}</dd><dt>Пакет</dt><dd><code>${escapeHtml(pending.batchId || '')}</code></dd><dt>Манифест</dt><dd><code>${escapeHtml(pending.manifestHash || '')}</code></dd><dt>До</dt><dd>${escapeHtml(pending.confirmationExpiresAt ? new Date(pending.confirmationExpiresAt).toLocaleString('ru-RU') : '')}</dd><dt>Состояние</dt><dd><span class="badge ${pending.state === 'attention_required' ? 'danger' : ''}">${escapeHtml(operationalStateLabel(pending.state || 'prepared'))}</span></dd></dl><div class="batch-preview section">${(Array.isArray(pending.items) ? pending.items : []).map((item, index) => `<details${index < 2 ? ' open' : ''}><summary>${index + 1}. ${escapeHtml(item.payload?.to || '')} — ${escapeHtml(item.payload?.subject || '')}</summary><div class="support-body confirmation-text">${escapeHtml(item.payload?.finalText || '')}</div></details>`).join('')}</div><div class="notice section">Каждое письмо имеет отдельную защищённую операцию. При частичном сбое пакет продолжит только ещё не начатые операции и никогда автоматически не повторит неопределённую доставку.</div><div class="actions end section"><button class="button" data-action="cancel-support-reply-batch" type="button"${state.busy || pending.state !== 'prepared' ? ' disabled' : ''}>Отменить пакет</button><button class="button primary" data-action="dispatch-support-reply-batch" type="button"${state.busy || !['prepared', 'dispatching', 'attention_required'].includes(pending.state) ? ' disabled' : ''}>Подтвердить пакет</button></div></div>` : `<div class="confirmation-panel"><dl><dt>Кому</dt><dd>${escapeHtml(pending.payload?.to || '')}</dd><dt>Тема</dt><dd>${escapeHtml(pending.payload?.subject || '')}</dd><dt>Операция</dt><dd><code>${escapeHtml(pending.operationId || '')}</code></dd><dt>До</dt><dd>${escapeHtml(pending.confirmationExpiresAt ? new Date(pending.confirmationExpiresAt).toLocaleString('ru-RU') : '')}</dd><dt>Состояние</dt><dd><span class="badge ${pending.state === 'delivery_unknown' ? 'danger' : ''}">${escapeHtml(operationalStateLabel(pending.state || 'prepared'))}</span></dd></dl><div class="support-body confirmation-text">${escapeHtml(pending.payload?.finalText || '')}</div><div class="notice section">После подтверждения этот запечатанный текст уже не изменяется. Повторный клик не создаст вторую SMTP-отправку.</div><div class="actions end section"><button class="button" data-action="cancel-support-reply" type="button"${state.busy ? ' disabled' : ''}>Отменить</button><button class="button primary" data-action="dispatch-support-reply" type="button"${state.busy || pending.state !== 'prepared' ? ' disabled' : ''}>Подтвердить и отправить</button></div></div>`) : `<div class="field"><label for="support-signature">Подпись поддержки</label><textarea id="support-signature" maxlength="2000" placeholder="С уважением, команда Phraseman">${escapeHtml(state.support.signature || '')}</textarea></div><div class="hint">Ревизия подписи: ${Number(state.support.signatureRevision || 0)}</div><div class="actions end section"><button class="button primary" data-action="save-support-signature" type="button"${state.authorized && !state.busy ? '' : ' disabled'}>Сохранить подпись</button></div><div class="notice section">Одиночная и пакетная отправка защищены неизменяемыми операциями, явным предпросмотром и блокировкой автоматического повтора при неопределённом ответе Gmail.</div><a class="button section" href="../../admin/index.html#gmail-support" target="_blank" rel="noopener">Открыть прежний модуль</a>`}</div></section></div>`;
}

function renderDetailedAnalyticsWorkspace() {
  return `<section id="product-analytics-panel" class="card section" aria-labelledby="product-analytics-title">
    <div class="card-header analytics-detail-header"><div><h2 id="product-analytics-title">Экраны, сессии и уроки</h2><p>Детальная диагностика только по событиям пользователей, разрешивших аналитику. Установка приложения не равна уникальному человеку.</p></div><div class="analytics-detail-controls"><label for="product-analytics-range">Период</label><select id="product-analytics-range" title="За какой период показать события продукта"><option value="7">7 дней</option><option value="28" selected>28 дней</option><option value="90">90 дней</option></select><label for="product-analytics-platform">Платформа</label><select id="product-analytics-platform" title="Показывать все платформы или только одну"><option value="all">Все платформы</option><option value="ios">iOS</option><option value="android">Android</option></select><button class="button" type="button" onclick="loadProductAnalytics(true)" title="Обновить детальную аналитику продукта">Обновить данные</button></div></div>
    <div class="notice warning">Ранние шаги до согласия на аналитику не отправляются. Последний наблюдаемый экран не доказывает закрытие или удаление приложения.</div>
    <div id="product-analytics-status" class="analytics-detail-status" role="status">Данные загрузятся после проверки доступа.</div>
    <div id="product-analytics-summary" class="an2-grid"><article class="an2-card"><div class="an2-kicker">Установки приложения</div><div class="an2-value" data-pa="instances">—</div><div class="an2-note">Не гарантированно уникальные люди.</div></article><article class="an2-card"><div class="an2-kicker">Сессии</div><div class="an2-value" data-pa="sessions">—</div></article><article class="an2-card"><div class="an2-kicker">Показы экранов</div><div class="an2-value" data-pa="views">—</div></article><article class="an2-card"><div class="an2-kicker">Нераспознанные экраны</div><div class="an2-value" data-pa="unknown">—</div></article></div>
    <section id="product-analytics-sessions" class="analytics-detail-block"><h3>Сессии использования приложения</h3><div class="reports-empty">Ожидаем данные…</div></section>
    <section class="analytics-detail-block"><h3>Последние наблюдаемые экраны</h3><div id="product-analytics-screens" class="table-scroll"><div class="reports-empty">Ожидаем данные…</div></div></section>
    <section class="analytics-detail-block"><h3>Завершение уроков и явные выходы</h3><div id="product-analytics-lessons" class="table-scroll"><div class="reports-empty">Ожидаем данные…</div></div></section>
    <section class="analytics-detail-block"><h3>На каких фразах возникают трудности</h3><div id="product-analytics-learning-dropoff"><div class="reports-empty">Ожидаем данные…</div></div></section>
    <section class="analytics-detail-block"><h3>Путь от показа оплаты до покупки</h3><div id="product-analytics-conversion"><div class="reports-empty">Ожидаем данные…</div></div></section>
    <section class="analytics-detail-block"><h3>Возврат на следующий, 7-й и 28-й день</h3><div id="product-analytics-retention"><div class="reports-empty">Ожидаем данные…</div></div></section>
    <section class="analytics-detail-block"><h3>Полнота и качество данных</h3><div id="product-analytics-quality" class="reports-empty">Ожидаем данные…</div></section>
  </section>
  <section id="subscription-analytics-panel" class="card section" aria-labelledby="subscription-analytics-title">
    <div class="card-header analytics-detail-header"><div><h2 id="subscription-analytics-title">Подписки и платежные события</h2><p>Серверные события RevenueCat: покупки, продления, отключения продления, окончание доступа, проблемы со списанием и возвраты.</p></div><div class="analytics-detail-controls"><label for="subscription-analytics-range">Период</label><select id="subscription-analytics-range" title="За какой период показать серверные события"><option value="7">7 дней</option><option value="28" selected>28 дней</option><option value="90">90 дней</option></select><label for="subscription-analytics-store">Магазин</label><select id="subscription-analytics-store" title="Показывать все магазины или только один"><option value="all">Все магазины</option><option value="APP_STORE">App Store</option><option value="PLAY_STORE">Google Play</option><option value="STRIPE">Stripe</option></select><button class="button" type="button" onclick="loadSubscriptionAnalytics(true)" title="Обновить серверные события подписок">Обновить данные</button></div></div>
    <div id="subscription-analytics-status" class="analytics-detail-status" role="status">Данные загрузятся после проверки доступа.</div>
    <div id="subscription-analytics-content"><div class="reports-empty">Ожидаем серверные данные RevenueCat…</div></div>
  </section>`;
}

function renderAnalytics() {
  const summary = renderAdminAnalytics({
    ...state.analytics,
    rangeDays: state.analytics.snapshot?.rangeDays ?? 28,
    authorized: can('money.read'),
    controlsDisabled: Boolean(disabledWhenUnauthorized('money.read')),
    busy: state.busy,
  });
  return `${summary}${can('money.read') ? renderDetailedAnalyticsWorkspace() : ''}`;
}

function renderAssetStudio() {
  if (!can('content.read')) return `${pageHeader(PAGES['asset-studio'], 'Контент / Студия изображений')}<div class="notice warning">У вашей роли нет разрешения content.read.</div>`;
  const items = state.assetStudio.items || [];
  const selected = items.find((item) => String(item.id) === String(state.assetStudio.selectedJobId)) || items[0] || null;
  const headerAction = `<div class="actions"><button class="button" data-action="load-asset-jobs" type="button"${disabledWhenUnauthorized('content.read')} title="Загрузить последние задания генерации ассетов">Обновить очередь</button><a class="button" href="../../admin/index.html#openai-budget" target="_blank" rel="noopener" title="Архивная сверка бюджета и старых OpenAI настроек">Старый бюджет</a></div>`;
  const rows = items.length ? items.map((job) => `<article class="list-row asset-job-row"><div><strong>${escapeHtml(job.title || 'Задание на изображение')}</strong><small><code>${escapeHtml(job.id)}</code> · ${escapeHtml(assetKindLabel(job.kind || 'generic'))} · ${escapeHtml(dateTime(job.updatedAtMs || job.createdAtMs))}</small><small>${escapeHtml(job.targetPath || 'путь сохранения не указан')} ${job.slotKey ? `· ключ места: ${escapeHtml(job.slotKey)}` : ''}</small>${job.error ? `<small class="source-error">${escapeHtml(job.error)}</small>` : ''}</div><div class="actions"><span class="badge ${badgeClass(job.status)}">${escapeHtml(statusLabel(job.status))}</span><button class="button small" data-select-asset-job="${escapeHtml(job.id)}" type="button" title="Открыть предпросмотр задания">Открыть</button>${['draft', 'failed'].includes(String(job.status)) ? `<button class="button small primary" data-action="run-asset-job" data-asset-job-id="${escapeHtml(job.id)}" type="button"${disabledWhenUnauthorized('content.draft.write')} title="Запустить серверную генерацию изображений по этому черновику">Сгенерировать</button>` : ''}</div></article>`).join('') : emptyState('Создайте первое задание на изображение или обновите очередь.');
  const previews = selected?.results?.length ? `<div class="asset-preview-grid">${selected.results.map((result, index) => `<a class="asset-preview" href="${escapeHtml(result.previewUrl || '#')}" target="_blank" rel="noopener"><span>Вариант ${index + 1}</span>${result.previewUrl ? `<img src="${escapeHtml(result.previewUrl)}" alt="Предпросмотр созданного изображения ${index + 1}" loading="lazy">` : `<code>${escapeHtml(result.gsPath || '')}</code>`}</a>`).join('')}</div>` : emptyState('После генерации здесь появятся безопасные ссылки на изображения из хранилища.');
  return `${pageHeader(PAGES['asset-studio'], 'Контент / Студия изображений', headerAction)}
    <div class="notice">Создание → проверка → публикация. Ключ генератора остаётся на сервере; в браузере создаётся только безопасное задание. Публикация в ресурсы приложения выполняется отдельно после проверки, чтобы не добавить лишние файлы.</div>
    <div class="columns section">
      <section class="card"><div class="card-header"><div><h2>Новое задание на изображение</h2><p>Сформируйте черновик генерации: тип, место использования, путь сохранения и описание.</p></div></div><div class="card-body">
        <div class="fields">
          <div class="field"><label for="asset-kind">Тип изображения</label><select id="asset-kind"><option value="generic">Обычное изображение</option><option value="onboarding_icon">Значок первого запуска</option><option value="quiz_level_card">Карточка уровня квиза</option><option value="background">Фон</option></select></div>
          <div class="field"><label for="asset-count">Количество вариантов</label><input id="asset-count" type="number" min="1" max="4" value="1"></div>
          <div class="field"><label for="asset-title">Название</label><input id="asset-title" maxlength="120" placeholder="Например: Карточка «Кино», лёгкий уровень"></div>
          <div class="field"><label for="asset-slot">Ключ места использования</label><input id="asset-slot" maxlength="120" placeholder="quiz-card-easy-cinema"></div>
          <div class="field full"><label for="asset-target">Путь сохранения</label><input id="asset-target" maxlength="240" placeholder="assets/images/quizzes/level_cards/quiz-card-easy-cinema.webp"></div>
          <div class="field"><label for="asset-quality">Качество</label><select id="asset-quality"><option value="low">Низкое — быстрый черновик</option><option value="medium">Среднее — рабочий вариант</option><option value="high">Высокое — финальный вариант</option></select></div>
          <div class="field"><label for="asset-size">Размер</label><select id="asset-size"><option value="1024x1024">1024×1024</option></select></div>
          <div class="field full"><label for="asset-prompt">Описание изображения</label><textarea id="asset-prompt" maxlength="4000" placeholder="Опишите изображение, укажите отсутствие надписей, качество для приложения и прозрачный фон, если он нужен."></textarea></div>
        </div>
        <div class="actions end section"><button class="button primary" data-action="create-asset-job" type="button"${disabledWhenUnauthorized('content.draft.write')} title="Создать черновик задания без запуска генератора">Создать черновик</button></div>
      </div></section>
      <section class="card"><div class="card-header"><div><h2>Предпросмотр и результаты</h2><p>Сначала проверьте варианты, потом отдельно публикуйте в ресурсы приложения.</p></div></div><div class="card-body">${selected ? `<div class="notice"><strong>${escapeHtml(selected.title)}</strong><br><code>${escapeHtml(selected.targetPath || 'путь сохранения не указан')}</code></div>${previews}` : previews}</div></section>
    </div>
    <section class="card section"><div class="card-header"><div><h2>Очередь генераций</h2><p>Последние серверные задания с записью в журнале действий и результатами в хранилище.</p></div></div><div class="card-body">${state.assetStudio.error ? `<div class="notice danger">${escapeHtml(state.assetStudio.error)}</div>` : ''}<div class="data-list">${rows}</div></div></section>`;
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
  return `<div class="briefing-idea-list">${items.slice(0, 3).map((idea) => `<article><strong>${escapeHtml(idea.title || '(без заголовка)')}</strong><p>${escapeHtml(idea.description || idea.benefit || 'Без описания.')}</p><small>${escapeHtml(idea.category || 'Другая категория')}${idea.userName ? ` · ${escapeHtml(idea.userName)}` : ''}</small></article>`).join('')}</div>`;
}

function renderBriefingHealth(health) {
  return `<div class="briefing-health">${health.length ? health.map((source) => `<div><strong>${escapeHtml(SOURCE_LABELS[source.source] || SOURCE_LABELS[source.collection] || 'Неизвестный источник')}</strong><span class="badge ${source.state === 'error' ? 'danger' : source.state === 'truncated' ? 'warning' : source.state === 'ready' ? 'success' : ''}">${escapeHtml(operationalStateLabel(source.state || 'unknown'))}</span><small>${Number(source.count || 0)} записей${source.error ? ` · ${escapeHtml(source.error)}` : ''}</small></div>`).join('') : emptyState('Старый документ не содержит диагностику источников.')}</div>`;
}

function renderDailyBriefing() {
  if (!can('briefing.read')) return `${pageHeader(PAGES['daily-briefing'], 'Обзор / Брифинг')}<div class="notice warning">У вашей роли нет разрешения briefing.read.</div>`;
  const digest = state.briefing.digest;
  const facts = digest?.facts || {};
  const health = Array.isArray(digest?.sourceHealth) ? digest.sourceHealth : [];
  const stateLabel = ({ ready: 'Полная', partial: 'Неполная', stale: 'Устарела', legacy: 'Старый формат', empty: 'Нет данных', loading: 'Загрузка' })[state.briefing.state] || state.briefing.state;
  const headerAction = `<div class="actions"><a class="button" href="#overview" title="Вернуться в обзор">К обзору</a><button class="button" data-action="load-daily-briefing" type="button"${disabledWhenUnauthorized('briefing.read')} title="Загрузить последнюю сохранённую сводку без запуска генерации">Обновить</button><button class="button primary" data-action="generate-daily-briefing" type="button"${disabledWhenUnauthorized('briefing.generate')} title="Собрать свежий утренний отчёт за последние 24 часа">Сформировать отчёт</button></div>`;
  return `${pageHeader(PAGES['daily-briefing'], 'Обзор / Утренний отчёт руководителя', headerAction)}
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
    ${!digest ? `<section class="card section">${state.briefing.state === 'loading' ? '<div class="profile-loading" role="status" aria-live="polite"><span class="loading-bar"></span><span>Загружаю сохранённый утренний отчёт…</span></div>' : emptyState('Загрузите последний отчёт или сформируйте новый.')}</section>` : `
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

function operationalStateLabel(value) {
  return ({
    idle: 'Не загружено', loading: 'Загрузка', ready: 'Готово', empty: 'Нет данных', partial: 'Загружено частично',
    truncated: 'Достигнут лимит загрузки', error: 'Ошибка', draft: 'Черновик', prepared: 'Подготовлено',
    dispatching: 'Отправляется', attention_required: 'Нужна ручная проверка', delivery_unknown: 'Результат отправки неизвестен',
    accepted: 'Принято почтовым сервисом', cancelled: 'Отменено', archived: 'В архиве', active: 'Активно',
  })[String(value)] || 'Неизвестное состояние';
}

function audienceLabel(value) {
  return ({ all: 'Все пользователи', free: 'Пользователи без Plus', premium: 'Пользователи Plus' })[String(value)] || 'Неизвестная аудитория';
}

function mailCategoryLabel(value) {
  return ({ user: 'Письмо пользователя', system: 'Системное письмо', support: 'Обращение в поддержку', error_report: 'Сообщение об ошибке' })[String(value)] || 'Категория не определена';
}

function contextFieldLabel(value) {
  return ({ screen: 'Экран', feature: 'Функция', platform: 'Платформа', appVersion: 'Версия приложения', buildNumber: 'Номер сборки', locale: 'Язык приложения', studyTarget: 'Изучаемый язык', device: 'Устройство', osVersion: 'Версия системы' })[String(value)] || 'Дополнительные сведения';
}

function assetKindLabel(value) {
  return ({ generic: 'Обычное изображение', onboarding_icon: 'Значок первого запуска', quiz_level_card: 'Карточка уровня квиза', background: 'Фон' })[String(value)] || 'Другой тип изображения';
}

function platformLabel(value) {
  return ({ ios: 'только iOS', android: 'только Android', 'ios+android': 'iOS и Android', all: 'все платформы', '': 'iOS и Android' })[String(value)] || 'неизвестная платформа';
}

function identityReasonLabel(value) {
  return ({ requested: 'Профиль запрошен администратором', stable_link: 'Найдена устойчивая связь аккаунта', provider_link: 'Найдена связь со способом входа', direct: 'Профиль найден напрямую' })[String(value)] || 'Источник связи аккаунта не определён';
}

function reportToneClass(lane) {
  if (lane === 'answered') return 'answered';
  if (lane === 'resolved') return 'resolved';
  if (lane === 'escalated') return 'escalated';
  if (lane === 'open') return 'open';
  return 'neutral';
}

function reportSortKey(item) {
  const laneOrder = state.adminSettings.showAnsweredBelowOpen ? { escalated: 0, open: 1, answered: 2, resolved: 3 } : { escalated: 0, open: 1, answered: 1, resolved: 2 };
  if (state.adminSettings.reportGrouping === 'source') return `${item.source || 'zz'}:${laneOrder[item.lane] ?? 9}:${9999999999999 - Number(item.createdAtMs || 0)}`;
  if (state.adminSettings.reportGrouping === 'time') return `${9999999999999 - Number(item.createdAtMs || 0)}`;
  return `${laneOrder[item.lane] ?? 9}:${item.source || 'zz'}:${9999999999999 - Number(item.createdAtMs || 0)}`;
}

function renderReportQueue() {
  const reports = state.reports;
  const items = (Array.isArray(reports.items) ? [...reports.items] : []).sort((left, right) => reportSortKey(left).localeCompare(reportSortKey(right)));
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
      <div class="report-auto-refresh" role="status" aria-live="polite"><span class="badge ${reports.state === 'loading' ? 'warning' : 'success'}">${reports.state === 'loading' ? 'Обновляется…' : 'Автообновление включено'}</span><button class="button small ghost" data-action="load-report-queue" type="button"${disabledWhenUnauthorized('reports.read')} title="Обновить очередь вручную">Обновить сейчас</button></div>
    </div></div></section>
    ${health.length ? `<section class="report-health section" aria-label="Состояние источников">${health.map((source) => `<span class="badge ${source.state === 'error' ? 'danger' : source.state === 'truncated' ? 'warning' : source.state === 'ready' ? 'success' : ''}" title="${escapeHtml(source.error || '')}">${escapeHtml(REPORT_SOURCE_LABELS[source.source] || 'Неизвестный источник')} · ${escapeHtml(operationalStateLabel(source.state))} · ${Number(source.count || 0)}</span>`).join('')}</section>` : ''}
    <section class="card section"><div class="card-header"><div><h2>Рабочая очередь</h2><p>${reports.state === 'idle' ? 'Выберите фильтры и загрузите данные.' : `Показано ${items.length} записей.`}</p></div><span class="badge ${badgeClass(reports.state)}">${escapeHtml(operationalStateLabel(reports.state))}</span></div><div class="card-body">
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
        return `<article class="report-card tone-${reportToneClass(item.lane)}" data-report-lane="${escapeHtml(item.lane)}"><header><div><div class="report-source">${escapeHtml(REPORT_SOURCE_LABELS[item.source] || 'Неизвестный источник')} · <code>${escapeHtml(item.id)}</code></div><h3>${escapeHtml(item.summary || '(без описания)')}</h3><small>${escapeHtml(item.category || context.feature || context.screen || 'без категории')} · ${escapeHtml(dateTime(item.createdAtMs))}</small></div><div class="actions"><span class="badge">Ключ источника: <code>${escapeHtml(item.source)}</code></span><span class="badge">Исходный статус: ${escapeHtml(item.rawStatus)}</span><span class="badge ${item.lane === 'resolved' || item.lane === 'answered' ? 'success' : item.lane === 'escalated' ? 'danger' : 'warning'}">${escapeHtml(REPORT_LANE_LABELS[item.lane] || 'Неизвестное состояние')}</span></div></header>
          ${userButtons ? `<div class="actions report-users">${userButtons}</div>` : ''}
          <div class="report-context">${Object.entries(context).filter(([, value]) => value).map(([key, value]) => `<span><b>${escapeHtml(contextFieldLabel(key))}:</b> ${escapeHtml(value)}</span>`).join('')}</div>
          ${canChange(item) && transitions.length ? `<div class="report-status-controls"><div class="field"><label for="${escapeHtml(reasonId)}">Причина изменения статуса</label><input id="${escapeHtml(reasonId)}" maxlength="500"${state.adminSettings.requireReasonForStatus ? ' required' : ''} placeholder="Что проверено и почему меняется статус"></div><div class="actions">${transitions.map((next) => `<button class="button small" data-report-source="${escapeHtml(item.source)}" data-report-id="${escapeHtml(item.id)}" data-report-current-status="${escapeHtml(item.rawStatus)}" data-report-next-status="${escapeHtml(next)}" data-report-reason-id="${escapeHtml(reasonId)}" type="button" title="Изменить статус с обязательным аудитом">${escapeHtml(reportStatusLabel(next))}</button>`).join('')}</div></div>` : ''}
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
  const renderers = { overview: renderOverview, 'control-panel': renderControlPanel, application: renderApplication, campaigns: renderCampaigns, users: renderUsers, money: renderMoney, content: renderContent, community: renderCommunity, diagnostics: renderDiagnostics, support: renderSupport, analytics: renderAnalytics, 'daily-briefing': renderDailyBriefing, 'report-center': renderReportQueue, 'asset-studio': renderAssetStudio, 'admin-settings': renderAdminSettings };
  const capability = capabilityById(state.selectedCapabilityId);
  if (capability && capability.route === state.route && !capability.nativeRoute) {
    target.innerHTML = renderCapabilityWorkspace(capability);
  } else {
    const page = (renderers[state.route] ?? renderOverview)();
    target.innerHTML = `${page}${ADMIN_SECTIONS.some((section) => section.route === state.route) ? renderCapabilityHub(state.route) : ''}`;
  }
  target.querySelectorAll('a[href^="../../admin/index.html"]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    link.setAttribute('href', href.replace('../../admin/index.html', '/legacy.html'));
  });
  renderNavigation();
  ensureInteractiveGuidance(document);
  renderAuthStatus();
  setMessage(state.message, state.messageKind);
  scheduleAdminAutoRefresh();
  if (state.route === 'analytics' && state.authorized) {
    queueMicrotask(() => {
      globalThis.loadProductAnalytics?.();
      globalThis.loadSubscriptionAnalytics?.();
    });
  }
}

function ensureInteractiveGuidance(root) {
  root.querySelectorAll('button, a').forEach((element) => {
    if (element.hasAttribute('title') || element.hasAttribute('data-tooltip') || element.hasAttribute('aria-label')) return;
    const label = String(element.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!label) return;
    const specific = specificGuidanceForControl({
      action: element.getAttribute('data-action'),
      href: element.getAttribute('href'),
      supportFilter: element.getAttribute('data-support-filter'),
      resolution: element.getAttribute('data-resolution'),
      status: element.getAttribute('data-status'),
      factoryStep: element.getAttribute('data-factory-step'),
      className: element.className,
    });
    if (specific) {
      element.setAttribute('title', specific);
      return;
    }
    const prefix = element instanceof HTMLAnchorElement ? 'Открыть' : 'Выполнить действие';
    element.setAttribute('title', `${prefix}: ${label}`);
  });
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
  if (!surfaces.length) throw new Error('Выберите хотя бы одну группу контента.');
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
  if (!reason) throw new Error('Укажите причину изменения Бесплатный / Plus доступа.');
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
    'Условие остановки: восстановить значения из истории Remote Config или собрать новый preview с прежними лимитами.',
  ];
  return { nextConfig, reason, changes, source: 'premium-access', title: 'Предпросмотр Бесплатный / Plus доступа', summary, details };
}

function buildReleaseMaintenancePreview() {
  if (!state.remoteConfig?.config) throw new Error('Сначала загрузите текущую конфигурацию.');
  const rolloutRaw = readTextInput('release-force-rollout', 8);
  let rollout = 100;
  if (rolloutRaw !== '') {
    rollout = Math.round(Number(rolloutRaw));
    if (!Number.isFinite(rollout) || rollout < 0 || rollout > 100) throw new Error('Процент обязательного обновления должен быть числом 0–100.');
  }
  const minVersion = readTextInput('release-force-version', 40);
  const targetBuild = readTextInput('release-manual-target', 40);
  requireSemverish(minVersion, 'Минимальная версия');
  requireSemverish(targetBuild, 'Целевая сборка или версия');
  const forceEnabled = readReleaseMaintenanceBoolean('release-force-enabled');
  const manualEnabled = readReleaseMaintenanceBoolean('release-manual-enabled');
  const manualCampaign = readTextInput('release-manual-campaign', 80);
  if (manualEnabled && !/^[A-Za-z0-9_.:-]{3,80}$/.test(manualCampaign)) throw new Error('Ручное обновление: код кампании должен содержать 3–80 символов: A-Z, 0-9, _, ., :, -.');
  const manualPlatform = ['ios', 'android'].includes(String(document.getElementById('release-manual-platform')?.value ?? '')) ? String(document.getElementById('release-manual-platform')?.value ?? '') : '';
  const maintenanceBanner = readReleaseMaintenanceBoolean('release-maint-banner');
  const maintenanceBlock = readReleaseMaintenanceBoolean('release-maint-block');
  const maintenanceEnabled = maintenanceBanner || maintenanceBlock;
  const maintenanceCampaign = readTextInput('release-maint-campaign', 80);
  if (maintenanceEnabled && !/^[A-Za-z0-9_.:-]{3,80}$/.test(maintenanceCampaign)) throw new Error('Код кампании технических работ должен содержать 3–80 символов: A-Z, 0-9, _, ., :, -.');
  const iosUrl = readTextInput('release-store-ios', 400);
  const androidUrl = readTextInput('release-store-android', 400);
  if (forceEnabled && !minVersion) throw new Error('Force update: укажите минимальную версию.');
  if (forceEnabled) requireAnyStoreUrl('', iosUrl, androidUrl);
  const manualTitle = readTextInput('release-manual-title-ru', 160);
  const manualBody = readTextInput('release-manual-body-ru', 500);
  const manualCta = readTextInput('release-manual-cta-ru', 80);
  if (manualEnabled && !targetBuild) throw new Error('Ручное обновление: укажите целевую сборку или версию.');
  if (manualEnabled) requireAnyStoreUrl(manualPlatform, iosUrl, androidUrl);
  if (manualEnabled && (!manualTitle || !manualBody || !manualCta)) throw new Error('Ручное обновление: заполните русский заголовок, текст и кнопку.');
  const maintenanceTextRu = readTextInput('release-maint-text-ru', 500);
  if (maintenanceEnabled && !maintenanceTextRu) throw new Error('Заполните русский текст технических работ.');
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
  if (maintenanceBlock) changes.unshift('Внимание: полная блокировка технических работ может сделать приложение недоступным.');
  if (nextConfig.bools.force_update_enabled) changes.unshift(`Внимание: обязательное обновление охватит ${rollout}% пользователей устаревших сборок.`);
  const summary = [
    forceEnabled ? `Обязательное обновление: минимальная версия ${minVersion}; охват ${rollout}%.` : 'Обязательное обновление выключено.',
    manualEnabled ? `Окно обновления: кампания ${manualCampaign}, сборка ${targetBuild}, платформа ${manualPlatform || 'все'}.` : 'Окно ручного обновления выключено.',
    maintenanceEnabled ? `Технические работы: ${maintenanceBlock ? 'полная блокировка' : 'баннер'}, кампания ${maintenanceCampaign}.` : 'Режим технических работ выключен.',
  ].join(' ');
  const details = [
    `Аудитория обязательного обновления: iOS и Android; охват ${rollout}%; минимальная версия ${minVersion || 'не задана'}.`,
    `Аудитория предложения обновиться: ${manualEnabled ? (manualPlatform ? `только ${manualPlatform}` : 'iOS и Android') : 'выключена'}.`,
    `Аудитория технических работ: ${maintenanceEnabled ? 'iOS и Android' : 'выключен'}.`,
    `Ссылки магазинов: iOS ${iosUrl || 'не задана'}; Android ${androidUrl || 'не задана'}.`,
    `Manual modal: ${manualEnabled ? (nextConfig.texts.manual_update_mode === 'force' ? 'нельзя закрыть' : 'можно закрыть') : 'выключена'}.`,
    `Коды кампаний: предложение обновиться — ${manualCampaign || 'не задан'}; технические работы — ${maintenanceCampaign || 'не задан'}.`,
    `RU title: ${manualTitle || '—'}`,
    `RU body: ${manualBody || '—'}`,
    `RU CTA: ${manualCta || '—'}`,
    `Условие остановки: нажать «Быстрый стоп» и опубликовать проверяемый предпросмотр, либо восстановить значения из истории.`,
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
    summary: 'Выключает обязательное обновление, предложение обновиться, баннер и полную блокировку технических работ через проверяемую публикацию.',
    details: [
      'Аудитория: все пользователи, на которых сейчас действуют настройки обновления и технических работ.',
      'Ссылки магазинов: не меняются.',
      'Предложение обновиться: выключается.',
      'Условие остановки: публикация этого предпросмотра сбрасывает опасные флаги; значения можно частично восстановить из истории.',
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
  if (!translations.ru.title || !translations.ru.body) throw new Error('Заполните тему и текст на русском языке.');
  if (kind === 'poll' && (!translations.ru.pollQuestion || translations.ru.pollOptions.length < 2)) throw new Error('Для опроса заполните вопрос на русском и минимум два варианта.');
  const reason = readTextInput('app-message-reason', 500);
  if (!reason) throw new Error('Укажите причину публикации сообщения.');
  const payload = { kind, active, audience, priority, ttlDays, translations };
  const summary = `${kind === 'poll' ? 'Опрос' : 'Сообщение'} · ${active ? 'сразу активно' : 'черновик'} · ${audienceLabel(audience)} · ${ttlDays} дней.`;
  const details = [
    `Тема на русском: ${translations.ru.title}`,
    `Текст на русском: ${translations.ru.body}`,
    `Аудитория: ${audienceLabel(audience)}; приоритет ${priority}.`,
    `Срок: ${ttlDays} дней; после истечения клиент перестанет показывать сообщение.`,
    kind === 'poll' ? `Опрос: ${translations.ru.pollQuestion}; вариантов ${translations.ru.pollOptions.length}.` : 'Опрос: нет.',
    `Переводы: ${APP_MESSAGE_LANGUAGES.filter((language) => translations[language.key].title || language.key === 'ru').map((language) => language.label).join(', ')}; пустые значения наследуют RU.`,
    active ? 'Условие остановки: выключить сообщение в истории с обязательной причиной.' : 'Черновик не виден пользователям до отдельного включения.',
  ];
  return { payload, reason, summary, details };
}

function sameAppMessagePayload(left, right) {
  return JSON.stringify(left || {}) === JSON.stringify(right || {});
}

function buildPromoBannerPreview() {
  if (!state.remoteConfig?.config) throw new Error('Сначала загрузите текущую конфигурацию.');
  const enabled = readReleaseMaintenanceBoolean('promo-banner-enabled');
  const campaignId = readTextInput('promo-banner-campaign', 80);
  if (enabled && !/^[A-Za-z0-9_.:-]{3,80}$/.test(campaignId)) throw new Error('Код кампании промо-баннера: 3–80 символов — латинские буквы, цифры, подчёркивание, точка, двоеточие или дефис.');
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
    summary: enabled ? `Баннер включён: кампания ${campaignId}, ${audienceLabel(audience)}, ${platformLabel(platform)}, срок ${expiry}.` : 'Баннер будет выключен; тексты кампании сохранятся для истории и повторного использования.',
    details: [
      `Аудитория промо-баннера: ${audienceLabel(audience)}; платформа: ${platformLabel(platform)}.`,
      `Код кампании: ${campaignId || 'не задан'}.`,
      `Ссылка по нажатию: ${url || 'баннер без ссылки'}.`,
      `Срок показа: ${expiry}.`,
      'Закрытие: пользователь может закрыть баннер; выбор хранится отдельно для каждого кода кампании.',
      'Условие остановки: подготовить «Выключить баннер» и опубликовать проверяемый предпросмотр.',
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
    summary: 'Баннер будет скрыт у всех пользователей. Тексты, ссылка, срок и кампания ID не изменятся.',
    details: [
      'Аудитория промо-баннера: все пользователи, которым баннер виден сейчас.',
      'Условие остановки: публикация этого предпросмотра выключает только показ промо-баннера.',
      'Восстановление: вернуть прежнее значение из истории удалённой конфигурации.',
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
  setMessage('Поля изменились после предпросмотра. Я обновил предпросмотр — проверьте его и нажмите публикацию ещё раз.', 'warning');
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
  setMessage('Поля изменились после предпросмотра. Я обновил предпросмотр — проверьте его и нажмите публикацию ещё раз.', 'warning');
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
  if (bools.force_update_enabled === true) risks.push('обязательное обновление потребует от пользователей старых версий установить обновление');
  if (bools.maintenance_block === true) risks.push('полная блокировка технических работ может закрыть доступ к приложению');
  if (preview?.source === 'premium-access') risks.push('настройки бесплатного и Plus-доступа меняют монетизацию и доступ к урокам');
  if (preview?.source === 'promo-banner') risks.push('промо-баннер изменится для выбранной массовой аудитории');
  if (!risks.length) return `Опубликовать ${preview.changes.length} изменений конфигурации?`;
  return `Опубликовать ${preview.changes.length} изменений рабочей конфигурации?\n\nРиск: ${risks.join('; ')}.\n\nПроверьте аудиторию, ссылки магазинов и код кампании и условие остановки перед подтверждением.`;
}

async function runGeneration() {
  const units = [...(state.detail?.units ?? [])].filter((unit) => unit.state !== 'succeeded' && (unit.state !== 'failed' || unit.retryable === true));
  if (!units.length) return;
  state.generation = { total: units.length, done: 0, failed: 0, errors: [] };
  renderCurrentPage();
  let cursor = 0;
  const worker = async () => {
    while (cursor < units.length) {
      const unit = units[cursor++];
      try {
        await actions.runFactoryUnit({ jobId: state.selectedJobId, surface: unit.surface, lessonId: Number(unit.lessonId) });
      } catch (error) {
        state.generation.failed += 1;
        state.generation.errors.push(`Урок ${Number(unit.lessonId)}, ${SURFACE_LABELS[unit.surface] ?? unit.surface}: ${errorMessage(error)}`);
      } finally {
        state.generation.done += 1;
        renderCurrentPage();
      }
    }
  };
  await Promise.all([worker(), worker()]);
  await loadJobDetail(state.selectedJobId);
}

async function retryFactoryUnit(unitId) {
  const unit = (state.detail?.units ?? []).find((item) => String(item.id ?? item.unitId) === String(unitId));
  if (!unit) throw new Error('Операция генерации не найдена.');
  if (unit.retryable !== true) throw new Error('Эта ошибка требует изменить входные данные, а не повторять тот же запрос.');
  try {
    await actions.runFactoryUnit({ jobId: state.selectedJobId, surface: unit.surface, lessonId: Number(unit.lessonId) });
  } finally {
    await loadJobDetail(state.selectedJobId);
  }
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
  const requestId = ++reportRequestId;
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
    if (!authStillValid(authGeneration, 'reports.read') || requestId !== reportRequestId) return STALE_AUTH_RESULT;
    state.reports = {
      ...state.reports,
      state: String(result?.state || 'ready'),
      items: append ? [...new Map([...state.reports.items, ...(Array.isArray(result?.items) ? result.items : [])].map((item) => [`${item.source}:${item.id}`, item])).values()] : Array.isArray(result?.items) ? result.items : [],
      sourceHealth: Array.isArray(result?.sourceHealth) ? result.sourceHealth : [],
      nextCursor: String(result?.nextCursor || ''),
      error: '',
    };
  } catch (error) {
    if (!authStillValid(authGeneration, 'reports.read') || requestId !== reportRequestId) return STALE_AUTH_RESULT;
    if (authStillValid(authGeneration, 'reports.read')) {
      state.reports = { ...state.reports, state: 'error', error: errorMessage(error) };
    }
    throw error;
  }
}

function scheduleAdminAutoRefresh() {
  globalThis.clearTimeout(adminAutoRefreshTimer);
  const seconds = Number(state.adminSettings.autoRefreshSeconds || 0);
  if (!seconds || state.busy || state.route !== 'report-center' || !state.authorized || !can('reports.read')) return;
  adminAutoRefreshTimer = globalThis.setTimeout(() => {
    if (state.busy || state.route !== 'report-center' || !can('reports.read')) return;
    void loadReportQueue(false).catch((error) => {
      setMessage(`Автообновление репортов не удалось: ${errorMessage(error)}`, 'warning');
      renderCurrentPage();
    });
  }, seconds * 1000);
}

function assertFactoryWorkspaceCoverage(workspace, input) {
  const registries = Array.isArray(workspace?.sourceRegistries) ? workspace.sourceRegistries : [];
  const registry = registries.find((item) => String(item.id || `${item.blueprintId}:${item.version}`) === input.blueprintVersion);
  if (!registry) throw new Error(`Учебный шаблон ${input.blueprintVersion} не найден.`);
  const lessons = registry.lessons && typeof registry.lessons === 'object' ? registry.lessons : {};
  const missingLessonIds = input.lessonIds.filter((lessonId) => !Object.prototype.hasOwnProperty.call(lessons, String(lessonId)));
  if (missingLessonIds.length) throw new Error(`Шаблон не содержит уроки: ${missingLessonIds.join(', ')}.`);
  return { registry, missingLessonIds };
}

function buildOnboardingStepsPreview() {
  if (!state.remoteConfig?.config) throw new Error('Сначала загрузите текущую конфигурацию.');
  const reason = readTextInput('onboarding-steps-reason', 500);
  if (!reason) throw new Error('Укажите причину изменения экранов онбординга.');
  const selected = new Set([...document.querySelectorAll('[data-onboarding-step]:checked')].map((input) => input.dataset.onboardingStep));
  selected.add('name');
  const enabled = ONBOARDING_STEP_CATALOG.map(([id]) => id).filter((id) => selected.has(id));
  const current = state.remoteConfig.config;
  const nextConfig = {
    bools: { ...(current.bools || {}) },
    numbers: { ...(current.numbers || {}) },
    texts: { ...(current.texts || {}), [ONBOARDING_ENABLED_STEPS_KEY]: JSON.stringify(enabled) },
  };
  const version = Number(current.version);
  if (Number.isInteger(version) && version > 0) nextConfig.version = version;
  return { nextConfig, reason, changes: remoteConfigChanges(nextConfig), source: 'onboarding-steps', title: 'Предпросмотр экранов онбординга' };
}

function readReportFilters() {
  return {
    source: String(document.getElementById('report-source-filter')?.value || 'all'),
    lane: String(document.getElementById('report-lane-filter')?.value || ''),
    rawStatus: String(document.getElementById('report-raw-status-filter')?.value || '').trim().toLowerCase(),
    uid: String(document.getElementById('report-uid-filter')?.value || '').trim(),
    category: String(document.getElementById('report-category-filter')?.value || '').trim().toLowerCase(),
    sinceDays: Number(document.getElementById('report-days-filter')?.value || 7),
  };
}

async function applyReportFiltersAndLoad() {
  if (!state.authorized || !can('reports.read') || state.route !== 'report-center') return;
  state.reports = { ...state.reports, ...readReportFilters(), nextCursor: '' };
  try {
    await loadReportQueue(false);
  } catch (error) {
    setMessage(`Не удалось обновить очередь: ${errorMessage(error)}`, 'danger');
    renderCurrentPage();
  }
}

function handleReportFilterChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) || !target.id.startsWith('report-') || !target.id.endsWith('-filter')) return;
  globalThis.clearTimeout(reportFilterTimer);
  void applyReportFiltersAndLoad();
}

function handleReportFilterInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.id.startsWith('report-') || !target.id.endsWith('-filter')) return;
  globalThis.clearTimeout(reportFilterTimer);
  reportFilterTimer = globalThis.setTimeout(() => void applyReportFiltersAndLoad(), 450);
}

function parseAdminSettingValue(target) {
  if (target instanceof HTMLInputElement && target.type === 'checkbox') return target.checked;
  if (target instanceof HTMLInputElement && target.type === 'color') return target.value;
  if (target instanceof HTMLSelectElement && ['autoRefreshSeconds', 'defaultSinceDays'].includes(String(target.dataset.adminSetting))) return Number(target.value);
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement ? target.value : '';
}

function handleAdminSettingsChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  const key = String(target.dataset.adminSetting || '');
  if (!key) return;
  state.adminSettings = normalizeAdminUiSettings({ ...state.adminSettings, [key]: parseAdminSettingValue(target) });
  applyAdminUiSettings(state.adminSettings);
  if (key.startsWith('default') || key === 'hideArchivedByDefault') state.reports = { ...defaultReportState(state.adminSettings), replyDrafts: state.reports.replyDrafts };
  renderCurrentPage();
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
  if (state.adminSettings.requireReasonForStatus && !reason) return setMessage('Укажите причину изменения статуса.', 'warning');
  if (!globalThis.confirm(`Изменить статус «${reportStatusLabel(expectedStatus)}» на «${reportStatusLabel(nextStatus)}»?`)) return;
  const authGeneration = state.authGeneration;
  const requiredPermission = source === 'app_errors' ? 'diagnostics.status.write' : 'reports.status.write';
  return runBusy(async () => {
    await actions.updateReportStatus({
      source,
      reportId,
      expectedStatus,
      nextStatus,
      reason: reason || 'Причина не указана администратором.',
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
  const reason = readTextInput('app-message-toggle-reason', 500);
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

async function handleAction(action, target) {
  if (!actions) return;
  if (action === 'sign-in') return actions.signIn();
  if (action === 'sign-out') return actions.signOut();
  if (!state.authorized) return setMessage('Сначала войдите с ролью администратора.', 'warning');
  if (action === 'load-app-messages') return runBusy(loadAppMessages, 'Сообщения загружены.');
  if (action === 'preview-app-message') {
    try { state.campaigns.preview = buildAppMessagePreview(); setMessage('Предпросмотр сообщения готов.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
    renderCurrentPage();
    return;
  }
  if (action === 'discard-app-message-preview') { state.campaigns.preview = null; renderCurrentPage(); return; }
  if (action === 'publish-app-message') {
    const preview = state.campaigns.preview;
    if (!preview?.payload) return setMessage('Сначала соберите предпросмотр сообщения.', 'warning');
    let current;
    try { current = buildAppMessagePreview(); } catch (error) { setMessage(errorMessage(error), 'warning'); return; }
    if (!sameAppMessagePayload(current.payload, preview.payload) || current.reason !== preview.reason) {
      state.campaigns.preview = current;
      setMessage('Форма изменилась после предпросмотра. Проверьте обновлённый предпросмотр и опубликуйте ещё раз.', 'warning');
      renderCurrentPage();
      return;
    }
    if (!globalThis.confirm(`Создать ${preview.payload.kind === 'poll' ? 'опрос' : 'сообщение'}?\n\n${preview.summary}\n\nПричина: ${preview.reason}`)) return;
    return runBusy(async () => {
      await actions.createAppMessage({ ...preview.payload, reason: preview.reason, idempotencyKey: id('app-message-create'), requestId: id('request-app-message-create') });
      state.campaigns.preview = null;
      await loadAppMessages();
    }, preview.payload.active ? 'Сообщение опубликовано и активно.' : 'Черновик сообщения создан.');
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
    if (!preview?.payload) return setMessage('Сначала соберите предпросмотр промокодов.', 'warning');
    let current;
    try { current = buildPromoPreview(preview.oneTime); } catch (error) { setMessage(errorMessage(error), 'warning'); return; }
    if (!samePromoPayload(current.payload, preview.payload)) {
      setMessage('Форма промокодов изменилась после предпросмотра. Соберите preview заново.', 'warning');
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
  if (action === 'save-admin-settings') {
    state.adminSettings = saveAdminUiSettings(state.adminSettings);
    applyAdminUiSettings(state.adminSettings);
    state.reports = { ...state.reports, source: state.reports.source || state.adminSettings.defaultSource, lane: state.reports.lane || state.adminSettings.defaultLane, sinceDays: Number(state.reports.sinceDays || state.adminSettings.defaultSinceDays) };
    setMessage('Настройки админки сохранены в этом браузере.', 'success');
    renderCurrentPage();
    return;
  }
  if (action === 'reset-admin-settings') {
    if (!globalThis.confirm('Сбросить личные настройки Admin v2 к стандартному виду?')) return;
    try { globalThis.localStorage?.removeItem(ADMIN_V2_SETTINGS_STORAGE_KEY); } catch {}
    state.adminSettings = normalizeAdminUiSettings({});
    state.reports = defaultReportState(state.adminSettings);
    applyAdminUiSettings(state.adminSettings);
    setMessage('Настройки админки сброшены.', 'success');
    renderCurrentPage();
    return;
  }
  if (action === 'load-report-queue') {
    state.reports = { ...state.reports, ...readReportFilters(), nextCursor: '' };
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
  if (action === 'preview-onboarding-steps') {
    try { state.remoteConfigPreview = buildOnboardingStepsPreview(); setMessage('Предпросмотр экранов онбординга готов.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
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
    try { state.remoteConfigPreview = buildPremiumAccessPreview(); setMessage('Предпросмотр Бесплатный / Plus доступа готов.', 'success'); } catch (error) { setMessage(errorMessage(error), 'warning'); }
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
    return runBusy(async () => {
      const workspace = await actions.getFactoryWorkspace({ studyTarget: input.studyTarget, learnerSourceLocale: input.sourceLocale, limit: 100 });
      assertFactoryWorkspaceCoverage(workspace, input);
      const result = await actions.createFactoryJob(input);
      await loadJobs(result.jobId);
      state.factoryStep = 2;
    }, 'Черновик создан. Публикация не выполнялась.');
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
      else setMessage(`Операция не отправлена: ${operationalStateLabel(result?.state)}.`, 'warning');
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
    if (!input.prompt) return setMessage('Введите промпт для генератор изображений задание на изображение.', 'warning');
    return runBusy(async () => {
      const result = await actions.createAssetJob(input);
      const job = result?.job || null;
      if (job?.id) state.assetStudio.selectedJobId = String(job.id);
      await loadAssetJobs();
    }, 'Черновик задание на изображение создан.');
  }
  if (action === 'run-asset-job') {
    const jobId = String(target.getAttribute('data-asset-job-id') || state.assetStudio.selectedJobId || '').trim();
    if (!jobId) return setMessage('Выберите задание на изображение для генерации.', 'warning');
    if (!globalThis.confirm('Запустить генератор изображений генерацию на сервере? Это потратит OpenAI бюджет.')) return;
    return runBusy(async () => {
      const result = await actions.runAssetJob({ jobId });
      if (result?.job?.id) state.assetStudio.selectedJobId = String(result.job.id);
      await loadAssetJobs();
    }, 'Изображение создано и сохранено в хранилище.');
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
  const settingsTarget = target.getAttribute('data-settings-target');
  if (settingsTarget) {
    const panel = document.getElementById(settingsTarget);
    panel?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    panel?.focus?.({ preventScroll: true });
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
  const retryUnitId = target.getAttribute('data-retry-factory-unit');
  if (retryUnitId) return runBusy(() => retryFactoryUnit(retryUnitId), 'Операция повторена. Проверьте новый статус.');
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
    state.reports = defaultReportState(state.adminSettings);
    state.audit = { state: 'idle', items: [], action: '', query: '', sinceDays: 7, nextCursor: '', fetchedAtMs: 0, error: '' };
    state.ops = { state: 'idle', items: [], sourceHealth: [], kpis: null, source: '', type: '', query: '', copyText: '', fetchedAtMs: 0, error: '' };
    state.assetStudio = { state: 'idle', items: [], selectedJobId: '', error: '' };
    state.promo = { state: 'idle', codes: [], redemptions: [], generatedCodes: [], preview: null, error: '' };
    state.campaigns = { state: 'idle', items: [], preview: null, error: '' };
  }
  if (!state.authorized || !can('users.read')) {
    state.users = { query: '', searched: false, items: [], profile: null, profileLoading: false, searchState: 'idle', searchErrors: [] };
  }
  if (!state.authorized || !can('briefing.read')) state.briefing = { state: 'idle', digest: null, fetchedAtMs: 0, error: '', generationOutcome: '' };
  if (!state.authorized || !can('reports.read')) state.reports = defaultReportState(state.adminSettings);
  if (!state.authorized || !can('money.read')) state.analytics = { status: 'idle', snapshot: null, error: '' };
  if (!state.authorized || !can('diagnostics.read')) state.audit = { state: 'idle', items: [], action: '', query: '', sinceDays: 7, nextCursor: '', fetchedAtMs: 0, error: '' };
  if (!state.authorized || !can('diagnostics.read')) state.ops = { state: 'idle', items: [], sourceHealth: [], kpis: null, source: '', type: '', query: '', copyText: '', fetchedAtMs: 0, error: '' };
  if (!state.authorized || !can('content.read')) state.assetStudio = { state: 'idle', items: [], selectedJobId: '', error: '' };
  if (!state.authorized || !can('money.read')) state.promo = { state: 'idle', codes: [], redemptions: [], generatedCodes: [], preview: null, error: '' };
  if (!state.authorized || !can('campaigns.read')) state.campaigns = { state: 'idle', items: [], preview: null, error: '' };
  renderCurrentPage();
  maybeLoadOperationalBriefing();
}

export function renderRoute(route, capabilityId = '') {
  const requestedRoute = route === 'overview' && !globalThis.location.hash && PAGES[state.adminSettings.startPage] ? state.adminSettings.startPage : route;
  state.route = PAGES[requestedRoute] ? requestedRoute : 'overview';
  const capability = capabilityById(capabilityId);
  state.selectedCapabilityId = capability?.route === state.route && !capability.nativeRoute ? capability.id : '';
  renderCurrentPage();
  maybeLoadOperationalBriefing();
}

export function initAdminUi() {
  if (initialized) return;
  initialized = true;
  applyAdminUiSettings(state.adminSettings);
  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleReportFilterChange);
  document.addEventListener('change', handleAdminSettingsChange);
  document.addEventListener('input', handleReportFilterInput);
  document.addEventListener('input', handleAdminSettingsChange);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.id === 'user-search') {
      event.preventDefault();
      document.querySelector('[data-action="search-admin-users"]')?.click();
    }
  });
  document.getElementById('mobile-nav-toggle')?.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  renderCurrentPage();
}

export function reportInitializationError(error) {
  state.authReady = true;
  setMessage(`Не удалось запустить админку: ${errorMessage(error)}`, 'danger');
  renderCurrentPage();
}
