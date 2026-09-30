import assert from 'node:assert/strict';
import { HOME_REWARD_DEMO_MODES } from '../app/reward_flight_particles';

assert.deepEqual(
  HOME_REWARD_DEMO_MODES.map((mode) => [mode.runes > 0, mode.shards > 0]),
  [[true, true], [true, false], [false, true]],
);
for (const mode of HOME_REWARD_DEMO_MODES) {
  assert.equal(Object.hasOwn(mode, 'xp'), false);
  assert.equal(Object.hasOwn(mode, 'levelUps'), false);
  assert.equal(mode.runes > 0 || mode.shards > 0, true);
}
