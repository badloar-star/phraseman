import type { TranscriptTurn } from '../app/max_call_transcript';
import {
  CLEAN_PHRASE_MIN_CALLS,
  TREND_WINDOW_MS,
  computeVoiceCallMetrics,
  computeVoiceTrends,
} from '../app/max_voice_metrics';

function user(text: string, atMs = 0): TranscriptTurn {
  return { role: 'user', text, atMs };
}

function ai(text: string, atMs = 0): TranscriptTurn {
  return { role: 'assistant', text, atMs };
}

const NO_OPTS = { speechSec: 0, weakWords: [], durationSec: 300 };

describe('computeVoiceCallMetrics: секунды речи (анти-AFK)', () => {
  it('клампит speechSec в [0, durationSec]', () => {
    expect(computeVoiceCallMetrics([], { ...NO_OPTS, speechSec: 120 }).speechSec).toBe(120);
    expect(computeVoiceCallMetrics([], { ...NO_OPTS, speechSec: 9999 }).speechSec).toBe(300);
    expect(computeVoiceCallMetrics([], { ...NO_OPTS, speechSec: -5 }).speechSec).toBe(0);
  });

  it('невалидные числа не ломают метрику', () => {
    expect(computeVoiceCallMetrics([], { ...NO_OPTS, speechSec: NaN }).speechSec).toBe(0);
    expect(
      computeVoiceCallMetrics([], { speechSec: 60, weakWords: [], durationSec: NaN }).speechSec,
    ).toBe(0);
  });
});

describe('computeVoiceCallMetrics: реплики', () => {
  it('считает только реплики юзера и самую длинную по всем словам', () => {
    const history = [
      ai('Hi! What would you like today?'),
      user('Hello.'),
      ai('Sure!'),
      user("I would like a large cappuccino, please."),
      user('Thanks'),
    ];
    const m = computeVoiceCallMetrics(history, NO_OPTS);
    expect(m.userTurns).toBe(3);
    // "I would like a large cappuccino please" — 7 слов, стоп-слова входят в длину.
    expect(m.longestTurnWords).toBe(7);
  });

  it('пустая история → нули', () => {
    const m = computeVoiceCallMetrics([], NO_OPTS);
    expect(m.userTurns).toBe(0);
    expect(m.longestTurnWords).toBe(0);
    expect(m.uniqueWords).toBe(0);
    expect(m.weakWordsUsed).toEqual([]);
  });
});

describe('computeVoiceCallMetrics: уникальные слова', () => {
  it('lowercase, без пунктуации, минус стоп-слова, только реплики юзера', () => {
    const history = [
      ai('Amazing vocabulary from the assistant should not count.'),
      user('I like Coffee, coffee!'),
      user("It's a strong coffee... really strong?"),
    ];
    const m = computeVoiceCallMetrics(history, NO_OPTS);
    // Содержательные: like, coffee, it's, strong, really. Стоп-слова (i, a, it)
    // и повторы не считаются; слова ассистента не считаются.
    expect(m.uniqueWords).toBe(5);
  });

  it('регистр и пунктуация не создают дубликатов', () => {
    const m = computeVoiceCallMetrics([user('Coffee coffee COFFEE "coffee".')], NO_OPTS);
    expect(m.uniqueWords).toBe(1);
  });
});

describe('computeVoiceCallMetrics: weak words', () => {
  it('находит только реально прозвучавшие у юзера, регистронезависимо', () => {
    const history = [
      ai('Would you like a receipt with that?'),
      user('Yes, I need the RECEIPT and my change, please.'),
    ];
    const m = computeVoiceCallMetrics(history, {
      ...NO_OPTS,
      weakWords: ['receipt', 'change', 'discount'],
    });
    // «discount» не звучал; порядок и написание — как в исходном списке ошибок.
    expect(m.weakWordsUsed).toEqual(['receipt', 'change']);
  });

  it('матчит по границе слова: «cap» не засчитывается из-за «cappuccino»', () => {
    const m = computeVoiceCallMetrics([user('One cappuccino, please.')], {
      ...NO_OPTS,
      weakWords: ['cap', 'cappuccino'],
    });
    expect(m.weakWordsUsed).toEqual(['cappuccino']);
  });

  it('фразы из истории ошибок матчатся целиком; слова ассистента зачёт не дают', () => {
    const history = [ai('You could say: I would like a refund.'), user('I would like a refund!')];
    expect(
      computeVoiceCallMetrics(history, { ...NO_OPTS, weakWords: ['would like'] }).weakWordsUsed,
    ).toEqual(['would like']);
    expect(
      computeVoiceCallMetrics([history[0]], { ...NO_OPTS, weakWords: ['would like'] })
        .weakWordsUsed,
    ).toEqual([]);
  });

  it('дубликаты и пустые строки в списке weak words не дублируют зачёт и не падают', () => {
    const m = computeVoiceCallMetrics([user('a receipt')], {
      ...NO_OPTS,
      weakWords: ['receipt', 'Receipt', '', '  ', 'what (else)?'],
    });
    expect(m.weakWordsUsed).toEqual(['receipt']);
  });
});

describe('computeVoiceTrends: «чистых фраз %» только при ≥3 звонках в окне', () => {
  const NOW = 1_700_000_000_000;
  const call = (daysAgo: number, cleanPhrases: number, totalPhrases: number) => ({
    atMs: NOW - daysAgo * 24 * 60 * 60 * 1000,
    speechSec: 60,
    uniqueWords: 10,
    cleanPhrases,
    totalPhrases,
  });

  it('меньше трёх звонков → метрика скрыта (null), остальные тренды считаются', () => {
    const t = computeVoiceTrends([call(1, 4, 5), call(2, 3, 5)], NOW);
    expect(t.cleanPhrasePct).toBeNull();
    expect(t.spokeMinutes).toBe(2);
    expect(t.vocabWords).toBe(20);
  });

  it('три звонка в окне → процент по сумме фраз', () => {
    const t = computeVoiceTrends([call(1, 4, 5), call(2, 3, 5), call(3, 3, 5)], NOW);
    expect(t.cleanPhrasePct).toBe(67); // 10/15
  });

  it('звонки старше 4 недель выпадают из окна и из порога ≥3', () => {
    const old = { ...call(0, 5, 5), atMs: NOW - TREND_WINDOW_MS - 1 };
    const t = computeVoiceTrends([old, call(1, 4, 5), call(2, 3, 5)], NOW);
    expect(t.cleanPhrasePct).toBeNull();
    expect(t.spokeMinutes).toBe(2);
    expect(CLEAN_PHRASE_MIN_CALLS).toBe(3);
  });
});
