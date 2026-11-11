// compare_frames.cjs — покадровое сравнение «кадр приложения ↔ эталон» за минуты.
// Использование:  node docs/work/release/tools/compare_frames.cjs [папка_кадров]   (по умолчанию docs/work/release/frames_2026-11-05)
// Имя кадра: <id>__<тема>-<оформление>.png (id из frames_manifest.json). Результат: compare/<имя>.png (слева кадр, в центре эталон, справа тепловая карта), compare/REPORT.md, compare/report.json.
// Сравнение по сетке 12×26 клеток (яркость + цвет): эталоны — браузерные/нарисованные, кадры — Android, пиксельное равенство невозможно; ищем КРУПНЫЕ расхождения раскладки.
const fs = require('fs'), path = require('path'); const sharp = require('C:/appsprojects/phraseman/node_modules/sharp');
const ROOT = 'C:/appsprojects/phraseman/docs/work/release/'; const dir = process.argv[2] || ROOT + 'frames_2026-11-05/'; const man = JSON.parse(fs.readFileSync(ROOT + 'tools/frames_manifest.json', 'utf8'));
const OUT = dir + 'compare/'; fs.mkdirSync(OUT, { recursive: true }); const GX = 12, GY = 26, W = 360, H = 780;
const grid = async (file) => {
  const { data } = await sharp(file).removeAlpha().resize(GX * 10, GY * 10, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true }); const cells = [];
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) { let r = 0, g = 0, b = 0, n = 0; for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) { const i = (((gy * 10 + y) * GX * 10) + gx * 10 + x) * 3; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; } cells.push([r / n, g / n, b / n]); }
  return cells;
};
(async () => {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(png|jpg)$/i.test(f)) : []; const rows = [];
  for (const f of files) {
    const m = f.match(/^(.+?)__(.+?)\.(png|jpg)$/i); if (!m) { rows.push({ file: f, verdict: '⬜ имя не по шаблону <id>__<тема>-<оформление>.png' }); continue; }
    const id = m[1], variant = m[2]; const item = man.items[id]; if (!item) { rows.push({ file: f, id, verdict: '⬜ id нет в frames_manifest.json' }); continue; }
    const refRel = item.ref[variant] || item.ref['*'] || item.ref[variant.split('-').pop()] || Object.values(item.ref)[0];
    if (!refRel) { rows.push({ file: f, id, owner: item.owner, verdict: '⬜ эталон не назначен', check: item.check }); continue; }
    const refPath = path.resolve(man.refRoot, refRel); if (!fs.existsSync(refPath)) { rows.push({ file: f, id, owner: item.owner, verdict: '⬜ файл эталона не найден: ' + refRel, check: item.check }); continue; }
    const a = await grid(dir + f), r = await grid(refPath); let hot = 0;
    const diffs = a.map((c, i) => { const d = (Math.abs(c[0] - r[i][0]) + Math.abs(c[1] - r[i][1]) + Math.abs(c[2] - r[i][2])) / 3; if (d > 40) hot++; return d; });
    const mean = diffs.reduce((s, v) => s + v, 0) / diffs.length; const hotPct = Math.round((hot / diffs.length) * 100); const cw = W / GX, ch = H / GY;
    const heat = diffs.map((d, i) => { const gx = i % GX, gy = Math.floor(i / GX); const al = Math.min(0.75, d / 120); return '<rect x="' + gx * cw + '" y="' + gy * ch + '" width="' + cw + '" height="' + ch + '" fill="rgba(255,60,60,' + al.toFixed(2) + ')"/>'; }).join('');
    const A = await sharp(dir + f).resize(W, H, { fit: 'fill' }).png().toBuffer(), R = await sharp(refPath).resize(W, H, { fit: 'fill' }).png().toBuffer();
    const HM = await sharp(A).composite([{ input: Buffer.from('<svg width="' + W + '" height="' + H + '">' + heat + '</svg>') }]).png().toBuffer();
    await sharp({ create: { width: W * 3 + 20, height: H, channels: 3, background: '#000' } }).composite([{ input: A, left: 0, top: 0 }, { input: R, left: W + 10, top: 0 }, { input: HM, left: 2 * W + 20, top: 0 }]).png().toFile(OUT + f.replace(/\.(jpg|png)$/i, '') + '.png');
    const verdict = item.mode === 'eyes' ? '👁 эталон — фрагмент экрана: автооценка неприменима, только глазами по чек-листу' : hotPct <= 12 ? '✅ похоже (раскладка/цвета близки) — подтвердить глазами по чек-листу' : hotPct <= 30 ? '🟡 заметные различия — смотреть тепловую карту' : '🔴 крупное расхождение — проверить';
    rows.push({ file: f, id, owner: item.owner, ref: refRel, hotPct, mean: +mean.toFixed(1), verdict, check: item.check });
  }
  fs.writeFileSync(OUT + 'report.json', JSON.stringify(rows, null, 1));
  const md = '# Покадровое сравнение — ' + new Date().toISOString().slice(0, 16) + '\nСлева кадр приложения · в центре эталон · справа тепловая карта (красное = различие). Автовердикт ПРЕДВАРИТЕЛЬНЫЙ: решает человек по чек-листу.\n\n'
    + rows.map((r) => '## ' + r.file + '\n- вердикт (авто): ' + r.verdict + (r.hotPct != null ? ' · различающихся клеток ' + r.hotPct + '%' : '') + '\n- владелец: ' + (r.owner || '—') + (r.ref ? '\n- эталон: `' + r.ref + '`' : '') + '\n' + (r.check || []).map((c) => '- [ ] ' + c).join('\n')).join('\n\n') + '\n';
  fs.writeFileSync(OUT + 'REPORT.md', md); console.log(rows.map((r) => r.file + ' → ' + r.verdict).join('\n') || 'кадров нет');
})();
