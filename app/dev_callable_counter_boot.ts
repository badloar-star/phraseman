/*
 * [CALLABLE-START] точка входа (координатор 26.10): импортируется из index.js рядом с [FS-READS], до expo-router/entry.
 * зачем: перепись вызовов облачных функций должна видеть всё с первого вызова. В релизе `__DEV__ === false` — ветка вырезается
 * при сборке вместе с require, модуль счётчика в стор-бандл не попадает. Сводки — в 10, 30 и 60 с от запуска.
 */

if (__DEV__) {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const counter = require('./dev_callable_counter') as typeof import('./dev_callable_counter');
    const { getApp } = require('@react-native-firebase/app') as { getApp: () => unknown };
    const { getFunctions } = require('@react-native-firebase/functions') as { getFunctions: (app: unknown, region?: string) => object };
    /* eslint-enable @typescript-eslint/no-require-imports */
    // класс модуля функций не экспортируется — прототип берём у экземпляра; все регионы делят его
    const proto = Object.getPrototypeOf(getFunctions(getApp(), 'us-central1')) as Record<string, unknown>;
    if (counter.installCallableCounter(proto)) {
      for (const [ms, label] of [[10_000, 'старт 10 с'], [30_000, 'старт 30 с'], [60_000, 'первые 60 с']] as const) {
        setTimeout(() => counter.logCallableReport(ms, label), ms + 60);
      }
    } else {
      console.warn('[CALLABLE-START] счётчик не установлен: нет httpsCallable у модуля функций или уже стоит'); // guard-ok: причина пропуска
    }
  } catch (error) {
    console.warn(`[CALLABLE-START] счётчик не установлен (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина пропуска
  }
}

/* expo-router route shim */
export default function __CallableCounterBootRouteShim() { return null; }
