// зачем (план docs/work/tasks/firebase-cold-start-router-2026-11-11.md, шаг 2): переключатель «общей точки входа».
// Сторожим: выключен по умолчанию; чужие имена не трогает; ответ и ошибки не меняет; старым путём повторяет ТОЛЬКО когда
// доказано, что обработчик не запускался; действие с наградой никогда не выполняется дважды.
import fs from 'fs';
import path from 'path';

import {
  API_ROUTER_FUNCTION, API_ROUTER_STAGES, apiRouterFallbackReason, installApiRouter, routedNamesForStage,
} from '../app/api_router_client';

type Call = { via: 'direct' | 'router'; region: string; name: string; data: unknown; rest: unknown[] };
type RouterReply = (envelope: { name: string; data: unknown }) => Promise<unknown>;

const SAFE = API_ROUTER_STAGES[0].names[0];

function setup(input: { stage: number | (() => Promise<number>); router?: RouterReply; stages?: typeof API_ROUTER_STAGES }) {
  const calls: Call[] = [];
  const logs: string[] = [];
  const clock = { t: 0 };
  const router: RouterReply = input.router ?? (async (envelope) => ({ data: { routed: envelope.name } }));
  const makeInstance = (region: string) => {
    const instance = Object.create(proto) as { region: string };
    instance.region = region;
    return instance;
  };
  const proto = {
    httpsCallable(this: { region: string }, name: string, ...rest: unknown[]) {
      const region = this.region;
      return (data?: unknown) => {
        if (name === API_ROUTER_FUNCTION) {
          calls.push({ via: 'router', region, name: (data as { name: string }).name, data: (data as { data: unknown }).data, rest });
          return router(data as { name: string; data: unknown });
        }
        calls.push({ via: 'direct', region, name, data, rest });
        return Promise.resolve({ data: { direct: name } });
      };
    },
  } as Record<string, unknown> & { httpsCallable: (name: string, ...rest: unknown[]) => (data?: unknown) => Promise<unknown> };
  const eu = makeInstance('europe-west1');
  const us = makeInstance('us-central1') as unknown as typeof proto;
  const installed = installApiRouter(proto, {
    readStage: typeof input.stage === 'number' ? async () => input.stage as number : input.stage,
    euInstance: () => eu,
    now: () => clock.t,
    log: (line) => logs.push(line),
    stages: input.stages,
  });
  return { calls, logs, clock, us, proto, installed };
}

const rejectWith = (code: string, message: string) => async () => { throw Object.assign(new Error(message), { code }); };

