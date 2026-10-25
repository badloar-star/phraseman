/**
 * [SPIRE-GOLD] Знает ли сервер правило «золотого задания» — по последнему ответу spireReportSteps (поле goldRule).
 *
 * зачем (координатор 25.10): если в «Пульте» включат spire_gold до выкладки функций, старый сервер не доплатит ×2, и человек
 * увидел бы обещание, которое снимется после синхронизации. Поэтому телефон показывает золото, только когда последний ответ
 * сервера назвал версию правила не ниже нужной. Нет ответа или поля — золота нет, журнал «gate reason=server_too_old».
 * Значение живёт в памяти и на диске (одно маленькое значение, без сети): после перезапуска золото не ждёт новой досылки.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../debug-logger';

// зачем (сторож spire_game_source_contract: префикс [SPIRE] во всех файлах app/spire): контекст [SPIRE], метка задачи в строке
const SPIRE = '[SPIRE]';
const TAG = '[SPIRE-GOLD]';
const KEY = 'spire_gold_server_rule_v1';
/** Версия правила, которую понимает этот клиент (functions/src/spire_golden.ts SPIRE_GOLD_RULE_VERSION). */
export const SPIRE_GOLD_CLIENT_RULE = 1;

let known: number | null = null;
let hydrated = false;

/** Ответ сервера пришёл: запомнить версию правила золота (нет поля — 0: сервер старый). */
export function noteSpireGoldServerRule(raw: unknown): void {
  const rule = typeof raw === 'number' && Number.isSafeInteger(raw) && raw > 0 ? raw : 0;
  if (rule === known) return;
  DebugLogger.info(SPIRE, `${TAG} сервер: правило золота ${known ?? 'неизвестно'} → ${rule || 'нет (старый сервер)'}`);
  known = rule;
  hydrated = true;
  void AsyncStorage.setItem(KEY, String(rule)).catch((error: unknown) => {
    DebugLogger.warn(SPIRE, `${TAG} версия правила не записалась — только в памяти (${error instanceof Error ? error.message : String(error)})`);
  });
}

/** Сервер умеет золото? Сначала память, иначе диск. Нет данных — false. */
export async function readSpireGoldServerOk(): Promise<Readonly<{ ok: boolean; rule: number | null; source: 'память' | 'диск' | 'нет данных' }>> {
  if (hydrated && known !== null) return { ok: known >= SPIRE_GOLD_CLIENT_RULE, rule: known, source: 'память' };
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const rule = raw === null ? null : Number(raw);
    if (rule === null || !Number.isFinite(rule)) return { ok: false, rule: null, source: 'нет данных' };
    if (!hydrated) { known = rule; hydrated = true; }
    return { ok: rule >= SPIRE_GOLD_CLIENT_RULE, rule, source: 'диск' };
  } catch (error) {
    DebugLogger.warn(SPIRE, `${TAG} версия правила не прочиталась → считаем старым (${error instanceof Error ? error.message : String(error)})`);
    return { ok: false, rule: null, source: 'нет данных' };
  }
}

export function __resetSpireGoldServerForTests(): void {
  known = null;
  hydrated = false;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
