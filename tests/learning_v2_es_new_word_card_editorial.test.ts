// зачем: session_package_from_shard_v1.ts получил новую ветку (владелец,
// HANDOVER_ES.md, 2026-08-24) — для targetLanguage 'es' карточка нового
// слова резолвится через отдельный испанский редакторский реестр, а не через
// английский. Без теста регрессия здесь молчала бы: build проходил бы даже
// если испанская ветка случайно перестала находить свои записи и упала бы
// обратно на английский реестр (который бросил бы
// learning_v2_new_word_card_editorial_missing на испанском lexicalItemId).
import { ES_EPISODE_01_SESSION_01_SOURCE } from "../modules/learning-v2/content/source/es_episode_01_session_01_v1";
import { EPISODE_01_SESSION_01_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_01_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import { esLearningV2NewWordCardEditorialV1 } from "../modules/learning-v2/content/source/es_learning_v2_new_word_card_editorial_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import type {
  LearningV2CourseSessionAuxiliaryChildV1,
  LearningV2CourseSessionNewWordEncounterV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import type { SessionSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";

function newWordEncounters(
  source: SessionSource,
  courseSessionId: string,
): readonly LearningV2CourseSessionNewWordEncounterV1[] {
  const shard = buildSessionShardFromSource(source);
  const children = buildSessionChildBodiesFromShard(shard, "ru", courseSessionId) as Readonly<{
    auxiliary: LearningV2CourseSessionAuxiliaryChildV1;
  }>;
  return children.auxiliary.entries
    .map((entry) => entry.newWordEncounter)
    .filter((entry): entry is LearningV2CourseSessionNewWordEncounterV1 => Boolean(entry));
}

describe("Spanish new-word encounter editorial resolution", () => {
  it("resolves all four Spanish word-first encounters with distinct playful text", () => {
    const encounters = newWordEncounters(ES_EPISODE_01_SESSION_01_SOURCE, "lesson-01-es:session:01");

    expect(encounters).toHaveLength(4);
    expect(encounters.map((e) => e.lexicalItemId)).toEqual([
      "es-e01-s01-word-es",
      "es-e01-s01-word-soy",
      "es-e01-s01-word-facil",
      "es-e01-s01-word-verdad",
    ]);
    // зачем уникальность: одинаковая шутка на два слова — признак того, что
    // текст скопирован вместо написанного заново (owner rule, СТАРТ ES раздел 7).
    const playfulRu = encounters.map((e) => e.playfulMeaningByLocale.ru);
    expect(new Set(playfulRu).size).toBe(playfulRu.length);
  });

  // зачем: первая карточка первого урока обязана быть 'lesson_hero_b', а не
  // 'premium_a' (owner rule, HANDOVER_ES.md) — самый частый регрессионный
  // класс ошибки здесь — случайно применить один motion ко всем карточкам.
  it("uses lesson_hero_b only for the very first encounter of session 1", () => {
    const encounters = newWordEncounters(ES_EPISODE_01_SESSION_01_SOURCE, "lesson-01-es:session:01");

    expect(encounters[0]?.motionVariant).toBe("lesson_hero_b");
    expect(encounters.slice(1).every((e) => e.motionVariant === "premium_a")).toBe(true);
  });

  it("carries the exact-word audio contract every encounter needs", () => {
    const encounters = newWordEncounters(ES_EPISODE_01_SESSION_01_SOURCE, "lesson-01-es:session:01");

    for (const encounter of encounters) {
      expect(encounter.presentation).toBe("blocking_task_overlay");
      expect(encounter.dismissal).toBe("continue_only");
      expect(encounter.saveControl).toBe("bookmark_icon");
      expect(encounter.save.targetText.trim().length).toBeGreaterThan(0);
      expect(/\s/u.test(encounter.save.targetText.trim())).toBe(false);
    }
  });

  it("has all nine interface locales for every playful string, 'es' included", () => {
    for (const entry of [
      esLearningV2NewWordCardEditorialV1({
        targetLanguage: "es",
        lexicalItemId: "es-e01-s01-word-es",
        targetText: "es",
      }),
      esLearningV2NewWordCardEditorialV1({
        targetLanguage: "es",
        lexicalItemId: "es-e01-s01-word-soy",
        targetText: "soy",
      }),
      esLearningV2NewWordCardEditorialV1({
        targetLanguage: "es",
        lexicalItemId: "es-e01-s01-word-facil",
        targetText: "fácil",
      }),
      esLearningV2NewWordCardEditorialV1({
        targetLanguage: "es",
        lexicalItemId: "es-e01-s01-word-verdad",
        targetText: "verdad",
      }),
    ]) {
      expect(entry).toBeTruthy();
      expect(Object.keys(entry!.playfulMeaningByLocale).sort()).toEqual(
        [...LEARNING_V2_INTERFACE_LOCALES].sort(),
      );
    }
  });

  it("returns undefined for an unknown Spanish lexical item instead of throwing", () => {
    const result = esLearningV2NewWordCardEditorialV1({
      targetLanguage: "es",
      lexicalItemId: "es-e01-s01-word-unknown",
      targetText: "nada",
    });
    expect(result).toBeUndefined();
  });

  it("does not affect the English course's own new-word encounters", () => {
    const encounters = newWordEncounters(EPISODE_01_SESSION_01_SOURCE, "lesson-01:session:01");

    expect(encounters.map((e) => e.lexicalItemId)).toEqual([
      "e01-s01-word-i",
      "e01-s01-word-am",
      "e01-s01-word-here",
      "e01-s01-word-ready",
    ]);
  });
});
