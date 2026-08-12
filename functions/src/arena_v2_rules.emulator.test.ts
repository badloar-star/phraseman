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
      await setDoc(doc(db, 'arena_v2_matches/match-1/arena_v2_members', 'auth-a'), { seat: 'a' });
      await setDoc(doc(db, 'arena_v2_matches/match-1/arena_v2_members', 'auth-b'), { seat: 'b' });
      await setDoc(doc(db, 'arena_v2_match_private', 'match-1'), { answers: {}, tasks: [{ secret: true }] });
      await setDoc(doc(db, 'users/stable-a/arena_v2_seasons', 'season-1'), { stars: 12 });
      await setDoc(doc(db, 'users/stable-a/arena_v2_receipts', 'match-1'), { stars: 4 });
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
    await assertFails(setDoc(doc(owner, 'arena_v2_invites', 'forged'), { toAuthUid: 'auth-b' }));
    await assertFails(setDoc(doc(owner, 'arena_v2_pair_limits', 'forged'), { count: 0 }));
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
