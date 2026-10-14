// зачем (D186, владелец 14.10: «Бонус на старт — ТАКОГО НЕ ДОЛЖНО БЫТЬ ВООБЩЕ, УДАЛИТЬ»): этап 1 — механизм 72 ч выключен в
// источнике. Сторож держит три обещания: состояние всегда «неактивно» (даже если в хранилище остались ключи старой выдачи),
// выдача после онбординга ничего не пишет и не зовёт сервер, окна приветствия/окончания не могут всплыть.
const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => asyncStore[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => { asyncStore[key] = String(value); }),
  multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, asyncStore[key] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = String(v); }); }),
  multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => { delete asyncStore[k]; }); }),
}));

const mockReadGiftAccessFromCloud = jest.fn(async () => null);
const mockClaimIntroFullAccessOnCloud = jest.fn(async () => ({ grantedAtMs: 1_000, endsAtMs: 1_000 + 72 * 3_600_000, alreadyGranted: false }));
jest.mock('../app/gift_access_cloud', () => ({
  readGiftAccessFromCloud: mockReadGiftAccessFromCloud,
  claimIntroFullAccessOnCloud: mockClaimIntroFullAccessOnCloud,
}));

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
});

describe('D186: «Бонус на старт» (72 ч полного доступа) выключен', () => {
  it('is switched off at the source', async () => {
    const intro = await import('../app/intro_full_access');
    expect(intro.INTRO_FULL_ACCESS_REMOVED).toBe(true);
  });

  it('reports inactive even when keys of an old grant are still stored', async () => {
    const intro = await import('../app/intro_full_access');
    const now = 10_000_000;
    asyncStore[intro.INTRO_FULL_ACCESS_STARTED_AT_KEY] = String(now - 3_600_000);
    asyncStore[intro.INTRO_FULL_ACCESS_ENDS_AT_KEY] = String(now + 70 * 3_600_000);
    const state = await intro.getIntroFullAccessState(now);
    expect(state).toEqual({ active: false, startedAt: null, endsAt: null, remainingMs: 0, expiredUnseen: false, welcomeUnseen: false });
    expect(await intro.isIntroFullAccessActive(now)).toBe(false);
    expect(await intro.shouldShowIntroFullAccessWelcome(now)).toBe(false);
  });

  it('never shows the «three days ended» window for an old expired grant', async () => {
    const intro = await import('../app/intro_full_access');
    const now = 10_000_000;
    asyncStore[intro.INTRO_FULL_ACCESS_STARTED_AT_KEY] = String(now - 100 * 3_600_000);
    asyncStore[intro.INTRO_FULL_ACCESS_ENDS_AT_KEY] = String(now - 28 * 3_600_000);
    expect((await intro.getIntroFullAccessState(now)).expiredUnseen).toBe(false);
  });

  it('mounts no intro window anywhere and shows no «Active until» row for the 72-hour access in Settings', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const read = (rel: string): string => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
    expect(read('app/_layout.tsx')).not.toContain('<IntroFullAccessModal');
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).not.toContain("key: 'intro'");
    expect(settings).not.toContain("title: L('Полный доступ на 3 дня'");
  });

  it('grants nothing after onboarding: no storage writes, no server claim, no cloud read', async () => {
    const intro = await import('../app/intro_full_access');
    await intro.startIntroFullAccessAfterOnboarding(10_000_000, 'ru');
    expect(Object.keys(asyncStore)).toEqual([]);
    expect(mockClaimIntroFullAccessOnCloud).not.toHaveBeenCalled();
    expect(mockReadGiftAccessFromCloud).not.toHaveBeenCalled();
  });
});
