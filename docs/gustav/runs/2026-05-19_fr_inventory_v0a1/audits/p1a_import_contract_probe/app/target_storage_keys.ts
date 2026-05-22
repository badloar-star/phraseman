import {
  SOURCE_LOCALES,
  assertStudyTarget,
  defaultStudyTarget,
  isStudyTarget,
  type SourceLocale,
  type StudyTarget,
} from './study_target';

export { assertStudyTarget, defaultStudyTarget, isStudyTarget };

export const TARGET_KEY_DOMAINS = ['lesson_progress', 'lesson_session_local', 'lesson_rewards', 'level_exams', 'trainer_practice', 'personal_practice', 'achievements', 'cloud_sync', 'flashcards', 'analytics_stats'] as const;
export type TargetKeyDomain = typeof TARGET_KEY_DOMAINS[number];
export const SOURCE_TARGET_KEY_DOMAINS = ['personal_practice'] as const;
export type SourceTargetKeyDomain = typeof SOURCE_TARGET_KEY_DOMAINS[number];

const SEP = '::';
const RAW_TARGET_KEY_PATTERNS = [
  'lesson_progress_v1',
  'trainer_store_v1',
  'mistake_log_v1',
  'flashcards_v1',
];

function assertMember<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error('Unsupported ' + label);
}

function encodeKeyPart(id: string | number): string {
  const raw = String(id);
  if (raw.length === 0) throw new Error('Empty key id is not allowed');
  return encodeURIComponent(raw);
}

export function targetKey(domain: TargetKeyDomain, studyTarget: StudyTarget, id?: string | number): string {
  const safeDomain = assertMember(domain, TARGET_KEY_DOMAINS, 'TargetKeyDomain');
  const safeTarget = assertStudyTarget(studyTarget);
  const base = safeDomain + '_v2' + SEP + safeTarget;
  return id === undefined ? base : base + SEP + encodeKeyPart(id);
}

export function sourceTargetKey(
  domain: SourceTargetKeyDomain,
  studyTarget: StudyTarget,
  sourceLocale: SourceLocale,
  id?: string | number,
): string {
  const safeDomain = assertMember(domain, SOURCE_TARGET_KEY_DOMAINS, 'SourceTargetKeyDomain');
  const safeTarget = assertStudyTarget(studyTarget);
  const safeSource = assertMember(sourceLocale, SOURCE_LOCALES, 'SourceLocale');
  const base = safeDomain + '_v2' + SEP + safeTarget + SEP + safeSource;
  return id === undefined ? base : base + SEP + encodeKeyPart(id);
}

export function legacyEnglishKey(domain: TargetKeyDomain, id?: string | number): string {
  const safeDomain = assertMember(domain, TARGET_KEY_DOMAINS, 'TargetKeyDomain');
  const base = safeDomain + '_legacy_en';
  return id === undefined ? base : base + SEP + encodeKeyPart(id);
}

export function assertTargetKey(key: string): string {
  if (RAW_TARGET_KEY_PATTERNS.some((pattern) => key.includes(pattern))) {
    throw new Error('Raw target-sensitive key is blocked: ' + key);
  }
  return key;
}

export default function __TargetStorageKeysRouteShim() {
  return null;
}

