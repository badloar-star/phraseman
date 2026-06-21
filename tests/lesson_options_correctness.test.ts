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

  // FALSE-NEGATIVE guard #1 (audit 2026-06-21): for a bare Russian "Это/То …" subject, the
  // deictics it/this/that are mutually-valid translations. When the correct tile is one of them,
  // NONE of the others may appear as a distractor (else a correct answer is marked wrong).
  it('never offers a cross-deictic distractor for a bare Russian "это/то" subject', () => {
    const DEIXIS = new Set(['it', 'this', 'that', 'these', 'those']);
    const key = (w: string): string => String(w ?? '').trim().replace(/[.,!?;:]+$/g, '').toLowerCase();
    const bad: string[] = [];

    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const phrases = getLessonData(lessonId);
      for (const phrase of phrases) {
        const ru = String((phrase as any).russian ?? '').toLowerCase();
        const bareDeictic =
          /(^|[^а-яё])(это|то|эти)([^а-яё]|$)/.test(ru) &&
          !/(этот|эта|эту|этой|этим|тот|та|ту|той|тем|те |тех|теми)/.test(ru);
        if (!bareDeictic) continue;
        const rows = phraseWordRowsForStudyTarget(phrase, 'en');
        rows.forEach((row, idx) => {
          const correct = row.correct ?? row.text;
          if (!correct || !DEIXIS.has(key(correct))) return;
          const options = getPerWordDistracts(phrase, idx, 'en');
          const crossDeictic = options.filter(
            (o) => !sameChoice(o, correct) && DEIXIS.has(key(o)),
          );
          if (crossDeictic.length > 0) {
            bad.push(`L${lessonId}:${phrase.id}:words[${idx}] "${correct}" (ru="${ru}") offers [${crossDeictic.join(', ')}]`);
          }
        });
      }
    }

    expect(bad).toEqual([]);
  });

  // FALSE-NEGATIVE guard #2 (audit 2026-06-21): polite request "Can you …?" == "Could you …?".
  // can must not offer could (and vice-versa) in an interrogative addressed to "you".
  it('never offers can<->could (or will<->would) in a polite request frame', () => {
    const key = (w: string): string => String(w ?? '').trim().replace(/[.,!?;:]+$/g, '').toLowerCase();
    const EQUIV: Record<string, string> = { can: 'could', could: 'can', will: 'would', would: 'will' };
    const bad: string[] = [];

    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const phrases = getLessonData(lessonId);
      for (const phrase of phrases) {
        const en = String((phrase as any).english ?? '').trim();
        const rows = phraseWordRowsForStudyTarget(phrase, 'en');
        rows.forEach((row, idx) => {
          const correct = row.correct ?? row.text;
          const ck = key(correct);
          if (!EQUIV[ck]) return;
          const isRequest = en.endsWith('?') && en.toLowerCase().startsWith(ck + ' ') && /\byou\b/i.test(en);
          if (!isRequest) return;
          const options = getPerWordDistracts(phrase, idx, 'en');
          if (options.some((o) => key(o) === EQUIV[ck])) {
            bad.push(`L${lessonId}:${phrase.id}:words[${idx}] "${correct}" in "${en}" offers "${EQUIV[ck]}"`);
          }
        });
      }
    }

    expect(bad).toEqual([]);
  });

  // WRONG-POOL guard (audit 2026-06-21): a month answer must get OTHER months as distractors,
  // not modals (May<->may homograph) or lexical look-alikes (January->junior/jaguar).
  it('gives months as distractors for a month answer (no modals / look-alikes)', () => {
    const MONTHS = new Set([
      'january', 'february', 'march', 'april', 'may', 'june', 'july',
      'august', 'september', 'october', 'november', 'december',
    ]);
    const key = (w: string): string => String(w ?? '').trim().replace(/[.,!?;:]+$/g, '').toLowerCase();
    const bad: string[] = [];

    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const phrases = getLessonData(lessonId);
      for (const phrase of phrases) {
        const rows = phraseWordRowsForStudyTarget(phrase, 'en');
        rows.forEach((row, idx) => {
          const correct = row.correct ?? row.text;
          if (!correct || !MONTHS.has(key(correct))) return;
          const options = getPerWordDistracts(phrase, idx, 'en');
          if (options.length === 0) return;
          const otherMonths = options.filter((o) => !sameChoice(o, correct) && MONTHS.has(key(o)));
          if (otherMonths.length === 0) {
            bad.push(`L${lessonId}:${phrase.id}:words[${idx}] month "${correct}" alone in [${options.join(', ')}]`);
          }
        });
      }
    }

    expect(bad).toEqual([]);
  });
});
