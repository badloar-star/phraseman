// ═══════════════════════════════════════════════════════════════════════════
// auth_callable_fetch.ts — вызовы пути входа (ensureLink / stamp / merge) обычным fetch с ID-токеном. ПОД ФЛАГОМ, выкл.
//
// зачем (координатор 14.10, прогон №5 + лог Cloud Run): RNFirebase functions на Android выполняет все callable на ОДНОМ потоке
// (firebase.json android_task_executor_maximum_pool_size: 0 — инвариант утечки потоков Firestore, не трогаем): вызовы входа
// стоят в очереди за стартовыми ensure. fetch идёт мимо очереди. Включаем по цифрам прогона №6/№7.
//
// Правило повтора (координатор): нативный вызов — ТОЛЬКО если запрос гарантированно не ушёл (флаг выкл, нет токена/projectId/
// fetch). Ушёл и упал — ошибка наверх без повтора: merge/stamp дважды выполнять нельзя.
// Лог [AUTH-FETCH]: функция, регион, путь (native/fetch), исход, код, мс. Без токена, uid и данных.
//
// РЕГИОН (владелец 18.10 «Да, перенести», разбор fc30ae94a): база в eur3, а функции в us-central1 отвечали 3,6–5,9 с — каждое
// обращение к базе шло через океан. Функции входа выложены И в europe-west1, И в us-central1 (старые сборки). Здесь — Европа
// первой, запасной путь на США:
//   - not-found (функции ещё нет в Европе) — для всех трёх; Европа считается недоступной до конца запуска;
//   - unavailable / deadline-exceeded / сеть — ТОЛЬКО authEnsureStableLink (идемпотентна; метку и слияние дважды нельзя);
//   - Remote Config auth_region_eu_v1 = false — сразу США (выключатель без сборки).
// Лог [AUTH-REGION]: функция, регион, исход, код, мс, причина запасного пути.
// ═══════════════════════════════════════════════════════════════════════════
import { readRemoteConfigCacheRaw } from './remote_config_client';
import {
  AUTH_REGION_EU,
  AUTH_REGION_US,
  type AuthCallableRegion,
  isAuthRegionEuUnavailableThisRun,
  markAuthRegionEuUnavailable,
  rememberAuthRegionEuEnabled,
} from './auth_callable_region';

export { AUTH_REGION_EU, AUTH_REGION_US, type AuthCallableRegion } from './auth_callable_region';

export const AUTH_CALLABLES_FETCH_FLAG = 'auth_callables_fetch_v1';
export const AUTH_REGION_EU_FLAG = 'auth_region_eu_v1';
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
  /** Европа включена (Remote Config auth_region_eu_v1; нет значения — включена). */
  euEnabled?: () => Promise<boolean>;
  /** Нативный callable в заданном регионе (для Европы; США — замыкание вызывающего). */
  nativeInRegion?: (region: AuthCallableRegion, name: AuthCallableName, payload: unknown, timeoutMs: number) => Promise<{ data: unknown }>;
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

async function defaultEuEnabled(): Promise<boolean> {
  try {
    const raw = await readRemoteConfigCacheRaw();
    const bools = raw ? (JSON.parse(raw) as { bools?: Record<string, unknown> }).bools : null;
    // Нет значения — Европа включена (решение владельца 18.10); false — выключатель на США.
    return bools?.[AUTH_REGION_EU_FLAG] !== false;
  } catch (error) {
    console.warn('[AUTH-REGION] выключатель не прочитан — Европа по умолчанию', error instanceof Error ? error.message : String(error)); // guard-ok: причина выбора региона
    return true;
  }
}

/** Регион, в который сейчас идут вызовы входа (и прогрев). */
export async function currentAuthCallableRegion(deps: Pick<AuthCallableFetchDeps, 'euEnabled'> = {}): Promise<AuthCallableRegion> {
  if (isAuthRegionEuUnavailableThisRun()) return AUTH_REGION_US;
  const enabled = await (deps.euEnabled ?? defaultEuEnabled)();
  // Запоминаем для прогрева: он читает регион синхронно и не ждёт настроек.
  rememberAuthRegionEuEnabled(enabled);
  return enabled ? AUTH_REGION_EU : AUTH_REGION_US;
}

function defaultNativeInRegion(region: AuthCallableRegion, name: AuthCallableName, payload: unknown, timeoutMs: number): Promise<{ data: unknown }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), region), name, { timeout: timeoutMs })(payload) as Promise<{ data: unknown }>;
}

