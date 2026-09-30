import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'paywall', 'PaywallLiquidGlass.tsx'),
  'utf8',
);

test('A-G keep the scroll viewport below the fixed top safe area', () => {
  assert.match(source, /<ScrollView style=\{\[S\.scrollView, \{ marginTop: insets\.top \}\]\}/);
  assert.match(source, /contentContainerStyle=\{\[S\.scrollContent, \{ paddingTop: 8 \}\]\}/);
  assert.match(source, /scrollView:\s*\{[^}]*flex:\s*1[^}]*overflow:\s*'hidden'/);
  assert.doesNotMatch(source, /contentContainerStyle=\{\[[^\]]*paddingTop:\s*insets\.top/);
});

test('the checkout dock remains outside the clipped viewport with its bottom inset', () => {
  const scrollClose = source.indexOf('</ScrollView>');
  const dockOpen = source.indexOf('<View style={[S.dock', scrollClose);
  assert.ok(scrollClose >= 0 && dockOpen > scrollClose);
  assert.match(source.slice(dockOpen), /paddingBottom:\s*Math\.max\(insets\.bottom, 12\) \+ 12/);
});
