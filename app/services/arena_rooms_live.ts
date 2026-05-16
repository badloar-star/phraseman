import { Share } from 'react-native';
import * as Linking from 'expo-linking';
import type { ArenaQuestion } from '../types/arena';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const QUESTIONS_PER_ROOM = __DEV__ ? 3 : 10;
const FUNCTIONS_REGION = 'us-central1';

export type ArenaLiveRoom = {
  code: string;
  ownerUid: string;
  ownerName: string;
  title: string;
  questionSnapshots: ArenaQuestion[];
  createdAt: number;
  expiresAt: number;
  playCount?: number;
  status?: 'open' | 'closed';
};

export type ArenaRoomRun = {
  id: string;
  code: string;
  userId: string;
  userName: string;
  score: number;
  correct: number;
  total: number;
  timeMs: number;
  finishedAt: number;
};

export type ArenaRoomMember = {
  id: string;
  code: string;
  authUid: string;
  userName: string;
  userAvatar?: string;
  isHost: boolean;
  ready: boolean;
  active: boolean;
  kicked?: boolean;
  joinedAt: number;
};

export type ArenaRoomChatMessage = {
  id: string;
  code: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: number;
  status: 'visible' | 'blocked';
};

const FALLBACK_ROOM_QUESTIONS: ArenaQuestion[] = [
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

function cleanName(name: string | null | undefined): string {
  const s = String(name ?? '').replace(/\s+/g, ' ').trim();
  return (s || 'Phraseman').slice(0, 80);
}

function cleanCode(code: string): string {
  return String(code ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
}

function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i += 1) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getFirestoreModule(): any | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default;
  } catch {
    return null;
  }
}

function getDb(): any | null {
  return getFirestoreModule()?.() ?? null;
}

function callable<TReq, TRes>(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

function cleanQuestion(q: ArenaQuestion): ArenaQuestion {
  return {
    id: String(q.id),
    level: q.level,
    ...(q.type ? { type: q.type } : {}),
    ...(q.task ? { task: q.task } : {}),
    question: String(q.question),
    options: q.options,
    correct: String(q.correct),
    rule: String(q.rule ?? ''),
    ...(q.source ? { source: q.source } : {}),
  };
}

export async function fetchArenaRoomQuestions(): Promise<ArenaQuestion[]> {
  try {
    const db = getDb();
    if (!db) return FALLBACK_ROOM_QUESTIONS;
    const pivot = Math.random();
    const col = db.collection('arena_questions');
    const [snapA, snapB] = await Promise.all([
      col.where('level', '==', 'A1').where('rand', '>=', pivot).orderBy('rand').limit(QUESTIONS_PER_ROOM * 4).get(),
      col.where('level', '==', 'A1').where('rand', '<', pivot).orderBy('rand').limit(QUESTIONS_PER_ROOM * 4).get(),
    ]);
    const all = [
      ...snapA.docs.map((d: any) => cleanQuestion({ ...(d.data() as ArenaQuestion), id: (d.data() as ArenaQuestion).id || d.id })),
      ...snapB.docs.map((d: any) => cleanQuestion({ ...(d.data() as ArenaQuestion), id: (d.data() as ArenaQuestion).id || d.id })),
    ];
    const picked = shuffleArray(all).slice(0, QUESTIONS_PER_ROOM);
    return picked.length > 0 ? picked : FALLBACK_ROOM_QUESTIONS;
  } catch {
    return FALLBACK_ROOM_QUESTIONS;
  }
}

export async function createArenaLiveRoom(params: {
  ownerUid: string;
  ownerName: string;
  title?: string;
}): Promise<ArenaLiveRoom> {
  const db = getDb();
  if (!db) throw new Error('firebase_unavailable');
  const fn = callable<{ ownerName: string; title?: string }, ArenaLiveRoom>('arenaRoomCreate');
  const { data } = await fn({
    ownerName: cleanName(params.ownerName),
    title: cleanName(params.title || `${cleanName(params.ownerName)} Arena Room`),
  });
  return data;
}

export async function getArenaLiveRoom(code: string): Promise<ArenaLiveRoom | null> {
  const db = getDb();
  if (!db) return null;
  const roomCode = cleanCode(code);
  if (!roomCode) return null;
  const snap = await db.collection('arena_rooms_live').doc(roomCode).get();
  if (!snap.exists) return null;
  const room = snap.data() as ArenaLiveRoom;
  if (typeof room.expiresAt === 'number' && room.expiresAt < Date.now()) return null;
  return { ...room, code: snap.id };
}

export function subscribeArenaRoomRuns(code: string, cb: (runs: ArenaRoomRun[]) => void): () => void {
  const db = getDb();
  const roomCode = cleanCode(code);
  if (!db || !roomCode) {
    cb([]);
    return () => {};
  }
  return db.collection('arena_room_runs')
    .where('code', '==', roomCode)
    .orderBy('score', 'desc')
    .limit(50)
    .onSnapshot(
      (snap: any) => cb(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<ArenaRoomRun, 'id'>) }))),
      () => cb([]),
    );
}

