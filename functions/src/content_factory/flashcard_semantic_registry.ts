import { createHash } from 'node:crypto';
import { flashcardSemanticKey } from './flashcard_artifacts';

export interface FlashcardRegistryPartition {
  readonly surface: 'community_flashcards';
  readonly studyTarget: string;
  readonly sourceLocale: string;
}

export interface FlashcardRegistrySource { readonly packId: string; readonly cardId: string }
export interface FlashcardRegistryEntry {
  readonly docId: string;
  readonly partitionKey: string;
  readonly canonicalKey: string;
  readonly sources: readonly FlashcardRegistrySource[];
}

function token(value: unknown): string {
  const output = String(value ?? '').trim();
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(output)) throw new Error('flashcard_registry_partition_invalid');
  return output;
}

export function flashcardRegistryPartitionKey(partition: FlashcardRegistryPartition): string {
  return `${token(partition.surface)}:${token(partition.studyTarget)}:${token(partition.sourceLocale)}`;
}

export function flashcardRegistryDocumentId(partition: FlashcardRegistryPartition, canonicalKey: string): string {
  const partitionKey = flashcardRegistryPartitionKey(partition);
  if (!canonicalKey || canonicalKey === '\u0000') throw new Error('flashcard_registry_semantic_key_invalid');
  return createHash('sha256').update(`${partitionKey}\u0000${canonicalKey}`, 'utf8').digest('hex');
}

export function buildFlashcardRegistryEntry(input: { readonly partition: FlashcardRegistryPartition; readonly packId: string; readonly card: unknown }): FlashcardRegistryEntry {
  const canonicalKey = flashcardSemanticKey(input.card);
  if (canonicalKey === '\u0000') throw new Error('flashcard_registry_semantic_key_invalid');
  const partitionKey = flashcardRegistryPartitionKey(input.partition);
  const cardId = token((input.card as { id?: unknown })?.id); const packId = token(input.packId);
  const docId = flashcardRegistryDocumentId(input.partition, canonicalKey);
  return Object.freeze({ docId, partitionKey, canonicalKey, sources: Object.freeze([{ packId, cardId }]) });
}

function sourceKey(source: FlashcardRegistrySource) { return `${source.packId}\u0000${source.cardId}`; }

export function mergeFlashcardRegistrySource(current: FlashcardRegistryEntry, incoming: FlashcardRegistryEntry): FlashcardRegistryEntry {
  if (current.docId !== incoming.docId || current.partitionKey !== incoming.partitionKey || current.canonicalKey !== incoming.canonicalKey) throw new Error('flashcard_registry_hash_collision');
  const sources = [...current.sources, ...incoming.sources].filter((source, index, all) => all.findIndex((item) => sourceKey(item) === sourceKey(source)) === index).sort((a, b) => sourceKey(a).localeCompare(sourceKey(b)));
  return Object.freeze({ ...current, sources: Object.freeze(sources) });
}

export function removeFlashcardRegistrySource(entry: FlashcardRegistryEntry, source: FlashcardRegistrySource): FlashcardRegistryEntry | null {
  const sources = entry.sources.filter((item) => sourceKey(item) !== sourceKey(source));
  return sources.length ? Object.freeze({ ...entry, sources: Object.freeze(sources) }) : null;
}

export function compareFlashcardRegistryShadow(legacyKeys: readonly string[], registryKeys: readonly string[]) {
  const legacy = new Set(legacyKeys); const registry = new Set(registryKeys);
  const missingFromRegistry = [...legacy].filter((key) => !registry.has(key)).sort();
  const extraInRegistry = [...registry].filter((key) => !legacy.has(key)).sort();
  return Object.freeze({ parity: missingFromRegistry.length === 0 && extraInRegistry.length === 0, missingFromRegistry: Object.freeze(missingFromRegistry), extraInRegistry: Object.freeze(extraInRegistry) });
}

