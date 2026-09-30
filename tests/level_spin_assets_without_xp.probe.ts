import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const assetPath = path.join(__dirname, '..', 'app', 'level_spin_reward_assets.ts');
assert.equal(fs.existsSync(assetPath), false, 'retired level-spin assets module must be absent');
const rewardArtPath = path.join(__dirname, '..', 'components', 'LevelSpinRewardArt.tsx');
const rewardArtSource = fs.readFileSync(rewardArtPath, 'utf8');
assert.equal(
  rewardArtSource.includes('level_spin_reward_assets'),
  false,
  'compatibility reward art must not revive the retired spin asset import',
);
assert.equal(rewardArtSource.includes('xp_'), false, 'legacy XP artwork must not be imported or aliased');
console.log('retired level-spin asset module absent: PASS');
