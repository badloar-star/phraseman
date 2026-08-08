import fs from 'fs';
import path from 'path';

const layoutPath = path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx');
const settingsPath = path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx');
const lessonsPath = path.join(__dirname, '..', 'app', '(tabs)', 'lessons.tsx');

function readLayout(): string {
  return fs.readFileSync(layoutPath, 'utf8');
}

describe('tab background pre-mount contract', () => {
  it('keeps visible tab selection separate from mounted tab readiness', () => {
    const source = readLayout();

    expect(source).toContain('mountedTabs');
    expect(source).toContain('visitedTabs');
    expect(source).toContain('setActiveIdx(idx)');
  });

  it('pre-mounts deferred tabs in bounded idle slices after first content', () => {
    const source = readLayout();

    expect(source).toContain('const ENABLE_BACKGROUND_TAB_PREMOUNT = true');
    // зачем 2026-08-02: таб «Уроки» убран — отложенных вкладок три (турниры, друзья, настройки).
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_ORDER = [1, 2, 3] as const');
    expect(source).toContain('scheduleIdleTask');
    expect(source).toContain('requestIdleCallback');
    expect(source).toContain("onAppEvent('app_first_content_ready', startPremount)");
    expect(source).toContain('setTimeout(startPremount, BACKGROUND_TAB_PREMOUNT_FALLBACK_MS)');
    expect(source).toContain("AppState.currentState !== 'active'");
    expect(source).toMatch(/mountedTabs\.has\(/);
    expect(source).not.toContain('InteractionManager');
    expect(source).not.toContain('runAfterInteractions');
  });

  it('uses opaque theme placeholders only while a deferred tab is still not ready', () => {
    const source = readLayout();

    expect(source).toContain('backgroundColor: t.bgPrimary');
    expect(source).toContain('style={[s.deferredTabPlaceholder, { backgroundColor: t.bgPrimary }]}');
  });

  it('does not mount every tab on the initial render', () => {
    const source = readLayout();

    expect(source).toContain('return new Set<number>([0, initial]);');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_FALLBACK_MS = 1600;');
  });

  it('keeps Settings warm without rehydrating storage on every tab switch', () => {
    // зачем 2026-08-02: параллельная сессия усилила гвард гидрации настроек —
    // settingsRuntimeActive (владелец таба + фокус + AppState) вместо голого
    // settingsTabVisible; контракт приведён к закоммиченному коду.
    const source = fs.readFileSync(settingsPath, 'utf8');

    expect(source).toContain("const settingsTabVisible = runtimeOwnerId === 'settings';");
    expect(source).toContain('const settingsStorageHydratedRef = useRef(false);');
    expect(source).toContain('if (!settingsRuntimeActive && settingsStorageHydratedRef.current) return;');
    expect(source).toContain('[settingsRuntimeActive, refreshSupplementalAccessState]');
    expect(source).not.toContain('[activeIdx, refreshSupplementalAccessState]');
  });

  it('reloads Lessons scores by honest screen focus now that lessons is a push route', () => {
    // зачем 2026-08-02: таб «Уроки» убран — экран стал push-маршрутом /lessons_list.
    // Прежний гвард «не перечитывать сторидж, пока виден другой таб» больше не нужен:
    // push-экран получает честный фокус, перечитывание висит на useFocusEffect,
    // а дубли схлопывает in-flight promise (scoresLoadRef).
    const source = fs.readFileSync(lessonsPath, 'utf8');

    expect(source).toContain('useFocusEffect(useCallback(() => {');
    expect(source).toContain('void loadScores();');
    expect(source).toContain('const scoresLoadRef = useRef<{');
    expect(source).not.toContain('lessonsTabVisible');
    expect(source).not.toContain('useTabNav');
  });
});
