// learning_v2_home_continue_route.ts — вход в занятие курса V2 из карточки «Продолжить» на Главной (Ревизор P23, координатор 15.10).
// зачем: маршруты V2 знает только сам V2 (сторож learning_v2_visibility_switch_contract), и любой новый вход стоит под рубильником
// «V2 скрыт»: при LEARNING_V2_HIDDEN карточка V2 не показывается вовсе и Главная остаётся на старом уроке.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { onAccountOwnerChanged } from './account_owner_change';
import { LEARNING_V2_HIDDEN, logLearningV2Hidden } from './learning_v2_visibility_switch';
import { emitAppEvent } from './events';
import { beginLessonPrep, endLessonPrep, markLessonPrepFinishing } from './lesson_prep_store';
import { PREP_BUSY_SHOW_MS, PREP_FINISH_BEAT_MS } from '../components/lesson_prep/prep_cta_model';
import { prepHintToastFields } from '../components/lesson_prep/prep_cta_copy';
import {
  learningV2SessionHrefV1,
  logLearningV2PrepareFailureV1,
  parseLearningV2ReleaseEnvironmentV1,
  prepareLearningV2SessionRunV1,
  scheduleLearningV2SessionPrewarmV1,
  stageLearningV2ReadyHandoffV1,
} from './learning_v2_session_launch_v1';

/**
 * ЗАМОК ВЛАДЕЛЬЦА 25.10 «урок готов до тапа»: занятие из карточки «Продолжить» собирается заранее — после первого кадра
 * Главной (interactions + пауза, без касания потока прокрутки). Тап «Продолжить» забирает готовую заготовку.
 */
