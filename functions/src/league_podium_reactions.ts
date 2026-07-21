import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';

/**
 * Реакции на подиуме лиги (👑 crown / 🔥 fire / 😤 grumpy).
 * Один участник группы — одна реакция на одну цель в рамках недельной группы:
 * повтор того же эмодзи снимает реакцию (toggle), другой эмодзи — переключает.
 * Счётчики лежат в league_groups/{groupId}/podium_reactions/{targetUid},
 * клиент их только читает; все записи — только через этот callable.
 */

export const LEAGUE_PODIUM_REACTION_EMOJIS = ['crown', 'fire', 'grumpy'] as const;
export type LeaguePodiumReactionEmoji = (typeof LEAGUE_PODIUM_REACTION_EMOJIS)[number];

export interface LeaguePodiumReactionDoc {
  counts: Record<LeaguePodiumReactionEmoji, number>;
  reactors: Record<string, LeaguePodiumReactionEmoji>;
}

export function emptyLeaguePodiumReactionDoc(): LeaguePodiumReactionDoc {
  return { counts: { crown: 0, fire: 0, grumpy: 0 }, reactors: {} };
}

export type LeaguePodiumReactionToggleStatus = 'added' | 'removed' | 'switched';

/** Чистый редьюсер toggle-реакции — покрыт юнит-тестами. */
export function applyLeaguePodiumReactionToggle(
  doc: LeaguePodiumReactionDoc,
  uid: string,
  emoji: LeaguePodiumReactionEmoji,
): { next: LeaguePodiumReactionDoc; status: LeaguePodiumReactionToggleStatus } {
  const prev = doc.reactors[uid] ?? null;
  const counts: Record<LeaguePodiumReactionEmoji, number> = { ...doc.counts };
  const reactors: Record<string, LeaguePodiumReactionEmoji> = { ...doc.reactors };
  let status: LeaguePodiumReactionToggleStatus;
  if (prev === emoji) {
    counts[emoji] = Math.max(0, (counts[emoji] ?? 0) - 1);
    delete reactors[uid];
    status = 'removed';
  } else if (prev) {
    counts[prev] = Math.max(0, (counts[prev] ?? 0) - 1);
    counts[emoji] = (counts[emoji] ?? 0) + 1;
    reactors[uid] = emoji;
    status = 'switched';
  } else {
    counts[emoji] = (counts[emoji] ?? 0) + 1;
    reactors[uid] = emoji;
    status = 'added';
  }
  return { next: { counts, reactors }, status };
}

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function readInt(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getWeekId(at = new Date()): string {
  const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

async function assertCanUseLeague(db: FirebaseFirestore.Firestore, stableUid: string): Promise<void> {
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get().catch(() => null),
    db.collection('banned_users').doc(stableUid).get().catch(() => null),
  ]);
  if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

export const leaguePodiumReaction = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId, { requireKnownIdentity: true, repairLinks: false });
  await assertCanUseLeague(db, stableUid);

  const groupId = sanitizeString(request.data?.groupId, 64);
  const targetUid = sanitizeString(request.data?.targetUid, 64);
  const emoji = sanitizeString(request.data?.emoji, 16) as LeaguePodiumReactionEmoji;
  if (!groupId || !targetUid) throw new HttpsError('invalid-argument', 'group_target_required');
  if (!LEAGUE_PODIUM_REACTION_EMOJIS.includes(emoji)) throw new HttpsError('invalid-argument', 'bad_emoji');
  if (targetUid === stableUid) throw new HttpsError('failed-precondition', 'self_reaction');

  const groupRef = db.collection('league_groups').doc(groupId);
  const groupSnap = await groupRef.get();
  const weekId = getWeekId();
  if (!groupSnap.exists || groupSnap.data()?.weekId !== weekId) {
    throw new HttpsError('failed-precondition', 'league_group_not_current');
  }
  const members = (groupSnap.data()?.members ?? {}) as Record<string, unknown>;
  if (!members[stableUid]) throw new HttpsError('permission-denied', 'not_a_group_member');
  if (!members[targetUid]) throw new HttpsError('failed-precondition', 'target_not_in_group');

  const docRef = groupRef.collection('podium_reactions').doc(targetUid);
  let applied: { next: LeaguePodiumReactionDoc; status: LeaguePodiumReactionToggleStatus } = {
    next: emptyLeaguePodiumReactionDoc(),
    status: 'added',
  };
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const raw = (snap.exists ? snap.data() ?? {} : {}) as Record<string, unknown>;
    const rawCounts = (raw.counts ?? {}) as Record<string, unknown>;
    const current: LeaguePodiumReactionDoc = {
      counts: { crown: readInt(rawCounts.crown), fire: readInt(rawCounts.fire), grumpy: readInt(rawCounts.grumpy) },
      reactors: ((raw.reactors ?? {}) as Record<string, LeaguePodiumReactionEmoji>),
    };
    applied = applyLeaguePodiumReactionToggle(current, stableUid, emoji);
    tx.set(docRef, {
      weekId,
      targetUid,
      counts: applied.next.counts,
      reactors: applied.next.reactors,
      updatedAt: Date.now(),
    }, { merge: true });
  });

  return {
    ok: true,
    status: applied.status,
    counts: applied.next.counts,
    myReaction: applied.next.reactors[stableUid] ?? null,
  };
});
