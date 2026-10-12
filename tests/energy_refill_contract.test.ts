import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'EnergyContext.tsx'), 'utf8');
// зачем (координатор 12.10, взаимная блокировка после оплаты): запись полной энергии вынесена в energy_premium_refill и
// принимает lease держателя замка аккаунта; поведение на настоящем замке — tests/paywall_refill_lock_reentry.test.ts.
const refillSource = fs.readFileSync(path.join(process.cwd(), 'app', 'energy_premium_refill.ts'), 'utf8');

describe('premium energy refill contract', () => {
  it('exposes an immediate persisted refill without adding another timer', () => {
    const start = source.indexOf('const refillToMax = useCallback');
    const end = source.indexOf('const formattedTime', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    expect(body).toContain('await persistPremiumEnergyRefill({ isCurrent, accountToken, readDynMax, lease })');
    expect(body).toContain('dynMaxRef.current = freshDynMax');
    expect(body).toContain('energyRef.current = fullEnergy');
    expect(body).toContain('setEnergy(fullEnergy)');
    expect(body).toContain('writePeekEnergy(fullEnergy, fullEnergy)');
    expect(body).not.toContain('setTimeout');
    expect(body).toContain('if (!committed || !isCurrent() || !isCurrentAccountGeneration(accountToken)) return false');
    expect(source).toContain('refillToMax: (isCurrent?: () => boolean, lease?: AccountTransitionLockLease) => Promise<boolean>');
  });

  it('persists energy and bonus in one multiSet under the account lock re-entered by lease', () => {
    expect(refillSource).toContain('const freshDynMax = await readDynMax()');
    expect(refillSource).toMatch(/const writes: \[string, string\]\[\] = \[\[PREMIUM_REFILL_ENERGY_KEY, JSON\.stringify\(state\)\]\]/);
    expect(refillSource).toMatch(/writes\.push\(\[\s*requireGiftAccountStorageKey\(BONUS_ENERGY_KEY, accountToken\)/);
    expect(refillSource).toContain('await AsyncStorage.multiSet(writes)');
    expect(refillSource).toContain('for (let attempt = 0; attempt < 2 && isCurrent(); attempt += 1)');
    expect(refillSource).toMatch(/\}, lease\);/);
    expect(refillSource).toContain("export const PREMIUM_REFILL_ENERGY_KEY = 'energy_state'");
    expect(source).toContain("const ENERGY_KEY = 'energy_state'");
  });
});
