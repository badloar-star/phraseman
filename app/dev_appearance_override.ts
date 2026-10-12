// зачем (Макеты, 15.10: светлая Главная «ссылкой, а не переключением темы руками» — Сверка оставила приложение светлым на пол-серии): оформление light/dark
// только в ПАМЯТИ процесса, для dev_state?appearance=light|dark|clear. В хранилище и в облако ничего не пишется, сохранённый выбор темы не меняется; сброс — appearance=clear
// или перезапуск процесса. Читает ThemeContext (эффективное оформление = оверрайд ?? сохранённое). Маршрут dev_state существует только в dev-сборке.
export type DevAppearance = 'light' | 'dark';

let current: DevAppearance | null = null;
const listeners = new Set<(value: DevAppearance | null) => void>();

export function getDevAppearance(): DevAppearance | null {
  return current;
}

export function setDevAppearance(value: DevAppearance | null): void {
  if (current === value) return;
  console.log(`[DEV-STATE] appearance override ${String(current)} → ${String(value)} (только память, хранилище не тронуто)`); // guard-ok: dev-оверрайд, смена значения
  current = value;
  for (const listener of listeners) listener(value);
}

export function subscribeDevAppearance(listener: (value: DevAppearance | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
