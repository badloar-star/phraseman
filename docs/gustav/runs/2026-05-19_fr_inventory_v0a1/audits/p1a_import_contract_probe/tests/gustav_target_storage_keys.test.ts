import {
  assertTargetKey,
  legacyEnglishKey,
  sourceTargetKey,
  targetKey,
  type SourceTargetKeyDomain,
  type TargetKeyDomain,
} from '../app/target_storage_keys';

const targetDomain: TargetKeyDomain = 'lesson_progress';
const sourceDomain: SourceTargetKeyDomain = 'personal_practice';
const targetScoped = targetKey(targetDomain, 'fr', 'lesson::1');
const sourceScoped = sourceTargetKey(sourceDomain, 'fr', 'ru', 'diagnosis::1');
const legacy = legacyEnglishKey(targetDomain, 'lesson::1');

assertTargetKey(targetScoped);
assertTargetKey(sourceScoped);
void legacy;

