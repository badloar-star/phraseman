import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';
import { ensureAnonUser, ensureStableAuthLink } from './cloud_sync';
import { withBackgroundNetworkLease } from './interactive_network_quiet';
import { deriveLocalOfflineProgressAccountScopeHash } from '../modules/learning-v2/progress/progress_account_scope';
import { parseV2ExactLanguageTagV1 } from '../modules/learning-v2/contracts/language_tag_v1';
import { LEARNING_V2_INTERFACE_LOCALES, type LearningV2InterfaceLocale } from '../modules/learning-v2/content/generator_course_contract';
import {
  LEARNING_V2_ACTIVE_COURSE_CATALOG_MAX_BYTES_V1,
  parseLearningV2ActiveCourseCatalogV1,
  type LearningV2ActiveCourseCatalogV1,
} from '../modules/learning-v2/runtime/course_active_catalog_v1';
import { canonicalJsonV1 } from '../modules/learning-v2/policies/decision_registry';

export const LEARNING_V2_ACTIVE_COURSE_CATALOG_CACHE_SCHEMA_V1 = 'learning-v2-active-course-catalog-cache.v1' as const;
export const LEARNING_V2_ACTIVE_COURSE_CATALOG_CACHE_MAX_ENTRIES_V1 = 3;

const STORAGE_KEY = 'learning_v2_active_course_catalog_cache_v1';
const CALLABLE_NAME = 'learningV2CourseActiveCatalogGetV1';
const FUNCTIONS_REGION = 'us-central1';
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:\-]{0,159}$/u;
const encoder = new TextEncoder();

export type LearningV2ActiveCourseCatalogLocatorV1 = Readonly<{
  environment: 'lab' | 'staging' | 'production';
  targetLanguage: string;
  studyTarget: string;
  learnerSourceLocale: string;
  interfaceLocale: LearningV2InterfaceLocale;
  seasonId: string;
}>;

export type LearningV2ActiveCourseCatalogResultV1 = Readonly<{
  catalog: LearningV2ActiveCourseCatalogV1;
  source: 'network' | 'lkg';
  cacheAuthority: 'availability_only_not_release_or_correctness_authority';
}>;

type CallableResponse = Readonly<{
  schemaVersion: 'v2-course-active-catalog-response.v1';
  canonicalCatalogRaw: string;
  catalogFingerprint: string;
  activeRootFingerprint: string;
  activeHeadFingerprint: string;
  transportAuthority: 'firebase_callable_auth_and_app_check_boundary';
  learnerProjection: 'titles_can_do_and_session_learning_outcomes_only';
  correctnessAuthority: 'local_device_only';
  serverAnswerAuthority: 'none_answers_never_transported';
  progressWriteAuthority: 'completed_session_summary_only';
  releaseAuthority: false;
}>;

type CacheRow = Readonly<{
  key: string;
  accountScopeHash: string;
  locator: LearningV2ActiveCourseCatalogLocatorV1;
  canonicalCatalogRaw: string;
  touchedAtMs: number;
}>;

const peek = new Map<string, LearningV2ActiveCourseCatalogV1>();
let writeChain = Promise.resolve();

function fail(): never {
  throw new Error('learning_v2_active_course_catalog_client_invalid');
}

