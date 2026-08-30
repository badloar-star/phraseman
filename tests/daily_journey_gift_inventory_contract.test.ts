import fs from 'fs';
import path from 'path';

import {
  createDailyJourneyGiftInventoryController,
  dailyJourneyGiftArtDescriptor,
  dailyJourneyRuneImageSource,
  type DailyJourneyGiftInventoryItem,
  type DailyJourneyGiftInventoryProjection,
} from '../app/daily_journey_gift_inventory_adapter';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8').replace(/\r\n/g, '\n');

type TestDailyItem = DailyJourneyGiftInventoryItem & Readonly<{
  revision: number;
}>;

const pendingGift = (operationId: string, revision: number): TestDailyItem => Object.freeze({
  operationId,
  revision,
});

const projection = (
  revision: number,
  pending: readonly TestDailyItem[] = revision > 0 ? [pendingGift(`gift-${revision}`, revision)] : [],
): DailyJourneyGiftInventoryProjection<TestDailyItem> => Object.freeze({ pending, latestRevision: revision });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

type TestToken = Readonly<{ owner: string; generation: number }>;
type LegacySnapshot = Readonly<{ ids: readonly string[] }>;

function makeHarness() {
  let currentToken: TestToken = Object.freeze({ owner: 'owner-a', generation: 1 });
  const loadLegacy = jest.fn<Promise<LegacySnapshot>, [TestToken]>()
    .mockResolvedValue(Object.freeze({ ids: Object.freeze([]) }));
  const loadDaily = jest.fn<Promise<DailyJourneyGiftInventoryProjection<TestDailyItem>>, [TestToken]>()
    .mockResolvedValue(projection(0));
  const displayLegacy = jest.fn<void, [LegacySnapshot]>();
  const displayDaily = jest.fn<void, [readonly TestDailyItem[]]>();
  const clearViews = jest.fn<void, []>();
  const markSnapshotSeen = jest.fn<Promise<boolean>, [number, TestToken]>().mockResolvedValue(true);
  const claimGift = jest.fn<Promise<unknown>, [string, TestToken]>().mockResolvedValue({ status: 'claimed' });
  const clearClaimView = jest.fn<void, []>();
  const setClaimBusy = jest.fn<void, [string | null]>();
  const reportError = jest.fn<void, [string, unknown]>();
  const controllerDependencies = {
    captureToken: () => currentToken,
    isTokenCurrent: (token: TestToken) => token === currentToken,
    loadLegacy,
    loadDaily,
    displayLegacy,
    displayDaily,
    clearViews,
    markSnapshotSeen,
    claimGift,
    clearClaimView,
    setClaimBusy,
    reportError,
  };
  const controller = createDailyJourneyGiftInventoryController<LegacySnapshot, TestToken, TestDailyItem>(
    controllerDependencies,
  );
  return {
    controller,
    loadLegacy,
    loadDaily,
    displayLegacy,
    displayDaily,
    clearViews,
    markSnapshotSeen,
    claimGift,
    clearClaimView,
    setClaimBusy,
    reportError,
    switchAccount: () => {
      currentToken = Object.freeze({ owner: 'owner-b', generation: currentToken.generation + 1 });
      return currentToken;
    },
  };
}

