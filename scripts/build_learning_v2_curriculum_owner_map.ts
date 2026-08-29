import {
  LEARNING_V2_COURSE_SESSION_COUNT_V1,
} from "../modules/learning-v2/content/course_topology_v1";
import {
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1,
} from "../modules/learning-v2/curriculum/en/grammar_operations_en_v1";
import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1 } from "../modules/learning-v2/curriculum/en/chapter_blueprints_en_v1";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v1";
import { LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1 } from "../modules/learning-v2/curriculum/en/lexical_senses_en_v1";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1 } from "../modules/learning-v2/curriculum/en/course_blueprint_en_v1";
import {
  LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V1,
  validateLearningV2EnglishGrammarPrerequisiteDagV1,
} from "../modules/learning-v2/curriculum/en/prerequisite_dag_en_v1";

const exactPacketCount = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1.length;
const dagFindings = validateLearningV2EnglishGrammarPrerequisiteDagV1(
  LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V1,
);

async function main(): Promise<void> {
  process.env.LEARNING_V2_CURRICULUM_STATUS_JSON = JSON.stringify({
    exactPacketCount,
    holdPacketCount: LEARNING_V2_COURSE_SESSION_COUNT_V1 - exactPacketCount,
    chapterBlueprintCount: LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1.length,
    chapterBlueprints: LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1,
    exactPackets: LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1,
    lexicalSenseCount: LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1.length,
    blueprintFingerprint: LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1.blueprintFingerprint,
    ownerApproval: LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1.ownerApproval,
    grammarOperationCount: LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1.length,
    grammarOperationIds: LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1.map(
      (operation) => operation.id,
    ),
    dagEdgeCount:
      LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V1.edges.length,
    dagFindingCount: dagFindings.length,
    dagFindingCodes: dagFindings.map((finding) => finding.code),
  });

  await import("./build_learning_v2_curriculum_owner_map.mjs");
}

void main();
