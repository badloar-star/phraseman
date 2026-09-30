import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/mistakes_hub.tsx', import.meta.url), 'utf8');

test('active mistakes hub uses Liquid Glass cards while retaining its safe area and real routes', () => {
  assert.match(source, /import \{ glassFill \} from '\.\.\/components\/GlassSurface';/);
  assert.ok((source.match(/glassFill\(t\.bgCard, 0\.46\)/g) ?? []).length >= 4);
  assert.match(source, /edges=\{\['top', 'left', 'right'\]\}/);
  assert.match(source, /pathname: '\/mistake_practice_session'/);
  assert.match(source, /pathname: '\/mistakes_list'/);
});

test('mistakes hub retains its fixed start action and local refresh behavior', () => {
  assert.match(source, /HybridRefreshControl/);
  assert.match(source, /testID="mistakes-hub-start"/);
  assert.match(source, /useMistakePracticeStartGate\('mistakes_hub_start'\)/);
});
