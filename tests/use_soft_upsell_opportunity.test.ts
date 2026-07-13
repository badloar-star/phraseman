import fs from 'fs';
import path from 'path';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';

import { resetSoftUpsellSessionForTests } from '../app/soft_upsell_state';
import { useSoftUpsellOpportunity } from '../hooks/use_soft_upsell_opportunity';

const occupied = { value: false };
const releaseLease = jest.fn();
const tryClaim = jest.fn(async () => occupied.value ? null : { token: 'lease-1', release: releaseLease });
const flags: Record<string, boolean> = { first_lesson: true };
const state: {
  schemaVersion: 1;
  lastGlobalImpressionMs: number | null;
  contextDismissedAtMs: Partial<Record<'first_lesson_success', number>>;
  consumedMilestones: string[];
} = {
  schemaVersion: 1 as const,
  lastGlobalImpressionMs: null,
  contextDismissedAtMs: {},
  consumedMilestones: [],
};

jest.mock('../components/OverlayArbiter', () => ({
  useOverlayOccupied: () => occupied.value,
  useOverlayTryClaim: () => tryClaim,
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: 'u1', phase: 'active' }),
  isCurrentAccountGeneration: () => true,
}));
jest.mock('../app/remote_flags', () => ({ getSoftUpsellEnabledByTrigger: () => flags }));
jest.mock('../app/soft_upsell_state', () => {
  const actual = jest.requireActual('../app/soft_upsell_state');
  return {
    ...actual,
    claimSoftUpsell: jest.fn(actual.claimSoftUpsell),
    readSoftUpsellState: jest.fn(async () => state),
    markSoftUpsellImpression: jest.fn(async () => undefined),
    markSoftUpsellDismissed: jest.fn(async () => undefined),
  };
});
jest.mock('../app/analytics', () => ({ trackSoftUpsellEvent: jest.fn(async () => undefined) }));

const analytics = jest.requireMock('../app/analytics').trackSoftUpsellEvent as jest.Mock;
const storage = jest.requireMock('../app/soft_upsell_state') as {
  markSoftUpsellImpression: jest.Mock;
  markSoftUpsellDismissed: jest.Mock;
  readSoftUpsellState: jest.Mock;
  claimSoftUpsell: jest.Mock;
};
const candidate = { trigger: 'first_lesson' as const, value: 1, studyTarget: 'en' as const };
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
type HookProps = { candidates: typeof candidate[]; accountScope: string; studyTarget: 'en'; hasPremiumAccess: boolean };

