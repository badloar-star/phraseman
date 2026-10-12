// зачем (координатор 12.10, «оптимизация всегда» → скорость Карточек, «сперва логи»): измерить, сколько раз перерисовываются плитки/строки за прокрутку и сколько
// проходит до первого кадра списка. Только dev: в сторе все функции — пустышки. Один префикс [CARDS-PERF] — вся цепочка одним поиском.
const DEV = typeof __DEV__ !== 'undefined' && __DEV__;

const counts: Record<string, number> = {};
const marks: Record<string, number> = {};

/** +1 к счётчику вида (render плитки, строки, событие прокрутки…). Вне dev — ничего. */
export function cardsPerfCount(kind: string): void {
  if (!DEV) return;
  counts[kind] = (counts[kind] ?? 0) + 1;
}

/** Запомнить последнее значение (сколько плиток в окне и т.п.). */
export function cardsPerfMark(kind: string, value: number): void {
  if (!DEV) return;
  marks[kind] = value;
}

/** Напечатать накопленное и обнулить счётчики: вызывать по концу прокрутки или смене экрана. */
export function cardsPerfFlush(surface: string, why: string, extra: Record<string, unknown> = {}): void {
  if (!DEV) return;
  console.log(`[CARDS-PERF] ${surface} ${why} ${JSON.stringify({ ...extra, counts: { ...counts }, marks: { ...marks } })}`); // guard-ok: только dev, значения решают вывод
  for (const key of Object.keys(counts)) delete counts[key];
}
