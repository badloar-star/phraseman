import fs from 'fs';
import path from 'path';
import * as dailyTaskNavigation from '../app/daily_task_navigation';
import { startReservedTrainerSession } from '../app/trainer_session_navigation';

const mockReserveTrainerSessionEntry = jest.fn();
const mockGetVerifiedPremiumStatus = jest.fn();
const mockAsyncStorageGetItem = jest.fn();
const mockIsFeatureFreeForEveryone = jest.fn();

jest.mock('../app/trainer_session', () => ({
  reserveTrainerSessionEntry: (...args: unknown[]) => mockReserveTrainerSessionEntry(...args),
}));

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: () => mockGetVerifiedPremiumStatus(),
}));

jest.mock('../app/feature_gates', () => ({
  isFeatureFreeForEveryone: (...args: unknown[]) => mockIsFeatureFreeForEveryone(...args),
}));

jest.mock('../app/daily_tasks', () => ({
  dailyTaskAvailableForStudyTarget: () => true,
}));

jest.mock('../app/trainer_target_gate', () => ({
  trainerSessionContentAvailableForTarget: () => true,
  frenchTrainerGateCopy: () => ({ title: 'Trainer unavailable' }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockAsyncStorageGetItem(...args),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe('legacy trainer entrypoint reservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorageGetItem.mockResolvedValue('1');
    mockIsFeatureFreeForEveryone.mockReturnValue(false);
  });

  it('reserves the free session before navigating to the trainer route', async () => {
    mockReserveTrainerSessionEntry.mockResolvedValue(true);
    const router = { push: jest.fn() };

    const result = await startReservedTrainerSession({
      route: '/trainer_words_session',
      router,
      studyTarget: 'en',
      premiumAccess: false,
      lock: { current: false },
    });

    expect(result).toBe('started');
    expect(mockReserveTrainerSessionEntry).toHaveBeenCalledWith(
      '/trainer_words_session',
      false,
      'en',
    );
    expect(router.push).toHaveBeenCalledWith('/trainer_words_session');
    expect(mockReserveTrainerSessionEntry.mock.invocationCallOrder[0]).toBeLessThan(
      router.push.mock.invocationCallOrder[0],
    );
  });

  it('opens trainer_limit instead of the trainer route when reservation is refused', async () => {
    mockReserveTrainerSessionEntry.mockResolvedValue(false);
    const router = { push: jest.fn() };

    const result = await startReservedTrainerSession({
      route: '/trainer_phrases_session',
      router,
      studyTarget: 'en',
      premiumAccess: false,
      lock: { current: false },
    });

    expect(result).toBe('limit');
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/premium_modal',
      params: { context: 'trainer_limit' },
    });
    expect(router.push).not.toHaveBeenCalledWith('/trainer_phrases_session');
  });

  it('does not write a reservation for Premium access', async () => {
    const router = { push: jest.fn() };

    await expect(startReservedTrainerSession({
      route: '/trainer_words_session',
      router,
      studyTarget: 'en',
      premiumAccess: true,
      lock: { current: false },
    })).resolves.toBe('started');

    expect(mockReserveTrainerSessionEntry).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/trainer_words_session');
  });

  it('preserves the admin free-for-all trainer_modes bypass', async () => {
    mockIsFeatureFreeForEveryone.mockReturnValue(true);
    const router = { push: jest.fn() };
    const premiumAccess = jest.fn(async () => false);

    await expect(startReservedTrainerSession({
      route: '/trainer_phrases_session',
      router,
      studyTarget: 'en',
      premiumAccess,
      lock: { current: false },
    })).resolves.toBe('started');

    expect(premiumAccess).not.toHaveBeenCalled();
    expect(mockReserveTrainerSessionEntry).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/trainer_phrases_session');
  });

  it('ignores a concurrent double press while the first reservation is in flight', async () => {
    let resolveFirstReservation!: (reserved: boolean) => void;
    mockReserveTrainerSessionEntry
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => {
        resolveFirstReservation = resolve;
      }))
      .mockResolvedValueOnce(true);
    const router = { push: jest.fn() };
    const lock = { current: false };
    const firstPress = startReservedTrainerSession({
      route: '/trainer_phrases_session',
      router,
      studyTarget: 'en',
      premiumAccess: false,
      lock,
    });
    const secondPress = startReservedTrainerSession({
      route: '/trainer_phrases_session',
      router,
      studyTarget: 'en',
      premiumAccess: false,
      lock,
    });

    await expect(secondPress).resolves.toBe('busy');
    expect(mockReserveTrainerSessionEntry).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();

    resolveFirstReservation(true);
    await expect(firstPress).resolves.toBe('started');
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(lock.current).toBe(false);
  });

  it('resolves premium access once inside the double-press lock', async () => {
    let resolvePremiumAccess!: (hasPremium: boolean) => void;
    const premiumAccess = jest.fn(() => new Promise<boolean>((resolve) => {
      resolvePremiumAccess = resolve;
    }));
    mockReserveTrainerSessionEntry.mockResolvedValue(true);
    const router = { push: jest.fn() };
    const lock = { current: false };
    const firstPress = startReservedTrainerSession({
      route: '/trainer_words_session',
      router,
      studyTarget: 'en',
      premiumAccess,
      lock,
    });
    const secondPress = startReservedTrainerSession({
      route: '/trainer_words_session',
      router,
      studyTarget: 'en',
      premiumAccess,
      lock,
    });

    await expect(secondPress).resolves.toBe('busy');
    expect(premiumAccess).toHaveBeenCalledTimes(1);
    expect(mockReserveTrainerSessionEntry).not.toHaveBeenCalled();

    resolvePremiumAccess(true);
    await expect(firstPress).resolves.toBe('started');
    expect(mockReserveTrainerSessionEntry).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/trainer_words_session');
  });

  it('routes trainer screen session starts through the reserved entrypoint', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'trainer.tsx'), 'utf8');

    expect(source).toContain("import { startReservedTrainerSession } from './trainer_session_navigation';");
    expect(source).toContain("import { getVerifiedPremiumStatus } from './premium_guard';");
    expect(source).toContain('const trainerSessionStartLockRef = useRef(false);');
    expect(source).toContain('premiumAccess: () => hasPremium ? Promise.resolve(true) : getVerifiedPremiumStatus(),');
    expect(source).not.toContain('router.push(section.route as any)');
  });

  it('routes the full daily-tasks screen direct sessions through the same reservation', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'daily_tasks_screen.tsx'), 'utf8');

    expect(source).toContain("import { startReservedTrainerSession } from './trainer_session_navigation';");
    expect(source).toContain('const trainerSessionStartLockRef = useRef(false);');
    expect(source).toMatch(/await startReservedTrainerSession\(\{[\s\S]*premiumAccess: getVerifiedPremiumStatus,[\s\S]*lock: trainerSessionStartLockRef,/);
    expect(source).not.toContain("router.push('/trainer_words_session')");
    expect(source).not.toContain("router.push('/trainer_phrases_session')");
    expect(source).not.toContain("router.push('/trainer_arena_session')");
  });

  it('reserves a free direct daily-task trainer session before navigation', async () => {
    mockGetVerifiedPremiumStatus.mockResolvedValue(false);
    mockReserveTrainerSessionEntry.mockResolvedValue(true);
    const router = { push: jest.fn(), replace: jest.fn() };

    await dailyTaskNavigation.navigateDailyTask({
      lang: 'ru',
      router,
      studyTarget: 'en',
      task: { type: 'trainer_words' } as never,
    });

    expect(mockGetVerifiedPremiumStatus).toHaveBeenCalledTimes(1);
    expect(mockReserveTrainerSessionEntry).toHaveBeenCalledWith(
      '/trainer_words_session',
      false,
      'en',
    );
    expect(router.push).toHaveBeenCalledWith('/trainer_words_session');
    expect(mockReserveTrainerSessionEntry.mock.invocationCallOrder[0]).toBeLessThan(
      router.push.mock.invocationCallOrder[0],
    );
  });
});
