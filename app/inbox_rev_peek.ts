// ═══════════════════════════════════════════════════════════════════════════
// inbox_rev_peek.ts — users/{uid}.inboxRev из документа, который восстановление УЖЕ прочитало.
//
// зачем (владелец 22.10, вопрос 27 «сначала безопасные»; сервер — f3e4462fe): личные сообщения и их состояния
// (2 запроса до 80 документов) перечитывались каждый старт. Сервер поднимает inboxRev на каждой своей записи в
// user_messages. Входящие сравнивают его с версией своей копии — без единого лишнего чтения: документ users/{uid}
// и так читается восстановлением. Только память процесса; на диск ничего не пишется.
// ═══════════════════════════════════════════════════════════════════════════

/** Значение старше этого не годится: за это время сервер мог поднять счётчик, а документ мы не перечитывали. */
export const INBOX_REV_PEEK_MAX_AGE_MS = 10 * 60_000;

type InboxRevPeek = Readonly<{ uid: string; rev: number; readAtMs: number }>;

let latest: InboxRevPeek | null = null;

/** Восстановление прочитало users/{uid}: запомнить inboxRev (0 — поля нет, сервер ещё не пишет). */
export function noteRestoreUserDocInboxRev(uid: string, raw: unknown, readAtMs: number = Date.now()): void {
  if (!uid) return;
  const rev = Number(raw);
  latest = Object.freeze({ uid, rev: Number.isFinite(rev) && rev > 0 ? Math.floor(rev) : 0, readAtMs });
}

/** Свежий inboxRev этого владельца или null (не читали, чужой uid, устарел). */
export function peekInboxRev(uid: string, nowMs: number = Date.now(), maxAgeMs: number = INBOX_REV_PEEK_MAX_AGE_MS): number | null {
  if (!latest || latest.uid !== uid) return null;
  const age = nowMs - latest.readAtMs;
  return age >= 0 && age <= maxAgeMs ? latest.rev : null;
}

/** Только для тестов. */
export function resetInboxRevPeekForTests(): void {
  latest = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
