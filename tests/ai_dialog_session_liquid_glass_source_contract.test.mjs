import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/ai_dialog_session.tsx', import.meta.url), 'utf8');

test('active dialogue chat uses Liquid Glass for neutral controls without rewriting money or access flows', () => {
  assert.match(source, /import \{ glassFill \} from '\.\.\/components\/GlassSurface';/);
  // 30.09: одна поверхность ушла с блоком дневного лимита (D111, 1e2f77929) — осталось 7.
  assert.ok((source.match(/glassFill\(t\.bgCard, 0\.46\)/g) ?? []).length >= 7);
  assert.match(source, /onPress=\{finishDialog\}/);
  assert.match(source, /onPress=\{\(\) => send\(input\)\}/);
  assert.match(source, /onPress=\{handleBuyExtraReplies\}/);
});

test('dialogue session still owns the full safe screen', () => {
  assert.match(source, /<SafeAreaView style=\{\{ flex: 1 \}\}>/);
});
