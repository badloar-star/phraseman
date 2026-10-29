import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { COMMUNITY_CONTEST_FIRST_MONTH, contestMonth, contestPrize, rankContestEntries, type ContestEntry, type ContestMonth } from '../../shared/community_month_contest';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { communityPlusExpiry, communityRewardId } from './community_month_reward';
import { beginStarLedgerTransactionAttempt, prepareStarOperations, commitStarOperations } from './stars_ledger';
import { writeAccessProjection } from './access_projection';
import { isStorePremiumActive, isAdminGrantActive } from './premium_status';
import { syncPublicProfilePlusAfterCommit } from './public_profile_plus_sync';
import { contestCanonicalOwner, contestRewardOwners } from './community_contest_identity';
import { getWeekKey, isoDateUtc } from './progress_events';

const RESULTS = 'community_month_results';
const REWARDS = 'community_month_rewards';
const WINNERS = 'community_contest_winners';

/** Read real membership documents: client-maintained display counters cannot decide prizes. */
async function readEntries(db: FirebaseFirestore.Firestore, month: ContestMonth, readerUid?: string): Promise<ContestEntry[]> {
  const entries: ContestEntry[] = [];
  const identities = new Map<string, Promise<string | null>>();
  const canonical = (uid: string) => {
    if (!identities.has(uid)) identities.set(uid, contestCanonicalOwner(db, uid));
    return identities.get(uid)!;
  };
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection('community_packs').where('publishedAt', '<', month.endMs).orderBy('publishedAt').limit(200);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      const d = doc.data();
      const authorId = String(d.authorStableId ?? d.authorId ?? '');
      if (!authorId || !['published', 'update_pending'].includes(String(d.listingStatus)) || d.videoId || d.removedByAuthor) continue;
      const canonicalAuthor = await canonical(authorId);
      if (!canonicalAuthor) continue;
      const votes = await doc.ref.collection('contest_votes').where('monthId', '==', month.id).get();
      const members = new Map<string, { liked: boolean; at: number; id: string }>();
      for (const vote of votes.docs) {
        const uid = await canonical(String(vote.data().userId ?? ''));
        if (!uid || uid === canonicalAuthor) continue;
        const data = vote.data();
        const at = typeof data.updatedAt?.toMillis === 'function' ? data.updatedAt.toMillis() : 0;
        if (at < month.startMs || at >= month.endMs) continue;
        const previous = members.get(uid);
        if (!previous || at > previous.at || (at === previous.at && vote.id > previous.id)) {
          members.set(uid, { liked: data.liked === true, at, id: vote.id });
        }
      }
      entries.push({ id: doc.id, authorId: canonicalAuthor, title: String(d.title ?? d.titleRu ?? ''), hearts: [...members.values()].filter(v => v.liked).length, ...(readerUid ? { myMonthHeart: members.get(readerUid)?.liked === true } : {}), publishedAtMs: Number(d.publishedAt), status: String(d.listingStatus) });
    }
    if (page.size < 200) break;
    cursor = page.docs[page.docs.length - 1];
  }
  return entries;
}

/** One immutable result plus at most three receipts. Parallel retries cannot choose new winners. */
export async function finalizeCommunityMonth(db: FirebaseFirestore.Firestore, month: ContestMonth): Promise<void> {
  if (Date.now() < month.endMs) throw new Error('Cannot finalize an active month');
  const resultRef = db.collection(RESULTS).doc(month.id);
  if ((await resultRef.get()).exists) return;
  const candidates = rankContestEntries(await readEntries(db, month), month);
  await db.runTransaction(async tx => {
    if ((await tx.get(resultRef)).exists) return;
    const previousPrizes = candidates.length ? await tx.getAll(...candidates.map(entry => db.collection(WINNERS).doc(entry.id))) : [];
    const winners = candidates.filter((_, index) => !previousPrizes[index].exists).slice(0, 3);
    const finalizedAtMs = Date.now();
    tx.create(resultRef, { monthId: month.id, winners, finalizedAtMs, ruleVersion: 2 });
    winners.forEach((winner, index) => {
      const rewardId = communityRewardId(month.id, winner.id);
      tx.create(db.collection(WINNERS).doc(winner.id), { monthId: month.id, place: index + 1, rewardId, finalizedAtMs });
      tx.create(db.collection('users').doc(winner.authorId).collection(REWARDS).doc(rewardId), {
        rewardId, monthId: month.id, packId: winner.id, packTitle: winner.title, place: index + 1,
        hearts: winner.hearts, prize: contestPrize(index + 1), claimed: false, finalizedAtMs,
      });
    });
  });
}

