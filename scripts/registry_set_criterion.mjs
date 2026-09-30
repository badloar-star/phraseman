// зачем: точечно менять accepted/evidence одного критерия в docs/phraseman-2.0/registries/tasks.json,
// не переформатируя весь вручную отформатированный файл (полная JSON.stringify-перезапись давала бы
// сотни строк шума в diff). Проверяет, что результат остаётся валидным JSON и что критерий найден один раз.
// Использование: node scripts/registry_set_criterion.mjs PM-171-A2 true "evidence 1" "evidence 2" ...
//   accepted = true|false; evidence-строки ЗАМЕНЯЮТ прежний массив evidence целиком.
import fs from 'node:fs';

const [id, acceptedArg, ...evidence] = process.argv.slice(2);
if (!id || !['true', 'false'].includes(acceptedArg)) {
  console.error('usage: registry_set_criterion.mjs <PM-000-A0> <true|false> [evidence...]');
  process.exit(2);
}
const file = 'docs/phraseman-2.0/registries/tasks.json';
let raw = fs.readFileSync(file, 'utf8');
const marker = `"id": "${id}"`;
const start = raw.indexOf(marker);
if (start < 0 || raw.indexOf(marker, start + 1) >= 0) {
  console.error(`criterion_not_unique_or_missing:${id}`);
  process.exit(1);
}
const accIdx = raw.indexOf('"accepted":', start);
const evIdx = raw.indexOf('"evidence":', start);
const nextId = raw.indexOf('"id":', start + marker.length);
if (accIdx < 0 || evIdx < accIdx || (nextId >= 0 && evIdx > nextId)) {
  console.error(`criterion_layout_unexpected:${id}`);
  process.exit(1);
}
const accEnd = raw.indexOf(acceptedArg === 'true' ? 'false' : 'true', accIdx);
const accMatch = /"accepted":\s*(true|false)/.exec(raw.slice(accIdx));
raw = raw.slice(0, accIdx) + `"accepted": ${acceptedArg}` + raw.slice(accIdx + accMatch[0].length);
// пересчитать позицию evidence после возможной смены длины значения
const ev2 = raw.indexOf('"evidence":', accIdx);
const arrStart = raw.indexOf('[', ev2);
let depth = 0;
let inStr = false;
let i = arrStart;
for (; i < raw.length; i += 1) {
  const c = raw[i];
  if (inStr) {
    if (c === '\\') i += 1;
    else if (c === '"') inStr = false;
  } else if (c === '"') inStr = true;
  else if (c === '[') depth += 1;
  else if (c === ']') {
    depth -= 1;
    if (depth === 0) break;
  }
}
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const body = evidence.length === 0
  ? '[]'
  : `[${eol}${evidence.map((e) => `          ${JSON.stringify(e)}`).join(`,${eol}`)}${eol}        ]`;
raw = raw.slice(0, arrStart) + body + raw.slice(i + 1);
JSON.parse(raw);
fs.writeFileSync(file, raw);
console.log(`ok ${id} accepted=${acceptedArg} evidence=${evidence.length}`);
void accEnd;
