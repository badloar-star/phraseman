import {
  DEFAULT_STUDY_TARGET,
  SOURCE_LOCALES,
  STUDY_TARGETS,
  assertStudyTarget,
  defaultStudyTarget,
  isStudyTarget,
} from './app/study_target';
import {
  assertTargetKey,
  legacyEnglishKey,
  sourceTargetKey,
  targetKey,
} from './app/target_storage_keys';

function check(name: string, condition: boolean): void {
  if (!condition) throw new Error('P1A blueprint assertion failed: ' + name);
}

function throws(name: string, fn: () => unknown, pattern: RegExp): void {
  try {
    fn();
  } catch (error) {
    check(name, pattern.test(String((error as Error).message)));
    return;
  }
  throw new Error('P1A blueprint assertion did not throw: ' + name);
}

check('study targets are en/fr', JSON.stringify(STUDY_TARGETS) === JSON.stringify(['en', 'fr']));
check('source locales are ru/uk', JSON.stringify(SOURCE_LOCALES) === JSON.stringify(['ru', 'uk']));
check('default target is en', DEFAULT_STUDY_TARGET === 'en' && defaultStudyTarget() === 'en');
check('fr is StudyTarget', isStudyTarget('fr'));
check('es is not StudyTarget', !isStudyTarget('es'));
throws('assertStudyTarget rejects es', () => assertStudyTarget('es'), /Unsupported StudyTarget/);

check('target key en', targetKey('lesson_progress', 'en', '1') === 'lesson_progress_v2::en::1');
check('target key fr', targetKey('lesson_progress', 'fr', '1') === 'lesson_progress_v2::fr::1');
check('target key distinct', targetKey('lesson_progress', 'en', '1') !== targetKey('lesson_progress', 'fr', '1'));
check('source target ru', sourceTargetKey('personal_practice', 'fr', 'ru', 'diagnosis-1') === 'personal_practice_v2::fr::ru::diagnosis-1');
check('source target uk', sourceTargetKey('personal_practice', 'fr', 'uk', 'diagnosis-1') === 'personal_practice_v2::fr::uk::diagnosis-1');
check('legacy English key', legacyEnglishKey('lesson_progress', '1') === 'lesson_progress_legacy_en::1');
check('legacy does not contain fr', !legacyEnglishKey('lesson_progress', '1').includes('fr'));

const encoded = targetKey('lesson_progress', 'fr', 'lesson::1/a?b=c#d&e=%25');
check('reserved id encoded', encoded === 'lesson_progress_v2::fr::lesson%3A%3A1%2Fa%3Fb%3Dc%23d%26e%3D%2525');
check('encoded id does not leak separator', encoded.split('::').length === 3);
throws('empty id rejected', () => targetKey('lesson_progress', 'fr', ''), /Empty target key id/);
throws('raw key rejected', () => assertTargetKey('lesson_progress_v1'), /Raw target-sensitive key/);
check('target key guard allows v2', assertTargetKey(targetKey('flashcards', 'fr')) === 'flashcards_v2::fr');

console.log('P1A blueprint runtime checks passed: 18');

