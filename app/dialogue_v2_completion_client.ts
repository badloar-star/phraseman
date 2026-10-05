import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import {
  buildDialogueV2CompletionReview,
  type DialogueV2CompletionReview,
} from './dialogue_v2_completion_review_adapter';

const REGION = 'us-central1';
const STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);
const INTERFACE_LANGUAGES = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'fr', 'de']);
const SESSION_RE = /^d2s_[A-Za-z0-9_-]{32,96}$/;
const SCENARIO_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;

export type DialogueV2CompletionSelection = Readonly<{
  sessionId: string;
  studyTarget: 'en' | 'es' | 'fr' | 'de';
  scenarioId: string;
  interfaceLang: string;
}>;

export type DialogueV2CompletionResult = Readonly<{
  review: DialogueV2CompletionReview;
  memory: Readonly<{
    sharedMemoryStored: true;
    scenarioCheckpointStored: boolean;
  }>;
  replayed: boolean;
}>;

export class DialogueV2CompletionUnavailableError extends Error {
  constructor() {
    super('dialogue_v2_completion_unavailable');
    this.name = 'DialogueV2CompletionUnavailableError';
  }
}

function record(value: unknown): Record<string, unknown> | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string')) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function safeSelection(value: unknown): DialogueV2CompletionSelection | null {
  const selection = record(value);
  if (!selection || !exactKeys(selection, ['sessionId', 'studyTarget', 'scenarioId', 'interfaceLang'])
    || typeof selection.sessionId !== 'string' || !SESSION_RE.test(selection.sessionId)
    || typeof selection.studyTarget !== 'string' || !STUDY_TARGETS.has(selection.studyTarget)
    || typeof selection.scenarioId !== 'string' || !SCENARIO_RE.test(selection.scenarioId)
    || typeof selection.interfaceLang !== 'string' || !INTERFACE_LANGUAGES.has(selection.interfaceLang)) return null;
  return Object.freeze({
    sessionId: selection.sessionId,
    studyTarget: selection.studyTarget as DialogueV2CompletionSelection['studyTarget'],
    scenarioId: selection.scenarioId,
    interfaceLang: selection.interfaceLang,
  });
}

function safeResult(value: unknown): DialogueV2CompletionResult | null {
  const response = record(value);
  const completion = record(response?.v2Completion);
  const memory = record(response?.v2Memory);
  if (!response || !exactKeys(response, ['ok', 'v2Completion', 'v2Memory', 'replayed'])
    || response.ok !== true || typeof response.replayed !== 'boolean'
    || !completion || !memory
    || !exactKeys(memory, ['sharedMemoryStored', 'scenarioCheckpointStored'])
    || memory.sharedMemoryStored !== true
    || typeof memory.scenarioCheckpointStored !== 'boolean') return null;
  const review = buildDialogueV2CompletionReview({
    feedback: completion.feedback,
    context: completion.context,
    objectiveLabels: completion.objectiveLabels,
    personaNames: completion.personaNames,
    userMessages: completion.userMessages,
    evidenceNote: completion.evidenceNote,
  });
  return review ? Object.freeze({
    review,
    memory: Object.freeze({
      sharedMemoryStored: true as const,
      scenarioCheckpointStored: memory.scenarioCheckpointStored,
    }),
    replayed: response.replayed,
  }) : null;
}

/** Только для лога: какие ключи пришли и какая проверка формы ответа не прошла (без текстов пользователя). */
function describeCompletionResponseShape(value: unknown): Record<string, unknown> {
  const response = record(value);
  if (!response) return { response: value === null ? 'null' : typeof value };
  const completion = record(response.v2Completion);
  const memory = record(response.v2Memory);
  return {
    keys: Object.keys(response).sort(),
    ok: response.ok,
    replayedType: typeof response.replayed,
    completionKeys: completion ? Object.keys(completion).sort() : null,
    memory: memory ? { keys: Object.keys(memory).sort(), shared: memory.sharedMemoryStored } : null,
    reviewBuilt: completion
      ? buildDialogueV2CompletionReview({
        feedback: completion.feedback,
        context: completion.context,
        objectiveLabels: completion.objectiveLabels,
        personaNames: completion.personaNames,
        userMessages: completion.userMessages,
        evidenceNote: completion.evidenceNote,
      }) !== null
      : null,
  };
}

export async function completeDialogueV2Session(
  input: DialogueV2CompletionSelection,
): Promise<DialogueV2CompletionResult | null> {
  const selection = safeSelection(input);
  if (!selection) {
    console.warn('[DIALOGUE-V2] completion:client invalid_selection', JSON.stringify({
      keys: input && typeof input === 'object' ? Object.keys(input).sort() : typeof input,
    }));
    return null;
  }
  // зачем (Сверка 05.10: «completion:run → failed reason=dialogue_v2_completion_unavailable ms=20054»): любая
  // ошибка сервера и любой «не тот» ответ превращались в одно и то же «недоступно» — настоящая причина терялась.
  // Печатаем код/текст/details отказа, длительность и, если ответ пришёл, — какую проверку формы он не прошёл.
  const startedAt = Date.now();
  try {
    const callable = httpsCallable<DialogueV2CompletionSelection, unknown>(
      getFunctions(getApp(), REGION),
      'dialogueV2SessionComplete',
    );
    const response = await callable(selection);
    const result = safeResult(response?.data);
    if (!result) {
      console.warn('[DIALOGUE-V2] completion:client bad_response', JSON.stringify({
        ms: Date.now() - startedAt,
        shape: describeCompletionResponseShape(response?.data),
      }));
      throw new DialogueV2CompletionUnavailableError();
    }
    console.log(`[DIALOGUE-V2] completion:client ok ms=${Date.now() - startedAt} replayed=${result.replayed}`);
    return result;
  } catch (error) {
    if (error instanceof DialogueV2CompletionUnavailableError) throw error;
    const failure = error as { code?: unknown; message?: unknown; details?: unknown };
    console.warn('[DIALOGUE-V2] completion:client call_failed', JSON.stringify({
      ms: Date.now() - startedAt,
      code: String(failure?.code ?? 'unknown'),
      message: String(failure?.message ?? error).slice(0, 200),
      details: failure?.details === undefined ? null : String(JSON.stringify(failure.details)).slice(0, 200),
      scenarioId: selection.scenarioId,
    }));
    throw new DialogueV2CompletionUnavailableError();
  }
}
