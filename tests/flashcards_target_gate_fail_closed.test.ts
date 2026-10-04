jest.mock('../app/french_flashcard_remote_runtime', () => ({
  getCachedFrenchRemoteFlashcards: jest.fn(() => [{
    id: 'fr-card',
    en: 'bonjour',
    ru: 'привет',
    uk: 'привіт',
    categoryId: 'custom',
    isSystem: true,
  }]),
}));

import { LEARNING_LANGUAGE_TARGETS } from '../app/learning_language_contour';
import {
  flashcardsSourceGateForTarget,
  flashcardsSystemCardsForTarget,
} from '../app/flashcards_target_gate';
import type { CardItem } from '../app/flashcards/types';

const ENGLISH_SYSTEM_CARD: CardItem = {
  id: 'en-card',
  en: 'hello',
  ru: 'привет',
  uk: 'привіт',
  categoryId: 'custom',
  isSystem: true,
};

describe('flashcard system-card target firewall', () => {
  test('serves raw SYSTEM_CARDS only to the explicit English target', () => {
    expect(flashcardsSystemCardsForTarget([ENGLISH_SYSTEM_CARD], 'en')).toEqual([ENGLISH_SYSTEM_CARD]);
  });

  test('preserves the reviewed French remote-card behavior', () => {
    expect(flashcardsSystemCardsForTarget([ENGLISH_SYSTEM_CARD], 'fr'))
      .toEqual([expect.objectContaining({ id: 'fr-card' })]);
  });

  test.each(LEARNING_LANGUAGE_TARGETS.filter((target) => target !== 'en' && target !== 'fr'))(
    'fails closed for unsupported non-English target %s',
    (target) => {
      const gate = flashcardsSourceGateForTarget(target, 'system_cards');
      expect(gate.enabled).toBe(false);
      expect(gate.reason).toBe('no_native_system_cards');
      // D160: закрыт только английский системный банк — сам раздел не блокируется.
      expect(gate.blockedRoutes).toEqual([]);
      expect(flashcardsSystemCardsForTarget([ENGLISH_SYSTEM_CARD], target)).toEqual([]);
    },
  );

  // зачем (D160): у языка свои наборы — свои и маркетные не должны пропадать вместе с английским банком.
  test.each(LEARNING_LANGUAGE_TARGETS)('keeps community packs open for %s', (target) => {
    expect(flashcardsSourceGateForTarget(target, 'community_packs').enabled).toBe(true);
  });

  // зачем (D160, владелец 04.10): пустой/неизвестный язык — недочитанное значение, а не «неготовый
  // язык»; закрыть карточки на нём значило бы убрать их у всех.
  test('treats malformed or missing targets as the default target, not as a closed language', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(flashcardsSystemCardsForTarget([ENGLISH_SYSTEM_CARD], 'unknown')).toEqual([ENGLISH_SYSTEM_CARD]);
    expect(flashcardsSystemCardsForTarget([ENGLISH_SYSTEM_CARD], null)).toEqual([ENGLISH_SYSTEM_CARD]);
    expect(flashcardsSourceGateForTarget(undefined, 'community_packs').enabled).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      '[FC-TARGET-GATE]',
      'target:unresolved_fallback_default',
      expect.stringContaining('"fallback":"en"'),
    );
    warn.mockRestore();
  });
});
