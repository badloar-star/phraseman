/**
 * Очистка локального кэша Firestore SDK после удаления аккаунта.
 *
 * зачем (координатор 12.10, требование удаления данных): после удаления на телефоне оставался кэш Firestore SDK (~1 МБ, документы
 * старого uid). Чистить его в момент удаления нельзя: clearPersistence() работает только до первого обращения к Firestore или после
 * terminate(), а terminate() посреди процесса ломает всё, что дальше ходит в Firestore (онбординг новой личности). Поэтому удаление
 * ставит метку, а на СЛЕДУЮЩЕМ холодном старте бутстрап очищает кэш до своих обращений к Firestore.
 *
 * зачем (координатор 12.10, замер эмулятора ~20 мс у КАЖДОГО на синхронном чтении SecureStore): метка лежит в AsyncStorage и читается
 * в составе уже существующего стартового multiGet (app/_layout.tsx, startupIdentityKeys) — ни одного отдельного нативного вызова
 * у тех, кто не удалял аккаунт. Метку пишем ПОСЛЕ проверенного стирания (AsyncStorage.clear — граница приватности).
 * Отказ (failed-precondition — Firestore уже успели тронуть) оставляет метку: повтор на следующем старте. Лог: [ACC-MUT] firestore_cache_clear.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG = '[ACC-MUT] firestore_cache_clear';
export const FIRESTORE_CACHE_CLEAR_MARKER_KEY = 'firestore_cache_clear_pending_v1';

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code) return code.slice(0, 80);
  return error instanceof Error ? error.name : typeof error;
}

/** Поставить метку «очистить кэш Firestore на следующем старте». Только после проверенного стирания. Никогда не бросает. */
export async function markFirestoreCacheClearPending(reason: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(FIRESTORE_CACHE_CLEAR_MARKER_KEY, `${Date.now()}:${reason.slice(0, 40)}`);
    console.log(`${LOG} marked reason=${reason}`); // guard-ok: одна запись на удаление
    return true;
  } catch (error) {
    console.warn(`${LOG} mark_failed reason=${reason} code=${errorCode(error)}`); // guard-ok: catch логирует код
    return false;
  }
}

type FirestoreForClear = { clearPersistence(): Promise<void> };

// зачем (координатор 14.10, удаление гостя №3: COLD 1 → clearPersistence failed-precondition, очистка прошла только со 2-го старта):
// кто трогает Firestore раньше очистки — 46 файлов зовут firestore() напрямую, журнал этого не показывал. Только dev: оборачиваем
// default() и getFirestore() модуля через Proxy (все свойства — FieldValue и т. п. — сохраняются), пишем первые 6 обращений
// с временем от старта, фазой очистки в этот момент и двумя кадрами стека. Поведение не меняется.
let clearPhase: 'idle' | 'running' | 'cleared' | 'failed' | 'none' = 'idle';
let firstTouchCount = 0;

function stackFrom(): string {
  return (new Error().stack ?? '').split('\n').slice(3, 5).map((s) => s.trim().slice(0, 90)).join(' <- ');
}

function installFirestoreFirstTouchTrace(): void {
  if (!(typeof __DEV__ !== 'undefined' && __DEV__)) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/firestore') as Record<string, unknown>;
    const wrap = (name: string): string => {
      const original = mod[name];
      if (typeof original !== 'function') return `${name}:absent`;
      const traced = new Proxy(original as (...args: unknown[]) => unknown, {
        apply(target, thisArg, args) {
          if (firstTouchCount < 6) {
            firstTouchCount += 1;
            console.log(`[FIRESTORE-FIRST-TOUCH] #${firstTouchCount} via=${name} ms=${Math.round(globalThis.performance?.now?.() ?? -1)} clear=${clearPhase} from=${stackFrom()}`); // guard-ok: временная трассировка, 6 строк на процесс
          }
          return Reflect.apply(target, thisArg, args);
        },
      });
      try {
        Object.defineProperty(mod, name, { value: traced, configurable: true, writable: true, enumerable: true });
        return `${name}:ok`;
      } catch (error) {
        return `${name}:locked(${errorCode(error)})`;
      }
    };
    console.log(`[FIRESTORE-FIRST-TOUCH] installed ${wrap('default')} ${wrap('getFirestore')} ms=${Math.round(globalThis.performance?.now?.() ?? -1)}`); // guard-ok: одна строка на процесс
  } catch (error) {
    console.warn(`[FIRESTORE-FIRST-TOUCH] install_failed code=${errorCode(error)}`); // guard-ok: catch логирует код
  }
}
installFirestoreFirstTouchTrace();

// зачем (координатор 12.10): после успешной очистки при живом замке удаления (до 7 дней) метка становится `cleared:<operationId>` —
// иначе правило «замок есть, метки нет» стирало бы кэш новой личности на каждом старте всю неделю.
const CLEARED_PREFIX = 'cleared:';

