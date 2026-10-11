import {
  dailyPhraseDevObjectPrefix,
  getDailyPhraseDevServerPackRegistration,
  sanitizeDailyPhraseDevInPackPath,
} from '../app/daily_phrase_remote_registration';
import { dailyPhraseContentAvailableForTarget } from '../app/daily_phrase_target_gate';
import { getTodayPhraseSyncForTarget } from '../app/daily_phrase_system';
import { entryToTargetDailyPhrase } from '../app/multilingual_daily_phrase_remote_runtime';

const BASE_ENTRY = {
  id: 'es-001',
  order: 1,
  studyTarget: 'es',
  sourceLocale: 'ru',
  surface: 'daily_phrase',
  targetText: 'Caballo grande, ande o no ande',
  literal: 'Большая лошадь — идёт она или нет.',
  meaning: 'Выбирать самое большое только ради размера.',
  text: '❤️ Тёплая и конкретная сцена на русском языке.',
  literal_ru: 'Большая лошадь — идёт она или нет.',
  meaning_ru: 'Выбирать самое большое только ради размера.',
  text_ru: '❤️ Тёплая и конкретная сцена на русском языке.',
  literal_uk: 'Великий кінь — іде він чи ні.',
  meaning_uk: 'Обирати найбільше лише заради розміру.',
  text_uk: '❤️ Тепла й конкретна сцена українською мовою.',
  allowSave: true,
  active: false,
  activationApproved: false,
};

describe('Daily Phrase ES/DE/IT dev-server runtime', () => {
  it.each(['es', 'de', 'it'] as const)('registers %s only inside its source-locale container', (target) => {
    for (const sourceLocale of ['ru', 'uk'] as const) {
      const prefix = dailyPhraseDevObjectPrefix(target, sourceLocale);
      expect(prefix).toMatch(new RegExp(`^course-packs/${target}/${sourceLocale}/daily_phrase/`));

      const registration = getDailyPhraseDevServerPackRegistration(target, sourceLocale, () => true);
      expect(registration).not.toBeNull();
      expect(registration?.manifestUrl).toContain(
        encodeURIComponent(`course-packs/${target}/${sourceLocale}/daily_phrase/`),
      );
      expect(registration?.manifestUrl).not.toContain(encodeURIComponent('course-packs/en/'));
    }
  });

  it('remains unavailable when the dev activation resolver is closed', () => {
    expect(getDailyPhraseDevServerPackRegistration('es', 'ru', () => false)).toBeNull();
  });

  it.each(['es', 'de', 'it'] as const)(
    'opens the %s surface in dev but returns null until its exact remote pack is cached',
    (target) => {
      expect(dailyPhraseContentAvailableForTarget(target)).toBe(true);
      expect(getTodayPhraseSyncForTarget(target, 'ru')).toBeNull();
    },
  );

  it.each(['../en.json', 'https://example.com/en.json', '/en.json', 'nested/en.json']) (
    'rejects an unsafe or cross-container payload path: %s',
    (value) => expect(() => sanitizeDailyPhraseDevInPackPath(value)).toThrow(),
  );

  it('adapts only an exact target and source-locale row', () => {
    expect(entryToTargetDailyPhrase(BASE_ENTRY, 'es', 'ru', '2026-10-04')).toMatchObject({
      id: 'es-001',
      studyTarget: 'es',
      english: BASE_ENTRY.targetText,
      literal: BASE_ENTRY.literal_ru,
      meaning: BASE_ENTRY.meaning_ru,
      text: BASE_ENTRY.text_ru,
      active: false,
    });
    expect(entryToTargetDailyPhrase(BASE_ENTRY, 'de', 'ru', '2026-10-04')).toBeNull();
    expect(entryToTargetDailyPhrase(BASE_ENTRY, 'es', 'uk', '2026-10-04')).toBeNull();
  });
});

