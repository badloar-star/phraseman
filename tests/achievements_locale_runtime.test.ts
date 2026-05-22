import fs from 'fs';
import path from 'path';

import {
  ALL_ACHIEVEMENTS,
  achievementDescForLang,
  achievementNameForLang,
} from '../app/achievements';

const ROOT = path.resolve(__dirname, '..');
const ACHIEVEMENTS_SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'achievements.ts'), 'utf8');
const ACHIEVEMENTS_SCREEN_SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'achievements_screen.tsx'), 'utf8');
const ACHIEVEMENT_TOAST_SOURCE = fs.readFileSync(path.join(ROOT, 'components', 'AchievementToast.tsx'), 'utf8');
const LEGACY_RUNTIME_RE =
  /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const TRANSLATED_SPECIAL_ACHIEVEMENT_IDS = new Set([
  'login_7',
  'login_14',
  'login_30',
  'login_60',
  'login_100',
  'login_200',
  'login_365',
  'comeback',
  'diagnosis',
  'night_owl',
  'early_bird',
  'exam_first',
  'exam_ace',
  'exam_ace_5',
  'exam_ace_10',
  'flashcards_session',
  'flashcards_save_25',
  'flashcards_save_50',
  'flashcards_save_100',
  'flashcards_save_250',
  'flashcards_flip_100',
  'flashcards_flip_500',
  'flashcards_flip_1000',
  'flashcards_view_7_days',
  'flashcards_view_14_days',
  'flashcards_view_30_days',
  'flashcards_sources_4',
]);

describe('achievements planned locale runtime copy', () => {
  it('keeps achievements runtime free of legacy locale fallback markers', () => {
    expect(ACHIEVEMENTS_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
    expect(ACHIEVEMENTS_SCREEN_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
    expect(ACHIEVEMENT_TOAST_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('keeps achievement toast action labels explicit for planned locales', () => {
    for (const locale of PLANNED_LOCALES) {
      expect(ACHIEVEMENT_TOAST_SOURCE).toContain(`${locale === 'pt-BR' ? "'pt-BR'" : locale}:`);
    }
    expect(ACHIEVEMENT_TOAST_SOURCE).toContain('const shareLabel = triLang(lang');
    expect(ACHIEVEMENT_TOAST_SOURCE).toContain('const closeLabel = triLang(lang');
    expect(ACHIEVEMENT_TOAST_SOURCE).not.toContain("lang === 'uk' ? 'Поділитися' : lang === 'es' ? 'Compartir' : 'Поделиться'");
    expect(ACHIEVEMENT_TOAST_SOURCE).not.toContain("lang === 'uk' ? 'Закрити' : lang === 'es' ? 'Cerrar' : 'Закрыть'");
  });

  it('keeps translated achievement catalog copy explicit for planned locales', () => {
    const translatedAchievements = ALL_ACHIEVEMENTS.filter((achievement) =>
      achievement.category === 'streak' ||
        achievement.category === 'lessons' ||
        achievement.category === 'xp' ||
        achievement.category === 'quiz' ||
        achievement.category === 'combo' ||
        achievement.category === 'medal' ||
        TRANSLATED_SPECIAL_ACHIEVEMENT_IDS.has(achievement.id),
    );
    expect(translatedAchievements.length).toBeGreaterThan(0);

    for (const achievement of translatedAchievements) {
      for (const locale of PLANNED_LOCALES) {
        expect(achievementNameForLang(achievement, locale)).toBeTruthy();
        expect(achievementDescForLang(achievement, locale)).toBeTruthy();
        expect(achievementNameForLang(achievement, locale)).not.toMatch(/^needs-review:/u);
        expect(achievementDescForLang(achievement, locale)).not.toMatch(/^needs-review:/u);
        expect(achievementNameForLang(achievement, locale)).not.toBe(achievement.nameRu);
        expect(achievementDescForLang(achievement, locale)).not.toBe(achievement.descRu);
      }
    }
  });

  it('keeps unresolved achievement catalog copy locale-specific until translated', () => {
    const achievement = ALL_ACHIEVEMENTS.find((item) => item.id === 'recall_first');
    expect(achievement).toBeTruthy();

    for (const locale of PLANNED_LOCALES) {
      expect(achievementNameForLang(achievement!, locale)).toBe(`needs-review:${locale}:achievement.${achievement!.id}.name`);
      expect(achievementDescForLang(achievement!, locale)).toBe(`needs-review:${locale}:achievement.${achievement!.id}.description`);
    }
  });
});
