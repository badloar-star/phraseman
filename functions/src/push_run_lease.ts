// ═══════════════════════════════════════════════════════════════════════════
// push_run_lease.ts — «один прогон рассылки на одно событие» (F08 «Два push»).
//
// зачем (владелец 11.11: «по одному событию отправляется одно уведомление»):
// массовые рассылки (возврат в приложение, напоминание о продлении, старт
// турнира) устроены как «прочитал всех → отправил → поставил отметку каждому».
// Cloud Scheduler доставляет задание «хотя бы один раз»: при двойной доставке
// два прогона идут одновременно, оба читают людей ДО отметок и оба шлют —
// каждый получает два одинаковых уведомления. Индивидуальная отметка времени
// (cooldown) от этого не спасает: она ставится после отправки.
//
// Решение — занять событие целиком ДО чтения людей: документ
// push_run_leases/{name}_{slotKey} создаётся через create(), а create() в
// Firestore атомарен — из двух одновременных прогонов проходит ровно один.
//
// Firebase-экономия: 1 запись на прогон (2–6 в сутки на все рассылки) вместо
// транзакции на каждого получателя. Второй прогон выходит ДО скана users —
// то есть двойная доставка теперь ещё и не тратит чтения на всю базу.
// Документы мелкие; поле expireAt готово под TTL-политику Firestore
// (включается в консоли отдельно; без неё копится ~6 мелких документов в сутки).
//
// Чего это НЕ закрывает (намеренно, другой класс): прогон упал после отправки,
// но до отметок — следующий ПЛАНОВЫЙ прогон (другой slotKey) может дослать.
// ═══════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';

export const PUSH_RUN_LEASES_COLLECTION = 'push_run_leases' as const;
const LEASE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const LOG = '[PUSH-RUN-LEASE]';

function isAlreadyExists(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS';
}

/** Ключ слота «сутки UTC» — для рассылок, идущих раз в день. */
export function pushRunDaySlot(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Ключ слота «час UTC» — для рассылок, идущих несколько раз в день. */
export function pushRunHourSlot(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 13);
}

/**
 * Занимает событие рассылки. true — этот прогон первый и может слать;
 * false — событие уже занято другим прогоном (слать нельзя).
 * Любая другая ошибка записи пробрасывается: без занятого события гарантии
 * «один пуш» нет, поэтому рассылка не идёт (лучше ноль пушей, чем два).
 */
export async function claimPushRun(
  db: FirebaseFirestore.Firestore,
  name: string,
  slotKey: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const id = `${name}_${slotKey}`.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 300);
  try {
    await db.collection(PUSH_RUN_LEASES_COLLECTION).doc(id).create({
      name,
      slotKey,
      claimedAtMs: nowMs,
      expireAt: admin.firestore.Timestamp.fromMillis(nowMs + LEASE_TTL_MS),
    });
    console.log(LOG, JSON.stringify({ event: 'claimed', name, slotKey }));
    return true;
  } catch (err) {
    if (isAlreadyExists(err)) {
      // Не ноль таких строк в логах = Scheduler доставил задание дважды (или прогон повторили вручную).
      console.warn(LOG, JSON.stringify({ event: 'duplicate_run_skipped', name, slotKey }));
      return false;
    }
    console.error(LOG, JSON.stringify({
      event: 'claim_failed', name, slotKey, error: String((err as Error)?.message ?? err),
    }));
    throw err;
  }
}
