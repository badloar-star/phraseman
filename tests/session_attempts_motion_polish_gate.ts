import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');
const hud = read('components/session_attempts/SessionAttemptsHud.tsx');
const motion = read('constants/motionHybrid.ts');
const lesson = read('app/lesson1.tsx');
const catalog = read('docs/v2/mockups/25-learning-v2-motion-catalog.html');

for (const token of [
  'lossPopScale',
  'lossDropPx',
  'lossTiltDeg',
  'refillStartScale',
  'refillStaggerMs',
  'refillSpring',
  'haloEndScale',
]) {
  assert.ok(motion.includes(token), `missing polished motion token: ${token}`);
}
assert.ok(hud.includes('withDelay') && hud.includes('withSpring'), 'refill must use stagger + spring');
assert.ok(hud.includes('haloStyle'), 'loss/refill needs a local halo accent');
assert.ok(
  catalog.includes('data-motion-example="attempt-refill"')
    && catalog.includes('data-motion-example="attempt-refill-reduced"'),
  'motion catalog must demonstrate refill and its reduced-motion state',
);

assert.ok(!lesson.includes('LessonEnergyLightning'), 'active lesson must not render the energy asset');
assert.ok(
  lesson.includes('confirmSpendOneRef.current(') && lesson.includes('Энергия при входе в урок'),
  'removing the lesson asset must not remove the one-time entry debit',
);

console.log('PASS polished attempt motion + lesson energy visibility gate');
