/**
 * Читатель источника для департамента «Скорость поддержки».
 *
 * зачем читать документы, а не счётчики (в отличие от «Безопасности»): здесь
 * нужны не количества, а ВРЕМЯ — сколько ждёт самое старое письмо и какова
 * типичная скорость ответа. Такое .count() не считает. Поэтому берём документы,
 * но через .select() только с полями времени и статуса: тексты писем, адреса и
 * имена отправителей не выкачиваются вовсе, значит PII не может попасть в
 * решение, а трафик остаётся маленьким.
 *
 * Контракт полей взят из живого support_inbox.ts (INBOX_COLLECTION), не выдуман.
 */

/** Окно истории. Неделя — достаточный горизонт для «типичной скорости». */
export const SUPPORT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1_000;

/** Верхняя граница выборки: обращений на порядки меньше, но защита нужна. */
export const MAX_SUPPORT_DOCS = 500;

/** Gmail опрашивается раз в час; через 90 минут без sync источник уже нельзя считать живым. */
export const SUPPORT_SYNC_MAX_AGE_MS = 90 * 60 * 1_000;

export type SupportSourceState = 'ready' | 'empty' | 'error';

export interface FetchSupportSourceResult {
  readonly state: SupportSourceState;
  /** Живые люди, всё ещё ждущие ответа. null — источник не смог доказать число. */
  readonly waitingCount: number | null;
  /** Сколько ждёт САМОЕ старое неотвеченное письмо. */
  readonly oldestWaitingMs: number | null;
  /** Проверенные triage-контуром человеческие письма, реально требующие ответа. */
  readonly actionableWaitingCount?: number | null;
  /** Самое старое письмо только в актуальной очереди. */
  readonly oldestActionableWaitingMs?: number | null;
  /** Неразмеченный legacy-хвост: виден по запросу, но не выдаётся за живой SLA. */
  readonly legacyWaitingCount?: number | null;
  /** Отвеченные письма за окно. */
  readonly answeredCount: number | null;
  /** Медиана времени ответа — устойчива к одному забытому письму. */
  readonly medianReplyMs: number | null;
  readonly observedAtMs: number;
}

export interface FetchSupportSourceInput {
  readonly collection: FirebaseFirestore.Query;
  /** admin_config/support_inbox, где IMAP pull атомарно обновляет imapSyncedAt. */
  readonly syncDocument?: Pick<FirebaseFirestore.DocumentReference, 'get'>;
  readonly nowMs: number;
}

function toMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Медиана, а не среднее: одно забытое письмо не должно красить всю картину. */
function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export async function fetchSupportSource(input: FetchSupportSourceInput): Promise<FetchSupportSourceResult> {
  try {
    if (input.syncDocument) {
      const syncSnapshot = await input.syncDocument.get();
      const syncData = syncSnapshot.exists
        ? (syncSnapshot.data() as Record<string, unknown> | undefined)
        : undefined;
      const syncedAtMs = toMs(syncData?.imapSyncedAt);
      const syncAgeMs = syncedAtMs === null ? Number.POSITIVE_INFINITY : input.nowMs - syncedAtMs;
      if (syncAgeMs < -5 * 60 * 1_000 || syncAgeMs > SUPPORT_SYNC_MAX_AGE_MS) {
        throw new Error('support_ingestion_stale');
      }
    }

    const baseQuery = input.collection
      .orderBy('receivedAtMs', 'desc')
      // Только время и статус. Ни fromEmail, ни fromName, ни bodyText.
      .select('receivedAtMs', 'status', 'repliedAt', 'mailCategory', 'triageState')
      .limit(MAX_SUPPORT_DOCS);

    let waitingCount = 0;
    let oldestWaitingMs: number | null = null;
    let actionableWaitingCount = 0;
    let oldestActionableWaitingMs: number | null = null;
    let legacyWaitingCount = 0;
    let answeredCount = 0;
    const replyDurations: number[] = [];

    let pageQuery = baseQuery;
    while (true) {
      const snap = await pageQuery.get();
      // guard-ok: each get reads one bounded page; startAfter prevents repeats.
      for (const doc of snap.docs) {
        const data = doc.data() as Record<string, unknown>;
        if (data.mailCategory === 'automated') continue;

        const receivedAtMs = toMs(data.receivedAtMs);
        if (receivedAtMs === null || receivedAtMs > input.nowMs) continue;

        // The admin UI historically renders a missing legacy status as new.
        const status = data.status ?? 'new';
        if (status === 'new') {
          waitingCount += 1;
          const waited = input.nowMs - receivedAtMs;
          if (oldestWaitingMs === null || waited > oldestWaitingMs) oldestWaitingMs = waited;
          // Только triageState=kept доказывает, что это письмо реального
          // человека. Возраст сам по себе ничего не доказывает: даже старый
          // verified refund остаётся важным, а свежий неразмеченный spam — нет.
          if (data.triageState === 'kept') {
            actionableWaitingCount += 1;
            if (oldestActionableWaitingMs === null || waited > oldestActionableWaitingMs) {
              oldestActionableWaitingMs = waited;
            }
          } else {
            legacyWaitingCount += 1;
          }
          continue;
        }

        // All waiting mail is scanned, while response-speed history remains bounded.
        if (status === 'answered' && receivedAtMs >= input.nowMs - SUPPORT_LOOKBACK_MS) {
          answeredCount += 1;
          const repliedAtMs = toMs(data.repliedAt);
          if (repliedAtMs !== null && repliedAtMs >= receivedAtMs && repliedAtMs <= input.nowMs) {
            replyDurations.push(repliedAtMs - receivedAtMs);
          }
        }
      }

      if (snap.docs.length < MAX_SUPPORT_DOCS) break;
      pageQuery = baseQuery.startAfter(snap.docs[snap.docs.length - 1]);
    }

    const nothingRelevant = waitingCount === 0 && answeredCount === 0;
    return Object.freeze({
      state: nothingRelevant ? ('empty' as const) : ('ready' as const),
      waitingCount,
      oldestWaitingMs,
      actionableWaitingCount,
      oldestActionableWaitingMs,
      legacyWaitingCount,
      answeredCount,
      medianReplyMs: median(replyDurations),
      observedAtMs: input.nowMs,
    });
  } catch {
    // Недоступный ящик — это «неизвестно», а не «никто не ждёт».
    return Object.freeze({
      state: 'error' as const,
      waitingCount: null,
      oldestWaitingMs: null,
      actionableWaitingCount: null,
      oldestActionableWaitingMs: null,
      legacyWaitingCount: null,
      answeredCount: null,
      medianReplyMs: null,
      observedAtMs: input.nowMs,
    });
  }
}
