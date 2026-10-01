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
    // publishProjection: первая запись проекции на диск — уже после observe.
    (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => { storage[key] = value; });
      if (pairs.some(([key]) => key === levelSpinStarProjectionKey(OWNER)) && !progress) {
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

// (d) ВОСПРОИЗВОДИТСЯ, но НЕ чинится здесь: это осознанная серверная авторитетность
// (новее starsSeq — истина, см. level_spin_star_grants.test.ts «exact materialization»).
// Если серверный кошелёк users/{uid}.stars отстаёт от локальной базы (монеты жили
// только на телефоне), первая же квитанция сервера опускает баланс до серверного.
// Нужна сверка серверного кошелька с локальной базой — вопрос координатору.
// Включить тесты, когда решение принято.
describe.skip('hypothesis (d): first server observation replaces an unconfirmed local basis (serverSeq 0)', () => {
  test('merge of a server snapshot {stars:0, seq:1} over local-only 9830', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    await mergeLevelSpinServerStars(captureAccountGeneration(), { stars: 0, starsEarnedTotal: 0, starsSeq: 1 });
    expect(progress.stars).toBe(9830);
  });

  test('sync ack of a new coin grant over local-only 9830', async () => {
    storeProjection(9830, 0);
    progress = { stars: 9830, starsEarnedTotal: 0 };
    const token = captureAccountGeneration();
    await enqueueLevelSpinStarGrant({ token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_10' }, { syncNow: false });
    expect(progress.stars).toBe(9840);
    transport().mockImplementation(async (operation: { operationId: string; requestFingerprint: string }) => ({
      materialized: true, operationId: operation.operationId, requestFingerprint: operation.requestFingerprint,
      replayed: false, starsBalance: 10, starsEarnedTotal: 10, starsSeq: 1,
    }));
    await syncPendingLevelSpinStarGrants(token);
    expect(JSON.parse(storage[levelSpinStarGrantOutboxKey(OWNER)])).toEqual([]);
    expect(progress.stars).toBe(9840);
    expect(storedProjection().serverSeq).toBe(1);
  });
});
