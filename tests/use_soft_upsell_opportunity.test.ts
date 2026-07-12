import fs from 'fs';
import path from 'path';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';

import { resetSoftUpsellSessionForTests } from '../app/soft_upsell_state';
import { useSoftUpsellOpportunity } from '../hooks/use_soft_upsell_opportunity';

const occupied = { value: false };
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

jest.mock('../components/OverlayArbiter', () => ({ useOverlayOccupied: () => occupied.value }));
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
    await expect(second.result.current.onImpression()).rejects.toThrow('disk');
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
    hook.unmount();

    resetSoftUpsellSessionForTests();
    const active = await renderHook(() => useSoftUpsellOpportunity({ candidates: [candidate], accountScope: 'u2', studyTarget: 'en', hasPremiumAccess: false }));
    await waitFor(() => expect(active.result.current.opportunity).not.toBeNull());
    await act(async () => { await active.result.current.onDismiss(); await active.result.current.onCta(); });
    expect(storage.markSoftUpsellDismissed).toHaveBeenCalledTimes(1);
    expect(analytics).toHaveBeenCalledWith('soft_upsell_dismiss', expect.any(Object));
    expect(analytics).toHaveBeenCalledWith('soft_upsell_cta', expect.objectContaining({ destination: 'personal_plan' }));
  });

});
