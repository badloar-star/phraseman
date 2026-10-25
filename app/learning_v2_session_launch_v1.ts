// ═══════════════════════════════════════════════════════════════════════════
// learning_v2_session_launch_v1.ts — ЕДИНЫЙ путь запуска занятия курса V2: подготовка материала → передача «готово» плееру →
// маршрут с sessionRunId.
//
// зачем (Ревизор f2401f6f6, координатор 15.10, R09): в релизе плеер берёт материал ТОЛЬКО из передачи «готово»
// (consumeLearningV2CourseSessionReadyHandoffV3 по courseSessionId + sessionRunId); самоподготовка есть лишь в dev-превью автора.
// Карточка «Продолжить» на Главной пушила маршрут без sessionRunId и без передачи — в релизе плеер уходил на карту
// («[V2-BRIDGE] bounce_to_map reason=learning_v2_session_ready_handoff_missing»), а в dev всё работало. Теперь и вкладка «Уроки»,
// и Главная запускают занятие этими функциями — копий подготовки нет.
// ═══════════════════════════════════════════════════════════════════════════
import * as Crypto from 'expo-crypto';
import { AppState, InteractionManager } from 'react-native';
import { onAccountOwnerChanged } from './account_owner_change';
import { DebugLogger } from './debug-logger';
import type { LearningV2CourseSessionReadyHandleV3 } from './learning_v2_course_released_session_client_v3';

const LOG = '[V2-LAUNCH]';

export type LearningV2SessionClientV3Module = typeof import('./learning_v2_course_released_session_client_v3');
let clientPromise: Promise<LearningV2SessionClientV3Module> | null = null;
// зачем: тайминг трассы и передача «готово» нужны синхронно — handle физически не может существовать до загрузки модуля
let clientLoaded: LearningV2SessionClientV3Module | null = null;

/** Ленивая загрузка клиента занятий V3 (одна на процесс). */
export function loadLearningV2SessionClientV3(): Promise<LearningV2SessionClientV3Module> {
  if (!clientPromise) {
    clientPromise = import('./learning_v2_course_released_session_client_v3')
      .then((mod) => {
        clientLoaded = mod;
        return mod;
      })
      .catch((error) => {
        // Немой catch запрещён: без этого модуля занятие не запустится.
        clientPromise = null;
        DebugLogger.error(
          'learning_v2:session_client_lazy_import',
          error instanceof Error ? error : new Error(String(error)),
          'warning',
        );
        throw error;
      });
  }
  return clientPromise;
}

/** Уже загруженный клиент (или null, если его ещё не грузили). */
export function peekLearningV2SessionClientV3(): LearningV2SessionClientV3Module | null {
  return clientLoaded;
}

/** Срок подготовки: сетевой вызов без срока однажды висел вечно (владелец 21.09) — по сроку отклоняем, следующая попытка заново. */
export const LEARNING_V2_PREPARE_TIMEOUT_MS = 12_000;

export type LearningV2ReleaseEnvironmentV1 = 'lab' | 'staging' | 'production';
/** Окружение из параметра маршрута/метки; неизвестное — production с записью в журнал. */
export function parseLearningV2ReleaseEnvironmentV1(raw: string | undefined): LearningV2ReleaseEnvironmentV1 {
  if (raw === 'lab' || raw === 'staging' || raw === 'production') return raw;
  console.warn(`${LOG} environment: неизвестное значение «${String(raw)}» — берём production`);
  return 'production';
}

export type LearningV2SessionLocatorV1 = Readonly<{
  environment: LearningV2ReleaseEnvironmentV1;
  seasonId: string;
  studyTarget: string;
  learnerSourceLocale: string;
  lessonOrdinal: number;
  sessionOrdinal: number;
}>;

export type LearningV2PreparedSessionRunV1 = Readonly<{
  sessionRunId: string;
  handle: LearningV2CourseSessionReadyHandleV3 | null;
}>;

/**
 * Подготовить материал занятия. devUnlockedDrafts — дев-превью черновиков (handle не нужен, плеер готовит сам только в __DEV__).
 * Отклоняется по сроку LEARNING_V2_PREPARE_TIMEOUT_MS или если клиент отказал (причина — в сообщении ошибки).
 */