describe('переключатель общей точки входа', () => {
  it('выключен (стадия 0): вызов идёт старым путём, ответ тот же, маршрутизатор не тронут', async () => {
    const { calls, us } = setup({ stage: 0 });
    await expect(us.httpsCallable(SAFE)({ a: 1 })).resolves.toEqual({ data: { direct: SAFE } });
    expect(calls).toEqual([{ via: 'direct', region: 'us-central1', name: SAFE, data: { a: 1 }, rest: [] }]);
  });

  it('включён: имя из списка уходит в europe-west1 как {name, data}; ответ возвращается без изменений', async () => {
    const { calls, us } = setup({ stage: 1 });
    await expect(us.httpsCallable(SAFE, { timeout: 9000 })({ a: 1 })).resolves.toEqual({ data: { routed: SAFE } });
    expect(calls).toEqual([{ via: 'router', region: 'europe-west1', name: SAFE, data: { a: 1 }, rest: [{ timeout: 9000 }] }]);
  });

  it('вызов без аргумента передаёт data: null', async () => {
    const { calls, us } = setup({ stage: 1 });
    await us.httpsCallable(SAFE)();
    expect(calls[0].data).toBeNull();
  });

  it('имя вне списков не трогается вовсе — даже настройка не читается', async () => {
    const readStage = jest.fn(async () => 1);
    const { calls, us } = setup({ stage: readStage });
    await us.httpsCallable('promoCodeRedeem')({ code: 'X' });
    await us.httpsCallable(API_ROUTER_FUNCTION)({ name: SAFE, data: null });
    expect(readStage).not.toHaveBeenCalled();
    expect(calls.map((c) => c.via)).toEqual(['direct', 'router']); // прямой вызов самой точки входа не заворачивается повторно
  });

  it('ошибка обработчика проходит наружу тем же объектом, повтора старым путём нет', async () => {
    const failure = Object.assign(new Error('rate_limited'), { code: 'functions/resource-exhausted' });
    const { calls, us } = setup({ stage: 1, router: async () => { throw failure; } });
    await expect(us.httpsCallable(SAFE)({})).rejects.toBe(failure);
    expect(calls.map((c) => c.via)).toEqual(['router']);
  });

  it.each([
    ['таймаут', 'functions/deadline-exceeded', 'deadline'],
    ['сеть', 'functions/unavailable', 'network error'],
    ['внутренний сбой', 'functions/internal', 'INTERNAL'],
  ])('%s: неизвестно, выполнилось ли действие — повтора старым путём нет', async (_label, code, message) => {
    const { calls, us } = setup({ stage: 1, router: rejectWith(code, message) });
    await expect(us.httpsCallable(SAFE)({})).rejects.toMatchObject({ code });
    expect(calls.map((c) => c.via)).toEqual(['router']);
  });

  it('точки входа ещё нет в облаке (not-found): читающая функция идёт старым путём, до конца запуска маршрутизатор не трогаем', async () => {
    const { calls, logs, us } = setup({ stage: 1, router: rejectWith('functions/not-found', 'NOT_FOUND') });
    await expect(us.httpsCallable(SAFE)({ a: 1 })).resolves.toEqual({ data: { direct: SAFE } });
    await us.httpsCallable(SAFE)({ a: 2 });
    expect(calls.map((c) => c.via)).toEqual(['router', 'direct', 'direct']);
    expect(logs.some((line) => line.includes('router_missing'))).toBe(true);
  });

  it('сервер не знает имя (router_unknown_name): обработчик не запускался — старый путь, имя пропускается до конца запуска', async () => {
    const { calls, logs, us } = setup({ stage: 1, router: rejectWith('functions/unimplemented', 'router_unknown_name') });
    await expect(us.httpsCallable(SAFE)({})).resolves.toEqual({ data: { direct: SAFE } });
    await us.httpsCallable(SAFE)({});
    expect(calls.map((c) => c.via)).toEqual(['router', 'direct', 'direct']);
    expect(logs.some((line) => line.includes('unknown_name') && line.includes(SAFE))).toBe(true);
  });

  describe('действия, которые нельзя выполнить дважды (repeatSafe: false)', () => {
    const stages = [
      { names: ['readThing'], repeatSafe: true },
      { names: ['grantReward'], repeatSafe: false },
    ] as const;

    it('пока маршрутизатор не подтвердил, что он есть, — идут старым путём', async () => {
      const { calls, us } = setup({ stage: 2, stages });
      await us.httpsCallable('grantReward')({ id: 1 });
      expect(calls.map((c) => c.via)).toEqual(['direct']);
    });

    it('после первого успешного ответа маршрутизатора — идут через него', async () => {
      const { calls, us } = setup({ stage: 2, stages });
      await us.httpsCallable('readThing')({});
      await us.httpsCallable('grantReward')({ id: 1 });
      expect(calls.map((c) => `${c.via}:${c.name}`)).toEqual(['router:readThing', 'router:grantReward']);
    });

    it('not-found от самого действия (документ не найден) НЕ запускает его второй раз', async () => {
      let n = 0;
      const { calls, us } = setup({
        stage: 2, stages,
        router: async (envelope) => {
          n += 1;
          if (envelope.name === 'grantReward') throw Object.assign(new Error('reward_not_found'), { code: 'functions/not-found' });
          return { data: n };
        },
      });
      await us.httpsCallable('readThing')({});
      await expect(us.httpsCallable('grantReward')({ id: 1 })).rejects.toMatchObject({ code: 'functions/not-found' });
      expect(calls.map((c) => `${c.via}:${c.name}`)).toEqual(['router:readThing', 'router:grantReward']);
    });

    it('стадия 1 не включает вторую очередь', async () => {
      const { calls, us } = setup({ stage: 1, stages });
      await us.httpsCallable('readThing')({});
      await us.httpsCallable('grantReward')({ id: 1 });
      expect(calls.map((c) => `${c.via}:${c.name}`)).toEqual(['router:readThing', 'direct:grantReward']);
    });
  });

  it('настройка читается не чаще раза в минуту; сбой чтения = выключено и причина в журнале', async () => {
    let stage = 1;
    const readStage = jest.fn(async () => stage);
    const { calls, clock, us } = setup({ stage: readStage });
    await us.httpsCallable(SAFE)({});
    stage = 0;
    await us.httpsCallable(SAFE)({});
    expect(readStage).toHaveBeenCalledTimes(1);
    clock.t = 61_000;
    await us.httpsCallable(SAFE)({});
    expect(readStage).toHaveBeenCalledTimes(2);
    expect(calls.map((c) => c.via)).toEqual(['router', 'router', 'direct']);

    const broken = setup({ stage: async () => { throw new Error('storage_down'); } });
    await expect(broken.us.httpsCallable(SAFE)({})).resolves.toEqual({ data: { direct: SAFE } });
    expect(broken.logs.some((line) => line.includes('stage_read_failed') && line.includes('storage_down'))).toBe(true);
  });

  it('повторная установка не оборачивает дважды', () => {
    const { proto, installed } = setup({ stage: 1 });
    expect(installed).toBe(true);
    expect(installApiRouter(proto, { readStage: async () => 1, euInstance: () => ({}), now: () => 0, log: () => undefined })).toBe(false);
  });

  it('стадии: 0 — пусто, выше диапазона — все, дробь и мусор — как 0', () => {
    expect(routedNamesForStage(0)).toEqual([]);
    expect(routedNamesForStage(1)).toEqual([...API_ROUTER_STAGES[0].names]);
    expect(routedNamesForStage(99)).toEqual(API_ROUTER_STAGES.flatMap((s) => [...s.names]));
    expect(routedNamesForStage(Number.NaN)).toEqual([]);
    expect(routedNamesForStage(-3)).toEqual([]);
  });

  it('разбор причины запасного пути', () => {
    expect(apiRouterFallbackReason({ code: 'functions/unimplemented', message: 'router_unknown_name' })).toBe('unknown_name');
    expect(apiRouterFallbackReason({ code: 'functions/not-found', message: 'NOT_FOUND' })).toBe('router_missing');
    expect(apiRouterFallbackReason({ code: 'functions/unimplemented', message: 'other' })).toBeNull();
    expect(apiRouterFallbackReason({ code: 'functions/deadline-exceeded', message: 'x' })).toBeNull();
    expect(apiRouterFallbackReason(null)).toBeNull();
  });

  it('каждое имя из списков приложения есть в белом списке сервера — иначе вызов впустую ходил бы в Европу', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'api_router.ts'), 'utf8');
    const block = server.slice(server.indexOf('API_ROUTER_ROUTES'), server.indexOf('});', server.indexOf('API_ROUTER_ROUTES')));
    for (const name of API_ROUTER_STAGES.flatMap((s) => [...s.names])) expect(block).toContain(name);
  });
});
