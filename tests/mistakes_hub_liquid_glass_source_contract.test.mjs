import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/mistakes_hub.tsx', import.meta.url), 'utf8');

test('active mistakes hub uses Liquid Glass cards while retaining its safe area and real routes', () => {
  // 30.09 (2.0): стекло непрозрачное (память владельца «стекло 2.0 = непрозрачное»),
  // экраны ошибок переведены на useLv2Glass + g.opaque* (efe19ae9d); полупрозрачный glassFill снят.
  assert.match(source, /useLv2Glass\(\)/);
  assert.ok((source.match(/g\.opaque(Card|Control|Sheet)/g) ?? []).length >= 4);
  assert.match(source, /edges=\{\['top', 'left', 'right'\]\}/);
  assert.match(source, /pathname: '\/mistake_practice_session'/);
  assert.match(source, /pathname: '\/mistakes_list'/);
});

test('mistakes hub retains its fixed start action and local refresh behavior', () => {
  assert.match(source, /HybridRefreshControl/);
  assert.match(source, /testID="mistakes-hub-start"/);
  assert.match(source, /useMistakePracticeStartGate\('mistakes_hub_start'\)/);
});
