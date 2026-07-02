import type { CoursePackSurface } from './course_pack_manifest';
import { ENABLE_DEV_STUDY_TARGET_LANG } from './config';
import { normalizeSourceLocale } from './source_locales';

export type FrenchTargetSourceLocale = 'ru' | 'uk';

export type FrenchTargetRemoteRegistration = {
  studyTarget: 'fr';
  sourceLocale: FrenchTargetSourceLocale;
  surface: CoursePackSurface;
  manifestUrl: string;
  rowUrl: (inPackPath: string) => string;
};

type FrenchTargetActivationResolver = () => boolean;

const STORAGE_HOST = 'https://firebasestorage.googleapis.com';
const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const DENIED_IN_PACK_SEGMENTS = new Set(['', '.', '..', 'course-packs', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);

export const FRENCH_TARGET_CONTENT_VERSION = '2026.06.26.2026-05-19_fr_inventory_v0a1.draft';

export const FRENCH_TARGET_REMOTE_SURFACES = [
  'lesson',
  'lesson_intro',
  'quiz',
  'audio_metadata',
  'flashcard',
  'personal_practice',
] as const satisfies readonly CoursePackSurface[];

export function isFrenchStudyTargetServerPackActivationApproved(): boolean {
  // Governance-гейт: production-активация французских серверных паков требует
  // exact-approval цепочку Густава (P31→P48, docs/gustav/OPERATOR.md). До её
  // прохождения паки открыты только в dev/TestFlight-сборках; store-релиз
  // (IS_STORE_RELEASE) остаётся закрытым — контент версии *.draft не должен
  // доезжать до пользователей стора.
  return ENABLE_DEV_STUDY_TARGET_LANG;
}

export function normalizeFrenchTargetSourceLocale(value: unknown): FrenchTargetSourceLocale | null {
  const normalized = normalizeSourceLocale(value);
  return normalized === 'ru' || normalized === 'uk' ? normalized : null;
}

export function frenchTargetObjectPrefix(
  sourceLocale: FrenchTargetSourceLocale,
  surface: CoursePackSurface,
): string {
  if (!(FRENCH_TARGET_REMOTE_SURFACES as readonly CoursePackSurface[]).includes(surface)) {
    throw new Error('Unsupported French target remote surface: ' + surface);
  }
  return `course-packs/fr/${sourceLocale}/${surface}/${FRENCH_TARGET_CONTENT_VERSION}`;
}

export function frenchTargetStorageUrl(objectPath: string): string {
  return `${STORAGE_HOST}/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

export function sanitizeFrenchTargetInPackPath(inPackPath: string): string {
  if (typeof inPackPath !== 'string') {
    throw new Error('French target in-pack path must be a string.');
  }
  const normalized = inPackPath.replace(/\\/g, '/');
  if (
    normalized.startsWith('/') ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) ||
    normalized.includes('?') ||
    normalized.includes('#')
  ) {
    throw new Error('French target in-pack path must be relative.');
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => DENIED_IN_PACK_SEGMENTS.has(segment))) {
    throw new Error('French target in-pack path escapes the source-locale pack container.');
  }
  return segments.join('/');
}

export function getFrenchStudyTargetServerPackRegistrations(
  sourceLocale: unknown,
  activationApproved: FrenchTargetActivationResolver = isFrenchStudyTargetServerPackActivationApproved,
): readonly FrenchTargetRemoteRegistration[] {
  const normalizedSourceLocale = normalizeFrenchTargetSourceLocale(sourceLocale);
  if (!normalizedSourceLocale || !activationApproved()) {
    return [];
  }

  return FRENCH_TARGET_REMOTE_SURFACES.map((surface) => {
    const prefix = frenchTargetObjectPrefix(normalizedSourceLocale, surface);
    return {
      studyTarget: 'fr',
      sourceLocale: normalizedSourceLocale,
      surface,
      manifestUrl: frenchTargetStorageUrl(`${prefix}/manifest.json`),
      rowUrl: (inPackPath: string) => frenchTargetStorageUrl(`${prefix}/${sanitizeFrenchTargetInPackPath(inPackPath)}`),
    };
  });
}

export default function __FrenchTargetRemoteRegistrationRouteShim() {
  return null;
}
