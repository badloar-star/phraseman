import {
  COLLECTIBLE_SETS,
  collectibleCardTextForLang,
  collectibleSetTitleForLang,
  findCollectibleCard,
  findCollectibleSet,
} from '../app/collectibles/catalog';
import { COLLECTIBLE_CARD_ES } from '../app/collectibles/collectibles_es_locale';

const CYRILLIC_PATTERN = /[\u0400-\u04FF]/;

describe('collectibles Spanish locale sidecar', () => {
  it('localizes the first collectibles set without Russian text leakage', () => {
    const set = findCollectibleSet('set01_animals');
    const found = findCollectibleCard('animals_01');

    expect(set).toBeTruthy();
    expect(found).toBeTruthy();
    expect(collectibleSetTitleForLang(set!, 'es')).toBe('Animales');

    const text = collectibleCardTextForLang(found!.card, 'es');
    expect(text.translation).toBe('Calma, espera');
    expect(text.literal).toBe('sujeta tus caballos');
    expect(Object.values(text).join('\n')).not.toMatch(CYRILLIC_PATTERN);
    expect(text.translation).not.toBe(found!.card.ru);
  });

  it('keeps non-Spanish and untranslated cards on the existing Russian fallback', () => {
    const untranslatedSet = COLLECTIBLE_SETS.find((set) => set.setId !== 'set01_animals')!;
    const untranslatedCard = untranslatedSet.cards[0];

    expect(collectibleSetTitleForLang(untranslatedSet, 'es')).toBe(untranslatedSet.titleEn);
    expect(collectibleSetTitleForLang(untranslatedSet, 'ru')).toBe(untranslatedSet.titleRu);
    expect(collectibleCardTextForLang(untranslatedCard, 'es').translation).toBe(untranslatedCard.ru);
    expect(collectibleCardTextForLang(untranslatedCard, 'ru').translation).toBe(untranslatedCard.ru);
  });

  it('keeps sidecar entries routeable to real catalogue cards', () => {
    for (const [id, text] of Object.entries(COLLECTIBLE_CARD_ES)) {
      expect(findCollectibleCard(id)).toBeTruthy();
      expect(Object.values(text).join('\n')).not.toMatch(CYRILLIC_PATTERN);
    }
  });
});
