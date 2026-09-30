import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

function walkHybridFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHybridFiles(full, out);
    else if (/Hybrid\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

const DIRECT_HYBRID_DRIVERS = [
  'components/OfflineBanner.tsx',
  'components/PromoBanner.tsx',
  'components/SaveProgressBanner.tsx',
  'components/RankChangeBanner.tsx',
  'components/ReferralInviteBannerArt.tsx',
  'components/ActionToast.tsx',
  'components/MedalToast.tsx',
  'components/InGameToast.tsx',
  'components/modal_fx/HybridSheetShell.tsx',
  'components/modal_fx/HybridAlertShell.tsx',
  'components/celebration/RewardImpactRings.tsx',
  'components/AiConsentSheetModalHybrid.tsx',
  'components/NotificationPermissionModalHybrid.tsx',
  'components/ExplainSheetHybrid.tsx',
  'components/MistakeEli5ModalHybrid.tsx',
] as const;

const HYBRID_TIMING_EASING_DRIVERS = [
  'components/PromoBanner.tsx',
  'components/SaveProgressBanner.tsx',
  'components/ReferralInviteBannerArt.tsx',
  'components/VipSurveyModal.tsx',
] as const;

describe('motion hybrid runtime safety', () => {
  test.each(HYBRID_TIMING_EASING_DRIVERS)('%s uses Reanimated worklet easing with withTiming', (file) => {
    const source = read(file);
    const reanimatedImport = source.match(
      /import Reanimated,\s*\{([\s\S]*?)\}\s*from 'react-native-reanimated';/,
    )?.[1] ?? '';

    expect(reanimatedImport).toMatch(/\bEasing as REasing\b/);
    expect(source).not.toMatch(/withTiming\([\s\S]{0,180}?easing:\s*Easing\./);
  });

  test.each(DIRECT_HYBRID_DRIVERS)('%s honours the OS reduce-motion preference', (file) => {
    expect(read(file)).toContain('useReduceMotion');
  });

  test('in-game toast keeps screen geometry off the transformed node', () => {
    const source = read('components/InGameToast.tsx');
    expect(source).toContain('styles.toastAnchor');
    expect(source).toContain('<Reanimated.View style={[styles.toastCard');
    expect(source).toMatch(/<Animated\.View[\s\S]{0,160}styles\.toastCard/);
  });

  test('medal toast keeps screen geometry off the hybrid transformed node', () => {
    const source = read('components/MedalToast.tsx');
    expect(source).toContain('styles.wrapAnchor');
    expect(source).toContain('styles.wrapMotion');
  });

  test('shared motion engines do not inline spring physics', () => {
    for (const file of [
      'components/modal_fx/HybridSheetShell.tsx',
      'components/celebration/use_reward_impact_hybrid.ts',
    ]) {
      expect(read(file)).not.toMatch(/withSpring\([^,]+,\s*\{[^}]*\b(?:mass|damping|stiffness)\s*:/s);
    }
  });

  test('all Hybrid components use shared spring tokens', () => {
    for (const file of walkHybridFiles(path.join(ROOT, 'components'))) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/withSpring\([^,]+,\s*\{[^}]*\b(?:mass|damping|stiffness)\s*:/s);
    }
  });

  test('rank-change DEV hybrid actually renders the hybrid card', () => {
    const source = read('components/RankChangeBanner.tsx');
    expect(source).toContain('if (isHybrid) {');
    expect(source).toContain('<RankChangeHybridCard');
    expect(source).toContain('runOnJS(onDismiss)()');
  });

  test('hybrid sheet dismiss completion is idempotent', () => {
    const source = read('components/modal_fx/HybridSheetShell.tsx');
    expect(source).toContain('dismissCompletedRef');
    expect(source).toContain('dismissRequestedRef');
    expect(source).toContain('if (dismissRequestedRef.current || dismissCompletedRef.current) return;');
    expect(source).toContain('runOnJS(completeDismiss)()');
    expect(source).toContain("typeof children === 'function'");
    expect(source).toContain('children({ requestDismiss: dismissSheet })');
    expect(source).toContain(': children)');
    expect(source).not.toContain('runOnJS(closeAfterSwipe)()');
    expect(source).toContain('dismissCompletedRef.current = true;');
    expect(source).toContain('dismissFallbackRef.current = null;');
  });

  test('reduced-motion reward impact waits until armed', () => {
    const impactSource = read('components/celebration/use_reward_impact_hybrid.ts');
    expect(impactSource).toContain('if (!armedNow) return undefined;');
    expect(impactSource).toMatch(/if \(reduceMotion\) \{[\s\S]{0,160}onImpactRef\.current\(\)/);
    expect(impactSource).toContain('runOnJS(dispatchImpact)()');
    expect(impactSource).not.toContain('runOnJS(onImpactRef.current)()');

  });

  test('reward impact subtitle owns a complete distinct ladder lifecycle', () => {
    const source = read('components/celebration/use_reward_impact_hybrid.ts');
    expect(source).toContain('const subtitleOpacity = useSharedValue(0);');
    expect(source).toContain('const subtitleY = useSharedValue(10);');
    expect(source).toContain('subtitleOpacity.value = 1;');
    expect(source).toContain('subtitleY.value = 0;');
    expect(source).toContain('subtitleOpacity.value = withDelay(CHK.ladder[2]');
    expect(source).toContain('subtitleY.value = withDelay(CHK.ladder[2]');
    expect(source).toContain('cancelAnimation(subtitleOpacity);');
    expect(source).toContain('cancelAnimation(subtitleY);');
    expect(source).toContain('subtitle: subtitleStyle');
  });

  test('dialog-victory metric cards also collapse to the reduced-motion frame', () => {
    const source = read('components/DialogVictoryCelebrationHybrid.tsx');
    expect(source).toContain('reduceMotion: boolean;');
    expect(source).toContain('reduceMotion={reduceMotion}');
    expect(source).toContain('if (reduceMotion) {\n      enter.value = 1;');
  });

});