describe('useSoftUpsellOpportunity', () => {
  beforeEach(() => {
    occupied.value = false;
    flags.first_lesson = true;
    delete flags.weekly_review;
    state.lastGlobalImpressionMs = null;
    state.contextDismissedAtMs = {};
    state.consumedMilestones = [];
    resetSoftUpsellSessionForTests();
    jest.clearAllMocks();
    tryClaim.mockImplementation(async () => occupied.value ? null : { token: 'lease-1', release: releaseLease });
    storage.readSoftUpsellState.mockResolvedValue(state);
  });

  afterEach(async () => {
    await cleanup();
    await Promise.resolve();
  });

  it('does not consume a queued claim after props become stale, allowing the current run to claim', async () => {
    let release!: () => void;
    storage.claimSoftUpsell.mockImplementationOnce(async (args: { canClaim?: () => boolean }) => {
      await new Promise<void>((resolve) => { release = resolve; });
      return args.canClaim?.() !== false;
    });
    const hook = await renderHook((accountScope: string) => useSoftUpsellOpportunity({ candidates: [candidate], accountScope, studyTarget: 'en', hasPremiumAccess: false }), { initialProps: 'old' });
    await waitFor(() => expect(storage.claimSoftUpsell).toHaveBeenCalledTimes(1));
    await hook.rerender('current');
    await act(async () => { release(); await Promise.resolve(); });
    await waitFor(() => expect(hook.result.current.opportunity?.trigger).toBe('first_lesson'));
    expect(storage.claimSoftUpsell).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['premium', { hasPremiumAccess: true }, undefined],
    ['disabled', {}, () => { flags.first_lesson = false; }],
    ['overlay_occupied', {}, () => { occupied.value = true; }],
  ])('suppresses %s without claiming a session', async (reason, overrides, setup) => {
    setup?.();
    const { result } = await renderHook(() => useSoftUpsellOpportunity({
      candidates: [candidate], accountScope: 'u1', studyTarget: 'en', hasPremiumAccess: false, ...overrides,
    }));
    await waitFor(() => expect(analytics).toHaveBeenCalledWith('soft_upsell_suppressed', expect.objectContaining({ suppressionReason: reason })));
    expect(result.current.opportunity).toBeNull();
    expect(storage.claimSoftUpsell).not.toHaveBeenCalled();
  });

  it.each([
    ['global_cooldown', () => { state.lastGlobalImpressionMs = Date.now(); }],
    ['context_cooldown', () => { state.contextDismissedAtMs = { first_lesson_success: Date.now() }; }],
    ['milestone_consumed', () => { state.consumedMilestones = ['first_lesson:1:en']; }],
  ])('does not claim for persisted %s suppression', async (reason, setup) => {
    setup();
    const { result } = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'u1', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(analytics).toHaveBeenCalledWith('soft_upsell_suppressed', expect.objectContaining({ suppressionReason: reason })));
    expect(result.current.opportunity).toBeNull();
    expect(storage.claimSoftUpsell).not.toHaveBeenCalled();
  });

  it('claims once only for an eligible decision and does not repeat analytics on rerender', async () => {
    const { result, rerender } = await renderHook((props: HookProps) => useSoftUpsellOpportunity(props), { initialProps: {
      candidates: [candidate], accountScope: 'u1', studyTarget: 'en' as const, hasPremiumAccess: false,
    } });
    await waitFor(() => expect(result.current.opportunity?.trigger).toBe('first_lesson'));
    rerender({ candidates: [{ ...candidate }], accountScope: 'u1', studyTarget: 'en', hasPremiumAccess: false });
    expect(analytics.mock.calls.filter(([name]) => name === 'soft_upsell_eligible')).toHaveLength(1);
    expect(storage.markSoftUpsellImpression).not.toHaveBeenCalled();
    expect(storage.markSoftUpsellDismissed).not.toHaveBeenCalled();
  });

  it('creates one immutable direct-chain id only after the non-queued overlay lease succeeds', async () => {
    const hook = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'u1', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(hook.result.current.opportunity).not.toBeNull());
    expect(tryClaim).toHaveBeenCalledTimes(1);
    expect(hook.result.current.attribution).toMatchObject({
      trigger: 'first_lesson', context: 'first_lesson_success', mode: 'production',
    });
    expect(hook.result.current.attribution?.impressionId).toBeTruthy();
    expect(analytics).toHaveBeenCalledWith('soft_upsell_eligible', expect.objectContaining({
      soft_upsell_impression_id: hook.result.current.attribution?.impressionId,
      soft_upsell_mode: 'production',
    }));
  });

  it('releases the lease and hides synchronously before non-blocking CTA analytics finishes', async () => {
    let finish!: () => void;
    const hook = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'u1', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(hook.result.current.opportunity).not.toBeNull());
    analytics.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    let result = false;
    await act(async () => { result = await hook.result.current.onCta(); });
    expect(result).toBe(true);
    expect(releaseLease).toHaveBeenCalledTimes(1);
    expect(hook.result.current.opportunity).toBeNull();
    finish();
  });

  it('reclaims a fresh overlay lease after navigation failure without changing the direct-chain id', async () => {
    const firstRelease = jest.fn();
    const retryRelease = jest.fn();
    tryClaim
      .mockResolvedValueOnce({ token: 'lease-first', release: firstRelease })
      .mockResolvedValueOnce({ token: 'lease-retry', release: retryRelease });
    const hook = await renderHook(() => useSoftUpsellOpportunity({
      candidates: [candidate], accountScope: 'nav-retry', studyTarget: 'en', hasPremiumAccess: false,
    }));
    await waitFor(() => expect(hook.result.current.opportunity).not.toBeNull());
    const originalId = hook.result.current.attribution?.impressionId;

    await act(async () => { await hook.result.current.onCta(); });
    expect(firstRelease).toHaveBeenCalledTimes(1);
    expect(hook.result.current.opportunity).toBeNull();

    let restored = false;
    await act(async () => { restored = await hook.result.current.onNavigationFailure(); });
    expect(restored).toBe(true);
    expect(tryClaim).toHaveBeenCalledTimes(2);
    expect(retryRelease).not.toHaveBeenCalled();
    expect(hook.result.current.opportunity?.trigger).toBe('first_lesson');
    expect(hook.result.current.attribution?.impressionId).toBe(originalId);
  });

  it('reports session cap after another eligible hook has claimed', async () => {
    const first = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'u1', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(first.result.current.opportunity).not.toBeNull());
    const second = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'u2', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(analytics).toHaveBeenCalledWith('soft_upsell_suppressed', expect.objectContaining({ suppressionReason: 'session_cap' })));
    expect(second.result.current.opportunity).toBeNull();
    expect(storage.claimSoftUpsell).toHaveBeenCalledTimes(2);
  });

  it('persists an explicit impression once before tracking it, and fails closed on storage failure', async () => {
    const { result } = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'u1', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(result.current.opportunity).not.toBeNull());
    await act(async () => { await result.current.onImpression(); await result.current.onImpression(); });
    expect(storage.markSoftUpsellImpression).toHaveBeenCalledTimes(1);
    expect(analytics.mock.calls.filter(([name]) => name === 'soft_upsell_impression')).toHaveLength(1);

    storage.markSoftUpsellImpression.mockRejectedValueOnce(new Error('disk'));
    resetSoftUpsellSessionForTests();
    const second = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'u2', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(second.result.current.opportunity).not.toBeNull());
    await expect(second.result.current.onImpression()).resolves.toBeUndefined();
    await expect(second.result.current.onImpression()).resolves.toBeUndefined();
    expect(storage.markSoftUpsellImpression).toHaveBeenCalledTimes(3);
    expect(analytics.mock.calls.filter(([name]) => name === 'soft_upsell_impression')).toHaveLength(2);
  });

  it('coalesces concurrent impression calls into one persistence operation', async () => {
    let release!: () => void;
    storage.markSoftUpsellImpression.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    const hook = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'concurrent', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(hook.result.current.opportunity).not.toBeNull());
    const first = hook.result.current.onImpression();
    const second = hook.result.current.onImpression();
    expect(storage.markSoftUpsellImpression).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
    expect(analytics.mock.calls.filter(([name]) => name === 'soft_upsell_impression')).toHaveLength(1);
  });

  it('uses deterministic value signatures and never polls or navigates', async () => {
    flags.weekly_review = true;
    const weekly = { trigger: 'weekly_review' as const, value: 1, studyTarget: 'en' as const };
    const hook = await renderHook((items: (typeof candidate | typeof weekly)[]) => useSoftUpsellOpportunity({ candidates: items, accountScope: 'order', studyTarget: 'en', hasPremiumAccess: false }), { initialProps: [candidate, weekly] });
    await waitFor(() => expect(hook.result.current.opportunity?.trigger).toBe('weekly_review'));
    await hook.rerender([weekly, candidate]);
    expect(storage.readSoftUpsellState).toHaveBeenCalledTimes(1);
    const source = fs.readFileSync(path.join(process.cwd(), 'hooks/use_soft_upsell_opportunity.ts'), 'utf8');
    expect(source).not.toMatch(/setInterval|setTimeout|useRouter|router\.|navigate|expo-router/);
  });

  it('keeps dismiss and CTA distinct and ignores stale async reads after candidates change/unmount', async () => {
    let resolve!: (value: typeof state) => void;
    storage.readSoftUpsellState.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const hook = await renderHook((candidates: typeof candidate[]) => useSoftUpsellOpportunity({ candidates, accountScope: 'u1', studyTarget: 'en', hasPremiumAccess: false }), { initialProps: [candidate] });
    await hook.rerender([]);
    await act(async () => { resolve(state); await Promise.resolve(); });
    await waitFor(() => expect(hook.result.current.opportunity).toBeNull());
    await hook.unmount();

    resetSoftUpsellSessionForTests();
    const active = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'u2', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(active.result.current.opportunity).not.toBeNull());
    await act(async () => { await active.result.current.onCta(); await active.result.current.onDismiss(); });
    await waitFor(() => expect(active.result.current.opportunity).toBeNull());
    expect(storage.markSoftUpsellDismissed).not.toHaveBeenCalled();
    expect(analytics).not.toHaveBeenCalledWith('soft_upsell_dismiss', expect.any(Object));
    expect(analytics).toHaveBeenCalledWith('soft_upsell_cta', expect.objectContaining({ destination: 'paywall' }));
  });

  it('hides immediately on dismiss, retries transient persistence, and tracks only success', async () => {
    let rejectPersist!: (error: Error) => void;
    storage.markSoftUpsellDismissed.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectPersist = reject; }));
    const hook = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'dismiss-retry', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(hook.result.current.opportunity).not.toBeNull());
    let failed!: Promise<void>;
    await act(async () => { failed = hook.result.current.onDismiss(); await Promise.resolve(); });
    await waitFor(() => expect(hook.result.current.opportunity).toBeNull());
    rejectPersist(new Error('disk'));
    await expect(failed).resolves.toBeUndefined();
    expect(storage.markSoftUpsellDismissed).toHaveBeenCalledTimes(2);
    expect(analytics.mock.calls.filter(([name]) => name === 'soft_upsell_dismiss')).toHaveLength(1);
  });

  it('contains two dismiss persistence failures without analytics or an unhandled rejection', async () => {
    storage.markSoftUpsellDismissed.mockRejectedValueOnce(new Error('disk-1')).mockRejectedValueOnce(new Error('disk-2'));
    const hook = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'dismiss-fail', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(hook.result.current.opportunity).not.toBeNull());
    await act(async () => { await hook.result.current.onDismiss(); });
    expect(hook.result.current.opportunity).toBeNull();
    expect(storage.markSoftUpsellDismissed).toHaveBeenCalledTimes(2);
    expect(analytics.mock.calls.filter(([name]) => name === 'soft_upsell_dismiss')).toHaveLength(0);
  });

  it('filters candidates to the requested study target before deciding or claiming', async () => {
    const french = { ...candidate, studyTarget: 'fr' as const };
    const hook = await renderHook(() => useSoftUpsellOpportunity({ candidates: [french], accountScope: 'target', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(storage.readSoftUpsellState).toHaveBeenCalled());
    expect(hook.result.current.opportunity).toBeNull();
    expect(storage.claimSoftUpsell).not.toHaveBeenCalled();
    expect(analytics).not.toHaveBeenCalled();
  });

  it('synchronously hides stale identity and makes callbacks from the prior identity no-op', async () => {
    const french = { ...candidate, studyTarget: 'fr' as const };
    type Props = { accountScope: string; studyTarget: 'en' | 'fr'; candidates: typeof candidate[] | typeof french[] };
    const hook = await renderHook((props: Props) => useSoftUpsellOpportunity({ ...props, hasPremiumAccess: false }), {
      initialProps: { accountScope: 'A', studyTarget: 'en', candidates: [candidate] },
    });
    await waitFor(() => expect(hook.result.current.opportunity).not.toBeNull());
    const stale = {
      onImpression: hook.result.current.onImpression,
      onDismiss: hook.result.current.onDismiss,
      onCta: hook.result.current.onCta,
    };
    jest.clearAllMocks();
    resetSoftUpsellSessionForTests();
    await hook.rerender({ accountScope: 'B', studyTarget: 'fr', candidates: [french] });
    expect(hook.result.current.opportunity?.studyTarget ?? null).not.toBe('en');
    const analyticsCallsBeforeStaleActions = analytics.mock.calls.length;
    await Promise.all([stale.onImpression(), stale.onDismiss(), stale.onCta()]);
    expect(storage.markSoftUpsellImpression).not.toHaveBeenCalled();
    expect(storage.markSoftUpsellDismissed).not.toHaveBeenCalled();
    expect(analytics).toHaveBeenCalledTimes(analyticsCallsBeforeStaleActions);
    await waitFor(() => expect(hook.result.current.opportunity?.studyTarget).toBe('fr'));
  });

  it('writes captured impression scope but skips analytics if identity changes during persistence', async () => {
    let release!: () => void;
    storage.markSoftUpsellImpression.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    const hook = await renderHook((accountScope: string) => useSoftUpsellOpportunity({ candidates: [candidate], accountScope, studyTarget: 'en', hasPremiumAccess: false }), { initialProps: 'A' });
    await waitFor(() => expect(hook.result.current.opportunity).not.toBeNull());
    const pending = hook.result.current.onImpression();
    await hook.rerender('B');
    release();
    await pending;
    expect(storage.markSoftUpsellImpression).toHaveBeenCalledWith('A', 'en', expect.any(String), expect.any(String), expect.any(Number));
    expect(analytics.mock.calls.filter(([name]) => name === 'soft_upsell_impression')).toHaveLength(0);
  });

  it('writes captured dismiss scope but skips analytics if identity changes during persistence', async () => {
    let release!: () => void;
    storage.markSoftUpsellDismissed.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    const hook = await renderHook((accountScope: string) => useSoftUpsellOpportunity({ candidates: [candidate], accountScope, studyTarget: 'en', hasPremiumAccess: false }), { initialProps: 'A' });
    await waitFor(() => expect(hook.result.current.opportunity).not.toBeNull());
    let pending!: Promise<void>;
    await act(async () => { pending = hook.result.current.onDismiss(); await Promise.resolve(); });
    await hook.rerender('B');
    release();
    await pending;
    expect(storage.markSoftUpsellDismissed).toHaveBeenCalledWith('A', 'en', expect.any(String), expect.any(Number));
    expect(analytics.mock.calls.filter(([name]) => name === 'soft_upsell_dismiss')).toHaveLength(0);
  });

  it('does not wait for CTA analytics and invalidates subsequent stale callbacks after identity changes', async () => {
    let release!: () => void;
    const hook = await renderHook((accountScope: string) => useSoftUpsellOpportunity({ candidates: [candidate], accountScope, studyTarget: 'en', hasPremiumAccess: false }), { initialProps: 'A' });
    await waitFor(() => expect(hook.result.current.opportunity).not.toBeNull());
    analytics.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    let result = false;
    await act(async () => { result = await hook.result.current.onCta(); });
    await hook.rerender('B');
    release();
    expect(result).toBe(true);
    await expect(hook.result.current.onCta()).resolves.toBe(false);
  });

});
