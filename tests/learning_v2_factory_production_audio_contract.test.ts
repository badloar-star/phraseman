import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
jest.mock("@react-native-firebase/app", () => ({ getApp: jest.fn(() => ({})) }));
jest.mock("@react-native-firebase/functions", () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn() }));
jest.mock("../app/cloud_sync", () => ({ ensureAnonUser: jest.fn(async () => "stable-1") }));
jest.mock("../app/stable_id", () => ({ peekStableId: jest.fn(() => "stable-1") }));
jest.mock("../app/learning_v2_course_session_audio_preload_v1", () => ({
  preloadLearningV2CourseSessionAudioV1: jest.fn(),
  isLearningV2CourseSessionAudioPreloadHandleV1: jest.fn(() => true),
  getLearningV2CourseSessionAudioPreloadSummaryV1: jest.fn(),
}));

import {
  learningV2FactoryMissingAudioInteractionIdsV1,
  learningV2FactoryRemoteAudioFileForTranscriptVoiceV1,
  learningV2FactoryWordAudioFileV1,
} from "../app/learning_v2_factory_production_audio_v1";
import { FACTORY_SINGLE_VOICE_ASSIGNMENTS_V1 } from "../app/learning_v2_factory_single_voice_v1.generated";
import { bundledLearningV2CourseSessionMaterialV3 } from "../app/learning_v2_course_released_session_client_v3";
import { LEARNING_V2_RELEASED_SESSION_COUNT_V1 } from "../app/learning_v2_session_availability_v1";
import { factoryNativeLearningV2AvailabilityV1 } from "../modules/learning-v2/content/factory_native/factory_native_catalog_v1";
import { materializeFactoryNativeLearningV2SessionV1 } from "../modules/learning-v2/content/factory_native/factory_native_course_v1";

