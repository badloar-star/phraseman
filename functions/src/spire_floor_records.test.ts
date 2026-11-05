import { randomUUID } from 'crypto'; // зачем: выдуманная попытка — случайный UUID, а не литерал (сканер секретов)
import { arenaAnswerFingerprint } from '../../modules/arena/answer_check';

type Row = Record<string, unknown>;
const mockDocs = new Map<string, Row>();
const mockWrites: string[] = [];
const mockIdentity = jest.fn(async () => 'me');
const mockServerGate = jest.fn(() => true);
let mockNow = 1_000_000;
const mockRaw = Array.from({ length: 10 }, (_, i) => ({ taskId: `task${i}`, mode: 'guess_phrase', difficulty: 1,
  isVoice: false, tags: [], verified: true, payload: { phrase: `p${i}`, options: ['yes', 'no', 'c', 'd'], correctIndex: 0 } }));
jest.mock('./spire_floor_record_gate', () => ({ floorRecordServerEnabled: (...args: unknown[]) => mockServerGate(...args as []) }));
const mockPack = { schema: 'spire-pack-v1', weekId: '2026-W44', lang: 'en', tier: 0, packHash: 'pack_hash_123', saltId: 'salt',
  aboveCloudsCyclesFloors: [1], floors: [{ floor: 1, steps: [{ step: 1, sets: [{
    tasks: mockRaw.map(t => ({ taskId: t.taskId, kind: 'choice', mode: t.mode, difficulty: 1, payload: { phrase: t.payload.phrase, options: t.payload.options } })),
    answerFingerprints: Array.from({ length: 10 }, (_, i) => [arenaAnswerFingerprint('salt', `task${i}`, 0)]),
  }] }] }] };
class MockError extends Error { constructor(public code: string, message: string) { super(message); } }
jest.mock('firebase-functions/v2/https', () => ({ HttpsError: MockError, onCall: (_opts: unknown, handler: unknown) => handler }));
jest.mock('./auth_identity', () => ({ resolveStableUidForAuth: (...args: unknown[]) => mockIdentity(...args as []) }));
jest.mock('./callable_options', () => ({ HOT_CALLABLE_OPTIONS: {} }));
jest.mock('./spire_groups', () => ({ spireWeekId: () => '2026-W44', savedSpireGroupId: () => 'room' }));
jest.mock('./spire_config_contract', () => ({ spireConfigStatus: () => ({ liveForPlayers: true }) }));
jest.mock('firebase-admin', () => ({
  firestore: () => ({ collection: (collection: string) => ({ doc: (id: string) => {
    const path = `${collection}/${id}`;
    return { path, get: async () => ({ data: () => mockDocs.get(path) }) };
  } }), runTransaction: async (work: (tx: unknown) => Promise<unknown>) => work({
    get: async (ref: { path: string }) => ({ data: () => mockDocs.get(ref.path) }),
    create: (ref: { path: string }, data: Row) => { mockDocs.set(ref.path, data); mockWrites.push(ref.path); },
    set: (ref: { path: string }, data: Row) => { mockDocs.set(ref.path, data); mockWrites.push(ref.path); },
    update: (ref: { path: string }, data: Row) => { mockDocs.set(ref.path, { ...mockDocs.get(ref.path), ...data }); mockWrites.push(ref.path); },
  }) }),
  storage: () => ({ bucket: () => ({ file: (path: string) => ({ download: async () => [Buffer.from(JSON.stringify(path.includes('spire_record_verifiers') ? {
    schema: 'spire-step-verifier-v2', packHash: mockPack.packHash, weekId: mockPack.weekId, lang: 'en', tier: 0,
    steps: [{ floor: 1, step: 1, tasks: mockRaw }],
  } : mockPack))] }) }) }),
}));