export function prepareLearningV2SessionRunV1(
  locator: LearningV2SessionLocatorV1,
  options: Readonly<{ devUnlockedDrafts: boolean }>,
): Promise<LearningV2PreparedSessionRunV1> {
  if (options.devUnlockedDrafts) return Promise.resolve({ sessionRunId: Crypto.randomUUID(), handle: null });
  const sessionTag = `lesson-${locator.lessonOrdinal}:session:${locator.sessionOrdinal}`;
  const inflightKey = preparationKeyOf(locator);
  // зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10 «урок всегда должен быть готов… собран до того, как юзер его попробует начать»): заготовка,
  // собранная заранее (Главная, вход на «Обучение», финиш прошлого занятия), отдаётся тапу сразу и забирается — второй раз
  // её никто не получит (у каждого запуска свой sessionRunId).
  if (preparedSlot && preparedSlot.key === inflightKey) {
    const taken = preparedSlot;
    preparedSlot = null;
    console.log(`[V2-PREPARE] take_ready ${sessionTag} reason=${taken.reason} age_ms=${Date.now() - taken.readyAt}`); // guard-ok: одна строка на тап
    return Promise.resolve(taken.ready);
  }
  // зачем (жалобы 24.10 №5/№6, «занятие 3 главы 1 стабильно не готовится, проверь связь»): на медленном телефоне сборка не
  // укладывалась в срок, срок отклонял ожидание, а сама сборка шла дальше и её результат выбрасывался — следующий тап начинал
  // с нуля и снова не успевал. Теперь незаконченная подготовка того же занятия переиспользуется: повторный тап (или прогрев)
  // дожидается уже идущей работы, а не начинает новую.
  const running = inflightPreparations.get(inflightKey);
  const operation = running ?? startTrackedPreparation(locator, sessionTag, inflightKey);
  // Тап забрал результат этой подготовки — в запас (preparedSlot) он уже не попадёт.
  claimedByTap.add(operation);
  if (running) {
    console.warn(`${LOG} [R08-PREP] reuse_inflight ${sessionTag}`); // guard-ok: повторный тап ждёт идущую подготовку
    console.log(`[V2-PREPARE] tap_joins_running ${sessionTag}`); // guard-ok: тап раньше конца заготовки
  } else {
    console.log(`[V2-PREPARE] tap_cold ${sessionTag} slot=${preparedSlot ? preparedSlot.key : 'empty'}`); // guard-ok: заготовки не было
  }
  const timed = new Promise<LearningV2PreparedSessionRunV1>((_, reject) => {
    const timer = setTimeout(() => {
      console.warn(`${LOG} [R08-PREP] timeout ${sessionTag} ms=${LEARNING_V2_PREPARE_TIMEOUT_MS} — подготовка продолжается, повторный тап её подхватит`); // guard-ok: срок с причиной
      // зачем (владелец 25.10 «урок готов до тапа», сперва логи): на каком шаге стояла подготовка, когда истёк срок
      console.warn(`[V2-PREPARE] timeout ${sessionTag} step=${preparationSteps.get(inflightKey) ?? 'unknown'} reused=${running ? 'yes' : 'no'}`); // guard-ok: срок с причиной
      reject(new Error(`learning_v2_session_prepare_timeout: lesson-${locator.lessonOrdinal}:session:${locator.sessionOrdinal} ${LEARNING_V2_PREPARE_TIMEOUT_MS}ms`));
    }, LEARNING_V2_PREPARE_TIMEOUT_MS);
    void operation.then(() => clearTimeout(timer), () => clearTimeout(timer));
  });
  return Promise.race([operation, timed]);
}

const inflightPreparations = new Map<string, Promise<LearningV2PreparedSessionRunV1>>();
/** Подготовки, результат которых уже ждёт тап: в запас их не кладём (иначе один sessionRunId выдали бы дважды). */
const claimedByTap = new WeakSet<Promise<LearningV2PreparedSessionRunV1>>();

function preparationKeyOf(locator: LearningV2SessionLocatorV1): string {
  return JSON.stringify([locator.environment, locator.seasonId, locator.studyTarget, locator.learnerSourceLocale, locator.lessonOrdinal, locator.sessionOrdinal]);
}

function startTrackedPreparation(locator: LearningV2SessionLocatorV1, sessionTag: string, inflightKey: string): Promise<LearningV2PreparedSessionRunV1> {
  const operation = startPreparation(locator, sessionTag, inflightKey);
  inflightPreparations.set(inflightKey, operation);
  const clear = () => { if (inflightPreparations.get(inflightKey) === operation) inflightPreparations.delete(inflightKey); };
  operation.then(clear, clear);
  return operation;
}

