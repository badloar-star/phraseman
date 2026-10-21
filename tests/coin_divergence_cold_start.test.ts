import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  enqueueLevelSpinStarGrant,
  levelSpinStarGrantOutboxKey,
  levelSpinStarProjectionKey,
  mergeLevelSpinServerStars,
  peekStoredLevelSpinStarsForBoot,
  readUnifiedLevelSpinStars,
  recoverAndHydrateLevelSpinStarGrants,
  syncPendingLevelSpinStarGrants,
  acknowledgePracticeRuneGrantLocally,
  applyCoinReconcileReceiptV1,
  commitPracticeRuneGrantLocally,
  readCoinReconcileV1Need,
} from '../app/level_spin_star_grants';

// зачем (владелец 01.10, [COIN-DIVERGENCE]): на холодном старте progress.stars
// публиковался 0 при едином кошельке 9830. Каждый тест — один путь, которым
// publishProjection может опустить видимый баланс. Падение теста = путь
// воспроизводит потерю монет на текущем коде.

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));

const OWNER = 'account-a';
const storage: Record<string, string> = {};
// null = секция progress снимка ещё не поднята (холодный старт до primeAppSnapshotFromStorage).
let progress: { stars: number; starsEarnedTotal: number } | null;
const published: number[] = [];

function bridge() {
  return jest.requireMock('../app/phone_state_economy_bridge') as {
    commitPhoneStateNonMonetaryEconomyGrant: jest.Mock;
    readPhoneStateStarCreditState: jest.Mock;
  };
}

function transport(): jest.Mock {
  return (jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelSpinStarComposite: jest.Mock;
  }).callLevelSpinStarComposite;
}

function storeProjection(serverBalance: number, serverSeq: number): void {
  storage[levelSpinStarProjectionKey(OWNER)] = JSON.stringify({
    schemaVersion: 'client-level-spin-star-projection.v3', ownerStableId: OWNER,
    operations: [], acknowledged: {}, serverBalance, serverEarnedTotal: serverBalance, serverSeq,
  });
}

function storedProjection(): { serverBalance: number; serverSeq: number } {
  return JSON.parse(storage[levelSpinStarProjectionKey(OWNER)]) as { serverBalance: number; serverSeq: number };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  published.length = 0;
  progress = null;
  beginAccountGeneration(OWNER);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => { delete storage[key]; });
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => (
    keys.map((key) => [key, storage[key] ?? null])
  ));
  bridge().readPhoneStateStarCreditState.mockResolvedValue({ credits: [], acknowledgements: [] });
  bridge().commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(true);
  const snapshot = jest.requireMock('../app/app_snapshot_store') as {
    getAppSnapshot: jest.Mock; patchAppSnapshot: jest.Mock;
  };
  snapshot.getAppSnapshot.mockImplementation(() => ({ progress: progress ? { ...progress } : undefined }));
  snapshot.patchAppSnapshot.mockImplementation((updater: (current: unknown) => { progress?: { stars: number } }) => {
    const patch = updater({ progress: progress ? { ...progress } : undefined });
    if (patch.progress && progress) {
      progress = { ...progress, ...patch.progress };
      published.push(progress.stars);
    }
  });
});

describe('control: ordinary cold start keeps the balance', () => {
  test('stored projection 9830, snapshot raised from the same projection', async () => {
    storeProjection(9830, 0);
    const peek = await peekStoredLevelSpinStarsForBoot(captureAccountGeneration());
    progress = { stars: peek?.balance ?? 0, starsEarnedTotal: 0 };
    await recoverAndHydrateLevelSpinStarGrants(captureAccountGeneration(), { syncNow: false });
    expect(progress.stars).toBe(9830);
  });

  test('stored projection 9830, recovery runs before the snapshot section exists', async () => {
    storeProjection(9830, 0);
    await recoverAndHydrateLevelSpinStarGrants(captureAccountGeneration(), { syncNow: false });
    progress = { stars: 9830, starsEarnedTotal: 0 };
    expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(9830);
  });
});

