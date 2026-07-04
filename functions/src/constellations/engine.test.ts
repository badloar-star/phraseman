import { CONSTELLATION_DEFAULTS, type ConstellationConfig } from './config';
import {
  createInitialMatchState,
  detectConflicts,
  legalTargets,
  resolveRound,
  type MatchState,
  type PlayerSlot,
  type RoundAction,
} from './engine';

const CFG: ConstellationConfig = CONSTELLATION_DEFAULTS;

// Раскладка без сида-рандома: углы поворота 0 — слоты по часовой.
const HOMES = ['3,0', '3,-3', '-3,0', '-3,3'];

function makeState(overrides?: Partial<MatchState>): MatchState {
  const base = createInitialMatchState({
    uids: ['u0', 'u1', 'u2', 'u3'],
    homes: HOMES,
    roundsTotal: CFG.roundsTotal,
    homeCores: CFG.homeCores,
  });
  return { ...base, ...overrides };
}

function noInput() {
  return { shields: [], attacks: [], duels: [], falling: [] };
}

describe('constellations/engine — стартовое состояние', () => {
  test('4 игрока владеют только родными звёздами, 3 ядра, раунд 1', () => {
    const s = makeState();
    expect(s.round).toBe(1);
    expect(s.stage).toBe('active');
    for (let slot = 0; slot < 4; slot += 1) {
      const p = s.players[slot];
      expect(p.cores).toBe(3);
      expect(p.status).toBe('alive');
      expect(s.stars[HOMES[slot]].owner).toBe(slot);
    }
    const owned = Object.values(s.stars).filter((st) => st.owner !== null);
    expect(owned).toHaveLength(4);
    expect(Object.keys(s.stars)).toHaveLength(37);
  });
});

describe('constellations/engine — легальные цели', () => {
  test('доступны только соседи своего созвездия, не свои звёзды', () => {
    const s = makeState();
    const targets = legalTargets(s, 0); // дом 3,0 — угол, 3 соседа в карте
    expect(targets.sort()).toEqual(['2,0', '2,1', '3,-1'].sort());
  });

  test('падающий и выбитый не имеют целей', () => {
    const s = makeState();
    s.players[1] = { ...s.players[1], status: 'falling' };
    s.players[2] = { ...s.players[2], status: 'out' };
    expect(legalTargets(s, 1)).toEqual([]);
    expect(legalTargets(s, 2)).toEqual([]);
  });
});

describe('constellations/engine — конфликты (Столкновение)', () => {
  const action = (slot: PlayerSlot, target: string): RoundAction => ({
    slot, target, shieldStarKey: null,
  });

  test('двое на одну звезду → дуэль; разные цели → одиночные', () => {
    const res = detectConflicts(
      [action(0, '0,0'), action(1, '0,0'), action(2, '-2,0')],
      { 0: 100, 1: 200, 2: 300, 3: 0 },
    );
    expect(res.duels).toEqual([{ starKey: '0,0', slots: [0, 1] }]);
    expect(res.singles.map((a) => a.slot)).toEqual([2]);
    expect(res.outpaced).toEqual([]);
  });

  test('трое на одну звезду → дуэль двух с лучшим рейтингом, третий «опоздал»', () => {
    const res = detectConflicts(
      [action(0, '0,0'), action(1, '0,0'), action(2, '0,0')],
      { 0: 100, 1: 300, 2: 200, 3: 0 },
    );
    expect(res.duels).toEqual([{ starKey: '0,0', slots: [1, 2] }]);
    expect(res.outpaced).toEqual([0]);
  });
});

describe('constellations/engine — резолв атак', () => {
  test('успех против нейтральной: захват; идеальный → Сияние 1', () => {
    const s = makeState();
    const { state } = resolveRound(s, {
      ...noInput(),
      attacks: [
        { slot: 0, target: '2,0', correctAll: true, perfect: true },
        { slot: 1, target: '2,-2', correctAll: true, perfect: false },
      ],
    }, CFG);
    expect(state.stars['2,0']).toEqual({ owner: 0, radiance: 1 });
    expect(state.stars['2,-2']).toEqual({ owner: 1, radiance: 0 });
    expect(state.players[0].perfectCaptures).toBe(1);
  });

  test('провал атаки: звезда не меняется', () => {
    const s = makeState();
    const { state } = resolveRound(s, {
      ...noInput(),
      attacks: [{ slot: 0, target: '2,0', correctAll: false, perfect: false }],
    }, CFG);
    expect(state.stars['2,0'].owner).toBeNull();
  });

  test('успех против чужой: переход, Сияние сбрасывается', () => {
    const s = makeState();
    s.stars['2,0'] = { owner: 1, radiance: 2 };
    const { state } = resolveRound(s, {
      ...noInput(),
      attacks: [{ slot: 0, target: '2,0', correctAll: true, perfect: false }],
    }, CFG);
    expect(state.stars['2,0']).toEqual({ owner: 0, radiance: 0 });
  });

  test('исходное состояние не мутируется (иммутабельность)', () => {
    const s = makeState();
    const before = JSON.parse(JSON.stringify(s));
    resolveRound(s, {
      ...noInput(),
      attacks: [{ slot: 0, target: '2,0', correctAll: true, perfect: true }],
    }, CFG);
    expect(s).toEqual(before);
  });
});

