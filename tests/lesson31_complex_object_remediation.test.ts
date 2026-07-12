import fs from 'fs';
import path from 'path';
import { LESSON_31_PHRASES } from '../app/lesson_data_25_32';

const EXPECTED_IDS = Array.from({ length: 50 }, (_, index) => `lesson31_phrase_${index + 1}`);
const MODELS = [
  ['made','pay'], ['heard','explain'], ['felt','fall'], ['made','open'], ['heard','sing'],
  ['let','eat'], ['felt','shake'], ['noticed','put'], ['heard','say'], ['saw','hit'],
  ['felt','hit'], ['heard','speak'], ['saw','fix'], ['heard','discuss'], ['would like','deliver'],
  ['let','inspect'], ['made','open'], ['felt','hit'], ['let','use'], ['made','work'],
  ['heard','demand'], ['felt','move'], ['saw','find'], ['made','rewrite'], ['heard','perform'],
  ['felt','burn'], ['let','interview'], ['made','pay'], ['felt','hit'], ['let','test'],
  ['saw','leave'], ['heard','ask'], ['felt','hit'], ['noticed','leave'], ['made','follow'],
  ['heard','plan'], ['saw','sign'], ['let','paint'], ['felt','push'], ['heard','read'],
  ['made','take'], ['noticed','drop'], ['saw','jump'], ['heard','read'], ['felt','shake'],
  ['let','show'], ['made','finish'], ['heard','explain'], ['saw','fall'], ['felt','hit'],
] as const;

describe('lesson 31 Complex Object remediation', () => {
  it('preserves the exact 50 ids and their order', () => {
    expect(LESSON_31_PHRASES.map((phrase) => phrase.id)).toEqual(EXPECTED_IDS);
  });

  it('preserves each id\'s governor, governed verb, and infinitive form', () => {
    LESSON_31_PHRASES.forEach((phrase, index) => {
      const [governor, verb] = MODELS[index]!;
      const separator = governor === 'would like' ? String.raw`\s+.+?\s+to\s+` : String.raw`\s+.+?\s+`;
      expect(phrase.english.toLowerCase()).toMatch(new RegExp(String.raw`\b${governor}${separator}${verb}\b`));
    });
  });

  it('removes the temporary 58-entry L31 exception ledger', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'tests/lesson_cumulative_vocabulary_coverage.test.ts'), 'utf8');
    expect(source).not.toContain('PENDING_L31_REMEDIATION');
  });

  it('aligns every English exercise token', () => {
    for (const phrase of LESSON_31_PHRASES) {
      expect(phrase.words?.map((word) => word.correct)).toEqual(phrase.english.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []);
    }
  });

  it('uses targeted distractors rather than one generic option set', () => {
    for (const phrase of LESSON_31_PHRASES) for (const word of phrase.words ?? []) {
      expect(word.distractors).not.toEqual(['this', 'these', 'those', 'then', 'there']);
      expect(new Set([word.correct, ...word.distractors]).size).toBe(word.distractors.length + 1);
    }
  });
});
