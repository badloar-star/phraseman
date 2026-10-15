// зачем (координатор 15.10, без эмулятора): «эталон ↔ код» для главных экранов (Главная, Пик, Настройки, Пейвол, Карточки, Ошибки).
// Образцы главных экранов — страницы kit (несколько телефонов .ph), не моменты EM, поэтому сопоставление идёт по ТЕКСТУ:
// русская строка образца ищется в коде экрана (литерал, triLang ru:, L('…')); найден внутри <Text> — сравниваем кегль/строку/вес/трекинг
// его стиля; найден вне JSX (таблица строк, переменная) — «текст есть, стиль не виден»; не найден — вероятное расхождение текста.
// usage (сервер образцов поднят, ОДИН браузер): node scripts/mockups/screen_code_compare.cjs [home,spire,…]   env MOCKUP_URL
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'phraseman-2.0', 'evidence', 'parity_moments_v1', `SCREENS_VS_ETALON_${new Date().toISOString().slice(0, 10)}.md`);
const BASE = (process.env.MOCKUP_URL || 'http://127.0.0.1:8765/').replace(/\/?$/, '/');
const log = (...a) => console.log('[SCREEN-CODE]', ...a);
const SCREENS = {
  home: { title: 'Главная', page: 'home-by-language-mockup.html', code: ['app/(tabs)/home.tsx', 'components/home', 'components/DailyPhraseCard.tsx'] },
  spire: { title: 'Пик', page: 'spire.html', code: ['components/spire'] },
  settings: { title: 'Настройки и аккаунт', page: 'profile.html', code: ['app/(tabs)/settings.tsx', 'components/settings', 'app/account_details.tsx'] },
  paywall: { title: 'Пейвол Plus', page: 'paywall-context-redesign.html', code: ['components/paywall', 'app/paywall_copy.ts', 'app/paywall_context_texts.ts'] },
  cards: { title: 'Карточки', page: 'cards-section.html', code: ['app/flashcards.tsx', 'app/flashcards', 'components/flashcards', 'components/cards-grid'] },
  mistakes: { title: 'Ошибки', page: 'mistakes-panel.html', code: ['components/mistakes-panel', 'components/mistake-practice'] },
};
const IDS = (process.argv[2] || Object.keys(SCREENS).join(',')).split(',').filter(Boolean);
let ALL = null;
const V2 = {}; { const src = fs.readFileSync(path.join(ROOT, 'constants', 'v2Style.ts'), 'utf8'); for (const m of src.matchAll(/^\s{2}(\w+):\s*\{([^{}]*fontSize[^{}]*)\}/gm)) V2[m[1]] = m[2]; }
const props = (body) => { const o = {}; for (const [k, re] of [['fs', /fontSize:\s*([\d.]+)/], ['lh', /lineHeight:\s*([\d.]+)/], ['fw', /fontWeight:\s*'(\d+)'/], ['ls', /letterSpacing:\s*(-?[\d.]+)/]]) { const m = body.match(re); if (m) o[k] = m[1]; }
  const sp = body.match(/\.\.\.V2_TYPE\.(\w+)/); if (sp && V2[sp[1]]) return { ...props(V2[sp[1]]), ...o }; return o; };
