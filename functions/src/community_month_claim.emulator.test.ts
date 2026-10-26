import * as admin from 'firebase-admin';
import { claimCommunityMonthReward, finalizeCommunityMonth } from './community_month_contest';
import { communityPlusExpiry, communityRewardId } from './community_month_reward';
import { contestMonth } from '../../shared/community_month_contest';
import { isPremiumAccessActive } from './premium_status';

describe('monthly prizes — real atomic Firestore transactions', () => {
  let app: admin.app.App;
  let db: FirebaseFirestore.Firestore;
  beforeAll(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Emulator required; production is forbidden');
    app = admin.initializeApp({ projectId: 'demo-community-claims' }, 'community-claims');
    db = app.firestore();
  });
  afterAll(async () => { await db.terminate(); await app.delete(); });
  async function seed(uid: string, place: number, progress: Record<string, unknown> = {}) {
    const rewardId = communityRewardId('2026-09', uid);
    await db.doc(`users/${uid}`).set({ progress, stars: { balance: 77, earnedTotal: 77, seq: 0 } });
    await db.doc(`users/${uid}/community_month_rewards/${rewardId}`).set({ monthId: '2026-09', packId: uid, place, claimed: false });
    return rewardId;
  }
  it('grants three calendar months once under concurrent taps and replays the exact receipt', async () => {
    const existingUntil = Date.now() + 10 * 86400000;
    const id = await seed('plus', 1, { premium_plan: 'monthly', premium_expiry: String(existingUntil), premium_rc_expiry_ms: String(existingUntil), premium_active: 'true' });
    const receipts = await Promise.all(Array.from({ length: 4 }, () => claimCommunityMonthReward(db, 'plus', id, 'auth-plus')));
    expect(receipts.every(receipt => receipt.untilMs === receipts[0].untilMs)).toBe(true);
    expect(receipts[0].untilMs).toBe(communityPlusExpiry(Date.now(), existingUntil));
    const progress = (await db.doc('users/plus').get()).data()!.progress;
    expect(isPremiumAccessActive(progress, existingUntil + 1)).toBe(true);
    const projection = (await db.doc('users/plus/access_projection/current').get()).data()!;
    expect(projection.premiumActive).toBe(true);
    expect(projection.premiumExpiresAtMs).toBe(receipts[0].untilMs);
    expect(await claimCommunityMonthReward(db, 'plus', id, 'auth-plus')).toEqual(receipts[0]);
  }, 30000);
  it.each([[2, 2000], [3, 1000]])('grants place %i exactly %i coins, without double credit or earned-XP inflation', async (place, amount) => {
    const uid = `coins-${place}`;
    const id = await seed(uid, place);
    const receipts = await Promise.all([claimCommunityMonthReward(db, uid, id, uid), claimCommunityMonthReward(db, uid, id, uid)]);
    expect(receipts[0]).toEqual(receipts[1]);
    expect(receipts[0]).toMatchObject({ amount, stars: 77 + amount, starsEarnedTotal: 77 });
    expect((await db.doc(`users/${uid}`).get()).data()!.stars.balance).toBe(77 + amount);
    expect((await db.collection(`users/${uid}/star_operations`).get()).size).toBe(1);
  }, 30000);
  it('rejects other-account rewards, invalid prizes and merging accounts without granting anything', async () => {
    const id = await seed('guarded', 1);
    await db.doc('users/other').set({ progress: {} });
    await expect(claimCommunityMonthReward(db, 'other', id, 'other')).rejects.toMatchObject({ code: 'not-found' });
    await db.doc('users/guarded').update({ levelSpinMergePending: true });
    await expect(claimCommunityMonthReward(db, 'guarded', id, 'guarded')).rejects.toThrow('Account merge pending');
    expect((await db.doc('users/guarded').get()).data()!.progress).toEqual({});
    const invalid = await seed('invalid', 4);
    await expect(claimCommunityMonthReward(db, 'invalid', invalid, 'invalid')).rejects.toMatchObject({ code: 'failed-precondition' });
  });
  it('keeps a private reward claimable after an account merge, without issuing it twice', async () => {
    const id = await seed('alias', 1);
    await db.doc('users/canonical').set({ progress: {} });
    await db.doc('users/alias').update({ identityHidden: true, canonicalStableId: 'canonical' });
    const receipt = await claimCommunityMonthReward(db, 'canonical', id, 'canonical-auth');
    expect(receipt.kind).toBe('plus');
    expect((await db.doc('users/canonical').get()).data()!.progress.community_plus_until_ms).toBe(String(receipt.untilMs));
    expect(await claimCommunityMonthReward(db, 'canonical', id, 'canonical-auth')).toEqual(receipt);
  });
  it('finalizes from frozen votes, excludes self/zero/previous winners and old votes and creates the same three rewards on retry', async () => {
    const month = contestMonth(Date.UTC(2026, 8, 10));
    for (const [id, votes, publishedAt, status] of [
      ['first', 3, month.startMs, 'published'], ['second', 2, month.startMs + 1, 'update_pending'],
      ['third', 1, month.startMs + 2, 'published'], ['zero', 0, month.startMs + 3, 'published'],
      ['old', 10, month.startMs - 1, 'published'], ['past-winner', 20, month.startMs - 2, 'published'], ['removed', 10, month.startMs + 4, 'removed'],
    ] as const) {
      await db.doc(`users/author-${id}`).set({ progress: {} });
      const pack = db.doc(`community_packs/${id}`);
      await pack.set({ authorStableId: `author-${id}`, title: id, publishedAt, listingStatus: status, likesCount: 999999 });
      for (let i = 0; i < votes; i++) { await db.doc(`users/voter-${i}`).set({}); await pack.collection('contest_votes').doc(`voter-${i}`).set({ monthId: id === 'old' ? '2026-08' : month.id, userId: `voter-${i}`, liked: true, updatedAt: admin.firestore.Timestamp.fromMillis(id === 'old' ? month.startMs - 1 : month.startMs + 100) }); }
      await pack.collection('contest_votes').doc(`author-${id}`).set({ monthId: month.id, userId: `author-${id}`, liked: true, updatedAt: admin.firestore.Timestamp.fromMillis(month.startMs + 100) });
      if (id === 'past-winner') await db.doc(`community_contest_winners/${id}`).set({ monthId: '2026-08', place: 3 });
      await pack.collection('contest_votes').doc('removed-vote').set({ liked: false });
    }
    await Promise.all([finalizeCommunityMonth(db, month), finalizeCommunityMonth(db, month)]);
    const result = (await db.doc(`community_month_results/${month.id}`).get()).data()!;
    expect(result.winners.map((w: { id: string }) => w.id)).toEqual(['first', 'second', 'third']);
    expect(result.winners.map((w: { hearts: number }) => w.hearts)).toEqual([3, 2, 1]);
    await finalizeCommunityMonth(db, month);
    expect((await db.doc('community_contest_winners/first').get()).data()?.place).toBe(1);
    expect((await db.collectionGroup('community_month_rewards').where('monthId', '==', month.id).get()).docs.filter(doc => doc.ref.parent.parent?.id.startsWith('author-')).length).toBe(3);
  }, 30000);
  it('lets a non-winner return next month but never awards a previous podium pack again', async () => {
    const month = contestMonth(Date.UTC(2026, 9, 10));
    for (const id of ['old', 'first']) {
      for (let i = 0; i < 5; i++) {
        await db.doc(`users/returning-${i}`).set({});
        await db.doc(`community_packs/${id}/contest_votes/${month.id}_returning-${i}`).set({ monthId: month.id, userId: `returning-${i}`, liked: true, updatedAt: admin.firestore.Timestamp.fromMillis(month.startMs + 1) });
      }
    }
    // Use a finished month independent of the machine's day within October.
    const now = jest.spyOn(Date, 'now').mockReturnValue(month.endMs + 1000);
    try { await finalizeCommunityMonth(db, month); } finally { now.mockRestore(); }
    const result = (await db.doc(`community_month_results/${month.id}`).get()).data()!;
    expect(result.winners.map((w: { id: string }) => w.id)).toEqual(['old']);
    expect(result.winners[0].hearts).toBe(5);
  }, 30000);
});
