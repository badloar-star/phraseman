import fs from 'fs';
import path from 'path';
import * as dailyJourneyGiftInventoryAdapter from '../app/daily_journey_gift_inventory_adapter';

import {
  createDailyJourneyGiftInventoryController,
  dailyJourneyGiftArtDescriptor,
  type DailyJourneyGiftInventoryItem,
  type DailyJourneyGiftInventoryProjection,
} from '../app/daily_journey_gift_inventory_adapter';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8').replace(/\r\n/g, '\n');

type TestDailyItem = DailyJourneyGiftInventoryItem & Readonly<{
  revision: number;
}>;

const maybeDailyJourneyGiftVisualItems = (dailyJourneyGiftInventoryAdapter as unknown as Readonly<{
  dailyJourneyGiftVisualItems?: <Item extends TestDailyItem>(projection: Readonly<{
    pending: readonly Item[];
    seenRevision: number;
  }>) => readonly (Item & Readonly<{ isUnseen: boolean }>)[];
}>).dailyJourneyGiftVisualItems;

const maybePreserveDailyJourneyGiftSessionHighlights = (
  dailyJourneyGiftInventoryAdapter as unknown as Readonly<{
    preserveDailyJourneyGiftSessionHighlights?: <Item extends TestDailyItem & Readonly<{ isUnseen: boolean }>>(
      items: readonly Item[],
      highlightedOperationIds: Set<string>,
    ) => readonly Item[];
  }>
).preserveDailyJourneyGiftSessionHighlights;

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
  const recordSnapshotDisplayed = jest.fn<Promise<boolean>, [number, TestToken]>().mockResolvedValue(true);
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
    recordSnapshotDisplayed,
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
    recordSnapshotDisplayed,
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
    expect(dailyJourneyGiftArtDescriptor(readonlyReward)).toEqual({ kind: 'level_spin', rewardId: 'stars_500' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'runes', amount: 100 })).toEqual({ kind: 'level_spin', rewardId: 'stars_100' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'runes', amount: 200 })).toEqual({ kind: 'level_spin', rewardId: 'stars_250' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'runes', amount: 750 })).toEqual({ kind: 'level_spin', rewardId: 'stars_500' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'runes', amount: 1000 })).toEqual({ kind: 'level_spin', rewardId: 'stars_1000' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'pearls', amount: 20 })).toEqual({ kind: 'level_spin', rewardId: 'pearls_20' });
    expect(dailyJourneyGiftArtDescriptor({ kind: 'pearls', amount: 150 })).toEqual({ kind: 'level_spin', rewardId: 'pearls_100' });
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
    expect(h.markSnapshotSeen).not.toHaveBeenCalled();
    await h.controller.acknowledgeDisplayedSnapshot();
    expect(h.recordSnapshotDisplayed).toHaveBeenCalledWith(2, expect.objectContaining({ owner: 'owner-a' }));
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
    expect(h.markSnapshotSeen).not.toHaveBeenCalled();
    await h.controller.acknowledgeDisplayedSnapshot();
    expect(h.recordSnapshotDisplayed).toHaveBeenCalledWith(3, expect.objectContaining({ owner: 'owner-b' }));
    expect(h.markSnapshotSeen).toHaveBeenCalledTimes(1);
    expect(h.markSnapshotSeen).toHaveBeenCalledWith(3, expect.objectContaining({ owner: 'owner-b' }));
  });

  it('does not consume unread state when the inventory unmounts before React commits the snapshot', async () => {
    const h = makeHarness();
    h.loadDaily.mockResolvedValueOnce(projection(1));
    await h.controller.activate();
    h.controller.deactivate();
    expect(h.recordSnapshotDisplayed).not.toHaveBeenCalled();
    expect(h.markSnapshotSeen).not.toHaveBeenCalled();
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

  it('derives unseen presentation from the captured durable seen revision without mutating journal items', () => {
    expect(typeof maybeDailyJourneyGiftVisualItems).toBe('function');
    if (!maybeDailyJourneyGiftVisualItems) return;
    const pending = Object.freeze([
      pendingGift('gift-seen-old', 1),
      pendingGift('gift-seen-head', 2),
      pendingGift('gift-unseen-new', 3),
      pendingGift('gift-unseen-newest', 4),
    ]);

    const visual = maybeDailyJourneyGiftVisualItems({ pending, seenRevision: 2 });

    expect(visual.map((item) => [item.operationId, item.isUnseen])).toEqual([
      ['gift-unseen-newest', true],
      ['gift-unseen-new', true],
      ['gift-seen-head', false],
      ['gift-seen-old', false],
    ]);
    expect(visual).not.toBe(pending);
    expect(visual.every(Object.isFrozen)).toBe(true);
    expect(pending[2]).not.toHaveProperty('isUnseen');
  });

  it('keeps fresh tint through reloads in one visit and clears it for the next visit', () => {
    expect(typeof maybePreserveDailyJourneyGiftSessionHighlights).toBe('function');
    if (!maybePreserveDailyJourneyGiftSessionHighlights) return;
    const visitHighlights = new Set<string>();
    const firstLoad = maybePreserveDailyJourneyGiftSessionHighlights([
      Object.freeze({ ...pendingGift('fresh-gift', 7), isUnseen: true }),
      Object.freeze({ ...pendingGift('old-gift', 3), isUnseen: false }),
    ], visitHighlights);
    const sameVisitReload = maybePreserveDailyJourneyGiftSessionHighlights([
      Object.freeze({ ...pendingGift('fresh-gift', 7), isUnseen: false }),
      Object.freeze({ ...pendingGift('old-gift', 3), isUnseen: false }),
    ], visitHighlights);
    const nextVisit = maybePreserveDailyJourneyGiftSessionHighlights([
      Object.freeze({ ...pendingGift('fresh-gift', 7), isUnseen: false }),
    ], new Set<string>());

    expect(firstLoad.map((item) => [item.operationId, item.isUnseen])).toEqual([
      ['fresh-gift', true],
      ['old-gift', false],
    ]);
    expect(sameVisitReload.map((item) => [item.operationId, item.isUnseen])).toEqual([
      ['fresh-gift', true],
      ['old-gift', false],
    ]);
    expect(nextVisit[0]?.isUnseen).toBe(false);
  });

  it('renders fresh gifts above active bonuses and older pending gifts', () => {
    expect(source).toContain('const freshDailyJourneyItems = useMemo(');
    expect(source).toContain('const settledDailyJourneyItems = useMemo(');
    const freshIndex = source.indexOf('freshDailyJourneyItems.map((item) =>');
    const activeIndex = source.indexOf('activeItems.map((gift) =>');
    const settledIndex = source.indexOf('settledDailyJourneyItems.map((item) =>');

    expect(freshIndex).toBeGreaterThan(0);
    expect(freshIndex).toBeLessThan(activeIndex);
    expect(activeIndex).toBeLessThan(settledIndex);
  });

  it('keeps Daily Journey pending occurrences separate from level and spin items', () => {
    expect(source).toContain('useState<readonly DailyJourneyGiftVisualItem<DailyJourneyGiftPendingItem>[]>([])');
    expect(source).toContain('loadPendingLevelGiftInventory(studyTarget)');
    expect(source).toContain('readDailyJourneyGiftProjection(accountToken)');
    expect(source).toContain('dailyJourneyGiftVisualItems(projection)');
    expect(source).toContain('function dailyJourneyGiftItemKey(item: DailyJourneyGiftPendingItem): string');
    expect(source).toContain('return item.operationId;');
  });

  it('pulses every unseen Daily Journey tile after navigation settles and keeps its surface distinct until the pulse is visible', () => {
    const tileStart = source.indexOf('const DailyJourneyGiftTile');
    const tileEnd = source.indexOf('export default function LevelGiftsInventoryScreen');
    const tileSource = source.slice(tileStart, tileEnd);

    expect(tileSource).toContain('item: DailyJourneyGiftVisualItem<DailyJourneyGiftPendingItem>');
    expect(tileSource).toContain('const reducedMotion = useReducedMotion();');
    expect(tileSource).toContain('const unseenPulse = useSharedValue(1);');
    expect(tileSource).toContain('if (item.isUnseen && !reducedMotion)');
    expect(tileSource).toContain('InteractionManager.runAfterInteractions');
    expect(tileSource).toMatch(/unseenPulse\.value = withSequence\(\s*withTiming\(1\.08, \{ duration: 360 \}\),\s*withTiming\(1, \{ duration: 640 \}\),\s*\)/);
    expect(tileSource).toContain('cancelAnimation(unseenPulse);');
    expect(tileSource).toContain('transform: [{ scale: unseenPulse.value }]');
    expect(tileSource).toContain('testID={`daily-journey-gift-pulse-${item.operationId}`}');
    expect(tileSource).toContain("giftTone(themeAccent, item.isUnseen ? '48' : '30')");
    expect(tileSource).toContain("item.isUnseen ? giftTone(themeAccent, '18') : surface[0]");
    expect(tileSource).toContain('dailyJourneyGiftA11yLabel(item, lang, item.isUnseen)');
    expect(tileSource).not.toContain('daily-journey-gift-new-badge');
    expect(tileSource).not.toMatch(/width:\s*withTiming|height:\s*withTiming|margin:\s*withTiming/);
    expect(source).toContain('const DAILY_JOURNEY_UNSEEN_PRESENTATION_MS = 1400;');
    expect(source).toContain('const dailyJourneySessionHighlightsRef = useRef(new Set<string>());');
    expect(source).toContain('preserveDailyJourneyGiftSessionHighlights(');
    expect(source).toContain('dailyJourneySessionHighlightsRef.current.clear();');
    expect(source).toMatch(/useLayoutEffect\(\(\) => \{[\s\S]{0,500}dailyJourneyItems\.some\(\(item\) => item\.isUnseen\)[\s\S]{0,700}InteractionManager\.runAfterInteractions[\s\S]{0,400}setTimeout\([\s\S]{0,300}inventoryController\.acknowledgeDisplayedSnapshot\(\)[\s\S]{0,250}DAILY_JOURNEY_UNSEEN_PRESENTATION_MS/);
  });

  it('renders committed square art with a concise visible reward label', () => {
    expect(source).not.toContain('DailyJourneyRevealScene');
    expect(source).not.toContain('dailyJourneyRewardPreviewModel');
    expect(source).not.toContain('RuneGlyph');
    expect(source).not.toContain('dailyJourneyRuneImageSource');
    expect(source).toContain('testID={`daily-journey-gift-${item.operationId}`}');
    expect(source).toContain('key={dailyJourneyGiftItemKey(item)}');
    expect(source).toContain('size={size * 0.78}');
    expect(source).toContain('accessibilityLabel={dailyJourneyGiftA11yLabel(item, lang, item.isUnseen)}');
    expect(source).toContain('dailyJourneyRewardAccessibilityLabel(item.reward, lang)');
    expect(source).toContain('dailyJourneyRewardDisplayLabel(item.reward, lang)');
    const tileStart = source.indexOf('const DailyJourneyGiftTile');
    const tileEnd = source.indexOf('export default function LevelGiftsInventoryScreen');
    const tileSource = source.slice(tileStart, tileEnd);
    expect(tileSource).not.toMatch(/item\.level|level:/);
    expect(tileSource).not.toContain('GiftExpiryCountdown');
    expect(tileSource).toContain('<Text');
    expect(tileSource).toContain('{rewardLabel}');
    expect(tileSource).not.toContain('numberOfLines');
  });

  it('names the selected reward in the claim modal instead of calling everything a gift', () => {
    expect(source).toContain('dailyJourneyRewardDisplayLabel(selectedDailyJourneyGift.reward, lang)');
    expect(source).not.toMatch(/title=\{triLang\(lang, \{\s*ru: 'Подарок'/);
  });

  it('announces claim busy/failure, keeps the item retryable, and avoids duplicate haptics', () => {
    const tileStart = source.indexOf('const DailyJourneyGiftTile');
    const tileEnd = source.indexOf('export default function LevelGiftsInventoryScreen');
    expect(source.slice(tileStart, tileEnd)).not.toContain('hapticTap()');
    expect(source).toContain('accessibilityState={{ disabled: dailyJourneyClaimBusyId === selectedDailyJourneyGift.operationId, busy: dailyJourneyClaimBusyId === selectedDailyJourneyGift.operationId }}');
    expect(source).toContain('accessibilityLabel={dailyJourneyGiftClaimA11yLabel(selectedDailyJourneyGift, lang)}');
    expect(source).toContain('dailyJourneyRewardAccessibilityLabel(item.reward, lang)');
    expect(source).toContain("if (scope === 'daily_claim')");
    expect(source).toContain("emitAppEvent('action_toast'");
  });

  it('resolves rune tiers through the shared LevelSpin art catalogue, never the retired 10-rune raster', () => {
    const adapterSource = readSource('app/daily_journey_gift_inventory_adapter.ts');
    expect(adapterSource).not.toContain('stars_10.webp');
    expect(adapterSource).toContain('dailyJourneyRuneArtRewardId(reward.amount)');
    expect(source).toContain('size={size * 0.78}');
    const artStart = source.indexOf('const DailyJourneyGiftArt');
    const artEnd = source.indexOf('const DailyJourneyGiftTile');
    const artSource = source.slice(artStart, artEnd);
    expect(artSource).not.toContain("art.kind === 'rune'");
    expect(artSource).not.toContain('size={size * 0.82}');
  });

  it('wires lifecycle and event reloads through the settling controller', () => {
    expect(source).toContain('claimGift: claimDailyJourneyGift');
    expect(source).toContain('recordSnapshotDisplayed: recordDailyJourneyGiftSnapshotDisplayed');
    expect(source).toContain('useLayoutEffect(() =>');
    expect(source).toContain('inventoryController.acknowledgeDisplayedSnapshot()');
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
