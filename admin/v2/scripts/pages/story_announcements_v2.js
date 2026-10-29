/* story_announcements_v2.js — редактор объявлений 2.0 (36 шаблонов макета docs/design/v2-app/stories-announcements-v1.html) для вкладки «Истории».
   зачем (владелец 28.10: «все должны быть добавлены в админку и работать корректно в приложении точно так же, как на макете»): форма
   объявления + живой предпросмотр тем же движком, что макет (story_announcements_v2_preview.html = макет в режиме ?preview=1), публикация
   через существующие вызовы adminStoryAnnouncementsList / adminStoryAnnouncementCommand (сервер проверяет поля по контракту).
   Подключение: одна строка в legacy.html рядом с youtube-comments: <script src="scripts/pages/story_announcements_v2.js" defer></script>.
   Модуль встаёт в начало #tab-stories, прежний редактор (iframe #pm-story-editor) остаётся ниже. Логи: [ANN2-ADMIN]. */
(() => { 'use strict';
const LOG = '[ANN2-ADMIN]';
const PREVIEW_URL = 'scripts/pages/story_announcements_v2_preview.html?preview=1';
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

const S = { designs: [], themes: [], rows: [], loaded: false, busy: false, message: '', error: false, current: null, theme: 'ink', ap: 'dark', previewReady: false };
window.__ann2 = S; // зачем: состояние видно из консоли и из headless-проверки (scratchpad admin_test.cjs)
let panel = null, frame = null, formEl = null, listEl = null, noticeEl = null, descEl = null, debounce = 0;

const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null) e.setAttribute(k, String(v)); } for (const k of kids.flat()) if (k !== null && k !== undefined) e.append(k); return e; };
const log = (...a) => console.log(LOG, ...a);
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
const newId = () => `ann2-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Пустое объявление: шаблон из списка (первый — Манифест), 1 блок, 7 дней, 12 с. */
function blank(design = 'manifest') {
  return { id: newId(), revision: 0, status: 'draft', design, badge: '', title: '', blocks: [{ text: '', size: 16, style: 'normal' }], lifetime: 7, unit: 'days', durationMs: 12000, eventAtMs: null, art: ART_DEFAULT[design] || null, videoId: '', cta: !!CTA_BY_DESIGN[design], themeId: '' };
}

/** Из строки сервера — в состояние формы (старые объявления без design открываются как design 'manifest' только по явному выбору). */
function fromRow(row) {
  const c = row.content || row;
  return { id: row.id, revision: Number(row.revision) || 0, status: row.status || 'draft', design: c.design || '', badge: c.badge || '', title: c.title || '', blocks: (c.blocks || []).map((b) => ({ text: b.text || '', size: SIZES.includes(b.size) ? b.size : 16, style: b.style || 'normal' })), lifetime: Number(c.lifetime) || 7, unit: c.unit === 'hours' ? 'hours' : 'days', durationMs: DURATIONS.includes(c.durationMs) ? c.durationMs : 12000, eventAtMs: c.eventAtMs || null, art: c.art || ART_DEFAULT[c.design] || null, videoId: c.videoId || '', cta: !!c.cta, themeId: c.themeId || '' };
}

/** Содержимое для сервера: только разрешённые поля; поля не своего design не отправляются (иначе field_not_for_design). */
function toContent(f) {
  const blocks = f.blocks.map((b) => ({ text: b.text.trim().slice(0, LIMITS.block), size: b.size, style: b.style })).filter((b) => b.text);
  const content = { templateId: 'focus', badge: f.badge.trim().slice(0, LIMITS.badge), title: f.title.trim().slice(0, LIMITS.title), blocks, titleSize: 34, align: 'center', decoration: false, lifetime: Math.max(1, Math.min(365, Math.trunc(f.lifetime) || 1)), unit: f.unit, durationMs: f.durationMs, design: f.design };
  if (f.design === 'date' && f.eventAtMs) content.eventAtMs = f.eventAtMs;
  if (ART_DEFAULT[f.design] && f.art) content.art = f.art;
  if (f.design === 'video' && f.videoId.trim()) content.videoId = f.videoId.trim();
  if (CTA_BY_DESIGN[f.design] && f.cta) content.cta = { action: CTA_BY_DESIGN[f.design] };
  if (f.design === 'theme' && f.themeId) content.themeId = f.themeId;
  return content;
}

/** Что мешает публикации — по правилам контракта (чтобы не ловить ошибку сервером). */
function problems(f, action = 'publish') {
  const out = [];
  if (action === 'publish' && f.design === 'poll' && !POLL_PUBLISH_ENABLED) out.push('Опрос пока нельзя публиковать: серверная функция голосования (storyPollVote) ещё не выложена. Черновик сохранить можно.');
  if (!f.design) out.push('Выберите шаблон.');
  if (!f.title.trim() && !f.badge.trim() && !f.blocks.some((b) => b.text.trim())) out.push('Нужен заголовок, метка или хотя бы один блок.');
  if (f.title.length > LIMITS.title) out.push(`Заголовок длиннее ${LIMITS.title} знаков.`);
  if (f.badge.length > LIMITS.badge) out.push(`Метка длиннее ${LIMITS.badge} знаков.`);
  if (f.blocks.length > 4) out.push('Блоков не больше четырёх.');
  if (f.design === 'poll' && f.blocks.filter((b) => b.text.trim()).length < 2) out.push('Опросу нужны 2–4 варианта (блоки).');
  if (f.design === 'date' && !f.eventAtMs) out.push('Укажите дату события.');
  return out;
}

async function callable(name) {
  if (typeof window.getAdminSensitiveControlCallable === 'function') return window.getAdminSensitiveControlCallable(name);
  const c = window.__pmAdminCore; if (!c?.httpsCallable) throw new Error('Админка ещё загружается, повторите через несколько секунд.');
  return c.httpsCallable(c.functionsUs, name, { timeout: 60000 });
}
function say(text, error = false) { S.message = text; S.error = error; if (noticeEl) { noticeEl.textContent = text; noticeEl.dataset.error = String(error); } }
function human(e) { const m = String(e?.message || e); const map = { revision_conflict: 'Объявление изменили в другом окне — обновите список и повторите.', published_edit_requires_stop: 'Опубликованное сначала снимите с показа, потом правьте.', field_not_for_design: 'Поле не подходит этому шаблону — проверьте дату, арт, кнопку и тему.', invalid_cta: 'Кнопка у этого шаблона не предусмотрена.', unknown_content_field: 'Сервер не знает одно из полей — нужна выкладка сервера с контрактом объявлений 2.0.', text_too_long: 'Текст длиннее лимита.', empty_story: 'Пустое объявление.' }; for (const [k, v] of Object.entries(map)) if (m.includes(k)) return v; return m; }

async function load() {
  say('Загружаем объявления…');
  try {
    const fn = await callable('adminStoryAnnouncementsList'); const r = await fn({}); const items = r?.data?.items || r?.items || [];
    S.rows = items.map((row) => ({ ...row, form: fromRow(row) })); S.loaded = true;
    say(`${S.rows.length} объявлений · шаблонов 2.0: ${S.rows.filter((x) => x.form.design).length}`);
    log('список', { rows: S.rows.length, v2: S.rows.filter((x) => x.form.design).length });
  } catch (e) { say(human(e), true); log('список: ошибка', String(e)); }
  renderList();
}

async function command(action) {
  if (S.busy || !S.current) return;
  const f = S.current; const issues = action === 'stop' ? [] : problems(f, action);
  if (issues.length) { say(issues.join(' '), true); return; }
  const verb = { save: 'Сохранить черновик', publish: 'Опубликовать', stop: 'Снять с показа' }[action];
  if (action === 'publish' && !window.confirm('Опубликовать это объявление для всех? Срок показа начнётся сейчас.')) return;
  if (action === 'stop' && !window.confirm('Снять объявление с показа? Текст останется в черновиках.')) return;
  S.busy = true; renderForm(); say(`${verb}…`);
  const payload = { id: f.id, expectedRevision: f.revision, operationId: uuid(), action, ...(action === 'stop' ? {} : { content: toContent(f) }) };
  log('команда →', { action, id: f.id, expectedRevision: f.revision, design: f.design });
  try {
    const fn = await callable('adminStoryAnnouncementCommand'); const r = await fn(payload); const data = r?.data || r;
    // зачем (Optimistic UI, правило владельца): ответ сервера сразу становится состоянием формы — повторный тап не уйдёт со старой ревизией
    f.revision = Number(data?.revision ?? f.revision + 1); f.status = action === 'publish' ? 'published' : action === 'stop' ? 'draft' : f.status === 'published' ? 'published' : 'draft';
    say({ save: 'Черновик сохранён.', publish: 'Опубликовано — появится у людей при следующем обновлении ленты.', stop: 'Снято с показа.' }[action]);
    log('команда ←', { action, revision: f.revision, status: f.status });
    await load();
  } catch (e) { say(human(e), true); log('команда: ошибка', String(e)); }
  S.busy = false; renderForm();
}

// ── предпросмотр ──────────────────────────────────────────────────────────────────────────────────────────────────
function pushPreview() {
  if (!frame?.contentWindow || !S.previewReady || !S.current) return;
  const f = S.current; const content = toContent(f); content.title = f.title; content.badge = f.badge; content.blocks = f.blocks.map((b) => ({ ...b }));
  frame.contentWindow.postMessage({ channel: 'pm-ann-preview', content, theme: S.theme, ap: S.ap }, '*');
}
function schedulePreview() { clearTimeout(debounce); debounce = setTimeout(pushPreview, 150); }
window.addEventListener('message', (e) => {
  if (!frame || e.source !== frame.contentWindow || e.data?.channel !== 'pm-ann-preview-ready') return;
  S.designs = e.data.designs || []; S.themes = e.data.themes || []; S.previewReady = true;
  log('предпросмотр готов', { designs: S.designs.length, themes: S.themes.length });
  renderForm(); pushPreview();
});

// ── отрисовка ─────────────────────────────────────────────────────────────────────────────────────────────────────
function renderList() {
  if (!listEl) return; listEl.replaceChildren();
  listEl.append(h('button', { class: 'ann2-btn ann2-btn--primary', type: 'button', onclick: () => { S.current = blank(); renderForm(); pushPreview(); } }, 'Новое объявление'));
  for (const row of S.rows) {
    const f = row.form; const d = S.designs.find((x) => x.id === f.design);
    const item = h('button', { class: 'ann2-row' + (S.current?.id === f.id ? ' ann2-row--on' : ''), type: 'button', onclick: () => { S.current = { ...f, blocks: f.blocks.map((b) => ({ ...b })) }; renderForm(); pushPreview(); } },
      h('span', { class: 'ann2-row__status', 'data-status': f.status }, f.status === 'published' ? 'в показе' : 'черновик'),
      h('span', { class: 'ann2-row__title' }, f.title || f.badge || '(без заголовка)'),
      h('span', { class: 'ann2-row__meta' }, d ? d.name : f.design ? f.design : `старый шаблон · ${row.content?.templateId || row.templateId || ''}`));
    listEl.append(item);
  }
}

function field(label, control) { return h('label', { class: 'ann2-field' }, h('span', { class: 'ann2-field__label' }, label), control); }
function input(value, max, on, attrs = {}) { const e = h('input', { class: 'ann2-input', type: 'text', value, maxlength: max, ...attrs }); e.addEventListener('input', () => { on(e.value); schedulePreview(); renderCounters(); }); return e; }
function select(options, value, on, attrs = {}) { const e = h('select', { class: 'ann2-input', ...attrs }); for (const [v, t, group] of options) { const o = h('option', { value: v }, t); if (group) { let g = [...e.children].find((x) => x.tagName === 'OPTGROUP' && x.label === group); if (!g) { g = h('optgroup', { label: group }); e.append(g); } g.append(o); } else e.append(o); } e.value = value; e.addEventListener('change', () => { on(e.value); schedulePreview(); renderForm(); }); return e; }
function renderCounters() { panel?.querySelectorAll('[data-count]').forEach((el) => { const [cur, max] = el.dataset.count.split('/'); const inp = el.previousElementSibling; if (inp) el.textContent = `${inp.value.length} / ${max}`; }); }

function renderForm() {
  if (!formEl) return; formEl.replaceChildren();
  const f = S.current;
  if (!f) { formEl.append(h('p', { class: 'ann2-empty' }, 'Выберите объявление слева или создайте новое.')); return; }
  const d = S.designs.find((x) => x.id === f.design);
  const designOptions = [['', '— шаблон —', null], ...S.designs.map((x) => [x.id, x.name, GROUPS[x.group] || x.group])];
  formEl.append(field('Шаблон', select(designOptions, f.design, (v) => { f.design = v; if (ART_DEFAULT[v] && !ARTS.includes(f.art)) f.art = ART_DEFAULT[v]; f.cta = !!CTA_BY_DESIGN[v]; })));
  if (descEl) descEl.textContent = d ? `${d.comp} · ${d.motion}${d.ext ? ` · нужно: ${d.ext}` : ''}` : '';
  const badge = field('Метка', input(f.badge, LIMITS.badge, (v) => { f.badge = v; })); badge.append(h('span', { class: 'ann2-count', 'data-count': `0/${LIMITS.badge}` })); formEl.append(badge);
  const title = field('Заголовок', input(f.title, LIMITS.title, (v) => { f.title = v; })); title.append(h('span', { class: 'ann2-count', 'data-count': `0/${LIMITS.title}` })); formEl.append(title);
  const blocks = h('div', { class: 'ann2-blocks' }, h('span', { class: 'ann2-field__label' }, f.design === 'poll' ? 'Варианты опроса (2–4)' : f.design === 'schedule' ? 'Остановки «время · событие»' : 'Блоки текста (до 4)'));
  f.blocks.forEach((b, i) => {
    const row = h('div', { class: 'ann2-block' });
    const ta = h('textarea', { class: 'ann2-input ann2-textarea', maxlength: LIMITS.block, rows: 2 }); ta.value = b.text; ta.addEventListener('input', () => { b.text = ta.value; schedulePreview(); });
    row.append(ta, select(SIZES.map((s) => [String(s), `${s} px`]), String(b.size), (v) => { b.size = Number(v); }), select(STYLES, b.style, (v) => { b.style = v; }),
      h('button', { class: 'ann2-btn ann2-btn--ghost', type: 'button', title: 'Убрать блок', onclick: () => { f.blocks.splice(i, 1); renderForm(); schedulePreview(); } }, '✕'));
    blocks.append(row);
  });
  if (f.blocks.length < 4) blocks.append(h('button', { class: 'ann2-btn ann2-btn--ghost', type: 'button', onclick: () => { f.blocks.push({ text: '', size: 16, style: 'normal' }); renderForm(); } }, '+ блок'));
  formEl.append(blocks);
  // поля шаблона
  if (f.design === 'date') { const dt = h('input', { class: 'ann2-input', type: 'datetime-local', value: f.eventAtMs ? new Date(f.eventAtMs - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '' }); dt.addEventListener('change', () => { f.eventAtMs = dt.value ? new Date(dt.value).getTime() : null; schedulePreview(); }); formEl.append(field('Дата события', dt)); }
  if (ART_DEFAULT[f.design]) formEl.append(field('Арт', select(ARTS.map((a) => [a, a]), f.art || ART_DEFAULT[f.design], (v) => { f.art = v; })));
  if (f.design === 'video') formEl.append(field('Ролик (id из ленты «Видео»; пусто — первый ролик)', input(f.videoId, 100, (v) => { f.videoId = v; })));
  if (f.design === 'theme') formEl.append(field('Тема для образца', select([['', '— текущая —'], ...S.themes.map((t) => [t.id, t.name])], f.themeId, (v) => { f.themeId = v; })));
  if (CTA_BY_DESIGN[f.design]) { const cb = h('input', { type: 'checkbox' }); cb.checked = f.cta; cb.addEventListener('change', () => { f.cta = cb.checked; schedulePreview(); }); formEl.append(h('label', { class: 'ann2-check' }, cb, ` Кнопка «${{ open_plus: 'Открыть Plus', share_invite: 'Поделиться ссылкой', use_theme: 'Включить тему' }[CTA_BY_DESIGN[f.design]]}» (как в макете)`)); }
  // срок и длительность
  const term = h('div', { class: 'ann2-inline' });
  const lt = h('input', { class: 'ann2-input ann2-input--s', type: 'number', min: 1, max: 365, value: f.lifetime }); lt.addEventListener('input', () => { f.lifetime = Number(lt.value) || 1; });
  term.append(field('Срок показа', lt), field('', select([['days', 'дней'], ['hours', 'часов']], f.unit, (v) => { f.unit = v; })), field('Кадр', select(DURATIONS.map((ms) => [String(ms), `${ms / 1000} с`]), String(f.durationMs), (v) => { f.durationMs = Number(v); })));
  formEl.append(term);
  // действия
  const actions = h('div', { class: 'ann2-actions' },
    h('span', { class: 'ann2-status', 'data-status': f.status }, f.status === 'published' ? `в показе · ревизия ${f.revision}` : f.revision ? `черновик · ревизия ${f.revision}` : 'новое'),
    f.status === 'published' ? h('button', { class: 'ann2-btn', type: 'button', disabled: S.busy || null, onclick: () => command('stop') }, 'Снять с показа') : null,
    f.status !== 'published' ? h('button', { class: 'ann2-btn', type: 'button', disabled: S.busy || null, onclick: () => command('save') }, 'Сохранить черновик') : null,
    h('button', { class: 'ann2-btn ann2-btn--primary', type: 'button', disabled: S.busy || (f.design === 'poll' && !POLL_PUBLISH_ENABLED) || null, title: f.design === 'poll' && !POLL_PUBLISH_ENABLED ? 'Опрос: публикация откроется после выкладки storyPollVote' : null, onclick: () => command('publish') }, f.status === 'published' ? 'Опубликовать заново' : 'Опубликовать'));
  if (f.design === 'poll' && !POLL_PUBLISH_ENABLED) actions.append(h('span', { class: 'ann2-status' }, 'опрос: публикация откроется после выкладки голосования'));
  formEl.append(actions);
  renderCounters();
}

function renderPreviewBar(bar) {
  bar.replaceChildren(
    select([['ink', 'Сумерки (ink)'], ...S.themes.filter((t) => t.id !== 'ink').map((t) => [t.id, t.name])], S.theme, (v) => { S.theme = v; }),
    select([['dark', 'Тёмное'], ['light', 'Светлое']], S.ap, (v) => { S.ap = v; }),
    h('button', { class: 'ann2-btn ann2-btn--ghost', type: 'button', onclick: pushPreview }, 'Повторить'));
}

function mount() {
  const tab = document.getElementById('tab-stories'); if (!tab || !window.__pmAdminCore || panel) return false;
  const css = h('link', { rel: 'stylesheet', href: 'scripts/pages/story_announcements_v2.css' }); document.head.append(css);
  panel = h('section', { class: 'ann2', 'aria-label': 'Объявления 2.0' });
  noticeEl = h('p', { class: 'ann2-notice' });
  descEl = h('p', { class: 'ann2-desc' });
  listEl = h('div', { class: 'ann2-list' });
  formEl = h('div', { class: 'ann2-form' });
  frame = h('iframe', { class: 'ann2-frame', src: PREVIEW_URL, title: 'Предпросмотр объявления', sandbox: 'allow-scripts allow-same-origin' });
  const bar = h('div', { class: 'ann2-previewbar' });
  panel.append(
    h('div', { class: 'ann2-head' }, h('h3', { class: 'ann2-title' }, 'Объявления 2.0 · 36 шаблонов макета'), h('button', { class: 'ann2-btn ann2-btn--ghost', type: 'button', onclick: () => load() }, 'Обновить список'), noticeEl),
    h('div', { class: 'ann2-grid' }, h('div', { class: 'ann2-col ann2-col--list' }, listEl), h('div', { class: 'ann2-col ann2-col--form' }, descEl, formEl), h('div', { class: 'ann2-col ann2-col--preview' }, bar, h('div', { class: 'ann2-phone' }, frame))));
  tab.prepend(panel);
  renderPreviewBar(bar); renderList(); renderForm();
  // зачем: превью отправляет список шаблонов и тем после загрузки — до этого форма без списка; темы в панели обновятся тогда же
  window.addEventListener('message', (e) => { if (frame && e.source === frame.contentWindow && e.data?.channel === 'pm-ann-preview-ready') renderPreviewBar(bar); });
  load();
  log('редактор 2.0 смонтирован');
  return true;
}
if (!mount()) { const timer = setInterval(() => { if (mount()) clearInterval(timer); }, 500); setTimeout(() => clearInterval(timer), 120000); }
})();
