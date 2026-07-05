/**
 * haptics — тонкая обёртка вибрации FeedbackKit поверх hooks/use-haptics
 * (спек §2 haptics.ts). НЕ дублирует логику: переиспользует уже готовые
 * функции хука, которые сами:
 *  - уважают настройку тактильного отклика (кэш haptics_tap), и
 *  - гасят наложение/дребезг (общий кулдаун, анти-наложение tap↔feedback).
 *
 * Даёт FeedbackKit удобную «палитру силы» по уровням серии (спек §2/§4):
 *  light (искра) → medium (молния) → peak (гроза).
 * Всё огню-и-забыл (fire-and-forget): промисы не ждём, ошибки глушит сам хук.
 */
import {
  hapticTap,
  hapticSoftImpact,
  hapticLightImpact,
  hapticMediumImpact,
  hapticHeavyImpact,
  hapticSuccess,
  hapticError,
} from '../../hooks/use-haptics';

/** Лёгкое касание (onPressIn интерактивов). */
export function tap(): void {
  void hapticTap();
}

/** «Плитка легла» — мягкий импульс. */
export function pop(): void {
  void hapticSoftImpact();
}

/** Искра (уровень 1) — лёгкий импульс. */
export function light(): void {
  void hapticLightImpact();
}

/** Молния (уровень 2) — средний импульс. */
export function medium(): void {
  void hapticMediumImpact();
}

/** Гроза (уровень 3) — сильнейший импульс. */
export function peak(): void {
  void hapticHeavyImpact();
}

/** Верный ответ / веха — «успех». */
export function success(): void {
  void hapticSuccess();
}

/** Верный ответ (алиас success — семантика точки проверки). */
export function correct(): void {
  void hapticSuccess();
}

/** Ошибка — мягкий «error» (не глушим, но и не «бззз»: тип задаёт ОС). */
export function wrong(): void {
  void hapticError();
}
