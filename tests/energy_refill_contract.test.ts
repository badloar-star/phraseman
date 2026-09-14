import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'EnergyContext.tsx'), 'utf8');

describe('premium energy refill contract', () => {
  it('exposes an immediate persisted refill without adding another timer', () => {
    const start = source.indexOf('const refillToMax = useCallback');
    const end = source.indexOf('const formattedTime', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    expect(body).toContain('const freshDynMax = await readDynMax()');
    expect(body).toContain('dynMaxRef.current = freshDynMax');
    expect(body).toContain('energyRef.current = fullEnergy');
    expect(body).toContain('setEnergy(fullEnergy)');
    expect(body).toMatch(/const writes: \[string, string\]\[\] = \[\[ENERGY_KEY, JSON\.stringify\(state\)\]\]/);
    expect(body).toMatch(/writes\.push\(\[\s*requireGiftAccountStorageKey\(BONUS_ENERGY_KEY, accountToken\)/);
    expect(body).toContain('await AsyncStorage.multiSet(writes)');
    expect(body).not.toContain('AsyncStorage.setItem(ENERGY_KEY');
    expect(body).toContain('writePeekEnergy(fullEnergy, fullEnergy)');
    expect(body).not.toContain('setTimeout');
    expect(body).toContain('for (let attempt = 0; attempt < 2 && isCurrent(); attempt += 1)');
    expect(body).toContain('if (!committed || !isCurrent() || !isCurrentAccountGeneration(accountToken)) return false');
    expect(source).toContain('refillToMax: (isCurrent?: () => boolean) => Promise<boolean>');
  });
});
