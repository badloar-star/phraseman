// ═══════════════════════════════════════════════════════════════════════════
// spire_room_client.ts — комната недели Шпиля: вход (spireJoinRoom) + чтение
// документа spire_groups/{id} с кэшем 6 часов (пакет B).
//
// зачем (SPIRE_PLAN §2–§4, TOWER_CONTRACT §2): чужие цифры редкие, свои — живые и
// локальные. Поэтому:
//   • вход в комнату — ОДИН callable в неделю на язык (groupId кэшируется);
//   • документ комнаты — 1 чтение не чаще раза в 6 часов и только при заходе на
//     экран Шпиля; force — только жест пользователя (как forceRemote у лиги);
//   • ни листингов коллекций, ни подписок: боты считаются формулой на устройстве.
// Всё только за SpireLiveGate: сервер spireJoinRoom флаг Шпиля не проверяет.
//
// СПЕРВА ЛОГИ: префикс [SPIRE] — откуда данные (память/кэш/сеть), каждый ранний
// выход и каждая ошибка с причиной.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  spireDecodeRoomMembers,
  spireDecodeRoster,
  type SpireRoomSnapshot,
} from '../../modules/spire/room_rows';
import type { SpireLang } from '../../modules/spire/report_queue';
import { spireCohortDay, spireWeekStartMs } from '../../modules/spire/residents';
import { spireCurrentWeekKey } from '../../components/spire/spire_tower_model';
import { peekCoinRank } from '../coin_rank_state_v1';
import { DebugLogger } from '../debug-logger';
import { onAccountOwnerChanged } from '../account_owner_change';
import type { SpireLiveGate } from './spire_live_gate';
import {
  spireCall,
  spireClassifyNetError,
  spireCloudAvailable,
  spireErrorText,
  spireFirestore,
  type SpireNetFailure,
} from './spire_net';

const LOG = '[SPIRE]';
const CACHE_PREFIX = 'spire_room_cache_v1';
const PARTICIPATION_PREFIX = 'spire_participation_v1';
/** Тот же принцип, что у конфига и лиги: чужие цифры — не чаще раза в 6 часов. */
export const SPIRE_ROOM_REFRESH_MS = 6 * 60 * 60 * 1000;
const PARTICIPATION_KEEP = 3;
const ROOM_SCHEMA = 'spire-room-cache.v1' as const;

export type SpireRoomLoad = Readonly<{
  status: 'network' | 'cache' | 'offline' | 'paused' | 'unavailable';
  room: SpireRoomSnapshot | null;
  reason: string;
}>;

type JoinResponse = Readonly<{ ok?: boolean; groupId?: unknown; weekId?: unknown; tier?: unknown; cohortDay?: unknown }>;

const memory = new Map<string, SpireRoomSnapshot>();
const inFlight = new Map<string, Promise<SpireRoomLoad>>();
// зачем (R39): комната прошлого владельца не нужна в памяти после выхода/смены аккаунта (ключи по uid, но держать чужое незачем)
onAccountOwnerChanged('spire_room_client', () => {
  DebugLogger.info('[SPIRE]', `owner_changed: комнат в памяти сброшено=${memory.size}, запросов в полёте=${inFlight.size}`);
  memory.clear();
  inFlight.clear();
});

const cacheKey = (uid: string, lang: SpireLang) => `${CACHE_PREFIX}:${uid}:${lang}`;
const participationKey = (uid: string, lang: SpireLang) => `${PARTICIPATION_PREFIX}:${uid}:${lang}`;

function isSnapshot(value: unknown): value is SpireRoomSnapshot {
  const v = value as Partial<SpireRoomSnapshot> | null;
  return !!v && v.schema === ROOM_SCHEMA && typeof v.groupId === 'string' && typeof v.weekId === 'string'
    && Array.isArray(v.members) && Array.isArray(v.roster) && typeof v.fetchedAtMs === 'number';
}