export async function recordArenaRoomRun(params: {
  code: string;
  userId: string;
  userName: string;
  score: number;
  correct: number;
  total: number;
  timeMs: number;
}): Promise<void> {
  const firestore = getFirestoreModule();
  const db = firestore?.() ?? null;
  if (!db || !firestore) return;
  const code = cleanCode(params.code);
  if (!code || !params.userId) return;
  const fn = callable<{
    code: string;
    userName: string;
    score: number;
    correct: number;
    total: number;
    timeMs: number;
  }, { ok: boolean; score?: number }>('arenaRoomRecordRun');
  await fn({
    code,
    userName: cleanName(params.userName),
    score: Math.max(0, Math.floor(Number(params.score) || 0)),
    correct: Math.max(0, Math.floor(Number(params.correct) || 0)),
    total: Math.max(0, Math.floor(Number(params.total) || 0)),
    timeMs: Math.max(0, Math.floor(Number(params.timeMs) || 0)),
  });
}

// ─── Подписки на участников комнаты ──────────────────────────────────────────

export function subscribeArenaRoomMembers(
  code: string,
  cb: (members: ArenaRoomMember[]) => void,
): () => void {
  const db = getDb();
  const roomCode = cleanCode(code);
  if (!db || !roomCode) { cb([]); return () => {}; }
  return db.collection('arena_room_members')
    .where('code', '==', roomCode)
    .where('active', '==', true)
    .onSnapshot(
      (snap: any) => cb(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<ArenaRoomMember, 'id'>) }))),
      () => cb([]),
    );
}

export function subscribeArenaRoomDoc(
  code: string,
  cb: (room: ArenaLiveRoom | null) => void,
): () => void {
  const db = getDb();
  const roomCode = cleanCode(code);
  if (!db || !roomCode) { cb(null); return () => {}; }
  return db.collection('arena_rooms_live').doc(roomCode).onSnapshot(
    (snap: any) => {
      if (!snap.exists) { cb(null); return; }
      const data = snap.data() as ArenaLiveRoom;
      cb({ ...data, code: snap.id });
    },
    () => cb(null),
  );
}

export function subscribeArenaRoomChat(
  code: string,
  cb: (messages: ArenaRoomChatMessage[]) => void,
): () => void {
  const db = getDb();
  const roomCode = cleanCode(code);
  if (!db || !roomCode) { cb([]); return () => {}; }
  return db.collection('arena_room_chat').doc(roomCode).collection('messages')
    .where('status', '==', 'visible')
    .orderBy('createdAt', 'asc')
    .limitToLast(80)
    .onSnapshot(
      (snap: any) => cb(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<ArenaRoomChatMessage, 'id'>) }))),
      () => cb([]),
    );
}

// ─── Вызовы Cloud Functions ───────────────────────────────────────────────────

export async function joinArenaRoom(params: { code: string; userName: string; userAvatar?: string }): Promise<void> {
  const db = getDb();
  if (!db) return;
  const fn = callable<{ code: string; userName: string; userAvatar?: string }, { ok: boolean }>('arenaRoomJoin');
  await fn({ code: cleanCode(params.code), userName: params.userName, userAvatar: params.userAvatar || '' });
}

export async function leaveArenaRoom(code: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const fn = callable<{ code: string }, { ok: boolean }>('arenaRoomLeave');
  await fn({ code: cleanCode(code) }).catch(() => {});
}

export async function setArenaRoomReady(code: string, ready: boolean): Promise<void> {
  const db = getDb();
  if (!db) return;
  const fn = callable<{ code: string; ready: boolean }, { ok: boolean }>('arenaRoomSetReady');
  await fn({ code: cleanCode(code), ready });
}

export async function kickArenaRoomMember(code: string, targetUid: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const fn = callable<{ code: string; targetUid: string }, { ok: boolean }>('arenaRoomKick');
  await fn({ code: cleanCode(code), targetUid });
}

export async function closeArenaRoom(code: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const fn = callable<{ code: string }, { ok: boolean }>('arenaRoomClose');
  await fn({ code: cleanCode(code) });
}

export async function sendArenaRoomChatMessage(code: string, text: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const fn = callable<{ code: string; text: string }, { ok: boolean }>('arenaRoomChatSend');
  await fn({ code: cleanCode(code), text: text.slice(0, 300) });
}

export async function shareArenaLiveRoom(room: ArenaLiveRoom, lang: string): Promise<void> {
  const url = Linking.createURL('arena_room', { queryParams: { code: room.code } });
  const message = lang === 'es'
    ? `Join my Arena room ${room.code}. Can you top the leaderboard?\n${url}`
    : lang === 'uk'
      ? `Заходь у мою кімнату Арени ${room.code}. Зможеш очолити таблицю?\n${url}`
      : `Заходи в мою комнату Арены ${room.code}. Сможешь возглавить таблицу?\n${url}`;
  await Share.share({ message }).catch(() => {});
}
