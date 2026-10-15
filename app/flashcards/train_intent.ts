// ═══════════════════════════════════════════════════════════════════════════
// train_intent.ts — намерение «тренировать этот набор» между экранами, которое не теряется при navigate в уже открытый хаб.
//
// зачем (🔴 Ц1 на эмуляторе, координатор 15.10): router.navigate('/flashcards', {train:'1', deck}) в уже смонтированный хаб Карточек параметры не передаёт —
// в логе `[BLITZ-AUTOOPEN] hub:autotrain-effect {train:null, deck:null}`, окно режимов не открывалось. Теперь экран ставит намерение здесь, хаб читает его на фокусе и сразу гасит
// (одноразово, со сроком жизни — старое намерение не должно открыть окно режимов «из ниоткуда»). Параметры маршрута остаются как второй путь. Журнал: [TRAIN-INTENT].
// ═══════════════════════════════════════════════════════════════════════════
export type TrainIntent = Readonly<{ deckId: string | null; count: number }>;

/** Намерение живёт недолго: это переход между экранами, а не хранилище. */
export const TRAIN_INTENT_TTL_MS = 10_000;

let pending: { intent: TrainIntent; atMs: number } | null = null;

export function setPendingTrainIntent(intent: TrainIntent, nowMs: number = Date.now()): void {
  pending = { intent, atMs: nowMs };
  console.log(`[TRAIN-INTENT] set deck=${String(intent.deckId)} count=${intent.count}`); // guard-ok: постановка намерения
}

/** Забрать и погасить. Просроченное — не отдаётся (причина в журнале). */
export function consumePendingTrainIntent(nowMs: number = Date.now()): TrainIntent | null {
  const current = pending;
  pending = null;
  if (!current) return null;
  const age = nowMs - current.atMs;
  if (age > TRAIN_INTENT_TTL_MS || age < 0) {
    console.log(`[TRAIN-INTENT] expired ageMs=${age} deck=${String(current.intent.deckId)}`); // guard-ok: просрочено
    return null;
  }
  console.log(`[TRAIN-INTENT] consume ageMs=${age} deck=${String(current.intent.deckId)} count=${current.intent.count}`); // guard-ok: выдача намерения
  return current.intent;
}

export function __resetTrainIntentForTests(): void {
  pending = null;
}