describe('constellations/engine — щит и дуэли', () => {
  test('щит поднимает Сияние своей звезды до капа 2', () => {
    const s = makeState();
    s.stars[HOMES[0]] = { owner: 0, radiance: 1 };
    const { state } = resolveRound(s, {
      ...noInput(),
      shields: [{ slot: 0, starKey: HOMES[0] }],
    }, CFG);
    expect(state.stars[HOMES[0]].radiance).toBe(2);
    expect(state.players[0].shieldUsed).toBe(true);
  });

  test('дуэль: победитель забирает звезду, оба-мимо — звезда прежнему владельцу', () => {
    const s = makeState();
    const { state } = resolveRound(s, {
      ...noInput(),
      duels: [{ starKey: '0,0', slots: [0, 1], winner: 1 }],
    }, CFG);
    expect(state.stars['0,0'].owner).toBe(1);

    const s2 = makeState();
    s2.stars['0,0'] = { owner: 2, radiance: 1 };
    const { state: state2 } = resolveRound(s2, {
      ...noInput(),
      duels: [{ starKey: '0,0', slots: [0, 1], winner: null }],
    }, CFG);
    expect(state2.stars['0,0'].owner).toBe(2);
  });
});

describe('constellations/engine — ядра, выбивание, возрождение', () => {
  test('успешная атака дома снимает ядро; 0 ядер → все звёзды атакующему + бонус', () => {
    const s = makeState();
    s.players[1] = { ...s.players[1], cores: 1 };
    s.stars['2,-2'] = { owner: 1, radiance: 0 }; // ещё одна звезда жертвы
    const { state, events } = resolveRound(s, {
      ...noInput(),
      attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
    }, CFG);
    expect(state.players[1].cores).toBe(0);
    expect(state.stars[HOMES[1]].owner).toBe(0);
    expect(state.stars['2,-2']).toEqual({ owner: 0, radiance: 0 });
    expect(state.players[0].bonusPoints).toBeGreaterThanOrEqual(CFG.scoring.eliminationBonus);
    expect(events.some((e) => e.type === 'eliminated' && e.slot === 1)).toBe(true);
  });

  test('первый вылет при >3 оставшихся раундах → падающая звезда', () => {
    const s = makeState(); // раунд 1 из 10, осталось 9
    s.players[1] = { ...s.players[1], cores: 1 };
    const { state } = resolveRound(s, {
      ...noInput(),
      attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
    }, CFG);
    expect(state.players[1].status).toBe('falling');
  });

  test('поздний вылет (≤3 оставшихся) → сразу out', () => {
    const s = makeState({ round: 8 }); // после 8-го останется 2
    s.players[1] = { ...s.players[1], cores: 1 };
    const { state } = resolveRound(s, {
      ...noInput(),
      attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
    }, CFG);
    expect(state.players[1].status).toBe('out');
  });

  test('падающая звезда: 2 верных ответа → возрождение на свободном внешнем кольце с 1 ядром', () => {
    const s = makeState();
    s.players[1] = { ...s.players[1], status: 'falling', fallingLight: 1, cores: 0 };
    const { state, events } = resolveRound(s, {
      ...noInput(),
      falling: [{ slot: 1, answeredCorrect: true }],
    }, CFG);
    const p = state.players[1];
    expect(p.status).toBe('alive');
    expect(p.cores).toBe(1);
    expect(p.rebirthUsed).toBe(true);
    const home = state.players[1].homeStarKey;
    expect(state.stars[home].owner).toBe(1);
    expect(events.some((e) => e.type === 'reborn' && e.slot === 1)).toBe(true);
  });

  test('неверный ответ падающей звезды не копит свет', () => {
    const s = makeState();
    s.players[1] = { ...s.players[1], status: 'falling', fallingLight: 0, cores: 0 };
    const { state } = resolveRound(s, {
      ...noInput(),
      falling: [{ slot: 1, answeredCorrect: false }],
    }, CFG);
    expect(state.players[1].fallingLight).toBe(0);
    expect(state.players[1].status).toBe('falling');
  });

  test('повторный вылет после возрождения → out навсегда', () => {
    const s = makeState();
    s.players[1] = { ...s.players[1], cores: 1, rebirthUsed: true };
    const { state } = resolveRound(s, {
      ...noInput(),
      attacks: [{ slot: 0, target: HOMES[1], correctAll: true, perfect: false }],
    }, CFG);
    expect(state.players[1].status).toBe('out');
  });
});

