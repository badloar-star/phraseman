// зачем: удалить из jest-файла целые test()/it()-блоки, тело которых матчится на регулярное выражение
// (тесты удалённых при ретайре серверных функций). Скан учитывает строки, шаблонные литералы и
// комментарии, чтобы не порвать скобки. По умолчанию — dry-run; запись только с --write.
// Использование: node scripts/remove_test_blocks.mjs <file> <bodyRegex> [--write]
import fs from 'node:fs';

const [file, pattern, flag] = process.argv.slice(2);
if (!file || !pattern) {
  console.error('usage: remove_test_blocks.mjs <file> <bodyRegex> [--write]');
  process.exit(2);
}
const re = new RegExp(pattern);
const src = fs.readFileSync(file, 'utf8');

function endOfCall(text, openIdx) {
  // openIdx указывает на '(' вызова test(; возвращает индекс после парной ')'
  let depth = 0;
  for (let i = openIdx; i < text.length; i += 1) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') { i = text.indexOf('\n', i); if (i < 0) return -1; continue; }
    if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2) + 1; continue; }
    if (c === '\'' || c === '"') {
      for (i += 1; i < text.length && text[i] !== c; i += 1) if (text[i] === '\\') i += 1;
      continue;
    }
    if (c === '`') {
      for (i += 1; i < text.length && text[i] !== '`'; i += 1) {
        if (text[i] === '\\') i += 1;
        else if (text[i] === '$' && text[i + 1] === '{') {
          let d = 1;
          for (i += 2; i < text.length && d > 0; i += 1) {
            if (text[i] === '{') d += 1;
            else if (text[i] === '}') d -= 1;
          }
          i -= 1;
        }
      }
      continue;
    }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

const starts = [...src.matchAll(/^[ \t]*(?:test|it)\(/gm)];
const cuts = [];
for (const m of starts) {
  const open = m.index + m[0].length - 1;
  const end = endOfCall(src, open);
  if (end < 0) { console.error(`unbalanced block at offset ${m.index}`); process.exit(1); }
  const body = src.slice(m.index, end);
  if (re.test(body)) {
    let stop = end;
    if (src[stop] === ';') stop += 1;
    while (src[stop] === '\r' || src[stop] === '\n') stop += 1;
    const title = /\(\s*(['"`])(.*?)\1/.exec(body)?.[2] ?? '?';
    cuts.push({ from: m.index, to: stop, title });
  }
}
// вложенные/пересекающиеся блоки не ожидаются на верхнем уровне describe, но проверим
for (let i = 1; i < cuts.length; i += 1) {
  if (cuts[i].from < cuts[i - 1].to) { console.error('overlapping cuts'); process.exit(1); }
}
console.log(`${starts.length} test blocks, ${cuts.length} match`);
for (const c of cuts) console.log(`  - ${c.title}`);
if (flag === '--write') {
  let out = '';
  let pos = 0;
  for (const c of cuts) { out += src.slice(pos, c.from); pos = c.to; }
  out += src.slice(pos);
  fs.writeFileSync(file, out);
  console.log('written');
}
