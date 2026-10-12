// зачем (вариант А, решение владельца): при английском интерфейсе английский не предлагается как язык изучения — старые уроки RU→EN
// англоязычному бессмысленны. Сторож: списки выбора без en при uiLang=en, онбординг требует выбор, пара en+en ведёт на экран выбора.
import fs from 'node:fs';
import path from 'node:path';
import { isStudyTargetAllowedForUi, studyTargetsForSourceLocale } from '../app/study_target';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('variant A: English is not a study target for the English interface', () => {
  it('study language list drops en only for the English interface', () => {
    expect(studyTargetsForSourceLocale('en')).not.toContain('en');
    expect(studyTargetsForSourceLocale('en').length).toBeGreaterThan(0);
    for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(studyTargetsForSourceLocale(lang)).toContain('en');
    }
    expect(isStudyTargetAllowedForUi('en', 'en')).toBe(false);
    expect(isStudyTargetAllowedForUi('es', 'en')).toBe(true);
    expect(isStudyTargetAllowedForUi('en', 'ru')).toBe(true);
  });

  it('onboarding filters the language cards, keeps the language step and does not silently set English', () => {
    const src = read('components/CleanOnboarding.tsx');
    expect(src).toContain('LANGUAGE_OPTIONS.filter((item) => isStudyTargetAllowedForUi(item.id, lang))');
    expect(src).toContain('withRequiredLanguageStep(');
    expect(src).toContain("if (!isStudyTargetAllowedForUi('en', lang))");
    expect(src).toContain('disabled={!isStudyTargetAllowedForUi(studyTarget, lang)}');
  });

  it('a saved en+en pair opens the study language chooser on next entry', () => {
    const settings = read('app/settings_language.tsx');
    expect(settings).toContain("useState(chooseStudy === '1')");
    expect(settings).toContain('if (isStudyTargetAllowedForUi(studyTarget, lang as Lang)) return;');
    const tabs = read('app/(tabs)/_layout.tsx');
    expect(tabs).toContain('useEnUiStudyTargetMigration();');
  });
});
