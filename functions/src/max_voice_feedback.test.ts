import fs from 'node:fs';
import path from 'node:path';

type DocData = Record<string, unknown>;

const mockWrites = new Map<string, DocData>();
const mockWriteAttempts: string[] = [];
const mockReads: string[] = [];
const mockSet = jest.fn(async (docPath: string, data: DocData) => {
  mockWriteAttempts.push(docPath);
  mockWrites.set(docPath, { ...(mockWrites.get(docPath) ?? {}), ...data });
});
function mockSnapshot(docPath: string) {
  const data = mockWrites.get(docPath);
  return {
    id: docPath.slice(docPath.lastIndexOf('/') + 1),
    exists: data !== undefined,
    data: () => data,
  };
}
function mockRef(collection: string, id: string) {
  const docPath = `${collection}/${id}`;
  return {
    id,
    path: docPath,
    get: async () => {
      mockReads.push(docPath);
      return mockSnapshot(docPath);
    },
    set: (data: DocData) => mockSet(docPath, data),
    update: async () => { mockWriteAttempts.push(docPath); },
    delete: async () => { mockWriteAttempts.push(docPath); },
  };
}
const mockDb = {
  collection: jest.fn((collection: string) => ({
    doc: jest.fn((id: string) => mockRef(collection, id)),
    where: jest.fn(() => ({
      limit: jest.fn(() => ({ get: async () => ({ empty: true, docs: [] }) })),
    })),
  })),
  runTransaction: jest.fn(async (work: (tx: {
    get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
    set: (ref: { path: string }) => void;
    update: (ref: { path: string }) => void;
    delete: (ref: { path: string }) => void;
  }) => Promise<unknown>) => work({
    get: (ref) => ref.get(),
    set: (ref) => { mockWriteAttempts.push(ref.path); },
    update: (ref) => { mockWriteAttempts.push(ref.path); },
    delete: (ref) => { mockWriteAttempts.push(ref.path); },
  })),
  batch: jest.fn(() => ({
    set: (ref: { path: string }) => { mockWriteAttempts.push(ref.path); },
    update: (ref: { path: string }) => { mockWriteAttempts.push(ref.path); },
    delete: (ref: { path: string }) => { mockWriteAttempts.push(ref.path); },
    commit: async () => undefined,
  })),
};

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optionsOrHandler: unknown, maybeHandler?: unknown) => (
    typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler
  ),
}));
jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => mockDb);
  (firestore as unknown as { FieldValue: unknown }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { firestore };
});
import {
  sanitizeVoiceFeedbackRating,
  submitMaxVoiceFeedback as submitMaxVoiceFeedbackRaw,
  voiceFeedbackDocId,
} from './max_voice_feedback';

type CallableRequest = { auth?: { uid: string }; data: DocData };
const submitMaxVoiceFeedback = submitMaxVoiceFeedbackRaw as unknown as (
  request: CallableRequest,
) => Promise<{ ok: boolean; id: string }>;

describe('sanitizeVoiceFeedbackRating', () => {
  it('accepts 1-5', () => {
    expect(sanitizeVoiceFeedbackRating(1)).toBe(1);
    expect(sanitizeVoiceFeedbackRating(3)).toBe(3);
    expect(sanitizeVoiceFeedbackRating(5)).toBe(5);
  });

  it('rounds fractional values', () => {
    expect(sanitizeVoiceFeedbackRating(4.6)).toBe(5);
    expect(sanitizeVoiceFeedbackRating(3.2)).toBe(3);
  });

  it('rejects out-of-range and garbage as "no rating" (0)', () => {
    expect(sanitizeVoiceFeedbackRating(0)).toBe(0);
    expect(sanitizeVoiceFeedbackRating(6)).toBe(0);
    expect(sanitizeVoiceFeedbackRating(-1)).toBe(0);
    expect(sanitizeVoiceFeedbackRating('five')).toBe(0);
    expect(sanitizeVoiceFeedbackRating(null)).toBe(0);
    expect(sanitizeVoiceFeedbackRating(undefined)).toBe(0);
    expect(sanitizeVoiceFeedbackRating(NaN)).toBe(0);
  });
});

