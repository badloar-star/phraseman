// ════════════════════════════════════════════════════════════════════════════
// plan_content_remote_registration.ts — where the plan_content pack lives on the
// server, for the remote loader. Kept OUT of the embedded course-pack index on
// purpose: EMBEDDED_COURSE_PACK_INDEX must stay bundled_compatibility with no
// manifest (a runtime-ignore contract test enforces that), so the "downloadable"
// wiring lives here and is only consulted when remote loading is enabled.
//
// DISABLED-SAFE: getPlanContentRemoteRegistration() returns null while the flag
// is false, so nothing here can point the app at the server until activation.
// ════════════════════════════════════════════════════════════════════════════
import { VERIFIED_COURSE_PACK_REMOTE_ENABLED } from './course_pack_loader';

const STORAGE_HOST = 'https://firebasestorage.googleapis.com';
const BUCKET = 'phraseman-ea0b3.firebasestorage.app';

// The staging/shadow prefix the verified pack was uploaded to. This is a
// staging copy (activationApproved=false); a production prefix is a later step.
const PLAN_CONTENT_PREFIX = 'course-packs/plan_content/en/ru/staging.shadow.20260628.1';
const MANIFEST_OBJECT = `${PLAN_CONTENT_PREFIX}/manifest.json`;

export type PlanContentRemoteRegistration = {
  studyTarget: 'en';
  sourceLocale: 'ru';
  surface: 'plan_content';
  /** Public download URL of manifest.json. */
  manifestUrl: string;
  /** Base URL under which index.json and per-day rows live (no trailing slash). */
  rowBaseUrl: string;
};

function remoteLoadingEnabled(): boolean {
  return Boolean(VERIFIED_COURSE_PACK_REMOTE_ENABLED);
}

/** Firebase Storage public download URL for an object path. */
function storageUrl(objectPath: string): string {
  return `${STORAGE_HOST}/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

/**
 * Server location of the plan_content pack, or null while remote loading is
 * disabled (the default). The remote loader uses this to fetch the manifest and
 * day rows; when it returns null, the app stays entirely on bundled content.
 */
export function getPlanContentRemoteRegistration(): PlanContentRemoteRegistration | null {
  if (!remoteLoadingEnabled()) return null;
  return {
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    manifestUrl: storageUrl(MANIFEST_OBJECT),
    // Rows are addressed by their in-pack path appended to this base; the loader
    // builds e.g. `${rowBaseUrl}/plans/echo/day-001.json` and encodes per object.
    rowBaseUrl: `${STORAGE_HOST}/v0/b/${BUCKET}/o`,
  };
}

/**
 * Build the public URL for a row given its in-pack path (e.g.
 * "plans/echo/day-001.json"), matching how the pack was uploaded.
 */
export function planContentRowUrl(inPackPath: string): string {
  return storageUrl(`${PLAN_CONTENT_PREFIX}/${inPackPath}`);
}

/* expo-router route shim: keeps this utility module from warning when discovered as a route. */
export default function __PlanContentRemoteRegistrationRouteShim() {
  return null;
}
