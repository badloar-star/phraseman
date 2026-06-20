/**
 * Компас — мотивация (удержание). Крыло «Мотивация», Волна 3.2.
 *
 * Чистые правила тёплого удержания. НЕ шлёт пуши и не трогает серию сам —
 * только РЕШАЕТ, что было бы уместно (какой пуш, какая рамка серии). Применяющий
 * слой (push-планировщик) берёт решение и действует через существующие каналы.
 *
 * Правила Библии соблюдены:
 *  - возврат после паузы: тёплый, gain-framing («всё твоё на месте»);
 *  - серия: лёгкий loss-framing («серия ждёт») ТОЛЬКО для активных 7+ дней,
 *    для остальных — gain;
 *  - без запугивания и фальшивой срочности.
 *
 * ИЗОЛЯЦИЯ: применять только при `compassRetentionOn()`. Модуль чист, без
 * сайд-эффектов; Date.now() не вызывается внутри (время передаётся снаружи).
 */
import {
  COMPASS_PUSH_COMEBACK,
  COMPASS_PUSH_NEW_PHRASES,
  COMPASS_PUSH_STREAK_GAIN,
  COMPASS_PUSH_STREAK_KEEP,
  type CompassText,
} from './compass_copy';

/** Минимальная серия, при которой допустим loss-framing «серия ждёт» (правило Библии). */
export const STREAK_LOSS_FRAMING_MIN_DAYS = 7;
/** Пауза, после которой пуш — тёплый возврат. */
export const COMEBACK_PAUSE_MS = 3 * 24 * 60 * 60 * 1000;

export interface RetentionInput {
  /** Последняя активность (мс). */
  lastSeenAtMs: number;
  /** Текущее время (мс) — снаружи, для тестируемости. */
  nowMs: number;
  /** Текущая серия дней. */
  streakDays: number;
  /** Есть ли новые фразы в теме ученика (готовый сигнал). */
  hasNewPhrases: boolean;
}

export type CompassPushKind = 'comeback' | 'streak_keep' | 'streak_gain' | 'new_phrases' | 'none';

export interface CompassPushDecision {
  kind: CompassPushKind;
  /** Текст пуша (CompassText под triLang), либо null если пуш не нужен. */
  text: CompassText | null;
  /** Подстановка дней серии (для streak_keep). */
  days?: number;
}

/**
 * Выбрать уместный пуш по снимку. Приоритет: возврат → защита серии → новые фразы.
 * Возвращает {kind:'none'} если повода нет (Компас не шумит без причины).
 */
export function decideRetentionPush(input: RetentionInput): CompassPushDecision {
  const idleMs = input.nowMs - input.lastSeenAtMs;

  // 1) Долгая пауза → тёплый возврат (gain-framing).
  if (idleMs >= COMEBACK_PAUSE_MS) {
    return { kind: 'comeback', text: COMPASS_PUSH_COMEBACK };
  }

  // 2) Не заходил сегодня, но серия активна → защита серии.
  const idleToday = idleMs >= 12 * 60 * 60 * 1000; // полдня без входа
  if (idleToday && input.streakDays > 0) {
    if (input.streakDays >= STREAK_LOSS_FRAMING_MIN_DAYS) {
      // loss-framing допустим только для активных 7+ дней (правило Библии).
      return { kind: 'streak_keep', text: COMPASS_PUSH_STREAK_KEEP, days: input.streakDays };
    }
    return { kind: 'streak_gain', text: COMPASS_PUSH_STREAK_GAIN };
  }

  // 3) Есть новые фразы в теме → лёгкое приглашение.
  if (input.hasNewPhrases) {
    return { kind: 'new_phrases', text: COMPASS_PUSH_NEW_PHRASES };
  }

  return { kind: 'none', text: null };
}

/**
 * Нужен ли «тёплый день-возврат» (короткий день из почти забытого) вместо обычного.
 * True, если пауза дольше порога — тогда мозг соберёт день типа comeback.
 */
export function needsComebackDay(lastSeenAtMs: number, nowMs: number): boolean {
  return nowMs - lastSeenAtMs >= COMEBACK_PAUSE_MS;
}
