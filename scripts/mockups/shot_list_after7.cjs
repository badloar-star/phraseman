// зачем (координатор 15.10, до 07:20): один файл «СПИСОК СЪЁМКИ после №7» для Сверки — каждая строка: id → точная dev_state-ссылка / шаги →
// язык → тема; сгруппировано по экрану (маршрут next=), чтобы снимать одним проходом. Источники только читаются:
// DEV_LINKS_R1.md (ссылки Дизайна), CLOSE_AFTER_SHOT_<дата>.md (49+38+6), visual_parity.json (экран, образец, заметки отличий).
// usage: node scripts/mockups/shot_list_after7.cjs
const fs = require('fs'); const path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, '..', '..');
const log = (...a) => console.log('[SHOT-LIST-7]', ...a);
const DL = fs.readFileSync(path.join(ROOT, 'docs/phraseman-2.0/DEV_LINKS_R1.md'), 'utf8').split('\n');
const CAS = fs.readFileSync(path.join(ROOT, 'docs/phraseman-2.0/evidence/parity_moments_v1/CLOSE_AFTER_SHOT_2026-10-15.md'), 'utf8').split('\n');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/phraseman-2.0/registries/visual_parity.json'), 'utf8'));
const byId = new Map(REG.rows.map((r) => [r.id, r]));

