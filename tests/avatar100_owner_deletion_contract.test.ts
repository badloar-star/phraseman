import fs from 'node:fs';
import path from 'node:path';
import { AVATAR100_CATALOG } from '../constants/avatar100_assets';
import {
  CUSTOM_AVATARS,
  CUSTOM_AVATAR_SHOP,
  getCustomAvatarById,
  parseCustomAvatarValue,
} from '../constants/custom_avatars';

const ROOT = path.resolve(__dirname, '..');

const REMOVED_IDS = [
  73, 75, 76, 77, 81, 83, 86, 87, 88, 89, 92, 93, 96, 99, 103, 104, 105,
  106, 107, 108, 109, 111, 114, 118, 120, 123, 124,
].map((numericId) => `custom-gen-${numericId}`);

const RETAINED_IDS = [94, 101, 102, 112].map((numericId) => `custom-gen-${numericId}`);

const HOSTED_ASSET_DIRECTORIES = [
  'admin/v2/avatars',
  'admin/v2/avatars/avatar100-v1',
  'admin/v2/avatars/legacy-showcase-v1',
] as const;

describe('owner-selected Avatar100 full deletion', () => {
  it('removes every selected id from runtime lookup, parsing, and sale catalogs', () => {
    const runtimeIds = new Set(CUSTOM_AVATARS.map(({ id }) => id));
    const shopIds = new Set(CUSTOM_AVATAR_SHOP.map(({ id }) => id));
    const avatar100Ids = new Set(Object.keys(AVATAR100_CATALOG));

    for (const id of REMOVED_IDS) {
      expect(runtimeIds).not.toContain(id);
      expect(shopIds).not.toContain(id);
      expect(avatar100Ids).not.toContain(id);
      expect(getCustomAvatarById(id)).toBeUndefined();
      expect(parseCustomAvatarValue(`custom:${id}:aurora:black:avatar100-v1`)).toBeNull();
      expect(parseCustomAvatarValue(`custom:${id}:aurora:white:legacy-showcase-v1`)).toBeNull();
    }
  });

  it('retains exactly the four owner-approved sale avatars', () => {
    expect(Object.keys(AVATAR100_CATALOG)).toEqual(RETAINED_IDS);
    expect(CUSTOM_AVATAR_SHOP.map(({ id }) => id)).toEqual(RETAINED_IDS);

    for (const id of RETAINED_IDS) {
      expect(getCustomAvatarById(id)).toBeDefined();
      expect(parseCustomAvatarValue(`custom:${id}:aurora:black:avatar100-v1`))
        .toMatchObject({ avatarId: id, logoColor: 'white' });
      expect(parseCustomAvatarValue(`custom:${id}:aurora:white:avatar100-v1`))
        .toMatchObject({ avatarId: id, logoColor: 'white' });
    }
  });

  it('removes both color assets from all three hosted runtime locations', () => {
    for (const id of REMOVED_IDS) {
      const numericId = id.slice('custom-gen-'.length);
      for (const directory of HOSTED_ASSET_DIRECTORIES) {
        for (const ink of ['black', 'white'] as const) {
          expect(fs.existsSync(path.join(ROOT, directory, `custom-idea-${numericId}-${ink}.webp`)))
            .toBe(false);
        }
      }
    }
  });
});
