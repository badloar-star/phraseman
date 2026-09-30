import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/AiDialogBriefingScreen.tsx', import.meta.url), 'utf8');

test('dialog briefing keeps the real purchase/start paths on Liquid Glass surfaces', () => {
  assert.match(source, /import \{ glassFill \} from '\.\/GlassSurface';/);
  assert.ok((source.match(/glassFill\(t\.bgCard, 0\.46\)/g) ?? []).length >= 2);
  assert.match(source, /purchase\.balanceRunes >= purchase\.priceRunes \? purchase\.onBuy : purchase\.onTopUp/);
  assert.match(source, /onPress=\{onStart\}/);
});

test('briefing CTA remains outside scenario scrolling and inside the safe screen', () => {
  assert.match(source, /<ScrollView[\s\S]*?<\/ScrollView>[\s\S]*?<Reanimated\.View[\s\S]*?styles\.fixedFooter/s);
  assert.match(source, /<SafeAreaView testID="screen-ai-dialog-briefing" style=\{\{ flex: 1 \}\}>/);
});
