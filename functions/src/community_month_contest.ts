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
import { getWeekKey, isoDateUtc, parseAccountCreatedAtMs } from './progress_events';
import {
  CONTEST_TALLY_RULE_VERSION,
  CONTEST_WIN_STORY_FIELD,
  contestAccountCreatedAtMs,
  contestLessonsCompleted,
  contestStandingsShouldRefresh,
  contestWinStoryValue,
  tallyContestMonth,
  type TallyPack,
  type TallyStats,
  type TallyVote,
  type TallyVoter,
} from './community_month_tally';
import { grantPlusOnce } from './plus_grant';

const RESULTS = 'community_month_results';
const REWARDS = 'community_month_rewards';
const WINNERS = 'community_contest_winners';
const STANDINGS = 'community_month_standings';
const LOG_TALLY = '[CONTEST-TALLY]';
const LOG_FINAL = '[CONTEST-FINAL]';
/** Владелец 29.10 ~07:55: места 1/2/3 → Plus 3/2/1 месяца автоматически (монет за места нет). */
const PLUS_MONTHS_BY_PLACE = [3, 2, 1] as const;
const errText = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 160);

async function contestEnabledFor(db: FirebaseFirestore.Firestore, month: ContestMonth): Promise<boolean> {
  const config = (await db.collection('community_contest_config').doc('current').get()).data();
  return config?.enabled === true && month.id >= COMMUNITY_CONTEST_FIRST_MONTH
    && typeof config.firstFullMonth === 'string' && month.id >= config.firstFullMonth;
}

/**
 * Подсчёт месяца по правилам владельца (функции/src/community_month_tally.ts). Наборы — только этого месяца (запрос по
 * publishedAt), голоса — запросом по каждому такому набору (их единицы; индекс по группе коллекций не нужен), профили
 * голосующих — getAll пачками (одно чтение на человека, не на голос). Голоса старых сборок пишутся как раньше —
 * правила допуска применяются здесь, поэтому лайки 147/148 не ломаются.
 */
export async function buildMonthTally(db: FirebaseFirestore.Firestore, month: ContestMonth): Promise<{ entries: ContestEntry[]; stats: TallyStats }> {
  const startedAt = Date.now();
  const identities = new Map<string, Promise<string | null>>();
  const canonical = (uid: string) => {
    if (!identities.has(uid)) identities.set(uid, contestCanonicalOwner(db, uid));
    return identities.get(uid)!;
  };
  const packSnap = await db.collection('community_packs')
    .where('publishedAt', '>=', month.startMs).where('publishedAt', '<', month.endMs)
    .orderBy('publishedAt').limit(2000).get();
  const packs: TallyPack[] = [];
  const votes: TallyVote[] = [];
  for (const doc of packSnap.docs) {
    const d = doc.data();
    const authorId = String(d.authorStableId ?? d.authorId ?? '');
    if (!authorId || d.videoId || d.removedByAuthor) {
      console.log(LOG_TALLY, JSON.stringify({ step: 'pack_skip', packId: doc.id, reason: !authorId ? 'no_author' : d.videoId ? 'video_pack' : 'removed_by_author' }));
      continue;
    }
    const owner = await canonical(authorId);
    if (!owner) {
      console.warn(LOG_TALLY, JSON.stringify({ step: 'pack_skip', packId: doc.id, reason: 'author_unresolved' }));
      continue;
    }
    packs.push({ id: doc.id, authorId: owner, title: String(d.title ?? d.titleRu ?? ''), publishedAtMs: Number(d.publishedAt), status: String(d.listingStatus) });
    const voteSnap = await doc.ref.collection('contest_votes').where('monthId', '==', month.id).limit(5000).get();
    for (const vote of voteSnap.docs) {
      const v = vote.data();
      const voterId = await canonical(String(v.userId ?? ''));
      if (!voterId) continue;
      votes.push({ packId: doc.id, voterId, liked: v.liked === true, atMs: typeof v.updatedAt?.toMillis === 'function' ? v.updatedAt.toMillis() : 0, voteId: vote.id });
    }
  }
  const voterIds = [...new Set(votes.map((v) => v.voterId))];
  const voters = new Map<string, TallyVoter>();
  for (let i = 0; i < voterIds.length; i += 300) {
    const snaps = await db.getAll(...voterIds.slice(i, i + 300).map((id) => db.collection('users').doc(id)));
    for (const s of snaps) {
      const data = s.data() ?? {};
      const profileCreatedAtMs = parseAccountCreatedAtMs(data.created_at);
      let authCreatedAtMs: number | null = null;
      if (profileCreatedAtMs == null) {
        // владелец 29.10: у старых аккаунтов created_at бывает пуст — берём дату создания в Firebase Auth
        try {
          authCreatedAtMs = Date.parse((await admin.auth().getUser(s.id)).metadata.creationTime) || null;
        } catch (error) {
          console.warn(LOG_TALLY, JSON.stringify({ step: 'voter_age_unknown', reason: errText(error) }));
        }
      }
      voters.set(s.id, {
        createdAtMs: contestAccountCreatedAtMs(profileCreatedAtMs, authCreatedAtMs),
        lessonsCompleted: contestLessonsCompleted((data.progress ?? {}) as Record<string, unknown>),
      });
    }
  }
  const result = tallyContestMonth({ month, packs, votes, voters });
  console.log(LOG_TALLY, JSON.stringify({ step: 'built', monthId: month.id, ms: Date.now() - startedAt, packsRead: packSnap.size, voters: voterIds.length, ...result.stats }));
  return result;
}

