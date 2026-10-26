/*
 * [CALLABLE-START] (координатор 26.10, аудит холодного старта п. 4): dev-перепись вызовов облачных функций с первого вызова.
 * зачем: [FS-READS] видит только чтения Firestore — сколько функций зовёт старт, не знал никто (docs/work/cold-start-audit-2026-10-26.md).
 * Только счёт и логи: ответ и ошибка возвращаются как были. В журнал — имя функции, итог и миллисекунды, без данных запроса.
 * Ставится из dev_callable_counter_boot.ts (__DEV__), в стор-бандл не попадает.
 */

type CallableFn = (data?: unknown) => Promise<unknown>;
type CallableProto = Record<string, unknown> & {
  httpsCallable?: (name: string, options?: unknown) => CallableFn;
  httpsCallableFromUrl?: (url: string, options?: unknown) => CallableFn;
};

type CallRecord = { name: string; startedAtMs: number; ms: number | null; outcome: string | null };

const LOG = '[CALLABLE-START]';
const INSTALLED = Symbol.for('phraseman.callable_counter_installed');
let bootAtMs = Date.now();
const calls: CallRecord[] = [];

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code ? code : 'error';
}

function wrap(name: string, fn: CallableFn, now: () => number): CallableFn {
  return (data?: unknown) => {
    const record: CallRecord = { name, startedAtMs: now() - bootAtMs, ms: null, outcome: null };
    calls.push(record);
    const started = now();
    return fn(data).then(
      (result) => { record.ms = now() - started; record.outcome = 'ok'; return result; },
      (error: unknown) => { record.ms = now() - started; record.outcome = errorCode(error); throw error; },
    );
  };
}

/** Обернуть httpsCallable / httpsCallableFromUrl прототипа модуля функций. Повторная установка — без двойной обёртки. */
export function installCallableCounter(proto: CallableProto, now: () => number = Date.now): boolean {
  if (!proto || (proto as Record<symbol, unknown>)[INSTALLED]) return false;
  const original = proto.httpsCallable;
  const originalFromUrl = proto.httpsCallableFromUrl;
  if (typeof original !== 'function') return false;
  proto.httpsCallable = function patched(this: unknown, name: string, options?: unknown): CallableFn {
    return wrap(String(name), original.call(this, name, options), now);
  };
  if (typeof originalFromUrl === 'function') {
    proto.httpsCallableFromUrl = function patchedUrl(this: unknown, url: string, options?: unknown): CallableFn {
      const short = String(url).replace(/^https?:\/\/[^/]+\//, '').slice(0, 60);
      return wrap(`url:${short}`, originalFromUrl.call(this, url, options), now);
    };
  }
  (proto as Record<symbol, unknown>)[INSTALLED] = true;
  return true;
}

/** Сводка вызовов, начатых в первые windowMs от запуска (по имени: сколько, ок/ошибки, среднее/макс мс, в полёте). */
export function callableReportLines(windowMs: number, label: string): string[] {
  const inWindow = calls.filter((c) => c.startedAtMs <= windowMs);
  const byName = new Map<string, CallRecord[]>();
  for (const c of inWindow) byName.set(c.name, [...(byName.get(c.name) ?? []), c]); // guard-ok: Map в памяти, не Firestore
  const lines = [`${LOG} === ${label}: до ${windowMs} мс — вызовов ${inWindow.length}, функций ${byName.size}`];
  const rows = [...byName.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [name, list] of rows) {
    const done = list.filter((c) => c.ms !== null);
    const ok = done.filter((c) => c.outcome === 'ok').length;
    const errors = [...new Set(done.filter((c) => c.outcome !== 'ok').map((c) => c.outcome))];
    const avg = done.length ? Math.round(done.reduce((s, c) => s + (c.ms ?? 0), 0) / done.length) : 0;
    const max = done.reduce((m, c) => Math.max(m, c.ms ?? 0), 0);
    const pending = list.length - done.length;
    lines.push(`${LOG}   ${name} ×${list.length} ok=${ok}${errors.length ? ` err=${done.length - ok}(${errors.join(',')})` : ''} avg=${avg}мс max=${max}мс${pending ? ` в полёте=${pending}` : ''} первый=+${list[0].startedAtMs}мс`);
  }
  return lines;
}

export function logCallableReport(windowMs: number, label: string): void {
  for (const line of callableReportLines(windowMs, label)) console.log(line); // guard-ok: dev-сводка по окну
}

/** Только для тестов. */
export function resetCallableCounterForTests(nowMs = Date.now()): void {
  calls.length = 0;
  bootAtMs = nowMs;
}

/* expo-router route shim */
export default function __CallableCounterRouteShim() { return null; }
