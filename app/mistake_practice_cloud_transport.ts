import AsyncStorage from '@react-native-async-storage/async-storage';
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
const uploadConfirmedEventIds = new Map<string, ReadonlySet<string>>();

// зачем (координатор 13.10, смета Firebase №4): пауза жила только в памяти — каждый холодный старт заново листал облачный журнал
// по всем языкам (~300 серверных чтений в день при E = 50). На диске — отметка «восстановлено в T, в локальном журнале было N».
// Действует ТОЛЬКО на первое восстановление аккаунта+языка в запуске (дальше — прежняя пауза в памяти с поколением аккаунта)
// и только если локально событий не меньше N: стёртый журнал (смена аккаунта, сброс) всегда идёт на сервер.
const RESTORE_MARK_KEY_PREFIX = 'mistake_practice_restore_mark_v1';
const THROTTLE_LOG = '[ERROR-JOURNAL-THROTTLE]';
const diskMarkConsulted = new Set<string>();

type RestoreDiskMark = Readonly<{ atMs: number; localCount: number }>;

const restoreMarkKey = (accountScope: string, studyTarget: MistakeStudyTarget): string =>
  `${RESTORE_MARK_KEY_PREFIX}:${accountScope}:${studyTarget}`;

async function readRestoreDiskMark(accountScope: string, studyTarget: MistakeStudyTarget): Promise<RestoreDiskMark | null> {
  try {
    const raw = await AsyncStorage.getItem(restoreMarkKey(accountScope, studyTarget));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { atMs?: unknown; localCount?: unknown };
    if (typeof parsed.atMs !== 'number' || typeof parsed.localCount !== 'number') {
      console.warn(`${THROTTLE_LOG} target=${studyTarget} отметка на диске чужой формы — игнорируем`);
      return null;
    }
    return { atMs: parsed.atMs, localCount: parsed.localCount };
  } catch (error) {
    console.warn(`${THROTTLE_LOG} target=${studyTarget} отметка не прочиталась — идём на сервер`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function writeRestoreDiskMark(accountScope: string, studyTarget: MistakeStudyTarget, mark: RestoreDiskMark): Promise<void> {
  try {
    await AsyncStorage.setItem(restoreMarkKey(accountScope, studyTarget), JSON.stringify(mark));
  } catch (error) {
    console.warn(`${THROTTLE_LOG} target=${studyTarget} отметка не записалась — следующий холодный старт восстановит заново`, error instanceof Error ? error.message : String(error));
  }
}

const journalEventCount = (journal: unknown): number => {
  const events = (journal as { events?: unknown } | null | undefined)?.events;
  return Array.isArray(events) ? events.length : 0;
};

// зачем (координатор 13.10, смета Firebase №4, вторая половина): подтверждённые сервером id жили только в памяти — первая
// выгрузка КАЖДОГО холодного старта слала весь журнал языка, и сервер читал каждое событие в транзакции (≈ E чтений на старт).
// На диске — «какие id сервер уже принял» и когда была последняя ПОЛНАЯ выгрузка. Первая выгрузка в запуске шлёт только
// неподтверждённое; полная (лечит потерю на сервере) — не чаще раза в сутки. Диск читается только на первой выгрузке
// аккаунта+языка в запуске: смена аккаунта/поколения внутри запуска — по-прежнему полная.
const UPLOAD_MARK_KEY_PREFIX = 'mistake_practice_upload_mark_v1';
const FULL_UPLOAD_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const uploadDiskConsulted = new Set<string>();
const uploadFullAtMs = new Map<string, number>();

type UploadDiskMark = Readonly<{ fullAtMs: number; ids: readonly string[] }>;

const uploadMarkKey = (accountScope: string, studyTarget: MistakeStudyTarget): string =>
  `${UPLOAD_MARK_KEY_PREFIX}:${accountScope}:${studyTarget}`;

async function readUploadDiskMark(accountScope: string, studyTarget: MistakeStudyTarget): Promise<UploadDiskMark | null> {
  try {
    const raw = await AsyncStorage.getItem(uploadMarkKey(accountScope, studyTarget));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fullAtMs?: unknown; ids?: unknown };
    if (typeof parsed.fullAtMs !== 'number' || !Array.isArray(parsed.ids) || !parsed.ids.every((id) => typeof id === 'string')) {
      console.warn(`${THROTTLE_LOG} upload target=${studyTarget} отметка выгрузки чужой формы — полная выгрузка`);
      return null;
    }
    return { fullAtMs: parsed.fullAtMs, ids: parsed.ids as string[] };
  } catch (error) {
    console.warn(`${THROTTLE_LOG} upload target=${studyTarget} отметка выгрузки не прочиталась — полная выгрузка`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function writeUploadDiskMark(accountScope: string, studyTarget: MistakeStudyTarget, mark: UploadDiskMark): Promise<void> {
  try {
    await AsyncStorage.setItem(uploadMarkKey(accountScope, studyTarget), JSON.stringify(mark));
  } catch (error) {
    console.warn(`${THROTTLE_LOG} upload target=${studyTarget} отметка выгрузки не записалась — следующий старт выгрузит всё`, error instanceof Error ? error.message : String(error));
  }
}

/** Только для тестов. */
export function resetMistakePracticeRestoreThrottleForTests(): void {
  restoreSucceededAtMs.clear();
  restoreInFlight.clear();
  uploadConfirmedEventIds.clear();
  diskMarkConsulted.clear();
  uploadDiskConsulted.clear();
  uploadFullAtMs.clear();
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
  // зачем (§CORE-0162, аудит стоимости Firebase, пакет B): каждый синк пересылал ВЕСЬ журнал, сервер читал каждое
  // событие в транзакции (≈ E чтений на синк, 3–6 синков за сессию). Первая выгрузка в запуске — по-прежнему полная
  // (лечит потерю на сервере); дальше в пределах запуска уходят только события, которых сервер ещё не подтвердил,
  // — по id, не по времени, поэтому событие «задним числом» не пропадает. Смена аккаунта — новое поколение, полная.
  const uploadKey = `${generation.generation}|${input.accountScope}|${input.studyTarget}`;
  const now = (dependencies.nowMs ?? Date.now)();
  let confirmed = uploadConfirmedEventIds.get(uploadKey);
  const scopeKey = `${input.accountScope}|${input.studyTarget}`;
  if (!confirmed && !uploadDiskConsulted.has(scopeKey)) {
    uploadDiskConsulted.add(scopeKey); // guard-ok: Set в памяти процесса, не Firestore
    const mark = await readUploadDiskMark(input.accountScope, input.studyTarget);
    if (!isCurrentAccountGeneration(generation)) throw new Error('mistake_practice_cloud_owner_stale');
    const ageMs = mark ? now - mark.fullAtMs : null;
    if (!mark) {
      console.log(`${THROTTLE_LOG} upload target=${input.studyTarget} источник=нет отметки → полная`);
    } else if (ageMs === null || ageMs < 0 || ageMs >= FULL_UPLOAD_MIN_INTERVAL_MS) {
      console.log(`${THROTTLE_LOG} upload target=${input.studyTarget} источник=диск ageMs=${ageMs} ${ageMs !== null && ageMs < 0 ? '(часы назад)' : '(сутки прошли)'} → полная`);
    } else {
      confirmed = new Set(mark.ids);
      uploadConfirmedEventIds.set(uploadKey, confirmed); // guard-ok: Map в памяти процесса, не Firestore
      uploadFullAtMs.set(uploadKey, mark.fullAtMs); // guard-ok: Map в памяти процесса, не Firestore
      console.log(`${THROTTLE_LOG} upload target=${input.studyTarget} источник=диск подтверждено=${mark.ids.length} до полной ${FULL_UPLOAD_MIN_INTERVAL_MS - ageMs}мс`);
    }
  }
  const fullAtMs = confirmed ? uploadFullAtMs.get(uploadKey) ?? now : now;
  const events = [...journal.events]
    .filter((event) => !confirmed || !confirmed.has(event.eventId))
    .sort(eventOrder);
  if (confirmed && events.length === 0) {
    console.log(`[MISTAKE-SYNC] upload:nothing_new target=${input.studyTarget} confirmed=${confirmed.size}`);
    return 0;
  }
  const confirmedNow = new Set(confirmed ?? []);
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
    batch.forEach((event) => confirmedNow.add(event.eventId));
    // Подтверждённое запоминаем после каждой страницы: обрыв на середине не заставит пересылать уже принятое.
    uploadConfirmedEventIds.set(uploadKey, confirmedNow); // guard-ok: Map в памяти процесса, не Firestore
  }
  uploadFullAtMs.set(uploadKey, fullAtMs); // guard-ok: Map в памяти процесса, не Firestore
  // На диск — только id, что ещё есть в журнале: отметка не растёт быстрее самого журнала.
  const ids = journal.events.map((event) => event.eventId).filter((id) => confirmedNow.has(id));
  await writeUploadDiskMark(input.accountScope, input.studyTarget, { fullAtMs, ids });
  console.log(`${THROTTLE_LOG} upload target=${input.studyTarget} ушло=${uploaded} ${confirmed ? 'неполная' : 'полная'} подтверждено=${ids.length}`);
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
  const scopeKey = `${input.accountScope}|${input.studyTarget}`;
  const firstInLaunch = !diskMarkConsulted.has(scopeKey);
  diskMarkConsulted.add(scopeKey); // guard-ok: Set в памяти процесса, не Firestore
  const promise = (async (): Promise<number> => {
    if (firstInLaunch) {
      const mark = await readRestoreDiskMark(input.accountScope, input.studyTarget);
      const ageMs = mark ? now - mark.atMs : null;
      if (!mark) {
        console.log(`${THROTTLE_LOG} target=${input.studyTarget} источник=нет отметки → сервер`);
      } else if (ageMs === null || ageMs < 0 || ageMs >= RESTORE_MIN_INTERVAL_MS) {
        console.log(`${THROTTLE_LOG} target=${input.studyTarget} источник=диск ageMs=${ageMs} ${ageMs !== null && ageMs < 0 ? '(часы назад)' : '(протухла)'} → сервер`);
      } else {
        const localCount = journalEventCount(await loadMistakeEventJournal(input));
        if (!isCurrentAccountGeneration(generation)) throw new Error('mistake_practice_cloud_owner_stale');
        if (localCount >= mark.localCount) {
          restoreSucceededAtMs.set(key, mark.atMs); // guard-ok: Map в памяти процесса, не Firestore
          console.log(`${THROTTLE_LOG} target=${input.studyTarget} источник=диск пропуск: осталось ${RESTORE_MIN_INTERVAL_MS - ageMs}мс, локально ${localCount} ≥ ${mark.localCount}`);
          return 0;
        }
        console.log(`${THROTTLE_LOG} target=${input.studyTarget} источник=диск, но локально ${localCount} < ${mark.localCount} (журнал стёрт) → сервер`);
      }
    }
    const { appended, localCount } = await walkAndMergeRemoteEvents(input, dependencies, generation);
    restoreSucceededAtMs.set(key, now); // guard-ok: Map в памяти процесса, не Firestore
    await writeRestoreDiskMark(input.accountScope, input.studyTarget, { atMs: now, localCount });
    return appended;
  })().finally(() => {
    if (restoreInFlight.get(key) === promise) restoreInFlight.delete(key);
  });
  restoreInFlight.set(key, promise); // guard-ok: Map в памяти процесса, не Firestore
  return promise;
}

async function walkAndMergeRemoteEvents(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
}>, dependencies: MistakePracticeCloudTransportDependencies, generation: ReturnType<typeof captureAccountGeneration>): Promise<Readonly<{ appended: number; localCount: number }>> {
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
  return { appended: result.appendedCount, localCount: journalEventCount(result.journal) };
}