function errorCodeText(error: unknown): string {
  const row = (error && typeof error === 'object' ? error : {}) as { code?: unknown; message?: unknown };
  return `${String(row.code ?? '')} ${String(row.message ?? '')}`.toLowerCase();
}

/**
 * Можно ли после сбоя в Европе позвать США. null — нельзя (ошибка наверх).
 * зачем: not-found значит, что запрос не исполнялся (функции нет) — безопасно для всех; сбой связи/таймаут — запрос мог
 * исполниться, повтор безопасен только у идемпотентной authEnsureStableLink.
 */
export function authRegionFallbackReason(name: AuthCallableName, error: unknown): 'not_deployed' | 'transport' | null {
  const text = errorCodeText(error);
  if (text.includes('not-found') || text.includes('not_found')) return 'not_deployed';
  if (name !== 'authEnsureStableLink') return null;
  if (text.includes('deadline-exceeded') || text.includes('unavailable') || text.includes('network')) return 'transport';
  return null;
}

function statusToCode(status: unknown, httpStatus: number): string {
  // 404 без тела ошибки — функции нет в этом регионе (ещё не выложена): это not-found, а не «неизвестно».
  const s = typeof status === 'string' && status.length > 0 ? status : httpStatus === 404 ? 'NOT_FOUND' : httpStatus >= 500 ? 'INTERNAL' : 'UNKNOWN';
  return `functions/${s.toLowerCase().replace(/_/g, '-')}`;
}

/**
 * Вызвать функцию входа: Европа первой, запасной путь на США (правила — в шапке файла).
 * `native` — нативный вызов вызывающего в us-central1. Возвращает `{ data }` — как нативный callable.
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
  const log = deps.log ?? ((line: string) => console.log(line)); // guard-ok: регион и исход вызова входа
  const region = await currentAuthCallableRegion(deps);
  if (region === AUTH_REGION_US) {
    log(`[AUTH-REGION] fn=${name} region=${AUTH_REGION_US} reason=${isAuthRegionEuUnavailableThisRun() ? 'eu_unavailable_this_run' : 'eu_switched_off'}`);
    return invokeInRegion(AUTH_REGION_US, name, payload, native, opts, deps);
  }
  const startedAt = now();
  const nativeEu = () => (deps.nativeInRegion ?? defaultNativeInRegion)(AUTH_REGION_EU, name, payload, opts.timeoutMs) as Promise<{ data: TRes }>;
  try {
    const result = await invokeInRegion(AUTH_REGION_EU, name, payload, nativeEu, opts, deps);
    log(`[AUTH-REGION] fn=${name} region=${AUTH_REGION_EU} outcome=ok ms=${now() - startedAt}`);
    return result;
  } catch (error) {
    const reason = authRegionFallbackReason(name, error);
    const code = String((error as { code?: unknown } | null)?.code ?? '-').slice(0, 60);
    if (!reason) {
      log(`[AUTH-REGION] fn=${name} region=${AUTH_REGION_EU} outcome=error_no_fallback code=${code} ms=${now() - startedAt}`);
      throw error;
    }
    if (reason === 'not_deployed') markAuthRegionEuUnavailable();
    log(`[AUTH-REGION] fn=${name} region=${AUTH_REGION_EU} outcome=fallback_us reason=${reason} code=${code} ms=${now() - startedAt}`);
    return invokeInRegion(AUTH_REGION_US, name, payload, native, opts, deps);
  }
}

/** Один вызов в заданном регионе: fetch по флагу auth_callables_fetch_v1 или нативный путь (прежние правила). */
async function invokeInRegion<TReq, TRes>(
  region: AuthCallableRegion,
  name: AuthCallableName,
  payload: TReq,
  native: () => Promise<{ data: TRes }>,
  opts: Readonly<{ timeoutMs: number }>,
  deps: AuthCallableFetchDeps,
): Promise<{ data: TRes }> {
  const now = deps.now ?? Date.now;
  // eslint-disable-next-line no-console
  const log = deps.log ?? ((line: string) => console.log(line)); // guard-ok: путь и исход вызова входа
  const startedAt = now();
  const line = (path: 'native' | 'fetch', outcome: string, code: string | number | null): void =>
    log(`[AUTH-FETCH] fn=${name} region=${region} path=${path} outcome=${outcome} code=${code ?? '-'} ms=${now() - startedAt}`);

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
    const res = await fetchImpl(`https://${region}-${projectId}.cloudfunctions.net/${name}`, {
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
