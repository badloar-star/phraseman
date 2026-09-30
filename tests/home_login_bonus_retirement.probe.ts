import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
for (const marker of [
  'login_bonus_pending', 'loginBonus', 'setLoginBonus', 'themedToastChrome',
  "DeviceEventEmitter.addListener('xp_changed'",
]) {
  assert.equal(home.includes(marker), false, `Home still contains ${marker}`);
}
assert.equal(home.includes('HomeV2Header'), true);
assert.equal(home.includes('comeback_pending'), false);
