// зачем (владелец 18.10 07:29: выкладку звука делает Ядро): выкладчик кладёт объект ровно туда, где его ищет клиент,
// тихие записи не выкладывает, повтор хеша не дублирует, а битый источник ловится локально ДО сети.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { STORAGE_AUDIO_PACK, buildStorageAudioPlan, canonicalHash, localSourceProblem, loadRuntimeAudioSelection, storageObjectPathFor, selectStorageAudioPlan } from "../scripts/learning_v2_storage_audio_plan.mjs";

const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const row = (transcript, voiceId, contentHash, byteSize, assetPath) =>
  `  Object.freeze({ transcript: ${JSON.stringify(transcript)}, voiceId: "${voiceId}" as const, contentHash: "${contentHash}", byteSize: ${byteSize}, assetPath: ${JSON.stringify(assetPath)} }),`;

function runtimeSelectionFixture(t, overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "v2-selection-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "app"), { recursive: true });
  fs.writeFileSync(path.join(root, "app/learning_v2_bundle_availability_v1.generated.ts"), "export const LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = 2;\n");
  fs.writeFileSync(path.join(root, "source.txt"), "current runtime source\n");
  const contentHash = "a".repeat(64);
  const selection = {
    schemaVersion: "learning-v2-runtime-audio-selection.v1",
    inputDigests: { "source.txt": sha(fs.readFileSync(path.join(root, "source.txt"))) },
    ceiling: 2,
    builtSessions: 2,
    problems: [],
    required: { [contentHash]: ["l01s01"] },
    ...overrides,
  };
  const selectionPath = path.join(root, "selection.json");
  fs.writeFileSync(selectionPath, JSON.stringify(selection));
  return { root, selectionPath, contentHash };
}

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

test("выкладка только записей текущих занятий; неизвестный обязательный файл останавливает её", () => {
  const used = { contentHash: "a".repeat(64) }, unused = { contentHash: "b".repeat(64) };
  assert.deepEqual(selectStorageAudioPlan([used, unused], new Set([used.contentHash])), [used]);
  assert.throws(() => selectStorageAudioPlan([unused], new Set([used.contentHash])), /no local entry/);
});

test("runtime selection: старый чистый отчёт и только явные Storage-пробелы допускаются к выкладке", (t) => {
  const legacy = runtimeSelectionFixture(t);
  assert.deepEqual([...loadRuntimeAudioSelection(legacy.root, legacy.selectionPath)], [legacy.contentHash]);

  const message = `l01s02 → фраза ${legacy.contentHash.slice(0, 12)} → ash → нет ни в сборке, ни в Storage`;
  const uploadable = runtimeSelectionFixture(t, {
    problems: [message],
    problemDetails: [{ kind: "remote-availability", message, contentHash: legacy.contentHash }],
  });
  assert.deepEqual([...loadRuntimeAudioSelection(uploadable.root, uploadable.selectionPath)], [legacy.contentHash]);
});

test("runtime selection: неразмеченные, блокирующие и неизвестные проблемы закрывают выкладку", (t) => {
  const message = "l01s02 → материал не собирается";
  for (const problemDetails of [
    undefined,
    [{ kind: "material", message }],
    [{ kind: "unknown", message }],
    [{ kind: "remote-availability", message: "другая проблема", contentHash: "a".repeat(64) }],
    [{ kind: "remote-availability", message, contentHash: "b".repeat(64) }],
  ]) {
    const fixture = runtimeSelectionFixture(t, {
      problems: [message],
      ...(problemDetails === undefined ? {} : { problemDetails }),
    });
    assert.throws(() => loadRuntimeAudioSelection(fixture.root, fixture.selectionPath), /unresolved problems/);
  }
});