// ── Заготовка «урок готов до тапа» (ЗАМОК ВЛАДЕЛЬЦА 25.10) ─────────────────────────────────────────────────────────────
// зачем: координатор 25.10 — «держать в памяти одну заготовку, не больше»: новая заготовка вытесняет прежнюю.
export type LearningV2PrewarmReasonV1 = 'home' | 'lessons_entry' | 'lessons_expand' | 'session_finish';
type PreparedSlotV1 = Readonly<{ key: string; ready: LearningV2PreparedSessionRunV1; reason: LearningV2PrewarmReasonV1; readyAt: number }>;
let preparedSlot: PreparedSlotV1 | null = null;
// зачем: заготовка привязана к языку интерфейса и ученику — смена аккаунта её сбрасывает, чужой запуск не достанется
onAccountOwnerChanged('learning_v2_prepared_slot', () => {
  if (preparedSlot) console.log(`[V2-PREPARE] slot_cleared reason=account_changed key=${preparedSlot.key}`); // guard-ok: сброс с причиной
  preparedSlot = null;
});

/** Есть ли готовая заготовка именно этого занятия (тап откроет его без ожидания). */
export function isLearningV2SessionReadyV1(locator: LearningV2SessionLocatorV1): boolean {
  return preparedSlot?.key === preparationKeyOf(locator);
}

/**
 * Собрать занятие заранее и положить в запас. Никогда не бросает: отказ пишется в журнал, тап соберёт занятие сам.
 * Вызывать вне первого кадра — scheduleLearningV2SessionPrewarmV1 делает это после interactions и паузы.
 */
export function prewarmLearningV2SessionRunV1(locator: LearningV2SessionLocatorV1, reason: LearningV2PrewarmReasonV1): Promise<void> {
  const sessionTag = `lesson-${locator.lessonOrdinal}:session:${locator.sessionOrdinal}`;
  const key = preparationKeyOf(locator);
  if (preparedSlot?.key === key) {
    console.log(`[V2-PREPARE] prewarm_skip ${sessionTag} reason=${reason} why=already_ready`); // guard-ok: ранний выход с причиной
    return Promise.resolve();
  }
  const running = inflightPreparations.get(key);
  const operation = running ?? startTrackedPreparation(locator, sessionTag, key);
  const startedAt = Date.now();
  console.log(`[V2-PREPARE] prewarm_start ${sessionTag} reason=${reason} joined=${running ? 'yes' : 'no'}`); // guard-ok: одна строка на заготовку
  return operation.then((ready) => {
    if (claimedByTap.has(operation)) {
      console.log(`[V2-PREPARE] prewarm_used_by_tap ${sessionTag} reason=${reason} ms=${Date.now() - startedAt}`); // guard-ok: тап успел раньше
      return;
    }
    if (preparedSlot && preparedSlot.key !== key) console.log(`[V2-PREPARE] slot_replaced old=${preparedSlot.key} new=${key}`); // guard-ok: одна заготовка
    preparedSlot = Object.freeze({ key, ready, reason, readyAt: Date.now() });
    console.log(`[V2-PREPARE] prewarm_ready ${sessionTag} reason=${reason} ms=${Date.now() - startedAt}`); // guard-ok: одна строка на заготовку
  }, (error: unknown) => {
    console.warn(`[V2-PREPARE] prewarm_failed ${sessionTag} reason=${reason} error=${error instanceof Error ? error.message : String(error)}`); // guard-ok: отказ с причиной, тап соберёт сам
  });
}

/** Пауза после interactions перед заготовкой — первый кадр и прокрутка экрана не делят поток со сборкой. */
export const LEARNING_V2_PREWARM_DELAY_MS = 1_500;

/**
 * Заготовка вне первого кадра: после InteractionManager.runAfterInteractions и паузы. Возвращает отмену (уход с экрана).
 */
export function scheduleLearningV2SessionPrewarmV1(
  locator: LearningV2SessionLocatorV1,
  reason: LearningV2PrewarmReasonV1,
  delayMs: number = LEARNING_V2_PREWARM_DELAY_MS,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  let appStateSub: { remove: () => void } | null = null;
  const sessionTag = `lesson-${locator.lessonOrdinal}:session:${locator.sessionOrdinal}`;
  const arm = () => {
    timer = setTimeout(() => {
      timer = null;
      // зачем (координатор 25.10): приложение ушло в фон до конца паузы — не собираем занятие в фоне (батарея, убийство
      // процесса системой); дожидаемся возврата и снова даём паузу, чтобы не попасть на первый кадр после возврата.
      if (AppState.currentState !== 'active') {
        console.log(`[V2-PREPARE] prewarm_deferred ${sessionTag} reason=${reason} app_state=${AppState.currentState}`); // guard-ok: ранний выход с причиной
        appStateSub?.remove();
        appStateSub = AppState.addEventListener('change', (next) => {
          if (next !== 'active' || cancelled) return;
          appStateSub?.remove();
          appStateSub = null;
          arm();
        });
        return;
      }
      void prewarmLearningV2SessionRunV1(locator, reason);
    }, delayMs);
  };
  const task = InteractionManager.runAfterInteractions(() => {
    if (cancelled) return;
    arm();
  });
  return () => {
    cancelled = true;
    task.cancel?.();
    if (timer) clearTimeout(timer);
    appStateSub?.remove();
    appStateSub = null;
  };
}

