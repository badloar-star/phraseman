// PM-210 — внешние события экономики читаются хвостом от сохранённого курсора.
//
// зачем: владелец, «Firebase-экономия по умолчанию». Раньше каждый старт читал
// users/{uid}/external_economy_events С НАЧАЛА. Теперь: первый запуск / потеря
// курсора / курсор без журнала / раз в 30 дней — полное чтение; иначе хвост с
// запасом 1 ч. Идемпотентность применения сохранена: повторно прочитанные
// события пропускаются по маркеру + журналу.
import AsyncStorage from '@react-native-async-storage/async-storage';

type FakeDoc = { id: string; data: Record<string, unknown> };
type QueryLog = { since: number | null; startAfterId: string | null; returned: number };

const mockEvents: FakeDoc[] = [];
const mockQueries: QueryLog[] = [];
const mockApplied = new Set<string>();
const mockCommitFailures = new Set<string>();

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'owner-1') }));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ stableId: 'owner-1' }),
  isCurrentAccountGeneration: () => true,
}));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'owner-1'),
  ensureStableAuthLinkForStableId: jest.fn(async () => true),
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `h(${value})`),
}));
jest.mock('../app/shards_system', () => ({
  wasConfirmedExternalShardEventApplied: jest.fn(async (_owner: string, source: string, eventId: string) =>
    mockApplied.has(`${source}:${eventId}`)),
  commitConfirmedExternalShardEvent: jest.fn(async (input: { source: string; eventId: string }) => {
    const key = `${input.source}:${input.eventId}`;
    if (mockCommitFailures.has(key)) return { status: 'failed', reason: 'test_failure' };
    const already = mockApplied.has(key);
    mockApplied.add(key);
    return { status: already ? 'already-applied' : 'applied', operation: { operationId: `op-${key}` } };
  }),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const makeQuery = (state: { since: number | null; limit: number; startAfterId: string | null }) => ({
    where: (_field: string, _op: string, value: number) => makeQuery({ ...state, since: value }),
    orderBy: () => makeQuery(state),
    limit: (n: number) => makeQuery({ ...state, limit: n }),
    startAfter: (doc: { id: string }) => makeQuery({ ...state, startAfterId: doc.id }),
    get: async () => {
      const sorted = [...mockEvents].sort((a, b) =>
        (Number(a.data.createdAtMs) - Number(b.data.createdAtMs)) || a.id.localeCompare(b.id));
      let rows = state.since === null
        ? sorted
        : sorted.filter((doc) => Number(doc.data.createdAtMs) >= Number(state.since));
      if (state.startAfterId) {
        const index = rows.findIndex((doc) => doc.id === state.startAfterId);
        rows = rows.slice(index + 1);
      }
      rows = rows.slice(0, state.limit);
      mockQueries.push({ since: state.since, startAfterId: state.startAfterId, returned: rows.length });
      return { docs: rows.map((doc) => ({ id: doc.id, data: () => doc.data })) };
    },
  });
  const firestore = () => ({
    collection: () => ({
      doc: () => ({
        collection: () => makeQuery({ since: null, limit: 1000, startAfterId: null }),
      }),
    }),
  });
  firestore.FieldPath = { documentId: () => '__name__' };
  return { __esModule: true, default: firestore };
});

import {
  EXTERNAL_ECONOMY_EVENT_CURSOR_OVERLAP_MS,
  EXTERNAL_ECONOMY_EVENT_FULL_RESCAN_MS,
  externalEconomyEventCursorKey,
  syncConfirmedExternalShardEventsFromCloud,
} from '../app/economy/external_shard_event_sync';

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_800_000_000_000;

function addEvent(eventId: string, createdAtMs: number): void {
  mockEvents.push({
    id: `doc-${eventId}`,
    data: {
      schemaVersion: 'external-economy-event.v1',
      source: 'tournament',
      eventId,
      ownerStableId: 'owner-1',
      delta: 5,
      reason: 'test',
      kind: 'test_kind',
      subjectId: 'room',
      payload: {},
      createdAtMs,
    },
  });
}

async function readCursor(): Promise<Record<string, unknown> | null> {
  const raw = await AsyncStorage.getItem(externalEconomyEventCursorKey('owner-1'));
  return raw ? JSON.parse(raw) : null;
}

describe('external economy events cursor (PM-210)', () => {
  let nowSpy: jest.SpyInstance<number, []>;
  let now = T0 + DAY;

  beforeEach(async () => {
    await AsyncStorage.clear();
    mockEvents.length = 0;
    mockQueries.length = 0;
    mockApplied.clear();
    mockCommitFailures.clear();
    now = T0 + DAY;
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => nowSpy.mockRestore());

  it('first launch reads everything, then later launches read only the tail', async () => {
    addEvent('e1', T0);
    addEvent('e2', T0 + 1_000);
    addEvent('e3', T0 + 10 * 60 * 60 * 1000);

    const first = await syncConfirmedExternalShardEventsFromCloud();
    expect(first).toEqual({ applied: 3, skipped: 0, invalid: 0 });
    expect(mockQueries[0].since).toBeNull();
    const cursor = await readCursor();
    expect(cursor?.createdAtMs).toBe(T0 + 10 * 60 * 60 * 1000);
    expect(cursor?.anchor).toEqual({ source: 'tournament', eventId: 'e3' });

    mockQueries.length = 0;
    now += 60_000;
    const second = await syncConfirmedExternalShardEventsFromCloud();
    // Читается только событие внутри запаса в 1 ч, и оно не применяется повторно.
    expect(mockQueries[0].since).toBe(T0 + 10 * 60 * 60 * 1000 - EXTERNAL_ECONOMY_EVENT_CURSOR_OVERLAP_MS);
    expect(mockQueries.reduce((sum, q) => sum + q.returned, 0)).toBe(1);
    expect(second).toEqual({ applied: 0, skipped: 1, invalid: 0 });
  });

  it('applies a new event that arrives after the cursor, including a late one inside the overlap', async () => {
    addEvent('e1', T0);
    await syncConfirmedExternalShardEventsFromCloud();

    addEvent('late', T0 - 5 * 60 * 1000); // метка раньше курсора, но в пределах запаса
    addEvent('e2', T0 + 2_000);
    mockQueries.length = 0;
    const result = await syncConfirmedExternalShardEventsFromCloud();
    expect(mockQueries[0].since).toBe(T0 - EXTERNAL_ECONOMY_EVENT_CURSOR_OVERLAP_MS);
    expect(result).toEqual({ applied: 2, skipped: 1, invalid: 0 });
    expect(mockApplied.has('tournament:late')).toBe(true);
    expect((await readCursor())?.createdAtMs).toBe(T0 + 2_000);
  });

  it('falls back to a full read when the cursor anchor is missing from the journal', async () => {
    addEvent('e1', T0);
    addEvent('e2', T0 + 1_000);
    await syncConfirmedExternalShardEventsFromCloud();

    mockApplied.clear(); // журнал потерян, курсор остался
    mockQueries.length = 0;
    const result = await syncConfirmedExternalShardEventsFromCloud();
    expect(mockQueries[0].since).toBeNull();
    expect(result.applied).toBe(2);
  });

  it('freezes the cursor before an event that failed to apply and retries it next launch', async () => {
    addEvent('e1', T0);
    addEvent('bad', T0 + 1_000);
    addEvent('e3', T0 + 2_000);
    mockCommitFailures.add('tournament:bad');

    const first = await syncConfirmedExternalShardEventsFromCloud();
    expect(first.applied).toBe(2);
    expect((await readCursor())?.createdAtMs).toBe(T0);

    mockCommitFailures.clear();
    const second = await syncConfirmedExternalShardEventsFromCloud();
    expect(mockApplied.has('tournament:bad')).toBe(true);
    expect(second.applied).toBe(1);
    expect((await readCursor())?.createdAtMs).toBe(T0 + 2_000);
  });

  it('does a periodic full rescan once the last full scan is older than 30 days', async () => {
    addEvent('e1', T0);
    await syncConfirmedExternalShardEventsFromCloud();
    now += EXTERNAL_ECONOMY_EVENT_FULL_RESCAN_MS + 1;
    mockQueries.length = 0;
    await syncConfirmedExternalShardEventsFromCloud();
    expect(mockQueries[0].since).toBeNull();
    expect((await readCursor())?.fullScanAtMs).toBe(now);
  });

  it('ignores a cursor that belongs to another owner', async () => {
    addEvent('e1', T0);
    await AsyncStorage.setItem(externalEconomyEventCursorKey('owner-1'), JSON.stringify({
      schemaVersion: 'external-economy-event-cursor.v1',
      ownerStableId: 'someone-else',
      createdAtMs: T0 + DAY,
      anchor: null,
      fullScanAtMs: now,
      savedAtMs: now,
    }));
    await syncConfirmedExternalShardEventsFromCloud();
    expect(mockQueries[0].since).toBeNull();
    expect(mockApplied.has('tournament:e1')).toBe(true);
  });
});
