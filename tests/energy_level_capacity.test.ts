import { getMaxEnergyForLevel, getNextEnergyUnlockLevel } from '../constants/theme';

describe('energy capacity by level', () => {
  it('keeps one universal 100-point base capacity at every level', () => {
    expect(getMaxEnergyForLevel(-10)).toBe(100);
    expect(getMaxEnergyForLevel(1)).toBe(100);
    expect(getMaxEnergyForLevel(10)).toBe(100);
    expect(getMaxEnergyForLevel(49)).toBe(100);
    expect(getMaxEnergyForLevel(999)).toBe(100);
  });

  it('does not unlock level-based capacity', () => {
    expect(getNextEnergyUnlockLevel(1)).toBeNull();
    expect(getNextEnergyUnlockLevel(49)).toBeNull();
    expect(getNextEnergyUnlockLevel(50)).toBeNull();
    expect(getNextEnergyUnlockLevel(999)).toBeNull();
    expect(getMaxEnergyForLevel(50, 120)).toBe(100);
  });
});
