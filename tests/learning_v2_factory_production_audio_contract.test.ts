import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildLearningV2FactoryBundledAudioChildV1,
  learningV2FactoryRemoteAudioFileForTranscriptVoiceV1,
} from "../app/learning_v2_factory_production_audio_v1";
import { factoryNativeLearningV2AvailabilityV1 } from "../modules/learning-v2/content/factory_native/factory_native_catalog_v1";
import { materializeFactoryNativeLearningV2SessionV1 } from "../modules/learning-v2/content/factory_native/factory_native_course_v1";

const client = readFileSync("app/learning_v2_course_released_session_client_v3.ts", "utf8");
const preload = readFileSync("app/learning_v2_course_session_audio_preload_v1.ts", "utf8");
const factoryAudio = readFileSync("app/learning_v2_factory_production_audio_v1.ts", "utf8");
const generator = readFileSync("scripts/generate_learning_v2_factory_production_audio.mjs", "utf8");
const player = readFileSync("app/learning_v2_direct_session_player_v1.tsx", "utf8");
const lessonPack = readFileSync("app/learning_v2_lesson_audio_pack_v1.ts", "utf8");

assert.match(client, /buildLearningV2FactoryBundledAudioChildV1\(factory\.learnerChild\)/);
assert.doesNotMatch(client, /audioDelivery: audioChild \? "published_mp3" as const : "device_speech" as const/);
assert.match(client, /if \(!audioChild\) return null;/);
assert.match(preload, /resolvePreparedLearningV2VoiceAudioOfflineFileV1/);
assert.doesNotMatch(preload, /downloadLearningV2ActivityAudioBytesV1|Asset\.fromModule/);
assert.match(preload, /all_selected_mp3_verified_before_session_start/);
assert.match(preload, /resolveLearningV2CourseSessionSupplementalAudioV1/);
assert.match(client, /supplementalAudio: Object\.freeze/);
assert.match(client, /audioSummary\.supplementalAudioCount !== supplementalWordAudio\.size/);
assert.match(client, /session\.sessionOrdinal <= locator\.sessionOrdinal/);
assert.doesNotMatch(factoryAudio, /assetModule|BundledAudioModuleForObjectPath/);
assert.match(factoryAudio, /\["ash", "onyx", "nova", "coral"\]/);
assert.match(factoryAudio, /payload\?\.family === "sound_contrast"/);
assert.match(generator, /https:\/\/api\.openai\.com\/v1\/audio\/speech/);
assert.match(generator, /requireCodexOpenAiTtsOnly/);
assert.match(generator, /PHRASEMAN_ALLOW_OPENAI_DEV_SPEND|requireOpenAiDevSpendGuard/);
assert.match(generator, /64 \* 1024/);
assert.match(player, /const allowsDeviceSpeech = isAuthoringPreview;/);
assert.doesNotMatch(player, /material\?\.audioDelivery === "device_speech"/);
assert.match(player, /resolveLearningV2CourseSessionSupplementalAudioV1/);
assert.match(player, /playLocalAudio\(fullPhraseAudio\.fileUri, 0\.72\)/);
assert.match(player, /fullPhraseAudio !== null \|\| previewPracticeSlowSpeechText !== null/);
assert.doesNotMatch(player, /Promise\.all\(words\.map/);
assert.match(player, /managedAudio\.stop\(\);[\s\S]{0,500}setAudioRequest\(\{ fileUri, requestId, rate \}\)/);
assert.match(lessonPack, /export function resolvePreparedLearningV2FactoryWordAudioV1/);
assert.doesNotMatch(lessonPack, /export async function resolvePreparedLearningV2FactoryWordAudioV1/);
assert.match(
  lessonPack,
  /if \(!isCurrentAccountGeneration\(input\.account, input\.stableId\)\)[\s\S]{0,300}preparedFileUriByContentHash\.set/,
);

for (const session of factoryNativeLearningV2AvailabilityV1().sessions) {
  const material = materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: session.lessonOrdinal,
    sessionOrdinal: session.sessionOrdinal,
    interfaceLocale: "ru",
  });
  assert.ok(material, `${session.courseSessionId} must materialize from the released catalog`);
  const audioChild = buildLearningV2FactoryBundledAudioChildV1(material.learnerChild);
  assert.ok(audioChild, `${session.courseSessionId} must never fall back to device speech`);
  for (const interaction of material.learnerChild.interactions) {
    if (interaction.family !== "scripted_repeat_compare") continue;
    const audio = audioChild.interactions.find(
      (candidate) => candidate.interactionId === interaction.interactionId,
    );
    assert.ok(audio?.fullPhraseFiles);
    assert.equal(
      audio.fullPhraseFiles.length,
      4,
      `${interaction.interactionId} must have four published reference voices`,
    );
    const transcript = interaction.modePayload?.family === "scripted_repeat_compare"
      ? interaction.modePayload.referenceAudio?.transcript
      : null;
    assert.ok(transcript);
    for (const file of audio.fullPhraseFiles) {
      assert.equal(
        file.contentHash,
        learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(
          transcript,
          file.voiceId,
        )?.contentHash,
      );
    }
  }
  for (const encounters of Object.values(material.wordEncounterQueuesByInteractionId)) {
    for (const encounter of encounters) {
      for (const voiceId of ["ash", "onyx", "nova", "coral"] as const) {
        assert.ok(
          learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(
            encounter.save.targetText,
            voiceId,
          ),
          `${encounter.lexicalItemId} must have a published ${voiceId} word recording`,
        );
      }
    }
  }
}
assert.doesNotMatch(player, /onSpeak=\{\(text, options\) => \{\s*speakPreviewAudio/u);
assert.match(player, /resolvePreparedLearningV2FactoryWordAudioV1/);
assert.match(player, /preparedWordAudioByText\[normalized\]/);
assert.match(
  player,
  /preparedWordAudioByText\[normalized\]\s*\?\? resolvePreparedLearningV2FactoryWordAudioV1\(normalized\)/,
);

console.log("LEARNING V2 FACTORY PRODUCTION AUDIO CONTRACT: PASS");
