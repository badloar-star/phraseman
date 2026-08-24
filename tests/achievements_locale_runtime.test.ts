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
    const translatedAchievements = ALL_ACHIEVEMENTS.filter((achievement) => !achievement.retired);
    expect(translatedAchievements.length).toBeGreaterThan(0);

    for (const achievement of translatedAchievements) {
      for (const locale of PLANNED_LOCALES) {
        expect(achievementNameForLang(achievement, locale)).toBeTruthy();
        expect(achievementDescForLang(achievement, locale)).toBeTruthy();
        expect(achievementNameForLang(achievement, locale)).not.toMatch(/^needs-review:/u);
        expect(achievementDescForLang(achievement, locale)).not.toMatch(/^needs-review:/u);
      }
    }
  });
});
