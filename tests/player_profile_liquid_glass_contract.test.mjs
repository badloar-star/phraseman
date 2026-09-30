import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODAL = fs.readFileSync(path.join(ROOT, 'components', 'PlayerProfileModal.tsx'), 'utf8');
// Визитка 2.0 (перенос макета profile-card-pro.html, 2026-09-30): соц. логика и тело
// визитки вынесены в components/profile-card/* — контракт читает их вместе.
const PARTS = ['usePlayerProfileSocial.ts', 'ProfileCardBody.tsx', 'ProfileCardFooter.tsx']
  .map((file) => fs.readFileSync(path.join(ROOT, 'components', 'profile-card', file), 'utf8'))
  .join(String.fromCharCode(10));
const SOURCE = [MODAL, PARTS].join(String.fromCharCode(10));

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

test('player card is the approved floating card (profile-card-pro.html) with both safe areas', () => {
  assert.match(SOURCE, /normalizeSafeAreaBottomInset\(insets\.bottom\)/);
  assert.match(SOURCE, /topInset/);
  // Визитка не зависит от темы: у каждого вида своя палитра из макета.
  assert.match(MODAL, /backgroundColor:\s*tokens\.bg/);
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
  // Ранг = титул (D93): «Эрудит · ранг 10», как в макете.
  assert.match(SOURCE, /profileCardRankLabel/);
});
