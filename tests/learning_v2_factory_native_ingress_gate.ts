import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const walkSource = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory()
    ? walkSource(path.join(directory, entry.name))
    : /\.[cm]?[jt]sx?$/u.test(entry.name) ? [path.join(directory, entry.name)] : []);

const activeAppSources = walkSource(path.join(root, "app"));
const retiredEnglishImportPath = /(?:content\/source\/(?:authored_sessions_v1|episode_01_session_\d+|lesson1_session_choreography_v1|lesson1_distractor_catalog_v2)|learning_v2_session1_production_audio_v1|preview\/authoring_device_preview)/u;
for (const file of activeAppSources) {
  const source = fs.readFileSync(file, "utf8");
  const importPaths = [...source.matchAll(/(?:from\s+|import\()\s*["']([^"']+)["']/gu)]
    .map((match) => match[1]);
  assert.equal(
    /authoredLearningV2SessionShard|learningV2AuthoringDevicePreviewRowsV1|authoring_device_preview_v1/u.test(source),
    false,
    `${path.relative(root, file)} must not import retired English session material`,
  );
  assert.equal(
    importPaths.some((importPath) => retiredEnglishImportPath.test(importPath)),
    false,
    `${path.relative(root, file)} must not import a retired English payload path`,
  );
}

for (const relativeDirectory of [
  "modules/learning-v2/runtime",
  "modules/learning-v2/progress",
]) for (const file of walkSource(path.join(root, relativeDirectory))) {
  const source = fs.readFileSync(file, "utf8");
  const importPaths = [...source.matchAll(/(?:from\s+|import\()\s*["']([^"']+)["']/gu)]
    .map((match) => match[1]);
  assert.equal(importPaths.some((importPath) => retiredEnglishImportPath.test(importPath)), false,
    `${path.relative(root, file)} must not import a retired English payload path`);
}

const v3 = read("app/learning_v2_course_released_session_client_v3.ts");
assert.match(v3, /if \(locator\.targetLanguage === "en"\)[\s\S]*materializeFactoryNativeLearningV2SessionV1/u);
assert.match(v3, /if \(targetLanguage === "es"\)[\s\S]*authoredEsLearningV2SessionShard/u);
assert.doesNotMatch(v3, /authoredLearningV2SessionShard/u);
assert.doesNotMatch(v3, /targetLanguage\s*!==\s*"es"[\s\S]{0,200}authored/u);

const reward = read("modules/learning-v2/progress/learning_session_rune_reward_composite_v1.ts");
assert.match(reward, /factoryNativeLearningV2InitialRewardBindingV1/u);
assert.doesNotMatch(reward, /authored_sessions_v1|session_package_from_shard_v1/u);

const route = read("app/learning-v2/session/[id].tsx");
assert.match(route, /studyTarget === "en" \|\| first\(params\.runtimeMode\) === "direct_v1"/u);
assert.equal((route.match(/previewMode === "dev_unlocked_drafts_v1"/gu) ?? []).length >= 1, true);
const preview = read("app/_learning_v2_authoring_preview.tsx");
assert.match(preview, /factoryNativeLearningV2AvailabilityV1/u);
assert.doesNotMatch(preview, /authoring_device_preview/u);

console.log("Learning V2 factory native ingress gate: PASS");