/** operationId из зеркала замка удаления (JSON); без разбора остального — только для сравнения. */
export function lockOperationIdFromMirror(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { operationId?: unknown; providerUid?: unknown; createdAt?: unknown };
    if (typeof parsed.operationId === 'string' && parsed.operationId) return parsed.operationId.slice(0, 200);
    // старые замки без operationId — свой устойчивый идентификатор (нужен только для сравнения с `cleared:<…>` здесь же)
    if (typeof parsed.providerUid === 'string' && parsed.createdAt != null) return `legacy:${parsed.providerUid}:${String(parsed.createdAt)}`.slice(0, 200);
    return null;
  } catch (error) {
    console.warn(`${LOG} lock_mirror_unreadable code=${errorCode(error)} — замок не учитывается`); // guard-ok: catch логирует код
    return null;
  }
}

/** Решение на старте по уже прочитанным значениям (чистая функция). */
export function decideStartupCacheClear(
  markerValue: string | null,
  lockMirrorRaw: string | null,
): Readonly<{ run: boolean; reason: 'marker' | 'lock_without_marker' | 'none' | 'already_cleared_for_lock'; lockOperationId: string | null }> {
  const lockOperationId = lockOperationIdFromMirror(lockMirrorRaw);
  const cleared = markerValue?.startsWith(CLEARED_PREFIX) ? markerValue.slice(CLEARED_PREFIX.length) : null;
  if (markerValue && cleared === null) return { run: true, reason: 'marker', lockOperationId };
  if (lockOperationId && cleared !== lockOperationId) return { run: true, reason: 'lock_without_marker', lockOperationId };
  if (lockOperationId) return { run: false, reason: 'already_cleared_for_lock', lockOperationId };
  return { run: false, reason: 'none', lockOperationId };
}

/**
 * Холодный старт: значение метки уже прочитано стартовым multiGet. Нет метки — ничего (ни нативных вызовов, ни Firestore).
 * Есть — clearPersistence(); успех снимает метку, отказ оставляет. Возвращает промис итога (для тестов); бутстрап его не ждёт.
 */
export function runFirestoreCacheClearFromStartupRead(
  markerValue: string | null,
  lockMirrorRaw: string | null = null,
  getFirestoreForClear: () => FirestoreForClear = defaultFirestoreForClear,
): Promise<'none' | 'cleared' | 'failed'> {
  const checkStartedAt = Date.now();
  // Проверка — только значения из уже сделанного чтения: стоимость ~0 мс, нативного вызова нет.
  const decision = decideStartupCacheClear(markerValue, lockMirrorRaw);
  console.log(`${LOG} check ms=${Date.now() - checkStartedAt} marker=${markerValue && !markerValue.startsWith(CLEARED_PREFIX) ? 1 : 0} lock=${decision.lockOperationId ? 1 : 0} reason=${decision.reason} source=startup_multiget`); // guard-ok: одна строка на холодный старт
  if (!decision.run) { clearPhase = 'none'; return Promise.resolve('none'); }
  clearPhase = 'running';
  if (__DEV__) console.log(`[FIRESTORE-FIRST-TOUCH] clear_start ms=${Math.round(globalThis.performance?.now?.() ?? -1)} touchesBefore=${firstTouchCount}`); // guard-ok: временная трассировка
  const startedAt = Date.now();
  // зачем (координатор 12.10): процесс убили между AsyncStorage.clear и записью метки — замок удаления есть, метки нет. Ставим её сейчас,
  // чтобы при отказе очистки повтор был и на следующем старте.
  if (decision.reason === 'lock_without_marker') void markFirestoreCacheClearPending('lock_without_marker');
  console.log(`${LOG} start reason=${decision.reason}`); // guard-ok: только когда очистка нужна
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
        if (decision.lockOperationId) await AsyncStorage.setItem(FIRESTORE_CACHE_CLEAR_MARKER_KEY, `${CLEARED_PREFIX}${decision.lockOperationId}`);
        else await AsyncStorage.removeItem(FIRESTORE_CACHE_CLEAR_MARKER_KEY);
      } catch (error) {
        console.warn(`${LOG} unmark_failed code=${errorCode(error)} — на следующем старте очистка повторится (безвредно)`); // guard-ok
      }
      console.log(`${LOG} ok ms=${Date.now() - startedAt}`); // guard-ok: итог
      clearPhase = 'cleared';
      return 'cleared' as const;
    },
    (error: unknown) => {
      const code = errorCode(error);
      console.warn(`${LOG} failed code=${code} ms=${Date.now() - startedAt} — метка оставлена${code.includes('failed-precondition') ? ', повтор на следующем старте (Firestore уже был запущен)' : ''}`); // guard-ok
      clearPhase = 'failed';
      if (__DEV__) console.log(`[FIRESTORE-FIRST-TOUCH] clear_end failed touches=${firstTouchCount} ms=${Math.round(globalThis.performance?.now?.() ?? -1)}`); // guard-ok: временная трассировка
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
