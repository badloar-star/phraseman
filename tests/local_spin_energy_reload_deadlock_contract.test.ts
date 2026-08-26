import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (file: string): string => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('device-local Spin energy reload lock contract', () => {
  test('Spin screen schedules EnergyContext reload without awaiting its account lock', () => {
    const source = read('app/level_reward_spin.tsx');
    expect(source).toContain('void rewardRuntimeRef.current.reloadEnergy().catch(() => {})');
    expect(source).not.toContain('setEnergy: async () => { await rewardRuntimeRef.current.reloadEnergy(); }');
  });

  test('single-gift modal schedules EnergyContext reload without awaiting its account lock', () => {
    const source = read('components/LevelGiftModal.tsx');
    expect(source).toContain('const scheduleEnergyReload = () => { void reloadEnergy().catch(() => {}); };');
    expect(source).not.toContain('const setEnergyFn = async (_n: number) => { await reloadEnergy(); };');
  });

  test('dual-gift modal schedules EnergyContext reload without awaiting its account lock', () => {
    const source = read('components/LevelGiftDualModal.tsx');
    expect(source).toContain('void reloadEnergy().catch(() => {});');
    expect(source).not.toContain('async (_n: number) => { await reloadEnergy(); }');
  });
});
