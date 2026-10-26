// [CALLABLE-START] (координатор 26.10, аудит холодного старта п. 4): dev-перепись вызовов облачных функций.
// Сторожим: ответ и ошибка не меняются, счёт и итог верные, сводка по окну, установка без двойной обёртки, только __DEV__.
import fs from 'fs';
import path from 'path';

import { callableReportLines, installCallableCounter, resetCallableCounterForTests } from '../app/dev_callable_counter';

const ROOT = path.join(__dirname, '..');

function fakeProto(clock: { t: number }) {
  return {
    httpsCallable(name: string) {
      return (data?: unknown) => {
        clock.t += name === 'slowFn' ? 300 : 20;
        if (name === 'failFn') return Promise.reject(Object.assign(new Error('nope'), { code: 'permission-denied' }));
        return Promise.resolve({ data: { echo: data, name } });
      };
    },
  } as Record<string, unknown> & { httpsCallable: (name: string) => (data?: unknown) => Promise<unknown> };
}

it('ответ и ошибка проходят без изменений; счёт, итог и мс — в сводке', async () => {
  const clock = { t: 1_000 };
  const now = () => clock.t;
  resetCallableCounterForTests(1_000);
  const proto = fakeProto(clock);
  expect(installCallableCounter(proto, now)).toBe(true);

  await expect(proto.httpsCallable('okFn')({ a: 1 })).resolves.toEqual({ data: { echo: { a: 1 }, name: 'okFn' } });
  await proto.httpsCallable('okFn')();
  await expect(proto.httpsCallable('failFn')()).rejects.toMatchObject({ code: 'permission-denied', message: 'nope' });
  await proto.httpsCallable('slowFn')();

  const lines = callableReportLines(60_000, 'первые 60 с');
  expect(lines[0]).toBe('[CALLABLE-START] === первые 60 с: до 60000 мс — вызовов 4, функций 3');
  expect(lines.find((l) => l.includes('okFn'))).toContain('okFn ×2 ok=2 avg=20мс');
  expect(lines.find((l) => l.includes('failFn'))).toContain('err=1(permission-denied)');
  expect(lines.find((l) => l.includes('slowFn'))).toContain('max=300мс');
  // в журнал не уходят данные запроса
  expect(lines.join('\n')).not.toContain('"a"');
});

it('окно: вызовы позже окна в сводку окна не входят', async () => {
  const clock = { t: 0 };
  resetCallableCounterForTests(0);
  const proto = fakeProto(clock);
  installCallableCounter(proto, () => clock.t);
  await proto.httpsCallable('early')();
  clock.t = 40_000;
  await proto.httpsCallable('late')();
  expect(callableReportLines(10_000, 'старт 10 с')[0]).toContain('вызовов 1, функций 1');
  expect(callableReportLines(60_000, 'первые 60 с')[0]).toContain('вызовов 2, функций 2');
});

it('повторная установка не оборачивает дважды', async () => {
  const clock = { t: 0 };
  resetCallableCounterForTests(0);
  const proto = fakeProto(clock);
  expect(installCallableCounter(proto, () => clock.t)).toBe(true);
  expect(installCallableCounter(proto, () => clock.t)).toBe(false);
  await proto.httpsCallable('once')();
  expect(callableReportLines(60_000, 'x')[0]).toContain('вызовов 1');
});

it('точка входа: только __DEV__ и подключена в index.js рядом с [FS-READS], до expo-router', () => {
  const boot = fs.readFileSync(path.join(ROOT, 'app/dev_callable_counter_boot.ts'), 'utf8');
  const devAt = boot.indexOf('if (__DEV__) {');
  expect(devAt).toBeGreaterThan(-1);
  expect(boot.indexOf("require('./dev_callable_counter')")).toBeGreaterThan(devAt);
  const index = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
  const at = index.indexOf("import './app/dev_callable_counter_boot';");
  expect(at).toBeGreaterThan(index.indexOf("import './app/dev_firestore_read_counter_boot';"));
  expect(at).toBeLessThan(index.indexOf("import 'expo-router/entry';"));
});
