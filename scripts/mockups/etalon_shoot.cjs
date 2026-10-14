// зачем (координатор 14.10: «эталонные кадры для переноса, паритет только по снимкам»): каждый вариант каждого момента — кадры в точках
// тайм-листа «старт / пик / финал», ширины 360×800 и 412×915, темы Аврора тёмная / Аврора светлая / Ирис светлая.
// Выход: docs/phraseman-2.0/evidence/etalon_v3/<момент>/<тема>_<ширина>_<точка>.png (+ вариант в имени, если вариантов > 1).
// usage: node scripts/mockups/etalon_shoot.cjs <page.html>   env: ONLY=m01,m02 THEMES=0,1,2 WIDTHS=360,412 OUT=<папка> MOCKUP_URL
// ОДИН поток (координатор 14.10: три браузера параллельно уронили память ПК); перезапуск продолжает с места
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
// координатор 14.10: полный набор (~1100 PNG) — вне репозитория; в репозиторий идёт выборка webp (etalon_pack.py)
const OUT = process.env.OUT || 'C:/Temp/claude/etalon_v3';
const page = process.argv[2];
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const THEMES = (process.env.THEMES || '0,1,2').split(',').map(Number);
const SIZES = { 360: [360, 800], 412: [412, 915] }; const WIDTHS = (process.env.WIDTHS || '360,412').split(',');
const THEME_NAME = ['aurora-dark', 'aurora-light', 'iris-light'];
(async () => { const br = await chromium.launch(); let n = 0; const log = [];
  for (const th of THEMES) for (const w of WIDTHS) {
    const [W, H] = SIZES[w]; const pg = await br.newPage({ viewport: { width: 1400, height: 1100 }, deviceScaleFactor: 1 });
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
    await pg.goto((process.env.MOCKUP_URL || 'http://127.0.0.1:8765/').replace(/\/?$/, '/') + page + '?v=' + Date.now(), { waitUntil: 'load' }); await pg.waitForTimeout(1200);
    for (let k = 0; k < th; k++) { const b = await pg.$('#em-theme'); if (b) { await b.click(); await pg.waitForTimeout(200); } }
    // размер телефона (как устройство dp) и прятанье липких панелей страницы
    await pg.addStyleTag({ content: `.em-ph { width: ${W}px !important; height: ${H}px !important; } .em-toc, .em-top { position: static !important; }` });
    const vars = await pg.evaluate(() => EM.MOMENTS.flatMap((m) => m.variants.map((v, j) => ({ id: m.id, vid: `${m.id}-${v.k || j}`, k: v.k || String(j), nv: m.variants.length, total: v.total || 0, beats: (v.beats || []).map((b) => ({ t: b.t, big: !!b.big })) }))));
    for (const v of vars) { if (ONLY.length && !ONLY.includes(v.id)) continue;
      const maxT = Math.max(0, ...v.beats.map((b) => b.t)); const big = v.beats.find((b) => b.big);
      const total = v.total || maxT + 1.2; const pts = { start: 0.5, peak: big ? big.t + 0.35 : Math.max(0.6, total * 0.5), final: Math.max(total, maxT + 0.9) + 0.3 };
      // зачем (координатор 14.10: при нехватке памяти — один поток): перезапуск продолжает с места, готовые варианты пропускаем
      const pre = path.join(OUT, v.id, `${THEME_NAME[th]}_${w}_${v.nv > 1 ? v.k + '_' : ''}`);
      if (['start', 'peak', 'final'].every((x) => fs.existsSync(pre + x + '.png'))) continue;
      const vr = await pg.$(`[data-vid="${v.vid}"]`); if (!vr) continue; const ph = await vr.$('.em-ph'); if (!ph) continue;
      await vr.scrollIntoViewIfNeeded(); const rp = await vr.$('[data-replay]');
      // зачем (14.10): без «Повторить» отсчёт шёл от загрузки страницы — кадры «пик/финал» снимались не в те секунды. Нет кнопки — громко пропускаем.
      if (!rp) { log.push(`[ETALON-SHOOT] НЕТ «Повторить» в ${v.vid} — вариант пропущен`); continue; }
      await rp.click(); await pg.waitForTimeout(60);
      // повтор пересобирает телефон — берём свежий элемент; тему возвращает обработчик страницы
      const t0 = Date.now();
      const dir = path.join(OUT, v.id); fs.mkdirSync(dir, { recursive: true });
      for (const [name, sec] of Object.entries(pts).sort((a, b) => a[1] - b[1])) {
        const wait = sec * 1000 - (Date.now() - t0); if (wait > 0) await pg.waitForTimeout(wait);
        const el = await (await pg.$(`[data-vid="${v.vid}"]`)).$('.em-ph');
        const file = path.join(dir, `${THEME_NAME[th]}_${w}_${v.nv > 1 ? v.k + '_' : ''}${name}.png`);
        await el.screenshot({ path: file }); n++; }
    }
    log.push(`${THEME_NAME[th]} ${w}: JS ${errs.length} ${errs[0] || ''}`); await pg.close(); }
  await br.close(); console.log('кадров', n); console.log(log.join('\n'));
})();
