// ═══════════════════════════════════════════════════════════════════════════
// prep_cta_model.ts — «Готовим занятие…»: чистые числа и ветки вида занятой кнопки (живой макет docs/design/v2-app/lesson-preparing-live.html, 25.10).
//
// зачем (владелец утвердил макет; координатор): занятие почти всегда собрано заранее, и тогда кнопка ничего не ждёт — переход сразу.
// «Готовим…» — только крайний случай. Здесь одни числа и ветки без React и часов: тайминги из макета (350 мс «обычно», 6 с «Ещё готовится…»,
// 12 с срок подготовки, 200 мс «дотягивание» заливки) и «честный» ход, который не доходит до конца сам.
// ═══════════════════════════════════════════════════════════════════════════

/** Дольше этого подготовка считается не «обычной»: до порога кнопка выглядит как всегда, после — кольцо хода и «Готовим занятие…». */
export const PREP_BUSY_SHOW_MS = 350;
/** Через столько мс подпись меняется на «Ещё готовится…». */
export const PREP_STILL_AT_MS = 6000;
/** Срок подготовки (LEARNING_V2_PREPARE_TIMEOUT_MS): не успело — кнопка возвращается, снизу подсказка. */
export const PREP_MAX_MS = 12_000;
/** Готово: заливка и кольцо дотягиваются до конца за столько мс, затем переход. */
export const PREP_FINISH_MS = 180;
/** Пауза после дотягивания перед переходом (макет: ждём 200 мс). */
export const PREP_FINISH_BEAT_MS = 200;
/** Сколько занимает смена подписи/значка (макет: 160 мс, размытие 2 px — в RN без размытия, только прозрачность). */
export const PREP_SWAP_MS = 160;
/** Плавный ход: быстро до ~60 %, дальше медленнее, не доходит до конца сам — честное «ещё идёт». */
export function prepFakeProgress(elapsedMs: number): number {
  const t = Math.max(0, elapsedMs);
  return 0.92 * (1 - Math.exp(-t / 4200));
}

export type PrepStage = 'idle' | 'preparing' | 'still';

/** Какая подпись на кнопке через elapsedMs от тапа; `idle` — кнопка выглядит как обычно (обычный случай «уже собрано» или не запущено). */
export function prepStageAt(elapsedMs: number): PrepStage {
  if (!(elapsedMs >= PREP_BUSY_SHOW_MS)) return 'idle';
  return elapsedMs >= PREP_STILL_AT_MS ? 'still' : 'preparing';
}

/** Через сколько мс от тапа нужна следующая смена подписи; null — больше смен нет. */
export function prepNextStageInMs(elapsedMs: number): number | null {
  if (elapsedMs < PREP_BUSY_SHOW_MS) return PREP_BUSY_SHOW_MS - Math.max(0, elapsedMs);
  if (elapsedMs < PREP_STILL_AT_MS) return PREP_STILL_AT_MS - elapsedMs;
  return null;
}

/** Ветка итога подготовки для журнала [PREP-CTA]: что увидел человек. */
export type PrepOutcome = 'instant' | 'prepared' | 'prepared_after_still' | 'timeout' | 'failed';

export function prepOutcomeOf(input: Readonly<{ elapsedMs: number; ok: boolean; timedOut: boolean }>): PrepOutcome {
  if (!input.ok) return input.timedOut ? 'timeout' : 'failed';
  if (input.elapsedMs < PREP_BUSY_SHOW_MS) return 'instant';
  return input.elapsedMs >= PREP_STILL_AT_MS ? 'prepared_after_still' : 'prepared';
}