describe('MAX voice feedback callable boundaries', () => {
  const source = fs.readFileSync(path.join(__dirname, 'max_voice_feedback.ts'), 'utf8');

  beforeEach(() => {
    mockWrites.clear();
    mockWriteAttempts.length = 0;
    mockReads.length = 0;
    mockSet.mockClear();
    mockDb.collection.mockClear();
  });

  it('keeps user submit on global App Check and admin list on the admin-specific flag', () => {
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK,');
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,');
    expect(source).toContain("import { ENFORCE_APP_CHECK, ENFORCE_APP_CHECK_ADMIN } from './callable_options';");
  });

  it('resolves only the exact known identity without link repair', () => {
    expect(source).toContain('resolveStableUidForAuth(db, authUid, expectedStableUid, {');
    expect(source).toContain('requireKnownIdentity: true');
    expect(source).toContain('repairLinks: false');
  });

  it('rejects an A-owned payload presented under B auth before any write', async () => {
    mockWrites.set('auth_links/auth-B', { stable_id: 'stable-B' });
    mockWrites.set('users/stable-B', { firebaseAuthUid: 'auth-B' });

    await expect(submitMaxVoiceFeedback({
      auth: { uid: 'auth-B' },
      data: { payload: { expectedStableUid: 'stable-A', sessionId: 'session-1', message: 'ok', rating: 5 } },
    })).rejects.toMatchObject({ code: 'permission-denied', message: 'stable_uid_mismatch' });

    expect(mockSet).not.toHaveBeenCalled();
    expect(mockWriteAttempts).toEqual([]);
    expect([...mockWrites.keys()]).toEqual(['auth_links/auth-B', 'users/stable-B']);
  });

  it('rejects an incomplete B identity projection without repairing any identity collection', async () => {
    mockWrites.set('auth_links/auth-B', { stable_id: 'stable-B' });
    mockWrites.set('users/stable-A', { firebaseAuthUid: 'auth-A' });

    await expect(submitMaxVoiceFeedback({
      auth: { uid: 'auth-B' },
      data: { payload: { expectedStableUid: 'stable-A', sessionId: 'session-1', message: 'ok', rating: 5 } },
    })).rejects.toMatchObject({ code: 'permission-denied' });

    expect(mockWriteAttempts).toEqual([]);
    expect(mockWrites.has('max_voice_feedback/stable-A__session-1')).toBe(false);
    expect(mockWrites.has('account_id_index/auth-B')).toBe(false);
  });

  it('rejects an empty expected owner before identity reads or writes', async () => {
    await expect(submitMaxVoiceFeedback({
      auth: { uid: 'auth-B' },
      data: { payload: { sessionId: 'session-1', message: 'ok', rating: 5 } },
    })).rejects.toMatchObject({ code: 'permission-denied', message: 'stable_uid_mismatch' });

    expect(mockReads).toEqual([]);
    expect(mockWriteAttempts).toEqual([]);
  });

  it('accepts the exact A owner and retries idempotently into the same document', async () => {
    mockWrites.set('auth_links/auth-A', { stable_id: 'stable-A' });
    mockWrites.set('users/stable-A', { firebaseAuthUid: 'auth-A' });
    const request = {
      auth: { uid: 'auth-A' },
      data: { payload: { expectedStableUid: 'stable-A', sessionId: 'session-1', message: 'ok', rating: 5 } },
    };

    const first = await submitMaxVoiceFeedback(request);
    const retry = await submitMaxVoiceFeedback(request);

    expect(first).toEqual({ ok: true, id: 'stable-A__session-1' });
    expect(retry).toEqual(first);
    expect(mockSet).toHaveBeenCalledTimes(2);
    expect([...mockWrites.keys()].filter((key) => key.startsWith('max_voice_feedback/'))).toHaveLength(1);
    expect(mockWrites.get('max_voice_feedback/stable-A__session-1')).toMatchObject({
      uid: 'stable-A',
      authUid: 'auth-A',
      sessionId: 'session-1',
    });
  });
});

describe('voiceFeedbackDocId', () => {
  it('is deterministic for the same uid+sessionId — one feedback per call', () => {
    const a = voiceFeedbackDocId('uid123', 'sess456');
    const b = voiceFeedbackDocId('uid123', 'sess456');
    expect(a).toBe(b);
  });

  it('differs across sessions of the same user', () => {
    const a = voiceFeedbackDocId('uid123', 'sess456');
    const b = voiceFeedbackDocId('uid123', 'sess789');
    expect(a).not.toBe(b);
  });

  it('strips characters unsafe for a Firestore doc id', () => {
    const id = voiceFeedbackDocId('uid/with:slash', 'sess/with:colon');
    expect(id).not.toMatch(/[/:]/);
  });
});
