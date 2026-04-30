import * as admin from 'firebase-admin';
import { DuelSession, SessionPlayer } from './types';

const db = admin.firestore();

type LobbyChoice = 'none' | 'accept' | 'decline';

/**
 * Коли гравець змінює lobbyChoice, перевіряємо: усі accept → get_ready, хтось decline → aborted.
 */
export async function processLobbyAfterChoice(sessionId: string): Promise<void> {
  const sessionRef = db.collection('arena_sessions').doc(sessionId);

  await db.runTransaction(async (tx) => {
    const sSnap = await tx.get(sessionRef);
    if (!sSnap.exists) return;
    const session = sSnap.data() as DuelSession;
    if (session.state !== 'acceptance') return;

    const pids = session.playerIds;
    if (!pids?.length) return;

    let hasDecline = false;
    let allAccepted = true;
    for (const pid of pids) {
      const pSnap = await tx.get(
        db.collection('session_players').doc(`${sessionId}_${pid}`),
      );
      const ch: LobbyChoice = pSnap.exists
        ? (pSnap.data() as SessionPlayer & { lobbyChoice?: LobbyChoice }).lobbyChoice ?? 'none'
        : 'none';
      if (ch === 'decline') {
        hasDecline = true;
        allAccepted = false;
        break;
      }
      if (ch !== 'accept') {
        allAccepted = false;
      }
    }

    if (hasDecline) {
      const now = Date.now();
      tx.update(sessionRef, {
        state: 'aborted',
        abortReason: 'decline',
        abortedAt: now,
      });
      return;
    }
    if (allAccepted && pids.length > 0) {
      const now = Date.now();
      tx.update(sessionRef, {
        state: 'get_ready',
        getReadyEndsAt: now + 2500,
        getReadyStartedAt: now,
      });
    }
  });
}

/**
 * Сесії, що залишилися в acceptance після дедлайну.
 */
export async function expireStaleAcceptanceSessions(): Promise<void> {
  const now = Date.now();
  let snap: admin.firestore.QuerySnapshot;
  try {
    snap = await db
      .collection('arena_sessions')
      .where('state', '==', 'acceptance')
      .where('acceptDeadlineAt', '<=', now)
      .limit(20)
      .get();
  } catch {
    return;
  }
  for (const doc of snap.docs) {
    const ref = doc.ref;
    try {
      const cur = await ref.get();
      if (!cur.exists) continue;
      const d = cur.data() as DuelSession;
      if (d.state !== 'acceptance') continue;
      await ref.update({
        state: 'aborted',
        abortReason: 'accept_timeout',
        abortedAt: Date.now(),
      });
    } catch {
      // ignore
    }
  }
}
