// ═══════════════════════════════════════════════════════════════════════════
// plus_server_recheck.ts — сервер отказал «нужен Plus», а телефон считал Plus включённым: фоновая перепроверка и журнал.
//
// зачем (координатор 25.10, случай владельца: «свободный диалог — сервис недоступен»): телефон держал Plus по локальным ключам
// premium_* (AsyncStorage), а на сервере у записи Plus не было — старт свободного разговора отказывал plus_required. Б/В
// (36eba41a0) показывают честный экран Plus; Б2 — здесь: перечитать доступ из облака (вдруг сервер выдал недавно) и записать,
// совпало ли мнение телефона с сервером и КАКИЕ локальные ключи держат Plus. Только журнал и пересчёт: локальный Plus модуль НЕ
// стирает — это деньги, а причина расхождения (песочница, другая запись, удержание переноса) ещё не доказана.
// За переключателем «Пульта» plus_server_recheck_enabled (по умолчанию ВЫКЛ). Префикс журнала: [PLUS-RECHECK].
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { forcePremiumAccessCloudRestore, getVerifiedPremiumAccessStatus, invalidatePremiumCache } from './premium_guard';
import { getRemoteBool } from './remote_flags';

const LOG = '[PLUS-RECHECK]';
/** Не чаще раза в 10 мин на процесс: защита от круга «отказ → перепроверка → отказ» (облако само ограничено 2 мин). */
export const PLUS_RECHECK_MIN_INTERVAL_MS = 10 * 60 * 1000;
const ACCESS_KEYS = [
  'premium_active', 'premium_plan', 'premium_expiry', 'premium_rc_expiry_ms', 'admin_premium_override',
  'vip_active', 'vip_plan', 'vip_until',
] as const;

let lastRunAt = 0;
let inFlight: Promise<void> | null = null;

type LocalEvidence = Readonly<Record<string, string | number | boolean | null>>;

/** Что телефон хранит про доступ: названия планов и «срок в будущем» (мс до конца), без идентификаторов. */
async function readLocalEvidence(nowMs: number): Promise<LocalEvidence> {
  const pairs = await AsyncStorage.multiGet([...ACCESS_KEYS]);
  const get = (key: string): string | null => pairs.find(([k]) => k === key)?.[1] ?? null;
  const leftMs = (raw: string | null): number | null => {
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n <= 0) return null;
    return n - nowMs;
  };
  return {
    premium_active: get('premium_active'),
    premium_plan: get('premium_plan'),
    premium_expiry_left_ms: leftMs(get('premium_expiry')),
    premium_rc_expiry_left_ms: leftMs(get('premium_rc_expiry_ms')),
    admin_premium_override: get('admin_premium_override'),
    vip_active: get('vip_active'),
    vip_plan: get('vip_plan'),
    vip_until_left_ms: leftMs(get('vip_until')),
  };
}

async function run(surface: string, startedAt: number): Promise<void> {
  const before = await readLocalEvidence(startedAt);
  const accessBefore = await getVerifiedPremiumAccessStatus();
  console.warn(`${LOG} start ${JSON.stringify({ surface, accessBefore, local: before })}`);
  const cloudConfirmed = await forcePremiumAccessCloudRestore(`plus_recheck:${surface}`);
  invalidatePremiumCache();
  const accessAfter = await getVerifiedPremiumAccessStatus();
  const after = await readLocalEvidence(Date.now());
  // совпадение с сервером = телефон после перечитывания тоже говорит «нет Plus»
  const verdict = accessAfter ? 'mismatch_persists' : 'now_matches_server';
  console.warn(`${LOG} done ${JSON.stringify({ surface, verdict, cloudConfirmed, accessBefore, accessAfter, local: after, ms: Date.now() - startedAt })}`);
  emitAppEvent('premium_server_recheck_done', { surface, accessAfter });
}

/**
 * Сервер отказал «нужен Plus» (surface — где). Флаг выкл / недавно уже проверяли / уже идёт — ранний выход с причиной в журнале.
 * Никогда не бросает: вызывается фоном из клиента без ожидания.
 */
export async function recheckPlusAfterServerRefusal(surface: string, nowMs: number = Date.now()): Promise<void> {
  if (!getRemoteBool('plus_server_recheck_enabled')) {
    console.log(`${LOG} skip reason=flag_off surface=${surface}`);
    return;
  }
  if (inFlight) {
    console.log(`${LOG} skip reason=in_flight surface=${surface}`);
    return inFlight;
  }
  if (lastRunAt > 0 && nowMs - lastRunAt < PLUS_RECHECK_MIN_INTERVAL_MS) {
    console.log(`${LOG} skip reason=throttled surface=${surface} sinceMs=${nowMs - lastRunAt}`);
    return;
  }
  lastRunAt = nowMs;
  inFlight = run(surface, nowMs)
    .catch((error: unknown) => {
      console.warn(`${LOG} failed surface=${surface} reason=${error instanceof Error ? error.message : String(error)}`);
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Только для тестов. */
export function resetPlusRecheckForTests(): void {
  lastRunAt = 0;
  inFlight = null;
}

// expo-router: файл в app/ — заглушка маршрута, как у соседних модулей
export default function __RouteShim() { return null; }
