import crypto from "node:crypto";
import fs from "node:fs";

// Metro normally resolves static audio requires. This narrow Node gate keeps
// the exact filename so the immutable manifest bytes can be verified too.
(require as NodeJS.Require).extensions[".mp3"] = (module, filename) => {
  (module as NodeJS.Module & { exports: unknown }).exports = filename;
};

async function main(): Promise<void> {
  const audio = await import("../app/learning_v2_session1_production_audio_v1");
  const { EPISODE_01_SESSION_01_SOURCE } = await import(
    "../modules/learning-v2/content/source/episode_01_session_01_v1"
  );
  const { buildSessionShardFromSource } = await import(
    "../modules/learning-v2/content/source/session_shard_from_source_v1"
  );
  const { buildSessionChildBodiesFromShard } = await import(
    "../modules/learning-v2/content/source/session_package_from_shard_v1"
  );

  if (audio.LEARNING_V2_SESSION1_PRODUCTION_AUDIO_ENTRY_COUNT_V1 !== 24) {
    throw new Error("production_audio_entry_count_invalid");
  }
  const children = buildSessionChildBodiesFromShard(
    buildSessionShardFromSource(EPISODE_01_SESSION_01_SOURCE),
    "ru",
    "lesson-01:session:01",
  );
  const child = audio.buildLearningV2Session1BundledAudioChildV1(
    children.learner,
  );
  if (child.interactionCount !== 11) {
    throw new Error(`production_audio_interaction_count:${child.interactionCount}`);
  }
  const seenVoices = new Set<string>();
  for (const interaction of child.interactions) {
    if (!interaction.fullPhraseFiles || interaction.fullPhraseFiles.length !== 4) {
      throw new Error(`production_audio_missing_phrase:${interaction.interactionId}`);
    }
    for (const file of interaction.fullPhraseFiles) {
      seenVoices.add(file.voiceId);
      const assetPath = audio.learningV2Session1BundledAudioModuleForObjectPathV1(
        file.objectPath,
      ) as unknown;
      if (typeof assetPath !== "string" || !fs.existsSync(assetPath)) {
        throw new Error(`production_audio_asset_unresolved:${file.objectPath}`);
      }
      const bytes = fs.readFileSync(assetPath);
      const hash = crypto.createHash("sha256").update(bytes).digest("hex");
      if (bytes.length !== file.byteSize || hash !== file.contentHash) {
        throw new Error(`production_audio_byte_receipt_mismatch:${assetPath}`);
      }
    }
  }
  if ([...seenVoices].sort().join("|") !== "ash|coral|nova|onyx") {
    throw new Error(`production_audio_voice_set:${[...seenVoices].join("|")}`);
  }
  process.stdout.write(
    "LEARNING V2 SESSION 1 PRODUCTION AUDIO RUNTIME GATE: PASS\n",
  );
}

void main();
