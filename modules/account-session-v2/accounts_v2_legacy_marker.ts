/*
 * Account V2, Пакет 7A, ремонт №1 — метка «область V2 этого uid гидрирована при
 * окончательном переносе» (V2 содержит всё старое облако карточек/библиотеки).
 *
 * зачем: выключатель старой синхронизации (accounts_v2_legacy_sync_disabled)
 * пропускает старый restore/запись V2-доменов ТОЛЬКО при этой метке. Без неё
 * (новая установка, перенос hold / not_found_yet, сбой сети гидрации) старый путь
 * работает: лучше продублировать и перечитать, чем оставить человека с пустыми
 * карточками. Метка живёт в обычном AsyncStorage (не в зашифрованной области):
 * restore на холодном старте идёт ДО открытия области и читать её не может.
 * Секретов нет — только uid Firebase (уже лежит в хранилище Firebase Auth) и время.
 * Сброс хранилища (переустановка, очистка) снимает метку — снова старый путь.
 * Ремонт №2 (P1): метка входит в инвентарь аккаунтных ключей (cloud_sync.ts →
 * accountLocalDataKeysForToday) и стирается общим wipe при выходе/смене аккаунта;
 * гидрация ставит её только в запуске, где применение реально прошло, и применяет
 * гидрированную область ЗАНОВО, если метки нет. P3: сервер V2 выключен → метка снимается.
 */

export const ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY = 'accounts_v2_legacy_hydrated_v1';

type Storage = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}>;

function storage(): Storage {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage').default as Storage;
}

/** Записать метку для uid (вызывается гидрацией V2). Бросает — вызывающий логирует. */
export async function writeAccountsV2LegacyHydratedMarker(uid: string, nowMs: number): Promise<void> {
  await storage().setItem(ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY, JSON.stringify({ v: 1, uid, atMs: nowMs }));
}

/** Снять метку (сервер V2 выключен). Бросает — вызывающий логирует. */
export async function clearAccountsV2LegacyHydratedMarker(): Promise<void> {
  await storage().removeItem(ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY);
}

/** uid из метки или null (нет / битая / сбой чтения — с логом). Никогда не бросает. */
export async function readAccountsV2LegacyHydratedUid(): Promise<string | null> {
  let raw: string | null;
  try {
    raw = await storage().getItem(ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY);
  } catch (error) {
    console.warn(`[ACCOUNT-V2] legacy_marker read_failed kind=${error instanceof Error ? error.name : typeof error}`);
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; uid?: unknown };
    if (parsed.v === 1 && typeof parsed.uid === 'string' && parsed.uid.length > 0) return parsed.uid;
  } catch (error) {
    console.warn(`[ACCOUNT-V2] legacy_marker corrupt kind=${error instanceof Error ? error.name : typeof error}`);
    return null;
  }
  console.warn('[ACCOUNT-V2] legacy_marker corrupt kind=shape');
  return null;
}
