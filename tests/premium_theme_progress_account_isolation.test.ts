type Token = Readonly<{ generation: number; stableId: string | null; phase: 'active' }>;

const tokenA: Token = Object.freeze({ generation: 1, stableId: 'stable-a', phase: 'active' });
let mockCurrentToken: Token = tokenA;
const mockClaim = jest.fn(async () => ({ granted: false, themeId: null }));
const mockEnsurePack = jest.fn(async () => undefined);

jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => mockCurrentToken,
  isCurrentAccountGeneration: (token: Token, expected?: string | null) => (
    token.generation === mockCurrentToken.generation
    && token.stableId === mockCurrentToken.stableId
    && (expected === undefined || expected === mockCurrentToken.stableId)
  ),
}));
jest.mock('../app/premium_theme_catalog', () => ({
  premiumThemeByCondition: () => ({ id: 'theme-test', prefetchAt: 1, unlockAt: 1 }),
}));
jest.mock('../app/premium_theme_pack_cache', () => ({ ensurePremiumThemePack: (...args: unknown[]) => mockEnsurePack(...args) }));
jest.mock('../app/premium_theme_entitlements', () => ({ claimPremiumThemeCondition: (...args: unknown[]) => mockClaim(...args) }));

import { notePremiumThemeProgress } from '../app/premium_theme_progress';

const noteWithToken = notePremiumThemeProgress as unknown as (condition: 'final_spire', value: number, token: Token) => void;
const flush = async (): Promise<void> => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('premium theme progress account isolation', () => {
  beforeEach(() => {
    mockCurrentToken = tokenA;
    mockClaim.mockClear();
    mockEnsurePack.mockClear();
  });

  it('drops A progress when B becomes current before dynamic imports resolve', async () => {
    noteWithToken('final_spire', 1, tokenA);
    mockCurrentToken = Object.freeze({ generation: 2, stableId: 'stable-b', phase: 'active' });
    await flush();

    expect(mockClaim).not.toHaveBeenCalled();
    expect(mockEnsurePack).not.toHaveBeenCalled();
  });

  it('rejects the old token when the same uid activates a new generation', async () => {
    noteWithToken('final_spire', 1, tokenA);
    mockCurrentToken = Object.freeze({ generation: 2, stableId: 'stable-a', phase: 'active' });
    await flush();

    expect(mockClaim).not.toHaveBeenCalled();
    expect(mockEnsurePack).not.toHaveBeenCalled();
  });

  it('preserves the normal current-account prefetch and claim path with the originating token', async () => {
    noteWithToken('final_spire', 1, tokenA);
    await flush();

    expect(mockEnsurePack).toHaveBeenCalledWith('theme-test', 'unlock');
    expect(mockClaim).toHaveBeenCalledWith('final_spire', tokenA);
  });
});
