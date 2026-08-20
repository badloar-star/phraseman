import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import {
  evaluateLearningV2SessionContentQuality,
  type LearningV2ContentQualityIssue,
} from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';
import { LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1 } from '../modules/learning-v2/content/source/learning_content_quality_review_receipts_v1';

const blockers: Array<{ sessionOrdinal: number; issue: LearningV2ContentQualityIssue }> = [];

for (const source of AUTHORED_EPISODE_01_SESSIONS) {
  const report = evaluateLearningV2SessionContentQuality(
    source,
    LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1[source.requiredSessionOrdinal],
  );
  for (const issue of report.issues) {
    blockers.push({ sessionOrdinal: source.requiredSessionOrdinal, issue });
  }
}

if (blockers.length > 0) {
  console.error(`LEARNING V2 CONTENT GATE: HOLD (${blockers.length} blockers)`);
  for (const blocker of blockers) {
    console.error(
      `S${String(blocker.sessionOrdinal).padStart(2, '0')} · ${blocker.issue.code} · ${blocker.issue.path} · ${blocker.issue.message}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    `LEARNING V2 CONTENT GATE: PASS (${AUTHORED_EPISODE_01_SESSIONS.length} sessions)`,
  );
}
