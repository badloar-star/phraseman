// Weekly Boons — контракт turbo_regen: override записывается и читается обратно.
// Регресс на аудит-блокер: EnergyContext должен видеть boon-override (раньше читал
// только league-chest). Здесь проверяем сам round-trip override (write→read).
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyTurboRegenOverride,
  readBoonEnergyOverrideMs,
} from '../app/boons/boon_effects_energy';
import { getEnergyRecoveryIntervalMs } from '../app/remote_flags';

afterEach(async () => {
  await AsyncStorage.clear();
});

describe('turbo_regen override round-trip', () => {
  it('после applyTurboRegenOverride читается интервал = база/2', async () => {
    await applyTurboRegenOverride();
    const ms = await readBoonEnergyOverrideMs();
    const base = getEnergyRecoveryIntervalMs();
    expect(ms).toBe(Math.max(1000, Math.floor(base / 2)));
    expect(ms).toBeLessThan(base); // быстрее базового
  });

  it('null, если override не записан', async () => {
    expect(await readBoonEnergyOverrideMs()).toBeNull();
  });

  it('null, если override истёк', async () => {
    // Пишем вручную истёкший override.
    await AsyncStorage.setItem(
      'boon_energy_override_v1',
      JSON.stringify({ expiresAt: 1, recoveryMs: 1000 }),
    );
    expect(await readBoonEnergyOverrideMs()).toBeNull();
    // и ключ должен быть подчищен
    expect(await AsyncStorage.getItem('boon_energy_override_v1')).toBeNull();
  });
});
