import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

const mockEnsureAnonUser = jest.fn(async () => 'account-b');

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({ collection: jest.fn() })),
}));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: mockEnsureAnonUser,
  ensureStableAuthLink: jest.fn(async () => true),
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => false),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

test('superseded updateMyGroupPoints callers all settle with the trailing debounce', async () => {
  beginAccountGeneration('account-a');
  const workerId = process.env.JEST_WORKER_ID;
  delete process.env.JEST_WORKER_ID;
  try {
    const { updateMyGroupPoints } = await import('../app/firestore_leagues');
    let firstSettled = false;
    let secondSettled = false;
    const first = updateMyGroupPoints(10).then(() => { firstSettled = true; });
    const second = updateMyGroupPoints(20).then(() => { secondSettled = true; });

    await jest.advanceTimersByTimeAsync(8_000);
    await Promise.resolve();

    expect(firstSettled).toBe(true);
    expect(secondSettled).toBe(true);
    await Promise.all([first, second]);
  } finally {
    if (workerId === undefined) delete process.env.JEST_WORKER_ID;
    else process.env.JEST_WORKER_ID = workerId;
  }
}, 30_000);

test('omitted-token trailing league update is dropped after account A switches to B', async () => {
  beginAccountGeneration('account-a');
  const workerId = process.env.JEST_WORKER_ID;
  delete process.env.JEST_WORKER_ID;
  try {
    const { updateMyGroupPoints } = await import('../app/firestore_leagues');
    const request = updateMyGroupPoints(30);
    beginAccountGeneration('account-b');

    await jest.advanceTimersByTimeAsync(8_000);
    await request;

    expect(mockEnsureAnonUser).not.toHaveBeenCalled();
  } finally {
    if (workerId === undefined) delete process.env.JEST_WORKER_ID;
    else process.env.JEST_WORKER_ID = workerId;
  }
});
