import { readFileSync } from 'fs';
import path from 'path';

import {
  dailyJourneyChapterTitle,
  dailyJourneyRewardAccessibilityLabel,
  dailyJourneyRewardDisplayLabel,
  dailyJourneySkipLabel,
  dailyJourneyTileAccessibilityLabel,
} from '../app/daily_journey_copy';
import { DAILY_JOURNEY_REWARDS } from '../app/daily_journey_rewards';
import type { Lang } from '../constants/i18n';

describe('Daily Journey localized accessible copy', () => {
  test('does not retain the removed day-of-50 mini-copy in the shipped copy module', () => {
    const source = readFileSync(path.join(process.cwd(), 'app/daily_journey_copy.ts'), 'utf8');
    expect(source).not.toContain('dailyJourneyDayProgress');
    expect(source).not.toContain('ИЗ 50');
    expect(source).not.toContain('OF 50');
  });

  test.each([
    ['ru', '150 жемчужин'],
    ['uk', '150 перлин'],
    ['en', '150 pearls'],
    ['es', '150 perlas'],
    ['pt-BR', '150 pérolas'],
    ['vi', '150 ngọc trai'],
    ['id', '150 mutiara'],
    ['tr', '150 inci'],
    ['pl', '150 pereł'],
  ] as const)('announces exact amount and kind in %s', (lang, expected) => {
    expect(dailyJourneyRewardAccessibilityLabel({ kind: 'pearls', amount: 150 }, lang))
      .toBe(expected);
  });

  test('announces day, exact reward and state without adding visible mini-copy', () => {
    expect(dailyJourneyTileAccessibilityLabel(36, { kind: 'pearls', amount: 150 }, 'en', 'today'))
      .toBe('Day 36. Today. 150 pearls');
    expect(dailyJourneyTileAccessibilityLabel(35, { kind: 'freeze', amount: 2 }, 'en', 'received'))
      .toBe('Day 35. Received. 2 streak freezes');
    expect(dailyJourneyTileAccessibilityLabel(37, { kind: 'spins', amount: 3 }, 'en', 'upcoming'))
      .toBe('Day 37. Upcoming. 3 spins');
  });

  test('keeps exact amounts and singular reward kinds in accessibility-only copy', () => {
    expect(dailyJourneyRewardAccessibilityLabel({ kind: 'spins', amount: 1 }, 'en')).toBe('1 spin');
    expect(dailyJourneyRewardAccessibilityLabel({ kind: 'freeze', amount: 1 }, 'en')).toBe('1 streak freeze');
    expect(dailyJourneyRewardAccessibilityLabel({ kind: 'energy_full', amount: 1 }, 'en')).toBe('1 full energy reserve');
  });

  test('shows a concise localized reward name under the revealed gift', () => {
    expect(dailyJourneyRewardDisplayLabel({ kind: 'runes', amount: 100 }, 'ru')).toBe('100 рун');
    expect(dailyJourneyRewardDisplayLabel({ kind: 'energy_full', amount: 1 }, 'ru'))
      .toBe('Полное восстановление энергии');
    expect(dailyJourneyRewardDisplayLabel({ kind: 'energy_full', amount: 1 }, 'en'))
      .toBe('Full energy restore');
  });

  test.each([
    ['ru', { kind: 'spins', amount: 1 }, '1 спин'],
    ['ru', { kind: 'spins', amount: 2 }, '2 спина'],
    ['ru', { kind: 'spins', amount: 5 }, '5 спинов'],
    ['uk', { kind: 'spins', amount: 1 }, '1 спін'],
    ['uk', { kind: 'freeze', amount: 2 }, '2 заморозки серії'],
    ['en', { kind: 'freeze', amount: 1 }, '1 streak freeze'],
    ['es', { kind: 'spins', amount: 1 }, '1 giro'],
    ['pt-BR', { kind: 'freeze', amount: 1 }, '1 proteção de sequência'],
    ['vi', { kind: 'spins', amount: 1 }, '1 lượt quay'],
    ['id', { kind: 'freeze', amount: 1 }, '1 pembeku rentetan'],
    ['tr', { kind: 'spins', amount: 1 }, '1 çevirme'],
    ['pl', { kind: 'spins', amount: 1 }, '1 obrót'],
    ['pl', { kind: 'spins', amount: 2 }, '2 obroty'],
    ['pl', { kind: 'spins', amount: 5 }, '5 obrotów'],
    ['pl', { kind: 'freeze', amount: 1 }, '1 zamrożenie serii'],
  ] as const)('%s uses exact shipped reward grammar for %j', (lang, reward, expected) => {
    expect(dailyJourneyRewardAccessibilityLabel(reward, lang)).toBe(expected);
  });

  test('every shipped reward amount remains explicit in all canonical interface locales', () => {
    const locales: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
    for (const reward of DAILY_JOURNEY_REWARDS) {
      for (const lang of locales) {
        expect(dailyJourneyRewardAccessibilityLabel(reward, lang)).toContain(String(reward.amount));
      }
    }
  });

  test('localizes all visible scene chrome', () => {
    expect(dailyJourneySkipLabel('es')).toEqual({ visible: 'Omitir', accessibility: 'Omitir animación' });
    expect(dailyJourneyChapterTitle(5, 'vi')).toBe('Chương 5 · Đỉnh cao');
    expect(dailyJourneyChapterTitle(6, 'en')).toBe('Chapter 6 · Awakening');
    expect(dailyJourneyChapterTitle(7, 'ru')).toBe('Глава 7 · Разгон');
    expect(dailyJourneyChapterTitle(15, 'pl')).toBe('Rozdział 15 · Szczyt');
  });
});
