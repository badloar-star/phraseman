import { types as nodeTypes } from 'node:util';

import type { DialogueV2StudyTarget } from '../../shared/dialogue_v2_language_pack_contract';
import {
  resolveStableUidForAuthInTransaction,
} from './auth_identity';
import {
  assertAccountUsable,
  readAuthAccountStateInTx,
  readStableAccountStateInTx,
} from './account_gate';
import { resolvePremiumAccess } from './premium_status';

import { reportSwallowedServer } from './swallowed_error'; // зачем: PM-229 — немой catch пишет причину [PM-229]
export const DIALOGUE_V2_FREEFORM_MEMORY_COLLECTION = 'dialogue_v2_freeform_memory';
export const DIALOGUE_V2_FREEFORM_MEMORY_MAX_BYTES = 4_096;

const AUTH_UID_RE = /^(?=.{1,128}$)[^/\u0000-\u001f\u007f]+$/;
const UNSAFE_TEXT_RE = /[\u0000-\u001f\u007f-\u009f]/u;
const TRANSCRIPT_PREFIX_RE = /^(?:user|assistant|bot|you|learner|tutor)\s*:/iu;
const UTTERANCE_PRONOUN_RE = /(?:^|[^\p{L}\p{N}_])(?:i|i'm|i've|me|my|mine|you|your|yours|we|us|our|ours|je|j'|moi|mon|ma|mes|tu|toi|ton|ta|tes|vous|votre|vos|nous|notre|nos|yo|mí|mi|mis|tú|tu|tus|usted|ustedes|vosotros|nosotros|nuestro|nuestra|ich|mich|mir|mein|meine|du|dich|dir|dein|deine|sie|ihr|ihre|wir|uns|unser|unsere)(?:$|[^\p{L}\p{N}_])/iu;
const UTTERANCE_PUNCTUATION_RE = /[?!]|[.!…][\s]*$/u;
const MAX_INTERESTS = 6;
const MAX_PATTERNS = 8;
const MAX_RECENT_TOPICS = 8;
const MAX_RAW_LEARNER_TURNS = 8;
const MAX_RAW_LEARNER_TURN_BYTES = 3_072;
const MIN_PRIVATE_OVERLAP_TOKENS = 3;

const REGISTERS = Object.freeze(['casual', 'neutral', 'formal', 'mixed'] as const);
const CORRECTION_STYLES = Object.freeze(['gentle', 'direct', 'ask_first'] as const);
const PATTERN_CATEGORIES = Object.freeze([
  'grammar', 'vocabulary', 'tone', 'fluency', 'pronunciation',
] as const);

type PreferredRegister = typeof REGISTERS[number];
type CorrectionStyle = typeof CORRECTION_STYLES[number];
type PatternCategory = typeof PATTERN_CATEGORIES[number];

export type DialogueV2FreeformMemoryDraft = Readonly<{
  learnerProfile: Readonly<{
    preferredRegister: PreferredRegister;
    correctionStyle: CorrectionStyle;
    interests: readonly string[];
  }>;
  recurringPatterns: readonly Readonly<{
    category: PatternCategory;
    observation: string;
    guidance: string;
  }>[];
  recentTopics: readonly string[];
}>;

export type DialogueV2FreeformMemory = DialogueV2FreeformMemoryDraft & Readonly<{
  schemaVersion: 1;
  kind: 'dialogue_v2_plus_freeform_memory';
  studyTarget: DialogueV2StudyTarget;
  revision: number;
  updatedAtMs: number;
}>;

export type DialogueV2FreeformMemoryReadEnvelope = Readonly<{
  actor: Readonly<{
    authUid: string;
    stableAccountId: string;
  }>;
  memory: DialogueV2FreeformMemory | null;
}>;

export type DialogueV2FreeformMemoryWriteCapability = object;

export type DialogueV2FreeformMemoryErrorCode =
  | 'request_invalid'
  | 'access_denied'
  | 'plus_required'
  | 'authorization_unavailable'
  | 'revision_conflict'
  | 'storage_invalid';

export class DialogueV2FreeformMemoryError extends Error {
  constructor(readonly code: DialogueV2FreeformMemoryErrorCode) {
    super(`dialogue_v2_freeform_memory_${code}`);
    this.name = 'DialogueV2FreeformMemoryError';
  }
}

type TimestampLike = Readonly<{ toMillis(): number }>;

export type DialogueV2FreeformMemoryRuntime = Readonly<{
  db: FirebaseFirestore.Firestore;
  nowMs(): number;
  timestampFromMillis(millis: number): TimestampLike;
}>;

type PlainRecord = Record<string, unknown>;

const resolveStableAccountInTransaction = resolveStableUidForAuthInTransaction;
const readAuthAccountState = readAuthAccountStateInTx;
const readStableAccountState = readStableAccountStateInTx;
const assertUsableAccount = assertAccountUsable;
const resolvePlusAccess = resolvePremiumAccess;

type MemoryWriteCapabilityState = {
  readonly draft: DialogueV2FreeformMemoryDraft;
  active: boolean;
};

const memoryWriteCapabilityStates = new WeakMap<object, MemoryWriteCapabilityState>();

function plainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || nodeTypes.isProxy(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) return null;
    const copy: PlainRecord = Object.create(null) as PlainRecord;
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      copy[key] = descriptor.value;
    }
    return copy;
  } catch {
    return null;
  }
}

