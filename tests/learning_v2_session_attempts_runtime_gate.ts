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
      player.source.includes("useSessionAttempts") &&
      player.source.includes("useSessionAttemptAutoReset"),
    `${player.name} must mount the shared attempts HUD, controller, and automatic reset`,
  );
  assert.ok(
    player.source.includes('verdict: "pedagogical_wrong"') ||
      player.source.includes("verdict: 'pedagogical_wrong'"),
    `${player.name} must consume only a released pedagogical wrong`,
  );
  assert.ok(
    player.source.includes("attempts_exhausted") &&
      player.source.includes("restoreAfterSessionRuneForfeit"),
    `${player.name} must restore hearts after the third wrong`,
  );
  assert.ok(
    !player.source.includes("SessionAttemptsRecoveryModal") &&
      !player.source.includes("recoverWithGift") &&
      !player.source.includes("recoverWithRunes"),
    `${player.name} must not expose retired recovery choices`,
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
  "the direct player retains owned voice and audio cleanup",
);
assert.ok(
  direct.includes("resetLearningV2AfterSessionRuneForfeit") &&
    direct.includes("setSessionRunes(0)") &&
    !direct.includes("setPracticeIndex(0); // session-attempt-recovery"),
  "automatic reset must keep the exact practice index and clear only session runes",
);
assert.ok(
  !direct.includes("emitAppEvent(\"energy_spent_on_start\"") &&
    !direct.includes("emitAppEvent('energy_spent_on_start'"),
  "the player must not fake the energy flight; EnergyContext emits it only after the atomic debit+grant commit",
);
assert.ok(
  direct.includes("telemetryStartSentRef.current = false") &&
    direct.includes('sessionStageRef.current = "intro"') &&
    direct.includes("sessionStartedAtRef.current = null"),
  "a paid fresh run must start a fresh telemetry lifecycle instead of inheriting the exhausted run",
);
assert.ok(
  direct.includes("newWordSaveBusyRef.current.has(lexicalItemId)") &&
    direct.includes("newWordSaveBusyRef.current.add(lexicalItemId)") &&
    direct.includes("newWordSaveBusyRef.current.delete(lexicalItemId)"),
  "durable word-card save/remove must be synchronously locked against double taps",
);
const route = players[1].source;
assert.ok(
  route.includes("stopAttemptMediaBeforeRecovery") &&
    route.includes("stopLocalAudioPlayback()"),
  "the released route retains owned audio cleanup",
);
assert.ok(
  route.includes("resetLearningV2RouteAfterSessionRuneForfeit") &&
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
