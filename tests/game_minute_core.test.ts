/**
 * Правила «Минуты знаний» (D207): карточка правила собирается из объяснений банка заданий и не подпирается
 * чужими примерами. зачем: владелец 11.11.2026 — «фразы должны корректно подбираться для режимов игры, без багов».
 */
import { gameBankFor } from '../modules/games/bank';
import type { HuntTask } from '../modules/games/dialogue_core';
import {
  isValidMinuteCard, minuteCardFromGap, minuteCardFromHunt, minuteCards, minuteExamplePool, pickMinuteCard, pickMinuteExamples,
} from '../modules/games/minute_core';
import { MINUTE_EXAMPLES_MAX, MINUTE_MOTION } from '../modules/games/minute_motion';
import type { OddWordTask } from '../modules/games/odd_word_core';
import type { QuizRound } from '../modules/games/quiz_core';

const gap: QuizRound = { id: 'ex-1', ask: '?', options: ['is', 'are'], correctIndex: 1, prompt: { kind: 'gap', before: 'The doors', after: 'closed' }, note: 'Doors — их несколько, значит are.' };
const odd: OddWordTask = { id: 'ow-1', words: ['They', 'am', 'are', 'late'], extraIndex: 1, translation: 'Они опаздывают', whyTitle: '«am» здесь лишнее', whyText: 'Am бывает только с I.' };
const listen: QuizRound = { id: 'ls-1', ask: '?', options: ['We are at home', 'We are at work'], correctIndex: 0, prompt: { kind: 'audio', text: 'We are at home', rate: 1 }, note: 'Мы дома' };
const other: QuizRound = { id: 'ls-2', ask: '?', options: ['She is busy', 'He is busy'], correctIndex: 0, prompt: { kind: 'audio', text: 'She is busy', rate: 1 }, note: 'Она занята' };
const hunt: HuntTask = {
  id: 'hunt-1',
  lines: [
    { right: false, words: ['Does', 'she', 'work', 'here?'], tappable: [] },
    { right: true, words: ['Yes,', 'she', 'work', 'here.'], tappable: [2] },
    { right: false, words: ['Great,', 'I', 'am', 'here.'], tappable: [2] },
  ],
  wrong: { line: 1, word: 2 },
  fix: 'works',
  why: 'После she слово получает -s.',
};

it('правило из «Точного слова»: верное слово стоит в пропуске и выделено, пояснение — текст правила', () => {
  const card = minuteCardFromGap(gap, minuteExamplePool({ oddWord: [odd], listen: [listen, other] }));
  expect(card?.parts).toEqual([{ text: 'The', mark: false }, { text: 'doors', mark: false }, { text: 'are', mark: true }, { text: 'closed', mark: false }]);
  expect(card?.rule).toBe('Doors — их несколько, значит are.');
  // примеры — только фразы с выделенным словом; «She is busy» правило про are не подпирает
  expect(card?.examples).toEqual([{ text: 'They are late', translation: 'Они опаздывают' }, { text: 'We are at home', translation: 'Мы дома' }]);
  expect(card && isValidMinuteCard(card)).toBe(true);
});

it('правило из «Охоты на ошибку»: реплика исправлена, выделено исправленное слово', () => {
  const card = minuteCardFromHunt(hunt, []);
  expect(card?.parts.map((p) => p.text).join(' ')).toBe('Yes, she works here.');
  expect(card?.parts.filter((p) => p.mark)).toEqual([{ text: 'works', mark: true }]);
  expect(card?.rule).toBe('После she слово получает -s.');
  expect(card?.examples).toEqual([]);
});

it('негодный источник карточки не даёт: не пропуск, нет пояснения, пустой пропуск по краям', () => {
  expect(minuteCardFromGap(listen, [])).toBeNull();
  expect(minuteCardFromGap({ ...gap, note: '  ' }, [])).toBeNull();
  expect(minuteCardFromGap({ ...gap, prompt: { kind: 'gap', before: '', after: '' } }, [])).toBeNull();
  expect(minuteCardFromHunt({ ...hunt, why: '' }, [])).toBeNull();
  expect(minuteCardFromHunt({ ...hunt, wrong: { line: 1, word: 0 } }, [])).toBeNull();
});

