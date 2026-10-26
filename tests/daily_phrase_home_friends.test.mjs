import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as phrase from '../app/friends_together/friend_phrase.ts';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const answer = (overrides = {}) => ({ v: 1, day: '2026-10-26', phraseId: 'en:today', optionId: 'a', correct: true, ...overrides });
test('Settings has no My week entry and retains notifications and themes', () => {
  const source = read('app/(tabs)/settings.tsx');
  assert.equal(source.includes('settings-my-week-row'), false);
  assert.equal(source.includes("router.push('/friends_week_mine'"), false);
  assert.ok(source.includes('settings-notifications-row'));
  assert.ok(source.includes('settings-themes-row'));
});
test('home shows only friends who answered the same phrase today, without exposing picks', () => {
  assert.equal(typeof phrase.answeredPhraseFriends, 'function');
  const pairs = {
    a: { friendUid: 'a', name: 'A', coinRank: 2, isPlus: true, phrase: answer() },
    b: { friendUid: 'b', name: 'B', phrase: answer({ correct: false }) },
    old: { friendUid: 'old', name: 'Old', phrase: answer({ day: '2026-10-25' }) },
    other: { friendUid: 'other', name: 'Other', phrase: answer({ phraseId: 'de:today' }) },
    missing: { friendUid: 'missing', name: 'Missing' },
    invalid: { friendUid: 'invalid', name: 'Invalid', phrase: { day: '2026-10-26', phraseId: 'en:today' } },
  };
  assert.deepEqual(phrase.answeredPhraseFriends(pairs, '2026-10-26', 'en:today'), [
    { uid: 'a', name: 'A', coinRank: 2, isPlus: true },
    { uid: 'b', name: 'B', coinRank: null, isPlus: false },
  ]);
  assert.deepEqual(phrase.answeredPhraseFriends(pairs, '2026-10-27', 'en:today'), []);
});
test('Friends keeps its poll, without a second daily phrase question', () => {
  const source = read('app/(tabs)/friends.tsx');
  assert.doesNotMatch(source, /<FriendPhraseCard\b/);
  assert.match(source, /const firstCard = dailyPollCard;/);
});
test('Home keeps its phrase action and records both correct and incorrect answers for friends', () => {
  const source = read('components/DailyPhraseCard.tsx');
  assert.match(source, /<DailyPhraseFriendsRow\b/);
  assert.match(source, /testID="home-v2-phrase-of-day"\s+onPress=\{openDetails\}/);
  const handler = source.slice(source.indexOf('const correct = isDailyPhraseQuestAnswerCorrect(questOptions, optionId);'));
  assert.ok(handler.indexOf('recordMyPhraseAnswer') >= 0);
  assert.ok(handler.indexOf('recordMyPhraseAnswer') < handler.indexOf('if (!correct)'));
});
