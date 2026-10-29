// ═══════════════════════════════════════════════════════════════════════════
// ann_v2_gate_refs.cjs — эталонные кадры макета объявлений для гейта «приложение = макет» (владелец 28.10, строгий гейт).
//
// зачем: гейт сравнивает кадр приложения с кадром макета в КОНЕЧНОМ состоянии анимаций (ST.settle(true) макета = studioSettle
// приложения). Здесь headless-браузер снимает телефон макета 390 × 844 для 36 шаблонов × короткий/длинный заголовок × 3 темы гейта
// (graphite, ink, grad_lilac — решение координатора 28.10) × тёмное/светлое = 432 PNG. Кадры — вне репозитория (C:/Temp/claude/ann_gate/ref),
// в manifest.json — sha256 макета, чтобы сторож видел, что эталоны сняты с текущего макета.
//   node scripts/mockups/ann_v2_gate_refs.cjs   env: OUT=<папка> THEMES=graphite,ink,grad_lilac ONLY=poll,date
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const MOCKUP = path.join(ROOT, 'docs', 'design', 'v2-app', 'stories-announcements-v1.html');
const OUT = process.env.OUT || 'C:/Temp/claude/ann_gate/ref';
const THEMES = (process.env.THEMES || 'graphite,ink,grad_lilac').split(',').filter(Boolean);
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
/** Режим кадра: freeze — все анимации заморожены на FREEZE_MS (6-я секунда, как снимок приложения у Сверки: частицы видны); settle — конечное состояние. */
const MODE = process.env.MODE === 'settle' ? 'settle' : 'freeze';
const FREEZE_MS = Number(process.env.FREEZE_MS || 6000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // зачем: на Windows git может переписать концы строк (autocrlf) — хэш считаем по тексту с LF, чтобы сторож не падал после checkout
  const mockupSha = crypto.createHash('sha256').update(fs.readFileSync(MOCKUP, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1900, height: 1300 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file:///' + MOCKUP.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => window.ST && window.ST.ready, null, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  if (MODE === 'settle') await page.evaluate(() => ST.settle(true));
  const designs = await page.evaluate(() => ST.TPL.map((t) => t.id));
  const frames = [];
  let n = 0;
  for (const long of [false, true]) {
    await page.evaluate((v) => ST.setLong(v), long);
    for (let k = 0; k < designs.length; k += 1) {
      const design = designs[k];
      if (ONLY.length && !ONLY.includes(design)) continue;
      const el = await page.$(`[data-ph="${k}"]`);
      await el.scrollIntoViewIfNeeded();
      for (const theme of THEMES) for (const ap of ['dark', 'light']) {
        const file = path.join(OUT, `${design}_${long ? 'long' : 'short'}_${theme}_${ap}.png`);
        await page.evaluate(([k, theme, ap]) => { ST.phone(k + 1, theme, ap); }, [k, theme, ap]);
        // зачем: settle делает анимации 1 мс, но после рендера нужен кадр, чтобы они дошли до конца (см. ST.geo: finish())
        if (MODE === 'settle') await page.evaluate((k) => { const p = ST.players[k + 1]; for (const a of p.st.getAnimations({ subtree: true })) { try { a.finish(); } catch (e) { console.warn('[GATE-REF] finish failed', a.animationName, String(e)); } } }, k);
        else await page.evaluate(([k, ms]) => { ST.freeze(k + 1, ms); }, [k, FREEZE_MS]);
        await sleep(60);
        await el.screenshot({ path: file });
        const cta = await page.evaluate((k) => !!ST.players[k + 1].st.querySelector('.scta'), k);
        frames.push({ design, long, theme, ap, file: path.basename(file), cta });
        n += 1;
      }
      if (k % 6 === 5) console.log(`[GATE-REF] ${long ? 'long' : 'short'} ${k + 1}/${designs.length} — ${n} кадров`);
    }
  }
  if (MODE === 'settle') await page.evaluate(() => ST.settle(false));
  await browser.close();
  const manifest = { mode: MODE, freezeMs: MODE === 'freeze' ? FREEZE_MS : null, mockup: path.relative(ROOT, MOCKUP).replace(/\\/g, '/'), mockupSha256: mockupSha, phone: { width: 390, height: 844 }, slide: { top: 120, bottom: 60, bottomWithCta: 150 }, themes: THEMES, titles: ['short', 'long'], modes: ['dark', 'light'], frames, errors, madeAt: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(JSON.stringify({ frames: frames.length, errors: errors.length, out: OUT, mockupSha256: mockupSha.slice(0, 12) }));
  if (errors.length) { console.log(errors.slice(0, 5)); process.exit(1); }
})().catch((e) => { console.error('[GATE-REF] FATAL', e); process.exit(1); });
