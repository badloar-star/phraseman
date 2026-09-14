import fs from 'node:fs';
import path from 'node:path';
import { buildAvatarCatalog } from '../app/customization_catalog';
import {
  AVATAR100_ART_VERSION,
  encodeCustomAvatarOwnedStyle,
  getCustomAvatarArtSource,
  makeCustomAvatarValue,
  parseCustomAvatarOwnedStyle,
  parseCustomAvatarValue,
} from '../constants/custom_avatars';
import { AVATAR100_FITS } from '../constants/avatar100_fits';

const ROOT = path.resolve(__dirname, '..');
const readSource = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('single light avatar contract', () => {
  it('normalizes legacy black selections and ownership to the sole white variant', () => {
    expect(parseCustomAvatarValue('custom:custom-gen-94:aurora:black:avatar100-v1'))
      .toMatchObject({ avatarId: 'custom-gen-94', logoColor: 'white' });
    expect(parseCustomAvatarOwnedStyle('custom-gen-94', 'avatar100-v1|aurora:black'))
      .toMatchObject({ gradientId: 'aurora', logoColor: 'white' });
    expect(makeCustomAvatarValue('custom-gen-94', 'aurora', 'black', AVATAR100_ART_VERSION))
      .toBe('custom:custom-gen-94:aurora:white:avatar100-v1');
    expect(encodeCustomAvatarOwnedStyle({
      avatarId: 'custom-gen-94', gradientId: 'aurora', logoColor: 'black', artVersion: AVATAR100_ART_VERSION,
    })).toBe('avatar100-v1|aurora:white');
  });

  it('uses only white art and pearl pricing in the runtime catalog', () => {
    const blackRequest = getCustomAvatarArtSource('custom-gen-94', 'black', AVATAR100_ART_VERSION);
    const whiteRequest = getCustomAvatarArtSource('custom-gen-94', 'white', AVATAR100_ART_VERSION);
    expect(blackRequest).toEqual(whiteRequest);
    expect(blackRequest).toMatchObject({ uri: expect.stringContaining('custom-idea-94-white.webp') });

    const item = buildAvatarCatalog({
      ownedAvatars: {}, giftedAvatarId: null, activeAvatar: '1',
    }).find((candidate) => candidate.id === 'custom-gen-94');
    expect(item).toMatchObject({ availability: { kind: 'shards', cost: 150 } });
    expect(parseCustomAvatarValue(item?.kind === 'custom-avatar' ? item.previewValue : null))
      .toMatchObject({ logoColor: 'white' });
    expect(Object.keys(AVATAR100_FITS)).toEqual([
      'custom-gen-94:white',
      'custom-gen-101:white',
      'custom-gen-102:white',
      'custom-gen-112:white',
    ]);
  });

  it('ships no black avatar artwork in any runtime hosting directory', () => {
    for (const relativeDir of [
      ['admin', 'v2', 'avatars'],
      ['admin', 'v2', 'avatars', 'avatar100-v1'],
      ['admin', 'v2', 'avatars', 'legacy-showcase-v1'],
      ['admin', 'v2', 'avatars', 'avatar-phenomena-v1'],
    ]) {
      const blackFiles = fs.readdirSync(path.join(ROOT, ...relativeDir))
        .filter((file) => file.endsWith('-black.webp'));
      expect(blackFiles).toEqual([]);
    }
  });

  it('removes Yin/Yang and All/Mine controls from both studio surfaces', () => {
    const screen = readSource('app', 'avatar_select.tsx');
    const editor = readSource('components', 'customization', 'AvatarEditorSheet.tsx');
    const controls = readSource('components', 'customization', 'CustomizationControls.tsx');

    expect(screen).not.toContain('YinYangControl');
    expect(screen).not.toContain('avatarSide');
    expect(screen).not.toContain('avatarCatalogFilter');
    expect(screen).not.toContain('setAvatarCatalogFilter');
    expect(screen).not.toContain('filterRail');
    expect(editor).not.toContain('YinYangControl');
    expect(editor).not.toContain('onLogoColorChange');
    expect(controls).not.toContain('YinYangControl');
    expect(controls).not.toContain('avatar-side-');
  });
});
