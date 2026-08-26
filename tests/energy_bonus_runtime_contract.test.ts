import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('bonus energy runtime contract', () => {
  test('EnergyContext uses the account-scoped mutation API for spend and refund', () => {
    const source = read('components/EnergyContext.tsx');
    expect(source).toContain('withAccountTransitionLock');
    expect(source).toContain('subscribeAccountGeneration');
    expect(source).toContain('readBonusEnergy(accountToken)');
    expect(source).toContain('consumeBonusEnergy');
    expect(source).toContain('restoreBonusEnergy');
    expect(source).toContain('consumeBonusEnergy(1, accountToken, accountTransitionLockLease)');
    expect(source).toContain('consumeBonusEnergy(requestedBonus, accountToken, accountTransitionLockLease)');
    expect(source).toMatch(/restoreBonusEnergy\(\s*1,\s*spentBonus\.expiresAt,\s*spentBonus\.accountToken,\s*accountTransitionLockLease,/);
    expect(source).toContain('if (!spentBonus || Date.now() >= spentBonus.expiresAt) return;');
    expect(source).not.toMatch(/AsyncStorage\.(?:getItem|setItem|removeItem)\(BONUS_ENERGY_KEY/);

    const runLoad = source.slice(source.indexOf('const runLoad'), source.indexOf('const load ='));
    expect(runLoad.indexOf('readUnlimited()')).toBeLessThan(runLoad.indexOf('withAccountTransitionLock'));
    expect(runLoad.indexOf('withAccountTransitionLock')).toBeLessThan(runLoad.indexOf('readBonusEnergy(accountToken)'));
    expect(runLoad.indexOf('readBonusEnergy(accountToken)')).toBeLessThan(runLoad.indexOf('bonusRef.current = bonus'));
  });

  test('an open app schedules a reload for the exact bonus expiration', () => {
    const source = read('components/EnergyContext.tsx');
    expect(source).toContain('bonusExpiresAt <= Date.now()');
    expect(source).toContain('bonusExpiresAt - Date.now()');
    expect(source).toContain('setTimeout(load, delay)');
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

  test('the home energy control adds bonus only to the visible numerator', () => {
    const source = read('app/(tabs)/home.tsx');
    expect(source).toContain('homeEnergyA11yLabel');
    expect(source).toContain('energyCount + energyBonus');
    expect(source).toContain('`${homeEnergyTotal}/${Math.max(1, energyMax)}`');
    expect(source).toContain('{homeEnergyCountLabel}');
    expect(source).toContain('`${homeEnergyTotal}/${energyMax} · `');
    expect(source).not.toContain('`${energyCount}/${energyMax} · `');
    expect(source).not.toContain('{`+${energyBonus}`}');
    expect(source).toContain('accessibilityLabel={homeEnergyA11yLabel}');
  });
});
