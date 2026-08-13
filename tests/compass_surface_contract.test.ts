import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Compass production surface contract', () => {
  const layout = read('app/(tabs)/_layout.tsx');
  const host = read('components/compass/CompassCenterHost.tsx');
  const sheet = read('components/compass/CompassQuickSheet.tsx');
  const model = read('app/tab_page_model.ts');
  const arbiter = read('components/overlay_arbiter_core.ts');
  const context = read('components/compass/CompassCenterContext.tsx');
  const lifecycle = read('app/compass_sheet_lifecycle.ts');
  const surface = read('components/compass/CompassSurface.tsx');

  it('keeps every app-level Compass utility safe for Expo Router discovery', () => {
    const utilityFiles = fs.readdirSync(path.join(root, 'app'))
      .filter(file => /^compass_.*\.ts$/.test(file));
    expect(utilityFiles.length).toBeGreaterThan(0);
    for (const file of utilityFiles) {
      expect(read(`app/${file}`)).toContain('export default function __RouteShim()');
    }
  });

  it('uses a visible Home control and a hidden page, never the Android system edge', () => {
    expect(host).toContain('testID="compass-home-control"');
    expect(layout).toContain('<CompassPage key="compass"');
    expect(model).toContain("PHYSICAL_PAGE_IDS = ['compass', ...LOGICAL_TAB_IDS]");
    expect(host).not.toMatch(/bottom[-_ ]edge|edgeActivator|hitSlopBottom/i);
    expect(host).toContain('!sheetMounted');
    expect(host).toContain('onMountedChange={handleMountedChange}');
    expect(host).toContain('ref={triggerRef}');
    expect(host).toContain('AccessibilityInfo.sendAccessibilityEvent(triggerRef.current');
    expect(host).toContain('const hasSafeDailyStep = recommendation !== null;');
  });

  it('keeps quick and expanded states in one in-tree animated surface', () => {
    expect(sheet).toContain('testID="compass-quick-sheet-host"');
    expect(sheet).toContain('withSpring');
    expect(sheet).toContain('withTiming');
    expect(sheet).toContain('resolveCompassSurfaceRelease');
    expect(lifecycle).toContain("phase: 'closing'");
    expect(context).toContain('completeCompassSheetClose');
    expect(sheet).not.toMatch(/\bModal\b/);
    expect(arbiter).toContain("'compassBriefing'");
    const nativeSet = arbiter.slice(arbiter.indexOf('export const NATIVE_MODAL_KEYS'), arbiter.indexOf('/** Рендерится ли ключ'));
    expect(nativeSet).not.toContain("'compassBriefing'");
  });

  it('presents one premium decision instead of a telemetry card', () => {
    expect(surface).toContain('testID="compass-primary-action"');
    expect(surface).toContain('testID="compass-action-block"');
    expect(surface).toContain('testID="compass-explanation-block"');
    expect(surface).toContain('accessibilityRole="header"');
    expect(surface).toContain('{copy.whyTitle}');
    expect(surface).toContain('{recommendation.explanation}');
    for (const localizedWhy of [
      'ПОЧЕМУ СЕЙЧАС',
      'ЧОМУ ЗАРАЗ',
      'POR QUÉ AHORA',
      'POR QUE AGORA',
      'VÌ SAO LÚC NÀY',
      'MENGAPA SEKARANG',
      'NEDEN ŞİMDİ',
      'DLACZEGO TERAZ',
    ]) {
      expect(surface).toContain(localizedWhy);
    }
    expect(surface).toContain('recommendation.actionLabel');
    expect(surface).toContain('copy.minutes(recommendation.expectedMinutes)');
    expect(surface).toContain('recommendation: CompassSurfaceRecommendation;');
    expect(surface).not.toContain('recommendation: CompassSurfaceRecommendation | null');
    expect(surface).not.toContain('SkeletonBlock');
    expect(surface).not.toContain('loadingTitle');
    expect(surface).not.toContain('insufficientTitle');
    expect(surface).not.toContain('nextPanel');
    expect(surface).not.toContain('directionPlate');
    expect(surface).not.toContain('compass-why-toggle');
    expect(surface).not.toContain('timePill');
    expect(surface).not.toContain('evidenceChip');
    expect(surface).not.toContain('CompassSurfaceEvidence');
    expect(surface).not.toContain('copy.confidence');
    expect(surface).not.toContain('withRepeat');
  });

  it('locks horizontal tabs, respects safe area/reduced motion, and exposes accessible controls', () => {
    expect(sheet).toContain('tabSwipeLocked.value = mounted');
    expect(sheet).toContain('useStableSafeAreaInsets');
    expect(sheet).toContain('useReducedMotion');
    expect(sheet).toContain('accessibilityViewIsModal');
    expect(sheet).toContain('onAccessibilityEscape');
    expect(sheet).toContain('AccessibilityInfo.sendAccessibilityEvent');
    expect(sheet).not.toContain('findNodeHandle');
    expect(sheet).not.toContain('setAccessibilityFocus');
    expect(sheet).toContain('accessible={false}');
    expect(sheet).toContain('accessibilityState={{ expanded }}');
    expect(sheet).toContain('width: 44, height: 44');
  });
});