function exactKeys(value: PlainRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function exactArray(value: unknown, maxItems: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || nodeTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Array.prototype
      || value.length > maxItems) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as PropertyDescriptorMap;
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string') || keys.length !== value.length + 1) {
      return null;
    }
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      result.push(descriptor.value);
    }
    return result;
  } catch {
    return null;
  }
}

function canonicalSummary(
  value: unknown,
  maxBytes: number,
  maxWords: number,
): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFC').trim();
  if (!normalized || normalized !== value || UNSAFE_TEXT_RE.test(normalized)
    || TRANSCRIPT_PREFIX_RE.test(normalized)
    || UTTERANCE_PRONOUN_RE.test(normalized)
    || UTTERANCE_PUNCTUATION_RE.test(normalized)
    || Buffer.byteLength(normalized, 'utf8') > maxBytes
    || normalized.split(/\s+/u).length > maxWords) return null;
  return normalized;
}

function memorySummaryStrings(draft: DialogueV2FreeformMemoryDraft): readonly string[] {
  return Object.freeze([
    ...draft.learnerProfile.interests,
    ...draft.recurringPatterns.flatMap((pattern) => [
      pattern.observation,
      pattern.guidance,
    ]),
    ...draft.recentTopics,
  ]);
}

function privacyTokens(value: string): readonly string[] {
  return Object.freeze(
    value.normalize('NFC').toLocaleLowerCase('en-US').match(/[\p{L}\p{N}]+/gu) ?? [],
  );
}

function containsPrivateOverlap(summary: string, rawTurn: string): boolean {
  const summaryTokens = privacyTokens(summary);
  const rawTokens = privacyTokens(rawTurn);
  if (summaryTokens.length === 0 || rawTokens.length === 0) return false;
  const summaryPhrase = summaryTokens.join('\u0000');
  const rawPhrase = rawTokens.join('\u0000');
  if (summaryPhrase === rawPhrase) return true;

  const [shorter, longer] = summaryTokens.length <= rawTokens.length
    ? [summaryTokens, rawTokens]
    : [rawTokens, summaryTokens];
  if (shorter.length < MIN_PRIVATE_OVERLAP_TOKENS) return false;
  const width = Math.min(shorter.length, MIN_PRIVATE_OVERLAP_TOKENS);
  for (let start = 0; start <= shorter.length - width; start += 1) {
    const needle = shorter.slice(start, start + width).join('\u0000');
    for (let offset = 0; offset <= longer.length - width; offset += 1) {
      if (longer.slice(offset, offset + width).join('\u0000') === needle) return true;
    }
  }
  return false;
}

