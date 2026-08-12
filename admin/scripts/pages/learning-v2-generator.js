import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js';

const COURSE_STAGES = Object.freeze([
  { kind: 'learning_v2_research', title: 'Исследование', description: 'Методика, источники и требования к реальному обучению с нуля.' },
  { kind: 'learning_v2_curriculum', title: 'Программа Pre-A1 → C2', description: 'Уровни, навыки, повторение и последовательность роста сложности.' },
  { kind: 'learning_v2_lesson_outline', title: 'Карта курса', description: 'Секторы, интро, уроки, практики, экзамены и контрольные точки.' },
  { kind: 'learning_v2_localized_course', title: 'Полный учебный контент', description: 'Объяснения, задания, подсказки и проверки сразу на 8 языках.' },
  { kind: 'learning_v2_audio', title: 'Аудиопакеты', description: 'Каждая фраза в голосах Ash, Onyx, Nova и Coral.' },
  { kind: 'learning_v2_quality_assurance', title: 'Проверка качества', description: 'Педагогика, языки, доступность, зависимости и целостность курса.' },
  { kind: 'learning_v2_release', title: 'Кандидат в релиз', description: 'Финальный пакет. Публикация возможна только после вашего решения.' },
]);

const COURSE_LOCALES = Object.freeze(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
const APP_CHECK_SITE_KEY = '6LfteFAtAAAAAKa9jvjgCAeZjnN8je2BZZJlf2OR';
const localHost = /^(127\.0\.0\.1|localhost)$/i.test(location.hostname);
const visualMode = localHost && new URLSearchParams(location.search).get('live') !== '1';
const WAVE_LABELS = Object.freeze({ e1: 'E1', chapter_1: 'E1–E8', season: 'E1–E32' });
const state = { stages: [], preview: null, previewStage: null, reviewMode: null, locale: 'ru', busy: false, functions: null, auth: null };

const byId = (id) => document.getElementById(id);
const authScreen = byId('auth-screen');
const studio = byId('studio');
const statusEl = byId('studio-status');
const nextButton = byId('next-stage-button');

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function setStatus(message, tone = '') {
  statusEl.textContent = message;
  statusEl.className = `studio-status${tone ? ` is-${tone}` : ''}`;
}

function setBusy(busy) {
  state.busy = busy;
  nextButton.disabled = busy;
  byId('refresh-button').disabled = busy;
  byId('course-target').disabled = busy;
}

function courseInput() {
  const studyTarget = String(byId('course-target').value || 'en');
  return {
    requestId: String(byId('course-request').value || '').trim(),
    studyTarget,
    sourceLocale: 'multi',
    cefr: 'PRE_A1',
    objective: String(byId('course-objective').value || '').trim(),
    scopeId: `course-${studyTarget}`,
    count: 1,
  };
}

function latestByKind(kind) {
  return state.stages.filter((stage) => stage.kind === kind).sort((a, b) => Number(b.revision || 0) - Number(a.revision || 0))[0] || null;
}

function approvedByKind(kind) {
  return state.stages.filter((stage) => stage.kind === kind && stage.state === 'approved').sort((a, b) => Number(b.revision || 0) - Number(a.revision || 0))[0] || null;
}

function waveApprovalId(stage) {
  return stage?.kind === 'learning_v2_localized_course' && stage?.state === 'paused' && stage?.learningV2PauseReason === 'owner_wave_approval_required' &&
    Object.prototype.hasOwnProperty.call(WAVE_LABELS, stage?.learningV2RequiredWaveApproval)
    ? stage.learningV2RequiredWaveApproval
    : null;
}

function waveLabel(stage) {
  const waveId = waveApprovalId(stage);
  return waveId ? WAVE_LABELS[waveId] : null;
}

function stageStatus(stage) {
  if (!stage) return { label: 'Не создан', className: '', icon: 'clock' };
  const requiredWave = waveLabel(stage);
  if (requiredWave) return { label: `Ждёт одобрения ${requiredWave}`, className: 'review', icon: 'eye' };
  if (stage.kind === 'learning_v2_localized_course' && stage.state === 'paused' && stage.learningV2PauseReason === 'root_manifest_materialization_pending') {
    return { label: 'Сессии готовы, собирается пакет', className: 'running', icon: 'clock' };
  }
  return ({
    queued: { label: 'Готов к запуску', className: 'running', icon: 'play' },
    running: { label: 'Генерируется', className: 'running', icon: 'clock' },
    paused: { label: 'На паузе', className: 'running', icon: 'clock' },
    failed: { label: 'Нужно повторить', className: 'running', icon: 'alert' },
    needs_review: { label: 'Ждёт проверки', className: 'review', icon: 'eye' },
    approved: { label: 'Одобрено', className: 'approved', icon: 'check' },
    rejected: { label: 'На исправлении', className: 'running', icon: 'refresh' },
    cancelled: { label: 'Отменено', className: '', icon: 'clock' },
    superseded: { label: 'Заменено', className: '', icon: 'clock' },
  })[stage.state] || { label: String(stage.state || 'Неизвестно'), className: '', icon: 'clock' };
}

function nextUnapprovedDefinition() {
  return COURSE_STAGES.find((definition) => !approvedByKind(definition.kind)) || null;
}

function renderWorkflow() {
  const list = byId('stage-list');
  list.replaceChildren();
  const approvedCount = COURSE_STAGES.filter((definition) => approvedByKind(definition.kind)).length;
  byId('progress-label').textContent = `${approvedCount} из ${COURSE_STAGES.length} одобрено`;
  byId('progress-bar').style.width = `${(approvedCount / COURSE_STAGES.length) * 100}%`;

  COURSE_STAGES.forEach((definition, index) => {
    const stage = latestByKind(definition.kind);
    const status = stageStatus(stage);
    const row = document.createElement('article');
    row.className = `stage-row${stage?.state === 'approved' ? ' is-approved' : ''}${stage && stage.state !== 'approved' ? ' is-active' : ''}`;

    const number = document.createElement('div');
    number.className = 'stage-index';
    if (stage?.state === 'approved') number.append(icon('check'));
    else number.textContent = String(index + 1);

    const copy = document.createElement('div');
    copy.className = 'stage-copy';
    const title = document.createElement('strong');
    title.textContent = definition.title;
    const description = document.createElement('span');
    description.textContent = definition.description;
    copy.append(title, description);

    const meta = document.createElement('div');
    meta.className = 'stage-meta';
    const chip = document.createElement('span');
    chip.className = `status-chip ${status.className}`;
    chip.append(icon(status.icon), document.createTextNode(status.label));
    meta.append(chip);

    const requiredWave = waveLabel(stage);
    if (stage && requiredWave) meta.append(stageButton(`Проверить ${requiredWave}`, 'eye', () => previewWave(stage, 1, 1)));
    else if (stage && ['queued', 'failed'].includes(stage.state)) meta.append(stageButton('Запустить', 'play', () => runStage(stage.id)));
    else if (stage && stage.state === 'paused' && stage.learningV2PauseReason !== 'root_manifest_materialization_pending') meta.append(stageButton('Продолжить', 'play', () => runStage(stage.id)));
    if (stage && ['needs_review', 'approved', 'rejected'].includes(stage.state)) meta.append(stageButton('Открыть', 'eye', () => previewStage(stage.id)));
    row.append(number, copy, meta);
    list.append(row);
  });
  renderPrimaryAction();
}

function stageButton(label, iconName, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button-secondary stage-action';
  button.title = `${label}. Изменения не публикуются в приложение автоматически.`;
  button.append(icon(iconName), document.createTextNode(label));
  button.addEventListener('click', action);
  return button;
}

function renderPrimaryAction() {
  const definition = nextUnapprovedDefinition();
  if (!definition) {
    nextButton.textContent = 'Все 7 этапов одобрены';
    nextButton.disabled = true;
    return;
  }
  const stage = latestByKind(definition.kind);
  nextButton.disabled = state.busy || stage?.state === 'running';
  if (!stage || ['rejected', 'cancelled', 'superseded'].includes(stage.state)) nextButton.textContent = stage?.state === 'rejected' ? 'Создать исправленную версию' : `Создать этап «${definition.title}»`;
  else if (waveLabel(stage)) nextButton.textContent = `Проверить и решить по ${waveLabel(stage)}`;
  else if (stage.state === 'paused' && stage.learningV2PauseReason === 'root_manifest_materialization_pending') {
    nextButton.textContent = 'Сессии готовы — ожидается сборка пакета';
    nextButton.disabled = true;
  }
  else if (['queued', 'failed', 'paused'].includes(stage.state)) nextButton.textContent = `Запустить этап «${definition.title}»`;
  else if (stage.state === 'needs_review') nextButton.textContent = `Проверить этап «${definition.title}»`;
  else if (stage.state === 'running') nextButton.textContent = 'Генерация уже идёт';
  else nextButton.textContent = 'Продолжить';
}

function validateInput() {
  const input = courseInput();
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(input.requestId)) throw new Error('Проверьте ID пакета: допустимы буквы, цифры, точка, дефис и подчёркивание.');
  if (input.objective.length < 10 || input.objective.length > 1000) throw new Error('Опишите цель курса понятной фразой.');
  return input;
}

