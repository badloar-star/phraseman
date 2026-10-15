// зачем (координатор 14.10: «сократи число кругов гейта»): лист приёмки момента — каждый элемент эталона с ТОЧНЫМИ значениями
// (текст ru/uk с ключом строки кода, кегль/вес/межстрочный, место и отступы, радиус, токен темы вместо hex, ассет/иконка с путём
// в коде, когда появляется и исчезает, звук-событие тайм-листа). Исполнитель сверяется по листу ДО запроса кадров.
// usage (из корня репозитория, сервер образцов поднят, ОДИН браузер):
//   node scripts/mockups/acceptance_sheet.cjs m01,m02 [engagement-moments-v3-all.html]      env: OUT, MOCKUP_URL, VARIANTS=m14-A
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const OUT = process.env.OUT || path.join(ROOT, 'docs', 'phraseman-2.0', 'evidence', 'parity_moments_v1');
const BASE = (process.env.MOCKUP_URL || 'http://127.0.0.1:8765/').replace(/\/?$/, '/');
const IDS = (process.argv[2] || '').split(',').filter(Boolean);
const PAGE = process.argv[3] || 'engagement-moments-v3-all.html';
const ONLY_VARS = (process.env.VARIANTS || '').split(',').filter(Boolean);
// зачем: блок «Сегодня» Главной — часть момента только у колец (m11 и сторис колец); у остальных моментов это подложка, в лист не идёт
// часть подложки, которая принадлежит моменту: кольца «Сегодня» (m11), кольцо сторис у аватара (s1); env UNDER_PART='m11=[data-today-slot];s1=[data-ring]'
const UNDER_PART = Object.fromEntries((process.env.UNDER_PART || 'm11=[data-today-slot];s1=[data-ring]').split(';').filter(Boolean).map((x) => x.split('=')));
const THEMES = [['aurora-dark', 0, 'grad_aurora:dark'], ['aurora-light', 1, 'grad_aurora:light'], ['iris-light', 2, 'grad_iris:light']];
const log = (...a) => console.log('[ACCEPT]', ...a);