// ссылки Дизайна: | id | экран · состояние | ссылка / путь | перед кадром | shot list | тапы | уникальна | образец |
const links = new Map(); let area = '';
for (const l of DL) {
  const h = l.match(/^## (.+?)(?: \(\d+\))?$/); if (h) { area = h[1].replace(/ \(.*$/, ''); continue; }
  const m = l.match(/^\| ([a-z0-9-]+) \|/); if (!m) continue;
  const c = l.split(' | '); const link = (c[2] || '').match(/`([^`]+)`/);
  links.set(m[1], { area, link: link ? link[1] : (c[2] || '').trim(), before: (c[3] || '').trim(), taps: (c[5] || '').trim(), unique: (c[6] || '').trim() });
}
// строки без ссылки в DEV_LINKS — путь собран вручную (Макеты 15.10) из соседних строк и параметров dev_state
{ const d27 = links.get('dialogs-027');
  // зачем (координатор 15.10): образец dialogs-028 показывает недостижимую в коде комбинацию (при limit_reached тап по микрофону
  // сразу открывает Plus, app/dialogue_v2_session.tsx:759) — строка делится на два реальных кадра
  if (d27) {
    links.set('dialogs-028·а', { area: d27.area, link: d27.link.replace('speech=no_speech', 'speech=denied'), taps: d27.taps, unique: 'нет',
      before: 'только speech=denied (попытки есть): после тапа по микрофону — «Нет доступа к микрофону» (hooks/use_dialogue_v2_voice_message.ts:247)' });
    links.set('dialogs-028·б', { area: d27.area, link: d27.link.replace('speech=no_speech&', '').replace('dev_dialog_send=ok', 'dev_dialog_send=ok&dev_dialog_voice=spent'),
      taps: d27.taps.replace(/;\s*long:#dialogue-v2-voice-input;\s*wait:\d+/, ''), unique: 'нет',
      before: 'только dev_dialog_voice=spent: бейдж PLUS на микрофоне БЕЗ тапа (тап откроет Plus — не нажимать; dialogue_v2_session.tsx:824)' });
  } }
  links.set('learn-064', { area: 'Обучение, монеты, видео, окна знакомства', link: 'phraseman://dev_state?onboarding=done&intros=seen&plus=on&overlays=off&next=/lesson_irregular_verbs?id=12', taps: 'tap:Словарь', unique: 'нет',
    before: 'проверено по коду: экран открывается на вкладке «Учить» (упражнение; lesson_irregular_verbs.tsx:1201 tab по умолчанию learn), параметра для таблицы нет — таблица = тап по вкладке «Словарь» (точный текст, parity_steps ищет сначала точное совпадение). В данных урока 12 — 10 глаголов, в образце «18 глаголов» — данные. dev-плашку «Open debugger…» закрыть до кадра' });
log('ссылок в DEV_LINKS', links.size);

// цели: 49+38+6 из CLOSE_AFTER_SHOT + особые строки координатора
const targets = new Map(); let sect = '';
for (const l of CAS) { const h = l.match(/^## (\d)\./); if (h) { sect = h[1]; continue; } const m = l.match(/^\| ([a-z0-9-]+) \|/); if (m && m[1] !== 'id') targets.set(m[1], { why: `закрыть после №7 (раздел ${sect})` }); }
const SPECIAL = {
  'spire-gap-016': 'пересъёмка: образец уже по коду — энергия в шапке Пика значком и числом, без капсулы',
  'paywalls-009': 'пересъёмка: карточка Plus на итоге первого урока (upsell=first_lesson)',
  'paywalls-010': 'пересъёмка: карточка Plus на итоге после трёх уроков (upsell=three_lessons)',
  'dialogs-028·а': 'кадр (а) из двух: «Нет доступа к микрофону» — комбинация образца недостижима, по коду (dialogue_v2_session.tsx:759)',
  'dialogs-028·б': 'кадр (б) из двух: бейдж PLUS на микрофоне без тапа — комбинация образца недостижима, по коду (dialogue_v2_session.tsx:759)',
  'cards-section-056': 'пересъёмка: пилюля «30/30» (D174, код исправлен 35b049b62)',
  'dialogs-040': 'первый кадр (кадра нет)', 'dialogs-042': 'первый кадр (кадра нет)', 'dialogs-044': 'первый кадр (кадра нет)',
  'cards-002': 'uk → ru: проверить перенос «Правда / неправда» на ru', 'cards-section-032': 'uk → ru: проверить перенос «Правда / неправда» на ru',
  'learn-064': 'не то состояние: нужен экран-таблица неправильных глаголов «Урок 12 · 18 глаголов» (вкладки «Словарь / Учить»), без dev-плашки «Open debugger…»',
  'spire-gap-022': 'добавлено по Дизайну 15.10: пересъёмка на аккаунте без Plus и с друзьями — энергия (SpireEnergyPill без капсулы) и «Друзья на этой неделе» в коде есть',
  'cards-gap-023': 'после правки Дизайна (окно 06:30): меню фильтра открыть и сверить лог [CARDS-FILTER-MENU] с образцом №23 — низ шапки ≈95, верх меню 106 (insets.top + 56), right 16, width 200',
  'settings-gap-035': 'без клавиатуры: ввести < 10 символов, затем скрыть клавиатуру (back) — карточка диагностики не перекрыта',
};
for (const [id, why] of Object.entries(SPECIAL)) targets.set(id, { why: targets.has(id) ? targets.get(id).why + '; ' + why : why });
log('целей', targets.size);

const route = (link) => { const m = String(link).match(/next=([^&%?]+)/); return m ? m[1] : (String(link).startsWith('phraseman://') ? String(link).replace(/\?.*$/, '') : 'вручную'); };
const theme = (link, r) => { const t = String(link).match(/theme=([a-z_]+)/); const light = (r && (r.diffs || []).some((d) => /СВЕТЛОЙ теме/.test(String(d)))) ? ' — прошлый кадр был в светлой, снимать тёмную' : '';
  return (t ? t[1] : 'Аврора тёмная (Спокойно), по умолчанию') + light; };
const groups = new Map(); const missing = [];
for (const [id, t] of targets) {
  const r = byId.get(id.split('·')[0]); const L = links.get(id);
  if (!L) missing.push(id);
  const key = `${L ? L.area : 'без ссылки в DEV_LINKS'} › ${L ? route(L.link) : 'вручную'}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ id, t, r, L });
}
const esc = (s) => String(s || '').replace(/\|/g, '\\|');
const out = ['# СПИСОК СЪЁМКИ после №7 — для Сверки (Макеты, 15.10)', '',
  'Координатор 15.10: Сверка берёт файл как есть, **если владелец разрешит эмулятор**. Порядок — по экранам (маршрут `next=`), чтобы снимать одним проходом.', '',
  '**Перед проходом (один раз):** язык интерфейса приложения — **Русский** (часть прошлых кадров снята на uk; `uiLang` в dev_state умеет только `en|off`). Правила перед КАЖДЫМ кадром — DEV_LINKS_R1.md §«Правила» (force-stop → ссылка → «DEV-STATE OK»; `overlays=off`; фикстуры карточек — только на анонимном госте).', '',
  `Строк: ${targets.size} (из CLOSE_AFTER_SHOT 49+38+6 и особые строки координатора). Без готовой ссылки в DEV_LINKS: ${missing.length ? missing.join(', ') : 'нет'}.`, '',
  '**Тем же проходом:** `SHOT_LIST_R1_REST_2026-10-15.md` (Дизайн, 23 строки остатка PARITY r1 — Карточки и др., со ссылками и шагами; пересечений с этим списком по id нет, проверено 15.10).', '',
  'Колонки: **ссылка / шаги** — из DEV_LINKS_R1.md (Дизайн), «тапы» — грамматика scripts/parity_steps.mjs; **зачем** — что подтвердить на кадре; язык у всех — ru.', ''];
