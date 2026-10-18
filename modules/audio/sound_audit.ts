// sound_audit.ts — журнал [SOUND-AUDIT] (координатор 18.10, владелец: «в приложении ни одного звука»).
// зачем отдельно: SoundService (Карточки) и SoundDirector пишут одну и ту же строку, а тянуть ради журнала тяжёлый sound_director в Карточки нельзя.
// console.warn — строка видна и в релизной сборке (console.log там вырезается). Временная трассировка: убрать после диагноза, кроме веток отказа.

/** Одна строка JSON на событие звука: стадия + данные (что играли, решение, причина, флаги). */
export function soundAudit(stage: string, data: Readonly<Record<string, unknown>>): void {
  try {
    console.warn(`[SOUND-AUDIT] ${stage} ${JSON.stringify(data)}`); // guard-ok: временная трассировка «нет звука»
  } catch (error) {
    console.warn(`[SOUND-AUDIT] ${stage} log_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя журнала
  }
}