export function resolveFlashcardRegistryAuthority(input: {
  readonly legacyKeys: readonly string[];
  readonly registryKeys: readonly string[];
  readonly mode: 'legacy' | 'shadow' | 'registry';
  readonly manifestComplete?: boolean;
  readonly manifestCatalogFingerprint?: string;
  readonly currentCatalogFingerprint?: string;
  readonly manifestHighWaterMark?: string;
  readonly currentHighWaterMark?: string;
}) {
  const comparison = compareFlashcardRegistryShadow(input.legacyKeys, input.registryKeys);
  const cutoverEligible = input.manifestComplete === true
    && !!input.manifestCatalogFingerprint
    && input.manifestCatalogFingerprint === input.currentCatalogFingerprint
    && !!input.manifestHighWaterMark
    && input.manifestHighWaterMark === input.currentHighWaterMark
    && comparison.parity;
  const authority = input.mode === 'registry' && cutoverEligible ? 'registry' as const : 'legacy' as const;
  return Object.freeze({ authority, keys: Object.freeze([...(authority === 'registry' ? input.registryKeys : input.legacyKeys)]), comparison, cutoverEligible });
}

export interface FlashcardRegistryBackfillManifest {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly dryRun: boolean;
  readonly inputCursor: string | null;
  readonly nextCursor: string | null;
  readonly complete: boolean;
  readonly scannedPacks: number;
  readonly entries: readonly FlashcardRegistryEntry[];
  readonly conflicts: readonly string[];
  readonly catalogFingerprint: string;
  readonly catalogHighWaterMark: string | null;
}

function registryFingerprint(entries: readonly FlashcardRegistryEntry[]): string {
  return createHash('sha256').update(entries.map((entry) => `${entry.docId}:${entry.canonicalKey}:${entry.sources.map(sourceKey).join(',')}`).join('\n')).digest('hex');
}

export function planFlashcardRegistryBackfill(input: { readonly runId: string; readonly dryRun: boolean; readonly inputCursor?: string | null; readonly nextCursor?: string | null; readonly packs: readonly { readonly id: string; readonly studyTarget?: string; readonly sourceLocale?: string; readonly cards?: readonly unknown[] }[] }): FlashcardRegistryBackfillManifest {
  const byId = new Map<string, FlashcardRegistryEntry>(); const conflicts: string[] = [];
  for (const pack of input.packs) {
    const partition = { surface: 'community_flashcards' as const, studyTarget: pack.studyTarget || 'en', sourceLocale: pack.sourceLocale || 'ru' };
    for (const card of Array.isArray(pack.cards) ? pack.cards : []) {
      try {
        const entry = buildFlashcardRegistryEntry({ partition, packId: pack.id, card });
        const current = byId.get(entry.docId); byId.set(entry.docId, current ? mergeFlashcardRegistrySource(current, entry) : entry);
      } catch (error) { conflicts.push(`${pack.id}:${error instanceof Error ? error.message : String(error)}`); }
    }
  }
  const entries = [...byId.values()].sort((a, b) => a.docId.localeCompare(b.docId));
  const catalogFingerprint = registryFingerprint(entries);
  const catalogHighWaterMark = input.packs.map((pack) => pack.id).sort().at(-1) ?? null;
  return Object.freeze({ schemaVersion: 1, runId: token(input.runId), dryRun: input.dryRun, inputCursor: input.inputCursor || null, nextCursor: input.nextCursor || null, complete: !input.nextCursor, scannedPacks: input.packs.length, entries: Object.freeze(entries), conflicts: Object.freeze(conflicts.sort()), catalogFingerprint, catalogHighWaterMark });
}

export function mergeFlashcardRegistryBackfillManifests(previous: FlashcardRegistryBackfillManifest, page: FlashcardRegistryBackfillManifest): FlashcardRegistryBackfillManifest {
  if (previous.runId !== page.runId || previous.schemaVersion !== 1 || page.schemaVersion !== 1 || previous.nextCursor !== page.inputCursor) throw new Error('flashcard_registry_manifest_chain_invalid');
  const byId = new Map(previous.entries.map((entry) => [entry.docId, entry]));
  for (const entry of page.entries) { const current = byId.get(entry.docId); byId.set(entry.docId, current ? mergeFlashcardRegistrySource(current, entry) : entry); }
  const entries = [...byId.values()].sort((a, b) => a.docId.localeCompare(b.docId));
  return Object.freeze({ ...page, inputCursor: previous.inputCursor, scannedPacks: previous.scannedPacks + page.scannedPacks, entries: Object.freeze(entries), conflicts: Object.freeze([...new Set([...previous.conflicts, ...page.conflicts])].sort()), catalogFingerprint: registryFingerprint(entries), catalogHighWaterMark: [previous.catalogHighWaterMark, page.catalogHighWaterMark].filter((value): value is string => !!value).sort().at(-1) ?? null });
}
