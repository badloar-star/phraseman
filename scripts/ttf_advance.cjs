// ttf_advance.cjs — измеритель ширины текста по TTF (cmap format 4 + hmtx), без зависимостей.
// зачем (22.10): сторожа «слово не рвётся посреди слова» (tests/season_nav_tiles_fit_contract.test.ts, tests/season_hero_title_fit_contract.test.ts) считают ширину реальным шрифтом,
// а не «на глаз». Inter Bold не уже системных Roboto / SF, поэтому запас идёт в пользу проверяемого экрана.
'use strict';
const fs = require('fs');

function loadAdvance(file) {
  const b = fs.readFileSync(file);
  const tables = {};
  const nt = b.readUInt16BE(4);
  for (let i = 0; i < nt; i += 1) tables[b.toString('ascii', 12 + i * 16, 16 + i * 16)] = { off: b.readUInt32BE(20 + i * 16) };
  const upm = b.readUInt16BE(tables.head.off + 18);
  const nh = b.readUInt16BE(tables.hhea.off + 34);
  const cm = tables.cmap.off;
  const n = b.readUInt16BE(cm + 2);
  let sub = -1;
  for (let i = 0; i < n; i += 1) {
    const pid = b.readUInt16BE(cm + 4 + i * 8);
    const off = b.readUInt32BE(cm + 8 + i * 8);
    if (b.readUInt16BE(cm + off) === 4 && (pid === 3 || pid === 0)) { sub = cm + off; if (pid === 3) break; }
  }
  if (sub < 0) throw new Error('[TTF-ADVANCE] в шрифте нет cmap format 4: ' + file);
  const segX2 = b.readUInt16BE(sub + 6);
  const seg = segX2 / 2;
  const endO = sub + 14;
  const startO = endO + segX2 + 2;
  const deltaO = startO + segX2;
  const rangeO = deltaO + segX2;
  const glyph = (cp) => {
    for (let i = 0; i < seg; i += 1) {
      if (cp > b.readUInt16BE(endO + 2 * i)) continue;
      const s = b.readUInt16BE(startO + 2 * i);
      if (cp < s) return 0;
      const ro = b.readUInt16BE(rangeO + 2 * i);
      const d = b.readInt16BE(deltaO + 2 * i);
      if (ro === 0) return (cp + d) & 0xffff;
      const g = b.readUInt16BE(rangeO + 2 * i + ro + 2 * (cp - s));
      return g === 0 ? 0 : (g + d) & 0xffff;
    }
    return 0;
  };
  return (text, size) => {
    let w = 0;
    for (const ch of text) w += b.readUInt16BE(tables.hmtx.off + 4 * Math.min(glyph(ch.codePointAt(0) || 0), nh - 1));
    return (w / upm) * size;
  };
}

module.exports = { loadAdvance };
