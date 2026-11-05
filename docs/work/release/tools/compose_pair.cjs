// compose_pair.cjs <id> [тема-размер] — склейка «макет | кадр приложения» для состояния реестра visual_parity.
// зачем: координатор — не просить Сверку склеивать вручную. Макет = телефон №phone на странице docs/design/v2-app/<файл>.html (.col/.ph), кадр = frames_2026-11-05/pending/<id>__<вариант>.png.
// Результат: frames_2026-11-05/pending/compose/<id>__<вариант>.png. Только чтение макета и кадра.
const fs = require('fs'); const path = require('path');
const { chromium } = require('C:/appsprojects/phraseman/node_modules/playwright'); const sharp = require('C:/appsprojects/phraseman/node_modules/sharp');
const ROOT = 'C:/appsprojects/phraseman/'; const id = process.argv[2]; const variant = process.argv[3] || 'graphite-dark-412x915';
if (!id) { console.error('[COMPOSE] нужен id, например cards-v2-005'); process.exit(2); }
const reg = JSON.parse(fs.readFileSync(ROOT + 'docs/phraseman-2.0/registries/visual_parity.json', 'utf8')); const row = reg.rows.find((r) => r.id === id);
if (!row || !row.mockup) { console.error('[COMPOSE] id не найден или нет макета:', id); process.exit(2); }
const frame = ROOT + `docs/work/release/frames_2026-11-05/pending/${id}__${variant}.png`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1400 }, deviceScaleFactor: 2 });
  await p.goto('file:///' + ROOT + row.mockup.file); await p.waitForTimeout(600);
  const cols = p.locator('.col'); const n = await cols.count(); const idx = (row.mockup.phone || 1) - 1;
  if (idx >= n) { console.error(`[COMPOSE] на странице ${n} телефонов, нужен №${row.mockup.phone}`); await b.close(); process.exit(3); }
  const ph = cols.nth(idx).locator('.ph').first(); const tgt = (await ph.count()) ? ph : cols.nth(idx);
  await tgt.scrollIntoViewIfNeeded(); const mock = await tgt.screenshot();
  await b.close();
  const mm = await sharp(mock).metadata(); const H = 900; const mockR = await sharp(mock).resize({ height: H }).png().toBuffer(); const mw = (await sharp(mockR).metadata()).width;
  let parts = [{ input: mockR, left: 0, top: 0 }]; let W = mw;
  if (fs.existsSync(frame)) { const fr = await sharp(frame).resize({ height: H }).png().toBuffer(); const fw = (await sharp(fr).metadata()).width; parts.push({ input: fr, left: mw + 16, top: 0 }); W = mw + 16 + fw; } else console.error('[COMPOSE] кадра нет (' + frame + ') — только макет');
  const out = ROOT + `docs/work/release/frames_2026-11-05/pending/compose/${id}__${variant}.png`; fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#222' } }).composite(parts).png().toFile(out);
  console.log('[COMPOSE] ok', out, 'макет', mm.width + '×' + mm.height, 'label:', row.mockup.label);
})().catch((e) => { console.error('[COMPOSE] ошибка', e.message); process.exit(1); });
