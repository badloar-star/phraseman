/**
 * Самая ранняя отметка JS-старта для [COLD-START] + (только дев) цена исполнения модулей.
 *
 * зачем (координатор 04.10, холодный старт п.1, «сперва логи»): BOOT_T0 в _layout ставится уже ПОСЛЕ всех
 * статических импортов корня, а performance.now в RN — общие часы, не время от старта процесса. Поэтому
 * цену графа импортов (в т.ч. модальных хостов) было не видно. Этот модуль импортируется ПЕРВЫМ в index.js
 * и запоминает время входа; _layout пишет layout.module_imports:done с entryToImportsMs.
 *
 * Замер «после» показал ~6 с импортов корня (дев). Чтобы понять, ЧТО в них тяжёлое, в дев-сборке ставим
 * хук Systrace рантайма Metro: он зовётся на каждом первом require модуля (metro-runtime require.js,
 * global.__SYSTRACE). Копим «своё» время модуля (без вложенных require) и полное; отчёт — топ модулей.
 * В релизе хука нет: __SYSTRACE не трогаем, отчёт пустой.
 */
const holder = globalThis as {
  __phrasemanEntryEpochMs?: number;
  __DEV__?: boolean;
  __SYSTRACE?: { beginEvent?: (name?: string) => void; endEvent?: () => void };
};
if (typeof holder.__phrasemanEntryEpochMs !== 'number') {
  holder.__phrasemanEntryEpochMs = Date.now();
  // зачем (координатор 29.10, замер холодного старта 146 против HEAD при бандле 101 → 122 МБ): в релизе не было точки
  // «JS начал исполняться». Отрезок «Start proc» (logcat) → эта строка = нативный старт + загрузка бандла,
  // дальше → [HOME-PAINT] first_frame = инициализация JS и первый кадр. warn — переживает прод-сборку; одна строка на запуск.
  console.warn(`[COLD-START] js_entry epochMs=${holder.__phrasemanEntryEpochMs}`); // guard-ok: одна строка на запуск
}

export function msSinceJsEntry(): number {
  const entry = holder.__phrasemanEntryEpochMs;
  return typeof entry === 'number' ? Date.now() - entry : -1;
}

type Frame = { name: string; startedAt: number; childMs: number };
const moduleSelfMs = new Map<string, number>();
const moduleTotalMs = new Map<string, number>();
const frames: Frame[] = [];
// зачем ((б), пакет 07:26: lessons.tsx/journal.tsx по 321 мс в графе корня, home.tsx вычислен вместе с корнем — хотя
// (tabs)/_layout держит их лениво): кто ПЕРВЫМ потребовал модуль. В отчёте — цепочки «модуль ← требователь ← …».
const firstRequirer = new Map<string, string | null>();
let moduleCount = 0;
let tracing = false;

function shortName(raw: string): string {
  const name = raw.startsWith('JS_require_') ? raw.slice('JS_require_'.length) : raw;
  return name.replace(/\\/g, '/').replace(/^.*?\/(app|components|modules|hooks|constants|node_modules)\//, '$1/');
}

if (holder.__DEV__ === true) {
  const previous = holder.__SYSTRACE;
  tracing = true;
  holder.__SYSTRACE = {
    beginEvent: (name?: string) => {
      previous?.beginEvent?.(name);
      if (!tracing || typeof name !== 'string' || !name.startsWith('JS_require_')) return;
      const short = shortName(name);
      if (!firstRequirer.has(short)) firstRequirer.set(short, frames[frames.length - 1]?.name ?? null);
      frames.push({ name: short, startedAt: Date.now(), childMs: 0 });
    },
    endEvent: () => {
      previous?.endEvent?.();
      if (!tracing) return;
      const frame = frames.pop();
      if (!frame) return;
      const totalMs = Date.now() - frame.startedAt;
      moduleCount += 1;
      moduleTotalMs.set(frame.name, totalMs);
      moduleSelfMs.set(frame.name, Math.max(0, totalMs - frame.childMs));
      const parent = frames[frames.length - 1];
      if (parent) parent.childMs += totalMs;
    },
  };
}

/**
 * Дев: топ модулей по «своему» времени и по полному (с вложенными) — срез с прошлого вызова.
 * Срезы: layout.module_imports:done (граф корня) и кадр Главной (всё, что исполнилось до него, в т.ч.
 * ленивый чанк Главной). stop=true выключает трассировку.
 */
export function takeModuleEvalReport(
  top = 15,
  options: Readonly<{ stop?: boolean }> = {},
): Readonly<{ modules: number; selfSumMs: number; self: string; total: string; chains: string }> | null {
  if (!tracing) return null;
  const fmt = (map: Map<string, number>) => [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([name, ms]) => `${ms}ms ${name}`)
    .join(' | ');
  let selfSumMs = 0;
  moduleSelfMs.forEach((ms) => { selfSumMs += ms; });
  // Цепочки требователей для top-8 по полному времени (до 6 уровней вверх).
  const chains = [...moduleTotalMs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => {
      const chain = [name];
      let cursor = firstRequirer.get(name) ?? null;
      while (cursor && chain.length < 7) { chain.push(cursor); cursor = firstRequirer.get(cursor) ?? null; }
      return chain.join(' ← ');
    })
    .join(' || ')
    // logcat режет строки ~4000 символов — держим запас.
    .slice(0, 3500);
  const report = { modules: moduleCount, selfSumMs, self: fmt(moduleSelfMs), total: fmt(moduleTotalMs), chains };
  moduleSelfMs.clear();
  moduleTotalMs.clear();
  moduleCount = 0;
  if (options.stop) tracing = false;
  return report;
}

/* expo-router: keep this utility from being treated as a screen */
export default function __ColdStartEntryMarkRouteShim() {
  return null;
}
