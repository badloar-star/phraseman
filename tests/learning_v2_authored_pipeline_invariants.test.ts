// зачем (координатор, решение «(2) облегчённый», 2026-10-01): авторский конвейер —
// живой путь для испанского курса (встроенного релиза у es нет), поэтому без
// сторожей его оставлять нельзя. Старые наборы проверяли точные числа контракта
// «12 карточек» и конкретные задания урока 1 en — они сняты (D149/D150). Здесь —
// инварианты ТЕКУЩЕГО конвейера, одинаковые для en и es.
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { allAuthoredEsEpisode01Sessions } from "../modules/learning-v2/content/source/es_authored_sessions_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import {
  buildSessionShardFromSource,
  FAMILY_INSTRUCTION,
  VOCABULARY_STAGE_INSTRUCTION,
  type SessionSource,
} from "../modules/learning-v2/content/source/session_shard_from_source_v1";

type Interaction = Readonly<{
  family: string;
  prompt: string;
  responseOptions: readonly Readonly<{ responseId: string; text: string }>[];
}>;
type Encounter = Readonly<{ lexicalItemId: string }>;

const COURSES: ReadonlyArray<readonly [string, () => readonly SessionSource[]]> = [
  ["en", () => AUTHORED_EPISODE_01_SESSIONS],
  ["es", () => allAuthoredEsEpisode01Sessions()],
];

function build(source: SessionSource) {
  const courseSessionId = `lesson-01:session:${String(source.requiredSessionOrdinal).padStart(2, "0")}`;
  const children = buildSessionChildBodiesFromShard(buildSessionShardFromSource(source), "ru", courseSessionId);
  const learner = children.learner as unknown as Readonly<{
    practiceInteractionCount: number;
    interactions: readonly Interaction[];
  }>;
  const auxiliary = children.auxiliary as unknown as Readonly<{
    entries: readonly Readonly<{ newWordEncounter?: Encounter }>[];
  }>;
  return { children, learner, auxiliary };
}

const ruTexts = (table: Readonly<Record<string, { ru: string }>>): string[] =>
  Object.values(table).map((entry) => entry.ru);
const COPY_TABLE_INSTRUCTIONS = [
  ...ruTexts(FAMILY_INSTRUCTION),
  ...ruTexts(VOCABULARY_STAGE_INSTRUCTION),
];

describe.each(COURSES)("authored pipeline invariants (%s)", (_course, sessions) => {
  test("(a) every session carries at least 6 practice tasks (D149)", () => {
    for (const source of sessions()) {
      expect(build(source).learner.practiceInteractionCount).toBeGreaterThanOrEqual(6);
    }
  });

  test("(b) every new word of a session gets exactly one word card", () => {
    for (const source of sessions()) {
      const expected = (source.newVocabulary ?? []).map((entry) => entry.id);
      const encounters = build(source).auxiliary.entries
        .flatMap((entry) => (entry.newWordEncounter ? [entry.newWordEncounter.lexicalItemId] : []));
      expect([...encounters].sort()).toEqual([...expected].sort());
    }
  });

  test("(c) choice options are distinct, uniquely identified and never fewer than three", () => {
    for (const source of sessions()) {
      for (const interaction of build(source).learner.interactions) {
        const options = interaction.responseOptions;
        if (options.length === 0) continue;
        expect(options.length).toBeGreaterThanOrEqual(3);
        expect(new Set(options.map((option) => option.responseId)).size).toBe(options.length);
        // зачем: регистр различаем намеренно — «I» и «i»/«l» в банке слов это авторская
        // ловушка на заглавную I, а не дубль. Дублем считается совпадение один в один.
        const texts = options.map((option) => option.text.normalize("NFKC").trim());
        expect(new Set(texts).size).toBe(texts.length);
      }
    }
  });

  test("(d) task instructions come from the copy tables or the authored step copy", () => {
    for (const source of sessions()) {
      const authored = (source.modeNativePractice ?? [])
        .flatMap((step) => (step.instruction ? [step.instruction.ru] : []));
      const allowed = [...COPY_TABLE_INSTRUCTIONS, ...authored];
      for (const interaction of build(source).learner.interactions) {
        expect(interaction.prompt.trim()).not.toBe("");
        expect(allowed.some((text) => interaction.prompt.includes(text))).toBe(true);
      }
    }
  });

  test("(e) the session package is deterministic: same input, same hash", () => {
    for (const source of sessions().slice(0, 5)) {
      expect(hashCanonicalBody(build(source).children)).toBe(hashCanonicalBody(build(source).children));
    }
  });
});
