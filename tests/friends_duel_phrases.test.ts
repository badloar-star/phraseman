/**
 * duel_phrases — фразы «Дуэли на 5 фраз» из пройденных уроков классического курса (по сети ходят только id).
 * Сторож: у обоих игроков те же 5 фраз и тот же порядок плиток; одинаковые фразы из разных уроков — одна;
 * меньше пяти разных — дуэли нет; чужой, битый или старый (удалённого курса занятий) id — не открываем.
 * Плюс сверка с настоящим курсом в сборке: формат фраз не уехал.
 */
import {
  buildDuelPhraseSet,
  duelAnswerIsCorrect,
  duelPhraseFromClassic,
  duelPhraseIdFor,
  duelPhrasesFromLesson,
  duelWrongFeedback,
  parseDuelPhraseId,
  resolveDuelPhrases,
  stableShuffleDuelTiles,
  type DuelLessonRef,
  type DuelPhrase,
} from '../app/friends_together/duel_phrases';
import { DUEL_PHRASES } from '../app/friends_together/duel_core';
import { getClassicLessonPhrases } from '../app/classic_course_phrases';
import type { LessonPhrase } from '../app/lesson_data_types';

const EN1: DuelLessonRef = { lang: 'en', lessonOrdinal: 1 };

function classic(id: string, target: string, ru: string, extra: Partial<NonNullable<LessonPhrase['classic']>> = {}, en = target): LessonPhrase {
  const words = target.replace(/[.?!,]/gu, '').split(' ').map((text, index) => ({
    text,
    correct: text,
    distractors: [`x${index}a`, `x${index}b`, text, 'They'],
  }));
  return {
    id,
    english: target,
    russian: ru,
    ukrainian: `${ru} uk`,
    words,
    classic: { lang: 'en', rev: 'r', sourceLocales: { ru, uk: `${ru} uk`, en, es: `${ru} es`, 'pt-BR': '', vi: '', id: '', tr: '', pl: '' }, ...extra },
  };
}

const lesson = (ref: DuelLessonRef, targets: readonly string[]): readonly DuelPhrase[] =>
  duelPhrasesFromLesson(targets.map((target, index) => classic(`p${ref.lessonOrdinal}.${index + 1}`, target, `ru ${target}`)), ref, 'ru').phrases;

describe('ids', () => {
  it('builds and parses the classic duel id', () => {
    const id = duelPhraseIdFor('en', 4, 'en-classic-r1:04.07');
    expect(id).toBe('en:classic:04:en-classic-r1:04.07');
    expect(parseDuelPhraseId(id)).toEqual({ lang: 'en', lessonOrdinal: 4 });
    expect(parseDuelPhraseId('de:classic:05:de:05:01')).toEqual({ lang: 'de', lessonOrdinal: 5 });
  });

  it('refuses foreign, broken, too long ids and ids of the removed session course', () => {
    expect(parseDuelPhraseId('en:lesson-02:session-03:i01')).toBeNull();
    expect(parseDuelPhraseId('en:classic:00:x')).toBeNull();
    expect(parseDuelPhraseId('en:classic:4:x')).toBeNull();
    expect(parseDuelPhraseId(`en:classic:04:${'x'.repeat(120)}`)).toBeNull();
    expect(parseDuelPhraseId(42)).toBeNull();
    expect(duelPhraseIdFor('en', 0, 'x')).toBeNull();
    expect(duelPhraseIdFor('en', 3, 'has space')).toBeNull();
  });
});

