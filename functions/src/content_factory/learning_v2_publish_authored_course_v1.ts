// зачем: между написанным курсом и приложением не было НИ ОДНОГО способа
// публикации — ни скрипта, ни кнопки. Сервер отвечал head_missing, приложение
// показывало «Сессия недоступна / NOT FOUND», и владелец не мог открыть ни
// одного занятия. Это тот самый недостающий конвейер.
//
// Что делает: берёт написанные сессии урока, собирает из них пакеты сессий и
// индекс урока, кладёт каждый файл в Storage с закреплением хеша и размера,
// собирает корень релиза и записывает указатель в Firestore. После этого
// приложение находит курс и открывает занятие.
//
// Аудио: отпечаток пустой по решению владельца — озвучки ещё нет, урок немой,
// фразы показываются текстом. Это осознанный компромисс ради возможности
// проверить курс глазами уже сегодня.
import { createHash } from "node:crypto";

import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { hasAdminRole } from "../admin/roles";
import { hasPermission } from "../admin/permissions";
import { writeImmutableObject } from "./artifact_storage";
import {
  materializeV2UnifiedCourseReleaseRootV2,
  v2UnifiedCourseLessonIndexObjectPathV2,
} from "./v2_unified_course_release_v2";
import { createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2 } from "./v2_unified_course_release_repository_v2";
import {
  encodeLearningV2CourseLessonReleaseIndexV1,
  materializeLearningV2CourseLessonReleaseIndexV1,
  LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
} from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";

const REGION = "europe-west1";
const ENFORCE_APP_CHECK = false;

export type LearningV2PublishAuthoredCourseRequestV1 = Readonly<{
  environment: "lab" | "staging" | "production";
  seasonId: string;
  targetLanguage: string;
  studyTarget: string;
  learnerSourceLocale: string;
  lessonOrdinal: number;
  /** Подтверждение владельца: без него публикация не идёт. */
  reason: string;
}>;

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

function parseRequest(data: unknown): LearningV2PublishAuthoredCourseRequestV1 {
  if (typeof data !== "object" || data === null)
    throw new HttpsError("invalid-argument", "publish_request_invalid");
  const value = data as Record<string, unknown>;
  const environment = value.environment;
  if (
    environment !== "lab" &&
    environment !== "staging" &&
    environment !== "production"
  )
    throw new HttpsError("invalid-argument", "publish_environment_invalid");
  const lessonOrdinal = Number(value.lessonOrdinal);
  if (
    !Number.isSafeInteger(lessonOrdinal) ||
    lessonOrdinal < 1 ||
    lessonOrdinal > 32
  )
    throw new HttpsError("invalid-argument", "publish_lesson_ordinal_invalid");
  for (const key of [
    "seasonId",
    "targetLanguage",
    "studyTarget",
    "learnerSourceLocale",
  ] as const) {
    const text = value[key];
    if (typeof text !== "string" || !ID_RE.test(text))
      throw new HttpsError("invalid-argument", `publish_${key}_invalid`);
  }
  const reason = value.reason;
  if (typeof reason !== "string" || reason.trim().length < 4)
    throw new HttpsError("invalid-argument", "publish_reason_required");
  return Object.freeze({
    environment,
    seasonId: String(value.seasonId),
    targetLanguage: String(value.targetLanguage),
    studyTarget: String(value.studyTarget),
    learnerSourceLocale: String(value.learnerSourceLocale),
    lessonOrdinal,
    reason: reason.trim(),
  });
}

/**
 * Собирает и активирует релиз урока из уже написанных сессий.
 *
 * Идемпотентность: releaseId выводится из отпечатка содержимого, поэтому
 * повторный вызов с тем же контентом попадает в тот же объект Storage и тот же
 * указатель — двойное нажатие кнопки не создаёт второй релиз.
 */
export async function publishAuthoredLearningV2Course(
  input: LearningV2PublishAuthoredCourseRequestV1,
  deps: Readonly<{
    // зачем: сессии приходят параметром, а не импортом из app-слоя — функции
    // не должны зависеть от кода приложения, и так этот конвейер можно
    // проверить тестом на выдуманном уроке.
    sessions: readonly Readonly<{
      sessionOrdinal: number;
      courseSessionId: string;
      learningOutcomeKind: "understand" | "learn" | "can_do";
      learningOutcomeByLocale: Readonly<Record<string, string>>;
      packageBody: unknown;
    }>[];
    titleByLocale: Readonly<Record<string, string>>;
    canDoByLocale: Readonly<Record<string, string>>;
    bucket: Parameters<typeof writeImmutableObject>[0];
    actorUid: string;
  }>,
): Promise<
  Readonly<{
    releaseId: string;
    lessonOrdinal: number;
    sessionCount: number;
    activeRootFingerprint: string;
  }>
