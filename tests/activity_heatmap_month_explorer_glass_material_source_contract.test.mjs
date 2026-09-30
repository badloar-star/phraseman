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
assert.match(modal, /testID="activity-365-month-calendar"[\s\S]*backgroundColor: monthGlass\.card/);
assert.match(modal, /testID="activity-365-month-comparison"[\s\S]*backgroundColor: monthGlass\.sheet/);
assert.match(modal, /colors=\{\[monthGlass\.lightTint, 'transparent'\]\}/);
assert.match(modal, /backgroundColor: palette\[cell\.day\.level\]/);
assert.match(source, /entity:[\s\S]*borderWidth: 0/);

console.log('activity heatmap month glass material contract: PASS');
