// зачем ([BLEND-AUDIT], координатор 18.10): таблица «тема × элемент × контраст» для docs/phraseman-2.0/evidence/blend_1018.md.
// Запуск: node scripts/blend_1018_report.cjs  (пары и пороги — tests/blend_1018_pairs.ts, сторож — tests/blend_1018_audit.test.ts)
require('tsx/cjs');
const fs = require('node:fs');
const path = require('node:path');

const { PAIRS, run } = require('../tests/blend_1018_pairs.ts');

const { worstAfter, failsBefore, failsAfter } = run();
const keys = PAIRS.map((p) => `${p.element} | ${p.what}`);
const head = `| Тема | ${keys.join(' | ')} |\n|---|${keys.map(() => '---').join('|')}|\n`;
const rows = [...worstAfter.entries()].map(([id, row]) => `| ${id} | ${keys.map((k) => {
  const c = row.get(k);
  const pair = PAIRS.find((p) => `${p.element} | ${p.what}` === k);
  return `${c.min.toFixed(2)}${c.min < pair.min ? ' ❌' : ''}`;
}).join(' | ')} |`).join('\n');
const md = `# [BLEND-AUDIT] 18.10 — «кнопки нигде не сливаются», новинки 17.10

Расчёт по токенам liquidGlassTokens: 23 темы × тёмная/светлая × 5 положений ползунка; в ячейке — ХУДШЕЕ значение по оформлениям и ползункам. Пороги: заливка/графика ≥ 3, тон ≥ 1,5, текст ≥ 4,5. ❌ — ниже порога.

**Провалов «было → стало»: ${failsBefore} → ${failsAfter}** (по ${PAIRS.length} парам × 230 сочетаний тема/оформление/ползунок; «было» — токены до исправлений 17.10).

Пары (порог): ${PAIRS.map((p) => `${p.element} | ${p.what} (${p.min})`).join('; ')}.

Плашки Главной, хаба Карточек и лист шторки отделены тенью — по тону к фону не считаются; считается подпись/значок на них.

${head}${rows}
`;
fs.mkdirSync(path.join(process.cwd(), 'docs/phraseman-2.0/evidence'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'docs/phraseman-2.0/evidence/blend_1018.md'), md, 'utf8');
console.log(`BLEND failsBefore=${failsBefore} failsAfter=${failsAfter} pairs=${PAIRS.length}`);
