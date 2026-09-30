// ═══════════════════════════════════════════════════════════════════════════
// card_tts_jobs.ts — постановка набора в очередь озвучки (D128).
//
// зачем отдельный модуль без триггеров и секретов: его импортирует
// community_packs.ts (одобрение набора). Одобрение должно оставаться быстрым и
// не зависеть от OpenAI — здесь только одна маленькая запись job-документа,
// сама озвучка идёт в фоне (card_tts_worker.ts, onDocumentWritten).
//
// Документ на набор один (id = packId): повторная постановка лишь обновляет
// requestedAtMs — воркер сам сверяет ревизию карточек и не платит дважды.
// ═══════════════════════════════════════════════════════════════════════════

export const CARD_TTS_JOBS = 'card_tts_jobs';

export type CardTtsJobReason = 'moderation_approve' | 'author_edit_published' | 'admin_requeue';

export function isValidCardTtsPackId(packId: unknown): packId is string {
  return typeof packId === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(packId);
}

/**
 * Поставить набор в очередь озвучки. Никогда не бросает: сбой постановки
 * логируется и не ломает одобрение (набор просто останется без клипов, клиент
 * покажет спокойное «Голос недоступен» либо голос устройства нужного языка).
 */
export async function enqueueCardTtsJob(
  db: FirebaseFirestore.Firestore,
  packId: string,
  reason: CardTtsJobReason,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!isValidCardTtsPackId(packId)) {
    console.warn('[CARD-TTS] enqueue:skip', JSON.stringify({ packId: String(packId as unknown).slice(0, 80), reason, why: 'invalid_pack_id' }));
    return false;
  }
  try {
    await db.collection(CARD_TTS_JOBS).doc(packId).set({
      packId,
      status: 'queued',
      reason,
      requestedAtMs: nowMs,
      updatedAtMs: nowMs,
    }, { merge: true });
    console.log('[CARD-TTS] enqueue:ok', JSON.stringify({ packId, reason }));
    return true;
  } catch (error: unknown) {
    console.error('[CARD-TTS] enqueue:failed — набор останется без озвучки до повторной постановки', JSON.stringify({
      packId,
      reason,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    }));
    return false;
  }
}
