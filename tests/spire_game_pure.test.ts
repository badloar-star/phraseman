import { arenaAnswerFingerprint } from '../modules/arena/answer_check';
import { SPIRE_CONFIG_DEFAULTS, spireStepBudgetMs } from '../modules/spire/config_contract';
import { spireRevealChoiceIndex, spireRevealItemIndexes, spireRevealTokens } from '../modules/spire/answer_reveal';
import { spireDecodeWeekPack, spirePackFloorFor, spirePickStepPlan } from '../modules/spire/pack_plan';
import { spireBuildRoomRows, spireDecodeRoomMembers, spireMyPlace, type SpireRoomSnapshot } from '../modules/spire/room_rows';
import {
  advanceAfterReveal,
  createSpireStepState,
  skipReportedSpireTask,
  submitSpireAnswer,
  type SpireStepPlan,
} from '../modules/spire/step_machine';

// Пакет B/D Шпиля: чистые модули игры — разбор пакета недели, план ступени,
// восстановление правильного ответа по отпечаткам, строки комнаты, финал ступени.

const SALT = 'spire:2026-W40:en:0';
const WEEK = '2026-W40';

function choiceTask(taskId: string, correct: number) {
  return {
    task: { taskId, mode: 'guess_phrase', kind: 'choice', difficulty: 1, payload: { phrase: `phrase ${taskId}`, options: ['a', 'b', 'c', 'd'] } },
    prints: [arenaAnswerFingerprint(SALT, taskId, correct)],
  };
}

function rawPack(floors = 15) {
  const mkSet = (seed: string) => {
    const rows = Array.from({ length: 10 }, (_, i) => choiceTask(`${seed}-t${i}`, i % 4));
    return { tasks: rows.map((r) => r.task), answerFingerprints: rows.map((r) => r.prints) };
  };
  return {
    schema: 'spire-pack-v1',
    weekId: WEEK,
    lang: 'en',
    tier: 0,
    packHash: 'sp1_abcdefghijklmnop',
    saltId: SALT,
    aboveCloudsCyclesFloors: [11, 12, 13, 14, 15],
    floors: Array.from({ length: floors }, (_, f) => ({
      floor: f + 1,
      guardian: (f + 1) % 5 === 0,
      steps: Array.from({ length: f + 1 <= 5 ? 5 + f : 10 }, (_, s) => ({
        step: s + 1,
        sets: [0, 1, 2].map((k) => mkSet(`f${f + 1}s${s + 1}k${k}`)),
      })),
    })),
  };
}

describe('spire pack plan', () => {
  it('decodes a well-formed pack and rejects foreign week / tier / schema', () => {
    const expect_ = { weekId: WEEK, lang: 'en', tier: 0 };
    expect(spireDecodeWeekPack(rawPack(), expect_).ok).toBe(true);
    expect(spireDecodeWeekPack({ ...rawPack(), weekId: '2026-W39' }, expect_)).toEqual({ ok: false, reason: expect.stringContaining('week') });
    expect(spireDecodeWeekPack({ ...rawPack(), tier: 3 }, expect_)).toEqual({ ok: false, reason: expect.stringContaining('tier') });
    expect(spireDecodeWeekPack({ ...rawPack(), schema: 'x' }, expect_).ok).toBe(false);
    expect(spireDecodeWeekPack(null, expect_).ok).toBe(false);
  });

  it('picks a different set per attempt and cycles above the clouds', () => {
    const decoded = spireDecodeWeekPack(rawPack(), { weekId: WEEK, lang: 'en', tier: 0 });
    if (!decoded.ok) throw new Error(decoded.reason);
    const budget = (kinds: readonly ('choice' | 'translate' | 'timeattack' | 'voice' | 'listen' | 'dictate' | 'match')[]) =>
      spireStepBudgetMs(SPIRE_CONFIG_DEFAULTS.timer, 4, kinds);
    const a0 = spirePickStepPlan(decoded.pack, { floor: 4, step: 3, attempt: 0, budgetMs: budget });
    const a1 = spirePickStepPlan(decoded.pack, { floor: 4, step: 3, attempt: 1, budgetMs: budget });
    const a3 = spirePickStepPlan(decoded.pack, { floor: 4, step: 3, attempt: 3, budgetMs: budget });
    expect(a0?.setIndex).toBe(0);
    expect(a1?.setIndex).toBe(1);
    expect(a3?.setIndex).toBe(0);
    expect(a0?.tasks[0].taskId).not.toBe(a1?.tasks[0].taskId);
    expect(a0?.plan.budgetMs).toBe(spireStepBudgetMs(SPIRE_CONFIG_DEFAULTS.timer, 4, Array(10).fill('choice')));
    expect(spirePackFloorFor(decoded.pack, 16)).toBe(11);
    expect(spirePackFloorFor(decoded.pack, 21)).toBe(11);
    expect(spirePickStepPlan(decoded.pack, { floor: 1, step: 99, attempt: 0, budgetMs: budget })).toBeNull();
  });
});

