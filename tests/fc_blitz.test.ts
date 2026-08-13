/**
 * cards-2.0 (E12): чистая логика блица (§3.9 мастер-плана).
 * Покрытие: комбо-пороги ×3/×5/×10 (множитель + точный hit для SFX), очки
 * 100 × множитель, жизни (ошибка = −1, 0 = конец), редьюсер applyBlitzAnswer,
 * сборка вопроса «EN → выбери перевод из 4» (уникальные decoys из своей колоды).
 */
import {
  applyBlitzAnswer,
  buildBlitzQuestion,
  comboMultiplier,
  comboThresholdHit,
  initialBlitzState,
  pointsForCorrect,
  BLITZ_COMBO_STEPS,
  BLITZ_LIVES,
  BLITZ_POINTS_CORRECT,
  type BlitzCardLike,
  type BlitzState,
} from '../app/flashcards/blitz_logic';

// ════════════════════════════════════════════════════════════════════════════
describe('комбо-пороги (§3.9: ×3/×5/×10)', () => {
  it('множитель растёт по конфигу: 1 → 1.5 → 2 → 3', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(2)).toBe(1);
    expect(comboMultiplier(3)).toBe(1.5);
    expect(comboMultiplier(4)).toBe(1.5);
    expect(comboMultiplier(5)).toBe(2);
    expect(comboMultiplier(9)).toBe(2);
    expect(comboMultiplier(10)).toBe(3);
    expect(comboMultiplier(25)).toBe(3);
  });

  it('порог срабатывает РОВНО на 3/5/10 (для SFX fc_combo_* и пружины бейджа)', () => {
    const hits = Array.from({ length: 12 }, (_, i) => comboThresholdHit(i + 1));
    expect(hits[2]).toBe(3); // третий подряд
    expect(hits[4]).toBe(5);
    expect(hits[9]).toBe(10);
    // все прочие — null (SFX не спамится на каждом ответе)
    hits.forEach((h, i) => {
      if (![2, 4, 9].includes(i)) expect(h).toBeNull();
    });
    expect(BLITZ_COMBO_STEPS.map((s) => s.streak)).toEqual([10, 5, 3]);
  });

  it('очки: 100 × множитель, округление до целого', () => {
    expect(pointsForCorrect(1)).toBe(BLITZ_POINTS_CORRECT);
    expect(pointsForCorrect(3)).toBe(150);
    expect(pointsForCorrect(5)).toBe(200);
    expect(pointsForCorrect(10)).toBe(300);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('applyBlitzAnswer — очки, серия, жизни', () => {
  it('верный ответ: серия +1, очки с множителем, correct +1', () => {
    let s: BlitzState = initialBlitzState();
    const r1 = applyBlitzAnswer(s, true);
    expect(r1.state).toMatchObject({ streak: 1, score: 100, correct: 1, wrong: 0, lives: BLITZ_LIVES });
    expect(r1.gained).toBe(100);
    expect(r1.comboHit).toBeNull();
    expect(r1.outOfLives).toBe(false);

    s = r1.state;
    s = applyBlitzAnswer(s, true).state; // streak 2 (+100)
    const r3 = applyBlitzAnswer(s, true); // streak 3 (+150, порог ×3)
    expect(r3.comboHit).toBe(3);
    expect(r3.gained).toBe(150);
    expect(r3.state.score).toBe(350);
  });

  it('серия из 10 верных: пороги на 3/5/10, сумма очков по множителям', () => {
    let s = initialBlitzState();
    const hits: Array<number | null> = [];
    for (let i = 0; i < 10; i++) {
      const r = applyBlitzAnswer(s, true);
      hits.push(r.comboHit);
      s = r.state;
    }
    expect(hits.filter((h) => h != null)).toEqual([3, 5, 10]);
    // 100+100 + 150+150 + 200×5 + 300 = 1800
    expect(s.score).toBe(1800);
    expect(s.streak).toBe(10);
  });

  it('ошибка: −1 жизнь, серия в 0, очки не растут; 3 ошибки = конец', () => {
    let s = initialBlitzState();
    s = applyBlitzAnswer(s, true).state;
    s = applyBlitzAnswer(s, true).state;
    s = applyBlitzAnswer(s, true).state; // streak 3

    const w1 = applyBlitzAnswer(s, false);
    expect(w1.state).toMatchObject({ streak: 0, lives: 2, wrong: 1, score: 350 });
    expect(w1.gained).toBe(0);
    expect(w1.outOfLives).toBe(false);

    const w2 = applyBlitzAnswer(w1.state, false);
    expect(w2.state.lives).toBe(1);
    expect(w2.outOfLives).toBe(false);

    const w3 = applyBlitzAnswer(w2.state, false);
    expect(w3.state.lives).toBe(0);
    expect(w3.outOfLives).toBe(true);
    // после ошибки серия начинается заново — множитель снова ×1
    const again = applyBlitzAnswer(w1.state, true);
    expect(again.gained).toBe(100);
    expect(again.state.streak).toBe(1);
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
