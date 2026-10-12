/**
 * [BAN-CHECK] — флаг `banned` из документа users/{uid}, который восстановление УЖЕ прочитало на старте.
 *
 * зачем (координатор 12.10, реестр п.70 №2, аудит FIRESTORE_BOOT_READS_R1): на холодном старте users/{uid} целиком
 * читался до трёх раз — восстановлением, проверкой бана (ради одного поля `banned`) и рассылкой. Проверка бана теперь
 * берёт `banned` из документа восстановления, если он свежий; `banned_users/{uid}` по-прежнему читается, TTL кэша бана
 * (30 мин) не меняется — безопасность не ослабляется. Только память процесса: на диск ничего не пишется.
 */
const LOG = '[BAN-CHECK]';

/** Документ старше этого — не свежий, проверка бана читает его сама. */
export const RESTORE_USER_DOC_BAN_MAX_AGE_MS = 60_000;

type BanPeek = Readonly<{ uid: string; banned: boolean; readAtMs: number }>;

let latest: BanPeek | null = null;
const waiters = new Set<(peek: BanPeek) => void>();

/** Восстановление прочитало users/{uid}: запомнить `banned` и разбудить ждущую проверку бана. */
export function noteRestoreUserDocBanned(uid: string, banned: boolean, readAtMs: number = Date.now()): void {
  if (!uid) return;
  latest = Object.freeze({ uid, banned, readAtMs });
  console.log(`${LOG} restore_doc noted banned=${String(banned)} waiters=${waiters.size}`);
  for (const resolve of [...waiters]) resolve(latest);
}

function freshFor(uid: string, nowMs: number, maxAgeMs: number): BanPeek | null {
  if (!latest || latest.uid !== uid) return null;
  return nowMs - latest.readAtMs <= maxAgeMs ? latest : null;
}

export type RestoreDocBanPeekResult =
  | Readonly<{ source: 'restore_doc'; banned: boolean; ageMs: number }>
  | Readonly<{ source: 'none'; reason: 'timeout' | 'stale' | 'other_uid' | 'no_uid' }>;

/**
 * Свежий `banned` из документа восстановления: сразу, если он уже есть, иначе ждём восстановление не дольше
 * `timeoutMs` (оно идёт после первого кадра Главной). Не дождались — `none`, проверка читает документ сама.
 */
export function waitForRestoreUserDocBanned(
  uid: string,
  timeoutMs: number,
  maxAgeMs: number = RESTORE_USER_DOC_BAN_MAX_AGE_MS,
): Promise<RestoreDocBanPeekResult> {
  if (!uid) return Promise.resolve({ source: 'none', reason: 'no_uid' });
  const startedAt = Date.now();
  const ready = freshFor(uid, startedAt, maxAgeMs);
  if (ready) return Promise.resolve({ source: 'restore_doc', banned: ready.banned, ageMs: startedAt - ready.readAtMs });
  return new Promise((resolve) => {
    let done = false;
    const finish = (result: RestoreDocBanPeekResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      waiters.delete(onNote);
      resolve(result);
    };
    const onNote = (peek: BanPeek) => {
      if (peek.uid !== uid) {
        finish({ source: 'none', reason: 'other_uid' });
        return;
      }
      const now = Date.now();
      if (now - peek.readAtMs > maxAgeMs) {
        finish({ source: 'none', reason: 'stale' });
        return;
      }
      finish({ source: 'restore_doc', banned: peek.banned, ageMs: now - peek.readAtMs });
    };
    const timer = setTimeout(() => finish({ source: 'none', reason: 'timeout' }), timeoutMs);
    waiters.add(onNote);
  });
}

/** Только для тестов. */
export function resetRestoreUserDocBanPeekForTests(): void {
  latest = null;
  waiters.clear();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
