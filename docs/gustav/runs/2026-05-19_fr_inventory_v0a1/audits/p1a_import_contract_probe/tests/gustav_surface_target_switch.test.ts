import {
  DEFAULT_STUDY_TARGET,
  SOURCE_LOCALES,
  STUDY_TARGETS,
  STUDY_TARGET_STORAGE_KEY,
  assertStudyTarget,
  defaultStudyTarget,
  isStudyTarget,
  type SourceLocale,
  type StudyTarget,
} from '../app/study_target';

const target: StudyTarget = assertStudyTarget('fr');
const fallback: 'en' = defaultStudyTarget();
const source: SourceLocale = SOURCE_LOCALES[0];

if (!isStudyTarget(target)) throw new Error('fr must be a StudyTarget');
if (fallback !== DEFAULT_STUDY_TARGET) throw new Error('default target must stay English');
if (STUDY_TARGET_STORAGE_KEY !== 'study_target_v1') throw new Error('unexpected storage key');
void STUDY_TARGETS;
void source;

