import fs from 'fs';
import path from 'path';

describe('avatar_select Plus aura contract', () => {
  const screenSource = fs.readFileSync(path.join(__dirname, '../app/avatar_select.tsx'), 'utf8');
  const catalogSource = fs.readFileSync(path.join(__dirname, '../app/customization_catalog.ts'), 'utf8');

  it('unlocks both Plus aura variants from paid Plus or admin-granted Plus', () => {
    expect(catalogSource).toContain('const plusAura = aura.premiumOnly === true || aura.vipOnly === true;');
    expect(catalogSource).toContain('const hasPlusAuraAccess = input.isPremium || input.isVip;');
    expect(catalogSource).toContain('(plusAura && hasPlusAuraAccess)');
    expect(catalogSource).not.toContain('premiumAuraAccess');
  });

  it('presents both locked status auras as Plus upsells', () => {
    expect(catalogSource).toContain('if (plusAura && !hasPlusAuraAccess) {');
    expect(catalogSource).toContain("return { isOwned: false, availability: { kind: 'plus' } };");
    expect(screenSource).toContain("case 'open-plus': return copy.plus;");
    expect(screenSource).toContain("pathname: '/premium_modal'");
    expect(screenSource).not.toContain('Доступно только с VIP-доступом');
    expect(screenSource).not.toContain('shield-checkmark');
  });
});
