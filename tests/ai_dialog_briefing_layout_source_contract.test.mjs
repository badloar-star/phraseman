import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/AiDialogBriefingScreen.tsx', import.meta.url), 'utf8');

test('dialogue briefing keeps its primary action fixed below the scrollable briefing', () => {
  const scrollEnd = source.indexOf('</ScrollView>');
  const footer = source.indexOf('style={styles.fixedFooter}');

  assert.ok(scrollEnd >= 0, 'briefing needs a scrollable content region');
  assert.ok(footer > scrollEnd, 'start or purchase action must remain visible below that region');
});

test('fixed briefing action preserves real start and paid-unlock paths', () => {
  assert.match(source, /onPress=\{onStart\}/);
  assert.match(source, /onPress=\{purchase\.balanceRunes >= purchase\.priceRunes \? purchase\.onBuy : purchase\.onTopUp\}/);
  assert.match(source, /testID="ai-dialog-briefing-unlock"/);
});
