import { getMaxEnergyForLevel, getNextEnergyUnlockLevel } from '../constants/theme';

describe('energy capacity by level', () => {
  it('keeps five energy slots through level 49', () => {
    expect(getMaxEnergyForLevel(-10)).toBe(5);
    expect(getMaxEnergyForLevel(1)).toBe(5);
    expect(getMaxEnergyForLevel(10)).toBe(5);
    expect(getMaxEnergyForLevel(49)).toBe(5);
    expect(getNextEnergyUnlockLevel(1)).toBe(50);
    expect(getNextEnergyUnlockLevel(49)).toBe(50);
    expect(getMaxEnergyForLevel(49, 7)).toBe(7);
  });

  it('unlocks only one extra energy slot from level 50 onward', () => {
    expect(getMaxEnergyForLevel(50)).toBe(6);
    expect(getMaxEnergyForLevel(999)).toBe(6);
    expect(getNextEnergyUnlockLevel(50)).toBeNull();
    expect(getNextEnergyUnlockLevel(999)).toBeNull();
    expect(getMaxEnergyForLevel(50, 7)).toBe(8);
  });
});