// ---------- строки кода: ключ → ru/uk (таблицы «Nine») ----------
// зачем (координатор 15.10: листы m05/m09/m17): строки моментов живут в *_strings.ts разных зон (spire, streak, stories, lesson_moments,
// dialog_moments, coin_rank_moments, welcome_back…) — находим все такие файлы в components/ и modules/, а не держим ручной список.
const STRING_FILES = [];
(function walkS(d) { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = d + '/' + e.name; if (e.isDirectory()) { if (!/node_modules|__tests__/.test(e.name)) walkS(rel); } else if (/_strings\.ts$/.test(e.name)) STRING_FILES.push(rel); } })('components');
(function walkS(d) { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = d + '/' + e.name; if (e.isDirectory()) { if (!/node_modules|__tests__/.test(e.name)) walkS(rel); } else if (/_strings\.ts$/.test(e.name)) STRING_FILES.push(rel); } })('modules');
const STR = [];
for (const f of STRING_FILES) {
  const p = path.join(ROOT, f); if (!fs.existsSync(p)) { log('нет файла строк', f); continue; }
  const src = fs.readFileSync(p, 'utf8');
  // зачем (Темы 15.10): строки бывают и в таблицах по числу («7: ['Первая неделя', …]» внутри const TITLES) — ключ пишем как TITLES[7]
  const re = /(?:^\s*([A-Za-z_]\w*|\d+)\s*:\s*\[|const\s+([A-Z_][A-Z0-9_]*)\s*:\s*Nine\s*=\s*\[)\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'/gm;
  let m; while ((m = re.exec(src))) { let key = m[1] || m[2]; if (/^\d+$/.test(key)) { const owner = [...src.slice(0, m.index).matchAll(/const\s+([A-Za-z_]\w*)\s*[:=]/g)].pop(); key = `${owner ? owner[1] : '?'}[${key}]`; }
    STR.push({ file: f, key, ru: m[3].replace(/\\'/g, "'"), uk: m[4].replace(/\\'/g, "'") }); }
}
log('строк кода', STR.length);
const esc = (s) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
const tplRe = (ru) => new RegExp('^' + esc(ru).replace(/\\?\{[a-zA-Z]+\\?\}/g, '(.+?)').replace(/\{[a-zA-Z]+\}/g, '(.+?)') + '$', 'i');
function codeString(text) {
  const t = text.replace(/\s+/g, ' ').trim(); if (!t) return null;
  for (const s of STR) { try { if (tplRe(s.ru).test(t)) return { exact: true, ...s }; } catch (e) { log('шаблон не собрался', s.key, e.message); } }
  const parts = STR.filter((s) => s.ru.replace(/\{[a-zA-Z]+\}/g, '\u0000').split('\u0000').some((frag) => frag.trim().length >= 5 && t.includes(frag.trim())));
  return parts.length ? { exact: false, parts } : null;
}

// ---------- токены темы (настоящие liquidGlassTokens, собраны esbuild-ом в tokens.json) ----------
// зачем: токены считаем из текущего кода при каждом запуске (esbuild-бандл liquidGlassThemePalette.ts), а не из сохранённого файла — лист не устареет.
function buildTokens() {
  try { const esb = require('esbuild'); const { execFileSync } = require('child_process'); const tmp = path.join(require('os').tmpdir(), 'acceptance_tokens'); fs.mkdirSync(tmp, { recursive: true });
    const entry = path.join(tmp, 'entry.ts'); const out = path.join(tmp, 'out.cjs'); const mod = path.join(ROOT, 'constants', 'liquidGlassThemePalette').split(path.sep).join('/');
    fs.writeFileSync(entry, `import { liquidGlassTokens } from ${JSON.stringify(mod)};
const o: Record<string, unknown> = {};
for (const id of ['grad_aurora', 'grad_iris']) for (const appearance of ['dark', 'light'] as const) o[id + ':' + appearance] = liquidGlassTokens(id, { intensity: 1, appearance } as never);
console.log(JSON.stringify(o));
`);
    esb.buildSync({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'error', external: ['react-native', 'expo-*', '@react-native-async-storage/*'] });
    return JSON.parse(execFileSync(process.execPath, [out]).toString()); } catch (e) { log('токены не собрались — цвета будут hex:', e.message.slice(0, 160)); return {}; }
}
const TOK = buildTokens(); log('тем токенов', Object.keys(TOK).length);
const PRIORITY = ['text', 'secondary', 'mutedText', 'accent', 'accentText', 'accentBright', 'accentInk', 'cta', 'ctaInk', 'ctaFill', 'bg', 'bgTop', 'opaqueCard', 'opaqueSheet', 'opaqueControl', 'card', 'sheet', 'line', 'accentSoft', 'accentTile', 'accentGraphic', 'accentTextSafe'];
const hexToRgba = (h) => { const x = h.replace('#', ''); const n = (i) => parseInt(x.slice(i, i + 2), 16); return [n(0), n(2), n(4), x.length >= 8 ? n(6) / 255 : 1]; };
function parseColor(c) {
  if (!c) return null; let m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  m = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
  if (m) return [Math.round(m[1] * 255), Math.round(m[2] * 255), Math.round(m[3] * 255), m[4] === undefined ? 1 : +m[4]];
  return null;
}
const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase() + (c[3] < 0.999 ? Math.round(c[3] * 255).toString(16).padStart(2, '0').toUpperCase() : '');
function tokenOf(css, themeKey) {
  const c = parseColor(css); if (!c || c[3] < 0.01) return null;
  const t = TOK[themeKey] || {}; const hits = [];
  for (const [k, v] of Object.entries(t)) { if (typeof v !== 'string' || !/^#[0-9A-Fa-f]{6,8}$/.test(v)) continue; const r = hexToRgba(v);
    if (Math.abs(r[0] - c[0]) <= 2 && Math.abs(r[1] - c[1]) <= 2 && Math.abs(r[2] - c[2]) <= 2 && Math.abs(r[3] - c[3]) <= 0.03) hits.push(k); }
  hits.sort((a, b) => (PRIORITY.indexOf(a) + 1 || 99) - (PRIORITY.indexOf(b) + 1 || 99));
  return hits.length ? hits.slice(0, 2).join(' / ') : (codeColor(c) || `нет токена ${hex(c)}`);
}

// ---------- постоянные цвета кода (не токены темы, напр. STREAK_PLATE_BG) ----------
// зачем (Темы 15.10): плашка цифры на огне — намеренная константа кода, одинаковая во всех темах; называем её, а не пишем «нет токена»
const CODE_COLORS = [];
(function walkC(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|__tests__/.test(e.name)) walkC(p); continue; } if (!/\.(tsx?|js)$/.test(e.name)) continue;
  const src = fs.readFileSync(p, 'utf8'); const re = /const\s+([A-Z][A-Z0-9_]+)\s*=\s*['"](#[0-9A-Fa-f]{6,8}|rgba?\([\d.,\s]+\))['"]/g; let m;
  while ((m = re.exec(src))) CODE_COLORS.push({ name: m[1], file: path.relative(ROOT, p).split(path.sep).join('/'), c: m[2] }); } })(path.join(ROOT, 'components'));
const codeColor = (c) => { for (const k of CODE_COLORS) { const r = k.c.startsWith('#') ? hexToRgba(k.c) : parseColor(k.c); if (r && Math.abs(r[0] - c[0]) <= 2 && Math.abs(r[1] - c[1]) <= 2 && Math.abs(r[2] - c[2]) <= 2 && Math.abs(r[3] - c[3]) <= 0.03) return `${k.name} (${k.file.split('/').pop()}, постоянная кода)`; } return null; };
// ---------- ассеты: имя файла → путь в коде ----------
const ASSETS = new Map();
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (!ASSETS.has(e.name)) ASSETS.set(e.name, path.relative(ROOT, p).replace(/\\/g, '/')); } })(path.join(ROOT, 'assets'));
const assetInCode = (src) => { const b = decodeURIComponent(src.split('/').pop().split('?')[0]); const v2 = src.match(/v2art\/(dark|light)\/([\w.]+)/); if (v2) return `assets/images/v2art/${v2[1]}/${v2[2]}`; return ASSETS.get(b) || `нет в assets/ (${b})`; };
const GLYPH = (() => { try { const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/@expo/.ignored_vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'), 'utf8')); const r = {}; for (const [k, v] of Object.entries(m)) if (!r[v]) r[v] = k; return r; } catch (e) { log('нет карты Ionicons', e.message); return {}; } })();

// ---------- снятие одного варианта в одной теме ----------
async function sampleVariant(pg, vid, total, partSel) {
  const vr = await pg.$(`[data-vid="${vid}"]`); if (!vr) { log('нет варианта', vid); return null; }
  await vr.scrollIntoViewIfNeeded(); const rp = await vr.$('[data-replay]'); if (!rp) { log('нет «Повторить»', vid); return null; }
  await pg.evaluate(() => { window.__acc = null; });
  await rp.click();
  await pg.evaluate(({ vid, partSel }) => {
    const t0 = performance.now(); const ids = new WeakMap(); let n = 0; const rec = new Map();
    const KEEP = /\b(cta|cc|ib|pill|chip|toast|modal|sheet|full|card|sf|say|tag|badge|ring|rw|fire|flame)\b/;
    const vis = (el, ph) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const pr = ph.getBoundingClientRect(); if (r.right < pr.left || r.left > pr.right || r.bottom < pr.top || r.top > pr.bottom) return false;
      let o = 1; for (let e = el; e && e !== ph.parentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; o *= +cs.opacity; } return o >= 0.1; };
    const tick = () => { const ph = document.querySelector(`[data-vid="${vid}"] .em-ph`); if (!ph) return; const t = Math.round(performance.now() - t0);
      for (const el of ph.querySelectorAll('*')) {
        if (el.closest('.sb, .hi')) continue; const under = el.closest('.scr .in'); if (under && !(partSel && el.closest(partSel))) continue;
        // зачем: «До топ-5 не хватило <b>240</b>.» — строка целиком; жирный фрагмент — пометкой у строки, а не отдельной строкой
        const inlineKids = (x) => x.children.length > 0 && [...x.children].every((c) => /^(B|STRONG|I|EM|S|SPAN)$/.test(c.tagName) && !c.classList.contains('io') && !c.classList.contains('ar') && getComputedStyle(c).display === 'inline');
        if (el.parentElement && inlineKids(el.parentElement) && [...el.parentElement.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
        const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()); const tag = el.tagName;
        const cls = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '';
        if (!(own || tag === 'IMG' || tag === 'CANVAS' || (tag === 'svg' && !el.parentElement.closest('svg')) || KEEP.test(cls) || el.classList.contains('io'))) continue;
        if (!ids.has(el)) ids.set(el, ++n); const id = ids.get(el); const v = vis(el, ph);
        const r = rec.get(id) || { id, first: null, last: null }; if (v) { if (r.first === null) r.first = t; r.last = t; } r.el = el; rec.set(id, r); } };
    window.__acc = { rec, timer: setInterval(tick, 80), tick };
  }, { vid, partSel });
  await pg.waitForTimeout(Math.max(1500, total * 1000 + 1200));
  return pg.evaluate(({ vid }) => {
    const A = window.__acc; clearInterval(A.timer); A.tick(); const ph = document.querySelector(`[data-vid="${vid}"] .em-ph`); const pr = ph.getBoundingClientRect(); const out = [];
    for (const r of A.rec.values()) { if (r.first === null) continue; const el = r.el; const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); const alive = el.isConnected;
      const inl = el.children.length > 0 && [...el.children].every((c) => /^(B|STRONG|I|EM|S|SPAN)$/.test(c.tagName) && !c.classList.contains('io') && !c.classList.contains('ar') && getComputedStyle(c).display === 'inline');
      const own = (inl ? el.textContent : [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' ')).replace(/\s+/g, ' ').trim();
      const frag = inl ? [...el.children].map((c) => `«${c.textContent.trim()}» ${getComputedStyle(c).fontWeight}`).join(', ') : '';
      const cls = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '';
      out.push({ id: r.id, first: r.first, last: r.last, alive, tag: el.tagName.toLowerCase(), cls: cls.trim().slice(0, 40), text: own.slice(0, 90), frag, full: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
        src: el.tagName === 'IMG' ? el.getAttribute('src') : '', glyph: el.classList.contains('io') ? (el.textContent || '').codePointAt(0) : null,
        x: Math.round(b.left - pr.left), y: Math.round(b.top - pr.top), w: Math.round(b.width), h: Math.round(b.height),
        fs: cs.fontSize, lh: cs.lineHeight, fw: cs.fontWeight, ls: cs.letterSpacing, tt: cs.textTransform, color: cs.color, bg: cs.backgroundColor, bgi: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 80) : '',
        rad: cs.borderRadius, pad: cs.padding, sh: cs.boxShadow !== 'none' ? cs.boxShadow.slice(0, 70) : '' }); }
    return { endAt: Math.round(performance.now()), items: out };
  }, { vid });
}

(async () => {
  if (!IDS.length) { console.log('usage: node scripts/mockups/acceptance_sheet.cjs m01,m02 [page.html]'); process.exit(2); }
  const br = await chromium.launch(); const meta = {}; const data = {};
  for (const [tn, clicks, tk] of THEMES) {
    const pg = await br.newPage({ viewport: { width: 1400, height: 1100 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
    // зачем (сбой 15.10 06:12: page.goto 'load' 30 с — страница с роликами не успевает «load»): грузим как проверка разметки —
    // domcontentloaded + ждём фреймворк EM, 2 попытки; не загрузилась — падаем с понятной причиной, листы не перезаписываются
    let loaded = false; for (let k = 0; k < 2 && !loaded; k++) { try { await pg.goto(BASE + PAGE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 }); await pg.waitForFunction(() => window.EM && document.querySelector('[data-vid]'), null, { timeout: 30000 }); loaded = true; } catch (e) { console.warn('[ACCEPT-SHEET] загрузка', PAGE, 'попытка', k + 1, e.message.split(String.fromCharCode(10))[0]); } }
    if (!loaded) throw new Error(`[ACCEPT-SHEET] ${PAGE} не загрузился за 2 попытки — листы не обновлены`);
    await pg.waitForTimeout(1200);
    for (let k = 0; k < clicks; k++) { await pg.click('#em-theme'); await pg.waitForTimeout(200); }
    await pg.addStyleTag({ content: '.em-ph { width: 412px !important; height: 915px !important; } .em-toc, .em-top { position: static !important; }' });
    const ms = await pg.evaluate((ids) => EM.MOMENTS.filter((m) => ids.includes(m.id)).map((m) => ({ id: m.id, title: m.title, lead: (m.lead || '').replace(/<[^>]+>/g, ''),
      vars: m.variants.map((v, j) => ({ vid: `${m.id}-${v.k || j}`, k: v.k || String(j), label: (v.label || '').replace(/<[^>]+>/g, ''), total: v.total || 0, beats: (v.beats || []).map((b) => ({ t: b.t, w: (b.w || '').replace(/<[^>]+>/g, ''), s: b.s || '', h: b.h || '', big: !!b.big })) })) })), IDS);
    for (const m of ms) { meta[m.id] = m;
      for (const v of m.vars) { if (ONLY_VARS.length && !ONLY_VARS.includes(v.vid)) continue;
        const maxT = Math.max(0, ...v.beats.map((b) => b.t)); const total = Math.max(v.total || 0, maxT + 0.9);
        const r = await sampleVariant(pg, v.vid, total, UNDER_PART[m.id] || null); if (!r) continue; data[v.vid] = data[v.vid] || {}; data[v.vid][tn] = r.items; log(tn, v.vid, 'элементов', r.items.length); } }
    log(tn, 'JS', errs.length, errs[0] || ''); await pg.close(); }
  await br.close();

  // ---------- запись листов ----------
  const idx = fs.existsSync(path.join(ROOT, 'docs/phraseman-2.0/evidence/etalon_v3/index.md')) ? fs.readFileSync(path.join(ROOT, 'docs/phraseman-2.0/evidence/etalon_v3/index.md'), 'utf8') : '';
  for (const id of IDS) { const m = meta[id]; if (!m) { log('момента нет на странице', id); continue; }
    const row = idx.split('\n').find((l) => l.startsWith(`| [${id}]`)); const cols = row ? row.split('|').map((x) => x.trim()) : [];
    const L = [`# Лист приёмки — ${id} · ${m.title}`, '',
      `Эталон: \`docs/design/v2-app/${PAGE}\` → момент **${id}**, телефон 412×915. Кадры: \`docs/phraseman-2.0/evidence/etalon_v3/${id}/\` (полный набор — \`C:/Temp/claude/etalon_v3/${id}/\`).`,
      cols.length > 4 ? `Компоненты кода: ${cols[3]} · ответственная сессия: **${cols[4]}**.` : '', '',
      'Как читать: значения сняты из эталона автоматически (scripts/mockups/acceptance_sheet.cjs). Текст — ru из эталона; ключ и uk — из строковой таблицы кода, если строка там есть («нет в строках кода» = текста нет ни в одной таблице — сверить/добавить). Цвет — токен `liquidGlassTokens` темы (grad_aurora тёмная/светлая, grad_iris светлая); «нет токена #…» = цвет образца без точного токена — сверить с компонентом. Место — x/y/ширина/высота в dp от левого верхнего угла экрана 412×915. «Появляется» — мс от старта момента; «уходит» — мс, когда элемент перестал быть виден (до финала).', '',
      m.lead ? `> ${m.lead}` : '', ''];
    for (const v of m.vars) { const D = data[v.vid]; if (!D) continue; const base = D['aurora-dark'] || Object.values(D)[0];
      L.push(`## Вариант ${v.k} — ${v.label}`, '', '### Тайм-лист', '', '| t, с | что | звук-событие V2 | хаптик |', '|---|---|---|---|');
      v.beats.forEach((b) => L.push(`| ${b.t.toFixed(2)}${b.big ? ' ★' : ''} | ${b.w.replace(/\|/g, '/')} | ${b.s ? '`' + b.s + '`' : '—'} | ${b.h || '—'} |`));
      const lastT = Math.max(...base.map((e) => e.last || 0));
      const key = (e) => `${e.tag}|${e.cls}|${e.text}|${e.src.split('/').pop()}|${e.glyph}|${Math.round(e.x / 4)}|${Math.round(e.y / 4)}`;
      const other = (tn) => new Map((D[tn] || []).map((e) => [key(e), e]));
      const L1 = other('aurora-light'), L2 = other('iris-light');
      const fin = base.filter((e) => e.alive && e.last >= lastT - 200); const gone = base.filter((e) => !(e.alive && e.last >= lastT - 200));
      const what = (e) => e.tag === 'img' ? `картинка \`${assetInCode(e.src)}\`` : e.glyph ? `иконка Ionicons **${GLYPH[e.glyph] || '?'}**` : e.tag === 'svg' ? 'svg-графика' : e.tag === 'canvas' ? 'частицы (canvas)' : e.text ? `текст «${e.text}»` : `блок .${e.cls.split(' ')[0] || e.tag}`;
      const txt = (e) => { if (!e.text || e.glyph) return '—'; if (/\b(zz|emo)\b/.test(e.cls)) return `знак анимации монеты «${e.text}»`; if (!/[A-Za-zА-Яа-яЁё]/.test(e.text)) return e.text.length <= 2 && !/\d/.test(e.text) ? `символ анимации «${e.text}»` : `«${e.text}» · число из данных`; const c = codeString(e.text); if (!c) return `ru «${e.text}» · **нет в строках кода**`; if (c.exact) return `ru «${e.text}» · \`${c.key}\` (${c.file.split('/').pop()}) · ${c.uk.includes('{') ? 'uk-шаблон' : 'uk'} «${c.uk}»${e.frag ? ' · выделено: ' + e.frag : ''}`; return `ru «${e.text}» · составлено из ${c.parts.slice(0, 3).map((p) => '`' + p.key + '`').join(' + ')}`; };
      const font = (e) => e.text ? `${parseFloat(e.fs)}/${e.lh === 'normal' ? 'auto' : parseFloat(e.lh)} · ${e.fw}${+e.fw >= 800 ? ' (на Android до нативной сборки — 700: известное расхождение, шрифт; Inter ExtraBold добавлен 0b61ac198)' : ''}${e.ls && e.ls !== 'normal' && parseFloat(e.ls) !== 0 ? ` · трекинг ${parseFloat(e.ls)}` : ''}${e.tt !== 'none' ? ' · ' + e.tt : ''}` : '—';
      const col = (e, tn, tk) => { if (!e) return 'нет элемента'; const parts = []; if (e.text || e.glyph) parts.push('цвет ' + (tokenOf(e.color, tk) || '—')); const bg = tokenOf(e.bg, tk); if (bg) parts.push('фон ' + bg); if (e.bgi) parts.push('фон-градиент/картинка'); return parts.join(' · ') || '—'; };
      const box = (e) => `x${e.x} y${e.y} · ${e.w}×${e.h}${e.rad && e.rad !== '0px' ? ' · радиус ' + e.rad.replace(/px/g, '') : ''}${e.pad && e.pad !== '0px' ? ' · отступы ' + e.pad.replace(/px/g, '') : ''}${e.sh ? ' · тень' : ''}`;
      L.push('', `### На экране в финале (${fin.length})`, '', '| # | элемент | текст ru / ключ / uk | шрифт кегль/строка · вес | цвет: Аврора тёмная | Аврора светлая | Ирис светлая | место, размер, радиус, отступы | появляется, мс |', '|---|---|---|---|---|---|---|---|---|');
      fin.sort((a, b) => a.y - b.y || a.x - b.x).forEach((e, i) => L.push(`| ${i + 1} | ${what(e)} | ${txt(e).replace(/\|/g, '/')} | ${font(e)} | ${col(e, 'aurora-dark', 'grad_aurora:dark')} | ${col(L1.get(key(e)), 'aurora-light', 'grad_aurora:light')} | ${col(L2.get(key(e)), 'iris-light', 'grad_iris:light')} | ${box(e)} | ${e.first} |`));
      if (gone.length) { L.push('', `### Появляются и уходят до финала (${gone.length})`, '', '| элемент | текст ru / ключ | появляется, мс | уходит, мс |', '|---|---|---|---|');
        gone.sort((a, b) => a.first - b.first).forEach((e) => L.push(`| ${what(e)} | ${txt(e).replace(/\|/g, '/')} | ${e.first} | ${e.last} |`)); }
      L.push(''); }
    const file = path.join(OUT, `CHECKLIST_${id}.md`); fs.writeFileSync(file, L.join('\n')); log('записан', path.relative(ROOT, file)); }
})();
