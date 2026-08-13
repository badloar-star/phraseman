/**
 * Идемпотентность LLM-обогатителя: не платить дважды за одно и то же решение.
 *
 * зачем этот модуль отдельно от llm_budget.ts: бюджет ограничивает СКОЛЬКО
 * можно потратить всего, этот модуль не даёт потратить ДВАЖДЫ за одну и ту же
 * работу. jarvisDailyDepartmentsCron сконфигурирован с retryCount: 1 — при
 * ретрае Cloud Functions запускает всю функцию заново, включая уже
 * оплаченные вызовы LLM, если их ничего не защищает.
 *
 * Ключ идемпотентности — contentHash решения (decision.ts), а не department
 * или timestamp: он уже устроен так, что одинаковый смысл решения даёт
 * одинаковый хеш, а любое смысловое изменение — новый. Ретрай того же прогона
 * почти всегда даёт те же решения → тот же хеш → слот уже занят → пропуск.
 */

export const JARVIS_LLM_ENRICHMENT_CACHE_COLLECTION = 'jarvis_llm_enrichment_cache';

/**
 * зачем ограничение по возрасту: слот резервируется ДО вызова LLM и только
 * ПОСЛЕ успеха получает narrative. Если процесс упал между резервацией и
 * записью результата (сбой сети к OpenAI, таймаут функции), слот навечно
 * блокировал бы решение с точно таким же содержанием в будущем. Час —
 * с большим запасом больше, чем занимает один вызов LLM.
 */
const STALE_RESERVATION_MS = 60 * 60 * 1_000;

interface EnrichmentCacheDoc {
  readonly reservedAtMs: number;
  readonly completedAtMs?: number;
  readonly narrative?: string;
}

export interface ReserveEnrichmentSlotInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly contentHash: string;
  readonly nowMs: number;
}

export type ReserveEnrichmentSlotVerdict =
  | { readonly reserved: true }
  | { readonly reserved: false; readonly narrative?: string };

/**
 * Резервирует право заплатить за обогащение ЭТОГО решения.
 *
 * зачем транзакция: крон и ручной прогон панели теоретически могут
 * пересечься на одном и том же решении — резервация обязана быть атомарной,
 * иначе оба пройдут проверку «слот свободен» до того, как кто-то из них его займёт.
 */
export async function reserveEnrichmentSlot(
  input: ReserveEnrichmentSlotInput,
): Promise<ReserveEnrichmentSlotVerdict> {
  const ref = input.db.doc(`${JARVIS_LLM_ENRICHMENT_CACHE_COLLECTION}/${input.contentHash}`);
  try {
    return await input.db.runTransaction<ReserveEnrichmentSlotVerdict>(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as EnrichmentCacheDoc | undefined) : undefined;

      const isStale = data !== undefined && input.nowMs - data.reservedAtMs > STALE_RESERVATION_MS;
      if (data !== undefined && !isStale) {
        return typeof data.narrative === 'string' && data.narrative.trim()
          ? { reserved: false, narrative: data.narrative }
          : { reserved: false };
      }

      tx.set(ref, { reservedAtMs: input.nowMs } satisfies EnrichmentCacheDoc);
      return { reserved: true };
    });
  } catch {
    // Недоступное хранилище — отказ в резервации, а не молчаливое разрешение тратить.
    return { reserved: false };
  }
}

export interface RecordEnrichmentResultInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly contentHash: string;
  readonly narrative: string;
  readonly nowMs: number;
}

/** Фиксирует успешный результат под тем же ключом, которым резервировали слот. */
export async function recordEnrichmentResult(input: RecordEnrichmentResultInput): Promise<void> {
  const ref = input.db.doc(`${JARVIS_LLM_ENRICHMENT_CACHE_COLLECTION}/${input.contentHash}`);
  await ref.set(
    {
      reservedAtMs: input.nowMs,
      completedAtMs: input.nowMs,
      narrative: input.narrative,
    } satisfies EnrichmentCacheDoc,
    { merge: true },
  );
}
