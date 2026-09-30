/**
 * D127 (владелец 2026-09-30): наборы карточек «без языка» — столицы, формулы,
 * термины. Сторожим три обещания:
 *  1. 'none' живёт только при явном выборе, легаси без поля остаётся 'en';
 *  2. фильтр по изучаемому языку набор «без языка» НЕ прячет;
 *  3. такой набор не озвучивается.
 */
import {
  defaultPackLanguageForStudyTarget,
  filterCardsByPackLanguage,
  isPackLanguage,
  isStudyPackLanguage,
  noPackLanguageLabel,
  normalizePackLanguage,
  PACK_LANGUAGE_CHOICES,
  PACK_LANGUAGES,
  packLanguageHasVoice,
  packLanguageLabel,
  packMatchesLanguageFilter,
  type PackLanguage,
} from '../app/flashcards/pack_languages';
import { applyCommunityPacksFilter, filterPacksByLanguage } from '../app/community_packs/communityCatalogFilter';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';
import type { Lang } from '../constants/i18n';

function pack(id: string, extra: Partial<FlashcardMarketPack> = {}): FlashcardMarketPack {
  return {
    id,
    codeName: id,
    titleRu: id,
    titleUk: id,
    titleEs: id,
    descriptionRu: '',
    descriptionUk: '',
    descriptionEs: '',
    category: 'daily',
    cardCount: 10,
    priceShards: 0,
    salesCount: 0,
    authorName: 'Author',
    isOfficial: false,
    updatedAt: '2026-09-12T00:00:00.000Z',
    ...extra,
  };
}

describe('D127 normalization', () => {
  it('keeps an explicit "none"', () => {
    expect(normalizePackLanguage('none')).toBe('none');
    expect(isPackLanguage('none')).toBe(true);
  });

  it('legacy packs without the field stay English — never "none"', () => {
    expect(normalizePackLanguage(undefined)).toBe('en');
    expect(normalizePackLanguage(null)).toBe('en');
    expect(normalizePackLanguage('')).toBe('en');
    expect(normalizePackLanguage('NONE')).toBe('en');
  });

  it('"none" is a creation choice, not a study language or a default', () => {
    expect(PACK_LANGUAGE_CHOICES).toContain('none');
    expect(PACK_LANGUAGES).not.toContain('none');
    expect(isStudyPackLanguage('none')).toBe(false);
    expect(defaultPackLanguageForStudyTarget('none')).toBe('en');
  });

  it('labels «Без языка» in all 9 interface languages', () => {
    const langs: Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
    const labels = langs.map((lang) => noPackLanguageLabel(lang));
    expect(labels).toEqual([
      'Без языка', 'Без мови', 'No language', 'Sin idioma', 'Sem idioma',
      'Không có ngôn ngữ', 'Tanpa bahasa', 'Dilsiz', 'Bez języka',
    ]);
    expect(packLanguageLabel('none', 'en')).toBe('No language');
    expect(packLanguageLabel('fr', 'en')).toBe('Français');
  });
});

describe('D127 language filter', () => {
  it.each<PackLanguage>(['en', 'fr', 'de', 'es'])('a pack without a language is visible when %s is selected', (selected) => {
    expect(packMatchesLanguageFilter('none', selected)).toBe(true);
    const packs = [pack('legacy'), pack('fr', { packLanguage: 'fr' }), pack('capitals', { packLanguage: 'none' })];
    const ids = filterPacksByLanguage(packs, selected).map((item) => item.id);
    expect(ids).toContain('capitals');
  });

  it('does not widen other languages: legacy stays English only', () => {
    const packs = [pack('legacy'), pack('fr', { packLanguage: 'fr' }), pack('capitals', { packLanguage: 'none' })];
    expect(filterPacksByLanguage(packs, 'fr').map((item) => item.id)).toEqual(['fr', 'capitals']);
    expect(filterPacksByLanguage(packs, 'en').map((item) => item.id)).toEqual(['legacy', 'capitals']);
  });

  it('works through the catalog search/sort pipeline', () => {
    const packs = [pack('capitals', { packLanguage: 'none' }), pack('de', { packLanguage: 'de' })];
    expect(applyCommunityPacksFilter(packs, 'capit', 'new', 'es').map((item) => item.id)).toEqual(['capitals']);
  });

  it('saved cards of a pack without a language stay in every contour', () => {
    const cards = [{ id: 'a' }, { id: 'b', packLanguage: 'fr' }, { id: 'c', packLanguage: 'none' }];
    expect(filterCardsByPackLanguage(cards, 'de').map((card) => card.id)).toEqual(['c']);
    expect(filterCardsByPackLanguage(cards, 'en').map((card) => card.id)).toEqual(['a', 'c']);
  });
});

describe('D127 voice', () => {
  it('only a pack without a language is silent', () => {
    expect(packLanguageHasVoice('none')).toBe(false);
    expect(packLanguageHasVoice(undefined)).toBe(true);
    for (const language of PACK_LANGUAGES) expect(packLanguageHasVoice(language)).toBe(true);
  });
});
