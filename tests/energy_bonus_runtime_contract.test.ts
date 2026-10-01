import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('bonus energy runtime contract', () => {
  test('EnergyContext loads account-scoped bonus capacity and spends through the durable ledger', () => {
    const source = read('components/EnergyContext.tsx');
    expect(source).toContain('withAccountTransitionLock');
    expect(source).toContain('subscribeAccountGeneration');
    expect(source).toContain('readBonusEnergyForMutation(accountToken)');
    expect(source).toContain('AsyncStorage.multiSet(writes)');
    expect(source).toContain('bonusEnergyCapacity: number');
    expect(source).toContain('settledBonus?.capacity ?? 0');
    expect(source).toContain('commitEnergySessionStart');
    expect(source).not.toMatch(/AsyncStorage\.(?:getItem|setItem|removeItem)\(BONUS_ENERGY_KEY/);

    const runLoad = source.slice(source.indexOf('const runLoad'), source.indexOf('const load ='));
    expect(runLoad.indexOf('readUnlimited()')).toBeLessThan(runLoad.indexOf('withAccountTransitionLock'));
    // зачем (координатор §46, 2026-10-01): readAndRecoverState получил четвёртый
    // аргумент (unlimited); сверяем по префиксу вызова — порядок шагов прежний.
    const recoverCall = 'readAndRecoverState(dynMax, recoveryMs, accountToken';
    expect(runLoad.indexOf(recoverCall)).toBeGreaterThan(-1);
    expect(runLoad.indexOf('withAccountTransitionLock')).toBeLessThan(runLoad.indexOf(recoverCall));
    expect(runLoad.indexOf(recoverCall)).toBeLessThan(runLoad.indexOf('settledBonus?.capacity ?? 0'));
  });

  test('an open app schedules a reload for the exact bonus expiration', () => {
    const source = read('components/EnergyContext.tsx');
    expect(source).toContain('bonusExpiresAt <= Date.now()');
    expect(source).toContain('bonusExpiresAt - Date.now()');
    expect(source).toContain('setTimeout(load, delay)');
  });

  test('recovery timers, countdown, and full notification use the active total capacity', () => {
    const source = read('components/EnergyContext.tsx');
    expect(source).toContain('const activeEnergy = energy + bonusEnergy');
    expect(source).toContain('const activeMaxEnergy = maxEnergy + bonusEnergyCapacity');
    expect(source).toContain('activeEnergy < activeMaxEnergy');
    expect(source).toContain('bonusRef.current + energyRef.current');
    expect(source).toContain('bonusCapacityRef.current + dynMaxRef.current');
  });

  // зачем (координатор §46, 2026-10-01): EnergyBar 2.0 — компактная пилюля
  // «значок + число», слотов больше нет. Суть контракта прежняя: показанное число
  // и ёмкость учитывают временный бонус, не раздувая постоянный максимум.
  test('EnergyBar shows the active total against the active capacity including the bonus', () => {
    const source = read('components/EnergyBar.tsx');
    expect(source).toContain('const activeCap = maxEnergy + Math.max(0, bonusEnergyCapacity)');
    expect(source).toContain('const current = Math.max(0, Math.min(activeCap, energy + bonusEnergy))');
    expect(source).not.toMatch(/Array\.from\(\{ length: (?:safe|active)BonusCapacity \}\)/);
  });

  test('temporary bonus never inflates persisted base energy or the permanent maximum', () => {
    const giftSource = read('app/level_gift_system.ts');
    const energySource = read('app/energy_system.ts');
    const occurrenceHandler = giftSource.slice(
      giftSource.indexOf('const applyEnergyBonusForOccurrence'),
      giftSource.indexOf('const applyEnergyFullForOccurrence'),
    );

    expect(occurrenceHandler).not.toContain("AsyncStorage.setItem('energy_state'");
    expect(occurrenceHandler).not.toContain('energyBase + n');
    expect(giftSource).not.toContain('addEnergy(n)');
    expect(energySource).not.toContain('readBonusEnergyExtra');
  });

  // Кейс «энергия на Главной» снят: владелец убрал энергию с Главной 2.0
  // (01.10); это охраняет home_v2_no_energy_no_share_owner_2026_10_01.test.ts.
});