describe('hypothesis (a): recovery observes no progress section, publish lands after it appears', () => {
  test.each([
    ['projection with serverBalance 0', () => storeProjection(0, 0)],
    ['projection key absent', () => undefined],
  ])('%s does not overwrite a visible 9830 with 0', async (_label, arrange) => {
    arrange();
    // Снимок поднимается РОВНО между observe (внутри recoverProjection) и
    // publishProjection: первая запись восстановления на диск — уже после observe.
    // зачем (К1, 05.10): восстановление больше не перезаписывает проекцию, если она байт-в-байт та же (здесь —
    // нулевая проекция), но outbox в том же окне пишется. Окно «между observe и publish» то же — триггер теста
    // смотрит на запись проекции ИЛИ outbox.
    (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => { storage[key] = value; });
      if (pairs.some(([key]) => key === levelSpinStarProjectionKey(OWNER) || key === levelSpinStarGrantOutboxKey(OWNER))
        && !progress) {
        progress = { stars: 9830, starsEarnedTotal: 0 };
      }
    });
    await recoverAndHydrateLevelSpinStarGrants(captureAccountGeneration(), { syncNow: false });
    expect(progress?.stars).toBe(9830);
    expect(published).not.toContain(0);
    // Поднятое значение записано на диск: следующий холодный старт не прочитает 0.
    expect(storedProjection().serverBalance).toBe(9830);
  });

  test('a real local spend at serverSeq 0 still lowers the balance (no re-observe)', async () => {
    storeProjection(500, 0);
    progress = { stars: 500, starsEarnedTotal: 0 };
    const { prepareRuneSpend, publishRuneSpend } = await import('../app/level_spin_star_grants');
    const token = captureAccountGeneration();
    const prepared = await prepareRuneSpend({
      token, operationId: 'spend_test_000000001', kind: 'dialog_hint', subjectId: 'hint-1', price: 300,
    });
    if (!prepared.ok) throw new Error('spend_not_prepared');
    await AsyncStorage.multiSet(prepared.durableWrites.map(([k, v]) => [k, v] as [string, string]));
    publishRuneSpend(token, prepared);
    expect(progress?.stars).toBe(200);
    await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
    expect(progress?.stars).toBe(200);
  });
});


// Q-COIN (a), координатор 01.10: при неподтверждённой локальной базе (serverSeq 0)
// первая квитанция сервера с более новым starsSeq берёт БОЛЬШЕЕ из (сервер,
// локальная база) — во всех путях. Разница «только на телефоне» держится
// отдельным полем и не теряется на следующих квитанциях (seq > 0).
function practiceOperation(amount = 9) {
  const { createHash } = jest.requireActual('crypto') as typeof import('crypto');
  const operation = {
    schemaVersion: 'client-practice-rune-operation.v1' as const,
    operationId: 'practice_rune:flashcards_blitz_attempt1_1',
    ownerStableId: OWNER,
    activity: 'flashcards_blitz' as const,
    sessionKey: 'attempt1',
    completionOrdinal: 1,
    amount,
    reason: 'practice_session_reward' as const,
    createdAtMs: 1_800_000_000_000,
  };
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1, ownerStableId: operation.ownerStableId, activity: operation.activity,
    sessionKey: operation.sessionKey, completionOrdinal: operation.completionOrdinal,
    amount: operation.amount, reason: operation.reason, createdAtMs: operation.createdAtMs,
  })).digest('hex');
  return Object.freeze({ ...operation, requestFingerprint });
}

function ackTransport(balance: number, seq: number): void {
  transport().mockImplementation(async (operation: { operationId: string; requestFingerprint: string }) => ({
    materialized: true, operationId: operation.operationId, requestFingerprint: operation.requestFingerprint,
    replayed: false, starsBalance: balance, starsEarnedTotal: balance, starsSeq: seq,
  }));
}

