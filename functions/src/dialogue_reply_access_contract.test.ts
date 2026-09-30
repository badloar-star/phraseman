import { dialogueReplyAccessDecision } from './dialogue_reply_access_contract';

test('free accounts can use ranked scenarios but cannot invoke the Plus-only companion', () => {
  expect(dialogueReplyAccessDecision('scenario', false)).toBe('allow');
  expect(dialogueReplyAccessDecision('companion', false)).toBe('plus_required');
});

test('Plus accounts can use ranked scenarios and the companion', () => {
  expect(dialogueReplyAccessDecision('scenario', true)).toBe('allow');
  expect(dialogueReplyAccessDecision('companion', true)).toBe('allow');
});
