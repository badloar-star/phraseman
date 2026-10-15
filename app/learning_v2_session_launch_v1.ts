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
  const sessionRunId = Crypto.randomUUID();
  if (options.devUnlockedDrafts) return Promise.resolve({ sessionRunId, handle: null });
  const operation = loadLearningV2SessionClientV3()
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
    .then((handle) => ({ sessionRunId, handle }));
  const timed = new Promise<LearningV2PreparedSessionRunV1>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`learning_v2_session_prepare_timeout: lesson-${locator.lessonOrdinal}:session:${locator.sessionOrdinal} ${LEARNING_V2_PREPARE_TIMEOUT_MS}ms`));
    }, LEARNING_V2_PREPARE_TIMEOUT_MS);
    void operation.then(() => clearTimeout(timer), () => clearTimeout(timer));
  });
  return Promise.race([operation, timed]);
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