function callable(name) {
  if (!state.functions) throw new Error('Сначала войдите в админку.');
  return httpsCallable(state.functions, name);
}

async function refreshStages() {
  if (state.busy) return;
  let input;
  try { input = validateInput(); } catch (error) { setStatus(error.message, 'error'); return; }
  if (visualMode) {
    renderWorkflow();
    setStatus('Локальный макет: серверные данные не меняются.', 'success');
    return;
  }
  setBusy(true);
  setStatus('Обновляем очередь…');
  try {
    const response = await callable('adminListContentStages')({ requestId: input.requestId, studyTarget: input.studyTarget, sourceLocale: 'multi', scopeId: input.scopeId, limit: 100 });
    state.stages = Array.isArray(response?.data?.stages) ? response.data.stages.filter((stage) => String(stage?.kind || '').startsWith('learning_v2_')) : [];
    renderWorkflow();
    setStatus(state.stages.length ? 'Очередь актуальна.' : 'Курс ещё не начат. Создайте исследование.', state.stages.length ? 'success' : '');
  } catch (error) {
    setStatus(`Не удалось загрузить очередь: ${error?.message || error}`, 'error');
  } finally {
    setBusy(false);
    renderPrimaryAction();
  }
}

async function createNextStage() {
  if (state.busy) return;
  const input = validateInput();
  const index = COURSE_STAGES.findIndex((definition) => !approvedByKind(definition.kind));
  if (index < 0) return;
  const definition = COURSE_STAGES[index];
  const current = latestByKind(definition.kind);
  const prerequisite = index > 0 ? approvedByKind(COURSE_STAGES[index - 1].kind) : null;
  if (index > 0 && !prerequisite) throw new Error('Сначала одобрите предыдущий этап.');
  if (visualMode) {
    setStatus('Это визуальный макет: создание отключено.', 'success');
    return;
  }
  setBusy(true);
  setStatus(`Создаём только этап «${definition.title}»…`);
  try {
    await callable('adminCreateContentStage')({ ...input, kind: definition.kind, revision: current ? Number(current.revision || 1) + 1 : 1, prerequisiteStageIds: prerequisite ? [String(prerequisite.id)] : [] });
    setStatus('Черновик этапа создан. Теперь его можно запустить.', 'success');
  } catch (error) {
    setStatus(`Этап не создан: ${error?.message || error}`, 'error');
  } finally {
    setBusy(false);
    await refreshStages();
  }
}

