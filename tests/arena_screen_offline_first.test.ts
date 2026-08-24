import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import ArenaHubScreen from '../components/arena/ArenaHubSurface';

const h = React.createElement;

type Deferred<T> = Readonly<{ promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void }>;
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => { resolve = nextResolve; reject = nextReject; });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const homeRequests: Deferred<any>[] = [];
const expansionRequests: Deferred<any>[] = [];
const historyRequests: Deferred<any[]>[] = [];
const reportBlockRequests: Deferred<boolean>[] = [];
let diskWarm: Promise<any>;
let memoryWarm: any = null;
const rememberWarm = jest.fn();
const pushed: unknown[] = [];

const home = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  availability: { enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true, rewardsEnabled: true, spinEnabled: false },
  profile: { rating: 900, rank: 3, spinsAvailable: 0, rankName: 'Bronze', dailyDayKey: '2026-08-20', todayKey: '2026-08-20', dailyMatches: 2, dailyFirstAnswers: 4, dailyWins: 1 },
  ...overrides,
});
const expansion = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  availability: { today: true, lab: true, ghost: true, rival: true, mastery: true, partner: true, store: true },
  wallet: { walletStars: 20 },
  today: { completedTasks: 2, state: 'available' },
  ...overrides,
});

jest.mock('react-native', () => {
  const ReactNativeTest = jest.requireActual<typeof import('react')>('react');
  const Pressable = ({ disabled, onPress, ...props }: any) => ReactNativeTest.createElement('Pressable', { ...props, disabled, onPress: disabled ? undefined : onPress });
  return { View: 'View', Text: 'Text', Pressable, StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style } };
});
jest.mock('react-native-reanimated', () => {
  const easing = { out: (value: unknown) => value, inOut: (value: unknown) => value, quad: 'quad' };
  return {
    __esModule: true,
    default: { View: 'AnimatedView' },
    interpolate: (value: number) => value,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: number) => ({ value }),
    withSequence: (...values: unknown[]) => values[values.length - 1],
    withSpring: (value: number) => value,
    withTiming: (value: number) => value,
    Easing: easing,
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({ useRouter: () => ({ push: (value: unknown) => pushed.push(value), replace: jest.fn() }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(() => Promise.resolve()) }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => true }));
jest.mock('../hooks/use_arena_font_scale', () => ({ useArenaFontScale: () => 1 }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('../hooks/use-tab-content-bottom-pad', () => ({ useTabContentBottomPad: () => 0 }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: () => Promise.resolve(), hapticMediumImpact: () => Promise.resolve() }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('../hooks/use_feature_intro', () => ({ useFeatureIntro: () => ({ visible: false, dismiss: jest.fn() }) }));
jest.mock('../app/feature_intro_registry', () => ({ featureIntroById: () => null }));
jest.mock('../components/FeatureIntroModal', () => () => null);
jest.mock('../components/PressableHybrid', () => {
  const ReactTest = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: ({ children, contentStyle, disabled, onPress, ...props }: any) => ReactTest.createElement(
      'Pressable',
      { ...props, disabled, onPress: disabled ? undefined : onPress, style: contentStyle },
      children,
    ),
  };
});
jest.mock('../app/arena_telemetry', () => ({ trackArenaTelemetry: jest.fn() }));
jest.mock('../modules/arena/telemetry', () => ({ arenaFeatureOpenEvent: () => ({}) }));
jest.mock('../components/ui/v2_theme', () => ({ useTournamentPalette: () => ({ bg: '#000', text: '#fff', muted: '#aaa', elev: '#111', elev2: '#222', accent: '#8EEA63', accentText: '#07110A', okInk: '#07110A' }) }));
jest.mock('../modules/arena/copy', () => ({ arenaText: (_lang: string, key: string) => ({ title: 'Arena', ranks: 'Ranks', quick: 'Quick', quickHint: 'Quick hint', subtitle: 'Arena subtitle', spinNow: 'Spin', hubOfflineHint: 'Fresh data returns when the network returns.', arenaNotDeployedHint: 'Server unavailable.', maintenanceHint: 'Maintenance.', reportBlockedHint: 'Update required.' }[key] ?? key) }));
jest.mock('../modules/arena/expansion_copy', () => ({ arenaExpansionText: (_lang: string, key: string) => ({ todayTitle: 'Today', todayBody: 'Ten tasks', todayStart: 'Start today', todayContinue: 'Continue today', todayComplete: 'Complete', wallet: 'Wallet', activeMatch: 'Active match', activeQueue: 'Searching', ghost: 'Ghost', recordingBadge: 'Recording' }[key] ?? key) }));

jest.mock('../app/arena_client', () => ({
  arenaV2Home: () => homeRequests.shift()!.promise,
  arenaExpansionHome: () => expansionRequests.shift()!.promise,
  arenaFetchMatchHistory: () => historyRequests.shift()?.promise ?? new Promise(() => {}),
  arenaV2FriendsBoard: () => new Promise(() => {}),
  arenaFlushOutbox: async () => 0,
  arenaOutboxBlockedByUpdate: () => reportBlockRequests.shift()?.promise ?? Promise.resolve(false),
  arenaV2SpinClaim: jest.fn(),
  createArenaRequestId: () => 'request-id',
}));
jest.mock('../modules/arena/home_cache', () => ({
  arenaPeekHomeWarm: () => memoryWarm,
  arenaLoadHomeWarm: () => diskWarm,
  arenaRememberHomeWarm: (value: unknown) => rememberWarm(value),
  arenaWarmDayKey: () => '2026-08-20',
}));

jest.mock('../components/arena/ArenaScreen', () => ({ ArenaScreen: ({ children, headerRight }: any) => h('View', null, headerRight, children) }));
jest.mock('../components/ui/v2_ui', () => ({ V2Card: ({ children }: any) => h('View', null, children), V2Cta: ({ children, disabled, accessibilityHint, onPress }: any) => h('Pressable', { accessibilityRole: 'button', accessibilityLabel: children, disabled, accessibilityHint, onPress }, h('Text', null, children)) }));
jest.mock('../components/arena/ArenaHubSummary', () => ({ ArenaHubSummary: ({ model }: any) => h('View', null,
  h('Text', { testID: 'hub-live' }, model.rank ? `rank:${model.rank.rp}` : 'rank:unknown'),
  h('Text', { testID: 'last-match' }, model.lastMatch?.matchId ?? 'match:unknown'),
) }));
jest.mock('../components/arena/ArenaModeSheet', () => ({ ArenaModeSheet: ({ visible, options, onSelect }: any) => visible ? h('View', null, ...options.map((option: any) => h('Pressable', { key: option.key, accessibilityRole: 'button', accessibilityLabel: option.title, disabled: option.disabled, accessibilityHint: option.body, onPress: () => onSelect(option.key) }))) : null }));
jest.mock('../components/arena/ArenaHubOverflowSheet', () => ({ ArenaHubOverflowSheet: () => null }));
jest.mock('../components/arena/ArenaDailyGoals', () => ({ ArenaDailyGoals: ({ model }: any) => h('Text', { testID: 'daily-goals' }, model ? 'daily:known' : 'daily:unknown') }));
jest.mock('../components/arena/ArenaConnectionNotice', () => ({ ArenaConnectionNotice: ({ onRetry }: any) => h('Pressable', { testID: 'arena-hub-offline', accessibilityRole: 'button', accessibilityLabel: 'Retry', onPress: onRetry }, h('Text', null, 'Offline')) }));
jest.mock('../components/arena/ArenaExpansionUI', () => ({
  ArenaFeatureRow: ({ title, disabled, disabledHint, onPress }: any) => h('Pressable', { accessibilityRole: 'button', accessibilityLabel: title, disabled, accessibilityHint: disabledHint, onPress }, h('Text', null, title)),
  ArenaProgress: ({ value }: any) => h('Text', { testID: 'today-progress' }, value === null ? 'unknown' : String(value)),
  ArenaStateCard: ({ title }: any) => h('Text', null, title),
  ArenaStateNotice: () => h('Text', null, 'Expansion error'),
  ArenaWalletButton: ({ label, balance }: any) => h('Text', { testID: 'wallet' }, `${label}:${balance === null ? 'unknown' : balance}`),
}));

describe('ArenaHubScreen offline-first orchestration', () => {
  beforeEach(() => {
    homeRequests.length = 0;
    expansionRequests.length = 0;
    historyRequests.length = 0;
    reportBlockRequests.length = 0;
    diskWarm = new Promise(() => {});
    memoryWarm = null;
    rememberWarm.mockClear();
    pushed.length = 0;
  });

  it('renders neutral live, goals, and Today immediately without a skeleton while disk and network remain unresolved', async () => {
    homeRequests.push(deferred());
    expansionRequests.push(deferred());
    const screen = await render(h(ArenaHubScreen));

    expect(screen.getByTestId('hub-live').props.children).toBe('rank:unknown');
    expect(screen.getByTestId('daily-goals').props.children).toBe('daily:unknown');
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByTestId('today-progress').props.children).toBe('unknown');
    expect(screen.queryByTestId('arena-hub-skeleton')).toBeNull();
    await screen.unmount();
  });

  it('keeps yesterday rank but removes daily claims and active run', async () => {
    memoryWarm = { savedDayKey: '2026-08-19', home: home(), expansion: expansion({ activeRun: { runId: 'old', runKind: 'today' } }) };
    homeRequests.push(deferred());
    expansionRequests.push(deferred());
    const screen = await render(h(ArenaHubScreen));

    expect(screen.getByTestId('hub-live').props.children).toBe('rank:900');
    expect(screen.getByTestId('daily-goals').props.children).toBe('daily:unknown');
    expect(screen.getByTestId('today-progress').props.children).toBe('unknown');
    expect(screen.queryByLabelText('Continue today')).toBeNull();
    await screen.unmount();
  });

  it('shows offline notice and disables all match entry controls with an accessible explanation', async () => {
    const base = deferred();
    const extra = deferred();
    homeRequests.push(base);
    expansionRequests.push(extra);
    const screen = await render(h(ArenaHubScreen));
    await flush();
    await act(async () => {
      base.reject(new Error('network offline'));
      extra.reject(new Error('network offline'));
      await flush();
    });

    expect(screen.getByTestId('arena-hub-offline')).toBeTruthy();
    expect(screen.getByTestId('arena-hub-play').props.accessibilityHint).toBe('Fresh data returns when the network returns.');
    await fireEvent.press(screen.getByTestId('arena-hub-play'));
    expect(screen.getByLabelText('Quick').props.disabled).toBe(true);
    expect(screen.getByLabelText('Quick').props.accessibilityHint).toBe('Fresh data returns when the network returns.');
    expect(screen.getByLabelText('Start today').props.disabled).toBe(true);
    await screen.unmount();
  });

  it('uses the newest retry generation and discards a later settlement from the older generation', async () => {
    const oldHome = deferred(); const oldExpansion = deferred();
    const newHome = deferred(); const newExpansion = deferred();
    homeRequests.push(oldHome, newHome);
    expansionRequests.push(oldExpansion, newExpansion);
    const screen = await render(h(ArenaHubScreen));
    await flush();
    await act(async () => {
      oldHome.reject(new Error('network offline'));
      await flush();
    });
    await flush();
    await act(async () => {
      screen.getByTestId('arena-hub-offline').props.onPress();
      newHome.resolve(home({ profile: { ...home().profile, rating: 777 } }));
      newExpansion.resolve(expansion({ wallet: { walletStars: 77 } }));
      await flush();
    });
    expect(rememberWarm).toHaveBeenCalledTimes(3);
    expect(rememberWarm).toHaveBeenNthCalledWith(1, expect.objectContaining({
      home: expect.objectContaining({ profile: expect.objectContaining({ rating: 777 }) }),
    }));
    expect(rememberWarm).toHaveBeenNthCalledWith(2, expect.objectContaining({
      expansion: expect.objectContaining({ wallet: { walletStars: 77 } }),
    }));
    expect(rememberWarm).toHaveBeenNthCalledWith(3, expect.objectContaining({
      home: expect.objectContaining({ profile: expect.objectContaining({ rating: 777 }) }),
      expansion: expect.objectContaining({ wallet: { walletStars: 77 } }),
    }));
    rememberWarm.mockClear();
    await flush();
    await act(async () => {
      oldExpansion.resolve(expansion({ wallet: { walletStars: 11 } }));
      await flush();
    });

    expect(screen.getByTestId('hub-live').props.children).toBe('rank:777');
    expect(rememberWarm).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('keeps the last visible match when a retry cannot refresh history', async () => {
    const firstHome = deferred<any>(); const firstExpansion = deferred<any>();
    const firstHistory = deferred<any[]>();
    const retryHome = deferred<any>(); const retryExpansion = deferred<any>();
    const retryHistory = deferred<any[]>();
    homeRequests.push(firstHome, retryHome);
    expansionRequests.push(firstExpansion, retryExpansion);
    historyRequests.push(firstHistory, retryHistory);
    const screen = await render(h(ArenaHubScreen));
    await flush();

    await act(async () => {
      firstHome.reject(new Error('network offline'));
      firstExpansion.reject(new Error('network offline'));
      firstHistory.resolve([{ matchId: 'kept', outcome: 'win', settledAtMs: 10, reward: {} }]);
      await flush();
    });
    expect(screen.getByTestId('last-match').props.children).toBe('kept');

    await act(async () => {
      screen.getByTestId('arena-hub-offline').props.onPress();
      retryHome.reject(new Error('network offline'));
      retryExpansion.reject(new Error('network offline'));
      retryHistory.reject(new Error('history offline'));
      await flush();
    });

    expect(screen.getByTestId('last-match').props.children).toBe('kept');
    await screen.unmount();
  });

  it('keeps actions unavailable until the pending-report guard is known', async () => {
    const homeRequest = deferred<any>(); const expansionRequest = deferred<any>();
    const reportBlocked = deferred<boolean>();
    homeRequests.push(homeRequest); expansionRequests.push(expansionRequest); reportBlockRequests.push(reportBlocked);
    const screen = await render(h(ArenaHubScreen));
    await act(async () => {
      homeRequest.resolve(home());
      expansionRequest.resolve(expansion());
      await flush();
    });

    const play = screen.getByTestId('arena-hub-play');
    expect(play.props.accessibilityHint).toBe('valueUnknown');
    await fireEvent.press(play);
    expect(screen.getByLabelText('Quick').props.disabled).toBe(true);
    expect(screen.getByLabelText('Quick').props.accessibilityHint).toBe('valueUnknown');

    await act(async () => {
      reportBlocked.resolve(false);
      await flush();
    });
    expect(screen.getByLabelText('Quick').props.disabled).toBe(false);
    await screen.unmount();
  });

  it('allows the central control to resume an active match during maintenance', async () => {
    const homeRequest = deferred<any>(); const expansionRequest = deferred<any>();
    homeRequests.push(homeRequest); expansionRequests.push(expansionRequest);
    const screen = await render(h(ArenaHubScreen));
    await act(async () => {
      homeRequest.resolve(home({
        availability: { ...home().availability, enabled: false },
        activeMatch: { matchId: 'resume-me' },
      }));
      expansionRequest.resolve(expansion());
      await flush();
    });

    await fireEvent.press(screen.getByTestId('arena-hub-play'));
    expect(pushed).toContainEqual({ pathname: '/arena_match', params: { matchId: 'resume-me' } });
    await screen.unmount();
  });

  it('does not update the unmounted screen or warm cache after deferred responses settle', async () => {
    const pendingHome = deferred(); const pendingExpansion = deferred();
    homeRequests.push(pendingHome); expansionRequests.push(pendingExpansion);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const screen = await render(h(ArenaHubScreen));
    await flush();
    await screen.unmount();
    await act(async () => {
      pendingHome.resolve(home()); pendingExpansion.resolve(expansion());
      await flush();
    });

    expect(rememberWarm).not.toHaveBeenCalled();
    expect(error.mock.calls.join('\n')).not.toMatch(/unmounted component|state update on an unmounted/i);
    error.mockRestore();
  });
});
