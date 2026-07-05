import { isLowEndDevice, LOW_END_ANDROID_API_LEVEL } from '../hooks/device_perf_tier';

describe('isLowEndDevice', () => {
  it('treats iOS as never low-end (no reliable low-end signal there)', () => {
    expect(isLowEndDevice({ OS: 'ios', Version: '14.0' })).toBe(false);
    expect(isLowEndDevice({ OS: 'ios', Version: '9.0' })).toBe(false);
  });

  it('treats Android below the API threshold as low-end', () => {
    expect(isLowEndDevice({ OS: 'android', Version: LOW_END_ANDROID_API_LEVEL - 1 })).toBe(true);
    expect(isLowEndDevice({ OS: 'android', Version: 21 })).toBe(true);
  });

  it('treats Android at or above the API threshold as not low-end', () => {
    expect(isLowEndDevice({ OS: 'android', Version: LOW_END_ANDROID_API_LEVEL })).toBe(false);
    expect(isLowEndDevice({ OS: 'android', Version: 34 })).toBe(false);
  });

  it('treats an unparseable Android version as not low-end (fail open, no false positives)', () => {
    expect(isLowEndDevice({ OS: 'android', Version: 'unknown' })).toBe(false);
  });

  it('treats other platforms as never low-end', () => {
    expect(isLowEndDevice({ OS: 'web', Version: 0 })).toBe(false);
    expect(isLowEndDevice({ OS: 'windows', Version: 10 })).toBe(false);
  });
});
