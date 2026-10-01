import {
  ACCOUNT_V2_LOG as LOG,
  kindOf,
  type AccountNativeEnvironment,
  type AccountNativeProvisionLock,
  type AccountNativeSqliteDatabase,
} from './account_native_environment';

/*
 * Account V2, Пакет 6C (TG-88837487B247) — настоящие порты хранилища области.
 *
 * зачем: единственное место, где адаптер области встречается с нативом:
 *  - expo-sqlite 16.0.10 с патчем аренды (patches/expo-sqlite+16.0.10.patch —
 *    НЕ менять): соединение `useNewConnection`, commit/revoke/close аренды и
 *    провиженинг-блокировка файла (FileChannel.lock);
 *  - SecureStore (ключ SQLCipher, линия, метка) под сервисом манифеста и с
 *    доступностью WHEN_UNLOCKED_THIS_DEVICE_ONLY — ключ не уезжает в бэкап;
 *  - expo-file-system — проверка/удаление файлов семейства базы;
 *  - expo-crypto — SHA-256 uid и 32 случайных байта ключа.
 * Каталог: `<defaultDatabaseDirectory>/accounts-v2` = files/SQLite/accounts-v2
 * (уже исключён из бэкапа манифестом бэкапа Android).
 *
 * Только Android: нативная часть доказана на Android (WAL-кампания 6/6).
 * iOS — null с логом: честно не открываем, пока нет доказательства на iOS.
 * Модуль грузится лениво из accounts_v2_client_runtime.ts и только при
 * включённом клиентском флаге — при выключенном ни один require ниже не идёт.
 */

const ACCOUNTS_DIRECTORY = 'accounts-v2';
const SECURE_SERVICE = 'phraseman.account_native_storage.v2';

type SecureStoreModule = Readonly<{
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: unknown;
  getItemAsync(key: string, options: object): Promise<string | null>;
  setItemAsync(key: string, value: string, options: object): Promise<void>;
  deleteItemAsync(key: string, options: object): Promise<void>;
}>;

type FileSystemModule = Readonly<{
  File: new (uri: string) => { exists: boolean; delete(): void };
  Directory: new (uri: string) => { exists: boolean; list(): readonly { name: string }[] };
}>;

type SqliteModule = Readonly<{
  defaultDatabaseDirectory: unknown;
  openDatabaseAsync(name: string, options: object, directory: string): Promise<AccountNativeSqliteDatabase>;
}>;

type NativeSqliteModule = Readonly<{
  acquireAccountProvisionLockAsync(databasePath: string): Promise<{ releaseAsync(): Promise<void> }>;
}>;

type CryptoModule = Readonly<{
  CryptoDigestAlgorithm: Readonly<{ SHA256: unknown }>;
  CryptoEncoding: Readonly<{ HEX: unknown }>;
  digestStringAsync(algorithm: unknown, value: string, options: object): Promise<string>;
  getRandomBytesAsync(count: number): Promise<Uint8Array>;
}>;

function platformOs(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return String((require('react-native') as { Platform: { OS: string } }).Platform.OS);
}

function accountsDirectory(sqlite: SqliteModule): string {
  const root = sqlite.defaultDatabaseDirectory;
  if (typeof root !== 'string' || root.trim().length === 0) throw new Error('account_native_scope_directory_unknown');
  return `${root.replace(/[\\/]+$/u, '')}/${ACCOUNTS_DIRECTORY}`;
}

function fileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

/** null — платформа без доказанного хранилища (iOS/web) или модули недоступны. Никогда не бросает. */
export function createExpoAccountNativeEnvironment(): AccountNativeEnvironment | null {
  let os: string;
  try {
    os = platformOs();
  } catch (error) {
    console.warn(`${LOG} storage platform_unknown kind=${kindOf(error)}`);
    return null;
  }
  if (os !== 'android') {
    // зачем: на iOS нативная аренда и SQLCipher ещё не доказаны на устройстве — не открываем.
    console.warn(`${LOG} storage platform_unproven os=${os}`);
    return null;
  }
  let sqlite: SqliteModule;
  let nativeSqlite: NativeSqliteModule;
  let secureStore: SecureStoreModule;
  let fileSystem: FileSystemModule;
  let crypto: CryptoModule;
  let manifest: unknown;
  let directory: string;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    sqlite = require('expo-sqlite') as SqliteModule;
    nativeSqlite = (require('expo-modules-core') as { requireNativeModule(name: string): NativeSqliteModule })
      .requireNativeModule('ExpoSQLite');
    secureStore = require('expo-secure-store') as SecureStoreModule;
    fileSystem = require('expo-file-system') as FileSystemModule;
    crypto = require('expo-crypto') as CryptoModule;
    manifest = require('../../../config/account-native-storage-v2-manifest.json');
    /* eslint-enable @typescript-eslint/no-require-imports */
    directory = accountsDirectory(sqlite);
    if (typeof nativeSqlite.acquireAccountProvisionLockAsync !== 'function') {
      // зачем: без патча аренды нет ни блокировки, ни безопасного commit — не открываем.
      console.warn(`${LOG} storage lease_patch_missing`);
      return null;
    }
  } catch (error) {
    console.warn(`${LOG} storage modules_unavailable kind=${kindOf(error)}`);
    return null;
  }
  const secureOptions = Object.freeze({
    keychainService: SECURE_SERVICE,
    keychainAccessible: secureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    requireAuthentication: false,
  });
  const pathOf = (name: string): string => `${directory}/${name}`;

  return Object.freeze({
    manifest,
    digestSha256: (value: string) => crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256, value, { encoding: crypto.CryptoEncoding.HEX },
    ),
    secure: Object.freeze({
      get: (key: string) => secureStore.getItemAsync(key, secureOptions),
      set: (key: string, value: string) => secureStore.setItemAsync(key, value, secureOptions),
      remove: (key: string) => secureStore.deleteItemAsync(key, secureOptions),
    }),
    randomKeyBytes: () => crypto.getRandomBytesAsync(32),
    acquireProvisionLock: async (databaseName: string): Promise<AccountNativeProvisionLock> => {
      const lock = await nativeSqlite.acquireAccountProvisionLockAsync(pathOf(databaseName));
      return Object.freeze({ release: () => lock.releaseAsync() });
    },
    fileExists: async (name: string) => new fileSystem.File(fileUri(pathOf(name))).exists,
    deleteFile: async (name: string) => { new fileSystem.File(fileUri(pathOf(name))).delete(); },
    listFileNames: async () => {
      const folder = new fileSystem.Directory(fileUri(directory));
      if (!folder.exists) return Object.freeze([]);
      return Object.freeze(folder.list().map((entry) => entry.name));
    },
    openDatabase: (databaseName: string) => sqlite.openDatabaseAsync(
      databaseName,
      // зачем: патч принимает базу области только так — отдельное соединение без слушателя изменений.
      Object.freeze({ useNewConnection: true, enableChangeListener: false }),
      directory,
    ),
  });
}
