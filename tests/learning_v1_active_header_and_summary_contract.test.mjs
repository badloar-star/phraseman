import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const ROOT = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('active Learning V1 header shows only the real coin projection and energy in static liquid glass', () => {
  const source = read('app/(tabs)/lessons.tsx');
  const start = source.indexOf('const legacyLessonsResourceHud');
  const end = source.indexOf('  return (', start);
  assert.ok(start >= 0 && end > start, 'legacy resource HUD must remain an isolated active V1 block');
  const hud = source.slice(start, end);

  assert.match(source, /const legacyCoinRankBinding = useMyCoinRankBinding\(\);/);
  assert.match(source, /const legacyCoinBalanceBinding = useLegacyCoinBalanceBinding\(/);
  assert.match(source, /legacyCoinRankBinding\.ownerStableId === legacyCoinBalanceBinding\.ownerStableId/);
  assert.match(source, /legacyCoinRankBinding\.accountGeneration === legacyCoinBalanceBinding\.accountGeneration/);
  assert.match(source, /read\.quality !== "durable"/);
  assert.match(source, /isCurrentAccountGeneration\(token, ownerStableId\)/);
  assert.match(hud, /testID="legacy-lessons-liquid-resource"/);
  assert.match(hud, /colors=\{\[learnGlass\.opaqueControl, learnGlass\.opaqueCard\]\}/);
  assert.match(hud, /testID="legacy-lessons-coin-rank-asset"/);
  assert.match(hud, /testID="legacy-lessons-coin-balance"/);
  assert.match(hud, /router\.push\("\/coin_rank"\)/);
  assert.match(source, /const \{ energyReady: legacyEnergyReady \} = useEnergy\(\);/);
  assert.match(hud, /legacyEnergyReady \? \(/);
  assert.match(hud, /testID="legacy-lessons-energy-loading"/);
  assert.match(hud, /<EnergyBar/);
  assert.doesNotMatch(hud, /RuneBalanceChip|rune|руны|XP|gold/i);
  assert.doesNotMatch(hud, /coinRankRowForDisplay\(0\)/, 'unknown rank must stay neutral, never invent rank zero');
});

test('lesson menu projects the stored score to 0–3 stars and removes decimal and medal presentation', () => {
  const source = read('app/lesson_menu.tsx');

  assert.match(source, /export function lessonMenuStarCountFromPercent\(scorePercent: number\): 0 \| 1 \| 2 \| 3/);
  assert.match(source, /export function lessonMenuStarCount\(score: number\): 0 \| 1 \| 2 \| 3/);
  const functionStart = source.indexOf('export function lessonMenuStarCountFromPercent');
  const functionEnd = source.indexOf('function parseStoredLessonScore', functionStart);
  assert.ok(functionStart >= 0 && functionEnd > functionStart, 'star projection must remain independently testable');
  const compiled = ts.transpileModule(source.slice(functionStart, functionEnd), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  // зачем (30.09): меню урока больше не держит свои пороги — зовёт общую шкалу
  // lessonStarCountFromPercent (D36/D121). Вырезанный кусок без импорта падал
  // ReferenceError; подкладываем НАСТОЯЩУЮ шкалу, чтобы проверять реальные пороги.
  const scaleModule = { exports: {} };
  Function('module', 'exports', ts.transpileModule(read('app/lesson_star_scale.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText)(scaleModule, scaleModule.exports);
  const module = { exports: {} };
  Function('module', 'exports', 'lessonStarCountFromPercent', compiled)(
    module, module.exports, scaleModule.exports.lessonStarCountFromPercent,
  );
  const starCountFromPercent = module.exports.lessonMenuStarCountFromPercent;
  const starCount = module.exports.lessonMenuStarCount;
  assert.equal(starCountFromPercent(59), 1, '59% must project to 1 star');
  assert.equal(starCountFromPercent(60), 2, '60% must project to 2 stars');
  assert.equal(starCountFromPercent(84), 2, '84% must project to 2 stars');
  assert.equal(starCountFromPercent(85), 3, '85% must project to 3 stars');
  assert.equal(starCount(2.95), 1, 'the canonical persisted 0–5 score must convert to percent');
  assert.equal(starCount(4.25), 3, 'the canonical persisted 0–5 score must preserve the 85% boundary');
  assert.equal(starCount(Number.NaN), 0, 'unknown score must stay neutral');
  assert.match(source, /testID="lesson-menu-star-summary"/);
  assert.match(source, /if \(progress <= 0 && !scoreKnown\) return null/);
  assert.match(source, /const \[scoreKnown, setScoreKnown\] = useState\(cachedMenu\?\.scoreKnown \?\? false\)/);
  assert.match(source, /menuEnergyReady \? \(/);
  assert.match(source, /testID="lesson-menu-energy-loading"/);
  // зачем: три звезды теперь рисует вынесенный LessonMenuSummary (макет learn.html B2/B3)
  assert.match(read('components/lessons/LessonMenuGlass.tsx'), /Array\.from\(\{ length: 3 \}/);
  assert.doesNotMatch(source, /score\.toFixed\(1\)/);
  assert.doesNotMatch(source, /MEDAL_IMAGES|getEarnedDots|getMedalTier/);
});

test('the Liquid Glass catalogue background is scoped to active Learning V1 only', () => {
  const source = read('app/(tabs)/lessons.tsx');

  // зачем (R69, Сверка 15.10): градиент страницы начинается прозрачным слоем (шов под статус-баром), дальше прежняя тройка bgTop → bg → bgBottom, locations [0, 0.1, 0.55, 1]
  assert.match(source, /\{page === "lessons" \? \(\s*<LinearGradient[\s\S]*?colors=\{\[alphaHex\(learnGlass\.bgTop, 0\), learnGlass\.bgTop, learnGlass\.bg, learnGlass\.bgBottom\]\}\s*locations=\{\[0, 0\.1, 0\.55, 1\]\}/);
  assert.match(source, /backgroundColor:\s*page === "lessons" \|\| page === "dialogs"\s*\? "transparent"\s*:\s*t\.bgPrimary/);
});
