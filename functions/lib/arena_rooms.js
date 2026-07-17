"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.arenaRoomClose = exports.arenaRoomKick = exports.arenaRoomSetReady = exports.arenaRoomLeave = exports.arenaRoomJoin = exports.arenaPulsePublish = exports.arenaRoomRecordRun = exports.arenaRoomCreate = void 0;
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("node:crypto"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const ROOM_IDLE_TTL_MS = 2 * 60 * 60 * 1000; // 2ч без активности → авто-закрытие
const QUESTIONS_PER_ROOM = 10;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_SCORE_PER_QUESTION = 195;
const MAX_ROOM_MEMBERS = 20;
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
function readInt(value, fallback = 0) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? n : fallback;
}
function cleanText(value, fallback = '', max = 120) {
    const s = String(value ?? fallback).replace(/\s+/g, ' ').trim();
    return (s || fallback).slice(0, max);
}
function cleanName(value) {
    return cleanText(value, 'Phraseman', 80);
}
function cleanCode(value) {
    return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
}
function makeRoomCode() {
    let s = '';
    for (let i = 0; i < 4; i += 1) {
        s += ROOM_CODE_ALPHABET[crypto.randomInt(0, ROOM_CODE_ALPHABET.length)];
    }
    return s;
}
function normalizeQuestion(raw, id) {
    const options = Array.isArray(raw.options) ? raw.options.map((x) => String(x)).slice(0, 4) : [];
    if (options.length !== 4)
        return null;
    const correct = String(raw.correct ?? '');
    if (!correct || !options.includes(correct))
        return null;
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
async function resolveStableUid(db, authUid) {
    const direct = await db.collection('users').doc(authUid).get().catch(() => null);
    if (direct?.exists)
        return authUid;
    const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
    if (!byAuth.empty)
        return byAuth.docs[0].id;
    return authUid;
}
async function assertNotBanned(db, stableUid) {
    const [userSnap, bannedSnap] = await Promise.all([
        db.collection('users').doc(stableUid).get().catch(() => null),
        db.collection('banned_users').doc(stableUid).get().catch(() => null),
    ]);
    if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
        throw new https_1.HttpsError('permission-denied', 'user_banned');
    }
}
async function fetchRoomQuestions(db) {
    const pivot = Math.random();
    const col = db.collection('arena_questions');
    const [snapA, snapB] = await Promise.all([
        col.where('level', '==', 'A1').where('rand', '>=', pivot).orderBy('rand').limit(QUESTIONS_PER_ROOM * 3).get().catch(() => null),
        col.where('level', '==', 'A1').where('rand', '<', pivot).orderBy('rand').limit(QUESTIONS_PER_ROOM * 3).get().catch(() => null),
    ]);
    let docs = [...(snapA?.docs ?? []), ...(snapB?.docs ?? [])];
    // Страховка: A1 исторически без поля `rand` → rand-запрос возвращал 0 и комната
    // падала в FALLBACK_ROOM_QUESTIONS (3 вопроса по кругу). Добираем простым
    // запросом по level. Backfill rand (scripts/backfill_rand_a1_firestore.mjs) чинит причину.
    if (docs.length < QUESTIONS_PER_ROOM) {
        const plain = await col.where('level', '==', 'A1').limit(QUESTIONS_PER_ROOM * 3).get().catch(() => null);
        const seen = new Set(docs.map((d) => d.id));
        docs = [...docs, ...((plain?.docs ?? []).filter((d) => !seen.has(d.id)))];
    }
    // Дедуп по ВИДИМОМУ содержанию вопроса (текст + варианты + правильный), а не по
    // doc id: в банке `arena_questions` есть документы с разными id и полностью
    // одинаковым содержанием, из-за чего комната показывала визуально одинаковые
    // вопросы (баг «одинаковые вопросы 3–7»). Набор options в ключе → вопросы с одним
    // текстом, но разными вариантами (разные задания) не схлопываются.
    const seenContent = new Set();
    const questions = docs
        .map((doc) => normalizeQuestion(doc.data(), doc.id))
        .filter(Boolean)
        .filter((q) => {
        const text = (q.question ?? '').trim().toLowerCase();
        if (text === '')
            return true; // пустышки уникальны по id, не схлопываем
        const opts = (q.options ?? []).map((x) => String(x).trim().toLowerCase()).sort().join('¦');
        const key = `${text}||${opts}||${(q.correct ?? '').trim().toLowerCase()}`;
        if (seenContent.has(key))
            return false;
        seenContent.add(key);
        return true;
    })
        .sort(() => Math.random() - 0.5)
        .slice(0, QUESTIONS_PER_ROOM);
    return questions.length > 0 ? questions : FALLBACK_ROOM_QUESTIONS;
}
exports.arenaRoomCreate = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
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
            if (snap.exists)
                return null;
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
        if (created)
            return created;
    }
    throw new https_1.HttpsError('resource-exhausted', 'room_code_collision');
});
exports.arenaRoomRecordRun = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid);
    await assertNotBanned(db, stableUid);
    const code = cleanCode(request.data?.code);
    if (!code)
        throw new https_1.HttpsError('invalid-argument', 'room_code_required');
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
        if (!roomSnap.exists)
            throw new https_1.HttpsError('not-found', 'room_not_found');
        const room = roomSnap.data() || {};
        if (readInt(room.expiresAt, 0) < now)
            throw new https_1.HttpsError('failed-precondition', 'room_expired');
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
exports.arenaPulsePublish = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid);
    await assertNotBanned(db, stableUid);
    const kind = String(request.data?.kind ?? '');
    if (!['ghost', 'hill', 'league', 'club', 'room'].includes(kind)) {
        throw new https_1.HttpsError('invalid-argument', 'invalid_pulse_kind');
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
async function getRoomOrThrow(db, code) {
    const snap = await db.collection('arena_rooms_live').doc(code).get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'room_not_found');
    const room = snap.data();
    if (readInt(room.expiresAt, 0) < Date.now())
        throw new https_1.HttpsError('failed-precondition', 'room_expired');
    if (room.status === 'closed')
        throw new https_1.HttpsError('failed-precondition', 'room_closed');
    return { ref: snap.ref, room };
}
// ─── arenaRoomJoin — войти в комнату ─────────────────────────────────────────
exports.arenaRoomJoin = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUid(db, authUid);
    await assertNotBanned(db, stableUid);
    const code = cleanCode(request.data?.code);
    if (!code)
        throw new https_1.HttpsError('invalid-argument', 'code_required');
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
            throw new https_1.HttpsError('resource-exhausted', 'room_full');
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
exports.arenaRoomLeave = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const code = cleanCode(request.data?.code);
    if (!code)
        throw new https_1.HttpsError('invalid-argument', 'code_required');
    const memberRef = db.collection('arena_room_members').doc(`${code}_${authUid}`);
    await memberRef.set({ active: false, ready: false, updatedAt: Date.now() }, { merge: true });
    return { ok: true };
});
// ─── arenaRoomSetReady — переключить готовность ──────────────────────────────
exports.arenaRoomSetReady = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const code = cleanCode(request.data?.code);
    if (!code)
        throw new https_1.HttpsError('invalid-argument', 'code_required');
    const ready = Boolean(request.data?.ready);
    await getRoomOrThrow(db, code);
    const memberRef = db.collection('arena_room_members').doc(`${code}_${authUid}`);
    const snap = await memberRef.get();
    if (!snap.exists || !snap.data()?.active)
        throw new https_1.HttpsError('not-found', 'member_not_found');
    await memberRef.set({ ready, updatedAt: Date.now() }, { merge: true });
    return { ok: true, ready };
});
// ─── arenaRoomKick — кикнуть участника (только хост) ────────────────────────
exports.arenaRoomKick = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const code = cleanCode(request.data?.code);
    const targetUid = cleanText(request.data?.targetUid, '', 128);
    if (!code || !targetUid)
        throw new https_1.HttpsError('invalid-argument', 'code_and_target_required');
    const { room } = await getRoomOrThrow(db, code);
    if (room.ownerUid !== authUid)
        throw new https_1.HttpsError('permission-denied', 'host_only');
    if (targetUid === authUid)
        throw new https_1.HttpsError('invalid-argument', 'cannot_kick_self');
    const memberRef = db.collection('arena_room_members').doc(`${code}_${targetUid}`);
    await memberRef.set({ active: false, ready: false, kicked: true, updatedAt: Date.now() }, { merge: true });
    return { ok: true };
});
// ─── arenaRoomClose — закрыть комнату (только хост) ─────────────────────────
exports.arenaRoomClose = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const code = cleanCode(request.data?.code);
    if (!code)
        throw new https_1.HttpsError('invalid-argument', 'code_required');
    const roomRef = db.collection('arena_rooms_live').doc(code);
    const snap = await roomRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'room_not_found');
    if (snap.data()?.ownerUid !== authUid)
        throw new https_1.HttpsError('permission-denied', 'host_only');
    await roomRef.set({ status: 'closed', closedAt: Date.now() }, { merge: true });
    // Деактивируем всех участников
    const membersSnap = await db.collection('arena_room_members').where('code', '==', code).where('active', '==', true).get();
    const batch = db.batch();
    membersSnap.docs.forEach(d => batch.set(d.ref, { active: false, ready: false }, { merge: true }));
    await batch.commit();
    return { ok: true };
});
//# sourceMappingURL=arena_rooms.js.map