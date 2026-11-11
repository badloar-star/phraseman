import { classicLessonWordBank } from '../app/classic_lesson_words';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const excludedByCourse = {
  en: ['tom', 'anna'],
  es: ['ana', 'luis'],
  fr: ['léa', 'paul'],
  de: ['anna', 'tom', 'weber'],
  it: ['lea', 'paolo'],
} as const;

describe('confirmed personal names are never standalone classic vocabulary', () => {
  it.each(Object.entries(excludedByCourse))('%s excludes the confirmed names across all 32 lessons', (course, excluded) => {
    const forms = new Set(
      Array.from({ length: 32 }, (_, index) => classicLessonWordBank(course as keyof typeof excludedByCourse, index + 1))
        .flatMap((words) => words.map((word) => word.en.toLocaleLowerCase())),
    );

    expect(excluded.filter((form) => forms.has(form))).toEqual([]);
  });
});

test('validator rejects malformed records and validates the exact source first encounter', () => {
  const moduleUrl = pathToFileURL(path.join(__dirname, '..', 'scripts', 'classic_vocab_exclusions.mjs')).href;
  const script = `import { validateProperNameExclusions, isClassicVocabExcluded } from ${JSON.stringify(moduleUrl)};
const valid = { schema: 'phraseman.classic-vocab-proper-name-exclusions/1', records: [{ course: 'de', form: 'tom', firstLesson: 1 }] };
const invalid = [
  { ...valid, records: [{ course: 'de', firstLesson: 1 }] },
  { ...valid, records: [{ course: 'xx', form: 'tom', firstLesson: 1 }] },
  { ...valid, records: [{ course: 'de', form: 'tom', firstLesson: 1 }, { course: 'de', form: 'tom', firstLesson: 1 }] },
  { ...valid, records: [{ course: 'de', form: 'tom', firstLesson: 0 }] },
  { ...valid, records: [{ course: 'de', form: 'tom', firstLesson: '1' }] },
  { ...valid, records: [{ course: 'de', form: 'nobody', firstLesson: 1 }] },
  { ...valid, records: [{ course: 'de', form: 'tom', firstLesson: 2 }] },
  { ...valid, records: [{ course: 'de', form: 'Tom', firstLesson: 1 }] },
  { ...valid, unexpected: true },
  { ...valid, records: [{ course: 'de', form: 'tom', firstLesson: 1, unexpected: true }] },
  { ...valid, schema: 'invalid/schema' },
];
validateProperNameExclusions(valid);
if (invalid.some((value) => { try { validateProperNameExclusions(value); return true; } catch { return false; } })) process.exit(2);
try { validateProperNameExclusions({ ...valid, records: [{ course: 'de', form: 'may', firstLesson: 1 }] }); process.exit(3); } catch {}
if (isClassicVocabExcluded('de', 'may', 1) || !isClassicVocabExcluded('de', 'tom', 1) || isClassicVocabExcluded('de', 'tom', 2)) process.exit(4);
`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  expect(result.status).toBe(0);
});