/** Следующее выпущенное занятие курса после (урок, занятие) — по каталогу и потолку выпуска. null — дальше ничего нет. */
export function nextLearningV2SessionOrdinalsV1(lessonOrdinal: number, sessionOrdinal: number): Readonly<{ lessonOrdinal: number; sessionOrdinal: number }> | null {
  try {
    // зачем: каталог курса грузится лениво — модуль запуска не тянет его на старт приложения
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { factoryNativeLearningV2AvailabilityV1 } = require('../modules/learning-v2/content/factory_native/factory_native_catalog_v1') as typeof import('../modules/learning-v2/content/factory_native/factory_native_catalog_v1');
    const { isLearningV2SessionReleasedV1 } = require('./learning_v2_session_availability_v1') as typeof import('./learning_v2_session_availability_v1');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const next = factoryNativeLearningV2AvailabilityV1().sessions
      .filter((s) => s.lessonOrdinal > lessonOrdinal || (s.lessonOrdinal === lessonOrdinal && s.sessionOrdinal > sessionOrdinal))
      .sort((a, b) => a.lessonOrdinal - b.lessonOrdinal || a.sessionOrdinal - b.sessionOrdinal)
      .find((s) => isLearningV2SessionReleasedV1(s.lessonOrdinal, s.sessionOrdinal));
    return next ? { lessonOrdinal: next.lessonOrdinal, sessionOrdinal: next.sessionOrdinal } : null;
  } catch (error) {
    console.warn(`[V2-PREPARE] next_unknown after=lesson-${lessonOrdinal}:session:${sessionOrdinal} error=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина
    return null;
  }
}

/** Финиш занятия: следующее занятие собирается сразу, пока человек смотрит итог (после анимаций и паузы). */
export function scheduleNextLearningV2SessionPrewarmV1(finished: LearningV2SessionLocatorV1): () => void {
  const next = nextLearningV2SessionOrdinalsV1(finished.lessonOrdinal, finished.sessionOrdinal);
  if (!next) {
    console.log(`[V2-PREPARE] prewarm_skip after=lesson-${finished.lessonOrdinal}:session:${finished.sessionOrdinal} reason=session_finish why=no_next_released`); // guard-ok: ранний выход с причиной
    return () => undefined;
  }
  return scheduleLearningV2SessionPrewarmV1({ ...finished, ...next }, 'session_finish');
}

export function __resetLearningV2PreparedSlotForTests(): void {
  preparedSlot = null;
  inflightPreparations.clear();
}

// зачем (владелец 25.10, сперва логи): шаг, на котором сейчас идущая подготовка, — чтобы срок 12 с назвал место, а не «долго»
const preparationSteps = new Map<string, 'yield' | 'import' | 'load' | 'done'>();
/** Подготовка дольше этого — одна critical-запись на процесс с разбивкой по шагам (данные с поля, без uid и текста). */
const LEARNING_V2_PREPARE_SLOW_REPORT_MS = 4_000;
let slowPrepareReported = false;

function startPreparation(locator: LearningV2SessionLocatorV1, sessionTag: string, inflightKey: string): Promise<LearningV2PreparedSessionRunV1> {
  const sessionRunId = Crypto.randomUUID();
  // зачем (R08 🔴, Advisor 15.10): import() клиента и сборка материала — цепочка микрозадач; без уступки кадра она стартовала раньше
  // таймеров и rAF и держала JS-поток секундами. Сначала отдаём кадр, затем грузим; время шагов — в [R08-PREP].
  const preparedAt = Date.now();
  // Разбивка для [V2-PREPARE]: yield = сколько JS-поток был занят до старта; import = модуль клиента; load = сборка материала
  // (бандл), хэши и дочерние тела — см. [V2-PREPARE] client/bundled и [V2-PREP] materialize.
  const steps = { yieldMs: -1, importMs: -1, loadMs: -1 };
  preparationSteps.set(inflightKey, 'yield');
  const clearStep = () => preparationSteps.delete(inflightKey);
  return new Promise<void>((resolve) => { setTimeout(resolve, 0); })
    .then(() => {
      const importAt = Date.now();
      steps.yieldMs = importAt - preparedAt;
      preparationSteps.set(inflightKey, 'import');
      return loadLearningV2SessionClientV3().then((mod) => {
        steps.importMs = Date.now() - importAt;
        console.log(`${LOG} [R08-PREP] import ${sessionTag} ms=${Date.now() - importAt} cached=${Date.now() - importAt < 5 ? 'yes' : 'no'}`);
        preparationSteps.set(inflightKey, 'load');
        return mod;
      });
    })
    .then((mod) =>
      mod.prepareCurrentLearningV2CourseSessionV3({
        locator: {
          environment: locator.environment,
          targetLanguage: locator.studyTarget,
          studyTarget: locator.studyTarget,
          learnerSourceLocale: locator.learnerSourceLocale,
          seasonId: locator.seasonId,
          lessonOrdinal: locator.lessonOrdinal,
          sessionOrdinal: locator.sessionOrdinal,
        },
        sessionRunId,
      }),
    )
    .then((handle) => {
      const totalMs = Date.now() - preparedAt;
      steps.loadMs = totalMs - steps.yieldMs - steps.importMs;
      preparationSteps.set(inflightKey, 'done');
      clearStep();
      console.log(`${LOG} [R08-PREP] prepare ${sessionTag} total_ms=${totalMs}`);
      const summary = { session: sessionTag, totalMs, ...steps };
      console.log(`[V2-PREPARE] done ${JSON.stringify(summary)}`); // guard-ok: одна строка на подготовку
      if (totalMs > LEARNING_V2_PREPARE_SLOW_REPORT_MS && !slowPrepareReported) {
        // зачем: с поля цифр нет (старые сборки молчали) — одна запись на процесс, чтобы не тратить записи Firestore
        slowPrepareReported = true;
        DebugLogger.error('learning_v2:prepare_slow', new Error(`[V2-PREPARE] ${JSON.stringify(summary)}`), 'critical');
      }
      return { sessionRunId, handle };
    }, (error: unknown) => {
      console.warn(`[V2-PREPARE] failed ${sessionTag} step=${preparationSteps.get(inflightKey) ?? 'unknown'} ms=${Date.now() - preparedAt} reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: отказ с шагом
      clearStep();
      throw error;
    });
}

