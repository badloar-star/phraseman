import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import type { MistakeEvent, MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { loadMistakeEventJournal, mergeMistakeEvents } from './mistake_practice_store';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
} from './account_generation';

const PAGE_MAX = 50;

type AppendRequest = Readonly<{
  action: 'append';
  expectedStableUid: string;
  studyTarget: MistakeStudyTarget;
  events: readonly MistakeEvent[];
}>;
type ListRequest = Readonly<{
  action: 'list';
  expectedStableUid: string;
  studyTarget: MistakeStudyTarget;
  cursor: string | null;
}>;
type Response = Readonly<{
  ok: true;
  appended?: number;
  events?: readonly MistakeEvent[];
  cursor?: string | null;
}>;

export interface MistakePracticeCloudTransportDependencies {
  readonly invoke?: (request: AppendRequest | ListRequest) => Promise<Response>;
  readonly nowMs?: () => number;
}

// зачем (аудит стоимости Firebase 11.10): восстановление листает ВЕСЬ облачный журнал ошибок аккаунта для каждого
// из 5 языков (~E чтений на язык на сервере) и запускается не только на холодном старте, но и при каждом
// возвращении в приложение после 5 минут. Повтор того же аккаунта и языка раньше 6 часов в сеть не ходит.
// Ключ включает поколение аккаунта: выход/вход/смена аккаунта — всегда полное восстановление. Неудача не
// запоминается. Память живёт в пределах запуска: холодный старт восстанавливает как раньше.
const RESTORE_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const restoreSucceededAtMs = new Map<string, number>();
const restoreInFlight = new Map<string, Promise<number>>();

/** Только для тестов. */
export function resetMistakePracticeRestoreThrottleForTests(): void {
  restoreSucceededAtMs.clear();
  restoreInFlight.clear();
}

const invokeDefault = async (request: AppendRequest | ListRequest): Promise<Response> => {
  const fn = httpsCallable<AppendRequest | ListRequest, Response>(
    getFunctions(getApp(), 'us-central1'),
    'mistakePracticeSyncEvents',
  );
  return (await fn(request)).data;
};

const eventOrder = (left: MistakeEvent, right: MistakeEvent): number =>
  left.occurredAtMs - right.occurredAtMs || left.eventId.localeCompare(right.eventId);

export async function uploadMistakePracticeEvents(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
}>, dependencies: MistakePracticeCloudTransportDependencies = {}): Promise<number> {
  const invoke = dependencies.invoke ?? invokeDefault;
  const generation = captureAccountGeneration();
  if (generation.stableId !== input.accountScope || !isCurrentAccountGeneration(generation)) {
    throw new Error('mistake_practice_cloud_owner_stale');
  }
  const journal = await loadMistakeEventJournal(input);
  if (!isCurrentAccountGeneration(generation)) throw new Error('mistake_practice_cloud_owner_stale');
  const events = [...journal.events].sort(eventOrder);
  let uploaded = 0;
  for (let offset = 0; offset < events.length; offset += PAGE_MAX) {
    const batch = events.slice(offset, offset + PAGE_MAX);
    if (!isCurrentAccountGeneration(generation)) throw new Error('mistake_practice_cloud_owner_stale');
    const response = await invoke({
      action: 'append',
      expectedStableUid: input.accountScope,
      studyTarget: input.studyTarget,
      events: batch,
    });
    if (!isCurrentAccountGeneration(generation)) throw new Error('mistake_practice_cloud_owner_stale');
    if (response.ok !== true || response.appended !== batch.length) {
      throw new Error('mistake_practice_cloud_append_invalid');
    }
    uploaded += batch.length;
  }
  return uploaded;
}

export function restoreMistakePracticeEvents(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
}>, dependencies: MistakePracticeCloudTransportDependencies = {}): Promise<number> {
  const generation = captureAccountGeneration();
  if (generation.stableId !== input.accountScope || !isCurrentAccountGeneration(generation)) {
    return Promise.reject(new Error('mistake_practice_cloud_owner_stale'));
  }
  const now = (dependencies.nowMs ?? Date.now)();
  const key = `${generation.generation}|${input.accountScope}|${input.studyTarget}`;
  const succeededAt = restoreSucceededAtMs.get(key);
  if (succeededAt !== undefined && now - succeededAt < RESTORE_MIN_INTERVAL_MS) {
    console.log(`[MISTAKE-SYNC] restore:skipped recent target=${input.studyTarget} ageMs=${now - succeededAt}`);
    return Promise.resolve(0);
  }
  const running = restoreInFlight.get(key);
  if (running) {
    console.log(`[MISTAKE-SYNC] restore:joined_in_flight target=${input.studyTarget}`);
    return running;
  }
  const promise = walkAndMergeRemoteEvents(input, dependencies, generation).then((appended) => {
    restoreSucceededAtMs.set(key, now); // guard-ok: Map в памяти процесса, не Firestore
    return appended;
  }).finally(() => {
    if (restoreInFlight.get(key) === promise) restoreInFlight.delete(key);
  });
  restoreInFlight.set(key, promise); // guard-ok: Map в памяти процесса, не Firestore
  return promise;
}

async function walkAndMergeRemoteEvents(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
}>, dependencies: MistakePracticeCloudTransportDependencies, generation: ReturnType<typeof captureAccountGeneration>): Promise<number> {
  const invoke = dependencies.invoke ?? invokeDefault;
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  const remoteEvents: MistakeEvent[] = [];
  do {
    if (!isCurrentAccountGeneration(generation)) throw new Error('mistake_practice_cloud_owner_stale');
    const response = await invoke({
      action: 'list',
      expectedStableUid: input.accountScope,
      studyTarget: input.studyTarget,
      cursor,
    });
    if (!isCurrentAccountGeneration(generation)) throw new Error('mistake_practice_cloud_owner_stale');
    if (response.ok !== true || !Array.isArray(response.events) || response.events.length > PAGE_MAX) {
      throw new Error('mistake_practice_cloud_list_invalid');
    }
    remoteEvents.push(...response.events);
    if (response.cursor !== undefined && response.cursor !== null &&
      (typeof response.cursor !== 'string' || !/^mp_[a-f0-9]{64}$/.test(response.cursor))) {
      throw new Error('mistake_practice_cloud_cursor_invalid');
    }
    const nextCursor = typeof response.cursor === 'string' ? response.cursor : null;
    if (nextCursor && seenCursors.has(nextCursor)) {
      throw new Error('mistake_practice_cloud_cursor_repeated');
    }
    if (nextCursor) seenCursors.add(nextCursor);
    cursor = nextCursor;
  } while (cursor);
  if (!isCurrentAccountGeneration(generation)) throw new Error('mistake_practice_cloud_owner_stale');
  const result = await mergeMistakeEvents({ ...input, events: remoteEvents });
  if (!isCurrentAccountGeneration(generation)) throw new Error('mistake_practice_cloud_owner_stale');
  return result.appendedCount;
}
