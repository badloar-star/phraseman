import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { retryLearningV2LocalCompletionV1 } from "../modules/learning-v2/progress/local_completion_retry_v1";

const root = process.cwd();

async function main(): Promise<void> {
  let attempts = 0;
  const waits: number[] = [];
  const recovered = await retryLearningV2LocalCompletionV1({
    commit: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("transient_local_write");
    },
    wait: async (delayMs) => {
      waits.push(delayMs);
    },
    retryDelaysMs: [10, 20, 30],
  });
  assert.equal(recovered, true);
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [10, 20]);

  let permanentAttempts = 0;
  const exhausted = await retryLearningV2LocalCompletionV1({
    commit: async () => {
      permanentAttempts += 1;
      throw new Error("persistent_local_write");
    },
    wait: async () => undefined,
    retryDelaysMs: [1, 2],
  });
  assert.equal(exhausted, false);
  assert.equal(permanentAttempts, 3);

  const player = fs.readFileSync(
    path.join(root, "app/learning_v2_direct_session_player_v1.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    player,
    /completionSaveFailureTitle|completionFailure|learning-v2-completion-save-error|Прогресс не потерян/u,
  );

  const finishBody = player.slice(
    player.indexOf("const finish = useCallback("),
    player.indexOf("const showPracticeIndex = useCallback("),
  );
  const localProgressCommit = finishBody.indexOf(
    "createLearningV2CourseLocalProgressStoreV1(AsyncStorage).complete(",
  );
  const publishFinale = finishBody.indexOf(
    "Local completion owns the next frame",
  );
  const syncSpool = finishBody.indexOf(
    "createLearningV2CourseSessionCompletedSpoolV1(AsyncStorage)",
  );
  const runeReward = finishBody.indexOf(
    "commitLearningV2SessionRuneRewardCompositeV1(",
  );
  assert.ok(localProgressCommit >= 0, "local progress commit missing");
  assert.ok(publishFinale >= 0, "immediate local finale publication missing");
  assert.ok(syncSpool >= 0, "background synchronization spool missing");
  assert.ok(runeReward >= 0, "local rune reward commit missing");
  assert.ok(
    localProgressCommit < publishFinale &&
      publishFinale < syncSpool &&
      publishFinale < runeReward,
    "local progress and its finale must precede synchronization and rewards",
  );
  assert.doesNotMatch(
    finishBody,
    /await\s+appendCompletionForBackgroundSync\(\)/u,
    "the server synchronization journal must never block completion UI",
  );
  assert.match(
    finishBody,
    /void retryLearningV2LocalCompletionV1\(\{[\s\S]*?commit: appendCompletionForBackgroundSync/u,
    "the server synchronization journal must retry only in the background",
  );
  assert.doesNotMatch(
    finishBody,
    /httpsCallable|firebase|fetch\(/iu,
    "completion must not await or call a server transport",
  );
  assert.match(finishBody, /void retryLearningV2LocalCompletionV1\(/u);
  assert.match(finishBody, /setFinaleStars\(earned\)/u);
  assert.match(
    player,
    /if \(finaleStars !== null\)/u,
    "the completion screen must mount as soon as local progress publishes stars",
  );
  assert.doesNotMatch(
    player,
    /finaleStars !== null\s*&&[^\n]*finaleRewardsSettled/u,
    "secondary XP/rune receipts must never gate completion screen mounting",
  );

  const start = fs.readFileSync(path.join(root, "docs/v2/СТАРТ В2.md"), "utf8");
  assert.match(start, /ЗАВЕРШЕНИЕ ВСЕГДА LOCAL-FIRST/u);
  assert.match(
    start,
    /Сервер не подтверждает, не разрешает и не блокирует completion/u,
  );
  assert.match(
    start,
    /«не удалось сохранить результат»[\s\S]{0,160}запрещены/u,
  );

  console.log("LEARNING V2 LOCAL-FIRST COMPLETION GATE: PASS");
}

void main();
