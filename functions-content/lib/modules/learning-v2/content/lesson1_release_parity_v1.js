"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.releasedLesson1SessionSignatureV1 = releasedLesson1SessionSignatureV1;
exports.authoredLesson1SessionSignatureV1 = authoredLesson1SessionSignatureV1;
exports.lesson1ReleaseParityMismatchesV1 = lesson1ReleaseParityMismatchesV1;
/**
 * Паритет авторского урока 1 со встроенным релизом (решение координатора D150,
 * 2026-10-01).
 *
 * зачем: эталон урока 1 — встроенный в приложение релиз (factory_native): его
 * видят люди и он проверен. Авторский урок 1 (content/source) разошёлся с ним
 * (другие новые слова, другой профиль занятия). Публикация авторского курса en
 * поверх релиза подменила бы людям проверенный урок на непроверенный, поэтому
 * она блокируется, пока у урока 1 различаются набор новых слов ИЛИ профиль
 * занятия. Чистая функция — её вызывают и серверная публикация, и тесты.
 */
const factory_native_course_v1_1 = require("./factory_native/factory_native_course_v1");
const session_package_from_shard_v1_1 = require("./source/session_package_from_shard_v1");
const session_shard_from_source_v1_1 = require("./source/session_shard_from_source_v1");
const normalizeWords = (words) => Object.freeze([...new Set(words.map((word) => word.trim().toLowerCase()))].sort());
/** Сигнатура занятия встроенного релиза, null — если такого занятия в релизе нет. */
function releasedLesson1SessionSignatureV1(sessionOrdinal) {
    const material = (0, factory_native_course_v1_1.materializeFactoryNativeLearningV2SessionV1)({
        lessonOrdinal: 1,
        sessionOrdinal,
        interfaceLocale: "ru",
    });
    if (!material)
        return null;
    const words = Object.values(material.wordEncounterQueuesByInteractionId)
        .flatMap((queue) => queue.map((encounter) => String(encounter.save.targetText)));
    return Object.freeze({
        sessionOrdinal,
        newWords: normalizeWords(words),
        interactionProfile: String(material.learnerChild.interactionProfile),
    });
}
/** Сигнатура того же занятия в авторском конвейере. */
function authoredLesson1SessionSignatureV1(source) {
    const sessionOrdinal = source.requiredSessionOrdinal;
    const courseSessionId = `lesson-01:session:${String(sessionOrdinal).padStart(2, "0")}`;
    const children = (0, session_package_from_shard_v1_1.buildSessionChildBodiesFromShard)((0, session_shard_from_source_v1_1.buildSessionShardFromSource)(source), "ru", courseSessionId);
    return Object.freeze({
        sessionOrdinal,
        newWords: normalizeWords((source.newVocabulary ?? []).map((entry) => entry.target)),
        // зачем: дети пакета типизированы как unknown — читаем только профиль.
        interactionProfile: String(children.learner.interactionProfile),
    });
}
/** Все расхождения авторского урока 1 со встроенным релизом (пусто = паритет). */
function lesson1ReleaseParityMismatchesV1(authoredSessions) {
    const mismatches = [];
    for (const source of authoredSessions) {
        const authored = authoredLesson1SessionSignatureV1(source);
        const release = releasedLesson1SessionSignatureV1(authored.sessionOrdinal);
        if (!release) {
            mismatches.push(Object.freeze({
                sessionOrdinal: authored.sessionOrdinal,
                field: "missingInRelease",
                release: "",
                authored: authored.newWords.join(","),
            }));
            continue;
        }
        if (release.newWords.join(",") !== authored.newWords.join(","))
            mismatches.push(Object.freeze({
                sessionOrdinal: authored.sessionOrdinal,
                field: "newWords",
                release: release.newWords.join(","),
                authored: authored.newWords.join(","),
            }));
        if (release.interactionProfile !== authored.interactionProfile)
            mismatches.push(Object.freeze({
                sessionOrdinal: authored.sessionOrdinal,
                field: "interactionProfile",
                release: release.interactionProfile,
                authored: authored.interactionProfile,
            }));
    }
    return Object.freeze(mismatches);
}
//# sourceMappingURL=lesson1_release_parity_v1.js.map