function canonicalRawLearnerTurns(value: unknown): readonly string[] | null {
  const turns = exactArray(value, MAX_RAW_LEARNER_TURNS);
  if (!turns || turns.length === 0) return null;
  const normalized: string[] = [];
  for (const candidate of turns) {
    if (typeof candidate !== 'string') return null;
    const turn = candidate.normalize('NFC').replace(/\s+/gu, ' ').trim();
    if (!turn || Buffer.byteLength(turn, 'utf8') > MAX_RAW_LEARNER_TURN_BYTES) return null;
    normalized.push(turn);
  }
  return Object.freeze(normalized);
}

/**
 * Issues an opaque, one-use internal write capability only after proving that
 * none of the bounded summaries retains a three-token learner-turn fragment.
 * Raw turns are used transiently for comparison and are never returned or
 * persisted. This is intentionally not a callable or client contract.
 */
export function createDialogueV2FreeformMemoryWriteCapability(
  draftInput: unknown,
  rawLearnerTurnsInput: unknown,
): DialogueV2FreeformMemoryWriteCapability | null {
  const draft = parseDialogueV2FreeformMemoryDraft(draftInput);
  const rawLearnerTurns = canonicalRawLearnerTurns(rawLearnerTurnsInput);
  if (!draft || !rawLearnerTurns) return null;
  const summaries = memorySummaryStrings(draft);
  if (summaries.some((summary) => (
    rawLearnerTurns.some((rawTurn) => containsPrivateOverlap(summary, rawTurn))
  ))) return null;
  const capability = Object.freeze(Object.create(null) as object);
  memoryWriteCapabilityStates.set(capability, { draft, active: true });
  return capability;
}

function consumeMemoryWriteCapability(
  value: unknown,
): DialogueV2FreeformMemoryDraft | null {
  if (!value || typeof value !== 'object') return null;
  const state = memoryWriteCapabilityStates.get(value);
  if (!state?.active) return null;
  state.active = false;
  return state.draft;
}

function parseSummaryList(
  value: unknown,
  maxItems: number,
  maxBytes: number,
  maxWords: number,
): readonly string[] | null {
  const raw = exactArray(value, maxItems);
  if (!raw) return null;
  const parsed: string[] = [];
  const seen = new Set<string>();
  for (const candidate of raw) {
    const summary = canonicalSummary(candidate, maxBytes, maxWords);
    const key = summary?.toLocaleLowerCase('en-US');
    if (!summary || !key || seen.has(key)) return null;
    parsed.push(summary);
    seen.add(key);
  }
  return Object.freeze(parsed);
}

export function parseDialogueV2FreeformMemoryDraft(
  value: unknown,
): DialogueV2FreeformMemoryDraft | null {
  const draft = plainRecord(value);
  if (!draft || !exactKeys(draft, [
    'learnerProfile', 'recurringPatterns', 'recentTopics',
  ])) return null;

  const profile = plainRecord(draft.learnerProfile);
  if (!profile || !exactKeys(profile, [
    'preferredRegister', 'correctionStyle', 'interests',
  ])
    || typeof profile.preferredRegister !== 'string'
    || !(REGISTERS as readonly string[]).includes(profile.preferredRegister)
    || typeof profile.correctionStyle !== 'string'
    || !(CORRECTION_STYLES as readonly string[]).includes(profile.correctionStyle)) {
    return null;
  }
  const interests = parseSummaryList(profile.interests, MAX_INTERESTS, 48, 6);
  const rawPatterns = exactArray(draft.recurringPatterns, MAX_PATTERNS);
  const recentTopics = parseSummaryList(draft.recentTopics, MAX_RECENT_TOPICS, 64, 8);
  if (!interests || !rawPatterns || !recentTopics) return null;

  const recurringPatterns: DialogueV2FreeformMemoryDraft['recurringPatterns'][number][] = [];
  for (const candidate of rawPatterns) {
    const pattern = plainRecord(candidate);
    if (!pattern || !exactKeys(pattern, ['category', 'observation', 'guidance'])
      || typeof pattern.category !== 'string'
      || !(PATTERN_CATEGORIES as readonly string[]).includes(pattern.category)) return null;
    const observation = canonicalSummary(pattern.observation, 120, 18);
    const guidance = canonicalSummary(pattern.guidance, 160, 24);
    if (!observation || !guidance) return null;
    recurringPatterns.push(Object.freeze({
      category: pattern.category as PatternCategory,
      observation,
      guidance,
    }));
  }

  const parsed = Object.freeze({
    learnerProfile: Object.freeze({
      preferredRegister: profile.preferredRegister as PreferredRegister,
      correctionStyle: profile.correctionStyle as CorrectionStyle,
      interests,
    }),
    recurringPatterns: Object.freeze(recurringPatterns),
    recentTopics,
  });
  return Buffer.byteLength(JSON.stringify(parsed), 'utf8')
    <= DIALOGUE_V2_FREEFORM_MEMORY_MAX_BYTES
    ? parsed
    : null;
}

