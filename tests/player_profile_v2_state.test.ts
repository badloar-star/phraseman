import assert from 'node:assert/strict';
// зачем (10.10): файл *.test.ts запускает основной юнит-раннер — глобальный test вместо node:test (иначе «0 тестов»).

import {
  resolvePlayerProfileV2State,
  resolvePlayerProfileVisibleRank,
} from '../app/player_profile_v2_state';

test('resolves the seven approved profile-card states with fail-closed action precedence', () => {
  assert.equal(resolvePlayerProfileV2State({ isMe: true }), 'self');
  assert.equal(resolvePlayerProfileV2State({ isMe: false }), 'readonly');
  assert.equal(resolvePlayerProfileV2State({ isMe: false, targetUid: 'u1' }), 'stranger');
  assert.equal(resolvePlayerProfileV2State({ isMe: false, targetUid: 'u1', friendRequestBusy: true }), 'add-busy');
  assert.equal(resolvePlayerProfileV2State({ isMe: false, targetUid: 'u1', friendRequestSent: true }), 'request-sent');
  assert.equal(resolvePlayerProfileV2State({ isMe: false, targetUid: 'u1', isFriend: true }), 'friend');
  assert.equal(resolvePlayerProfileV2State({ isMe: false, targetUid: 'u1', liked: true }), 'liked');
});

test('friend relationship remains authoritative even when the profile is liked', () => {
  assert.equal(resolvePlayerProfileV2State({
    isMe: false,
    targetUid: 'u1',
    isFriend: true,
    liked: true,
  }), 'friend');
});

test('does not invent a visible rank when neither self nor public authority supplied one', () => {
  assert.equal(resolvePlayerProfileVisibleRank({ isMe: false, publicRank: undefined, myRank: 8 }), null);
  assert.equal(resolvePlayerProfileVisibleRank({ isMe: false, publicRank: null, myRank: 8 }), null);
  assert.equal(resolvePlayerProfileVisibleRank({ isMe: false, publicRank: -1, myRank: 8 }), null);
  assert.equal(resolvePlayerProfileVisibleRank({ isMe: false, publicRank: 20, myRank: 8 }), null);
});

test('uses only the authoritative rank source for the profile owner being rendered', () => {
  assert.equal(resolvePlayerProfileVisibleRank({ isMe: true, myRank: 5, publicRank: 9 }), 5);
  assert.equal(resolvePlayerProfileVisibleRank({ isMe: false, myRank: 5, publicRank: 9 }), 9);
  assert.equal(resolvePlayerProfileVisibleRank({ isMe: true, myRank: null, publicRank: 9 }), null);
});
