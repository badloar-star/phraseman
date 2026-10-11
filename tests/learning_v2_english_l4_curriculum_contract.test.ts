import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";
import { LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2 } from "../modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2";

const ROOT = path.resolve(__dirname, "..");
const PLAN_PATH = path.join(ROOT, "content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md");
const V2_CURRICULUM_PATH = path.join(ROOT, "docs/v2/03-learning-architecture-and-curriculum.md");

const EXPECTED_WORD_CELLS = Object.freeze([
  "pharmacy, library, bakery", "garden", "bank", "post office", "supermarket", "clinic", "playground", "neighbourhood",
  "dentist", "hotel", "tram", "platform", "taxi", "laundrette", "gym", "swimming pool",
  "berry", "milk", "soup", "mushroom", "juice", "carrot", "cheese", "yoghurt",
  "sink", "worktop", "awning", "alley", "bus stop", "signpost", "car park", "fountain",
  "doorbell", "handrail", "ramp", "smoke alarm", "parcel locker", "bike shed", "boiler", "thermostat",
  "cashpoint", "bus shelter", "recycling bin", "freezer", "microwave", "pantry", "leftover", "community kitchen",
  "canal", "river", "community centre", "nursery", "police station", "petrol station", "shortcut", "corner shop",
]);

type PlanRow = Readonly<{ ordinal: number; type: string; grammar: string; words: string; scene: string; raw: string }>;

function l4Section(markdown: string): string {
  const start = markdown.search(/^## Урок 4\b/mu);
  assert.ok(start >= 0, "l4_authoritative_section_missing");
  const tail = markdown.slice(start);
  const next = tail.search(/^## Урок 5\b/mu);
  return next >= 0 ? tail.slice(0, next) : tail;
}

function parseRows(section: string): readonly PlanRow[] {
  return section.split(/\r?\n/u).flatMap((raw) => {
    const match = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/u.exec(raw);
    if (!match) return [];
    return [{ ordinal: Number(match[1]), type: match[2], grammar: match[3], words: match[4], scene: match[5], raw }];
  });
}

const plan = fs.readFileSync(PLAN_PATH, "utf8");
const section = l4Section(plan);
const rows = parseRows(section);

assert.equal(rows.length, 56, "l4_must_have_exactly_56_rows");
assert.deepEqual(rows.map((row) => row.ordinal), Array.from({ length: 56 }, (_, index) => index + 1), "l4_session_order");
assert.equal((section.match(/^### Глава [1-7]\b/gmu) ?? []).length, 7, "l4_must_have_seven_chapters");
for (let chapter = 0; chapter < 7; chapter += 1) {
  assert.deepEqual(
    rows.slice(chapter * 8, chapter * 8 + 8).map((row) => row.ordinal),
    Array.from({ length: 8 }, (_, index) => chapter * 8 + index + 1),
    `l4_chapter_${chapter + 1}_must_have_eight_ordered_sessions`,
  );
}

const exactS01 = "| 1 | новая | сообщить о наличии одного места: `There is a/an + singular count noun` (полная форма) | pharmacy, library, bakery | у стойки заселения отмечаем на карте три места рядом с новым домом |";
assert.equal(rows[0]?.raw, exactS01, "l4_s01_owner_locked_row");
assert.deepEqual(rows.map((row) => row.words), EXPECTED_WORD_CELLS, "l4_exact_lexical_assignment_by_session");

const plannedSurfaces = EXPECTED_WORD_CELLS.flatMap((cell) => cell.split(",").map((word) => word.trim()));
assert.equal(new Set(plannedSurfaces).size, plannedSurfaces.length, "l4_lexical_surfaces_must_not_repeat");
assert.ok(plannedSurfaces.length >= 56 && plannedSurfaces.length <= 56 * 5, "l4_each_session_has_one_to_five_new_senses");
assert.ok(rows.every((row) => row.words.split(",").length >= 1 && row.words.split(",").length <= 5), "l4_row_new_sense_count");

const learnerSourceFiles = ["l01", "l02", "l03"].flatMap((lesson) => {
  const root = path.join(ROOT, "content/learning-v2-course/sessions/en", lesson);
  return fs.readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /^(?:final\.(?:ru|uk)\.md|practice\.atomic\.json)$/u.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
});
const priorLearnerText = learnerSourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n").toLocaleLowerCase("en-US");
for (const surface of plannedSurfaces) {
  const escaped = surface.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  assert.equal(new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "iu").test(priorLearnerText), false, `l4_surface_already_in_l1_l3:${surface}`);
}

const sceneFingerprints = rows.map((row) => row.scene.toLocaleLowerCase("ru-RU").replace(/[^\p{L}\p{N}]+/gu, " ").trim());
assert.equal(new Set(sceneFingerprints).size, 56, "l4_every_session_needs_a_distinct_scene_fingerprint");
const futureGrammar = /\b(?:present simple|present continuous|past|future|going to|will|would|have|has|do|does|did|comparative|superlative|modal)\b/iu;
for (const row of rows) assert.equal(futureGrammar.test(row.grammar), false, `l4_future_grammar_leak:s${String(row.ordinal).padStart(2, "0")}`);

assert.match(section, /factory `en\/l04`[\s\S]*V2 E09[\s\S]*runtime[^\n]*`lesson-04`/iu, "l4_factory_v2_mapping_missing_from_authoritative_plan");
assert.match(fs.readFileSync(V2_CURRICULUM_PATH, "utf8"), /factory `en\/l04`[\s\S]*E09[\s\S]*`lesson-04`/iu, "l4_factory_v2_mapping_missing_from_v2_curriculum");

const l4Assignments = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2.filter((assignment) => assignment.sessionId.startsWith("lesson-04:"));
assert.equal(l4Assignments.length, 56, "l4_machine_assignments_must_cover_all_sessions");
assert.deepEqual(l4Assignments.map((assignment) => assignment.sessionId), Array.from({ length: 56 }, (_, index) => `lesson-04:session:${String(index + 1).padStart(2, "0")}`), "l4_runtime_identity_and_order");
assert.deepEqual(l4Assignments.map((assignment) => assignment.newSenses.map((sense) => sense.english).join(", ")), EXPECTED_WORD_CELLS, "l4_machine_lexicon_must_match_authoritative_plan");

const l4Operations = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.filter((operation) => operation.lessonOrdinal === 4);
assert.deepEqual(l4Operations.map((operation) => operation.id), [
  "en.grammar.existence_place.there_is_are",
  "en.grammar.existence_place.existential_questions",
  "en.grammar.existence_place.existential_some_any",
  "en.grammar.existence_place.basic_place_prepositions",
  "en.grammar.existence_place.existential_negatives",
], "l4_exact_prerequisite_safe_operation_order");
for (let index = 1; index < l4Operations.length; index += 1) {
  assert.deepEqual(l4Operations[index].prerequisiteOperationIds, [l4Operations[index - 1].id], `l4_operation_${index + 1}_prerequisite`);
}

process.stdout.write("LEARNING V2 ENGLISH L4 CURRICULUM CONTRACT: PASS rows=56 chapters=7 lexical_surfaces=58 runtime=lesson-04 v2_episode=E09\n");