// зачем (координатор §46, 2026-10-01): файл был сценарием из голых assert без
// единого test(), и jest его не исполнял («must contain at least one test») —
// контракт фактически не проверялся. Тело обёрнуто в один test без изменений.
test("factory production audio contract", () => {
const client = readFileSync("app/learning_v2_course_released_session_client_v3.ts", "utf8");
const preload = readFileSync("app/learning_v2_course_session_audio_preload_v1.ts", "utf8");
const factoryAudio = readFileSync("app/learning_v2_factory_production_audio_v1.ts", "utf8");
const generator = readFileSync("scripts/generate_learning_v2_factory_production_audio.mjs", "utf8");
const player = readFileSync("app/learning_v2_direct_session_player_v1.tsx", "utf8");
const lessonPack = readFileSync("app/learning_v2_lesson_audio_pack_v1.ts", "utf8");

assert.match(client, /buildLearningV2FactoryBundledAudioChildV1\(factory\.learnerChild\)/);
assert.doesNotMatch(client, /resolveLearningV2FactoryRuntimeAudioOmissionsV1/);
assert.match(client, /recorded_mp3_first_with_device_speech_fallback/);
assert.match(client, /if \(!__DEV__\) return null;\s*return bundledSessionMaterial\(locatorInput, true\);/);
assert.doesNotMatch(client, /null step=audio_omission_policy|null step=audio_omission_materialize/);
assert.match(preload, /resolvePreparedLearningV2VoiceAudioOfflineFileV1/);
assert.doesNotMatch(preload, /downloadLearningV2ActivityAudioBytesV1|Asset\.fromModule/);
assert.match(preload, /all_selected_mp3_verified_before_session_start/);
assert.match(preload, /resolveLearningV2CourseSessionSupplementalAudioV1/);
assert.match(client, /supplementalAudio: Object\.freeze/);
assert.match(client, /audioSummary\.supplementalAudioCount !== supplementalWordAudio\.size/);
assert.match(client, /session\.sessionOrdinal <= locator\.sessionOrdinal/);
assert.doesNotMatch(client, /fail\("word_audio_missing"/);
assert.doesNotMatch(factoryAudio, /assetModule|BundledAudioModuleForObjectPath/);
assert.match(factoryAudio, /\["ash", "onyx", "nova", "coral"\]/);
assert.match(factoryAudio, /payload\?\.family === "sound_contrast"/);
assert.match(factoryAudio, /materializePartialLearningV2CourseSessionAudioChildV1/);
assert.match(factoryAudio, /entry\?\.transcript === transcript/);
assert.match(generator, /https:\/\/api\.openai\.com\/v1\/audio\/speech/);
assert.match(generator, /requireCodexOpenAiTtsOnly/);
assert.match(generator, /PHRASEMAN_ALLOW_OPENAI_DEV_SPEND|requireOpenAiDevSpendGuard/);
assert.match(generator, /64 \* 1024/);
// зачем (D47, владелец): TTS телефона теперь разрешён ВСЕГДА, не только в
// дев-превью автора — способов скачать недостающую озвучку V2 больше нет,
// значит единственная замена тишине это системный TTS для любого ученика.
assert.match(player, /const allowsDeviceSpeech = true;/);
assert.doesNotMatch(player, /material\?\.audioDelivery === "device_speech"/);
assert.match(player, /resolveLearningV2CourseSessionSupplementalAudioV1/);
assert.match(player, /playLocalAudio\(fullPhraseAudio\.fileUri, 0\.72\)/);
assert.match(player, /fullPhraseAudio !== null \|\| previewPracticeSlowSpeechText !== null/);
assert.match(
  player,
  /resolveLearningV2CourseSessionSelectableAudioV1\([\s\S]{0,500}?if \(selectableAudio\) \{[\s\S]{0,200}?playLocalAudio\(selectableAudio\.fileUri\)/,
);
assert.doesNotMatch(player, /Promise\.all\(words\.map/);
assert.match(player, /managedAudio\.stop\(\);[\s\S]{0,500}setAudioRequest\(\{ fileUri, requestId, rate \}\)/);
assert.match(lessonPack, /export function resolvePreparedLearningV2FactoryWordAudioV1/);
assert.doesNotMatch(lessonPack, /export async function resolvePreparedLearningV2FactoryWordAudioV1/);
assert.match(
  lessonPack,
  /if \(!isCurrentAccountGeneration\(input\.account, input\.stableId\)\)[\s\S]{0,300}preparedFileUriByContentHash\.set/,
);

// зачем (20.10, класс А): после выпуска L10S06 в V2 доступно 510 занятий.
assert.equal(LEARNING_V2_RELEASED_SESSION_COUNT_V1, 510);
const activeSessions = factoryNativeLearningV2AvailabilityV1().sessions.filter(
  (candidate) => candidate.lessonOrdinal >= 1,
);
assert.equal(activeSessions.length, LEARNING_V2_RELEASED_SESSION_COUNT_V1);
for (const session of activeSessions) {
  const rawMaterial = materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: session.lessonOrdinal,
    sessionOrdinal: session.sessionOrdinal,
    interfaceLocale: "ru",
  });
  assert.ok(rawMaterial, `${session.courseSessionId} must materialize from the released catalog`);
  const material = bundledLearningV2CourseSessionMaterialV3({
    environment: "production",
    targetLanguage: "en",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    seasonId: "learning-v2",
    lessonOrdinal: session.lessonOrdinal,
    sessionOrdinal: session.sessionOrdinal,
    activeRootFingerprint: "0".repeat(64),
  } as never);
  assert.ok(material, `${session.courseSessionId} must materialize through the public bundled runtime`);
  const rawInteractionIds = rawMaterial.learnerChild.interactions.map((interaction) => interaction.interactionId);
  const publicInteractionIds = material.learnerChild.interactions.map((interaction) => interaction.interactionId);
  assert.deepEqual(
    publicInteractionIds,
    rawInteractionIds,
    `${session.courseSessionId} must preserve every learner interaction even when audio is missing`,
  );
  assert.equal(material.audioDelivery, "recorded_mp3_first_with_device_speech_fallback");
  const audioChild = material.audioChild;
  assert.ok(audioChild, `${session.courseSessionId} must expose its recorded subset`);
  assert.equal(audioChild.remoteTtsFallbackDuringSession, false);
  const expectedAudioInteractionIds = material.learnerChild.interactions
    .filter((interaction) => interaction.audioTargetIds.length > 0)
    .map((interaction) => interaction.interactionId);
  const missingAudioInteractionIds = learningV2FactoryMissingAudioInteractionIdsV1(
    material.learnerChild,
  );
  if (session.lessonOrdinal === 1 && session.sessionOrdinal <= 5) {
    assert.deepEqual(
      missingAudioInteractionIds,
      [],
      `${session.courseSessionId} is launch-seed audio and must remain fully recorded`,
    );
  }
  assert.deepEqual(
    audioChild.interactions.map((interaction) => interaction.interactionId),
    expectedAudioInteractionIds.filter((interactionId) => !missingAudioInteractionIds.includes(interactionId)),
    `${session.courseSessionId} audio child must contain exactly the complete recorded interactions`,
  );
  for (const audio of audioChild.interactions) {
    const interaction = material.learnerChild.interactions.find(
      (candidate) => candidate.interactionId === audio.interactionId,
    );
    assert.ok(interaction);
    const assigned = FACTORY_SINGLE_VOICE_ASSIGNMENTS_V1[interaction.interactionId];
    if (session.lessonOrdinal === 1 && session.sessionOrdinal <= 5) {
      assert.ok(assigned, `${interaction.interactionId} launch-seed audio must keep its explicit assignment`);
    }
    const taskVoices = (audio.fullPhraseFiles ?? audio.selectables[0]?.files ?? [])
      .map((file) => file.voiceId);
    assert.ok(taskVoices.length > 0, `${interaction.interactionId} must resolve recorded task audio`);
    assert.equal(new Set(taskVoices).size, taskVoices.length);
    if (assigned) assert.deepEqual(taskVoices, [assigned.voice]);
    const payload = interaction.modePayload;
    if (payload?.family === "sound_contrast") {
      const references = [payload.audioA, payload.audioB];
      assert.equal(audio.fullPhraseFiles, null);
      assert.equal(audio.selectables.length, references.length);
      for (const [index, selectable] of audio.selectables.entries()) {
        const reference = references[index];
        assert.ok(reference);
        assert.equal(selectable.audioTargetId, reference.audioTargetId);
        assert.deepEqual(selectable.files.map((file) => file.voiceId), taskVoices);
        for (const file of selectable.files) {
          if (assigned) {
            assert.equal(file.contentHash, assigned.clips[reference.transcript]);
          }
          assert.equal(
            file.contentHash,
            learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(
              reference.transcript,
              file.voiceId,
            )?.contentHash,
          );
        }
      }
      continue;
    }
    const reference = payload && "referenceAudio" in payload ? payload.referenceAudio : null;
    assert.ok(reference);
    assert.ok(audio.fullPhraseFiles);
    assert.deepEqual(audio.fullPhraseFiles.map((file) => file.voiceId), taskVoices);
    assert.deepEqual(audio.selectables, []);
    for (const file of audio.fullPhraseFiles) {
      if (assigned) {
        assert.equal(file.contentHash, assigned.clips[reference.transcript]);
      }
      assert.equal(
        file.contentHash,
        learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(
          reference.transcript,
          file.voiceId,
        )?.contentHash,
      );
    }
  }
  for (const encounters of Object.values(material.factoryWordEncounterQueues ?? {})) {
    for (const encounter of encounters) {
      if (session.lessonOrdinal === 1 && session.sessionOrdinal <= 5)
        assert.ok(
          learningV2FactoryWordAudioFileV1(encounter.save.targetText),
          `${encounter.lexicalItemId} in launch-seed audio must have a word recording`,
        );
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
assert.match(
  player,
  /if \(fileUri\) \{\s*playLocalAudio\(fileUri\);\s*return;\s*\}\s*speakPreviewText\(normalized, `word-pocket:\$\{normalized\}`\)/,
);
assert.match(
  player,
  /if \(currentNewWordAudioUri\) playLocalAudio\(currentNewWordAudioUri\);\s*else\s*speakPreviewText\(/,
);

console.log("LEARNING V2 FACTORY PRODUCTION AUDIO CONTRACT: PASS");
});
