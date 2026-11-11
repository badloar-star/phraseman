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
import { setSpireEnergyBonus } from '../spire_energy_bonus_store';

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
import { spireReadOwnWeekCoinsChangedAt } from './spire_room_dirty';
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
// зачем (владелец 21.10, №49 В1, «пустые комнаты»): к неполной комнате подсаживают новых людей, а 6-часовой кэш часами
// показывал её пустой. Неполную (меньше SPIRE_SPARSE_ROOM_LIVE живых) перечитываем при открытии не чаще раза в 30 мин.
export const SPIRE_SPARSE_ROOM_LIVE = 5;
export const SPIRE_SPARSE_ROOM_REFRESH_MS = 30 * 60 * 1000;

/** Срок свежести кэша комнаты: неполная — 30 мин, остальные — 6 ч. */
export function spireRoomRefreshMsFor(liveMembers: number): number {
  return liveMembers < SPIRE_SPARSE_ROOM_LIVE ? SPIRE_SPARSE_ROOM_REFRESH_MS : SPIRE_ROOM_REFRESH_MS;
}
const PARTICIPATION_KEEP = 3;
const ROOM_SCHEMA = 'spire-room-cache.v1' as const;

/** Потолок одной синхронизации комнаты (сеть join + чтение документа). */
export const SPIRE_ROOM_SYNC_TIMEOUT_MS = 12_000;

export type SpireRoomLoad = Readonly<{
  status: 'network' | 'cache' | 'offline' | 'paused' | 'unavailable';
  room: SpireRoomSnapshot | null;
  reason: string;
}>;

type JoinResponse = Readonly<{ ok?: boolean; groupId?: unknown; weekId?: unknown; tier?: unknown; cohortDay?: unknown; energyBonus?: unknown }>;

