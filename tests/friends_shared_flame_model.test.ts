import { friendsFlameVisual } from '../components/friends_together/friends_flame_model';

describe('friends shared flame visual model', () => {
  test.each([
    [{ tier: 0, percent: 0, state: 'locked' as const }, 1, 0.78, false],
    [{ tier: 0, percent: 100, state: 'active' as const }, 1, 0.84, true],
    [{ tier: 1, percent: 0, state: 'active' as const }, 1, 0.84, true],
    [{ tier: 1, percent: 100, state: 'active' as const }, 1, 0.92, true],
    [{ tier: 2, percent: 0, state: 'active' as const }, 2, 0.92, true],
    [{ tier: 2, percent: 100, state: 'active' as const }, 2, 1, true],
    [{ tier: 3, percent: 100, state: 'active' as const }, 3, 1.02, true],
    [{ tier: 3, percent: 100, state: 'ready' as const }, 3, 1.08, true],
    [{ tier: 3, percent: 100, state: 'claimed' as const }, 3, 1.02, false],
  ])('maps %o to stage %s and scale %s', (model, stage, scale, animated) => {
    expect(friendsFlameVisual(model)).toEqual({ stage, scale, animated, ready: model.state === 'ready' });
  });

  it('clamps malformed percent values', () => {
    expect(friendsFlameVisual({ tier: 1, percent: -50, state: 'active' }).scale).toBe(0.84);
    expect(friendsFlameVisual({ tier: 2, percent: 999, state: 'active' }).scale).toBe(1);
  });

  it('normalizes fractional and out-of-range tiers before resolving the visual', () => {
    expect(friendsFlameVisual({ tier: 1.5, percent: 50, state: 'active' })).toMatchObject({ stage: 1, scale: 0.88 });
    expect(friendsFlameVisual({ tier: 4, percent: 0, state: 'active' })).toMatchObject({ stage: 3, scale: 1.02 });
  });

  it('never shrinks as progress advances through tiers', () => {
    const scales = [
      { tier: 0, percent: 0 },
      { tier: 0, percent: 100 },
      { tier: 1, percent: 0 },
      { tier: 1, percent: 100 },
      { tier: 2, percent: 0 },
      { tier: 2, percent: 100 },
      { tier: 3, percent: 0 },
      { tier: 4, percent: 100 },
    ].map((model) => friendsFlameVisual({ ...model, state: 'active' }).scale);

    expect(scales).toEqual([...scales].sort((a, b) => a - b));
  });
});
