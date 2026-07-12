import { act, renderHook, waitFor } from '@testing-library/react-native';

import { resetSoftUpsellSessionForTests } from '../app/soft_upsell_state';
import { useSoftUpsellOpportunity } from '../hooks/use_soft_upsell_opportunity';

const occupied = { value: false };
const flags = { first_lesson: true };
const state = {
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
};
const candidate = { trigger: 'first_lesson' as const, value: 1, studyTarget: 'en' as const };
type HookProps = { candidates: typeof candidate[]; accountScope: string; studyTarget: 'en'; hasPremiumAccess: boolean };

describe('useSoftUpsellOpportunity', () => {
  beforeEach(() => {
    occupied.value = false;
    flags.first_lesson = true;
    state.lastGlobalImpressionMs = null;
    state.contextDismissedAtMs = {};
    state.consumedMilestones = [];
    resetSoftUpsellSessionForTests();
    jest.clearAllMocks();
    storage.readSoftUpsellState.mockResolvedValue(state);
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
  });

  it('claims once only for an eligible decision and does not repeat analytics on rerender', async () => {
    const { result, rerender } = await renderHook((props: HookProps) => useSoftUpsellOpportunity(props), { initialProps: {
      candidates: [candidate], accountScope: 'u1', studyTarget: 'en' as const, hasPremiumAccess: false,
    } });
    await waitFor(() => expect(result.current.opportunity?.trigger).toBe('first_lesson'));
    rerender({ candidates: [{ ...candidate }], accountScope: 'u1', studyTarget: 'en', hasPremiumAccess: false });
    expect(analytics.mock.calls.filter(([name]) => name === 'soft_upsell_eligible')).toHaveLength(1);
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
