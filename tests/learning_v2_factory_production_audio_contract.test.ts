import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync("app/learning_v2_course_released_session_client_v3.ts", "utf8");
const preload = readFileSync("app/learning_v2_course_session_audio_preload_v1.ts", "utf8");
const factoryAudio = readFileSync("app/learning_v2_factory_production_audio_v1.ts", "utf8");
const generator = readFileSync("scripts/generate_learning_v2_factory_production_audio.mjs", "utf8");

assert.match(client, /buildLearningV2FactoryBundledAudioChildV1\(factory\.learnerChild\)/);
assert.match(client, /audioDelivery: audioChild \? "published_mp3" as const : "device_speech" as const/);
assert.match(preload, /learningV2FactoryBundledAudioModuleForObjectPathV1/);
assert.match(preload, /all_selected_mp3_verified_before_session_start/);
assert.match(factoryAudio, /\["ash", "onyx", "nova", "coral"\]/);
assert.match(factoryAudio, /payload\?\.family === "sound_contrast"/);
assert.match(generator, /https:\/\/api\.openai\.com\/v1\/audio\/speech/);
assert.match(generator, /requireCodexOpenAiTtsOnly/);
assert.match(generator, /PHRASEMAN_ALLOW_OPENAI_DEV_SPEND|requireOpenAiDevSpendGuard/);
assert.match(generator, /64 \* 1024/);

console.log("LEARNING V2 FACTORY PRODUCTION AUDIO CONTRACT: PASS");
