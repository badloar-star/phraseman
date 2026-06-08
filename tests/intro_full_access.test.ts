const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => asyncStore[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    asyncStore[key] = String(value);
  }),
  multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, asyncStore[key] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => {
      asyncStore[key] = String(value);
    });
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((key) => {
      delete asyncStore[key];
    });
  }),
}));

beforeEach(() => {
  jest.resetModules();
  Object.keys(asyncStore).forEach((key) => delete asyncStore[key]);
});

describe('intro full access gift', () => {
  it('starts a 72-hour gift after onboarding and returns active state', async () => {
    const now = Date.UTC(2026, 5, 6, 10, 0, 0);
    const access = require('../app/intro_full_access');

    await access.startIntroFullAccessAfterOnboarding(now);
    const state = await access.getIntroFullAccessState(now + 60_000);

    expect(state.active).toBe(true);
    expect(state.startedAt).toBe(now);
    expect(state.endsAt).toBe(now + 72 * 60 * 60 * 1000);
    expect(state.expiredUnseen).toBe(false);
    expect(state.welcomeUnseen).toBe(true);
  });

  it('does not restart the gift when onboarding completion is called twice', async () => {
    const access = require('../app/intro_full_access');

    await access.startIntroFullAccessAfterOnboarding(1000);
    await access.startIntroFullAccessAfterOnboarding(9000);

    const state = await access.getIntroFullAccessState(10_000);
    expect(state.startedAt).toBe(1000);
    expect(state.endsAt).toBe(1000 + 72 * 60 * 60 * 1000);
  });

  it('expires exactly after 72 hours and reports unseen expiration once', async () => {
    const access = require('../app/intro_full_access');
    const start = 1000;
    const end = start + 72 * 60 * 60 * 1000;

    await access.startIntroFullAccessAfterOnboarding(start);

    await expect(access.getIntroFullAccessState(end - 1)).resolves.toMatchObject({
      active: true,
      expiredUnseen: false,
    });
    await expect(access.getIntroFullAccessState(end)).resolves.toMatchObject({
      active: false,
      expiredUnseen: true,
    });

    await access.markIntroFullAccessEndedSeen();
    await expect(access.getIntroFullAccessState(end + 1)).resolves.toMatchObject({
      active: false,
      expiredUnseen: false,
    });
  });

  it('supports admin activation, expiration, and reset helpers', async () => {
    const access = require('../app/intro_full_access');
    const now = Date.UTC(2026, 5, 6, 10, 0, 0);

    await access.activateIntroFullAccessForAdmin(now);
    await expect(access.getIntroFullAccessState(now)).resolves.toMatchObject({
      active: true,
      welcomeUnseen: true,
    });

    await access.expireIntroFullAccessForAdmin(now + 10_000);
    await expect(access.getIntroFullAccessState(now + 10_000)).resolves.toMatchObject({
      active: false,
      expiredUnseen: true,
      welcomeUnseen: false,
    });

    await access.resetIntroFullAccessForAdmin();
    await expect(access.getIntroFullAccessState(now + 10_000)).resolves.toMatchObject({
      active: false,
      startedAt: null,
      expiredUnseen: false,
    });
  });
});
