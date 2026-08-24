import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const catalogPath = path.join(root, 'app', 'achievement_catalog_v2.ts');
const copyPath = path.join(root, 'app', 'achievement_copy_ru_v2.ts');
const cleanStreakPath = path.join(root, 'app', 'achievement_clean_streak_v2.ts');
const fail = (message) => {
  console.error(`[achievement-foundation-v2] FAIL: ${message}`);
  process.exit(1);
};

if (!fs.existsSync(catalogPath)) fail('app/achievement_catalog_v2.ts is missing');
if (!fs.existsSync(copyPath)) fail('app/achievement_copy_ru_v2.ts is missing');
if (!fs.existsSync(cleanStreakPath)) fail('app/achievement_clean_streak_v2.ts is missing');

const copySource = fs.readFileSync(copyPath, 'utf8');
const copyCompiled = ts.transpileModule(copySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: copyPath,
});
const copyModule = { exports: {} };
new Function('module', 'exports', 'require', copyCompiled.outputText)(
  copyModule,
  copyModule.exports,
  () => { throw new Error('achievement copy must not import runtime modules'); },
);

const source = fs.readFileSync(catalogPath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: catalogPath,
});
const module = { exports: {} };
new Function('module', 'exports', 'require', compiled.outputText)(
  module,
  module.exports,
  (id) => {
    if (id === './achievement_copy_ru_v2') return copyModule.exports;
    throw new Error(`catalog must not import runtime module ${id}`);
  },
);

const catalog = module.exports.ACHIEVEMENT_CATALOG_V2;
if (!Array.isArray(catalog)) fail('ACHIEVEMENT_CATALOG_V2 must be an array');

const active = catalog.filter((row) => row && row.retired !== true);
const retired = catalog.filter((row) => row && row.retired === true);
if (active.length !== 70) fail(`expected 70 active definitions, got ${active.length}`);
if (retired.length !== 9) fail(`expected 9 retired definitions, got ${retired.length}`);

const ids = catalog.map((row) => row.id);
if (new Set(ids).size !== ids.length) fail('achievement IDs must be unique');

const approvedCopy = copyModule.exports.ACHIEVEMENT_COPY_RU_V2;
if (!approvedCopy || Object.keys(approvedCopy).length !== 70) {
  fail(`expected 70 approved RU copy rows, got ${Object.keys(approvedCopy || {}).length}`);
}
const activeIdSet = new Set(active.map((row) => row.id));
const approvedCopyIds = Object.keys(approvedCopy);
if (
  approvedCopyIds.some((id) => !activeIdSet.has(id))
  || active.some((row) => !approvedCopy[row.id])
) fail('approved RU copy IDs must match the 70 active catalog IDs exactly');
const foundationDoc = fs.readFileSync(
  path.join(root, 'docs', 'design', 'ACHIEVEMENTS_FOUNDATION_CATALOG_2026-08-21.md'),
  'utf8',
);
for (const row of active) {
  const copy = approvedCopy[row.id];
  if (
    row.nameRu !== copy.title
    || row.conditionRu !== copy.condition
    || row.descRu !== copy.description
  ) fail(`${row.id} does not expose the approved RU title, condition, and story`);
  if (
    !foundationDoc.includes(`| \`${row.id}\` |`)
    || !foundationDoc.includes(copy.title)
    || !foundationDoc.includes(copy.description)
  ) fail(`${row.id} approved copy is missing from the foundation catalog document`);
}

const secret = active.filter((row) => row.secret === true);
if (secret.length !== 8) fail(`expected 8 secret definitions, got ${secret.length}`);

const expectedCategories = {
  streak: 14,
  xp: 17,
  shards: 7,
  league: 12,
  leagueLegend: 4,
  time: 6,
  access: 2,
  legend: 8,
};
const counts = Object.fromEntries(Object.keys(expectedCategories).map((key) => [key, 0]));
for (const row of active) {
  if (!(row.foundationGroup in counts)) fail(`unknown foundationGroup for ${row.id}`);
  counts[row.foundationGroup] += 1;
  if (!Number.isFinite(row.xp) || row.xp <= 0) fail(`${row.id} must grant positive XP`);
  if (
    !String(row.nameRu || '').trim()
    || !String(row.conditionRu || '').trim()
    || !String(row.descRu || '').trim()
  ) fail(`${row.id} lacks RU title, condition, or story copy`);
  if ('shards' in row || 'pearls' in row || 'shardReward' in row) fail(`${row.id} contains a pearl reward`);
  if (/lesson|flashcard|mistake|dialog|max_|exam|daily_task/i.test(row.id)) {
    fail(`${row.id} belongs to a retired learning surface`);
  }
}
for (const [group, expected] of Object.entries(expectedCategories)) {
  if (counts[group] !== expected) fail(`${group}: expected ${expected}, got ${counts[group]}`);
}

