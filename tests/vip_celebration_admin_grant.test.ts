import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  consumeVipCelebration,
  getPendingVipCelebrationMarker,
  isVipCelebrationPending,
  markVipCelebrationPending,
  markVipGrantSeenWithoutCelebration,
  processVipGrantForCelebration,
} from '../app/vip_celebration_state';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('vip_celebration_state', () => {
  it('shows a pending VIP celebration for a new admin VIP grant', async () => {
    await processVipGrantForCelebration('1736000000000');
    await expect(isVipCelebrationPending()).resolves.toBe(true);
    await expect(getPendingVipCelebrationMarker()).resolves.toBe('1736000000000');
  });

  it('does not show the same VIP grant twice after consumption', async () => {
    await markVipCelebrationPending('1736000000000');
    await consumeVipCelebration('1736000000000');
    await processVipGrantForCelebration('1736000000000');
    await expect(isVipCelebrationPending()).resolves.toBe(false);
  });

  // зачем: владелец (2026-07-26) — продление подарком при активном доступе
  // гасится БЕЗ модалки, и этот же маркер не имеет права всплыть позже
  // (restore/повторный слушатель). Празднуем только переход фри → доступ.
  it('silently retires an extension grant so it can never arm later', async () => {
    await markVipGrantSeenWithoutCelebration('1736000000000');
    await processVipGrantForCelebration('1736000000000');
    await expect(isVipCelebrationPending()).resolves.toBe(false);
    // Более старый grant тоже задедаплен по seenMs >= grantMs.
    await processVipGrantForCelebration('1735000000000');
    await expect(isVipCelebrationPending()).resolves.toBe(false);
  });

  it('retiring an extension also clears an already-armed pending for the same grant', async () => {
    await processVipGrantForCelebration('1736000000000');
    await expect(isVipCelebrationPending()).resolves.toBe(true);
    await markVipGrantSeenWithoutCelebration('1736000000000');
    await expect(isVipCelebrationPending()).resolves.toBe(false);
    await processVipGrantForCelebration('1736000000000');
    await expect(isVipCelebrationPending()).resolves.toBe(false);
  });

  it('never downgrades a newer seen marker', async () => {
    await markVipGrantSeenWithoutCelebration('1736000000000');
    await markVipGrantSeenWithoutCelebration('1735000000000');
    await processVipGrantForCelebration('1736000000001');
    await expect(isVipCelebrationPending()).resolves.toBe(true);
  });
});

// зачем: владелец (2026-07-26) — баг «Plus активирован при КАЖДОМ входе»:
// на первом снапшоте запуска in-memory ref = null и RevenueCat не гидрирован,
// из-за чего «доступа не было» выглядело ложно. Контракт: прошлое состояние
// читается из ПЕРСИСТЕНТНЫХ свидетельств СТРОГО ДО перезаписи снапшота, и
// только переход фри → доступ взводит празднование.
describe('premium context celebrates only the free → access transition', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '..', 'components', 'PremiumContext.tsx'),
    'utf8',
  );

  it('reads persisted access evidence before overwriting the vip snapshot', () => {
    const evidenceAt = source.indexOf('readVipSnapshotForAccount(listenerStableId)');
    const premiumKeyAt = source.indexOf("AsyncStorage.getItem('premium_active')");
    const lifetimeAt = source.indexOf("persistedPlan === 'lifetime'");
    const writeAt = source.indexOf('await writeVipSnapshotForAccount(listenerStableId');

    expect(evidenceAt).toBeGreaterThan(-1);
    expect(premiumKeyAt).toBeGreaterThan(-1);
    expect(lifetimeAt).toBeGreaterThan(-1);
    expect(writeAt).toBeGreaterThan(evidenceAt);
  });

  it('arms the celebration only without prior access and retires extensions otherwise', () => {
    const gateAt = source.indexOf('if (hadAccessBeforeGrant) {');
    const retireAt = source.indexOf('markVipGrantSeenWithoutCelebration(vipState.grantAt)');
    const armAt = source.indexOf('processVipGrantForCelebration(vipState.grantAt)');

    expect(gateAt).toBeGreaterThan(-1);
    expect(retireAt).toBeGreaterThan(gateAt);
    expect(armAt).toBeGreaterThan(retireAt);
  });
});
