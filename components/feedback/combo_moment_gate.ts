// ═══════════════════════════════════════════════════════════════════════════
// combo_moment_gate.ts — m08 «Молния» (эталон engagement-moments-v3-all.html `comboInit`): какой удар сыграть при смене серии верных ответов и тайминги.
//
// зачем (владелец 15.10: «ДА ДЕЛАЙ, НА КОЛЬЦЕ», монету-персонажа «НЕ УБИРАЕМ А ОСТАВЛЯЕМ»): серия ответов держит внимание до конца урока, правила честные — ошибка обнуляет.
// Пороги — те же, что у combo_engine (3 «Искра», 5 «Молния», 10 «Гроза»): удар играет только при пересечении порога вверх ЭТИМ ответом; обрыв — когда серия ≥ 3 стала 0.
// Счётчик серии и награды не трогаем (он у lesson1) — модуль только решает, что показать. Чистые функции, причина уходит в журнал [MOMENT-m08].
// ═══════════════════════════════════════════════════════════════════════════
import { COMBO_LIGHTNING_AT, COMBO_SPARK_AT, COMBO_STORM_AT } from '../../app/feedback/combo_engine';

export const COMBO_MOMENT_LOG = '[MOMENT-m08]';
/** Трассировка показа/скрытия/отмены таймеров «Молнии» (Ревизор 15.10, баг залипания) — постоянный журнал ранних выходов и таймеров. */
export const COMBO_TRACE = '[COMBO-MOMENT]';

export type ComboBeat = 'spark' | 'lightning' | 'storm' | 'break';

/** Удар по смене серии prev → next; null — показывать нечего. */
export function deriveComboBeat(prev: number, next: number): ComboBeat | null {
  if (next < prev) return prev >= COMBO_SPARK_AT && next === 0 ? 'break' : null;
  if (next === prev) return null;
  if (prev < COMBO_STORM_AT && next >= COMBO_STORM_AT) return 'storm';
  if (prev < COMBO_LIGHTNING_AT && next >= COMBO_LIGHTNING_AT) return 'lightning';
  if (prev < COMBO_SPARK_AT && next >= COMBO_SPARK_AT) return 'spark';
  return null;
}

/** Тайминги образца, мс. */
export const COMBO_MOMENT_TIMELINE = {
  /** Плашка «N подряд» — emPop 400 мс. */
  tipPop: 400,
  /** Встряска шапки (кольца) на «Грозе» — emShake 400 мс. */
  shake: 400,
  /** Молния: штрих 420 мс, гаснет за 400 мс начиная с 900 мс. */
  zapDraw: 420,
  zapFadeAt: 900,
  zapFade: 400,
  /** Вспышка (emFlash) 500 мс, пик .6. */
  flash: 500,
  flashPeak: 0.6,
  /** Холодная виньетка: держится 400 мс, гаснет 600 мс. */
  coldHold: 400,
  coldFade: 600,
  /** Сколько держать «серия сброшена» на месте кольца после обрыва. */
  brokenHold: 1600,
  /** Монета: сколько видна после своего удара (не закрывает вопрос надолго). */
  coinStay: 1800,
} as const;
