import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import ArenaHubScreen from '../app/arena';

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

jest.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style } }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: (value: unknown) => pushed.push(value), replace: jest.fn() }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(() => Promise.resolve()) }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => true }));
jest.mock('../hooks/use_arena_font_scale', () => ({ useArenaFontScale: () => 1 }));
jest.mock('../hooks/use_feature_intro', () => ({ useFeatureIntro: () => ({ visible: false, dismiss: jest.fn() }) }));
jest.mock('../app/feature_intro_registry', () => ({ featureIntroById: () => null }));
jest.mock('../components/FeatureIntroModal', () => () => null);
jest.mock('../app/arena_telemetry', () => ({ trackArenaTelemetry: jest.fn() }));
jest.mock('../modules/arena/telemetry', () => ({ arenaFeatureOpenEvent: () => ({}) }));
jest.mock('../components/tournament/tournament_theme', () => ({ useTournamentPalette: () => ({ text: '#fff', muted: '#aaa', elev2: '#222', accent: '#8EEA63', okInk: '#07110A' }) }));
jest.mock('../modules/arena/copy', () => ({ arenaText: (_lang: string, key: string) => ({ title: 'Arena', ranks: 'Ranks', quick: 'Quick', quickHint: 'Quick hint', subtitle: 'Arena subtitle', spinNow: 'Spin', hubOfflineHint: 'Fresh data returns when the network returns.', arenaNotDeployedHint: 'Server unavailable.', maintenanceHint: 'Maintenance.', reportBlockedHint: 'Update required.' }[key] ?? key) }));
jest.mock('../modules/arena/expansion_copy', () => ({ arenaExpansionText: (_lang: string, key: string) => ({ todayTitle: 'Today', todayBody: 'Ten tasks', todayStart: 'Start today', todayContinue: 'Continue today', todayComplete: 'Complete', wallet: 'Wallet', activeMatch: 'Active match', activeQueue: 'Searching', ghost: 'Ghost', recordingBadge: 'Recording' }[key] ?? key) }));

jest.mock('../app/arena_client', () => ({
  arenaV2Home: () => homeRequests.shift()!.promise,
  arenaExpansionHome: () => expansionRequests.shift()!.promise,
  arenaFetchMatchHistory: () => Promise.resolve([]),
  arenaV2FriendsBoard: () => Promise.resolve({ rows: [] }),
  arenaFlushOutbox: () => Promise.resolve(0),
  arenaOutboxBlockedByUpdate: () => Promise.resolve(false),
  arenaV2SpinClaim: jest.fn(),
  createArenaRequestId: () => 'request-id',
}));
jest.mock('../modules/arena/home_cache', () => ({
  arenaPeekHomeWarm: () => memoryWarm,
  arenaLoadHomeWarm: () => diskWarm,
  arenaRememberHomeWarm: (value: unknown) => rememberWarm(value),
  arenaWarmDayKey: () => '2026-08-20',
}));

jest.mock('../components/arena/ArenaHubChrome', () => ({ ArenaHubChrome: ({ children, matchBlocked, matchBlockedHint }: any) => h('View', null, h('Pressable', { testID: 'central-play', accessibilityRole: 'button', disabled: matchBlocked, accessibilityHint: matchBlockedHint }), children) }));
jest.mock('../components/arena/ArenaScreen', () => ({ ArenaScreen: ({ children, headerRight }: any) => h('View', null, headerRight, children) }));
jest.mock('../components/tournament/tournament_v2_ui', () => ({ V2Card: ({ children }: any) => h('View', null, children), V2Cta: ({ children, disabled, accessibilityHint, onPress }: any) => h('Pressable', { accessibilityRole: 'button', accessibilityLabel: children, disabled, accessibilityHint, onPress }, h('Text', null, children)) }));
jest.mock('../components/arena/ArenaHubLive', () => ({ ArenaHubLive: ({ model }: any) => h('Text', { testID: 'hub-live' }, model.rank ? `rank:${model.rank.rp}` : 'rank:unknown') }));
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

  it('keeps yesterday rank and wallet but removes daily claims and active run', async () => {
    memoryWarm = { home: home(), expansion: expansion({ activeRun: { runId: 'old', runKind: 'today' } }) };
    homeRequests.push(deferred());
    expansionRequests.push(deferred());
    const screen = await render(h(ArenaHubScreen));

    expect(screen.getByTestId('hub-live').props.children).toBe('rank:900');
    expect(screen.getByTestId('wallet').props.children).toBe('Wallet:20');
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
    await act(async () => {
      base.reject(new Error('network offline'));
      extra.reject(new Error('network offline'));
      await flush();
    });

    expect(screen.getByTestId('arena-hub-offline')).toBeTruthy();
    expect(screen.getByTestId('central-play').props.disabled).toBe(true);
    expect(screen.getByTestId('central-play').props.accessibilityHint).toBe('Fresh data returns when the network returns.');
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
    await act(async () => {
      oldHome.reject(new Error('network offline'));
      oldExpansion.reject(new Error('network offline'));
      await flush();
    });
    await flush();
    fireEvent.press(screen.getByTestId('arena-hub-offline'));
    await flush();
    await act(async () => {
      newHome.resolve(home({ profile: { ...home().profile, rating: 777 } }));
      newExpansion.resolve(expansion({ wallet: { walletStars: 77 } }));
      await flush();
    });
    await flush();
    await act(async () => {
      oldHome.resolve(home({ profile: { ...home().profile, rating: 111 } }));
      oldExpansion.resolve(expansion({ wallet: { walletStars: 11 } }));
      await flush();
    });

    expect(screen.getByTestId('hub-live').props.children).toBe('rank:777');
    expect(screen.getByTestId('wallet').props.children).toBe('Wallet:77');
    await screen.unmount();
  });

  it('does not update the unmounted screen or warm cache after deferred responses settle', async () => {
    const pendingHome = deferred(); const pendingExpansion = deferred();
    homeRequests.push(pendingHome); expansionRequests.push(pendingExpansion);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const screen = await render(h(ArenaHubScreen));
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
