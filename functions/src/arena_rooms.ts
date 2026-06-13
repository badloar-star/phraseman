import * as admin from 'firebase-admin';
import * as crypto from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const ROOM_IDLE_TTL_MS = 2 * 60 * 60 * 1000; // 2ч без активности → авто-закрытие
const QUESTIONS_PER_ROOM = 10;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_SCORE_PER_QUESTION = 195;
const MAX_ROOM_MEMBERS = 20;
const CHAT_MSG_MAX_LEN = 300;
const CHAT_RATE_MS = 5_000;

type ArenaPulseKind = 'ghost' | 'hill' | 'league' | 'club' | 'room';

const FALLBACK_ROOM_QUESTIONS = [
  {
    id: 'room_fallback_1',
    level: 'A1',
    type: 'choose',
    task: 'Complete the sentence',
    question: 'Please look ___ the picture.',
    options: ['in', 'to', 'on', 'at'],
    correct: 'at',
    rule: 'look at + object',
  },
  {
    id: 'room_fallback_2',
    level: 'A1',
    type: 'choose',
    task: 'Choose the correct option',
    question: 'I get ___ at 7 AM.',
    options: ['up', 'off', 'in', 'down'],
    correct: 'up',
    rule: 'get up = wake up and leave bed',
  },
  {
    id: 'room_fallback_3',
    level: 'A1',
    type: 'choose',
    task: 'Choose the correct option',
    question: 'She is good ___ English.',
    options: ['at', 'in', 'on', 'to'],
    correct: 'at',
    rule: 'good at + skill',
  },
];

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value: unknown, fallback = '', max = 120): string {
  const s = String(value ?? fallback).replace(/\s+/g, ' ').trim();
  return (s || fallback).slice(0, max);
}

function cleanName(value: unknown): string {
  return cleanText(value, 'Phraseman', 80);
}

function cleanCode(value: unknown): string {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
}

function makeRoomCode(): string {
  let s = '';
  for (let i = 0; i < 4; i += 1) {
    s += ROOM_CODE_ALPHABET[crypto.randomInt(0, ROOM_CODE_ALPHABET.length)];
  }
  return s;
}

function normalizeQuestion(raw: FirebaseFirestore.DocumentData, id: string) {
  const options = Array.isArray(raw.options) ? raw.options.map((x) => String(x)).slice(0, 4) : [];
  if (options.length !== 4) return null;
  const correct = String(raw.correct ?? '');
  if (!correct || !options.includes(correct)) return null;
  return {
    id: String(raw.id ?? id),
    level: String(raw.level ?? 'A1'),
    ...(raw.type ? { type: String(raw.type) } : {}),
    ...(raw.task ? { task: String(raw.task).slice(0, 160) } : {}),
    question: String(raw.question ?? '').slice(0, 300),
    options,
    correct,
    rule: String(raw.rule ?? '').slice(0, 500),
    ...(raw.source ? { source: String(raw.source).slice(0, 80) } : {}),
  };
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

async function fetchRoomQuestions(db: FirebaseFirestore.Firestore) {
  const pivot = Math.random();
  const col = db.collection('arena_questions');
  const [snapA, snapB] = await Promise.all([
    col.where('level', '==', 'A1').where('rand', '>=', pivot).orderBy('rand').limit(QUESTIONS_PER_ROOM * 3).get().catch(() => null),
    col.where('level', '==', 'A1').where('rand', '<', pivot).orderBy('rand').limit(QUESTIONS_PER_ROOM * 3).get().catch(() => null),
  ]);
  const docs = [...(snapA?.docs ?? []), ...(snapB?.docs ?? [])];
  const questions = docs
    .map((doc) => normalizeQuestion(doc.data(), doc.id))
    .filter(Boolean)
    .sort(() => Math.random() - 0.5)
    .slice(0, QUESTIONS_PER_ROOM);
  return questions.length > 0 ? questions : FALLBACK_ROOM_QUESTIONS;
}

export const arenaRoomCreate = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const ownerName = cleanName(request.data?.ownerName);
  const title = cleanText(request.data?.title, `${ownerName} Arena Room`, 80);
  const questions = await fetchRoomQuestions(db);
  const now = Date.now();

  for (let i = 0; i < 10; i += 1) {
    const code = makeRoomCode();
    const ref = db.collection('arena_rooms_live').doc(code);
    // eslint-disable-next-line no-await-in-loop
    const created = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return null;
      const room = {
        code,
        ownerUid: authUid,
        ownerStableUid: stableUid,
        ownerName,
        title,
        questionSnapshots: questions,
        createdAt: now,
        expiresAt: now + ROOM_TTL_MS,
        playCount: 0,
      };
      tx.set(ref, room);
      return room;
    });
    if (created) return created;
  }
  throw new HttpsError('resource-exhausted', 'room_code_collision');
});

