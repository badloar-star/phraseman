import { Platform } from 'react-native';
import { createExpoAccountNativeEnvironment } from '../../modules/account-session-v2/native/account_native_expo_environment';
import { IOS_PROOF_LOG, type IosProofPorts } from './probe';

/*
 * Account V2, Пакет 6H — настоящие порты пробы iPhone.
 *
 * зачем: отдельно от probe.ts, чтобы чистая логика проверялась в jest без
 * нативных модулей. Файл (как и экран пробы) физически исключается из бандла
 * Metro без EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF=1 — в магазинной сборке его нет.
 */

type SqliteDirectory = Readonly<{ defaultDatabaseDirectory: unknown }>;
type FileSystemModule = Readonly<{ File: new (uri: string) => { exists: boolean; bytes(): Promise<Uint8Array> } }>;

async function readDatabaseHeader(databaseName: string): Promise<Uint8Array | null> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const root = (require('expo-sqlite') as SqliteDirectory).defaultDatabaseDirectory;
  const { File } = require('expo-file-system') as FileSystemModule;
  /* eslint-enable @typescript-eslint/no-require-imports */
  if (typeof root !== 'string' || root.length === 0) {
    console.warn(`${IOS_PROOF_LOG} header_skip reason=directory_unknown`);
    return null;
  }
  const path = `${root.replace(/[\\/]+$/u, '')}/accounts-v2/${databaseName}`;
  const file = new File(path.startsWith('file://') ? path : `file://${path}`);
  if (!file.exists) {
    console.warn(`${IOS_PROOF_LOG} header_skip reason=file_absent`);
    return null;
  }
  // Только чтение: база пробы маленькая (единицы КБ), целиком читать дёшево.
  return (await file.bytes()).slice(0, 16);
}

export function createIosProofPorts(): IosProofPorts {
  return Object.freeze({
    environment: createExpoAccountNativeEnvironment(),
    readDatabaseHeader,
    now: () => Date.now(),
    platformLabel: `${Platform.OS}-${String(Platform.Version)}`,
  });
}
