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
 * Android: нативная часть доказана (WAL-кампания 6/6).
 * iOS (Пакет 6H, OD17): Swift-часть патча (flock-блокировка, аренда, защита
 * семейства файлов) есть, но ни разу не собиралась и не запускалась на iPhone.
 * Поэтому iOS открывается ТОЛЬКО в сборке пробы (EAS-профиль
 * ios-account-v2-proof, EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF=1); в остальных
 * сборках — null с логом, как раньше. Снять это ограничение можно только после
 * квитанции пробы с iPhone владельца.
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

type NativeProvisionLock = Readonly<{
  releaseAsync(): Promise<void>;
  /** Только iOS-часть патча: бэкап-исключение + file protection каталога и семейства (с обратным чтением). */
  protectAccountDatabaseFamilyAsync?: () => Promise<void>;
}>;

type NativeSqliteModule = Readonly<{
  acquireAccountProvisionLockAsync(databasePath: string): Promise<NativeProvisionLock>;
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

/**
 * Сборка пробы iPhone (Пакет 6H). Читается в момент вызова: Babel Expo подставляет
 * EXPO_PUBLIC_* на этапе сборки, а тесты меняют process.env на лету.
 */
export function isAccountV2IosProofBuild(): boolean {
  return process.env.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF === '1';
}

function accountsDirectory(sqlite: SqliteModule): string {
  const root = sqlite.defaultDatabaseDirectory;
  if (typeof root !== 'string' || root.trim().length === 0) throw new Error('account_native_scope_directory_unknown');
  return `${root.replace(/[\\/]+$/u, '')}/${ACCOUNTS_DIRECTORY}`;
}

function fileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

/**
 * Пакет 7A, ремонт №1: поддерживает ли платформа область V2 — ТА ЖЕ проверка,
 * что открывает хранилище ниже (Android или сборка пробы iPhone), но без
 * загрузки нативных модулей. зачем: решение о пропуске старого restore обязано
 * совпадать с реальной возможностью V2 (iOS вне пробы — область не откроется).
 */
export function isAccountV2NativePlatformSupported(): boolean {
  let os: string;
  try {
    os = platformOs();
  } catch (error) {
    console.warn(`${LOG} storage platform_unknown kind=${kindOf(error)}`);
    return false;
  }
  return os === 'android' || (os === 'ios' && isAccountV2IosProofBuild());
}

/** null — платформа без доказанного хранилища (iOS вне сборки пробы, web) или модули недоступны. Никогда не бросает. */
export function createExpoAccountNativeEnvironment(): AccountNativeEnvironment | null {
  let os: string;
  try {
    os = platformOs();
  } catch (error) {
    console.warn(`${LOG} storage platform_unknown kind=${kindOf(error)}`);
    return null;
  }
  const iosProof = os === 'ios' && isAccountV2IosProofBuild();
  if (os !== 'android' && !iosProof) {
    // зачем: на iOS нативная аренда и SQLCipher ещё не доказаны на устройстве — не открываем
    // нигде, кроме сборки пробы iPhone (Пакет 6H).
    console.warn(`${LOG} storage platform_unproven os=${os}`);
    return null;
  }
  if (iosProof) console.log(`${LOG} storage platform_ios_proof_build`);
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
      if (!iosProof) return Object.freeze({ release: () => lock.releaseAsync() });
      const protect = lock.protectAccountDatabaseFamilyAsync;
      if (typeof protect !== 'function') {
        // зачем: на iOS без защиты семейства база ушла бы в iCloud-бэкап — блокировку
        // отпускаем и отказываем (провиженер уведёт в quarantine_unreadable, не в создание).
        console.warn(`${LOG} storage ios_family_protection_missing`);
        try {
          await lock.releaseAsync();
        } catch (error) {
          console.warn(`${LOG} storage ios_family_protection_missing_release_failed kind=${kindOf(error)}`);
        }
        throw new Error('account_native_provision_family_protection_unavailable');
      }
      return Object.freeze({
        release: () => lock.releaseAsync(),
        // зачем: вызывать как метод нативного объекта (SharedObject), а не оторванной функцией.
        protectFamily: () => protect.call(lock),
      });
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
