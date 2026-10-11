"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1 = exports.FACTORY_NATIVE_PROJECTION_VERSION_V1 = exports.FACTORY_NATIVE_AUTHORED_LOCALES_V1 = void 0;
exports.factoryNativeLearningV2NewWordCountV1 = factoryNativeLearningV2NewWordCountV1;
exports.factoryNativeLearningV2AvailabilityV1 = factoryNativeLearningV2AvailabilityV1;
exports.factoryNativeLearningV2CourseIdentityV1 = factoryNativeLearningV2CourseIdentityV1;
exports.factoryNativeLearningV2CatalogSeedV1 = factoryNativeLearningV2CatalogSeedV1;
const course_topology_v1_1 = require("../course_topology_v1");
const generator_course_contract_1 = require("../generator_course_contract");
const decision_registry_1 = require("../../policies/decision_registry");
const factory_native_catalog_v1_generated_1 = require("./factory_native_catalog_v1.generated");
exports.FACTORY_NATIVE_AUTHORED_LOCALES_V1 = Object.freeze([
    "ru",
    "uk",
]);
exports.FACTORY_NATIVE_PROJECTION_VERSION_V1 = "learning-v2-factory-native-projection.v3";
function factoryNativeLearningV2NewWordCountV1(lessonOrdinal, sessionOrdinal) {
    return factory_native_catalog_v1_generated_1.FACTORY_NATIVE_CATALOG_ROWS_V1.find((row) => row.lessonOrdinal === lessonOrdinal &&
        row.sessionOrdinal === sessionOrdinal)?.newWordCount ?? null;
}
exports.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1 = Object.freeze(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
    locale,
    locale === "uk" ? "uk" : "ru",
])));
function factoryNativeLearningV2AvailabilityV1() {
    return Object.freeze({
        targetLanguage: "en",
        releaseSource: "content/learning-v2-course/release/en",
        authoredLocales: exports.FACTORY_NATIVE_AUTHORED_LOCALES_V1,
        displayLocaleFallback: exports.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1,
        sessionCount: factory_native_catalog_v1_generated_1.FACTORY_NATIVE_CATALOG_ROWS_V1.length,
        sessions: Object.freeze(factory_native_catalog_v1_generated_1.FACTORY_NATIVE_CATALOG_ROWS_V1.map((row) => Object.freeze({
            lessonOrdinal: row.lessonOrdinal,
            sessionOrdinal: row.sessionOrdinal,
            courseSessionId: (0, course_topology_v1_1.learningV2CourseSessionIdV1)(row.lessonOrdinal, row.sessionOrdinal),
            sourceFingerprint: row.sourceFingerprint,
        }))),
    });
}
function factoryNativeLearningV2CourseIdentityV1() {
    const activeHeadFingerprint = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-factory-native-head.v1",
        projectionVersion: exports.FACTORY_NATIVE_PROJECTION_VERSION_V1,
        sessions: factory_native_catalog_v1_generated_1.FACTORY_NATIVE_CATALOG_ROWS_V1.map((row) => ({
            courseSessionId: (0, course_topology_v1_1.learningV2CourseSessionIdV1)(row.lessonOrdinal, row.sessionOrdinal),
            sourceFingerprint: row.sourceFingerprint,
        })),
    });
    return Object.freeze({
        activeHeadFingerprint,
        activeRootFingerprint: (0, decision_registry_1.hashCanonicalBody)({
            schemaVersion: "learning-v2-factory-native-root.v1",
            activeHeadFingerprint,
        }),
    });
}
function factoryNativeLearningV2CatalogSeedV1(interfaceLocale) {
    if (!generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.includes(interfaceLocale)) {
        throw new Error("learning_v2_factory_native_locale_invalid");
    }
    const authoredLocale = exports.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[interfaceLocale];
    const lessonOrdinals = [
        ...new Set(factory_native_catalog_v1_generated_1.FACTORY_NATIVE_CATALOG_ROWS_V1.map((row) => row.lessonOrdinal)),
    ];
    const lessons = lessonOrdinals.map((lessonOrdinal) => {
        const rows = factory_native_catalog_v1_generated_1.FACTORY_NATIVE_CATALOG_ROWS_V1.filter((row) => row.lessonOrdinal === lessonOrdinal);
        const title = rows[0].lessonTitleByAuthoredLocale[authoredLocale];
        return Object.freeze({
            title,
            canDo: rows.at(-1).learningOutcomeByAuthoredLocale[authoredLocale],
            sessions: Object.freeze(rows.map((row) => Object.freeze({
                learningOutcome: row.learningOutcomeByAuthoredLocale[authoredLocale],
                packageFingerprint: (0, decision_registry_1.hashCanonicalBody)({
                    schemaVersion: "learning-v2-factory-native-package-seed.v1",
                    projectionVersion: exports.FACTORY_NATIVE_PROJECTION_VERSION_V1,
                    courseSessionId: (0, course_topology_v1_1.learningV2CourseSessionIdV1)(row.lessonOrdinal, row.sessionOrdinal),
                    sourceFingerprint: row.sourceFingerprint,
                }),
            }))),
        });
    });
    const identity = factoryNativeLearningV2CourseIdentityV1();
    return Object.freeze({
        lessons: Object.freeze(lessons),
        activeHeadFingerprint: identity.activeHeadFingerprint,
        activeRootFingerprint: identity.activeRootFingerprint,
    });
}
//# sourceMappingURL=factory_native_catalog_v1.js.map