/**
 * Позиционные помощники перевода для сторожа scripts/scan_untranslated_ui.mjs.
 *
 * зачем (координатор 12.10, EN_READINESS): экраны монет пишут тексты через локальные помощники
 * `tl(ru, uk, en, es)` и `showToast(type, ru[, uk], en)` — английский есть у каждой строки, а сторож их не знал и
 * считал русский аргумент «непереведённым» (~30 ложных находок). Правило координатора: такой вызов признаётся
 * переводом ТОЛЬКО если en-аргумент — непустой строковый литерал без кириллицы. Пустой, нестроковый или
 * отсутствующий en — по-прежнему находка: сторож не ослабляется.
 */

const POSITIONAL_HELPERS = Object.freeze([
  // tl(ru, uk, en, es): en — третий аргумент.
  { name: 'tl', minArgs: 3, maxArgs: 4, enIndex: (count) => 2 },
  // showToast(type, ru, en) или showToast(type, ru, uk, en): en — последний аргумент.
  { name: 'showToast', minArgs: 3, maxArgs: 4, enIndex: (count) => count - 1 },
]);

const CALL_START = /(^|[^A-Za-z0-9_$])(tl|showToast)\s*\(/g;
const CYRILLIC = /[а-яА-ЯёЁіїєґІЇЄҐ]/;

/** Аргументы вызова верхнего уровня, начиная с открывающей скобки `open`; null — вызов не закрыт. */
export function splitCallArgs(src, open) {
  const args = [];
  let depth = 0;
  let current = '';
  let quote = null;
  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      current += ch;
      if (ch === '\\') { current += src[i + 1] ?? ''; i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; current += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
      if (depth === 1 && ch === '(') continue;
      current += ch;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth -= 1;
      if (depth === 0) {
        if (current.trim()) args.push(current.trim());
        return { args, end: i + 1 };
      }
      current += ch;
      continue;
    }
    if (ch === ',' && depth === 1) { args.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  return null;
}

/** Непустой строковый литерал ('…', "…" или `…` без ${}) без кириллицы. */
export function isNonEmptyEnglishLiteral(arg) {
  const m = /^(['"`])([\s\S]*)\1$/.exec(arg ?? '');
  if (!m) return false;
  if (m[1] === '`' && m[2].includes('${')) return false;
  return m[2].trim().length > 0 && !CYRILLIC.test(m[2]);
}

/** Маскирует (пробелами, с сохранением переводов строк) вызовы tl/showToast с непустым английским аргументом. */
export function maskPositionalTranslatorCalls(src) {
  const mask = (value) => value.replace(/[^\r\n]/g, ' ');
  let out = '';
  let cursor = 0;
  for (const match of src.matchAll(CALL_START)) {
    const nameStart = match.index + match[1].length;
    if (nameStart < cursor) continue;
    const helper = POSITIONAL_HELPERS.find((h) => h.name === match[2]);
    const open = src.indexOf('(', nameStart);
    const parsed = splitCallArgs(src, open);
    if (!helper || !parsed) continue;
    const { args, end } = parsed;
    if (args.length < helper.minArgs || args.length > helper.maxArgs) continue;
    if (!isNonEmptyEnglishLiteral(args[helper.enIndex(args.length)])) continue;
    out += src.slice(cursor, nameStart) + mask(src.slice(nameStart, end));
    cursor = end;
  }
  return out + src.slice(cursor);
}
