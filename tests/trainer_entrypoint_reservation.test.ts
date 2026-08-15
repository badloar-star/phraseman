import fs from 'fs';
import path from 'path';
import { startReservedTrainerSession } from '../app/trainer_session_navigation';

const mockReserveTrainerSessionEntry = jest.fn();
const mockGetVerifiedPremiumStatus = jest.fn();
const mockAsyncStorageGetItem = jest.fn();
const mockIsFeatureFreeForEveryone = jest.fn();
const mockResolveLessonRuntimeGate = jest.fn();

jest.mock('../app/trainer_session', () => ({
  reserveTrainerSessionEntry: (...args: unknown[]) => mockReserveTrainerSessionEntry(...args),
}));

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: () => mockGetVerifiedPremiumStatus(),
}));

jest.mock('../app/feature_gates', () => ({
  isFeatureFreeForEveryone: (...args: unknown[]) => mockIsFeatureFreeForEveryone(...args),
}));

jest.mock('../app/lesson_premium_gate', () => ({
  resolveLessonRuntimeGate: (...args: unknown[]) => mockResolveLessonRuntimeGate(...args),
}));

jest.mock('../app/lesson_screen_bootstrap', () => ({
  primeLessonScreenFromStorage: jest.fn(async () => undefined),
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

describe('Plus-only trainer entrypoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorageGetItem.mockResolvedValue('1');
    mockIsFeatureFreeForEveryone.mockReturnValue(false);
    mockResolveLessonRuntimeGate.mockResolvedValue('available');
  });

  it('opens trainer_limit for non-Plus access without creating a free reservation', async () => {
    mockReserveTrainerSessionEntry.mockResolvedValue(true);
    const router = { push: jest.fn() };

    const result = await startReservedTrainerSession({
      route: '/trainer_words_session',
      router,
      studyTarget: 'en',
      premiumAccess: false,
      lock: { current: false },
    });

    expect(result).toBe('limit');
    expect(mockReserveTrainerSessionEntry).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/premium_modal',
      params: { context: 'trainer_limit' },
    });
    expect(router.push).not.toHaveBeenCalledWith('/trainer_words_session');
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

  it('does not let the remote trainer_modes free flag bypass the full paid section', async () => {
    mockIsFeatureFreeForEveryone.mockReturnValue(true);
    const router = { push: jest.fn() };
    const premiumAccess = jest.fn(async () => false);

    await expect(startReservedTrainerSession({
      route: '/trainer_phrases_session',
      router,
      studyTarget: 'en',
      premiumAccess,
      lock: { current: false },
    })).resolves.toBe('limit');

    expect(premiumAccess).toHaveBeenCalledTimes(1);
    expect(mockReserveTrainerSessionEntry).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/premium_modal',
      params: { context: 'trainer_limit' },
    });
    expect(router.push).not.toHaveBeenCalledWith('/trainer_phrases_session');
  });

  it('fails closed to trainer_limit when Plus verification errors', async () => {
    const router = { push: jest.fn() };
    const lock = { current: false };

    await expect(startReservedTrainerSession({
      route: '/trainer_words_session',
      router,
      studyTarget: 'en',
      premiumAccess: jest.fn(async () => { throw new Error('verification unavailable'); }),
      lock,
    })).resolves.toBe('limit');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/premium_modal',
      params: { context: 'trainer_limit' },
    });
    expect(router.push).not.toHaveBeenCalledWith('/trainer_words_session');
    expect(lock.current).toBe(false);
  });

  it('ignores a concurrent double press while Plus access is being verified', async () => {
    let resolvePremiumAccess!: (hasPremium: boolean) => void;
    const premiumAccess = jest.fn(() => new Promise<boolean>((resolve) => {
      resolvePremiumAccess = resolve;
    }));
    const router = { push: jest.fn() };
    const lock = { current: false };
    const firstPress = startReservedTrainerSession({
      route: '/trainer_phrases_session',
      router,
      studyTarget: 'en',
      premiumAccess,
      lock,
    });
    const secondPress = startReservedTrainerSession({
      route: '/trainer_phrases_session',
      router,
      studyTarget: 'en',
      premiumAccess,
      lock,
    });

    await expect(secondPress).resolves.toBe('busy');
    expect(premiumAccess).toHaveBeenCalledTimes(1);
    expect(mockReserveTrainerSessionEntry).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();

    resolvePremiumAccess(false);
    await expect(firstPress).resolves.toBe('limit');
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/premium_modal',
      params: { context: 'trainer_limit' },
    });
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
    expect(source).toContain('premiumAccess: getVerifiedPremiumStatus,');
    expect(source).not.toContain('premiumAccess: () => hasPremium ? Promise.resolve(true) : getVerifiedPremiumStatus(),');
    expect(source).not.toContain('router.push(section.route as any)');

    const phrases = fs.readFileSync(path.join(__dirname, '..', 'app', 'trainer_phrases_session.tsx'), 'utf8');
    const words = fs.readFileSync(path.join(__dirname, '..', 'app', 'trainer_words_session.tsx'), 'utf8');
    expect(phrases).not.toContain("isFeatureFreeForEveryone('trainer_modes')");
    expect(words).not.toContain("isFeatureFreeForEveryone('trainer_modes')");
  });

});