describe('constellations/engine — Полярная и созвездия', () => {
  test('удержание Полярной: +5 очков за раунд, +1 пыль за каждые 3 раунда, кап 2', () => {
    let s = makeState();
    s.stars['0,0'] = { owner: 0, radiance: 0 };
    let dustEvents = 0;
    for (let i = 0; i < 9; i += 1) {
      const res = resolveRound(s, noInput(), { ...CFG, roundsTotal: 100 });
      dustEvents += res.events.filter((e) => e.type === 'polar_dust').length;
      s = res.state;
    }
    expect(s.players[0].bonusPoints).toBe(9 * CFG.scoring.polarHoldPerRound + /* созвездий нет */ 0);
    expect(s.players[0].dustEarned).toBe(2); // 3-й и 6-й раунды; 9-й упёрся в кап
    expect(dustEvents).toBe(2);
  });

  test('перехват Полярной сбрасывает счёт удержания', () => {
    let s = makeState();
    s.stars['0,0'] = { owner: 0, radiance: 0 };
    s = resolveRound(s, noInput(), CFG).state; // 1 раунд у slot0
    s.stars['0,0'] = { owner: 1, radiance: 0 }; // перехват
    s = resolveRound(s, noInput(), CFG).state;
    expect(s.players[0].polarRoundsHeld).toBe(0);
    expect(s.players[1].polarRoundsHeld).toBe(1);
  });

  test('созвездие 3+ смежных даёт бонус каждый раунд', () => {
    const s = makeState();
    s.stars['2,0'] = { owner: 0, radiance: 0 };
    s.stars['2,1'] = { owner: 0, radiance: 0 }; // 3,0 + 2,0 + 2,1 смежны
    const { state, events } = resolveRound(s, noInput(), CFG);
    expect(state.players[0].bonusPoints).toBe(CFG.scoring.constellationBonusPerRound);
    expect(events.some((e) => e.type === 'constellation_bonus' && e.slot === 0)).toBe(true);
  });
});

describe('constellations/engine — завершение матча', () => {
  test('последний раунд закрывает матч', () => {
    const s = makeState({ round: 10 });
    const { state } = resolveRound(s, noInput(), CFG);
    expect(state.stage).toBe('finished');
  });

  test('ранняя победа по доле карты (70%)', () => {
    const s = makeState();
    // отдаём slot0 26 звёзд (70% от 37 = 25.9 → 26)
    const keys = Object.keys(s.stars);
    let given = 0;
    for (const key of keys) {
      if (given >= 26) break;
      if (s.stars[key].owner === null || s.stars[key].owner === 0) {
        s.stars[key] = { owner: 0, radiance: 0 };
        given += 1;
      }
    }
    const { state, events } = resolveRound(s, noInput(), CFG);
    expect(state.stage).toBe('finished');
    expect(events.some((e) => e.type === 'early_win' && e.slot === 0)).toBe(true);
  });

  test('выбил всех (остальные out) → ранняя победа', () => {
    const s = makeState();
    s.players[1] = { ...s.players[1], status: 'out', cores: 0 };
    s.players[2] = { ...s.players[2], status: 'out', cores: 0 };
    s.players[3] = { ...s.players[3], status: 'out', cores: 0 };
    const { state } = resolveRound(s, noInput(), CFG);
    expect(state.stage).toBe('finished');
  });

  test('падающий игрок НЕ считается выбитым для ранней победы', () => {
    const s = makeState();
    s.players[1] = { ...s.players[1], status: 'out', cores: 0 };
    s.players[2] = { ...s.players[2], status: 'out', cores: 0 };
    s.players[3] = { ...s.players[3], status: 'falling', cores: 0 };
    const { state } = resolveRound(s, noInput(), CFG);
    expect(state.stage).toBe('active');
  });

  test('захват в последнем раунде даёт ×2 (бонус = стоимость звезды)', () => {
    const s = makeState({ round: 10 });
    const { state } = resolveRound(s, {
      ...noInput(),
      attacks: [{ slot: 0, target: '2,0', correctAll: true, perfect: false }],
    }, CFG);
    // среднее кольцо = 20 очков; множитель 2 → +20 бонусных
    expect(state.players[0].bonusPoints).toBe(20);
  });
});
