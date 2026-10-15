// зачем (координатор 15.10, до 08:15): эталоны моментов v3 на самых длинных языках интерфейса (pt-BR, vi, id, tr, pl, uk; de нет).
// В финальный кадр каждого варианта подставляем строки из *_strings.ts по языку (ключ находим по русскому тексту, как листы
// приёмки), телефон 360 pt, шрифт системы ×1.15 — и ищем: выход за край телефона, выход за родителя, обрезку (scroll > client),
// кнопку/пилюлю в 2 строки, заголовок больше 2 строк, наложение текстов. Анимацию проигрываем один раз на вариант, языки меняем
// на готовом кадре (RU-снимок текста восстанавливается перед каждым языком). Только чтение образцов и кода.
// usage (сервер образцов поднят, ОДИН браузер): node scripts/mockups/long_text_check.cjs [m01,d365]   env MOCKUP_URL, PAGE, LANGS
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const PAGE = process.env.PAGE || 'engagement-moments-v3-all.html';
const BASE = (process.env.MOCKUP_URL || 'http://127.0.0.1:8765/').replace(/\/?$/, '/');
const LANGS = (process.env.LANGS || 'ru,pt-BR,vi,id,tr,pl,uk').split(',');
const IDX = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };
const ONLY = (process.argv[2] || '').split(',').filter(Boolean);
const OUT = path.join(ROOT, 'docs', 'phraseman-2.0', 'evidence', 'parity_moments_v1', `LONG_TEXT_${new Date().toISOString().slice(0, 10)}.md`);
const log = (...a) => console.log('[LONG-TEXT]', ...a);

