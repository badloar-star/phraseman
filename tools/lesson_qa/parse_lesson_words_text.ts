/**
 * Parses app/lesson_words.tsx as text — no React import.
 * Extracts WORDS_BY_LESSON: lessonId -> { en, pos }[]
 */

const EN_RE = /\{[\s\n]*en:\s*(['"])((?:\\.|(?!\1).)*)\1/g;

export type ParsedWord = { en: string; pos?: string };

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
