// ═══════════════════════════════════════════════════════════════════════════
// auth_callable_fetch.ts — вызовы пути входа (ensureLink / stamp / merge) обычным fetch с ID-токеном. ПОД ФЛАГОМ, выкл.
//
// зачем (координатор 14.10, прогон №5 + лог Cloud Run): RNFirebase functions на Android выполняет все callable на ОДНОМ потоке
// (firebase.json android_task_executor_maximum_pool_size: 0 — инвариант утечки потоков Firestore, не трогаем): вызовы входа
// стоят в очереди за стартовыми ensure. fetch идёт мимо очереди. Включаем по цифрам прогона №6/№7.
//
// Правило повтора (координатор): нативный вызов — ТОЛЬКО если запрос гарантированно не ушёл (флаг выкл, нет токена/projectId/
// fetch). Ушёл и упал — ошибка наверх без повтора: merge/stamp дважды выполнять нельзя.
// Лог [AUTH-FETCH]: функция, путь (native/fetch), исход, код, мс. Без токена, uid и данных.
// ═══════════════════════════════════════════════════════════════════════════
import { readRemoteConfigCacheRaw } from './remote_config_client';

export const AUTH_CALLABLES_FETCH_FLAG = 'auth_callables_fetch_v1';
const FUNCTIONS_REGION = 'us-central1';
const DEV_ENV_ON = process.env.EXPO_PUBLIC_AUTH_CALLABLES_FETCH === '1';
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__ === true;

export type AuthCallableName = 'authEnsureStableLink' | 'authStampAnonOwnership' | 'authMergeStableAccounts';

/** Ошибка в форме SDK: code `functions/<status>`, message и details сервера — классификаторы читают её как раньше. */
export class AuthCallableFetchError extends Error {
  readonly code: string;
  readonly details: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AuthCallableFetchError';
    this.code = code;
    this.details = details;
  }
}

export type AuthCallableFetchDeps = Readonly<{
  flagOn?: () => Promise<boolean>;
  idToken?: () => Promise<string | null>;
  projectId?: () => string | null;
  fetchImpl?: typeof fetch;
  now?: () => number;
  log?: (line: string) => void;
}>;

// зачем (координатор 15.10, замер входа: ensure_link 3,9 с / stamp 2 с): Сверка сравнивает fetch-путь с нативным по dev-ссылке
// `authFetch=on|off` без перезапуска Metro и без прод-Remote Config. Только память, только dev; null — как обычно (кэш RC + env).
let devFetchOverride: boolean | null = null;

