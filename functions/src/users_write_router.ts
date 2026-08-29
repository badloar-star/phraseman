import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { handleReferralUsersWrite } from './referral';
import { handleVipOrphanUsersWrite } from './vip_orphan_reconcile';

/**
 * Единый триггер на users/{userId}.
 *
 * зачем (аудит 2026-08-29): на самой горячей коллекции висели ДВА отдельных
 * onDocumentWritten (реферальная квалификация и перенос осиротевшего VIP) —
 * каждая запись любого пользователя оплачивала две инвокации Cloud Functions.
 * Теперь инвокация одна, обработчики зовутся последовательно и изолированы:
 * падение одного не съедает второй, причина падения пишется всегда
 * (запрет немого catch).
 */
export const usersWriteRouter = onDocumentWritten(
  { document: 'users/{userId}', region: 'us-central1' },
  async (event) => {
    const results = await Promise.allSettled([
      handleReferralUsersWrite(event),
      handleVipOrphanUsersWrite(event),
    ]);
    const names = ['referral_qualify', 'vip_orphan_reconcile'];
    let firstError: unknown = null;
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        if (firstError === null) firstError = r.reason;
        console.error(JSON.stringify({
          event: 'users_write_router_handler_failed',
          handler: names[i],
          userId: String(event.params.userId).slice(0, 12),
          message: String((r.reason as Error)?.message ?? r.reason).slice(0, 200),
        }));
      }
    });
    // Пробрасываем первую ошибку, чтобы штатный retry Cloud Functions работал.
    if (firstError !== null) throw firstError;
  },
);
