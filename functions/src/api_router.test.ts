// зачем (план firebase-cold-start-router-2026-11-11, шаг 1): маршрутизатор обязан (а) не запускать ничего для имени вне белого
// списка, (б) передать обработчику запрос без потерь — auth и rawRequest нужны проверкам и лимитам внутри обработчиков,
// (в) вернуть ответ и ошибку обработчика без изменений, (г) оставить в журнале имя, длительность и исход каждого вызова.
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { API_ROUTER_UNKNOWN_NAME, createApiRouterHandler, type ApiRoute } from './api_router_core';

type Logged = { level: 'info' | 'warn'; line: string; payload: Record<string, unknown> };

function harness(routes: Record<string, ApiRoute>, clock: number[] = [1000, 1042]) {
  const logged: Logged[] = [];
  const times = [...clock];
  const handler = createApiRouterHandler(routes, {
    now: () => times.shift() ?? 0,
    log: (level, payload) => logged.push({ level, line: '[API-ROUTER]', payload }),
  });
  return { handler, logged };
}

function request(data: unknown, extra: Partial<CallableRequest<unknown>> = {}): CallableRequest<unknown> {
  return {
    data,
    auth: { uid: 'auth-1', token: { uid: 'auth-1' } },
    rawRequest: { ip: '203.0.113.7', headers: { 'x-forwarded-for': '203.0.113.7' } },
    acceptsStreaming: false,
    ...extra,
  } as unknown as CallableRequest<unknown>;
}

// зачем: api_router.ts — проводка (список функций, опции, экспорт). Импорт тянет firebase-admin и все обработчики, поэтому
// сторожим по тексту исходника: ошибка здесь стоит денег (minInstances) или впускает лишнюю функцию в общий вход.
describe('api router: проводка', () => {
  const fs = jest.requireActual<typeof import('fs')>('fs');
  const path = jest.requireActual<typeof import('path')>('path');
  const source = fs.readFileSync(path.join(__dirname, 'api_router.ts'), 'utf8');
  const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

  it('белый список первой очереди — ровно четыре читающие функции', () => {
    const start = source.indexOf('API_ROUTER_ROUTES');
    const block = source.slice(source.indexOf('Object.freeze({', start), source.indexOf('});', start));
    const names = block.split('\n').map((line) => line.trim().replace(/,$/, '')).filter((line) => /^[A-Za-z]\w*$/.test(line));
    expect(names.sort()).toEqual(['getActiveShardSurvey', 'globalBroadcastListActive', 'premiumThemeEntitlementsGet', 'storyAnnouncementsGet']);
  });

  it('опции: Европа рядом с базой, без постоянно включённого экземпляра, с потолком экземпляров', () => {
    expect(source).toMatch(/region: 'europe-west1'/);
    expect(source).toMatch(/minInstances: 0/);
    expect(source).toMatch(/maxInstances: 10/);
    expect(source).toMatch(/concurrency: 80/);
    expect(source).toMatch(/enforceAppCheck: ENFORCE_APP_CHECK/);
  });

  it('функция экспортируется из index.ts ровно один раз — иначе в деплой не попадёт', () => {
    expect(index.match(/export \{ api \} from '\.\/api_router';/g)).toHaveLength(1);
  });
});