export const communityMonthFinalize = onSchedule({ region: 'us-central1', schedule: '5 0 1 * *', timeZone: 'UTC', timeoutSeconds: 540, retryCount: 5 }, async () => {
  const config = (await admin.firestore().collection('community_contest_config').doc('current').get()).data();
  if (config?.enabled !== true) return;
  const current = contestMonth(Date.now());
  const previous = contestMonth(current.startMs - 1);
  if (typeof config.firstFullMonth !== 'string' || previous.id < config.firstFullMonth || previous.id < COMMUNITY_CONTEST_FIRST_MONTH) return;
  await finalizeCommunityMonth(admin.firestore(), contestMonth(current.startMs - 1));
});

/** Current ranking uses exactly the same monthly membership reader as prize finalization. */
export const communityMonthGetRanking = onCall({ ...HOT_CALLABLE_OPTIONS, timeoutSeconds: 120 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
  const db = admin.firestore();
  const uid = await resolveStableUidForAuth(db, request.auth.uid, String(request.data?.userId ?? ''), { requireKnownIdentity: true });
  const month = contestMonth(Date.now());
  const config = (await db.collection('community_contest_config').doc('current').get()).data();
  if (config?.enabled !== true || month.id < COMMUNITY_CONTEST_FIRST_MONTH || typeof config.firstFullMonth !== 'string' || month.id < config.firstFullMonth) return { monthId: month.id, entries: [] };
  const entries = await readEntries(db, month, uid);
  const previous = entries.length ? await db.getAll(...entries.map(entry => db.collection(WINNERS).doc(entry.id))) : [];
  return { monthId: month.id, entries: entries.filter((_, index) => !previous[index].exists) };
});

export const communityMonthGetRewards = onCall(HOT_CALLABLE_OPTIONS, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
  const db = admin.firestore();
  const uid = await resolveStableUidForAuth(db, request.auth.uid, String(request.data?.userId ?? ''), { requireKnownIdentity: true });
  // Private reward history is bounded and read only on screen entry, never by polling.
  const owners = await contestRewardOwners(db, uid);
  const pages = await Promise.all(owners.map(owner => db.collection('users').doc(owner).collection(REWARDS).orderBy('finalizedAtMs', 'desc').limit(12).get()));
  return { rewards: pages.flatMap(page => page.docs.map(doc => doc.data())).sort((a, b) => Number(b.finalizedAtMs) - Number(a.finalizedAtMs)) };
});

export const communityMonthClaimReward = onCall(HOT_CALLABLE_OPTIONS, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
  const rewardId = String(request.data?.rewardId ?? '');
  if (!/^community_month:\d{4}-\d{2}_[a-f0-9]{32}$/.test(rewardId)) throw new HttpsError('invalid-argument', 'Invalid reward');
  const db = admin.firestore();
  const uid = await resolveStableUidForAuth(db, request.auth.uid, String(request.data?.userId ?? ''), { requireKnownIdentity: true });
  return claimCommunityMonthReward(db, uid, rewardId, request.auth.uid);
});

