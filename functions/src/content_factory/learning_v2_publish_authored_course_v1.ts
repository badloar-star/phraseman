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
// зачем: путь пакета включает хеш содержимого, а он нужен ДО записи. Считать
// его надо ровно тем же сериализатором, каким пишет writeImmutableObject —
// иначе хеш в пути разойдётся с хешем записанного файла.
import { serializeArtifactPayload } from "./artifact_repository";
import {
  materializeV2UnifiedCourseReleaseRootV2,
  v2UnifiedCourseLessonIndexObjectPathV2,
} from "./v2_unified_course_release_v2";
import { createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2 } from "./v2_unified_course_release_repository_v2";
import {
  encodeLearningV2CourseLessonReleaseIndexV1,
  materializeLearningV2CourseLessonReleaseIndexV1,
  learningV2CourseSessionPackageObjectPathV1,
  LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
} from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  AUTHORED_EPISODE_01_SESSIONS,
  authoredLearningV2SessionShards,
} from "../../../modules/learning-v2/content/source/authored_sessions_v1";
import { buildSessionChildBodiesFromShard } from "../../../modules/learning-v2/content/source/session_package_from_shard_v1";
import { expandLocalized } from "../../../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildLearningV2CourseTopologyV1 } from "../../../modules/learning-v2/content/course_topology_v1";
import {
  LEARNING_V2_COURSE_SESSION_CHILD_KINDS_V1,
  LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1,
  learningV2CourseSessionChildObjectPathV1,
  materializeLearningV2CourseSessionReleasePackageV1,
  type LearningV2CourseSessionChildKindV1,
} from "../../../modules/learning-v2/runtime/course_session_release_package_v1";

// зачем: конвертер отдаёт детей под своими именами (evaluatorCapsule), а
// контракт знает их как виды (evaluator_capsule). Таблица связывает одно с
// другим явно — иначе пришлось бы угадывать преобразованием имён, и опечатка
// прошла бы молча.
const CHILD_BODY_KEY_BY_KIND: Readonly<
  Record<LearningV2CourseSessionChildKindV1, string>
> = Object.freeze({
  intro: "intro",
  learner: "learner",
  evaluator_capsule: "evaluatorCapsule",
  evaluator_sidecar: "evaluatorSidecar",
  auxiliary: "auxiliary",
});

