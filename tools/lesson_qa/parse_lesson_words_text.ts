/**
 * Parses app/lesson_words.tsx as text — no React import.
 * Extracts WORDS_BY_LESSON: lessonId -> { en, pos }[]
 */

const EN_RE = /\{[\s\n]*en:\s*(['"])((?:\\.|(?!\1).)*)\1/g;

export type ParsedWord = { en: string; pos?: string };

export type ParsedFullWord = { en: string; ru: string; uk: string; es: string; pos: string };

/** Read TS/JS single- or double-quoted string starting at line[i] (i must point at opening quote). */
function readTsString(line: string, i: number): { value: string; end: number } | null {
  const q = line[i];
  if (q !== "'" && q !== '"') return null;
  let j = i + 1;
  let out = '';
  while (j < line.length) {
    if (line[j] === '\\' && j + 1 < line.length) {
      const n = line[j + 1];
      if (n === "'" || n === '"' || n === '\\') {
        out += n;
        j += 2;
        continue;
      }
      out += n;
      j += 2;
      continue;
    }
    if (line[j] === q) return { value: out, end: j + 1 };
    out += line[j];
    j++;
  }
  return null;
}

function readField(line: string, key: string, searchFrom: number): { value: string; end: number } | null {
  const k = `${key}:`;
  const idx = line.indexOf(k, searchFrom);
  if (idx < 0) return null;
  let j = idx + k.length;
  while (j < line.length && /\s/.test(line[j])) j++;
  return readTsString(line, j);
}

/** One line `{ en: '…', ru: '…', … }`; returns null if malformed. */
export function parseFullWordLine(line: string): ParsedFullWord | null {
  if (!line.includes('{ en:')) return null;
  const en = readField(line, 'en', 0);
  if (!en) return null;
  const ru = readField(line, 'ru', 0);
  const uk = readField(line, 'uk', 0);
  const es = readField(line, 'es', 0);
  const pos = readField(line, 'pos', 0);
  if (!ru || !uk || !es || !pos) return null;
  return { en: en.value, ru: ru.value, uk: uk.value, es: es.value, pos: pos.value };
}

export function parseFullWordsByLessonFromFile(content: string): Map<number, ParsedFullWord[]> {
  const byLesson = new Map<number, ParsedFullWord[]>();
  const lessonRe = /^\s{2}(\d+):\s*\[/gm;
  const matches: { start: number; lessonId: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = lessonRe.exec(content)) !== null) {
    matches.push({ start: m.index, lessonId: parseInt(m[1], 10) });
  }
  for (let i = 0; i < matches.length; i++) {
    const { start, lessonId } = matches[i];
    const end = i + 1 < matches.length ? matches[i + 1].start : content.length;
    const block = content.slice(start, end);
    const words: ParsedFullWord[] = [];
    for (const line of block.split('\n')) {
      const w = parseFullWordLine(line);
      if (w) words.push(w);
    }
    byLesson.set(lessonId, words);
  }
  return byLesson;
}

export function parseWordsByLessonFromFile(content: string): Map<number, ParsedWord[]> {
  const byLesson = new Map<number, ParsedWord[]>();
  // Split by "  N: [" at line start
  const lessonRe = /^\s{2}(\d+):\s*\[/gm;
  const matches: { start: number; lessonId: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = lessonRe.exec(content)) !== null) {
    matches.push({ start: m.index, lessonId: parseInt(m[1], 10) });
  }
  for (let i = 0; i < matches.length; i++) {
    const { start, lessonId } = matches[i];
    const end = i + 1 < matches.length ? matches[i + 1].start : content.length;
    const block = content.slice(start, end);
    const words: ParsedWord[] = [];
    let em: RegExpExecArray | null;
    const localRe = new RegExp(EN_RE.source, 'g');
    while ((em = localRe.exec(block)) !== null) {
      const raw = em[2].replace(/\\(.)/g, '$1');
      words.push({ en: raw });
    }
    byLesson.set(lessonId, words);
  }
  return byLesson;
}
