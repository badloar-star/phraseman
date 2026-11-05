// зачем (владелец 05.11: «Подарок энергии — разрешить с лимитом»; клиент за флагом energy_gift_enabled): сторож слоя вызовов — «Забрать» зачисляет СРАЗУ (до ответа сервера), отказ откатывает
// только неподтверждённое, повтор того же giftId не зачисляет дважды, флаг выключен — ничего не вызывается, причины отказа сервера разбираются по коду правила.
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
  },
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ phase: 'active', stableId: 'uid-me', generation: 1 }),
  subscribeAccountGeneration: () => () => undefined,
}));
let enabled = true;
jest.mock('../app/remote_flags', () => ({ getRemoteBool: (key: string) => (key === 'energy_gift_enabled' ? enabled : false) }));
const calls: Array<{ name: string; data: unknown }> = [];
let behaviour: (name: string, data: unknown) => Promise<unknown> = async () => ({ ok: true });
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_fns: unknown, name: string) => async (data: unknown) => { calls.push({ name, data }); return { data: await behaviour(name, data) }; },
}));

import { claimEnergyGift, energyGiftFailureReason, isEnergyGiftEnabled, retryPendingEnergyGiftClaims, sendEnergyGift } from '../app/energy_gift_client';
import { __resetEnergyGiftPoolForTests, pendingGiftIds, peekGiftPool } from '../app/energy_gift_pool';

const OWNER = 'uid-me';
beforeEach(() => {
  __resetEnergyGiftPoolForTests();
  for (const k of Object.keys(store)) delete store[k];
  calls.length = 0;
  enabled = true;
  behaviour = async () => ({ ok: true });
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('клиент подарка энергии', () => {
  it('флаг выключен — ничего не вызывается (отправка и «Забрать»)', async () => {
    enabled = false;
    expect(isEnergyGiftEnabled()).toBe(false);
    expect(await sendEnergyGift('friend-uid-123')).toEqual({ ok: false, reason: 'disabled' });
    expect(await claimEnergyGift('g1')).toEqual({ ok: false, reason: 'disabled' });
    expect(calls).toHaveLength(0);
    expect(peekGiftPool(OWNER)).toBe(0);
  });

  it('отправка: уходит toUid + stableId, ответ сервера → remainingToday', async () => {
    behaviour = async () => ({ ok: true, giftId: 'gift_abc', remainingToday: 0 });
    expect(await sendEnergyGift('friend-uid-123')).toEqual({ ok: true, giftId: 'gift_abc', remainingToday: 0 });
    expect(calls[0]).toEqual({ name: 'energyGiftSend', data: { toUid: 'friend-uid-123', stableId: OWNER } });
  });

  it('отказ сервера разбирается по коду правила (HttpsError.message)', async () => {
    behaviour = async () => { throw Object.assign(new Error('not_friends_24h'), { code: 'functions/failed-precondition' }); };
    expect(await sendEnergyGift('friend-uid-123')).toEqual({ ok: false, reason: 'not_friends_24h' });
    expect(energyGiftFailureReason(Object.assign(new Error('quota_sender'), { code: 'functions/resource-exhausted' }))).toBe('quota_sender');
    expect(energyGiftFailureReason(Object.assign(new Error('x'), { code: 'functions/unavailable' }))).toBe('network');
    expect(energyGiftFailureReason(new Error('boom'))).toBe('unknown');
  });

  it('«Забрать»: копилка растёт СРАЗУ (до ответа сервера), ответ applied → подтверждено', async () => {
    let release: (v: unknown) => void = () => undefined;
    behaviour = () => new Promise((r) => { release = r; });
    const promise = claimEnergyGift('g1');
    expect(peekGiftPool(OWNER)).toBe(1); // мгновенно (синхронно после вызова), сервер ещё не ответил
    while (calls.length === 0) await new Promise((r) => setTimeout(r, 0)); // вызов дошёл до сервера, ответ ещё держим
    expect(pendingGiftIds(OWNER)).toEqual(['g1']);
    release({ ok: true, bank: 1, applied: true });
    expect(await promise).toEqual({ ok: true, applied: true, status: 'applied' });
    expect(peekGiftPool(OWNER)).toBe(1);
    expect(pendingGiftIds(OWNER)).toEqual([]); // подтверждено
  });

  it('сервер отказал (лимит получателя) — откат этого зачисления', async () => {
    behaviour = async () => { throw Object.assign(new Error('quota_receiver'), { code: 'functions/resource-exhausted' }); };
    expect(await claimEnergyGift('g1')).toEqual({ ok: false, reason: 'quota_receiver' });
    expect(peekGiftPool(OWNER)).toBe(0);
    expect(pendingGiftIds(OWNER)).toEqual([]);
  });

  it('сервер: уже забран/недействителен (applied:false) — локальное зачисление откатывается', async () => {
    behaviour = async () => ({ ok: true, bank: 0, applied: false });
    expect(await claimEnergyGift('g1')).toEqual({ ok: true, applied: false, status: 'already' });
    expect(peekGiftPool(OWNER)).toBe(0);
  });

  it('нет сети — подарок остаётся в ожидании подтверждения, повтор при запуске подтверждает его', async () => {
    behaviour = async () => { throw Object.assign(new Error('offline'), { code: 'functions/unavailable' }); };
    expect(await claimEnergyGift('g1')).toEqual({ ok: false, reason: 'network' });
    expect(peekGiftPool(OWNER)).toBe(1);
    expect(pendingGiftIds(OWNER)).toEqual(['g1']);
    behaviour = async () => ({ ok: true, bank: 1, applied: true });
    expect(await retryPendingEnergyGiftClaims()).toBe(1);
    expect(pendingGiftIds(OWNER)).toEqual([]);
    expect(peekGiftPool(OWNER)).toBe(1);
  });

  it('повтор того же giftId (двойной тап) — второй вызов не зачисляет и не ходит на сервер', async () => {
    behaviour = async () => ({ ok: true, bank: 1, applied: true });
    await claimEnergyGift('g1');
    calls.length = 0;
    expect(await claimEnergyGift('g1')).toEqual({ ok: true, applied: false, status: 'duplicate' });
    expect(calls).toHaveLength(0);
    expect(peekGiftPool(OWNER)).toBe(1);
  });

  it('копилка полна (3) — четвёртый подарок остаётся на сервере, вызова нет', async () => {
    behaviour = async () => ({ ok: true, bank: 1, applied: true });
    await claimEnergyGift('g1'); await claimEnergyGift('g2'); await claimEnergyGift('g3');
    calls.length = 0;
    expect(await claimEnergyGift('g4')).toEqual({ ok: true, applied: false, status: 'full' });
    expect(calls).toHaveLength(0);
    expect(peekGiftPool(OWNER)).toBe(3);
  });
});
