import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { buttonForegroundForBackground, colorContrast, readableOn } from '../constants/color_contrast';

const BUSINESS_SHEET_PALETTES = [
  { accent: '#0095F6', bgCard: '#0A0A0A' },
  { accent: '#0095F6', bgCard: '#FFFFFF' },
] as const;

describe('daily boon production sheet', () => {
  const hostPath = join(process.cwd(), 'components', 'BoonActivatedHost.tsx');
  const sheetPath = join(process.cwd(), 'components', 'BoonActivatedSheet.tsx');
  const shellPath = join(process.cwd(), 'components', 'modal_fx', 'HybridSheetShell.tsx');
  const impactHookPath = join(process.cwd(), 'components', 'celebration', 'use_reward_impact_hybrid.ts');
  const host = readFileSync(hostPath, 'utf8');
  const sheet = existsSync(sheetPath) ? readFileSync(sheetPath, 'utf8') : '';
  const shell = readFileSync(shellPath, 'utf8');
  const impactHook = readFileSync(impactHookPath, 'utf8');

  test('routes production display through the new Hybrid bottom sheet', () => {
    expect(existsSync(sheetPath)).toBe(true);
    expect(host).toContain("import BoonActivatedSheet from './BoonActivatedSheet'");
    expect(host).toContain('<BoonActivatedSheet visible={visible} boon={boon} onClose={close} />');
    expect(sheet).toContain('<HybridSheetShell');
    expect(sheet).toContain('useRewardImpactHybrid');
    expect(sheet).toContain('RewardImpactRings');
  });

  // зачем (владелец, 2026-09-21): пять «тихих» бонусов переведены на героический
  // модал BoonHeroSheet — такой же, как у Супервоскресенья. Развилка идёт по
  // наличию эмблемы, а не по списку id: список можно забыть пополнить, и человек
  // молча увидит старую заглушку.
  test('routes the five quiet boons to the hero sheet', () => {
    expect(sheet).toContain("import BoonHeroSheet from './BoonHeroSheet'");
    expect(sheet).toContain('hasBoonHeroEmblem(props.boon)');
    expect(sheet).toContain('<BoonHeroSheet visible={props.visible} boon={props.boon} lang={lang} onClose={props.onClose} />');
  });

  // зачем (владелец, 2026-09-21): владелец НЕ МОЖЕТ увидеть эти пять модалов на
  // своём телефоне — BoonActivatedHost гасит их при премиуме
  // (FREE_ONLY_VISUAL_BOONS), и каждый выпадает лишь в свой день недели.
  // Кнопки в витрине DEV Hub — единственный способ проверить их глазами,
  // поэтому они под сторожем: удалят — и проверять снова будет нечем.
  test('every quiet boon stays reachable from the DEV showcase', () => {
    const showcase = readFileSync(
      join(process.cwd(), 'components', 'dev', 'motion_showcase', 'sections', 'celebrations.tsx'),
      'utf8',
    );
    expect(showcase).toContain("import BoonActivatedSheet from '../../../BoonActivatedSheet'");
    // Витрина обязана идти через развилку BoonActivatedSheet, а не звать
    // BoonHeroSheet напрямую: иначе она покажет экран, которого человек не увидит.
    expect(showcase).toContain('<BoonActivatedSheet visible={visible} boon={boon} onClose={onClose} />');
    for (const boon of ['streak_saver', 'energy_free_window', 'turbo_regen', 'flashcard_friday', 'speaking_saturday']) {
      expect(showcase).toContain(`'${boon}'`);
    }
  });

  test('uses the shared idempotent animated dismiss path for the CTA', () => {
    expect(shell).toContain('requestDismiss: dismissSheet');
    expect(shell).toContain("typeof children === 'function'");
    expect(sheet).toContain('{({ requestDismiss }) => (');
    expect(sheet).toContain('onPress={requestDismiss}');
    expect(sheet).not.toContain('onPress={onClose}');
    expect(sheet).not.toContain('onPress={handleClose}');
  });

  test('uses themed accessible controls and the existing boon art', () => {
    // зачем (2026-09-21): сторож требовал `weeklyBoonIconSource(boon, themeMode)`,
    // но этой строки в файле нет давно — герой-заглушка был заменён на
    // RetiredRasterFallback ещё до правки, и сторож падал, стерегя несуществующее.
    // Охраняем то, что реально есть: fallback-ветка рисует героя от темы.
    expect(sheet).toContain('<RetiredRasterFallback kind="boon"');
    expect(sheet).toContain('accessible={false}');
    expect(sheet).toContain('accessibilityLabel={ctaLabel}');
    expect(sheet).toContain('accessibilityHint={closeLabel}');
    expect(sheet).toContain('accessibilityRole="header"');
    expect(sheet).toContain('backdropAccessible={false}');
    expect(shell).toContain('accessibilityViewIsModal');
    expect(sheet).toContain('backgroundColor: t.accent');
    expect(sheet).toContain('buttonForegroundForBackground(t.accent)');
    expect(sheet).toContain('readableOn(t.accent, t.bgCard, 4.5)');
  });

  test.each(BUSINESS_SHEET_PALETTES)('derives AA text colors on the actual sheet palette', (theme) => {
    expect(colorContrast(buttonForegroundForBackground(theme.accent), theme.accent)).toBeGreaterThanOrEqual(4.5);
    expect(colorContrast(readableOn(theme.accent, theme.bgCard, 4.5), theme.bgCard)).toBeGreaterThanOrEqual(4.5);
  });

  test('keeps the sheet informational with one finite ring, no dust, and no reduced-motion decoration', () => {
    expect(sheet).toContain('show={impact.showRings && !impact.reduceMotion}');
    expect(sheet).toContain('ringCount={1}');
    expect(sheet).toContain('dustCount={0}');
    expect(sheet).not.toContain('registerXP');
    expect(sheet).not.toContain('applyGift');
    expect(sheet).not.toContain('claim');
  });

  test('resolves title and description on distinct shared-token ladder steps', () => {
    expect(sheet).toContain('<Animated.View style={impact.styles.text}>');
    expect(sheet).toContain('<Animated.View style={impact.styles.subtitle}>');
    expect(impactHook).toContain('subtitleOpacity');
    expect(impactHook).toContain('subtitleY');
    expect(impactHook).toContain('subtitleOpacity.value = withDelay(CHK.ladder[2]');
    expect(impactHook).toContain('cancelAnimation(subtitleOpacity)');
    expect(impactHook).toContain('cancelAnimation(subtitleY)');
    expect(impactHook).toContain('subtitle: subtitleStyle');
  });

  test('supports 200% text and scroll/reflow while keeping the CTA outside the scroll area', () => {
    expect(sheet).toContain('<ScrollView');
    expect(sheet).toContain('maxFontSizeMultiplier={2}');
    expect(sheet.indexOf('</ScrollView>')).toBeLessThan(sheet.indexOf('<PressableHybrid'));
  });
});
