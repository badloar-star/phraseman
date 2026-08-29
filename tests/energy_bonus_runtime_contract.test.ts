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
    expect(runLoad.indexOf('withAccountTransitionLock')).toBeLessThan(runLoad.indexOf('readAndRecoverState(dynMax, recoveryMs, accountToken)'));
    expect(runLoad.indexOf('readAndRecoverState(dynMax, recoveryMs, accountToken)')).toBeLessThan(runLoad.indexOf('settledBonus?.capacity ?? 0'));
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

  test('EnergyBar bounds rendered slots without changing the active capacity used by recovery', () => {
    const source = read('components/EnergyBar.tsx');
    expect(source).toContain('const MAX_RENDERED_ENERGY_SLOTS = 32');
    expect(source).toContain('const activeBonusCapacity = Math.max(0, Math.floor(bonusEnergyCapacity))');
    expect(source).toContain('const renderedBonusCapacity = Math.min(');
    expect(source).toContain('Array.from({ length: renderedBonusCapacity })');
    expect(source).not.toContain('Array.from({ length: safeBonusCapacity })');
    expect(source).toContain('maxEnergy + activeBonusCapacity');
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

  test('the home energy control increases current energy and temporary maximum', () => {
    const source = read('app/(tabs)/home.tsx');
    expect(source).toContain('homeEnergyA11yLabel');
    expect(source).toContain('energyCount + energyBonus');
    expect(source).toContain('energyMax + energyBonusCapacity');
    expect(source).toContain('`${homeEnergyTotal}/${homeEnergyMax}`');
    expect(source).toContain('{homeEnergyCountLabel}');
    expect(source).toContain('`${homeEnergyTotal}/${homeEnergyMax} · `');
    expect(source).not.toContain('`${energyCount}/${energyMax} · `');
    expect(source).not.toContain('{`+${energyBonus}`}');
    expect(source).toContain('accessibilityLabel={homeEnergyA11yLabel}');
  });
});
