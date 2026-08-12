import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { arenaSeasonWindow } from './arena_v2_core';
import {
  ARENA_EXPANSION_CATALOG_VERSION,
  ARENA_EXPANSION_COLLECTIONS,
  ARENA_GHOST_TTL_MS,
  arenaTodayDayKey,
  arenaUtcWeekKey,
} from './arena_expansion_core';
import {
  NEW_TOURNAMENT_POOL_CONTENT_SHA256,
  buildNewTournamentPool,
} from './tournament_pool_v2_factory';
import { loadTournamentSourceDays, TOURNAMENT_SOURCE_PLANS } from './tournament_content_source';
import { verifyTournamentAnswer, type TournamentTask } from './tournament_core';

jest.setTimeout(180_000);

const PROJECT_ID = 'demo-phraseman-arena-expansion-gameplay';
const CLIENT_VERSION = '1.6.7';
let app: App;
let db: Firestore;
let expansion: Record<string, any>;
let arena: Record<string, any>;
let completedTodayRunId = '';
let todayDayKey = '';

function callableRequest(authUid: string, data: Record<string, unknown>) {
  return {
    auth: { uid: authUid, token: {} }, data: { ...data, clientVersion: CLIENT_VERSION },
    rawRequest: { headers: {} }, app: { appId: 'emulator-test' },
  };
}

async function clearFixture(): Promise<void> {
  for (const collection of [
    'arena_v2_config', 'arena_v2_profiles', 'arena_v2_queue', 'arena_v2_matches', 'arena_v2_match_private',
    ARENA_EXPANSION_COLLECTIONS.dailyPrivate, ARENA_EXPANSION_COLLECTIONS.ghosts,
    ARENA_EXPANSION_COLLECTIONS.series, ARENA_EXPANSION_COLLECTIONS.partnerships,
    'users', 'auth_links', 'tournamentTasks',
  ]) await db.recursiveDelete(db.collection(collection));
}

function answerFor(task: TournamentTask): Record<string, unknown> {
  const candidates: Array<Record<string, unknown>> = [
    { selectedIndex: task.payload.correctIndex },
    { tokens: Array.isArray(task.payload.correctTokens) ? task.payload.correctTokens
      : typeof task.payload.correctAnswer === 'string' ? task.payload.correctAnswer.trim().split(/\s+/) : [] },
    { selectedIndexes: Array.isArray(task.payload.items)
      ? task.payload.items.map((item: any) => Number(item.correctIndex)) : [] },
  ];
  const answer = candidates.find((candidate) => verifyTournamentAnswer(task, candidate));
  if (answer) return answer;
  throw new Error(`unsupported task payload: ${task.mode}`);
}

async function completeRun(
  authUid: string,
  stableUid: string,
  runId: string,
  clock: { now: number },
): Promise<Record<string, any>> {
  const runRef = db.doc(`users/${stableUid}/${ARENA_EXPANSION_COLLECTIONS.runs}/${runId}`);
  const tasks = (await runRef.get()).data()?.tasks as TournamentTask[];
  expect(tasks).toHaveLength(10);
  let response: Record<string, any> = {};
  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex += 1) {
    const task = tasks[taskIndex];
    clock.now += 2_000;
    if (task.mode === 'speed_match') {
      const items = task.payload.items as Array<{ correctIndex: number }>;
      for (let pairIndex = 0; pairIndex < items.length; pairIndex += 1) {
        response = await expansion.arenaTodaySubmitSpeedAttempt.run(callableRequest(authUid, {
          runId, taskIndex, pairIndex, selectedIndex: items[pairIndex].correctIndex,
          submissionId: `${runId}-speed-${taskIndex}-${pairIndex}`,
        }));
      }
    } else {
      response = await expansion.arenaTodaySubmitAnswer.run(callableRequest(authUid, {
        runId, taskIndex, answer: answerFor(task), submissionId: `${runId}-answer-${taskIndex}`,
      }));
      expect(response.correct).toBe(true);
    }
    clock.now += 2_000;
    response = await expansion.arenaTodaySync.run(callableRequest(authUid, { runId, version: response.version }));
  }
  expect(response).toMatchObject({ ok: true, terminal: true, state: 'settled' });
  return response;
}

