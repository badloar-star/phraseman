import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import {
  VOICE_TUTOR_MEMORY_COLLECTION,
  acceptMemoryCandidate,
  parseTutorMemory,
  tutorMemoryItemId,
  voiceTutorMemoryDocId,
  type TutorMemory,
} from './max_voice_tutor_memory';

if (!admin.apps.length) admin.initializeApp();

const REGION = 'us-central1';

export interface MaxVoiceMemoryProjectionV2 {
  schemaVersion: 2;
  preferredName: string | null;
  learningGoal: string | null;
  languagePreference: 'more_target' | 'more_native' | null;
  pacePreference: 'slower' | 'normal' | 'faster' | null;
  conversationHooks: { id: string; text: string }[];
  activeIssues: { id: string; label: string; evidenceCount: number }[];
  resolvedIssues: { id: string; label: string }[];
  homework: string[];
  nextTopic: string;
  callCount: number;
  lastCefr: 'A1' | 'A2' | 'B1' | 'B2';
}

export interface MaxVoiceMemoryControlDependencies {
  nowMs(): number;
  resolveStableUid(authUid: string): Promise<string>;
  read(stableUid: string, authUid: string): Promise<unknown>;
  write(value: TutorMemory & { stableUid: string; authUid: string; updatedAtMs: number }, stableUid: string, authUid: string): Promise<void>;
  mutate?(
    stableUid: string,
    authUid: string,
    update: (raw: unknown) => TutorMemory & { stableUid: string; authUid: string; updatedAtMs: number },
  ): Promise<TutorMemory>;
  remove(stableUid: string, authUid: string, clearedAtMs: number): Promise<void>;
}

export interface MaxVoiceMemoryControlInput {
  authUid: string;
  data: unknown;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'max_memory_request_invalid');
  }
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const allow = new Set(allowed);
  if (Object.keys(value).some((key) => !allow.has(key))) {
    throw new HttpsError('invalid-argument', 'max_memory_unknown_field');
  }
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') throw new HttpsError('invalid-argument', 'max_memory_text_invalid');
  const cleaned = Array.from(value.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim())
    .slice(0, max + 1)
    .join('');
  if (!cleaned || Array.from(cleaned).length > max) {
    throw new HttpsError('invalid-argument', 'max_memory_text_invalid');
  }
  return cleaned;
}

function publicProjection(memory: TutorMemory): MaxVoiceMemoryProjectionV2 {
  return {
    schemaVersion: 2,
    preferredName: memory.preferredName,
    learningGoal: memory.learningGoal,
    languagePreference: memory.languagePreference || null,
    pacePreference: memory.pacePreference,
    conversationHooks: memory.conversationHooks.map(({ id, text }) => ({ id, text })),
    activeIssues: memory.activeIssues.map(({ id, label, evidenceCount }) => ({ id, label, evidenceCount })),
    resolvedIssues: memory.resolvedIssues.map(({ id, label }) => ({ id, label })),
    homework: [...memory.homework],
    nextTopic: memory.nextTopic,
    callCount: memory.callCount,
    lastCefr: memory.lastCefr as MaxVoiceMemoryProjectionV2['lastCefr'],
  };
}

