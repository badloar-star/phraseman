import fs from 'fs';
import path from 'path';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('Daily Journey projection in the Gifts inventory', () => {
  const source = readSource('app/level_gifts_inventory.tsx');

  it('keeps Daily Journey pending occurrences separate from level and spin items', () => {
    expect(source).toContain('useState<DailyJourneyGiftPendingItem[]>([])');
    expect(source).toContain('loadPendingLevelGiftInventory(studyTarget)');
    expect(source).toContain('readDailyJourneyGiftProjection(accountToken)');
    expect(source).toContain('setDailyJourneyItems(dailyJourneySnapshot.pending)');
    expect(source).toContain('function dailyJourneyGiftItemKey(item: DailyJourneyGiftPendingItem): string');
    expect(source).toContain('return item.operationId;');

    const tileStart = source.indexOf('const DailyJourneyGiftTile');
    const tileEnd = source.indexOf('export default function LevelGiftsInventoryScreen');
    expect(tileStart).toBeGreaterThanOrEqual(0);
    const tileSource = source.slice(tileStart, tileEnd);
    expect(tileSource).not.toMatch(/item\.level|level:/);
    expect(tileSource).not.toContain('GiftExpiryCountdown');
    expect(tileSource).not.toContain('<Text');
  });

  it('renders square asset-led Daily Journey tiles with materially large art and no mini copy', () => {
    expect(source).toContain('testID={`daily-journey-gift-${item.operationId}`}');
    expect(source).toContain('key={dailyJourneyGiftItemKey(item)}');
    expect(source).toContain('source={rewardImageSource(item.reward, themeMode)}');
    expect(source).toContain('width: size * 0.78, height: size * 0.78');
    expect(source).toContain('accessibilityLabel={dailyJourneyGiftA11yLabel(item, lang)}');
  });

  it('marks only the successfully displayed Daily Journey snapshot revision seen', () => {
    const loadStart = source.indexOf('const reloadGiftSources = useCallback(async');
    const loadEnd = source.indexOf('const loadSpinBalance = useCallback', loadStart);
    expect(loadStart).toBeGreaterThanOrEqual(0);
    const loadSource = source.slice(loadStart, loadEnd);

    expect(loadSource).toContain('const [existingGiftData, dailyJourneySnapshot] = await Promise.all([');
    expect(loadSource).toContain('setDailyJourneyItems(dailyJourneySnapshot.pending);');
    expect(loadSource).toContain('await markDailyJourneyGiftSnapshotSeen(dailyJourneySnapshot.latestRevision, accountToken);');
    expect(loadSource.indexOf('setDailyJourneyItems(dailyJourneySnapshot.pending);'))
      .toBeLessThan(loadSource.indexOf('markDailyJourneyGiftSnapshotSeen(dailyJourneySnapshot.latestRevision, accountToken)'));
    expect(loadSource).not.toContain('.catch(() => markDailyJourneyGiftSnapshotSeen');
  });

  it('refreshes both sources on journal changes and after a successful claim', () => {
    expect(source).toContain("onAppEvent('daily_journey_gifts_changed'");
    expect(source).toContain('await claimDailyJourneyGift(item.operationId, accountToken);');
    expect(source).toContain('await reloadGiftSources({ markSnapshotSeen: false });');
    expect(source).toContain('loadActiveLevelGiftInventory(lang, Date.now(), studyTarget)');
  });

  it('guards account lifecycle, unmounts, and duplicate claim presses', () => {
    expect(source).toContain('const inventoryLifecycleRef = useRef({ active: false, loadRequestId: 0 });');
    expect(source).toContain('isCurrentAccountGeneration(accountToken, stableId)');
    expect(source).toContain('loadRequestId !== inventoryLifecycleRef.current.loadRequestId');
    expect(source).toContain('const dailyJourneyClaimBusyRef = useRef(new Set<string>());');
    expect(source).toContain('if (dailyJourneyClaimBusyRef.current.has(item.operationId)) return;');
    expect(source).toContain('dailyJourneyClaimBusyRef.current.add(item.operationId);');
    expect(source).toContain('dailyJourneyClaimBusyRef.current.delete(item.operationId);');
    expect(source).toContain('const accountGenerationSubscription = subscribeAccountGeneration');
    expect(source).toContain('setDailyJourneyItems([]);');
    expect(source).toContain('accountGenerationSubscription.remove();');
    expect(source).toContain('inventoryLifecycleRef.current.active = false;');
  });
});
