import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'ActivityHeatmap365.tsx'),
  'utf8',
);
const modal = source.slice(source.indexOf('function MonthExplorerModal('), source.indexOf('function ActivityHeatmap365()'));

const headerIndex = modal.indexOf('<View style={styles.modalHeader}>');
const viewportIndex = modal.indexOf('testID="activity-365-month-viewport"');
const calendarIndex = modal.indexOf('testID="activity-365-month-calendar"');
const comparisonIndex = modal.indexOf('testID="activity-365-month-comparison"');

assert.match(source, /\bScrollView\b/);
assert.match(source, /import \{ useStableSafeAreaInsets \} from '\.\.\/app\/stable_safe_area_metrics';/);
assert.match(modal, /const insets = useStableSafeAreaInsets\(\);/);
assert.match(modal, /paddingTop: Math\.max\(52, insets\.top \+ 16\)/);
assert.match(modal, /paddingBottom: Math\.max\(28, insets\.bottom \+ 16\)/);
assert.ok(headerIndex >= 0 && viewportIndex > headerIndex, 'month controls must remain above the scroll viewport');
assert.ok(calendarIndex > viewportIndex, 'calendar must be reachable in the month viewport');
assert.ok(comparisonIndex > viewportIndex, 'comparison must be reachable in the month viewport');
assert.match(modal, /<ScrollView[\s\S]*testID="activity-365-month-viewport"[\s\S]*style=\{styles\.monthViewport\}[\s\S]*contentContainerStyle=\{\[[\s\S]*styles\.monthViewportContent,[\s\S]*paddingBottom: Math\.max\(28, insets\.bottom \+ 16\)[\s\S]*\]\}[\s\S]*showsVerticalScrollIndicator/);
assert.match(source, /monthViewport:[\s\S]*flex: 1,[\s\S]*minHeight: 0/);
assert.match(source, /monthViewportContent:[\s\S]*paddingBottom: 28/);
assert.match(modal, /onMonthChange\(monthKeys\[currentIndex - 1\]!\)/);
assert.match(modal, /onMonthChange\(monthKeys\[currentIndex \+ 1\]!\)/);
assert.match(modal, /setSelectedDay\(cell\.day\)/);

console.log('activity heatmap month viewport contract: PASS');
