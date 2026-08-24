import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { APPROVED_AVATAR_AURAS } from '../constants/avatar_auras';
import { COSMETIC_ASSET_INVENTORY } from '../functions/src/cosmetic_asset_archive';

const ROOT = path.join(__dirname, '..');
const APP_ROOT = path.join(ROOT, 'assets', 'images', 'avatar-auras');
const ADMIN_ROOT = path.join(ROOT, 'admin', 'v2', 'avatar-auras');

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

describe('approved aura app/admin archive parity', () => {
  it('publishes all 39 approved runtime IDs as exact three-layer previews', () => {
    const approvedItems = COSMETIC_ASSET_INVENTORY.filter((item) => (
      item.category === 'aura' && APPROVED_AVATAR_AURAS.some((aura) => aura.id === item.id)
    ));
    expect(approvedItems).toHaveLength(39);
    for (const item of approvedItems) {
      expect(item.render).toBe('aura-layers');
      expect(item.layers).toEqual({
        baseUrl: `https://phraseman-ea0b3.web.app/avatar-auras/${item.id}/base.webp`,
        flowUrl: `https://phraseman-ea0b3.web.app/avatar-auras/${item.id}/flow.webp`,
        particlesUrl: `https://phraseman-ea0b3.web.app/avatar-auras/${item.id}/accents.webp`,
      });
    }
  });

  it('keeps all 117 hosted files byte-identical to the app bundle', () => {
    const hashes = new Set<string>();
    for (const aura of APPROVED_AVATAR_AURAS) {
      for (const layer of ['base', 'flow', 'accents'] as const) {
        const appFile = path.join(APP_ROOT, aura.id, `${layer}.webp`);
        const adminFile = path.join(ADMIN_ROOT, aura.id, `${layer}.webp`);
        expect(fs.existsSync(adminFile)).toBe(true);
        expect(sha256(adminFile)).toBe(sha256(appFile));
        hashes.add(sha256(adminFile));
      }
    }
    expect(hashes.size).toBe(117);
  });

  it('returns all 37 ordinary approved auras to sale while preserving entitlement delivery', () => {
    const byId = new Map(COSMETIC_ASSET_INVENTORY.map((item) => [item.id, item]));
    for (const aura of APPROVED_AVATAR_AURAS) {
      const item = byId.get(aura.id);
      expect(item).toBeDefined();
      if (aura.premiumOnly) {
        expect(item).toMatchObject({ defaultForSale: false, delivery: 'subscription' });
      } else {
        expect(item).toMatchObject({ defaultForSale: true, delivery: 'purchase' });
      }
    }
  });
});
