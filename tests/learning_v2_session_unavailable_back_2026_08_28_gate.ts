import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const player = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
).replace(/\r\n/g, "\n");
// зачем (Дизайн 05.10, сверка learning-v2.html unavailable): вид «Сессия недоступна» вынесен в общий компонент —
// кнопка «Назад» с тем же testID живёт в нём, а ветки плеера передают ей onBack. Сторож проверяет обе стороны.
const view = readFileSync(
  "components/learning-v2/LearningV2SessionUnavailable.tsx",
  "utf8",
);
assert.match(view, /testID="learning-v2-unavailable-back"/u, "the unavailable view must render the Back action");
assert.match(view, /onPress=\{onBack\}/u, "Back must call the onBack the player passes in");

const backAction = /testID="learning-v2-unavailable-back"|<LearningV2SessionUnavailable[\s\S]*?onBack=\{/u;

const invalidLocatorState = player.slice(
  player.indexOf("if (!locator || !lessonOrdinal || !sessionOrdinal)"),
  player.indexOf("if (finaleStars !== null && isCheckpoint)"),
);
assert.match(
  invalidLocatorState,
  backAction,
  "an invalid session locator must still offer a Back action",
);
assert.match(invalidLocatorState, /safeRouterBack\(router, exitRoute\)/u);

const loadFailureState = player.slice(
  player.indexOf("if (\n    (!readyHandle && !isAuthoringPreview)"),
  player.indexOf("if (isCheckpoint && !checkpointEntryDone)"),
);
assert.match(
  loadFailureState,
  backAction,
  "a failed session load must offer Back as well as Retry",
);
assert.match(loadFailureState, /safeRouterBack\(router, exitRoute\)/u);
assert.match(loadFailureState, /setLoadRevision\(\(value\) => value \+ 1\)/u);

process.stdout.write(
  "LEARNING V2 SESSION UNAVAILABLE BACK 2026-08-28 GATE: PASS\n",
);