/** Передать плееру «готово». Модуль уже загружен (handle выдал он) — синхронно; иначе догружаем и пишем причину. */
export function stageLearningV2ReadyHandoffV1(handle: LearningV2CourseSessionReadyHandleV3 | null): void {
  if (!handle) return;
  const client = clientLoaded;
  if (client) {
    client.stageLearningV2CourseSessionReadyHandoffV3(handle);
    return;
  }
  // Немой отказ запрещён: без передачи экран занятия в релизе уйдёт на карту.
  DebugLogger.error('learning_v2:ready_handoff_module_missing', new Error('handle есть, но модуль клиента сессии не загружен'), 'warning');
  void loadLearningV2SessionClientV3().then((mod) => mod.stageLearningV2CourseSessionReadyHandoffV3(handle));
}

export type LearningV2SessionRouteInputV1 = Readonly<{
  sessionId: string;
  lessonOrdinal: number;
  sessionOrdinal: number;
  environment: string;
  seasonId: string;
  repeat: boolean;
  sessionRunId: string;
  skipIntro?: boolean;
  devUnlockedDrafts?: boolean;
}>;

/** Маршрут экрана занятия — одинаковые параметры для всех входов. */
export function learningV2SessionHrefV1(input: LearningV2SessionRouteInputV1) {
  return {
    pathname: '/learning-v2/session/[id]',
    params: {
      id: input.sessionId,
      runtimeMode: 'direct_v1',
      previewMode: input.devUnlockedDrafts ? 'dev_unlocked_drafts_v1' : undefined,
      previewOrigin: 'course',
      lessonOrdinal: String(input.lessonOrdinal),
      sessionOrdinal: String(input.sessionOrdinal),
      releaseEnvironment: input.environment,
      releaseSeasonId: input.seasonId,
      runKind: input.repeat ? 'repeat' : 'initial',
      sessionRunId: input.sessionRunId,
      skipIntro: input.skipIntro ? '1' : undefined,
    },
  } as const;
}

/** Журнал отказа подготовки — общий для всех входов (D158: причина на каждом отказе). */
export function logLearningV2PrepareFailureV1(from: string, sessionId: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  console.warn(`${LOG} prepare_failed from=${from} session=${sessionId} reason=${reason}`);
  return reason;
}

export default function __RouteShim() { return null; }
