import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.cwd());
const failures = [];
const requireText = (source, value, label) => {
  if (!source.includes(value)) failures.push(`${label}: missing ${JSON.stringify(value)}`);
};
const rejectText = (source, value, label) => {
  if (source.includes(value)) failures.push(`${label}: forbidden ${JSON.stringify(value)}`);
};

const foundation = spawnSync(
  process.execPath,
  [path.join(root, 'scripts', 'guard_achievement_foundation_v2.mjs')],
  { cwd: root, encoding: 'utf8' },
);
if (foundation.status !== 0) failures.push((foundation.stderr || foundation.stdout || 'foundation guard failed').trim());

const achievements = fs.readFileSync(path.join(root, 'app', 'achievements.ts'), 'utf8');
const carousel = fs.readFileSync(
  path.join(root, 'components', 'achievements', 'AchievementShelfCarousel.tsx'),
  'utf8',
);
const dock = fs.readFileSync(
  path.join(root, 'components', 'achievements', 'AchievementCategoryDock.tsx'),
  'utf8',
);
const screen = fs.readFileSync(path.join(root, 'app', 'achievements_screen.tsx'), 'utf8');

requireText(achievements, 'ACHIEVEMENT_CATALOG_V2', 'catalog facade');
requireText(achievements, 'evaluateFoundationAchievements', 'evaluator');
requireText(achievements, 'reduceFoundationLeagueResult', 'league evidence');
requireText(achievements, 'if (!FOUNDATION_ACHIEVEMENT_EVENT_TYPES.has(event.type)) return [];', 'legacy event gate');
requireText(achievements, 'if (!def || def.retired) return;', 'retired unlock gate');
rejectText(achievements, "u('league_diamond')", 'obsolete league id');
rejectText(achievements, "u('comeback')", 'obsolete comeback id');

requireText(carousel, 'Math.min(180, Math.round(itemWidth * 0.9))', 'shelf size');
rejectText(carousel, 'Math.min(156, Math.round(itemWidth * 0.84))', 'old shelf size');
rejectText(carousel, 'Math.min(128, Math.round(itemWidth * 0.72))', 'old shelf size');
requireText(carousel, "import Reanimated, {\n  Easing,", 'reanimated component import');
rejectText(
  carousel,
  "import Reanimated, {\n  AccessibilityActionEvent,\n  Animated,",
  'react-native default import used as an animated component',
);
requireText(carousel, "name: 'activate' as const", 'carousel screen-reader activation');
requireText(carousel, 'achievementNameForLang(selectedItem, lang)', 'carousel accessible reward name');
requireText(carousel, 'onOpen(selectedItem)', 'carousel accessible open action');
requireText(carousel, 'const itemsKey = useMemo(', 'carousel stable dataset key');
requireText(carousel, 'useReduceMotionPreference() ?? true', 'carousel conservative reduced motion');
rejectText(
  carousel,
  '[itemWidth, items.length, selectedIndex]',
  'selection effect that cancels animated scrolling',
);

requireText(dock, 'cancelAnimation(progress)', 'category option animation cleanup');
requireText(dock, 'cancelAnimation(scrim)', 'category scrim animation cleanup');
requireText(dock, 'useReduceMotionPreference() ?? true', 'category dock conservative reduced motion');
requireText(dock, 'accessibilityElementsHidden={!open}', 'closed category accessibility hiding');
requireText(
  dock,
  "importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}",
  'closed category descendant hiding',
);

// Owner rule: production shows no statuette before it is earned. Developers
// may still reveal the complete catalog explicitly for visual QA.
requireText(screen, 'const earnedAchievements = useMemo(', 'earned-only visibility');
requireText(
  screen,
  'showAllAchievements || !!stateMap.get(achievement.id)?.unlockedAt',
  'earned visibility gate',
);
requireText(screen, "shelfCategory === 'all'\n      ? earnedAchievements", 'shelf earned source');
requireText(
  screen,
  'const visibleCountLabel = achievementCountPairLabel(unlockedCount, totalCount, lang);',
  'collection count label',
);
requireText(screen, 'achievementConditionForLang', 'achievement condition copy');
requireText(screen, 'testID="achievement-gallery-condition"', 'gallery condition block');
requireText(screen, 'testID="achievement-dossier-condition"', 'dossier condition block');
rejectText(screen, 'const collectionAchievements = useMemo(', 'locked award exposure');
rejectText(screen, '!achievement.secret || showAllAchievements', 'ordinary locked award exposure');
requireText(
  screen,
  'const fallbackStates = await loadAchievementStates().catch(() => []);',
  'achievement load failure recovery',
);
requireText(screen, 'shelfCategoryOptions.length > 2 && (', 'redundant category dock hiding');
requireText(screen, 'testID="achievements-back"', 'achievement back button identity');
requireText(
  screen,
  'accessibilityState={{ selected: showAllAchievements }}',
  'developer catalog toggle accessibility state',
);

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('achievement catalog v2 guard: ok\n');
}
