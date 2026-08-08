/**
 * haptics — тонкая обёртка вибрации FeedbackKit поверх hooks/use-haptics
 * (спек §2 haptics.ts). НЕ дублирует логику: переиспользует уже готовые
 * функции хука, которые сами:
 *  - уважают настройку тактильного отклика (кэш haptics_tap), и
 *  - гасят наложение/дребезг (общий кулдаун, анти-наложение tap↔feedback).
 *
 * зачем 2026-08-03 (владелец: «убрать эффект серии полностью»): medium()/peak()
 * (уровни «молния»/«гроза» эффекта серии 5/10) убраны — light() остаётся для
 * fk.transition() (смена задания), с сериями больше не связан.
 * Всё огню-и-забыл (fire-and-forget): промисы не ждём, ошибки глушит сам хук.
 */
import {
  hapticTap,
  hapticSoftImpact,
  hapticLightImpact,
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

/** Лёгкий импульс (используется fk.transition — смена задания). */
export function light(): void {
  void hapticLightImpact();
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