const loadTsModule = (relativePath, requireMap) => {
  const file = path.join(root, relativePath);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const loaded = { exports: {} };
  const localRequire = (id) => {
    if (id in requireMap) return requireMap[id];
    throw new Error(`${relativePath}: unexpected runtime import ${id}`);
  };
  new Function('module', 'exports', 'require', output)(loaded, loaded.exports, localRequire);
  return loaded.exports;
};

const evaluator = loadTsModule('app/achievement_evaluator_v2.ts', {
  './achievement_catalog_v2': module.exports,
});
const emptySnapshot = {
  streakDays: 0,
  cleanStreakDays: 0,
  totalXpBeforeAchievementRewards: 0,
  maxEligibleShardBalance: 0,
  reachedLeagueIds: [],
  championCount: 0,
  championLeagueIds: [],
  diamondPlusConsecutiveWeeks: 0,
  foregroundMs: 0,
  paidAccess: { plus: false, pro: false },
  activeDaysTotal: 0,
  accountAgeDays: 0,
  comebackQualified: false,
  unlockedBeforeBatch: new Set(),
};
const maxSnapshot = {
  streakDays: 1_000,
  cleanStreakDays: 365,
  totalXpBeforeAchievementRewards: 2_000_000,
  maxEligibleShardBalance: 10_000,
  reachedLeagueIds: Array.from({ length: 12 }, (_, i) => i),
  championCount: 10,
  championLeagueIds: [11],
  diamondPlusConsecutiveWeeks: 4,
  foregroundMs: 1_000 * 60 * 60_000,
  paidAccess: { plus: true, pro: true },
  activeDaysTotal: 500,
  accountAgeDays: 3 * 365,
  comebackQualified: true,
  unlockedBeforeBatch: new Set(),
};
const evaluated = evaluator.evaluateFoundationAchievements(maxSnapshot);
if (evaluated.length !== 70) fail(`max snapshot must unlock all 70, got ${evaluated.length}`);
if (evaluator.evaluateFoundationAchievements(emptySnapshot).length !== 0) {
  fail('empty snapshot must not unlock anything');
}
if (evaluator.evaluateFoundationAchievements({ ...emptySnapshot, totalXpBeforeAchievementRewards: 99 }).includes('xp_100')) {
  fail('xp_100 unlocked below its boundary');
}
if (!evaluator.evaluateFoundationAchievements({ ...emptySnapshot, totalXpBeforeAchievementRewards: 100 }).includes('xp_100')) {
  fail('xp_100 did not unlock at its boundary');
}
if (evaluator.evaluateFoundationAchievements({ ...emptySnapshot, streakDays: 365, cleanStreakDays: 364 }).includes('streak_clean_365')) {
  fail('clean-year award ignored streak safety evidence');
}
if (!evaluator.evaluateFoundationAchievements({ ...emptySnapshot, streakDays: 365, cleanStreakDays: 365 }).includes('streak_clean_365')) {
  fail('clean-year award did not unlock with clean evidence');
}
if (evaluator.evaluateFoundationAchievements({ ...emptySnapshot, reachedLeagueIds: [-1, 12] }).some((id) => id.startsWith('league_reached_'))) {
  fail('invalid league IDs produced a reached-league award');
}
const first49 = new Set(module.exports.ACTIVE_FOUNDATION_IDS.slice(0, 49));
const nonRecursiveLegends = evaluator.evaluateFoundationAchievements({
  ...emptySnapshot,
  comebackQualified: true,
  unlockedBeforeBatch: first49,
});
if (!nonRecursiveLegends.includes('legend_second_wind') || nonRecursiveLegends.includes('legend_full_cabinet')) {
  fail('legend pass became recursive');
}

const progress = loadTsModule('app/achievement_progress_v2.ts', {
  '@react-native-async-storage/async-storage': { default: {} },
  './account_generation': {},
  './storage_mutex': {},
});

