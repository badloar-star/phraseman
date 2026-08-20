import { arenaProgressView } from '../modules/arena/progress_view';

describe('arenaProgressView', () => {
  it.each([
    [null, 10, { value: null, max: 10, ratio: 0 }],
    [0, 10, { value: 0, max: 10, ratio: 0 }],
    [-4, 10, { value: 0, max: 10, ratio: 0 }],
    [14, 10, { value: 10, max: 10, ratio: 1 }],
    [NaN, 10, { value: null, max: 10, ratio: 0 }],
    [Infinity, 10, { value: null, max: 10, ratio: 0 }],
    [-Infinity, 10, { value: null, max: 10, ratio: 0 }],
    [5, -10, { value: 0, max: 0, ratio: 0 }],
    [5, NaN, { value: 0, max: 0, ratio: 0 }],
  ] as const)('normalizes value %p and max %p', (value, max, expected) => {
    expect(arenaProgressView(value, max)).toEqual(expected);
  });
});
