#!/usr/bin/env node
import fs from "node:fs";

const files = [
  ["app/learning_v2_session1_production_audio_v1.ts", "learningV2Session1BundledAudioModuleForObjectPathV1"],
  ["app/learning_v2_es_session1_production_audio_v1.ts", "learningV2EsSession1BundledAudioModuleForObjectPathV1"],
  ["app/learning_v2_es_session2_production_audio_v1.ts", "learningV2EsSession2BundledAudioModuleForObjectPathV1"],
];
for (const [file, resolver] of files) {
  let source = fs.readFileSync(file, "utf8");
  source = source.replace(/\r?\n  assetModule: number;/u, "");
  source = source.replace(/, assetModule: require\("[^"]+\.mp3"\)/gu, "");
  source = source.replace(/\r?\nconst moduleByContentHash = new Map\([\s\S]*?\r?\n\);\r?\n/u, "\n");
  const resolverPattern = new RegExp(`\\r?\\nexport function ${resolver}\\([\\s\\S]*?\\r?\\n\\}\\r?\\n`, "u");
  source = source.replace(resolverPattern, "\n");
  if (/assetModule|require\([^\n]+\.mp3["']\)/u.test(source))
    throw new Error(`learning_v2_small_audio_migration_incomplete:${file}`);
  fs.writeFileSync(file, source, "utf8");
}
console.log(`PASS: migrated ${files.length} metadata modules`);
