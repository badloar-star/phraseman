import { buildFlashcardRegistryEntry, mergeFlashcardRegistrySource, type FlashcardRegistryEntry, type FlashcardRegistrySource } from './flashcard_semantic_registry';

const SOURCE_LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type PackLike = { readonly id: string; readonly studyTarget?: string; readonly cards?: readonly unknown[] };

function record(value: unknown): Record<string, unknown> | undefined { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }

export function flashcardRegistryEntriesForPack(pack: PackLike): readonly FlashcardRegistryEntry[] {
  const entries: FlashcardRegistryEntry[] = [];
  for (const raw of Array.isArray(pack.cards) ? pack.cards : []) {
    const card = record(raw); if (!card) continue;
    const sourceLocales = record(card.sourceLocales);
    for (const sourceLocale of SOURCE_LOCALES) {
      const back = sourceLocale === 'ru' || sourceLocale === 'uk' || sourceLocale === 'es' ? card[sourceLocale] : sourceLocales?.[sourceLocale];
      if (!String(back ?? '').trim()) continue;
      entries.push(buildFlashcardRegistryEntry({ partition: { surface: 'community_flashcards', studyTarget: String(pack.studyTarget ?? 'en'), sourceLocale }, packId: pack.id, card: { id: card.id, front: card.front ?? card.en, back } }));
    }
  }
  const grouped = new Map<string, FlashcardRegistryEntry>();
  for (const entry of entries) grouped.set(entry.docId, grouped.has(entry.docId) ? mergeFlashcardRegistrySource(grouped.get(entry.docId)!, entry) : entry);
  return Object.freeze([...grouped.values()].sort((a, b) => a.docId.localeCompare(b.docId)));
}

export interface FlashcardRegistryPackMutation {
  readonly docId: string;
  readonly canonicalKey: string;
  readonly partitionKey: string;
  readonly addSources: readonly FlashcardRegistrySource[];
  readonly removeSources: readonly FlashcardRegistrySource[];
}

export function applyFlashcardRegistryDocumentMutation(current: FlashcardRegistryEntry | null, mutation: FlashcardRegistryPackMutation): FlashcardRegistryEntry | null {
  if (current && (current.partitionKey !== mutation.partitionKey || current.canonicalKey !== mutation.canonicalKey || current.docId !== mutation.docId)) throw new Error('flashcard_registry_hash_collision');
  const remove = new Set(mutation.removeSources.map((source) => `${source.packId}\u0000${source.cardId}`));
  const sources = new Map((current?.sources ?? []).filter((source) => !remove.has(`${source.packId}\u0000${source.cardId}`)).map((source) => [`${source.packId}\u0000${source.cardId}`, source]));
  for (const source of mutation.addSources) sources.set(`${source.packId}\u0000${source.cardId}`, source);
  return sources.size ? Object.freeze({ docId: mutation.docId, partitionKey: mutation.partitionKey, canonicalKey: mutation.canonicalKey, sources: Object.freeze([...sources.values()].sort((a, b) => `${a.packId}\u0000${a.cardId}`.localeCompare(`${b.packId}\u0000${b.cardId}`))) }) : null;
}

export function planFlashcardRegistryPackMutation(previous: PackLike | null, next: PackLike | null): readonly FlashcardRegistryPackMutation[] {
  const before = previous ? flashcardRegistryEntriesForPack(previous) : [];
  const after = next ? flashcardRegistryEntriesForPack(next) : [];
  const ids = [...new Set([...before, ...after].map((entry) => entry.docId))].sort();
  return Object.freeze(ids.map((docId) => {
    const oldEntry = before.find((entry) => entry.docId === docId); const newEntry = after.find((entry) => entry.docId === docId);
    const identity = newEntry ?? oldEntry!;
    const key = (source: FlashcardRegistrySource) => `${source.packId}\u0000${source.cardId}`;
    const oldKeys = new Set((oldEntry?.sources ?? []).map(key)); const newKeys = new Set((newEntry?.sources ?? []).map(key));
    return Object.freeze({ docId, canonicalKey: identity.canonicalKey, partitionKey: identity.partitionKey, addSources: Object.freeze((newEntry?.sources ?? []).filter((source) => !oldKeys.has(key(source)))), removeSources: Object.freeze((oldEntry?.sources ?? []).filter((source) => !newKeys.has(key(source)))) });
  }));
}
