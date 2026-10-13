/**
 * DEV-подмена «в «Сегодня» есть задание Пика»: `dev_state?todaytask=spire` / `todaytask=off`.
 *
 * зачем (координатор 13.10, переименование «Шпиль → Пик» 95d30d485): строка «Пройти ступени Пика» выпадает только при живом
 * конфиге Пика (в проде выключен) и при случайном выборе дня — на эмуляторе кадр недостижим. Подмена меняет ТОЛЬКО показ списка
 * «Сегодня» (хук use_today_tasks): последнее нетронутое задание в копии заменяется на «Пройти ступени Пика» 0/3. Набор дня
 * в хранилище не пишется, облака нет; перезапуск приложения сбрасывает.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда false, а установка отклоняется. Лог: [DEV-STATE] todaytask.
 */
import { IS_STORE_RELEASE } from './config';

let spire = false;
const listeners = new Set<() => void>();

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

export function subscribeDevTodayTasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Включить/выключить задание Пика в показе «Сегодня». В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevTodayTaskSpire(next: boolean): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] todaytask: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  spire = next;
  console.log(next ? '[DEV-STATE] todaytask=spire (в «Сегодня» показано «Пройти ступени Пика», только память)' : '[DEV-STATE] todaytask=off'); // guard-ok: единичный лог на ссылку
  listeners.forEach((listener) => listener());
  return true;
}

/** true — показать задание Пика. В стор-сборке всегда false. */
export function getDevTodayTaskSpire(): boolean {
  return devAvailable() && spire;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
