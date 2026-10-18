// зачем (владелец 18.10 07:29: выкладку звука делает Ядро): выкладчик кладёт объект ровно туда, где его ищет клиент,
// тихие записи не выкладывает, повтор хеша не дублирует, а битый источник ловится локально ДО сети.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { STORAGE_AUDIO_PACK, buildStorageAudioPlan, canonicalHash, localSourceProblem, storageObjectPathFor } from "../scripts/learning_v2_storage_audio_plan.mjs";

const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const row = (transcript, voiceId, contentHash, byteSize, assetPath) =>
  `  Object.freeze({ transcript: ${JSON.stringify(transcript)}, voiceId: "${voiceId}" as const, contentHash: "${contentHash}", byteSize: ${byteSize}, assetPath: ${JSON.stringify(assetPath)} }),`;

test("путь объекта = формула клиента (fileInputForEntry)", () => {
  const entry = { transcript: "A key.", voiceId: "ash", contentHash: "a".repeat(64) };
  assert.equal(STORAGE_AUDIO_PACK, canonicalHash({ schemaVersion: "learning-v2-factory-production-audio-pack.v1" }));
  assert.equal(storageObjectPathFor(entry), `learning-v2/voice-audio/${STORAGE_AUDIO_PACK}/${canonicalHash({ transcript: "A key." })}/${canonicalHash({ voiceId: "ash" })}/${"a".repeat(64)}.mp3`);
});

test("план: тихие исключены, повтор хеша один раз, кавычки в тексте разобраны", () => {
  const moduleText = [row('He said "hi".', "nova", "b".repeat(64), 10, "assets/b.mp3"), row("Dup", "onyx", "c".repeat(64), 11, "assets/c.mp3"), row("Silent", "coral", "d".repeat(64), 12, "assets/d.mp3")].join("\n");
  const plan = buildStorageAudioPlan({
    manifestEntries: [{ transcript: "Dup", voiceId: "onyx", contentHash: "c".repeat(64), byteSize: 11, assetPath: "assets/manifest_c.mp3" }],
    singleVoiceModuleText: moduleText,
    silentHashes: new Set(["d".repeat(64)]),
  });
  assert.deepEqual(plan.map((entry) => [entry.contentHash[0], entry.source]), [["c", "manifest"], ["b", "single-voice"]]);
  assert.equal(plan[1].transcript, 'He said "hi".');
  assert.equal(plan[1].objectPath, storageObjectPathFor(plan[1]));
});

test("локальная сверка: годный файл → null; нет файла, чужой размер или sha → причина", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "v2sap-"));
  const bytes = Buffer.from("mp3-bytes");
  fs.writeFileSync(path.join(dir, "ok.mp3"), bytes);
  const good = { assetPath: "ok.mp3", byteSize: bytes.byteLength, contentHash: sha(bytes) };
  assert.equal(localSourceProblem(dir, good), null);
  assert.match(localSourceProblem(dir, { ...good, assetPath: "none.mp3" }), /нет файла/);
  assert.match(localSourceProblem(dir, { ...good, byteSize: 1 }), /размер/);
  assert.match(localSourceProblem(dir, { ...good, contentHash: "0".repeat(64) }), /sha256/);
});
