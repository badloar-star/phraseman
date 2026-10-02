/*
 * Экземпляр модуля RN Firebase по модульному API.
 *
 * зачем (координатор §67, гистограмма dev-старта 2026-10-02): каждый вызов
 * `require('@react-native-firebase/<x>').default()` без аргумента проходит через
 * устаревший getApp() и пишет предупреждение «use getApp()» — 204 вызова устаревшего
 * API за первую минуту старта, из них большинство — именно эти геттеры. Модульный
 * getFirestore()/getAuth()/… возвращает ТОТ ЖЕ экземпляр без этого пути.
 * Запасной путь на `.default()` оставлен для моков в тестах, где модуль описан только
 * старым API.
 */

export type RnfbModularGetter = 'getFirestore' | 'getAuth' | 'getAnalytics' | 'getCrashlytics';

export function rnfbInstance<T = any>(mod: unknown, getter: RnfbModularGetter): T | null {
  const source = mod as Record<string, unknown> | null | undefined;
  const modular = source?.[getter];
  if (typeof modular === 'function') return (modular as () => T)();
  const factory = (source?.default ?? source) as unknown;
  return typeof factory === 'function' ? (factory as () => T)() : null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
