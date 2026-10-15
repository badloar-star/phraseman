import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
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
  'const previewMode = first(params.previewMode);',
  'previewMode === "authoring_v1" || isDevUnlockedDraftPreview',
  "if (isAuthoringPreview) {",
  "preview_only_no_learner_writes",
  "!isAuthoringPreview &&",
  "isAuthoringPreview ? null : audioPreload",
  "speakPreviewAudio",
  // Ревизор 15.10: язык предпросмотра — язык курса (тот же, что у распознавания); у английского курса это по-прежнему en-US
  'language: previewSpeechLocaleRef.current',
  'previewSpeechLocaleRef.current = voiceRecognitionLocale;',
] as const;

// зачем (координатор §47, 2026-10-01): просмотр играет занятия встроенного релиза
// (D150) — сборка авторского пакета и отдельный TTS-резолвер из плеера убраны.
// Главная гарантия режима — ни одной записи в прогресс ученика — в силе:
assert.ok(player.includes("autoHydrate: !isAuthoringPreview,"));
assert.ok(player.includes("persistenceEnabled: !isAuthoringPreview,"));
for (const contract of requiredPlayerContracts) {
  assert.ok(player.includes(contract), `missing player preview contract: ${contract}`);
}

// Гейт энергии маршрута узнаёт просмотр по тому же признаку и пропускает его целиком.
assert.ok(
  route.includes('(previewMode === "authoring_v1" || previewMode === "dev_unlocked_drafts_v1")'),
  "the route must recognise the DEV authoring preview",
);
assert.ok(
  route.includes("if (isAuthoringPreview) return <>{children}</>;"),
  "authoring preview must bypass the learner energy gate",
);
assert.ok(
  route.includes("previewMode?: string | string[];"),
  "the session route must accept the DEV preview discriminator",
);

process.stdout.write("LEARNING V2 AUTHORING DEVICE PREVIEW PLAYER: PASS\n");
}

if (typeof test === "function") {
  test("learning_v2_authoring_device_preview_player_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
