/**
 * DEV: карточки и наборы из dev-фикстур не уходят в облако.
 *
 * зачем (координатор 12.10): по журналам 11–12.10 каждый прогон cards=demo на анонимном госте писал 64 карточки в прод
 * (`[FLASHCARDS-CLOUD] write ok cards=64`) — мусор в боевой базе и лишние записи Firestore. Фикстуры уже работают только
 * на госте (2be1f7844, dev_state_account_guard). Здесь — вторая половина: пока на ЭТОМ госте применена cards-фикстура,
 * синхронизация вырезает ключи карточек/наборов. Метка привязана к uid гостя: вошёл в настоящий аккаунт — его карточки
 * выгружаются как обычно. Метка в памяти + в локальном ключе устройства (не синхронизируется): робот делает force-stop
 * перед кадром, и синхронизация на старте до повторной ссылки выгрузила бы демо из хранилища. В стор-сборке выключено.
 * Логи: [SYNC-SKIP].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_STORE_RELEASE } from './config';

export const DEV_FIXTURE_NO_UPLOAD_KEY = 'dev_fixture_no_upload_v1';

type Mark = Readonly<{ authUid: string; what: string; atMs: number }>;
let memo: Mark | null | undefined;

function devOnly(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Фикстура карточек применяется на госте authUid — с этого момента его карточки/наборы не выгружаются. */
export function markDevFixtureNoUpload(authUid: string, what: string): void {
  if (!devOnly()) return;
  if (!authUid) {
    console.warn(`[SYNC-SKIP] mark skipped what=${what} reason=no_auth_uid`);
    return;
  }
  const mark: Mark = { authUid, what, atMs: Date.now() };
  memo = mark;
  console.log(`[SYNC-SKIP] mark on what=${what} guest=${authUid.slice(0, 6)}… — карточки/наборы этого гостя в облако не выгружаются`);
  void AsyncStorage.setItem(DEV_FIXTURE_NO_UPLOAD_KEY, JSON.stringify(mark)).catch((error: unknown) => {
    console.warn(`[SYNC-SKIP] mark persist failed reason=${error instanceof Error ? error.message : String(error)} — действует до перезапуска`);
  });
}

async function readMark(): Promise<Mark | null> {
  if (memo !== undefined) return memo;
  try {
    const raw = await AsyncStorage.getItem(DEV_FIXTURE_NO_UPLOAD_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Mark>) : null;
    memo = parsed && typeof parsed.authUid === 'string' && parsed.authUid
      ? { authUid: parsed.authUid, what: String(parsed.what ?? ''), atMs: Number(parsed.atMs) || 0 }
      : null;
  } catch (error: unknown) {
    console.warn(`[SYNC-SKIP] mark read failed reason=${error instanceof Error ? error.message : String(error)} → метки нет`);
    memo = null;
  }
  return memo;
}

/** Активна ли метка для текущего авторизованного uid (только dev). */
export async function isDevFixtureNoUploadActive(authUid: string | null | undefined): Promise<boolean> {
  if (!devOnly() || !authUid) return false;
  const mark = await readMark();
  return mark !== null && mark.authUid === authUid;
}

/** Ключи карточек и наборов, которые фикстуры пишут и синхронизация выгружает. */
export function isDevFixtureCardSyncKey(key: string): boolean {
  if (key.startsWith('achievement_')) return false;
  return key.includes('flashcard')
    || key.includes('community_owned')
    || key.includes('owned_packs')
    || key.includes('pack_trial');
}

/** Вырезать ключи карточек/наборов из данных выгрузки. Неактивно → тот же объект. */
export function omitDevFixtureCardKeys<T>(data: Record<string, T>, active: boolean, phase: 'sync' | 'force_sync'): Record<string, T> {
  if (!active) return data;
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isDevFixtureCardSyncKey(key)) {
      console.log(`[SYNC-SKIP] dev_fixture key=${key} phase=${phase}`);
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Только для тестов. */
export function __resetDevFixtureNoUploadForTests(): void {
  memo = undefined;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
