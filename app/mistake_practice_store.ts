import AsyncStorage from '@react-native-async-storage/async-storage';
import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';
import type {
  MistakeEvent,
  MistakeStudyTarget,
} from '../modules/mistake-practice/contracts';
import {
  mergeMistakeEventJournals,
  parseMistakeEventJournal,
  chunkMistakeEventJournal,
  type MistakeEventJournal,
} from './mistake_practice_cloud_merge';
import {
  mistakePracticeEventChunkKey,
  mistakePracticeEventsKey,
  mistakePracticeManifestPageKey,
} from './target_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import {
  commitPhoneStatePracticeFact,
  mergePhoneStatePracticeFacts,
} from './phone_state_practice_bridge';

export interface MistakePracticeStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys?(): Promise<readonly string[]>;
}

export type MergeMistakeEventsResult = Readonly<{
  appendedCount: number;
  journal: MistakeEventJournal;
}>;

interface JournalScope {
  readonly accountScope: string;
  readonly studyTarget: MistakeStudyTarget;
  readonly storage?: MistakePracticeStorage;
}

const locks = new Map<string, Promise<void>>();
const MANIFEST_PAGE_CHUNKS = 64;

async function sweepUnreachableMistakePracticeGraph(input: Readonly<{
  storage: MistakePracticeStorage;
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  reachable: ReadonlySet<string>;
  assertCurrentOwner: () => void;
}>): Promise<void> {
  if (!input.storage.getAllKeys) return;
  const hashTail = '0'.repeat(64);
  const chunkPrefix = mistakePracticeEventChunkKey(
    input.accountScope, input.studyTarget, hashTail,
  ).slice(0, -hashTail.length);
  const pagePrefix = mistakePracticeManifestPageKey(
    input.accountScope, input.studyTarget, hashTail,
  ).slice(0, -hashTail.length);
  let keys: readonly string[];
  try { keys = await input.storage.getAllKeys(); }
  catch { return; }
  input.assertCurrentOwner();
  for (const key of keys) {
    if ((!key.startsWith(chunkPrefix) && !key.startsWith(pagePrefix)) || input.reachable.has(key)) continue;
    input.assertCurrentOwner();
    try { await input.storage.removeItem(key); }
    catch { /* The committed root remains authoritative; a later sweep retries the orphan. */ }
  }
  input.assertCurrentOwner();
}

type JournalRootV2 = Readonly<{
  version: 2;
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  headPageId: string | null;
  eventCount: number;
}>;

type JournalManifestPageV1 = Readonly<{
  version: 1;
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  chunkIds: readonly string[];
  previousPageId: string | null;
}>;

const emptyJournal = (
  accountScope: string,
  studyTarget: MistakeStudyTarget,
): MistakeEventJournal => Object.freeze({
  version: 1,
  accountScope,
  studyTarget,
  events: Object.freeze([]),
});

async function mergePhoneStateJournal(journal: MistakeEventJournal): Promise<MistakeEventJournal> {
  const facts = await mergePhoneStatePracticeFacts(
    'mistake',
    Object.fromEntries(journal.events.map((event) => [event.eventId, event])),
    journal.accountScope,
  );
  return mergeMistakeEventJournals(journal, {
    version: 1,
    accountScope: journal.accountScope,
    studyTarget: journal.studyTarget,
    events: Object.freeze(Object.values(facts)),
  });
}

const normalizedScope = (value: string): string => {
  const scope = String(value ?? '').trim();
  if (!scope) throw new Error('mistake_practice_account_scope_required');
  return scope;
};

async function withJournalLock<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  locks.set(key, queued);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (locks.get(key) === queued) locks.delete(key);
  }
}

async function persistMistakeEventJournal(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  storage: MistakePracticeStorage;
  key: string;
  journal: MistakeEventJournal;
  assertCurrentOwner: () => void;
}>): Promise<void> {
  const chunkIds: string[] = [];
  const reachableGraphKeys = new Set<string>();
  for (const chunk of chunkMistakeEventJournal(input.journal)) {
    const encoded = canonicalJsonV1(chunk);
    const chunkId = sha256Utf8(encoded);
    const chunkKey = mistakePracticeEventChunkKey(input.accountScope, input.studyTarget, chunkId);
    await input.storage.setItem(chunkKey, encoded);
    reachableGraphKeys.add(chunkKey);
    chunkIds.push(chunkId);
  }
  let previousPageId: string | null = null;
  for (let offset = 0; offset < chunkIds.length; offset += MANIFEST_PAGE_CHUNKS) {
    const page: JournalManifestPageV1 = Object.freeze({
      version: 1,
      accountScope: input.accountScope,
      studyTarget: input.studyTarget,
      chunkIds: Object.freeze(chunkIds.slice(offset, offset + MANIFEST_PAGE_CHUNKS)),
      previousPageId,
    });
    const encoded = canonicalJsonV1(page);
    const pageId = sha256Utf8(encoded);
    const pageKey = mistakePracticeManifestPageKey(input.accountScope, input.studyTarget, pageId);
    await input.storage.setItem(pageKey, encoded);
    reachableGraphKeys.add(pageKey);
    previousPageId = pageId;
  }
  const root: JournalRootV2 = Object.freeze({
    version: 2,
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
    headPageId: previousPageId,
    eventCount: input.journal.events.length,
  });
  input.assertCurrentOwner();
  await input.storage.setItem(input.key, canonicalJsonV1(root));
  input.assertCurrentOwner();
  await sweepUnreachableMistakePracticeGraph({
    storage: input.storage,
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
    reachable: reachableGraphKeys,
    assertCurrentOwner: input.assertCurrentOwner,
  });
}

