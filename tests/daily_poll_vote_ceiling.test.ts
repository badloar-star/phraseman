// зачем (координатор 13.10, аудит Optimistic UI): голос в опросе дня ждёт callable dailyPollVote не дольше 10 с —
// дальше «нет связи» (reason offline), карточка откатывает выбор и разблокирует строки; флаг «голос в полёте» снят.
const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete asyncStore[k]; }),
}));

const voteCallable = jest.fn();
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/firestore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => voteCallable),
}));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn(async () => 'poll-user') }));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'poll-user') }));
jest.mock('../app/dev_social_state', () => ({ getDevDailyPoll: jest.fn(() => null), devDailyPollVote: jest.fn(() => null) }));

const snapshot = {
  dateKey: '2026-10-13',
  ownerId: 'poll-user',
  poll: { id: 'p1', question: { ru: 'Вопрос' }, options: [{ id: 'a', label: { ru: 'А' } }, { id: 'b', label: { ru: 'Б' } }] },
  vote: null,
} as any;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.useFakeTimers();
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
});

afterEach(() => {
  jest.useRealTimers();
});

test('зависший dailyPollVote → через 10 с offline, флаг «в полёте» снят', async () => {
  voteCallable.mockImplementation(() => new Promise(() => undefined));
  const client = require('../app/daily_poll/daily_poll_client');
  expect(client.DAILY_POLL_VOTE_TIMEOUT_MS).toBe(10_000);

  let outcome: unknown = null;
  const pending = client.submitDailyPollVote(snapshot, 'a').then((value: unknown) => { outcome = value; });
  await jest.advanceTimersByTimeAsync(9_000);
  expect(outcome).toBeNull();
  await jest.advanceTimersByTimeAsync(1_500);
  await pending;
  expect(outcome).toEqual({ ok: false, reason: 'offline' });

  // второй тап после потолка не упирается в «предыдущий ещё в полёте»
  voteCallable.mockResolvedValueOnce({ data: { ok: true, status: 'accepted', optionId: 'a', counts: { a: 1, b: 0 } } });
  const second = await client.submitDailyPollVote(snapshot, 'a');
  expect(second.ok).toBe(true);
});

test('быстрый ответ проходит как раньше', async () => {
  voteCallable.mockResolvedValueOnce({ data: { ok: true, status: 'already_voted', optionId: 'b', counts: { a: 2, b: 3 } } });
  const client = require('../app/daily_poll/daily_poll_client');
  const outcome = await client.submitDailyPollVote(snapshot, 'a');
  expect(outcome).toEqual({ ok: true, vote: { optionId: 'b', counts: { a: 2, b: 3 } }, alreadyVoted: true });
});