async function runStage(stageId) {
  if (state.busy) return;
  if (visualMode) { setStatus('Это визуальный макет: генерация отключена.', 'success'); return; }
  setBusy(true);
  setStatus('Запускаем генерацию. Результат останется черновиком…');
  try {
    await callable('adminRunContentStage')({ stageId: String(stageId) });
    setStatus('Генерация запущена. Админку можно закрыть.', 'success');
  } catch (error) {
    setStatus(`Не удалось запустить этап: ${error?.message || error}`, 'error');
  } finally {
    setBusy(false);
    await refreshStages();
  }
}

function samplePreview() {
  const localizedContent = Object.fromEntries(COURSE_LOCALES.map((locale) => [locale, {
    section: 'Глава 1 · Абсолютный старт',
    outcome: 'Ученик понимает базовые приветствия и может представиться.',
    structure: ['Полноценное интро', '3 вопроса на понимание', '12 коротких практических сессий', 'Экзамен сектора'],
  }]));
  return { stage: latestByKind('learning_v2_lesson_outline'), reviewFingerprint: 'visual-only', payload: { result: { localizedContent } } };
}

function sampleLocalized(label) {
  return Object.fromEntries(COURSE_LOCALES.map((locale) => [locale, `${label} · ${locale.toUpperCase()}`]));
}

