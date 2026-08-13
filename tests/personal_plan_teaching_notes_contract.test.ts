import fs from 'fs';
import path from 'path';

import type { LessonPhrase, LessonTeachingNote } from '../app/lesson_data_types';
import {
  lessonTeachingNoteSeenStorageKey,
  parseLessonTeachingNoteSeenIds,
  resolvePhraseTeachingNote,
  serializeLessonTeachingNoteSeenIds,
} from '../app/lesson_teaching_notes';

const universalHelpNote: LessonTeachingNote = {
  id: 'plan_universal_help',
  titleRu: 'Why help works here',
  titleUk: 'Why help works here',
  titleEs: 'Why help works here',
  correctRu: 'Yes. I need help is short, clear, and safe in many everyday situations.',
  wrongRu: 'Use I need help when the main idea is that you need help. Do not explain imaginary choices here.',
};

const phrase: LessonPhrase = {
  id: 'plan_universal_001',
  english: 'I need help',
  russian: 'Мне нужна помощь.',
  ukrainian: 'Мені потрібна допомога.',
  words: [
    { text: 'I', correct: 'I', distractors: ['you', 'we'], category: 'pronoun' },
    { text: 'need', correct: 'need', distractors: ['have', 'take'], category: 'verb', teachingNote: universalHelpNote },
    { text: 'help', correct: 'help', distractors: ['time', 'money'], category: 'noun', teachingNote: universalHelpNote },
  ],
};

describe('personal plan teaching notes', () => {
  it('resolves different after-answer explanation tones without naming invented wrong options', () => {
    const correctNote = resolvePhraseTeachingNote(phrase, 'en', false, 'ru', 1);
    const wrongNote = resolvePhraseTeachingNote(phrase, 'en', true, 'ru', 1);

    expect(correctNote).toMatchObject({
      id: 'plan_universal_help',
      tone: 'correct',
    });
    expect(correctNote?.body).toContain('I need help');
    expect(wrongNote).toMatchObject({
      id: 'plan_universal_help',
      tone: 'wrong',
    });
    expect(wrongNote?.body).toContain('Use I need help');
    expect(wrongNote?.body).not.toMatch(/You're|He's|We're|appointment|viewing|under/);
  });

  it('shows correct-answer explanations only for notes that have not been seen in this lesson scope', () => {
    expect(resolvePhraseTeachingNote(phrase, 'en', false, 'ru', undefined, ['plan_universal_help'])).toBeNull();

    const repeatedWrong = resolvePhraseTeachingNote(
      phrase,
      'en',
      true,
      'ru',
      1,
      ['plan_universal_help'],
    );
    expect(repeatedWrong?.id).toBe('plan_universal_help');
    expect(repeatedWrong?.tone).toBe('wrong');
  });

  it('serializes teaching note memory by lesson scope and study target', () => {
    expect(lessonTeachingNoteSeenStorageKey('plan_phrase_universal_day1', 'en')).toBe(
      'lesson_teaching_notes_seen_v1:en:plan_phrase_universal_day1',
    );
    expect(parseLessonTeachingNoteSeenIds('["plan_universal_help","plan_universal_help",""]')).toEqual([
      'plan_universal_help',
    ]);
    expect(serializeLessonTeachingNoteSeenIds(['plan_need', 'plan_universal_help'])).toBe(
      '["plan_need","plan_universal_help"]',
    );
  });

  it('keeps after-answer teaching notes wired into the lesson result UI', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

    expect(source).toContain('resolvePhraseTeachingNote');
    expect(source).toContain('lessonTeachingNoteSeenStorageKey');
    expect(source).toContain('lessonTeachingNote');
    expect(source).toContain('testID="lesson-teaching-note"');
    expect(source).toContain("status === 'result'");
  });
});
