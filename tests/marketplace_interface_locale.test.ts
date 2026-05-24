import {
  type FlashcardMarketPack,
  BUNDLED_MARKETPLACE_PACKS,
  packDescriptionForInterface,
  packHubCodeName,
  packTitleForInterface,
} from '../app/flashcards/marketplace';
import fs from 'fs';
import path from 'path';

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
      codeName: 'ugc_reserve',
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

  it('planned storefront locales use explicit localized metadata', () => {
    const pack = basePack({
      titlePtBr: 'Titulo PT',
      titleVi: 'Tieu de VI',
      titleId: 'Judul ID',
      titleTr: 'Baslik TR',
      titlePl: 'Tytul PL',
    });
    expect(packTitleForInterface(pack, 'pt-BR')).toBe('Titulo PT');
    expect(packTitleForInterface(pack, 'vi')).toBe('Tieu de VI');
    expect(packTitleForInterface(pack, 'id')).toBe('Judul ID');
    expect(packTitleForInterface(pack, 'tr')).toBe('Baslik TR');
    expect(packTitleForInterface(pack, 'pl')).toBe('Tytul PL');
  });

  it('bundled packs: planned storefront titles never reuse RU / UK / ES text', () => {
    const planned = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    for (const pack of BUNDLED_MARKETPLACE_PACKS) {
      for (const lang of planned) {
        const title = packTitleForInterface(pack, lang);
        expect(title.length).toBeGreaterThan(0);
        expect(title).not.toBe(pack.titleRu);
        expect(title).not.toBe(pack.titleUk);
        expect(title).not.toBe(pack.titleEs);
        expect(stringHasCyrillicOrSimilar(title)).toBe(false);
      }
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

  it('ES official reserve copy mentions cardCount in Spanish when descriptionEs missing', () => {
    const pack = basePack({
      descriptionEs: '',
      cardCount: 42,
      isOfficial: true,
      isCommunityUgc: undefined,
    });
    expect(packDescriptionForInterface(pack, 'es')).toBe('Paquete de 42 tarjetas en inglés.');
  });

  it('ES official reserve copy without cards uses generic phrase', () => {
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

  it('planned descriptions use explicit localized metadata', () => {
    const pack = basePack({
      descriptionPtBr: 'Descricao PT',
      descriptionVi: 'Mo ta VI',
      descriptionId: 'Deskripsi ID',
      descriptionTr: 'Aciklama TR',
      descriptionPl: 'Opis PL',
    });
    expect(packDescriptionForInterface(pack, 'pt-BR')).toBe('Descricao PT');
    expect(packDescriptionForInterface(pack, 'vi')).toBe('Mo ta VI');
    expect(packDescriptionForInterface(pack, 'id')).toBe('Deskripsi ID');
    expect(packDescriptionForInterface(pack, 'tr')).toBe('Aciklama TR');
    expect(packDescriptionForInterface(pack, 'pl')).toBe('Opis PL');
  });

  it('planned community descriptions stay empty when no localized metadata exists', () => {
    const pack = basePack({
      descriptionPtBr: '',
      descriptionVi: '',
      descriptionId: '',
      descriptionTr: '',
      descriptionPl: '',
      descriptionEs: 'Descripcion ES',
      descriptionRu: 'Описание RU',
      descriptionUk: 'Опис UK',
      isCommunityUgc: true,
      isOfficial: false,
    });
    expect(packDescriptionForInterface(pack, 'pt-BR')).toBe('');
    expect(packDescriptionForInterface(pack, 'vi')).toBe('');
    expect(packDescriptionForInterface(pack, 'id')).toBe('');
    expect(packDescriptionForInterface(pack, 'tr')).toBe('');
    expect(packDescriptionForInterface(pack, 'pl')).toBe('');
  });

  it('bundled packs: planned descriptions never reuse RU / UK / ES text', () => {
    const planned = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    for (const pack of BUNDLED_MARKETPLACE_PACKS) {
      for (const lang of planned) {
        const desc = packDescriptionForInterface(pack, lang);
        expect(desc.length).toBeGreaterThan(0);
        expect(desc).not.toBe(pack.descriptionRu);
        expect(desc).not.toBe(pack.descriptionUk);
        expect(desc).not.toBe(pack.descriptionEs);
        expect(stringHasCyrillicOrSimilar(desc)).toBe(false);
      }
    }
  });
});

describe('marketplace locale source guard', () => {
  it('does not route planned storefront locales through legacy runtime branches', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/flashcards/marketplace.ts'), 'utf8');
    expect(source).not.toMatch(/lang\s*={2,3}\s*['"](?:ru|uk|es)['"]/);
    expect(source).not.toContain('legacyBundledMarketPacks');
    expect(source).not.toMatch(/return\s+pack\.(?:title|description)(?:Ru|Uk|Es)/);
  });
});