/** Снимок рейтинга месяца: один документ, его читает рейтинг вместо обхода всех наборов на каждое открытие. */
export async function writeMonthStandings(db: FirebaseFirestore.Firestore, month: ContestMonth): Promise<void> {
  const { entries, stats } = await buildMonthTally(db, month);
  const prev = entries.length ? await db.getAll(...entries.map((e) => db.collection(WINNERS).doc(e.id))) : [];
  const fresh = entries.filter((_, i) => !prev[i].exists);
  const ranked = rankContestEntries(fresh, month);
  const rankedIds = new Set(ranked.map((e) => e.id));
  const unranked = fresh.filter((e) => !rankedIds.has(e.id)).sort((a, b) => a.publishedAtMs - b.publishedAtMs);
  const list = [...ranked, ...unranked].slice(0, 300)
    .map(({ id, authorId, title, hearts, publishedAtMs, status }) => ({ id, authorId, title, hearts, publishedAtMs, status }));
  await db.collection(STANDINGS).doc(month.id).set({
    monthId: month.id, ruleVersion: CONTEST_TALLY_RULE_VERSION, builtAtMs: Date.now(), entries: list, totalEntries: fresh.length, stats,
  });
  console.log(LOG_TALLY, JSON.stringify({ step: 'standings_written', monthId: month.id, entries: list.length, ranked: ranked.length }));
}

/** Каждый час; пересчёт раз в 3 ч, а в последние сутки месяца — каждый час (владелец 29.10). */
export const communityMonthStandingsRefresh = onSchedule({ region: 'us-central1', schedule: 'every 1 hours', timeZone: 'UTC', timeoutSeconds: 300, retryCount: 2 }, async () => {
  const db = admin.firestore();
  const now = Date.now();
  const month = contestMonth(now);
  if (!(await contestEnabledFor(db, month))) {
    console.log(LOG_TALLY, JSON.stringify({ step: 'skip', reason: 'contest_disabled_or_before_first_month', monthId: month.id }));
    return;
  }
  if (!contestStandingsShouldRefresh(now, month)) {
    console.log(LOG_TALLY, JSON.stringify({ step: 'skip', reason: 'not_due', monthId: month.id, hourUtc: new Date(now).getUTCHours() }));
    return;
  }
  await writeMonthStandings(db, month);
});

/**
 * Итог месяца: неизменяемый результат + автоматический Plus 3/2/1 и история победителю (той же записью, тем же ключом).
 * Повторный запуск дописывает только недоданные выдачи (журнал plus_grant_ledger не даст выдать дважды).
 */
export async function finalizeCommunityMonth(db: FirebaseFirestore.Firestore, month: ContestMonth): Promise<void> {
  if (Date.now() < month.endMs) {
    console.warn(LOG_FINAL, JSON.stringify({ step: 'skip', reason: 'month_active', monthId: month.id }));
    return;
  }
  const resultRef = db.collection(RESULTS).doc(month.id);
  let result = (await resultRef.get()).data();
  if (!result) {
    const { entries, stats } = await buildMonthTally(db, month); // финализация считает заново, снимок ей не нужен
    const prev = entries.length ? await db.getAll(...entries.map((e) => db.collection(WINNERS).doc(e.id))) : [];
    const winners = rankContestEntries(entries.filter((_, i) => !prev[i].exists), month).slice(0, 3);
    const finalizedAtMs = Date.now();
    await db.runTransaction(async (tx) => {
      if ((await tx.get(resultRef)).exists) return; // параллельный запуск уже записал итог
      tx.create(resultRef, { monthId: month.id, winners, stats, finalizedAtMs, ruleVersion: CONTEST_TALLY_RULE_VERSION, prize: 'plus_months_3_2_1' });
      winners.forEach((w, i) => tx.create(db.collection(WINNERS).doc(w.id), { monthId: month.id, place: i + 1, finalizedAtMs }));
    });
    result = (await resultRef.get()).data();
    console.log(LOG_FINAL, JSON.stringify({ step: 'result_written', monthId: month.id, winners: (result?.winners ?? []).length, ...stats }));
  } else {
    console.log(LOG_FINAL, JSON.stringify({ step: 'result_exists', monthId: month.id, winners: (result.winners ?? []).length }));
  }
  const winners = (result?.winners ?? []) as ContestEntry[];
  for (const [index, w] of winners.entries()) {
    const place = (index + 1) as 1 | 2 | 3;
    const plusMonths = PLUS_MONTHS_BY_PLACE[index];
    const story = (months: number) => contestWinStoryValue({ monthId: month.id, place, plusMonths: months, packId: w.id, packTitle: w.title, hearts: w.hearts, grantedAtMs: Date.now() });
    try {
      const r = await grantPlusOnce(db, {
        uid: w.authorId,
        grantKey: `community_month:${month.id}:place${place}`,
        duration: { months: plusMonths },
        plan: 'community_month',
        source: `community_month:${month.id}`,
        extraProgress: { [CONTEST_WIN_STORY_FIELD]: story(plusMonths) },
        // бессрочный Plus не продлевается — история без строки про месяцы (Моменты 29.10)
        extraProgressLifetime: { [CONTEST_WIN_STORY_FIELD]: story(0) },
      });
      console.log(LOG_FINAL, JSON.stringify({ step: 'grant', monthId: month.id, place, packId: w.id, status: r.status }));
    } catch (error) {
      // не бросаем: остальные места выдаются; расписание повторит упавшую выдачу через час
      console.warn(LOG_FINAL, JSON.stringify({ step: 'grant_failed', monthId: month.id, place, packId: w.id, reason: errText(error) }));
    }
  }
}

