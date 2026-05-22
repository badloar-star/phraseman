import fs from 'fs';
import path from 'path';

describe('admin settings VIP profile control', () => {
  const screen = fs.readFileSync(path.join(process.cwd(), 'app', '_admin_settings_testers.tsx'), 'utf8');
  const celebration = fs.readFileSync(path.join(process.cwd(), 'components', 'PremiumCelebrationModal.tsx'), 'utf8');
  const maestroFlow = fs.readFileSync(path.join(process.cwd(), 'maestro', 'flows', 'dev_only', 'admin_settings_vip_profile.yaml'), 'utf8');

  it('exposes a direct admin-panel button for VIP on the current profile', () => {
    expect(screen).toContain('screen-settings-testers');
    expect(screen).toContain('admin-activate-vip-profile');
    expect(screen).toContain('activateVipOnCurrentProfile');
    expect(screen).toContain('💚 Активировать VIP на моём профиле');
    expect(screen).toContain('admin-preview-vip-celebration-top');
    expect(screen).toContain('admin-preview-vip-celebration');
    expect(screen).toContain('<VipCelebrationModal');
    expect(screen).toContain("setSoftMonetizationPreview('vip_celebration')");
    expect(screen).toContain('activatedVipPreviewMarker');
    expect(screen).toContain('consumeVipCelebration(marker)');
    expect(maestroFlow).toContain('admin-activate-vip-profile');
    expect(maestroFlow).toContain('admin-preview-vip-celebration-top');
    expect(maestroFlow).toContain('vip-celebration-cta');
  });

  it('writes only VIP fields so VIP never cancels or rewrites real Premium', () => {
    const activateStart = screen.indexOf('const activateVipOnCurrentProfile');
    const activateBody = screen.slice(activateStart, screen.indexOf('const prepareWeakTrainerQa', activateStart));
    expect(activateBody).toContain("['vip_active', 'true']");
    expect(activateBody).toContain("['vip_plan', 'admin_vip']");
    expect(activateBody).toContain("vip_admin_override: 'true'");
    expect(activateBody).not.toContain("['premium_active'");
    expect(activateBody).not.toContain("['premium_plan'");
    expect(activateBody).not.toContain("['premium_expiry'");
    expect(activateBody).not.toContain('tester_no_premium');
    expect(activateBody).not.toContain("'progress.premium_");

    const qaStart = screen.indexOf('const ensureQaPremiumAccess');
    const qaBody = screen.slice(qaStart, screen.indexOf('const activateVipOnCurrentProfile', qaStart));
    expect(qaBody).toContain("['vip_active', 'true']");
    expect(qaBody).not.toContain("['premium_active'");
    expect(qaBody).not.toContain("['premium_plan'");
    expect(qaBody).not.toContain("['premium_expiry'");
    expect(qaBody).not.toContain('tester_no_premium');
  });

  it('keeps the VIP celebration visibly animated and readable on the green theme', () => {
    expect(celebration).toContain("import { Ionicons } from '@expo/vector-icons'");
    expect(celebration).toContain("name={unlocked ? 'lock-open' : 'lock-closed'}");
    expect(celebration).toContain('setUnlocked(true)');
    expect(celebration).toContain('forceOpen={skipped}');
    expect(celebration).toContain("const headlineColor = isVip ? '#F7FFF9' : palette.main");
    expect(celebration).toContain("const ctaTextColor = isVip ? '#FFFFFF' : palette.dark");
    expect(celebration).toContain('styles.vipReadableText');
    expect(celebration).toContain('styles.vipCtaText');
    expect(celebration).toContain('styles.skipLayer');
    expect(celebration).toContain('styles.ctaLayer');
    expect(celebration).toContain('showsVerticalScrollIndicator');
    expect(celebration).toContain('nestedScrollEnabled');
    expect(celebration).toContain('skipLayer: { zIndex: 0, elevation: 0 }');
    expect(celebration).toContain('zIndex: 12');
    expect(celebration).toContain('hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}');
  });
});
