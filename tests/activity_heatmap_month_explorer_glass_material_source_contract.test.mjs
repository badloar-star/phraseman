import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'ActivityHeatmap365.tsx'),
  'utf8',
);
const modal = source.slice(source.indexOf('function MonthExplorerModal('), source.indexOf('function ActivityHeatmap365()'));

assert.match(source, /import \{ liquidGlassTokens \} from '\.\.\/constants\/liquidGlassThemePalette';/);
assert.match(source, /import \{ LinearGradient \} from '\.\/SafeLinearGradient';/);
assert.match(modal, /const monthGlass = liquidGlassTokens\(liquidGlassThemeId\);/);
assert.match(modal, /colors=\{\[monthGlass\.bgTop, monthGlass\.bgBottom\]\}/);
// 04.10 (overlays-more OM-MONTH-DAY / OM-MONTH-COMPARE — эталон): календарь и сравнение — секции без
// карточек; клетки графитовые, день с практикой светлеет; плашка дня и карточки месяцев — тон темы.
assert.match(modal, /testID="activity-365-month-calendar" style=\{styles\.monthSection\}/);
assert.match(modal, /testID="activity-365-month-comparison" style=\{styles\.comparisonSection\}/);
assert.match(modal, /monthGlass\.opaqueControl,\s*withAlpha\(monthGlass\.text, 0\.4\)/);
assert.match(modal, /backgroundColor: palette\[cell\.day\.level\]/);
assert.match(modal, /styles\.dayInfo, \{ backgroundColor: monthGlass\.opaqueControl \}/);
assert.match(modal, /styles\.compareCard, \{ backgroundColor: monthGlass\.opaqueControl \}/);
assert.doesNotMatch(source, /entity:/);

console.log('activity heatmap month glass material contract: PASS');