function exactStudyTarget(value: unknown): DialogueV2StudyTarget | null {
  return value === 'en' || value === 'es' || value === 'fr' || value === 'de'
    ? value
    : null;
}

function positiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function timestampMillis(value: unknown): number | null {
  const timestamp = value as Partial<TimestampLike> | null;
  if (!timestamp || typeof timestamp.toMillis !== 'function') return null;
  try {
    const millis = timestamp.toMillis();
    return positiveSafeInteger(millis) ? millis : null;
  } catch {
    return null;
  }
}

function decodeStoredMemory(
  value: unknown,
  expectedStudyTarget: DialogueV2StudyTarget,
): DialogueV2FreeformMemory | null {
  const stored = plainRecord(value);
  if (!stored || !exactKeys(stored, [
    'schemaVersion', 'kind', 'studyTarget', 'revision', 'updatedAt',
    'learnerProfile', 'recurringPatterns', 'recentTopics',
  ])
    || stored.schemaVersion !== 1
    || stored.kind !== 'dialogue_v2_plus_freeform_memory'
    || stored.studyTarget !== expectedStudyTarget
    || !positiveSafeInteger(stored.revision)) return null;
  const updatedAtMs = timestampMillis(stored.updatedAt);
  const draft = parseDialogueV2FreeformMemoryDraft({
    learnerProfile: stored.learnerProfile,
    recurringPatterns: stored.recurringPatterns,
    recentTopics: stored.recentTopics,
  });
  if (!updatedAtMs || !draft) return null;
  return Object.freeze({
    schemaVersion: 1,
    kind: 'dialogue_v2_plus_freeform_memory',
    studyTarget: expectedStudyTarget,
    revision: stored.revision,
    updatedAtMs,
    ...draft,
  });
}

function encodeStoredMemory(
  memory: DialogueV2FreeformMemory,
  timestampFromMillis: DialogueV2FreeformMemoryRuntime['timestampFromMillis'],
): Record<string, unknown> {
  return {
    schemaVersion: memory.schemaVersion,
    kind: memory.kind,
    studyTarget: memory.studyTarget,
    revision: memory.revision,
    updatedAt: timestampFromMillis(memory.updatedAtMs),
    learnerProfile: memory.learnerProfile,
    recurringPatterns: memory.recurringPatterns,
    recentTopics: memory.recentTopics,
  };
}

function safeNowMs(runtime: DialogueV2FreeformMemoryRuntime): number {
  try {
    const nowMs = runtime.nowMs();
    if (positiveSafeInteger(nowMs)) return nowMs;
  } catch (pm229Error) {
    reportSwallowedServer('dialogue_v2_freeform_memory:nowMs', pm229Error);
    // Normalize runtime failures below.
  }
  throw new DialogueV2FreeformMemoryError('authorization_unavailable');
}

function documentReadKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Readonly<{ path?: unknown }>;
  return typeof candidate.path === 'string' ? candidate.path : null;
}

function memoizeDocumentReads(
  transaction: FirebaseFirestore.Transaction,
): FirebaseFirestore.Transaction {
  const reads = new Map<string, Promise<unknown>>();
  const memoizedGet = ((reference: unknown) => {
    const key = documentReadKey(reference);
    if (!key) return Reflect.apply(transaction.get, transaction, [reference]);
    const existing = reads.get(key);
    if (existing) return existing;
    const read = Reflect.apply(transaction.get, transaction, [reference]) as Promise<unknown>;
    reads.set(key, read);
    return read;
  }) as FirebaseFirestore.Transaction['get'];
  return new Proxy(transaction, {
    get: (target, property) => {
      if (property === 'get') return memoizedGet;
      const member = Reflect.get(target, property, target) as unknown;
      return typeof member === 'function' ? member.bind(target) : member;
    },
  });
}

async function runOwnedMemoryTransaction<T>(
  runtime: DialogueV2FreeformMemoryRuntime,
  authUid: string,
  requirePlus: boolean,
  operation: (
    stableAccountId: string,
    transaction: FirebaseFirestore.Transaction,
    nowMs: number,
  ) => Promise<T>,
): Promise<T> {
  const nowMs = safeNowMs(runtime);
  try {
    return await runtime.db.runTransaction(async (rawTransaction) => {
      const transaction = memoizeDocumentReads(rawTransaction);
      let stableAccountId: string;
      try {
        stableAccountId = await resolveStableAccountInTransaction(
          runtime.db,
          transaction,
          authUid,
        );
        const [authState, stableState] = await Promise.all([
          readAuthAccountState(transaction, runtime.db, authUid, nowMs),
          readStableAccountState(transaction, runtime.db, stableAccountId, nowMs),
        ]);
        assertUsableAccount(authState);
        assertUsableAccount(stableState);
        const ownerSnapshot = await transaction.get(
          runtime.db.collection('users').doc(stableAccountId),
        );
        const owner = plainRecord(ownerSnapshot.data());
        const linkedAuth = plainRecord(owner?.linkedAuth);
        if (!ownerSnapshot.exists
          || (owner?.firebaseAuthUid !== authUid && linkedAuth?.providerUid !== authUid)) {
          throw new DialogueV2FreeformMemoryError('access_denied');
        }
      } catch {
        throw new DialogueV2FreeformMemoryError('access_denied');
      }

      if (requirePlus) {
        let isPlus: boolean;
        try {
          isPlus = await resolvePlusAccess(
            runtime.db,
            stableAccountId,
            nowMs,
            authUid,
            transaction,
          );
        } catch {
          throw new DialogueV2FreeformMemoryError('authorization_unavailable');
        }
        if (isPlus !== true) throw new DialogueV2FreeformMemoryError('plus_required');
      }
      return operation(stableAccountId, transaction, nowMs);
    });
  } catch (error) {
    if (error instanceof DialogueV2FreeformMemoryError) throw error;
    throw new DialogueV2FreeformMemoryError('authorization_unavailable');
  }
}

function validateRequest(
  authUid: unknown,
  studyTargetInput: unknown,
): DialogueV2StudyTarget {
  const studyTarget = exactStudyTarget(studyTargetInput);
  if (typeof authUid !== 'string' || !AUTH_UID_RE.test(authUid) || !studyTarget) {
    throw new DialogueV2FreeformMemoryError('request_invalid');
  }
  return studyTarget;
}

function memoryDocumentPath(
  stableAccountId: string,
  studyTarget: DialogueV2StudyTarget,
): string {
  return `users/${stableAccountId}/${DIALOGUE_V2_FREEFORM_MEMORY_COLLECTION}/${studyTarget}`;
}

