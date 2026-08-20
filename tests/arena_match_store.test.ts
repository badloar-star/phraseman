import * as fs from 'fs';
import * as path from 'path';
import { arenaText } from '../modules/arena/copy';
import type { Lang } from '../constants/i18n';
import {
  ARENA_MATCH_STORE_KEY,
  ARENA_MATCH_STORE_TTL_MS,
  arenaClearMatch,
  arenaDecodeStoredMatch,
  arenaEncodeStoredMatch,
  arenaLoadMatch,
  arenaSaveMatch,
  arenaStoredMatchUsable,
  type ArenaKeyValueStore,
} from '../modules/arena/match_store';
import { arenaMachinePlan, arenaParseMatchPlan, type ArenaMatchPlanWire } from '../modules/arena/duel_plan';
import { arenaLocalMatchInit, type ArenaLocalMatchState } from '../modules/arena/match_machine';
import type { ArenaOutboxOwnerScope } from '../modules/arena/result_outbox';

/**
 * Хранилище идущего матча.
 *
 * Главное правило, которое здесь закреплено: половинчатого восстановления не
 * бывает. Всё, что не сходится — версия схемы, идентификатор матча, отпечаток
 * плана, место игрока, длина матча — отбрасывается ЦЕЛИКОМ. Продолжить матч с
 * повреждённого снимка хуже, чем начать заново: расхождение вылезет не на
 * экране, а в начислении.
 */

const MODES = ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'] as const;

function planWire(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'arena-match-plan.v2',
    rulesVersion: 'arena-stars.v3',
    matchId: 'm1',
    mode: 'ranked',
    viewerSeat: 'a',
    taskCount: 5,
    countdownMs: 3_200,
    readingMs: 1_500,
    revealMs: 1_200,
    rules: {
      starsCorrect: 2, starsCorrectFirst: 3, starsPerPair: 1, comboThreshold: 3,
      comboBonus: 1, timeQuantumMs: 100, starPolicy: 'banked',
      awardsRankPoints: true, matchStarCeiling: 19,
    },
    tasks: MODES.map((mode, taskIndex) => ({
      taskId: `t${taskIndex}`,
      taskIndex,
      mode,
      kind: 'choice',
      difficulty: 2,
      answerMs: 8_000,
      payload: { phrase: 'give up', options: ['a', 'b', 'c', 'd'] },
      answerFingerprints: ['abc'],
    })),
    opponent: { seat: 'b', name: 'Соперник', rank: 4 },
    opponentTicks: [],
    liveChannelPath: 'arenaLive/m1',
    planHash: 'hash32',
    issuedAtMs: 1_000,
    ...over,
  };
}

const PLAN = arenaParseMatchPlan(planWire()) as ArenaMatchPlanWire;
const MONO0 = 10_000;
const WALL0 = 1_700_000_000_000;
const STATE = arenaLocalMatchInit(arenaMachinePlan(PLAN), {
  monoNowMs: MONO0, wallNowMs: WALL0, monoEpochId: 'epoch-1', countdownRemainingMs: 3_200,
});
const SCOPE: ArenaOutboxOwnerScope = { stableUid: 'account-a', accountGeneration: 1 };

function memoryStore(initial?: Record<string, string>): ArenaKeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = { ...(initial ?? {}) };
  return {
    data,
    async getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    async setItem(key, value) { data[key] = value; },
    async removeItem(key) { delete data[key]; },
  };
}

describe('фикстура плана валидна', () => {
  it('план разобрался', () => {
    expect(PLAN).not.toBeNull();
    expect(PLAN.tasks.length).toBe(5);
    expect(PLAN.matchId).toBe('m1');
  });

  it('машинный план несёт только режимы', () => {
    const machine = arenaMachinePlan(PLAN);
    expect(machine.tasks.length).toBe(5);
    expect(machine.tasks[4].mode).toBe('speed_match');
    expect(JSON.stringify(machine)).not.toContain('payload');
  });
});

