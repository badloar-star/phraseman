import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { DIALOGUE_V2_CATALOGUE_INDEX, getDialogueV2CatalogueEntry } from '../shared/dialogue_v2_catalogue_index';
import { getDevDialogMemory } from './dev_dialog_state';
import { dialogueV2UiCopy } from './dialogue_v2_ui_copy';

const FUNCTIONS_REGION = 'us-central1';
const STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);

export type DialogueV2MemoryStudyTarget = 'en' | 'es' | 'fr' | 'de';

export type DialogueV2MemoryResumeSelection = Readonly<{
  studyTarget: DialogueV2MemoryStudyTarget;
  scenarioId: string;
}>;

export type DialogueV2MemorySummary = Readonly<{
  strengths: readonly string[];
  focusAreas: readonly string[];
  completedObjectives: number;
}>;

export type DialogueV2MemoryCheckpoint = Readonly<{
  nextObjectiveIndex: number;
  completedObjectiveIds: readonly string[];
  personaState: Readonly<Record<string, string>>;
}>;

export type DialogueV2MemoryResume = Readonly<{
  ok: true;
  sharedSummary: DialogueV2MemorySummary | null;
  scenarioCheckpoint: DialogueV2MemoryCheckpoint | null;
}>;

export type DialogueV2MemoryManagementSelection = Readonly<{
  studyTarget: DialogueV2MemoryStudyTarget;
}>;

export type DialogueV2MemoryManagedSummary = DialogueV2MemorySummary & Readonly<{
  scenarioId: string;
}>;

export type DialogueV2MemoryManagedCheckpoint = DialogueV2MemoryCheckpoint & Readonly<{
  scenarioId: string;
}>;

export type DialogueV2MemoryView = Readonly<{
  ok: true;
  studyTarget: DialogueV2MemoryStudyTarget;
  sharedSummary: DialogueV2MemoryManagedSummary | null;
  scenarioCheckpoints: readonly DialogueV2MemoryManagedCheckpoint[];
}>;

export type DialogueV2MemoryClearReceipt = Readonly<{
  ok: true;
  studyTarget: DialogueV2MemoryStudyTarget;
  cleared: true;
  deletedDocuments: number;
}>;

/** A deliberately non-diagnostic error: callable failures may contain account details. */
export class DialogueV2MemoryResumeError extends Error {
  constructor(message = 'memory_resume_unavailable') {
    super(message);
    this.name = 'DialogueV2MemoryResumeError';
  }
}

/** A deliberately non-diagnostic error: server authority details stay private. */
export class DialogueV2MemoryManagementError extends Error {
  constructor(message = 'memory_management_unavailable') {
    super(message);
    this.name = 'DialogueV2MemoryManagementError';
  }
}

type PlainRecord = Record<string, unknown>;

function plainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string')) return null;
    for (const descriptor of Object.values(descriptors)) {
      if (!descriptor.enumerable || !('value' in descriptor)) return null;
    }
    return value as PlainRecord;
  } catch {
    return null;
  }
}

function hasExactKeys(record: PlainRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(record);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function safeStringList(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > 12) {
    return null;
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0 || item.length > 64) return null;
    result.push(item);
  }
  return Object.freeze(result);
}

function safePersonaState(value: unknown): Readonly<Record<string, string>> | null {
  const record = plainRecord(value);
  if (!record || Object.keys(record).length > 6) return null;
  const result: Record<string, string> = {};
  for (const [personaId, state] of Object.entries(record)) {
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(personaId)
      || typeof state !== 'string'
      || state.length === 0
      || state.length > 64) return null;
    result[personaId] = state;
  }
  return Object.freeze(result);
}

function safeSummary(value: unknown): DialogueV2MemorySummary | null {
  if (value === null) return null;
  const record = plainRecord(value);
  if (!record || !hasExactKeys(record, ['strengths', 'focusAreas', 'completedObjectives'])) return null;
  const strengths = safeStringList(record.strengths);
  const focusAreas = safeStringList(record.focusAreas);
  if (!strengths || !focusAreas || !Number.isSafeInteger(record.completedObjectives)
    || (record.completedObjectives as number) < 0 || (record.completedObjectives as number) > 12) {
    return null;
  }
  return Object.freeze({
    strengths,
    focusAreas,
    completedObjectives: record.completedObjectives as number,
  });
}

function safeCheckpoint(value: unknown): DialogueV2MemoryCheckpoint | null {
  if (value === null) return null;
  const record = plainRecord(value);
  if (!record || !hasExactKeys(record, ['nextObjectiveIndex', 'completedObjectiveIds', 'personaState'])) {
    return null;
  }
  const completedObjectiveIds = safeStringList(record.completedObjectiveIds);
  const personaState = safePersonaState(record.personaState);
  if (!completedObjectiveIds || !personaState || !Number.isSafeInteger(record.nextObjectiveIndex)
    || (record.nextObjectiveIndex as number) < 0 || (record.nextObjectiveIndex as number) > 12) {
    return null;
  }
  return Object.freeze({
    nextObjectiveIndex: record.nextObjectiveIndex as number,
    completedObjectiveIds,
    personaState,
  });
}

