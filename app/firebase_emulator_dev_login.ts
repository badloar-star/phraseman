import { resolveFirebaseEmulatorHost } from './firebase_emulator_dev';

/*
 * Account V2, Пакет 6E (TG-52A880319166) — dev-only вход по почте+паролю против
 * ЛОКАЛЬНОГО Auth-эмулятора.
 *
 * зачем: в приложении есть только Google/Apple-вход, а для E2E «вход → синхронизация»
 * на телефоне нужны 3 тестовых аккаунта Auth-эмулятора (сидер пишет их в
 * scripts/accounts-v2-emulator-seed.local.json — gitignored; учётки в коде нет).
 *
 * Доступен ТОЛЬКО при `__DEV__` И `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` (то же
 * решение, что и подключение к эмуляторам — Auth уже смотрит в эмулятор, прод
 * недостижим). В релизе ветка вырезается; без переменной — отказ до любого require.
 * Принимаются только адреса @phraseman.test — настоящие учётки сюда не попадут.
 * Логи — префикс [FIREBASE-EMU-LOGIN], без почты и пароля; uid — усечённым хэшем нет
 * смысла (это локальный тестовый uid), печатаем только длину/успех.
 */

const LOG = '[FIREBASE-EMU-LOGIN]';
const TEST_EMAIL = /^accounts-v2-e2e-[a-z]@phraseman\.test$/;

export type EmulatorDevLoginResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: 'unavailable' | 'not_test_account' | 'password_missing' | 'auth_unavailable' | 'sign_in_failed' }>;

type AuthLike = Readonly<{ signInWithEmailAndPassword: (email: string, password: string) => Promise<unknown> }>;

export function isEmulatorDevLoginAvailable(isDev: unknown, emulatorHost: unknown): boolean {
  return resolveFirebaseEmulatorHost(isDev, emulatorHost).connect;
}

function nativeAuth(): AuthLike {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-firebase/auth').default() as AuthLike;
}

function codeOf(error: unknown): string {
  const raw = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : null;
  return typeof raw === 'string' && /^[\w/-]{1,64}$/.test(raw) ? raw : error instanceof Error ? error.name : typeof error;
}

export async function signInEmulatorTestAccount(
  isDev: unknown,
  emulatorHost: unknown,
  rawEmail: unknown,
  rawPassword: unknown,
  auth: () => AuthLike = nativeAuth,
): Promise<EmulatorDevLoginResult> {
  if (!isEmulatorDevLoginAvailable(isDev, emulatorHost)) {
    console.warn(`${LOG} refused reason=unavailable`);
    return Object.freeze({ ok: false, reason: 'unavailable' });
  }
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
  const password = typeof rawPassword === 'string' ? rawPassword : '';
  if (!TEST_EMAIL.test(email)) {
    console.warn(`${LOG} refused reason=not_test_account`);
    return Object.freeze({ ok: false, reason: 'not_test_account' });
  }
  if (password.length === 0) {
    console.warn(`${LOG} refused reason=password_missing`);
    return Object.freeze({ ok: false, reason: 'password_missing' });
  }
  let target: AuthLike;
  try {
    target = auth();
  } catch (error) {
    console.warn(`${LOG} auth_unavailable code=${codeOf(error)}`);
    return Object.freeze({ ok: false, reason: 'auth_unavailable' });
  }
  const startedAt = Date.now();
  try {
    await target.signInWithEmailAndPassword(email, password);
    console.warn(`${LOG} signed_in label=${email.slice('accounts-v2-e2e-'.length, 'accounts-v2-e2e-'.length + 1)} ms=${Date.now() - startedAt}`);
    return Object.freeze({ ok: true });
  } catch (error) {
    console.warn(`${LOG} sign_in_failed code=${codeOf(error)} ms=${Date.now() - startedAt}`);
    return Object.freeze({ ok: false, reason: 'sign_in_failed' });
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
