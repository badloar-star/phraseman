/**
 * Ворота «свежая установка» для объявлений о новинках.
 *
 * зачем (координатор 12.10, находка Сверки): новичок сразу после онбординга видел поверх Главной объявление «Замочки ушли в отпуск!» —
 * но «старого» он ничего не видел, «что нового» ему не нужно. Объявления с показом при входе не показываем, если онбординг завершён в этом
 * же запуске или менее суток назад. Источник — локальная отметка времени завершения онбординга (без сети и Firestore). Нет отметки (все
 * прежние пользователи, восстановленные аккаунты) → не новичок. Часы устройства ушли вперёд — отметке не верим, чтобы не скрыть объявления навсегда.
 * Логи: [APP-MESSAGE] skip reason=fresh_install.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_COMPLETED_AT_KEY = 'onboarding_completed_at_ms_v1';
export const FRESH_INSTALL_ANNOUNCEMENT_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Допуск на расхождение часов: отметка «из будущего» дальше этого — недостоверна. */
export const FRESH_INSTALL_CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

export type FreshInstallVerdict = Readonly<{
  fresh: boolean;
  reason: 'recent' | 'old' | 'no_timestamp' | 'clock_skew' | 'read_failed';
  ageMs: number | null;
}>;

/** Чистое правило: свежая ли установка по отметке завершения онбординга. */
export function judgeFreshInstall(completedAtMs: number | null, nowMs: number): FreshInstallVerdict {
  if (completedAtMs === null || !Number.isFinite(completedAtMs) || completedAtMs <= 0) {
    return { fresh: false, reason: 'no_timestamp', ageMs: null };
  }
  const ageMs = nowMs - completedAtMs;
  if (ageMs < -FRESH_INSTALL_CLOCK_SKEW_TOLERANCE_MS) return { fresh: false, reason: 'clock_skew', ageMs };
  if (ageMs < FRESH_INSTALL_ANNOUNCEMENT_WINDOW_MS) return { fresh: true, reason: 'recent', ageMs };
  return { fresh: false, reason: 'old', ageMs };
}

/** Прочитать отметку и вынести вердикт. Сбой чтения — не новичок (объявления показываются как раньше), причина в логе. */
export async function readFreshInstallVerdict(nowMs: number = Date.now()): Promise<FreshInstallVerdict> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_COMPLETED_AT_KEY);
    const parsed = raw === null ? null : Number(raw);
    const verdict = judgeFreshInstall(parsed, nowMs);
    console.log(`[APP-MESSAGE] fresh_install verdict fresh=${String(verdict.fresh)} reason=${verdict.reason} ageMs=${String(verdict.ageMs)} raw=${String(raw)}`); // guard-ok: единичный лог на вход
    return verdict;
  } catch (error) {
    console.warn(`[APP-MESSAGE] fresh_install read_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
    return { fresh: false, reason: 'read_failed', ageMs: null };
  }
}

/**
 * Очередь модальных объявлений с учётом свежей установки: у новичка — пусто (с логом причины), иначе очередь как есть.
 * Чистая функция (вердикт приходит снаружи), поэтому тестируется без хранилища.
 */
export function skipAnnouncementsForFreshInstall<T extends Readonly<{ id: string }>>(
  queue: T[],
  verdict: FreshInstallVerdict,
): T[] {
  if (!verdict.fresh || queue.length === 0) return queue;
  console.log(`[APP-MESSAGE] skip reason=fresh_install count=${queue.length} ids=${queue.map((m) => m.id).join(',')} ageMs=${String(verdict.ageMs)}`); // guard-ok: пропуск пишет причину
  return [];
}