async function addIdentity(stableUid: string, authUid: string, displayName: string): Promise<void> {
  await Promise.all([
    db.collection('users').doc(stableUid).set({ firebaseAuthUid: authUid, displayName }),
    db.collection('auth_links').doc(authUid).set({ stable_id: stableUid }),
    db.collection('arena_v2_profiles').doc(stableUid).set({
      authUid, rating: 0, rank: 0, starWalletBalance: 0,
      lifetimeWalletStarsEarned: 0, masteryThresholdStarsLifetime: 0,
    }),
  ]);
}

async function addFriendship(left: string, right: string): Promise<void> {
  await Promise.all([
    db.doc(`users/${left}/friends/${right}`).set({ since: Date.now() }),
    db.doc(`users/${right}/friends/${left}`).set({ since: Date.now() }),
  ]);
}

describe('Arena Expansion gameplay (Firestore emulator smoke)', () => {
  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    process.env.ARENA_V2_INVITE_HMAC_KEY = 'emulator-expansion-social-secret';
    app = initializeApp({ projectId: PROJECT_ID });
    db = getFirestore(app);
    arena = require('./arena_v2') as Record<string, any>;
    expansion = require('./arena_expansion') as Record<string, any>;
    await clearFixture();

    await db.collection('arena_v2_config').doc('current').set({
      schemaVersion: 'arena-v2-config.v1', productConfigVersion: 'arena-v2-product.v1',
      enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true,
      rewardsEnabled: true, spinEnabled: true, minClientVersion: '1.6.0',
      arenaExpansionEnabled: true, arenaTodayEnabled: true, arenaMatchLabEnabled: true,
      arenaMasteryEnabled: true, arenaGhostEnabled: true, arenaPartnerEnabled: true,
      arenaStarStoreEnabled: true, arenaCosmeticCatalogVersion: ARENA_EXPANSION_CATALOG_VERSION,
      contentPublication: {
        poolVersion: 'tpool_20260801_v10', manifestSha256: NEW_TOURNAMENT_POOL_CONTENT_SHA256,
      },
    });
    await Promise.all([
      addIdentity('stable-a', 'auth-a', 'Alpha'), addIdentity('stable-b', 'auth-b', 'Beta'),
      addIdentity('stable-c', 'auth-c', 'Gamma'), addIdentity('stable-d', 'auth-d', 'Delta'),
      addIdentity('stable-e', 'auth-e', 'Epsilon'), addIdentity('stable-f', 'auth-f', 'Phi'),
    ]);
    await Promise.all([
      addFriendship('stable-a', 'stable-b'), addFriendship('stable-a', 'stable-c'),
      addFriendship('stable-a', 'stable-d'), addFriendship('stable-a', 'stable-e'),
      addFriendship('stable-a', 'stable-f'), addFriendship('stable-c', 'stable-d'),
    ]);

    const publication = buildNewTournamentPool(loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS));
    const cells: Array<[string, number, number]> = [
      ['guess_phrase', 1, 8], ['fill_gap', 1, 8], ['find_oddity', 1, 8],
      ['translate_build', 1, 4], ['speed_match', 1, 4],
      ['translate_build', 2, 4], ['speed_match', 2, 4],
    ];
    const selected = cells.flatMap(([mode, difficulty, count]) => publication.tasks
      .filter((task) => task.mode === mode && task.difficulty === difficulty).slice(0, count));
    expect(selected.length).toBe(40);
    await Promise.all(selected.map((task) => db.collection('tournamentTasks').doc(task.taskId).set(task)));
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await clearFixture();
    await db.terminate();
    await deleteApp(app);
  });

  it('settles one exact-once 10-answer Today across UTC midnight and credits season, wallet, mastery and activity', async () => {
    const realNow = Date.now();
    const nextMidnight = Date.UTC(new Date(realNow).getUTCFullYear(), new Date(realNow).getUTCMonth(),
      new Date(realNow).getUTCDate() + 1);
    const clock = { now: nextMidnight - 30_000 };
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock.now);
    todayDayKey = arenaTodayDayKey(clock.now);

    const started = await expansion.arenaTodayStart.run(callableRequest('auth-a', {
      requestId: 'today-cross-midnight-1', dayKey: todayDayKey,
    }));
    completedTodayRunId = String(started.runId);
    expect(started.hardExpiresAtMs - clock.now).toBe(20 * 60 * 1_000);
    const replayStart = await expansion.arenaTodayStart.run(callableRequest('auth-a', {
      requestId: 'today-cross-midnight-1', dayKey: todayDayKey,
    }));
    expect(replayStart.runId).toBe(completedTodayRunId);

    const completed = await completeRun('auth-a', 'stable-a', completedTodayRunId, clock);
    expect(arenaTodayDayKey(clock.now)).not.toBe(todayDayKey);
    expect(completed.viewerReward).toMatchObject({ starsEarned: 30, seasonStarsAfter: 30 });

    const seasonId = arenaSeasonWindow(clock.now).seasonId;
    const [profile, season, marker, activity, signatures, ledger, lab] = await Promise.all([
      db.doc('arena_v2_profiles/stable-a').get(),
      db.doc(`users/stable-a/arena_v2_seasons/${seasonId}`).get(),
      db.doc(`users/stable-a/${ARENA_EXPANSION_COLLECTIONS.dailyAttempts}/${todayDayKey}`).get(),
      db.doc(`users/stable-a/${ARENA_EXPANSION_COLLECTIONS.activityDays}/${todayDayKey}`).get(),
      db.collection(`users/stable-a/${ARENA_EXPANSION_COLLECTIONS.masterySignatures}`).get(),
      db.collection(`users/stable-a/${ARENA_EXPANSION_COLLECTIONS.starLedger}`).get(),
      db.doc(`users/stable-a/${ARENA_EXPANSION_COLLECTIONS.matchLabs}/${completedTodayRunId}`).get(),
    ]);
    expect(profile.data()).toMatchObject({ starWalletBalance: 30, activeMatchId: null });
    expect(Object.values(profile.data()?.mastery ?? {}).map((row: any) => row.sampleCount)).toEqual([2, 2, 2, 2, 2]);
    expect(season.data()?.stars).toBe(30);
    expect(marker.data()).toMatchObject({ status: 'settled', starsEarned: 30, submittedAnswers: 10, correct: 10 });
    expect(activity.data()).toMatchObject({ qualifying: true, dayKey: todayDayKey });
    expect(signatures.size).toBe(10);
    expect(ledger.docs.filter((doc) => doc.data().kind === 'today_earn')).toHaveLength(1);
    expect(lab.exists).toBe(true);

    const settledReplay = await expansion.arenaTodaySync.run(callableRequest('auth-a', {
      runId: completedTodayRunId, version: completed.version,
    }));
    expect(settledReplay).toMatchObject({ terminal: true, viewerReward: { starsEarned: 30 } });
    expect((await db.doc('arena_v2_profiles/stable-a').get()).data()?.starWalletBalance).toBe(30);
    nowSpy.mockRestore();
  });

  it('creates, accepts and reveals a Ghost result with fresh TTL, zero economy and enforced active caps', async () => {
    const created = await expansion.arenaGhostCreate.run(callableRequest('auth-a', {
      friendStableUid: 'stable-b', sourceKind: 'arena_today', sourceRunId: completedTodayRunId,
      requestId: 'ghost-main-1',
    }));
    expect(created).toMatchObject({ ok: true, status: 'available', noEconomy: true });
    expect(created.expiresAtMs - Date.now()).toBeGreaterThan(ARENA_GHOST_TTL_MS - 5_000);

    const accepted = await expansion.arenaGhostAccept.run(callableRequest('auth-b', {
      inviteToken: created.inviteToken, requestId: 'ghost-accept-1',
    }));
    const ghostAfterAccept = (await db.doc(`${ARENA_EXPANSION_COLLECTIONS.ghosts}/${created.ghostId}`).get()).data();
    expect(accepted).toMatchObject({ ok: true, status: 'accepted', noEconomy: true });
    expect(ghostAfterAccept?.expiresAtMs).toBe(accepted.hardExpiresAtMs + 24 * 60 * 60 * 1_000);
    expect(ghostAfterAccept?.expireAt.toMillis()).toBe(ghostAfterAccept?.expiresAtMs);

    const seasonId = arenaSeasonWindow(Date.now()).seasonId;
    const before = {
      profile: (await db.doc('arena_v2_profiles/stable-b').get()).data(),
      season: (await db.doc(`users/stable-b/arena_v2_seasons/${seasonId}`).get()).data(),
      ledger: (await db.collection(`users/stable-b/${ARENA_EXPANSION_COLLECTIONS.starLedger}`).get()).size,
      signatures: (await db.collection(`users/stable-b/${ARENA_EXPANSION_COLLECTIONS.masterySignatures}`).get()).size,
      activity: (await db.collection(`users/stable-b/${ARENA_EXPANSION_COLLECTIONS.activityDays}`).get()).size,
    };
    const clock = { now: Date.now() };
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock.now);
    const completed = await completeRun('auth-b', 'stable-b', accepted.runId, clock);
    nowSpy.mockRestore();
    expect(completed.viewerReward).toMatchObject({ noEconomy: true, starsEarned: 0, ratingDelta: 0 });

    const afterProfile = (await db.doc('arena_v2_profiles/stable-b').get()).data();
    const afterSeason = (await db.doc(`users/stable-b/arena_v2_seasons/${seasonId}`).get()).data();
    for (const key of ['starWalletBalance', 'lifetimeWalletStarsEarned', 'masteryThresholdStarsLifetime', 'mastery']) {
      expect(afterProfile?.[key]).toEqual(before.profile?.[key]);
    }
    expect(afterSeason).toEqual(before.season);
    expect((await db.collection(`users/stable-b/${ARENA_EXPANSION_COLLECTIONS.starLedger}`).get()).size).toBe(before.ledger);
    expect((await db.collection(`users/stable-b/${ARENA_EXPANSION_COLLECTIONS.masterySignatures}`).get()).size).toBe(before.signatures);
    expect((await db.collection(`users/stable-b/${ARENA_EXPANSION_COLLECTIONS.activityDays}`).get()).size).toBe(before.activity);

    const status = await expansion.arenaGhostStatus.run(callableRequest('auth-a', { inviteToken: created.inviteToken }));
    expect(status.selected).toMatchObject({ status: 'complete', noEconomy: true,
      result: { hostScore: 1000, guestScore: 1000, outcome: 'draw' } });

    for (const [friendStableUid, requestId] of [
      ['stable-c', 'ghost-cap-c'], ['stable-d', 'ghost-cap-d'], ['stable-e', 'ghost-cap-e'],
    ]) await expansion.arenaGhostCreate.run(callableRequest('auth-a', {
      friendStableUid, sourceKind: 'arena_today', sourceRunId: completedTodayRunId, requestId,
    }));
    const pairCap = await expansion.arenaGhostCreate.run(callableRequest('auth-a', {
      friendStableUid: 'stable-c', sourceKind: 'arena_today', sourceRunId: completedTodayRunId,
      requestId: 'ghost-cap-c-second',
    })).catch((error: any) => error);
    expect(pairCap.code).toBe('already-exists');
    const outgoingCap = await expansion.arenaGhostCreate.run(callableRequest('auth-a', {
      friendStableUid: 'stable-f', sourceKind: 'arena_today', sourceRunId: completedTodayRunId,
      requestId: 'ghost-cap-f',
    })).catch((error: any) => error);
    expect(outgoingCap.code).toBe('resource-exhausted');
  });

  it('awards Partner shared-day thresholds 3 and 5 exactly once and never rewards an idle pair', async () => {
    const invite = await expansion.arenaPartnerInvite.run(callableRequest('auth-a', {
      friendStableUid: 'stable-b', requestId: 'partner-ab-invite',
    }));
    const inviteNotificationRef = db.doc(`users/stable-b/notifications/arena_partner_invite_${invite.partner.partnershipId}`);
    expect((await inviteNotificationRef.get()).data()).toMatchObject({
      type: 'arena_partner_invite', nav: { kind: 'arena_partner', partnershipId: invite.partner.partnershipId },
    });
    const accepted = await expansion.arenaPartnerAccept.run(callableRequest('auth-b', {
      inviteToken: invite.inviteToken, requestId: 'partner-ab-accept',
    }));
    expect(accepted.partner).toMatchObject({ state: 'active', direction: 'active' });
    expect((await inviteNotificationRef.get()).exists).toBe(false);

    const weekKey = arenaUtcWeekKey(Date.now());
    const weekStart = Date.parse(`${weekKey}T00:00:00.000Z`);
    const days = Array.from({ length: 5 }, (_, index) => arenaTodayDayKey(weekStart + index * 86_400_000));
    const seedDays = async (from: number, to: number) => Promise.all(days.slice(from, to).flatMap((dayKey) => [
      db.doc(`users/stable-a/${ARENA_EXPANSION_COLLECTIONS.activityDays}/${dayKey}`).set({ dayKey, qualifying: true }),
      db.doc(`users/stable-b/${ARENA_EXPANSION_COLLECTIONS.activityDays}/${dayKey}`).set({ dayKey, qualifying: true }),
    ]));
    await seedDays(0, 3);
    const before = Number((await db.doc('arena_v2_profiles/stable-a').get()).data()?.starWalletBalance ?? 0);
    const three = await expansion.arenaPartnerClaimSpotlight.run(callableRequest('auth-a', {
      partnershipId: invite.partner.partnershipId, requestId: 'partner-claim-3',
    }));
    expect(three).toMatchObject({ ok: true, starsEarned: 10, partner: { sharedDays: 3 } });
    await seedDays(3, 5);
    const five = await expansion.arenaPartnerClaimSpotlight.run(callableRequest('auth-a', {
      partnershipId: invite.partner.partnershipId, requestId: 'partner-claim-5',
    }));
    expect(five).toMatchObject({ ok: true, starsEarned: 20, partner: { sharedDays: 5 } });
    const replay = await expansion.arenaPartnerClaimSpotlight.run(callableRequest('auth-a', {
      partnershipId: invite.partner.partnershipId, requestId: 'partner-claim-5',
    }));
    expect(replay.starsEarned).toBe(20);
    expect((await db.doc('arena_v2_profiles/stable-a').get()).data()?.starWalletBalance).toBe(before + 30);

    const idleInvite = await expansion.arenaPartnerInvite.run(callableRequest('auth-c', {
      friendStableUid: 'stable-d', requestId: 'partner-idle-invite',
    }));
    await expansion.arenaPartnerAccept.run(callableRequest('auth-d', {
      inviteToken: idleInvite.inviteToken, requestId: 'partner-idle-accept',
    }));
    const idle = await expansion.arenaPartnerClaimSpotlight.run(callableRequest('auth-c', {
      partnershipId: idleInvite.partner.partnershipId, requestId: 'partner-idle-claim',
    }));
    expect(idle.starsEarned).toBe(0);
    expect((await db.doc('arena_v2_profiles/stable-c').get()).data()?.starWalletBalance).toBe(0);
  });

  it('serves the catalog and keeps purchase/equip idempotent while rejecting insufficient balance', async () => {
    const seasonId = arenaSeasonWindow(Date.now()).seasonId;
    await Promise.all([
      db.doc('arena_v2_profiles/stable-a').set({ starWalletBalance: 600 }, { merge: true }),
      db.doc(`users/stable-a/arena_v2_seasons/${seasonId}`).set({ stars: 123 }, { merge: true }),
    ]);
    const catalog = await expansion.arenaStarStore.run(callableRequest('auth-a', {}));
    expect(catalog).toMatchObject({ ok: true, catalogVersion: ARENA_EXPANSION_CATALOG_VERSION,
      wallet: { walletStars: 600, seasonStarsEarned: 123 } });
    expect(catalog.items).toHaveLength(13);

    const purchaseInput = { itemId: 'title_rising_challenger', catalogVersion: ARENA_EXPANSION_CATALOG_VERSION,
      requestId: 'store-purchase-title' };
    const purchase = await expansion.arenaStarPurchase.run(callableRequest('auth-a', purchaseInput));
    const purchaseReplay = await expansion.arenaStarPurchase.run(callableRequest('auth-a', purchaseInput));
    expect(purchase).toMatchObject({ ok: true, status: 'purchased', balanceAfter: 350 });
    expect(purchaseReplay).toMatchObject({ ok: true, status: 'purchased', balanceAfter: 350 });
    expect((await db.doc('arena_v2_profiles/stable-a').get()).data()?.starWalletBalance).toBe(350);
    expect((await db.doc(`users/stable-a/${ARENA_EXPANSION_COLLECTIONS.entitlements}/title_rising_challenger`).get()).exists)
      .toBe(true);

    const equipInput = { itemId: 'title_rising_challenger', slot: 'title', requestId: 'store-equip-title' };
    const equip = await expansion.arenaStarEquip.run(callableRequest('auth-a', equipInput));
    const equipReplay = await expansion.arenaStarEquip.run(callableRequest('auth-a', equipInput));
    expect(equip).toMatchObject({ ok: true, operation: 'equip' });
    expect(equipReplay).toMatchObject({ ok: true, operation: 'equip' });
    expect((await db.doc('arena_v2_profiles/stable-a').get()).data()?.equippedCosmetics)
      .toMatchObject({ title: 'title_rising_challenger' });

    const insufficient = await expansion.arenaStarPurchase.run(callableRequest('auth-a', {
      itemId: 'entry_legend_crown', catalogVersion: ARENA_EXPANSION_CATALOG_VERSION,
      requestId: 'store-purchase-too-expensive',
    })).catch((error: any) => error);
    expect(insufficient.code).toBe('failed-precondition');
    expect((await db.doc('arena_v2_profiles/stable-a').get()).data()?.starWalletBalance).toBe(350);
    expect((await db.doc(`users/stable-a/${ARENA_EXPANSION_COLLECTIONS.entitlements}/entry_legend_crown`).get()).exists)
      .toBe(false);
  });

  it('persists all four base Arena speed pairs through the Firestore-safe codec', async () => {
    const completedToday = (await db.doc(
      `users/stable-a/${ARENA_EXPANSION_COLLECTIONS.runs}/${completedTodayRunId}`,
    ).get()).data();
    const speedTask = (completedToday?.tasks as TournamentTask[])
      .find((task) => task.mode === 'speed_match')!;
    expect(speedTask.payload.items).toHaveLength(4);
    const matchId = 'base-speed-codec-smoke';
    const now = Date.now();
    await Promise.all([
      db.doc(`arena_v2_matches/${matchId}`).set({
        matchId, mode: 'quick', opponentKind: 'human',
        players: [
          { uid: 'a', name: 'Alpha', rank: 0, rating: 0, score: 0, correct: 0 },
          { uid: 'b', name: 'Beta', rank: 0, rating: 0, score: 0, correct: 0 },
        ],
        acceptedBy: ['a', 'b'], state: 'task_active', terminal: false, version: 5,
        currentTaskIndex: 0, submittedBy: [], scores: { a: 0, b: 0 },
        stateStartedAtMs: now - 5_000, readingEndsAtMs: now - 1_000,
        stateDeadlineAtMs: now + 60_000, createdAtMs: now - 10_000,
      }),
      db.doc(`arena_v2_match_private/${matchId}`).set({
        matchId, tasks: Array.from({ length: 10 }, () => speedTask),
        participantStableUids: ['stable-a', 'stable-b'], participantAuthUids: ['auth-a', 'auth-b'],
        seatByStableUid: { 'stable-a': 'a', 'stable-b': 'b' },
        authByStableUid: { 'stable-a': 'auth-a', 'stable-b': 'auth-b' },
        answers: { 'stable-a': {}, 'stable-b': {} },
        speedProgress: { 'stable-a': {}, 'stable-b': {} },
        speedAttempts: { 'stable-a': {}, 'stable-b': {} },
        totals: {
          'stable-a': { score: 0, elapsedMs: 0, correct: 0, fullySolved: 0, rawSeasonStars: 0, submittedAnswers: 0 },
          'stable-b': { score: 0, elapsedMs: 0, correct: 0, fullySolved: 0, rawSeasonStars: 0, submittedAnswers: 0 },
        },
      }),
    ]);
    const items = speedTask.payload.items as Array<{ correctIndex: number }>;
    let response: Record<string, any> = {};
    for (let pairIndex = 0; pairIndex < items.length; pairIndex += 1) {
      response = await arena.arenaV2SubmitSpeedAttempt.run(callableRequest('auth-a', {
        matchId, taskIndex: 0, pairIndex, selectedIndex: items[pairIndex].correctIndex,
        submissionId: `base-speed-${pairIndex}`,
      }));
    }
    expect(response).toMatchObject({ ok: true, correct: true, points: 100 });
    const stored = (await db.doc(`arena_v2_match_private/${matchId}`).get()).data();
    expect(stored?.speedProgress?.['stable-a']?.['0']).toMatchObject({
      schemaVersion: 'arena-speed-progress.firestore.v1', matchedIndexes: expect.any(Array),
      triedIndexesByPair: expect.any(Object), wrongAttempts: 0,
    });
    expect(stored?.speedProgress?.['stable-a']?.['0']?.triedIndexes).toBeUndefined();
    expect(stored?.answers?.['stable-a']?.['0']).toMatchObject({ correct: true, points: 100 });
  });
});
