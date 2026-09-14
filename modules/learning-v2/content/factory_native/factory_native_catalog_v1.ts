import { learningV2CourseSessionIdV1 } from "../course_topology_v1";
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../generator_course_contract";
import { hashCanonicalBody } from "../../policies/decision_registry";
import { FACTORY_NATIVE_CATALOG_ROWS_V1 } from "./factory_native_catalog_v1.generated";

export const FACTORY_NATIVE_AUTHORED_LOCALES_V1 = Object.freeze([
  "ru",
  "uk",
] as const);
export const FACTORY_NATIVE_PROJECTION_VERSION_V1 =
  "learning-v2-factory-native-projection.v3" as const;

export function factoryNativeLearningV2NewWordCountV1(
  lessonOrdinal: number,
  sessionOrdinal: number,
): number | null {
  return FACTORY_NATIVE_CATALOG_ROWS_V1.find(
    (row) =>
      row.lessonOrdinal === lessonOrdinal &&
      row.sessionOrdinal === sessionOrdinal,
  )?.newWordCount ?? null;
}
export const FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1 = Object.freeze(
  Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      locale === "uk" ? "uk" : "ru",
    ]),
  ) as Readonly<Record<LearningV2InterfaceLocale, "ru" | "uk">>,
);

export function factoryNativeLearningV2AvailabilityV1() {
  return Object.freeze({
    targetLanguage: "en" as const,
    releaseSource: "content/learning-v2-course/release/en" as const,
    authoredLocales: FACTORY_NATIVE_AUTHORED_LOCALES_V1,
    displayLocaleFallback: FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1,
    sessionCount: FACTORY_NATIVE_CATALOG_ROWS_V1.length,
    sessions: Object.freeze(
      FACTORY_NATIVE_CATALOG_ROWS_V1.map((row) =>
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

export function factoryNativeLearningV2CourseIdentityV1() {
  const activeHeadFingerprint = hashCanonicalBody({
    schemaVersion: "learning-v2-factory-native-head.v1",
    projectionVersion: FACTORY_NATIVE_PROJECTION_VERSION_V1,
    sessions: FACTORY_NATIVE_CATALOG_ROWS_V1.map((row) => ({
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
) {
  if (!LEARNING_V2_INTERFACE_LOCALES.includes(interfaceLocale)) {
    throw new Error("learning_v2_factory_native_locale_invalid");
  }
  const authoredLocale =
    FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[interfaceLocale];
  const lessonOrdinals = [
    ...new Set(
      FACTORY_NATIVE_CATALOG_ROWS_V1.map((row) => row.lessonOrdinal),
    ),
  ];
  const lessons = lessonOrdinals.map((lessonOrdinal) => {
    const rows = FACTORY_NATIVE_CATALOG_ROWS_V1.filter(
      (row) => row.lessonOrdinal === lessonOrdinal,
    );
    const title = rows[0]!.lessonTitleByAuthoredLocale[authoredLocale];
    return Object.freeze({
      title,
      canDo: rows.at(-1)!.learningOutcomeByAuthoredLocale[authoredLocale],
      sessions: Object.freeze(
        rows.map((row) =>
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
  const identity = factoryNativeLearningV2CourseIdentityV1();
  return Object.freeze({
    lessons: Object.freeze(lessons),
    activeHeadFingerprint: identity.activeHeadFingerprint,
    activeRootFingerprint: identity.activeRootFingerprint,
  });
}
