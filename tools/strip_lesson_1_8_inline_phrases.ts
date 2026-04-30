/**
 * Удаляет из app/lesson_data_1_8.ts массивы LESSON_[1-8]_PHRASES (после генерации .gen.ts).
 * Корректно обходит вложенные [] внутри объектов (words: [...]).
 * Запуск: npx tsx tools/strip_lesson_1_8_inline_phrases.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.join(__dir, '..', 'app', 'lesson_data_1_8.ts');

/** Сканер массива с учётом строк и комментариев. */
function skipExportConstBracketArray(s: string, exportLineStart: number): number {
  const eq = s.indexOf('=', exportLineStart);
  if (eq < 0) throw new Error('no =');
  let i = eq + 1;
  while (i < s.length && /\s/.test(s[i]!)) i++;
  if (s[i] !== '[') throw new Error('expected [');

  let depth = 0;
  while (i < s.length) {
    const c = s[i]!;

    if (c === '/' && s[i + 1] === '/') {
      i += 2;
      while (i < s.length && s[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      i += 2;
      while (i + 1 < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      i++;
      while (i < s.length) {
        const ch = s[i]!;
        if (ch === '\\') {
          i += 2;
          continue;
        }
        if (ch === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      i++;
      if (depth === 0) {
        while (i < s.length && /\s/.test(s[i]!)) i++;
        if (s[i] === ';') i++;
        while (i < s.length && (s[i] === '\r' || s[i] === '\n')) i++;
        return i;
      }
      continue;
    }
    i++;
  }
  throw new Error('unterminated array');
}

function stripLessonPhrases(ts: string): string {
  let s = ts;
  for (let n = 8; n >= 1; n--) {
    const startMark = `export const LESSON_${n}_PHRASES: LessonPhrase[] = [`;
    const i = s.indexOf(startMark);
    if (i < 0) throw new Error(`start not found LESSON_${n}_PHRASES`);
    const end = skipExportConstBracketArray(s, i);
    s = s.slice(0, i) + s.slice(end);
  }
  const inject = `
export {
  LESSON_1_PHRASES,
  LESSON_2_PHRASES,
  LESSON_3_PHRASES,
  LESSON_4_PHRASES,
  LESSON_5_PHRASES,
  LESSON_6_PHRASES,
  LESSON_7_PHRASES,
  LESSON_8_PHRASES,
} from './lesson_data_1_8_phrases_es.gen';

`;
  const anchor = "import { LessonIntroScreen, LessonPhrase } from './lesson_data_types';";
  const ix = s.indexOf(anchor);
  if (ix < 0) throw new Error('types import anchor missing');
  const insAt = ix + anchor.length;
  return `${s.slice(0, insAt)}\n${inject}${s.slice(insAt)}`;
}

function main() {
  const raw = readFileSync(TARGET, 'utf8');
  if (raw.includes("from './lesson_data_1_8_phrases_es.gen'")) {
    console.log('Already stripped / re-export present, skip');
    return;
  }
  writeFileSync(TARGET, stripLessonPhrases(raw), 'utf8');
  console.log('Updated', TARGET);
}

main();
