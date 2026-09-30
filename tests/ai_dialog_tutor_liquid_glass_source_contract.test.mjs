import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/ai_dialog_tutor_session.tsx', import.meta.url), 'utf8');

test('active tutor dialogue uses glass for lesson completion and the reply field without changing actions', () => {
  assert.match(source, /import \{ glassFill \} from '\.\.\/components\/GlassSurface';/);
  assert.ok((source.match(/glassFill\(t\.bgCard, 0\.46\)/g) ?? []).length >= 2);
  assert.match(source, /onPress=\{onBack\}/);
  assert.match(source, /onPress=\{send\}/);
  assert.match(source, /<SafeAreaView style=\{\{ flex: 1 \}\}>/);
});
