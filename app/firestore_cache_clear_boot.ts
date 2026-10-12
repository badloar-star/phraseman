/*
 * Точка входа очистки кэша Firestore SDK после удаления аккаунта (app/firestore_cache_clear.ts).
 * Импортируется из index.js ДО expo-router/entry и до модулей с работой при импорте — раньше любого обращения к Firestore.
 *
 * зачем: импорты index.js выполняются раньше его тела, поэтому запуск живёт в отдельном модуле (как firebase_emulator_dev_boot).
 * Без метки — одно синхронное чтение SecureStore, Firestore не загружается.
 */
import { runFirestoreCacheClearOnColdStart } from './firestore_cache_clear';

void runFirestoreCacheClearOnColdStart();

/* expo-router route shim */
export default function __RouteShim() { return null; }
