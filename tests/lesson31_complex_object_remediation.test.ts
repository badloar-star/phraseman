import fs from 'fs';
import path from 'path';
import { L31_FINAL_TRANSLATIONS, L31_NATURAL_ENGLISH, LESSON_31_PHRASES } from '../app/lesson_data_25_32';
import frozenLocales from './fixtures/lesson31_frozen_locales.json';

const EXPECTED_IDS = Array.from({ length: 50 }, (_, index) => `lesson31_phrase_${index + 1}`);
const MODELS_BY_POSITION = [
  ['made','pay'], ['heard','explain'], ['felt','fall'], ['made','open'], ['heard','sing'],
  ['let','eat'], ['felt','shake'], ['noticed','put'], ['heard','say'], ['saw','hit'],
  ['felt','touch'], ['heard','speak'], ['saw','fix'], ['heard','discuss'], ['would like','deliver'],
  ['let','inspect'], ['made','open'], ['felt','hit'], ['let','use'], ['made','work'],
  ['heard','demand'], ['felt','move'], ['saw','find'], ['made','rewrite'], ['heard','perform'],
  ['felt','burn'], ['let','interview'], ['made','pay'], ['felt','hit'], ['let','test'],
  ['saw','leave'], ['heard','ask'], ['felt','move'], ['noticed','leave'], ['made','follow'],
  ['heard','plan'], ['saw','sign'], ['let','paint'], ['felt','push'], ['heard','read'],
  ['made','take'], ['noticed','drop'], ['saw','jump'], ['heard','read'], ['felt','shake'],
  ['let','show'], ['made','finish'], ['heard','explain'], ['saw','fall'], ['felt','touch'],
] as const;
const MODELS = Object.fromEntries(EXPECTED_IDS.map((id, index) => [id, MODELS_BY_POSITION[index]])) as Record<string, readonly [string, string]>;

const BANNED_DISTRACTORS = new Set([
  'mans', 'drap', 'planed', 'planing', 'bused', 'busing', 'peopled', 'peopling',
  'time', 'day', 'do', 'does', 'person', 'place', 'thing', 'group', 'idea', 'object',
]);

const TARGETED_OPTIONS: Record<string, readonly string[]> = {
  driver: ['teacher', 'worker', 'manager', 'student', 'engineer'],
  explain: ['describe', 'discuss', 'present', 'repeat', 'clarify'],
  perform: ['sing', 'play', 'present', 'read', 'practice'],
  drop: ['put', 'leave', 'throw', 'set', 'hold'],
  plan: ['prepare', 'arrange', 'discuss', 'organize', 'cancel'],
};

