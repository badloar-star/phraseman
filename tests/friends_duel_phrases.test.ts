/**
 * duel_phrases — фразы «Дуэли на 5 фраз» из пройденного (идея 3; координатор 22.10: «без новых загрузок», по сети только id).
 * Сторож: берём только «Собери фразу» и ровно тот текст, что видел урок; у обоих игроков те же 5 фраз и тот же порядок плиток;
 * одинаковые фразы из разных занятий — одна; меньше пяти разных — дуэли нет; чужой или битый id — не открываем.
 * Плюс сверка с настоящим курсом в сборке: формат заданий не уехал.
 */
import {
  buildDuelPhraseSet,
  duelAnswerIsCorrect,
  duelPhrasesFromRow,
  duelWrongFeedback,
  parseDuelPhraseId,
  resolveDuelPhrases,
  type DuelCourseRow,
  type DuelPhrase,
  type DuelSessionRef,
} from '../app/friends_together/duel_phrases';
import { DUEL_PHRASES } from '../app/friends_together/duel_core';

const id = (lesson: number, session: number, n: number) =>
  `en:lesson-${String(lesson).padStart(2, '0')}:session-${String(session).padStart(2, '0')}:i${String(n).padStart(2, '0')}`;

function builder(lesson: number, session: number, n: number, target: string, tokens: string[], distractors: string[], meaningRu: string, meaningUk = meaningRu) {
  return {
    interactionId: id(lesson, session, n),
    family: 'phrase_builder',
    inputMode: 'ordered_tokens',
    prompt: meaningRu,
    modePayload: {
      family: 'phrase_builder',
      targetPhrase: target,
      localizedMeaning: { ru: meaningRu, uk: meaningUk },
      orderedTokens: tokens,
      authoredDistractorTokens: distractors,
      slotFeedback: distractors.map((d, i) => ({ responseId: `${id(lesson, session, n)}:tile:d${i + 1}`, correct: false, feedbackByLocale: { ru: `не «${d}»`, uk: `не «${d}» uk` } })),
    },
  };
}

function row(lesson: number, session: number, interactions: unknown[]): DuelCourseRow {
  return {
    lessonOrdinal: lesson,
    sessionOrdinal: session,
    practiceTitlesByAuthoredLocale: { ru: [], uk: [] },
    loadLearner: () => ({ interactions }),
  };
}

/** Занятие с тремя заданиями «Собери фразу» и одним чужим заданием. */
function session(lesson: number, s: number, targets: [string, string, string]): DuelCourseRow {
  return row(lesson, s, [
    { interactionId: id(lesson, s, 1), family: 'listen_choose', modePayload: {} },
    ...targets.map((target, i) => builder(lesson, s, i + 2, target, target.replace(/[.?!]$/u, '').split(' '), ['is'], `Соберите фразу — ситуация ${target}`)),
  ]);
}

describe('parseDuelPhraseId', () => {
  it('reads lesson and session from a course task id', () => {
    expect(parseDuelPhraseId('en:lesson-02:session-03:i01')).toEqual({ lessonOrdinal: 2, sessionOrdinal: 3 });
    expect(parseDuelPhraseId('en:lesson-07:session-30:practice:payment')).toEqual({ lessonOrdinal: 7, sessionOrdinal: 30 });
  });

  it('refuses foreign, broken and oversized ids', () => {
    for (const bad of ['', 'lesson-02:session-03:i01', 'en:lesson-00:session-03:i01', 'en:lesson-2:session-3:i1', `en:lesson-01:session-01:${'x'.repeat(90)}`, 42, null]) {
      expect(parseDuelPhraseId(bad)).toBeNull();
    }
  });
});

