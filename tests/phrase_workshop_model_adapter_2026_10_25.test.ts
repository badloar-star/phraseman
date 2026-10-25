// зачем (владелец 25.10, «Мастерская фраз»; координатор): модель входа и адаптер банка — чистые функции,
// их правила держим тестом: порядок «копится» → «замок Plus» → «открыто», порог 20, 56 занятий,
// адаптер не придумывает контент и воспроизводим по seed. Плюс сторож: модель и адаптер не тянут зачёты старого курса.
import fs from 'node:fs';
import path from 'node:path';

import {
  PHRASE_WORKSHOP_LESSON_SESSION_TOTAL,
  PHRASE_WORKSHOP_MIN_BANK_PHRASES,
  phraseWorkshopEntryReason,
  phraseWorkshopEntryState,
} from '../app/phrase_workshop_model';
import {
  PHRASE_WORKSHOP_ROUND_SIZE,
  phraseWorkshopPhraseId,
  phraseWorkshopRound,
  phraseWorkshopSlotDistractors,
  phraseWorkshopToLessonPhrase,
} from '../app/phrase_workshop_adapter_v1';
import type { LearningV2LessonBankPhraseV1 } from '../app/learning_v2_lesson_phrase_bank_core_v1';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const base = { enabled: true, completedSessions: PHRASE_WORKSHOP_LESSON_SESSION_TOTAL, bankPhrases: PHRASE_WORKSHOP_MIN_BANK_PHRASES, hasPlus: true };

const entry = (text: string, tokens: string[], distractors: string[] = ['ready', 'late', 'tired']): LearningV2LessonBankPhraseV1 => ({
  targetPhrase: text, meaning: { ru: `ru ${text}`, uk: `uk ${text}`, es: `es ${text}`, 'pt-BR': `pt ${text}` }, tokens, distractors, sourceSessionOrdinal: 3,
});

describe('мастерская фраз: состояние входа', () => {
  it('открыто только при флаге, 56 занятиях, банке ≥ 20 и Plus', () => {
    expect(phraseWorkshopEntryState(base)).toBe('open');
    expect(phraseWorkshopEntryState({ ...base, enabled: false })).toBe('hidden');
    expect(phraseWorkshopEntryState({ ...base, completedSessions: 55 })).toBe('hidden');
    expect(phraseWorkshopEntryState({ ...base, completedSessions: Number.NaN })).toBe('hidden');
  });

  it('тонкий банк = «копится» раньше замка Plus (покупка не ведёт в тупик)', () => {
    expect(phraseWorkshopEntryState({ ...base, bankPhrases: PHRASE_WORKSHOP_MIN_BANK_PHRASES - 1 })).toBe('accumulating');
    expect(phraseWorkshopEntryState({ ...base, bankPhrases: 0, hasPlus: false })).toBe('accumulating');
  });

  it('без Plus при готовом банке — замок Plus; неподтверждённый статус = без Plus', () => {
    expect(phraseWorkshopEntryState({ ...base, hasPlus: false })).toBe('locked_plus');
  });

  it('причина для журнала содержит сами значения, а не голые true/false', () => {
    const reason = phraseWorkshopEntryReason({ ...base, bankPhrases: 7, hasPlus: false });
    expect(reason).toContain('completed=56/56');
    expect(reason).toContain('bank=7/20');
    expect(reason).toContain('plus=false');
  });
});

describe('мастерская фраз: адаптер банка в LessonPhrase', () => {
  it('фраза, перевод и порядок слов переносятся без выдумок', () => {
    const phrase = phraseWorkshopToLessonPhrase(entry('I am here.', ['I', 'am', 'here']));
    expect(phrase.english).toBe('I am here.');
    expect(phrase.russian).toBe('ru I am here.');
    expect(phrase.ukrainian).toBe('uk I am here.');
    expect(phrase.spanish).toBe('es I am here.');
    expect(phrase.sourceLocales).toEqual({ es: 'es I am here.', 'pt-BR': 'pt I am here.' });
    expect(phrase.words.map((w) => w.text)).toEqual(['I', 'am', 'here']);
    expect(phrase.words.every((w) => w.correct === w.text)).toBe(true);
  });

  it('неверные плитки слота: из общего списка, без самого слова и дублей, не больше пяти', () => {
    const slot = phraseWorkshopSlotDistractors('am', ['AM', 'is', 'is', 'are', 'was', 'be', 'been', 'being'], 0);
    expect(slot).not.toContain('AM');
    expect(new Set(slot.map((w) => w.toLowerCase())).size).toBe(slot.length);
    expect(slot.length).toBeLessThanOrEqual(5);
    expect(phraseWorkshopSlotDistractors('x', [], 0)).toEqual([]);
  });

  it('нет русского — подсказка не пустая (английский или сама фраза)', () => {
    const phrase = phraseWorkshopToLessonPhrase({ ...entry('Hello.', ['Hello']), meaning: { en: 'Hello.' } });
    expect(phrase.russian).toBe('Hello.');
    expect(phrase.ukrainian).toBe('Hello.');
  });

  it('id стабилен для той же фразы (регистр и пробелы не важны) и различается для разных', () => {
    expect(phraseWorkshopPhraseId({ targetPhrase: 'I am here.' })).toBe(phraseWorkshopPhraseId({ targetPhrase: '  i AM   here. ' }));
    expect(phraseWorkshopPhraseId({ targetPhrase: 'I am here.' })).not.toBe(phraseWorkshopPhraseId({ targetPhrase: 'I am there.' }));
  });

  it('проход: воспроизводим по seed, ограничен размером раунда, без повторов', () => {
    const bank = Array.from({ length: 70 }, (_, i) => entry(`Phrase number ${i}.`, ['Phrase', 'number', String(i)]));
    const a = phraseWorkshopRound(bank, 7);
    const b = phraseWorkshopRound(bank, 7);
    const c = phraseWorkshopRound(bank, 8);
    expect(a.length).toBe(PHRASE_WORKSHOP_ROUND_SIZE);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
    expect(a.map((p) => p.id)).not.toEqual(c.map((p) => p.id));
    expect(new Set(a.map((p) => p.id)).size).toBe(a.length);
    expect(phraseWorkshopRound([], 1)).toEqual([]);
  });
});

describe('мастерская фраз: песочница', () => {
  it('модель, адаптер и флаг не тянут зачёты старого курса и сеть', () => {
    for (const file of ['app/phrase_workshop_model.ts', 'app/phrase_workshop_adapter_v1.ts', 'app/phrase_workshop_flag.ts']) {
      const code = read(file).replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/tryUnlockNextLesson|markLessonFinishedOnce|recordTodayTaskActivity|checkAchievements|grantLessonFirstCompleteBonus/);
      expect(code).not.toMatch(/AsyncStorage|firestore|httpsCallable|fetch\(/i);
    }
  });
});
