/**
 * Слова заданий урока есть в словаре курса (Ревизор, 05.11.2026; дополнение владельца 09:05 + очередь координатора п.6).
 *
 * зачем: читатель-новичок нашёл, что слова из заданий (fr là/ne/pas, it lì/sono/sei/è/non, de Deutsch, en am/is/are/it/work) отсутствуют в списке «Слова урока».
 * Эвристика БЕЗ морфологии: слово фразы «покрыто», если оно совпадает со словом/частью слова леммы (lemma.split) из уроков ≤ N или имеет с ней общую основу из 4+ букв.
 * Формы глаголов (suis/es/est ↔ être) эвристика видит плохо, поэтому порог для уроков 1–3 — 90%, а точную проверку делает агент-читатель (блок Lн-WORDS в
 * scripts/classic_beginner_qa.cjs). Красный, пока словари fr/de/it/es не дописаны. Базовое состояние 05.11: fr/it ≈36%, de ≈31–52%, es ≈82%, en ≈89–99%.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
const COURSES = ['en', 'es', 'fr', 'de', 'it'] as const;
const LESSONS_CHECKED = [1, 2, 3] as const;
const MIN_SHARE = 0.9;

const words = (s: string): string[] => s.toLowerCase().replace(/[.,!?;:¿¡«»"“”()]/g, ' ').replace(/[’']/g, ' ').split(/\s+/).filter(Boolean);

describe.each(COURSES)('слова заданий %s есть в словаре уроков 1–N', (course) => {
  const lemmas = (JSON.parse(fs.readFileSync(path.join(ROOT, course, 'glossary.json'), 'utf8')) as { lemmas: Array<{ lemma: string; firstLesson: number }> }).lemmas;
  it.each(LESSONS_CHECKED)(`урок %i: не менее ${MIN_SHARE * 100}% слов фраз покрыты`, (n) => {
    const known = new Set<string>();
    lemmas.filter((l) => l.firstLesson <= n).forEach((l) => l.lemma.split(/[\s/’']+/).forEach((w) => { if (w) known.add(w.toLowerCase()); }));
    const stems = [...known].filter((k) => k.length >= 4).map((k) => k.slice(0, 4));
    const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, course, `lessons-${String(n).padStart(2, '0')}.json`), 'utf8')) as { phrases: Array<{ tiles: Array<{ correct: string }> }> };
    const tokens = new Set<string>();
    lesson.phrases.forEach((p) => p.tiles.forEach((t) => words(t.correct).forEach((w) => tokens.add(w))));
    const missing = [...tokens].filter((w) => !(known.has(w) || (w.length >= 4 && stems.includes(w.slice(0, 4)))));
    const share = 1 - missing.length / tokens.size;
    expect({ course, lesson: n, share: Number(share.toFixed(2)), missing: missing.slice(0, 25) }).toEqual(expect.objectContaining({ course, lesson: n }));
    expect(share).toBeGreaterThanOrEqual(MIN_SHARE);
  });
});
