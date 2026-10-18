import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => normalizeEol(fs.readFileSync(path.join(root, relativePath), 'utf8'));

describe('retained tabs runtime work contract', () => {
  it('keeps stats refreshes dirty while the retained stats route is inactive', () => {
    const source = read('app/streak_stats.tsx');

    expect(source).toContain('const statsRefreshDirtyRef = useRef(false);');
    expect(source).toContain('if (!statsRuntimeActive) {');
    expect(source).toContain('statsRefreshDirtyRef.current = true;');
    expect(source).toContain('if (!statsRuntimeActive || !statsRefreshDirtyRef.current) return;');
  });

  it('gates lesson energy and dialogs work for both retained-tab and push presentations', () => {
    const energy = read('components/EnergyBar.tsx');
    const lessons = read('app/(tabs)/lessons.tsx');
    const dialogs = read('components/DialogsTabContent.tsx');

    // зачем (координатор §46, 2026-10-01): форма сменилась, инварианты те же.
    // EnergyBar 2.0 — пилюля: таймер идёт только пока открыта подсказка, а она
    // открывается лишь на сфокусированном экране активного владельца. lessons.tsx
    // перешёл на двойные кавычки; генерационный счётчик Диалогов переименован.
    expect(energy).toContain('ownerActive?: boolean;');
    expect(energy).toContain('const popoverEligible = !hasPremiumAccess && focused && ownerActive;');
    expect(energy).toContain('const popoverVisible = infoVisible && popoverEligible;');
    expect(energy).toMatch(/useEnergyCountdown\(\{\s*visible: popoverVisible,?\s*\}\)/);
    expect(lessons).toMatch(/const lessonsTabVisible = isRetainedTab && runtimeOwnerId === ["']lessons["'];/);
    expect(lessons).toContain('const lessonsRuntimeActive = useRuntimeActive(');
    expect(lessons).toContain('isRetainedTab ? lessonsTabVisible : true');
    expect(lessons).toMatch(/<EnergyBar size=\{30\} ownerActive=\{lessonsRuntimeActive\}\s*\/>/);
    expect(lessons).toMatch(/active=\{lessonsRuntimeActive && page === ["']dialogs["']\}/);
    expect(dialogs).toContain('active?: boolean;');
    expect(dialogs).toContain('if (!active) return;');
    expect(dialogs).toContain('const generation = ++completedGenerationRef.current;');
    expect(dialogs).toContain('generation !== completedGenerationRef.current');
    expect(dialogs).toContain('completedDirtyRef.current = true;');
  });

  it('coalesces Home data work until Home is active', () => {
    const source = read('app/(tabs)/home.tsx');

    // Home can mount before it becomes the runtime owner. Its first ownership
    // handoff must therefore request the initial data load.
    expect(source).toContain('const homeDataDirtyRef = useRef(true);');
    expect(source).toContain('if (homeDataDirtyRef.current) {');
    // зачем (04.10): осколки с Главной удалены (Q92) вместе с shardsDirtyRef — отложенная работа держится на
    // homeDataDirtyRef (проверки выше и ниже).
    expect(source).not.toContain('shardsDirtyRef');
    // зачем (Q92, 01.10): всплывающий бонус «+N» осколков и его анимации с Главной удалены.
    expect(source).not.toContain('shardsBonusAnim');
    expect(source).not.toContain('shardsAnim');
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
    const center = read('components/NotificationCenterButton.tsx');
    const inbox = read('components/AppMessagesInbox.tsx');

    expect(home).toContain('ownerActive={homeRuntimeActive}');
    expect(home).toContain('<NotificationCenterButton');
    // перепин 18.10 ([HOME-CHILD-COST], координатор): активность вкладки и счётчик фокусов колокольчик получает через HomeBellStateContext (провайдер вокруг шапки), а не пропсами в bellSlot — иначе шапка перерисовывалась на каждом возврате. Смысл тот же: Главная отдаёт колокольчику homeRuntimeActive и focusTick.
    expect(home).toContain('value={homeBellState}');
    expect(home).toContain('const homeBellState = useMemo(() => ({ active: homeRuntimeActive, focusTick }), [focusTick, homeRuntimeActive]);');
    expect(center).toContain('ownerActive={isHomeTabActive}');
    expect(inbox).toContain('ownerActive?: boolean;');
    expect(inbox).toContain('const runtimeActive = ownerActive ?? isScreenFocused;');
    // зачем: D108 — ауры удалены вместе с их анимационным циклом; проверять нечего.
  });
});
