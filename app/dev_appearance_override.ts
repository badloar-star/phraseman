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

// зачем (Сверка chain7, 12.10: «плашка мятная в образце, серая в приложении; кнопка белая против мятной»): образец макетов — тема «Аврора» на полной насыщенности (#7EF0C8 на #04261D),
// а приложение снимали с «Графит» на нуле, где акцент нейтрально-светлый. Робот не мог выставить тему и оттенок ссылкой — только руками в настройках. Теперь dev_state?theme=<id>&level=<0..1>
// подменяет ТОЛЬКО в памяти процесса тему и оттенок ползунка (хранилище и облако не тронуты); сброс — theme=clear / level=clear или перезапуск.
export type DevThemeChoice = Readonly<{ themeId: string | null; intensity: number | null }>;

let themeChoice: DevThemeChoice | null = null;
const themeListeners = new Set<(value: DevThemeChoice | null) => void>();

export function getDevThemeChoice(): DevThemeChoice | null {
  return themeChoice;
}

export function setDevThemeChoice(value: DevThemeChoice | null): void {
  const next = value && value.themeId === null && value.intensity === null ? null : value;
  if (themeChoice?.themeId === next?.themeId && themeChoice?.intensity === next?.intensity) return;
  console.log(`[DEV-STATE] theme override ${JSON.stringify(themeChoice)} → ${JSON.stringify(next)} (только память, хранилище не тронуто)`); // guard-ok: dev-оверрайд, смена значения
  themeChoice = next;
  for (const listener of themeListeners) listener(next);
}

export function subscribeDevThemeChoice(listener: (value: DevThemeChoice | null) => void): () => void {
  themeListeners.add(listener);
  return () => { themeListeners.delete(listener); };
}
