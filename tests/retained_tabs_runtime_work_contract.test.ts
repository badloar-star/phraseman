import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('retained tabs runtime work contract', () => {
  it('defers Save Progress checks while Home is not the runtime owner', () => {
    const source = read('components/SaveProgressBanner.tsx');

    expect(source).toContain('ownerActive?: boolean');
    expect(source).toContain('function SaveProgressBanner({ ownerActive = true }: SaveProgressBannerProps)');
    expect(source).toContain('if (!ownerActiveRef.current)');
    expect(source).toContain('dirtyRef.current = true;');
    expect(source).toContain('const xpRaw = await AsyncStorage.getItem(\'user_total_xp\');');
    expect(source.indexOf("const xpRaw = await AsyncStorage.getItem('user_total_xp');")).toBeLessThan(
      source.indexOf('const info = await getLinkedAuthInfo();'),
    );
    expect(source).toContain('const checkGenerationRef = useRef(0);');
    expect(source).toContain('if (checkInFlightRef.current) {');
    expect(source).toContain('dirtyRef.current = true;\n      return checkInFlightRef.current;');
    expect(source).toContain("DeviceEventEmitter.addListener('account_deleted'");
  });

  it('keeps stats refreshes dirty while the retained stats route is inactive', () => {
    const source = read('app/streak_stats.tsx');

    expect(source).toContain('const statsRefreshDirtyRef = useRef(false);');
    expect(source).toContain('if (!statsRuntimeActive) {');
    expect(source).toContain('statsRefreshDirtyRef.current = true;');
    expect(source).toContain('if (!statsRuntimeActive || !statsRefreshDirtyRef.current) return;');
  });

  it('gates lesson energy and dialogs work by the lessons owner and dialogs page', () => {
    const energy = read('components/EnergyBar.tsx');
    const lessons = read('app/(tabs)/lessons.tsx');
    const dialogs = read('components/DialogsTabContent.tsx');

    expect(energy).toContain('ownerActive?: boolean;');
    expect(energy).toContain('useEnergyCountdown({ visible: screenFocused && ownerActive })');
    expect(lessons).toContain("const lessonsOwnerActive = runtimeOwnerId === 'lessons';");
    expect(lessons).toContain('const lessonsRuntimeActive = useRuntimeActive(lessonsOwnerActive);');
    expect(lessons).toContain('<EnergyBar size={30} ownerActive={lessonsRuntimeActive}/>');
    expect(lessons).toContain('active={lessonsRuntimeActive && page === \'dialogs\'}');
    expect(dialogs).toContain('active?: boolean;');
    expect(dialogs).toContain('if (!active) return;');
    expect(dialogs).toContain('const refreshGenerationRef = useRef(0);');
    expect(dialogs).toContain('completedDirtyRef.current = true;');
  });

  it('coalesces Home daily-summary work until Home is active', () => {
    const source = read('app/(tabs)/home.tsx');

    // Home can mount before it becomes the runtime owner. Its first ownership
    // handoff must therefore request the initial task summary instead of
    // leaving the visible card at the default 0 completed tasks.
    expect(source).toContain('const homeDataDirtyRef = useRef(true);');
    expect(source).toContain('const homeDailySummaryDirtyRef = useRef(false);');
    expect(source).toContain('const requestDailyTaskSummaryRefresh = () => {');
    expect(source).toContain('homeDailySummaryDirtyRef.current = true;');
    expect(source).toContain('if (homeDataDirtyRef.current) {');
    expect(source).toContain('homeDailySummaryDirtyRef.current = false;\n            loadData();\n            return;');
    expect(source).toContain('if (!homeDailySummaryDirtyRef.current) return;');
    expect(source).toContain('<SaveProgressBanner ownerActive={homeRuntimeActive} />');
    expect(source).toContain('shardsDirtyRef.current = true;');
    expect(source).toContain('shardsAnim.stopAnimation();');
    expect(source).toContain('shardsAnim.setValue(1);');
    expect(source).toContain('shardsBonusAnim.setValue(0);');
    const deferredReload = source.slice(source.indexOf('if (needsReloadRef.current)'), source.indexOf('useEffect(() => {\n        if (!homeRuntimeActive)', source.indexOf('if (needsReloadRef.current)')));
    expect(deferredReload).toMatch(/if \(!homeRuntimeActiveRef\.current\) \{[\s\S]*homeDataDirtyRef\.current = true;[\s\S]*return;/);
    expect(deferredReload).toMatch(/InteractionManager\.runAfterInteractions\(\(\) => \{[\s\S]*else if \(mountedRef\.current\)[\s\S]*homeDataDirtyRef\.current = true;/);
  });

  it('uses runtime-active, not only owner visibility, for retained Friends and Settings I/O', () => {
    const friends = read('app/(tabs)/friends.tsx');
    const settings = read('app/(tabs)/settings.tsx');

    expect(friends).toContain('const friendsRuntimeActive = useRuntimeActive(friendsTabVisible);');
    expect(friends).toContain('if (!friendsRuntimeActive) return;');
    expect(friends).toContain('}, [friendsRuntimeActive]);');
    expect(settings).toContain('const settingsRuntimeActive = useRuntimeActive(settingsTabVisible);');
    expect(settings).toContain('if (!settingsRuntimeActive) return;');
  });

  it('passes explicit retained-tab runtime ownership into Home loops and inbox work', () => {
    const home = read('app/(tabs)/home.tsx');
    const video = read('components/LingmanVideosButton.tsx');
    const center = read('components/NotificationCenterButton.tsx');
    const inbox = read('components/AppMessagesInbox.tsx');
    const aura = read('components/AvatarAura.tsx');
    const avatar = read('components/AvatarView.tsx');

    expect(home).toContain('<LingmanVideosButton ownerActive={homeRuntimeActive} />');
    expect(home).toContain('ownerActive={homeRuntimeActive}');
    expect(video).toContain('ownerActive?: boolean;');
    expect(video).toContain('function LingmanVideosButton({ ownerActive = true }');
    expect(video).not.toContain('useIsFocused');
    expect(home).toContain('<NotificationCenterButton isHomeTabActive={homeRuntimeActive}');
    expect(center).toContain('ownerActive={isHomeTabActive}');
    expect(inbox).toContain('ownerActive?: boolean;');
    expect(inbox).toContain('const runtimeActive = ownerActive ?? isScreenFocused;');
    expect(aura).toContain('ownerActive?: boolean;');
    expect(aura).toContain('const runtimeActive = isFocused && (ownerActive ?? true);');
    expect(avatar).toContain('ownerActive={ownerActive}');
  });
});