async function ownedMemory(
  input: MaxVoiceMemoryControlInput,
  deps: MaxVoiceMemoryControlDependencies,
): Promise<{ stableUid: string; memory: TutorMemory }> {
  if (!input.authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const stableUid = await deps.resolveStableUid(input.authUid);
  const memory = parseTutorMemory(await deps.read(stableUid, input.authUid));
  if (memory.stableUid && memory.stableUid !== stableUid) {
    throw new HttpsError('permission-denied', 'max_memory_owner_mismatch');
  }
  if (memory.authUid && memory.authUid !== input.authUid) {
    throw new HttpsError('permission-denied', 'max_memory_owner_mismatch');
  }
  return { stableUid, memory };
}

function assertOwnedMemory(raw: unknown, stableUid: string, authUid: string): TutorMemory {
  const memory = parseTutorMemory(raw);
  if (memory.stableUid && memory.stableUid !== stableUid) {
    throw new HttpsError('permission-denied', 'max_memory_owner_mismatch');
  }
  if (memory.authUid && memory.authUid !== authUid) {
    throw new HttpsError('permission-denied', 'max_memory_owner_mismatch');
  }
  return memory;
}

async function mutateOwnedMemory(
  input: MaxVoiceMemoryControlInput,
  deps: MaxVoiceMemoryControlDependencies,
  update: (memory: TutorMemory) => TutorMemory,
): Promise<MaxVoiceMemoryProjectionV2> {
  if (!input.authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const stableUid = await deps.resolveStableUid(input.authUid);
  const build = (raw: unknown) => {
    const memory = assertOwnedMemory(raw, stableUid, input.authUid);
    return {
      ...update(memory),
      stableUid,
      authUid: input.authUid,
      updatedAtMs: deps.nowMs(),
    };
  };
  if (deps.mutate) return publicProjection(await deps.mutate(stableUid, input.authUid, build));
  const next = build(await deps.read(stableUid, input.authUid));
  await deps.write(next, stableUid, input.authUid);
  return publicProjection(next);
}

export async function getMaxVoiceMemory(
  input: MaxVoiceMemoryControlInput,
  deps: MaxVoiceMemoryControlDependencies,
): Promise<MaxVoiceMemoryProjectionV2> {
  onlyKeys(object(input.data), []);
  const { memory } = await ownedMemory(input, deps);
  return publicProjection(memory);
}

export async function updateMaxVoiceMemory(
  input: MaxVoiceMemoryControlInput,
  deps: MaxVoiceMemoryControlDependencies,
): Promise<MaxVoiceMemoryProjectionV2> {
  const data = object(input.data);
  onlyKeys(data, ['field', 'value', 'itemId', 'text']);
  return mutateOwnedMemory(input, deps, (memory) => {
    if (data.itemId !== undefined || data.text !== undefined) {
      if (data.field !== undefined || data.value !== undefined) {
        throw new HttpsError('invalid-argument', 'max_memory_update_shape_invalid');
      }
      const itemId = cleanText(data.itemId, 64);
      const text = cleanText(data.text, 140);
      const index = memory.conversationHooks.findIndex((item) => item.id === itemId);
      if (index < 0) throw new HttpsError('invalid-argument', 'max_memory_item_not_found');
      const existing = memory.conversationHooks[index];
      if (!acceptMemoryCandidate(text, {
        evidenceSessionId: existing.evidenceSessionId || 'user_edit',
        directlyStatedByLearner: true,
      })) {
        throw new HttpsError('invalid-argument', 'max_memory_sensitive_value');
      }
      const edited = { ...existing, id: tutorMemoryItemId('hook', text), text, updatedAtMs: deps.nowMs() };
      const conversationHooks = [edited, ...memory.conversationHooks.filter((item, itemIndex) => itemIndex !== index && item.id !== edited.id)];
      return { ...memory, conversationHooks, facts: conversationHooks.map((item) => item.text) };
    }
    const field = cleanText(data.field, 40);
    if (!['preferredName', 'learningGoal', 'languagePreference', 'pacePreference'].includes(field)) {
      throw new HttpsError('invalid-argument', 'max_memory_field_not_editable');
    }
    if (field === 'preferredName' || field === 'learningGoal') {
      const value = data.value === null ? null : cleanText(data.value, field === 'preferredName' ? 60 : 160);
      if (value && !acceptMemoryCandidate(value, { evidenceSessionId: 'user_edit', directlyStatedByLearner: true })) {
        throw new HttpsError('invalid-argument', 'max_memory_sensitive_value');
      }
      return { ...memory, [field]: value };
    }
    if (field === 'languagePreference') {
      const value = data.value === null || data.value === 'default' ? null : data.value;
      if (value !== null && value !== 'more_target' && value !== 'more_native') {
        throw new HttpsError('invalid-argument', 'max_memory_preference_invalid');
      }
      return { ...memory, languagePreference: value };
    }
    const value = data.value === null ? null : data.value;
    if (value !== null && value !== 'slower' && value !== 'normal' && value !== 'faster') {
      throw new HttpsError('invalid-argument', 'max_memory_preference_invalid');
    }
    return { ...memory, pacePreference: value };
  });
}

export async function deleteMaxVoiceMemoryItem(
  input: MaxVoiceMemoryControlInput,
  deps: MaxVoiceMemoryControlDependencies,
): Promise<MaxVoiceMemoryProjectionV2> {
  const data = object(input.data);
  onlyKeys(data, ['itemId']);
  const itemId = cleanText(data.itemId, 64);
  return mutateOwnedMemory(input, deps, (memory) => {
    const conversationHooks = memory.conversationHooks.filter((item) => item.id !== itemId);
    const activeIssues = memory.activeIssues.filter((item) => item.id !== itemId);
    const resolvedIssues = memory.resolvedIssues.filter((item) => item.id !== itemId);
    if (conversationHooks.length === memory.conversationHooks.length
      && activeIssues.length === memory.activeIssues.length
      && resolvedIssues.length === memory.resolvedIssues.length) {
      throw new HttpsError('invalid-argument', 'max_memory_item_not_found');
    }
    return {
      ...memory,
      conversationHooks,
      activeIssues,
      resolvedIssues,
      facts: conversationHooks.map((item) => item.text),
      recurringErrors: activeIssues.map((item) => item.label),
    };
  });
}

export async function clearMaxVoiceMemory(
  input: MaxVoiceMemoryControlInput,
  deps: MaxVoiceMemoryControlDependencies,
): Promise<{ ok: true }> {
  onlyKeys(object(input.data), []);
  const stableUid = await deps.resolveStableUid(input.authUid);
  await deps.remove(stableUid, input.authUid, deps.nowMs());
  return { ok: true };
}

function productionDependencies(): MaxVoiceMemoryControlDependencies {
  const db = admin.firestore();
  const ref = (authUid: string, stableUid: string) => db.collection(VOICE_TUTOR_MEMORY_COLLECTION)
    .doc(voiceTutorMemoryDocId(authUid, stableUid));
  return {
    nowMs: () => Date.now(),
    resolveStableUid: (authUid) => resolveStableUidForAuth(
      db,
      authUid,
      undefined,
      { repairLinks: false, requireKnownIdentity: true },
    ),
    read: async (stableUid, authUid) => (await ref(authUid, stableUid).get()).data(),
    write: async (value, stableUid, authUid) => { await ref(authUid, stableUid).set(value); },
    mutate: async (stableUid, authUid, update) => db.runTransaction(async (transaction) => {
      const document = ref(authUid, stableUid);
      const next = update((await transaction.get(document)).data());
      transaction.set(document, next);
      return next;
    }),
    remove: async (stableUid, authUid, clearedAtMs) => {
      // Replace personal notes with a minimal tombstone. An already-running
      // finalizer reads this server timestamp and cannot recreate older memory.
      await ref(authUid, stableUid).set({
        schemaVersion: 2,
        stableUid,
        authUid,
        memoryClearedAtMs: clearedAtMs,
        updatedAtMs: clearedAtMs,
      });
    },
  };
}

const callableOptions = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 20,
  memory: '256MiB' as const,
  maxInstances: 20,
};

function authedInput(request: { auth?: { uid?: string }; data?: unknown }): MaxVoiceMemoryControlInput {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  return { authUid: request.auth.uid, data: request.data ?? {} };
}

export const maxVoiceGetMemory = onCall(callableOptions, async (request) => (
  getMaxVoiceMemory(authedInput(request), productionDependencies())
));

export const maxVoiceUpdateMemory = onCall(callableOptions, async (request) => (
  updateMaxVoiceMemory(authedInput(request), productionDependencies())
));

export const maxVoiceDeleteMemoryItem = onCall(callableOptions, async (request) => (
  deleteMaxVoiceMemoryItem(authedInput(request), productionDependencies())
));

export const maxVoiceClearMemory = onCall(callableOptions, async (request) => (
  clearMaxVoiceMemory(authedInput(request), productionDependencies())
));
