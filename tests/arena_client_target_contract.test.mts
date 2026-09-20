import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import duelPlanModule from '../modules/arena/duel_plan';
import taskAdapterModule from '../modules/arena/task_adapter';
import outboxStorageModule from '../modules/arena/outbox_storage';
import resultOutboxModule from '../modules/arena/result_outbox';
import matchStoreModule from '../modules/arena/match_store';
import matchMachineModule from '../modules/arena/match_machine';
import entryPrefetchModule from '../modules/arena/entry_prefetch';

const { arenaParseMatchPlan, arenaMachinePlan } = duelPlanModule;
const { adaptArenaTask } = taskAdapterModule;
const { arenaOutboxDecodeEntry, arenaOutboxEnqueue, arenaOutboxList } = outboxStorageModule;
const { arenaOutboxClassify, arenaOutboxEntryKey, arenaOutboxIndexKey } = resultOutboxModule;
const { arenaDecodeStoredMatch, arenaEncodeStoredMatch, arenaMatchStoreKey } = matchStoreModule;
const { arenaLocalMatchInit } = matchMachineModule;
const { createArenaEntryPrefetch } = entryPrefetchModule;

type ArenaOutboxOwnerScope = Readonly<{
  stableUid: string;
  accountGeneration: number;
  studyTarget: 'en' | 'es' | 'fr' | 'de';
}>;
type ArenaPreparedEntry = Readonly<{
  ok: true;
  startedAtMs: number;
  deadlineAtMs: number;
  plan: NonNullable<ReturnType<typeof arenaParseMatchPlan>>;
}>;

const FP = 'a'.repeat(64);
const OTHER_FP = 'b'.repeat(64);

function rawPlan(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 'arena-match-plan.v2',
    rulesVersion: 'rules-v1',
    matchId: 'match-1',
    studyTarget: 'es',
    publicationFingerprint: FP,
    mode: 'quick',
    viewerSeat: 'a',
    taskCount: 1,
    countdownMs: 1000,
    readingMs: 1000,
    revealMs: 1000,
    rules: {
      starsCorrect: 2,
      starsCorrectFirst: 3,
      starsPerPair: 1,
      comboThreshold: 3,
      comboBonus: 1,
      timeQuantumMs: 100,
      starPolicy: 'banked',
      awardsRankPoints: false,
      matchStarCeiling: 10,
    },
    tasks: [{
      taskId: 'task-1', taskIndex: 0, studyTarget: 'es', publicationFingerprint: FP,
      mode: 'fill_gap', kind: 'choice', difficulty: 1, answerMs: 5000,
      payload: { prompt: 'Como estas.', options: ['bien', 'mal'] },
      answerFingerprints: ['answer'],
    }],
    opponent: { seat: 'b', name: 'Rival', rank: 1 },
    opponentTicks: [],
    liveChannelPath: 'arenaLive/match-1',
    planHash: 'plan-hash',
    issuedAtMs: 1,
    ...overrides,
  };
}

test('plan parsing is fail closed for target, publication and every task', () => {
  const parsed = arenaParseMatchPlan(rawPlan(), 'es');
  assert.equal(parsed?.studyTarget, 'es');
  assert.equal(parsed?.publicationFingerprint, FP);
  assert.equal(parsed?.tasks[0]?.studyTarget, 'es');

  assert.equal(arenaParseMatchPlan(rawPlan({ studyTarget: undefined }), 'es'), null);
  assert.equal(arenaParseMatchPlan(rawPlan(), 'de'), null);
  assert.equal(arenaParseMatchPlan(rawPlan({ publicationFingerprint: 'bad' }), 'es'), null);
  assert.equal(arenaParseMatchPlan(rawPlan({
    tasks: [{ ...rawPlan().tasks[0], studyTarget: 'fr' }],
  }), 'es'), null);
  assert.equal(arenaParseMatchPlan(rawPlan({
    tasks: [{ ...rawPlan().tasks[0], publicationFingerprint: OTHER_FP }],
  }), 'es'), null);
});

test('task adapter rejects target mismatch and English punctuation repair stays English-only', () => {
  const spanishTask = {
    taskId: 'task-1', studyTarget: 'es', publicationFingerprint: FP,
    mode: 'fill_gap', kind: 'choice', isVoice: false, difficulty: 1,
    payload: { prompt: 'How estas.', options: ['bien', 'mal'] },
  } as const;
  assert.throws(() => adaptArenaTask(spanishTask, 'de'), /arena_task_target_mismatch/);
  assert.equal(adaptArenaTask(spanishTask, 'es').prompt, 'How estas.');
  assert.equal(adaptArenaTask({ ...spanishTask, studyTarget: 'en' }, 'en').prompt, 'How estas?');
});

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); },
    removeItem: async (key: string) => { data.delete(key); },
  };
}

