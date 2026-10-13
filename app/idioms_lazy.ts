// зачем (ускорение сплэша, 2026-08-25): idioms_data весит 610 КБ JS и исполнялся
// прямо на сплэше через статические импорты DailyPhraseCard и daily_phrase_system,
// хотя первому кадру Главной нужна ровно ОДНА фраза. Полный каталог теперь
// поднимается только по требованию: квест в шторке деталей, фолбэк когда нет
// peek-кэша, планирование уведомления «фраза дня». Паттерн тот же, что у
// app/collectibles/catalog.ts — require внутри функции (Metro inlineRequires
// откладывает исполнение модуля до первого вызова).
import type { Idiom } from './idioms_data';
import { gcDelta, gcSnapshot } from './mem_probe';

let cachedIdioms: readonly Idiom[] | null = null;

/** Каталог уже поднят в этом процессе — обращение к нему бесплатно (daily_phrase_system: «завтрашняя» фраза). */
export function isIdiomsCatalogLoaded(): boolean {
  return cachedIdioms !== null;
}

export function getIdiomsSync(): readonly Idiom[] {
  if (!cachedIdioms) {
    // зачем (координатор 11.10, замер home_paint: idioms_data 627 мс на первом кадре Главной): «сперва логи» —
    // кто первым поднял полный каталог и сколько это стоило. Пишется один раз за процесс.
    const startedAt = Date.now();
    const gcAt = gcSnapshot();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedIdioms = (require('./idioms_data') as { IDIOMS: readonly Idiom[] }).IDIOMS;
    const caller = (new Error().stack ?? '').split('\n').slice(2, 6).map((line) => line.trim()).join(' <- ');
    console.log('[IDIOMS-LOAD] first require', JSON.stringify({ ms: Date.now() - startedAt, count: cachedIdioms.length, gc: gcDelta(gcAt, gcSnapshot()), caller }));
  }
  return cachedIdioms;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