describe('Q-COIN (a): first server observation keeps the larger of server and unconfirmed local basis', () => {
  test('merge of a server snapshot {stars:0, seq:1} over local-only 9830', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    await mergeLevelSpinServerStars(captureAccountGeneration(), { stars: 0, starsEarnedTotal: 0, starsSeq: 1 });
    expect(progress.stars).toBe(9830);
    expect(storedProjection()).toMatchObject({ serverBalance: 0, serverSeq: 1, unconfirmedLocalLift: 9830 });
  });

  test('sync ack of a new coin grant over local-only 9830', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    const token = captureAccountGeneration();
    await enqueueLevelSpinStarGrant({ token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_10' }, { syncNow: false });
    expect(progress.stars).toBe(9840);
    ackTransport(10, 1);
    await syncPendingLevelSpinStarGrants(token);
    expect(JSON.parse(storage[levelSpinStarGrantOutboxKey(OWNER)])).toEqual([]);
    expect(progress.stars).toBe(9840);
    expect(storedProjection().serverSeq).toBe(1);
  });

  test('the difference survives the SECOND ack (seq 1 -> 2): no loss on the next grant', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    const token = captureAccountGeneration();
    await enqueueLevelSpinStarGrant({ token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_10' }, { syncNow: false });
    ackTransport(10, 1);
    await syncPendingLevelSpinStarGrants(token);
    await enqueueLevelSpinStarGrant({ token, requestId: 'request0000000002', lane: 'base', giftId: 'stars_20' }, { syncNow: false });
    expect(progress.stars).toBe(9860);
    ackTransport(30, 2);
    await syncPendingLevelSpinStarGrants(token);
    expect(progress.stars).toBe(9860);
    expect((await readUnifiedLevelSpinStars(token)).balance).toBe(9860);
    expect((await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false })).balance).toBe(9860);
  });

  test('server above the local basis wins (no artificial lift)', async () => {
    storeProjection(100, 0);
    progress = { stars: 100, starsEarnedTotal: 0 };
    await mergeLevelSpinServerStars(captureAccountGeneration(), { stars: 500, starsEarnedTotal: 0, starsSeq: 3 });
    expect(progress.stars).toBe(500);
    expect(storedProjection()).not.toHaveProperty('unconfirmedLocalLift');
  });

  test('a server prize in the same response is not swallowed by max (serverCreditedDelta)', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    await mergeLevelSpinServerStars(captureAccountGeneration(), {
      stars: 500, starsEarnedTotal: 0, starsSeq: 1, serverCreditedDelta: 500,
    });
    expect(progress.stars).toBe(10_330);
  });

  test('confirmed basis (serverSeq > 0): server lowering is still legitimate, late response ignored', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    const token = captureAccountGeneration();
    await mergeLevelSpinServerStars(token, { stars: 1000, starsEarnedTotal: 0, starsSeq: 1 });
    expect(progress.stars).toBe(9830);
    await mergeLevelSpinServerStars(token, { stars: 700, starsEarnedTotal: 0, starsSeq: 2 });
    expect(progress.stars).toBe(9530);
    await mergeLevelSpinServerStars(token, { stars: 5, starsEarnedTotal: 0, starsSeq: 1 });
    expect(progress.stars).toBe(9530);
    await mergeLevelSpinServerStars(token, { stars: 700, starsEarnedTotal: 0, starsSeq: 2 });
    expect(progress.stars).toBe(9530);
  });

  test('a local spend after the lift lowers the balance as before', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    const token = captureAccountGeneration();
    await mergeLevelSpinServerStars(token, { stars: 0, starsEarnedTotal: 0, starsSeq: 1 });
    const { prepareRuneSpend, publishRuneSpend } = await import('../app/level_spin_star_grants');
    const prepared = await prepareRuneSpend({
      token, operationId: 'spend_test_000000002', kind: 'dialog_hint', subjectId: 'hint-2', price: 300,
    });
    if (!prepared.ok) throw new Error('spend_not_prepared');
    await AsyncStorage.multiSet(prepared.durableWrites.map(([k, v]) => [k, v] as [string, string]));
    publishRuneSpend(token, prepared);
    expect(progress.stars).toBe(9530);
    expect((await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false })).balance).toBe(9530);
  });

  test('PhoneState receipt in recoverProjection keeps the larger basis', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    const token = captureAccountGeneration();
    await enqueueLevelSpinStarGrant({ token, requestId: 'request0000000003', lane: 'base', giftId: 'stars_50' }, { syncNow: false });
    expect(progress.stars).toBe(9880);
    const [operation] = JSON.parse(storage[levelSpinStarGrantOutboxKey(OWNER)]) as {
      operationId: string; requestFingerprint: string;
    }[];
    bridge().readPhoneStateStarCreditState.mockResolvedValue({
      credits: [operation],
      acknowledgements: [{
        schemaVersion: 'client-level-spin-star-ack.v1', operationId: operation.operationId, ownerStableId: OWNER,
        requestFingerprint: operation.requestFingerprint, starsBalance: 50, starsEarnedTotal: 50, starsSeq: 1,
      }],
    });
    expect((await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false })).balance).toBe(9880);
    expect(progress.stars).toBe(9880);
    expect(storedProjection()).toMatchObject({ serverBalance: 50, serverSeq: 1, unconfirmedLocalLift: 9830 });
    expect((await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false })).balance).toBe(9880);
  });

  test('practice ack keeps the larger basis and the lift survives a later sync ack', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    const token = captureAccountGeneration();
    const operation = practiceOperation(9);
    await commitPracticeRuneGrantLocally(token, operation);
    expect(progress.stars).toBe(9839);
    await acknowledgePracticeRuneGrantLocally(token, operation, {
      materialized: true, operationId: operation.operationId, requestFingerprint: operation.requestFingerprint,
      replayed: false, starsBalance: 9, starsEarnedTotal: 9, starsSeq: 1,
    });
    expect(progress.stars).toBe(9839);
    await enqueueLevelSpinStarGrant({ token, requestId: 'request0000000004', lane: 'base', giftId: 'stars_10' }, { syncNow: false });
    ackTransport(19, 2);
    await syncPendingLevelSpinStarGrants(token);
    expect(progress.stars).toBe(9849);
  });
});

