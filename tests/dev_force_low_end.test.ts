import { getDevForceLowEnd, setDevForceLowEnd } from '../hooks/dev_force_low_end';

describe('dev_force_low_end store', () => {
  afterEach(() => {
    setDevForceLowEnd(null); // не протекать между тестами
  });

  it('defaults to null (does not override the real device tier)', () => {
    expect(getDevForceLowEnd()).toBeNull();
  });

  it('stores true when forced on', () => {
    setDevForceLowEnd(true);
    expect(getDevForceLowEnd()).toBe(true);
  });

  it('stores false when forced off', () => {
    setDevForceLowEnd(false);
    expect(getDevForceLowEnd()).toBe(false);
  });

  it('returns to null when cleared', () => {
    setDevForceLowEnd(true);
    setDevForceLowEnd(null);
    expect(getDevForceLowEnd()).toBeNull();
  });
});
