import React from 'react';
import { act, render, renderHook } from '@testing-library/react-native';
import { useCoinRewardFlight } from '../hooks/useCoinRewardFlight';

let mockReducedMotion: boolean | null = false;
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotionPreference: () => mockReducedMotion }));

type Callback = (x: number, y: number, width: number, height: number) => void;
const point = (callbacks: Callback[]) => ({ measureInWindow: jest.fn((done: Callback) => callbacks.push(done)) });
const resolve = async (callback: Callback) => act(async () => callback(10, 20, 30, 40));

describe('useCoinRewardFlight measurement lifetime', () => {
  beforeEach(() => { mockReducedMotion = false; });

  test('only the latest request can proceed through either native measurement stage', async () => {
    const origins: Callback[] = [], targets: Callback[] = [];
    const { result } = await renderHook(() => useCoinRewardFlight());
    (result.current.originRef as any).current = point(origins);
    (result.current.counterRef as any).current = point(targets);
    await act(async () => { result.current.fly(1); result.current.fly(3); });
    await resolve(origins[1]); await resolve(targets[0]);
    expect(result.current.flight?.count).toBe(3);
    await resolve(origins[0]);
    expect(targets).toHaveLength(1);
    expect(result.current.flight?.count).toBe(3);
  });

  test('null-bound clear invalidates pending work at both native callback stages', async () => {
    for (const stage of ['origin', 'target'] as const) {
      const origins: Callback[] = [], targets: Callback[] = [];
      const { result, unmount } = await renderHook(() => useCoinRewardFlight());
      (result.current.originRef as any).current = point(origins);
      (result.current.counterRef as any).current = point(targets);
      await act(async () => result.current.fly(2));
      if (stage === 'target') await resolve(origins[0]);
      await act(async () => result.current.clearFlight());
      if (stage === 'origin') await resolve(origins[0]); else await resolve(targets[0]);
      expect(result.current.flight).toBeNull(); await unmount();
    }
  });

  test('unmount prevents a next native operation and publication', async () => {
    const origins: Callback[] = [], targets: Callback[] = [];
    const { result, unmount } = await renderHook(() => useCoinRewardFlight());
    (result.current.originRef as any).current = point(origins);
    const target = point(targets); (result.current.counterRef as any).current = target;
    await act(async () => result.current.fly(2)); await unmount(); await resolve(origins[0]);
    expect(target.measureInWindow).not.toHaveBeenCalled();
  });

  test('a captured keyed clear erases only its rendered flight before or after B publishes', async () => {
    const origins: Callback[] = [], targets: Callback[] = [];
    const { result } = await renderHook(() => useCoinRewardFlight());
    (result.current.originRef as any).current = point(origins);
    (result.current.counterRef as any).current = point(targets);
    await act(async () => result.current.fly(1)); await resolve(origins[0]); await resolve(targets[0]);
    const clearA = result.current.clearFlight;
    await act(async () => result.current.fly(3)); await resolve(origins[1]);
    await act(async () => clearA()); await resolve(targets[1]);
    expect(result.current.flight?.count).toBe(3);
    await act(async () => clearA()); expect(result.current.flight?.count).toBe(3);
  });

  test('missing refs and reduced-mode newer intent invalidate older pending work without a visible key', async () => {
    const origins: Callback[] = [], targets: Callback[] = [];
    const { result, rerender } = await renderHook(() => useCoinRewardFlight());
    (result.current.originRef as any).current = point(origins); (result.current.counterRef as any).current = point(targets);
    await act(async () => result.current.fly(1)); (result.current.originRef as any).current = null;
    await act(async () => result.current.fly(3)); await resolve(origins[0]);
    expect(targets).toHaveLength(0); expect(result.current.flight).toBeNull();
    mockReducedMotion = true; await rerender(); await act(async () => result.current.fly(2));
    expect(result.current.flight).toBeNull();
  });

  test('retained fly uses current committed reduced-motion mode', async () => {
    const origins: Callback[] = [], targets: Callback[] = [];
    const { result, rerender } = await renderHook(() => useCoinRewardFlight());
    const retainedFly = result.current.fly;
    (result.current.originRef as any).current = point(origins); (result.current.counterRef as any).current = point(targets);
    mockReducedMotion = true; await rerender(); await act(async () => retainedFly(2));
    expect(origins).toHaveLength(0);
  });

  test('committed reduced-motion change invalidates work pending at either native stage', async () => {
    for (const stage of ['origin', 'target'] as const) {
      const origins: Callback[] = [], targets: Callback[] = [];
      const { result, rerender, unmount } = await renderHook(() => useCoinRewardFlight());
      const target = point(targets);
      (result.current.originRef as any).current = point(origins); (result.current.counterRef as any).current = target;
      await act(async () => result.current.fly(2));
      if (stage === 'target') await resolve(origins[0]);
      mockReducedMotion = true; await rerender();
      if (stage === 'origin') await resolve(origins[0]); else await resolve(targets[0]);
      expect(targets.length).toBe(stage === 'origin' ? 0 : 1);
      expect(result.current.flight).toBeNull(); await unmount(); mockReducedMotion = false;
    }
  });

  test('older target completion cannot replace B after both target measurements began', async () => {
    const origins: Callback[] = [], targets: Callback[] = [];
    const { result } = await renderHook(() => useCoinRewardFlight());
    (result.current.originRef as any).current = point(origins); (result.current.counterRef as any).current = point(targets);
    await act(async () => result.current.fly(1)); await resolve(origins[0]);
    await act(async () => result.current.fly(3)); await resolve(origins[1]);
    await resolve(targets[1]); expect(result.current.flight?.count).toBe(3);
    await resolve(targets[0]); expect(result.current.flight?.count).toBe(3);
  });

  test('a fresh request works after StrictMode render', async () => {
    const origins: Callback[] = [], targets: Callback[] = [];
    const wrapper = ({ children }: { children: React.ReactNode }) => <React.StrictMode>{children}</React.StrictMode>;
    const { result } = await renderHook(() => useCoinRewardFlight(), { wrapper });
    (result.current.originRef as any).current = point(origins); (result.current.counterRef as any).current = point(targets);
    await act(async () => result.current.fly(2));
    await resolve(origins[0]); await resolve(targets[0]);
    expect(result.current.flight?.count).toBe(2);
  });

  test('StrictMode effect replay rejects first-setup callbacks and retains the current request', async () => {
    const origins: Callback[] = [], targets: Callback[] = [];
    const origin = point(origins), target = point(targets);
    const setups = jest.fn();
    let observed: ReturnType<typeof useCoinRewardFlight>['flight'] = null;
    function Probe(): React.JSX.Element | null {
      const flight = useCoinRewardFlight();
      React.useEffect(() => {
        (flight.originRef as any).current = origin;
        (flight.counterRef as any).current = target;
        setups();
        flight.fly(2);
      }, [flight.fly]);
      React.useEffect(() => { observed = flight.flight; }, [flight.flight]);
      return null;
    }
    const view = await render(<React.StrictMode><Probe /></React.StrictMode>);
    expect(setups).toHaveBeenCalledTimes(2);
    expect(origins).toHaveLength(2);
    await resolve(origins[0]);
    expect(target.measureInWindow).not.toHaveBeenCalled();
    expect(observed).toBeNull();
    await resolve(origins[1]); await resolve(targets[0]);
    expect(observed?.count).toBe(2);
    await view.unmount();
  });
});
