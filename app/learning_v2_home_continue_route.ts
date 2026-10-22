// learning_v2_home_continue_route.ts — вход в занятие курса V2 из карточки «Продолжить» на Главной (Ревизор P23, координатор 15.10).
// зачем: маршруты V2 знает только сам V2 (сторож learning_v2_visibility_switch_contract), и любой новый вход стоит под рубильником
// «V2 скрыт»: при LEARNING_V2_HIDDEN карточка V2 не показывается вовсе и Главная остаётся на старом уроке.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { onAccountOwnerChanged } from './account_owner_change';
import { LEARNING_V2_HIDDEN, logLearningV2Hidden } from './learning_v2_visibility_switch';
import {
  learningV2SessionHrefV1,
  logLearningV2PrepareFailureV1,
  parseLearningV2ReleaseEnvironmentV1,
  prepareLearningV2SessionRunV1,
  stageLearningV2ReadyHandoffV1,
} from './learning_v2_session_launch_v1';

const LOG = '[HOME-CONTINUE]';

/** Можно ли показывать занятие V2 в карточке «Продолжить». */
export const HOME_CONTINUE_V2_ENABLED: boolean = !LEARNING_V2_HIDDEN;
if (LEARNING_V2_HIDDEN) logLearningV2Hidden('home_continue_card', 'home', 'hidden=v2_continue_card');

// зачем (Ревизор f2401f6f6, координатор 15.10, R09): раньше здесь был голый маршрут из метки — без sessionRunId и без передачи
// «готово», и в релизе плеер уходил на карту. Теперь тап готовит занятие ТЕМ ЖЕ путём, что вкладка «Уроки»
// (learning_v2_session_launch_v1): подготовка → передача → маршрут с sessionRunId. Отказ подготовки — карта курса, причина в журнале.
let launchInFlight = false;
// зачем (Ревизор по R09, 🟡): подготовка занятия идёт до 12 с — карточка должна показать «готовим», а не молчать. Состояние запуска
// публикуется подписчикам; вид занятости рисует карточка (зона Дизайна) по useHomeContinueV2Launching().
const launchListeners = new Set<() => void>();
function setLaunchInFlight(next: boolean): void {
  if (launchInFlight === next) return;
  launchInFlight = next;
  launchListeners.forEach((listener) => listener());
}
const subscribeLaunch = (listener: () => void) => { launchListeners.add(listener); return () => { launchListeners.delete(listener); }; };
const peekLaunch = () => launchInFlight;
/** true, пока занятие V2 из карточки «Продолжить» готовится к открытию. */
export function useHomeContinueV2Launching(): boolean {
  return useSyncExternalStore(subscribeLaunch, peekLaunch, peekLaunch);
}

export type HomeContinueV2LaunchContext = Readonly<{ lang: string; studyTarget: string; push: (href: unknown) => void }>;

export async function launchHomeContinueV2(route: Readonly<Record<string, string>>, ctx: HomeContinueV2LaunchContext): Promise<void> {
  // защита от двойного тапа: вторая подготовка того же занятия не нужна, второй переход — тем более
  if (launchInFlight) { console.log(`${LOG} launch: повторный тап во время подготовки — пропускаем`); return; }
  const lessonOrdinal = Number(route.lessonOrdinal);
  const sessionOrdinal = Number(route.sessionOrdinal);
  const sessionId = route.id;
  if (!sessionId || !Number.isInteger(lessonOrdinal) || !Number.isInteger(sessionOrdinal)) {
    console.warn(`${LOG} launch: метка без урока/занятия (${JSON.stringify(route)}) — открываем карту курса`);
    ctx.push('/learning-v2/course');
    return;
  }
  setLaunchInFlight(true);
  const startedAt = Date.now();
  const environment = parseLearningV2ReleaseEnvironmentV1(route.releaseEnvironment);
  const seasonId = route.releaseSeasonId || 'learning-v2';
  console.log(`${LOG} launch start session=${sessionId} target=${ctx.studyTarget} lang=${ctx.lang} env=${environment}`);
  try {
    const ready = await prepareLearningV2SessionRunV1(
      { environment, seasonId, studyTarget: ctx.studyTarget, learnerSourceLocale: ctx.lang, lessonOrdinal, sessionOrdinal },
      { devUnlockedDrafts: false },
    );
    stageLearningV2ReadyHandoffV1(ready.handle);
    console.log(`${LOG} launch ready session=${sessionId} run=${ready.sessionRunId} handle=${ready.handle ? 'есть' : 'нет'} ms=${Date.now() - startedAt}`);
    ctx.push(learningV2SessionHrefV1({
      sessionId,
      lessonOrdinal,
      sessionOrdinal,
      environment,
      seasonId,
      repeat: route.runKind === 'repeat',
      sessionRunId: ready.sessionRunId,
    }));
  } catch (error) {
    logLearningV2PrepareFailureV1('home_continue', sessionId, error);
    ctx.push('/learning-v2/course');
  } finally {
    setLaunchInFlight(false);
  }
}

