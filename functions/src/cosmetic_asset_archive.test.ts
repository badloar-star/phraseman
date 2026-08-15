import fs from 'fs';
import path from 'path';
import { COSMETIC_ASSET_INVENTORY } from './cosmetic_asset_archive';

const RETIRED_AURAS = [
  'aura-aurora',
  'aura-violet',
  'aura-coral',
  'aura-lagoon',
  'aura-sunset',
];

describe('server-backed cosmetic asset archive', () => {
  it('lists every managed aura and custom-gen avatar, including off-sale assets', () => {
    const auras = COSMETIC_ASSET_INVENTORY.filter((item) => item.category === 'aura');
    const avatars = COSMETIC_ASSET_INVENTORY.filter((item) => item.category === 'avatar');

    expect(auras).toHaveLength(16);
    expect(avatars).toHaveLength(62);
    expect(retiredDefaults(auras)).toEqual(RETIRED_AURAS);
    expect(avatars.filter((item) => item.defaultForSale).map((item) => item.id))
      .toEqual(Array.from({ length: 22 }, (_, offset) => `custom-gen-${String(offset + 41).padStart(2, '0')}`));
    expect(avatars.filter((item) => !item.defaultForSale)).toHaveLength(40);
    expect(avatars.filter((item) => !item.defaultForSale).every((item) => item.delivery === 'legacy')).toBe(true);
  });

  it('serves avatar previews from hosting rather than function payload bytes', () => {
    const avatars = COSMETIC_ASSET_INVENTORY.filter((item) => item.category === 'avatar');
    expect(avatars.every((item) => item.previewUrl?.startsWith(
      'https://phraseman-ea0b3.web.app/avatars/',
    ))).toBe(true);
    expect(avatars.every((item) => item.alternatePreviewUrl?.endsWith('-white.webp'))).toBe(true);
  });

  it('keeps admin mutations guarded, idempotent and audited', () => {
    const source = fs.readFileSync(path.join(__dirname, 'cosmetic_asset_archive.ts'), 'utf8');
    expect(source.match(/ADMIN_SENSITIVE_WRITE_OPTIONS/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('requireAdminAppCheck(request)');
    expect(source).toContain("collection('admin_command_operations')");
    expect(source).toContain("item.delivery !== 'purchase' && item.delivery !== 'legacy'");
    expect(source).toContain("collection('admin_log')");
    expect(source).toContain('createAuditRecord({');
  });
});

function retiredDefaults(items: typeof COSMETIC_ASSET_INVENTORY): string[] {
  return items
    .filter((item) => RETIRED_AURAS.includes(item.id) && !item.defaultForSale)
    .map((item) => item.id);
}
