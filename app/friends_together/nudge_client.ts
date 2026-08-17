/**
 * «Вместе» — «Позвать» друга. Optimistic: локальная отметка ставится ДО ответа
 * сервера, откатывается только если callable вернул окончательную ошибку (не
 * network/unknown — там неизвестно, применилось ли на сервере, поэтому один
 * ретрай тем же requestId вместо отката оптимистичной отметки).
 *
 * Источник: docs/plans/2026-08-16-friends-together-implementation.ru.md §1.3, §4.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { initFirebaseAppCheckIfAvailable } from '../app_check_init';
import { getLocalDayKey } from '../local_date';

const REGION = 'us-central1';
const NUDGED_TODAY_KEY_PREFIX = 'friends_nudged_today_v1';

export type NudgeErrorReason =
  | 'disabled'
  | 'quiet_hours'
  | 'daily_limit'
  | 'sender_limit'
  | 'receiver_limit'
  | 'not_friends'
  | 'network';

export type NudgeResult =
  | { ok: true }
  | { ok: false; reason: NudgeErrorReason };

type NudgedTodayMap = Record<string, number>; // friendUid -> ts ms

function nudgedTodayKey(dayKey: string): string {
  return `${NUDGED_TODAY_KEY_PREFIX}::${dayKey}`;
}

async function readNudgedToday(dayKey: string): Promise<NudgedTodayMap> {
  try {
    const raw = await AsyncStorage.getItem(nudgedTodayKey(dayKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: NudgedTodayMap = {};
    for (const [uid, ts] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof uid === 'string' && Number.isFinite(ts)) out[uid] = Number(ts);
    }
    return out;
  } catch {
    return {};
  }
}

async function writeNudgedToday(dayKey: string, map: NudgedTodayMap): Promise<void> {
  await AsyncStorage.setItem(nudgedTodayKey(dayKey), JSON.stringify(map)).catch(() => {});
}

/** Синхронная проверка после prime — используем последний прочитанный snapshot в памяти. */
let _memoryDayKey = '';
let _memoryMap: NudgedTodayMap = {};

async function ensureMemoryFresh(): Promise<void> {
  const dayKey = getLocalDayKey();
  if (_memoryDayKey === dayKey) return;
  _memoryDayKey = dayKey;
  _memoryMap = await readNudgedToday(dayKey);
}

/** Уже позвали этого друга сегодня? (после первого refresh синхронно верно для текущего дня) */
export function isNudgedToday(friendUid: string): boolean {
  const dayKey = getLocalDayKey();
  if (_memoryDayKey !== dayKey) return false; // ещё не прогрето — вызывающий должен был await prime
  return !!_memoryMap[friendUid];
}

/** Прогреть кэш «уже позвал сегодня» — вызывать перед первым рендером списка друзей. */
export async function primeNudgedTodayCache(): Promise<void> {
  await ensureMemoryFresh();
}

function makeRequestId(): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `ftn_${now}_${rand}`;
}

function classifyNudgeError(error: unknown): NudgeErrorReason {
  const err = error as { code?: unknown; message?: unknown };
  const text = `${String(err?.code ?? '')} ${String(err?.message ?? error ?? '')}`.toLowerCase();
  if (text.includes('disabled')) return 'disabled';
  if (text.includes('quiet_hours')) return 'quiet_hours';
  if (text.includes('daily_limit')) return 'daily_limit';
  if (text.includes('sender_limit')) return 'sender_limit';
  if (text.includes('receiver_limit')) return 'receiver_limit';
  if (text.includes('not_friends')) return 'not_friends';
  return 'network';
}

function isRetryableNudgeError(reason: NudgeErrorReason): boolean {
  return reason === 'network';
}

const inFlight = new Set<string>();

/**
 * Позвать друга. Optimistic-порядок: отметка → callable. Двойной тап на того же
 * друга, пока предыдущий вызов не завершился, игнорируется (защита от гонки).
 */
export async function nudgeFriend(friendUid: string): Promise<NudgeResult> {
  const uid = String(friendUid || '').trim();
  if (!uid) return { ok: false, reason: 'not_friends' };
  if (inFlight.has(uid)) return { ok: false, reason: 'network' }; // тап уже в полёте — тихо игнорируем повтор
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'network' };

  inFlight.add(uid);
  try {
    await ensureMemoryFresh();
    const dayKey = _memoryDayKey;
    if (_memoryMap[uid]) return { ok: true }; // уже позвали сегодня — идемпотентно ok

    // 1) Optimistic: отмечаем ДО ответа сервера.
    const previousMap = { ..._memoryMap };
    _memoryMap = { ..._memoryMap, [uid]: Date.now() };
    await writeNudgedToday(dayKey, _memoryMap);

    const requestId = makeRequestId();
    const attempt = async (): Promise<NudgeResult> => {
      try {
        await initFirebaseAppCheckIfAvailable().catch(() => {});
        const fn = httpsCallable<{ friendUid: string; requestId: string }, { ok: boolean }>(
          getFunctions(getApp(), REGION),
          'friendsNudge',
        );
        await fn({ friendUid: uid, requestId });
        return { ok: true };
      } catch (error) {
        const reason = classifyNudgeError(error);
        return { ok: false, reason };
      }
    };

    let result = await attempt();
    if (!result.ok && isRetryableNudgeError(result.reason)) {
      // Один повторный тик тем же requestId — сервер идемпотентен по нему.
      result = await attempt();
    }

    if (!result.ok && !isRetryableNudgeError(result.reason)) {
      // Окончательная ошибка (лимиты/тихие часы/дружба/выключено получателем) — откатываем отметку.
      _memoryMap = previousMap;
      await writeNudgedToday(dayKey, _memoryMap);
    }
    // network после ретрая: оставляем оптимистичную отметку — не знаем, применилось ли на
    // сервере, повторный локальный тап в тот же день заблокирован уже самой отметкой.

    return result;
  } finally {
    inFlight.delete(uid);
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