describe('lesson 31 Complex Object remediation', () => {
  it('preserves the exact 50 ids and their order', () => {
    expect(LESSON_31_PHRASES.map((phrase) => phrase.id)).toEqual(EXPECTED_IDS);
  });

  it('uses the explicit finalized four-locale fixture for every id', () => {
    expect(Object.keys(L31_NATURAL_ENGLISH)).toEqual(EXPECTED_IDS);
    expect(Object.keys(L31_FINAL_TRANSLATIONS).sort()).toEqual([...EXPECTED_IDS].sort());
    for (const phrase of LESSON_31_PHRASES) expect(phrase).toMatchObject({
      english: L31_NATURAL_ENGLISH[phrase.id],
      ...L31_FINAL_TRANSLATIONS[phrase.id],
    });
  });

  it('matches the independent frozen four-locale fixture for all 50 rows', () => {
    expect(LESSON_31_PHRASES.map(({ id, english, russian, ukrainian, spanish }) => ({ id, english, russian, ukrainian, spanish }))).toEqual(frozenLocales);
  });

  it('keeps context-sensitive categories and article options grammatical', () => {
    const byCorrect = (correct: string) => LESSON_31_PHRASES.flatMap((phrase) => phrase.words ?? []).filter((word) => word.correct.toLowerCase() === correct);
    for (const [token, category] of [['well', 'adverb'], ['back', 'adverb'], ['whole', 'adjective'], ['would', 'modal']] as const) {
      expect(byCorrect(token).length).toBeGreaterThan(0);
      for (const word of byCorrect(token)) expect(word.category).toBe(category);
    }
    for (const article of [...byCorrect('a'), ...byCorrect('an')]) {
      expect(article.distractors).not.toContain(article.correct === 'a' ? 'an' : 'a');
    }
    expect(LESSON_31_PHRASES.find(({ id }) => id === 'lesson31_phrase_9')?.words?.find(({ correct }) => correct === 'those')?.category).toBe('determiner');
    expect(LESSON_31_PHRASES.find(({ id }) => id === 'lesson31_phrase_15')?.words?.find(({ correct }) => correct === 'this')?.category).toBe('determiner');
  });

  it('offers only the possible indefinite article after each correct "the"', () => {
    for (const phrase of LESSON_31_PHRASES) {
      const words = phrase.words ?? [];
      words.forEach((word, index) => {
        if (word.correct.toLowerCase() !== 'the') return;
        const next = words[index + 1]?.correct.toLowerCase() ?? '';
        const possible = /^[aeiou]/.test(next) ? 'an' : 'a';
        const impossible = possible === 'a' ? 'an' : 'a';
        expect(word.distractors).toContain(possible);
        expect(word.distractors).not.toContain(impossible);
        expect(word.distractors.some((option) => ['some', 'our', 'their', 'this', 'that'].includes(option.toLowerCase()))).toBe(true);
      });
    }
  });

  it('preserves each id\'s governor, governed verb, and infinitive form', () => {
    LESSON_31_PHRASES.forEach((phrase) => {
      const [governor, verb] = MODELS[phrase.id]!;
      const separator = governor === 'would like' ? String.raw`\s+.+?\s+to\s+` : String.raw`\s+.+?\s+`;
      expect(phrase.english.toLowerCase()).toMatch(new RegExp(String.raw`\b${governor}${separator}${verb}\b`));
    });
  });

  it('uses demonstratives only when the scene explicitly points or contrasts', () => {
    const demonstratives = /\b(?:this|that|these|those)\b/gi;
    const perRow = LESSON_31_PHRASES.map((phrase) => phrase.english.match(demonstratives)?.length ?? 0);
    expect(perRow.every((count) => count <= 1)).toBe(true);
    expect(perRow.reduce((sum, count) => sum + count, 0)).toBeLessThanOrEqual(10);
  });

  it('removes malformed and unrelated generic distractors', () => {
    for (const phrase of LESSON_31_PHRASES) for (const word of phrase.words ?? []) {
      expect(word.distractors.filter((item) => BANNED_DISTRACTORS.has(item.toLowerCase()))).toEqual([]);
    }
  });

  it('uses targeted same-slot alternatives for formerly broken high-risk tokens', () => {
    for (const [correct, allowed] of Object.entries(TARGETED_OPTIONS)) {
      const entries = LESSON_31_PHRASES.flatMap((phrase) => phrase.words ?? []).filter((word) => word.correct.toLowerCase() === correct);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) expect(entry.distractors.every((option) => allowed.includes(option.toLowerCase()))).toBe(true);
    }
  });

  it('diversifies formerly duplicated scenes', () => {
    const normalized = (id: string) => LESSON_31_PHRASES.find((row) => row.id === id)!.english.toLowerCase();
    for (const ids of [
      ['lesson31_phrase_3', 'lesson31_phrase_11', 'lesson31_phrase_18', 'lesson31_phrase_29', 'lesson31_phrase_50'],
      ['lesson31_phrase_7', 'lesson31_phrase_45'],
      ['lesson31_phrase_2', 'lesson31_phrase_48'],
      ['lesson31_phrase_40', 'lesson31_phrase_44'],
    ]) expect(new Set(ids.map(normalized)).size).toBe(ids.length);
  });

  it.each([
    ['lesson31_phrase_11', 'She felt the warm water touch her hands.'],
    ['lesson31_phrase_33', 'She felt the warm water move over her face.'],
    ['lesson31_phrase_50', 'She felt the soft fabric touch her arm.'],
  ])('keeps %s as a natural perception scene', (id, english) => {
    expect(LESSON_31_PHRASES.find((row) => row.id === id)?.english).toBe(english);
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