/** Transaction boundary shared by callable and emulator verification. */
export async function claimCommunityMonthReward(db: FirebaseFirestore.Firestore, uid: string, rewardId: string, authUid: string): Promise<Record<string, unknown>> {
  const userRef = db.collection('users').doc(uid);
  const owners = await contestRewardOwners(db, uid);
  const candidates = await Promise.all(owners.map(owner => db.collection('users').doc(owner).collection(REWARDS).doc(rewardId).get()));
  const found = candidates.filter(snap => snap.exists);
  if (found.length !== 1) throw new HttpsError(found.length ? 'failed-precondition' : 'not-found', 'Reward not found or ambiguous');
  const rewardRef = found[0].ref;
  const result = await db.runTransaction(async tx => {
    beginStarLedgerTransactionAttempt(tx);
    if (await contestCanonicalOwner(db, rewardRef.parent.parent!.id, tx) !== uid) throw new HttpsError('permission-denied', 'Reward account changed');
    const [userSnap, rewardSnap] = await Promise.all([tx.get(userRef), tx.get(rewardRef)]);
    if (!userSnap.exists || !rewardSnap.exists) throw new HttpsError('not-found', 'Reward not found');
    const user = userSnap.data() ?? {};
    const reward = rewardSnap.data() ?? {};
    if (user.identityHidden || user.levelSpinMergePending) throw new HttpsError('failed-precondition', 'Account is updating');
    if (reward.claimed === true) return reward.receipt;
    const prize = contestPrize(Number(reward.place));
    if (!prize || communityRewardId(String(reward.monthId), String(reward.packId)) !== rewardId) throw new HttpsError('failed-precondition', 'Invalid prize record');
    const nowMs = Date.now();
    let receipt: Record<string, unknown>;
    if (prize.kind === 'coins') {
      const prepared = await prepareStarOperations(tx, db, uid, userSnap, [{ opId: rewardId, delta: prize.amount, reason: 'community_month_reward', sourceKind: 'community_month', sourceId: rewardId.slice(16), ruleVersion: 1, earnedAtMs: nowMs }], { nowMs, activeSeasonId: '', weekKeyNow: getWeekKey(isoDateUtc(new Date(nowMs))), authUid });
      if (!prepared.outcomes[0] || prepared.outcomes[0].status === 'rejected') throw new HttpsError('failed-precondition', 'Reward could not be applied');
      const wallet = commitStarOperations(tx, prepared);
      receipt = { rewardId, kind: 'coins', amount: prize.amount, stars: wallet.balance, starsEarnedTotal: wallet.earnedTotal, starsSeq: wallet.seq };
    } else {
      const progress = user.progress && typeof user.progress === 'object' ? user.progress as Record<string, unknown> : {};
      const activePaidOrAdmin = isStorePremiumActive(progress, nowMs) || isAdminGrantActive(progress, nowMs);
      const candidates = [progress.community_plus_until_ms, ...(activePaidOrAdmin ? [progress.premium_expiry, progress.premium_rc_expiry_ms] : [])].map(Number).filter(Number.isFinite);
      const existingUntil = Math.max(0, ...candidates);
      const untilMs = communityPlusExpiry(nowMs, existingUntil);
      tx.update(userRef, { 'progress.community_plus_until_ms': String(untilMs) });
      writeAccessProjection(tx, userRef, { ...progress, community_plus_until_ms: String(untilMs) }, nowMs);
      receipt = { rewardId, kind: 'plus', months: 3, untilMs };
    }
    tx.update(rewardRef, { claimed: true, claimedAtMs: nowMs, receipt });
    return receipt;
  });
  if (result.kind === 'plus') {
    try {
      const progress = (await userRef.get()).data()?.progress ?? {};
      await syncPublicProfilePlusAfterCommit({ db, stableUid: uid, progress, nowMs: Date.now(), source: 'community_month_reward' });
    } catch (error) {
      console.warn('[PLUS-RING] contest reward cosmetic sync failed', error instanceof Error ? error.name : 'unknown');
    }
  }
  return result;
}