/** 1-го числа каждый час (UTC): первый запуск пишет итог и выдаёт Plus, следующие доделывают упавшие выдачи. */
export const communityMonthFinalize = onSchedule({ region: 'us-central1', schedule: '5 * 1 * *', timeZone: 'UTC', timeoutSeconds: 540, retryCount: 5 }, async () => {
  const db = admin.firestore();
  const current = contestMonth(Date.now());
  const previous = contestMonth(current.startMs - 1);
  if (!(await contestEnabledFor(db, previous))) {
    console.log(LOG_FINAL, JSON.stringify({ step: 'skip', reason: 'contest_disabled_or_before_first_month', monthId: previous.id }));
    return;
  }
  await finalizeCommunityMonth(db, previous);
});

/** Рейтинг: снимок месяца (2 чтения) + свои голоса пакетом по известным id. Форма ответа прежняя — 147/148 совместимы. */
export const communityMonthGetRanking = onCall({ ...HOT_CALLABLE_OPTIONS, timeoutSeconds: 60 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
  const db = admin.firestore();
  const uid = await resolveStableUidForAuth(db, request.auth.uid, String(request.data?.userId ?? ''), { requireKnownIdentity: true });
  const month = contestMonth(Date.now());
  if (!(await contestEnabledFor(db, month))) return { monthId: month.id, entries: [] };
  let snap = await db.collection(STANDINGS).doc(month.id).get();
  if (!snap.exists) {
    // первый вызов месяца до первого расписания — строим один раз, дальше все читают снимок
    console.warn(LOG_TALLY, JSON.stringify({ step: 'standings_missing_build_now', monthId: month.id }));
    await writeMonthStandings(db, month);
    snap = await db.collection(STANDINGS).doc(month.id).get();
  }
  const entries = (snap.data()?.entries ?? []) as ContestEntry[];
  // «моё сердце»: голос лежит по известному id `${monthId}_${uid}` — getAll, без запроса по группе коллекций
  const myVotes = entries.length
    ? await db.getAll(...entries.map((e) => db.collection('community_packs').doc(e.id).collection('contest_votes').doc(`${month.id}_${uid}`)))
    : [];
  return {
    monthId: month.id,
    builtAtMs: snap.data()?.builtAtMs ?? null,
    entries: entries.map((e, i) => ({ ...e, myMonthHeart: myVotes[i]?.data()?.liked === true })),
  };
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

/**
 * «Забрать приз» осталось для сборок 147/148. С 29.10 призы начисляются автоматически и квитанций
 * community_month_rewards для новых месяцев нет — кнопке отвечаем «не найдено», без ошибки на стороне сервера.
 */
export const communityMonthClaimReward = onCall(HOT_CALLABLE_OPTIONS, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
  const rewardId = String(request.data?.rewardId ?? '');
  if (!/^community_month:\d{4}-\d{2}_[a-f0-9]{32}$/.test(rewardId)) throw new HttpsError('invalid-argument', 'Invalid reward');
  const db = admin.firestore();
  const uid = await resolveStableUidForAuth(db, request.auth.uid, String(request.data?.userId ?? ''), { requireKnownIdentity: true });
  return claimCommunityMonthReward(db, uid, rewardId, request.auth.uid);
});

/** Transaction boundary shared by callable and emulator verification (legacy receipts only). */
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
