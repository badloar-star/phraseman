// зачем (Карточки 2.0 12.10, cards-v2 45–47, координатор): лимит Free показывается ПИЛЮЛЕЙ и кнопкой «Безлимит с Plus», а не секцией «+N скрыто»
// и не сырым отказом после ввода. Сохранённые: пилюля «50/50» с закладкой + нижняя кнопка; свои карточки: пилюля «50/50» на входе в редактор.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

test('saved cards: limit pill and the Plus button replace the hidden-cards section', () => {
  const screen = read('app/flashcards_collection.tsx');
  // перепин 17.10 (аудит кнопок Карточек): лимит считается по языку набора (savedCardsForPackLanguage), а не по всем сохранённым; смысл прежний — только у Free, скрытые лимитом или счёт ≥ лимита
  assert.match(screen, /const savedLimitReached = savedSurface && !isPremium && \(hiddenByLimitCount > 0 \|\| savedCardsForPackLanguage\.length >= FREE_SAVED_CARD_LIMIT\);/);
  assert.ok(screen.indexOf('const savedSurface =') < screen.indexOf('const savedLimitReached ='), 'savedSurface is declared before the limit flag (no TDZ)');
  assert.ok(screen.includes('limitIcon="bookmark-outline"'));
  assert.ok(screen.includes('limitCta={savedLimitReached ? { onPress: openPremiumLimit } : null}'));
  const gallery = read('app/flashcards/CollectionGalleryView.tsx');
  assert.ok(gallery.includes('hiddenByLimitCount > 0 && !limitCta'));
  assert.ok(gallery.includes('testID="fc-gallery-unlimited"'));
});

test('own cards: the editor decides the limit variant on entry and a server refusal opens the paywall', () => {
  const editor = read('app/flashcards_card_editor.tsx');
  assert.match(editor, /const cardLimitReached = !isEdit && accessResolved && !hasPremiumAccess && customCount !== null && customCount >= FREE_CUSTOM_CARD_LIMIT;/);
  assert.ok(editor.includes('testID="fc-editor-limit-pill"'));
  assert.ok(editor.includes("e.message === 'free_custom_card_limit_reached'"));
  assert.ok(editor.includes("source: 'card_editor_limit'"));
});