function sampleWavePreview(sessionOrdinal = 1) {
  const intro = {
    titleByLocale: sampleLocalized('Поздоровайся и представься'),
    summaryByLocale: sampleLocalized('Полноценное объяснение первых приветствий для абсолютного нуля'),
    learningGoalByLocale: sampleLocalized('Узнать приветствие и назвать своё имя'),
    blocks: Array.from({ length: 3 }, (_, index) => ({
      titleByLocale: sampleLocalized(`Блок объяснения ${index + 1}`),
      bodyByLocale: sampleLocalized(`Подробное содержание блока ${index + 1}`),
    })),
    checkQuestions: Array.from({ length: 3 }, (_, index) => ({
      requiredTaskSlot: index + 1,
      promptByLocale: sampleLocalized(`Проверочный вопрос ${index + 1}`),
      choicesByLocale: Object.fromEntries(COURSE_LOCALES.map((locale) => [locale, [`Правильный вариант ${locale}`, `Отвлекающий вариант A ${locale}`, `Отвлекающий вариант B ${locale}`]])),
      correctChoiceIndex: 0,
      explanationByLocale: sampleLocalized(`Объяснение ответа ${index + 1}`),
    })),
  };
  const cards = Array.from({ length: 12 }, (_, index) => ({
    taskSlot: index + 1,
    family: index % 2 === 0 ? 'visual_discovery' : 'listen_choose',
    contentItem: {
      target: { text: index === 0 ? 'Hello!' : `Learning phrase ${index + 1}` },
      learnerMeanings: COURSE_LOCALES.map((locale) => ({ locale, value: `Значение задания ${index + 1} · ${locale}` })),
    },
    instructionByLocale: sampleLocalized(`Инструкция задания ${index + 1}`),
    hintByLocale: sampleLocalized(`Подсказка задания ${index + 1}`),
    errorExplanationByLocale: sampleLocalized(`Объяснение ошибки ${index + 1}`),
  }));
  return {
    schemaVersion: 'learning-v2-course-wave-preview.v1',
    stageId: 'visual-localized-course',
    waveId: 'e1',
    checkpointFingerprint: 'visual-only',
    completedTaskCount: 12,
    firstEpisodeOrdinal: 1,
    lastEpisodeOrdinal: 1,
    episodeOrdinal: 1,
    selectedSessionOrdinal: sessionOrdinal,
    sessions: Array.from({ length: 12 }, (_, index) => ({ sessionOrdinal: index + 1, titleByLocale: sampleLocalized(`Сессия ${index + 1}`) })),
    selectedSession: { intro, cards },
  };
}

async function previewStage(stageId) {
  setStatus('Открываем неизменяемый результат…');
  try {
    const response = visualMode ? { data: samplePreview() } : await callable('adminPreviewContentStage')({ stageId: String(stageId) });
    state.preview = response.data;
    state.previewStage = response.data.stage;
    state.reviewMode = 'stage';
    state.locale = 'ru';
    renderReview();
    openReviewLayer();
    setStatus('Результат открыт для проверки.', 'success');
  } catch (error) {
    setStatus(`Не удалось открыть результат: ${error?.message || error}`, 'error');
  }
}

function openReviewLayer() {
  byId('review-layer').hidden = false;
  document.body.style.overflow = 'hidden';
  byId('review-title').focus?.();
}

async function previewWave(stage, episodeOrdinal, sessionOrdinal) {
  const requiredWave = waveLabel(stage);
  if (!requiredWave) { setStatus('Эта контрольная волна ещё не готова к проверке.', 'error'); return; }
  if (visualMode) {
    state.preview = sampleWavePreview();
    state.previewStage = stage;
    state.reviewMode = 'wave';
    state.locale = 'ru';
    renderReview();
    openReviewLayer();
    setStatus('Локальный макет контрольной проверки. Серверные данные не загружены.', 'success');
    return;
  }
  setBusy(true);
  setStatus(`Проверяем неизменяемые файлы ${requiredWave}…`);
  try {
    const response = await callable('adminPreviewLearningV2CourseWave')({
      stageId: String(stage.id),
      episodeOrdinal: Number(episodeOrdinal),
      sessionOrdinal: Number(sessionOrdinal),
    });
    state.preview = response.data.preview;
    state.previewStage = stage;
    state.reviewMode = 'wave';
    state.locale = 'ru';
    renderReview();
    openReviewLayer();
    setStatus(`Открыта проверка ${requiredWave}. Ничего не опубликовано.`, 'success');
  } catch (error) {
    setStatus(`Не удалось проверить созданные сессии: ${error?.message || error}`, 'error');
  } finally {
    setBusy(false);
    renderPrimaryAction();
  }
}