describe('api router', () => {
  it('передаёт обработчику его data, а auth и rawRequest — без изменений; возвращает ответ как есть', async () => {
    const seen: CallableRequest<unknown>[] = [];
    const result = { ok: true, items: [1, 2] };
    const { handler, logged } = harness({ storyAnnouncementsGet: { run: async (req) => { seen.push(req); return result; } } });
    const incoming = request({ name: 'storyAnnouncementsGet', data: { knownRevision: 7 } });

    await expect(handler(incoming)).resolves.toBe(result);

    expect(seen).toHaveLength(1);
    expect(seen[0].data).toEqual({ knownRevision: 7 });
    expect(seen[0].auth).toBe(incoming.auth);
    expect(seen[0].rawRequest).toBe(incoming.rawRequest);
    expect(incoming.data).toEqual({ name: 'storyAnnouncementsGet', data: { knownRevision: 7 } }); // входящий запрос не изменён
    expect(logged).toEqual([{ level: 'info', line: '[API-ROUTER]', payload: { name: 'storyAnnouncementsGet', ms: 42, outcome: 'ok' } }]);
  });

  it('вызов без data передаёт обработчику null — как прямой вызов callable без аргумента', async () => {
    const seen: unknown[] = [];
    const { handler } = harness({ ping: { run: async (req) => { seen.push(req.data); return null; } } });
    await handler(request({ name: 'ping' }));
    expect(seen).toEqual([null]);
  });

  it('имя вне белого списка: unimplemented/router_unknown_name, ни один обработчик не запущен, причина в журнале', async () => {
    const run = jest.fn();
    const { handler, logged } = harness({ known: { run } });
    await expect(handler(request({ name: 'adminDeleteEverything', data: {} }))).rejects.toMatchObject({
      code: 'unimplemented', message: API_ROUTER_UNKNOWN_NAME,
    });
    expect(run).not.toHaveBeenCalled();
    expect(logged).toEqual([{ level: 'warn', line: '[API-ROUTER]', payload: { name: 'adminDeleteEverything', ms: 0, outcome: API_ROUTER_UNKNOWN_NAME } }]);
  });

  it('унаследованные ключи объекта (constructor, __proto__, toString) не считаются именами', async () => {
    const { handler } = harness({ known: { run: jest.fn() } });
    for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      await expect(handler(request({ name, data: {} }))).rejects.toMatchObject({ code: 'unimplemented' });
    }
  });

  it.each([
    ['не объект', 'known'],
    ['нет имени', { data: {} }],
    ['имя не строка', { name: 42 }],
    ['пустое имя', { name: '' }],
    ['слишком длинное имя', { name: 'a'.repeat(81) }],
    ['массив', ['known']],
    ['null', null],
  ])('плохой запрос (%s): invalid-argument, обработчик не запущен, причина в журнале', async (_label, data) => {
    const run = jest.fn();
    const { handler, logged } = harness({ known: { run } });
    await expect(handler(request(data))).rejects.toMatchObject({ code: 'invalid-argument', message: 'router_bad_request' });
    expect(run).not.toHaveBeenCalled();
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ level: 'warn', payload: { outcome: 'router_bad_request' } });
  });

  it('ошибка обработчика проходит наружу тем же объектом; в журнале её код', async () => {
    const failure = new HttpsError('resource-exhausted', 'rate_limited', { retryAfterMs: 5000 });
    const { handler, logged } = harness({ known: { run: async () => { throw failure; } } });
    await expect(handler(request({ name: 'known', data: {} }))).rejects.toBe(failure);
    expect(logged).toEqual([{ level: 'warn', line: '[API-ROUTER]', payload: { name: 'known', ms: 42, outcome: 'resource-exhausted' } }]);
  });

  it('не-HttpsError (сбой внутри обработчика) тоже пробрасывается как есть; исход в журнале — internal', async () => {
    const failure = new Error('firestore unavailable');
    const { handler, logged } = harness({ known: { run: () => { throw failure; } } });
    await expect(handler(request({ name: 'known', data: {} }))).rejects.toBe(failure);
    expect(logged[0].payload).toEqual({ name: 'known', ms: 42, outcome: 'internal' });
  });

  it('в журнал не попадают ни данные запроса, ни uid', async () => {
    const { handler, logged } = harness({ known: { run: async () => ({ secret: 'x' }) } });
    await handler(request({ name: 'known', data: { token: 'private-value' } }));
    expect(JSON.stringify(logged)).not.toMatch(/private-value|auth-1|203\.0\.113\.7|secret/);
  });
});
