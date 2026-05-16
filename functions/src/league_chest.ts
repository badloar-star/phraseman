import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'us-central1';
const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const MIN_CONTRIBUTION = 500;
const MIN_RACE_PARTICIPANTS = 10;
const SHARDS_REWARD = 30;
const ENERGY_MS = 5 * 60 * 1000;
const LEAGUE_CHEST_BASE_GOAL = 200_000;
const LEAGUE_CHEST_GOAL_STEP = 20_000;
const CROWN_AURA = 'league_chest_crown';
const CROWN_NICK_COLOR = '#16B7D9';

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function getLeagueChestGoal(leagueId: unknown): number {
  const id = Math.max(0, readInt(leagueId, 0));
  return LEAGUE_CHEST_BASE_GOAL + id * LEAGUE_CHEST_GOAL_STEP;
}

function safeId(value: string): string {
  return value.replace(/[^\w.-]/g, '_').slice(0, 140);
}

function claimDocId(uid: string, weekId: string, groupId: string): string {
  return `${safeId(weekId)}_${safeId(groupId)}_${safeId(uid)}`;
}

function crownDocId(uid: string, weekId: string): string {
  return `${safeId(uid)}_${safeId(weekId)}`;
}

function eventDocId(weekId: string, groupId: string): string {
  return `${safeId(weekId)}_${safeId(groupId)}`;
}

function currentWeekId(): string {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

async function resolveStableUid(db: FirebaseFirestore.Firestore, authUid: string): Promise<string> {
  const direct = await db.collection('users').doc(authUid).get().catch(() => null);
  if (direct?.exists) return authUid;
  const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
  if (!byAuth.empty) return byAuth.docs[0].id;
  return authUid;
}

async function assertNotBanned(db: FirebaseFirestore.Firestore, stableUid: string): Promise<void> {
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get().catch(() => null),
    db.collection('banned_users').doc(stableUid).get().catch(() => null),
  ]);
  if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

function parseShield(raw: unknown): { daysLeft: number } {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { daysLeft: Math.max(0, readInt(parsed?.daysLeft, 0)) };
  } catch {
    return { daysLeft: 0 };
  }
}

