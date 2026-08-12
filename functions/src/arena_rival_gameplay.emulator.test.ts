import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { FieldPath, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { arenaSeasonWindow } from './arena_v2_core';
import {
  NEW_TOURNAMENT_POOL_CONTENT_SHA256,
  buildNewTournamentPool,
} from './tournament_pool_v2_factory';
import { loadTournamentSourceDays, TOURNAMENT_SOURCE_PLANS } from './tournament_content_source';

jest.setTimeout(90_000);

const PROJECT_ID = 'demo-phraseman-arena-rival-gameplay';
let app: App;
let db: Firestore;
let arena: Record<string, any>;
let expansion: Record<string, any>;
let sourceFixtureTasks: any[] = [];

function callableRequest(authUid: string, data: Record<string, unknown>) {
  return {
    auth: { uid: authUid, token: {} }, data: { ...data, clientVersion: '1.6.7' },
    rawRequest: { headers: {} }, app: { appId: 'emulator-test' },
  };
}

async function clearFixture(): Promise<void> {
  for (const collection of [
    'arena_v2_config', 'arena_v2_profiles', 'arena_v2_queue', 'arena_v2_matches',
    'arena_v2_match_private', 'arena_v2_series', 'users', 'auth_links', 'tournamentTasks',
  ]) await db.recursiveDelete(db.collection(collection));
}

describe('Arena Rivalry Series gameplay (Firestore emulator smoke)', () => {
  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    process.env.ARENA_V2_INVITE_HMAC_KEY = 'emulator-rival-secret';
    process.env.ARENA_V2_SPIN_HMAC_KEY = 'emulator-spin-secret';
    app = initializeApp({ projectId: PROJECT_ID });
    db = getFirestore(app);
    arena = require('./arena_v2') as Record<string, any>;
    expansion = require('./arena_expansion') as Record<string, any>;
    await clearFixture();

    const now = Date.now();
    const season = arenaSeasonWindow(now);
    const dayKey = new Date(now).toISOString().slice(0, 10);
    const publication = buildNewTournamentPool(loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS));
    const cells: Array<[string, number, number]> = [
      ['guess_phrase', 1, 2], ['fill_gap', 1, 2], ['find_oddity', 1, 2],
      ['translate_build', 1, 1], ['speed_match', 1, 1],
      ['translate_build', 2, 1], ['speed_match', 2, 1],
    ];
    const sourceTasks = cells.flatMap(([mode, difficulty, count]) => publication.tasks
      .filter((task) => task.mode === mode && task.difficulty === difficulty).slice(0, count));
    sourceFixtureTasks = sourceTasks;
    const poolTasks = cells.flatMap(([mode, difficulty, count]) => publication.tasks
      .filter((task) => task.mode === mode && task.difficulty === difficulty).slice(count, count * 5));
    expect(sourceTasks).toHaveLength(10);
    expect(poolTasks.length).toBeGreaterThanOrEqual(30);

    const profile = {
      rating: 500, rank: 5, wins: 7, losses: 4, draws: 2, matches: 13,
      spinPity: 17, starWalletBalance: 321, lifetimeWalletStarsEarned: 900,
      masteryThresholdStarsLifetime: 40,
      mastery: { guess_phrase: { score: 70, sampleCount: 8, observations: [], claimedThresholds: [50, 65] } },
    };
    await Promise.all([
      db.collection('arena_v2_config').doc('current').set({
        schemaVersion: 'arena-v2-config.v1', productConfigVersion: 'arena-v2-product.v1',
        enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true,
        rewardsEnabled: true, spinEnabled: true, minClientVersion: '1.6.0',
        arenaExpansionEnabled: true, arenaRivalEnabled: true,
        arenaRivalRuntimeVersion: 'arena-rival.v1',
        contentPublication: {
          poolVersion: 'tpool_20260801_v10',
          manifestSha256: NEW_TOURNAMENT_POOL_CONTENT_SHA256,
        },
      }),
      db.collection('users').doc('stable-a').set({ firebaseAuthUid: 'auth-a', displayName: 'Alpha' }),
      db.collection('users').doc('stable-b').set({ firebaseAuthUid: 'auth-b', displayName: 'Beta' }),
      db.collection('auth_links').doc('auth-a').set({ stable_id: 'stable-a' }),
      db.collection('auth_links').doc('auth-b').set({ stable_id: 'stable-b' }),
      db.collection('arena_v2_profiles').doc('stable-a').set({ ...profile, authUid: 'auth-a' }),
      db.collection('arena_v2_profiles').doc('stable-b').set({ ...profile, authUid: 'auth-b' }),
      db.doc(`users/stable-a/arena_v2_seasons/${season.seasonId}`).set({
        seasonId: season.seasonId, stars: 77, level: 1, dailyDayKey: dayKey, dailyEligibleMatches: 2,
        dailyStarsCredited: 30, spinDropsToday: 0,
      }),
      db.doc(`users/stable-b/arena_v2_seasons/${season.seasonId}`).set({
        seasonId: season.seasonId, stars: 77, level: 1, dailyDayKey: dayKey, dailyEligibleMatches: 2,
        dailyStarsCredited: 30, spinDropsToday: 0,
      }),
      ...poolTasks.map((task) => db.collection('tournamentTasks').doc(task.taskId).set(task)),
    ]);

    const sourceMatchId = 'rival-source-human-quick';
    await Promise.all([
      db.collection('arena_v2_matches').doc(sourceMatchId).set({
        matchId: sourceMatchId, mode: 'quick', opponentKind: 'human',
        players: [
          { uid: 'a', name: 'Alpha', rank: 5, rating: 500, score: 900, correct: 9 },
          { uid: 'b', name: 'Beta', rank: 5, rating: 500, score: 700, correct: 7 },
        ],
        acceptedBy: ['a', 'b'], state: 'settled', terminal: true, version: 20,
        currentTaskIndex: 9, submittedBy: ['a', 'b'], scores: { a: 900, b: 700 },
        stateStartedAtMs: now, stateDeadlineAtMs: now,
        result: { winnerUid: 'a', reason: 'score', rewards: {} }, createdAtMs: now - 60_000,
      }),
      db.collection('arena_v2_match_private').doc(sourceMatchId).set({
        matchId: sourceMatchId, tasks: sourceTasks,
        participantStableUids: ['stable-a', 'stable-b'], participantAuthUids: ['auth-a', 'auth-b'],
        seatByStableUid: { 'stable-a': 'a', 'stable-b': 'b' },
        authByStableUid: { 'stable-a': 'auth-a', 'stable-b': 'auth-b' },
        answers: { 'stable-a': {}, 'stable-b': {} },
        speedProgress: { 'stable-a': {}, 'stable-b': {} },
        speedAttempts: { 'stable-a': {}, 'stable-b': {} },
        totals: {
          'stable-a': { score: 900, elapsedMs: 30_000, correct: 9, fullySolved: 9, rawSeasonStars: 40, submittedAnswers: 10 },
          'stable-b': { score: 700, elapsedMs: 40_000, correct: 7, fullySolved: 7, rawSeasonStars: 30, submittedAnswers: 10 },
        },
        settledAtMs: now,
      }),
    ]);
  });

  afterAll(async () => {
    await clearFixture();
    await db.terminate();
    await deleteApp(app);
  });

  it('settles a 2-0 series while preserving every economy and profile counter', async () => {
    const offerNow = Date.now();
    await db.collection('arena_v2_matches').doc('rival-source-human-quick').update({
      stateStartedAtMs: offerNow, stateDeadlineAtMs: offerNow,
    });
    const proposed = await expansion.arenaRivalPropose.run(callableRequest('auth-a', {
      sourceMatchId: 'rival-source-human-quick', requestId: 'rival-propose-1',
    }));
    expect(proposed).toMatchObject({ ok: true, status: 'awaiting', gameIndex: 1, maxGames: 3 });
    // Device B acts before its listener receives Device A's offer. Its distinct
    // Propose must converge on the existing incoming series, not conflict or
    // create a mirrored duplicate.
    const inviteePropose = await expansion.arenaRivalPropose.run(callableRequest('auth-b', {
      sourceMatchId: 'rival-source-human-quick', requestId: 'rival-propose-device-b',
    }));
    expect(inviteePropose).toMatchObject({
      ok: true, seriesId: proposed.seriesId, status: 'invited', gameIndex: 1, maxGames: 3,
    });
    const [sourceAfterOffer, seriesAfterOffer, allSeries] = await Promise.all([
      db.collection('arena_v2_matches').doc('rival-source-human-quick').get(),
      db.collection('arena_v2_series').doc(proposed.seriesId).get(),
      db.collection('arena_v2_series').get(),
    ]);
    expect(sourceAfterOffer.data()?.rivalOffer).toEqual({
      seriesId: proposed.seriesId,
      fromSeat: 'a',
      expiresAtMs: seriesAfterOffer.data()?.offerExpiresAtMs,
    });
    expect(allSeries.docs.filter((doc) => doc.data().sourceMatchId === 'rival-source-human-quick'))
      .toHaveLength(1);

    const accepted = await expansion.arenaRivalAccept.run(callableRequest('auth-b', {
      seriesId: proposed.seriesId, requestId: 'rival-accept-1',
    }));
    const replay = await expansion.arenaRivalAccept.run(callableRequest('auth-b', {
      seriesId: proposed.seriesId, requestId: 'rival-accept-1',
    }));
    expect(replay).toMatchObject({ seriesId: accepted.seriesId, activeMatchId: accepted.activeMatchId });
    const allMatchesAfterAccept = await db.collection('arena_v2_matches').get();
    expect(allMatchesAfterAccept.docs.filter((doc) => {
      const data = doc.data();
      return data.seriesId === proposed.seriesId && data.gameIndex === 2;
    })).toHaveLength(1);

    const matchId = String(accepted.activeMatchId);
    const [publicGame, privateGame] = await Promise.all([
      db.collection('arena_v2_matches').doc(matchId).get(),
      db.collection('arena_v2_match_private').doc(matchId).get(),
    ]);
    expect(publicGame.data()).toMatchObject({ mode: 'series', opponentKind: 'human', state: 'countdown' });
    expect(JSON.stringify(publicGame.data())).not.toMatch(/stable-a|stable-b|auth-a|auth-b/);
    expect(privateGame.data()?.expansionFlags).toEqual({
      wallet: false, lab: false, mastery: false, partner: false,
    });
    const sourceTaskIds = new Set((await db.collection('arena_v2_match_private')
      .doc('rival-source-human-quick').get()).data()?.tasks.map((task: any) => task.taskId));
    expect(privateGame.data()?.tasks.every((task: any) => !sourceTaskIds.has(task.taskId))).toBe(true);

    const before = await Promise.all(['stable-a', 'stable-b'].map(async (uid) => ({
      profile: (await db.collection('arena_v2_profiles').doc(uid).get()).data(),
      season: (await db.doc(`users/${uid}/arena_v2_seasons/${arenaSeasonWindow(Date.now()).seasonId}`).get()).data(),
    })));
    await arena.arenaV2Forfeit.run(callableRequest('auth-b', { matchId }));
    const after = await Promise.all(['stable-a', 'stable-b'].map(async (uid) => ({
      profile: (await db.collection('arena_v2_profiles').doc(uid).get()).data(),
      season: (await db.doc(`users/${uid}/arena_v2_seasons/${arenaSeasonWindow(Date.now()).seasonId}`).get()).data(),
      lab: await db.collection(`users/${uid}/arena_v2_match_labs`).get(),
      ledger: await db.collection(`users/${uid}/arena_v2_star_ledger`).get(),
      spins: await db.collection(`users/${uid}/arena_v2_spin_credits`).get(),
      mastery: await db.collection(`users/${uid}/arena_v2_mastery_signatures`).get(),
      activity: await db.collection(`users/${uid}/arena_v2_activity_days`).get(),
    })));

    for (let index = 0; index < 2; index += 1) {
      for (const key of [
        'rating', 'rank', 'wins', 'losses', 'draws', 'matches', 'spinPity',
        'starWalletBalance', 'lifetimeWalletStarsEarned', 'masteryThresholdStarsLifetime', 'mastery',
      ]) expect(after[index].profile?.[key]).toEqual(before[index].profile?.[key]);
      for (const key of ['stars', 'dailyEligibleMatches', 'dailyStarsCredited', 'spinDropsToday']) {
        expect(after[index].season?.[key]).toEqual(before[index].season?.[key]);
      }
      expect(after[index].profile?.activeMatchId).toBeNull();
      expect(after[index].lab.empty).toBe(true);
      expect(after[index].ledger.empty).toBe(true);
      expect(after[index].spins.empty).toBe(true);
      expect(after[index].mastery.empty).toBe(true);
      expect(after[index].activity.empty).toBe(true);
    }
    const series = (await db.collection('arena_v2_series').doc(proposed.seriesId).get()).data();
    expect(series).toMatchObject({ status: 'complete', gamesPlayed: 2, wins: { a: 2, b: 0 }, activeMatchId: null });
  });

  it('requires both players before game three and settles a 2-1 without profile outcomes', async () => {
    const now = Date.now();
    const dayKey = new Date(now).toISOString().slice(0, 10);
    const season = arenaSeasonWindow(now);
    const profile = {
      rating: 500, rank: 5, wins: 11, losses: 8, draws: 3, matches: 22,
      spinPity: 29, starWalletBalance: 444, lifetimeWalletStarsEarned: 1_200,
    };
    const sourceMatchId = 'rival-source-second-ranked';
    await Promise.all([
      db.collection('users').doc('stable-c').set({ firebaseAuthUid: 'auth-c', displayName: 'Gamma' }),
      db.collection('users').doc('stable-d').set({ firebaseAuthUid: 'auth-d', displayName: 'Delta' }),
      db.collection('auth_links').doc('auth-c').set({ stable_id: 'stable-c' }),
      db.collection('auth_links').doc('auth-d').set({ stable_id: 'stable-d' }),
      db.collection('arena_v2_profiles').doc('stable-c').set({ ...profile, authUid: 'auth-c' }),
      db.collection('arena_v2_profiles').doc('stable-d').set({ ...profile, authUid: 'auth-d' }),
      db.doc(`users/stable-c/arena_v2_seasons/${season.seasonId}`).set({
        seasonId: season.seasonId, stars: 91, level: 1, dailyDayKey: dayKey,
        dailyEligibleMatches: 3, dailyStarsCredited: 40, spinDropsToday: 0,
      }),
      db.doc(`users/stable-d/arena_v2_seasons/${season.seasonId}`).set({
        seasonId: season.seasonId, stars: 91, level: 1, dailyDayKey: dayKey,
        dailyEligibleMatches: 3, dailyStarsCredited: 40, spinDropsToday: 0,
      }),
      db.collection('arena_v2_matches').doc(sourceMatchId).set({
        matchId: sourceMatchId, mode: 'ranked', opponentKind: 'human',
        players: [
          { uid: 'a', name: 'Gamma', rank: 5, rating: 500, score: 900, correct: 9 },
          { uid: 'b', name: 'Delta', rank: 5, rating: 500, score: 800, correct: 8 },
        ],
        acceptedBy: ['a', 'b'], state: 'settled', terminal: true, version: 20,
        currentTaskIndex: 9, submittedBy: ['a', 'b'], scores: { a: 900, b: 800 },
        stateStartedAtMs: now, stateDeadlineAtMs: now,
        result: { winnerUid: 'a', reason: 'score', rewards: {} }, createdAtMs: now - 60_000,
      }),
      db.collection('arena_v2_match_private').doc(sourceMatchId).set({
        matchId: sourceMatchId, tasks: sourceFixtureTasks,
        participantStableUids: ['stable-c', 'stable-d'], participantAuthUids: ['auth-c', 'auth-d'],
        seatByStableUid: { 'stable-c': 'a', 'stable-d': 'b' },
        authByStableUid: { 'stable-c': 'auth-c', 'stable-d': 'auth-d' },
        answers: { 'stable-c': {}, 'stable-d': {} },
        speedProgress: { 'stable-c': {}, 'stable-d': {} }, speedAttempts: { 'stable-c': {}, 'stable-d': {} },
        totals: {
          'stable-c': { score: 900, elapsedMs: 30_000, correct: 9, fullySolved: 9, rawSeasonStars: 40, submittedAnswers: 10 },
          'stable-d': { score: 800, elapsedMs: 35_000, correct: 8, fullySolved: 8, rawSeasonStars: 35, submittedAnswers: 10 },
        }, settledAtMs: now,
      }),
    ]);

    const proposed = await expansion.arenaRivalPropose.run(callableRequest('auth-c', {
      sourceMatchId, requestId: 'rival-propose-2',
    }));
    const accepted = await expansion.arenaRivalAccept.run(callableRequest('auth-d', {
      seriesId: proposed.seriesId, requestId: 'rival-accept-2',
    }));
    await arena.arenaV2Forfeit.run(callableRequest('auth-c', { matchId: accepted.activeMatchId }));
    expect((await db.collection('arena_v2_series').doc(proposed.seriesId).get()).data())
      .toMatchObject({ status: 'between_games', gamesPlayed: 2, wins: { a: 1, b: 1 }, activeMatchId: null });

    const firstReady = await expansion.arenaRivalNext.run(callableRequest('auth-c', {
      seriesId: proposed.seriesId, requestId: 'rival-next-c',
    }));
    expect(firstReady).toMatchObject({ status: 'active', viewerReady: true });
    expect(firstReady.activeMatchId).toBeUndefined();
    const between = (await db.collection('arena_v2_series').doc(proposed.seriesId).get()).data();
    const excluded = new Set<string>(between?.usedTaskIds ?? []);
    const remainingPool = (await db.collection('tournamentTasks').get()).docs
      .map((doc) => doc.data()).filter((task) => !excluded.has(String(task.taskId)));
    for (const [mode, difficulty, count] of [
      ['guess_phrase', 1, 2], ['fill_gap', 1, 2], ['find_oddity', 1, 2],
      ['translate_build', 1, 1], ['speed_match', 1, 1],
      ['translate_build', 2, 1], ['speed_match', 2, 1],
    ] as Array<[string, number, number]>) {
      expect(remainingPool.filter((task) => task.mode === mode && task.difficulty === difficulty).length)
        .toBeGreaterThanOrEqual(count);

      const prefixByMode: Record<string, string> = {
        guess_phrase: 'guess', fill_gap: 'gap', find_oddity: 'odd',
        translate_build: 'build', speed_match: 'pairs',
      };
      const game3Id = createHash('sha256').update(`${proposed.seriesId}|game|3`).digest('hex').slice(0, 40);
      const prefix = `tp2_20260801_v10_${prefixByMode[mode]}_d${difficulty}_`;
      const cursor = `${prefix}${createHash('sha1').update(`${game3Id}|${mode}|${difficulty}`).digest('hex')}`;
      const base = db.collection('tournamentTasks')
        .where('poolVersion', '==', 'tpool_20260801_v10')
        .where('mode', '==', mode).where('difficulty', '==', difficulty)
        .orderBy(FieldPath.documentId());
      const readCount = Math.min(40, count + excluded.size);
      const after = await base.startAt(cursor).limit(readCount).get();
      const queried = after.docs.filter((doc) => !excluded.has(String(doc.data().taskId || doc.id)));
      if (queried.length < count) {
        const wrapped = await base.endBefore(cursor).limit(readCount).get();
        queried.push(...wrapped.docs.filter((doc) => !excluded.has(String(doc.data().taskId || doc.id))));
      }
      expect({ mode, difficulty, available: new Set(queried.map((doc) => doc.id)).size })
        .toEqual(expect.objectContaining({ available: expect.any(Number) }));
      expect(new Set(queried.map((doc) => doc.id)).size).toBeGreaterThanOrEqual(count);
    }
    const secondReady = await expansion.arenaRivalNext.run(callableRequest('auth-d', {
      seriesId: proposed.seriesId, requestId: 'rival-next-d',
    }));
    expect(secondReady.activeMatchId).toBeTruthy();
    await arena.arenaV2Forfeit.run(callableRequest('auth-d', { matchId: secondReady.activeMatchId }));

    const [completedSnap, gameThreeSnap] = await Promise.all([
      db.collection('arena_v2_series').doc(proposed.seriesId).get(),
      db.collection('arena_v2_matches').doc(secondReady.activeMatchId).get(),
    ]);
    const completed = completedSnap.data();
    expect(completed).toMatchObject({
      status: 'complete', gamesPlayed: 3, wins: { a: 2, b: 1 }, activeMatchId: null,
    });
    expect(gameThreeSnap.data()?.result?.seriesSummary).toMatchObject({
      winsA: 2, winsB: 1, gamesPlayed: 3, complete: true,
    });
    const muted = await expansion.arenaRivalMute.run(callableRequest('auth-c', {
      seriesId: proposed.seriesId, requestId: 'rival-mute-c', muted: true,
    }));
    const muteReplay = await expansion.arenaRivalMute.run(callableRequest('auth-c', {
      seriesId: proposed.seriesId, requestId: 'rival-mute-c', muted: true,
    }));
    expect(muted).toEqual({ ok: true, seriesId: proposed.seriesId, muted: true });
    expect(muteReplay).toEqual(muted);
    expect(Object.values((await db.collection('arena_v2_profiles').doc('stable-c').get())
      .data()?.rivalMutedPairs ?? {})).toContain(true);
    for (const uid of ['stable-c', 'stable-d']) {
      const finalProfile = (await db.collection('arena_v2_profiles').doc(uid).get()).data();
      expect(finalProfile).toMatchObject(profile);
      expect(finalProfile?.activeMatchId).toBeNull();
    }
  });
});
