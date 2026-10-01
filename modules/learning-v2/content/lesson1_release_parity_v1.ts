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
import { materializeFactoryNativeLearningV2SessionV1 } from "./factory_native/factory_native_course_v1";
import { buildSessionChildBodiesFromShard } from "./source/session_package_from_shard_v1";
import {
  buildSessionShardFromSource,
  type SessionSource,
} from "./source/session_shard_from_source_v1";

export type Lesson1SessionSignatureV1 = Readonly<{
  sessionOrdinal: number;
  newWords: readonly string[];
  interactionProfile: string;
}>;

export type Lesson1ReleaseParityMismatchV1 = Readonly<{
  sessionOrdinal: number;
  field: "newWords" | "interactionProfile" | "missingInRelease";
  release: string;
  authored: string;
}>;

const normalizeWords = (words: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(words.map((word) => word.trim().toLowerCase()))].sort());

/** Сигнатура занятия встроенного релиза, null — если такого занятия в релизе нет. */
export function releasedLesson1SessionSignatureV1(sessionOrdinal: number): Lesson1SessionSignatureV1 | null {
  const material = materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: 1,
    sessionOrdinal,
    interfaceLocale: "ru",
  });
  if (!material) return null;
  const words = Object.values(material.wordEncounterQueuesByInteractionId)
    .flatMap((queue) => queue.map((encounter) => String(encounter.save.targetText)));
  return Object.freeze({
    sessionOrdinal,
    newWords: normalizeWords(words),
    interactionProfile: String(material.learnerChild.interactionProfile),
  });
}

/** Сигнатура того же занятия в авторском конвейере. */
export function authoredLesson1SessionSignatureV1(source: SessionSource): Lesson1SessionSignatureV1 {
  const sessionOrdinal = source.requiredSessionOrdinal;
  const courseSessionId = `lesson-01:session:${String(sessionOrdinal).padStart(2, "0")}`;
  const children = buildSessionChildBodiesFromShard(buildSessionShardFromSource(source), "ru", courseSessionId);
  return Object.freeze({
    sessionOrdinal,
    newWords: normalizeWords((source.newVocabulary ?? []).map((entry) => entry.target)),
    // зачем: дети пакета типизированы как unknown — читаем только профиль.
    interactionProfile: String((children.learner as { interactionProfile?: unknown }).interactionProfile),
  });
}

/** Все расхождения авторского урока 1 со встроенным релизом (пусто = паритет). */
export function lesson1ReleaseParityMismatchesV1(
  authoredSessions: readonly SessionSource[],
): readonly Lesson1ReleaseParityMismatchV1[] {
  const mismatches: Lesson1ReleaseParityMismatchV1[] = [];
  for (const source of authoredSessions) {
    const authored = authoredLesson1SessionSignatureV1(source);
    const release = releasedLesson1SessionSignatureV1(authored.sessionOrdinal);
    if (!release) {
      mismatches.push(Object.freeze({
        sessionOrdinal: authored.sessionOrdinal,
        field: "missingInRelease" as const,
        release: "",
        authored: authored.newWords.join(","),
      }));
      continue;
    }
    if (release.newWords.join(",") !== authored.newWords.join(","))
      mismatches.push(Object.freeze({
        sessionOrdinal: authored.sessionOrdinal,
        field: "newWords" as const,
        release: release.newWords.join(","),
        authored: authored.newWords.join(","),
      }));
    if (release.interactionProfile !== authored.interactionProfile)
      mismatches.push(Object.freeze({
        sessionOrdinal: authored.sessionOrdinal,
        field: "interactionProfile" as const,
        release: release.interactionProfile,
        authored: authored.interactionProfile,
      }));
  }
  return Object.freeze(mismatches);
}