export const leagueChestClaim = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const weekId = sanitizeString(request.data?.weekId, 20) || currentWeekId();
  const groupId = sanitizeString(request.data?.groupId, 180);
  if (!groupId) throw new HttpsError('invalid-argument', 'group_required');
  if (weekId !== currentWeekId()) throw new HttpsError('failed-precondition', 'stale_week');

  const groupRef = db.collection('league_groups').doc(groupId);
  const lbRef = db.collection('leaderboard').doc(stableUid);
  const claimRef = db.collection('league_chest_claims').doc(claimDocId(stableUid, weekId, groupId));
  const eventRef = db.collection('league_chest_events').doc(eventDocId(weekId, groupId));
  const arenaEventRef = db.collection('arena_club_events').doc(`${safeId(weekId)}_${safeId(groupId)}`);
  const userRef = db.collection('users').doc(stableUid);
  const now = Date.now();
  const expiresAt = now + MS_WEEK;

  return db.runTransaction(async (tx) => {
    const [groupSnap, lbSnap, claimSnap, userSnap, eventSnap, arenaEventSnap] = await Promise.all([
      tx.get(groupRef),
      tx.get(lbRef),
      tx.get(claimRef),
      tx.get(userRef),
      tx.get(eventRef),
      tx.get(arenaEventRef),
    ]);

    if (!groupSnap.exists) throw new HttpsError('not-found', 'league_group_not_found');
    const group = groupSnap.data() || {};
    if (group.weekId !== weekId) throw new HttpsError('permission-denied', 'week_mismatch');
    const leagueId = Math.max(0, readInt(group.leagueId, 0));
    const lb = lbSnap.data() || {};
    if (lb.groupId !== groupId || lb.groupWeekId !== weekId) {
      throw new HttpsError('permission-denied', 'room_mismatch');
    }

    const membersRaw = group.members && typeof group.members === 'object' ? group.members : {};
    const members = Object.entries(membersRaw as Record<string, Record<string, unknown>>)
      .map(([uid, m]) => ({
        uid,
        name: sanitizeString(m?.name, 48) || 'Player',
        points: Math.max(0, readInt(m?.points, 0)),
      }))
      .filter((m) => !!m.uid);
    if (!members.some((m) => m.uid === stableUid)) {
      throw new HttpsError('permission-denied', 'not_group_member');
    }
    if (members.length < MIN_RACE_PARTICIPANTS) {
      return { ok: true, claimed: false, status: 'not_enough_participants' };
    }

    const goal = getLeagueChestGoal(leagueId);
    const leaguePoints = members.reduce((sum, m) => sum + m.points, 0);
    const arenaEvent = arenaEventSnap.data() || {};
    const arenaBonus = Math.max(0, readInt(arenaEvent.totalPoints, 0));
    const totalPoints = leaguePoints + arenaBonus;
    if (totalPoints < goal) {
      return { ok: true, claimed: false, status: 'not_ready', progress: totalPoints, goal };
    }
    const existingReachedAt = Math.max(0, readInt(eventSnap.data()?.firstReachedAt, 0));
    const groupCreatedAt = Math.max(0, readInt(group.createdAt, 0));
    const firstReachedAt = existingReachedAt || now;
    const completedInMs = groupCreatedAt > 0 ? Math.max(0, firstReachedAt - groupCreatedAt) : null;

    members.sort((a, b) => b.points - a.points);
    const winner = members[0];
    const crown = winner
      ? {
        uid: winner.uid,
        name: winner.name,
        weekId,
        groupId,
        leagueId,
        expiresAt,
        aura: CROWN_AURA,
      }
      : null;

    if (crown) {
      const existingExpiresAt = Math.max(0, readInt(eventSnap.data()?.expiresAt, 0));
      const finalExpiresAt = Math.max(existingExpiresAt, expiresAt);
      tx.set(eventRef, {
        ...crown,
        expiresAt: finalExpiresAt,
        firstReachedAt,
        completedInMs,
        roomPoints: totalPoints,
        goal,
        memberCount: members.length,
        leaguePoints,
        arenaBonus,
        updatedAt: now,
      }, { merge: true });
      tx.set(db.collection('league_crowns').doc(crownDocId(crown.uid, weekId)), {
        ...crown,
        expiresAt: finalExpiresAt,
        nickColor: CROWN_NICK_COLOR,
        updatedAt: now,
      }, { merge: true });
      tx.set(db.collection('leaderboard').doc(crown.uid), {
        leagueCrownExpiresAt: finalExpiresAt,
        leagueCrownWeekId: crown.weekId,
        leagueCrownGroupId: crown.groupId,
        leagueCrownAura: crown.aura,
      }, { merge: true });
    }

    const arenaMembers = arenaEvent.members && typeof arenaEvent.members === 'object'
      ? arenaEvent.members as Record<string, Record<string, unknown>>
      : {};
    const myContribution = Math.max(0, readInt(membersRaw[stableUid]?.points, 0))
      + Math.max(0, readInt(arenaMembers[stableUid]?.points, 0));
    if (myContribution < MIN_CONTRIBUTION) {
      return { ok: true, claimed: false, status: 'low_contribution', crown };
    }

    if (claimSnap.exists) {
      return { ok: true, claimed: true, alreadyClaimed: true, crown };
    }

    const user = userSnap.data() || {};
    const beforeShards = Math.max(0, readInt(user.shards, 0));
    const afterShards = beforeShards + SHARDS_REWARD;
    const shield = parseShield(user.chain_shield);
    const today = new Date().toISOString().split('T')[0];

    tx.set(claimRef, {
      uid: stableUid,
      authUid,
      weekId,
      groupId,
      leagueId,
      contribution: myContribution,
      roomPoints: totalPoints,
      goal,
      shards: SHARDS_REWARD,
      energyRecoveryMs: ENERGY_MS,
      xpOverrideMultiplier: 2,
      xpOverrideUses: 3,
      streakShieldCount: 1,
      expiresAt,
      createdAt: now,
    });

    tx.set(userRef, {
      shards: afterShards,
      shards_updated_at_ms: now,
      shards_updated_op: 'earn',
      shards_updated_reason: 'league_chest',
      chain_shield: JSON.stringify({ daysLeft: shield.daysLeft + 1, grantedAt: today }),
      updatedAt: now,
    }, { merge: true });
    tx.set(userRef.collection('shard_log').doc(), {
      ts: new Date(now).toISOString(),
      type: 'earn',
      amount: SHARDS_REWARD,
      reason: 'league_chest',
      balanceBefore: beforeShards,
      balanceAfter: afterShards,
      weekId,
      groupId,
    });

    return {
      ok: true,
      claimed: true,
      crown,
      balance: afterShards,
      rewards: {
        shards: SHARDS_REWARD,
        energyRecoveryMs: ENERGY_MS,
        xpOverrideMultiplier: 2,
        xpOverrideUses: 3,
        streakShieldCount: 1,
        expiresAt,
      },
    };
  });
});
