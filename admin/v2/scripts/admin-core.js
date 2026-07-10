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
  application: { title: 'Приложение', description: 'Обновления, баннеры, технические работы и конфигурация приложения.' },
  users: { title: 'Пользователи', description: 'Единый поиск, профиль, обращения, покупки и история действий пользователя.' },
  money: { title: 'Деньги', description: 'Подписки, платежи, промокоды и подтверждённые показатели выручки.' },
  content: { title: 'Контент', description: 'Уроки, языковые пакеты и безопасная фабрика новых языков.' },
  community: { title: 'Комьюнити', description: 'Жалобы, пользовательский контент, чат и состояние Арены.' },
  diagnostics: { title: 'Диагностика', description: 'Состояние системы, ошибки, журнал действий и восстановление.' },
  support: { title: 'Почта поддержки', description: 'Входящие письма людей и системные сообщения с явной категорией, без скрытой потери.' },
  analytics: { title: 'Аналитика', description: 'Серверные показатели с отдельным состоянием каждого источника.' },
});

const ADMIN_ROLE_PERMISSIONS = Object.freeze({
  owner: new Set(['content.read', 'content.draft.write', 'content.publish']),
  admin: new Set(['content.read', 'content.draft.write', 'content.publish']),
  content_editor: new Set(['content.read', 'content.draft.write']),
  analyst: new Set(['content.read']),
  developer: new Set(['content.read']),
  support: new Set(),
  moderator: new Set(),
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
  support: { loaded: false, items: [] },
  analytics: null,
  budget: null,
};

let actions = null;
let initialized = false;

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

function can(permission) {
  return state.authorized && (ADMIN_ROLE_PERMISSIONS[state.adminRole]?.has(permission) ?? false);
}

function disabledWhenUnauthorized(permission = '') {
  return state.authorized && !state.busy && (!permission || can(permission)) ? '' : ' disabled';
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

function renderOverview() {
  return `${pageHeader(PAGES.overview, 'Управление сегодня', '<button class="button primary" data-route="diagnostics" type="button" title="Открыть диагностику">Проверить состояние</button>')}
    <div class="notice warning">Сводка не показывает «всё хорошо», пока серверные источники не загружены. Пустое, устаревшее и ошибочное состояния отображаются отдельно.</div>
    <section class="metrics section">
      ${['Критические сигналы', 'Контент на проверке', 'Открытые обращения', 'Последнее изменение'].map((label) => `<article class="card metric"><label>${label}</label><strong>—</strong><span class="badge">Не загружено</span></article>`).join('')}
    </section>
    <div class="columns section"><section class="card"><div class="card-header"><div><h2>Требует решения</h2><p>Сюда попадут только действия с понятным владельцем и причиной.</p></div></div>${emptyState('После подключения источников здесь появятся приоритеты.')}</section>
    <section class="card"><div class="card-header"><div><h2>Быстрые переходы</h2><p>Частые рабочие задачи.</p></div></div><div class="card-body actions"><a class="button" href="#support">Почта</a><a class="button" href="#content">Фабрика языков</a><a class="button" href="#analytics">Аналитика</a></div></section></div>`;
}

function renderApplication() {
  return `${pageHeader(PAGES.application, 'Приложение')}
    <div class="notice">Опасные изменения проходят путь: предпросмотр → подтверждение → запись в журнал → возможность отката.</div>
    <section class="metrics section">
      <article class="card metric"><label>Версия конфигурации</label><strong>—</strong><span class="badge">Не загружено</span></article>
      <article class="card metric"><label>Активное обновление</label><strong>—</strong><span class="badge">Не загружено</span></article>
      <article class="card metric"><label>Технические работы</label><strong>—</strong><span class="badge">Не загружено</span></article>
      <article class="card metric"><label>Баннеры</label><strong>—</strong><span class="badge">Не загружено</span></article>
    </section>
    <section class="card section"><div class="card-header"><div><h2>Центр изменений приложения</h2><p>Пока перенос продолжается, полный набор действий остаётся доступен в текущей админке.</p></div><a class="button primary" href="../../admin/index.html#updates" title="Открыть рабочие настройки приложения">Открыть текущие настройки</a></div></section>`;
}

function renderUsers() {
  return `${pageHeader(PAGES.users, 'Пользователи', '<a class="button primary" href="../../admin/index.html#users" title="Открыть рабочий поиск пользователей">Найти пользователя</a>')}
    <section class="card"><div class="card-body"><div class="fields"><div class="field"><label for="user-search">Почта, имя или идентификатор</label><input id="user-search" type="search" placeholder="Введите данные пользователя" disabled></div><div class="field"><label for="user-state">Состояние</label><select id="user-state" disabled><option>Все пользователи</option></select></div></div><p class="hint">Нативный объединённый профиль переносится следующим этапом. Текущий поиск не удалён и открывается кнопкой сверху.</p></div></section>
    <div class="columns section"><section class="card"><div class="card-header"><div><h2>Обращения</h2><p>Письма людей, ответы и история.</p></div><a class="button" href="#support">Открыть почту</a></div>${emptyState('Загрузите почту поддержки.')}</section><section class="card"><div class="card-header"><div><h2>Профиль пользователя</h2><p>Доступ, покупки и события на одной временной шкале.</p></div></div>${emptyState('Выберите пользователя.')}</section></div>`;
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

function renderDiagnostics() {
  const budget = state.budget;
  return `${pageHeader(PAGES.diagnostics, 'Диагностика', '<a class="button" href="./migration.html" title="Открыть полный реестр переноса функций">Реестр переноса</a>')}
    <div class="notice warning">Состояние системы не помечается как исправное без свежего ответа каждого источника.</div>
    <section class="metrics section">${['API', 'Ошибки', 'Неудачные задания', 'Операции отката'].map((label) => `<article class="card metric"><label>${label}</label><strong>—</strong><span class="badge">Не загружено</span></article>`).join('')}</section>
    <div class="columns section"><section class="card"><div class="card-header"><div><h2>Бюджет генерации</h2><p>Только чтение серверных коллекций расходов.</p></div><button class="button primary" data-action="load-openai-budget" type="button"${disabledWhenUnauthorized()}>Загрузить</button></div><div class="card-body">${budget ? `<pre class="code-preview">${escapeHtml(JSON.stringify(budget, null, 2))}</pre>` : '<p class="hint">Данные не загружены.</p>'}</div></section>
    <section class="card"><div class="card-header"><div><h2>Журнал действий</h2><p>Причина, исполнитель, состояние до и после.</p></div><a class="button" href="../../admin/index.html#audit-log">Открыть текущий журнал</a></div>${emptyState('Нативная временная шкала переносится следующим этапом.')}</section></div>`;
}

function renderSupport() {
  const items = state.support.items;
  return `${pageHeader(PAGES.support, 'Пользователи / Почта', '<a class="button" href="../../admin/index.html#gmail-support" title="Открыть полный рабочий процесс ответов">Полный процесс ответов</a>')}
    <section class="card"><div class="card-header"><div><h2>Входящие</h2><p>Письма людей не скрываются системным фильтром; категория показывается отдельно.</p></div><div class="actions"><button class="button" data-action="load-support" type="button"${disabledWhenUnauthorized()}>Обновить список</button><button class="button primary" data-action="pull-support" type="button"${disabledWhenUnauthorized()}>Проверить Gmail</button></div></div>
      <div class="card-body">${!state.support.loaded ? emptyState('Загрузите входящие после авторизации.') : !items.length ? emptyState('Новых писем нет.') : `<div class="data-list">${items.map((item) => `<div class="list-row"><div><strong>${escapeHtml(item.subject || '(без темы)')}</strong><small>${escapeHtml(item.fromEmail || 'Неизвестный отправитель')} · ${escapeHtml(item.receivedAtIso || '')}</small></div><div class="actions"><span class="badge">${escapeHtml(item.mailCategory || 'не определено')}</span><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status || 'новое')}</span></div></div>`).join('')}</div>`}</div>
    </section>`;
}

function renderAnalytics() {
  const snapshot = state.analytics;
  return `${pageHeader(PAGES.analytics, 'Деньги / Аналитика')}
    <section class="card"><div class="card-header"><div><h2>Снимок показателей</h2><p>Период и полнота источников фиксируются в ответе.</p></div><div class="actions"><label for="analytics-range" class="muted">Период</label><select id="analytics-range"><option value="7">7 дней</option><option value="28" selected>28 дней</option><option value="90">90 дней</option></select><button class="button primary" data-action="load-analytics" type="button"${disabledWhenUnauthorized()}>Загрузить</button></div></div>
      <div class="card-body">${snapshot ? `<pre class="code-preview">${escapeHtml(JSON.stringify(snapshot, null, 2))}</pre>` : emptyState('Выберите период и загрузите серверный снимок.')}</div></section>`;
}

function renderCurrentPage() {
  const target = document.getElementById('app');
  if (!target) return;
  const renderers = { overview: renderOverview, application: renderApplication, users: renderUsers, money: renderMoney, content: renderContent, community: renderCommunity, diagnostics: renderDiagnostics, support: renderSupport, analytics: renderAnalytics };
  target.innerHTML = (renderers[state.route] ?? renderOverview)();
  renderNavigation();
  renderAuthStatus();
  setMessage(state.message, state.messageKind);
}

async function runBusy(operation, successMessage = '') {
  if (state.busy) return null;
  state.busy = true;
  renderCurrentPage();
  try {
    const result = await operation();
    if (successMessage) setMessage(successMessage, 'success');
    return result;
  } catch (error) {
    setMessage(`Ошибка: ${errorMessage(error)}`, 'danger');
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

async function handleAction(action, target) {
  if (!actions) return;
  if (action === 'sign-in') return actions.signIn();
  if (action === 'sign-out') return actions.signOut();
  if (!state.authorized) return setMessage('Сначала войдите с ролью администратора.', 'warning');
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
  if (action === 'load-support') return runBusy(async () => { const result = await actions.loadSupport({ limit: 500 }); state.support = { loaded: true, items: Array.isArray(result?.items) ? result.items : [] }; }, 'Входящие загружены.');
  if (action === 'pull-support') return runBusy(async () => { const result = await actions.pullSupport({}); const list = await actions.loadSupport({ limit: 500 }); state.support = { loaded: true, items: Array.isArray(list?.items) ? list.items : [] }; setMessage(`Почта проверена: найдено ${Number(result?.fetched ?? 0)}, сохранено ${Number(result?.saved ?? 0)}.`, 'success'); });
  if (action === 'load-analytics') {
    const rangeDays = Number(document.getElementById('analytics-range')?.value ?? 28);
    return runBusy(async () => { state.analytics = await actions.loadAnalytics({ rangeDays }); }, 'Аналитика загружена.');
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
  const unitId = target.getAttribute('data-preview-unit');
  if (unitId) return runBusy(async () => { state.preview = await actions.previewFactoryUnit({ unitId }); state.factoryStep = 3; }, 'Предпросмотр проверен и загружен.');
  const action = target.getAttribute('data-action');
  if (action) await handleAction(action, target);
}

export function setAdminActions(nextActions) {
  actions = nextActions;
}

export function setAuthState(auth) {
  state.authReady = true;
  state.authorized = auth.authorized === true;
  state.adminEmail = String(auth.email ?? '');
  state.adminRole = String(auth.role ?? '');
  if (!state.authorized) {
    state.detail = null;
    state.preview = null;
  }
  renderCurrentPage();
}

export function renderRoute(route) {
  state.route = PAGES[route] ? route : 'overview';
  renderCurrentPage();
}

export function initAdminUi() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('click', handleClick);
  document.getElementById('mobile-nav-toggle')?.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  renderCurrentPage();
}

export function reportInitializationError(error) {
  state.authReady = true;
  setMessage(`Не удалось запустить админку: ${errorMessage(error)}`, 'danger');
  renderCurrentPage();
}
