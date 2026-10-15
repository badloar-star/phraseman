/*
 * [FS-READS] точка входа (координатор 15.10): импортируется из index.js ДО expo-router/entry, как firebase_emulator_dev_boot.
 * зачем: перепись чтений Firestore должна видеть ВСЁ с первого вызова. В релизе `__DEV__ === false` — ветка вырезается при
 * сборке вместе с require, модуль счётчика в стор-бандл не попадает. Сводки — в 10, 30 и 60 с от запуска.
 */

if (__DEV__) {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const counter = require('./dev_firestore_read_counter') as typeof import('./dev_firestore_read_counter');
    const QueryClass = require('@react-native-firebase/firestore/lib/FirestoreQuery').default as { prototype: Record<string, unknown> };
    const DocClass = require('@react-native-firebase/firestore/lib/FirestoreDocumentReference').default as { prototype: Record<string, unknown> };
    /* eslint-enable @typescript-eslint/no-require-imports */
    if (counter.installFirestoreReadCounter({ queryProto: QueryClass.prototype, docProto: DocClass.prototype })) {
      for (const [ms, label] of [[10_000, 'старт 10 с'], [30_000, 'старт 30 с'], [60_000, 'первые 60 с']] as const) {
        setTimeout(() => counter.logFsReadsReport(ms, label), ms + 50);
      }
    }
  } catch (error) {
    console.warn(`[FS-READS] счётчик не установлен (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина пропуска
  }
}

/* expo-router route shim */
export default function __FsReadsBootRouteShim() { return null; }