function plain(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function exactLocator(value: LearningV2ActiveCourseCatalogLocatorV1): LearningV2ActiveCourseCatalogLocatorV1 {
  if (
    !plain(value) ||
    Object.keys(value).sort().join('|') !== 'environment|interfaceLocale|learnerSourceLocale|seasonId|studyTarget|targetLanguage' ||
    !['lab', 'staging', 'production'].includes(value.environment) ||
    parseV2ExactLanguageTagV1(value.targetLanguage) === null ||
    parseV2ExactLanguageTagV1(value.studyTarget) === null ||
    parseV2ExactLanguageTagV1(value.learnerSourceLocale) === null ||
    !LEARNING_V2_INTERFACE_LOCALES.includes(value.interfaceLocale) ||
    !ID_RE.test(value.seasonId)
  )
    fail();
  return Object.freeze({ ...value });
}

function key(locator: LearningV2ActiveCourseCatalogLocatorV1, accountScopeHash: string): string {
  if (!HASH_RE.test(accountScopeHash)) fail();
  return `${accountScopeHash}:${canonicalJsonV1(locator)}`;
}

function parseResponse(value: unknown, locator: LearningV2ActiveCourseCatalogLocatorV1): LearningV2ActiveCourseCatalogV1 {
  if (
    !plain(value) ||
    Object.keys(value).sort().join('|') !==
      'activeHeadFingerprint|activeRootFingerprint|canonicalCatalogRaw|catalogFingerprint|correctnessAuthority|learnerProjection|progressWriteAuthority|releaseAuthority|schemaVersion|serverAnswerAuthority|transportAuthority'
  )
    fail();
  const row = value as CallableResponse;
  if (
    row.schemaVersion !== 'v2-course-active-catalog-response.v1' ||
    typeof row.canonicalCatalogRaw !== 'string' ||
    encoder.encode(row.canonicalCatalogRaw).byteLength > LEARNING_V2_ACTIVE_COURSE_CATALOG_MAX_BYTES_V1 ||
    !HASH_RE.test(row.catalogFingerprint) ||
    !HASH_RE.test(row.activeRootFingerprint) ||
    !HASH_RE.test(row.activeHeadFingerprint) ||
    row.transportAuthority !== 'firebase_callable_auth_and_app_check_boundary' ||
    row.learnerProjection !== 'titles_can_do_and_session_learning_outcomes_only' ||
    row.correctnessAuthority !== 'local_device_only' ||
    row.serverAnswerAuthority !== 'none_answers_never_transported' ||
    row.progressWriteAuthority !== 'completed_session_summary_only' ||
    row.releaseAuthority !== false
  )
    fail();
  const catalog = parseLearningV2ActiveCourseCatalogV1(row.canonicalCatalogRaw);
  if (
    catalog.catalogFingerprint !== row.catalogFingerprint ||
    catalog.activeRootFingerprint !== row.activeRootFingerprint ||
    catalog.activeHeadFingerprint !== row.activeHeadFingerprint ||
    catalog.environment !== locator.environment ||
    catalog.targetLanguage !== locator.targetLanguage ||
    catalog.studyTarget !== locator.studyTarget ||
    catalog.learnerSourceLocale !== locator.learnerSourceLocale ||
    catalog.interfaceLocale !== locator.interfaceLocale ||
    catalog.seasonId !== locator.seasonId
  )
    fail();
  return catalog;
}

async function cacheRows(): Promise<CacheRow[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!plain(parsed) || parsed.schemaVersion !== LEARNING_V2_ACTIVE_COURSE_CATALOG_CACHE_SCHEMA_V1 || !Array.isArray(parsed.rows)) return [];
    return parsed.rows.filter((row): row is CacheRow => {
      if (!plain(row)) return false;
      try {
        const locator = exactLocator(row.locator as LearningV2ActiveCourseCatalogLocatorV1);
        return (
          typeof row.key === 'string' &&
          typeof row.accountScopeHash === 'string' &&
          HASH_RE.test(row.accountScopeHash) &&
          row.key === key(locator, row.accountScopeHash) &&
          typeof row.canonicalCatalogRaw === 'string' &&
          Number.isSafeInteger(row.touchedAtMs)
        );
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

function write(row: CacheRow): Promise<void> {
  writeChain = writeChain
    .then(async () => {
      const rows = (await cacheRows()).filter((candidate) => candidate.key !== row.key);
      rows.push(row);
      rows.sort((a, b) => b.touchedAtMs - a.touchedAtMs);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          schemaVersion: LEARNING_V2_ACTIVE_COURSE_CATALOG_CACHE_SCHEMA_V1,
          rows: rows.slice(0, LEARNING_V2_ACTIVE_COURSE_CATALOG_CACHE_MAX_ENTRIES_V1),
        }),
      );
    })
    .catch(() => undefined);
  return writeChain;
}

async function loadLkg(locator: LearningV2ActiveCourseCatalogLocatorV1, accountScopeHash: string) {
  const row = (await cacheRows()).find((candidate) => candidate.key === key(locator, accountScopeHash));
  if (!row) return null;
  try {
    const catalog = parseLearningV2ActiveCourseCatalogV1(row.canonicalCatalogRaw);
    if (
      catalog.environment !== locator.environment ||
      catalog.targetLanguage !== locator.targetLanguage ||
      catalog.studyTarget !== locator.studyTarget ||
      catalog.learnerSourceLocale !== locator.learnerSourceLocale ||
      catalog.interfaceLocale !== locator.interfaceLocale ||
      catalog.seasonId !== locator.seasonId
    )
      return null;
    return catalog;
  } catch {
    return null;
  }
}

export function peekLearningV2ActiveCourseCatalogV1(locator: LearningV2ActiveCourseCatalogLocatorV1, accountScopeHash: string): LearningV2ActiveCourseCatalogV1 | null {
  return peek.get(key(exactLocator(locator), accountScopeHash)) ?? null;
}

export async function loadLearningV2ActiveCourseCatalogV1(rawLocator: LearningV2ActiveCourseCatalogLocatorV1): Promise<LearningV2ActiveCourseCatalogResultV1> {
  const locator = exactLocator(rawLocator);
  // зачем ensureStableAuthLink (владелец, 2026-08-27, «сессии должны быть
  // доступны всегда, даже без привязки аккаунта») — см. подробный комментарий
  // в learning_v2_course_released_session_client_v3.ts, тот же класс бага.
  await ensureStableAuthLink().catch(() => false);
  const stableId = await ensureAnonUser();
  if (!stableId) fail();
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  const cacheKey = key(locator, accountScopeHash);
  try {
    const response = await withBackgroundNetworkLease('learning_v2_catalog', async (lease) => {
      await initFirebaseAppCheckIfAvailable().catch(() => false);
      lease.assertCurrent();
      const result = await withCallableTimeout(httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), CALLABLE_NAME)(locator), CALLABLE_NAME, 20_000);
      lease.assertCurrent();
      return result;
    });
    const catalog = parseResponse(response.data, locator);
    peek.set(cacheKey, catalog);
    void write({
      key: cacheKey,
      accountScopeHash,
      locator,
      canonicalCatalogRaw: canonicalJsonV1(catalog),
      touchedAtMs: Date.now(),
    });
    return Object.freeze({
      catalog,
      source: 'network' as const,
      cacheAuthority: 'availability_only_not_release_or_correctness_authority' as const,
    });
  } catch (networkError) {
    const catalog = await loadLkg(locator, accountScopeHash);
    if (!catalog) throw networkError;
    peek.set(cacheKey, catalog);
    return Object.freeze({
      catalog,
      source: 'lkg' as const,
      cacheAuthority: 'availability_only_not_release_or_correctness_authority' as const,
    });
  }
}