async function changeWavePreview(episodeOrdinal, sessionOrdinal) {
  if (state.busy || state.reviewMode !== 'wave' || !state.previewStage) return;
  if (visualMode) {
    state.preview = sampleWavePreview(Number(sessionOrdinal));
    renderReview();
    setStatus('Локальный макет выбранной сессии. Серверные данные не загружены.', 'success');
    return;
  }
  const previousLocale = state.locale;
  const stage = state.previewStage;
  setBusy(true);
  byId('wave-previous-episode').disabled = true;
  byId('wave-next-episode').disabled = true;
  byId('wave-session-select').disabled = true;
  setStatus('Открываем выбранную сессию…');
  try {
    const response = await callable('adminPreviewLearningV2CourseWave')({
      stageId: String(stage.id),
      episodeOrdinal: Number(episodeOrdinal),
      sessionOrdinal: Number(sessionOrdinal),
    });
    state.preview = response.data.preview;
    state.locale = previousLocale;
    renderReview();
    setStatus('Сессия проверена по неизменяемому файлу.', 'success');
  } catch (error) {
    setStatus(`Не удалось открыть сессию: ${error?.message || error}`, 'error');
  } finally {
    setBusy(false);
    renderPrimaryAction();
  }
}

function renderReview() {
  if (state.reviewMode === 'wave') renderWaveReview();
  else renderStageReview();
}

function renderStageReview() {
  const payload = state.preview?.payload || {};
  const result = payload.result || {};
  const localized = result.localizedContent?.[state.locale] ?? null;
  const allLocalesReady = COURSE_LOCALES.every((locale) => result.localizedContent?.[locale] != null);
  byId('review-title').textContent = COURSE_STAGES.find((item) => item.kind === state.previewStage?.kind)?.title || 'Результат этапа';
  byId('review-subtitle').textContent = `Версия ${Number(state.previewStage?.revision || 1)} · ${stageStatus(state.previewStage).label}`;
  const summary = byId('review-summary');
  summary.className = `review-summary${allLocalesReady ? '' : ' is-incomplete'}`;
  summary.textContent = allLocalesReady ? 'Все 8 обязательных языков присутствуют в пакете.' : 'Пакет неполный: один или несколько языков отсутствуют. Одобрение недоступно.';
  byId('review-content').textContent = localized == null ? 'Для этого языка результат отсутствует.' : JSON.stringify(localized, null, 2);
  byId('review-json').textContent = JSON.stringify(payload, null, 2);
  byId('review-content').className = 'review-content';
  byId('approve-button').disabled = !allLocalesReady || visualMode;
  byId('reject-button').disabled = visualMode;
  byId('approve-button').textContent = 'Одобрить этап';
  byId('reject-button').textContent = 'Вернуть на исправление';
  byId('review-decision').hidden = state.previewStage?.state !== 'needs_review';
  byId('wave-review-controls').hidden = true;

  const tabs = byId('locale-tabs');
  tabs.replaceChildren();
  COURSE_LOCALES.forEach((locale) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'locale-tab';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(locale === state.locale));
    button.textContent = locale.toUpperCase();
    button.addEventListener('click', () => { state.locale = locale; renderReview(); });
    tabs.append(button);
  });
}

function localizedText(value, locale) {
  return typeof value?.[locale] === 'string' ? value[locale] : 'Текст для этого языка отсутствует.';
}

function appendParagraph(parent, text, className = '') {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  if (className) paragraph.className = className;
  parent.append(paragraph);
}

