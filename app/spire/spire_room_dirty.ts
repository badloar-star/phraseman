// ═══════════════════════════════════════════════════════════════════════════
// spire_room_dirty.ts — отметка «мои монеты недели изменились» для комнаты Пика (U35).
//
// зачем (владелец 11.11: «был на 6 месте, заработал в уроках почти тысячу монет — в Пике нигде не отобразилось, прошло 12 часов,
// в следующую башню не перешёл»): сервер обновляет мои монеты в комнате ТОЛЬКО при входе в комнату (spireJoinRoom) и при
// отчёте о ступени, а телефон входил в комнату один раз в неделю. Эта отметка говорит клиенту комнаты: «после последнего
// чтения комнаты я заработал монеты — зайди на сервер заново». Без заработка лишних запросов нет (💸).
//
// Крошечный модуль без зависимостей от кошелька и Пика: его зовут и зачёт уроков, и клиент комнаты — цикла импортов нет.
// Никогда не бросает: сбой диска не должен мешать ни зачёту урока, ни открытию Пика.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DebugLogger } from '../debug-logger';

const LOG = '[SPIRE]';
const KEY_PREFIX = 'spire_own_week_coins_changed_v1';
const memory = new Map<string, number>();

const keyOf = (stableId: string): string => `${KEY_PREFIX}:${stableId}`;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Мои монеты недели изменились (урок зачтён на телефоне / подтверждён сервером). Не ждёт диск, не бросает. */
export function spireMarkOwnWeekCoinsChanged(stableIdInput: string, why: string): void {
  const stableId = stableIdInput.trim();
  if (!stableId) {
    DebugLogger.warn(LOG, `[SPIRE-WEEK-COINS] mark skip: нет владельца (why=${why})`);
    return;
  }
  const atMs = Date.now();
  memory.set(stableId, atMs); // guard-ok: Map в памяти процесса — отметка времени, не баланс и не облако
  DebugLogger.info(LOG, `[SPIRE-WEEK-COINS] mark why=${why} at=${atMs} — при следующем открытии Пика комната обновится с сервера`);
  AsyncStorage.setItem(keyOf(stableId), String(atMs)).catch((error: unknown) => {
    DebugLogger.warn(LOG, `[SPIRE-WEEK-COINS] mark: отметка не сохранилась на диск (${errorText(error)}) — живёт до перезапуска`);
  });
}

/** Когда мои монеты недели менялись в последний раз (мс) или 0. Память → диск. Не бросает. */
export async function spireReadOwnWeekCoinsChangedAt(stableIdInput: string): Promise<number> {
  const stableId = stableIdInput.trim();
  if (!stableId) return 0;
  const hit = memory.get(stableId);
  if (hit !== undefined) return hit;
  try {
    const raw = await AsyncStorage.getItem(keyOf(stableId));
    const parsed = Number(raw);
    const atMs = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
    // зачем: пока читали диск, могла прийти свежая отметка — её не затираем
    const fresh = memory.get(stableId);
    if (fresh !== undefined) return fresh;
    memory.set(stableId, atMs); // guard-ok: Map в памяти процесса — отметка времени, не баланс и не облако
    return atMs;
  } catch (error: unknown) {
    DebugLogger.warn(LOG, `[SPIRE-WEEK-COINS] read: отметка не прочиталась (${errorText(error)}) — считаем, что монеты не менялись`);
    return 0;
  }
}

/** Только для тестов. */
export function __resetSpireRoomDirtyForTests(): void {
  memory.clear();
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
