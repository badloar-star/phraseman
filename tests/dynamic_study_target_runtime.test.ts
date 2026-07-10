import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredStudyTarget, isStudyTarget, setRuntimeStudyTargetCatalog, setStoredStudyTarget, studyTargetsForSourceLocale } from '../app/study_target';
import { lessonProgressKey, storageStudyTarget, targetKey } from '../app/target_storage_keys';
import { ttsLocaleForStudyTarget } from '../app/phrase_target_utils';
import { getLessonIntroScreens } from '../app/lesson_data_all';

describe('dynamic production study targets', () => {
  beforeEach(() => (AsyncStorage as any).__reset?.());

  it('accepts a safe server-delivered language code without an app update', async () => {
    expect(isStudyTarget('de')).toBe(true);
    await expect(setStoredStudyTarget('de', 'ru')).resolves.toBe('de');
    await expect(getStoredStudyTarget('ru')).resolves.toBe('de');
  });

  it('never collapses an unknown valid target into the English storage namespace', () => {
    expect(storageStudyTarget('de')).toBe('de');
    expect(targetKey('lesson_progress', 'de', 1)).toContain('::de::');
    expect(lessonProgressKey(1, 'de')).not.toBe(lessonProgressKey(1, 'en'));
    expect(ttsLocaleForStudyTarget('de')).toBe('de');
    expect(getLessonIntroScreens(1, 'de')).toEqual([]);
  });

  it('updates selectable targets from exact target/source catalog entries', () => {
    setRuntimeStudyTargetCatalog([{ studyTarget: 'de', learnerSourceLocale: 'ru' }, { studyTarget: 'fr', learnerSourceLocale: 'uk' }]);
    expect(studyTargetsForSourceLocale('ru')).toEqual(['de', 'en']);
    expect(studyTargetsForSourceLocale('uk')).toEqual(['en', 'fr']);
  });
});
