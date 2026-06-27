import { selectStatsPremiumBlurPresentation } from '../components/statsPremiumBlurCache';

describe('stats premium blur cache presentation', () => {
  it('always uses the flat veil path; realtime and cached blur are intentionally disabled', () => {
    expect(selectStatsPremiumBlurPresentation({ cachedUri: null, width: 320, height: 240 })).toBe('flat-veil');
    expect(selectStatsPremiumBlurPresentation({ cachedUri: 'file://stats.png', width: 0, height: 240 })).toBe('flat-veil');
    expect(selectStatsPremiumBlurPresentation({ cachedUri: 'file://stats.png', width: 320, height: 240 })).toBe('flat-veil');
  });
});
