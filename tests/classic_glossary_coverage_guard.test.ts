/**
 * Полнота словаря классики: каждая фраза урока связана со словарём (Ревизор, 05.11.2026).
 *
 * зачем (владелец 05.11 09:05: «каждое слово изучается ровно в одном уроке», образец — старый английский курс): если фраза не связана ни с одним словом
 * словаря, человек видит в уроке слова, которых нет в списке «Слова урока». Порог — 99% фраз каждого курса (у en 99,1% — эталон).
 * Базовое состояние 05.11: en 1586/1600, es 1600, fr 1461, de 1288, it 1309 — КРАСНЫЙ для fr/de/it. Коммитить, когда словари дописаны.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
const COURSES = ['en', 'es', 'fr', 'de', 'it'] as const;

describe.each(COURSES)('полнота словаря %s', (course) => {
  it('не менее 99% фраз связаны хотя бы с одним словом словаря', () => {
    const lemmas = (JSON.parse(fs.readFileSync(path.join(ROOT, course, 'glossary.json'), 'utf8')) as { lemmas: Array<{ phraseIds: string[] }> }).lemmas;
    const linked = new Set(lemmas.flatMap((l) => l.phraseIds));
    let total = 0;
    const unlinkedByLesson: Record<number, number> = {};
    for (let n = 1; n <= 32; n += 1) {
      const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, course, `lessons-${String(n).padStart(2, '0')}.json`), 'utf8')) as { phrases: Array<{ id: string }> };
      for (const p of lesson.phrases) { total += 1; if (!linked.has(p.id)) unlinkedByLesson[n] = (unlinkedByLesson[n] ?? 0) + 1; }
    }
    const unlinked = Object.values(unlinkedByLesson).reduce((a, b) => a + b, 0);
    expect({ course, share: Number(((total - unlinked) / total).toFixed(3)), unlinkedByLesson }).toEqual(expect.objectContaining({ share: expect.any(Number) }));
    expect((total - unlinked) / total).toBeGreaterThanOrEqual(0.99);
  });
});
