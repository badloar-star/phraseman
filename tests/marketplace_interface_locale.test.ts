import {
  type FlashcardMarketPack,
  BUNDLED_MARKETPLACE_PACKS,
  packDescriptionForInterface,
  packHubCodeName,
  packTitleForInterface,
} from '../app/flashcards/marketplace';

function basePack(p: Partial<FlashcardMarketPack>): FlashcardMarketPack {
  return {
    id: 'test_pack',
    codeName: 'Test Code',
    titleRu: 'Заголовок RU',
    titleUk: 'Заголовок UK',
    titleEs: '',
    descriptionRu: 'Опис RU',
    descriptionUk: 'Опис UK',
    descriptionEs: '',
    category: 'daily',
    cardCount: 10,
    priceShards: 50,
    ratingAvg: 0,
    ratingCount: 0,
    salesCount: 0,
    authorName: 'Test',
    isOfficial: true,
    updatedAt: new Date(0).toISOString(),
    ...p,
  };
}

describe('packTitleForInterface', () => {
  it('returns RU / UK storefront titles', () => {
    const pack = basePack({ titleRu: 'A', titleUk: 'B' });
    expect(packTitleForInterface(pack, 'ru')).toBe('A');
    expect(packTitleForInterface(pack, 'uk')).toBe('B');
  });

  it('ES: trims and uses titleEs when present', () => {
    const pack = basePack({ titleEs: '  Mi pack  ', isOfficial: true });
    expect(packTitleForInterface(pack, 'es')).toBe('Mi pack');
  });

  it('ES official: falls back to codeName when titleEs empty', () => {
    const pack = basePack({
      titleEs: '',
      codeName: 'cool_code',
      isOfficial: true,
      isCommunityUgc: undefined,
    });
    expect(packTitleForInterface(pack, 'es')).toBe(packHubCodeName(pack));
  });

  it('ES community: falls back to RU then UK titles', () => {
    let pack = basePack({
      titleEs: '',
      titleRu: '',
      titleUk: 'Solo uk',
      isCommunityUgc: true,
      isOfficial: false,
    });
    expect(packTitleForInterface(pack, 'es')).toBe('Solo uk');

    pack = basePack({
      titleEs: '',
      titleRu: 'Solo ru',
      titleUk: '',
      isCommunityUgc: true,
      isOfficial: false,
    });
    expect(packTitleForInterface(pack, 'es')).toBe('Solo ru');

    pack = basePack({
      titleEs: '',
      titleRu: '',
      titleUk: '',
      codeName: 'ugc_fallback',
      isCommunityUgc: true,
      isOfficial: false,
    });
    expect(packTitleForInterface(pack, 'es')).toBe(packHubCodeName(pack));
  });

  it('bundled packs: ES resolves without throwing', () => {
    for (const pack of BUNDLED_MARKETPLACE_PACKS) {
      const title = packTitleForInterface(pack, 'es');
      expect(title.length).toBeGreaterThan(0);
    }
  });
});

function stringHasCyrillicOrSimilar(s: string): boolean {
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x0400 && c <= 0x052f) return true;
  }
  return false;
}

describe('packDescriptionForInterface', () => {
  it('returns RU / UK descriptions verbatim', () => {
    const pack = basePack({ descriptionRu: 'DR', descriptionUk: 'DU' });
    expect(packDescriptionForInterface(pack, 'ru')).toBe('DR');
    expect(packDescriptionForInterface(pack, 'uk')).toBe('DU');
  });

  it('ES: uses descriptionEs when trimmed non-empty', () => {
    const pack = basePack({
      descriptionEs: '  Descripción ',
    });
    expect(packDescriptionForInterface(pack, 'es')).toBe('Descripción');
  });

  it('ES community: falls back to UK then RU when descriptionEs empty', () => {
    const packUk = basePack({
      descriptionEs: '',
      descriptionUk: 'U',
      descriptionRu: 'R',
      isCommunityUgc: true,
    });
    expect(packDescriptionForInterface(packUk, 'es')).toBe('U');

    const packRu = basePack({
      descriptionEs: '',
      descriptionUk: '',
      descriptionRu: 'R2',
      isCommunityUgc: true,
    });
    expect(packDescriptionForInterface(packRu, 'es')).toBe('R2');
  });

  it('ES official fallback mentions cardCount in Spanish when descriptionEs missing', () => {
    const pack = basePack({
      descriptionEs: '',
      cardCount: 42,
      isOfficial: true,
      isCommunityUgc: undefined,
    });
    expect(packDescriptionForInterface(pack, 'es')).toBe('Paquete de 42 tarjetas en inglés.');
  });

  it('ES official fallback without cards uses generic phrase', () => {
    const pack = basePack({
      descriptionEs: '',
      cardCount: 0,
      isOfficial: true,
      isCommunityUgc: undefined,
    });
    expect(packDescriptionForInterface(pack, 'es')).toBe('Paquete de tarjetas en inglés.');
  });

  it('bundled packs: ES description resolves without throwing', () => {
    for (const pack of BUNDLED_MARKETPLACE_PACKS) {
      const desc = packDescriptionForInterface(pack, 'es');
      expect(desc.length).toBeGreaterThan(0);
      expect(stringHasCyrillicOrSimilar(desc)).toBe(false);
    }
  });
});