/** Синхронно: комната текущей недели из памяти процесса — первый кадр без спиннера. */
export function peekSpireRoom(uid: string, lang: SpireLang): SpireRoomSnapshot | null {
  const room = memory.get(cacheKey(uid, lang)) ?? null;
  return room && room.weekId === spireCurrentWeekKey(Date.now()) ? room : null;
}

/** Кэш комнаты с диска (любой недели — вызывающий сам сверяет weekId). */
export async function spireReadRoomCache(uid: string, lang: SpireLang): Promise<SpireRoomSnapshot | null> {
  const key = cacheKey(uid, lang);
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSnapshot(parsed)) {
      DebugLogger.warn(LOG, `room cache: запись ${key} чужой схемы — игнорируем`);
      return null;
    }
    memory.set(key, parsed);
    return parsed;
  } catch (error) {
    DebugLogger.warn(LOG, `room cache: не прочиталась (${spireErrorText(error)})`);
    return null;
  }
}

async function writeCache(room: SpireRoomSnapshot): Promise<void> {
  const key = cacheKey(room.uid, room.lang as SpireLang);
  memory.set(key, room);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(room));
  } catch (error) {
    DebugLogger.warn(LOG, `room cache: не сохранилась, живём из памяти (${spireErrorText(error)})`);
  }
}

/** Недели, в которых человек сидел в комнате (для итога недели: не читаем чужие недели зря). */
export async function spireReadParticipation(uid: string, lang: SpireLang): Promise<readonly string[]> {
  try {
    const raw = await AsyncStorage.getItem(participationKey(uid, lang));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((w): w is string => typeof w === 'string') : [];
  } catch (error) {
    DebugLogger.warn(LOG, `participation: не прочиталась (${spireErrorText(error)})`);
    return [];
  }
}

async function markParticipation(uid: string, lang: SpireLang, weekId: string): Promise<void> {
  const prev = await spireReadParticipation(uid, lang);
  if (prev.includes(weekId)) return;
  const next = [weekId, ...prev].slice(0, PARTICIPATION_KEEP);
  try {
    await AsyncStorage.setItem(participationKey(uid, lang), JSON.stringify(next));
  } catch (error) {
    DebugLogger.warn(LOG, `participation: не сохранилась (${spireErrorText(error)})`);
  }
}

type RoomIdentity = Readonly<{ groupId: string; tier: number; cohortDay: number }>;

async function joinRoom(gate: SpireLiveGate, input: Readonly<{ stableId: string; lang: SpireLang; weekId: string }>): Promise<RoomIdentity> {
  DebugLogger.info(LOG, `room: spireJoinRoom lang=${input.lang} week=${input.weekId}`);
  // зачем (владелец 13.10, аватар-монета у соперников): свой ранг монеты — в строку комнаты; сервер берёт только 0…19.
  const coinRank = peekCoinRank(input.stableId);
  const res = await spireCall<Readonly<Record<string, unknown>>, JoinResponse>(gate, 'spireJoinRoom', {
    lang: input.lang,
    weekId: input.weekId,
    stableId: input.stableId,
    ...(coinRank !== null ? { member: { coinRank } } : {}),
  });
  if (!res || res.ok !== true || typeof res.groupId !== 'string' || !res.groupId) {
    throw new Error(`spire_join_bad_response:${JSON.stringify(res ?? null).slice(0, 120)}`);
  }
  if (res.weekId !== input.weekId) throw new Error(`stale_week:${String(res.weekId)}`);
  return { groupId: res.groupId, tier: Math.max(0, Math.trunc(Number(res.tier)) || 0), cohortDay: Math.trunc(Number(res.cohortDay)) || 0 };
}

async function readRoomDoc(gate: SpireLiveGate, groupId: string): Promise<Record<string, unknown> | null> {
  const db = spireFirestore(gate, 'room:get');
  if (!db) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snap = await (db as any).collection('spire_groups').doc(groupId).get(); // guard-ok: один документ по id, не листинг
  return snap?.exists ? (snap.data() as Record<string, unknown>) : null;
}

export type SpireSyncRoomInput = Readonly<{ uid: string; stableId: string; lang: SpireLang; force?: boolean }>;

