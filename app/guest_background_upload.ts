/*
 * Фоновая выгрузка прогресса гостя при уходе приложения в фон — не чаще раза в 6 часов.
 *
 * зачем (владелец 18.10 «ни один вход без ошибки, кроме «нет сети»»; разбор sign-in-refusals-audit п.2б): к моменту входа
 * облако гостя уже свежее, и выгрузка перед сменой аккаунта почти ничего не пишет — меньше шансов на local_progress_not_uploaded.
 * 💸 Экономно: только гость, только с настоящим прогрессом, не чаще раза в 6 ч, запись пропускается, если документ не изменился
 * (skipUnchangedDocWrite в forceSyncToCloud). Сбой ничего не ломает: следующая попытка — при следующем уходе в фон.
 * Журнал: [GUEST-BG-UPLOAD].
 */
export const GUEST_BACKGROUND_UPLOAD_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const GUEST_BACKGROUND_UPLOAD_LAST_AT_KEY = 'guest_background_upload_last_at_v1';

export type GuestBackgroundUploadOutcome =
  | 'skipped_not_guest'
  | 'skipped_no_progress'
  | 'skipped_recent'
  | 'skipped_in_flight'
  | 'uploaded'
  | 'not_uploaded'
  | 'failed';

export type GuestBackgroundUploadDeps = Readonly<{
  isGuest: () => boolean;
  hasMeaningfulProgress: () => Promise<boolean>;
  /** Одна выгрузка (forceSyncToCloud({ skipUnchangedDocWrite: true, adoptOnIdentityMismatch: false })). true — записано. */
  upload: () => Promise<boolean>;
  readLastAtMs: () => Promise<number | null>;
  writeLastAtMs: (ms: number) => Promise<void>;
  nowMs?: () => number;
  log?: (line: string) => void;
}>;

let inFlight = false;

/** Только для тестов. */
export function resetGuestBackgroundUploadForTest(): void {
  inFlight = false;
}

export async function maybeUploadGuestOnBackground(deps: GuestBackgroundUploadDeps): Promise<GuestBackgroundUploadOutcome> {
  const log = deps.log ?? ((line: string) => console.log(line)); // guard-ok: журнал фоновой выгрузки гостя
  const now = (deps.nowMs ?? Date.now)();
  const done = (outcome: GuestBackgroundUploadOutcome, extra = ''): GuestBackgroundUploadOutcome => {
    log(`[GUEST-BG-UPLOAD] ${outcome}${extra}`);
    return outcome;
  };
  if (inFlight) return done('skipped_in_flight');
  if (!deps.isGuest()) return done('skipped_not_guest');
  inFlight = true;
  try {
    let lastAt: number | null = null;
    try {
      lastAt = await deps.readLastAtMs();
    } catch (error) {
      // Не прочитали метку — считаем, что выгрузки не было (одна лишняя выгрузка дешевле пропуска).
      log(`[GUEST-BG-UPLOAD] last_at_read_failed reason=${error instanceof Error ? error.message.slice(0, 60) : typeof error}`);
    }
    if (lastAt !== null && now - lastAt < GUEST_BACKGROUND_UPLOAD_MIN_INTERVAL_MS) {
      return done('skipped_recent', ` sinceMs=${now - lastAt}`);
    }
    if (!(await deps.hasMeaningfulProgress())) return done('skipped_no_progress');
    const uploaded = await deps.upload();
    if (!uploaded) return done('not_uploaded');
    try {
      await deps.writeLastAtMs(now);
    } catch (error) {
      log(`[GUEST-BG-UPLOAD] last_at_write_failed reason=${error instanceof Error ? error.message.slice(0, 60) : typeof error}`);
    }
    return done('uploaded');
  } catch (error) {
    return done('failed', ` reason=${error instanceof Error ? error.message.slice(0, 60) : typeof error}`);
  } finally {
    inFlight = false;
  }
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