export function setDevAuthCallablesFetch(next: 'on' | 'off'): boolean {
  if (!IS_DEV) {
    console.warn('[AUTH-FETCH] dev_override отклонён — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  devFetchOverride = next === 'on';
  console.log(`[AUTH-FETCH] dev_override=${next}`);
  return true;
}

async function defaultFlagOn(): Promise<boolean> {
  if (IS_DEV && devFetchOverride !== null) {
    console.log(`[AUTH-FETCH] путь по dev_override=${devFetchOverride ? 'on' : 'off'}`);
    return devFetchOverride;
  }
  try {
    const raw = await readRemoteConfigCacheRaw();
    const bools = raw ? (JSON.parse(raw) as { bools?: Record<string, unknown> }).bools : null;
    return bools?.[AUTH_CALLABLES_FETCH_FLAG] === true || (IS_DEV && DEV_ENV_ON);
  } catch (error) {
    console.warn('[AUTH-FETCH] флаг не прочитан — нативный путь', error instanceof Error ? error.message : String(error)); // guard-ok: причина выбора пути
    return false;
  }
}

async function defaultIdToken(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authModule = require('@react-native-firebase/auth');
    const user = authModule.default()?.currentUser;
    if (!user || typeof user.getIdToken !== 'function') return null;
    const token: unknown = await user.getIdToken(false);
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch (error) {
    console.warn('[AUTH-FETCH] ID-токен не получен — нативный путь', error instanceof Error ? error.message : String(error)); // guard-ok: причина выбора пути
    return null;
  }
}

function defaultProjectId(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const id = require('@react-native-firebase/app').getApp()?.options?.projectId;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch (error) {
    console.warn('[AUTH-FETCH] projectId не прочитан — нативный путь', error instanceof Error ? error.message : String(error)); // guard-ok: причина выбора пути
    return null;
  }
}

function statusToCode(status: unknown, httpStatus: number): string {
  const s = typeof status === 'string' && status.length > 0 ? status : httpStatus >= 500 ? 'INTERNAL' : 'UNKNOWN';
  return `functions/${s.toLowerCase().replace(/_/g, '-')}`;
}

/**
 * Вызвать функцию входа. Флаг выкл / запрос не может уйти → `native()` (прежний путь RNFirebase).
 * Возвращает `{ data }` — как нативный callable, чтобы вызывающий код не менялся.
 */
export async function invokeAuthCallable<TReq, TRes>(
  name: AuthCallableName,
  payload: TReq,
  native: () => Promise<{ data: TRes }>,
  opts: Readonly<{ timeoutMs: number }>,
  deps: AuthCallableFetchDeps = {},
): Promise<{ data: TRes }> {
  const now = deps.now ?? Date.now;
  // eslint-disable-next-line no-console
  const log = deps.log ?? ((line: string) => console.log(line)); // guard-ok: путь и исход вызова входа
  const startedAt = now();
  const line = (path: 'native' | 'fetch', outcome: string, code: string | number | null): void =>
    log(`[AUTH-FETCH] fn=${name} path=${path} outcome=${outcome} code=${code ?? '-'} ms=${now() - startedAt}`);

  if (!(await (deps.flagOn ?? defaultFlagOn)())) return native();
  const projectId = (deps.projectId ?? defaultProjectId)();
  const fetchImpl = deps.fetchImpl ?? (typeof fetch === 'function' ? fetch : null);
  const token = projectId && fetchImpl ? await (deps.idToken ?? defaultIdToken)() : null;
  if (!projectId || !fetchImpl || !token) {
    // Запрос не ушёл — нативный путь безопасен (двойного выполнения нет).
    line('native', 'fallback_not_sent', !projectId ? 'no_project_id' : !fetchImpl ? 'no_fetch' : 'no_token');
    return native();
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller?.abort(); }, opts.timeoutMs);
  try {
    const res = await fetchImpl(`https://${FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ data: payload ?? null }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch (parseError) {
      line('fetch', 'bad_body', res.status);
      throw new AuthCallableFetchError(statusToCode(null, res.status), `auth_fetch_bad_body:${String(parseError).slice(0, 60)}`);
    }
    const err = (body as { error?: { status?: unknown; message?: unknown; details?: unknown } } | null)?.error;
    if (!res.ok || err) {
      const code = statusToCode(err?.status, res.status);
      line('fetch', 'server_error', `${res.status}:${code}`);
      throw new AuthCallableFetchError(code, typeof err?.message === 'string' ? err.message : `http_${res.status}`, err?.details);
    }
    line('fetch', 'ok', res.status);
    return { data: (body as { result?: TRes } | null)?.result as TRes };
  } catch (error) {
    if (error instanceof AuthCallableFetchError) throw error;
    // Запрос мог уйти — без нативного повтора (merge/stamp нельзя выполнить дважды).
    if (timedOut) {
      line('fetch', 'timeout', 'deadline-exceeded');
      throw new AuthCallableFetchError('functions/deadline-exceeded', 'auth_fetch_timeout');
    }
    const message = error instanceof Error ? error.message : String(error);
    line('fetch', 'network_failed', message.slice(0, 60));
    throw new AuthCallableFetchError('functions/unavailable', `network ${message.slice(0, 120)}`);
  } finally {
    clearTimeout(timer);
  }
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
