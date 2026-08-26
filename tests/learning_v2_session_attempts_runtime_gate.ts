import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");

const players = [
  {
    name: "direct player",
    path: "app/learning_v2_direct_session_player_v1.tsx",
    source: read("app/learning_v2_direct_session_player_v1.tsx"),
  },
  {
    name: "released route player",
    path: "app/learning-v2/session/[id].tsx",
    source: read("app/learning-v2/session/[id].tsx"),
  },
] as const;

for (const player of players) {
  assert.ok(
    player.source.includes("SessionAttemptsHud") &&
      player.source.includes("SessionAttemptsRecoveryModal") &&
      player.source.includes("useSessionAttempts"),
    `${player.name} must mount the shared attempts HUD, modal, and controller`,
  );
  assert.ok(
    player.source.includes('verdict: "pedagogical_wrong"') ||
      player.source.includes("verdict: 'pedagogical_wrong'"),
    `${player.name} must consume only a released pedagogical wrong`,
  );
  assert.ok(
    player.source.includes("attempts_exhausted") &&
      player.source.includes("awaiting_recovery"),
    `${player.name} must stop on the third wrong and wait for recovery`,
  );
  assert.ok(
    player.source.includes("recoverWithGift") &&
      player.source.includes("recoverWithRunes") &&
      player.source.includes("endAttemptsSession"),
    `${player.name} must expose all three recovery decisions`,
  );
}

const direct = players[0].source;
assert.ok(
  direct.includes('verdict.resultCode === "technical_invalid"') &&
    direct.indexOf('verdict.resultCode === "technical_invalid"') <
      direct.indexOf('verdict: "pedagogical_wrong"'),
  "technical-invalid voice/input outcomes must exit before attempt consumption",
);
assert.ok(
  direct.includes("stopAttemptMediaBeforeRecovery") &&
    direct.includes("voiceCancelRef.current()") &&
    direct.includes("managedAudio.stop()") &&
    direct.includes("stopPreviewAudio()"),
  "the direct player must stop voice and audio before showing the exhausted modal",
);
assert.ok(
  direct.includes("recoverCurrentLearningV2Attempt") &&
    direct.includes("setShowAttemptsModal(false)") &&
    !direct.includes("setPracticeIndex(0); // session-attempt-recovery"),
  "recovery must keep the exact practice index and resume the same activity",
);

const route = players[1].source;
assert.ok(
  route.includes("stopAttemptMediaBeforeRecovery") &&
    route.includes("stopLocalAudioPlayback()"),
  "the released route must stop owned audio before showing the exhausted modal",
);
assert.ok(
  route.includes("recoverCurrentLearningV2Attempt") &&
    !route.includes("setCardIndex(3); // session-attempt-recovery"),
  "released-route recovery must keep the exact task/card index",
);

for (const forbiddenPath of [
  "modules/learning-v2/content/source/episode_01_session_01_mode_native_v1.ts",
  "modules/learning-v2/content/source/lesson1_authoring_registry_v1.ts",
]) {
  assert.ok(
    !players.some((player) => player.source.includes(forbiddenPath)),
    `attempts runtime must not import or rewrite authoring source: ${forbiddenPath}`,
  );
}

console.log("LEARNING V2 SESSION ATTEMPTS RUNTIME GATE: PASS");
