import { act, renderHook } from '@testing-library/react-native';

import { useFeatureIntro } from '../hooks/use_feature_intro';

const shouldShowFeatureIntro = jest.fn<Promise<boolean>, [string]>();

jest.mock('@react-navigation/native', () => {
  const ReactTest = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => ReactTest.useEffect(effect, [effect]),
  };
});

jest.mock('../app/feature_intro_registry', () => ({
  shouldShowFeatureIntro: (id: string) => shouldShowFeatureIntro(id),
  markFeatureIntroSeen: jest.fn(() => Promise.resolve()),
}));

describe('useFeatureIntro tab ownership', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    shouldShowFeatureIntro.mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hides an already-open intro as soon as its main tab loses ownership', async () => {
    const { result, rerender } = await renderHook(
      ({ enabled }: { enabled: boolean }) => useFeatureIntro('arena_first_visit', enabled),
      { initialProps: { enabled: true } },
    );

    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
    });
    expect(result.current.visible).toBe(true);

    await rerender({ enabled: false });
    expect(result.current.visible).toBe(false);
  });
});