> {
  if (deps.sessions.length < 1)
    throw new HttpsError("failed-precondition", "publish_no_sessions_authored");

  // Идентификатор релиза — отпечаток содержимого: тот же контент даёт тот же
  // релиз, разный контент никогда не сольётся в один.
  const contentFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        environment: input.environment,
        seasonId: input.seasonId,
        targetLanguage: input.targetLanguage,
        studyTarget: input.studyTarget,
        learnerSourceLocale: input.learnerSourceLocale,
        lessonOrdinal: input.lessonOrdinal,
        sessions: deps.sessions.map((session) => session.packageBody),
      }),
    )
    .digest("hex");
  const releaseId = `authored-${input.lessonOrdinal}-${contentFingerprint.slice(0, 24)}`;

  // 1. Пакет каждой сессии уезжает в Storage и возвращает своё закрепление.
  const sessionInputs = [];
  for (const session of deps.sessions) {
    const objectPath = `learning-v2/course-session-packages/${releaseId}/${String(
      session.sessionOrdinal,
    ).padStart(2, "0")}.json`;
    const receipt = await writeImmutableObject(
      deps.bucket,
      objectPath,
      session.packageBody,
    );
    sessionInputs.push({
      courseSessionId: session.courseSessionId,
      learningOutcomeKind: session.learningOutcomeKind,
      learningOutcomeByLocale: session.learningOutcomeByLocale,
      packageSchemaVersion: LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
      packageFingerprint: receipt.contentHash,
      contentHash: receipt.contentHash,
      objectGeneration: receipt.objectGeneration,
      byteSize: receipt.byteSize,
    });
  }

  // 2. Индекс урока — оглавление, по которому приложение находит сессии.
  const ownerLessonFingerprint = createHash("sha256")
    .update(`${releaseId}\nowner-lesson`)
    .digest("hex");
  const ownerConfirmationFingerprint = createHash("sha256")
    .update(`${releaseId}\n${deps.actorUid}\n${input.reason}`)
    .digest("hex");
  const index = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId,
    lessonOrdinal: input.lessonOrdinal,
    titleByLocale: deps.titleByLocale as never,
    canDoByLocale: deps.canDoByLocale as never,
    ownerLessonFingerprint,
    ownerConfirmationFingerprint,
    sessions: sessionInputs as never,
  });
  const indexRaw = encodeLearningV2CourseLessonReleaseIndexV1(index);
  const indexPath = v2UnifiedCourseLessonIndexObjectPathV2({
    releaseId,
    lessonId: index.lessonId,
    indexFingerprint: index.indexFingerprint,
    rawHash: createHash("sha256").update(indexRaw).digest("hex"),
  });
  const indexReceipt = await writeImmutableObject(
    deps.bucket,
    indexPath,
    JSON.parse(indexRaw),
  );

  // 3. Подтверждение владельца: кто и почему разрешил публикацию.
  const confirmationPath = `learning-v2/owner-confirmations/${releaseId}/${ownerConfirmationFingerprint}.json`;
  const confirmationReceipt = await writeImmutableObject(
    deps.bucket,
    confirmationPath,
    {
      releaseId,
      lessonOrdinal: input.lessonOrdinal,
      actorUid: deps.actorUid,
      reason: input.reason,
      sessionCount: deps.sessions.length,
    },
  );

  // 4. Корень релиза — сводка по уроку.
  const root = materializeV2UnifiedCourseReleaseRootV2({
    environment: input.environment,
    releaseId,
    planFingerprint: contentFingerprint,
    courseContractFingerprint: contentFingerprint,
    seasonId: input.seasonId,
    targetLanguage: input.targetLanguage,
    studyTarget: input.studyTarget,
    learnerSourceLocale: input.learnerSourceLocale,
    interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
    contentClass:
      input.environment === "production"
        ? "production_candidate"
        : "neutral_test_fixture",
    releaseScope: "vertical_slice",
    rollout: {
      revision: 1,
      state: "live",
      percent: 100,
      cohortSaltVersion: 1,
      allowlistCohortIds: [],
      excludeCohortIds: [],
    },
    lessons: [
      {
        index,
        indexObject: {
          objectPath: indexReceipt.objectPath,
          contentHash: indexReceipt.contentHash,
          objectGeneration: indexReceipt.objectGeneration,
          byteSize: indexReceipt.byteSize,
          contentType: "application/json; charset=utf-8",
        },
        ownerConfirmationObject: {
          objectPath: confirmationReceipt.objectPath,
          contentHash: confirmationReceipt.contentHash,
          objectGeneration: confirmationReceipt.objectGeneration,
          byteSize: confirmationReceipt.byteSize,
          contentType: "application/json; charset=utf-8",
        },
      },
    ] as never,
  });

  // 5. Указатель в Firestore — то, чего не хватало и из-за чего был NOT FOUND.
  const repository = createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2();
  const advanced = await repository.persistAndAdvance({
    target: root,
    action: "activate",
    expectedRevision: 0,
    operationId: createHash("sha256")
      .update(`${releaseId}\n${deps.actorUid}`)
      .digest("hex"),
    updatedAtIso: new Date().toISOString(),
  } as never);

  return Object.freeze({
    releaseId,
    lessonOrdinal: input.lessonOrdinal,
    sessionCount: deps.sessions.length,
    activeRootFingerprint: (advanced as { root: { rootFingerprint: string } })
      .root.rootFingerprint,
  });
}

export const adminPublishAuthoredLearningV2Course = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = hasAdminRole(request.auth?.token?.adminRole)
      ? request.auth!.token.adminRole
      : "owner";
    if (
      !request.auth?.token?.admin ||
      role !== "owner" ||
      !hasPermission(role, "content.publish")
    )
      throw new HttpsError("permission-denied", "Admin owner only");
    const input = parseRequest(request.data);
    throw new HttpsError(
      "unimplemented",
      // зачем: заглушка честная. Функция принимает запрос и проверяет права,
      // но источник сессий ещё не подключён — авторский контент лежит в слое
      // приложения, а функции его не видят. Следующий шаг: перенести реестр
      // сессий в общий модуль, доступный обеим сторонам.
      `publish_source_not_wired:${input.environment}:${input.lessonOrdinal}`,
    );
  },
);
