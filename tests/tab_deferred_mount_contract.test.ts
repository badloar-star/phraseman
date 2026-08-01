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
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_ORDER = [1, 2, 3, 4] as const');
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
    const source = fs.readFileSync(settingsPath, 'utf8');

    expect(source).toContain("const settingsTabVisible = runtimeOwnerId === 'settings';");
    expect(source).toContain('const settingsStorageHydratedRef = useRef(false);');
    expect(source).toContain('if (!settingsTabVisible && settingsStorageHydratedRef.current) return;');
    expect(source).toContain('[settingsTabVisible, refreshSupplementalAccessState]');
    expect(source).not.toContain('[activeIdx, refreshSupplementalAccessState]');
  });

  it('keeps Lessons warm without reloading scores while another tab is visible', () => {
    const source = fs.readFileSync(lessonsPath, 'utf8');

    expect(source).toContain('const lessonsTabVisible = activeIdx === 1;');
    expect(source).toContain('const lessonsStorageHydratedRef = useRef(false);');
    expect(source).toContain('if (lessonsStorageHydratedRef.current) return;');
    expect(source).toContain('if (!lessonsTabVisible) return;');
    expect(source).toContain('[focusTick, lessonsTabVisible, loadScores]');
    expect(source).not.toContain('[focusTick, loadScores]');
  });
});