export async function loadMistakeEventJournal(
  input: JournalScope,
): Promise<MistakeEventJournal> {
  const accountScope = normalizedScope(input.accountScope);
  const storage = input.storage ?? AsyncStorage;
  const raw = await storage.getItem(mistakePracticeEventsKey(accountScope, input.studyTarget));
  if (!raw) return mergePhoneStateJournal(emptyJournal(accountScope, input.studyTarget));
  let rootCandidate: unknown;
  try { rootCandidate = JSON.parse(raw); } catch { /* v1 parser reports canonical error */ }
  if (
    rootCandidate && typeof rootCandidate === 'object' && !Array.isArray(rootCandidate)
    && (rootCandidate as { version?: unknown }).version === 2
  ) {
    const root = rootCandidate as Partial<JournalRootV2>;
    if (root.accountScope !== accountScope || root.studyTarget !== input.studyTarget ||
      !Number.isSafeInteger(root.eventCount) || Number(root.eventCount) < 0 ||
      (root.headPageId !== null && (typeof root.headPageId !== 'string' || !/^[a-f0-9]{64}$/.test(root.headPageId)))) {
      throw new Error('mistake_practice_events_corrupt');
    }
    const reversedPages: JournalManifestPageV1[] = [];
    const visited = new Set<string>();
    let pageId = root.headPageId;
    while (pageId) {
      if (visited.has(pageId) || visited.size > 10_000) throw new Error('mistake_practice_events_corrupt');
      visited.add(pageId);
      const pageRaw = await storage.getItem(mistakePracticeManifestPageKey(accountScope, input.studyTarget, pageId));
      if (!pageRaw) throw new Error('mistake_practice_events_corrupt');
      let page: JournalManifestPageV1;
      try { page = JSON.parse(pageRaw) as JournalManifestPageV1; } catch { throw new Error('mistake_practice_events_corrupt'); }
      if (sha256Utf8(canonicalJsonV1(page)) !== pageId || page.version !== 1 ||
        page.accountScope !== accountScope || page.studyTarget !== input.studyTarget ||
        !Array.isArray(page.chunkIds) || page.chunkIds.length > MANIFEST_PAGE_CHUNKS ||
        !page.chunkIds.every((id) => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id)) ||
        (page.previousPageId !== null && !/^[a-f0-9]{64}$/.test(page.previousPageId))) {
        throw new Error('mistake_practice_events_corrupt');
      }
      reversedPages.push(page);
      pageId = page.previousPageId;
    }
    let journal = emptyJournal(accountScope, input.studyTarget);
    for (const page of reversedPages.reverse()) {
      for (const chunkId of page.chunkIds) {
        const chunkRaw = await storage.getItem(mistakePracticeEventChunkKey(accountScope, input.studyTarget, chunkId));
        if (!chunkRaw || sha256Utf8(chunkRaw) !== chunkId) throw new Error('mistake_practice_events_corrupt');
        journal = mergeMistakeEventJournals(journal, parseMistakeEventJournal(chunkRaw));
      }
    }
    if (journal.events.length !== root.eventCount) throw new Error('mistake_practice_events_corrupt');
    return mergePhoneStateJournal(journal);
  }
  const parsed = parseMistakeEventJournal(raw);
  if (
    parsed.accountScope !== accountScope
    || parsed.studyTarget !== input.studyTarget
  ) {
    return mergePhoneStateJournal(emptyJournal(accountScope, input.studyTarget));
  }
  return mergePhoneStateJournal(parsed);
}

export async function appendMistakeEvent(
  input: JournalScope & { readonly event: MistakeEvent },
): Promise<Readonly<{ appended: boolean; journal: MistakeEventJournal }>> {
  const result = await mergeMistakeEvents({ ...input, events: [input.event] });
  return Object.freeze({ appended: result.appendedCount === 1, journal: result.journal });
}

export async function mergeMistakeEvents(
  input: JournalScope & { readonly events: readonly MistakeEvent[] },
): Promise<MergeMistakeEventsResult> {
  const accountScope = normalizedScope(input.accountScope);
  if (input.events.some((event) => event.studyTarget !== input.studyTarget)) {
    throw new Error('mistake_practice_event_target_mismatch');
  }
  const storage = input.storage ?? AsyncStorage;
  const key = mistakePracticeEventsKey(accountScope, input.studyTarget);
  const generation = captureAccountGeneration();
  const assertCurrentOwner = () => {
    if (
      generation.phase !== 'uninitialized'
      && !isCurrentAccountGeneration(generation, accountScope)
    ) throw new Error('stale_account_generation');
  };
  return withAccountTransitionLock(() => withJournalLock(key, async () => {
    assertCurrentOwner();
    const current = await loadMistakeEventJournal({
      accountScope,
      studyTarget: input.studyTarget,
      storage,
    });
    const currentIds = new Set(current.events.map((event) => event.eventId));
    const journal = mergeMistakeEventJournals(current, {
      version: 1,
      accountScope,
      studyTarget: input.studyTarget,
      events: input.events,
    });
    const appendedCount = journal.events.reduce(
      (count, event) => count + (currentIds.has(event.eventId) ? 0 : 1),
      0,
    );
    if (appendedCount === 0) {
      return Object.freeze({ appendedCount, journal });
    }
    assertCurrentOwner();
    for (const event of journal.events) {
      if (currentIds.has(event.eventId)) continue;
      await commitPhoneStatePracticeFact('mistake', event.eventId, event, accountScope);
      assertCurrentOwner();
    }
    await persistMistakeEventJournal({
      storage,
      accountScope,
      studyTarget: input.studyTarget,
      key,
      journal,
      assertCurrentOwner,
    });
    return Object.freeze({ appendedCount, journal });
  }));
}
