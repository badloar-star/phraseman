import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

const FUNCTIONS_REGION = 'us-central1';

export type ActiveLanguageCatalogEntry = {
  readonly surface: string;
  readonly studyTarget: string;
  readonly packId: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly sourceLocale: string | null;
};

export type ActiveLanguageCatalog = {
  readonly entries: readonly ActiveLanguageCatalogEntry[];
  readonly fetchedAt: string;
};

function validEntry(value: unknown): value is ActiveLanguageCatalogEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.surface === 'string' && entry.surface.length > 0
    && typeof entry.studyTarget === 'string' && /^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(entry.studyTarget)
    && typeof entry.packId === 'string' && entry.packId.length > 0
    && Number.isInteger(entry.revision) && Number(entry.revision) > 0
    && typeof entry.contentHash === 'string' && entry.contentHash.length > 0
    && (entry.sourceLocale === null || typeof entry.sourceLocale === 'string');
}

export function parseActiveLanguageCatalog(value: unknown): ActiveLanguageCatalog {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('catalog_invalid');
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.entries) || typeof input.fetchedAt !== 'string') throw new Error('catalog_invalid');
  const entries = input.entries.filter(validEntry);
  if (entries.length !== input.entries.length) throw new Error('catalog_entry_invalid');
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.studyTarget}:${entry.surface}`;
    if (seen.has(key)) throw new Error('catalog_duplicate_target_surface');
    seen.add(key);
  }
  return Object.freeze({ entries: Object.freeze(entries), fetchedAt: input.fetchedAt });
}

export async function fetchActiveLanguageCatalog(): Promise<ActiveLanguageCatalog> {
  const call = httpsCallable<undefined, ActiveLanguageCatalog>(getFunctions(getApp(), FUNCTIONS_REGION), 'getActiveLanguageCatalog');
  const result = await call(undefined);
  return parseActiveLanguageCatalog(result.data);
}

export function resolveActiveLanguagePack(catalog: ActiveLanguageCatalog, studyTarget: string): ActiveLanguageCatalogEntry | null {
  return catalog.entries.find((entry) => entry.studyTarget === studyTarget) ?? null;
}
