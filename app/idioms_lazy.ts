// зачем (ускорение сплэша, 2026-08-25): idioms_data весит 610 КБ JS и исполнялся
// прямо на сплэше через статические импорты DailyPhraseCard и daily_phrase_system,
// хотя первому кадру Главной нужна ровно ОДНА фраза. Полный каталог теперь
// поднимается только по требованию: квест в шторке деталей, фолбэк когда нет
// peek-кэша, планирование уведомления «фраза дня». Паттерн тот же, что у
// app/collectibles/catalog.ts — require внутри функции (Metro inlineRequires
// откладывает исполнение модуля до первого вызова).
import type { Idiom } from './idioms_data';

let cachedIdioms: readonly Idiom[] | null = null;

export function getIdiomsSync(): readonly Idiom[] {
  if (!cachedIdioms) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedIdioms = (require('./idioms_data') as { IDIOMS: readonly Idiom[] }).IDIOMS;
  }
  return cachedIdioms;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
