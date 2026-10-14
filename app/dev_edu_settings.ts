/**
 * DEV-подмена экрана «Обучение» для кадра паритета: `dev_state?edu=parity`.
 *
 * зачем (координатор 14.10, settings-gap-034): образец «Обучение — выбранный голос озвучки» снят с «Автопроверка» = вкл и
 * скоростью 1,0x, а у эмулятора свои сохранённые значения (выкл, 0,9x) — кадр расходился по данным, а не по вёрстке.
 * Подмена меняет ТОЛЬКО показ (getUserSettingsSnapshot подмешивает её): хранилище и облако не пишутся, перезапуск сбрасывает.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке установка отклоняется, а наложение ничего не меняет. Лог: [DEV-STATE] edu.
 */
import { IS_STORE_RELEASE } from './config';

let active = false;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Включить/выключить подмену «Автопроверка вкл, 1,0x». В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevEduSettingsParity(next: boolean): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] edu: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  active = next;
  console.log(next ? '[DEV-STATE] edu=parity (показ: Автопроверка вкл, скорость 1,0x; только память, ручные изменения в этом сеансе не видны до перезапуска)' : '[DEV-STATE] edu=off'); // guard-ok: единичный лог на ссылку
  return true;
}

/** Наложение на снимок настроек. Без подмены (и всегда в стор-сборке) возвращает тот же объект. */
export function devEduSettingsOverlay<T extends { autoCheck: boolean; speechRate: number }>(settings: T): T {
  if (!active || !devAvailable()) return settings;
  return { ...settings, autoCheck: true, speechRate: 1 };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
