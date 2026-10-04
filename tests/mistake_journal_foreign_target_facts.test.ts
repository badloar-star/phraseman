// зачем (§142, логи прода 04.10): факты phone-state общие на аккаунт и без языка — журнал fr получал английские события,
// сервер отклонял выгрузку (event_target_mismatch, 188 раз) и клиент повторял её бесконечно. Журнал языка берёт только свои события.
const storageData = new Map<string, string>();
let mockPhoneStateFacts: Record<string, unknown> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => storageData.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { storageData.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { storageData.delete(key); }),
    getAllKeys: jest.fn(async () => [...storageData.keys()]),
  },
}));
jest.mock('../app/phone_state_practice_bridge', () => ({
  commitPhoneStatePracticeFact: jest.fn(async () => undefined),
  mergePhoneStatePracticeFacts: jest.fn(async (_kind: string, facts: Record<string, unknown>) => ({ ...facts, ...mockPhoneStateFacts })),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ phase: 'active', generation: 1, stableId: 'owner-a' }),
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: <T,>(work: () => Promise<T>) => work(),
}));
jest.mock('../app/stable_id', () => ({ getStableId: async () => 'owner-a' }));

// eslint-disable-next-line import/first
import { loadMistakeEventJournal } from '../app/mistake_practice_store';

const makeEvent = (eventId: string, studyTarget: 'en' | 'fr') => ({
  eventId,
  mistakeId: `mistake:${eventId}`,
  cycleId: `mistake-cycle:v1:${eventId.padEnd(64, 'a').slice(0, 64)}`,
  type: 'captured' as const,
  occurredAtMs: 1_700_000_000_000,
  studyTarget,
  payload: { canonicalTarget: eventId },
});

beforeEach(() => {
  storageData.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('a language journal keeps only its own events from the account-wide phone-state facts', async () => {
  const en = makeEvent('evt-en-1', 'en');
  const fr = makeEvent('evt-fr-1', 'fr');
  mockPhoneStateFacts = { [en.eventId]: en, [fr.eventId]: fr };

  const frJournal = await loadMistakeEventJournal({ accountScope: 'owner-a', studyTarget: 'fr' });
  expect(frJournal.events.map((event) => event.eventId)).toEqual(['evt-fr-1']);
  expect(frJournal.events.every((event) => event.studyTarget === 'fr')).toBe(true);
  expect(console.warn).toHaveBeenCalledWith('[MISTAKE-JOURNAL] foreign_target_facts', expect.stringContaining('"dropped":1'));

  const enJournal = await loadMistakeEventJournal({ accountScope: 'owner-a', studyTarget: 'en' });
  expect(enJournal.events.map((event) => event.eventId)).toEqual(['evt-en-1']);
});
