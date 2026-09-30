/**
 * D123 (владелец 2026-09-30): тихий суточный потолок Plus в Диалогах —
 * 300 ответов за UTC-сутки, только на сервере. Проверяем реальный
 * enforceMonthlyQuota на фейковом Firestore: сколько чтений/записей стоит Plus,
 * что Free-путь не изменился и какой код отказа уходит клиенту.
 */
type Stored = Record<string, unknown>;

var mockDb: FakeFirestore;

class FakeDocRef {
  constructor(readonly path: string) {}
}

class FakeFirestore {
  readonly documents = new Map<string, Stored>();
  readonly reads: string[] = [];
  readonly sets: { path: string; value: Stored }[] = [];

  collection(name: string): { doc: (id: string) => FakeDocRef } {
    return { doc: (id: string) => new FakeDocRef(`${name}/${id}`) };
  }

  async runTransaction<T>(callback: (tx: {
    get: (ref: FakeDocRef) => Promise<{ data: () => Stored | undefined }>;
    set: (ref: FakeDocRef, value: Stored, options?: { merge?: boolean }) => void;
  }) => Promise<T>): Promise<T> {
    return callback({
      get: async (ref) => {
        this.reads.push(ref.path);
        const value = this.documents.get(ref.path);
        return { data: () => value };
      },
      set: (ref, value) => {
        this.sets.push({ path: ref.path, value });
        this.documents.set(ref.path, { ...(this.documents.get(ref.path) ?? {}), ...value });
      },
    });
  }
}

jest.mock('firebase-admin', () => {
  const firestore = () => mockDb;
  return { firestore, apps: [], initializeApp: jest.fn() };
});

import { HttpsError } from 'firebase-functions/v2/https';
import { QUOTA_COLLECTION, docId, enforceMonthlyQuota } from './premium_dialog';
import {
  PLUS_DIALOG_DAY_COUNT_FIELD,
  PLUS_DIALOG_DAY_KEY_FIELD,
  utcDayKey,
} from './dialog_quota_contract';

const quotaPath = `${QUOTA_COLLECTION}/${docId('quota', 'auth-1', 'stable-1')}`;

beforeEach(() => {
  mockDb = new FakeFirestore();
});

test('Plus: одно чтение и одна запись на ответ, счётчик растёт, резерв остаётся «безлимитным»', async () => {
  const reservation = await enforceMonthlyQuota('auth-1', 'stable-1', true, 30);
  expect(reservation.consumed).toBe(false);
  expect(mockDb.reads).toEqual([quotaPath]);
  expect(mockDb.sets).toHaveLength(1);
  const stored = mockDb.documents.get(quotaPath)!;
  expect(stored[PLUS_DIALOG_DAY_KEY_FIELD]).toBe(utcDayKey(Date.now()));
  expect(stored[PLUS_DIALOG_DAY_COUNT_FIELD]).toBe(1);
  // Месячная квота Free в документе не появляется.
  expect(stored.monthlyCount).toBeUndefined();
});

test('Plus на потолке 300 получает plus_daily_cap и ничего не пишет', async () => {
  mockDb.documents.set(quotaPath, {
    [PLUS_DIALOG_DAY_KEY_FIELD]: utcDayKey(Date.now()),
    [PLUS_DIALOG_DAY_COUNT_FIELD]: 300,
  });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const error = await enforceMonthlyQuota('auth-1', 'stable-1', true, 30).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(HttpsError);
  expect((error as HttpsError).code).toBe('resource-exhausted');
  expect((error as HttpsError).message).toBe('plus_daily_cap');
  expect(mockDb.sets).toHaveLength(0);
  expect(warn).toHaveBeenCalledWith('premium_dialog rejected', expect.objectContaining({ reason: 'plus_daily_cap' }));
  warn.mockRestore();
});

test('Free-путь не читает суточный счётчик Plus и тратит месячную квоту как раньше', async () => {
  mockDb.documents.set(quotaPath, {
    [PLUS_DIALOG_DAY_KEY_FIELD]: utcDayKey(Date.now()),
    [PLUS_DIALOG_DAY_COUNT_FIELD]: 300,
  });
  const reservation = await enforceMonthlyQuota('auth-1', 'stable-1', false, 30);
  expect(reservation.consumed).toBe(true);
  expect(reservation.remainingQuota).toBe(29);
  expect(mockDb.reads).toEqual([quotaPath]);
});
