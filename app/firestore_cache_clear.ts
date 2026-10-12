/**
 * Очистка локального кэша Firestore SDK после удаления аккаунта.
 *
 * зачем (координатор 12.10, требование удаления данных): после удаления на телефоне оставался кэш Firestore SDK (~1 МБ, документы
 * старого uid). Чистить его в момент удаления нельзя: clearPersistence() работает только до первого обращения к Firestore или после
 * terminate(), а terminate() посреди процесса ломает всё, что дальше ходит в Firestore (онбординг новой личности). Поэтому:
 * удаление ставит метку → на СЛЕДУЮЩЕМ холодном старте модуль из index.js (раньше expo-router и всех модулей приложения) синхронно
 * читает метку и, только если она есть, вызывает clearPersistence(). Отказ (failed-precondition — Firestore уже успели тронуть)
 * оставляет метку: повтор на следующем старте. Метка — в SecureStore (синхронное чтение на старте, стирание данных аккаунта её не
 * трогает). Без метки старт не загружает Firestore вовсе. Лог: [ACC-MUT] firestore_cache_clear.
 */
import * as SecureStore from 'expo-secure-store';

const LOG = '[ACC-MUT] firestore_cache_clear';
export const FIRESTORE_CACHE_CLEAR_MARKER_KEY = 'firestore_cache_clear_pending_v1';

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code) return code.slice(0, 80);
  return error instanceof Error ? error.name : typeof error;
}

/** Поставить метку «очистить кэш Firestore на следующем старте». Никогда не бросает. */
export async function markFirestoreCacheClearPending(reason: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(FIRESTORE_CACHE_CLEAR_MARKER_KEY, `${Date.now()}:${reason.slice(0, 40)}`);
    console.log(`${LOG} marked reason=${reason}`); // guard-ok: одна запись на удаление
    return true;
  } catch (error) {
    console.warn(`${LOG} mark_failed reason=${reason} code=${errorCode(error)}`); // guard-ok: catch логирует код
    return false;
  }
}

type FirestoreForClear = { clearPersistence(): Promise<void> };

/**
 * Холодный старт: метка есть → clearPersistence(), успех снимает метку, отказ оставляет. Возвращает промис итога (для тестов);
 * вызывающий его не ждёт. `getFirestoreForClear` подменяется в тестах; по умолчанию Firestore грузится ТОЛЬКО при наличии метки.
 */
export function runFirestoreCacheClearOnColdStart(
  getFirestoreForClear: () => FirestoreForClear = defaultFirestoreForClear,
): Promise<'none' | 'cleared' | 'failed'> {
  let marker: string | null = null;
  try {
    marker = SecureStore.getItem(FIRESTORE_CACHE_CLEAR_MARKER_KEY);
  } catch (error) {
    console.warn(`${LOG} read_failed code=${errorCode(error)} — очистка отложена до следующего старта`); // guard-ok: catch логирует код
    return Promise.resolve('failed');
  }
  if (!marker) return Promise.resolve('none');
  const startedAt = Date.now();
  console.log(`${LOG} start marker=${marker.split(':')[1] ?? '?'}`); // guard-ok: только когда метка есть
  let firestore: FirestoreForClear;
  try {
    firestore = getFirestoreForClear();
  } catch (error) {
    console.warn(`${LOG} failed stage=get_instance code=${errorCode(error)} — метка оставлена`); // guard-ok: catch логирует код
    return Promise.resolve('failed');
  }
  return firestore.clearPersistence().then(
    async () => {
      try {
        await SecureStore.deleteItemAsync(FIRESTORE_CACHE_CLEAR_MARKER_KEY);
      } catch (error) {
        console.warn(`${LOG} unmark_failed code=${errorCode(error)} — на следующем старте очистка повторится (безвредно)`); // guard-ok
      }
      console.log(`${LOG} ok ms=${Date.now() - startedAt}`); // guard-ok: итог
      return 'cleared' as const;
    },
    (error: unknown) => {
      const code = errorCode(error);
      console.warn(`${LOG} failed code=${code} ms=${Date.now() - startedAt} — метка оставлена${code.includes('failed-precondition') ? ', повтор на следующем старте (Firestore уже был запущен)' : ''}`); // guard-ok
      return 'failed' as const;
    },
  );
}

function defaultFirestoreForClear(): FirestoreForClear {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const firestore = require('@react-native-firebase/firestore').default as () => FirestoreForClear;
  return firestore();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