function safeSelection(value: unknown): DialogueV2MemoryResumeSelection | null {
  const record = plainRecord(value);
  if (!record || !hasExactKeys(record, ['studyTarget', 'scenarioId'])
    || typeof record.studyTarget !== 'string'
    || !STUDY_TARGETS.has(record.studyTarget)
    || typeof record.scenarioId !== 'string'
    || !getDialogueV2CatalogueEntry(record.scenarioId)) return null;
  return Object.freeze({
    studyTarget: record.studyTarget as DialogueV2MemoryStudyTarget,
    scenarioId: record.scenarioId,
  });
}

function safeManagementSelection(value: unknown): DialogueV2MemoryManagementSelection | null {
  const record = plainRecord(value);
  if (!record
    || !hasExactKeys(record, ['studyTarget'])
    || typeof record.studyTarget !== 'string'
    || !STUDY_TARGETS.has(record.studyTarget)) return null;
  return Object.freeze({ studyTarget: record.studyTarget as DialogueV2MemoryStudyTarget });
}

function safeManagedSummary(value: unknown): DialogueV2MemoryManagedSummary | null {
  if (value === null) return null;
  const record = plainRecord(value);
  if (!record || !hasExactKeys(record, [
    'scenarioId', 'strengths', 'focusAreas', 'completedObjectives',
  ]) || typeof record.scenarioId !== 'string' || !getDialogueV2CatalogueEntry(record.scenarioId)) return null;
  const summary = safeSummary({
    strengths: record.strengths,
    focusAreas: record.focusAreas,
    completedObjectives: record.completedObjectives,
  });
  return summary ? Object.freeze({ scenarioId: record.scenarioId, ...summary }) : null;
}

function safeManagedCheckpoint(value: unknown): DialogueV2MemoryManagedCheckpoint | null {
  const record = plainRecord(value);
  if (!record || !hasExactKeys(record, [
    'scenarioId', 'nextObjectiveIndex', 'completedObjectiveIds', 'personaState',
  ]) || typeof record.scenarioId !== 'string' || !getDialogueV2CatalogueEntry(record.scenarioId)) return null;
  const checkpoint = safeCheckpoint({
    nextObjectiveIndex: record.nextObjectiveIndex,
    completedObjectiveIds: record.completedObjectiveIds,
    personaState: record.personaState,
  });
  return checkpoint ? Object.freeze({ scenarioId: record.scenarioId, ...checkpoint }) : null;
}

function safeManagedCheckpoints(value: unknown): readonly DialogueV2MemoryManagedCheckpoint[] | null {
  if (!Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > 76) return null;
  const result: DialogueV2MemoryManagedCheckpoint[] = [];
  const scenarioIds = new Set<string>();
  for (const item of value) {
    const checkpoint = safeManagedCheckpoint(item);
    if (!checkpoint || scenarioIds.has(checkpoint.scenarioId)) return null;
    scenarioIds.add(checkpoint.scenarioId);
    result.push(checkpoint);
  }
  return Object.freeze(result);
}

function safeViewResponse(
  value: unknown,
  expectedStudyTarget: DialogueV2MemoryStudyTarget,
): DialogueV2MemoryView | null {
  const record = plainRecord(value);
  if (!record || !hasExactKeys(record, [
    'ok', 'studyTarget', 'sharedSummary', 'scenarioCheckpoints',
  ]) || record.ok !== true || record.studyTarget !== expectedStudyTarget) return null;
  const sharedSummary = safeManagedSummary(record.sharedSummary);
  const scenarioCheckpoints = safeManagedCheckpoints(record.scenarioCheckpoints);
  if ((record.sharedSummary !== null && !sharedSummary) || !scenarioCheckpoints) return null;
  return Object.freeze({
    ok: true,
    studyTarget: expectedStudyTarget,
    sharedSummary,
    scenarioCheckpoints,
  });
}

function safeClearResponse(
  value: unknown,
  expectedStudyTarget: DialogueV2MemoryStudyTarget,
): DialogueV2MemoryClearReceipt | null {
  const record = plainRecord(value);
  if (!record || !hasExactKeys(record, [
    'ok', 'studyTarget', 'cleared', 'deletedDocuments',
  ]) || record.ok !== true
    || record.studyTarget !== expectedStudyTarget
    || record.cleared !== true
    || !Number.isSafeInteger(record.deletedDocuments)
    || (record.deletedDocuments as number) < 0
    || (record.deletedDocuments as number) > 77) return null;
  return Object.freeze({
    ok: true,
    studyTarget: expectedStudyTarget,
    cleared: true,
    deletedDocuments: record.deletedDocuments as number,
  });
}