const ES_SCOPE: ArenaOutboxOwnerScope = { stableUid: 'owner', accountGeneration: 1, studyTarget: 'es' };
const DE_SCOPE: ArenaOutboxOwnerScope = { stableUid: 'owner', accountGeneration: 1, studyTarget: 'de' };
const REPORT = {
  schemaVersion: 'arena-local-match.v2', matchId: 'match-1', seat: 'a', planHash: 'plan-hash',
  outcomes: [], pairAttemptsByTask: {}, matchStars: 0, tieBreakElapsedMs: 0,
  correctCount: 0, firstCount: 0, longestCombo: 0, clockSuspect: false,
  abandoned: false, startedAtWallMs: 1, finishedAtWallMs: 2,
} as const;

test('outbox identity, keys and decoding are target-bound', async () => {
  assert.notEqual(arenaOutboxIndexKey(ES_SCOPE), arenaOutboxIndexKey(DE_SCOPE));
  assert.notEqual(arenaOutboxEntryKey(ES_SCOPE, 'match-1'), arenaOutboxEntryKey(DE_SCOPE, 'match-1'));

  const store = memoryStore();
  assert.equal(await arenaOutboxEnqueue(store, ES_SCOPE, REPORT, 10, 'rules-v1', FP), true);
  const [entry] = await arenaOutboxList(store, ES_SCOPE);
  assert.equal(entry?.studyTarget, 'es');
  assert.equal(entry?.publicationFingerprint, FP);
  const raw = store.data.get(arenaOutboxEntryKey(ES_SCOPE, 'match-1')) ?? null;
  assert.equal(arenaOutboxDecodeEntry(raw, DE_SCOPE), null);
  assert.deepEqual(await arenaOutboxList(store, DE_SCOPE), []);
});

test('target/publication rejections are permanent outbox failures', () => {
  assert.equal(arenaOutboxClassify(new Error('arena_match_target_mismatch')), 'rejected');
  assert.equal(arenaOutboxClassify(new Error('arena_match_publication_stale')), 'rejected');
});

test('stored match schema and key are target-bound', () => {
  const plan = arenaParseMatchPlan(rawPlan(), 'es');
  assert.ok(plan);
  const state = arenaLocalMatchInit(arenaMachinePlan(plan), {
    monoNowMs: 1, wallNowMs: 1, monoEpochId: 'epoch', countdownRemainingMs: 1000,
  });
  assert.notEqual(arenaMatchStoreKey(ES_SCOPE), arenaMatchStoreKey(DE_SCOPE));
  const encoded = arenaEncodeStoredMatch(ES_SCOPE, plan, state, 10);
  assert.equal(arenaDecodeStoredMatch(encoded, ES_SCOPE)?.studyTarget, 'es');
  assert.equal(arenaDecodeStoredMatch(encoded, DE_SCOPE), null);
});

test('entry prefetch never reuses a prepared plan across targets', async () => {
  let planCalls = 0;
  const prepared = (target: 'es' | 'de'): ArenaPreparedEntry => ({
    ok: true, startedAtMs: 1, deadlineAtMs: 2,
    plan: arenaParseMatchPlan(rawPlan({
      studyTarget: target,
      tasks: [{ ...rawPlan().tasks[0], studyTarget: target }],
    }), target)!,
  });
  const coordinator = createArenaEntryPrefetch({
    captureAccountScope: (studyTarget) => ({ stableId: 'owner', generation: 1, studyTarget }),
    isAccountScopeCurrent: () => true,
    accept: async () => ({ state: 'active', viewerSeat: 'a' }),
    loadPlan: async (_matchId, scope) => { planCalls += 1; return prepared(scope.studyTarget as 'es' | 'de'); },
    rememberViewerSeat: () => {}, nowMs: () => 1, wait: async () => {},
  });
  await coordinator.start('match-1', 'es');
  assert.equal(coordinator.peek('match-1', 'de'), null);
  await coordinator.start('match-1', 'de');
  assert.equal(planCalls, 2);
});

test('production callable wrappers expose explicit target arguments and send target payloads', () => {
  const source = fs.readFileSync(new URL('../app/arena_client.ts', import.meta.url), 'utf8');
  assert.match(source, /arenaV2Home\(studyTarget: ArenaStudyTarget\)/);
  assert.match(source, /arenaV2FindMatch\(studyTarget: ArenaStudyTarget,/);
  assert.match(source, /arenaV2MatchPlan\(matchId: string, studyTarget: ArenaStudyTarget\)/);
  assert.match(source, /arenaV2MatchFinish[\s\S]{0,240}studyTarget: ArenaStudyTarget/);
  assert.match(source, /'arenaV2Home', \{ studyTarget \}/);
  assert.match(source, /'arenaV2MatchPlan', \{ matchId, studyTarget \}/);
  assert.doesNotMatch(source, /arenaParseMatchPlan\(response\?\.plan\)(?!,)/);
});