it('примеры: не больше двух, без повторов, сама фраза правила примером не идёт', () => {
  const pool = minuteExamplePool({
    oddWord: [odd, { ...odd, id: 'ow-2' }],
    listen: [listen, { ...listen, id: 'ls-3', prompt: { kind: 'audio', text: 'The doors are closed', rate: 1 }, options: ['The doors are closed', 'x'], note: 'Двери закрыты' },
      { ...listen, id: 'ls-4', prompt: { kind: 'audio', text: 'You are early', rate: 1 }, options: ['You are early', 'y'], note: 'Ты рано' }],
  });
  expect(pool.map((e) => e.text)).toEqual(['They are late', 'We are at home', 'The doors are closed', 'You are early']);
  const parts = [{ text: 'The', mark: false }, { text: 'doors', mark: false }, { text: 'are', mark: true }, { text: 'closed', mark: false }];
  const picked = pickMinuteExamples(parts, pool);
  expect(picked).toHaveLength(MINUTE_EXAMPLES_MAX);
  expect(picked.map((e) => e.text)).toEqual(['They are late', 'We are at home']);
  expect(pickMinuteExamples(parts.map((p) => ({ ...p, mark: false })), pool)).toEqual([]);
});

it('выбор правила: по id задания с ошибкой, иначе правило дня — стабильное внутри дня', () => {
  const cards = minuteCards({ exact: [gap, { ...gap, id: 'ex-2' }, gap], hunt: [hunt], oddWord: [odd], listen: [listen] });
  expect(cards.map((c) => c.id)).toEqual(['ex-1', 'ex-2', 'hunt-1']);
  expect(pickMinuteCard(cards, 'hunt-1', 0)?.id).toBe('hunt-1');
  expect(pickMinuteCard(cards, 'нет такого', 4)?.id).toBe('ex-2');
  expect(pickMinuteCard(cards, null, 4)?.id).toBe(pickMinuteCard(cards, null, 4)?.id);
  expect(pickMinuteCard(cards, null, 5)?.id).not.toBe(pickMinuteCard(cards, null, 4)?.id);
  expect(pickMinuteCard(cards, null, -1)?.id).toBe('hunt-1');
  expect(pickMinuteCard(cards, null, Number.NaN)?.id).toBe('ex-1');
  expect(pickMinuteCard([], 'ex-1', 3)).toBeNull();
  expect(minuteCards({})).toEqual([]);
});

it('на настоящем банке: у каждого языка и урока 1–8 есть годные правила, слова примеров — из того же урока', () => {
  for (const lang of ['en', 'de', 'fr', 'es', 'it']) {
    const bank = gameBankFor(lang);
    if (!bank) throw new Error(`нет банка языка ${lang}`);
    for (let lesson = 1; lesson <= 8; lesson += 1) {
      const cards = minuteCards({ exact: bank.exact?.[lesson], hunt: bank.hunt?.[lesson], oddWord: bank.oddWord?.[lesson], listen: bank.listen?.[lesson] });
      expect([lang, lesson, cards.length > 0]).toEqual([lang, lesson, true]);
      expect([lang, lesson, cards.filter((c) => !isValidMinuteCard(c)).map((c) => c.id)]).toEqual([lang, lesson, []]);
      const lessonPhrases = new Set(minuteExamplePool({ oddWord: bank.oddWord?.[lesson], listen: bank.listen?.[lesson] }).map((e) => e.text));
      for (const card of cards) {
        expect([card.id, card.examples.filter((e) => !lessonPhrases.has(e.text))]).toEqual([card.id, []]);
      }
    }
  }
});

it('числа движения — из макета: 20 секунд, примеры с 500 мс по 250 мс', () => {
  expect([MINUTE_MOTION.timerMs, MINUTE_MOTION.exampleFirstDelayMs, MINUTE_MOTION.exampleStepMs]).toEqual([20000, 500, 250]);
  expect(MINUTE_EXAMPLES_MAX).toBe(2);
});
