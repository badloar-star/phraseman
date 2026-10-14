// зачем (D188, владелец 14.10: «ТУТ ДОЛЖЕН БЫТЬ ЕЩЁ АНГЛИЙСКИЙ! И ОНИ ВСЕ ДОЛЖНЫ БЫТЬ ОТКРЫТЫ И ДОСТУПНЫ!»): все пять языков
// изучения видны при любом интерфейсе, в шторке нет замка, неначатый язык ведёт на приветствие. Заменяет сторож «варианта А».
import fs from 'node:fs';
import path from 'node:path';
import { isStudyTargetAllowedForUi, studyTargetsForSourceLocale } from '../app/study_target';
import { orderStudyLanguageSheetOptions } from '../components/settings/study_language_sheet_order';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const ALL = ['en', 'es', 'fr', 'de', 'it'];

describe('D188: all study languages are offered and open', () => {
  it('every interface language offers all five study languages, English included', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect([...studyTargetsForSourceLocale(lang)]).toEqual(ALL);
    }
    expect(isStudyTargetAllowedForUi('en', 'en')).toBe(true);
  });

  it('the sheet lists exactly five languages, English included, for every interface and every active language', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      for (const active of ALL as ('en' | 'es' | 'fr' | 'de' | 'it')[]) {
        const rows = orderStudyLanguageSheetOptions(studyTargetsForSourceLocale(lang), active);
        expect(rows).toHaveLength(5);
        expect(rows[0]).toBe(active);
        expect([...rows].sort()).toEqual([...ALL].sort());
      }
    }
  });

  it('the study language sheet has no lock, no greyed flag and no caption for a not-started language', () => {
    const sheet = read('components/settings/StudyLanguageSheet.tsx');
    expect(sheet).not.toContain('STUDY_LANGUAGE_SHEET_OPENS_NEW_LANGUAGES');
    expect(sheet).not.toContain('KitLockFilledIcon');
    expect(sheet).not.toContain('grayscale');
    expect(sheet).not.toContain('access being confirmed');
    expect(sheet).toContain('sub={active ? sub.selected : learning ? sub.learning : undefined}');
    expect(sheet).toContain('const route = select(code);');
    expect(sheet).toContain('switchNewLanguagesDirectly: true');
    expect(sheet).not.toMatch(/[Сс]коро|coming soon|в разработке/);
    expect(sheet).toContain('[LEARN-LANG] sheet ui=${lang} list=${orderedKey}');
    expect(sheet).toContain('[LEARN-LANG] select ui=${lang} lang=${code} started=${learning}');
  });

  it('the en+en migration prompt is gone (the pair is allowed now)', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'hooks/use_en_ui_study_target_migration.ts'))).toBe(false);
    expect(read('app/(tabs)/_layout.tsx')).not.toContain('useEnUiStudyTargetMigration');
  });
});
