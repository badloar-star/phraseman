/*
 * Тихие повторы перед отказом входа local_progress_not_uploaded.
 *
 * зачем (владелец 18.10 «ни один вход без ошибки, кроме «нет сети»»; разбор sign-in-refusals-audit п.2): гость с прогрессом
 * входил в аккаунт, выгрузка (forceSyncToCloud) срывалась одним сбоем, аварийная копия — одной ошибкой проверки, и человек
 * видел «Прогресс на месте… вход отменён». Обе операции безопасно повторять: выгрузка идемпотентна, копия перезаписывает
 * свою же запись и проверяется до стирания. Повторяем ТОЛЬКО то, что может пройти со второго раза:
 *   - выгрузку — при быстром сбое (error), но не при таймауте (ещё 20 с ожидания хуже отказа);
 *   - копию — при сбоях записи/проверки (local_progress_not_uploaded), но не при «нельзя по состоянию устройства»
 *     (local_progress_backup_blocked: чужая копия, старый формат, нет места, карантин удаления).
 * Журнал: [SIGNIN-RETRY].
 */
import { classifyPresyncBackupRefusal } from './presync_backup_refusal';

export const PRESYNC_QUIET_RETRY_DELAYS_MS: readonly number[] = [600, 1_500];

const pause = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

export type PresyncAttempt = Readonly<{ uploaded: boolean; refusal: string; errorCode: string | null }>;

/** Выгрузка гостя с тихими повторами при быстром сбое. `attempt` — один вызов forceSyncToCloud под таймаутом. */
export async function presyncUploadWithQuietRetry(
  attempt: () => Promise<PresyncAttempt>,
  delays: readonly number[] = PRESYNC_QUIET_RETRY_DELAYS_MS,
  log: (line: string) => void = (line) => console.log(line), // guard-ok: журнал повторов входа
): Promise<PresyncAttempt & { attempts: number }> {
  for (let index = 0; ; index += 1) {
    const result = await attempt();
    const delay = delays[index];
    // зачем (Авторизация 18.10, как в описании патча): повторяем ТОЛЬКО быстрый сбой (error). Таймаут — ещё 20 с хуже отказа;
    // отказ по существу (identity_mismatch и т.п.: сервер не даёт писать гостя) повтор не исправит — лишние 2 с ожидания.
    const retryable = !result.uploaded && result.refusal === 'error';
    if (result.uploaded || !retryable || delay === undefined) {
      log(`[SIGNIN-RETRY] presync done uploaded=${result.uploaded ? 'yes' : 'no'} refusal=${result.refusal} attempts=${index + 1}${!result.uploaded && !retryable ? ` stop=${result.refusal}` : ''}`);
      return { ...result, attempts: index + 1 };
    }
    log(`[SIGNIN-RETRY] presync retry attempt=${index + 2} afterMs=${delay} refusal=${result.refusal}`);
    await pause(delay);
  }
}

/** Аварийная копия с тихими повторами. `attempt` возвращает null при успехе или код отказа копии. */
export async function presyncBackupWithQuietRetry(
  attempt: () => Promise<string | null>,
  delays: readonly number[] = PRESYNC_QUIET_RETRY_DELAYS_MS,
  log: (line: string) => void = (line) => console.log(line), // guard-ok: журнал повторов входа
): Promise<{ backupCode: string | null; attempts: number }> {
  for (let index = 0; ; index += 1) {
    const backupCode = await attempt();
    const delay = delays[index];
    // «Нельзя по состоянию устройства» повтор не исправит — сразу дальше, к своей ветке.
    const retryable = backupCode !== null && classifyPresyncBackupRefusal(backupCode) === 'local_progress_not_uploaded';
    if (backupCode === null || !retryable || delay === undefined) {
      log(`[SIGNIN-RETRY] backup done code=${backupCode ?? 'ok'} attempts=${index + 1}`);
      return { backupCode, attempts: index + 1 };
    }
    log(`[SIGNIN-RETRY] backup retry attempt=${index + 2} afterMs=${delay} code=${backupCode}`);
    await pause(delay);
  }
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
