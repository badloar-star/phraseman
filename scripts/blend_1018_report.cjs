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

**Провалов по текущим токенам: ${failsAfter}** (по ${PAIRS.length} парам × 230 сочетаний тема/оформление/ползунок). Найден и исправлен 1 провал — выбранная плитка поля пар (alpha 0,16 → 0,32). Число «было ${failsBefore}» — РЕКОНСТРУКЦИЯ токенов до правок 17.10, не измерено, в отчёты не брать. ДЕФИЦИТ ЗАКРЫТ (18.10, решение Макетов): 16-пиксельная транскрипция на стопке хаба Карточек давала 4,10–4,49 вместо 4,5 в 26 из 230 сочетаний; доля цвета темы в первом слое stackFill 0,5 → 0,45 — теперь 0 из 230, худшее 4,87; слово 36/700 — крупный текст, ≥3 везде. Панель обратной связи V2 без обводки: тинт 12 % к странице ≈1,09:1 и «верно»/«неверно» различаются только оттенком — панель отделена тенью (nestedShadowStyle), в таблице это пары с зафиксированным полом. Пары сверены с кодом: плитки хаба — plateGradient(g) = gradient180(plateFillFrom, plateFillTo); «неверно/верно» в поле пар — p.wrong/p.correct = theme.wrong/correct (#F05454/#47C870 для всех стеклянных тем).

Пары (порог): ${PAIRS.map((p) => `${p.element} | ${p.what} (${p.min})`).join('; ')}.

Плашки Главной, хаба Карточек и лист шторки отделены тенью — по тону к фону не считаются; считается подпись/значок на них.

${head}${rows}
`;
fs.mkdirSync(path.join(process.cwd(), 'docs/phraseman-2.0/evidence'), { recursive: true });
const outPath = path.join(process.cwd(), 'docs/phraseman-2.0/evidence/blend_1018.md');
fs.writeFileSync(outPath + '.tmp', md, 'utf8'); // зачем: прямая запись поверх файла иногда падает на Windows (UNKNOWN) — пишем рядом и переименовываем
fs.renameSync(outPath + '.tmp', outPath);
console.log(`BLEND failsBefore=${failsBefore} failsAfter=${failsAfter} pairs=${PAIRS.length}`);
