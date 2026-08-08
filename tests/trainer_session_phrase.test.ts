import {
  buildSessionWordBank,
  buildTrainerSessionDeck,
  isMeaningfulBankToken,
  normalizeGapToken,
  sessionMeaningfulTokens,
  trainerGapTokenIndex,
  trainerSessionPhrase,
} from '../app/trainer_practice_hall';
import type { TrainerItem } from '../app/trainer_store';

function arenaItem(question: string, correct: string, options: string[]): TrainerItem {
  return {
    key: question,
    queue: 'arena',
    translationRu: '',
    translationUk: '',
    arenaQuestion: { question, correct, options },
    lessonId: 0,
    mistakeCount: 2,
    correctStreak: 0,
    nextDue: 1,
    createdAt: 1,
    archived: false,
  };
}

function phraseItem(key: string, errorWord?: string): TrainerItem {
  return {
    key,
    queue: 'phrases',
    translationRu: 'ru',
    translationUk: 'uk',
    errorWord,
    lessonId: 1,
    mistakeCount: 2,
    correctStreak: 0,
    nextDue: 1,
    createdAt: 1,
    archived: false,
  };
}

describe('trainerSessionPhrase — сборка фразы арены из маркера пропуска', () => {
  it.each([
    ['She ___ to the store yesterday', 'went', 'She went to the store yesterday'],
    ['Could you — me a favor, please?', 'do', 'Could you do me a favor, please?'],
    ['I – never seen this before', 'have', 'I have never seen this before'],
    ['Tell me … you know', 'what', 'Tell me what you know'],
    ['He __ his keys again', 'lost', 'He lost his keys again'],
    ['We ... finish by tomorrow', 'must', 'We must finish by tomorrow'],
  ])('маркер в «%s» заменяется на correct', (question, correct, expected) => {
    const { phrase, errorWord } = trainerSessionPhrase(arenaItem(question, correct, []));
    expect(phrase).toBe(expected);
    expect(errorWord).toBe(correct);
  });

  it('маркер не найден — не додумываем: phrase=key, errorWord пуст', () => {
    const item = arenaItem('She sells seashells', 'went', []);
    expect(trainerSessionPhrase(item)).toEqual({ phrase: 'She sells seashells', errorWord: '' });
  });

  it('обычный phrases-айтем — key + errorWord без изменений', () => {
    const item = phraseItem('I have been there', 'have');
    expect(trainerSessionPhrase(item)).toEqual({ phrase: 'I have been there', errorWord: 'have' });
  });

  it('restores a missing question mark from the canonical lesson phrase', () => {
    const item = phraseItem('Does she have time on Friday', 'Does');
    item.lessonId = 8;

    expect(trainerSessionPhrase(item).phrase).toBe('Does she have time on Friday?');
  });
});

describe('word_bank арены — банк содержит правильное слово', () => {
  it('банк = meaningful-токены полной фразы, слоты непрерывны', () => {
    const item = arenaItem('She ___ to the store yesterday', 'went', ['go', 'gone', 'goes']);
    const { phrase } = trainerSessionPhrase(item);
    const bank = buildSessionWordBank(phrase);
    const bankTexts = bank.map((tile) => tile.text);
    // Слово-ответ физически есть в банке — фразу реально собрать.
    expect(bankTexts).toContain('went');
    // Банк = meaningful-токены фразы (регистр первой плитки строчится anti-hint'ом,
    // сама проверка ответа регистронезависима — сравниваем в нижнем регистре).
    expect(bankTexts.map((text) => text.toLowerCase()).sort())
      .toEqual(sessionMeaningfulTokens(phrase).map((text) => text.toLowerCase()).sort());
    expect(bankTexts.every((text) => isMeaningfulBankToken(text))).toBe(true);
    bank.forEach((tile, index) => expect(tile.slot).toBe(index));
  });

  it('тире из исходного вопроса не просачивается в фразу и банк', () => {
    const item = arenaItem('Could you — me a favor, please?', 'do', ['make', 'give', 'take']);
    const { phrase } = trainerSessionPhrase(item);
    expect(phrase).not.toContain('—');
    expect(buildSessionWordBank(phrase).map((tile) => tile.text)).not.toContain('—');
  });
});

describe('buildTrainerSessionDeck — честное назначение режимов', () => {
  it('арена с маркером получает fill_gap на чётном индексе', () => {
    const deck = buildTrainerSessionDeck([arenaItem('She ___ to the store yesterday', 'went', [])]);
    expect(deck[0]?.mode).toBe('fill_gap');
  });

  it('арена без маркера — всегда word_bank полной фразы', () => {
    const deck = buildTrainerSessionDeck([arenaItem('She sells seashells', 'went', [])]);
    expect(deck[0]?.mode).toBe('word_bank');
  });

  it('errorWord, которого нет во фразе, не даёт fill_gap (анти-тихий-слот)', () => {
    const deck = buildTrainerSessionDeck([phraseItem('I like coffee', 'went')]);
    expect(deck[0]?.mode).toBe('word_bank');
  });

  it('phrases-айтем с настоящим errorWord чередуется в fill_gap', () => {
    const deck = buildTrainerSessionDeck([phraseItem('I have been there', 'have')]);
    expect(deck[0]?.mode).toBe('fill_gap');
  });
});

describe('токены: дефисы и апострофы не дробятся', () => {
  it('дефисное слово — одна плитка', () => {
    expect(sessionMeaningfulTokens('My mother-in-law is kind')).toContain('mother-in-law');
  });

  it('апострофы целы', () => {
    expect(sessionMeaningfulTokens("Let's go now").some((t) => t.toLowerCase() === "let's")).toBe(true);
    expect(sessionMeaningfulTokens("Don't stop now").some((t) => t.toLowerCase() === "don't")).toBe(true);
  });

  it('normalizeGapToken стрипает только краевую пунктуацию', () => {
    expect(normalizeGapToken('went,')).toBe('went');
    expect(normalizeGapToken('(went!)')).toBe('went');
    expect(normalizeGapToken("don't")).toBe("don't");
    expect(normalizeGapToken('mother-in-law')).toBe('mother-in-law');
  });

  it('trainerGapTokenIndex: находит слово с пунктуацией, честный -1', () => {
    expect(trainerGapTokenIndex('She went, then left', 'went')).toBe(1);
    expect(trainerGapTokenIndex('She went home', 'missing')).toBe(-1);
    expect(trainerGapTokenIndex('She went home', '')).toBe(-1);
  });
});

describe('фолбэки анти-софтлок', () => {
  it('фильтр выкосил всё → исходный набор токенов и плиток', () => {
    expect(sessionMeaningfulTokens('— – …')).toEqual(['—', '–', '…']);
    expect(buildSessionWordBank('— …')).toHaveLength(2);
  });
});
