// Аудит захардкоженных цветов экранов 2.0 (замечание владельца 10.10) → таблица «файл → строка → цвет → класс → токен темы».
// Запуск: node scripts/theme_colors_audit.mjs [выходной.md]. Только чтение кода; ничего не правит.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scanHardcodedColors } from '../tests/helpers/hardcoded_colors_scan.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const out = process.argv[2] ?? 'docs/phraseman-2.0/evidence/parity/THEME_COLORS_AUDIT_2026-10-10.md';

const ART = /(Svg|Art|Backdrop|Certificate|Ceremony|MintScene|MintSparks|CoinFace|Confetti|ScreenGradient|RewardModal|ProfileCard|share_cards|SpireTower|Gold|PremiumGoldUserName|VipGreen|YearWheel|LevelBadge|AuthProviderButtons)/;
const AREAS = [
  ['Карточки', /flashcards|cards-grid|CardsKit|Collection|PackHeader|PackEditor|community_pack|pack_opening|SavedCollection|MyPacks|Deck/i],
  ['Ошибки', /mistake|mistakes-panel/i],
  ['Видео', /youtube|video|lingman/i],
  ['Сообщество', /community|friends|spire|ReportPack|ReportUser/i],
  ['Монеты', /coin|rune|wallet|shop|rank/i],
  ['Результаты', /result|achievement|streak|stats|Stats|lesson_complete|level_up|Medal/i],
  ['Диалоги', /dialog|Dialog/i],
  ['Профиль/Настройки', /profile|settings|account|Settings/i],
];

const rgbaOf = (c) => {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/.exec(c);
  return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
};
const hexOf = (c) => {
  const m = /^#([0-9a-f]{3,8})$/i.exec(c);
  if (!m) return null;
  let h = m[1];
  if (h.length <= 4) h = [...h].map((x) => x + x).join('');
  const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a };
};

function classify(color, file, text) {
  if (ART.test(file)) return ['Иллюстрация/бренд', 'вне темы по замыслу (арт и брендовые палитры)'];
  const named = /^(white|black)$/.test(color);
  const v = named ? (color === 'white' ? { r: 255, g: 255, b: 255, a: 1 } : { r: 0, g: 0, b: 0, a: 1 }) : (rgbaOf(color) ?? hexOf(color));
  if (!v) return ['Другое', 'запросить токен у сессии «Темы»'];
  const dark = v.r < 40 && v.g < 40 && v.b < 40;
  const white = v.r > 235 && v.g > 235 && v.b > 235;
  const grey = Math.abs(v.r - v.g) < 14 && Math.abs(v.g - v.b) < 14;
  if (/shadowColor/.test(text)) return ['Тень', 'g.dropShadow'];
  if (dark && /(dim|scrim|backdrop|overlay|Backdrop)/i.test(text)) return ['Скрим', 'theme-exempt: тёмное затемнение под окном'];
  if (dark && v.a >= 0.3) return [/video|player|thumb|youtube/i.test(text + file) ? 'Медиа' : 'Скрим/подложка', /video|player|thumb|youtube/i.test(text + file) ? 'g.mediaScrim или theme-exempt (медиа-слой)' : 'g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим)'];
  if (white && v.a < 1) {
    const t = v.a < 0.07 ? 'g.hairlineSoft' : v.a < 0.16 ? 'g.glassEdge' : v.a < 0.35 ? 'g.bevelHi' : 'g.mediaInk + альфа';
    return ['Белый с альфой', t];
  }
  if (white) return ['Белый', 'g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках)'];
  if (grey && !dark) return ['Серый', v.a < 1 ? 'g.hairlineSoft / g.line' : (v.r < 90 ? 'g.opaqueControl' : v.r < 150 ? 'g.mutedText' : 'g.secondary')];
  if (dark) return ['Тёмная база', 'g.deepBase / g.deepBaseAlt / g.opaqueSheet'];
  const isGreen = v.g > v.r + 25 && v.g > v.b;
  const isRed = v.r > v.g + 40 && v.r > v.b + 30;
  if (isGreen || isRed) return ['Семантика', isGreen ? 'LV2_GOOD (g.good)' : 'LV2_BAD (g.bad)'];
  return ['Другое', 'запросить токен у сессии «Темы»'];
}

const scan = scanHardcodedColors(ROOT);
const rows = [];
for (const [file, hits] of Object.entries(scan)) {
  for (const h of hits) for (const color of h.colors) {
    const [cls, token] = classify(color, file, h.text);
    rows.push({ file, line: h.line, color, cls, token, area: (AREAS.find(([, re]) => re.test(file)) ?? ['Прочее'])[0] });
  }
}

const byCls = {};
for (const r of rows) byCls[r.cls] = (byCls[r.cls] ?? 0) + 1;
const byArea = {};
for (const r of rows) byArea[r.area] = (byArea[r.area] ?? 0) + 1;

const md = [];
md.push('# Цвета экранов 2.0 — аудит захардкоженных значений (10.10)', '');
md.push('Замечание владельца 10.10: цвета берутся ТОЛЬКО из токенов выбранной темы; макет «Авроры» — эталон формы и состава, а не источник HEX.');
md.push('Сканер: `tests/helpers/hardcoded_colors_scan.mjs` (тот же, что в сторожe-храповике `tests/theme_hardcoded_colors_ratchet.test.mjs`). Строки с `// theme-exempt: причина` не считаются.');
md.push('Не сканируются: файлы токенов тем и палитр, Главная, Learning V2 / factory_native, dev-экраны, онбординг, админка.', '');
md.push(`**Осталось:** ${rows.length} цветов в ${Object.keys(scan).length} файлах.`, '');
md.push('## По классам', '', '| Класс | Шт. |', '|---|---|');
for (const [k, n] of Object.entries(byCls).sort((a, b) => b[1] - a[1])) md.push(`| ${k} | ${n} |`);
md.push('', '## По областям', '', '| Область | Шт. |', '|---|---|');
for (const [k, n] of Object.entries(byArea).sort((a, b) => b[1] - a[1])) md.push(`| ${k} | ${n} |`);
md.push('', '## Таблица: файл → строка → цвет → класс → токен темы', '', '(иллюстрации и брендовые палитры сведены в одну строку на файл)', '');
md.push('| Область | Файл:строка | Цвет | Класс | Токен темы вместо |', '|---|---|---|---|---|');
const artSeen = new Set();
for (const r of rows.sort((a, b) => a.area.localeCompare(b.area) || a.file.localeCompare(b.file) || a.line - b.line)) {
  if (r.cls === 'Иллюстрация/бренд') {
    if (artSeen.has(r.file)) continue;
    artSeen.add(r.file);
    md.push(`| ${r.area} | ${r.file} | (палитра иллюстрации) | ${r.cls} | ${r.token} |`);
    continue;
  }
  md.push(`| ${r.area} | ${r.file}:${r.line} | \`${r.color}\` | ${r.cls} | ${r.token} |`);
}
writeFileSync(out, `${md.join('\n')}\n`);
console.log(`audit: ${rows.length} colors in ${Object.keys(scan).length} files → ${out}`);
console.log(JSON.stringify(byCls));
