import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string): string =>
  readFileSync(resolve(root, path), "utf8");
const findings: string[] = [];

const registryPath = "app/learning_v2_session1_production_audio_v1.ts";
if (!existsSync(resolve(root, registryPath))) {
  findings.push(`missing_registry:${registryPath}`);
} else {
  const registry = read(registryPath);
  const requires = registry.match(/require\([^\n]+\.mp3["']\)/gu) ?? [];
  if (requires.length !== 24) findings.push(`static_mp3_require_count:${requires.length}`);
  for (const voice of ["ash", "onyx", "nova", "coral"]) {
    if (!registry.includes(`voiceId: "${voice}"`)) findings.push(`voice_missing:${voice}`);
  }
  for (const transcript of ["I", "am", "here", "ready", "I am here", "I am ready"]) {
    if (!registry.includes(`transcript: ${JSON.stringify(transcript)}`)) {
      findings.push(`transcript_missing:${transcript}`);
    }
  }
  if (!registry.includes("buildLearningV2Session1BundledAudioChildV1")) {
    findings.push("audio_child_builder_missing");
  }
  if (!registry.includes("learningV2Session1BundledAudioModuleForObjectPathV1")) {
    findings.push("bundled_module_resolver_missing");
  }
}

const client = read("app/learning_v2_course_released_session_client_v3.ts");
if (client.includes("interactions: [],")) findings.push("bundled_audio_child_still_empty");
if (!client.includes("buildLearningV2Session1BundledAudioChildV1")) {
  findings.push("bundled_audio_child_not_bound");
}
if (client.includes("!audioComplete && !__DEV__")) {
  findings.push("dev_audio_completeness_bypass_present");
}

const preload = read("app/learning_v2_course_session_audio_preload_v1.ts");
if (!preload.includes("learningV2Session1BundledAudioModuleForObjectPathV1")) {
  findings.push("preloader_has_no_bundled_audio_path");
}
if (!preload.includes("Asset.fromModule")) findings.push("bundled_asset_not_preloaded");
if (!preload.includes("await asset.downloadAsync()")) findings.push("asset_not_ready_before_intro");

if (findings.length > 0) {
  throw new Error([
    "LEARNING V2 SESSION 1 PRODUCTION AUDIO GATE: HOLD",
    `total_findings=${findings.length}`,
    ...findings,
  ].join("\n"));
}

process.stdout.write("LEARNING V2 SESSION 1 PRODUCTION AUDIO GATE: PASS\n");
