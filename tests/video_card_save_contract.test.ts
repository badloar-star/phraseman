import fs from 'node:fs';
import path from 'node:path';

import { videoCardSaveKey, videoCardSaveLabels } from '../app/flashcards/video_card_save_core';

// зачем (владелец 18.10, координатор 09:36): «Из видео должна быть кнопка „Сохранить“ на КАЖДОЙ отдельной карточке … можно сохранить себе только те карточки, которые сам хочешь, а не весь набор».
// Сторож источника: общий хук (мгновенно, откат, двойной тап, журнал [VIDEO-CARD-SAVE]), кнопка на каждой карточке набора из видео и в списке карточек набора; «Добавить +» набора остаётся.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Сохранить» на карточках из видео', () => {
  it('ключ «та же фраза» совпадает с проверкой дубля addFlashcard (регистр и пробелы по краям не важны)', () => {
    expect(videoCardSaveKey('  Nice To Meet You ')).toBe('nice to meet you');
    expect(videoCardSaveKey('nice to meet you')).toBe(videoCardSaveKey('NICE TO MEET YOU'));
  });

  it('подписи кнопки на всех 9 языках', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      const labels = videoCardSaveLabels(lang);
      expect(labels.save.length).toBeGreaterThan(0);
      expect(labels.saved.length).toBeGreaterThan(0);
      expect(labels.save).not.toBe(labels.saved);
    }
  });

  it('хук: мгновенный тап, откат с причиной и тостом, защита от двойного тапа, повторный тап снимает, журнал', () => {
    const src = read('app/flashcards/use_video_card_save.ts');
    expect(src).toContain('setKey(key, !wasSaved); // Optimistic UI');
    expect(src).toContain("addFlashcard({");
    expect(src).toContain("source: 'video_phrase'");
    expect(src).toContain("busyRef.current.has(key)");
    expect(src).toContain("'skip: in_flight'");
    expect(src).toContain("videoCardSaveToast(String(result), lang);");
    expect(src).toContain("'rollback'");
    expect(src).toContain('removeFlashcard(found.id, language)');
    expect(src).toContain("const LOG = '[VIDEO-CARD-SAVE]';");
    // зачем (координатор 18.10): лимит Free — пейвол-шторка, не тихий отказ; для Plus — прежний тост
    expect(src).toContain("result === 'limit_reached' && !hasPremiumAccess");
    expect(src).toContain("pathname: '/premium_modal', params: { context: 'flashcard_limit', source: 'video_card_save' }");
  });

  it('набор из видео: у каждой карточки своя кнопка-закладка, «Добавить +» набора осталась', () => {
    const view = read('app/flashcards/VideoSetView.tsx');
    expect(view).toContain('<VideoCardSaveButton');
    expect(view).toContain('video-set-save-${card.id}');
    expect(view).toContain('cardSave.toggle(card)');
    expect(view).toContain('variant="setAdd"');
  });

  it('список карточек набора из видео: кнопка у каждой строки через контекст, провайдер только для наборов из видео', () => {
    const item = read('app/flashcards/FlashcardListItem.tsx');
    expect(item).toContain('useVideoCardSaveContext()');
    expect(item).toContain('fc-video-card-save-${item.id}');
    const screen = read('app/flashcards_collection.tsx');
    expect(screen).toContain('<VideoCardSaveContext.Provider value={videoMomentPack ? videoPackCardSave : null}>');
  });

  it('экран ролика: у каждой фразы по-прежнему своя кнопка «Сохранить» (addFlashcard source video_phrase)', () => {
    const phrases = read('components/youtube/YoutubeVideoPhrases.tsx');
    expect(phrases).toContain('<SaveToCardsButton');
    expect(phrases).toContain("source: 'video_phrase'");
  });
});