/**
 * Комната текущей недели: свежий кэш (<6 ч) → без сети; иначе вход (раз в неделю)
 * + одно чтение документа. Сбой сети → последний кэш этой недели и status 'offline'.
 */
export function spireSyncRoom(gate: SpireLiveGate, input: SpireSyncRoomInput): Promise<SpireRoomLoad> {
  const key = cacheKey(input.uid, input.lang);
  const running = inFlight.get(key);
  if (running) {
    DebugLogger.info(LOG, `room: синхронизация ${input.lang} уже идёт — присоединяемся`);
    return running;
  }
  const task = runSync(gate, input).finally(() => { inFlight.delete(key); });
  inFlight.set(key, task);
  return task;
}

async function runSync(gate: SpireLiveGate, input: SpireSyncRoomInput): Promise<SpireRoomLoad> {
  const nowMs = Date.now();
  const weekId = spireCurrentWeekKey(nowMs);
  const cachedAny = await spireReadRoomCache(input.uid, input.lang);
  const cached = cachedAny && cachedAny.weekId === weekId ? cachedAny : null;
  const age = cached ? nowMs - cached.fetchedAtMs : -1;
  DebugLogger.info(LOG, `room: вход lang=${input.lang} week=${weekId} force=${String(input.force === true)} кэш=${cached ? `есть (возраст ${age}мс)` : cachedAny ? `старой недели ${cachedAny.weekId}` : 'нет'}`);
  if (cached && age < SPIRE_ROOM_REFRESH_MS && !input.force) {
    return { status: 'cache', room: cached, reason: 'cache_fresh' };
  }
  if (!spireCloudAvailable()) {
    DebugLogger.info(LOG, 'room: облако выключено — отдаём кэш как есть');
    return { status: 'unavailable', room: cached, reason: 'cloud_off' };
  }
  let identity: RoomIdentity | null = cached ? { groupId: cached.groupId, tier: cached.tier, cohortDay: cached.cohortDay } : null;
  try {
    if (!identity) identity = await joinRoom(gate, { stableId: input.stableId, lang: input.lang, weekId });
    const data = await readRoomDoc(gate, identity.groupId);
    if (!data) {
      DebugLogger.warn(LOG, `room: документ ${identity.groupId} не прочитан (нет/облако выкл) — кэш ${cached ? 'есть' : 'нет'}`);
      return { status: 'unavailable', room: cached, reason: 'room_doc_missing' };
    }
    const room: SpireRoomSnapshot = {
      schema: ROOM_SCHEMA,
      uid: input.uid,
      lang: input.lang,
      weekId,
      groupId: identity.groupId,
      tier: Math.max(0, Math.trunc(Number(data.tier ?? identity.tier)) || 0),
      cohortDay: Number.isFinite(Number(data.cohortDay)) ? Math.trunc(Number(data.cohortDay)) : identity.cohortDay,
      weekStartMs: Number(data.weekStartMs) > 0 ? Number(data.weekStartMs) : spireWeekStartMs(nowMs),
      members: spireDecodeRoomMembers(data.members),
      roster: spireDecodeRoster(data.roster),
      fetchedAtMs: Date.now(),
    };
    DebugLogger.info(LOG, `room: сеть ok group=${room.groupId} tier=${room.tier} cohort=${room.cohortDay} живых=${room.members.length} лиц ботов=${room.roster.length} за ${Date.now() - nowMs}мс`);
    await writeCache(room);
    await markParticipation(input.uid, input.lang, weekId);
    return { status: 'network', room, reason: 'ok' };
  } catch (error) {
    const kind: SpireNetFailure = spireClassifyNetError(error);
    DebugLogger.warn(LOG, `room: сбой kind=${kind} (${spireErrorText(error)}) — отдаём ${cached ? 'кэш недели' : 'пусто'}; cohortDay сейчас=${spireCohortDay(nowMs)}`);
    if (kind === 'paused') return { status: 'paused', room: cached, reason: 'paused' };
    return { status: kind === 'offline' ? 'offline' : 'unavailable', room: cached, reason: kind };
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