describe('Daily Journey Gifts inventory controller', () => {
  it('maps the readonly journal reward directly to committed art families without inventing a day', () => {
    const readonlyReward = Object.freeze({ kind: 'runes' as const, amount: 500 });
    expect(dailyJourneyGiftArtDescriptor(readonlyReward)).toEqual({ kind: 'rune' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'pearls', amount: 20 })).toEqual({ kind: 'level_spin', rewardId: 'pearls_20' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'energy_full', amount: 1 })).toEqual({ kind: 'level_spin', rewardId: 'energy_full' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'energy_plus', amount: 3 })).toEqual({ kind: 'level_spin', rewardId: 'energy_plus3' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'spins', amount: 2 })).toEqual({ kind: 'spin' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'freeze', amount: 1 })).toEqual({ kind: 'freeze' });
  });

  it('displays legacy gifts when the Daily Journey projection rejects', async () => {
    const h = makeHarness();
    h.loadLegacy.mockResolvedValueOnce(Object.freeze({ ids: Object.freeze(['level', 'spin']) }));
    h.loadDaily.mockRejectedValueOnce(new Error('daily-corrupt'));

    await expect(h.controller.activate()).resolves.toBeUndefined();

    expect(h.displayLegacy).toHaveBeenCalledWith({ ids: ['level', 'spin'] });
    expect(h.displayDaily).not.toHaveBeenCalled();
    expect(h.markSnapshotSeen).not.toHaveBeenCalled();
    expect(h.reportError).toHaveBeenCalledWith('daily_load', expect.objectContaining({ message: 'daily-corrupt' }));
  });

  it('settles subscription reload failures instead of leaking rejected promises', async () => {
    const h = makeHarness();
    await h.controller.activate();
    h.reportError.mockClear();
    h.loadLegacy.mockRejectedValueOnce(new Error('legacy-offline'));
    h.loadDaily.mockRejectedValueOnce(new Error('daily-offline'));

    await expect(h.controller.reloadAll()).resolves.toBeUndefined();

    expect(h.reportError).toHaveBeenCalledWith('legacy_load', expect.any(Error));
    expect(h.reportError).toHaveBeenCalledWith('daily_load', expect.any(Error));
  });

  it('carries first-open acknowledgement into the reload that supersedes a stale first snapshot', async () => {
    const h = makeHarness();
    const firstDaily = deferred<DailyJourneyGiftInventoryProjection<TestDailyItem>>();
    const secondDaily = deferred<DailyJourneyGiftInventoryProjection<TestDailyItem>>();
    h.loadDaily.mockReset()
      .mockReturnValueOnce(firstDaily.promise)
      .mockReturnValueOnce(secondDaily.promise);

    const firstLoad = h.controller.activate();
    const supersedingLoad = h.controller.reloadAll(); // level_spin_balance_changed
    firstDaily.resolve(projection(1));
    secondDaily.resolve(projection(2));
    await Promise.all([firstLoad, supersedingLoad]);

    expect(h.displayDaily).toHaveBeenCalledTimes(1);
    expect(h.displayDaily).toHaveBeenCalledWith([expect.objectContaining({ operationId: 'gift-2' })]);
    expect(h.markSnapshotSeen).toHaveBeenCalledTimes(1);
    expect(h.markSnapshotSeen).toHaveBeenCalledWith(2, expect.objectContaining({ owner: 'owner-a' }));
  });

  it('invalidates an old-account load and acknowledges only the replacement account snapshot', async () => {
    const h = makeHarness();
    const oldDaily = deferred<DailyJourneyGiftInventoryProjection<TestDailyItem>>();
    h.loadDaily.mockReset()
      .mockReturnValueOnce(oldDaily.promise)
      .mockResolvedValueOnce(projection(3));

    const oldLoad = h.controller.activate();
    h.switchAccount();
    await h.controller.resetForAccount(true);
    oldDaily.resolve(projection(1));
    await oldLoad;

    expect(h.clearViews).toHaveBeenCalledTimes(1);
    expect(h.displayDaily).toHaveBeenCalledTimes(1);
    expect(h.displayDaily).toHaveBeenCalledWith([expect.objectContaining({ operationId: 'gift-3' })]);
    expect(h.markSnapshotSeen).toHaveBeenCalledTimes(1);
    expect(h.markSnapshotSeen).toHaveBeenCalledWith(3, expect.objectContaining({ owner: 'owner-b' }));
  });

  it('deduplicates concurrent claim presses and allows a failed claim to retry', async () => {
    const h = makeHarness();
    await h.controller.activate();
    const item = pendingGift('claim-retry', 1);
    const failedClaim = deferred<unknown>();
    h.claimGift.mockReset().mockReturnValueOnce(failedClaim.promise);

    const first = h.controller.claim(item);
    const duplicate = h.controller.claim(item);
    failedClaim.reject(new Error('effect-failed'));
    await expect(first).resolves.toBe('failed');
    await expect(duplicate).resolves.toBe('ignored');
    expect(h.claimGift).toHaveBeenCalledTimes(1);

    h.claimGift.mockResolvedValueOnce({ status: 'claimed' });
    await expect(h.controller.claim(item)).resolves.toBe('claimed');
    expect(h.claimGift).toHaveBeenCalledTimes(2);
    expect(h.clearClaimView).toHaveBeenCalledTimes(2);
    expect(h.loadLegacy).toHaveBeenCalledTimes(2);
    expect(h.loadDaily).toHaveBeenCalledTimes(2);
  });

  it('clears claim UI on deactivate and ignores a resolving stale claim before clean reactivation', async () => {
    const h = makeHarness();
    await h.controller.activate();
    expect(h.clearClaimView).toHaveBeenCalledTimes(1);
    const pendingClaim = deferred<unknown>();
    h.claimGift.mockReset().mockReturnValueOnce(pendingClaim.promise);
    const claim = h.controller.claim(pendingGift('blur-resolve', 1));

    h.controller.deactivate();

    expect(h.controller.isClaimBusy('blur-resolve')).toBe(false);
    expect(h.clearClaimView).toHaveBeenCalledTimes(2);
    const uiWritesAtDeactivate = h.setClaimBusy.mock.calls.length + h.clearClaimView.mock.calls.length;
    pendingClaim.resolve({ status: 'claimed' });
    await expect(claim).resolves.toBe('ignored');
    expect(h.setClaimBusy.mock.calls.length + h.clearClaimView.mock.calls.length).toBe(uiWritesAtDeactivate);

    await h.controller.activate();
    expect(h.clearClaimView).toHaveBeenCalledTimes(3);
    expect(h.loadLegacy).toHaveBeenCalledTimes(2);
    expect(h.loadDaily).toHaveBeenCalledTimes(2);
  });

  it('clears claim UI on deactivate and ignores a rejecting stale claim without reporting or writing UI', async () => {
    const h = makeHarness();
    await h.controller.activate();
    expect(h.clearClaimView).toHaveBeenCalledTimes(1);
    const pendingClaim = deferred<unknown>();
    h.claimGift.mockReset().mockReturnValueOnce(pendingClaim.promise);
    const claim = h.controller.claim(pendingGift('blur-reject', 1));

    h.controller.deactivate();
    const uiWritesAtDeactivate = h.setClaimBusy.mock.calls.length + h.clearClaimView.mock.calls.length;
    pendingClaim.reject(new Error('late-rejection'));

    await expect(claim).resolves.toBe('ignored');
    expect(h.clearClaimView).toHaveBeenCalledTimes(2);
    expect(h.setClaimBusy.mock.calls.length + h.clearClaimView.mock.calls.length).toBe(uiWritesAtDeactivate);
    expect(h.reportError).not.toHaveBeenCalledWith('daily_claim', expect.anything());

    await h.controller.activate();
    expect(h.clearClaimView).toHaveBeenCalledTimes(3);
  });
});

