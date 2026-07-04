import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('admin compass day closing lab', () => {
  const compassLab = read('app/_admin_compass_lab.tsx');
  const modal = read('app/compass/compass_briefing_modal.tsx');
  const labsSection = read('components/admin_panel/sections/LabsSection.tsx');
  const stackPreview = read('components/admin_panel/CompassStackPreviewModal.tsx');
  const compassSection = read('components/admin_panel/sections/CompassSection.tsx');
  const adminUi = read('components/admin_panel/ui.tsx');

  it('registers the day-closing modal from Settings labs with a custom seed entry point', () => {
    expect(labsSection).toContain('admin-lab-day-closing-ritual');
    expect(labsSection).toContain("params: { panel: 'day_closing' }");
    expect(compassSection).toContain('admin-compass-day-closing');
    expect(adminUi).toContain('day closing custom seed');
  });

  it('keeps the lab preview local and seed-driven', () => {
    expect(compassLab).toContain('DAY_CLOSING_SEED_STORAGE_KEY');
    expect(compassLab).toContain('DEFAULT_DAY_CLOSING_SEED');
    expect(compassLab).toContain('admin-compass-day-closing-custom-seed');
    expect(compassLab).toContain('buildDayClosingDayFromSeed');
    expect(compassLab).toContain('formatCompactNumber');
    expect(compassLab).toContain('ignoreCompassFlag');
    expect(compassLab).not.toContain('firestore');
    expect(compassLab).not.toContain('collection(');
    expect(compassLab).not.toContain('getDocs(');
  });

  it('gives free tier a locked showcase with an upgrade bridge, without the huge Plus list', () => {
    // Решение 2026-07-02 (владелец): бесплатный после первого полного ритуала
    // получает ЗАПЕРТУЮ витрину с мостом к доступу — вместо молчаливого
    // исчезновения. Раскрывашка из ~20 пунктов Plus в ритуале ЗАПРЕЩЕНА
    // по-прежнему: короткий мост, не каталог.
    const panel = read('app/compass/compass_day_closing_panel.tsx');
    expect(modal).toContain('onDayClosingUpgrade');
    expect(panel).toContain('dayClosingLockedTeaser');
    expect(panel).toContain('PremiumGoldButton');
    expect(panel).toContain('COMPASS_OPEN_ACCESS');
    expect(panel).not.toContain('COMPASS_DAY_CLOSING_PLUS_MORE');
    expect(modal).not.toContain('closingPlusToggle');
    expect(modal).not.toContain('COMPASS_DAY_CLOSING_PLUS_MORE');
    expect(compassLab).not.toContain('Plus-раскрывашка');
    expect(compassSection).not.toContain('Plus-блок');
    expect(labsSection).not.toContain('Plus-раскрывашка');
  });

  it('keeps the reward celebration one-shot (no background animation loops)', () => {
    const panel = read('app/compass/compass_day_closing_panel.tsx');
    expect(panel).not.toContain('Animated.loop');
    expect(panel).not.toContain('withRepeat');
    expect(panel).toContain('hapticCelebrate');
    expect(panel).toContain('awardDayClosingOnce');
  });

  it('registers the Compass stacked-event preview with random seed controls', () => {
    expect(labsSection).toContain('admin-lab-compass-stack-open');
    expect(labsSection).toContain('CompassStackPreviewModal');
    expect(labsSection).toContain('makeCompassStackPreviewSeed');
    expect(stackPreview).toContain('buildCompassStackPreviewCards');
    expect(stackPreview).toContain('PanResponder.create');
    expect(stackPreview).toContain('admin-compass-stack-preview-modal');
    expect(stackPreview).toContain('admin-compass-stack-reroll');
    expect(stackPreview).toContain('releaseNotes');
    expect(stackPreview).toContain('collectibleDrop');
    expect(stackPreview).toContain('notifNudge');
    expect(adminUi).toContain('очередь стек модалки swipe preview');
  });

  it('does not bypass the Compass flag outside explicit dev previews', () => {
    expect(modal).toContain('ignoreCompassFlag = false');
    expect(modal).toContain('(!ignoreCompassFlag && !compassOn()) || !day');
  });

  it('keeps Compass modal actions above Android system navigation', () => {
    expect(modal).toContain("import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen'");
    expect(modal).toContain("import { useStableSafeAreaInsets } from '../stable_safe_area_metrics'");
    expect(modal).toContain('const bottomInset = normalizeSafeAreaBottomInset(insets.bottom)');
    expect(modal).toContain('const sheetBottomGap = Math.max(18, bottomInset + 10)');
    // Backdrop несёт safe-area отступ снизу (кнопки не под системной навигацией
    // Android). Обёрнут в Reanimated.View ради свайп-затемнения фона — важно, что
    // paddingBottom: sheetBottomGap по-прежнему на backdrop-слое.
    expect(modal).toContain('styles.backdrop, { paddingBottom: sheetBottomGap }');
    expect(modal).not.toContain("backdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 18");
  });
});
