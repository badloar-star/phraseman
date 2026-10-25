// ═══════════════════════════════════════════════════════════════════════════
// apple_signin_revoke.ts — отзыв токена Sign in with Apple при удалении аккаунта.
//
// зачем (координатор 25.10; требование Apple 5.1.1(v) с 30.06.2022): приложение с Sign in with Apple при удалении аккаунта обязано
// отозвать токены пользователя (`appleid.apple.com/auth/revoke`). Firebase делает этот вызов сам по свежему коду авторизации
// (`auth().revokeToken(code)`, RN Firebase 21.14, нативно) с ключом Apple из консоли Firebase — свои токены и ключи не храним.
// Код берём из окна Apple в момент удаления: человек на экране и подтверждает удаление.
// Никогда не бросает и не блокирует удаление: отмена окна, нет ключа в консоли, нет сети — удаление идёт дальше, причина в журнале.
// За флагом apple_signin_revoke_enabled (по умолчанию ВЫКЛ, до ключа Apple в консоли). Журнал: [APPLE-REVOKE].
// ═══════════════════════════════════════════════════════════════════════════
import { Platform } from 'react-native';
import { getRemoteBool } from './remote_flags';

const LOG = '[APPLE-REVOKE]';
/** Потолок на вызов revokeToken: удаление не ждёт Apple/Firebase дольше этого. */
export const APPLE_REVOKE_TIMEOUT_MS = 8_000;

export type AppleRevokeOutcome =
  | 'flag_off' | 'not_ios' | 'no_apple_provider' | 'module_unavailable'
  | 'cancelled' | 'no_code' | 'revoked' | 'failed' | 'timeout';

type AppleAuthModule = {
  signInAsync: (options: { requestedScopes: unknown[] }) => Promise<{ authorizationCode?: string | null }>;
};
type FirebaseAuthLike = {
  currentUser?: { providerData?: ReadonlyArray<{ providerId?: string }> } | null;
  revokeToken?: (authorizationCode: string) => Promise<void>;
};

export type AppleRevokeDeps = Readonly<{
  flagEnabled: () => boolean;
  platformOs: () => string;
  firebaseAuth: () => FirebaseAuthLike | null;
  appleAuth: () => AppleAuthModule | null;
  timeoutMs: number;
}>;

const defaultDeps: AppleRevokeDeps = {
  flagEnabled: () => getRemoteBool('apple_signin_revoke_enabled'),
  platformOs: () => Platform.OS,
  firebaseAuth: () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@react-native-firebase/auth').default() as FirebaseAuthLike;
    } catch (e) {
      console.warn(`${LOG} firebase auth module unavailable ${e instanceof Error ? e.name : typeof e}`);
      return null;
    }
  },
  appleAuth: () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('expo-apple-authentication') as AppleAuthModule;
    } catch (e) {
      console.warn(`${LOG} apple authentication module unavailable ${e instanceof Error ? e.name : typeof e}`);
      return null;
    }
  },
  timeoutMs: APPLE_REVOKE_TIMEOUT_MS,
};

/**
 * Флаг отзыва — синхронно, без модулей входа.
 * зачем (Ревизор 25.10 на 045c5c569): удаление зовёт отзыв только при ВКЛ флаге. При ВЫКЛ путь удаления байт в байт прежний —
 * без единого лишнего await до взвода замка локального удаления.
 */
export function isAppleSignInRevokeEnabled(): boolean {
  return defaultDeps.flagEnabled();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const ceiling = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), ms); });
  return Promise.race([promise, ceiling]).finally(() => { if (timer) clearTimeout(timer); });
}

/**
 * Отозвать Sign in with Apple перед удалением аккаунта. reason — откуда зовут (для журнала).
 * Возвращает итог для журнала/тестов; ошибок наружу не бросает.
 */
export async function revokeAppleSignInForDeletion(reason: string, deps: AppleRevokeDeps = defaultDeps): Promise<AppleRevokeOutcome> {
  const startedAt = Date.now();
  const done = (outcome: AppleRevokeOutcome, extra: Record<string, unknown> = {}): AppleRevokeOutcome => {
    const log = outcome === 'revoked' || outcome === 'flag_off' || outcome === 'not_ios' || outcome === 'no_apple_provider' ? console.log : console.warn;
    log(`${LOG} ${outcome} ${JSON.stringify({ reason, ms: Date.now() - startedAt, ...extra })}`);
    return outcome;
  };
  if (!deps.flagEnabled()) return done('flag_off');
  if (deps.platformOs() !== 'ios') return done('not_ios', { os: deps.platformOs() });
  const auth = deps.firebaseAuth();
  const providers = (auth?.currentUser?.providerData ?? []).map((p) => String(p?.providerId ?? ''));
  if (!providers.includes('apple.com')) return done('no_apple_provider', { providers });
  const apple = deps.appleAuth();
  const revoke = auth?.revokeToken;
  if (!apple || !auth || typeof revoke !== 'function') {
    return done('module_unavailable', { apple: !!apple, revokeToken: typeof revoke });
  }
  console.log(`${LOG} start ${JSON.stringify({ reason })}`);
  let code: string | null | undefined;
  try {
    // без scopes: нужен только свежий код авторизации, имя и почта не запрашиваются
    const credential = await apple.signInAsync({ requestedScopes: [] });
    code = credential?.authorizationCode;
  } catch (e) {
    const errCode = String((e as { code?: unknown })?.code ?? '');
    if (errCode === 'ERR_REQUEST_CANCELED' || errCode === 'ERR_CANCELED') return done('cancelled');
    return done('failed', { stage: 'apple_sheet', code: errCode || (e instanceof Error ? e.name : typeof e) });
  }
  if (!code) return done('no_code');
  try {
    const result = await withTimeout(revoke.call(auth, code), deps.timeoutMs);
    if (result === 'timeout') return done('timeout', { timeoutMs: deps.timeoutMs });
    return done('revoked');
  } catch (e) {
    // нет ключа Apple в консоли Firebase / нет сети / Apple отказал — удаление всё равно продолжается
    const errCode = String((e as { code?: unknown })?.code ?? '');
    return done('failed', { stage: 'revoke_token', code: errCode || (e instanceof Error ? e.name : typeof e) });
  }
}

// expo-router: файл в app/ — заглушка маршрута, как у соседних модулей
export default function __RouteShim() { return null; }
