import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/mistake_practice_session.tsx', import.meta.url), 'utf8');

test('mistake practice keeps real answer flows while structural surfaces use Liquid Glass', () => {
  // 30.09 (2.0): стекло непрозрачное (память владельца «стекло 2.0 = непрозрачное»),
  // экраны ошибок переведены на useLv2Glass + g.opaque* (efe19ae9d); полупрозрачный glassFill снят.
  assert.match(source, /useLv2Glass\(\)/);
  assert.match(source, /backgroundColor: g\.opaque(Card|Control|Sheet)/);
  assert.match(source, /onPress=\{\(\) => void submitVerdict\(/);
  assert.match(source, /<MistakeVerdictPanel/);
  assert.match(source, /<MistakeSessionFinale/);
});

test('mistake practice frame protects both system safe areas', () => {
  assert.match(source, /<SafeAreaView style=\{styles\.screen\}>/);
  assert.match(source, /paddingBottom: 120/);
});
