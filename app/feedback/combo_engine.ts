/**
 * combo_engine — чистый модуль серии верных ответов (FeedbackKit, спек §2/§2.1).
 *
 * Без React, без таймеров, без сайд-эффектов: только счётчик и уровни. Хост
 * (экран урока/тренажёра) владеет собственным счётчиком серии; движок здесь —
 * лишь удобный «источник истины» для ВИЗУАЛА и ЗВУКА (кольцо, молния, стингеры).
 * ВАЖНО (спек §2): в lesson1 есть свой combo, участвующий в формуле XP — его
 * НЕ трогаем; этот движок даёт только уровни/пороги для ощущений.
 *
 * Уровни:
 *  - 0            — нет серии (value < 3)
 *  - 1 «Искра»    — 3..4
 *  - 2 «Молния»   — 5..9
 *  - 3 «Гроза»    — 10+
 *
 * Каждое событие возвращает новое значение/уровень (иммутабельно) и, если серия
 * ПЕРЕСЕКЛА порог вверх именно этим шагом — `crossedThreshold` (ровно один раз
 * на пересечение). Обрыв (`onWrong` при value>0) даёт `broke:true` и `brokenFrom`.
 */

export type ComboLevel = 0 | 1 | 2 | 3;

/** Порог, пересечённый вверх на этом шаге (совпадает с новым уровнем). */
export type ComboThreshold = 1 | 2 | 3;

export interface ComboEvent {
  /** Значение серии ПОСЛЕ события. */
  readonly value: number;
  /** Уровень серии ПОСЛЕ события. */
  readonly level: ComboLevel;
  /** Установлен только если этим шагом уровень поднялся до нового порога. */
  readonly crossedThreshold?: ComboThreshold;
  /** true, если этим шагом серия оборвалась (был >0, стал 0). */
  readonly broke?: boolean;
  /** Значение серии ДО обрыва (только при broke). */
  readonly brokenFrom?: number;
}

export interface ComboEngine {
  /** Верный ответ: +1 к серии. Возвращает новое событие. */
  onCorrect(): ComboEvent;
  /** Неверный ответ: серия сбрасывается в 0. Возвращает событие (broke при value>0). */
  onWrong(): ComboEvent;
  /** Полный сброс без события обрыва (например, старт новой сессии). */
  reset(): void;
  /** Текущее значение серии. */
  readonly value: number;
  /** Текущий уровень серии. */
  readonly level: ComboLevel;
}

/** Порог входа в уровень 1 (Искра). */
export const COMBO_SPARK_AT = 3;
/** Порог входа в уровень 2 (Молния). */
export const COMBO_LIGHTNING_AT = 5;
/** Порог входа в уровень 3 (Гроза). */
export const COMBO_STORM_AT = 10;

/** Уровень серии по её значению (чистая функция — переиспользуется хостами). */
export function comboLevelFor(value: number): ComboLevel {
  if (value >= COMBO_STORM_AT) return 3;
  if (value >= COMBO_LIGHTNING_AT) return 2;
  if (value >= COMBO_SPARK_AT) return 1;
  return 0;
}

/**
 * Создаёт независимый движок серии. Каждый экран/сессия — свой экземпляр;
 * состояние живёт в замыкании, наружу отдаются только методы и геттеры.
 */
export function createComboEngine(): ComboEngine {
  let value = 0;

  const engine: ComboEngine = {
    onCorrect(): ComboEvent {
      const prevLevel = comboLevelFor(value);
      value += 1;
      const level = comboLevelFor(value);
      const crossedThreshold =
        level > prevLevel ? (level as ComboThreshold) : undefined;
      return crossedThreshold !== undefined
        ? { value, level, crossedThreshold }
        : { value, level };
    },

    onWrong(): ComboEvent {
      const brokenFrom = value;
      value = 0;
      if (brokenFrom > 0) {
        return { value: 0, level: 0, broke: true, brokenFrom };
      }
      return { value: 0, level: 0 };
    },

    reset(): void {
      value = 0;
    },

    get value(): number {
      return value;
    },

    get level(): ComboLevel {
      return comboLevelFor(value);
    },
  };

  return engine;
}