function renderWaveReview() {
  const preview = state.preview || {};
  const shard = preview.selectedSession || {};
  const requiredWave = WAVE_LABELS[preview.waveId] || String(preview.waveId || 'волны');
  byId('review-title').textContent = `Проверка ${requiredWave}`;
  byId('review-subtitle').textContent = `Эпизод ${Number(preview.episodeOrdinal)} из ${Number(preview.lastEpisodeOrdinal)} · сессия ${Number(preview.selectedSessionOrdinal)} из 12`;
  const summary = byId('review-summary');
  summary.className = 'review-summary';
  summary.textContent = `${Number(preview.completedTaskCount)} сессий созданы и проверены по неизменяемым файлам. Одобрение продолжит генерацию, возврат создаст отдельную исправленную версию.`;
  byId('review-json').textContent = JSON.stringify(preview, null, 2);
  byId('approve-button').disabled = visualMode;
  byId('reject-button').disabled = visualMode;
  byId('approve-button').textContent = `Одобрить ${requiredWave}`;
  byId('reject-button').textContent = `Вернуть ${requiredWave} на исправление`;
  byId('review-decision').hidden = false;

  const controls = byId('wave-review-controls');
  controls.hidden = false;
  const episode = Number(preview.episodeOrdinal);
  const lastEpisode = Number(preview.lastEpisodeOrdinal);
  byId('wave-episode-label').textContent = `Эпизод ${episode} из ${lastEpisode}`;
  byId('wave-previous-episode').disabled = state.busy || episode <= 1;
  byId('wave-next-episode').disabled = state.busy || episode >= lastEpisode;
  const sessionSelect = byId('wave-session-select');
  sessionSelect.disabled = state.busy;
  sessionSelect.replaceChildren();
  for (const session of Array.isArray(preview.sessions) ? preview.sessions : []) {
    const option = document.createElement('option');
    option.value = String(session.sessionOrdinal);
    option.selected = Number(session.sessionOrdinal) === Number(preview.selectedSessionOrdinal);
    option.textContent = `${session.sessionOrdinal}. ${localizedText(session.titleByLocale, state.locale)}`;
    sessionSelect.append(option);
  }

  const tabs = byId('locale-tabs');
  tabs.replaceChildren();
  COURSE_LOCALES.forEach((locale) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'locale-tab';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(locale === state.locale));
    button.title = `Показать тексты интерфейса на языке ${locale.toUpperCase()}`;
    button.textContent = locale.toUpperCase();
    button.addEventListener('click', () => { state.locale = locale; renderReview(); });
    tabs.append(button);
  });

  const content = byId('review-content');
  content.className = 'review-content is-wave';
  content.replaceChildren();

  const introSection = document.createElement('section');
  introSection.className = 'wave-review-section';
  const introTitle = document.createElement('h3');
  introTitle.textContent = localizedText(shard.intro?.titleByLocale, state.locale);
  introSection.append(introTitle);
  appendParagraph(introSection, localizedText(shard.intro?.summaryByLocale, state.locale));
  appendParagraph(introSection, `Цель: ${localizedText(shard.intro?.learningGoalByLocale, state.locale)}`);
  for (const block of Array.isArray(shard.intro?.blocks) ? shard.intro.blocks : []) {
    const item = document.createElement('div');
    item.className = 'wave-review-block';
    const title = document.createElement('strong');
    title.textContent = localizedText(block.titleByLocale, state.locale);
    item.append(title);
    appendParagraph(item, localizedText(block.bodyByLocale, state.locale), 'wave-review-copy');
    introSection.append(item);
  }
  content.append(introSection);

  const questionsSection = document.createElement('section');
  questionsSection.className = 'wave-review-section';
  const questionsTitle = document.createElement('h3');
  questionsTitle.textContent = 'Три вопроса после интро';
  questionsSection.append(questionsTitle);
  for (const question of Array.isArray(shard.intro?.checkQuestions) ? shard.intro.checkQuestions : []) {
    const item = document.createElement('div');
    item.className = 'wave-review-question';
    appendParagraph(item, `Звёздный слот ${question.requiredTaskSlot}`, 'wave-review-meta');
    appendParagraph(item, localizedText(question.promptByLocale, state.locale), 'wave-review-target');
    const choices = question.choicesByLocale?.[state.locale];
    if (Array.isArray(choices)) choices.forEach((choice, index) => appendParagraph(item, `${index === question.correctChoiceIndex ? 'Правильный ответ' : 'Вариант'}: ${choice}`, 'wave-review-copy'));
    appendParagraph(item, localizedText(question.explanationByLocale, state.locale), 'wave-review-copy');
    questionsSection.append(item);
  }
  content.append(questionsSection);

  const cardsSection = document.createElement('section');
  cardsSection.className = 'wave-review-section';
  const cardsTitle = document.createElement('h3');
  cardsTitle.textContent = '12 учебных заданий';
  cardsSection.append(cardsTitle);
  for (const card of Array.isArray(shard.cards) ? shard.cards : []) {
    const item = document.createElement('div');
    item.className = 'wave-review-card';
    appendParagraph(item, `Задание ${card.taskSlot} · ${String(card.family || '')}`, 'wave-review-meta');
    appendParagraph(item, String(card.contentItem?.target?.text || ''), 'wave-review-target');
    const meaning = Array.isArray(card.contentItem?.learnerMeanings)
      ? card.contentItem.learnerMeanings.find((candidate) => candidate?.locale === state.locale)?.value
      : null;
    if (meaning) appendParagraph(item, `Значение: ${meaning}`, 'wave-review-copy');
    appendParagraph(item, localizedText(card.instructionByLocale, state.locale), 'wave-review-copy');
    appendParagraph(item, `Подсказка: ${localizedText(card.hintByLocale, state.locale)}`, 'wave-review-copy');
    appendParagraph(item, `После ошибки: ${localizedText(card.errorExplanationByLocale, state.locale)}`, 'wave-review-copy');
    cardsSection.append(item);
  }
  content.append(cardsSection);
}

