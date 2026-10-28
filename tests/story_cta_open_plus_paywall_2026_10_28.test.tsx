// ═══════════════════════════════════════════════════════════════════════════
// story_cta_open_plus_paywall_2026_10_28.test.tsx — кнопка «Открыть Plus» объявления в историях открывает окно Plus, и оно не закрывается само.
//
// зачем (Ревизор 28.10, ae0261b1b): кнопка звала /premium_modal с source 'story_announcement', которого не было в PAYWALL_SOURCE_VALUES —
// в стор-сборке resolvePremiumModalEntry отвечал dismiss (окно Plus закрывалось сразу после открытия), в dev — красный экран.
// Тест проходит цепочку целиком: тап по кнопке → с какими параметрами ушёл переход → решение окна Plus для человека без Plus = show.
// ═══════════════════════════════════════════════════════════════════════════
import { act, renderHook } from '@testing-library/react-native';

import { PAYWALL_SOURCE_VALUES, resolvePremiumModalEntry, type RawPaywallEntryParams } from '../app/paywall_entry_contract';
import { useStoryCtaAction } from '../components/stories/templates/use_story_cta_action';
import type { StoryTemplateCta } from '../components/stories/templates/story_template_registry';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: null, setLiquidGlassThemeId: jest.fn() }) }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(() => Promise.resolve()) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/premium_theme_catalog', () => ({ isPremiumThemeId: () => false }));
jest.mock('../app/premium_theme_entitlements', () => ({ isPremiumThemeUnlocked: () => false }));

const OPEN_PLUS: StoryTemplateCta = { action: 'open_plus', label: 'ctaOpenPlus', icon: 'sparkles' };
const CTX = { source: 'announcement:ann-plus', themeId: null } as const;

type Href = Readonly<{ pathname: string; params: RawPaywallEntryParams }>;

describe('кнопка «Открыть Plus» в историях', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('source story_announcement есть в списке источников окна Plus', () => {
    expect(PAYWALL_SOURCE_VALUES).toContain('story_announcement');
  });

  it('тап закрывает просмотр и открывает окно Plus, которое для человека без Plus показывается, а не закрывается', async () => {
    const closeViewer = jest.fn();
    const { result } = await renderHook(() => useStoryCtaAction('ru', false, closeViewer));
    await act(async () => { result.current(OPEN_PLUS, CTX); });

    expect(closeViewer).toHaveBeenCalledWith('cta_open_plus');
    expect(mockPush).toHaveBeenCalledTimes(1);
    const href = mockPush.mock.calls[0]![0] as Href;
    expect(href.pathname).toBe('/premium_modal');
    expect(href.params).toEqual({ context: 'generic', source: 'story_announcement' });

    const decision = resolvePremiumModalEntry({ params: href.params, accessResolved: true, hasPremiumAccess: false, impressionId: 'story-plus-test' });
    expect(decision.decision).toBe('show');
    if (decision.decision !== 'show') return;
    expect(decision.entry.source).toBe('story_announcement');
    expect(decision.entry.context).toBe('generic');
  });

  // зачем (Ревизор 28.10): у человека с Plus кнопка не должна оставлять пустой экран — окно ждёт прозрачным (виден прежний экран), затем dismiss.
  it('у человека с Plus окно покупку не показывает: прозрачное ожидание доступа, затем закрывается само', async () => {
    const { result } = await renderHook(() => useStoryCtaAction('ru', false, jest.fn()));
    await act(async () => { result.current(OPEN_PLUS, CTX); });
    const href = mockPush.mock.calls[0]![0] as Href;

    const waiting = resolvePremiumModalEntry({ params: href.params, accessResolved: false, hasPremiumAccess: false, impressionId: 'story-plus-owner', cachedEntitlement: 'premium' });
    expect(waiting.decision).toBe('wait');
    const owner = resolvePremiumModalEntry({ params: href.params, accessResolved: true, hasPremiumAccess: true, impressionId: 'story-plus-owner' });
    expect(owner.decision).toBe('dismiss');
  });

  it('в фотостудии кнопка только пишет лог — перехода нет', async () => {
    const closeViewer = jest.fn();
    const { result } = await renderHook(() => useStoryCtaAction('ru', true, closeViewer));
    await act(async () => { result.current(OPEN_PLUS, CTX); });

    expect(closeViewer).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
