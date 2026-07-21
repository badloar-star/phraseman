import {
  cumulativeAccessRequirement,
  localPerformanceMinimum,
} from '../modules/learning-v2/contracts/stars';

describe('V2 gate curve', () => {
  it('matches the published pilot curve', () => {
    expect(cumulativeAccessRequirement(2)).toBe(14);
    expect(cumulativeAccessRequirement(16)).toBe(215);
    expect(cumulativeAccessRequirement(32)).toBe(484);
  });

  it('uses chapter-local performance minima', () => {
    expect(localPerformanceMinimum(1)).toBe(14);
    expect(localPerformanceMinimum(8)).toBe(14);
    expect(localPerformanceMinimum(9)).toBe(15);
    expect(localPerformanceMinimum(32)).toBe(17);
  });

  it('rejects a target outside episodes 2..32', () => {
    expect(() => cumulativeAccessRequirement(1)).toThrow('gate_target_invalid');
    expect(() => cumulativeAccessRequirement(33)).toThrow('gate_target_invalid');
  });
});
