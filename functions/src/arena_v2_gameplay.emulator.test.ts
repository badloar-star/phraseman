import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import {
  NEW_TOURNAMENT_POOL_CONTENT_SHA256,
  buildNewTournamentPool,
} from './tournament_pool_v2_factory';
import { loadTournamentSourceDays, TOURNAMENT_SOURCE_PLANS } from './tournament_content_source';

jest.setTimeout(90_000);

const PROJECT_ID = 'demo-phraseman-arena-v2-gameplay';
let app: App;
let db: Firestore;
let runtime: Record<string, any>;

function callableRequest(authUid: string, data: Record<string, unknown>) {
  return {
    auth: { uid: authUid, token: {} }, data: { ...data, clientVersion: '1.6.7' },
    rawRequest: { headers: {} }, app: { appId: 'emulator-test' },
  };
}

async function clearFixture(): Promise<void> {
  for (const collection of [
    'arena_v2_config', 'arena_v2_profiles', 'arena_v2_queue', 'arena_v2_queue_locks',
    'arena_v2_matches', 'arena_v2_match_private', 'arena_v2_invites', 'arena_v2_pair_limits',
    'users', 'auth_links', 'tournamentTasks',
  ]) await db.recursiveDelete(db.collection(collection));
}

describe('Arena V2 Quick bot gameplay (Firestore emulator smoke)', () => {
  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec.');
    }
    process.env.ARENA_V2_PAIR_HMAC_KEY = 'emulator-pair-secret';
    process.env.ARENA_V2_INVITE_HMAC_KEY = 'emulator-invite-secret';
    process.env.ARENA_V2_SPIN_HMAC_KEY = 'emulator-spin-secret';
    app = initializeApp({ projectId: PROJECT_ID });
    db = getFirestore(app);
    runtime = require('./arena_v2') as Record<string, any>;
    await clearFixture();
    await Promise.all([
      db.collection('arena_v2_config').doc('current').set({
        schemaVersion: 'arena-v2-config.v1', productConfigVersion: 'arena-v2-product.v1',
        enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true,
        rewardsEnabled: true, spinEnabled: true, minClientVersion: '1.6.0',
        contentPublication: {
          poolVersion: 'tpool_20260801_v10',
          manifestSha256: NEW_TOURNAMENT_POOL_CONTENT_SHA256,
        },
      }),
      db.collection('users').doc('stable-a').set({ firebaseAuthUid: 'auth-a', displayName: 'Alpha' }),
      db.collection('auth_links').doc('auth-a').set({ stable_id: 'stable-a' }),
    ]);
    const cells: Array<[string, number, number]> = [
      ['guess_phrase', 1, 2], ['fill_gap', 1, 2], ['find_oddity', 1, 2],
      ['translate_build', 1, 1], ['speed_match', 1, 1],
      ['translate_build', 2, 1], ['speed_match', 2, 1],
    ];
    const publication = buildNewTournamentPool(loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS));
    const selected = cells.flatMap(([mode, difficulty, count]) => publication.tasks
      .filter((task) => task.mode === mode && task.difficulty === difficulty)
      .slice(0, count));
    await Promise.all(selected.map((task) => db.collection('tournamentTasks').doc(task.taskId).set(task)));
  });

  afterAll(async () => {
    await clearFixture();
    await db.terminate();
    await deleteApp(app);
  });

  /**
   * Бот СКРЫТ. Раньше этот сценарий назывался «disclosed bot» и проверял
   * обратное: что игроку честно сообщают тип соперника. Владелец это
   * пересмотрел — по интерфейсу и по данным бота узнать нельзя, иначе матч с
   * ним обесценивается ещё до первого задания.
   */
  it('queues, falls back once to a hidden bot, settles timeouts and clears active state', async () => {
    const request = (data: Record<string, unknown>) => callableRequest('auth-a', data);
    const waiting = await runtime.arenaV2FindMatch.run(request({ mode: 'quick', requestId: 'queue-smoke-1' }));
    expect(waiting).toMatchObject({ ok: true, status: 'waiting', stableUid: 'stable-a' });
    await db.collection('arena_v2_queue').doc('stable-a').update({ joinedAtMs: Date.now() - 7_000 });

    const paired = await runtime.arenaV2QuickBotFallback.run(request({ requestId: 'queue-smoke-1' }));
    // Ответ вызова говорит 'human' даже про бота: настоящий тип остался только
    // в приватном документе, где он нужен экономике и аналитике.
    expect(paired).toMatchObject({ ok: true, status: 'matched', opponentKind: 'human', viewerSeat: 'a' });
    const matchRef = db.collection('arena_v2_matches').doc(paired.matchId);
    const privateRef = db.collection('arena_v2_match_private').doc(paired.matchId);
    const [publicBefore, privateBefore, members] = await Promise.all([
      matchRef.get(), privateRef.get(), matchRef.collection('arena_v2_members').get(),
    ]);
    // Публичный документ читается участником. 'bot' здесь был бы прямой
    // выдачей бота: достаточно посмотреть данные, играть не обязательно.
    expect(publicBefore.data()).toMatchObject({ opponentKind: 'human', state: 'accepting', acceptedBy: ['b'] });
    // А приватный тип соперника обязан остаться: по нему считаются шансы
    // редкой награды.
    expect(privateBefore.data()?.participantStableUids?.some((uid: string) => uid.startsWith('bot_'))).toBe(true);
    expect(JSON.stringify(publicBefore.data())).not.toContain('stable-a');
    expect(JSON.stringify(publicBefore.data())).not.toContain('auth-a');
    // Быстрый матч — пять заданий, не десять (ARENA_V2_QUICK_TASK_COUNT).
    expect(privateBefore.data()?.tasks).toHaveLength(5);
    expect(members.size).toBe(1);

    const accepted = await runtime.arenaV2MatchAccept.run(request({ matchId: paired.matchId }));
    expect(accepted.state).toBe('countdown');
    await matchRef.update({ stateDeadlineAtMs: Date.now() - 600_000 });
    const settled = await runtime.arenaV2SyncMatch.run(request({ matchId: paired.matchId }));
    expect(settled).toMatchObject({ ok: true, state: 'settled', viewerSeat: 'a' });
    expect(settled.viewerReward).toMatchObject({ starsEarned: 0, spinAwarded: false });

    const [publicAfter, profileAfter, queueAfter, receiptAfter] = await Promise.all([
      matchRef.get(), db.collection('arena_v2_profiles').doc('stable-a').get(),
      db.collection('arena_v2_queue').doc('stable-a').get(),
      db.collection('users/stable-a/arena_v2_receipts').doc(paired.matchId).get(),
    ]);
    expect(publicAfter.data()).toMatchObject({ terminal: true, state: 'settled' });
    expect(profileAfter.data()?.activeMatchId).toBeNull();
    expect(queueAfter.data()?.status).toBe('cancelled');
    expect(receiptAfter.exists).toBe(true);
  });

  it('never counts or consumes an expired spin credit', async () => {
    const credits = db.collection('users/stable-a/arena_v2_spin_credits');
    await Promise.all([
      credits.doc('expired').set({
        status: 'available', createdAtMs: 1, expiresAtMs: Date.now() - 1,
        expireAt: new Date(Date.now() - 1),
      }),
      credits.doc('valid').set({
        status: 'available', createdAtMs: 2, expiresAtMs: Date.now() + 60_000,
        expireAt: new Date(Date.now() + 60_000),
      }),
    ]);
    const status = await runtime.arenaV2SpinStatus.run(callableRequest('auth-a', {}));
    expect(status).toMatchObject({ ok: true, spinsAvailable: 1 });
    const claim = await runtime.arenaV2SpinClaim.run(callableRequest('auth-a', { requestId: 'spin-smoke-1' }));
    expect(claim).toMatchObject({ ok: true, creditId: 'valid' });
    const [expired, valid] = await Promise.all([credits.doc('expired').get(), credits.doc('valid').get()]);
    expect(expired.data()?.status).toBe('available');
    expect(valid.data()?.status).toBe('consumed');
  });

  it('settles concurrent spin request ids against distinct credits', async () => {
    const credits = db.collection('users/stable-a/arena_v2_spin_credits');
    await Promise.all(['concurrent-a', 'concurrent-b'].map((id, index) => credits.doc(id).set({
      status: 'available', createdAtMs: 10 + index,
      expiresAtMs: Date.now() + 120_000 + index,
      expireAt: new Date(Date.now() + 120_000 + index),
    })));
    const results = await Promise.all([
      runtime.arenaV2SpinClaim.run(callableRequest('auth-a', { requestId: 'spin-concurrent-a' })),
      runtime.arenaV2SpinClaim.run(callableRequest('auth-a', { requestId: 'spin-concurrent-b' })),
    ]);
    expect(new Set(results.map((result) => result.creditId))).toEqual(new Set(['concurrent-a', 'concurrent-b']));
  });

  it('revalidates a friend host and cancels both waiting queues on accept', async () => {
    await Promise.all([
      db.collection('users').doc('stable-b').set({ firebaseAuthUid: 'auth-b', displayName: 'Beta' }),
      db.collection('auth_links').doc('auth-b').set({ stable_id: 'stable-b' }),
      db.doc('users/stable-a/friends/stable-b').set({ since: Date.now() }),
      db.doc('users/stable-b/friends/stable-a').set({ since: Date.now() }),
      db.collection('arena_v2_queue').doc('stable-a').set({
        authUid: 'auth-a', mode: 'quick', status: 'waiting', joinedAtMs: Date.now(),
      }),
      db.collection('arena_v2_queue').doc('stable-b').set({
        authUid: 'auth-b', mode: 'quick', status: 'waiting', joinedAtMs: Date.now(),
      }),
    ]);
    const invite = await runtime.arenaV2InviteCreate.run(callableRequest('auth-a', {
      friendStableUid: 'stable-b', requestId: 'friend-smoke-1',
    }));
    expect(invite).toMatchObject({ ok: true, stableUid: 'stable-a', status: 'pending' });
    const accepted = await runtime.arenaV2InviteAccept.run(callableRequest('auth-b', {
      inviteId: invite.inviteId,
    }));
    expect(accepted).toMatchObject({ ok: true, status: 'accepted', viewerSeat: 'b' });
    const [hostProfile, guestProfile, hostQueue, guestQueue, match] = await Promise.all([
      db.collection('arena_v2_profiles').doc('stable-a').get(),
      db.collection('arena_v2_profiles').doc('stable-b').get(),
      db.collection('arena_v2_queue').doc('stable-a').get(),
      db.collection('arena_v2_queue').doc('stable-b').get(),
      db.collection('arena_v2_matches').doc(accepted.matchId).get(),
    ]);
    expect(hostProfile.data()?.activeMatchId).toBe(accepted.matchId);
    expect(guestProfile.data()?.activeMatchId).toBe(accepted.matchId);
    expect(hostQueue.data()).toMatchObject({ status: 'cancelled', closeReason: 'friend_match' });
    expect(guestQueue.data()).toMatchObject({ status: 'cancelled', closeReason: 'friend_match' });
    expect(match.data()).toMatchObject({ mode: 'friend', opponentKind: 'human', state: 'accepting' });
  });
});