const listFiles = (rels) => { const out = []; const walk = (p) => { const a = path.join(ROOT, p); if (!fs.existsSync(a)) { log('нет пути', p); return; } const st = fs.statSync(a);
  if (st.isDirectory()) { for (const e of fs.readdirSync(a)) if (!/__tests__|node_modules/.test(e)) walk(p + '/' + e); } else if (/\.(tsx?|js)$/.test(p) && !/\.test\./.test(p)) out.push(p); }; rels.forEach(walk); return out; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function locate(files, text) {
  // зачем: точный литерал, а не подстроку — «Карточки» не должна найтись внутри «Карточки без ограничений»
  // зачем: капс в образце может быть из CSS / toUpperCase() — ищем без учёта регистра
  const re = new RegExp(`(['"\`])${esc(text)}\\1`, 'i');
  for (const f of files) { const src = fs.readFileSync(path.join(ROOT, f), 'utf8'); const m = re.exec(src); if (!m) continue;
    const line = src.slice(0, m.index).split('\n').length;
    // ближайший открывающий <Text …> выше литерала (до 8 строк) и его закрытие ниже — литерал внутри JSX-текста
    const before = src.slice(Math.max(0, m.index - 1500), m.index); const tOpen = before.lastIndexOf('<Text'); const tClose = before.lastIndexOf('</Text');
    let st = null, names = [];
    if (tOpen >= 0 && tOpen > tClose && before.slice(tOpen).split('\n').length <= 8) {
      const open = before.slice(tOpen); names = [...open.matchAll(/\b(?:s|styles)\.(\w+)/g)].map((x) => x[1]);
      const styles = {}; for (const sm of src.matchAll(/StyleSheet\.create\(\{([\s\S]*?)\n\}\)/g)) for (const e of sm[1].matchAll(/^\s{2}(\w+):\s*\{([^{}]*)\}/gm)) styles[e[1]] = props(e[2]);
      st = {}; for (const n of names) st = { ...st, ...(styles[n] || {}) }; st = { ...st, ...props(open.replace(/\.\.\.V2_TYPE\.\w+/g, '')) }; if (!st.fs) st = null; }
    return { file: f, line, st, names }; }
  return null;
}
(async () => {
  const br = await chromium.launch(); const L = ['# Главные экраны: эталон ↔ код (без эмулятора)', '', `Сформировано ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC скриптом scripts/mockups/screen_code_compare.cjs.`,
    'Русская строка образца ищется в коде экрана как точный литерал. ✓ — найдена внутри <Text> и типографика совпала; ✗ — найдена, но кегль/строка/вес/трекинг другие; ≈ — текст в коде есть (таблица строк/переменная), стиль скриптом не виден; ✗т — текста нет нигде в app/ и components/ (другая формулировка, устаревший образец или нет элемента — проверить). Данные-примеры (имена, числа) и одиночные символы не проверяются.', '', '| экран | образец | ✓ | ✗ | ≈ | ✗т |', '|---|---|---|---|---|---|'];
  const BODY = []; ALL = listFiles(['app', 'components', 'constants', 'modules']).filter((f) => !/generated|\.d\.ts$|content\//.test(f)); log('файлов кода для поиска', ALL.length);
  for (const id of IDS) { const S = SCREENS[id]; if (!S) { log('нет экрана', id); continue; }
    const pg = await br.newPage({ viewport: { width: 1500, height: 1100 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
    let loaded = false; for (let k = 0; k < 2 && !loaded; k++) { try { await pg.goto(BASE + S.page + '?v=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 }); await pg.waitForFunction(() => document.querySelector('.ph'), null, { timeout: 30000 }); loaded = true; } catch (e) { log(S.page, 'попытка', k + 1, e.message.split('\n')[0]); } }
    if (!loaded) { BODY.push(`## ${S.title}`, '', `образец ${S.page} не загрузился — экран не сверен`, ''); await pg.close(); continue; }
    await pg.waitForTimeout(1500);
    const items = await pg.evaluate(() => { const out = []; const seen = new Set();
      for (const ph of document.querySelectorAll('.ph')) { const col = ph.closest('.col, article, [data-vid]'); const lbl = col && col.querySelector('.lbl') ? col.querySelector('.lbl').textContent.trim().slice(0, 50) : '';
        for (const el of ph.querySelectorAll('*')) { if (el.closest('.sb')) continue; const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' ').replace(/\s+/g, ' ').trim();
          if (!own || own.length < 3 || !/[А-Яа-яЁё]{2}/.test(own)) continue; const r = el.getBoundingClientRect(); if (r.width < 1) continue;
          const cs = getComputedStyle(el); const tt = cs.textTransform; const key = own + '|' + cs.fontSize + '|' + cs.fontWeight; if (seen.has(key)) continue; seen.add(key);
          out.push({ text: own, lbl, fs: parseFloat(cs.fontSize), lh: cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight), fw: cs.fontWeight, ls: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing), up: tt === 'uppercase' }); } }
      return out; });
    await pg.close();
    const files = listFiles(S.code); const rows = []; let ok = 0, bad = 0, soft = 0, miss = 0; const done = new Set();
    for (const it of items) { if (done.has(it.text)) continue; done.add(it.text);
      // зачем: строки с числами — данные-примеры или составные («12 ждут», «3 990 ₽ в год»), по литералу не сверяются
      if (/\d/.test(it.text)) continue;
      const spec = `${it.fs}/${it.lh ?? 'auto'} · ${it.fw}${it.ls ? ' · ' + +it.ls.toFixed(2) : ''}${it.up ? ' · капс' : ''}`;
      // зачем: экран в коде разнесён по многим файлам (settings_*.tsx, общие компоненты) — сначала файлы экрана, потом весь app/ + components/
      const hit = locate(files, it.text) || locate(ALL, it.text);
      if (!hit) { miss++; rows.push(`| ✗т | «${it.text}» | ${spec} | текста нет в коде | ${it.lbl} |`); continue; }
      if (!hit.st) { soft++; rows.push(`| ≈ | «${it.text}» | ${spec} | есть: ${hit.file}:${hit.line} (стиль не виден) | ${it.lbl} |`); continue; }
      const d = []; if (+hit.st.fs !== it.fs) d.push(`кегль ${it.fs} → ${hit.st.fs}`); if (it.lh && hit.st.lh && +hit.st.lh !== it.lh) d.push(`строка ${it.lh} → ${hit.st.lh}`);
      if (hit.st.fw && hit.st.fw !== String(it.fw)) d.push(`вес ${it.fw} → ${hit.st.fw}`); if (Math.abs((+hit.st.ls || 0) - it.ls) > 0.05) d.push(`трекинг ${+it.ls.toFixed(2)} → ${hit.st.ls || 0}`);
      if (d.length) bad++; else ok++;
      rows.push(`| ${d.length ? '✗' : '✓'} | «${it.text}» | ${spec} | ${d.length ? d.join('; ') + ' — ' : ''}${hit.file}:${hit.line} (${hit.names.map((n) => 's.' + n).join(' + ') || 'inline'}) | ${it.lbl} |`); }
    L.push(`| ${S.title} | ${S.page} | ${ok} | ${bad} | ${soft} | ${miss} |`);
    BODY.push(`## ${S.title} — ${S.page}`, '', `Код: ${S.code.map((c) => '`' + c + '`').join(', ')} · JS образца ${errs.length}`, '', '| | текст | образец | код | телефон |', '|---|---|---|---|---|', ...rows, '');
    log(S.title, 'текстов', done.size, '✓', ok, '✗', bad, '≈', soft, '✗т', miss); }
  await br.close(); fs.writeFileSync(OUT, [...L, '', ...BODY].join('\n')); log('записан', path.relative(ROOT, OUT));
})();