describe('duelPhraseFromClassic', () => {
  const phrase = duelPhraseFromClassic(classic('p1.4', 'She is busy.', 'Она занята.'), EN1, 'ru')!;

  it('keeps the answer of the lesson and shows the meaning in the interface language', () => {
    expect(phrase.id).toBe('en:classic:01:p1.4');
    expect(phrase.targetPhrase).toBe('She is busy.');
    expect(phrase.orderedTokens).toEqual(['She', 'is', 'busy']);
    expect(phrase.goal).toBe('Она занята.');
    expect(duelPhraseFromClassic(classic('p1.4', 'She is busy.', 'Она занята.'), EN1, 'uk')!.goal).toBe('Она занята. uk');
    expect(duelPhraseFromClassic(classic('p1.4', 'She is busy.', 'Она занята.'), EN1, 'es')!.goal).toBe('Она занята. es');
    expect(phrase.situation).toBeNull();
    expect(phrase.completionFeedback).toBeNull();
  });

  it('hides the goal when the interface language is the course language (it would be the answer)', () => {
    expect(duelPhraseFromClassic(classic('p1.4', 'She is busy.', 'Она занята.'), EN1, 'en')!.goal).toBeNull();
  });

  it('adds up to three distractors that are not answer words and do not repeat', () => {
    const texts = phrase.tiles.map((tile) => tile.text);
    const extra = texts.filter((text) => !phrase.orderedTokens.includes(text));
    expect(texts).toHaveLength(phrase.orderedTokens.length + extra.length);
    expect(extra.length).toBeGreaterThan(0);
    expect(extra.length).toBeLessThanOrEqual(3);
    expect(new Set(extra.map((text) => text.toLowerCase())).size).toBe(extra.length);
    expect(phrase.distractorFeedback).toEqual(extra.map(() => null));
  });

  it('gives both players the same tiles in the same order', () => {
    const again = duelPhraseFromClassic(classic('p1.4', 'She is busy.', 'Она занята.'), EN1, 'uk')!;
    expect(again.tiles).toEqual(phrase.tiles);
    const tiles = [{ responseId: 'b' }, { responseId: 'a' }, { responseId: 'c' }];
    expect(stableShuffleDuelTiles('seed', tiles)).toEqual(stableShuffleDuelTiles('seed', [...tiles].reverse()));
  });

  it('skips a phrase without an answer or tiles and reports how many were skipped', () => {
    const broken: LessonPhrase = { ...classic('p1.9', 'I am here.', 'x'), words: [] };
    expect(duelPhraseFromClassic(broken, EN1, 'ru')).toBeNull();
    expect(duelPhrasesFromLesson([broken, classic('p1.1', 'I am here.', 'Я здесь.')], EN1, 'ru')).toMatchObject({ skipped: 1 });
  });
});

describe('answers', () => {
  // Одно и то же слово дважды («I am I.»): какую из двух одинаковых плиток взять первой — неважно.
  const phrase = duelPhraseFromClassic(classic('p3.1', 'I am I.', 'тест', { accepted: [['am', 'I', 'I']] }), { lang: 'en', lessonOrdinal: 3 }, 'ru')!;
  const tile = (text: string, skip = 0) => phrase.tiles.filter((t) => t.text === text)[skip]!.responseId;
  const distractor = phrase.tiles.find((t) => !phrase.orderedTokens.includes(t.text))!;

  it('accepts the words in order, even when a word repeats, and the accepted orders of the course', () => {
    expect(duelAnswerIsCorrect(phrase, [tile('I'), tile('am'), tile('I', 1)])).toBe(true);
    expect(duelAnswerIsCorrect(phrase, [tile('I', 1), tile('am'), tile('I')])).toBe(true);
    expect(duelAnswerIsCorrect(phrase, [tile('am'), tile('I'), tile('I', 1)])).toBe(true);
  });

  it('refuses a wrong order, a missing word and a foreign tile', () => {
    expect(duelAnswerIsCorrect(phrase, [tile('I'), tile('I', 1), tile('am')])).toBe(false);
    expect(duelAnswerIsCorrect(phrase, [tile('I'), tile('am')])).toBe(false);
    expect(duelAnswerIsCorrect(phrase, [tile('I'), tile('am'), 'en:classic:03:p3.1:t99'])).toBe(false);
  });

  it('has no authored explanation for a distractor of the classic course', () => {
    expect(duelWrongFeedback(phrase, [tile('I'), distractor.responseId])).toBeNull();
    expect(duelWrongFeedback(phrase, [tile('am'), tile('I')])).toBeNull();
  });
});

