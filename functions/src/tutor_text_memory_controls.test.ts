/* eslint-disable import/first */
class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const mockDependencies = { marker: 'text-memory-dependencies' };
const mockProductionDependencies = jest.fn(() => mockDependencies);
const mockGetMemory = jest.fn();
const mockUpdateMemory = jest.fn();
const mockDeleteMemoryItem = jest.fn();
const mockClearMemory = jest.fn();

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_options: unknown, handler: unknown) => handler,
}));

jest.mock('./callable_options', () => ({ ENFORCE_APP_CHECK_OPENAI: false }));
jest.mock('./max_voice_memory_controls', () => ({
  productionMaxVoiceMemoryControlDependencies: mockProductionDependencies,
  getMaxVoiceMemory: mockGetMemory,
  updateMaxVoiceMemory: mockUpdateMemory,
  deleteMaxVoiceMemoryItem: mockDeleteMemoryItem,
  clearMaxVoiceMemory: mockClearMemory,
}));

import {
  tutorTextClearMemory,
  tutorTextDeleteMemoryItem,
  tutorTextGetMemory,
  tutorTextUpdateMemory,
} from './tutor_text_memory_controls';

type Callable = (request: { auth?: { uid?: string }; data?: unknown }) => Promise<unknown>;

describe('text tutor memory callable boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMemory.mockResolvedValue({ schemaVersion: 2 });
    mockUpdateMemory.mockResolvedValue({ schemaVersion: 2 });
    mockDeleteMemoryItem.mockResolvedValue({ schemaVersion: 2 });
    mockClearMemory.mockResolvedValue({ ok: true });
  });

  it.each([
    ['tutorTextGetMemory', tutorTextGetMemory, mockGetMemory, { studyTarget: 'de' }],
    ['tutorTextUpdateMemory', tutorTextUpdateMemory, mockUpdateMemory, { studyTarget: 'es', field: 'pacePreference', value: 'slower' }],
    ['tutorTextDeleteMemoryItem', tutorTextDeleteMemoryItem, mockDeleteMemoryItem, { studyTarget: 'fr', itemId: 'hook-1' }],
    ['tutorTextClearMemory', tutorTextClearMemory, mockClearMemory, { studyTarget: 'en' }],
  ] as const)('%s passes authenticated exact-target input to the scoped handler', async (_name, exported, handler, data) => {
    await expect((exported as unknown as Callable)({ auth: { uid: 'auth-1' }, data }))
      .resolves.toBeDefined();
    expect(handler).toHaveBeenCalledWith({ authUid: 'auth-1', data }, mockDependencies);
    expect(mockProductionDependencies).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, {}, { studyTarget: 'it' }, { studyTarget: null }])(
    'rejects absent or unsupported target %p before dependencies or handlers',
    async (data) => {
      await expect((tutorTextGetMemory as unknown as Callable)({ auth: { uid: 'auth-1' }, data }))
        .rejects.toMatchObject({ code: 'invalid-argument' });
      expect(mockProductionDependencies).not.toHaveBeenCalled();
      expect(mockGetMemory).not.toHaveBeenCalled();
    },
  );

  it('rejects unauthenticated requests before dependencies or handlers', async () => {
    await expect((tutorTextGetMemory as unknown as Callable)({ data: { studyTarget: 'de' } }))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    expect(mockProductionDependencies).not.toHaveBeenCalled();
    expect(mockGetMemory).not.toHaveBeenCalled();
  });
});
