import type { ActivePackPointer } from './publication_contract';

export interface RuntimeLanguageCatalogEntry {
  readonly studyTarget: string;
  readonly displayName: string;
  readonly sourceLocale: string;
  readonly active: boolean;
  readonly activePackIds: Readonly<Record<string, string>>;
  readonly activePackRevisions: Readonly<Record<string, number>>;
  readonly activePackHashes: Readonly<Record<string, string>>;
}

export interface RuntimePackResolution {
  readonly studyTarget: string;
  readonly packId: string;
  readonly revision: number;
  readonly sourceLocale: string;
}

/** Selects only a published pack for the requested target; never falls back to another target. */
export function resolveRuntimePack(input: {
  requestedTarget: string;
  requestedSurface: string;
  catalog: readonly RuntimeLanguageCatalogEntry[];
  pointers: readonly ActivePackPointer[];
}): RuntimePackResolution | null {
  const language = input.catalog.find((entry) => entry.studyTarget === input.requestedTarget && entry.active);
  if (!language) return null;
  const packId = language.activePackIds[input.requestedSurface];
  if (!packId) return null;
  const pointer = input.pointers.find((candidate) => candidate.studyTarget === input.requestedTarget && candidate.packId === packId);
  if (!pointer) return null;
  if (pointer.revision !== language.activePackRevisions[input.requestedSurface] || pointer.contentHash !== language.activePackHashes[input.requestedSurface] || pointer.studyTarget !== input.requestedTarget || pointer.contentHash.trim() === '') return null;
  return Object.freeze({ studyTarget: pointer.studyTarget, packId: pointer.packId, revision: pointer.revision, sourceLocale: language.sourceLocale });
}