// зачем (владелец 21.10, №1 «монеты 0 после смены аккаунта», решение «сервер — главный»): A2 — пустая проекция не
// занимает ключ (иначе долив аварийной копии её пропускал); A1 — серверный кошелёк users/{uid}.stars вливается
// только более новым seq и не трогает базу при неподтверждённых начислениях.
describe('A1/A2 (21.10): server wallet adoption and the empty projection', () => {
  test('A2: reading coins with no projection on disk does not write an empty projection', async () => {
    progress = { stars: 0, starsEarnedTotal: 0 };
    expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(0);
    await recoverAndHydrateLevelSpinStarGrants(captureAccountGeneration(), { syncNow: false });
    expect(storage[levelSpinStarProjectionKey(OWNER)]).toBeUndefined();
  });

  test('A2 control: a projection that already exists on disk is still rewritten as before', async () => {
    storeProjection(0, 0);
    progress = { stars: 0, starsEarnedTotal: 0 };
    await recoverAndHydrateLevelSpinStarGrants(captureAccountGeneration(), { syncNow: false });
    expect(storage[levelSpinStarProjectionKey(OWNER)]).toBeDefined();
  });

  test('A1: server wallet over an absent projection becomes the visible balance', async () => {
    progress = { stars: 0, starsEarnedTotal: 0 };
    const { adoptServerWalletFromUserDoc } = await import('../app/level_spin_star_grants');
    const token = captureAccountGeneration();
    expect(await adoptServerWalletFromUserDoc(token, { balance: 900, earnedTotal: 1200, seq: 7 }, 'test')).toBe('merged');
    expect(progress.stars).toBe(900);
    expect(storedProjection()).toMatchObject({ serverBalance: 900, serverSeq: 7 });
    // более старый seq ничего не меняет (поздний ответ, другое устройство)
    expect(await adoptServerWalletFromUserDoc(token, { balance: 100, earnedTotal: 100, seq: 5 }, 'test')).toBe('merged');
    expect(progress.stars).toBe(900);
    expect((await readUnifiedLevelSpinStars(token)).balance).toBe(900);
  });

  test('A1: an unacknowledged local practice credit keeps the local base (no double count)', async () => {
    storeProjection(100, 1);
    progress = { stars: 100, starsEarnedTotal: 100 };
    const { adoptServerWalletFromUserDoc } = await import('../app/level_spin_star_grants');
    const token = captureAccountGeneration();
    await commitPracticeRuneGrantLocally(token, practiceOperation(9));
    expect(progress.stars).toBe(109);
    // сервер мог уже учесть это начисление — снимок не может это доказать, база остаётся локальной
    await adoptServerWalletFromUserDoc(token, { balance: 5000, earnedTotal: 5000, seq: 9 }, 'test');
    expect(storedProjection()).toMatchObject({ serverBalance: 100, serverSeq: 1 });
    expect(progress.stars).toBe(109);
  });

  test('A1: missing or broken stars field changes nothing', async () => {
    storeProjection(300, 2);
    progress = { stars: 300, starsEarnedTotal: 300 };
    const { adoptServerWalletFromUserDoc } = await import('../app/level_spin_star_grants');
    const token = captureAccountGeneration();
    expect(await adoptServerWalletFromUserDoc(token, undefined, 'test')).toBe('skip_no_stars_field');
    expect(await adoptServerWalletFromUserDoc(token, { balance: 'x', seq: 3 }, 'test')).toBe('skip_invalid_stars');
    expect(await adoptServerWalletFromUserDoc(token, { balance: -5, seq: 3 }, 'test')).toBe('skip_invalid_stars');
    expect(storedProjection()).toMatchObject({ serverBalance: 300, serverSeq: 2 });
    expect(progress.stars).toBe(300);
  });
});