const memory = new Map<string, SpireRoomSnapshot>();
const inFlight = new Map<string, Promise<SpireRoomLoad>>();
// зачем (Ревизор 25.10 по 7dd91767f, двойной join): после тайм-аута первый runSync ещё идёт, а повтор начинает второй — без этой
// карты два spireJoinRoom нового игрока могли бы гонкой занять две комнаты. Вход в комнату — один на uid|lang|week, пока не
// ответит (у вызова функции свой потолок), повтор присоединяется к нему; чтение документа комнаты — дешёвое, его не делим.
const joinInFlight = new Map<string, Promise<RoomIdentity>>();
// зачем (R39): комната прошлого владельца не нужна в памяти после выхода/смены аккаунта (ключи по uid, но держать чужое незачем)
onAccountOwnerChanged('spire_room_client', () => {
  DebugLogger.info('[SPIRE]', `owner_changed: комнат в памяти сброшено=${memory.size}, запросов в полёте=${inFlight.size}`);
  memory.clear();
  inFlight.clear();
  joinInFlight.clear();
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
  // зачем (энергия от Пика, владелец 04.11): бонус к запасу приходит в уже идущем вызове входа в комнату — 0 новых запросов; нет поля (старый сервер) → бонус не трогаем
  if (res.energyBonus !== undefined) setSpireEnergyBonus(res.energyBonus, 'spireJoinRoom');
  return { groupId: res.groupId, tier: Math.max(0, Math.trunc(Number(res.tier)) || 0), cohortDay: Math.trunc(Number(res.cohortDay)) || 0 };
}

function joinRoomOnce(gate: SpireLiveGate, input: Readonly<{ uid: string; stableId: string; lang: SpireLang; weekId: string }>): Promise<RoomIdentity> {
  const key = `${input.uid}|${input.lang}|${input.weekId}`;
  const running = joinInFlight.get(key);
  if (running) {
    DebugLogger.info(LOG, `room: вход в комнату ${input.lang} уже идёт (прошлая попытка после тайм-аута) — присоединяемся, второго join нет`);
    return running;
  }
  const task = joinRoom(gate, input).finally(() => { joinInFlight.delete(key); });
  joinInFlight.set(key, task);
  return task;
}

async function readRoomDoc(gate: SpireLiveGate, groupId: string): Promise<Record<string, unknown> | null> {
  const db = spireFirestore(gate, 'room:get');
  if (!db) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snap = await (db as any).collection('spire_groups').doc(groupId).get(); // guard-ok: один документ по id, не листинг
  return snap?.exists ? (snap.data() as Record<string, unknown>) : null;
}

/** Сколько ждём досылку монет уроков перед повторным входом в комнату: сеть есть — хватает; нет — не держим открытие Пика. */
const OWN_COINS_FLUSH_TIMEOUT_MS = 4_000;

/**
 * Досылка монет уроков, ждущих сервер, перед обновлением своего снимка в комнате (U35). Не бросает; исход — строкой для журнала.
 * зачем ленивый импорт: зачёт уроков тянет кошелёк — в первый кадр Пика он не нужен, и цикла импортов с комнатой нет.
 */
async function flushOwnPracticeCoins(stableId: string): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const { flushStalePracticeRuneSettlements } = await import('../practice_rune_settlement');
    const timeout = new Promise<string>((resolve) => { timer = setTimeout(() => resolve('timeout'), OWN_COINS_FLUSH_TIMEOUT_MS); });
    const outcome = await Promise.race([
      flushStalePracticeRuneSettlements(stableId).then((r) => `synced=${r.synced},pending=${r.pending}`),
      timeout,
    ]);
    DebugLogger.info(LOG, `[SPIRE-WEEK-COINS] flush_before_join ${outcome}`);
    return outcome;
  } catch (error) {
    DebugLogger.warn(LOG, `[SPIRE-WEEK-COINS] flush_before_join упал (${spireErrorText(error)}) — входим в комнату без досылки`);
    return 'failed';
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type SpireSyncRoomInput =Readonly<{ uid: string; stableId: string; lang: SpireLang; force?: boolean }>;

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
  // зачем ([SPIRE-ROOM], владелец 25.10 «комната не загрузилась, пришлось перезаходить»): зависший запрос держал «в полёте» и
  // следующий вход присоединялся к нему же. Потолок SPIRE_ROOM_SYNC_TIMEOUT_MS: ответ «offline / timeout» с кэшем недели, в
  // полёте ничего не остаётся — повтор (use_spire_room_sync) идёт заново
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<SpireRoomLoad>((resolve) => {
    timer = setTimeout(() => {
      DebugLogger.warn(LOG, `room: синхронизация ${input.lang} не ответила за ${SPIRE_ROOM_SYNC_TIMEOUT_MS}мс — тайм-аут, отдаём кэш недели`);
      void spireReadRoomCache(input.uid, input.lang).then((c) => resolve({ status: 'offline', room: c && c.weekId === spireCurrentWeekKey(Date.now()) ? c : null, reason: 'timeout' }))
        .catch((error: unknown) => { DebugLogger.warn(LOG, `room: кэш после тайм-аута не прочитался (${spireErrorText(error)}) — пусто`); resolve({ status: 'offline', room: null, reason: 'timeout' }); });
    }, SPIRE_ROOM_SYNC_TIMEOUT_MS);
  });
  const task = Promise.race([runSync(gate, input), timeout]).finally(() => { if (timer) clearTimeout(timer); inFlight.delete(key); });
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
  const ttlMs = cached ? spireRoomRefreshMsFor(cached.members.length) : SPIRE_ROOM_REFRESH_MS;
  // зачем (U35, владелец 11.11: «был на 6 месте, заработал в уроках почти тысячу монет — в Пике не отобразилось, прошло 12 часов»):
  // сервер обновляет мои монеты в комнате ТОЛЬКО в spireJoinRoom и при отчёте о ступени, а вход шёл раз в неделю (groupId из кэша).
  // Если после последнего чтения комнаты я заработал монеты — кэш не считается свежим и вход повторяется (ниже).
  const coinsChangedAtMs = await spireReadOwnWeekCoinsChangedAt(input.stableId);
  const ownCoinsNewer = cached !== null && coinsChangedAtMs > cached.fetchedAtMs;
  const cachedOwnCoins = cached?.members.find((m) => m.uid === input.stableId)?.weekCoins ?? null;
  DebugLogger.info(LOG, `[SPIRE-WEEK-COINS] room_enter lang=${input.lang} week=${weekId} монетыМенялись=${coinsChangedAtMs} кэшПрочитан=${cached?.fetchedAtMs ?? 'нет'} → ownCoinsNewer=${String(ownCoinsNewer)} мойСнимокВКэше=${cachedOwnCoins ?? 'нет строки'}`);
  if (cached && age < ttlMs && !input.force && !ownCoinsNewer) {
    console.log('[SPIRE-COST]', JSON.stringify({ call: 'room', result: 'skip', why: 'cache_fresh', ageMs: age, ttlMs, live: cached.members.length })); // guard-ok: 💸 пропуск сети с причиной
    return { status: 'cache', room: cached, reason: 'cache_fresh' };
  }
  if (cached && ttlMs !== SPIRE_ROOM_REFRESH_MS && age < SPIRE_ROOM_REFRESH_MS && !input.force) {
    console.log('[SPIRE-ROOM]', JSON.stringify({ event: 'sparse_refresh', live: cached.members.length, ageMs: age, ttlMs })); // guard-ok: причина раннего перечитывания
  }
  if (!spireCloudAvailable()) {
    DebugLogger.info(LOG, 'room: облако выключено — отдаём кэш как есть');
    return { status: 'unavailable', room: cached, reason: 'cloud_off' };
  }
  let identity: RoomIdentity | null = cached ? { groupId: cached.groupId, tier: cached.tier, cohortDay: cached.cohortDay } : null;
  try {
    // зачем (💸 аудит 17.10): комната — ОДИН документ на всех (лидерборд агрегатом), чтение раз в SPIRE_ROOM_REFRESH_MS; join — только без копии недели
    console.log('[SPIRE-COST]', JSON.stringify({ call: 'room', result: 'request', why: cached ? `cache_stale ageMs=${age}` : 'no_cache_this_week', join: identity === null, force: input.force === true })); // guard-ok: 💸 причина запроса
    if (ownCoinsNewer) {
      // Сначала досылаем монеты уроков, застрявшие на телефоне (иначе сервер обновит снимок старой суммой), потом входим заново.
      const flush = await flushOwnPracticeCoins(input.stableId);
      console.log('[SPIRE-COST]', JSON.stringify({ call: 'join', result: 'request', why: 'own_week_coins_changed', flush })); // guard-ok: 💸 причина повторного входа
      try {
        identity = await joinRoomOnce(gate, { uid: input.uid, stableId: input.stableId, lang: input.lang, weekId });
      } catch (error) {
        // Повторный вход не удался — комнату всё равно перечитываем по известному groupId: чужие цифры обновятся, свои догонят позже.
        DebugLogger.warn(LOG, `[SPIRE-WEEK-COINS] rejoin_failed (${spireErrorText(error)}) flush=${flush} — читаем комнату по groupId из кэша, мой снимок останется ${cachedOwnCoins ?? 'нет'}`);
        if (!identity) throw error;
      }
    }
    if (!identity) identity = await joinRoomOnce(gate, { uid: input.uid, stableId: input.stableId, lang: input.lang, weekId });
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
    if (ownCoinsNewer) {
      const freshOwnCoins = room.members.find((m) => m.uid === input.stableId)?.weekCoins ?? null;
      DebugLogger.info(LOG, `[SPIRE-WEEK-COINS] room_refreshed мойСнимок ${cachedOwnCoins ?? 'нет'} → ${freshOwnCoins ?? 'нет строки'} (${freshOwnCoins === cachedOwnCoins ? 'НЕ ИЗМЕНИЛСЯ: монеты ещё не дошли до сервера или не входят в счёт недели' : 'обновлён'})`);
    }
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
