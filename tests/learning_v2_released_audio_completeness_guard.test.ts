// зачем (координатор 15.10, страховка Ревизора перед подъёмом потолка урока 1): статически доказать, что КАЖДОЕ
// выпущенное занятие (≤ потолка) прозвучит записанными голосами из самой сборки — без сети (D47) и без голоса телефона.
// Ловит до EAS ровно те дыры, что всплыли 15.10 только на разборе: «I am free.» в s04/s06/s08 и слова s45
// без голоса ash (строгая подготовка → fail(word_audio_missing), s45–s56 не открываются).
//
// Проверяется тем же кодом, что у плеера:
//  • фразы — материал занятия собирается (bundledLearningV2CourseSessionMaterialV3; задания без записи допускаются
//    только по утверждённой таблице пропусков — иначе материал null), и каждый файл его озвучки лежит в наборе сборки;
//  • слова карточек всех занятий ≤ текущего (как в подготовке занятия, client_v3) — запись голосом ash есть в таблице
//    озвучки и файл лежит в наборе сборки (app/learning_v2_bootstrap_audio_assets_v1.generated.ts + папка на диске).
// Красный — со списком «занятие → слово/фраза → голос». Чинить контент/запись/набор, а не ослаблять сторожа.
jest.mock("@react-native-firebase/app", () => ({ getApp: jest.fn(() => ({})) }));
jest.mock("@react-native-firebase/functions", () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn() }));
jest.mock("../app/cloud_sync", () => ({ ensureAnonUser: jest.fn(async () => "stable-1") }));
jest.mock("../app/stable_id", () => ({ peekStableId: jest.fn(() => "stable-1") }));
jest.mock("../app/learning_v2_course_session_audio_preload_v1", () => ({
  preloadLearningV2CourseSessionAudioV1: jest.fn(),
  isLearningV2CourseSessionAudioPreloadHandleV1: jest.fn(() => true),
  getLearningV2CourseSessionAudioPreloadSummaryV1: jest.fn(),
}));
jest.mock("../app/learning_v2_bootstrap_audio_assets_v1.generated", () => {
  // Ассеты mp3 в jest не грузятся — читаем таблицу набора как текст, сам файл проверяется на диске ниже.
  const fsModule = jest.requireActual("node:fs") as typeof import("node:fs");
  const pathModule = jest.requireActual("node:path") as typeof import("node:path");
  const text = fsModule.readFileSync(
    pathModule.join(__dirname, "..", "app", "learning_v2_bootstrap_audio_assets_v1.generated.ts"),
    "utf8",
  );
  const entries = [...text.matchAll(/contentHash: "([0-9a-f]{64})", byteSize: (\d+)/gu)].map((match) => ({
    contentHash: match[1],
    byteSize: Number(match[2]),
  }));
  return { LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1: entries };
});

/* eslint-disable import/first -- native/transport seams are mocked first */
import fs from "node:fs";
import path from "node:path";
import { LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1 } from "../app/learning_v2_bootstrap_audio_assets_v1.generated";
import { bundledLearningV2CourseSessionMaterialV3 } from "../app/learning_v2_course_released_session_client_v3";
import { learningV2FactoryRemoteAudioFileForTranscriptVoiceV1 } from "../app/learning_v2_factory_production_audio_v1";
import { LEARNING_V2_RELEASED_SESSION_COUNT_V1 } from "../app/learning_v2_session_availability_v1";
import {
  factoryNativeSessionWordEncountersV1,
} from "../modules/learning-v2/content/factory_native/factory_native_course_v1";
/* eslint-enable import/first */

const LOG = "[V2-AUDIO-COMPLETE]";
const WORD_VOICE = "ash" as const;
const BOOTSTRAP_DIRECTORY = path.join(__dirname, "..", "assets", "audio", "learning-v2-bootstrap-v1");

const bundled = new Map<string, number>(
  LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1.map((entry) => [entry.contentHash, entry.byteSize] as const),
);

