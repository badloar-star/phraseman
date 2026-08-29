import fs from 'node:fs';
import path from 'node:path';
import { buildAvatarCatalog } from '../app/customization_catalog';
import {
  AVATAR100_ART_VERSION,
  LEGACY_SHOWCASE_ART_VERSION,
  CUSTOM_AVATAR_SHOP,
  getCustomAvatarArtSource,
  parseCustomAvatarValue,
} from '../constants/custom_avatars';

const ROOT = path.resolve(__dirname, '..');

function expectedAvatar100Ids(): string[] {
  const ids: string[] = [];
  for (let id = 73; id <= 126; id += 1) {
    if (id !== 90) ids.push(`custom-gen-${id}`);
  }
  return ids;
}

describe('Avatar100 active catalog', () => {
  it('offers only the 53 approved Avatar100 pairs', () => {
    expect(CUSTOM_AVATAR_SHOP.map((avatar) => avatar.id)).toEqual(expectedAvatar100Ids());
    expect(CUSTOM_AVATAR_SHOP).toHaveLength(53);
  });

  it('hides every retired unowned avatar but preserves owned and active legacy avatars', () => {
    const hidden = buildAvatarCatalog({
      ownedAvatars: {},
      giftedAvatarId: null,
      activeAvatar: '1',
    });
    expect(hidden.some((item) => item.id === 'custom-gen-41')).toBe(false);

    const owned = buildAvatarCatalog({
      ownedAvatars: { 'custom-gen-41': 'graphite:black' },
      giftedAvatarId: null,
      activeAvatar: '1',
    }).find((item) => item.id === 'custom-gen-41');
    expect(owned).toMatchObject({ isOwned: true, availability: { kind: 'owned' } });

    const active = buildAvatarCatalog({
      ownedAvatars: {},
      giftedAvatarId: null,
      activeAvatar: 'custom:custom-gen-41:graphite:black',
    }).find((item) => item.id === 'custom-gen-41');
    expect(active).toMatchObject({ isActive: true, availability: { kind: 'owned' } });
  });

  it('keeps an overlapping paid legacy owner on historic art while an unowned customer sees Avatar100 art', () => {
    const legacyOwned = buildAvatarCatalog({
      ownedAvatars: { 'custom-gen-81': 'graphite:white' },
      giftedAvatarId: null,
      activeAvatar: 'custom:custom-gen-81:graphite:white',
    }).find((item) => item.id === 'custom-gen-81');
    const unowned = buildAvatarCatalog({
      ownedAvatars: {},
      giftedAvatarId: null,
      activeAvatar: '1',
    }).find((item) => item.id === 'custom-gen-81');

    expect(legacyOwned).toMatchObject({ isOwned: true, availability: { kind: 'owned' } });
    expect(parseCustomAvatarValue(legacyOwned?.kind === 'custom-avatar' ? legacyOwned.previewValue : null)?.artVersion)
      .toBe(LEGACY_SHOWCASE_ART_VERSION);
    expect(parseCustomAvatarValue(unowned?.kind === 'custom-avatar' ? unowned.previewValue : null)?.artVersion)
      .toBe(AVATAR100_ART_VERSION);

    // Старый арт остаётся по обычному пути хостинга, новый лежит рядом в
    // отдельной папке avatar100-v1 — одно не затирает другое.
    const legacyArt = getCustomAvatarArtSource('custom-gen-81', 'white', LEGACY_SHOWCASE_ART_VERSION);
    const currentArt = getCustomAvatarArtSource('custom-gen-81', 'white', AVATAR100_ART_VERSION);
    expect(legacyArt).toMatchObject({ uri: expect.stringContaining('/avatars/custom-idea-81-white.webp') });
    expect(legacyArt).not.toMatchObject({ uri: expect.stringContaining('avatar100-v1') });
    expect(currentArt).toMatchObject({ uri: expect.stringContaining('/avatars/avatar100-v1/custom-idea-81-white.webp') });
    expect(currentArt).not.toEqual(legacyArt);
  });

  it('never bills a legacy owner for a restyle they did not make', () => {
    const { resolveCustomizationAction } = require('../app/customization_draft') as typeof import('../app/customization_draft');
    // Так стиль лежит у человека, купившего аватар до Avatar100.
    const storedLegacyStyle = `${LEGACY_SHOWCASE_ART_VERSION}|aurora:white`;

    expect(resolveCustomizationAction({
      confirmed: { avatarValue: '1', storedAuraSelection: null },
      previewAvatarValue: `custom:custom-gen-81:aurora:white:${LEGACY_SHOWCASE_ART_VERSION}`,
      previewStoredAuraSelection: null,
      effectivePreviewAuraId: null,
      activeTab: 'avatars',
      avatarAvailability: { kind: 'owned' },
      auraAvailability: { kind: 'none' },
      ownedAvatarStyles: { 'custom-gen-81': storedLegacyStyle },
    })).toEqual({ kind: 'apply' });

    // Настоящая перекраска по-прежнему стоит жемчуг — сторож не должен глушить оплату.
    expect(resolveCustomizationAction({
      confirmed: { avatarValue: '1', storedAuraSelection: null },
      previewAvatarValue: `custom:custom-gen-81:ember:white:${LEGACY_SHOWCASE_ART_VERSION}`,
      previewStoredAuraSelection: null,
      effectivePreviewAuraId: null,
      activeTab: 'avatars',
      avatarAvailability: { kind: 'owned' },
      auraAvailability: { kind: 'none' },
      ownedAvatarStyles: { 'custom-gen-81': storedLegacyStyle },
    })).toMatchObject({ purchaseKind: 'restyle' });
  });

  // зачем: арт аватаров раздаётся с хостинга, а папка admin/ закрыта от бандлера.
  // Literal require() отсюда роняет сборку ("Unable to resolve module") — сторож
  // держит каталог на URL-источнике навсегда.
  it('never embeds avatar art into the binary', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/avatar100_assets.ts'), 'utf8');

    // Ищем require только в КОДЕ: слово в пояснительном комментарии — не нарушение.
    const code = source.replace(/^\s*(\/\/.*|\*.*|\/\*.*)$/gm, '');
    expect(code).not.toMatch(/require\(/);
    expect(source).not.toContain('custom-idea-90-');
    expect(source).toContain('avatar100-v1');
  });

  it('resolves 106 distinct hosted urls that are staged for deploy', () => {
    const urls = new Set<string>();
    for (const id of CUSTOM_AVATAR_SHOP.map((avatar) => avatar.id)) {
      for (const ink of ['black', 'white'] as const) {
        const source = getCustomAvatarArtSource(id, ink, AVATAR100_ART_VERSION) as { uri?: string };
        expect(source?.uri).toEqual(expect.stringContaining('/avatars/avatar100-v1/'));
        urls.add(source!.uri!);

        // Файл обязан лежать в публикуемой папке, иначе на телефоне будет дыра.
        const fileName = source!.uri!.split('/').pop()!;
        expect(fs.existsSync(path.join(ROOT, 'admin/v2/avatars/avatar100-v1', fileName))).toBe(true);
      }
    }
    expect(urls.size).toBe(106);
    expect(fs.readdirSync(path.join(ROOT, 'admin/v2/avatars/avatar100-v1'))).toHaveLength(106);
  });

  // зачем: витрина обязана совпадать с приёмкой генерации по ID, файлу и цене.
  // queue.json живёт во временной папке — если её вычистили, сторож честно
  // пропускается, а не падает и не «зеленеет» молча на пустых данных.
  it('matches the generation queue on id, approved file and price', () => {
    const queuePath = path.join(ROOT, '.codex-tmp/avatar-regeneration-v3/queue.json');
    if (!fs.existsSync(queuePath)) {
      console.warn('queue.json отсутствует — сверка с приёмкой пропущена');
      return;
    }
    const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8')) as {
      items: { id: number; variant: 'black' | 'white'; price: number; name: string }[];
    };
    const source = fs.readFileSync(path.join(ROOT, 'constants/avatar100_assets.ts'), 'utf8');
    const rows = [...source.matchAll(
      /'custom-gen-(\d+)': \{ name: '([^']*)', labelRu: '[^']*', price: (\d+),/g,
    )];

    expect(rows).toHaveLength(53);
    for (const [, rawId, name, rawPrice] of rows) {
      const id = Number(rawId);
      const black = queue.items.find((item) => item.id === id && item.variant === 'black');
      const white = queue.items.find((item) => item.id === id && item.variant === 'white');
      expect(black).toBeDefined();
      expect(white).toBeDefined();
      expect(name).toBe(black!.name);
      expect(Number(rawPrice)).toBe(black!.price);
      expect(Number(rawPrice)).toBe(white!.price);
    }
  });
});
