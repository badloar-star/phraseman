/*
 * Account V2, Пакет 6D (TG-D3DE53F2D345) — точка входа dev-only подключения к
 * Firebase Emulator Suite. Импортируется из index.js ДО expo-router/entry.
 *
 * зачем: импорты в index.js выполняются раньше его тела, поэтому проверка живёт
 * в отдельном модуле. В релизе `__DEV__ === false` — ветка вырезается, модуль
 * эмуляторов не выполняется; без EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ничего не
 * меняется даже в dev (ни require, ни чтений, ни сети).
 */

if (__DEV__ && process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { connectFirebaseEmulatorsForDev } = require('./firebase_emulator_dev') as typeof import('./firebase_emulator_dev');
  connectFirebaseEmulatorsForDev(__DEV__, process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