/** Все contentHash внутри озвучки материала (fullPhraseFiles/selectables[].files и т. п.). */
function collectAudioFiles(value: unknown, into: Map<string, string>): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAudioFiles(item, into));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.contentHash === "string" && typeof record.voiceId === "string") {
    into.set(record.contentHash, String(record.voiceId));
  }
  Object.values(record).forEach((child) => collectAudioFiles(child, into));
}

function bundleProblem(contentHash: string): string | null {
  const byteSize = bundled.get(contentHash);
  if (byteSize === undefined) return "нет в наборе сборки";
  const file = path.join(BOOTSTRAP_DIRECTORY, `${contentHash}.mp3`);
  if (!fs.existsSync(file)) return "нет файла в папке набора";
  if (fs.statSync(file).size !== byteSize) return "размер файла не совпадает";
  return null;
}

describe("Learning V2 released sessions: complete recorded audio inside the build", () => {
  test("every released session's phrases and word cards are recorded and bundled", () => {
    // зачем: перед подъёмом потолка можно заранее увидеть все дыры до занятия N —
    // LEARNING_V2_AUDIO_COMPLETE_THROUGH=56 npm run test:one -- tests/learning_v2_released_audio_completeness_guard.test.ts
    const probeThrough = Number(process.env.LEARNING_V2_AUDIO_COMPLETE_THROUGH ?? "");
    const ceiling = Number.isInteger(probeThrough) && probeThrough > 0 ? probeThrough : LEARNING_V2_RELEASED_SESSION_COUNT_V1;
    const problems: string[] = [];
    const checkedWords = new Set<string>();
    let phraseFiles = 0;
    for (let sessionOrdinal = 1; sessionOrdinal <= ceiling; sessionOrdinal += 1) {
      const where = `s${String(sessionOrdinal).padStart(2, "0")}`;
      const material = bundledLearningV2CourseSessionMaterialV3({
        environment: "production",
        targetLanguage: "en",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        seasonId: "learning-v2",
        lessonOrdinal: 1,
        sessionOrdinal,
        activeRootFingerprint: "0".repeat(64),
      } as never);
      if (!material) {
        problems.push(`${where} → материал не собирается (фраза без записи вне таблицы пропусков) → см. [V2-BUNDLED] выше`);
      } else {
        const files = new Map<string, string>();
        collectAudioFiles(material.audioChild, files);
        phraseFiles += files.size;
        for (const [contentHash, voiceId] of files) {
          const problem = bundleProblem(contentHash);
          if (problem) problems.push(`${where} → фраза ${contentHash.slice(0, 12)} → ${voiceId} → ${problem}`);
        }
      }
      // Слова: подготовка занятия sN берёт карточки ВСЕХ занятий ≤ N (client_v3) — каждое слово проверяем один раз.
      const encounters = factoryNativeSessionWordEncountersV1({
        lessonOrdinal: 1,
        sessionOrdinal,
        interfaceLocale: "ru",
      }) ?? [];
      for (const encounter of encounters) {
        const text = encounter.save.targetText;
        if (checkedWords.has(text)) continue;
        checkedWords.add(text);
        const file = learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(text, WORD_VOICE);
        if (!file) {
          problems.push(`${where} → слово «${text}» → ${WORD_VOICE} → нет записи в таблице озвучки`);
          continue;
        }
        const problem = bundleProblem(file.contentHash);
        if (problem) problems.push(`${where} → слово «${text}» → ${WORD_VOICE} → ${problem}`);
      }
    }
    console.log(`${LOG} ${JSON.stringify({
      ceiling,
      bundledFiles: bundled.size,
      phraseFiles,
      words: checkedWords.size,
      problems: problems.length,
    })}`);
    // Каждая дыра отдельной строкой с меткой — её вытаскивают ворота scripts/learning_v2_audio_coverage_gate.mjs.
    for (const problem of problems) console.log(`${LOG} gap ${problem}`);
    expect(problems).toEqual([]);
  });
});
