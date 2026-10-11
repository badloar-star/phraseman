/**
 * [MEM] — размер JS-кучи в ключевые моменты (Hermes getInstrumentedStats).
 *
 * зачем (координатор 11.10, «сперва логи»): на эмуляторе 2 ГБ приложение занимало 1,87 ГБ pss, и тап по
 * «Карточкам» давал ANR. Прежде чем что-то выгружать, нужны цифры: сколько весит куча на готовой Главной, при
 * открытии хаба Карточек и через минуту. Без Hermes (веб, тесты) — одна строка с причиной, без падений.
 */
type HermesStats = Record<string, number | string | undefined>;

function readHermesStats(): HermesStats | null {
  try {
    const hermes = (globalThis as { HermesInternal?: { getInstrumentedStats?: () => HermesStats } }).HermesInternal;
    return hermes?.getInstrumentedStats?.() ?? null;
  } catch (error) {
    console.warn('[MEM] getInstrumentedStats failed', error instanceof Error ? error.message : String(error));
    return null;
  }
}

const mb = (value: unknown): number | null => (typeof value === 'number' ? Math.round((value / 1048576) * 10) / 10 : null);

export function logMemory(tag: string, extra: Record<string, unknown> = {}): void {
  const stats = readHermesStats();
  if (!stats) {
    console.log('[MEM]', tag, JSON.stringify({ hermes: false, ...extra }));
    return;
  }
  console.log('[MEM]', tag, JSON.stringify({
    heapMb: mb(stats.js_heapSize),
    allocatedMb: mb(stats.js_allocatedBytes),
    externalMb: mb(stats.js_externalBytes),
    numGCs: stats.js_numGCs ?? null,
    gcTimeMs: typeof stats.js_gcTime === 'number' ? Math.round(stats.js_gcTime * 1000) : null,
    ...extra,
  }));
}

const loggedOnce = new Set<string>();

/** Один раз за процесс (хаб открывают много раз — нужен первый заход и, при желании, повторы с другим тегом). */
export function logMemoryOnce(tag: string, extra: Record<string, unknown> = {}): void {
  if (loggedOnce.has(tag)) return;
  loggedOnce.add(tag);
  logMemory(tag, extra);
}

/** Готовая Главная: замер сейчас и через 60 с (фоновые загрузки после первого кадра). */
export function armMemoryProbeAfterHomePaint(): void {
  logMemoryOnce('home_painted');
  setTimeout(() => logMemoryOnce('home_painted+60s'), 60_000);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