const cleanStreak = loadTsModule('app/achievement_clean_streak_v2.ts', {});
const noSafety = cleanStreak.resolveCleanStreakDays(42, 0);
if (noSafety.cleanStreakDays !== 42 || noSafety.resetDetected !== false) {
  fail('clean streak without safety evidence must equal the current streak');
}
const afterSafety = cleanStreak.resolveCleanStreakDays(305, 300);
if (afterSafety.cleanStreakDays !== 5 || afterSafety.resetDetected !== false) {
  fail('clean streak must begin after the latest safety use');
}
const afterReset = cleanStreak.resolveCleanStreakDays(7, 300);
if (afterReset.cleanStreakDays !== 7 || afterReset.resetDetected !== true) {
  fail('a streak reset must start a new clean streak and retire old safety evidence');
}
let state = progress.createEmptyFoundationProgress();
state = progress.reduceFoundationShardBalance(state, 500);
state = progress.reduceFoundationShardBalance(state, 20);
if (state.maxEligibleShardBalance !== 500) fail('shard maximum regressed after spending');
for (const weekId of ['2026-W01', '2026-W02', '2026-W03', '2026-W04']) {
  state = progress.reduceFoundationLeagueResult(state, {
    weekId, points: 100, prevLeagueId: 8, newLeagueId: 8,
    myRank: 1, totalInGroup: 20, confirmed: true,
  });
}
const duplicate = progress.reduceFoundationLeagueResult(state, {
  weekId: '2026-W04', points: 100, prevLeagueId: 8, newLeagueId: 8,
  myRank: 1, totalInGroup: 20, confirmed: true,
});
if (duplicate.championWeeks.length !== 4) fail('duplicate league week inflated champion count');
if (duplicate.diamondPlusConsecutiveWeeks !== 4) fail('Diamond+ continuity must equal four weeks');

const unconfirmed = progress.reduceFoundationLeagueResult(progress.createEmptyFoundationProgress(), {
  weekId: '2026-W10', points: 500, prevLeagueId: 11, newLeagueId: 11,
  myRank: 1, totalInGroup: 20, confirmed: false,
});
if (unconfirmed.processedLeagueWeeks.length !== 0 || unconfirmed.reachedLeagueIds.length !== 0) {
  fail('unconfirmed league result must not create achievement evidence');
}

const copperZero = progress.reduceFoundationLeagueResult(progress.createEmptyFoundationProgress(), {
  weekId: '2026-W11', points: 0, prevLeagueId: 0, newLeagueId: 0,
  myRank: 10, totalInGroup: 20, confirmed: true,
});
if (copperZero.reachedLeagueIds.includes(0)) fail('Copper requires at least one point');

const requireSource = (relativePath, values) => {
  const body = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const value of values) {
    if (!body.includes(value)) fail(`${relativePath} is missing ${JSON.stringify(value)}`);
  }
};

requireSource('app/achievements_screen.tsx', [
  'loadConfirmedLeagueAchievementEvidence',
  "checkAchievements({ type: 'league_history', results: leagueHistory })",
]);
requireSource('app/achievements.ts', [
  "type: 'league_history'",
  "event.type === 'league_history'",
  "|| event.type === 'league_history'",
  'resolveCleanStreakDays',
  'resetDetected',
  "JSON.stringify({ streak: 0, day: '' })",
  'readCleanStreakDays(streakDays, accountToken)',
  'Math.max(progress.legacyChampionCount, progress.championWeeks.length)',
]);
requireSource('app/league_engine.ts', [
  'export const loadConfirmedLeagueAchievementEvidence',
  'confirmed: true',
  'Math.abs(result.newLeagueId - result.prevLeagueId) <= 1',
]);
requireSource('functions/src/revenuecat_shards.ts', [
  "environment !== 'PRODUCTION'",
  "eventType === 'INITIAL_PURCHASE'",
  "periodType !== 'TRIAL'",
  "eventType === 'NON_RENEWING_PURCHASE'",
  "achievement_access_plus_paid_v1: 'true'",
  "achievement_access_pro_paid_v1: 'true'",
]);
requireSource('app/cloud_sync.ts', [
  'ACHIEVEMENT_ACCESS_PLUS_PAID_KEY',
  'ACHIEVEMENT_ACCESS_PRO_PAID_KEY',
  'SERVER_OWNED_PROGRESS_KEYS',
]);
requireSource('firestore.rules', [
  "'achievement_access_plus_paid_v1'",
  "'achievement_access_pro_paid_v1'",
]);

console.log('[achievement-foundation-v2] PASS: catalog, evaluator, monotonic/idempotent progress');
