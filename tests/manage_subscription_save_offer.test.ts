// Контракт удержания при отмене подписки (аудит 2026-08-24).
//
// Сторожит ДВА правила владельца:
//   1. цены не обсуждаем совсем — ни скидок, ни смены тарифа, ни сумм;
//   2. причина отмены ведёт к осмысленному шагу, а если показать нечего —
//      человек уходит в магазин без пустого экрана-заглушки.

import fs from 'fs';
import path from 'path';

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
  it('«дорого» ведёт к прогрессу, а НЕ к смене тарифа', () => {
    expect(resolveSaveOffer({ reason: 'too_expensive', progress: PROGRESS })).toBe('progress');
  });

  it('«дорого» без прогресса → уходим молча, ничего про цену не предлагаем', () => {
    expect(resolveSaveOffer({ reason: 'too_expensive', progress: EMPTY })).toBe('none');
  });

  it('«не пользуюсь» и «временно» → прогресс', () => {
    for (const reason of ['not_using', 'temporary']) {
      expect(resolveSaveOffer({ reason, progress: PROGRESS })).toBe('progress');
    }
  });

  it('«не пользуюсь» без прогресса → не выдумываем достижения', () => {
    expect(resolveSaveOffer({ reason: 'not_using', progress: null })).toBe('none');
  });

  it('«не хватает функций» и «технические» → поддержка', () => {
    for (const reason of ['missing_features', 'technical']) {
      expect(resolveSaveOffer({ reason, progress: PROGRESS })).toBe('support');
    }
  });

  it('поддержку предлагаем даже без прогресса — проблема не в мотивации', () => {
    expect(resolveSaveOffer({ reason: 'technical', progress: EMPTY })).toBe('support');
  });

  it('«другое», пустая и неизвестная причина → уходим молча', () => {
    for (const reason of ['other', '', null, 'unknown_reason_from_future']) {
      expect(resolveSaveOffer({ reason, progress: PROGRESS })).toBe('none');
    }
  });
});

// ⛔ Сторож запрета владельца: «скидок не предлагаем, ничего с ценами».
// Ловит попытку вернуть в удержание тарифы/скидки/суммы — модуль обязан
// оставаться про ценность продукта, а не про деньги.
describe('удержание не работает с ценами', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'app', 'manage_subscription_save_offer.ts'),
    'utf8',
  );
  const code = source
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'))
    .join('\n');

  it('в коде нет тарифов, скидок и цен', () => {
    for (const banned of [/yearly/i, /discount/i, /скидк/i, /price/i, /\bцен[аыу]\b/i, /promo/i]) {
      expect(code).not.toMatch(banned);
    }
  });

  it('виды удержания не содержат ценовых', () => {
    // Полный список допустимых видов: расширять только осознанно и без цен.
    expect(resolveSaveOffer({ reason: 'too_expensive', progress: PROGRESS })).not.toBe('switch_yearly');
    for (const reason of ['too_expensive', 'not_using', 'temporary', 'missing_features', 'technical', 'other']) {
      expect(['progress', 'support', 'none']).toContain(
        resolveSaveOffer({ reason, progress: PROGRESS }),
      );
    }
  });
});
