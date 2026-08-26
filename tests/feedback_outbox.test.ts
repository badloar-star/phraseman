import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  FEEDBACK_OUTBOX_TTL_MS,
  enqueueFeedbackEntry,
  flushFeedbackOutbox,
  listPendingFeedbackEntries,
  purgeExpiredFeedbackOutbox,
} from '../app/feedback_outbox';
import type { FeedbackEntryInput } from '../app/feedback_client';

jest.mock('@react-native-async-storage/async-storage');

const ACCOUNT = 'feedback-account';
const INPUT: FeedbackEntryInput = {
  kind: 'lesson',
  entityId: 'attempt-1',
  entityLabel: 'Lesson 1',
  message: 'More examples please',
  rating: 3,
  lang: 'ru',
  userName: null,
  aiSummaryConsent: false,
};

describe('general feedback outbox delivery receipt', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps an entry queued when cloud submission resolves with null', async () => {
    await enqueueFeedbackEntry(ACCOUNT, INPUT);
    const result = await flushFeedbackOutbox(ACCOUNT, async () => null);
    expect(result).toEqual({ sent: 0, left: 1 });
    expect(await listPendingFeedbackEntries(ACCOUNT)).toHaveLength(1);
  });

  it('dequeues only an explicit ok receipt', async () => {
    await enqueueFeedbackEntry(ACCOUNT, INPUT);
    const result = await flushFeedbackOutbox(ACCOUNT, async () => ({ ok: true }));
    expect(result).toEqual({ sent: 1, left: 0 });
    expect(await listPendingFeedbackEntries(ACCOUNT)).toHaveLength(0);
  });

  it('reports when the current row could not be persisted so the caller can send it directly', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk unavailable'));

    await expect(enqueueFeedbackEntry(ACCOUNT, INPUT)).resolves.toBe(false);
    expect(await listPendingFeedbackEntries(ACCOUNT)).toHaveLength(0);
  });

  it('immediately rewrites storage without expired raw feedback rows', async () => {
    const nowMs = 2_000_000_000_000;
    const key = `feedback_entries_outbox_v1:${encodeURIComponent(ACCOUNT)}`;
    const fresh = { input: INPUT, queuedAtMs: nowMs - 1000 };
    const expired = {
      input: { ...INPUT, entityId: 'expired-attempt', message: 'private old text' },
      queuedAtMs: nowMs - FEEDBACK_OUTBOX_TTL_MS - 1,
    };
    await AsyncStorage.setItem(key, JSON.stringify([expired, fresh]));

    await expect(listPendingFeedbackEntries(ACCOUNT, nowMs)).resolves.toEqual([fresh]);
    expect(JSON.parse(String(await AsyncStorage.getItem(key)))).toEqual([fresh]);
  });

  it('removes the storage key when every raw feedback row has expired', async () => {
    const nowMs = 2_000_000_000_000;
    const key = `feedback_entries_outbox_v1:${encodeURIComponent(ACCOUNT)}`;
    await AsyncStorage.setItem(key, JSON.stringify([{
      input: { ...INPUT, message: 'private expired text' },
      queuedAtMs: nowMs - FEEDBACK_OUTBOX_TTL_MS - 1,
    }]));

    await expect(listPendingFeedbackEntries(ACCOUNT, nowMs)).resolves.toEqual([]);
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });

  it('removes malformed raw storage instead of retaining unverifiable text indefinitely', async () => {
    const key = `feedback_entries_outbox_v1:${encodeURIComponent(ACCOUNT)}`;
    await AsyncStorage.setItem(key, '{"private text":');

    await expect(listPendingFeedbackEntries(ACCOUNT)).resolves.toEqual([]);
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });

  it('removes far-future rows instead of extending raw-text retention', async () => {
    const nowMs = 2_000_000_000_000;
    const key = `feedback_entries_outbox_v1:${encodeURIComponent(ACCOUNT)}`;
    await AsyncStorage.setItem(key, JSON.stringify([{
      input: { ...INPUT, message: 'future private text' },
      queuedAtMs: nowMs + 60_000,
    }]));

    await expect(listPendingFeedbackEntries(ACCOUNT, nowMs)).resolves.toEqual([]);
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });

  it('exposes a bootstrap purge that removes expired rows without sending them', async () => {
    const nowMs = 2_000_000_000_000;
    const key = `feedback_entries_outbox_v1:${encodeURIComponent(ACCOUNT)}`;
    await AsyncStorage.setItem(key, JSON.stringify([{
      input: { ...INPUT, message: 'expired bootstrap text' },
      queuedAtMs: nowMs - FEEDBACK_OUTBOX_TTL_MS - 1,
    }]));

    await purgeExpiredFeedbackOutbox(ACCOUNT, nowMs);
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });

  it('serializes mount flush and enqueue so a delayed dequeue cannot erase the new row', async () => {
    const oldInput = { ...INPUT, entityId: 'old-attempt', message: 'old' };
    const newInput = { ...INPUT, entityId: 'new-attempt', message: 'new' };
    await enqueueFeedbackEntry(ACCOUNT, oldInput);

    const setItemMock = AsyncStorage.setItem as jest.Mock;
    const baseSetItem = async (key: string, value: string) => AsyncStorage.multiSet([[key, value]]);
    let releaseEmptyWrite!: () => void;
    const emptyWriteGate = new Promise<void>((resolve) => { releaseEmptyWrite = resolve; });
    let emptyWriteReached!: () => void;
    const emptyWriteStarted = new Promise<void>((resolve) => { emptyWriteReached = resolve; });
    let blockedOnce = false;
    setItemMock.mockImplementation(async (key: string, value: string) => {
      if (!blockedOnce && value === '[]') {
        blockedOnce = true;
        emptyWriteReached();
        await emptyWriteGate;
      }
      return baseSetItem(key, value);
    });

    try {
      const flushing = flushFeedbackOutbox(ACCOUNT, async () => ({ ok: true }));
      await emptyWriteStarted;
      const enqueueing = enqueueFeedbackEntry(ACCOUNT, newInput);
      // Give an unlocked enqueue enough time to persist its stale snapshot
      // before the delayed dequeue overwrites it. With the account lock it
      // remains queued behind the flush and runs only after the gate opens.
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      releaseEmptyWrite();
      await Promise.all([flushing, enqueueing]);
    } finally {
      setItemMock.mockImplementation(baseSetItem);
    }

    expect((await listPendingFeedbackEntries(ACCOUNT)).map((row) => row.input.entityId))
      .toEqual(['new-attempt']);
  });

  it('durably enqueues a new row while an older network send is still pending', async () => {
    const oldInput = { ...INPUT, entityId: 'old-network-attempt', message: 'old' };
    const newInput = { ...INPUT, entityId: 'new-network-attempt', message: 'new' };
    await enqueueFeedbackEntry(ACCOUNT, oldInput);

    let signalSendStarted!: () => void;
    const sendStarted = new Promise<void>((resolve) => { signalSendStarted = resolve; });
    let releaseSend!: () => void;
    const sendGate = new Promise<void>((resolve) => { releaseSend = resolve; });
    const flushing = flushFeedbackOutbox(ACCOUNT, async () => {
      signalSendStarted();
      await sendGate;
      return { ok: true };
    });
    await sendStarted;

    const enqueueing = enqueueFeedbackEntry(ACCOUNT, newInput);
    const enqueueOutcome = await Promise.race([
      enqueueing.then(() => 'enqueued' as const),
      new Promise<'blocked'>((resolve) => { setTimeout(() => resolve('blocked'), 25); }),
    ]);
    releaseSend();
    await Promise.all([flushing, enqueueing]);

    expect(enqueueOutcome).toBe('enqueued');
    expect((await listPendingFeedbackEntries(ACCOUNT)).map((row) => row.input.entityId))
      .toEqual(['new-network-attempt']);
  });
});
