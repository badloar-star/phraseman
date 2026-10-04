// зачем (§126): вердикт «Моих ошибок» не ждёт запись журнала; события не теряются и не переставляются, награды ждут запись.
import { createMistakeAnswerJournal, type MistakeAnswerJournalDeps } from '../app/mistake_practice_answer_journal';
import type { MistakeEvent } from '../modules/mistake-practice/contracts';

const scope = { accountScope: 'owner-1', studyTarget: 'en' as const };

function ev(id: string, at: number): MistakeEvent {
  return {
    eventId: `mistake-practice:v1:${id}`,
    mistakeId: 'm1',
    cycleId: 'c1',
    type: 'practice_answered',
    occurredAtMs: at,
    studyTarget: 'en',
    payload: { correct: true, independent: true, localDay: '2026-10-04', mode: 'typed', support: 'none', exerciseId: 'x', sessionId: 's' },
  } as unknown as MistakeEvent;
}

function makeDeps(overrides: Partial<MistakeAnswerJournalDeps> = {}) {
  const writes: string[][] = [];
  const emptyJournal = { version: 1, accountScope: 'owner-1', studyTarget: 'en', events: [] };
  const deps: MistakeAnswerJournalDeps = {
    load: jest.fn(async () => emptyJournal as never),
    merge: jest.fn(async (input) => { writes.push(input.events.map((e) => e.eventId)); }),
    wait: jest.fn(async () => undefined),
    now: () => 0,
    ...overrides,
  };
  return { deps, writes };
}

describe('mistake answer journal (optimistic)', () => {
  beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => undefined); });

  it('returns the journal with the new event immediately, before the write finishes', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { deps } = makeDeps({ merge: jest.fn(async () => { await gate; }) });
    const journal = createMistakeAnswerJournal(scope, deps);
    await journal.current();
    const recorded = journal.record(ev('a', 1));
    expect(recorded.journal.events.map((e) => e.eventId)).toEqual(['mistake-practice:v1:a']);
    let settled = false;
    void recorded.done.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    await expect(recorded.done).resolves.toBe(true);
  });

  it('the next answer sees the previous one from memory and writes happen in order', async () => {
    const { deps, writes } = makeDeps();
    const journal = createMistakeAnswerJournal(scope, deps);
    await journal.current();
    journal.record(ev('a', 1));
    const second = journal.record(ev('b', 2));
    expect((await journal.current()).events.map((e) => e.eventId)).toEqual(['mistake-practice:v1:a', 'mistake-practice:v1:b']);
    expect(deps.load).toHaveBeenCalledTimes(1);
    await second.done;
    expect(writes.flat()).toEqual(['mistake-practice:v1:a', 'mistake-practice:v1:b']);
    expect(writes.every((batch) => batch.length > 0)).toBe(true);
  });

  it('afterWrites and whenIdle run only after every queued write', async () => {
    const order: string[] = [];
    const { deps } = makeDeps({ merge: jest.fn(async (input) => { await Promise.resolve(); order.push(`write:${input.events[input.events.length - 1].eventId.slice(-1)}`); }) });
    const journal = createMistakeAnswerJournal(scope, deps);
    await journal.current();
    journal.record(ev('a', 1));
    journal.record(ev('b', 2));
    await journal.afterWrites(() => { order.push('rewards'); });
    expect(order[order.length - 1]).toBe('rewards');
    expect(order.filter((x) => x.startsWith('write')).length).toBeGreaterThanOrEqual(1);
  });

  it('a failed write is retried once and then succeeds', async () => {
    const merge = jest.fn()
      .mockRejectedValueOnce(new Error('sqlite busy'))
      .mockResolvedValue(undefined);
    const { deps } = makeDeps({ merge });
    const journal = createMistakeAnswerJournal(scope, deps);
    await journal.current();
    await expect(journal.record(ev('a', 1)).done).resolves.toBe(true);
    expect(merge).toHaveBeenCalledTimes(2);
    expect(deps.wait).toHaveBeenCalledTimes(1);
  });

  it('after giving up the event is NOT lost: it rides with the next write and memory is reset to storage truth', async () => {
    const merge = jest.fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValue(undefined);
    const { deps } = makeDeps({ merge });
    const journal = createMistakeAnswerJournal(scope, deps);
    await journal.current();
    await expect(journal.record(ev('a', 1)).done).resolves.toBe(false);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('journal:write:giveup'));
    await journal.current();
    expect(deps.load).toHaveBeenCalledTimes(2);
    await expect(journal.record(ev('b', 2)).done).resolves.toBe(true);
    const lastCallEvents = (merge.mock.calls[2][0] as { events: MistakeEvent[] }).events.map((e) => e.eventId);
    expect(lastCallEvents).toEqual(['mistake-practice:v1:a', 'mistake-practice:v1:b']);
  });

  it('a read from storage waits for the write queue; invalidate forces a fresh storage read', async () => {
    const { deps } = makeDeps();
    const journal = createMistakeAnswerJournal(scope, deps);
    await journal.current();
    journal.record(ev('a', 1));
    journal.invalidate();
    await journal.current();
    expect(deps.load).toHaveBeenCalledTimes(2);
    expect((deps.merge as jest.Mock).mock.calls).toHaveLength(1);
  });
});
