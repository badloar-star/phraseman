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

export type SupportSourceState = 'ready' | 'empty' | 'error';

export interface FetchSupportSourceResult {
  readonly state: SupportSourceState;
  /** Живые люди, всё ещё ждущие ответа. null — источник не смог доказать число. */
  readonly waitingCount: number | null;
  /** Сколько ждёт САМОЕ старое неотвеченное письмо. */
  readonly oldestWaitingMs: number | null;
  /** Отвеченные письма за окно. */
  readonly answeredCount: number | null;
  /** Медиана времени ответа — устойчива к одному забытому письму. */
  readonly medianReplyMs: number | null;
  readonly observedAtMs: number;
}

export interface FetchSupportSourceInput {
  readonly collection: FirebaseFirestore.Query;
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
    const snap = await input.collection
      .where('receivedAtMs', '>=', input.nowMs - SUPPORT_LOOKBACK_MS)
      .orderBy('receivedAtMs', 'desc')
      // Только время и статус. Ни fromEmail, ни fromName, ни bodyText.
      .select('receivedAtMs', 'status', 'repliedAt', 'mailCategory')
      .limit(MAX_SUPPORT_DOCS)
      .get();

    let waitingCount = 0;
    let oldestWaitingMs: number | null = null;
    let answeredCount = 0;
    const replyDurations: number[] = [];

    // guard-ok: один .get() выше вернул страницу разом; цикл идёт по уже
    // полученным документам, без чтений Firestore внутри.
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      // зачем отсекать роботов: автописьма никого не заставляют ждать, но
      // раздули бы очередь ожидания и сделали бы метрику бессмысленной.
      if (data.mailCategory === 'automated') continue;

      const receivedAtMs = toMs(data.receivedAtMs);
      if (receivedAtMs === null) continue;

      if (data.status === 'new') {
        waitingCount += 1;
        const waited = input.nowMs - receivedAtMs;
        if (waited >= 0 && (oldestWaitingMs === null || waited > oldestWaitingMs)) oldestWaitingMs = waited;
        continue;
      }

      if (data.status === 'answered') {
        answeredCount += 1;
        const repliedAtMs = toMs(data.repliedAt);
        // зачем отбрасывать: ответ раньше письма — испорченная запись, а не
        // мгновенный ответ. Считать её нулём значило бы приукрасить метрику.
        if (repliedAtMs !== null && repliedAtMs >= receivedAtMs) {
          replyDurations.push(repliedAtMs - receivedAtMs);
        }
      }
    }

    const nothingRelevant = waitingCount === 0 && answeredCount === 0;
    return Object.freeze({
      state: nothingRelevant ? ('empty' as const) : ('ready' as const),
      waitingCount,
      oldestWaitingMs,
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
      answeredCount: null,
      medianReplyMs: null,
      observedAtMs: input.nowMs,
    });
  }
}
