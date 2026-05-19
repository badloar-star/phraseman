import {
  getForegroundRefreshKind,
  SHORT_BACKGROUND_CLOUD_REFRESH_MS,
} from '../app/app_resume_policy';

describe('app resume policy', () => {
  it('keeps short background round trips local-only', () => {
    expect(getForegroundRefreshKind(2_000)).toBe('local');
    expect(getForegroundRefreshKind(SHORT_BACKGROUND_CLOUD_REFRESH_MS - 1)).toBe('local');
  });

  it('allows cloud refresh only after a long background round trip', () => {
    expect(getForegroundRefreshKind(SHORT_BACKGROUND_CLOUD_REFRESH_MS)).toBe('cloud');
  });
});

