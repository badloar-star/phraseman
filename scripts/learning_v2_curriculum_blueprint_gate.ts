import {
  LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_COURSE_SESSION_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
} from "../modules/learning-v2/content/course_topology_v1";
import {
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1,
} from "../modules/learning-v2/curriculum/en/grammar_operations_en_v1";
import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1 } from "../modules/learning-v2/curriculum/en/chapter_blueprints_en_v1";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v1";
import { validateLearningV2CourseBlueprintV1 } from "../modules/learning-v2/curriculum/validation/course_blueprint_validation_v1";
import {
  LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V1,
  validateLearningV2EnglishGrammarPrerequisiteDagV1,
} from "../modules/learning-v2/curriculum/en/prerequisite_dag_en_v1";

const chapterCount =
  (LEARNING_V2_COURSE_LESSON_COUNT_V1 *
    LEARNING_V2_LESSON_SESSION_COUNT_V1) /
  LEARNING_V2_CHAPTER_SESSION_COUNT_V1;

const exactPacketCount = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1.length;
const holdPacketCount =
  LEARNING_V2_COURSE_SESSION_COUNT_V1 - exactPacketCount;
const dagFindings = validateLearningV2EnglishGrammarPrerequisiteDagV1(
  LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V1,
);
const packetFindings = validateLearningV2CourseBlueprintV1({
  lessons: Array.from({ length: LEARNING_V2_COURSE_LESSON_COUNT_V1 }, (_, index) => Object.freeze({
    lessonOrdinal: index + 1,
    sessions: LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1.filter(
      (packet) => packet.lessonOrdinal === index + 1,
    ),
  })),
  forbiddenSurfaceFormsById: Object.freeze({}),
});
const status =
  dagFindings.length === 0 &&
  packetFindings.length === 0 &&
  LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1.length === chapterCount &&
  holdPacketCount === 0
    ? "PASS"
    : "HOLD";

process.stdout.write(
  [
    `LEARNING V2 CURRICULUM BLUEPRINT GATE: ${status}`,
    `lessons=${LEARNING_V2_COURSE_LESSON_COUNT_V1} chapters=${chapterCount} session_slots=${LEARNING_V2_COURSE_SESSION_COUNT_V1}`,
    `chapter_blueprints=${LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1.length}`,
    `exact_packets=${exactPacketCount} hold_packets=${holdPacketCount}`,
    `grammar_operations=${LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1.length} dag_edges=${LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V1.edges.length}`,
    `dag_findings=${dagFindings.length}`,
    `packet_findings=${packetFindings.length}`,
  ].join("\n") + "\n",
);

if (status !== "PASS") process.exitCode = 1;
