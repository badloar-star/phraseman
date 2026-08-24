import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const carouselPath = path.join(root, 'components/achievements/AchievementShelfCarousel.tsx');
const carousel = fs.existsSync(carouselPath) ? fs.readFileSync(carouselPath, 'utf8') : '';
const stageArtPath = path.join(root, 'components/achievements/AchievementShelfStageArt.tsx');
const stageArt = fs.existsSync(stageArtPath) ? fs.readFileSync(stageArtPath, 'utf8') : '';
const dockPath = path.join(root, 'components/achievements/AchievementCategoryDock.tsx');
const dock = fs.existsSync(dockPath) ? fs.readFileSync(dockPath, 'utf8') : '';
const motion = fs.readFileSync(path.join(root, 'constants/motionHybrid.ts'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'app/achievements_screen.tsx'), 'utf8');
const tabs = fs.readFileSync(path.join(root, 'app/(tabs)/_layout.tsx'), 'utf8');
test('shelf uses Museum Glass stage art and a snapping virtualized track', () => {
  expect(carousel).toContain("import AchievementShelfStageArt from './AchievementShelfStageArt'");
  expect(carousel).toContain('<AchievementShelfStageArt');
  expect(carousel).toContain('snapToInterval={itemWidth}');
  expect(carousel).toContain('decelerationRate="fast"');
  expect(carousel).toContain('accessibilityActions');
  expect(carousel).toContain('useReduceMotionPreference() ?? true');
  expect(carousel).not.toContain('BlurView');
});

it('keeps the category dock still until the OS motion preference resolves', () => {
  expect(dock).toContain('useReduceMotionPreference() ?? true');
});

test('the selected shelf collectible is large enough to read as a display object', () => {
  expect(carousel).toContain('Math.min(180, Math.round(itemWidth * 0.9))');
  expect(carousel).not.toContain('Math.min(156, Math.round(itemWidth * 0.84))');
  expect(carousel).not.toContain('Math.min(128, Math.round(itemWidth * 0.72))');
});

test('shelf motion numbers live in the shared hybrid dictionary', () => {
  expect(motion).toContain('export const ACHIEVEMENT_SHELF_HYBRID');
  expect(carousel).toContain('ACHIEVEMENT_SHELF_HYBRID');
});

test('showcase materials follow the active theme instead of fixed brass colors', () => {
  expect(carousel).toContain('achievementShelfMaterials');
  expect(carousel).toContain('materials.stageGradient');
  expect(stageArt).toContain('materials.shelfTopStart');
  expect(stageArt).toContain('materials.shelfFaceStart');
  expect(stageArt).toContain('materials.reflection');
  expect(carousel).not.toContain("t.gold + '44'");
  expect(carousel).not.toContain('rgba(255,239,193');
});

test('Museum Glass keeps the faceted shelf without a spotlight shape', () => {
  expect((stageArt.match(/<Path/g) ?? []).length).toBeGreaterThanOrEqual(2);
  expect(stageArt).toContain("overflow: 'hidden'");
  expect(stageArt).not.toContain('RadialGradient');
  expect(stageArt).not.toContain('galleryWashId');
  expect(stageArt).not.toContain('achievement-shelf-gallery-wash');
  expect(stageArt).not.toContain('<Rect width="240" height="156"');
  expect(stageArt).not.toContain('<Ellipse');
  expect(stageArt).not.toContain('<Circle');
  expect(stageArt).not.toContain('borderRadius: 999');
  expect(carousel).not.toContain('haloOuter');
  expect(carousel).not.toContain('haloCore');
});

test('selection reflection follows motion and cleanup contracts without ambient light work', () => {
  expect(carousel).not.toContain('lightProgress');
  expect(carousel).toContain('reflectionProgress');
  expect(carousel).not.toContain('withRepeat');
  expect(carousel).toContain('cancelAnimation');
  expect(carousel).toContain('return () =>');
  expect(carousel).not.toContain('runOnJS');
  expect(motion).not.toContain('lightBreathMs');
  expect(motion).toContain('reflectionMs');
  expect(motion).toContain('reflectionTravel');
  expect(carousel).toContain('detailProgress');
  expect(carousel).toContain('detailTranslateY');
});

test('shelf accessibility labels follow the runtime language', () => {
  expect(carousel).toContain('useLang');
  expect(carousel).toContain('triLang');
  expect(carousel).toContain("name: 'activate' as const");
  expect(carousel).toContain('achievementNameForLang(selectedItem, lang)');
  expect(carousel).toContain('onOpen(selectedItem)');
  expect(carousel).not.toContain("label: 'Следующая награда'");
  expect(carousel).not.toContain("label: 'Предыдущая награда'");
});

test('selection animation is not cancelled by a selected-id synchronization effect', () => {
  expect(carousel).toContain('const itemsKey = useMemo(');
  expect(carousel).not.toContain('[itemWidth, items.length, selectedIndex]');
});

test('category dock is centered, expands upward, and closes with Android Back', () => {
  expect(dock).toContain('testID="achievement-category-dock"');
  expect(dock).toContain('testID="achievement-category-dock-scrim"');
  expect(dock).toContain('accessibilityState={{ expanded: open }}');
  expect(dock).toContain('BackHandler');
  expect(dock).toContain('cancelAnimation(progress)');
  expect(dock).toContain('cancelAnimation(scrim)');
  expect(dock).toContain('accessibilityElementsHidden={!open}');
  expect(dock).toContain("importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}");
  expect(dock).toContain('ACHIEVEMENT_CATEGORY_DOCK_HYBRID');
  expect(dock).toContain('StyleSheet.absoluteFillObject');
  expect(motion).toContain('export const ACHIEVEMENT_CATEGORY_DOCK_HYBRID');
});

test('existing stack screen renders the shelf without adding a bottom tab', () => {
  expect(screen).toContain(
    "import AchievementShelfCarousel from '../components/achievements/AchievementShelfCarousel'",
  );
  expect(screen).toContain(
    "import AchievementCategoryDock from '../components/achievements/AchievementCategoryDock'",
  );
  expect(screen).toContain('<AchievementShelfCarousel');
  expect(screen).toContain('<AchievementCategoryDock');
  expect(screen).not.toContain('testID="achievement-shelf-category-filter"');
  expect(screen).not.toContain("colors={[color + '28', t.bgCard, t.bgSurface]}");
  expect(screen).toContain('ALL_ACHIEVEMENTS.filter(isVisibleAchievement)');
  expect(screen).toContain('<AchievementModal');
  expect(tabs).not.toContain('achievements_screen');
});

test('shelf is native UI without a raster cabinet or rectangular light beam', () => {
  expect(carousel).not.toContain('ExpoImage');
  expect(carousel).not.toContain('ACHIEVEMENT_SHELF_BACKDROP');
  expect(carousel).not.toContain('achievement-shelf-spotlight');
  expect(carousel).not.toContain('styles.cavity');
  expect(carousel).not.toContain('styles.shelfRail');
});