describe('duelPhrasesFromRow', () => {
  const quoted = builder(1, 13, 12, 'I am strong.', ['I', 'am', 'strong'], ['are'],
    'Вы сами подняли тяжёлую коробку. Скажите о себе: «я сильный/сильная».', 'Ви самі підняли важку коробку. Скажіть про себе: «я сильний/сильна».');
  const plain = builder(1, 13, 9, 'I am here.', ['I', 'am', 'here'], ['ready'], 'Соберите фразу — коллега ищет вас, а вы уже в комнате');
  const broken = { ...builder(1, 13, 10, '', [], [], 'x'), modePayload: { family: 'phrase_builder', targetPhrase: '', orderedTokens: [] } };
  const other = { interactionId: id(1, 13, 11), family: 'speed_match', modePayload: {} };

  it('keeps only phrase builder tasks and counts broken ones', () => {
    const { phrases, skipped } = duelPhrasesFromRow(row(1, 13, [plain, broken, other, quoted]), 'ru');
    expect(phrases.map((p) => p.id)).toEqual([id(1, 13, 9), id(1, 13, 12)]);
    expect(skipped).toBe(1);
  });

  it('shows the lesson situation without the task title, and the goal only from a reviewed quote', () => {
    const [here, strong] = duelPhrasesFromRow(row(1, 13, [plain, quoted]), 'ru').phrases;
    expect(here?.situation).toBe('Коллега ищет вас, а вы уже в комнате');
    expect(here?.goal).toBeNull();
    expect(strong?.goal).toBe('Я сильный/сильная');
    expect(duelPhrasesFromRow(row(1, 13, [quoted]), 'uk').phrases[0]?.goal).toBe('Я сильний/сильна');
  });

  it('gives every tile once, in the same stable order on every phone', () => {
    const a = duelPhrasesFromRow(row(1, 13, [plain]), 'ru').phrases[0]!;
    const b = duelPhrasesFromRow(row(1, 13, [plain]), 'uk').phrases[0]!;
    expect(a.tiles.map((t) => t.text).sort()).toEqual(['I', 'am', 'here', 'ready'].sort());
    expect(b.tiles).toEqual(a.tiles);
    expect(a.tiles[0]?.text).not.toBe('I');
  });

  it('skips a task whose id belongs to another session', () => {
    const stray = builder(2, 1, 1, 'I am here.', ['I', 'am', 'here'], [], 'x');
    expect(duelPhrasesFromRow(row(1, 13, [stray]), 'ru')).toEqual({ phrases: [], skipped: 1 });
  });
});

describe('answers', () => {
  // Одно и то же слово дважды («I am I.»): какую из двух одинаковых плиток взять первой — неважно.
  const twice = builder(3, 4, 1, 'I am I.', ['I', 'am', 'I'], ['is'], 'Соберите фразу — тест');
  const phrase = duelPhrasesFromRow(row(3, 4, [twice]), 'ru').phrases[0]!;
  const tile = (text: string, skip = 0) => phrase.tiles.filter((t) => t.text === text)[skip]!.responseId;

  it('accepts the words in order, even when a word repeats', () => {
    expect(duelAnswerIsCorrect(phrase, [tile('I'), tile('am'), tile('I', 1)])).toBe(true);
    expect(duelAnswerIsCorrect(phrase, [tile('I', 1), tile('am'), tile('I')])).toBe(true);
  });

  it('refuses a wrong order, a missing word and a foreign tile', () => {
    expect(duelAnswerIsCorrect(phrase, [tile('am'), tile('I'), tile('I', 1)])).toBe(false);
    expect(duelAnswerIsCorrect(phrase, [tile('I'), tile('am')])).toBe(false);
    expect(duelAnswerIsCorrect(phrase, [tile('I'), tile('am'), 'en:lesson-03:session-04:i01:t99'])).toBe(false);
  });

  it('explains the first distractor the learner used', () => {
    expect(duelWrongFeedback(phrase, [tile('I'), tile('is')])).toBe('не «is»');
    expect(duelWrongFeedback(phrase, [tile('am'), tile('I')])).toBeNull();
  });
});