describe('spire answer reveal', () => {
  it('finds the correct option, item indexes and word order by fingerprint', () => {
    expect(spireRevealChoiceIndex(SALT, 't1', 4, arenaAnswerFingerprint(SALT, 't1', 2))).toBe(2);
    expect(spireRevealChoiceIndex(SALT, 't1', 4, 'nope')).toBeNull();
    const prints = [0, 3, 1].map((i) => arenaAnswerFingerprint(SALT, 'm1', i));
    expect(spireRevealItemIndexes(SALT, 'm1', [4, 4, 4], prints)).toEqual([0, 3, 1]);
    const tokens = ['I', 'am', 'here'];
    const bank = ['here', 'I', 'was', 'am'];
    expect(spireRevealTokens(SALT, 'b1', bank, 3, arenaAnswerFingerprint(SALT, 'b1', tokens))).toEqual(tokens);
    expect(spireRevealTokens(SALT, 'b1', bank, 3, 'nope')).toBeNull();
  });
});

describe('spire step machine: last task wrong with hearts left', () => {
  it('passes the step instead of hanging on an empty task', () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      taskId: `t${i}`, mode: 'guess_phrase' as const, kind: 'choice' as const, taskIndex: i,
      answerFingerprints: [arenaAnswerFingerprint(SALT, `t${i}`, 0)],
    }));
    const plan: SpireStepPlan = { packHash: 'sp1_x', saltId: SALT, lang: 'en', tier: 0, floor: 1, step: 1, budgetMs: 90_000, tasks };
    let state = createSpireStepState(plan);
    for (let i = 0; i < 9; i += 1) state = submitSpireAnswer(state, plan, { selectedIndex: 0 }, 1000);
    state = submitSpireAnswer(state, plan, { selectedIndex: 1 }, 1000);
    expect(state.phase).toBe('revealing');
    expect(state.hearts).toBe(2);
    expect(advanceAfterReveal(state).phase).toBe('passed');
  });
});

describe('spire step machine: reported task quarantine', () => {
  it('removes the current task from the remaining run without charging a heart', () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      taskId: `t${i}`, mode: 'guess_phrase' as const, kind: 'choice' as const, taskIndex: i,
      answerFingerprints: [arenaAnswerFingerprint(SALT, `t${i}`, 0)],
    }));
    const plan: SpireStepPlan = { packHash: 'sp1_x', saltId: SALT, lang: 'en', tier: 0, floor: 1, step: 1, budgetMs: 90_000, tasks };
    const state = skipReportedSpireTask(createSpireStepState(plan), 321);
    expect(state).toMatchObject({ phase: 'active', taskIndex: 1, hearts: 3 });
    expect(state.outcomes).toEqual([{ taskIndex: 0, correct: false, elapsedMs: 321, skippedNoPenalty: true }]);
  });
});

describe('spire room rows', () => {
  const room: SpireRoomSnapshot = {
    schema: 'spire-room-cache.v1',
    uid: 'me',
    lang: 'en',
    weekId: WEEK,
    groupId: 'g1',
    tier: 0,
    cohortDay: 0,
    weekStartMs: Date.UTC(2026, 8, 28),
    members: spireDecodeRoomMembers({ me: { uid: 'me', name: 'Me', steps: 2 }, other: { uid: 'other', name: 'Other', steps: 5, reachedAtMs: 10 } }),
    roster: Array.from({ length: 29 }, (_, slot) => ({ uid: `res_${String(slot).padStart(2, '0')}`, slot, name: `Bot ${slot}`, avatar: null, aura: null, isPremium: false, streak: 0 })),
    fetchedAtMs: 0,
  };

  it('shows only real players even when an older cached room contains residents, and uses LOCAL steps for me', () => {
    const rows = spireBuildRoomRows({
      room, myUid: 'me', mySteps: 40, myReachedAtMs: 5, nowMs: Date.UTC(2026, 9, 1), tuning: SPIRE_CONFIG_DEFAULTS.residents,
    });
    expect(rows.map((row) => row.uid).sort()).toEqual(['me', 'other']);
    const me = rows.find((r) => r.isMe);
    expect(me?.steps).toBe(40);
    expect(spireMyPlace(rows)).toBe(1);
    for (let i = 1; i < rows.length; i += 1) expect(rows[i - 1].steps).toBeGreaterThanOrEqual(rows[i].steps);
  });

  it('never shows fewer steps than the server already confirmed', () => {
    const rows = spireBuildRoomRows({
      room, myUid: 'me', mySteps: 0, myReachedAtMs: 0, nowMs: Date.UTC(2026, 9, 1), tuning: SPIRE_CONFIG_DEFAULTS.residents,
    });
    expect(rows.find((r) => r.isMe)?.steps).toBe(2);
  });
});

describe('spire rivals by floor (cached room only)', () => {
  it('maps steps to floors like the mockup and skips me', () => {
    const { spireFloorOfSteps, spireRivalsByFloor } = jest.requireActual('../components/spire/spire_tower_model');
    expect(spireFloorOfSteps(0)).toBe(1);
    expect(spireFloorOfSteps(4)).toBe(1);
    expect(spireFloorOfSteps(5)).toBe(2);
    expect(spireFloorOfSteps(25)).toBe(4);
    expect(spireFloorOfSteps(135)).toBe(16);
    const map = spireRivalsByFloor([
      { uid: 'a', name: 'A', steps: 25, isMe: false },
      { uid: 'b', name: 'B', steps: 20, isMe: false },
      { uid: 'me', name: 'Me', steps: 25, isMe: true },
      { uid: 'c', name: 'C', steps: 500, isMe: false },
    ]);
    expect(map.get(4)?.map((r: { uid: string }) => r.uid)).toEqual(['a', 'b']);
    expect(map.get(15)?.map((r: { uid: string }) => r.uid)).toEqual(['c']);
  });
});