function safeResponse(value: unknown): DialogueV2MemoryResume | null {
  const record = plainRecord(value);
  if (!record || !hasExactKeys(record, ['ok', 'sharedSummary', 'scenarioCheckpoint']) || record.ok !== true) {
    return null;
  }
  const sharedSummary = safeSummary(record.sharedSummary);
  const scenarioCheckpoint = safeCheckpoint(record.scenarioCheckpoint);
  if (record.sharedSummary !== null && !sharedSummary) return null;
  if (record.scenarioCheckpoint !== null && !scenarioCheckpoint) return null;
  return Object.freeze({ ok: true, sharedSummary, scenarioCheckpoint });
}

/**
 * Reads the server-owned, bounded V2 memory projection. It never persists or
 * transmits transcript/audio data, and rejects any callable envelope outside
 * the exact public response contract.
 */
export async function resumeDialogueV2Memory(
  selection: DialogueV2MemoryResumeSelection,
): Promise<DialogueV2MemoryResume | null> {
  const request = safeSelection(selection);
  if (!request) return null;

  try {
    const callable = httpsCallable<DialogueV2MemoryResumeSelection, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2MemoryResume',
    );
    const response = await callable(request);
    return safeResponse(response.data);
  } catch {
    throw new DialogueV2MemoryResumeError();
  }
}

/**
 * зачем (Макеты 12.10, съёмка R1 dialogs-gap-001/004/005/006): dev `dev_dialog_memory=` — память из памяти процесса, без сервера;
 * очистка не стирает настоящую память аккаунта. `cleared` — после «успешной» очистки в этом процессе.
 */
let devMemoryCleared = false;
function devObjectiveIds(scenarioId: string, count: number): string[] {
  const ids = Object.keys(dialogueV2UiCopy('en', scenarioId)?.objectiveLabels ?? {}).slice(0, count);
  if (ids.length < count) console.warn(`[DEV-STATE] dialogs: у сцены ${scenarioId} задач в справочнике ${ids.length} из ${count} нужных`); // guard-ok: dev-ветка
  return ids;
}
function devMemoryView(studyTarget: DialogueV2MemoryStudyTarget): DialogueV2MemoryView {
  const [first, second] = DIALOGUE_V2_CATALOGUE_INDEX;
  if (devMemoryCleared || !first || !second) return { ok: true, studyTarget, sharedSummary: null, scenarioCheckpoints: [] };
  return {
    ok: true,
    studyTarget,
    sharedSummary: { scenarioId: first.id, strengths: ['Вежливые просьбы', 'Заказ в кафе'], focusAreas: ['Прошедшее время'], completedObjectives: 7 },
    scenarioCheckpoints: [
      // зачем (пересъёмка Сверки 13.10, dialogs-gap-005/006): выдуманные 'greet'/'order' не находились в каталоге → «Сохранённая
      // задача»; берём настоящие номера задач этих сцен из справочника интерфейса.
      { scenarioId: first.id, nextObjectiveIndex: 2, completedObjectiveIds: devObjectiveIds(first.id, 2), personaState: {} },
      { scenarioId: second.id, nextObjectiveIndex: 1, completedObjectiveIds: devObjectiveIds(second.id, 1), personaState: {} },
    ],
  };
}

/** Reads the bounded Plus memory projection for exactly one language contour. */
export async function viewDialogueV2Memory(
  selection: DialogueV2MemoryManagementSelection,
): Promise<DialogueV2MemoryView | null> {
  const request = safeManagementSelection(selection);
  if (!request) return null;
  if (getDevDialogMemory()) {
    console.warn(`[DEV-STATE] dialogs: память из памяти процесса mode=${getDevDialogMemory()} cleared=${devMemoryCleared}`); // guard-ok: dev-ветка
    return devMemoryView(request.studyTarget);
  }
  try {
    const callable = httpsCallable<DialogueV2MemoryManagementSelection, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2MemoryView',
    );
    const response = await callable(request);
    return safeViewResponse(response.data, request.studyTarget);
  } catch {
    throw new DialogueV2MemoryManagementError();
  }
}

/** Clears the entire server-owned V2 memory branch for one language contour. */
export async function clearDialogueV2Memory(
  selection: DialogueV2MemoryManagementSelection,
): Promise<DialogueV2MemoryClearReceipt | null> {
  const request = safeManagementSelection(selection);
  if (!request) return null;
  const devMemory = getDevDialogMemory();
  if (devMemory) {
    console.warn(`[DEV-STATE] dialogs: очистка памяти подменена mode=${devMemory}`); // guard-ok: dev-ветка
    if (devMemory === 'clearing') return new Promise<DialogueV2MemoryClearReceipt | null>(() => undefined);
    if (devMemory === 'clear_fail') throw new DialogueV2MemoryManagementError();
    devMemoryCleared = true;
    return { ok: true, studyTarget: request.studyTarget, cleared: true, deletedDocuments: 3 };
  }
  try {
    const callable = httpsCallable<DialogueV2MemoryManagementSelection, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2MemoryClear',
    );
    const response = await callable(request);
    return safeClearResponse(response.data, request.studyTarget);
  } catch {
    throw new DialogueV2MemoryManagementError();
  }
}
