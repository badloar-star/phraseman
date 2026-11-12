// [AUTH-LINK] (координатор 12.11, обход экранов: «authEnsureStableLink callable failed … outcome=error_no_fallback», код обрезан):
// сбой привязки и её ранние выходы называют причину в любой сборке, а текст ошибки не уносит id и почту в журнал.
// Сработал — чини код, а не сторожа.
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('[AUTH-LINK] трассировка привязки аккаунта', () => {
  it('маска текста ошибки: длинные id, длинные числа и почта не попадают в журнал', () => {
    // функция чистая; берём её из исходника, чтобы не тянуть тяжёлый модуль синхронизации в тест
    const src = read('app/cloud_sync.ts');
    const body = /export function authLinkSafeText\(raw: unknown\): string \{([\s\S]*?)\n\}/.exec(src)?.[1];
    expect(body).toBeTruthy();
    // eslint-disable-next-line no-new-func
    const safe = new Function('raw', body!) as (raw: unknown) => string;
    expect(safe('[functions/internal] INTERNAL')).toBe('[functions/internal] INTERNAL');
    expect(safe('stable_id_mismatch for Ab3dEf5gH7jK9lM1nP3qR5sT7')).toBe('stable_id_mismatch for *');
    expect(safe('user 1234567 at mail me@example.com')).toBe('user * at mail *@*');
    expect(safe('x'.repeat(300)).length).toBeLessThanOrEqual(120);
  });

  it('сбой вызова пишет одну строку с кодом, текстом, нативным текстом, классификацией и длительностью — не только в dev', () => {
    const src = read('app/cloud_sync.ts');
    const at = src.indexOf("console.warn('[AUTH-LINK] ensure:failed'");
    expect(at).toBeGreaterThan(src.indexOf('const failure = classifyCloudAccessFailure(error);'));
    const line = src.slice(at, at + 1200);
    for (const field of ['code:', 'message: authLinkSafeText(', 'native: authLinkSafeText(', 'failure,', 'nonceRejection:', 'authoritative:', 'ms: Date.now() - linkStartedAtMs']) {
      expect(line).toContain(field);
    }
    expect(src.slice(at - 200, at)).not.toMatch(/if \(__DEV__\)\s*$/);
  });

  it('оба ранних выхода без вызова сервера называют причину', () => {
    const src = read('app/cloud_sync.ts');
    expect(src).toContain("[AUTH-LINK] ensure:skip reason=account_delete_quarantine");
    expect(src).toContain("[AUTH-LINK] ensure:skip reason=${!stableId ? 'no_stable_id' : 'no_auth_uid'}");
  });

  it('отказ нативного слоя до отправки («underlying tasks failed») — сбой связи, а не «личность недоступна»', () => {
    // факт с эмулятора 12.11 07:06 ([AUTH-LINK] ensure:failed ×7); функцию берём из исходника и переводим в JS — тяжёлый модуль не грузим
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ts = require('typescript') as typeof import('typescript');
    const src = read('app/cloud_sync.ts');
    const fnText = /function classifyCloudAccessFailure\(error: unknown\): StableAuthLinkFailure \{[\s\S]*?\n\}/.exec(src)?.[0];
    expect(fnText).toBeTruthy();
    const js = ts.transpileModule(`${fnText}\nmodule.exports = classifyCloudAccessFailure;`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const mod = { exports: {} as unknown };
    // eslint-disable-next-line no-new-func
    new Function('module', js)(mod);
    const classify = mod.exports as (error: unknown) => string;
    const android = { code: 'unknown', message: 'java.util.concurrent.ExecutionException: 1 out of 2 underlying tasks failed' };
    expect(classify(android)).toBe('transport_unavailable');
    // остальное не задето: серверные отказы по-прежнему узнаются, неизвестное — identity_unavailable
    expect(classify({ code: 'functions/failed-precondition', message: 'identity_retired' })).toBe('identity_retired');
    expect(classify({ code: 'functions/permission-denied', message: 'stable_id_mismatch' })).toBe('stable_id_mismatch');
    expect(classify({ code: 'functions/internal', message: 'INTERNAL' })).toBe('identity_unavailable');
    expect(classify({ code: 'functions/unavailable', message: '' })).toBe('transport_unavailable');
  });

  it('«нет запасного пути» в регионе печатает и начало текста ошибки', () => {
    expect(read('app/auth_callable_fetch.ts')).toMatch(/outcome=error_no_fallback code=\$\{code\} msg=\$\{JSON\.stringify\(message\)\}/);
  });
});
