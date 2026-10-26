import { learningV2CourseSessionIdV1 } from "../course_topology_v1";
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../generator_course_contract";
import { hashCanonicalBody } from "../../policies/decision_registry";
import { FACTORY_NATIVE_CATALOG_ROWS_V1 } from "./factory_native_catalog_v1.generated";
import { FACTORY_NATIVE_CATALOG_ROWS_ES_V1 } from "./factory_native_catalog_es_v1.generated";
import { FACTORY_NATIVE_TASK_COUNTS_V1 } from "./factory_native_task_counts_v1.generated";

export type LearningV2FactoryNativeTargetLanguageV1 = "en" | "es";

function catalogRows(targetLanguage: LearningV2FactoryNativeTargetLanguageV1) {
  return targetLanguage === "es"
    ? FACTORY_NATIVE_CATALOG_ROWS_ES_V1
    : FACTORY_NATIVE_CATALOG_ROWS_V1;
}

export const FACTORY_NATIVE_AUTHORED_LOCALES_V1 = Object.freeze([
  "ru",
  "uk",
] as const);
export const FACTORY_NATIVE_PROJECTION_VERSION_V1 =
  "learning-v2-factory-native-projection.v3" as const;

export function factoryNativeLearningV2NewWordCountV1(
  lessonOrdinal: number,
  sessionOrdinal: number,
  targetLanguage: LearningV2FactoryNativeTargetLanguageV1 = "en",
): number | null {
  return catalogRows(targetLanguage).find(
    (row) =>
      row.lessonOrdinal === lessonOrdinal &&
      row.sessionOrdinal === sessionOrdinal,
  )?.newWordCount ?? null;
}
/**
 * Число заданий практики занятия (карточки слов не в счёт) — для окна эпизода, без загрузки JSON занятия.
 * зачем (3 · МАКЕТЫ 24.10, окно эпизода писало «0 заданий»): счёт сделан тем же сборщиком, что у плеера; если содержимое
 * занятия с тех пор поменялось (отпечаток не совпал с каталогом) — null, и подпись не рисуется, а не врёт.
 */
export function factoryNativeLearningV2TaskCountV1(
  lessonOrdinal: number,
  sessionOrdinal: number,
  targetLanguage: LearningV2FactoryNativeTargetLanguageV1 = "en",
): number | null {
  if (targetLanguage !== "en") return null;
  const entry = FACTORY_NATIVE_TASK_COUNTS_V1[`${lessonOrdinal}:${sessionOrdinal}`];
  if (!entry) return null;
  const row = FACTORY_NATIVE_CATALOG_ROWS_V1.find(
    (candidate) =>
      candidate.lessonOrdinal === lessonOrdinal &&
      candidate.sessionOrdinal === sessionOrdinal,
  );
  return row && row.sourceFingerprint.startsWith(entry[1]) ? entry[0] : null;
}
export const FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1 = Object.freeze(
  Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      locale === "uk" ? "uk" : "ru",
    ]),
  ) as Readonly<Record<LearningV2InterfaceLocale, "ru" | "uk">>,
);

export function factoryNativeLearningV2AvailabilityV1(
  targetLanguage: LearningV2FactoryNativeTargetLanguageV1 = "en",
) {
  const rows = catalogRows(targetLanguage);
  return Object.freeze({
    targetLanguage,
    releaseSource: `content/learning-v2-course/release/${targetLanguage}`,
    authoredLocales: FACTORY_NATIVE_AUTHORED_LOCALES_V1,
    displayLocaleFallback: FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1,
    sessionCount: rows.length,
    sessions: Object.freeze(
      rows.map((row) =>
        Object.freeze({
          lessonOrdinal: row.lessonOrdinal,
          sessionOrdinal: row.sessionOrdinal,
          courseSessionId: learningV2CourseSessionIdV1(
            row.lessonOrdinal,
            row.sessionOrdinal,
          ),
          sourceFingerprint: row.sourceFingerprint,
        }),
      ),
    ),
  });
}

export function factoryNativeLearningV2CourseIdentityV1(
  targetLanguage: LearningV2FactoryNativeTargetLanguageV1 = "en",
) {
  const rows = catalogRows(targetLanguage);
  const activeHeadFingerprint = hashCanonicalBody({
    schemaVersion: "learning-v2-factory-native-head.v1",
    projectionVersion: FACTORY_NATIVE_PROJECTION_VERSION_V1,
    targetLanguage,
    sessions: rows.map((row) => ({
      courseSessionId: learningV2CourseSessionIdV1(
        row.lessonOrdinal,
        row.sessionOrdinal,
      ),
      sourceFingerprint: row.sourceFingerprint,
    })),
  });
  return Object.freeze({
    activeHeadFingerprint,
    activeRootFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-factory-native-root.v1",
      activeHeadFingerprint,
    }),
  });
}

export function factoryNativeLearningV2CatalogSeedV1(
  interfaceLocale: LearningV2InterfaceLocale,
  targetLanguage: LearningV2FactoryNativeTargetLanguageV1 = "en",
) {
  if (!LEARNING_V2_INTERFACE_LOCALES.includes(interfaceLocale)) {
    throw new Error("learning_v2_factory_native_locale_invalid");
  }
  const authoredLocale =
    FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[interfaceLocale];
  const rows = catalogRows(targetLanguage);
  const lessonOrdinals = [
    ...new Set(
      rows.map((row) => row.lessonOrdinal),
    ),
  ];
  const lessons = lessonOrdinals.map((lessonOrdinal) => {
    const lessonRows = rows.filter(
      (row) => row.lessonOrdinal === lessonOrdinal,
    );
    const title = lessonRows[0]!.lessonTitleByAuthoredLocale[authoredLocale];
    return Object.freeze({
      title,
      canDo: lessonRows.at(-1)!.learningOutcomeByAuthoredLocale[authoredLocale],
      sessions: Object.freeze(
        lessonRows.map((row) =>
          Object.freeze({
            learningOutcome:
              row.learningOutcomeByAuthoredLocale[authoredLocale],
            packageFingerprint: hashCanonicalBody({
              schemaVersion: "learning-v2-factory-native-package-seed.v1",
              projectionVersion: FACTORY_NATIVE_PROJECTION_VERSION_V1,
              courseSessionId: learningV2CourseSessionIdV1(
                row.lessonOrdinal,
                row.sessionOrdinal,
              ),
              sourceFingerprint: row.sourceFingerprint,
            }),
          }),
        ),
      ),
    });
  });
  const identity = factoryNativeLearningV2CourseIdentityV1(targetLanguage);
  return Object.freeze({
    lessons: Object.freeze(lessons),
    activeHeadFingerprint: identity.activeHeadFingerprint,
    activeRootFingerprint: identity.activeRootFingerprint,
  });
}
