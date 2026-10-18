import * as fs from 'fs';
import * as path from 'path';

import {
  assertHomePollV2StableIdentity,
  decideHomePollV2Vote,
  normalizeHomePollV2VoteInput,
} from './home_poll_v2_core';
import { applyHomePollV2VoteTransaction } from './home_poll_v2_vote';

const NOW = Date.parse('2026-10-19T12:00:00Z');
const set = {
  status: 'active',
  questions: [
    { id: 'q1', options: [{ id: 'a' }, { id: 'b' }] },
    { id: 'q2', options: [{ id: 'a' }, { id: 'b' }] },
  ],
  counts: { q1: { a: 3, b: 1 }, q2: { a: 2, b: 4 } },
};

describe('home poll v2 vote rules', () => {
  it('rejects an auth/payload account mismatch before any poll mutation', () => {
    expect(() => assertHomePollV2StableIdentity('account-a', 'account-b')).toThrow('home_poll_account_changed');
    expect(() => assertHomePollV2StableIdentity(null, 'account-b')).toThrow('home_poll_account_changed');
    expect(() => assertHomePollV2StableIdentity('account-a', 'account-a')).not.toThrow();
  });

  it('performs no poll read or write when callable auth resolves to another account', async () => {
    const setRef = { collection: jest.fn() };
    const transaction = { get: jest.fn(), set: jest.fn(), update: jest.fn() };
    await expect(applyHomePollV2VoteTransaction({
      db: {} as never,
      transaction: transaction as never,
      setRef: setRef as never,
      authUid: 'auth-b',
      input: { setId: 'p2-001', questionId: 'q1', optionId: 'a', dateKey: '2026-10-19', stableId: 'account-a' },
      startedAt: NOW,
      resolveStableUid: async () => 'account-b',
    })).rejects.toThrow('home_poll_account_changed');
    expect(setRef.collection).not.toHaveBeenCalled();
    expect(transaction.get).not.toHaveBeenCalled();
    expect(transaction.set).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it('increments only the selected option for one question', () => {
    expect(decideHomePollV2Vote({
      set,
      vote: null,
      input: { setId: 'p2-001', questionId: 'q1', optionId: 'b', dateKey: '2026-10-19', stableId: null },
      nowMs: NOW,
    })).toEqual({ kind: 'accept', counts: { a: 3, b: 2 }, voteCount: 5 });
  });

  it('treats an answered boolean as an idempotent duplicate without retaining the choice', () => {
    expect(decideHomePollV2Vote({
      set,
      vote: { answered: { q1: true } },
      input: { setId: 'p2-001', questionId: 'q1', optionId: 'a', dateKey: '2026-10-19', stableId: null },
      nowMs: NOW,
    })).toEqual({ kind: 'already_answered', counts: { a: 3, b: 1 }, voteCount: 4 });
  });

  it('rejects a question or option outside the immutable set', () => {
    const base = { setId: 'p2-001', dateKey: '2026-10-19', stableId: null };
    expect(decideHomePollV2Vote({ set, vote: null, input: { ...base, questionId: 'q9', optionId: 'a' }, nowMs: NOW }))
      .toMatchObject({ kind: 'reject', reason: 'home_poll_question_invalid' });
    expect(decideHomePollV2Vote({ set, vote: null, input: { ...base, questionId: 'q1', optionId: 'z' }, nowMs: NOW }))
      .toMatchObject({ kind: 'reject', reason: 'home_poll_option_invalid' });
  });

  it('normalizes bounded callable input', () => {
    expect(normalizeHomePollV2VoteInput({ setId: ' p2-001 ', questionId: 'q1', optionId: 'a', dateKey: '2026-10-19', stableId: ' user ' }))
      .toEqual({ setId: 'p2-001', questionId: 'q1', optionId: 'a', dateKey: '2026-10-19', stableId: 'user' });
    expect(() => normalizeHomePollV2VoteInput({ setId: '../x', questionId: 'q1', optionId: 'a' })).toThrow('home_poll_set_id_invalid');
  });
});

describe('home poll v2 persistence contract', () => {
  const callable = fs.readFileSync(path.join(__dirname, 'home_poll_v2_vote.ts'), 'utf8');
  const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
  const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');

  it('writes counters and answered booleans atomically without persisting selected option', () => {
    expect(callable).toContain('runTransaction');
    expect(callable).toContain('resolveStableUidForAuthInTransaction');
    expect(callable).toContain('applyHomePollV2VoteTransaction');
    expect(callable).toContain('resolveStableUid = resolveStableUidForAuthInTransaction');
    expect(callable.indexOf('assertHomePollV2StableIdentity(input.stableId, stableUid)')).toBeLessThan(callable.indexOf('const voteRef'));
    expect(callable).toContain('answered: { [input.questionId]: true }');
    expect(callable).toContain('FieldValue.increment(1)');
    expect(callable).not.toMatch(/transaction\.(?:set|create|update)\([^\n]+optionId/);
  });

  it('exports the callable and denies all direct client writes', () => {
    expect(index).toContain('export { homePollV2Vote } from "./home_poll_v2_vote"');
    const block = rules.slice(rules.indexOf('match /home_polls_v2/{setId}'));
    expect(block).toContain('allow read: if isAdmin();');
    expect(block).toMatch(/match \/votes\/\{uid\} \{\s*allow read, write: if false;/);
    expect(rules).toContain("collection != 'home_polls_v2'");
  });
});
