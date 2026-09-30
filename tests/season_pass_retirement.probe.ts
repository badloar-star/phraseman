import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const { PREMIUM_CONTEXT_SET } = require('../app/premium_context') as { PREMIUM_CONTEXT_SET: Set<string> };
assert.equal(PREMIUM_CONTEXT_SET.has('season_pass_lane'), false);
assert.equal(PREMIUM_CONTEXT_SET.has('onboarding_plan'), true);
for (const file of [
  'app/premium_context.ts',
  'app/paywall_copy.ts',
  'app/paywall_entry_contract.ts',
  'components/paywall/PaywallContextIcons.tsx',
  'components/dev/paywallDevContexts.ts',
  'components/dev/motion_showcase/sections/screens_profile.tsx',
  'components/dev/motion_showcase/sections/screens_arena_social.ts',
  'app/pearl_store_retired.ts',
  'app/shards_system.ts',
  'app/shop_catalog.ts',
  'constants/avatar_auras.ts',
  'app/public_profile_snapshot.ts',
  'components/PlayerProfileModal.tsx',
  'functions/src/public_profile_projection.ts',
]) {
  // 30.09: файл, удалённый целиком (например, constants/avatar_auras.ts по D108), следов
  // сезонного пропуска тоже не несёт — это не провал, а более полное удаление.
  if (!fs.existsSync(path.join(root, file))) continue;
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.equal(/season.?pass|seasonProfileFrameId|SEASON_AVATAR_AURA_IDS|season_cosmetics|devSeasonProfileFrameEnabled/i.test(source), false, file);
}
assert.equal(fs.existsSync(path.join(root, 'app/season_pass.tsx')), false);
assert.equal(fs.existsSync(path.join(root, 'app/arena_season_pass.tsx')), false);
assert.equal(fs.existsSync(path.join(root, 'app/season_cosmetics.ts')), false);
assert.equal(fs.existsSync(path.join(root, 'app/season_cosmetics_model.ts')), false);
assert.equal(fs.existsSync(path.join(root, 'tests/season_cosmetics_atomicity.test.ts')), false);
assert.equal(fs.existsSync(path.join(root, 'tests/season_aura_account_preview_contract.test.ts')), false);
const functionsPackage = JSON.parse(fs.readFileSync(path.join(root, 'functions/package.json'), 'utf8')) as { scripts: Record<string, string> };
for (const name of ['deploy:safe', 'deploy:community-gift']) {
  const script = functionsPackage.scripts[name] ?? '';
  assert.equal(script.includes('functions:seasonRedeemConsumable'), false, name);
  assert.equal(script.includes('functions:leagueActivateGroupBoost'), false, name);
}
const giftProducerTest = fs.readFileSync(path.join(root, 'functions/src/gift_perk_producers_contract.test.ts'), 'utf8');
assert.equal(giftProducerTest.includes('season_pass.ts'), false);
assert.equal(giftProducerTest.includes('season_reward_apply.ts'), false);
const tournamentCore = fs.readFileSync(path.join(root, 'functions/src/tournament_core.ts'), 'utf8');
assert.equal(tournamentCore.includes('seasonTicketUsed'), false);
console.log('season pass client, projection, deploy and tournament residue retirement: 30 checks passed');
