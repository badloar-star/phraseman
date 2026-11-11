// make_refs.cjs — выгружает эталонные PNG из HTML-макетов (тур Пика, плашка Сообщества) в docs/work/golden/refs/ (только чтение макетов).
const { chromium } = require('C:/appsprojects/phraseman/node_modules/playwright'); const OUT = 'C:/appsprojects/phraseman/docs/work/golden/refs/';
const M = 'file:///C:/appsprojects/phraseman/docs/work/mockups/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 520, height: 1250 }, deviceScaleFactor: 2 });
  await p.goto(M + 'peak-tour-2026-11-04/peak_tour_B.html'); await p.waitForFunction(() => window.__peakDone);
  for (const [th, ap] of [['graphite', 'dark'], ['graphite', 'light'], ['ink', 'dark'], ['ink', 'light']]) for (const pg of [0, 1, 2]) { await p.evaluate(([th, ap, pg]) => window.__peak.set({ theme: th, ap, page: pg, lang: 'ru' }), [th, ap, pg]); await p.waitForTimeout(450); await p.locator('.ph').screenshot({ path: OUT + `tour-p${pg + 1}_${th}-${ap}.png` }); }
  const q = await b.newPage({ viewport: { width: 520, height: 1150 }, deviceScaleFactor: 2 });
  await q.goto(M + 'community-notice-2026-11-04/community_notice.html'); await q.waitForFunction(() => window.__pkDone);
  for (const ap of ['dark', 'light']) for (const w of [1, 2, 3, 4, 5]) { await q.evaluate(([ap, w]) => window.__pk.set({ mode: 'now', ap, w, closed: false }), [ap, w]); await q.waitForTimeout(450); await q.locator('#ph').screenshot({ path: OUT + `community-notice-w${w}_${ap}.png` }); }
  await q.evaluate(() => window.__pk.set({ mode: 'now', ap: 'dark', closed: true })); await q.waitForTimeout(450); await q.locator('#ph').screenshot({ path: OUT + 'community-notice-closed_dark.png' });
  await b.close(); console.log('refs ok');
})();
