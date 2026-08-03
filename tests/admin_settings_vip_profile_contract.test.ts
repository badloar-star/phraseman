import fs from 'fs';
import path from 'path';

describe('admin settings VIP profile control', () => {
  const screen = fs.readFileSync(path.join(process.cwd(), 'app', '_admin_settings_testers.tsx'), 'utf8');
  const celebration = fs.readFileSync(path.join(process.cwd(), 'components', 'PremiumCelebrationModal.tsx'), 'utf8');
  const celebrationContent = fs.readFileSync(path.join(process.cwd(), 'components', 'premium_celebration', 'celebrationContent.ts'), 'utf8');
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
    // Redesigned celebration (premium_celebration aurora/reel): the lock-icon
    // reveal was replaced by an animated per-row "lit" reveal driven by litCount,
    // and theme colors moved into per-variant CELEBRATION_PALETTES.
    expect(celebration).toContain('import Reanimated, {');
    expect(celebration).toContain('lit={skipped || idx < litCount}');
    expect(celebration).toContain('setLitCount(i)');
    expect(celebration).toContain('setFinaleLit(true)');
    expect(celebration).toContain('const skip = useCallback');
    // Readable colors come from the per-variant palette (VIP = green).
    expect(celebration).toContain('const palette = CELEBRATION_PALETTES[variant]');
    expect(celebration).toContain('color: palette.bright');
    expect(celebration).toContain('color: palette.ctaText');
    expect(celebration).toContain('styles.heroTextPlate');
    expect(celebration).toContain('styles.ctaText');
    expect(celebration).toContain('onPress={skipped ? handleClose : skip}');
    expect(celebration).toContain('styles.ctaWrap');
    expect(celebration).toContain('showsVerticalScrollIndicator');
    expect(celebration).toContain('scrollEnabled={skipped}');
    expect(celebration).toContain('testID={`${variant}-celebration-cta`}');
    // Green VIP palette stays readable: light text/headline against green main.
    expect(celebrationContent).toContain("main: '#34D399'");
    expect(celebrationContent).toContain("bright: '#86EFAC'");
    expect(celebrationContent).toContain("rowText: '#EAFFF4'");
    expect(celebrationContent).toContain("ctaText: '#04140d'");
  });

  it('keeps Plus celebration benefits current and concise', () => {
    expect(celebrationContent).toContain('Все уроки открыты');
    expect(celebrationContent).toContain('AI-диалоги');
    expect(celebrationContent).toContain('Голос с оценкой фразы');
    expect(celebrationContent).toContain('Plus-темы и аура');

    // зачем: «Недельный обзор» и «Компас дня» рекламировали Компас — фичу,
    // удалённую вместе с app/compass/ (day_closing нет, WeeklyReviewCard не
    // подключён ни к одному экрану). Окно поздравления обещало покупателю то,
    // чего в приложении нет. Тест теперь сторожит их ОТСУТСТВИЕ, чтобы строки
    // не вернулись копипастом.
    expect(celebrationContent).not.toContain('Недельный обзор');
    expect(celebrationContent).not.toContain('Компас дня');

    expect(celebrationContent).not.toContain('Тема Neon');
    expect(celebrationContent).not.toContain('Золотое имя');
    expect(celebrationContent).not.toContain('Второй язык');
    expect(celebrationContent).not.toContain('Несколько языков');
    expect(celebrationContent).not.toContain('Реферальные награды');
    expect(celebrationContent).not.toContain('Дни доступа за друзей');
    expect(celebrationContent).not.toContain('промокод');
    expect(celebration).not.toContain('VIP_EXTRA_FEATURE');

    const featureRows = celebrationContent.match(/^  \{ emoji:/gm) ?? [];
    expect(featureRows.length).toBeLessThanOrEqual(18);
  });
});
