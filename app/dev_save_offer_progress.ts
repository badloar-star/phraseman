/**
 * DEV-подмена «прогресс для шага удержания в отмене подписки»: `dev_state?offerProgress=on` / `offerProgress=off`.
 *
 * зачем (координатор 12.10, profile-022 / paywalls-024): шаг робота «причина → Продолжить» у чистого гостя не находит прогресса (resolveSaveOffer → «none») и сразу открывает
 * страницу отмены в ВНЕШНЕМ браузере — кадр испорчен системным окном. С флагом шаг получает ровно те цифры, что на макете manage-subscription-states (12 дней подряд, 38 уроков),
 * и останавливается на шторке удержания, не доходя до магазина. Только память: ни в облако, ни на диск не пишется. Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер
 * всегда null, а установка отклоняется. Лог: [DEV-STATE] offerProgress.
 */
import { IS_STORE_RELEASE } from './config';

export const DEV_SAVE_OFFER_PROGRESS = Object.freeze({ streak: 12, lessonsCompleted: 38 });

let on = false;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Включить/выключить подмену. В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevSaveOfferProgress(next: boolean): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] offerProgress: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  on = next;
  console.log(next
    ? `[DEV-STATE] offerProgress=on (шаг удержания видит серию ${DEV_SAVE_OFFER_PROGRESS.streak} и уроков ${DEV_SAVE_OFFER_PROGRESS.lessonsCompleted}, только память)`
    : '[DEV-STATE] offerProgress=off (прогресс из снимка главной)');
  return true;
}

/** Подменённый прогресс или null (подмены нет / стор-сборка). */
export function getDevSaveOfferProgress(): Readonly<{ streak: number; lessonsCompleted: number }> | null {
  return devAvailable() && on ? DEV_SAVE_OFFER_PROGRESS : null;
}
