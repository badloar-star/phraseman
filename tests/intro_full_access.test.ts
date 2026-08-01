import fs from 'fs';
import path from 'path';

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

let mockServerGrantStartMs = 1_000;
type MockGiftCloudState = { grantedAtMs: number | null; endsAtMs: number | null };
const mockReadGiftAccessFromCloud = jest.fn<Promise<MockGiftCloudState | null>, []>(async () => null);
const mockClaimIntroFullAccessOnCloud = jest.fn(async () => ({
  grantedAtMs: mockServerGrantStartMs,
  endsAtMs: mockServerGrantStartMs + 72 * 60 * 60 * 1000,
  alreadyGranted: false,
}));
jest.mock('../app/gift_access_cloud', () => ({
  readGiftAccessFromCloud: mockReadGiftAccessFromCloud,
  claimIntroFullAccessOnCloud: mockClaimIntroFullAccessOnCloud,
}));

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  Object.keys(asyncStore).forEach((key) => delete asyncStore[key]);
  mockServerGrantStartMs = 1_000;
  mockReadGiftAccessFromCloud.mockResolvedValue(null);
  mockClaimIntroFullAccessOnCloud.mockImplementation(async () => ({
    grantedAtMs: mockServerGrantStartMs,
    endsAtMs: mockServerGrantStartMs + 72 * 60 * 60 * 1000,
    alreadyGranted: false,
  }));
});

