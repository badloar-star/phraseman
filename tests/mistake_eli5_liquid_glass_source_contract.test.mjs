import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/MistakeEli5Modal.tsx', import.meta.url), 'utf8');

test('the active simple-explanation sheet follows the selected Liquid Glass tint', () => {
  assert.match(source, /import \{ glassFill \} from '\.\/GlassSurface';/);
  assert.match(source, /import \{ liquidGlassTokens \} from '\.\.\/constants\/liquidGlassThemePalette';/);
  assert.match(source, /const \{ theme: t, f, liquidGlassThemeId \} = useTheme\(\);/);
  assert.match(source, /const glass = liquidGlassTokens\(liquidGlassThemeId\);/);
  assert.match(source, /backgroundColor: glassFill\(t\.bgCard, 0\.46\)/);
});

test('the sheet retains its existing safe-area-aware bottom padding and dismiss paths', () => {
  assert.match(source, /paddingBottom: 20 \+ bottomInset/);
  assert.match(source, /onRequestClose=\{dismissSheet\}/);
  assert.match(source, /GestureDetector gesture=\{panGesture\}/);
});
