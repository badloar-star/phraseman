import * as fs from 'fs';
import * as path from 'path';

import {
  decideDailyPollVote,
  isDailyPollDateKeyInWindow,
  normalizeDailyPollCounts,
  normalizeDailyPollVoteInput,
} from './daily_poll_core';

const NOW = Date.parse('2026-10-01T12:00:00Z');
const poll = (over: Record<string, unknown> = {}) => ({
  dateKey: '2026-10-01',
  status: 'active',
  options: [{ id: 'a', text: { ru: 'Короткие занятия' } }, { id: 'b', text: { ru: 'С друзьями' } }],
  counts: { a: 3, b: 1 },
  voteCount: 4,
  ...over,
});
const input = (optionId = 'a', dateKey = '2026-10-01') => ({ dateKey, optionId, stableId: null });

describe('daily poll vote validation', () => {
  it('принимает голос и возвращает свежие счётчики (+1)', () => {
    const d = decideDailyPollVote({ poll: poll(), existingVoteOptionId: null, input: input('b'), nowMs: NOW });
    expect(d).toEqual({ kind: 'accept', optionId: 'b', counts: { a: 3, b: 2 }, voteCount: 5 });
  });

  it('повторный голос не пишется: already_voted с прежним выбором и неизменными счётчиками', () => {
    const d = decideDailyPollVote({ poll: poll(), existingVoteOptionId: 'a', input: input('b'), nowMs: NOW });
    expect(d).toEqual({ kind: 'already_voted', optionId: 'a', counts: { a: 3, b: 1 }, voteCount: 4 });
  });

  it('неверный вариант — invalid-argument', () => {
    const d = decideDailyPollVote({ poll: poll(), existingVoteOptionId: null, input: input('z'), nowMs: NOW });
    expect(d).toEqual({ kind: 'reject', code: 'invalid-argument', reason: 'daily_poll_option_invalid' });
  });

  it('нет опроса — not-found', () => {
    const d = decideDailyPollVote({ poll: null, existingVoteOptionId: null, input: input(), nowMs: NOW });
    expect(d).toEqual({ kind: 'reject', code: 'not-found', reason: 'daily_poll_not_found' });
  });

  it('опрос в архиве — голос не принимается', () => {
    const d = decideDailyPollVote({ poll: poll({ status: 'archived' }), existingVoteOptionId: null, input: input(), nowMs: NOW });
    expect(d).toMatchObject({ kind: 'reject', reason: 'daily_poll_archived' });
  });

  it('старый опрос (вне окна ±1 день) — голос не принимается', () => {
    const d = decideDailyPollVote({
      poll: poll({ dateKey: '2026-09-20' }), existingVoteOptionId: null, input: input('a', '2026-09-20'), nowMs: NOW,
    });
    expect(d).toMatchObject({ kind: 'reject', reason: 'daily_poll_not_today' });
  });

  it('сломанный опрос (1 вариант) не принимает голосов', () => {
    const d = decideDailyPollVote({
      poll: poll({ options: [{ id: 'a' }] }), existingVoteOptionId: null, input: input(), nowMs: NOW,
    });
    expect(d).toMatchObject({ kind: 'reject', reason: 'daily_poll_options_broken' });
  });

  it('окно даты: вчера/сегодня/завтра да, послезавтра нет', () => {
    expect(isDailyPollDateKeyInWindow('2026-09-30', NOW)).toBe(true);
    expect(isDailyPollDateKeyInWindow('2026-10-01', NOW)).toBe(true);
    expect(isDailyPollDateKeyInWindow('2026-10-02', NOW)).toBe(true);
    expect(isDailyPollDateKeyInWindow('2026-10-03', NOW)).toBe(false);
  });

  it('разбор входа отбрасывает мусор', () => {
    expect(() => normalizeDailyPollVoteInput(null)).toThrow('request_object_required');
    expect(() => normalizeDailyPollVoteInput({ dateKey: '01.10.2026', optionId: 'a' })).toThrow('date_key_invalid');
    expect(() => normalizeDailyPollVoteInput({ dateKey: '2026-10-01', optionId: 'a.b' })).toThrow('option_id_invalid');
    expect(normalizeDailyPollVoteInput({ dateKey: '2026-10-01', optionId: 'a', stableId: ' u1 ' }))
      .toEqual({ dateKey: '2026-10-01', optionId: 'a', stableId: 'u1' });
  });

  it('счётчики: только существующие варианты, мусор в ноль', () => {
    expect(normalizeDailyPollCounts(poll({ counts: { a: -2, b: 'x', ghost: 9 } }))).toEqual({ a: 0, b: 0 });
  });
});

describe('daily poll callable contract', () => {
  const src = fs.readFileSync(path.join(__dirname, 'daily_poll_vote.ts'), 'utf8');
  it('App Check не включён, голос и счётчик — в одной транзакции', () => {
    expect(src).toContain('HOT_CALLABLE_OPTIONS');
    expect(src).not.toMatch(/enforceAppCheck\s*:\s*true/);
    expect(src).toContain('runTransaction');
    expect(src).toContain('transaction.create(voteRef');
    expect(src).toContain('FieldValue.increment(1)');
  });
  it('экспортирован из index.ts', () => {
    const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(index).toMatch(/export \{ dailyPollVote \} from "\.\/daily_poll_vote"/);
  });
  it('firestore.rules: клиент не пишет голоса и счётчики, админ пишет опросы', () => {
    const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
    const block = rules.slice(rules.indexOf('match /daily_polls/{dateKey}'));
    expect(block).toContain('allow read: if request.auth != null;');
    expect(block).toMatch(/match \/votes\/\{uid\} \{\s*allow read: if isAdmin\(\);\s*allow write: if false;/);
    expect(block).toContain("affectedKeys().hasAny(['counts', 'voteCount', 'lastVoteAtMs'])");
  });
});
