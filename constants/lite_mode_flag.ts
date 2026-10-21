// зачем (Сверка 21.10, пункт №39, Galaxy A04): плоский флаг «Лёгкий режим» без тяжёлых импортов — его читают тени
// (constants/liquidGlassShadowStyle.ts) на КАЖДОМ рендере, поэтому здесь нет ни AsyncStorage, ни React Native.
// Выставляет флаг app/lite_mode.ts (авто по ОЗУ < 3 ГБ или ручной переключатель в Настройках).
let liteModeOn = false;
const listeners = new Set<(on: boolean) => void>();

export function isLiteModeOn(): boolean {
  return liteModeOn;
}

export function setLiteModeFlag(on: boolean): void {
  if (liteModeOn === on) return;
  liteModeOn = on;
  listeners.forEach((listener) => listener(on));
}

export function subscribeLiteModeFlag(listener: (on: boolean) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
