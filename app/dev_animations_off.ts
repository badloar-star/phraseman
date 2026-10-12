/**
 * DEV-подмена «бесконечные декоративные анимации не запускаются»: `dev_state?animations=off` / `animations=on`.
 *
 * зачем (координатор 12.10, хаб Карточек): «парение» стопки крутится бесконечно (приказ владельца 11.10), из-за этого `uiautomator dump` не доходит до покоя и робот
 * не видит дерево интерфейса хаба. Продукт не трогаем — для кадров робот просит остановить парение ссылкой. Только память процесса: ничего не пишется ни в хранилище,
 * ни в облако. Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда false, а установка отклоняется. Лог: [DEV-STATE] animations.
 */
import { IS_STORE_RELEASE } from './config';

let off = false;
const listeners = new Set<() => void>();

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Подписка экрана (useSyncExternalStore): вызывается при смене флага. */
export function subscribeDevAnimationsOff(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Включить/выключить остановку анимаций. В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevAnimationsOff(next: boolean): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] animations: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  off = next;
  console.log(next ? '[DEV-STATE] animations=off (парение стопки хаба не запускается, только память)' : '[DEV-STATE] animations=on (анимации как в продукте)'); // guard-ok: единичный лог на ссылку
  listeners.forEach((listener) => listener());
  return true;
}

/** true — анимации остановлены. В стор-сборке всегда false. */
export function isDevAnimationsOff(): boolean {
  return devAvailable() && off;
}