describe('Daily Journey projection in the Gifts inventory', () => {
  const source = readSource('app/level_gifts_inventory.tsx');

  it('keeps Daily Journey pending occurrences separate from level and spin items', () => {
    expect(source).toContain('useState<readonly DailyJourneyGiftPendingItem[]>([])');
    expect(source).toContain('loadPendingLevelGiftInventory(studyTarget)');
    expect(source).toContain('readDailyJourneyGiftProjection(accountToken)');
    expect(source).toContain('function dailyJourneyGiftItemKey(item: DailyJourneyGiftPendingItem): string');
    expect(source).toContain('return item.operationId;');
  });

  it('renders committed square art without depending on preview-only modules or mini copy', () => {
    expect(source).not.toContain('DailyJourneyRevealScene');
    expect(source).not.toContain('dailyJourneyRewardPreviewModel');
    expect(source).not.toContain('RuneGlyph');
    expect(source).toContain('source={dailyJourneyRuneImageSource()}');
    expect(source).toContain('testID={`daily-journey-gift-${item.operationId}`}');
    expect(source).toContain('key={dailyJourneyGiftItemKey(item)}');
    expect(source).toContain('size={size * 0.78}');
    expect(source).toContain('accessibilityLabel={dailyJourneyGiftA11yLabel(item, lang)}');
    const tileStart = source.indexOf('const DailyJourneyGiftTile');
    const tileEnd = source.indexOf('export default function LevelGiftsInventoryScreen');
    const tileSource = source.slice(tileStart, tileEnd);
    expect(tileSource).not.toMatch(/item\.level|level:/);
    expect(tileSource).not.toContain('GiftExpiryCountdown');
    expect(tileSource).not.toContain('<Text');
  });

  it('resolves the approved committed rune raster through a static asset require', () => {
    expect(dailyJourneyRuneImageSource()).toBe('test-file-stub');
    const adapterSource = readSource('app/daily_journey_gift_inventory_adapter.ts');
    expect(adapterSource).toContain("require('../assets/images/level-spin-rewards/stars_10.webp')");
    expect(source).toContain('size={size * 0.78}');
    const artStart = source.indexOf('const DailyJourneyGiftArt');
    const artEnd = source.indexOf('const DailyJourneyGiftTile');
    const artSource = source.slice(artStart, artEnd);
    expect(artSource).toContain('style={{ width: size, height: size }}');
    expect(artSource).not.toContain('size={size * 0.82}');
  });

  it('wires lifecycle and event reloads through the settling controller', () => {
    expect(source).toContain('claimGift: claimDailyJourneyGift');
    expect(source).toContain('clearClaimView: () => {');
    expect(source).toContain("onAppEvent('daily_journey_gifts_changed'");
    expect(source).toContain('void inventoryController.reloadDaily();');
    expect(source).toContain('void inventoryController.reloadAll();');
    expect(source).toContain('void inventoryController.resetForAccount(');
    expect(source).toContain('void inventoryController.activate();');
    expect(source).toContain('inventoryController.deactivate();');
    expect(source).toContain('accountGenerationSubscription.remove();');
    expect(source.indexOf('inventoryController.deactivate();'))
      .toBeLessThan(source.indexOf('accountGenerationSubscription.remove();'));
  });
});