export async function readDialogueV2FreeformMemory(
  runtime: DialogueV2FreeformMemoryRuntime,
  authUid: string,
  studyTargetInput: DialogueV2StudyTarget,
): Promise<DialogueV2FreeformMemory | null> {
  return (await readDialogueV2FreeformMemoryWithActor(
    runtime,
    authUid,
    studyTargetInput,
  )).memory;
}

/**
 * Server-only read envelope binding the selected memory document to the exact
 * canonical actor resolved in the same authorization transaction. Callers must
 * compare this actor to their own previously authorized owner before combining
 * memory with any other account-scoped context.
 */
export async function readDialogueV2FreeformMemoryWithActor(
  runtime: DialogueV2FreeformMemoryRuntime,
  authUid: string,
  studyTargetInput: DialogueV2StudyTarget,
): Promise<DialogueV2FreeformMemoryReadEnvelope> {
  const studyTarget = validateRequest(authUid, studyTargetInput);
  return runOwnedMemoryTransaction(
    runtime,
    authUid,
    true,
    async (stableAccountId, transaction) => {
      const reference = runtime.db.doc(
        memoryDocumentPath(stableAccountId, studyTarget),
      );
      const snapshot = await transaction.get(reference);
      let memory: DialogueV2FreeformMemory | null = null;
      if (snapshot.exists) {
        memory = decodeStoredMemory(snapshot.data(), studyTarget);
        if (!memory) throw new DialogueV2FreeformMemoryError('storage_invalid');
      }
      return Object.freeze({
        actor: Object.freeze({ authUid, stableAccountId }),
        memory,
      });
    },
  );
}

export async function writeDialogueV2FreeformMemory(
  runtime: DialogueV2FreeformMemoryRuntime,
  authUid: string,
  studyTargetInput: DialogueV2StudyTarget,
  capabilityInput: DialogueV2FreeformMemoryWriteCapability,
  expectedRevision: number,
): Promise<DialogueV2FreeformMemory> {
  const studyTarget = validateRequest(authUid, studyTargetInput);
  const draft = consumeMemoryWriteCapability(capabilityInput);
  if (!draft || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new DialogueV2FreeformMemoryError('request_invalid');
  }
  return runOwnedMemoryTransaction(
    runtime,
    authUid,
    true,
    async (stableAccountId, transaction, nowMs) => {
      const reference = runtime.db.doc(
        memoryDocumentPath(stableAccountId, studyTarget),
      );
      const snapshot = await transaction.get(reference);
      let currentRevision = 0;
      if (snapshot.exists) {
        const current = decodeStoredMemory(snapshot.data(), studyTarget);
        if (!current) throw new DialogueV2FreeformMemoryError('storage_invalid');
        currentRevision = current.revision;
      }
      if (currentRevision !== expectedRevision) {
        throw new DialogueV2FreeformMemoryError('revision_conflict');
      }
      const memory = Object.freeze({
        schemaVersion: 1 as const,
        kind: 'dialogue_v2_plus_freeform_memory' as const,
        studyTarget,
        revision: currentRevision + 1,
        updatedAtMs: nowMs,
        ...draft,
      });
      transaction.set(reference, encodeStoredMemory(memory, runtime.timestampFromMillis));
      return memory;
    },
  );
}

/**
 * Server-only owner erasure. It deliberately does not require Plus, so a
 * downgraded learner can remove retained memory. The transaction never reads
 * the memory document and returns no existence signal.
 */
export async function deleteDialogueV2FreeformMemory(
  runtime: DialogueV2FreeformMemoryRuntime,
  authUid: string,
  studyTargetInput: DialogueV2StudyTarget,
): Promise<void> {
  const studyTarget = validateRequest(authUid, studyTargetInput);
  await runOwnedMemoryTransaction(
    runtime,
    authUid,
    false,
    async (stableAccountId, transaction) => {
      transaction.delete(runtime.db.doc(
        memoryDocumentPath(stableAccountId, studyTarget),
      ));
    },
  );
}
