// зачем: лёгкий исполняемый gate точной границы эпизода 1. Он не позволяет
// трактовать «урок 1 = to be» как право забрать грамматику эпизодов 2 и 3.
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";

const FORBIDDEN_FEATURE_FRAGMENTS = Object.freeze([
  "negation",
  "question",
  "third_person",
  "impersonal_it",
  "plural_pronoun",
  "plural_noun",
  "contraction_thirdperson",
  "contraction_plural",
  "negative_contraction",
  "demonstrative",
  "indefinite_article",
  "possessive",
  "profession_noun",
  "family_noun",
  "place_noun",
  "preposition_place",
  "weather_adjective",
  "everyday_object_noun",
  "colour",
  "size_adjective",
  "adjective_before_noun",
  "number_",
  "age_expression",
  "descriptive_adjective",
  "conjunction",
  "clarification",
  "present_simple",
  "past_",
  "future",
  "going_to",
  "modal_can",
  "continuous",
  "irregular",
  "do_not_verb",
  "question_do",
  "like_want",
  "comparative",
  "superlative",
  "there_is",
  "preposition_time",
  "preposition_duration",
  "preposition_direction",
  "verb_ing",
  "because",
  "frequency",
]);

const findings: string[] = [];

if (EPISODE_01_SESSION_MAP_V1.length !== 56) {
  findings.push(`session_count:expected=56:actual=${EPISODE_01_SESSION_MAP_V1.length}`);
}

for (const [index, entry] of EPISODE_01_SESSION_MAP_V1.entries()) {
  if (entry.sessionOrdinal !== index + 1) {
    findings.push(
      `ordinal:expected=${index + 1}:actual=${entry.sessionOrdinal}`,
    );
  }
  for (const feature of entry.teaches) {
    const forbidden = FORBIDDEN_FEATURE_FRAGMENTS.find((fragment) =>
      feature.includes(fragment),
    );
    if (forbidden) {
      findings.push(
        `session=${entry.sessionOrdinal}:feature=${feature}:owned_by_later_lesson`,
      );
    }
  }
}

const allFeatures = new Set(
  EPISODE_01_SESSION_MAP_V1.flatMap((entry) => entry.teaches),
);
for (const required of [
  "copula_be",
  "first_person_singular",
  "second_person",
  "contraction_im",
]) {
  if (!allFeatures.has(required)) findings.push(`required_feature_missing:${required}`);
}

if (findings.length > 0) {
  throw new Error(
    [
      "LESSON 1 CURRICULUM BOUNDARY GATE: HOLD",
      `total_findings=${findings.length}`,
      ...findings,
    ].join("\n"),
  );
}

process.stdout.write("LESSON 1 CURRICULUM BOUNDARY GATE: PASS\n");
