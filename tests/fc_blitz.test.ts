/**
 * cards-2.0 (E12): чистая логика блица (§3.9 мастер-плана).
 * Покрытие: жизни (ошибка = −1, 0 = конец), редьюсер applyBlitzAnswer,
 * сборка вопроса «EN → выбери перевод из 4» (уникальные decoys из своей колоды).
 * Очков, комбо и рекорда нет (владелец 04.10: «ОЧКИ ИЗ БЛИЦА УБИРАЙ ВООБЩЕ, ТОЛЬКО МОНЕТЫ СЧИТАЕМ»).
 */
import * as blitzLogic from '../app/flashcards/blitz_logic';
import {
  applyBlitzAnswer,
  buildBlitzQuestion,
  initialBlitzState,
  BLITZ_LIVES,
  BLITZ_MIN_CARDS,
  blitzMinCards,
  canStartBlitz,
  type BlitzCardLike,
} from '../app/flashcards/blitz_logic';

// ════════════════════════════════════════════════════════════════════════════
describe('applyBlitzAnswer — только жизни и счётчики ответов', () => {
  it('очков, серии и комбо в логике больше нет', () => {
    expect(initialBlitzState()).toEqual({ lives: BLITZ_LIVES, correct: 0, wrong: 0 });
    for (const name of ['comboMultiplier', 'pointsForCorrect', 'comboThresholdHit', 'BLITZ_POINTS_CORRECT', 'BLITZ_COMBO_STEPS']) {
      expect(blitzLogic).not.toHaveProperty(name);
    }
    expect(Object.keys(applyBlitzAnswer(initialBlitzState(), true)).sort()).toEqual(['outOfLives', 'state']);
  });

  it('верный ответ: correct +1, жизни не трогаются', () => {
    const r = applyBlitzAnswer(initialBlitzState(), true);
    expect(r.state).toEqual({ lives: BLITZ_LIVES, correct: 1, wrong: 0 });
    expect(r.outOfLives).toBe(false);
  });

  it('ошибка: −1 жизнь; 3 ошибки = конец', () => {
    let s = applyBlitzAnswer(initialBlitzState(), true).state;
    const w1 = applyBlitzAnswer(s, false);
    expect(w1.state).toEqual({ lives: 2, correct: 1, wrong: 1 });
    expect(w1.outOfLives).toBe(false);

    const w2 = applyBlitzAnswer(w1.state, false);
    expect(w2.state.lives).toBe(1);
    expect(w2.outOfLives).toBe(false);

    const w3 = applyBlitzAnswer(w2.state, false);
    expect(w3.state.lives).toBe(0);
    expect(w3.outOfLives).toBe(true);
    s = applyBlitzAnswer(w3.state, false).state;
    expect(s.lives).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('buildBlitzQuestion — «EN → выбери перевод из 4»', () => {
  const pool: BlitzCardLike[] = [
    { id: 'a', en: 'give up', translation: 'сдаваться' },
    { id: 'b', en: 'put off', translation: 'откладывать' },
    { id: 'c', en: 'figure out', translation: 'разобраться' },
    { id: 'd', en: 'run out of', translation: 'закончиться' },
    { id: 'e', en: 'break the ice', translation: 'растопить лёд' },
  ];

  it('4 уникальных варианта, правильный присутствует, correctIndex верный', () => {
    for (let seed = 0; seed < 20; seed++) {
      let n = seed;
      const rnd = () => {
        n = (n * 9301 + 49297) % 233280;
        return n / 233280;
      };
      const q = buildBlitzQuestion(pool[0]!, pool, rnd);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options[q.correctIndex]).toBe('сдаваться');
      // все decoys — переводы из ЭТОЙ ЖЕ колоды
      q.options.forEach((o) => expect(pool.some((c) => c.translation === o)).toBe(true));
    }
  });

  it('маленькая колода: вариантов меньше 4, но правильный всегда есть', () => {
    const tiny = pool.slice(0, 2);
    const q = buildBlitzQuestion(tiny[1]!, tiny, () => 0.5);
    expect(q.options).toHaveLength(2);
    expect(q.options[q.correctIndex]).toBe('откладывать');
  });

  it('дубликаты переводов в колоде не попадают в варианты дважды', () => {
    const dup: BlitzCardLike[] = [
      { id: '1', en: 'one', translation: 'x' },
      { id: '2', en: 'two', translation: 'x' },
      { id: '3', en: 'three', translation: 'y' },
      { id: '4', en: 'four', translation: 'z' },
    ];
    const q = buildBlitzQuestion(dup[0]!, dup, () => 0.1);
    expect(new Set(q.options).size).toBe(q.options.length);
    expect(q.options).toHaveLength(3); // x + y + z
  });
});

/**
 * FIX владельца (2026-08-13): экрана «нужно N карточек» больше нет — правило
 * «блиц доступен?» живёт в предикате, а UI просто НЕ показывает кнопку.
 */
describe('canStartBlitz / blitzMinCards — предикат доступности режима', () => {
  it('минимум = BLITZ_MIN_CARDS и он же отдаётся геттером', () => {
    expect(blitzMinCards()).toBe(BLITZ_MIN_CARDS);
    expect(BLITZ_MIN_CARDS).toBe(4);
  });

  it('ниже минимума — блиц недоступен, с минимума и выше — доступен', () => {
    for (let n = 0; n < BLITZ_MIN_CARDS; n++) expect(canStartBlitz(n)).toBe(false);
    expect(canStartBlitz(BLITZ_MIN_CARDS)).toBe(true);
    expect(canStartBlitz(BLITZ_MIN_CARDS + 1)).toBe(true);
    expect(canStartBlitz(9999)).toBe(true);
  });

  it('мусор на входе не открывает режим', () => {
    expect(canStartBlitz(null)).toBe(false);
    expect(canStartBlitz(undefined)).toBe(false);
    expect(canStartBlitz(NaN)).toBe(false);
    expect(canStartBlitz(-10)).toBe(false);
    expect(canStartBlitz(3.9)).toBe(false);
    expect(canStartBlitz(4.2)).toBe(true);
  });
});
