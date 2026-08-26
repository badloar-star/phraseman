import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const player = readFileSync(
  resolve(root, "app/learning_v2_direct_session_player_v1.tsx"),
  "utf8",
);
const route = readFileSync(
  resolve(root, "app/learning-v2/session/[id].tsx"),
  "utf8",
);

const requiredPlayerContracts = [
  'previewMode?: string | string[];',
  'const isAuthoringPreview = __DEV__ && first(params.previewMode) === "authoring_v1";',
  "buildLearningV2AuthoringDevicePreviewV1",
  "if (isAuthoringPreview) {",
  "preview_only_no_learner_writes",
  "!isAuthoringPreview &&",
  "isAuthoringPreview ? null : audioPreload",
  "resolveLearningV2AuthoringPreviewSpeechTextV1",
  "speakPreviewAudio",
  'language: "en-US"',
] as const;

for (const contract of requiredPlayerContracts) {
  assert.ok(player.includes(contract), `missing player preview contract: ${contract}`);
}

assert.ok(
  route.includes('first(params.previewMode) === "authoring_v1"'),
  "authoring preview must bypass the learner energy gate",
);
assert.ok(
  route.includes("previewMode?: string | string[];"),
  "the session route must accept the DEV preview discriminator",
);

process.stdout.write("LEARNING V2 AUTHORING DEVICE PREVIEW PLAYER: PASS\n");
