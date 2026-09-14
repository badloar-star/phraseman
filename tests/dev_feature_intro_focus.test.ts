import React, { act } from 'react';
import { createRoot, type Root } from 'test-renderer';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let mockDev = false, mockFocused = true;
const mockShow = jest.fn(), mockMark = jest.fn();
jest.mock('../app/feature_intro_dev_replay', () => ({ useDevFeatureIntroReplay: () => mockDev }));
jest.mock('../app/feature_intro_registry', () => ({ shouldShowFeatureIntro: (...args: unknown[]) => mockShow(...args), markFeatureIntroSeen: (...args: unknown[]) => mockMark(...args) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback: () => unknown) => { require('react').useEffect(() => mockFocused ? callback() : undefined, [callback, mockFocused]); } }));
import { useFeatureIntro } from '../hooks/use_feature_intro';
function Probe({ tick }: { tick: number }) { const intro = useFeatureIntro('arena_first_visit'); return React.createElement('Probe', { ...intro, tick }); }
describe('cached screen focus in DEV replay', () => {
  let root: Root, tick: number;
  const current = () => root.container.queryAll(n => n.type === 'Probe')[0].props;
  const render = async () => { await act(() => root.render(React.createElement(Probe, { tick: tick++ }))); };
  const settle = async () => { await act(async () => { jest.advanceTimersByTime(600); await Promise.resolve(); }); };
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); mockDev = false; mockFocused = true; mockShow.mockResolvedValue(true); root = createRoot(); tick = 0; });
  afterEach(async () => { await act(() => root.unmount()); jest.useRealTimers(); });
  it('normal mode still offers once for the mounted screen', async () => {
    await render(); await settle(); expect(current().visible).toBe(true);
    await act(() => current().dismiss(false)); mockFocused = false; await render(); mockFocused = true; await render(); await settle();
    expect(current().visible).toBe(false); expect(mockShow).toHaveBeenCalledTimes(1);
  });
  it('DEV mode repeats after blur, but not immediately after dismissal, and never marks history', async () => {
    mockDev = true; await render(); await settle(); expect(current().visible).toBe(true);
    await act(() => current().dismiss(false)); await settle(); expect(current().visible).toBe(false);
    mockFocused = false; await render(); mockFocused = true; await render(); await settle();
    expect(current().visible).toBe(true); expect(mockShow).toHaveBeenCalledTimes(2); expect(mockMark).not.toHaveBeenCalled();
  });
  it('turning replay off does not mark its last preview through a late dismissal', async () => {
    mockDev = true; await render(); await settle(); const dismiss = current().dismiss;
    mockDev = false; mockShow.mockResolvedValue(false); await render(); await settle(); await act(() => dismiss(false));
    expect(mockMark).not.toHaveBeenCalled(); expect(current().visible).toBe(false);
  });
});