// onCall is replaced by its handler; no Firebase service or project credentials are used.
const handler = require('./spire_floor_records').spireFloorRecords as (request: Row) => Promise<Row>;
const call = (action: string, extra: Row = {}) => {
  if (action === 'finish') mockNow += 1000;
  return handler({ auth: { uid: 'auth' }, data: { action, groupId: 'room', weekId: '2026-W44', lang: 'en', floor: 1, step: 1, ...extra } });
};
beforeEach(() => {
  mockDocs.clear(); mockWrites.length = 0; mockIdentity.mockResolvedValue('me'); mockServerGate.mockReturnValue(true);
  mockNow = 1_000_000; jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
  mockDocs.set('spire_groups/room', { weekId: '2026-W44', lang: 'en', tier: 0, members: { me: {}, other: {} } });
});
afterEach(() => jest.restoreAllMocks());
test('only members can read; no personal progress writes occur', async () => {
  expect(await call('read')).toEqual({ records: {}, personal: {} });
  mockIdentity.mockResolvedValue('outsider');
  await expect(call('read')).rejects.toThrow('record_room_membership');
  expect(mockWrites).toEqual([]);
});
test('ten verified answers publish atomically; retry does not write twice', async () => {
  const start = await call('start');
  const payload = { token: start.token, durationMs: 100, answers: Array.from({ length: 10 }, () => ({ selectedIndex: 0 })) };
  const result = await call('finish', payload);
  expect(result).toEqual(expect.objectContaining({ uid: 'me', floor: 1, step: 1, durationMs: 1000, recordSet: true }));
  expect(start).not.toHaveProperty('verifierTasks');
  expect(result).not.toHaveProperty('records');
  const writes = mockWrites.length;
  expect(await call('finish', payload)).toEqual(result);
  expect(mockWrites).toHaveLength(writes);
  mockDocs.set('spire_floor_record_attempts/step-v2_me', { token: 'another-attempt' });
  mockDocs.set('spire_floor_records/step-v2_room', { packHash: 'pack_hash_123', records: { '1:1': { uid: 'other', durationMs: 1 } }, personal: {} });
  expect(await call('finish', payload)).toEqual(result);
  expect(mockWrites).toHaveLength(writes);
  // зачем (04.11): единственная запись вне spire_floor_record* — зеркало рекорда в комнате (0 доп. чтений на экране Пика)
  expect(mockWrites.every((path) => path.startsWith('spire_floor_record') || path === 'spire_groups/room')).toBe(true);
  // мок update не раскрывает точечный путь: ключ остаётся строкой 'stepRecords.1_1'
  expect(mockDocs.get('spire_groups/room')?.['stepRecords.1_1']).toEqual({ uid: 'me', durationMs: 1000 });
  await expect(call('finish', { ...payload, step: 2 })).rejects.toThrow('record_attempt_expired');
  mockIdentity.mockResolvedValue('other');
  await expect(call('finish', payload)).rejects.toThrow('record_attempt_expired');
});
test('unauthenticated access and non-existent tower floors are rejected', async () => {
  await expect(handler({ data: { action: 'read', lang: 'en' } })).rejects.toThrow('auth_required');
  await expect(call('start', { floor: 16 })).rejects.toThrow('record_floor_invalid');
  expect(mockWrites).toEqual([]);
});
test('wrong answer, stale room and fabricated token cannot set a record', async () => {
  const start = await call('start');
  const answers = Array.from({ length: 10 }, () => ({ selectedIndex: 0 }));
  await expect(call('finish', { token: start.token, durationMs: 100, answers: [...answers.slice(0, 9), { selectedIndex: 1 }] })).rejects.toThrow('record_requires_ten_correct');
  await expect(call('finish', { token: randomUUID(), durationMs: 100, answers })).rejects.toThrow('record_attempt_expired');
  await expect(call('read', { weekId: '2026-W43' })).rejects.toThrow('record_room_changed');
  expect(mockDocs.get('spire_floor_records/step-v2_room')?.records).toEqual({});
});
test('read projects only the requesting player personal results', async () => {
  mockDocs.set('spire_floor_records/step-v2_room', { records: {}, personal: { me: { '1:1': { uid: 'me', durationMs: 10 } }, other: { secret: true } } });
  expect(await call('read')).toEqual({ records: {}, personal: { '1:1': { uid: 'me', durationMs: 10 } } });
});
test('disabled server gate rejects reads and writes before identity or mutation', async () => {
  mockServerGate.mockReturnValue(false);
  mockIdentity.mockClear();
  for (const action of ['read', 'start', 'finish']) await expect(call(action)).rejects.toThrow('record_disabled');
  expect(mockIdentity).not.toHaveBeenCalled();
  expect(mockWrites).toEqual([]);
});
test('requires a real step; legacy floor-only docs are not interpreted as step records', async () => {
  for (const step of [undefined, 0, 6, '1', 1.5]) await expect(call('start', { step })).rejects.toThrow('record_step_invalid');
  mockDocs.set('spire_floor_records/room', { records: { '1': { uid: 'other', durationMs: 1 } }, personal: {} });
  expect(await call('read')).toEqual({ records: {}, personal: {} });
  expect(mockWrites).toEqual([]);
});
test('client time is optional and cannot lower the server measured record', async () => {
  const start = await call('start');
  expect(mockDocs.get('spire_floor_records/step-v2_room')?.participantUids).toEqual([]);
  const result = await call('finish', { token: start.token, answers: mockRaw.map(() => ({ selectedIndex: 0 })) });
  expect(result.durationMs).toBe(1000);
  expect(mockDocs.get('spire_floor_records/step-v2_room')?.participantUids).toEqual(['me']);
  await call('finish', { token: start.token, answers: mockRaw.map(() => ({ selectedIndex: 0 })) });
  expect(mockDocs.get('spire_floor_records/step-v2_room')?.participantUids).toEqual(['me']);
});
