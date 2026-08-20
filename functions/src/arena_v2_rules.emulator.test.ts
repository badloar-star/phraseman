import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-phraseman-arena-v2-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

describe('Arena V2 participant-safe Firestore projection (emulator)', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
  }, 30_000);

  afterAll(async () => environment?.cleanup(), 30_000);

  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', 'stable-a'), { firebaseAuthUid: 'auth-a' });
      await setDoc(doc(db, 'users', 'stable-b'), { firebaseAuthUid: 'auth-b' });
      await setDoc(doc(db, 'arena_v2_config', 'current'), { enabled: true });
      await setDoc(doc(db, 'arena_v2_profiles', 'stable-a'), { authUid: 'auth-a', rank: 3 });
      await setDoc(doc(db, 'arena_v2_queue', 'stable-a'), { authUid: 'auth-a', mode: 'quick', status: 'waiting' });
      await setDoc(doc(db, 'arena_v2_matches', 'match-1'), {
        matchId: 'match-1',
        players: [{ uid: 'a', name: 'A' }, { uid: 'b', name: 'B' }],
        state: 'accepting',
      });
      await setDoc(doc(db, 'arena_v2_matches/match-1/arena_v2_members', 'auth-a'), { seat: 'a', seatId: 'a' });
      await setDoc(doc(db, 'arena_v2_matches/match-1/arena_v2_members', 'auth-b'), { seat: 'b', seatId: 'b' });
      await setDoc(doc(db, 'arena_v2_match_private', 'match-1'), { answers: {}, tasks: [{ secret: true }] });
      await setDoc(doc(db, 'users/stable-a/arena_v2_seasons', 'season-1'), { stars: 12 });
      await setDoc(doc(db, 'users/stable-a/arena_v2_receipts', 'match-1'), {
        matchId: 'match-1',
        mode: 'quick',
        outcome: 'win',
        reward: {
          xpEarned: 22,
          xpBreakdown: {
            schemaVersion: 'arena-xp-breakdown.v1',
            baseXp: 10,
            correctBonusXp: 12,
            outcomeBonusXp: 0,
            totalXp: 22,
          },
        },
      });
      await setDoc(doc(db, 'users/stable-a/arena_v2_spin_credits', 'credit-1'), { status: 'available' });
      await setDoc(doc(db, 'users/stable-a/arena_v2_spin_results', 'request-1'), { reward: 'shards' });
      await setDoc(doc(db, 'users/stable-a/arena_v2_season_claims', 'season-1_1_free'), { status: 'claimed' });
      await setDoc(doc(db, 'users/stable-a/arena_v2_match_labs', 'match-1'), { turningTaskIndex: 4 });
      await setDoc(doc(db, 'users/stable-a/arena_v2_partner_weeks', '2026-08-10'), { sharedDays: 3 });
      await setDoc(doc(db, 'users/stable-a/arena_v2_star_ledger', 'receipt-1'), { delta: 10 });
      await setDoc(doc(db, 'users/stable-a/arena_v2_entitlements', 'title-1'), { owned: true });
      await setDoc(doc(db, 'users/stable-a/arena_v2_daily_attempts', '2026-08-11'), { status: 'complete' });
      await setDoc(doc(db, 'users/stable-a/arena_v2_expansion_runs', 'run-1'), { sealedTasks: [] });
      await setDoc(doc(db, 'users/stable-a/arena_v2_mastery_signatures', 'sig-1'), { seenAtMs: 1 });
      await setDoc(doc(db, 'users/stable-a/arena_v2_activity_days', '2026-08-11'), { modes: 1 });
      await setDoc(doc(db, 'users/stable-a/arena_v2_expansion_receipts', 'request-1'), { response: {} });
      await setDoc(doc(db, 'arena_v2_daily_private', '2026-08-11_b0'), { sealedTasks: [] });
      await setDoc(doc(db, 'arena_v2_ghosts', 'ghost-1'), { participantStableUids: ['stable-a', 'stable-b'] });
      await setDoc(doc(db, 'arena_v2_series', 'series-1'), { participantStableUids: ['stable-a', 'stable-b'] });
      await setDoc(doc(db, 'arena_v2_partnerships', 'pair-1'), { participantStableUids: ['stable-a', 'stable-b'] });
    });
  }, 30_000);

  it('lets each participant read the safe public match through their member marker', async () => {
    for (const authUid of ['auth-a', 'auth-b']) {
      const db = environment.authenticatedContext(authUid).firestore();
      await assertSucceeds(getDoc(doc(db, 'arena_v2_matches', 'match-1')));
      await assertSucceeds(getDoc(doc(db, 'arena_v2_matches/match-1/arena_v2_members', authUid)));
    }
  });

  it('denies outsiders and never exposes another participant member marker', async () => {
    const outsider = environment.authenticatedContext('auth-c').firestore();
    const participant = environment.authenticatedContext('auth-a').firestore();
    await assertFails(getDoc(doc(outsider, 'arena_v2_matches', 'match-1')));
    await assertFails(getDoc(doc(participant, 'arena_v2_matches/match-1/arena_v2_members', 'auth-b')));
  });

  it('lets only the owner read profile, queue and Arena economy projections', async () => {
    const owner = environment.authenticatedContext('auth-a').firestore();
    const outsider = environment.authenticatedContext('auth-b').firestore();
    const ownerPaths = [
      'arena_v2_profiles/stable-a',
      'arena_v2_queue/stable-a',
      'users/stable-a/arena_v2_seasons/season-1',
      'users/stable-a/arena_v2_receipts/match-1',
      'users/stable-a/arena_v2_spin_credits/credit-1',
      'users/stable-a/arena_v2_spin_results/request-1',
      'users/stable-a/arena_v2_season_claims/season-1_1_free',
      'users/stable-a/arena_v2_match_labs/match-1',
      'users/stable-a/arena_v2_partner_weeks/2026-08-10',
      'users/stable-a/arena_v2_star_ledger/receipt-1',
      'users/stable-a/arena_v2_entitlements/title-1',
    ];
    for (const documentPath of ownerPaths) {
      await assertSucceeds(getDoc(doc(owner, documentPath)));
      await assertFails(getDoc(doc(outsider, documentPath)));
    }
  });

  it('keeps every Arena V2 collection server-write-only and private match unreadable', async () => {
    const owner = environment.authenticatedContext('auth-a').firestore();
    await assertFails(getDoc(doc(owner, 'arena_v2_match_private', 'match-1')));
    await assertFails(getDoc(doc(owner, 'arena_v2_config', 'current')));
    await assertFails(updateDoc(doc(owner, 'arena_v2_queue', 'stable-a'), { status: 'matched' }));
    await assertFails(updateDoc(doc(owner, 'arena_v2_matches', 'match-1'), { state: 'settled' }));
    await assertFails(updateDoc(doc(owner, 'arena_v2_profiles', 'stable-a'), { rank: 23 }));
    await assertFails(updateDoc(doc(owner, 'users/stable-a/arena_v2_receipts', 'match-1'), {
      'reward.xpBreakdown.totalXp': 999,
    }));
    await assertFails(setDoc(doc(owner, 'users/stable-a/arena_v2_match_labs', 'match-2'), { tasks: [] }));
    await assertFails(updateDoc(doc(owner, 'users/stable-a/arena_v2_match_labs', 'match-1'), { tasks: [] }));
    await assertFails(setDoc(doc(owner, 'arena_v2_invites', 'forged'), { toAuthUid: 'auth-b' }));
    await assertFails(setDoc(doc(owner, 'arena_v2_pair_limits', 'forged'), { count: 0 }));
  });

  /**
   * Живой канал — ЕДИНСТВЕННОЕ место во всей Арене, куда пишет сам клиент.
   * Значит, это и единственное место, где чужая запись возможна в принципе:
   * без проверки места за столом соперник рисовал бы себе прогресс, а игрок
   * видел бы фальшивую гонку и проигрывал бы ей.
   */
  it('lets a player write only into their own live seat and never into the opponent seat', async () => {
    const seatDoc = (db: ReturnType<ReturnType<typeof environment.authenticatedContext>['firestore']>, seatId: string) =>
      doc(db, `arena_v2_match_live/match-1/seats/${seatId}`);
    const payload = {
      schemaVersion: 'arena-live.v2',
      ticks: [{ taskIndex: 0, correct: true, raceElapsedMs: 900, matchStars: 3 }],
      finished: false,
      updatedAtMs: 1,
    };
    const legacyPayload = {
      schemaVersion: 'arena-live.v1',
      ticks: [{ taskIndex: 0, correct: false, raceElapsedMs: 1_200 }],
      finished: false,
      updatedAtMs: 1,
    };

    const playerA = environment.authenticatedContext('auth-a').firestore();
    const playerB = environment.authenticatedContext('auth-b').firestore();

    await assertSucceeds(setDoc(seatDoc(playerA, 'a'), payload));
    await assertSucceeds(setDoc(seatDoc(playerB, 'b'), payload));
    await assertSucceeds(setDoc(seatDoc(playerA, 'a'), legacyPayload));

    // Чужое место — отказ. Это главное утверждение всей проверки.
    await assertFails(setDoc(seatDoc(playerA, 'b'), payload));
    await assertFails(setDoc(seatDoc(playerB, 'a'), payload));

    // Посторонний не пишет и не читает канал вовсе.
    const outsider = environment.authenticatedContext('auth-c').firestore();
    await assertFails(setDoc(seatDoc(outsider, 'a'), payload));
    await assertFails(getDoc(seatDoc(outsider, 'a')));

    // Соперник читать канал обязан: иначе гонки не видно ни у кого.
    await assertSucceeds(getDoc(seatDoc(playerA, 'b')));
  });

  it('bounds the live channel payload and forbids deleting a seat', async () => {
    const playerA = environment.authenticatedContext('auth-a').firestore();
    const seat = doc(playerA, 'arena_v2_match_live/match-1/seats/a');
    // Без метки времени уборка не найдёт брошенный канал, и он останется
    // навсегда — то есть будет оплачиваться вечно.
    await assertFails(setDoc(seat, { schemaVersion: 'arena-live.v1', ticks: [], finished: false }));
    // Чужая схема и переполненный список — тоже отказ: канал живёт ровно
    // столько, сколько матч, и раздувать его нечем.
    await assertFails(setDoc(seat, { schemaVersion: 'forged.v1', ticks: [], finished: false, updatedAtMs: 1 }));
    await assertFails(setDoc(seat, {
      schemaVersion: 'arena-live.v1',
      ticks: Array.from({ length: 11 }, (_, index) => ({ taskIndex: index })),
      finished: false,
      updatedAtMs: 1,
    }));
    // Никаких ответов, uid и других случайных данных в публичном канале.
    await assertFails(setDoc(seat, {
      schemaVersion: 'arena-live.v1',
      ticks: [],
      finished: false,
      updatedAtMs: 1,
      answer: 'secret',
    }));
    await assertFails(setDoc(seat, {
      schemaVersion: 'arena-live.v2',
      ticks: [],
      finished: false,
      updatedAtMs: 1,
      uid: 'auth-a',
    }));
  });

  it('rejects private and extra fields nested inside v1 and v2 live ticks', async () => {
    const playerA = environment.authenticatedContext('auth-a').firestore();
    const seat = doc(playerA, 'arena_v2_match_live/match-1/seats/a');
    const payload = (schemaVersion: 'arena-live.v1' | 'arena-live.v2', ticks: readonly Record<string, unknown>[]) => ({
      schemaVersion,
      ticks,
      finished: false,
      updatedAtMs: 1,
    });
    const safeTick = { taskIndex: 0, correct: true, raceElapsedMs: 900 };

    for (const privateTick of [
      { ...safeTick, answer: 'secret' },
      { ...safeTick, uid: 'auth-a' },
      { ...safeTick, extra: true },
    ]) {
      await assertFails(setDoc(seat, payload('arena-live.v1', [privateTick])));
      await assertFails(setDoc(seat, payload('arena-live.v2', [privateTick])));
    }

    // Установленный v1-reader игнорирует неизвестное поле, поэтому additive
    // matchStars в v1 сохраняет индикатор во время смешанного rollout.
    await assertSucceeds(setDoc(seat, payload('arena-live.v1', [{ ...safeTick, matchStars: 3 }])));

    // Проверяется не только первый элемент: приватное поле в десятом тике
    // обязано быть столь же запрещено, как в первом.
    const tenTicks = Array.from({ length: 10 }, (_, taskIndex) => ({
      taskIndex,
      correct: true,
      raceElapsedMs: 900,
      matchStars: taskIndex * 4,
    }));
    await assertFails(setDoc(seat, payload('arena-live.v2', [
      ...tenTicks.slice(0, 9),
      { ...tenTicks[9], answer: 'last-tick-secret' },
    ])));
  });

  it('rejects missing, malformed and out-of-bounds live tick fields', async () => {
    const playerA = environment.authenticatedContext('auth-a').firestore();
    const seat = doc(playerA, 'arena_v2_match_live/match-1/seats/a');
    const payload = (tick: Record<string, unknown>) => ({
      schemaVersion: 'arena-live.v2',
      ticks: [tick],
      finished: false,
      updatedAtMs: 1,
    });
    const safeTick = { taskIndex: 0, correct: true, raceElapsedMs: 900 };
    const invalidTicks: readonly Record<string, unknown>[] = [
      { correct: true, raceElapsedMs: 900 },
      { taskIndex: 0, raceElapsedMs: 900 },
      { taskIndex: 0, correct: true },
      { ...safeTick, taskIndex: '0' },
      { ...safeTick, taskIndex: 0.5 },
      { ...safeTick, taskIndex: -1 },
      { ...safeTick, taskIndex: 10 },
      { ...safeTick, correct: 1 },
      { ...safeTick, raceElapsedMs: '900' },
      { ...safeTick, raceElapsedMs: 0.5 },
      { ...safeTick, raceElapsedMs: -1 },
      { ...safeTick, raceElapsedMs: 600_001 },
      { ...safeTick, matchStars: '3' },
      { ...safeTick, matchStars: 0.5 },
      { ...safeTick, matchStars: -1 },
      { ...safeTick, matchStars: 41 },
    ];

    for (const invalidTick of invalidTicks) {
      await assertFails(setDoc(seat, payload(invalidTick)));
    }
  });

  it('keeps sealed expansion evidence and shared social roots unreadable', async () => {
    const owner = environment.authenticatedContext('auth-a').firestore();
    for (const documentPath of [
      'users/stable-a/arena_v2_daily_attempts/2026-08-11',
      'users/stable-a/arena_v2_expansion_runs/run-1',
      'users/stable-a/arena_v2_mastery_signatures/sig-1',
      'users/stable-a/arena_v2_activity_days/2026-08-11',
      'users/stable-a/arena_v2_expansion_receipts/request-1',
      'arena_v2_daily_private/2026-08-11_b0',
      'arena_v2_ghosts/ghost-1',
      'arena_v2_series/series-1',
      'arena_v2_partnerships/pair-1',
    ]) {
      await assertFails(getDoc(doc(owner, documentPath)));
      await assertFails(setDoc(doc(owner, documentPath), { forged: true }));
    }
  });
});