/**
 * зачем (координатор 22.10, просьба 8 · МОМЕНТЫ): кнопка «Начать занятие» у друга знает только номера урока и занятия.
 * Открываем занятие ТЕМ ЖЕ путём, что «Продолжить» (подготовка → передача → маршрут, общая защита от двойного тапа).
 * Невыпущенное или неверное занятие — карта курса с причиной в журнале; V2 скрыт — ничего не открываем.
 */
export async function launchLearningV2SessionByOrdinalsV1(
  input: Readonly<{ lessonOrdinal: number; sessionOrdinal: number; from: string; repeat?: boolean }>,
  ctx: HomeContinueV2LaunchContext,
): Promise<void> {
  const { lessonOrdinal, sessionOrdinal, from } = input;
  if (LEARNING_V2_HIDDEN) {
    console.warn(`${LOG} by_ordinals from=${from} урок=${lessonOrdinal} занятие=${sessionOrdinal}: V2 скрыт — не открываем`);
    return;
  }
  let sessionId: string;
  let released: boolean;
  try {
    // зачем: модули курса грузятся лениво — экран друга не платит за каталог до нажатия
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { learningV2CourseSessionIdV1 } = require('../modules/learning-v2/content/course_topology_v1') as typeof import('../modules/learning-v2/content/course_topology_v1');
    const { isLearningV2SessionReleasedV1 } = require('./learning_v2_session_availability_v1') as typeof import('./learning_v2_session_availability_v1');
    /* eslint-enable @typescript-eslint/no-require-imports */
    sessionId = learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal);
    released = isLearningV2SessionReleasedV1(lessonOrdinal, sessionOrdinal);
  } catch (error) {
    console.warn(`${LOG} by_ordinals from=${from} урок=${lessonOrdinal} занятие=${sessionOrdinal}: неверные номера — открываем карту курса (${error instanceof Error ? error.message : String(error)})`);
    ctx.push('/learning-v2/course');
    return;
  }
  if (!released) {
    console.warn(`${LOG} by_ordinals from=${from} session=${sessionId}: занятие ещё не выпущено — открываем карту курса`);
    ctx.push('/learning-v2/course');
    return;
  }
  console.log(`${LOG} by_ordinals from=${from} session=${sessionId} — запускаем общим путём`);
  await launchHomeContinueV2({
    id: sessionId,
    lessonOrdinal: String(lessonOrdinal),
    sessionOrdinal: String(sessionOrdinal),
    releaseEnvironment: 'production',
    releaseSeasonId: 'learning-v2',
    // зачем: уже пройденное занятие открывается повтором (как с карты курса) — вызывающий знает это по своему прогрессу
    runKind: input.repeat ? 'repeat' : 'initial',
  }, ctx);
}

export function resetHomeContinueV2LaunchForTests(): void {
  setLaunchInFlight(false);
}

export type HomeContinueV2Progress = Readonly<{ lessonOrdinal: number; done: number; total: number }>;

// зачем (координатор 15.10, поправка 1 к P23): «пройдено / выпущено» НЕ хранится в метке — после прохождения занятия она показывала бы
// старое число. Считаем при показе Главной из локального прогресса курса (тот же склад, что у вкладки «Уроки»; ни одного запроса к
// Firestore). Память — для мгновенного кадра при возврате на Главную; смена аккаунта её чистит.
const progressMemory = new Map<number, HomeContinueV2Progress>();
onAccountOwnerChanged('home_continue_v2_progress', () => { progressMemory.clear(); });

export function peekHomeContinueV2Progress(lessonOrdinal: number): HomeContinueV2Progress | null {
  return progressMemory.get(lessonOrdinal) ?? null;
}

