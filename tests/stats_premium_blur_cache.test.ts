import { selectStatsPremiumBlurPresentation } from '../components/statsPremiumBlurCache';

describe('stats premium blur cache presentation', () => {
  it('uses live blur until a real captured bitmap is available', () => {
    expect(selectStatsPremiumBlurPresentation({ cachedUri: null, width: 320, height: 240 })).toBe('live-blur');
    expect(selectStatsPremiumBlurPresentation({ cachedUri: 'file://stats.png', width: 0, height: 240 })).toBe('live-blur');
  });

  it('uses the cached blurred image when the real stats capture has dimensions', () => {
    expect(selectStatsPremiumBlurPresentation({ cachedUri: 'file://stats.png', width: 320, height: 240 })).toBe('cached-image');
  });
});
