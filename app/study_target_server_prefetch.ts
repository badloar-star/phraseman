import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StudyTarget } from './study_target';
import {
  getFrenchStudyTargetServerPackRegistrations,
  isFrenchStudyTargetServerPackActivationApproved,
  normalizeFrenchTargetSourceLocale,
  type FrenchTargetSourceLocale,
} from './french_target_remote_registration';

export type StudyTargetServerPrefetchResult =
  | { state: 'not_required'; studyTarget: 'en' }
  | { state: 'blocked'; studyTarget: 'fr'; sourceLocale: FrenchTargetSourceLocale | null; reason: 'french_server_pack_activation_required' | 'unsupported_source_locale' }
  | { state: 'ready'; studyTarget: 'fr'; sourceLocale: FrenchTargetSourceLocale; cacheDirUris: string[] }
  | { state: 'error'; studyTarget: 'fr'; sourceLocale: FrenchTargetSourceLocale; reason: 'remote_loader_failed' };

export type StudyTargetServerPrefetchOptions = {
  activationApproved?: () => boolean;
  ensureRemoteCoursePack?: (
    manifestUrl: string,
    rowUrl: (inPackPath: string) => string,
  ) => Promise<{ state: 'ready'; cacheDirUri: string } | { state: string; cacheDirUri?: string }>;
};

export const ONBOARDING_REQUESTED_STUDY_TARGET_KEY = 'onboarding_requested_study_target_v1';
export const ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY = 'onboarding_study_target_server_prefetch_result_v1';

export type OnboardingStudyTargetServerPrefetchRecord = {
  studyTarget: StudyTarget;
  sourceLocale: FrenchTargetSourceLocale | null;
  state: StudyTargetServerPrefetchResult['state'];
  reason?: string;
  cacheDirUris?: string[];
  recordedAt: string;
};

function prefetchRecordFromResult(
  result: StudyTargetServerPrefetchResult,
  recordedAt: string,
): OnboardingStudyTargetServerPrefetchRecord {
  return {
    studyTarget: result.studyTarget,
    sourceLocale: result.studyTarget === 'fr' ? result.sourceLocale : null,
    state: result.state,
    reason: 'reason' in result ? result.reason : undefined,
    cacheDirUris: result.state === 'ready' ? result.cacheDirUris : undefined,
    recordedAt,
  };
}

export async function prefetchStudyTargetServerPack(
  studyTarget: StudyTarget,
  sourceLocale: unknown,
  options: StudyTargetServerPrefetchOptions = {},
): Promise<StudyTargetServerPrefetchResult> {
  if (studyTarget === 'en') {
    return { state: 'not_required', studyTarget };
  }

  const normalizedSourceLocale = normalizeFrenchTargetSourceLocale(sourceLocale);
  if (!normalizedSourceLocale) {
    return { state: 'blocked', studyTarget, sourceLocale: null, reason: 'unsupported_source_locale' };
  }

  const activationApproved = options.activationApproved ?? isFrenchStudyTargetServerPackActivationApproved;
  const registrations = getFrenchStudyTargetServerPackRegistrations(normalizedSourceLocale, activationApproved);
  if (!activationApproved() || registrations.length === 0) {
    return {
      state: 'blocked',
      studyTarget,
      sourceLocale: normalizedSourceLocale,
      reason: 'french_server_pack_activation_required',
    };
  }

  try {
    const ensureRemoteCoursePack = options.ensureRemoteCoursePack ??
      (await import('./course_pack_remote_loader')).ensureRemoteCoursePack;
    const cacheDirUris: string[] = [];
    for (const registration of registrations) {
      const ready = await ensureRemoteCoursePack(registration.manifestUrl, registration.rowUrl);
      if (ready.state !== 'ready' || typeof ready.cacheDirUri !== 'string') {
        return { state: 'error', studyTarget, sourceLocale: normalizedSourceLocale, reason: 'remote_loader_failed' };
      }
      cacheDirUris.push(ready.cacheDirUri);
    }
    return { state: 'ready', studyTarget, sourceLocale: normalizedSourceLocale, cacheDirUris };
  } catch {
    return { state: 'error', studyTarget, sourceLocale: normalizedSourceLocale, reason: 'remote_loader_failed' };
  }
}

export async function prefetchAndRecordStudyTargetServerPack(
  studyTarget: StudyTarget,
  sourceLocale: unknown,
  options: StudyTargetServerPrefetchOptions & { now?: () => string } = {},
): Promise<StudyTargetServerPrefetchResult> {
  const { now, ...prefetchOptions } = options;
  const result = await prefetchStudyTargetServerPack(studyTarget, sourceLocale, prefetchOptions);
  if (result.studyTarget === 'en') {
    return result;
  }
  const record = prefetchRecordFromResult(result, now?.() ?? new Date().toISOString());
  await AsyncStorage.setItem(ONBOARDING_STUDY_TARGET_SERVER_PREFETCH_RESULT_KEY, JSON.stringify(record));
  return result;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
