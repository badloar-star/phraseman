type Token = Readonly<{ generation: number; stableId: string | null; phase: 'active' }>;

const tokenA: Token = Object.freeze({ generation: 1, stableId: 'stable-a', phase: 'active' });
let mockCurrentToken: Token = tokenA;
const mockCallable = jest.fn();
const mockRecordThemeUnlockStory = jest.fn();
const mockEnsurePack = jest.fn(async () => undefined);

jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => mockCallable,
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => mockCurrentToken,
  isCurrentAccountGeneration: (token: Token, expected?: string | null) => (
    token.generation === mockCurrentToken.generation
    && token.stableId === mockCurrentToken.stableId
    && (expected === undefined || expected === mockCurrentToken.stableId)
  ),
  subscribeAccountGeneration: () => ({ remove: () => undefined }),
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));
jest.mock('../modules/story_events/story_event_sources', () => ({ recordThemeUnlockStory: (...args: unknown[]) => mockRecordThemeUnlockStory(...args) }));
jest.mock('../app/premium_theme_pack_cache', () => ({ ensurePremiumThemePack: (...args: unknown[]) => mockEnsurePack(...args) }));

import {
  __resetPremiumThemeEntitlementsForTests,
  claimPremiumThemeCondition,
} from '../app/premium_theme_entitlements';

const claimWithToken = claimPremiumThemeCondition as unknown as (
  condition: 'final_spire',
  token: Token,
) => Promise<Readonly<{ granted: boolean; themeId: string | null }>>;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

describe('premium theme entitlement claim account isolation', () => {
  beforeEach(() => {
    mockCurrentToken = tokenA;
    mockCallable.mockReset();
    mockRecordThemeUnlockStory.mockReset();
    mockEnsurePack.mockReset();
    __resetPremiumThemeEntitlementsForTests();
  });

  it('does not recapture B for a claim originating from A', async () => {
    mockCurrentToken = Object.freeze({ generation: 2, stableId: 'stable-b', phase: 'active' });

    await expect(claimWithToken('final_spire', tokenA)).resolves.toEqual({ granted: false, themeId: null });
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it('rejects old generation A before a callable when the stable uid is unchanged', async () => {
    mockCurrentToken = Object.freeze({ generation: 2, stableId: 'stable-a', phase: 'active' });

    await expect(claimWithToken('final_spire', tokenA)).resolves.toEqual({ granted: false, themeId: null });
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it('drops an A claim that becomes stale while the callable is pending, before story or pack effects', async () => {
    const response = deferred<{ data: Record<string, unknown> }>();
    mockCallable.mockReturnValueOnce(response.promise);
    const pending = claimWithToken('final_spire', tokenA);
    await Promise.resolve();
    expect(mockCallable).toHaveBeenCalledTimes(1);

    mockCurrentToken = Object.freeze({ generation: 2, stableId: 'stable-b', phase: 'active' });
    response.resolve({
      data: {
        schemaVersion: 'premium-theme-claim.v1',
        entitlements: { grad_full_titanium: 1 },
        newlyGranted: ['grad_full_titanium'],
        progressByCondition: {},
        granted: true,
      },
    });

    await expect(pending).resolves.toEqual({ granted: false, themeId: null });
    expect(mockRecordThemeUnlockStory).not.toHaveBeenCalled();
    expect(mockEnsurePack).not.toHaveBeenCalled();
  });

  it('keeps the normal current-generation claim path', async () => {
    mockCallable.mockResolvedValueOnce({
      data: { schemaVersion: 'premium-theme-claim.v1', entitlements: {}, progressByCondition: {}, granted: false },
    });

    await expect(claimWithToken('final_spire', tokenA)).resolves.toEqual({ granted: false, themeId: null });
    expect(mockCallable).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledWith({ condition: 'final_spire' });
    expect(mockRecordThemeUnlockStory).not.toHaveBeenCalled();
    expect(mockEnsurePack).not.toHaveBeenCalled();
  });
});
