// зачем (владелец 25.10, классический режим после урока V2; координатор): банк фраз урока копится при показе
// «Сборки фразы». Тест держит чистое ядро (проекция, дубликаты, лимит, битые записи, ключ) и подключение в плеере.
import fs from 'node:fs';
import path from 'node:path';

import {
  LEARNING_V2_LESSON_BANK_MAX_PHRASES_V1,
  learningV2LessonBankKeyV1,
  mergeLearningV2LessonBankPhraseV1,
  parseLearningV2LessonBankV1,
  projectLearningV2LessonBankPhraseV1,
  type LearningV2LessonBankPhraseV1,
} from '../app/learning_v2_lesson_phrase_bank_core_v1';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

const builderPayload = {
  family: 'phrase_builder',
  targetPhrase: 'I am here.',
  localizedMeaning: { ru: 'Я здесь.', uk: 'Я тут.', en: 'I am here.' },
  orderedTokens: ['I', 'am', 'here'],
  authoredDistractorTokens: ['ready'],
  slotFeedback: [],
};

const phrase = (text: string, session = 1): LearningV2LessonBankPhraseV1 => ({
  targetPhrase: text, meaning: { ru: text }, tokens: [text], distractors: [], sourceSessionOrdinal: session,
});

describe('банк фраз урока V2: ядро', () => {
  it('проекция берёт фразу, перевод, слова и лишние слова из «Сборки фразы»', () => {
    const r = projectLearningV2LessonBankPhraseV1(builderPayload, 3);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.phrase).toEqual({
        targetPhrase: 'I am here.',
        meaning: { ru: 'Я здесь.', uk: 'Я тут.', en: 'I am here.' },
        tokens: ['I', 'am', 'here'],
        distractors: ['ready'],
        sourceSessionOrdinal: 3,
      });
    }
  });

  it('другие виды заданий и неполные данные отвергаются с причиной', () => {
    expect(projectLearningV2LessonBankPhraseV1(null, 1)).toEqual({ ok: false, reason: 'no_payload' });
    expect(projectLearningV2LessonBankPhraseV1({ family: 'listen_choose' }, 1)).toEqual({ ok: false, reason: 'family_listen_choose' });
    const broken = projectLearningV2LessonBankPhraseV1({ ...builderPayload, orderedTokens: [] }, 1);
    expect(broken.ok).toBe(false);
    expect(projectLearningV2LessonBankPhraseV1(builderPayload, 0).ok).toBe(false);
  });

  it('копия не делит ссылки с заданием', () => {
    const r = projectLearningV2LessonBankPhraseV1(builderPayload, 1);
    if (!r.ok) throw new Error('projection failed');
    expect(r.phrase.tokens).not.toBe(builderPayload.orderedTokens);
    expect(r.phrase.meaning).not.toBe(builderPayload.localizedMeaning);
  });

  it('дубликат (регистр и пробелы) не добавляется, лимит держится', () => {
    const first = mergeLearningV2LessonBankPhraseV1([], phrase('I am here.'));
    expect(first.result).toBe('added');
    expect(mergeLearningV2LessonBankPhraseV1(first.phrases, phrase('  i AM   here. ', 2)).result).toBe('duplicate');
    const full = Array.from({ length: LEARNING_V2_LESSON_BANK_MAX_PHRASES_V1 }, (_, i) => phrase(`p${i}`));
    expect(mergeLearningV2LessonBankPhraseV1(full, phrase('new one')).result).toBe('full');
  });

  it('битая запись в хранилище отбрасывается, остальное живёт; мусор даёт пустой банк', () => {
    const good = phrase('Good one');
    const raw = JSON.stringify([good, { targetPhrase: 5 }, null]);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseLearningV2LessonBankV1(raw)).toEqual([good]);
    expect(parseLearningV2LessonBankV1('{not json')).toEqual([]);
    expect(parseLearningV2LessonBankV1('{}')).toEqual([]);
    expect(parseLearningV2LessonBankV1(null)).toEqual([]);
    expect(warn).toHaveBeenCalled(); // сбой разбора не молчит
    warn.mockRestore();
  });

  it('ключ привязан к аккаунту, языку и уроку; кривой вход бросает', () => {
    const hash = 'a'.repeat(64);
    expect(learningV2LessonBankKeyV1(hash, 'en', 7)).toBe(`learning-v2:phrase-bank:v1:${hash}:en:lesson:7`);
    expect(() => learningV2LessonBankKeyV1('x', 'en', 7)).toThrow();
    expect(() => learningV2LessonBankKeyV1(hash, 'EN', 7)).toThrow();
    expect(() => learningV2LessonBankKeyV1(hash, 'en', 0)).toThrow();
  });
});

describe('банк фраз урока V2: подключение', () => {
  const player = read('app/learning_v2_direct_session_player_v1.tsx');
  const store = read('app/learning_v2_lesson_phrase_bank_v1.ts');

  it('плеер пишет в банк только для phrase_builder и не в предпросмотре автора', () => {
    expect(player).toContain('import { recordLearningV2LessonBankPhraseV1 } from "./learning_v2_lesson_phrase_bank_v1";');
    expect(player).toMatch(/if \(isAuthoringPreview \|\| !runSummary \|\| !practice \|\| practice\.modePayload\?\.family !== "phrase_builder"\) return;/);
    expect(player).toContain('}).catch(noteSwallowedHandler("player:lessonBankRecord"));');
  });

  it('хранилище не ходит в сеть и не трогает прогресс/награды', () => {
    // комментарии вычищаем: в них слова про Firestore/награды допустимы («0 чтений Firestore»)
    const code = store.replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/firestore|httpsCallable|getFunctions|fetch\(/i);
    expect(code).not.toMatch(/tryUnlockNextLesson|markLessonFinishedOnce|recordTodayTaskActivity|checkAchievements/);
    expect(code).toContain('withAccountTransitionLock');
  });
});
