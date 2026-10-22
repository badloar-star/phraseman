import { act, cleanup, renderHook } from '@testing-library/react-native';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: jest.fn(() => ({ generation: 1, stableId: 'dev', phase: 'active' })),
  isCurrentAccountGeneration: jest.fn(() => true),
  subscribeAccountGeneration: jest.fn(() => ({ remove: jest.fn() })),
}));

import { createHomePollV2Fixture } from '../app/home_polls/home_polls_v2_fixture';
import { useHomePollV2 } from '../hooks/use_home_poll_v2';

afterEach(cleanup);

describe('useHomePollV2 optimistic progression', () => {
  it('advances immediately through every question and shows thanks without waiting for callable results', async () => {
    const base = createHomePollV2Fixture('fresh');
    const fixture = { snapshot: base.snapshot, vote: jest.fn(() => new Promise<never>(() => {})) };
    const hook = await renderHook(() => useHomePollV2({ lang: 'ru', fixture }));

    expect(hook.result.current).toMatchObject({ phase: 'question', step: 1, total: 3 });

    await act(() => hook.result.current.choose('o1'));
    expect(hook.result.current).toMatchObject({ phase: 'question', step: 2, total: 3 });

    await act(() => hook.result.current.choose('o2'));
    expect(hook.result.current).toMatchObject({ phase: 'question', step: 3, total: 3 });

    await act(() => hook.result.current.choose('o3'));
    expect(hook.result.current).toMatchObject({ phase: 'thanks', step: 3, total: 3 });
  });
});
