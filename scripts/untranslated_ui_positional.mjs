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

// Объявление `function имя(…) { DebugLogger.x(…); }` / `{ console.x(…); }` — тело ровно один вызов логгера (плюс хвостовой // комментарий).
const LOCAL_LOG_HELPER = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::\s*void\s*)?\{\s*(?:DebugLogger|console)\s*\.\s*(?:log|info|warn|error|debug)\s*\([^;]*?\)\s*;?[ \t]*(?:\/\/[^\n]*)?\s*\}/g;

/**
 * Вызов локального помощника журнала этого файла (`trace(`, `logTide(`, `logCta(` …) или null, если таких помощников нет.
 * зачем (координатор 12.10, английский в R1; Ядро: 14 ложных находок в LevelUpMintCeremony/SurveySheetModal): экраны заводят свои
 * обёртки над логгером, и сторож считал их русские сообщения экранным текстом. Журналом признаётся ТОЛЬКО функция, объявленная в этом же
 * файле, чьё тело — один вызов DebugLogger/console: проверка по телу, а не маска имени, поэтому экранная функция с похожим именем
 * (или чужой `trace` из другого файла) находкой остаётся.
 */
export function localLogHelperCall(source) {
  const names = [...new Set([...source.matchAll(LOCAL_LOG_HELPER)].map((m) => m[1]))];
  return names.length ? new RegExp(String.raw`(?:^|[^A-Za-z0-9_$.])(?:${names.join('|')})\s*\(`) : null;
}

/** Пары скобок `{…}`, `(…)`, `[…]` кода: строки и комментарии пропускаются. [открывающая, закрывающая] по индексам. */
export function bracketPairs(src) {
  const pairs = [];
  const stack = [];
  let quote = null;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') { const nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl; continue; }
    if (ch === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 1; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') stack.push(i);
    else if ((ch === ')' || ch === ']' || ch === '}') && stack.length) pairs.push([stack.pop(), i]);
  }
  return pairs;
}

const TOAST_RU_UK_LINE = /^\s*(message|label)(?:Ru|Uk)\s*:\s*[`'"]/;
const STRING_LITERAL = String.raw`(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\]|\\.)*\`)`;

/** Текст объекта/вызова `owner` без вложенных скобок — только его собственные ключи и аргументы. */
function ownLevelText(src, owner, pairs) {
  const children = pairs.filter((p) => p[0] > owner[0] && p[1] < owner[1]).sort((a, b) => a[0] - b[0]);
  let text = '';
  let cursor = owner[0] + 1;
  for (const [open, close] of children) {
    if (open < cursor) continue;
    text += src.slice(cursor, open);
    cursor = close + 1;
  }
  return text + src.slice(cursor, owner[1]);
}

/**
 * Маскирует строки тоста `messageRu:`/`messageUk:` (`labelRu:`/`labelUk:`), у которых английская пара того же вида
 * (`messageEn`/`labelEn`) с непустым литералом стоит В ТОМ ЖЕ объекте или вызове.
 * зачем (координатор 12.10, английский в R1): прежнее окно ±14 строк засчитывало `messageEn` СОСЕДНЕГО тоста — тост без
 * английского проходил мимо сторожа. И `messageEn: ''` переводом не является: английский интерфейс показал бы пустоту.
 */
// зачем: `original` — исходник того же размера до масок сканера. Маски переводчиков (L(…), t(…)) режут строки посреди литерала,
// и разбор скобок по уже замаскированному тексту терял кавычки — объект определялся неверно. Структуру берём из исходника.
export function maskToastEntriesWithEnglishInSameObject(src, original = src) {
  const base = original.length === src.length ? original : src;
  const pairs = bracketPairs(base);
  const baseLines = base.split('\n');
  let offset = 0;
  return src.split('\n').map((line, index) => {
    const start = offset;
    offset += line.length + 1;
    const kind = baseLines[index]?.match(TOAST_RU_UK_LINE)?.[1];
    if (!kind) return line;
    const pos = start + baseLines[index].search(/\S/);
    let owner = null;
    for (const p of pairs) if (base[p[0]] !== '[' && p[0] < pos && pos < p[1] && (!owner || p[0] > owner[0])) owner = p;
    if (!owner) return line;
    const enKey = new RegExp(String.raw`(?:^|[^A-Za-z0-9_$])${kind}En\s*:\s*(${STRING_LITERAL})`, 'g');
    const translated = [...ownLevelText(base, owner, pairs).matchAll(enKey)].some((m) => isEnglishToastText(m[1]));
    return translated ? line.replace(/[^\r]/g, ' ') : line;
  }).join('\n');
}

/** Английский текст тоста: непустой литерал без кириллицы; шаблон с `${…}` засчитывается, если у него есть свой непустой текст. */
function isEnglishToastText(literal) {
  if (isNonEmptyEnglishLiteral(literal)) return true;
  const m = /^`([\s\S]*)`$/.exec(literal);
  if (!m) return false;
  const fixedText = m[1].replace(/\$\{[^}]*\}/g, '');
  return /[A-Za-z]/.test(fixedText) && !CYRILLIC.test(fixedText);
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
