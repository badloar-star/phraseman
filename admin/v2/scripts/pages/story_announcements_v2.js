/* Stories workspace: publication list and a live 36-template constructor.
   Uses existing callable, revision and account boundaries; no automatic writes. */
(() => { 'use strict';
const LOG = '[ANN2-ADMIN]';
const STORIES_BUILD = '2026.10.30.3';
const PREVIEW_URL = 'scripts/pages/story_announcements_v2_preview.html?preview=1&build=' + STORIES_BUILD;
const SIZES = [14, 16, 20]; const STYLES = [['normal', 'Обычный'], ['accent', 'Акцент'], ['quote', 'Цитата']];
const GROUPS = { text: 'Текст', time: 'Срок', sections: 'Разделы', promo: 'Акции', community: 'Сообщество', holiday: 'Праздник', service: 'Служебные' };
/** Поля сверх общих — по design (контракт story_announcements_contract.ts, Моменты 28.10). */
const ART_DEFAULT = { lessons: 'lessons', dialogs: 'dialogs', mistakes: 'mistakes_entry', exam: 'home_scene_exam_ready', ai: 'intro_ai_dialog', holiday: 'home_scene_all_done', maintenance: 'dialogs_scene_limit', phrase: 'phrase_of_day' };
const ARTS = ['lessons', 'dialogs', 'cards', 'spire_tile', 'phrase_of_day', 'today', 'mistakes_entry', 'intro_friends', 'intro_ai_dialog', 'intro_cards_hub', 'intro_training_blitz', 'home_scene_welcome_back', 'home_scene_exam_ready', 'home_scene_newbie', 'home_scene_day_done', 'home_scene_all_done', 'home_scene_continue', 'home_scene_streak_risk', 'home_scene_streak_lost', 'home_scene_no_energy', 'home_scene_offline', 'cards_from_video', 'continue', 'dialogs_scene_limit'];
const CTA_BY_DESIGN = { plus: 'open_plus', invite: 'share_invite', theme: 'use_theme' };
const LIMITS = { badge: 35, title: 110, block: 260 };
const DURATIONS = [5000, 8000, 12000, 15000];
/** зачем (Ревизор 28.10): опрос нельзя публиковать, пока серверная функция storyPollVote не выложена — иначе люди увидят опрос без голосования. Включить после выкладки (Моменты). */
const POLL_PUBLISH_ENABLED = false;

// Keep the editor usable when the independent preview frame fails to load.
const FALLBACK_DESIGNS = [{"id":"manifest","name":"Манифест","group":"Текст"},{"id":"editorial","name":"Редакция","group":"Текст"},{"id":"quote","name":"Цитата","group":"Текст"},{"id":"list3","name":"Три пункта","group":"Текст"},{"id":"qa","name":"Вопрос и ответ","group":"Текст"},{"id":"number","name":"Большая цифра","group":"Текст"},{"id":"countdown","name":"Обратный отсчёт","group":"Срок"},{"id":"date","name":"Дата","group":"Срок"},{"id":"schedule","name":"Расписание","group":"Срок"},{"id":"soon","name":"Скоро","group":"Срок"},{"id":"today24","name":"Только сегодня","group":"Срок"},{"id":"lessons","name":"Новые уроки","group":"Разделы"},{"id":"dialogs","name":"Диалоги","group":"Разделы"},{"id":"cards","name":"Карточки","group":"Разделы"},{"id":"peak","name":"Пик","group":"Разделы"},{"id":"duels","name":"Дуэли","group":"Разделы"},{"id":"phrase","name":"Фраза дня","group":"Разделы"},{"id":"mistakes","name":"Ошибки","group":"Разделы"},{"id":"video","name":"Видео","group":"Разделы"},{"id":"exam","name":"Экзамен","group":"Разделы"},{"id":"ai","name":"Разговор с ИИ","group":"Разделы"},{"id":"plus","name":"Plus","group":"Акции"},{"id":"contest","name":"Набор месяца","group":"Акции"},{"id":"challenge","name":"Челлендж недели","group":"Акции"},{"id":"invite","name":"Пригласи друзей","group":"Акции"},{"id":"thanks","name":"Спасибо","group":"Сообщество"},{"id":"poll","name":"Опрос","group":"Сообщество"},{"id":"author","name":"Автор недели","group":"Сообщество"},{"id":"newyear","name":"Новый год","group":"Праздник"},{"id":"holiday","name":"Праздник","group":"Праздник"},{"id":"birthday","name":"День рождения","group":"Праздник"},{"id":"theme","name":"Новая тема","group":"Праздник"},{"id":"version","name":"Обновление","group":"Праздник"},{"id":"maintenance","name":"Техработы","group":"Служебные"},{"id":"feedback","name":"Мы прочитали","group":"Служебные"},{"id":"tip","name":"Совет","group":"Служебные"}];
const GALLERY_URL = 'scripts/pages/story_announcements_v2_preview.html?gallery=1&build=' + STORIES_BUILD;
const S = { designs: FALLBACK_DESIGNS, themes: [], rows: [], loaded: false, loading: null, busy: false,
  current: null, dirty: false, clean: '', message: '', error: false, scope: null, epoch: 0,
  view: new URL(location.href).searchParams.get('stories') === 'published' ? 'published' : 'builder',
  theme: 'ink', ap: 'dark', previewReady: false, galleryReady: false, pending: null, listGeneration: 0 };
window.__ann2 = S;
let panel, formEl, listEl, archiveEl, draftPicker, actionBar, noticeEl, navEl, builderEl, publishedEl;
let frame, gallery, fallback, previewBar, previewNotice, galleryNotice, selectedLabel, draftState;
let debounce = 0, previewTimer = 0, galleryTimer = 0, expiryTimer = 0;
let authUnsubscribe = null, resizeObserver = null, childObserver = null;
const origin = location.origin;
const targetOrigin = origin === 'null' ? '*' : origin;
const clone = (x) => JSON.parse(JSON.stringify(x));
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
  return el;
};
const button = (text, help, on, attrs = {}) => h('button', {
  type: 'button', class: 'ann2-btn', title: help, 'aria-description': help, onclick: on, ...attrs
}, text);
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
const newId = () => 'ann2-' + Date.now().toString(36) + '-' + uuid().slice(0, 8);
const knownDesign = (id) => FALLBACK_DESIGNS.some(d => d.id === id);
const editable = () => !!S.current && S.current.status !== 'published' && !S.busy && !!S.scope && S.scope === accountScope();
function blank(design = 'manifest') {
  return { id: newId(), revision: 0, status: 'draft', design, badge: '', title: '',
    blocks: [{text: '', size: 16, style: 'normal'}], lifetime: 7, unit: 'days', durationMs: 12000,
    eventAtMs: null, art: ART_DEFAULT[design] || null, videoId: '', cta: !!CTA_BY_DESIGN[design], themeId: '',
    publishedAtMs: null, expiresAtMs: null, legacy: false };
}
function fromRow(row) {
  const c = row.content && typeof row.content === 'object' ? row.content : row;
  const text = value => typeof value === 'string' ? value : '';
  const event = Number(c.eventAtMs);
  const blocks = (Array.isArray(c.blocks) ? c.blocks : []).slice(0, 4).map(b => ({
    text: text(b?.text), size: SIZES.includes(Number(b?.size)) ? Number(b.size) : 16,
    style: STYLES.some(([id]) => id === b?.style) ? b.style : 'normal'
  }));
  return { id: row.id, revision: Number.isSafeInteger(row.revision) ? row.revision : 0,
    status: row.status === 'published' ? 'published' : 'draft', design: text(c.design),
    badge: text(c.badge), title: text(c.title), blocks: blocks.length ? blocks : [{text: '', size: 16, style: 'normal'}],
    lifetime: Number(c.lifetime) || 7, unit: c.unit === 'hours' ? 'hours' : 'days',
    durationMs: DURATIONS.includes(c.durationMs) ? c.durationMs : 12000,
    eventAtMs: Number.isFinite(event) && event > 0 && event <= 8640000000000000 ? event : null,
    art: text(c.art) || ART_DEFAULT[c.design] || null, videoId: text(c.videoId), cta: !!c.cta,
    themeId: text(c.themeId), publishedAtMs: Number(row.publishedAtMs) || null,
    expiresAtMs: Number(row.expiresAtMs) || null, legacy: !text(c.design), legacyContent: clone(c) };
}
function toContent(f) {
  const content = { templateId: 'focus', badge: f.badge.trim(), title: f.title.trim(),
    blocks: f.blocks.map(b => ({text: b.text.trim(), size: b.size, style: b.style})).filter(b => b.text),
    titleSize: 34, align: 'center', decoration: false,
    lifetime: Math.max(1, Math.min(365, Math.trunc(f.lifetime) || 1)), unit: f.unit,
    durationMs: f.durationMs, design: f.design };
  if (f.design === 'date' && f.eventAtMs) content.eventAtMs = f.eventAtMs;
  if (ART_DEFAULT[f.design] && f.art) content.art = f.art;
  if (f.design === 'video' && f.videoId.trim()) content.videoId = f.videoId.trim();
  if (CTA_BY_DESIGN[f.design] && f.cta) content.cta = {action: CTA_BY_DESIGN[f.design]};
  if (f.design === 'theme' && f.themeId) content.themeId = f.themeId;
  return content;
}
function fingerprint(f) { return f ? JSON.stringify(toContent(f)) : ''; }
function markClean() { S.clean = fingerprint(S.current); S.dirty = false; renderDraftState(); }
function changed() {
  S.dirty = fingerprint(S.current) !== S.clean;
  S.pending = null;
  renderDraftState(); schedulePreview();
}
function stateOf(f) {
  if (f.status !== 'published') return 'draft';
  if (f.expiresAtMs && f.expiresAtMs <= Date.now()) return 'expired';
  if (f.publishedAtMs && f.publishedAtMs > Date.now()) return 'scheduled';
  // Missing lifetime metadata cannot establish that an old publication is active.
  return f.publishedAtMs && f.expiresAtMs ? 'active' : 'unknown';
}
const stateNames = {draft: 'Черновик', expired: 'Показ завершён', scheduled: 'Запланировано', active: 'В показе', unknown: 'Срок не указан'};
function dateLabel(ms) {
  return ms ? new Intl.DateTimeFormat('ru-RU', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(ms)) : '';
}
function problems(f, action) {
  const out = [];
  if (!knownDesign(f.design)) out.push('Выберите один из 36 шаблонов.');
  if (!f.title.trim() && !f.badge.trim() && !f.blocks.some(b => b.text.trim())) out.push('Введите заголовок или текст истории.');
  if (f.title.length > LIMITS.title) out.push('Заголовок: максимум 110 знаков.');
  if (f.badge.length > LIMITS.badge) out.push('Метка: максимум 35 знаков.');
  if (f.blocks.some(b => b.text.length > LIMITS.block)) out.push('В одном текстовом поле должно быть не больше 260 знаков.');
  if (f.blocks.length > 4) out.push('Можно добавить до четырёх текстовых полей.');
  if (f.design === 'poll' && f.blocks.filter(b => b.text.trim()).length < 2) out.push('Добавьте хотя бы два варианта ответа.');
  if (action === 'publish' && f.design === 'poll' && !POLL_PUBLISH_ENABLED) out.push('Опрос можно сохранить в черновик. Публикация станет доступна после подключения голосования.');
  if (f.design === 'date' && (!Number.isFinite(f.eventAtMs) || !f.eventAtMs)) out.push('Укажите дату события.');
  if (!Number.isInteger(f.lifetime) || f.lifetime < 1 || f.lifetime > 365) out.push('Срок показа: целое число от 1 до 365.');
  return out;
}
async function callable(name) {
  if (typeof window.getAdminSensitiveControlCallable === 'function') return window.getAdminSensitiveControlCallable(name);
  const c = window.__pmAdminCore;
  if (!c?.httpsCallable) throw Error('Админка ещё загружается. Повторите через несколько секунд.');
  return c.httpsCallable(c.functionsUs, name, {timeout: 60000});
}
function human(error) {
  const text = String(error?.message || error);
  const map = { revision_conflict: 'Эту историю изменили в другом окне. Обновите список и откройте сохранённую версию.',
    published_edit_requires_stop: 'Сначала верните опубликованную историю в черновики.',
    field_not_for_design: 'Проверьте настройки выбранного шаблона.', invalid_cta: 'У этого шаблона нет выбранной кнопки.',
    unknown_content_field: 'Сервер пока не поддерживает одно из полей этой истории.',
    text_too_long: 'Сократите текст до указанного лимита.', empty_story: 'Введите заголовок или текст истории.',
    unauthenticated: 'Войдите в админку и повторите действие.', 'permission-denied': 'У текущего аккаунта нет права на это действие.',
    active_limit: 'Достигнут лимит активных историй. Сначала снимите одну с показа.',
    resource_exhausted: 'Достигнут лимит активных историй. Сначала снимите одну с показа.',
    unavailable: 'Не удалось связаться с сервером. Текст сохранён в открытой форме; повторите действие.' };
  for (const [key, value] of Object.entries(map)) if (text.includes(key)) return value;
  return text;
}
function say(message, error = false) {
  S.message = message; S.error = error;
  if (noticeEl) { noticeEl.textContent = message; noticeEl.dataset.error = String(error); noticeEl.hidden = !message; }
}
function accountScope() {
  const c = window.__pmAdminCore;
  return c?.auth?.currentUser?.uid ? (c.app?.options?.projectId || location.origin) + ':' + c.auth.currentUser.uid : null;
}
function ensureAccount() {
  const scope = accountScope();
  if (S.scope !== scope) {
    S.scope = scope; S.epoch++; S.listGeneration++; S.loading = null; S.loaded = false; S.busy = false;
    S.rows = []; S.current = scope ? blank() : null; S.pending = null;
    S.clean = fingerprint(S.current); S.dirty = false;
    clearTimeout(expiryTimer);
    renderAll(); pushPreview();
  }
  return scope;
}
async function load() {
  const scope = ensureAccount();
  if (!scope) { say('Войдите в админку, чтобы открыть и сохранить истории.'); return false; }
  if (S.loading) return S.loading;
  const epoch = S.epoch, generation = S.listGeneration;
  const current = () => epoch === S.epoch && generation === S.listGeneration && scope === accountScope();
  if (!S.loaded) say('Загружаем истории…');
  const request = (async () => {
    try {
      const fn = await callable('adminStoryAnnouncementsList'); if (!current()) return false;
      const result = await fn({}); if (!current()) return false;
      const items = result?.data?.items ?? result?.items;
      if (!Array.isArray(items)) throw Error('Не удалось прочитать список историй. Попробуйте обновить его.');
      S.rows = items.filter(row => row && typeof row.id === 'string').map(row => ({...row, form: fromRow(row)}));
      S.loaded = true;
      if (!S.current) { S.current = blank(); markClean(); renderForm(); }
      if (!S.busy) say('');
      renderList(); renderDraftPicker(); scheduleExpiry();
      return true;
    } catch (error) { if (current()) say(human(error), true); return false; }
  })();
  S.loading = request;
  try { return await request; } finally { if (S.loading === request) S.loading = null; }
}
function scheduleExpiry() {
  clearTimeout(expiryTimer);
  if (!isStoriesActive()) return;
  const now = Date.now();
  const next = S.rows.flatMap(r => [r.form.publishedAtMs, r.form.expiresAtMs]).filter(n => n > now).sort((a,b) => a-b)[0];
  if (next) expiryTimer = setTimeout(() => { renderList(); renderDraftState(); scheduleExpiry(); }, Math.min(2147480000, next - now + 20));
}
function mayReplaceDraft() {
  if (S.busy) return false;
  return !S.dirty || window.confirm('В форме есть несохранённый текст. Заменить его выбранной историей?');
}
function newStory() {
  if (!ensureAccount() || !mayReplaceDraft()) return;
  S.current = blank(); S.pending = null; markClean(); say('');
  setView('builder'); renderForm(); renderActions(); renderDraftPicker(); updateSelection(); pushPreview();
}
function openRow(row, copy = false) {
  const previousScope = S.scope;
  if (!ensureAccount() || previousScope !== S.scope || !mayReplaceDraft()) { renderDraftPicker(); return; }
  const f = clone(row.form);
  if (copy) {
    f.id = newId(); f.revision = 0; f.status = 'draft'; f.publishedAtMs = null; f.expiresAtMs = null;
    if (!knownDesign(f.design)) f.design = 'manifest';
    f.legacy = false;
  }
  S.current = f; S.pending = null; markClean();
  if (copy) { S.clean = ''; S.dirty = true; }
  say(copy ? 'Копия открыта в конструкторе. Сохраните её как новую историю.' : '');
  setView('builder'); renderForm(); renderActions(); renderDraftPicker(); updateSelection(); pushPreview();
}
function chooseDesign(id) {
  if (!editable() || !knownDesign(id)) return;
  const f = S.current; f.design = id; f.legacy = false;
  if (ART_DEFAULT[id] && !ARTS.includes(f.art)) f.art = ART_DEFAULT[id];
  f.cta = !!CTA_BY_DESIGN[id]; changed(); renderForm(); renderActions(); updateSelection(); pushPreview();
}
async function command(action, target = S.current) {
  const previousScope = S.scope, previousEpoch = S.epoch;
  const scope = ensureAccount();
  if (!scope) { say('Войдите в админку перед сохранением.', true); return; }
  if (previousScope !== scope || previousEpoch !== S.epoch) {
    say('Аккаунт изменился. Откройте историю заново.', true); return;
  }
  if (S.busy || !target || !['save', 'publish', 'stop'].includes(action)) return;
  const f = target;
  const keepLocalDraft = action === 'stop' && f !== S.current && S.current?.id === f.id && S.dirty;
  const issues = action === 'stop' ? [] : problems(f, action);
  if (f.status === 'published' && action !== 'stop') issues.push('Сначала верните эту историю в черновики или создайте копию.');
  if (issues.length) { say(issues.join(' '), true); return; }
  if (action === 'publish' && !window.confirm('Опубликовать эту историю для всех пользователей? Срок показа начнётся сейчас.')) return;
  if (action === 'stop' && !window.confirm('Снять эту историю с показа и вернуть в черновики? Её текст сохранится.')) return;
  const epoch = S.epoch; const current = () => epoch === S.epoch && scope === accountScope();
  const content = action === 'stop' ? null : toContent(f);
  const key = JSON.stringify([scope, f.id, f.revision, action, content]);
  if (!S.pending || S.pending.key !== key) S.pending = {key, operationId: uuid()};
  const payload = {id: f.id, expectedRevision: f.revision, operationId: S.pending.operationId, action,
    ...(content ? {content} : {})};
  S.busy = true; renderActions(); renderForm(); renderList(); updateSelection(); pushPreview();
  say(action === 'save' ? 'Сохраняем черновик…' : action === 'publish' ? 'Публикуем историю…' : 'Возвращаем в черновики…');
  try {
    const fn = await callable('adminStoryAnnouncementCommand'); if (!current()) return;
    const result = await fn(payload); if (!current()) return;
    const data = result?.data || result;
    if (data?.ok === false || !Number.isSafeInteger(data?.revision) || data.revision <= payload.expectedRevision) {
      throw Error('Сервер не подтвердил сохранение. Обновите список и проверьте историю перед повторной отправкой.');
    }
    f.revision = data.revision; f.status = action === 'publish' ? 'published' : 'draft';
    if (action === 'publish') {
      f.publishedAtMs = Date.now(); f.expiresAtMs = f.publishedAtMs + f.lifetime * (f.unit === 'hours' ? 3600000 : 86400000);
    } else { f.publishedAtMs = null; f.expiresAtMs = null; }
    S.pending = null;
    if (keepLocalDraft) {
      // Stopping the server publication must not discard an unsaved local edit.
      S.current.revision = data.revision; S.current.status = 'draft';
      S.current.publishedAtMs = null; S.current.expiresAtMs = null;
      S.clean = fingerprint(f); S.dirty = fingerprint(S.current) !== S.clean;
      renderDraftState();
    } else if (S.current?.id === f.id) { S.current = f; markClean(); }
    // An older in-flight list cannot replace an acknowledged write with stale data.
    S.listGeneration++; S.loading = null;
    let refreshed = await load(); if (!current()) return;
    if (refreshed) {
      const saved = S.rows.find(r => r.id === f.id);
      if (!saved || saved.form.revision < data.revision) refreshed = false;
      else if (S.current?.id === f.id && !S.dirty) { S.current = clone(saved.form); markClean(); }
    }
    if (!refreshed) {
      const row = {id: f.id, revision: f.revision, status: f.status, publishedAtMs: f.publishedAtMs,
        expiresAtMs: f.expiresAtMs, content: content || f.legacyContent, form: clone(f)};
      S.rows = [row, ...S.rows.filter(r => r.id !== f.id)];
    }
    if (action === 'publish') setView('published');
    say(({save: 'Черновик сохранён.', publish: 'История опубликована.', stop: 'История возвращена в черновики.'})[action] +
      (keepLocalDraft && S.dirty ? ' Несохранённый текст остался в конструкторе.' : '') +
      (refreshed ? '' : ' Список обновить не удалось. Сохранение подтверждено сервером.'), !refreshed);
  } catch (error) { if (current()) say(human(error), true); }
  finally { if (current()) { S.busy = false; renderAll(); updateSelection(); pushPreview(); } }
}
function field(text, control, max) {
  const label = h('label', {class: 'ann2-field'}, h('span', {class: 'ann2-field__label'}, text), control);
  if (max) {
    const counter = h('span', {class: 'ann2-count', 'aria-hidden': 'true'}, (control.value || '').length + ' / ' + max);
    control.addEventListener('input', () => { counter.textContent = control.value.length + ' / ' + max; });
    label.firstChild.append(counter);
  }
  return label;
}
function textInput(value, max, change, attrs = {}, multiline = false) {
  const el = h(multiline ? 'textarea' : 'input', {class: 'ann2-input', ...(multiline ? {rows: 2} : {type: 'text'}), maxlength: max, ...attrs});
  el.value = value;
  el.addEventListener('input', () => { if (!editable()) {ensureAccount();return;} change(el.value); changed(); });
  return el;
}
function select(options, value, change, attrs = {}) {
  const el = h('select', {class: 'ann2-input', ...attrs});
  for (const [id, name] of options) el.append(h('option', {value: id}, name));
  el.value = String(value);
  el.addEventListener('change', () => change(el.value));
  return el;
}
function details(title, ...children) {
  return h('details', {class: 'ann2-details'}, h('summary', {}, title), h('div', {class: 'ann2-detail-body'}, ...children));
}
function renderForm() {
  if (!formEl) return;
  const open = [...formEl.querySelectorAll('details[open]')].map(el => el.firstChild.textContent);
  formEl.replaceChildren();
  const f = S.current;
  if (!f) { formEl.append(h('p', {class: 'ann2-empty'}, 'Войдите в админку, чтобы редактировать историю.')); return; }
  const disabled = !editable();
  if (f.status === 'published') {
    const state = stateOf(f);
    formEl.append(h('p', {class: 'ann2-readonly'}, stateNames[state] + '. Чтобы изменить текст, верните историю в черновики или создайте копию.'));
  } else if (f.legacy) {
    formEl.append(h('p', {class: 'ann2-readonly'}, 'Выберите макет из галереи, чтобы перенести эту историю в новый шаблон.'));
  }
  formEl.append(field('Заголовок', textInput(f.title, LIMITS.title, value => { f.title = value; }, {disabled, placeholder: 'Что хотите рассказать?'}, true), LIMITS.title));
  formEl.append(field('Метка', textInput(f.badge, LIMITS.badge, value => { f.badge = value; }, {disabled, placeholder: 'Например, Обновление'}), LIMITS.badge));
  f.blocks.forEach((block, index) => {
    const title = f.design === 'poll' ? 'Вариант ответа ' + (index + 1) : index === 0 ? 'Текст истории' : 'Текст ' + (index + 1);
    const wrap = h('div', {class: 'ann2-text-group'}, field(title, textInput(block.text, LIMITS.block,
      value => { block.text = value; }, {disabled, rows: 3, placeholder: f.design === 'poll' ? 'Текст ответа' : 'Введите текст и смотрите макеты'}, true), LIMITS.block));
    const styles = details('Оформление текста',
      field('Размер текста ' + (index + 1), select(SIZES.map(n => [String(n), n + ' px']), block.size, value => {block.size = Number(value); changed();}, {disabled})),
      field('Стиль текста ' + (index + 1), select(STYLES, block.style, value => {block.style = value; changed();}, {disabled})),
      f.blocks.length > 1 ? button('Убрать текст', 'Удаляет это поле из открытого черновика.', () => {
        f.blocks.splice(index, 1); changed(); renderForm();
      }, {disabled, class: 'ann2-btn ann2-btn--quiet'}) : null);
    wrap.append(styles); formEl.append(wrap);
  });
  if (f.blocks.length < 4) formEl.append(button(f.design === 'poll' ? '+ Добавить вариант' : '+ Добавить текст',
    'Добавляет ещё одно текстовое поле. Всего можно четыре.', () => {
      if (!editable()) return; f.blocks.push({text: '', size: 16, style: 'normal'}); changed(); renderForm();
    }, {disabled, class: 'ann2-btn ann2-btn--quiet'}));
  const settings = [];
  if (f.design === 'date') {
    const date = h('input', {type: 'datetime-local', class: 'ann2-input', disabled});
    date.value = f.eventAtMs ? new Date(f.eventAtMs - new Date(f.eventAtMs).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    date.addEventListener('change', () => { f.eventAtMs = date.value ? new Date(date.value).getTime() : null; changed(); });
    formEl.append(field('Дата события', date));
  }
  if (ART_DEFAULT[f.design]) settings.push(field('Иллюстрация', select(ARTS.map(id => [id, id]), f.art || ART_DEFAULT[f.design], value => {f.art = value; changed();}, {disabled})));
  if (f.design === 'video') settings.push(field('ID видео', textInput(f.videoId, 100, value => {f.videoId = value;}, {disabled, placeholder: 'Пусто: первое видео из ленты'})));
  if (f.design === 'theme') settings.push(field('Тема истории', select([['', 'Тема пользователя'], ...S.themes.map(t => [t.id, t.name])], f.themeId, value => {f.themeId = value; changed();}, {disabled})));
  if (CTA_BY_DESIGN[f.design]) {
    const cb = h('input', {type: 'checkbox', disabled}); cb.checked = f.cta;
    cb.addEventListener('change', () => { f.cta = cb.checked; changed(); });
    settings.push(h('label', {class: 'ann2-check'}, cb, 'Кнопка «' + ({plus:'Открыть Plus', invite:'Поделиться ссылкой', theme:'Включить тему'})[f.design] + '»'));
  }
  const lifetime = h('input', {type: 'number', class: 'ann2-input', min: 1, max: 365, value: f.lifetime, disabled});
  lifetime.addEventListener('input', () => {f.lifetime = Number(lifetime.value); changed();});
  settings.push(h('div', {class: 'ann2-setting-row'},
    field('Срок показа', lifetime), field('Единица срока', select([['days','Дней'],['hours','Часов']], f.unit, value => {f.unit=value; changed();}, {disabled}))),
    field('Длительность кадра', select(DURATIONS.map(n => [String(n), n/1000 + ' секунд']), f.durationMs, value => {f.durationMs=Number(value); changed();}, {disabled})));
  formEl.append(details('Настройки истории', ...settings));
  for (const el of formEl.querySelectorAll('details')) if (open.includes(el.firstChild.textContent)) el.open = true;
}
function renderDraftState() {
  if (!draftState) return;
  const f = S.current;
  draftState.textContent = !f ? '' : S.busy ? 'Сохраняем…' : S.dirty ? 'Есть несохранённые изменения' : f.status === 'published' ? stateNames[stateOf(f)] : f.revision ? 'Черновик сохранён' : 'Новая история';
  draftState.dataset.dirty = String(S.dirty);
}
function renderDraftPicker() {
  if (!draftPicker) return;
  const rows = S.rows.filter(row => row.form.status !== 'published');
  draftPicker.replaceChildren(h('option', {value: ''}, 'Открыть черновик…'));
  for (const row of rows) draftPicker.append(h('option', {value: row.id}, row.form.title || row.form.badge || 'Без заголовка'));
  draftPicker.value = rows.some(row => row.id === S.current?.id) ? S.current.id : '';
  draftPicker.disabled = S.busy || !accountScope() || !rows.length;
}
function renderActions() {
  if (!actionBar) return; actionBar.replaceChildren();
  const newButton = panel?.querySelector('.ann2-btn--new');
  if (newButton) newButton.disabled = S.busy || !accountScope();
  const f = S.current;
  if (!f) return;
  if (f.status === 'published') {
    actionBar.append(button('Создать копию', 'Открывает новую историю с этим текстом. Публикация останется прежней.', () => openRow({form: f}, true), {disabled: S.busy}),
      button(stateOf(f) === 'expired' ? 'Вернуть в черновики' : 'Снять с показа', 'Возвращает эту историю в черновики. Требуется подтверждение.', () => command('stop'), {disabled: S.busy}));
  } else {
    actionBar.append(button('Сохранить черновик', 'Сохраняет текст и выбранный макет. Пользователи пока его не увидят.', () => command('save'), {disabled: !editable()}),
      button('Опубликовать', 'Покажет эту историю всем пользователям после подтверждения.', () => command('publish'), {class: 'ann2-btn ann2-btn--primary', disabled: !editable() || (f.design === 'poll' && !POLL_PUBLISH_ENABLED)}));
    if (f.design === 'poll' && !POLL_PUBLISH_ENABLED) actionBar.append(h('p', {class:'ann2-hint'}, 'Опрос: пока доступен только черновик.'));
  }
  renderDraftState();
}
function renderList() {
  if (!listEl || !archiveEl) return;
  listEl.replaceChildren(); archiveEl.replaceChildren();
  const active = S.rows.filter(row => ['active', 'scheduled'].includes(stateOf(row.form)));
  const rest = S.rows.filter(row => !['active', 'scheduled'].includes(stateOf(row.form)));
  if (!active.length) listEl.append(h('div', {class: 'ann2-empty'},
    h('h3', {}, S.loaded ? 'Сейчас ничего не опубликовано' : 'Загружаем истории…'),
    S.loaded ? h('p', {}, 'Создайте историю в конструкторе и проверьте её перед публикацией.') : null));
  function card(row) {
    const f = row.form; const state = stateOf(f);
    const actions = h('div', {class: 'ann2-row-actions'},
      button(state === 'active' ? 'Просмотр' : 'Открыть', 'Открывает эту историю в конструкторе.', () => openRow(row), {disabled: S.busy}),
      button('Создать копию', 'Создаёт отдельный черновик с этим текстом.', () => openRow(row, true), {disabled: S.busy}));
    if (f.status === 'published') actions.append(button(state === 'expired' ? 'Вернуть в черновики' : 'Снять с показа',
      'Возвращает историю в черновики после подтверждения.', () => command('stop', row.form), {disabled: S.busy, class: 'ann2-btn ann2-btn--quiet'}));
    return h('article', {class: 'ann2-row', 'data-story-id': row.id, 'data-status': state},
      h('div', {class:'ann2-row-copy'}, h('span', {class:'ann2-status', 'data-status':state}, stateNames[state]),
        h('h3', {}, f.title || f.badge || 'Без заголовка'),
        f.badge && f.title ? h('p', {}, f.badge) : null,
        f.blocks.some(b => b.text) ? h('p', {class:'ann2-row-text'}, f.blocks.map(b => b.text).join(' ')) : null,
        f.expiresAtMs ? h('p', {class:'ann2-hint'}, (state === 'expired' ? 'Показ завершён ' : 'Показ до ') + dateLabel(f.expiresAtMs)) : null), actions);
  }
  active.forEach(row => listEl.append(card(row)));
  rest.forEach(row => archiveEl.append(card(row)));
  const detailsEl = archiveEl.parentElement;
  detailsEl.hidden = !rest.length;
  detailsEl.querySelector('summary').textContent = 'Черновики и завершённые (' + rest.length + ')';
}
function renderPreviewBar() {
  if (!previewBar) return;
  previewBar.replaceChildren(
    field('Тема предпросмотра', select([['ink','Сумерки'], ...S.themes.filter(t=>t.id!=='ink').map(t=>[t.id,t.name])], S.theme, value => {S.theme=value; pushPreview();})),
    field('Вид', select([['dark','Тёмный'], ['light','Светлый']], S.ap, value => {S.ap=value; pushPreview();})));
}
function previewContent() {
  const f = S.current || blank();
  const content = toContent(f);
  const empty = !f.title && !f.badge && !f.blocks.some(b => b.text);
  content.title = empty ? 'Ваш заголовок' : f.title;
  content.badge = empty ? 'Новая история' : f.badge;
  content.blocks = empty ? [{text:'Введите текст и выберите макет',size:16,style:'normal'}] : clone(f.blocks);
  if (!knownDesign(content.design)) content.design = 'manifest';
  return content;
}
function isStoriesActive() { return location.hash.replace(/^#/, '').split(/[/?]/)[0] === 'stories' && !document.hidden; }
function pushPreview(animate = false) {
  if (!panel) return;
  const visible = isStoriesActive() && S.view === 'builder';
  const content = previewContent();
  if (S.previewReady && frame?.contentWindow) frame.contentWindow.postMessage({channel:'pm-ann-preview', content, theme:S.theme, ap:S.ap, animate, enabled:visible}, targetOrigin);
  if (S.galleryReady && gallery?.contentWindow) gallery.contentWindow.postMessage({channel:'pm-ann-gallery', content, theme:S.theme, ap:S.ap, selectedDesign:S.current?.design || '', enabled:editable() && visible}, targetOrigin);
}
function schedulePreview() { clearTimeout(debounce); debounce = setTimeout(() => pushPreview(false), 45); }
function updateSelection() {
  const selected = S.designs.find(d => d.id === S.current?.design);
  if (selectedLabel) selectedLabel.textContent = selected ? selected.name : 'Выберите шаблон';
  fallback?.querySelectorAll('[data-design]').forEach(btn => {btn.setAttribute('aria-pressed', String(btn.dataset.design === S.current?.design)); btn.disabled = !editable();});
  renderDraftState();
}
function fallbackTemplates() {
  fallback.replaceChildren(...FALLBACK_DESIGNS.map(d => button(d.name, 'Выбрать шаблон «' + d.name + '».', () => chooseDesign(d.id), {
    'data-design':d.id, 'aria-pressed':String(d.id===S.current?.design), disabled:!editable(), class:'ann2-btn ann2-template-button'
  })));
  fallback.hidden = S.galleryReady;
}
function restartPreview(which = 'both') {
  if (which !== 'gallery' && frame) {
    S.previewReady = false; frame.src = PREVIEW_URL + '&reload=' + Date.now();
    clearTimeout(previewTimer);
    previewNotice.replaceChildren(h('span', {}, 'Загружаем предпросмотр…'));
    previewTimer = setTimeout(() => {if(!S.previewReady) previewNotice.replaceChildren(h('span',{},'Предпросмотр не загрузился.'), button('Повторить', 'Загрузить предпросмотр ещё раз.', () => restartPreview('preview')));}, 10000);
  }
  if (which !== 'preview' && gallery) {
    S.galleryReady = false; gallery.hidden = true; fallback.hidden = false;
    gallery.src = GALLERY_URL + '&reload=' + Date.now(); clearTimeout(galleryTimer);
    galleryNotice.textContent = 'Загружаем 36 макетов…';
    galleryTimer = setTimeout(() => {if(!S.galleryReady) galleryNotice.replaceChildren(h('span',{},'Макеты не загрузились. Шаблон можно выбрать по названию.'), button('Загрузить макеты', 'Повторно загрузить все 36 макетов.', () => restartPreview('gallery')));}, 10000);
  }
}
window.addEventListener('message', event => {
  if (event.origin !== origin || !event.data || typeof event.data !== 'object') return;
  const data = event.data;
  const fromPreview = !!frame && event.source === frame.contentWindow;
  const fromGallery = !!gallery && event.source === gallery.contentWindow;
  if ((fromPreview && data.channel === 'pm-ann-preview-ready') || (fromGallery && data.channel === 'pm-ann-gallery-ready')) {
    if (Array.isArray(data.themes)) {
      S.themes = data.themes.filter(t => t && typeof t.id==='string' && typeof t.name==='string').slice(0,100);
      renderPreviewBar();
    }
    if (fromPreview) {S.previewReady=true;clearTimeout(previewTimer);previewNotice.replaceChildren();}
    if (fromGallery && data.count === 36) {
      S.galleryReady=true;clearTimeout(galleryTimer);gallery.hidden=false;fallback.hidden=true;galleryNotice.textContent='';
    }
    pushPreview();
  } else if (fromGallery && data.channel === 'pm-ann-gallery-size' && Number.isFinite(data.height)) {
    gallery.style.setProperty('height', Math.ceil(Math.max(120, Math.min(22000, data.height))) + 'px', 'important');
  } else if (fromGallery && data.channel === 'pm-ann-gallery-select') chooseDesign(data.design);
});
function setView(view, updateUrl = true) {
  S.view = view === 'published' ? 'published' : 'builder';
  if (builderEl) builderEl.hidden = S.view !== 'builder';
  if (publishedEl) publishedEl.hidden = S.view !== 'published';
  navEl?.querySelectorAll('[data-view]').forEach(el => {
    const on = el.dataset.view === S.view; el.setAttribute('aria-selected', String(on)); el.tabIndex = on ? 0 : -1;
  });
  if (updateUrl && isStoriesActive()) {
    const url = new URL(location.href);
    if (url.searchParams.get('stories') !== S.view) {url.searchParams.set('stories', S.view);history.pushState({...history.state, storiesView:S.view}, '', url);}
  }
  updateSelection(); pushPreview();
}
function renderAll() {
  if (!panel) return;
  renderForm(); renderList(); renderDraftPicker(); renderActions(); updateSelection();
  setView(S.view, false);
}
function ownWorkspace(tab) {
  tab.classList.add('ann2-owned');
  const old = document.getElementById('pm-story-editor');
  if (old) {
    old.hidden = true; old.setAttribute('aria-hidden','true'); old.style.setProperty('display','none','important');
    if (!old.dataset.ann2Retired) {old.removeAttribute('srcdoc');old.removeAttribute('src');old.dataset.ann2Retired='true';}
    old.dataset.loaded='true'; old.dataset.ready='true';
  }
  for (const child of tab.children) if (child !== panel) {child.hidden=true;child.setAttribute('aria-hidden','true');}
}
function mount() {
  const tab = document.getElementById('tab-stories');
  if (!tab || !window.__pmAdminCore) return false;
  if (panel?.isConnected) {ownWorkspace(tab);return true;}
  authUnsubscribe?.();resizeObserver?.disconnect();childObserver?.disconnect();
  const styleHref = 'scripts/pages/story_announcements_v2.css?build=' + STORIES_BUILD;
  let style = document.querySelector('link[data-ann2-style]');
  if (!style) {style=h('link',{rel:'stylesheet','data-ann2-style':'true'});document.head.append(style);} style.href=styleHref;
  panel = h('section', {class:'ann2','aria-label':'Истории: публикации и конструктор','data-stories-build':STORIES_BUILD});
  const publishedTab = button('Опубликовано', 'Истории, которые сейчас показываются пользователям.', () => setView('published'), {id:'ann2-published-tab',role:'tab','data-view':'published','aria-controls':'ann2-published'});
  const builderTab = button('Конструктор', 'Текст, все 36 шаблонов и предпросмотр.', () => setView('builder'), {id:'ann2-builder-tab',role:'tab','data-view':'builder','aria-controls':'ann2-builder'});
  navEl = h('div',{class:'ann2-tabs',role:'tablist','aria-label':'Страницы историй'}, publishedTab,builderTab);
  navEl.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault(); const next=event.key==='Home'?'published':event.key==='End'?'builder':S.view==='builder'?'published':'builder';setView(next);
    navEl.querySelector('[data-view="'+next+'"]').focus();
  });
  noticeEl=h('p',{class:'ann2-notice',role:'status','aria-live':'polite',hidden:true});
  const header=h('header',{class:'ann2-head'},h('h2',{},'Истории'),navEl,
    button('Новая история','Открыть пустой конструктор.',newStory,{class:'ann2-btn ann2-btn--new'}));
  listEl=h('div',{class:'ann2-list'});archiveEl=h('div',{class:'ann2-archive-list'});
  const archive=h('details',{class:'ann2-archive'},h('summary',{},'Черновики и завершённые'),archiveEl);
  publishedEl=h('section',{id:'ann2-published',role:'tabpanel','aria-labelledby':'ann2-published-tab'},
    h('div',{class:'ann2-page-title'},h('h3',{},'Сейчас опубликовано'),button('Обновить список','Загрузить актуальные истории с сервера.',()=>{if(!S.busy)void load();})),listEl,archive);
  draftPicker=select([], '', id => {const row=S.rows.find(r=>r.id===id);if(row)openRow(row);}, {'aria-label':'Открыть черновик'});
  draftState=h('span',{class:'ann2-draft-state','aria-live':'polite'});
  actionBar=h('div',{class:'ann2-actions'});
  const toolbar=h('div',{class:'ann2-builder-toolbar'},h('div',{class:'ann2-draft-tools'},draftPicker,draftState),actionBar);
  formEl=h('div',{class:'ann2-form'});
  previewBar=h('div',{class:'ann2-previewbar'});previewNotice=h('div',{class:'ann2-preview-notice',role:'status'});
  selectedLabel=h('span',{class:'ann2-selected-label'});
  frame=h('iframe',{class:'ann2-frame',title:'Предпросмотр истории',sandbox:'allow-scripts allow-same-origin'});
  const phone=h('div',{class:'ann2-phone'},frame);
  const preview=h('aside',{class:'ann2-preview','aria-label':'Предпросмотр выбранного шаблона'},
    h('div',{class:'ann2-preview-title'},h('h3',{},'Предпросмотр'),selectedLabel),phone,previewNotice,previewBar,
    button('Показать анимацию','Проиграть анимацию выбранного макета.',()=>pushPreview(true),{class:'ann2-btn ann2-btn--quiet'}));
  const editor=h('div',{class:'ann2-composer'},formEl,preview);
  galleryNotice=h('div',{class:'ann2-gallery-notice',role:'status'});
  fallback=h('div',{class:'ann2-template-fallback','aria-label':'Все 36 шаблонов по названию'});
  gallery=h('iframe',{class:'ann2-gallery-frame',title:'Все 36 шаблонов истории',sandbox:'allow-scripts allow-same-origin',scrolling:'no',hidden:true});
  const galleryWrap=h('section',{class:'ann2-gallery','aria-label':'Все шаблоны'},
    h('div',{class:'ann2-gallery-heading'},h('h3',{},'Все шаблоны'),h('span',{class:'ann2-count-badge'},'36'),h('span',{class:'ann2-hint'},'Нажмите на макет')),galleryNotice,fallback,gallery);
  builderEl=h('section',{id:'ann2-builder',role:'tabpanel','aria-labelledby':'ann2-builder-tab'},toolbar,
    h('div',{class:'ann2-builder-layout'},editor,galleryWrap));
  panel.append(header,noticeEl,publishedEl,builderEl);tab.prepend(panel);ownWorkspace(tab);
  childObserver=new MutationObserver(()=>ownWorkspace(tab));childObserver.observe(tab,{childList:true});
  function sizePreview(){if(phone.clientWidth>0)phone.style.setProperty('--ann2-preview-scale',String(phone.clientWidth/412));}
  if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(sizePreview);resizeObserver.observe(phone);}sizePreview();
  ensureAccount();fallbackTemplates();renderPreviewBar();renderAll();restartPreview();
  const auth=window.__pmAdminCore.auth;const observe=auth?.onIdTokenChanged||auth?.onAuthStateChanged;
  if(typeof observe==='function')authUnsubscribe=observe.call(auth,()=>{ensureAccount();if(isStoriesActive()&&!S.loaded)void load();});
  if(isStoriesActive())void load();
  return true;
}
function enterWorkspace(){if(mount()&&isStoriesActive()){void load();pushPreview();scheduleExpiry();}}
// The shell's existing route and refresh entry now target this one workspace.
window.loadStoryWorkspace = enterWorkspace;
window.__ann2Refresh = () => {if(mount())return load();return Promise.resolve(false);};
window.addEventListener('popstate',()=>{if(mount())setView(new URL(location.href).searchParams.get('stories')==='published'?'published':'builder',false);});
window.addEventListener('hashchange',()=>{if(isStoriesActive())enterWorkspace();else{clearTimeout(expiryTimer);pushPreview();}});
document.addEventListener('visibilitychange',()=>{pushPreview();if(isStoriesActive())scheduleExpiry();else clearTimeout(expiryTimer);});
document.addEventListener('pm:section-opened',event=>{if(['stories','tab-stories'].includes(event.detail?.tab))enterWorkspace();else pushPreview();});
window.addEventListener('beforeunload',event=>{if(S.dirty||S.busy){event.preventDefault();event.returnValue='';}});
if(!mount()){
  const timer=setInterval(()=>{if(mount()){clearInterval(timer);window.loadStoryWorkspace=enterWorkspace;}},500);
  setTimeout(()=>clearInterval(timer),120000);
}
})();
