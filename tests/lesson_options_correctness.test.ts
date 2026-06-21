import { getLessonData } from '../app/lesson_data_all';
import { getContractionFor, getPerWordDistracts, lookupContraction } from '../app/lesson1_smart_options';
import { phraseWordRowsForStudyTarget } from '../app/phrase_target_utils';

const sameChoice = (a: string, b: string): boolean =>
  String(a ?? '').trim().replace(/[.,!?;:]+$/g, '').toLowerCase()
  === String(b ?? '').trim().replace(/[.,!?;:]+$/g, '').toLowerCase();

describe('lesson word-bank options', () => {
  it('always includes the canonical correct option for every English lesson slot', () => {
    const missing: string[] = [];

    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const phrases = getLessonData(lessonId);
      for (const phrase of phrases) {
        const rows = phraseWordRowsForStudyTarget(phrase, 'en');
        rows.forEach((row, idx) => {
          const correct = row.correct ?? row.text;
          if (!correct || String(correct).trim() === '' || correct === '-') return;

          const options = getPerWordDistracts(phrase, idx, 'en');
          if (!options.some((option) => sameChoice(option, correct))) {
            missing.push(`L${lessonId}:${phrase.id}:words[${idx}] correct="${correct}" options=[${options.join(', ')}]`);
          }
        });
      }
    }

    expect(missing).toEqual([]);
  });

  it('keeps contractions selectable when the expanded two-word form is canonical', () => {
    const missing: string[] = [];

    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const phrases = getLessonData(lessonId);
      for (const phrase of phrases) {
        const rows = phraseWordRowsForStudyTarget(phrase, 'en');
        for (let idx = 0; idx < rows.length - 1; idx += 1) {
          const current = rows[idx].correct ?? rows[idx].text;
          const next = rows[idx + 1].correct ?? rows[idx + 1].text;
          const contraction = getContractionFor(current, next);
          if (!contraction) continue;

          const options = getPerWordDistracts(phrase, idx, 'en');
          if (!options.some((option) => sameChoice(option, contraction))) {
            missing.push(`L${lessonId}:${phrase.id}:words[${idx}] missing contraction "${contraction}" for "${current} ${next}"`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('keeps the expanded first token selectable when a contraction is canonical', () => {
    const missing: string[] = [];

    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const phrases = getLessonData(lessonId);
      for (const phrase of phrases) {
        const rows = phraseWordRowsForStudyTarget(phrase, 'en');
        rows.forEach((row, idx) => {
          const correct = row.correct ?? row.text;
          const expansion = lookupContraction(correct);
          if (!expansion) return;

          const options = getPerWordDistracts(phrase, idx, 'en');
          if (!options.some((option) => sameChoice(option, expansion[0]))) {
            missing.push(`L${lessonId}:${phrase.id}:words[${idx}] missing expansion "${expansion[0]}" for "${correct}"`);
          }
        });
      }
    }

    expect(missing).toEqual([]);
  });

  // Anti-guessability guard (user report, lesson 8 prepositions): a preposition answer must NEVER
  // be the only preposition on screen — otherwise it is solvable by shape, not by meaning.
  it('never leaves a preposition answer as the lone preposition among the options', () => {
    // Core prepositions only: words that function ALMOST exclusively as prepositions, so being
    // the lone preposition on screen is a genuine guess-by-shape bug. Multi-class words such as
    // near/over/before/after/since/behind/next/opposite/between/under/through/to/about are
    // deliberately excluded — they legitimately appear as adjectives/adverbs/conjunctions and may
    // correctly sit among same-class distractors.
    const PREPOSITIONS = new Set([
      'in', 'on', 'at', 'for', 'with', 'from', 'by', 'into', 'during', 'until',
    ]);
    const key = (w: string): string => String(w ?? '').trim().replace(/[.,!?;:]+$/g, '').toLowerCase();
    const lonely: string[] = [];

    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const phrases = getLessonData(lessonId);
      for (const phrase of phrases) {
        const rows = phraseWordRowsForStudyTarget(phrase, 'en');
        rows.forEach((row, idx) => {
          const correct = row.correct ?? row.text;
          if (!correct || !PREPOSITIONS.has(key(correct))) return;

          const options = getPerWordDistracts(phrase, idx, 'en');
          if (options.length === 0) return; // no options generated for this slot — covered elsewhere
          const otherPrepositions = options.filter(
            (option) => !sameChoice(option, correct) && PREPOSITIONS.has(key(option)),
          );
          if (otherPrepositions.length === 0) {
            lonely.push(`L${lessonId}:${phrase.id}:words[${idx}] preposition "${correct}" alone in [${options.join(', ')}]`);
          }
        });
      }
    }

    expect(lonely).toEqual([]);
  });
});