export const arenaRoomRecordRun = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const code = cleanCode(request.data?.code);
  if (!code) throw new HttpsError('invalid-argument', 'room_code_required');
  const roomRef = db.collection('arena_rooms_live').doc(code);
  const runRef = db.collection('arena_room_runs').doc(`${code}_${authUid}`);
  const userName = cleanName(request.data?.userName);
  const total = Math.max(0, Math.min(QUESTIONS_PER_ROOM, readInt(request.data?.total, 0)));
  const correct = Math.max(0, Math.min(total, readInt(request.data?.correct, 0)));
  const score = Math.max(0, Math.min(total * MAX_SCORE_PER_QUESTION, readInt(request.data?.score, 0)));
  const timeMs = Math.max(0, Math.min(ROOM_TTL_MS, readInt(request.data?.timeMs, 0)));
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [roomSnap, prevSnap] = await Promise.all([tx.get(roomRef), tx.get(runRef)]);
    if (!roomSnap.exists) throw new HttpsError('not-found', 'room_not_found');
    const room = roomSnap.data() || {};
    if (readInt(room.expiresAt, 0) < now) throw new HttpsError('failed-precondition', 'room_expired');
    const prevScore = Math.max(0, readInt(prevSnap.data()?.score, 0));
    if (prevSnap.exists && prevScore >= score) {
      return { ok: true, duplicate: true, score: prevScore };
    }
    tx.set(runRef, {
      code,
      userId: authUid,
      stableUid,
      userName,
      score,
      correct,
      total,
      timeMs,
      finishedAt: now,
    });
    tx.set(roomRef, {
      playCount: admin.firestore.FieldValue.increment(prevSnap.exists ? 0 : 1),
      updatedAt: now,
    }, { merge: true });
    return { ok: true, score };
  });
});

export const arenaPulsePublish = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const kind = String(request.data?.kind ?? '') as ArenaPulseKind;
  if (!['ghost', 'hill', 'league', 'club', 'room'].includes(kind)) {
    throw new HttpsError('invalid-argument', 'invalid_pulse_kind');
  }
  const code = cleanCode(request.data?.code);
  const payload = {
    kind,
    title: cleanText(request.data?.title, kind, 80),
    ...(request.data?.subtitle ? { subtitle: cleanText(request.data.subtitle, '', 120) } : {}),
    ...(request.data?.actorName ? { actorName: cleanName(request.data.actorName) } : {}),
    ...(typeof request.data?.score === 'number' ? { score: Math.max(0, Math.min(20000, readInt(request.data.score, 0))) } : {}),
    ...(typeof request.data?.points === 'number' ? { points: Math.max(0, Math.min(50000, readInt(request.data.points, 0))) } : {}),
    ...(code ? { code } : {}),
    authUid,
    stableUid,
    createdAt: Date.now(),
  };
  const ref = await db.collection('arena_pulse_events').add(payload);
  return { ok: true, id: ref.id };
});

// ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ КОМНАТ ──────────────────────────────────────

async function getRoomOrThrow(db: FirebaseFirestore.Firestore, code: string) {
  const snap = await db.collection('arena_rooms_live').doc(code).get();
  if (!snap.exists) throw new HttpsError('not-found', 'room_not_found');
  const room = snap.data()!;
  if (readInt(room.expiresAt, 0) < Date.now()) throw new HttpsError('failed-precondition', 'room_expired');
  if (room.status === 'closed') throw new HttpsError('failed-precondition', 'room_closed');
  return { ref: snap.ref, room };
}

// ─── arenaRoomJoin — войти в комнату ─────────────────────────────────────────
export const arenaRoomJoin = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const code = cleanCode(request.data?.code);
  if (!code) throw new HttpsError('invalid-argument', 'code_required');
  const userName = cleanName(request.data?.userName);
  const userAvatar = cleanText(request.data?.userAvatar, '', 20);

  const { ref: roomRef, room } = await getRoomOrThrow(db, code);

  const membersRef = db.collection('arena_room_members');
  const memberRef = membersRef.doc(`${code}_${authUid}`);

  const now = Date.now();
  await db.runTransaction(async (tx) => {
    // Re-read member doc inside transaction to prevent double-join races.
    const existingSnap = await tx.get(memberRef);
    if (existingSnap.exists && existingSnap.data()?.active === true) {
      // Already active member — idempotent: refresh updatedAt only.
      tx.set(memberRef, { updatedAt: now }, { merge: true });
      return;
    }

    // Count active members only when we are actually about to add a new one.
    const countSnap = await membersRef.where('code', '==', code).where('active', '==', true).count().get();
    if (countSnap.data().count >= MAX_ROOM_MEMBERS) {
      throw new HttpsError('resource-exhausted', 'room_full');
    }

    tx.set(memberRef, {
      code,
      authUid,
      stableUid,
      userName,
      userAvatar,
      isHost: room.ownerUid === authUid,
      ready: false,
      active: true,
      joinedAt: existingSnap.exists ? (existingSnap.data()?.joinedAt ?? now) : now,
      updatedAt: now,
    }, { merge: true });

    tx.set(roomRef, { updatedAt: now }, { merge: true });
  });

  return { ok: true };
});

