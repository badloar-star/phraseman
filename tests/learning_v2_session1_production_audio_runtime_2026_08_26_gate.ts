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
      if (!file.objectPath.startsWith("learning-v2/voice-audio/") ||
          !file.objectPath.endsWith(`/${file.contentHash}.mp3`) ||
          file.byteSize < 1) {
        throw new Error(`production_audio_remote_metadata_invalid:${file.objectPath}`);
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
