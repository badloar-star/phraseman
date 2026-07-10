import AsyncStorage from '@react-native-async-storage/async-storage';
import { setRuntimeStudyTargetCatalog } from '../study_target';
import { courseReleaseTargetsForSourceLocale, fetchActiveLanguageCatalog, parseActiveLanguageCatalog, type ActiveLanguageCatalog } from './catalog_client';

const CATALOG_CACHE_KEY = 'active_course_release_catalog_v1';
const REFRESH_TTL_MS = 5 * 60 * 1000;
let lastRefreshAtMs = 0;
let inFlight: Promise<void> | null = null;

export interface RuntimeCatalogBootstrapDeps {
  readonly readCache: () => Promise<string | null>;
  readonly writeCache: (value: string) => Promise<void>;
  readonly fetchCatalog: () => Promise<ActiveLanguageCatalog>;
}

const DEFAULT_DEPS: RuntimeCatalogBootstrapDeps = {
  readCache: () => AsyncStorage.getItem(CATALOG_CACHE_KEY),
  writeCache: (value) => AsyncStorage.setItem(CATALOG_CACHE_KEY, value),
  fetchCatalog: fetchActiveLanguageCatalog,
};

function applyCatalog(catalog: ActiveLanguageCatalog): void {
  const entries = ['ru', 'uk'].flatMap((sourceLocale) => courseReleaseTargetsForSourceLocale(catalog, sourceLocale).map((studyTarget) => ({ studyTarget, learnerSourceLocale: sourceLocale })));
  setRuntimeStudyTargetCatalog(entries);
}

export async function refreshRuntimeStudyTargetCatalog(deps: RuntimeCatalogBootstrapDeps = DEFAULT_DEPS, force = false): Promise<void> {
  if (!force && Date.now() - lastRefreshAtMs < REFRESH_TTL_MS) return;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const cached = await deps.readCache().catch(() => null);
    if (cached) {
      try { applyCatalog(parseActiveLanguageCatalog(JSON.parse(cached))); } catch { /* ignore corrupt cache */ }
    }
    const catalog = await deps.fetchCatalog();
    applyCatalog(catalog);
    await deps.writeCache(JSON.stringify(catalog)).catch(() => {});
    lastRefreshAtMs = Date.now();
  })().finally(() => { inFlight = null; });
  return inFlight;
}
