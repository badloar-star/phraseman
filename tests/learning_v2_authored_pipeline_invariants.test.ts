// зачем (координатор, решение «(2) облегчённый», 2026-10-01): авторский конвейер —
// живой путь для испанского курса (встроенного релиза у es нет), поэтому без
// сторожей его оставлять нельзя. Старые наборы проверяли точные числа контракта
// «12 карточек» и конкретные задания урока 1 en — они сняты (D149/D150). Здесь —
// инварианты ТЕКУЩЕГО конвейера, одинаковые для en и es.
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { allAuthoredEsEpisode01Sessions } from "../modules/learning-v2/content/source/es_authored_sessions_v1";
import {
  buildSessionChildBodiesFromShard,
  wordCardGapsV1,
} from "../modules/learning-v2/content/source/session_package_from_shard_v1";
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

// Третье поле — потолок отчёта «новое слово без карточки» (не блокирующий
// гейт): долг может только уменьшаться. Замер 2026-10-01: en — 45 слов без
// собственного упражнения + 84 без написанного текста карточки; es — 0.
const COURSES: ReadonlyArray<readonly [string, () => readonly SessionSource[], number]> = [
  ["en", () => AUTHORED_EPISODE_01_SESSIONS, 129],
  ["es", () => allAuthoredEsEpisode01Sessions(), 0],
];

function build(source: SessionSource) {
  const courseSessionId = `lesson-01:session:${String(source.requiredSessionOrdinal).padStart(2, "0")}`;
  const shard = buildSessionShardFromSource(source);
  const children = buildSessionChildBodiesFromShard(shard, "ru", courseSessionId);
  const learner = children.learner as unknown as Readonly<{
    practiceInteractionCount: number;
    interactions: readonly Interaction[];
  }>;
  const auxiliary = children.auxiliary as unknown as Readonly<{
    entries: readonly Readonly<{ newWordEncounter?: Encounter }>[];
  }>;
  const gaps = wordCardGapsV1(
    shard.cards.filter((card) => card.taskSlot >= 4),
    shard.targetLanguage,
    (source.newVocabulary ?? []).map((entry) => entry.id),
  );
  return { children, learner, auxiliary, gaps };
}

const ruTexts = (table: Readonly<Record<string, { ru: string }>>): string[] =>
  Object.values(table).map((entry) => entry.ru);
const COPY_TABLE_INSTRUCTIONS = [
  ...ruTexts(FAMILY_INSTRUCTION),
  ...ruTexts(VOCABULARY_STAGE_INSTRUCTION),
];

describe.each(COURSES)("authored pipeline invariants (%s)", (_course, sessions, gapCeiling) => {
  test("(a) every session carries at least 6 practice tasks (D149)", () => {
    for (const source of sessions()) {
      expect(build(source).learner.practiceInteractionCount).toBeGreaterThanOrEqual(6);
    }
  });

  // зачем (координатор, 2026-10-01): карточку-знакомство клиент принимает
  // только на собственном упражнении слова и только с написанным текстом
  // карточки. Каждое такое слово обязано получить ровно одну карточку; прочие
  // идут в отчёт wordCardGapsV1, и этот отчёт не должен расти.
  test("(b) every cardable new word gets exactly one word card; the gap report never grows", () => {
    let gapCount = 0;
    for (const source of sessions()) {
      const { auxiliary, gaps } = build(source);
      const missing = new Set(gaps.map((gap) => gap.lexicalItemId));
      const expected = (source.newVocabulary ?? []).map((entry) => entry.id).filter((id) => !missing.has(id));
      const encounters = auxiliary.entries
        .flatMap((entry) => (entry.newWordEncounter ? [entry.newWordEncounter.lexicalItemId] : []));
      expect([...encounters].sort()).toEqual([...expected].sort());
      gapCount += gaps.length;
    }
    expect(gapCount).toBeLessThanOrEqual(gapCeiling);
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