describe('buildDuelPhraseSet', () => {
  const lessons: DuelLessonRef[] = Array.from({ length: 10 }, (_, i) => ({ lang: 'en', lessonOrdinal: i + 1 }));
  const reads: number[] = [];
  const load = (ref: DuelLessonRef): readonly DuelPhrase[] => {
    reads.push(ref.lessonOrdinal);
    const n = ref.lessonOrdinal;
    return lesson(ref, [`I am a${n}.`, `I am b${n}.`, `I am c${n}.`, 'I am here.']);
  };

  beforeEach(() => { reads.length = 0; });

  it('gives the same five different phrases for the same seed', () => {
    const first = buildDuelPhraseSet(lessons, 77, load).phrases.map((p) => p.id);
    const second = buildDuelPhraseSet(lessons, 77, load).phrases.map((p) => p.id);
    expect(first).toHaveLength(DUEL_PHRASES);
    expect(second).toEqual(first);
  });

  it('counts the same phrase from different lessons once and reads only what it needs', () => {
    const { phrases, lessonsRead } = buildDuelPhraseSet(lessons, 5, load);
    const targets = phrases.map((p) => p.targetPhrase);
    expect(new Set(targets).size).toBe(DUEL_PHRASES);
    expect(targets.filter((t) => t === 'I am here.').length).toBeLessThanOrEqual(1);
    expect(lessonsRead).toBe(2);
    expect(reads).toHaveLength(2);
  });

  it('has no duel when passed lessons hold fewer than five different phrases', () => {
    const tiny = (ref: DuelLessonRef) => lesson(ref, ['I am here.', 'I am here.', 'I am fine.']);
    expect(buildDuelPhraseSet(lessons, 9, tiny)).toEqual({ phrases: [], lessonsRead: 4 });
    expect(buildDuelPhraseSet([], 9, load).phrases).toEqual([]);
  });
});

describe('resolveDuelPhrases', () => {
  const load = (ref: DuelLessonRef) => lesson(ref, ['I am a.', 'I am b.', 'I am c.']);
  const id = (lessonOrdinal: number, n: number) => `en:classic:${String(lessonOrdinal).padStart(2, '0')}:p${lessonOrdinal}.${n}`;
  const ids = [id(1, 1), id(1, 2), id(1, 3), id(2, 1), id(2, 2)];

  it('rebuilds the five phrases in the server order', () => {
    expect(resolveDuelPhrases(ids, load)?.map((p) => p.id)).toEqual(ids);
  });

  it('refuses a wrong count, repeats, old course ids and ids the course on this phone does not have', () => {
    expect(resolveDuelPhrases(ids.slice(0, 4), load)).toBeNull();
    expect(resolveDuelPhrases([...ids.slice(0, 4), ids[0]], load)).toBeNull();
    expect(resolveDuelPhrases([...ids.slice(0, 4), id(1, 9)], load)).toBeNull();
    expect(resolveDuelPhrases([...ids.slice(0, 4), 'en:lesson-01:session-01:i01'], load)).toBeNull();
    expect(resolveDuelPhrases('nope', load)).toBeNull();
  });
});

describe('real classic course in the bundle', () => {
  it.each(['en', 'es', 'fr', 'de', 'it'] as const)('every phrase of lesson 1 (%s) becomes a duel phrase that its own answer solves', (lang) => {
    const ref: DuelLessonRef = { lang, lessonOrdinal: 1 };
    const source = getClassicLessonPhrases(1, lang);
    const { phrases, skipped } = duelPhrasesFromLesson(source, ref, 'ru');
    expect(source.length).toBeGreaterThanOrEqual(DUEL_PHRASES);
    expect(skipped).toBe(0);
    expect(phrases).toHaveLength(source.length);
    for (const phrase of phrases) {
      expect(parseDuelPhraseId(phrase.id)).toEqual(ref);
      const used = new Set<string>();
      const answer = phrase.orderedTokens.map((token) => {
        const tile = phrase.tiles.find((t) => t.text === token && !used.has(t.responseId))!;
        used.add(tile.responseId);
        return tile.responseId;
      });
      expect(duelAnswerIsCorrect(phrase, answer)).toBe(true);
      expect(phrase.goal).toBeTruthy();
    }
    expect(buildDuelPhraseSet([ref], 1, () => phrases).phrases).toHaveLength(DUEL_PHRASES);
  });
});
