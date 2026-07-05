import { CONSTELLATION_DEFAULTS } from './config';
import { createInitialMatchState } from './engine';
import {
  attackQuestionSpec,
  buildRoundInput,
  levelForRing,
} from './service_core';

const CFG = CONSTELLATION_DEFAULTS;
const HOMES = ['3,0', '3,-3', '-3,0', '-3,3'];

function makeState() {
  return createInitialMatchState({
    uids: ['u0', 'u1', 'u2', 'u3'],
    homes: HOMES,
    roundsTotal: CFG.roundsTotal,
    homeCores: CFG.homeCores,
  });
}

describe('constellations/service_core — уровень вопросов по кольцу (A2, банк A1–B2)', () => {
  test('внешнее кольцо: A1 для низких рангов, A2 для высоких', () => {
    expect(levelForRing('outer', 0)).toBe('A1');
    expect(levelForRing('outer', 23)).toBe('A2');
  });

  test('среднее A2→B1, внутреннее B1→B2, Полярная всегда B2 (C1 в банке нет)', () => {
    expect(levelForRing('middle', 0)).toBe('A2');
    expect(levelForRing('middle', 23)).toBe('B1');
    expect(levelForRing('inner', 0)).toBe('B1');
    expect(levelForRing('inner', 23)).toBe('B2');
    expect(levelForRing('polar', 0)).toBe('B2');
    expect(levelForRing('polar', 23)).toBe('B2');
  });
});

describe('constellations/service_core — число вопросов на атаку (A2/A5/A6)', () => {
  test('кольца без Сияния: внешнее 1, среднее 2, внутреннее 2, Полярная 3', () => {
    const s = makeState();
    expect(attackQuestionSpec(s, '3,-1', 0, CFG).count).toBe(1); // внешнее
    expect(attackQuestionSpec(s, '2,0', 0, CFG).count).toBe(2); // среднее
    expect(attackQuestionSpec(s, '1,0', 0, CFG).count).toBe(2); // внутреннее
    expect(attackQuestionSpec(s, '0,0', 0, CFG).count).toBe(3); // Полярная
  });

  test('Сияние добавляет +1 за уровень, кап 5 (1.5 — центр даёт заметный скачок)', () => {
    const s = makeState();
    s.stars['2,0'] = { owner: 1, radiance: 2 };
    expect(attackQuestionSpec(s, '2,0', 0, CFG).count).toBe(4); // 2+2 (среднее)
    s.stars['0,0'] = { owner: 1, radiance: 2 };
    expect(attackQuestionSpec(s, '0,0', 0, CFG).count).toBe(5); // 3+2 = 5 (Полярная, кап 5)
  });

  test('атака родной звезды: 2 вопроса среднего уровня + Сияние', () => {
    const s = makeState();
    const spec = attackQuestionSpec(s, HOMES[1], 0, CFG);
    expect(spec.count).toBe(2);
    expect(spec.level).toBe(levelForRing('middle', 0));
    expect(spec.isBossAssault).toBe(false);

    s.stars[HOMES[1]] = { owner: 1, radiance: 1 };
    expect(attackQuestionSpec(s, HOMES[1], 0, CFG).count).toBe(3);
  });

  test('последнее ядро — босс-штурм: всегда 3 вопроса внутреннего уровня, Сияние игнорируется', () => {
    const s = makeState();
    s.players[1] = { ...s.players[1], cores: 1 };
    s.stars[HOMES[1]] = { owner: 1, radiance: 2 };
    const spec = attackQuestionSpec(s, HOMES[1], 0, CFG);
    expect(spec.isBossAssault).toBe(true);
    expect(spec.count).toBe(3);
    expect(spec.level).toBe(levelForRing('inner', 0));
  });

  test('underdog-скидка (1.4): отстающий (≤3 звезды) атакует лидера — минус вопрос', () => {
    const s = makeState();
    // slot0 (атакующий) — только дом (1 звезда, отстающий). slot1 — лидер: дом + куча.
    s.stars['2,-2'] = { owner: 1, radiance: 0 };
    s.stars['1,0'] = { owner: 1, radiance: 0 };
    s.stars['0,0'] = { owner: 1, radiance: 0 };
    s.stars['1,-1'] = { owner: 1, radiance: 0 }; // лидер владеет 5 звёздами (дом+4)
    // Полярная лидера базово 3 вопроса → со скидкой 2.
    expect(attackQuestionSpec(s, '0,0', 0, CFG, 0).count).toBe(2);
    // Без attackerSlot скидки нет — 3 вопроса.
    expect(attackQuestionSpec(s, '0,0', 0, CFG).count).toBe(3);
  });

  test('underdog-скидка НЕ применяется, если атакующий не отстаёт', () => {
    const s = makeState();
    // Дать slot0 много звёзд → не отстающий.
    for (const k of ['2,0', '2,1', '3,-1', '2,-2']) s.stars[k] = { owner: 0, radiance: 0 };
    s.stars['0,0'] = { owner: 1, radiance: 0 };
    expect(attackQuestionSpec(s, '0,0', 0, CFG, 0).count).toBe(3); // без скидки
  });

  test('минимум вопросов на атаку — всегда 1 (скидка не уводит в 0)', () => {
    const s = makeState();
    s.stars['3,-1'] = { owner: 1, radiance: 0 }; // внешнее кольцо лидера = 1 вопрос
    for (const k of ['2,0', '1,0', '0,0', '1,-1']) s.stars[k] = { owner: 1, radiance: 0 };
    expect(attackQuestionSpec(s, '3,-1', 0, CFG, 0).count).toBe(1); // 1-1=0 → min 1
  });
});

