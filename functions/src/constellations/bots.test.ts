import { CONSTELLATION_DEFAULTS } from './config';
import { createInitialMatchState, legalTargets } from './engine';
import { createSeededRand } from './hex';
import {
  botAnswerPlan,
  botStyle,
  chooseBotTarget,
  synthesizeBotProfiles,
} from './bots';

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

describe('constellations/bots — профили (B4/B5)', () => {
  test('нужное число профилей, имена и uid уникальны', () => {
    const rand = createSeededRand('profiles-1');
    const bots = synthesizeBotProfiles(3, 6, CFG.bots, rand);
    expect(bots).toHaveLength(3);
    expect(new Set(bots.map((b) => b.uid)).size).toBe(3);
    expect(new Set(bots.map((b) => b.name)).size).toBe(3);
  });

  test('НИЧЕГО в профиле не выдаёт бота: uid без bot-маркеров, имя из пула людей', () => {
    const rand = createSeededRand('profiles-2');
    for (const bot of synthesizeBotProfiles(3, 3, CFG.bots, rand)) {
      expect(bot.uid).not.toMatch(/bot|npc|ai/i);
      expect(bot.uid).toMatch(/^[A-Za-z0-9]{20}$/); // как настоящий Firestore push id
      expect(bot.name.length).toBeGreaterThan(2);
      expect(bot.avatarLevel).toBeGreaterThanOrEqual(1);
    }
  });

  test('точность в границах конфига и растёт с рангом (lerp 50%→85%)', () => {
    const randLow = createSeededRand('acc-low');
    const randHigh = createSeededRand('acc-high');
    const low = synthesizeBotProfiles(20, 0, CFG.bots, randLow);
    const high = synthesizeBotProfiles(20, 11, CFG.bots, randHigh);
    for (const b of [...low, ...high]) {
      expect(b.accuracy).toBeGreaterThanOrEqual(CFG.bots.accuracyMin);
      expect(b.accuracy).toBeLessThanOrEqual(CFG.bots.accuracyMax);
    }
    const avg = (arr: { accuracy: number }[]) =>
      arr.reduce((s, b) => s + b.accuracy, 0) / arr.length;
    expect(avg(high)).toBeGreaterThan(avg(low));
  });
});

describe('constellations/bots — план ответов (человечность)', () => {
  test('тайминги в человеческих границах 4–20 сек', () => {
    const rand = createSeededRand('plan-1');
    const [bot] = synthesizeBotProfiles(1, 5, CFG.bots, rand);
    for (let i = 0; i < 50; i += 1) {
      const plan = botAnswerPlan(bot, 3, rand);
      expect(plan.correct).toHaveLength(3);
      expect(plan.timesMs).toHaveLength(3);
      for (const t of plan.timesMs) {
        expect(t).toBeGreaterThanOrEqual(CFG.bots.answerMsMin);
        expect(t).toBeLessThanOrEqual(CFG.bots.answerMsMax);
      }
    }
  });

  test('доля верных статистически близка к точности профиля', () => {
    const rand = createSeededRand('plan-2');
    const [bot] = synthesizeBotProfiles(1, 6, CFG.bots, rand);
    let correct = 0;
    let total = 0;
    for (let i = 0; i < 300; i += 1) {
      const plan = botAnswerPlan(bot, 2, rand);
      correct += plan.correct.filter(Boolean).length;
      total += plan.correct.length;
    }
    const share = correct / total;
    expect(share).toBeGreaterThan(bot.accuracy - 0.12);
    expect(share).toBeLessThan(bot.accuracy + 0.12);
  });

  test('изредка пропускает идеальный захват: perfect бывает false при всех верных', () => {
    const rand = createSeededRand('plan-3');
    const [bot] = synthesizeBotProfiles(1, 11, CFG.bots, rand);
    let allCorrectCount = 0;
    let skippedPerfect = 0;
    for (let i = 0; i < 400; i += 1) {
      const plan = botAnswerPlan(bot, 1, rand);
      if (plan.correct.every(Boolean)) {
        allCorrectCount += 1;
        if (!plan.perfect) skippedPerfect += 1;
      }
    }
    expect(allCorrectCount).toBeGreaterThan(0);
    expect(skippedPerfect).toBeGreaterThan(0);
    expect(skippedPerfect).toBeLessThan(allCorrectCount); // но не всегда
  });
});

describe('constellations/bots — выбор цели (стратегия)', () => {
  test('цель всегда легальна', () => {
    const state = makeState();
    const rand = createSeededRand('target-1');
    for (let i = 0; i < 30; i += 1) {
      const target = chooseBotTarget(state, 0, rand);
      expect(target).not.toBeNull();
      expect(legalTargets(state, 0)).toContain(target);
    }
  });

  test('падающий/выбитый бот не ходит', () => {
    const state = makeState();
    state.players[1] = { ...state.players[1], status: 'falling' };
    const rand = createSeededRand('target-2');
    expect(chooseBotTarget(state, 1, rand)).toBeNull();
  });

  test('добивание: сосед-дом жертвы с 1 ядром приоритетнее прочих целей', () => {
    const state = makeState();
    // бот slot0 стоит вплотную к дому slot1 с одним ядром
    state.stars['3,-2'] = { owner: 0, radiance: 0 }; // сосед дома 3,-3
    state.players[1] = { ...state.players[1], cores: 1 };
    const rand = createSeededRand('target-3');
    let finisher = 0;
    for (let i = 0; i < 20; i += 1) {
      if (chooseBotTarget(state, 0, rand) === '3,-3') finisher += 1;
    }
    expect(finisher).toBeGreaterThan(15); // почти всегда добивает
  });

  test('Полярная в приоритете у ЦЕНТРОВОГО стиля', () => {
    const state = makeState();
    state.stars['1,0'] = { owner: 0, radiance: 0 }; // сосед Полярной
    const rand = createSeededRand('target-4');
    let polar = 0;
    for (let i = 0; i < 20; i += 1) {
      if (chooseBotTarget(state, 0, rand, 'centrist') === '0,0') polar += 1;
    }
    expect(polar).toBeGreaterThan(10);
  });

  test('разнообразие стилей: центровой тянется в центр СИЛЬНЕЕ расширенца', () => {
    const state = makeState();
    state.stars['1,0'] = { owner: 0, radiance: 0 }; // сосед Полярной
    const countPolar = (style: 'centrist' | 'expander' | 'aggressor') => {
      const rand = createSeededRand(`div-${style}`);
      let n = 0;
      for (let i = 0; i < 40; i += 1) if (chooseBotTarget(state, 0, rand, style) === '0,0') n += 1;
      return n;
    };
    // Центровой идёт в Полярную заметно чаще расширенца (не все боты в центр).
    expect(countPolar('centrist')).toBeGreaterThan(countPolar('expander'));
  });

  test('botStyle детерминирован по uid и даёт разные стили разным ботам', () => {
    // Один uid → всегда один стиль.
    expect(botStyle('AbCdEfGh1234')).toBe(botStyle('AbCdEfGh1234'));
    // На пуле uid встречаются РАЗНЫЕ стили (не все одинаковые).
    const seen = new Set<string>();
    for (let i = 0; i < 30; i += 1) seen.add(botStyle(`bot-uid-${i}-xyz`));
    expect(seen.size).toBeGreaterThan(1);
  });
});
