import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import routeTargetModule from '../app/arena_route_target';

const {
  arenaRouteStudyTarget,
  arenaTargetRequestIdPrefix,
} = routeTargetModule;

test('Arena route target fails closed on missing, invalid or changed target', () => {
  assert.equal(arenaRouteStudyTarget('es', 'es'), 'es');
  assert.equal(arenaRouteStudyTarget(undefined, 'es'), null);
  assert.equal(arenaRouteStudyTarget('it', 'es'), null);
  assert.equal(arenaRouteStudyTarget('es', 'de'), null);
});

test('implicit request identities are target scoped', () => {
  assert.equal(arenaTargetRequestIdPrefix('queue', 'es'), 'queue_es');
  assert.equal(arenaTargetRequestIdPrefix('queue', 'de'), 'queue_de');
  assert.notEqual(arenaTargetRequestIdPrefix('queue', 'es'), arenaTargetRequestIdPrefix('queue', 'de'));
});

test('Arena tab remounts the hub for the active study target', () => {
  const source = fs.readFileSync(new URL('../app/(tabs)/arena.tsx', import.meta.url), 'utf8');
  assert.match(source, /useStudyTarget\(\)/u);
  assert.match(source, /<ArenaHubSurface\s+key=\{studyTarget\}\s+studyTarget=\{studyTarget\}/u);
});

test('every production Arena route accepts and propagates studyTarget', () => {
  const paths = [
    'app/arena_matchmaking.tsx',
    'app/arena_match.tsx',
    'app/arena_results.tsx',
    'app/arena_ranks.tsx',
    'app/arena_friend_duel.tsx',
    'app/arena_invite.tsx',
    'app/arena_today.tsx',
  ];
  for (const path of paths) {
    const source = fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.match(source, /studyTarget\??:\s*string/u, `${path} route params must include studyTarget`);
    assert.match(source, /useStudyTarget\(\)/u, `${path} must compare the route with the current target`);
    assert.match(source, /arenaRouteStudyTarget/u, `${path} must fail closed on route/current mismatch`);
  }
});

test('ArenaQuestion requires the expected target at the render boundary', () => {
  const source = fs.readFileSync(new URL('../components/arena/ArenaQuestion.tsx', import.meta.url), 'utf8');
  assert.match(source, /expectedTarget:\s*ArenaStudyTarget/u);
  assert.match(source, /adaptArenaTask\(task,\s*expectedTarget\)/u);
});