export function useHomeContinueV2Prewarm(
  route: Readonly<Record<string, string>> | null,
  lang: string,
  studyTarget: string,
  active: boolean,
): void {
  const lessonOrdinal = route ? Number(route.lessonOrdinal) : NaN;
  const sessionOrdinal = route ? Number(route.sessionOrdinal) : NaN;
  const environmentRaw = route?.releaseEnvironment;
  const seasonId = route?.releaseSeasonId || 'learning-v2';
  useEffect(() => {
    if (!active || !Number.isInteger(lessonOrdinal) || !Number.isInteger(sessionOrdinal)) {
      if (active && route) console.log(`${LOG} prewarm skip: метка без урока/занятия (${JSON.stringify(route)})`); // guard-ok: ранний выход с причиной
      return undefined;
    }
    return scheduleLearningV2SessionPrewarmV1({
      environment: parseLearningV2ReleaseEnvironmentV1(environmentRaw),
      seasonId,
      studyTarget,
      learnerSourceLocale: lang,
      lessonOrdinal,
      sessionOrdinal,
    }, 'home');
    // route целиком в зависимостях не нужен: заготовку определяют только примитивы ниже (новый объект метки на каждом рендере)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, environmentRaw, lang, lessonOrdinal, seasonId, sessionOrdinal, studyTarget]);
}

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

export type HomeContinueV2LaunchContext = Readonly<{
  lang: string;
  studyTarget: string;
  push: (href: unknown) => void;
  /**
   * зачем (живой макет lesson-preparing-live.html, владелец утвердил 25.10): запуск с кнопки «Продолжить» Главной — кнопка показывает ход («Готовим занятие…»),
   * а при отказе человек ОСТАЁТСЯ на Главной с подсказкой снизу (на карту курса не уводим). Остальные вызовы (кнопка друга и т. п.) — прежнее поведение.
   */
  homeCta?: boolean;
}>;

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
    // зачем (Ревизор 25.10): начало подготовки внутри try — любой бросок дальше закрывает «готовится» в catch, а не оставляет его висеть
    if (ctx.homeCta === true) beginLessonPrep('home', startedAt, sessionId);
    const ready = await prepareLearningV2SessionRunV1(
      { environment, seasonId, studyTarget: ctx.studyTarget, learnerSourceLocale: ctx.lang, lessonOrdinal, sessionOrdinal },
      { devUnlockedDrafts: false },
    );
    stageLearningV2ReadyHandoffV1(ready.handle);
    console.log(`${LOG} launch ready session=${sessionId} run=${ready.sessionRunId} handle=${ready.handle ? 'есть' : 'нет'} ms=${Date.now() - startedAt}`);
    if (ctx.homeCta === true) {
      // зачем (макет): готово — заливка дотягивается до конца, затем переход; если кнопка ничего не показывала (обычный случай, < 0,35 с) — переход сразу
      markLessonPrepFinishing();
      if (Date.now() - startedAt >= PREP_BUSY_SHOW_MS) await new Promise<void>((resolve) => setTimeout(resolve, PREP_FINISH_BEAT_MS));
    }
    ctx.push(learningV2SessionHrefV1({
      sessionId,
      lessonOrdinal,
      sessionOrdinal,
      environment,
      seasonId,
      repeat: route.runKind === 'repeat',
      sessionRunId: ready.sessionRunId,
    }));
    if (ctx.homeCta === true) endLessonPrep({ ok: true });
  } catch (error) {
    logLearningV2PrepareFailureV1('home_continue', sessionId, error);
    if (ctx.homeCta === true) {
      // зачем (макет, решение владельца): не успело за 12 с или отказ — кнопка возвращается, снизу подсказка, Главная на месте; на карту курса НЕ уводим.
      // Подготовка не бросается: следующий тап подхватывает ту же (reuse_inflight в prepareLearningV2SessionRunV1).
      const reason = error instanceof Error ? error.message : String(error);
      const timedOut = reason.startsWith('learning_v2_session_prepare_timeout');
      endLessonPrep({ ok: false, timedOut, reason: reason.slice(0, 160) });
      console.warn(`${LOG} launch stay_home session=${sessionId} reason=${reason.slice(0, 160)} hint=${timedOut ? 'still_preparing' : 'unavailable_now'} — карту курса не открываем`); // guard-ok: ветка и значение, которое её решило
      emitAppEvent('action_toast', { type: 'info', ...prepHintToastFields(timedOut ? 'timeout' : 'unavailable') });
    } else {
      ctx.push('/learning-v2/course');
    }
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
    const { factoryNativeLearningV2AvailabilityV1 } = require('../modules/learning-v2/content/factory_native/factory_native_catalog_v1') as typeof import('../modules/learning-v2/content/factory_native/factory_native_catalog_v1');
    const { isLearningV2SessionReleasedV1 } = require('./learning_v2_session_availability_v1') as typeof import('./learning_v2_session_availability_v1');
    /* eslint-enable @typescript-eslint/no-require-imports */
    sessionId = learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal);
    released = ctx.studyTarget === 'en' || ctx.studyTarget === 'es'
      ? factoryNativeLearningV2AvailabilityV1(ctx.studyTarget).sessions.some((session) => session.courseSessionId === sessionId)
      : isLearningV2SessionReleasedV1(lessonOrdinal, sessionOrdinal);
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
type HomeContinueV2ProgressTarget = 'en' | 'es';
const progressMemory = new Map<string, HomeContinueV2Progress>();
onAccountOwnerChanged('home_continue_v2_progress', () => { progressMemory.clear(); });

function progressMemoryKey(lessonOrdinal: number, targetLanguage: HomeContinueV2ProgressTarget): string {
  return `${targetLanguage}:${lessonOrdinal}`;
}

export function peekHomeContinueV2Progress(lessonOrdinal: number, targetLanguage: HomeContinueV2ProgressTarget = 'en'): HomeContinueV2Progress | null {
  return progressMemory.get(progressMemoryKey(lessonOrdinal, targetLanguage)) ?? null;
}

/** Выпущенные занятия урока и сколько из них пройдено — по тем же правилам, что карта курса. null — прочитать не удалось. */
export async function loadHomeContinueV2Progress(lessonOrdinal: number, targetLanguage: HomeContinueV2ProgressTarget = 'en'): Promise<HomeContinueV2Progress | null> {
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
    const released = new Set(factoryNativeLearningV2AvailabilityV1(targetLanguage).sessions
      .filter((s) => s.lessonOrdinal === lessonOrdinal && (targetLanguage === 'es' || isLearningV2SessionReleasedV1(s.lessonOrdinal, s.sessionOrdinal)))
      .map((s) => s.courseSessionId));
    const state = await withAccountTransitionLock(async () => {
      const scope = deriveLocalOfflineProgressAccountScopeHash(await getStableId());
      return createLearningV2CourseLocalProgressStoreV1(AsyncStorage, targetLanguage).load(scope);
    });
    const done = state.completedSessionIds.filter((id) => released.has(id)).length;
    const progress: HomeContinueV2Progress = { lessonOrdinal, done, total: released.size };
    progressMemory.set(progressMemoryKey(lessonOrdinal, targetLanguage), progress);
    console.log(`${LOG} progress target=${targetLanguage} урок=${lessonOrdinal} пройдено=${done} выпущено=${released.size} источник=локальный прогресс курса ms=${Date.now() - startedAt}`);
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
export function useHomeContinueV2Progress(lessonOrdinal: number | null, refreshKey: unknown, active: boolean, targetLanguage: HomeContinueV2ProgressTarget = 'en'): HomeContinueV2Progress | null {
  const [state, setState] = useState<Readonly<{ targetLanguage: HomeContinueV2ProgressTarget; progress: HomeContinueV2Progress | null }>>(
    () => ({ targetLanguage, progress: lessonOrdinal === null ? null : peekHomeContinueV2Progress(lessonOrdinal, targetLanguage) }),
  );
  useEffect(() => {
    if (lessonOrdinal === null || !active) return undefined;
    let alive = true;
    const cached = peekHomeContinueV2Progress(lessonOrdinal, targetLanguage);
    if (cached) setState((prev) => (prev.targetLanguage === targetLanguage && prev.progress && prev.progress.lessonOrdinal === cached.lessonOrdinal && prev.progress.done === cached.done && prev.progress.total === cached.total ? prev : { targetLanguage, progress: cached }));
    else setState((prev) => (prev.targetLanguage === targetLanguage && prev.progress === null ? prev : { targetLanguage, progress: null }));
    void loadHomeContinueV2Progress(lessonOrdinal, targetLanguage).then((loaded) => {
      if (!alive) return;
      // зачем: Главная ждёт числа, чтобы не показать карточку с «прыжком»; если склад не прочитался, а в памяти пусто —
      // карточка всё равно появляется (0 из 0), иначе человек остался бы без «Продолжить» вовсе (причина уже в журнале)
      const next = loaded ?? cached ?? { lessonOrdinal, done: 0, total: 0 };
      // зачем: тот же объект при тех же числах — Главная не перерисовывается на каждый возврат
      setState((prev) => (prev.targetLanguage === targetLanguage && prev.progress && prev.progress.lessonOrdinal === next.lessonOrdinal && prev.progress.done === next.done && prev.progress.total === next.total ? prev : { targetLanguage, progress: next }));
    });
    return () => { alive = false; };
  }, [lessonOrdinal, refreshKey, active, targetLanguage]);
  const progress = state.targetLanguage === targetLanguage ? state.progress : null;
  return lessonOrdinal !== null && progress?.lessonOrdinal === lessonOrdinal ? progress : null;
}

export function resetHomeContinueV2ProgressForTests(): void {
  progressMemory.clear();
}

export default function __RouteShim() { return null; }