// зачем: тот же регион, что у остальных функций Learning V2 и у админки —
// admin/v2/legacy.html поднимает getFunctions(app, 'us-central1'). В другом
// регионе кнопка искала бы функцию не там и получала «не найдено».
const REGION = "us-central1";
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
  // зачем: releaseId выводился только из содержимого сессий, но корень релиза
  // зависит ещё и от отпечатков загруженных объектов — а те меняются между
  // попытками (у каждой загрузки своя generation в Storage). Получалось: ключ
  // тот же, запись другая, хранилище честно отвечало release_id_reuse_conflict
  // и публикация не проходила НИКОГДА после первой неудачи.
  //
  // Добавляем отпечаток попытки. Идемпотентность при этом сохраняется там, где
  // она нужна: повторная публикация того же контента создаёт новый релиз, но
  // указатель просто переезжает на него, а старые объекты остаются нетронутыми.
  const attemptFingerprint = createHash("sha256")
    .update(`${contentFingerprint}\n${deps.actorUid}\n${input.reason}`)
    .digest("hex");
  const releaseId = `authored-${input.lessonOrdinal}-${attemptFingerprint.slice(0, 24)}`;

  // 1. Пакет каждой сессии уезжает в Storage и возвращает своё закрепление.
  //
  // зачем (инцидент 2026-08-17): раньше путь строился здесь вручную и плоско —
  // `<releaseId>/01.json`. Но индекс урока вычисляет путь САМ, канонической
  // функцией: `sha256(releaseId)/lesson-01/sessions/01/<отпечаток>/<хеш>.json`.
  // Пути расходились, файлы лежали не там, где их искал индекс, и приложение
  // получало «course_catalog_unavailable» при живом опубликованном релизе.
  // Теперь обе стороны зовут ОДНУ функцию — разойтись физически не могут.
  //
  // Хеш содержимого нужен ДО записи (он часть пути), поэтому считаем его здесь,
  // а после записи сверяем с тем, что вернуло хранилище: несовпадение означало
  // бы, что записалось не то, что мы посчитали.
  // зачем: оба отпечатка зависят только от releaseId, но нужны уже внутри
  // цикла — обёртка пакета их требует. Раньше объявлялись ниже, после цикла.
  const ownerLessonFingerprint = createHash("sha256")
    .update(`${releaseId}\nowner-lesson`)
    .digest("hex");
  const ownerConfirmationFingerprint = createHash("sha256")
    .update(`${releaseId}\n${deps.actorUid}\n${input.reason}`)
    .digest("hex");

  const sessionInputs = [];
  for (const session of deps.sessions) {
    // зачем (инцидент 2026-08-17): раньше сюда клался ЦЕЛИКОМ объект из пяти
    // детей — и чтение падало с learning_v2_course_session_release_package_invalid:
    // в пакете было 5 ключей вместо 40. Контракт требует не тела детей, а
    // ОБЁРТКУ из сорока полей, где каждый ребёнок — ссылка на отдельный файл
    // со своим хешем, размером и generation.
    //
    // Поэтому: сначала пишем пятерых детей по отдельности, собираем их
    // закрепления, потом строим обёртку каноническим строителем. Путь каждого
    // ребёнка тоже считает контракт — вручную его строить нельзя, разойдётся.
    const children = session.packageBody as Readonly<Record<string, unknown>>;
    const learnerBody = (children.learner ?? {}) as Readonly<{
      interactionProfile?: string;
      interactions?: readonly Readonly<{ interactionId: string }>[];
    }>;
    // зачем: контракт считает заданиями И три вопроса интро, И карточки
    // практики — introInteractionIds обязаны быть первыми тремя элементами
    // interactionIds. Раньше сюда шли только карточки, и пакет отвергался:
    // «practiceInteractionIds.length !== interactionIds.length - 3».
    const introBody = (children.intro ?? {}) as Readonly<{
      pages?: readonly Readonly<{
        question?: Readonly<{ interactionId?: string }>;
      }>[];
    }>;
    const introInteractionIds = (introBody.pages ?? [])
      .map((page) => page.question?.interactionId)
      .filter((id): id is string => typeof id === "string");
    const childInputs = [];
    for (const kind of LEARNING_V2_COURSE_SESSION_CHILD_KINDS_V1) {
      const body = children[CHILD_BODY_KEY_BY_KIND[kind]];
      if (body === undefined) {
        throw new HttpsError(
          "internal",
          `child_missing: сессия ${session.sessionOrdinal}, ребёнок ${kind}`,
        );
      }
      const childHash = createHash("sha256")
        .update(serializeArtifactPayload(body))
        .digest("hex");
      const childPath = learningV2CourseSessionChildObjectPathV1({
        releaseId,
        lessonOrdinal: input.lessonOrdinal,
        sessionOrdinal: session.sessionOrdinal,
        kind,
        artifactFingerprint: childHash,
        contentHash: childHash,
      });
      const childReceipt = await writeImmutableObject(
        deps.bucket,
        childPath,
        body,
        "application/json; charset=utf-8",
      );
      if (childReceipt.contentHash !== childHash) {
        throw new HttpsError(
          "internal",
          `child_hash_mismatch: сессия ${session.sessionOrdinal}, ребёнок ${kind}`,
        );
      }
      childInputs.push({
        kind,
        schemaVersion: LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1[kind],
        artifactFingerprint: childHash,
        contentHash: childReceipt.contentHash,
        objectGeneration: childReceipt.objectGeneration,
        byteSize: childReceipt.byteSize,
      });
    }

    const packageBody = materializeLearningV2CourseSessionReleasePackageV1({
      releaseId,
      lessonOrdinal: input.lessonOrdinal,
      sessionOrdinal: session.sessionOrdinal,
      ownerLessonFingerprint,
      ownerConfirmationFingerprint,
      learningOutcomeKind: session.learningOutcomeKind,
      learningOutcomeByLocale: session.learningOutcomeByLocale as never,
      // зачем: профиль и список заданий берём ИЗ ТЕЛА ребёнка-ученика, а не из
      // полей сессии — там их нет, и дублировать их в двух местах значило бы
      // однажды получить расхождение. Ученик — единственный источник правды о
      // том, какие задания в сессии на самом деле есть.
      interactionProfile: (learnerBody.interactionProfile ??
        "standard") as never,
      interactionIds: [
        ...introInteractionIds,
        ...(learnerBody.interactions ?? []).map((entry) => entry.interactionId),
      ],
      children: childInputs as never,
    });

    const contentHashAhead = createHash("sha256")
      .update(serializeArtifactPayload(packageBody))
      .digest("hex");
    // зачем: packageFingerprint и хеш ФАЙЛА — РАЗНЫЕ числа. Контракт считает
    // отпечаток как хеш тела пакета БЕЗ самого поля packageFingerprint
    // (hashCanonicalBody), а хеш файла берётся от всего записанного JSON.
    // Раньше я подставлял хеш файла в оба места, и чтение падало с
    // v2_course_released_session_package_join_mismatch: индекс хранил одно
    // число, пакет содержал другое. Отпечаток берём из самого пакета — он его
    // уже посчитал, второй раз считать негде ошибиться.
    const objectPath = learningV2CourseSessionPackageObjectPathV1({
      releaseId,
      lessonOrdinal: input.lessonOrdinal,
      sessionOrdinal: session.sessionOrdinal,
      packageFingerprint: packageBody.packageFingerprint,
      contentHash: contentHashAhead,
    });
    const receipt = await writeImmutableObject(
      deps.bucket,
      objectPath,
      packageBody,
      // зачем: закрепления релиза сверяют contentType и ждут charset.
      // Без него чтение каталога падает с metadata_mismatch (2026-08-17).
      "application/json; charset=utf-8",
    );
    // зачем: путь уже содержит предсчитанный хеш. Если хранилище посчитало
    // другой — значит записалось не то, что мы хешировали, и ссылка в индексе
    // будет вести в пустоту. Падаем громко здесь, а не молча позже: именно
    // молчаливое расхождение путей и дало «course_catalog_unavailable».
    if (receipt.contentHash !== contentHashAhead) {
      throw new HttpsError(
        "internal",
        `package_hash_mismatch: сессия ${session.sessionOrdinal}, ` +
          `ожидали ${contentHashAhead.slice(0, 12)}, получили ${receipt.contentHash.slice(0, 12)}`,
      );
    }
    sessionInputs.push({
      courseSessionId: session.courseSessionId,
      learningOutcomeKind: session.learningOutcomeKind,
      learningOutcomeByLocale: session.learningOutcomeByLocale,
      packageSchemaVersion: LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
      // Отпечаток пакета — из пакета, хеш файла — из хранилища. См. выше.
      packageFingerprint: packageBody.packageFingerprint,
      contentHash: receipt.contentHash,
      objectGeneration: receipt.objectGeneration,
      byteSize: receipt.byteSize,
    });
  }

  // 2. Индекс урока — оглавление, по которому приложение находит сессии.
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
    // зачем: корень релиза сверяет contentType индекса и ждёт charset. Без него
    // чтение каталога падало с metadata_mismatch — четыре поля из пяти совпадали,
    // а пятое рубило весь курс (2026-08-17).
    "application/json; charset=utf-8",
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
    // зачем: подтверждение владельца тоже закреплено в корне и сверяется по
    // contentType — тот же charset, что у индекса и пакетов (2026-08-17).
    "application/json; charset=utf-8",
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
  // зачем: указатель защищён номером версии — так две одновременные публикации
  // не затирают друг друга. Жёсткий ноль работал только для самой первой
  // публикации; после неё каждая следующая падала с head_conflict. Читаем
  // текущую версию и продолжаем с неё.
  let expectedRevision = 0;
  try {
    const active = await repository.readActive({
      environment: input.environment,
      seasonId: input.seasonId,
      targetLanguage: input.targetLanguage,
      studyTarget: input.studyTarget,
      learnerSourceLocale: input.learnerSourceLocale,
    } as never);
    expectedRevision = Number(
      (active as { head?: { operationRevision?: number } }).head
        ?.operationRevision ?? 0,
    );
  } catch {
    // Указателя ещё нет — это первая публикация, версия нулевая.
    expectedRevision = 0;
  }
  const advanced = await repository.persistAndAdvance({
    target: root,
    action: "activate",
    expectedRevision,
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
    // зачем: заглушка снята — источник подключён. Функции видят modules/ через
    // rootDir: ".." в своём tsconfig, поэтому реестр написанных сессий берётся
    // напрямую, без дублирования контента на две стороны.
    const shards = authoredLearningV2SessionShards();
    // зачем: шард нумерует сессии по-своему (session-episode-01-01), а индекс
    // релиза сверяет их с топологией курса (lesson-01:session:01) и отвергает
    // весь урок при расхождении. Источник правды для публикации — топология,
    // поэтому идентификатор берём оттуда, а не из шарда.
    const topologyLesson = buildLearningV2CourseTopologyV1().lessons[
      input.lessonOrdinal - 1
    ];
    if (!topologyLesson)
      throw new HttpsError("invalid-argument", "publish_lesson_not_in_topology");
    const sessions = shards.map((shard) => {
      const canonicalSessionId =
        topologyLesson.sessions[shard.requiredSessionOrdinal - 1]!.sessionId;
      // зачем canonicalSessionId идёт ВНУТРЬ конвертера, а не только в индекс:
      // клиент сверяет introChild.courseSessionId с ожидаемым id из топологии
      // (learning_v2_course_released_session_client_v3.ts) — расхождение
      // раньше отвергло бы КАЖДУЮ опубликованную сессию на этой проверке.
      const children = buildSessionChildBodiesFromShard(
        shard,
        input.learnerSourceLocale,
        canonicalSessionId,
      );
      return {
        sessionOrdinal: shard.requiredSessionOrdinal,
        courseSessionId: canonicalSessionId,
        // Первая сессия знакомит, дальше учит: это влияет на подпись в списке.
        learningOutcomeKind:
          shard.requiredSessionOrdinal === 1
            ? ("understand" as const)
            : ("learn" as const),
        learningOutcomeByLocale: shard.intro
          .learningGoalByLocale as unknown as Readonly<
          Record<string, string>
        >,
        packageBody: children,
      };
    });
    const first = AUTHORED_EPISODE_01_SESSIONS[0];
    if (!first)
      throw new HttpsError("failed-precondition", "publish_no_sessions_authored");
    // зачем: индекс урока требует все восемь локалей интерфейса, а автор пишет
    // три (ru, uk, es). Разворачиваем тем же способом, что и шард: недостающие
    // помечаются как непереведённые, а не подменяются русским молча. Без этого
    // публикация падала на проверке заголовка.
    // зачем: раньше любая внутренняя ошибка уходила клиенту как глухая 500, а
    // причина оставалась только в логах Google — владелец видел «не
    // опубликовано» без объяснений, и диагностика превращалась в угадайку.
    // Теперь причина возвращается на экран: публикация вызывается вручную
    // владельцем, тайны в имени сломавшейся проверки нет.
    try {
      const result = await publishAuthoredLearningV2Course(input, {
        sessions,
        titleByLocale: expandLocalized(first.title) as unknown as Readonly<
          Record<string, string>
        >,
        canDoByLocale: expandLocalized(first.summary) as unknown as Readonly<
          Record<string, string>
        >,
        bucket: admin.storage().bucket(),
        actorUid: request.auth.uid,
      });
      return { ok: true, ...result };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      const message =
        error instanceof Error ? error.message : String(error);
      const where =
        error instanceof Error && error.stack
          ? error.stack.split("\n").slice(1, 3).join(" | ")
          : "";
      throw new HttpsError(
        "internal",
        `publish_failed: ${message}${where ? ` @ ${where}` : ""}`,
      );
    }
  },
);