/** Выпущенные занятия урока и сколько из них пройдено — по тем же правилам, что карта курса. null — прочитать не удалось. */
export async function loadHomeContinueV2Progress(lessonOrdinal: number): Promise<HomeContinueV2Progress | null> {
  const startedAt = Date.now();
  try {
    // зачем: модули курса грузятся лениво — холодный старт Главной не платит за каталог, пока карточка не показывает V2
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { factoryNativeLearningV2AvailabilityV1 } = require('../modules/learning-v2/content/factory_native/factory_native_catalog_v1') as typeof import('../modules/learning-v2/content/factory_native/factory_native_catalog_v1');
    const { isLearningV2SessionReleasedV1 } = require('./learning_v2_session_availability_v1') as typeof import('./learning_v2_session_availability_v1');
    const { createLearningV2CourseLocalProgressStoreV1 } = require('../modules/learning-v2/progress/course_local_progress_v1') as typeof import('../modules/learning-v2/progress/course_local_progress_v1');
    const { deriveLocalOfflineProgressAccountScopeHash } = require('../modules/learning-v2/progress/progress_account_scope') as typeof import('../modules/learning-v2/progress/progress_account_scope');
    const { getStableId } = require('./stable_id') as typeof import('./stable_id');
    const { withAccountTransitionLock } = require('./account_generation') as typeof import('./account_generation');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const released = new Set(factoryNativeLearningV2AvailabilityV1().sessions
      .filter((s) => s.lessonOrdinal === lessonOrdinal && isLearningV2SessionReleasedV1(s.lessonOrdinal, s.sessionOrdinal))
      .map((s) => s.courseSessionId));
    const state = await withAccountTransitionLock(async () => {
      const scope = deriveLocalOfflineProgressAccountScopeHash(await getStableId());
      return createLearningV2CourseLocalProgressStoreV1(AsyncStorage).load(scope);
    });
    const done = state.completedSessionIds.filter((id) => released.has(id)).length;
    const progress: HomeContinueV2Progress = { lessonOrdinal, done, total: released.size };
    progressMemory.set(lessonOrdinal, progress);
    console.log(`${LOG} progress урок=${lessonOrdinal} пройдено=${done} выпущено=${released.size} источник=локальный прогресс курса ms=${Date.now() - startedAt}`);
    return progress;
  } catch (error) {
    console.warn(`${LOG} progress урок=${lessonOrdinal}: прочитать не удалось — показываем прошлое значение из памяти (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

/**
 * Прогресс урока для карточки: сразу из памяти, затем свежий с диска при каждом возврате на Главную (refreshKey = focusTick).
 * lessonOrdinal null — карточка не про V2, ничего не читаем.
 */
export function useHomeContinueV2Progress(lessonOrdinal: number | null, refreshKey: unknown, active: boolean): HomeContinueV2Progress | null {
  const [progress, setProgress] = useState<HomeContinueV2Progress | null>(() => (lessonOrdinal === null ? null : peekHomeContinueV2Progress(lessonOrdinal)));
  useEffect(() => {
    if (lessonOrdinal === null || !active) return undefined;
    let alive = true;
    const cached = peekHomeContinueV2Progress(lessonOrdinal);
    if (cached) setProgress((prev) => (prev && prev.lessonOrdinal === cached.lessonOrdinal && prev.done === cached.done && prev.total === cached.total ? prev : cached));
    void loadHomeContinueV2Progress(lessonOrdinal).then((loaded) => {
      if (!alive) return;
      // зачем: Главная ждёт числа, чтобы не показать карточку с «прыжком»; если склад не прочитался, а в памяти пусто —
      // карточка всё равно появляется (0 из 0), иначе человек остался бы без «Продолжить» вовсе (причина уже в журнале)
      const next = loaded ?? cached ?? { lessonOrdinal, done: 0, total: 0 };
      // зачем: тот же объект при тех же числах — Главная не перерисовывается на каждый возврат
      setProgress((prev) => (prev && prev.lessonOrdinal === next.lessonOrdinal && prev.done === next.done && prev.total === next.total ? prev : next));
    });
    return () => { alive = false; };
  }, [lessonOrdinal, refreshKey, active]);
  return lessonOrdinal !== null && progress?.lessonOrdinal === lessonOrdinal ? progress : null;
}

export function resetHomeContinueV2ProgressForTests(): void {
  progressMemory.clear();
}

export default function __RouteShim() { return null; }
