import { EPISODE_01_SESSION_01_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_01_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import { authoredLearningV2SessionSource } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";

type EncounterProjection = Readonly<{
  lexicalItemId: string;
  transcription: string;
  playfulMeaningByLocale: Readonly<Record<string, string>>;
  motionVariant: "lesson_hero_b" | "premium_a";
  presentation: "blocking_task_overlay";
  dismissal: "continue_only";
  saveControl: "bookmark_icon";
  orderWithinSession: number;
  save: Readonly<{
    targetLanguage: string;
    targetText: string;
    meaningByLocale: Readonly<Record<string, string>>;
  }>;
}>;

type AuxiliaryProjection = Readonly<{
  entries: readonly Readonly<Record<string, unknown>>[];
}>;

const FORBIDDEN_META_TEMPLATE =
  /^(?:вс[ёе] сделано|можно начинать|так описывают|это слово означает|так говорят, когда)/iu;

function projectedEncounters(
  source = EPISODE_01_SESSION_01_SOURCE,
): readonly EncounterProjection[] {
  const shard = buildSessionShardFromSource(source);
  const auxiliary = buildSessionChildBodiesFromShard(
    shard,
    "ru",
    `lesson-01:session:${String(source.requiredSessionOrdinal).padStart(2, "0")}`,
  ).auxiliary as AuxiliaryProjection;
  return auxiliary.entries.flatMap((entry) => {
    const encounter = Reflect.get(entry, "newWordEncounter") as
      | EncounterProjection
      | undefined;
    return encounter ? [encounter] : [];
  });
}

describe("Learning V2 new-word encounter release projection", () => {
  test("projects one explicit learner-safe encounter for every new word", () => {
    const vocabulary = EPISODE_01_SESSION_01_SOURCE.newVocabulary ?? [];
    const encounters = projectedEncounters();

    expect(encounters).toHaveLength(vocabulary.length);
    expect(encounters.map((entry) => entry.lexicalItemId)).toEqual(
      vocabulary.map((entry) => entry.id),
    );
    expect(encounters.map((entry) => entry.save.targetText)).toEqual(
      vocabulary.map((entry) => entry.target),
    );
    expect(encounters.map((entry) => entry.orderWithinSession)).toEqual(
      vocabulary.map((_, index) => index + 1),
    );
    expect(encounters.map((entry) => entry.motionVariant)).toEqual(
      vocabulary.map((_, index) =>
        index === 0 ? "lesson_hero_b" : "premium_a",
      ),
    );
    expect(
      encounters.every(
        (entry) =>
          entry.presentation === "blocking_task_overlay" &&
          entry.dismissal === "continue_only" &&
          entry.saveControl === "bookmark_icon",
      ),
    ).toBe(true);
  });

  test("covers every new vocabulary item in locked sessions 1-10 without a fallback", () => {
    for (let ordinal = 1; ordinal <= 10; ordinal += 1) {
      const source = authoredLearningV2SessionSource(ordinal);
      expect(source).not.toBeNull();
      const vocabulary = source!.newVocabulary ?? [];
      const encounters = projectedEncounters(source!);
      expect(encounters.map((entry) => entry.lexicalItemId)).toEqual(
        vocabulary.map((entry) => entry.id),
      );
      expect(encounters.map((entry) => entry.save.targetText)).toEqual(
        vocabulary.map((entry) => entry.target),
      );
      expect(encounters.map((entry) => entry.orderWithinSession)).toEqual(
        vocabulary.map((_entry, index) => index + 1),
      );
    }
  });

  test("ships transcription, exact meanings and non-template descriptions for every active locale", () => {
    const encounters = Array.from({ length: 10 }, (_unused, index) => {
      const source = authoredLearningV2SessionSource(index + 1);
      if (!source) throw new Error("locked_session_source_missing");
      return projectedEncounters(source);
    }).flat();
    const normalizedDescriptions = new Set<string>();

    for (const encounter of encounters) {
      expect(encounter.transcription).toMatch(/^\/.+\/$/u);
      expect(Object.keys(encounter.save.meaningByLocale)).toEqual(
        LEARNING_V2_INTERFACE_LOCALES,
      );
      expect(Object.keys(encounter.playfulMeaningByLocale)).toEqual(
        LEARNING_V2_INTERFACE_LOCALES,
      );
      for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
        const copy = encounter.playfulMeaningByLocale[locale]?.trim();
        expect(copy).toBeTruthy();
        expect(copy).not.toMatch(FORBIDDEN_META_TEMPLATE);
        const normalized = `${locale}:${copy!.toLocaleLowerCase(locale).replace(/\s+/gu, " ")}`;
        expect(normalizedDescriptions.has(normalized)).toBe(false);
        normalizedDescriptions.add(normalized);
      }
      expect(JSON.stringify(encounter)).not.toMatch(
        /image|illustration|rarity|reward|mastery/iu,
      );
    }
  });
});