let n = 0;
for (const [key, rows] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'))) {
  out.push(`## ${key} — ${rows.length}`, '', '| # | id | экран · состояние | ссылка / шаги | тапы | тема | зачем |', '|---|---|---|---|---|---|---|');
  for (const { id, t, r, L } of rows.sort((a, b) => a.id.localeCompare(b.id))) {
    n++;
    const st = r ? `${r.screen} · ${r.state}` : '(нет в реестре)';
    const link = L ? (L.link.startsWith('phraseman://') ? '`' + L.link + '`' : esc(L.link)) : '**нет ссылки — путь вручную по образцу**';
    out.push(`| ${n} | ${id} | ${esc(st)} | ${link}${L && L.before ? '<br>перед кадром: ' + esc(L.before).slice(0, 160) : ''} | ${L && L.taps && L.taps !== '—' ? esc(L.taps) : '—'} | ${esc(theme(L && L.link, r))} | ${esc(t.why)} |`);
  }
  out.push('');
}
const OUT = path.join(ROOT, 'docs/phraseman-2.0/evidence/parity_moments_v1/SHOT_LIST_AFTER_7_2026-10-15.md');
// зачем (координатор 15.10): каждый маршрут next= групп сверен с app/ (файл маршрута) и с DEV_LINKS_R1 — несуществующие в отдельный список
const routes = [...new Set([...groups.keys()].map((k) => k.split(' › ')[1]))];
const dlText = DL.join('\n'); const bad = [];
out.push('## Проверка маршрутов (по коду, без эмулятора)', '', '| маршрут next= | файл в app/ | строк с ним в DEV_LINKS |', '|---|---|---|');
for (const r of routes) { if (!r.startsWith('/')) { out.push(`| ${r} | — | — |`); continue; }
  const base = r.slice(1); const f = [base + '.tsx', base + '/index.tsx', base + '.ts'].find((x) => fs.existsSync(path.join(ROOT, 'app', x)));
  const n2 = dlText.split('next=' + r).length - 1; if (!f) bad.push(r);
  out.push(`| ${r} | ${f ? 'app/' + f : '**НЕТ**'} | ${n2} |`); }
out.push('', bad.length ? `Несуществующие маршруты: ${bad.join(', ')}.` : `Все ${routes.length} маршрутов существуют в app/ (dev_state принимает любой next=, начинающийся с «/», app/dev_state_fixtures.ts:544). /lesson_irregular_verbs нет в DEV_LINKS — ссылка learn-064 собрана Макетами.`, '');
fs.writeFileSync(OUT, out.join('\n')); log('записан', OUT, 'строк', n, 'групп', groups.size, 'без ссылки', missing.length, missing.join(','));