describe('constellations/service_core — сборка входа резолва из доков', () => {
  test('атака: correctAll только когда отвечены ВСЕ выданные вопросы верно', () => {
    const input = buildRoundInput([
      {
        slot: 0, kind: 'attack', target: '2,0', shieldStarKey: null, questionCount: 2,
        answers: [
          { qIndex: 0, correct: true, timeMs: 3000 },
          { qIndex: 1, correct: true, timeMs: 4000 },
        ],
        perfectOverride: null,
      },
      {
        slot: 1, kind: 'attack', target: '2,-2', shieldStarKey: null, questionCount: 2,
        answers: [{ qIndex: 0, correct: true, timeMs: 3000 }], // второй не отвечен
        perfectOverride: null,
      },
    ], [], CFG);
    expect(input.attacks).toEqual([
      { slot: 0, target: '2,0', correctAll: true, perfect: true },
      { slot: 1, target: '2,-2', correctAll: false, perfect: false },
    ]);
  });

  test('идеальный захват требует и верности, и скорости: медленно, но верно → не идеально', () => {
    // questionMaxSec=15 → порог 7500мс. Верно, но среднее время выше порога.
    const input = buildRoundInput([
      {
        slot: 0, kind: 'attack', target: '2,0', shieldStarKey: null, questionCount: 2,
        answers: [
          { qIndex: 0, correct: true, timeMs: 9000 },
          { qIndex: 1, correct: true, timeMs: 9000 },
        ],
        perfectOverride: null,
      },
    ], [], CFG);
    expect(input.attacks[0]).toEqual({ slot: 0, target: '2,0', correctAll: true, perfect: false });
  });

  test('perfectOverride ботов приглушает идеальный захват', () => {
    const input = buildRoundInput([
      {
        slot: 0, kind: 'attack', target: '2,0', shieldStarKey: null, questionCount: 1,
        answers: [{ qIndex: 0, correct: true, timeMs: 5000 }],
        perfectOverride: false,
      },
    ], [], CFG);
    expect(input.attacks[0]).toEqual({ slot: 0, target: '2,0', correctAll: true, perfect: false });
  });

  test('щиты собираются из shieldStarKey', () => {
    const input = buildRoundInput([
      {
        slot: 2, kind: 'idle', target: null, shieldStarKey: '-3,0', questionCount: 0,
        answers: [], perfectOverride: null,
      },
    ], [], CFG);
    expect(input.shields).toEqual([{ slot: 2, starKey: '-3,0' }]);
  });

  test('дуэль: победитель по scoreDuel; неотвеченные вопросы = неверно', () => {
    const input = buildRoundInput([
      {
        slot: 0, kind: 'duel', target: '0,0', shieldStarKey: null, questionCount: 4,
        answers: [
          { qIndex: 0, correct: true, timeMs: 3000 },
          { qIndex: 1, correct: true, timeMs: 4000 },
        ],
        perfectOverride: null,
      },
      {
        slot: 3, kind: 'duel', target: '0,0', shieldStarKey: null, questionCount: 4,
        answers: [{ qIndex: 0, correct: false, timeMs: 2000 }],
        perfectOverride: null,
      },
    ], [{ starKey: '0,0', slots: [0, 3] }], CFG);
    expect(input.duels).toEqual([{ starKey: '0,0', slots: [0, 3], winner: 0 }]);
  });

  test('дуэль: оба мимо → winner null', () => {
    const input = buildRoundInput([
      {
        slot: 0, kind: 'duel', target: '0,0', shieldStarKey: null, questionCount: 4,
        answers: [], perfectOverride: null,
      },
      {
        slot: 1, kind: 'duel', target: '0,0', shieldStarKey: null, questionCount: 4,
        answers: [], perfectOverride: null,
      },
    ], [{ starKey: '0,0', slots: [0, 1] }], CFG);
    expect(input.duels[0].winner).toBeNull();
  });

  test('падающая звезда: верен первый ответ → answeredCorrect', () => {
    const input = buildRoundInput([
      {
        slot: 2, kind: 'falling', target: null, shieldStarKey: null, questionCount: 1,
        answers: [{ qIndex: 0, correct: true, timeMs: 6000 }], perfectOverride: null,
      },
      {
        slot: 3, kind: 'falling', target: null, shieldStarKey: null, questionCount: 1,
        answers: [], perfectOverride: null,
      },
    ], [], CFG);
    expect(input.falling).toEqual([
      { slot: 2, answeredCorrect: true },
      { slot: 3, answeredCorrect: false },
    ]);
  });
});