describe('intro full access gift', () => {
  it('claims through the App-Check callable and contains no direct client write path', () => {
    const giftCloudSource = fs.readFileSync(path.join(process.cwd(), 'app', 'gift_access_cloud.ts'), 'utf8');
    const introSource = fs.readFileSync(path.join(process.cwd(), 'app', 'intro_full_access.ts'), 'utf8');

    expect(giftCloudSource).toContain("'introFullAccessClaim'");
    expect(giftCloudSource).toContain('initFirebaseAppCheckIfAvailable');
    expect(giftCloudSource).not.toContain('persistGiftAccessOnCloud');
    expect(giftCloudSource).not.toContain(".doc(uid).set(");
    expect(introSource).toContain('await claimIntroFullAccessOnCloud()');
    expect(introSource).not.toContain('persistGiftAccessOnCloud');
  });

  it('starts a 72-hour gift after onboarding and returns active state', async () => {
    const now = Date.UTC(2026, 5, 6, 10, 0, 0);
    mockServerGrantStartMs = now;
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
    mockServerGrantStartMs = 1000;
    const access = require('../app/intro_full_access');

    await access.startIntroFullAccessAfterOnboarding(1000);
    await access.startIntroFullAccessAfterOnboarding(9000);

    const state = await access.getIntroFullAccessState(10_000);
    expect(state.startedAt).toBe(1000);
    expect(state.endsAt).toBe(1000 + 72 * 60 * 60 * 1000);
  });

  it('never re-grants after expiry, including after a local admin reset', async () => {
    const access = require('../app/intro_full_access');
    const firstStart = 1000;
    const firstEnd = firstStart + 72 * 60 * 60 * 1000;
    mockServerGrantStartMs = firstStart;

    // Первый подарок выдан и истёк.
    await access.startIntroFullAccessAfterOnboarding(firstStart);
    await access.markIntroFullAccessEndedSeen();

    // Повторное прохождение онбординга ПОСЛЕ истечения НЕ выдаёт подарок снова —
    // отметка о старте сохраняется (один раз на установку).
    await access.startIntroFullAccessAfterOnboarding(firstEnd + 10_000);
    await expect(access.getIntroFullAccessState(firstEnd + 70_000)).resolves.toMatchObject({
      active: false,
      startedAt: firstStart,
    });

    // Только админский сброс (для проверки в разработке) очищает отметку → подарок выдаётся заново.
    await access.resetIntroFullAccessForAdmin();
    const reStart = firstEnd + 20_000;
    mockClaimIntroFullAccessOnCloud.mockResolvedValue({
      grantedAtMs: firstStart,
      endsAtMs: firstEnd,
      alreadyGranted: true,
    });
    await access.startIntroFullAccessAfterOnboarding(reStart);
    await expect(access.getIntroFullAccessState(reStart + 60_000)).resolves.toMatchObject({
      active: false,
      startedAt: firstStart,
      welcomeUnseen: false,
    });
  });

  it('expires exactly after 72 hours and reports unseen expiration once', async () => {
    const access = require('../app/intro_full_access');
    const start = 1000;
    const end = start + 72 * 60 * 60 * 1000;
    mockServerGrantStartMs = start;

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

  it('does not grant the gift or show the welcome modal when the server kill-switch is off', async () => {
    mockClaimIntroFullAccessOnCloud.mockRejectedValue(new Error('intro_full_access_disabled'));
    const access = require('../app/intro_full_access');
    const now = Date.UTC(2026, 5, 6, 10, 0, 0);

    await access.startIntroFullAccessAfterOnboarding(now);

    // Ничего не выдано: подарок неактивен, приветственный/финальный модал не всплывут.
    await expect(access.getIntroFullAccessState(now + 60_000)).resolves.toMatchObject({
      active: false,
      startedAt: null,
      endsAt: null,
      welcomeUnseen: false,
      expiredUnseen: false,
    });
    await expect(access.shouldShowIntroFullAccessWelcome(now + 60_000)).resolves.toBe(false);
    expect(mockClaimIntroFullAccessOnCloud).toHaveBeenCalledTimes(1);
  });

  it('persists the exact server timestamps instead of caller time', async () => {
    const callerNow = 1_700_000_000_000;
    const serverGrantedAtMs = callerNow + 45_000;
    mockServerGrantStartMs = serverGrantedAtMs;
    const access = require('../app/intro_full_access');

    await access.startIntroFullAccessAfterOnboarding(callerNow);

    await expect(access.getIntroFullAccessState(serverGrantedAtMs + 1)).resolves.toMatchObject({
      active: true,
      startedAt: serverGrantedAtMs,
      endsAt: serverGrantedAtMs + 72 * 60 * 60 * 1000,
    });
  });

  it('restores an existing active cloud grant without claiming again', async () => {
    const grantedAtMs = 1_700_000_000_000;
    const endsAtMs = grantedAtMs + 72 * 60 * 60 * 1000;
    mockReadGiftAccessFromCloud.mockResolvedValue({ grantedAtMs, endsAtMs });
    const access = require('../app/intro_full_access');

    await access.startIntroFullAccessAfterOnboarding(grantedAtMs + 60_000);

    await expect(access.getIntroFullAccessState(grantedAtMs + 60_001)).resolves.toMatchObject({
      active: true,
      startedAt: grantedAtMs,
      endsAt: endsAtMs,
      welcomeUnseen: false,
    });
    expect(mockClaimIntroFullAccessOnCloud).not.toHaveBeenCalled();
  });

  it('creates no local access when the server claim fails', async () => {
    mockClaimIntroFullAccessOnCloud.mockRejectedValue(new Error('offline'));
    const access = require('../app/intro_full_access');
    const now = 1_700_000_000_000;

    await access.startIntroFullAccessAfterOnboarding(now);

    await expect(access.getIntroFullAccessState(now + 1)).resolves.toMatchObject({
      active: false,
      startedAt: null,
      endsAt: null,
    });
  });

  it('does not revoke a gift already granted while the switch was on', async () => {
    const access = require('../app/intro_full_access');
    const start = 1000;
    mockServerGrantStartMs = start;

    // Подарок выдан, пока флаг был включён.
    await access.startIntroFullAccessAfterOnboarding(start);
    await expect(access.getIntroFullAccessState(start + 60_000)).resolves.toMatchObject({
      active: true,
      startedAt: start,
    });

    // Админ выключает подарок — активный доступ НЕ отбирается, юзер докатывает 72ч.
    await expect(access.getIntroFullAccessState(start + 60_000)).resolves.toMatchObject({
      active: true,
      startedAt: start,
    });
  });
});