// ---------- строки кода: все 9 языков ----------
const FILES = [];
(function walk(d) { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = d + '/' + e.name; if (e.isDirectory()) { if (!/node_modules|__tests__/.test(e.name)) walk(rel); } else if (/_strings\.ts$/.test(e.name)) FILES.push(rel); } })('components');
(function walk(d) { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = d + '/' + e.name; if (e.isDirectory()) { if (!/node_modules|__tests__/.test(e.name)) walk(rel); } else if (/_strings\.ts$/.test(e.name)) FILES.push(rel); } })('modules');
const STR = []; const Q = "'((?:[^'\\\\]|\\\\.)*)'";
const re9 = new RegExp(`(?:^\\s*([A-Za-z_]\\w*|\\d+)\\s*:\\s*\\[|const\\s+([A-Z_][A-Z0-9_]*)\\s*:\\s*Nine\\s*=\\s*\\[)\\s*${Array(9).fill(Q).join('\\s*,\\s*')}`, 'gm');
for (const f of FILES) { const src = fs.readFileSync(path.join(ROOT, f), 'utf8'); let m;
  while ((m = re9.exec(src))) { let key = m[1] || m[2]; if (/^\d+$/.test(key)) { const owner = [...src.slice(0, m.index).matchAll(/const\s+([A-Za-z_]\w*)\s*[:=]/g)].pop(); key = `${owner ? owner[1] : '?'}[${key}]`; }
    STR.push({ file: f, key, t: m.slice(3, 12).map((x) => x.replace(/\\'/g, "'")) }); } }
log('строк (9 языков)', STR.length, 'файлов', FILES.length);
const esc = (s) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
// подстановка: русский шаблон → регулярка с группами по {имя}; те же значения вставляем в шаблон нужного языка
function translate(text, lang) {
  const t = text.replace(/\s+/g, ' ').trim(); if (!t) return null;
  for (const s of STR) { const ru = s.t[0]; const names = [...ru.matchAll(/\{([a-zA-Z]+)\}/g)].map((x) => x[1]);
    let rx; try { rx = new RegExp('^' + esc(ru).replace(/\\?\{[a-zA-Z]+\\?\}/g, '(.+?)').replace(/\{[a-zA-Z]+\}/g, '(.+?)') + '$', 'i'); } catch (e) { continue; }
    const m = rx.exec(t); if (!m) continue;
    let out = s.t[IDX[lang]]; names.forEach((n, i) => { out = out.split(`{${n}}`).join(m[i + 1]); });
    // регистр образца: капс в эталоне (надзаголовки) — тот же капс в языке
    if (t === t.toUpperCase() && t !== t.toLowerCase()) out = out.toUpperCase();
    return { key: s.key, file: s.file, out }; }
  return null;
}

(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1500, height: 1100 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  let loaded = false; for (let k = 0; k < 2 && !loaded; k++) { try { await pg.goto(BASE + PAGE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 }); await pg.waitForFunction(() => window.EM && window.EM.MOMENTS && document.querySelector('[data-vid]'), null, { timeout: 30000 }); loaded = true; } catch (e) { log('загрузка, попытка', k + 1, e.message.split(String.fromCharCode(10))[0]); } }
  if (!loaded) { log('страница не загрузилась — выход без записи'); await br.close(); process.exit(1); }
  await pg.waitForTimeout(1200);
  // телефон 360 pt (узкий Android); высота как у 360×800
  await pg.addStyleTag({ content: '.em-ph { width: 360px !important; height: 800px !important; } .em-toc, .em-top { position: static !important; }' });
  const vars = await pg.evaluate(() => EM.MOMENTS.flatMap((m) => m.variants.map((v, j) => ({ id: m.id, vid: `${m.id}-${v.k || j}`, total: v.total || 0, maxT: Math.max(0, ...(v.beats || []).map((b) => b.t)) }))));
  const ROWS = []; const COVER = [];
  for (const v of vars) { if (ONLY.length && !ONLY.includes(v.id)) continue; if (!/^(m\d+|d\d+)$/.test(v.id)) continue;
    const vr = await pg.$(`[data-vid="${v.vid}"]`); if (!vr) continue; await vr.scrollIntoViewIfNeeded(); const rp = await vr.$('[data-replay]');
    if (!rp) { log('НЕТ «Повторить»', v.vid, '— пропуск'); continue; }
    await rp.click(); await pg.waitForTimeout((Math.max(v.total, v.maxT + 0.9) + 0.6) * 1000);
    // снимок RU-текстов финала + масштаб шрифта ×1.15 (системный крупный шрифт)
    const texts = await pg.evaluate((vid) => {
      const ph = document.querySelector(`[data-vid="${vid}"] .em-ph`); if (!ph) return [];
      const out = []; let n = 0;
      for (const el of ph.querySelectorAll('*')) { if (el.closest('.sb, .hi') || el.closest('.scr .in')) continue;
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const own = [...el.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim()); if (!own.length) continue;
        const r = el.getBoundingClientRect(); if (r.width < 1) continue;
        el.dataset.lt = String(++n);
        if (!el.dataset.ltScaled) { el.dataset.ltScaled = '1'; el.style.fontSize = (parseFloat(cs.fontSize) * 1.15).toFixed(2) + 'px'; if (cs.lineHeight !== 'normal') el.style.lineHeight = (parseFloat(cs.lineHeight) * 1.15).toFixed(2) + 'px'; }
        out.push({ n, text: own.map((c) => c.textContent).join(' ').replace(/\s+/g, ' ').trim(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 30) }); }
      return out; }, v.vid);
    const plan = texts.map((x) => ({ ...x, tr: Object.fromEntries(LANGS.map((l) => [l, translate(x.text, l)])) }));
    const hit = plan.filter((x) => x.tr.ru).length; const miss = plan.filter((x) => !x.tr.ru && /[А-Яа-яЁё]{2}/.test(x.text)).map((x) => x.text);
    COVER.push({ vid: v.vid, all: plan.filter((x) => /[А-Яа-яЁё]{2}/.test(x.text)).length, hit, miss });
    for (const lang of LANGS) {
      const sub = plan.map((x) => ({ n: x.n, s: x.tr[lang] ? x.tr[lang].out : x.text, key: x.tr[lang] ? x.tr[lang].key : null }));
      const found = await pg.evaluate(({ vid, sub }) => {
        const ph = document.querySelector(`[data-vid="${vid}"] .em-ph`); if (!ph) return [];
        for (const s of sub) { const el = ph.querySelector(`[data-lt="${s.n}"]`); if (!el) continue; const tn = [...el.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim());
          if (tn.length) { tn[0].textContent = s.s; for (const extra of tn.slice(1)) extra.textContent = ''; } }
        const pr = ph.getBoundingClientRect(); const issues = [];
        // зачем: строки считаем только по текстовым узлам — иконка-стрелка в кнопке иначе давала «3 строки» у «Играть»
        const lines = (el) => { const tops = new Set(); for (const c of el.childNodes) { if (c.nodeType !== 3 || !c.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(c); for (const q of rg.getClientRects()) if (q.width > 1) tops.add(Math.round(q.top / 4)); } return tops.size; };
        const shown = (el) => { let o = 1; for (let e = el; e && e !== ph.parentElement; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden') return false; o *= +c.opacity; } return o >= 0.1 && (el.textContent || '').trim().length > 0; };
        const els = sub.map((s) => [s, ph.querySelector(`[data-lt="${s.n}"]`)]).filter(([, el]) => el && el.getBoundingClientRect().width > 0 && shown(el));
        for (const [s, el] of els) { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); const name = `«${(el.textContent || '').trim().slice(0, 40)}»`;
          if (r.right > pr.right + 1 || r.left < pr.left - 1) issues.push({ k: 'за краем телефона', t: name, key: s.key, d: `${Math.round(Math.max(r.right - pr.right, pr.left - r.left))} pt` });
          if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && (cs.overflow !== 'visible' || cs.textOverflow === 'ellipsis' || cs.whiteSpace === 'nowrap')) issues.push({ k: 'обрезан', t: name, key: s.key, d: `${el.scrollWidth}>${el.clientWidth}` });
          const p = el.parentElement; if (p && p !== ph) { const q = p.getBoundingClientRect(); const pcs = getComputedStyle(p);
            if ((r.right > q.right + 2 || r.left < q.left - 2) && (pcs.overflow !== 'visible' || /cta|pill|chip|skip|tag|badge|ring|toast/.test(p.className + ' ' + el.className))) issues.push({ k: 'выходит за плашку/кнопку', t: name, key: s.key, d: `${Math.round(Math.max(r.right - q.right, q.left - r.left))} pt` }); }
          const btn = el.closest('.cta, .pill, .chip, .skip, .tag, .badge, button');
          const nl = lines(el);
          if (btn && nl > 1) issues.push({ k: 'кнопка/пилюля в ' + nl + ' строки', t: name, key: s.key, d: btn.className.split(' ')[0] });
          if (/\bh-(xl|lg|md)\b|\bsay\b/.test(el.className) && nl > 2) issues.push({ k: 'заголовок в ' + nl + ' строки', t: name, key: s.key, d: el.className.split(' ')[0] });
          if (/^\d[\d\s]*$/.test((el.textContent || '').trim()) && el.scrollWidth > el.clientWidth + 1) issues.push({ k: 'число не влезает', t: name, key: s.key, d: `${el.scrollWidth}>${el.clientWidth}` }); }
        // наложение текстов одного слоя (не предок/потомок, пересечение > 30 % меньшего)
        for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i][1], b = els[j][1]; if (a.contains(b) || b.contains(a)) continue;
          const la = a.closest('.full, .modal, .sheet, .toast, .card, .em-ph'), lb = b.closest('.full, .modal, .sheet, .toast, .card, .em-ph'); if (la !== lb) continue;
          const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
          if (w > 2 && h > 2 && w * h > 0.3 * Math.min(A.width * A.height, B.width * B.height)) issues.push({ k: 'наложение', t: `«${a.textContent.trim().slice(0, 25)}» × «${b.textContent.trim().slice(0, 25)}»`, key: els[i][0].key, pair: `${els[i][0].n}-${els[j][0].n}`, d: `${Math.round(w)}×${Math.round(h)}` }); }
        return issues; }, { vid: v.vid, sub });
      for (const f of found) ROWS.push({ vid: v.vid, lang, ...f });
      // зачем: SHOTS=<папка> — кадр телефона на каждом языке, чтобы глазами проверить, что замер ничего не пропустил
      if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); const ph = await (await pg.$(`[data-vid="${v.vid}"]`)).$('.em-ph'); if (ph) await ph.screenshot({ path: path.join(process.env.SHOTS, `${v.vid}_${lang}.png`) }); }
    }
    log(v.vid, 'текстов', plan.length, 'с ключом', hit, 'находок', ROWS.filter((r) => r.vid === v.vid).length);
  }
  await br.close();
  // в отчёт — только то, чего нет на ru (ru-находки — отдельной строкой «уже в образце»)
  // зачем: наложение сравниваем с ru по паре элементов (номера data-lt), иначе декоративное наложение на ru прятало настоящее на vi/id
  const sig = (r) => `${r.vid}|${r.k}|${r.k === 'наложение' ? r.pair : r.key || r.t}`;
  const ruSet = new Set(ROWS.filter((r) => r.lang === 'ru').map(sig));
  const fresh = ROWS.filter((r) => r.lang !== 'ru' && !ruSet.has(sig(r)));
  const byKey = new Map(); for (const r of fresh) { const k = `${r.vid}|${r.k}|${r.key || r.t}`; const o = byKey.get(k) || { ...r, langs: [] }; o.langs.push(`${r.lang} ${r.t} ${r.d}`); byKey.set(k, o); }
  const L = ['# Длинные тексты в моментах v3 — 360 pt, шрифт ×1.15 (без эмулятора)', '',
    `Сформировано ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC скриптом scripts/mockups/long_text_check.cjs по ${PAGE}. Языки: ${LANGS.filter((l) => l !== 'ru').join(', ')} (de в приложении нет); ru — база.`,
    'Строки подставлены из *_strings.ts кода по ключу, найденному по русскому тексту эталона; значения {параметров} — из эталона. Ищется: выход за край телефона, выход за кнопку/плашку, обрезка, кнопка/пилюля в 2+ строки, заголовок в 3+ строки, число рубежа не влезает, наложение текстов. В таблице только то, чего нет на ru.', '',
    '| момент | проблема | ключ | языки: текст · величина |', '|---|---|---|---|',
    ...[...byKey.values()].map((r) => `| ${r.vid} | ${r.k} | ${r.key ? '`' + r.key + '`' : '— (без ключа)'} | ${r.langs.join('<br>')} |`), '',
    '## На ru (в самом образце при 360 pt ×1.15)', '', '| момент | проблема | текст | величина |', '|---|---|---|---|',
    ...ROWS.filter((r) => r.lang === 'ru' && r.k !== 'наложение').map((r) => `| ${r.vid} | ${r.k} | ${r.t} | ${r.d} |`), '',
    `Наложений на ru: ${ROWS.filter((r) => r.lang === 'ru' && r.k === 'наложение').length} — сцена башни/кольца рисуется поверх текста намеренно; в отчёт выше идут только наложения, которых нет на ru.`, '',
    '## Покрытие подстановки', '', '| вариант | русских текстов | с ключом кода | без ключа (остались ru) |', '|---|---|---|---|',
    ...COVER.map((c) => `| ${c.vid} | ${c.all} | ${c.hit} | ${c.miss.slice(0, 6).map((x) => '«' + x.slice(0, 30) + '»').join(', ')}${c.miss.length > 6 ? ' …' : ''} |`), '',
    `JS-ошибок страницы: ${errs.length}${errs.length ? ' — ' + errs[0] : ''}`, ''];
  fs.writeFileSync(OUT, L.join('\n')); log('записан', path.relative(ROOT, OUT), 'находок (не ru)', byKey.size, 'на ru', ROWS.filter((r) => r.lang === 'ru').length);
})();