describe('buildDuelPhraseSet', () => {
  const sessions: DuelSessionRef[] = Array.from({ length: 10 }, (_, i) => ({ lessonOrdinal: 1, sessionOrdinal: i + 1 }));
  const reads: string[] = [];
  const load = (ref: DuelSessionRef): readonly DuelPhrase[] => {
    reads.push(`${ref.lessonOrdinal}:${ref.sessionOrdinal}`);
    const s = ref.sessionOrdinal;
    return duelPhrasesFromRow(session(1, s, [`I am a${s}.`, `I am b${s}.`, 'I am here.']), 'ru').phrases;
  };

  beforeEach(() => { reads.length = 0; });

  it('gives the same five different phrases for the same seed', () => {
    const first = buildDuelPhraseSet(sessions, 77, load).phrases.map((p) => p.id);
    const second = buildDuelPhraseSet(sessions, 77, load).phrases.map((p) => p.id);
    expect(first).toHaveLength(DUEL_PHRASES);
    expect(second).toEqual(first);
  });

  it('counts the same phrase from different sessions once and reads only what it needs', () => {
    const { phrases, sessionsRead } = buildDuelPhraseSet(sessions, 5, load);
    const targets = phrases.map((p) => p.targetPhrase);
    expect(new Set(targets).size).toBe(DUEL_PHRASES);
    expect(targets.filter((t) => t === 'I am here.').length).toBeLessThanOrEqual(1);
    expect(sessionsRead).toBe(3);
  });

  it('has no duel when passed sessions hold fewer than five different phrases', () => {
    const tiny = (ref: DuelSessionRef) => duelPhrasesFromRow(session(1, ref.sessionOrdinal, ['I am here.', 'I am here.', 'I am fine.']), 'ru').phrases;
    expect(buildDuelPhraseSet(sessions, 9, tiny)).toEqual({ phrases: [], sessionsRead: 8 });
    expect(buildDuelPhraseSet([], 9, load).phrases).toEqual([]);
  });
});

describe('resolveDuelPhrases', () => {
  const load = (ref: DuelSessionRef) => duelPhrasesFromRow(session(ref.lessonOrdinal, ref.sessionOrdinal, ['I am a.', 'I am b.', 'I am c.']), 'ru').phrases;
  const ids = [id(1, 1, 2), id(1, 1, 3), id(1, 1, 4), id(2, 5, 2), id(2, 5, 3)];

  it('rebuilds the five phrases in the server order', () => {
    expect(resolveDuelPhrases(ids, load)?.map((p) => p.id)).toEqual(ids);
  });

  it('refuses a wrong count, repeats and ids the course on this phone does not have', () => {
    expect(resolveDuelPhrases(ids.slice(0, 4), load)).toBeNull();
    expect(resolveDuelPhrases([...ids.slice(0, 4), ids[0]], load)).toBeNull();
    expect(resolveDuelPhrases([...ids.slice(0, 4), id(1, 1, 9)], load)).toBeNull();
    expect(resolveDuelPhrases('nope', load)).toBeNull();
  });
});

describe('real course in the build', () => {
  it('reads every phrase builder task of the first sessions without losses', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { FACTORY_NATIVE_MANIFEST_V1 } = require('../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated') as typeof import('../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated');
    const rows = FACTORY_NATIVE_MANIFEST_V1.filter((r) => r.lessonOrdinal === 1 && r.sessionOrdinal <= 6);
    expect(rows).toHaveLength(6);
    for (const r of rows) {
      for (const locale of ['ru', 'uk'] as const) {
        const { phrases, skipped } = duelPhrasesFromRow(r, locale);
        expect(skipped).toBe(0);
        expect(phrases.length).toBeGreaterThanOrEqual(2);
        for (const p of phrases) {
          expect(parseDuelPhraseId(p.id)).toEqual({ lessonOrdinal: r.lessonOrdinal, sessionOrdinal: r.sessionOrdinal });
          expect(p.situation).toBeTruthy();
          expect(duelAnswerIsCorrect(p, p.orderedTokens.map((t, i) => p.tiles.filter((tile) => tile.text === t)[p.orderedTokens.slice(0, i).filter((x) => x === t).length]!.responseId))).toBe(true);
        }
      }
    }
  });
});