describe('Q-COIN (b): reconcile receipt is applied once and never doubles coins', () => {
  test('lift absorbed by the server raise: visible unchanged, lift reduced, replay is a no-op', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    const token = captureAccountGeneration();
    await mergeLevelSpinServerStars(token, { stars: 0, starsEarnedTotal: 0, starsSeq: 1 });
    expect(await readCoinReconcileV1Need(token)).toMatchObject({ needed: true, lift: 9830 });
    const receipt = {
      raisedBy: 2000, operationIds: ['level_spin:requestOld000000001.base'],
      starsBalance: 2000, starsEarnedTotal: 0, starsSeq: 2,
    };
    expect((await applyCoinReconcileReceiptV1(token, receipt)).balance).toBe(9830);
    expect(storedProjection()).toMatchObject({
      serverBalance: 2000, serverSeq: 2, unconfirmedLocalLift: 7830, coinReconcileV1Applied: true,
    });
    expect(await applyCoinReconcileReceiptV1(token, receipt)).toMatchObject({ balance: 9830, applied: false });
    expect(await readCoinReconcileV1Need(token)).toMatchObject({ needed: false, applied: true });
  });

  test('server raise above the lift restores the missing coins', async () => {
    storeProjection(100, 0);
    progress = { stars: 100, starsEarnedTotal: 0 };
    const token = captureAccountGeneration();
    await mergeLevelSpinServerStars(token, { stars: 0, starsEarnedTotal: 0, starsSeq: 1 });
    expect((await applyCoinReconcileReceiptV1(token, {
      raisedBy: 1000, operationIds: ['level_spin:requestOld000000002.base'],
      starsBalance: 1000, starsEarnedTotal: 0, starsSeq: 2,
    })).balance).toBe(1000);
  });

  test('a stuck local spin credit covered by the reconcile is acknowledged, not doubled', async () => {
    storeProjection(0, 1);
    progress = { stars: 0, starsEarnedTotal: 0 };
    const token = captureAccountGeneration();
    await enqueueLevelSpinStarGrant({ token, requestId: 'request0000000005', lane: 'base', giftId: 'stars_250' }, { syncNow: false });
    expect(progress.stars).toBe(250);
    expect(await readCoinReconcileV1Need(token)).toMatchObject({ needed: true, unackedSpinCredits: 1 });
    expect((await applyCoinReconcileReceiptV1(token, {
      raisedBy: 250, operationIds: ['level_spin:request0000000005.base'],
      starsBalance: 250, starsEarnedTotal: 0, starsSeq: 2,
    })).balance).toBe(250);
    expect(JSON.parse(storage[levelSpinStarGrantOutboxKey(OWNER)])).toEqual([]);
    expect(bridge().commitPhoneStateNonMonetaryEconomyGrant).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'star_credit_ack', entitlementId: 'level_spin:request0000000005.base',
    }));
    expect((await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false })).balance).toBe(250);
  });
});
