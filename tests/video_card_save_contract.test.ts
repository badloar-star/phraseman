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
    expect(src).toContain('mark(key, !wasSaved); // Optimistic UI');
    expect(src).toContain("addFlashcard({");
    expect(src).toContain("source: 'video_phrase'");
    expect(src).toContain("busyRef.current.has(key)");
    expect(src).toContain("'skip: in_flight'");
    expect(src).toContain("videoCardSaveToast(String(result), uiLang);");
    expect(src).toContain("'rollback'");
    expect(src).toContain('removeFlashcard(found.id, lng)');
    // зачем (Ревизор eb6f98f9f 🟡): снимаем только сохранённое из видео (source + sourceId), одноимённую карточку из урока не трогаем
    expect(src).toContain("saved.source === 'video_phrase' && saved.sourceId === card.id");
    expect(src).toContain("'unsave:skipped'");
    // и при смене языка набора ключи прежнего языка сбрасываются до прихода загрузки
    expect(src).toContain('if (savedRef.current.size > 0) { savedRef.current = new Set();');
    expect(src).toContain("const LOG = '[VIDEO-CARD-SAVE]';");
    // зачем (координатор 18.10): лимит Free — пейвол-шторка, не тихий отказ; для Plus — прежний тост
    expect(src).toContain("result === 'limit_reached' && !premium");
    expect(src).toContain("pathname: '/premium_modal', params: { context: 'flashcard_limit', source: 'video_card_save' }");
  });

  // зачем (Ревизор 4d65c8be5 (а),(б),(г)): тап до прихода загрузки не затирается; значение для строк стабильно, «сохранено» — подпиской по ключу; у кнопки подпись «Сохранить/Сохранено»
  it('last-write-guard, стабильное значение и подписи кнопки', () => {
    const src = read('app/flashcards/use_video_card_save.ts');
    expect(src).toContain('touchedRef.current.add(key)');
    expect(src).toContain('touchedRef.current.forEach((key) => { if (savedRef.current.has(key)) loaded.add(key); else loaded.delete(key); });');
    expect(src).toContain('useSyncExternalStore(save.subscribe');
    expect(src).toContain('}, [lang]);'); // значение создаётся один раз на язык, не на каждое сохранение
    expect(src).not.toContain('savedKeys');
    const slot = read('components/cards-grid/VideoCardSaveSlot.tsx');
    expect(slot).toContain('useVideoCardSaved(save, card)');
    const button = read('components/cards-grid/VideoCardSaveButton.tsx');
    expect(button).toContain('accessibilityLabel={saved ? savedLabel : saveLabel}');
  });

  it('набор из видео: у каждой карточки своя кнопка-закладка, «Добавить +» набора осталась', () => {
    const view = read('app/flashcards/VideoSetView.tsx');
    expect(view).toContain('<VideoCardSaveSlot');
    expect(view).toContain('video-set-save-${card.id}');
    expect(view).toContain('save={cardSave}');
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

  // зачем (координатор 18.10, обход Optimistic UI): фраза на экране ролика — при лимите Free окно оплаты (как у карточки из набора), тост убран; повторный тап снимает сохранение мгновенно с откатом
  it('экран ролика: лимит Free открывает окно оплаты, сохранённую фразу можно снять повторным тапом', () => {
    const phrases = read('components/youtube/YoutubeVideoPhrases.tsx');
    expect(phrases).toContain("result === 'limit_reached' && !hasPremiumAccess");
    expect(phrases).toContain("pathname: '/premium_modal', params: { context: 'flashcard_limit', source: 'video_card_save' }");
    expect(phrases).toContain("void trackEvent('paywall_shown', { context: 'flashcard_limit', source: 'video_card_save' });");
    // тост лимита — только в ветке else (Plus и прочие причины)
    expect(phrases.indexOf("toastPhraseSaveRollback(String(result));")).toBeGreaterThan(phrases.indexOf("router.push({ pathname: '/premium_modal'"));
    expect(phrases).toContain('const unsave = useCallback(async (phrase: VideoPhrase) => {');
    expect(phrases).toContain("card.source === 'video_phrase' && card.sourceId === phrase.id");
    expect(phrases).toContain('await removeFlashcard(found.id, studyTarget);');
    expect(phrases).toContain('restore();');
    expect(phrases).toContain('onUnsave={() => void unsave(phrase)}');
    const button = read('components/SaveToCardsButton.tsx');
    expect(button).toContain('readonly onUnsave?: () => void;');
    expect(button).toContain('if (!onUnsave) return;');
  });
});