describe('кодирование и разбор', () => {
  it('снимок переживает круг', () => {
    const decoded = arenaDecodeStoredMatch(arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0));
    expect(decoded).not.toBeNull();
    expect(decoded!.plan.matchId).toBe('m1');
    expect(decoded!.state.taskIndex).toBe(STATE.taskIndex);
    expect(decoded!.savedAtWallMs).toBe(WALL0);
  });

  it('пусто и мусор дают null, а не падение', () => {
    expect(arenaDecodeStoredMatch(null)).toBeNull();
    expect(arenaDecodeStoredMatch('')).toBeNull();
    expect(arenaDecodeStoredMatch('{')).toBeNull();
    expect(arenaDecodeStoredMatch('не json вовсе')).toBeNull();
    expect(arenaDecodeStoredMatch('[]')).toBeNull();
    expect(arenaDecodeStoredMatch('null')).toBeNull();
    expect(arenaDecodeStoredMatch('"строка"')).toBeNull();
  });

  it('оборванная запись отбрасывается молча', () => {
    const full = arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0);
    expect(arenaDecodeStoredMatch(full.slice(0, Math.floor(full.length / 2)))).toBeNull();
  });

  it('чужая версия схемы снимка отбрасывается', () => {
    const raw = JSON.parse(arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0));
    raw.schemaVersion = 'arena-match-store.v0';
    expect(arenaDecodeStoredMatch(JSON.stringify(raw))).toBeNull();
  });

  it('чужая версия схемы состояния отбрасывается', () => {
    const raw = JSON.parse(arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0));
    raw.state.schemaVersion = 'arena-local-match.v1';
    expect(arenaDecodeStoredMatch(JSON.stringify(raw))).toBeNull();
  });

  it('состояние от другого матча отбрасывается', () => {
    const raw = JSON.parse(arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0));
    raw.state.matchId = 'm2';
    expect(arenaDecodeStoredMatch(JSON.stringify(raw))).toBeNull();
  });

  it('разъехавшийся отпечаток плана отбрасывается', () => {
    const raw = JSON.parse(arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0));
    raw.state.planHash = 'другой';
    expect(arenaDecodeStoredMatch(JSON.stringify(raw))).toBeNull();
  });

  it('чужое место игрока отбрасывается', () => {
    const raw = JSON.parse(arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0));
    raw.state.seat = 'b';
    expect(arenaDecodeStoredMatch(JSON.stringify(raw))).toBeNull();
  });

  it('несовпавшая длина матча отбрасывается', () => {
    const raw = JSON.parse(arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0));
    raw.state.taskCount = 10;
    expect(arenaDecodeStoredMatch(JSON.stringify(raw))).toBeNull();
  });

  it('битый план отбрасывает весь снимок', () => {
    const raw = JSON.parse(arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0));
    raw.plan.tasks[2].mode = 'quiz';
    expect(arenaDecodeStoredMatch(JSON.stringify(raw))).toBeNull();
  });

  it('отсутствующее или битое время записи отбрасывается', () => {
    for (const value of [undefined, 0, -1, 'вчера', NaN]) {
      const raw = JSON.parse(arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0));
      raw.savedAtWallMs = value;
      expect(arenaDecodeStoredMatch(JSON.stringify(raw))).toBeNull();
    }
  });
});

describe('годность снимка', () => {
  const stored = arenaDecodeStoredMatch(arenaEncodeStoredMatch(SCOPE, PLAN, STATE, WALL0))!;

  it('свежий снимок годен', () => {
    expect(arenaStoredMatchUsable(stored, SCOPE, WALL0 + 1_000)).toBe(true);
  });

  it('пустой снимок не годен', () => {
    expect(arenaStoredMatchUsable(null, SCOPE, WALL0)).toBe(false);
  });

  it('протухший снимок не годен', () => {
    expect(arenaStoredMatchUsable(stored, SCOPE, WALL0 + ARENA_MATCH_STORE_TTL_MS)).toBe(false);
    expect(arenaStoredMatchUsable(stored, SCOPE, WALL0 + ARENA_MATCH_STORE_TTL_MS - 1)).toBe(true);
  });

  it('часы, ушедшие назад, не отнимают снимок', () => {
    expect(arenaStoredMatchUsable(stored, SCOPE, WALL0 - 5 * 60 * 60 * 1_000)).toBe(true);
  });

  it('снимок другого матча не годен', () => {
    expect(arenaStoredMatchUsable(stored, SCOPE, WALL0 + 1_000, 'm2')).toBe(false);
    expect(arenaStoredMatchUsable(stored, SCOPE, WALL0 + 1_000, 'm1')).toBe(true);
  });

  it('доигранный матч восстанавливается до долговечной записи отчёта', () => {
    const finished = {
      ...stored,
      state: { ...stored.state, phase: 'finished' } as ArenaLocalMatchState,
    };
    expect(arenaStoredMatchUsable(finished, SCOPE, WALL0 + 1_000)).toBe(true);
  });
});

