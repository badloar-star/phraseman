// ═══════════════════════════════════════════════════════════════════════════
// auth_warm_fetch.ts — прогрев callable-функций входа обычным fetch, мимо однопоточной очереди RNFirebase.
//
// зачем (координатор 14.10, прогон №5, лог Cloud Run): на Android firebase.json `android_task_executor_maximum_pool_size: 0`
// (инвариант утечки потоков Firestore — НЕ трогать) делает так, что RNFirebase functions выполняет ВСЕ callable на одном потоке
// через Tasks.await. Три «параллельных» прогрева приходили на сервер по одному (13,3 / 22,4 / 32,4 с), а реальные вызовы входа
// ждали за ними (stamp 9,6 с у клиента против 3,66 с на сервере). fetch идёт мимо этой очереди: прогревы — параллельно,
// вход их не ждёт.
//
// Тело — только {data:{warmup:true}}, без токена: warmup-ветка сервера стоит до auth-чека и до Firestore.
// Никогда не бросает; любой исход — строка [WARM-FETCH] (функция, исход, код, мс). 401/403 — инстанс всё равно поднят.
// ═══════════════════════════════════════════════════════════════════════════

export const WARM_FETCH_TIMEOUT_MS = 10_000;
const FUNCTIONS_REGION = 'us-central1';

export type WarmFetchOutcome = 'warm_ok' | 'warm_ok_rejected' | 'http_error' | 'timeout' | 'failed' | 'skip';

export type WarmFetchDeps = Readonly<{
  fetchImpl?: typeof fetch;
  now?: () => number;
  projectId?: () => string | null;
  log?: (line: string) => void;
}>;

function defaultProjectId(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    const id = getApp()?.options?.projectId;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch (error) {
    console.warn('[WARM-FETCH] projectId не прочитан', error instanceof Error ? error.message : String(error)); // guard-ok: причина пропуска
    return null;
  }
}

export function warmCallableUrl(projectId: string, name: string): string {
  return `https://${FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/${name}`;
}

/** Один прогрев. Возвращает исход (для тестов); вызывающий не ждёт — fire-and-forget. */
export async function warmCallableViaFetch(name: string, source: string, deps: WarmFetchDeps = {}): Promise<WarmFetchOutcome> {
  const now = deps.now ?? Date.now;
  // eslint-disable-next-line no-console
  const log = deps.log ?? ((line: string) => console.log(line)); // guard-ok: итог прогрева
  const startedAt = now();
  const done = (outcome: WarmFetchOutcome, code: number | string | null): WarmFetchOutcome => {
    log(`[WARM-FETCH] fn=${name} outcome=${outcome} code=${code ?? '-'} ms=${now() - startedAt} source=${source}`);
    return outcome;
  };
  const projectId = (deps.projectId ?? defaultProjectId)();
  if (!projectId) return done('skip', 'no_project_id');
  const fetchImpl = deps.fetchImpl ?? (typeof fetch === 'function' ? fetch : null);
  if (!fetchImpl) return done('skip', 'no_fetch');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller?.abort(); }, WARM_FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(warmCallableUrl(projectId, name), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { warmup: true } }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (res.ok) return done('warm_ok', res.status);
    if (res.status === 401 || res.status === 403) return done('warm_ok_rejected', res.status);
    return done('http_error', res.status);
  } catch (error) {
    if (timedOut) return done('timeout', 'abort');
    return done('failed', (error instanceof Error ? error.message : String(error)).slice(0, 60));
  } finally {
    clearTimeout(timer);
  }
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
