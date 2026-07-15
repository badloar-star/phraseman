import fs from 'fs';
import path from 'path';

describe('avatar_select paid aura contract', () => {
  const screenSource = fs.readFileSync(path.join(__dirname, '../app/avatar_select.tsx'), 'utf8');
  const catalogSource = fs.readFileSync(path.join(__dirname, '../app/customization_catalog.ts'), 'utf8');

  it('does not unlock either status aura from a subscription flag', () => {
    expect(catalogSource).not.toContain('hasPlusAuraAccess');
    expect(catalogSource).not.toContain('(plusAura && hasPlusAuraAccess)');
    expect(catalogSource).toContain("availability: { kind: 'shards', cost: AVATAR_AURA_BUY_COST }");
  });

  it('routes a locked aura through the shard purchase confirmation', () => {
    expect(screenSource).toContain("target: 'aura' as const");
    expect(screenSource).toContain("spendReason: 'avatar_aura' as const");
    expect(screenSource).toContain("dispatchPurchase({ type: 'request', input })");
  });
});
