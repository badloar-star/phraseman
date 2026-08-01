import fs from 'fs';
import path from 'path';

describe('avatar_select Plus aura contract', () => {
  const screenSource = fs.readFileSync(path.join(__dirname, '../app/avatar_select.tsx'), 'utf8');
  const catalogSource = fs.readFileSync(path.join(__dirname, '../app/customization_catalog.ts'), 'utf8');

  it('unlocks one canonical Plus aura from paid Plus or admin-granted Plus', () => {
    expect(catalogSource).toContain('const plusAura = !aura.proOnly && (aura.premiumOnly === true || aura.vipOnly === true);');
    expect(catalogSource).toContain('const hasPlusAuraAccess = input.isPremium || input.isVip;');
    expect(catalogSource).toContain('(plusAura && hasPlusAuraAccess)');
    expect(catalogSource).not.toContain('premiumAuraAccess');
  });

  it('presents the locked status aura as a Plus upsell', () => {
    expect(catalogSource).toContain('if (plusAura && !hasPlusAuraAccess) {');
    expect(catalogSource).toContain("return { isOwned: false, availability: { kind: 'plus' } };");
    expect(screenSource).toContain("case 'open-plus': return copy.plus;");
    expect(screenSource).toContain("pathname: '/premium_modal'");
    expect(screenSource).not.toContain('Доступно только с VIP-доступом');
    expect(screenSource).not.toContain('shield-checkmark');
  });

  it('passes the Pro entitlement through preview, catalog, and apply validation', () => {
    expect(screenSource).toContain('const { isPremium, isVip, isPro } = usePremium();');
    expect(screenSource).toContain('resolveEffectivePreviewAuraId(previewStoredAuraSelection, isPremium, isVip, isPro)');
    expect(screenSource).toContain('isPro,');
    expect(catalogSource).toContain('if (aura.proOnly && !input.isPro)');
  });

  it('normalizes legacy Plus IDs before tile selection equality', () => {
    expect(screenSource).toContain('const previewAuraCatalogId = previewStoredAuraSelection === null');
    expect(screenSource).toContain(': normalizeAvatarAuraId(previewStoredAuraSelection);');
    expect(screenSource).toContain("item.id === previewAuraCatalogId");
  });
});