describe('работа с хранилищем', () => {
  it('сохраняет и читает', async () => {
    const store = memoryStore();
    expect(await arenaSaveMatch(store, SCOPE, PLAN, STATE, WALL0)).toBe(true);
    expect(Object.keys(store.data)).toEqual([ARENA_MATCH_STORE_KEY]);
    const loaded = await arenaLoadMatch(store, SCOPE, WALL0 + 500);
    expect(loaded).not.toBeNull();
    expect(loaded!.plan.matchId).toBe('m1');
  });

  it('пустое хранилище — null', async () => {
    expect(await arenaLoadMatch(memoryStore(), SCOPE, WALL0)).toBeNull();
  });

  it('протухшее не отдаётся', async () => {
    const store = memoryStore();
    await arenaSaveMatch(store, SCOPE, PLAN, STATE, WALL0);
    expect(await arenaLoadMatch(store, SCOPE, WALL0 + ARENA_MATCH_STORE_TTL_MS)).toBeNull();
  });

  it('очистка убирает ключ', async () => {
    const store = memoryStore();
    await arenaSaveMatch(store, SCOPE, PLAN, STATE, WALL0);
    await arenaClearMatch(store, SCOPE, PLAN.matchId, () => true);
    expect(await arenaLoadMatch(store, SCOPE, WALL0)).toBeNull();
  });

  it('сорванная запись не роняет матч', async () => {
    const broken: ArenaKeyValueStore = {
      async getItem() { throw new Error('disk full'); },
      async setItem() { throw new Error('disk full'); },
      async removeItem() { throw new Error('disk full'); },
    };
    expect(await arenaSaveMatch(broken, SCOPE, PLAN, STATE, WALL0)).toBe(false);
    expect(await arenaLoadMatch(broken, SCOPE, WALL0)).toBeNull();
    await arenaClearMatch(broken, SCOPE, PLAN.matchId, () => true);
  });

  it('перезапись снимка не плодит ключи', async () => {
    const store = memoryStore();
    await arenaSaveMatch(store, SCOPE, PLAN, STATE, WALL0);
    await arenaSaveMatch(store, SCOPE, PLAN, STATE, WALL0 + 5_000);
    expect(Object.keys(store.data).length).toBe(1);
    expect((await arenaLoadMatch(store, SCOPE, WALL0 + 6_000))!.savedAtWallMs).toBe(WALL0 + 5_000);
  });
});


/**
 * Снимок матча писался на каждой границе задания — и НИКТО его не читал.
 * Цена записи платилась, а обещанное свойство «матч переживает перезапуск» не
 * работало: приложение убили посреди матча, и он начинался заново, с первого
 * задания и с обнулённым временем.
 */
describe('снимок матча действительно восстанавливается', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');

  it('экран матча читает снимок, а не только пишет его', () => {
    expect(source).toContain('arenaLoadMatch');
    expect(source).toContain('restored');
  });

  /**
   * Порядок важен: если подставить план до того, как проверка снимка
   * закончилась, машина начнёт матч с нуля и затрёт восстановленное.
   */
  it('план подставляется только после проверки снимка', () => {
    expect(source).toContain('plan: restoreChecked && planAccountRef.current && planScope');
  });
});


/**
 * После холодного старта задание, открытое в момент выключения, закрывается
 * просрочкой — так решает машина матча, и это правильно: начислять звёзды за
 * время, проведённое вне игры, нельзя. Но игрок видел просто потерянное
 * задание и не понимал, за что.
 */
describe('потерянное задание после перезапуска объясняется', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_match.tsx'), 'utf8');
  const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[];

  it('экран матча показывает объяснение, когда часы разъехались', () => {
    expect(source).toContain('match.state.clockSuspect');
    expect(source).toContain("'clockJumped'");
    expect(source).toContain("'clockJumpedHint'");
  });

  it('сказано и что случилось, и что матч продолжается', () => {
    for (const lang of langs) {
      expect(arenaText(lang, 'clockJumped').length).toBeGreaterThan(0);
      expect(arenaText(lang, 'clockJumpedHint').length).toBeGreaterThan(0);
    }
  });
});
