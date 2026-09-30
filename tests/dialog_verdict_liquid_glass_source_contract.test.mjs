import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/DialogVerdictScreen.tsx', import.meta.url), 'utf8');

test('dialogue result cards use translucent glass over the existing scene gradients', () => {
  assert.match(source, /import \{ glassFill \} from '\.\/GlassSurface';/);
  assert.ok((source.match(/glassFill\(t\.bgCard, 0\.46\)/g) ?? []).length >= 4);
  assert.match(source, /scene\.hueDeep \+ '52'/);
  assert.match(source, /outcomeColor \+ '1F'/);
});

test('dialogue result retains its real completion actions and semantic outcomes', () => {
  assert.match(source, /onPress=\{onRetry\}/);
  assert.match(source, /onPress=\{onExit\}/);
  assert.match(source, /onPress=\{onShowChat\}/);
  assert.match(source, /hapticSuccess\(\)/);
  assert.match(source, /hapticWarning\(\)/);
});
