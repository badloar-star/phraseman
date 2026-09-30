import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string): string =>
  fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');

describe('AI dialogue session energy retirement', () => {
  test('has no energy dependency, spend path, or no-energy branch', () => {
    const session = read('app/ai_dialog_session.tsx');

    expect(session).not.toMatch(/from ['"]\.\.\/components\/EnergyContext['"]/);
    expect(session).not.toContain('useEnergy(');
    expect(session).not.toContain('useEnergySessionIntent(');
    expect(session).not.toContain('confirmDialogEnergy');
    expect(session).not.toContain('dialogEnergyReady');
    expect(session).not.toContain('settleDialogEnergyStart');
    expect(session).not.toContain('dialogNoEnergy');
    expect(session).not.toContain('NoEnergyModal');
  });
});