function closeReview(force = false) {
  if (state.busy && !force) return;
  byId('review-layer').hidden = true;
  document.body.style.overflow = '';
  state.preview = null;
  state.previewStage = null;
  state.reviewMode = null;
}

async function reviewStage(status) {
  if (state.reviewMode === 'wave') return reviewWave(status);
  if (state.busy || !state.previewStage || visualMode) return;
  const reason = String(byId('review-reason').value || '').trim();
  if (reason.length < 5) { setStatus('Добавьте короткий комментарий к решению.', 'error'); return; }
  setBusy(true);
  setStatus(status === 'approved' ? 'Сохраняем ваше одобрение…' : 'Возвращаем этап на исправление…');
  try {
    await callable('adminReviewContentStage')({ stageId: String(state.previewStage.id), status, reason, expectedReviewFingerprint: String(state.preview.reviewFingerprint) });
    closeReview(true);
    setStatus(status === 'approved' ? 'Этап одобрен. Следующий этап теперь доступен.' : 'Этап возвращён на исправление.', 'success');
  } catch (error) {
    setStatus(`Решение не сохранено: ${error?.message || error}`, 'error');
  } finally {
    setBusy(false);
    await refreshStages();
  }
}

async function reviewWave(status) {
  if (state.busy || !state.previewStage || !state.preview || visualMode) return;
  const reason = String(byId('review-reason').value || '').trim();
  if (reason.length < 5) { setStatus('Добавьте понятный комментарий к решению.', 'error'); return; }
  const waveId = String(state.preview.waveId || '');
  const requiredWave = WAVE_LABELS[waveId] || waveId;
  setBusy(true);
  byId('approve-button').disabled = true;
  byId('reject-button').disabled = true;
  setStatus(status === 'approved' ? `Сохраняем одобрение ${requiredWave}…` : `Останавливаем ${requiredWave} и сохраняем возврат…`);
  try {
    const callableName = status === 'approved' ? 'adminApproveLearningV2CourseWave' : 'adminRejectLearningV2CourseWave';
    await callable(callableName)({
      stageId: String(state.previewStage.id),
      waveId,
      expectedCheckpointFingerprint: String(state.preview.checkpointFingerprint || ''),
      reason,
    });
    closeReview(true);
    setStatus(status === 'approved'
      ? `${requiredWave} одобрено. Фоновая генерация продолжится с ближайшей сессии.`
      : `${requiredWave} возвращено. Текущая версия сохранена для аудита; следующая будет отдельной.`, 'success');
  } catch (error) {
    setStatus(`Решение не сохранено: ${error?.message || error}`, 'error');
  } finally {
    setBusy(false);
    await refreshStages();
  }
}

async function primaryAction() {
  try {
    const definition = nextUnapprovedDefinition();
    if (!definition) return;
    const stage = latestByKind(definition.kind);
    if (!stage || ['rejected', 'cancelled', 'superseded'].includes(stage.state)) return await createNextStage();
    if (waveLabel(stage)) return await previewWave(stage, 1, 1);
    if (stage.state === 'paused' && stage.learningV2PauseReason === 'root_manifest_materialization_pending') return;
    if (['queued', 'failed', 'paused'].includes(stage.state)) return await runStage(stage.id);
    if (stage.state === 'needs_review') return await previewStage(stage.id);
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  }
}

