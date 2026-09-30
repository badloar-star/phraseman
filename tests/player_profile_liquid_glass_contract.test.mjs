import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'components', 'PlayerProfileModal.tsx'), 'utf8');

test('player profile uses real rank art with a neutral unknown state and no legacy avatar render', () => {
  assert.match(SOURCE, /resolvePlayerProfileVisibleRank/);
  assert.match(SOURCE, /coinRankRowForDisplay/);
  assert.match(SOURCE, /useMyCoinRank\(\)/);
  assert.match(SOURCE, /myRank:\s*myCoinRank/);
  assert.match(SOURCE, /publicRank:\s*publicRank/);
  assert.match(SOURCE, /player-profile-rank-placeholder/);
  assert.doesNotMatch(SOURCE, /<AvatarView\b/);
  assert.doesNotMatch(SOURCE, /<PremiumAvatarHalo\b/);
});

test('player profile is the approved opaque Liquid Glass sheet with both safe areas', () => {
  assert.match(SOURCE, /normalizeSafeAreaBottomInset\(insets\.bottom\)/);
  assert.match(SOURCE, /topInset/);
  assert.match(SOURCE, /backgroundColor:\s*g\.opaqueSheet/);
  assert.match(SOURCE, /testID="player-profile-modal-sheet"/);
});

test('player profile keeps all real social actions and the nested safety flows', () => {
  for (const token of [
    'player-profile-close',
    'player-profile-add-friend',
    'player-profile-report-user',
    'player-profile-activity-like',
    'sendFriendRequest',
    "result === 'sent'",
    "result === 'already_friends'",
    "result === 'already_sent'",
    "result === 'self'",
    "result === 'not_found'",
    "result === 'error'",
    'rememberSyntheticFriendRequest',
    'deleteFriend',
    'wasFriend',
    'sendFriendActivityLike',
    'removeFriendActivityLike',
    'fetchActivityLikeState',
    'fetchActivityLikeTotal',
    'toggleSyntheticLike',
    'ThemedConfirmModal',
    'ReportUserModal',
    'InGameToast',
  ]) assert.ok(SOURCE.includes(token), `missing ${token}`);
});

test('player profile removes the retired XP, aura, profile-card and energy-perk presentation', () => {
  for (const token of [
    'ProfileCardMotionFx',
    'profile-card-energy-upgrade-bonus',
    'player-profile-upgrade-card',
    'player-profile-preview-buy',
  ]) assert.ok(!SOURCE.includes(token), `legacy profile token remains: ${token}`);
  assert.doesNotMatch(SOURCE, /['"`]XP['"`]/, 'legacy XP label remains');
});

test('technical rank naming is not shown to users', () => {
  assert.ok(!SOURCE.includes('Монетный ранг'));
  assert.ok(!SOURCE.includes('coin rank'));
  assert.ok(SOURCE.includes('Ранг игрока'));
});
