import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx'), 'utf8');

test('Friends account generation change clears every account-owned card, search and modal state', () => {
  const start = source.indexOf('const applyAccountToken = (nextToken: AccountGenerationToken) => {');
  const end = source.indexOf('const subscription = subscribeAccountGeneration(applyAccountToken);', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const block = source.slice(start, end);

  for (const reset of [
    'setMyCode(null);',
    'setFriendCodeLoadError(false);',
    'setMyProfile(null);',
    'setReferralInvites([]);',
    'setAccessEndedOpen(false);',
    'setReferralCode(null);',
    "setCodeInput('');",
    'setIsSearching(false);',
    'setFoundUser(null);',
    'setSearchError(null);',
    'setIsAdding(false);',
    'setAddFeedback(null);',
    'setSelectedPlayer(null);',
    'setDeleteTarget(null);',
    'setGiftTarget(null);',
    'setSentGiftReceipt(null);',
    'setIncomingGiftModal(null);',
    'setActiveFriendQuest(null);',
    'setFriendQuestStarted(null);',
    'setPendingFriendQuestStarted(null);',
    'setFriendQuestCompleted(null);',
  ]) {
    expect(block).toContain(reset);
  }
});

test('Referral refresh results are scoped to the account generation that started the request', () => {
  const start = source.indexOf('const refreshReferralState = useCallback');
  const end = source.indexOf('const dismissReferralAccessEnded', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const block = source.slice(start, end);

  expect(block).toContain('const capturedAccount = captureAccountGeneration();');
  expect(block).toContain('isCurrentAccountGeneration(capturedAccount, capturedAccount.stableId)');
  expect(block).toContain('referralRefreshInFlightRef.current === entry');
});
