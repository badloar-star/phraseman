// зачем (координатор 25.10, пейвол «Вариант М»): тексты Переводчика (docs/work/paywall-m-context-strings-2026-10-25.translations.md, 8 языков)
// + русский исходник (…-strings-2026-10-25.md) → один файл components/paywall/m/paywall_m_copy.generated.ts. Руками таблицу не переписываем:
// поправили перевод в md — запустили `node scripts/paywall_m_copy_build.mjs`. Две договорённости с координатором (25.10):
//  1) «попытки» в m.chart.note.voice заменены вариантом без слова (сторож no_dev_jargon_visible_copy);
//  2) «Сегодня 0 €» — в тексте подстановка {zero}, ноль берётся из строки цены магазина (код), без жёсткой валюты.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

// ячейки таблицы: `|` внутри ячейки записан как `\|` (формы по числу) — делим только по неэкранированным
function cells(line) {
  const out = [];
  let cur = '';
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '\\' && body[i + 1] === '|') { cur += '|'; i += 1; continue; }
    if (body[i] === '|') { out.push(cur.trim()); cur = ''; continue; }
    cur += body[i];
  }
  out.push(cur.trim());
  return out;
}

const table = new Map();
const addRow = (key, values) => { table.set(key, values); };

for (const line of read('docs/work/paywall-m-context-strings-2026-10-25.md').split('\n')) {
  if (!line.startsWith('| m') ) continue;
  const c = cells(line);
  if (c.length === 2 && /^mc?\./.test(c[0])) addRow(c[0], { ru: c[1] });
}
for (const line of read('docs/work/paywall-m-context-strings-2026-10-25.translations.md').split('\n')) {
  if (!/^\| mc?\./.test(line)) continue;
  const c = cells(line);
  if (c.length !== 9) continue;
  const key = c[0];
  const base = key.replace(/ \(.*\)$/, '');
  const values = Object.fromEntries(LANGS.slice(1).map((l, i) => [l, c[i + 1]]));
  if (key !== base) { table.set(`${base}#variant`, values); continue; }
  const ru = table.get(key)?.ru;
  if (ru === undefined) { console.error('нет русского для', key); process.exitCode = 1; continue; }
  table.set(key, { ru, ...values });
}
// вариант без «попыток»: русский — вручную (владелец убрал «кухню», переводы по смыслу уже даны Переводчиком)
const voice = table.get('m.chart.note.voice#variant');
if (voice) table.set('m.chart.note.voice', { ru: 'Твой темп сегодня — {pace} фраз в день. Бесплатно — три фразы вслух в день.', ...voice });
table.delete('m.chart.note.voice#variant');

// русский: числа из кода склоняем по числу (у uk/pl формы уже размечены Переводчиком), «0 €» → подстановка {zero} (договорённость 2)
const RU_FORMS = [
  [/\{(n|pace|limit)\} фраз(?!ы|а)/g, '{$1} [фраза|фразы|фраз]'],
  [/\{(n|limit)\} реплик/g, '{$1} [реплика|реплики|реплик]'],
  [/\{(n|min)\} минут/g, '{$1} [минута|минуты|минут]'],
  [/\{n\} твоих фраз/g, '{n} [твоя фраза|твои фразы|твоих фраз]'],
  [/\{(n|days)\} дней/g, '{$1} [день|дня|дней]'],
  [/\{(n)\} занятий/g, '{$1} [занятие|занятия|занятий]'],
  [/\{(n|done)\} урок(?:а|ов)/g, '{$1} [урок|урока|уроков]'],
  [/Сегодня 0 €/g, 'Сегодня {zero}'],
];
for (const [key, v] of table) {
  let ru = v.ru;
  for (const [re, to] of RU_FORMS) ru = ru.replace(re, to);
  if (ru !== v.ru) table.set(key, { ...v, ru });
}

// владелец 25.10 («бредовый текст»): строка говорит, что человек получит или что случилось, прямо. Русский исправлен здесь, пока Переводчик не пришлёт
// проверенный список по всем языкам М; остальные языки этих двух строк ждут Переводчика (в таблице остаются прежние переводы).
const RU_OVERRIDES = {
  'm.head.streak.title': 'Пропущенный день не сбросит серию',
  'mc.streak.title': 'Пропущенный день не сбросит серию',
};
for (const [key, ru] of Object.entries(RU_OVERRIDES)) {
  const row = table.get(key);
  if (row) table.set(key, { ...row, ru });
}

const lines = [];
for (const [key, v] of [...table].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (LANGS.some((l) => typeof v[l] !== 'string')) { console.error('неполная строка', key, Object.keys(v)); process.exitCode = 1; continue; }
  lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(v)},`);
}
const out = `// АВТОГЕНЕРАЦИЯ: node scripts/paywall_m_copy_build.mjs (не править руками — править docs/work/paywall-m-context-strings-2026-10-25*.md).
// Строки пейвола «Вариант М», 9 языков. Подстановки {n} {price} {zero} … и формы по числу [одна|две|много] разбирает paywall_m_copy.ts.
export type PaywallMCopyRow = Readonly<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>;

export const PAYWALL_M_COPY_ROWS = {
${lines.join('\n')}
} as const satisfies Record<string, PaywallMCopyRow>;

export type PaywallMCopyKey = keyof typeof PAYWALL_M_COPY_ROWS;
`;
writeFileSync(join(ROOT, 'components/paywall/m/paywall_m_copy.generated.ts'), out);
console.log('строк:', lines.length);
