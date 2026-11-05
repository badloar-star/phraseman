/**
 * Словарь классики: в уроке N только новые слова, каждое слово — ровно в одном уроке (Ревизор, 05.11.2026).
 *
 * зачем (дополнение владельца 05.11 09:05 «Слова (словарь) по образцу старого английского: в уроке N показываются ТОЛЬКО новые слова, которые
 * встречаются в этом уроке; слова прошлых уроков не повторяются; каждое слово изучается ровно в одном уроке»): сторож структуры glossary.json
 * для en/es/fr/de/it. Полноту (каждое слово фраз присутствует) держит отдельный классик_glossary_coverage (красный до дописывания словарей).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
const COURSES = ['en', 'es', 'fr', 'de', 'it'] as const;

type Lemma = { lemma: string; meaning: Record<string, string>; firstLesson: number; phraseIds: string[] };
const lessonOf = (id: string): number => Number(id.match(/(\d\d)[:.](\d\d)$/)?.[1] ?? NaN);

function load(course: string): { lemmas: Lemma[]; phraseIds: Set<string> } {
  const lemmas = (JSON.parse(fs.readFileSync(path.join(ROOT, course, 'glossary.json'), 'utf8')) as { lemmas: Lemma[] }).lemmas;
  const phraseIds = new Set<string>();
  for (let n = 1; n <= 32; n += 1) {
    const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, course, `lessons-${String(n).padStart(2, '0')}.json`), 'utf8')) as { phrases: Array<{ id: string }> };
    lesson.phrases.forEach((p) => phraseIds.add(p.id));
  }
  return { lemmas, phraseIds };
}

describe.each(COURSES)('словарь %s: только новые слова, каждое слово в одном уроке', (course) => {
  const { lemmas, phraseIds } = load(course);

  it('ни одно слово не повторяется в словаре (ровно один урок на слово)', () => {
    const seen = new Map<string, number>();
    const dup: string[] = [];
    for (const l of lemmas) {
      const key = l.lemma.trim().toLowerCase();
      if (seen.has(key)) dup.push(`${l.lemma}: уроки ${seen.get(key)} и ${l.firstLesson}`);
      seen.set(key, l.firstLesson);
    }
    expect(dup.slice(0, 10)).toEqual([]);
  });

  it('урок слова = самый ранний урок, где оно встречается; ни одна ссылка не ведёт в более ранний урок', () => {
    const bad = lemmas
      .filter((l) => Math.min(...l.phraseIds.map(lessonOf)) !== l.firstLesson || l.phraseIds.some((id) => lessonOf(id) < l.firstLesson))
      .map((l) => `${l.lemma}: firstLesson ${l.firstLesson}, фразы ${l.phraseIds.slice(0, 3).join(',')}`);
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('все ссылки слов на фразы существуют, у каждого слова есть перевод на ru и uk и хотя бы одна фраза', () => {
    const bad: string[] = [];
    for (const l of lemmas) {
      if (!l.phraseIds.length) bad.push(`${l.lemma}: нет фраз`);
      if (!l.meaning?.ru?.trim() || !l.meaning?.uk?.trim()) bad.push(`${l.lemma}: нет перевода ru/uk`);
      for (const id of l.phraseIds) if (!phraseIds.has(id)) bad.push(`${l.lemma}: фразы ${id} нет в курсе`);
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('в каждом из 32 уроков есть хотя бы одно новое слово (список урока не пуст)', () => {
    const perLesson = new Set(lemmas.map((l) => l.firstLesson));
    const empty = Array.from({ length: 32 }, (_, i) => i + 1).filter((n) => !perLesson.has(n));
    expect(empty).toEqual([]);
  });
});
