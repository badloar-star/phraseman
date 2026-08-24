// Контракт удержания при отмене подписки (аудит 2026-08-24).
//
// Сторожит правило владельца: причина отмены обязана вести к осмысленному
// предложению, а если предложить нечего — человек уходит в магазин без
// пустого экрана-заглушки.

import {
  hasMeaningfulProgress,
  resolveSaveOffer,
  type SaveOfferProgress,
} from '../app/manage_subscription_save_offer';

const PROGRESS: SaveOfferProgress = { streak: 12, totalXP: 3400, lessonsCompleted: 7 };
const EMPTY: SaveOfferProgress = { streak: 0, totalXP: 0, lessonsCompleted: 0 };

describe('hasMeaningfulProgress', () => {
  it('пустой прогресс не показываем', () => {
    expect(hasMeaningfulProgress(EMPTY)).toBe(false);
    expect(hasMeaningfulProgress(null)).toBe(false);
  });

  it('любое ненулевое достижение считается', () => {
    expect(hasMeaningfulProgress({ streak: 1, totalXP: 0, lessonsCompleted: 0 })).toBe(true);
    expect(hasMeaningfulProgress({ streak: 0, totalXP: 50, lessonsCompleted: 0 })).toBe(true);
    expect(hasMeaningfulProgress({ streak: 0, totalXP: 0, lessonsCompleted: 3 })).toBe(true);
  });
});

describe('resolveSaveOffer', () => {
  it('«дорого» на месячном → предлагаем годовой', () => {
    expect(resolveSaveOffer({
      reason: 'too_expensive',
      canSwitchToYearly: true,
      progress: PROGRESS,
    })).toBe('switch_yearly');
  });

  it('«дорого», но переключать некуда → показываем прогресс', () => {
    expect(resolveSaveOffer({
      reason: 'too_expensive',
      canSwitchToYearly: false,
      progress: PROGRESS,
    })).toBe('progress');
  });

  it('«дорого», переключать некуда и прогресса нет → не мешаем уйти', () => {
    expect(resolveSaveOffer({
      reason: 'too_expensive',
      canSwitchToYearly: false,
      progress: EMPTY,
    })).toBe('none');
  });

  it('«не пользуюсь» и «временно» → прогресс', () => {
    for (const reason of ['not_using', 'temporary']) {
      expect(resolveSaveOffer({ reason, canSwitchToYearly: true, progress: PROGRESS })).toBe('progress');
    }
  });

  it('«не пользуюсь» без прогресса → не выдумываем достижения', () => {
    expect(resolveSaveOffer({
      reason: 'not_using',
      canSwitchToYearly: true,
      progress: null,
    })).toBe('none');
  });

  it('«не хватает функций» и «технические» → поддержка, а не скидка', () => {
    for (const reason of ['missing_features', 'technical']) {
      expect(resolveSaveOffer({ reason, canSwitchToYearly: true, progress: PROGRESS })).toBe('support');
    }
  });

  it('поддержку предлагаем даже без прогресса — проблема не в мотивации', () => {
    expect(resolveSaveOffer({
      reason: 'technical',
      canSwitchToYearly: false,
      progress: EMPTY,
    })).toBe('support');
  });

  it('«другое», пустая и неизвестная причина → уходим молча', () => {
    for (const reason of ['other', '', null, 'unknown_reason_from_future']) {
      expect(resolveSaveOffer({ reason, canSwitchToYearly: true, progress: PROGRESS })).toBe('none');
    }
  });
});
