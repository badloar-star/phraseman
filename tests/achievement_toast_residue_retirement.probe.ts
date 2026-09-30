import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { EMPTY_OVERLAY_WANTS, OVERLAY_PRIORITY, resolveNextOverlay } from '../components/overlay_arbiter_core';

const root = path.resolve(__dirname, '..');
const source = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

assert.equal(existsSync(path.join(root, 'components/AchievementToast.tsx')), false);
assert.equal(existsSync(path.join(root, 'components/AchievementContext.tsx')), false);
assert.equal(source('components/overlay_arbiter_core.ts').includes('achievementToast'), false);
assert.equal(source('components/dev/motion_showcase/showcase_copy.ts').includes('achievement_toast_'), false);
assert.deepEqual(Object.keys(EMPTY_OVERLAY_WANTS).sort(), [...OVERLAY_PRIORITY].sort());
assert.equal(resolveNextOverlay(null, { coachToast: true, actionToast: true }), 'coachToast');
console.log('achievement toast residue retired');