function showVisualMode() {
  state.stages = [
    { id: 'visual-research', kind: 'learning_v2_research', state: 'approved', revision: 1 },
    { id: 'visual-curriculum', kind: 'learning_v2_curriculum', state: 'approved', revision: 1 },
    { id: 'visual-outline', kind: 'learning_v2_lesson_outline', state: 'approved', revision: 1 },
    { id: 'visual-localized-course', kind: 'learning_v2_localized_course', state: 'paused', revision: 1, learningV2PauseReason: 'owner_wave_approval_required', learningV2RequiredWaveApproval: 'e1' },
  ];
  byId('admin-email').textContent = 'Локальный макет';
  studio.hidden = false;
  renderWorkflow();
  setStatus('Локальный макет: серверные данные не загружаются и не меняются.', 'success');
}

async function resolveFirebaseConfig() {
  const injected = globalThis.PHR_MAN_FIREBASE_CONFIG;
  if (injected && typeof injected === 'object') return applyMobileHostingAuthDomain(injected);
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Конфигурация Firebase недоступна. Откройте страницу через Firebase Hosting.');
  return applyMobileHostingAuthDomain(await response.json());
}

function applyMobileHostingAuthDomain(config) {
  if (!config || typeof config !== 'object') throw new Error('Конфигурация Firebase повреждена.');
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const projectId = typeof config.projectId === 'string' ? config.projectId.trim() : '';
  const hostname = String(location.hostname || '').trim().toLowerCase().replace(/\.$/, '');
  if (!isMobile || !projectId || hostname !== `${projectId}.web.app`) return config;
  return { ...config, authDomain: `${projectId}.web.app` };
}

async function startLiveMode() {
  try {
    const app = initializeApp(await resolveFirebaseConfig());
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
    state.auth = getAuth(app);
    state.functions = getFunctions(app, 'us-central1');
    await getRedirectResult(state.auth).catch(() => null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    byId('sign-in-button').addEventListener('click', async () => {
      byId('auth-error').hidden = true;
      try {
        if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) await signInWithRedirect(state.auth, provider);
        else await signInWithPopup(state.auth, provider);
      } catch (error) {
        byId('auth-error').textContent = `Вход не выполнен: ${error?.message || error}`;
        byId('auth-error').hidden = false;
      }
    });
    byId('sign-out-button').addEventListener('click', () => signOut(state.auth));

    onAuthStateChanged(state.auth, async (user) => {
      if (!user) {
        studio.hidden = true;
        authScreen.hidden = false;
        return;
      }
      let token = await user.getIdTokenResult(false);
      if (token.claims?.admin !== true) token = await user.getIdTokenResult(true);
      if (token.claims?.admin !== true) {
        await signOut(state.auth);
        byId('auth-error').textContent = 'У этого Google-аккаунта нет прав администратора.';
        byId('auth-error').hidden = false;
        return;
      }
      authScreen.hidden = true;
      studio.hidden = false;
      byId('admin-email').textContent = user.email || user.uid;
      await refreshStages();
    });
  } catch (error) {
    authScreen.hidden = false;
    byId('auth-error').textContent = error?.message || String(error);
    byId('auth-error').hidden = false;
  }
}

byId('refresh-button').addEventListener('click', refreshStages);
nextButton.addEventListener('click', primaryAction);
byId('approve-button').addEventListener('click', () => reviewStage('approved'));
byId('reject-button').addEventListener('click', () => reviewStage('rejected'));
byId('wave-previous-episode').addEventListener('click', () => changeWavePreview(Number(state.preview?.episodeOrdinal || 1) - 1, 1));
byId('wave-next-episode').addEventListener('click', () => changeWavePreview(Number(state.preview?.episodeOrdinal || 1) + 1, 1));
byId('wave-session-select').addEventListener('change', () => changeWavePreview(Number(state.preview?.episodeOrdinal || 1), Number(byId('wave-session-select').value || 1)));
document.querySelectorAll('[data-close-review]').forEach((button) => button.addEventListener('click', () => closeReview()));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !byId('review-layer').hidden) closeReview(); });
byId('course-target').addEventListener('change', () => {
  const language = byId('course-target').value;
  const requestInput = byId('course-request');
  if (/^learning-v2-[a-z-]+-v1$/.test(requestInput.value)) requestInput.value = `learning-v2-${language}-v1`;
  state.stages = [];
  renderWorkflow();
  void refreshStages();
});

if (visualMode) showVisualMode();
else void startLiveMode();