// ─── arenaRoomLeave — выйти из комнаты ───────────────────────────────────────
export const arenaRoomLeave = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const code = cleanCode(request.data?.code);
  if (!code) throw new HttpsError('invalid-argument', 'code_required');

  const memberRef = db.collection('arena_room_members').doc(`${code}_${authUid}`);
  await memberRef.set({ active: false, ready: false, updatedAt: Date.now() }, { merge: true });
  return { ok: true };
});

// ─── arenaRoomSetReady — переключить готовность ──────────────────────────────
export const arenaRoomSetReady = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const code = cleanCode(request.data?.code);
  if (!code) throw new HttpsError('invalid-argument', 'code_required');
  const ready = Boolean(request.data?.ready);

  await getRoomOrThrow(db, code);

  const memberRef = db.collection('arena_room_members').doc(`${code}_${authUid}`);
  const snap = await memberRef.get();
  if (!snap.exists || !snap.data()?.active) throw new HttpsError('not-found', 'member_not_found');

  await memberRef.set({ ready, updatedAt: Date.now() }, { merge: true });
  return { ok: true, ready };
});

// ─── arenaRoomKick — кикнуть участника (только хост) ────────────────────────
export const arenaRoomKick = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const code = cleanCode(request.data?.code);
  const targetUid = cleanText(request.data?.targetUid, '', 128);
  if (!code || !targetUid) throw new HttpsError('invalid-argument', 'code_and_target_required');

  const { room } = await getRoomOrThrow(db, code);
  if (room.ownerUid !== authUid) throw new HttpsError('permission-denied', 'host_only');
  if (targetUid === authUid) throw new HttpsError('invalid-argument', 'cannot_kick_self');

  const memberRef = db.collection('arena_room_members').doc(`${code}_${targetUid}`);
  await memberRef.set({ active: false, ready: false, kicked: true, updatedAt: Date.now() }, { merge: true });
  return { ok: true };
});

// ─── arenaRoomClose — закрыть комнату (только хост) ─────────────────────────
export const arenaRoomClose = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const code = cleanCode(request.data?.code);
  if (!code) throw new HttpsError('invalid-argument', 'code_required');

  const roomRef = db.collection('arena_rooms_live').doc(code);
  const snap = await roomRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'room_not_found');
  if (snap.data()?.ownerUid !== authUid) throw new HttpsError('permission-denied', 'host_only');

  await roomRef.set({ status: 'closed', closedAt: Date.now() }, { merge: true });
  // Деактивируем всех участников
  const membersSnap = await db.collection('arena_room_members').where('code', '==', code).where('active', '==', true).get();
  const batch = db.batch();
  membersSnap.docs.forEach(d => batch.set(d.ref, { active: false, ready: false }, { merge: true }));
  await batch.commit();

  return { ok: true };
});

// ─── arenaRoomChatSend — отправить сообщение в чат комнаты ──────────────────
export const arenaRoomChatSend = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const code = cleanCode(request.data?.code);
  if (!code) throw new HttpsError('invalid-argument', 'code_required');
  const text = cleanText(request.data?.text, '', CHAT_MSG_MAX_LEN).trim();
  if (!text) throw new HttpsError('invalid-argument', 'text_required');

  // Проверяем что пользователь активный участник
  const memberRef = db.collection('arena_room_members').doc(`${code}_${authUid}`);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists || !memberSnap.data()?.active) {
    throw new HttpsError('permission-denied', 'not_a_member');
  }

  // Rate limit: не чаще раз в 5 секунд
  const rateLimitRef = db.collection('arena_room_chat_rate').doc(authUid);
  const now = Date.now();
  const rateSnap = await rateLimitRef.get();
  if (rateSnap.exists && now - readInt(rateSnap.data()?.lastSendAt, 0) < CHAT_RATE_MS) {
    throw new HttpsError('resource-exhausted', 'rate_limited');
  }
  await rateLimitRef.set({ lastSendAt: now }, { merge: true });

  // Простая блокировка ссылок
  const linkRe = /https?:\/\/|t\.me\/|discord\.gg\//i;
  if (linkRe.test(text)) throw new HttpsError('invalid-argument', 'links_not_allowed');

  const memberData = memberSnap.data()!;
  const msgRef = db.collection('arena_room_chat').doc(code).collection('messages').doc();
  await msgRef.set({
    code,
    authorUid: authUid,
    authorStableUid: stableUid,
    authorName: memberData.userName || cleanName(request.data?.userName),
    authorAvatar: memberData.userAvatar || '',
    text,
    createdAt: now,
    status: 'visible',
  });

  return { ok: true, id: msgRef.id };
});
