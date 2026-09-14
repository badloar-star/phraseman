import React, { act } from 'react';
import { createRoot, type Root } from 'test-renderer';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const mockShouldShow = jest.fn(), mockMark = jest.fn();
jest.mock('../app/feature_intro_registry', () => ({
  shouldShowFeatureIntro: (...args: unknown[]) => mockShouldShow(...args),
  markFeatureIntroSeen: (...args: unknown[]) => mockMark(...args),
}));
import { useRequestedFeatureIntro } from '../hooks/use_requested_feature_intro';

describe('explicit entry explanation before an existing sheet', () => {
  let root: Root;
  let result: ReturnType<typeof useRequestedFeatureIntro>;
  const open = jest.fn();
  function Probe({ active }: { active: boolean }) {
    result = useRequestedFeatureIntro('daily_phrase_first_visit', active, open);
    return null;
  }
  const render = async (active = true) => { await act(() => root.render(React.createElement(Probe, { active }))); };
  beforeEach(() => { root = createRoot(); jest.clearAllMocks(); mockShouldShow.mockResolvedValue(true); });
  afterEach(async () => { await act(() => root.unmount()); });
  it('does not show on Home mount; waits for a request and finishes before opening details', async () => {
    await render(); expect(mockShouldShow).not.toHaveBeenCalled();
    await act(async () => { await result.request(); });
    expect(result.visible).toBe(true); expect(open).not.toHaveBeenCalled(); expect(mockMark).toHaveBeenCalledTimes(1);
    await act(() => result.close()); expect(result.visible).toBe(false); expect(open).not.toHaveBeenCalled();
    await act(() => result.finish()); expect(open).toHaveBeenCalledTimes(1); expect(result.visible).toBe(false);
    await act(() => result.finish()); expect(open).toHaveBeenCalledTimes(1);
  });
  it('opens directly after the once-only explanation has been seen', async () => {
    mockShouldShow.mockResolvedValue(false); await render();
    await act(async () => { await result.request(); });
    expect(open).toHaveBeenCalledTimes(1); expect(result.visible).toBe(false); expect(mockMark).not.toHaveBeenCalled();
  });
  it('cancels navigation when the explanation is dismissed', async () => {
    await render();
    await act(async () => { await result.request(); });
    await act(() => result.cancel());
    expect(result.visible).toBe(false);
    await act(() => result.finish());
    expect(open).not.toHaveBeenCalled();
  });
  it('coalesces taps and cancels pending storage reads on blur', async () => {
    let resolve!: (show: boolean) => void;
    mockShouldShow.mockReturnValue(new Promise<boolean>(r => { resolve = r; }));
    await render();
    await act(() => { void result.request(); void result.request(); });
    expect(mockShouldShow).toHaveBeenCalledTimes(1);
    await render(false); await act(async () => { resolve(true); });
    expect(result.visible).toBe(false); expect(open).not.toHaveBeenCalled(); expect(mockMark).not.toHaveBeenCalled();
  });
  it('late dismissal after leaving does not open another sheet', async () => {
    await render(); await act(async () => { await result.request(); });
    await render(false); await act(() => result.finish()); expect(open).not.toHaveBeenCalled();
  });
  it('can retry the same entry after background cancellation', async () => {
    await render(); await act(async () => { await result.request(); });
    await render(false); await render(true);
    mockShouldShow.mockResolvedValue(false);
    await act(async () => { await result.request(); }); expect(open).toHaveBeenCalledTimes(1);
  });
  it('ignores a saved request callback after unmount', async () => {
    await render(); const request = result.request;
    await act(() => root.unmount());
    await act(async () => { await request(); }); expect(mockShouldShow).not.toHaveBeenCalled();
    root = createRoot();
  });
});
