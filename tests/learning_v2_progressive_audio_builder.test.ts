// @ts-nocheck -- Node-only publisher fixture imports an ESM build script.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  parseLearningV2AudioLessonCatalog,
  parseLearningV2AudioReleaseManifest,
} from "../modules/learning-v2/audio/progressive_audio_contract";

const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const writeCorpus = (root: string, rows: readonly any[]) => {
  fs.mkdirSync(path.join(root, "audio"), { recursive: true });
  const completed: Record<string, unknown> = {};
  for (const row of rows) {
    const bytes = Buffer.alloc(row.size, row.fill);
    fs.writeFileSync(path.join(root, "audio", `${row.jobId}.mp3`), bytes);
    completed[row.jobId] = {
      bytes: bytes.length,
      sha256: sha(bytes),
      durationSeconds: 1,
    };
  }
  fs.writeFileSync(
    path.join(root, "audio-manifest.json"),
    JSON.stringify({
      voiceId: "voice",
      modelId: "model",
      languageCode: "es",
      outputFormat: "mp3_44100_128",
      completed,
    }),
  );
  fs.writeFileSync(
    path.join(root, "source-map.json"),
    JSON.stringify(
      rows.map((row) => ({
        session: row.session,
        step: 0,
        family: "intro",
        kind: "answer",
        text: row.text,
        rate: 1,
        jobId: row.jobId,
        file: `audio/${row.jobId}.mp3`,
      })),
    ),
  );
};

const build = (sourceDir: string, outputDir: string, previousDir?: string) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        path.resolve("scripts/build_learning_v2_progressive_audio_packs.mjs"),
        "--source",
        sourceDir,
        "--out",
        outputDir,
        ...(previousDir ? ["--previous", previousDir] : []),
      ],
      { encoding: "utf8" },
    ),
  );

test("builder batches phrases and reuses historical packs while changed audio becomes a delta", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "lv2-audio-builder-"));
  const source = path.join(temp, "source");
  const first = path.join(temp, "first");
  const unchanged = path.join(temp, "unchanged");
  const second = path.join(temp, "second");
  writeCorpus(source, [
    {
      jobId: "a".repeat(64),
      session: "l01/s01",
      text: "Hola.",
      size: 300,
      fill: 1,
    },
    {
      jobId: "b".repeat(64),
      session: "l01/s01",
      text: "Adiós.",
      size: 350,
      fill: 2,
    },
    {
      jobId: "c".repeat(64),
      session: "l01/s02",
      text: "Gracias.",
      size: 400,
      fill: 3,
    },
  ]);
  const one = build(source, first);
  expect(one.uniqueClipCount).toBe(3);
  expect(one.packCount).toBe(2);
  const manifestOne = parseLearningV2AudioReleaseManifest(
    JSON.parse(fs.readFileSync(path.join(first, "current.json"), "utf8")),
  );
  const lessonOne = parseLearningV2AudioLessonCatalog(
    JSON.parse(fs.readFileSync(path.join(first, one.lessonFiles[0]), "utf8")),
  );
  expect(
    lessonOne.packs.find((pack: any) => pack.packId.includes("s0001-s0001"))
      .clips,
  ).toHaveLength(2);
  const same = build(source, unchanged, first);
  const manifestSame = parseLearningV2AudioReleaseManifest(
    JSON.parse(fs.readFileSync(path.join(unchanged, "current.json"), "utf8")),
  );
  expect(same.deltaPackCount).toBe(0);
  expect(same.reusedPackCount).toBe(2);
  expect(manifestSame.releaseId).toBe(manifestOne.releaseId);
  expect(manifestSame.lessons.map((row) => row.objectPath)).toEqual(
    manifestOne.lessons.map((row) => row.objectPath),
  );

  writeCorpus(source, [
    {
      jobId: "a".repeat(64),
      session: "l01/s01",
      text: "Hola.",
      size: 300,
      fill: 1,
    },
    {
      jobId: "d".repeat(64),
      session: "l01/s01",
      text: "Adiós nuevo.",
      size: 360,
      fill: 4,
    },
    {
      jobId: "c".repeat(64),
      session: "l01/s02",
      text: "Gracias.",
      size: 400,
      fill: 3,
    },
  ]);
  const two = build(source, second, first);
  expect(two.reusedPackCount).toBe(2);
  expect(two.deltaPackCount).toBe(1);
  expect(two.packCount).toBe(3);

  const currentPath = path.join(second, "current.json");
  const current = JSON.parse(fs.readFileSync(currentPath, "utf8"));
  const lessonPath = path.join(second, two.lessonFiles[0]);
  const brokenLesson = JSON.parse(fs.readFileSync(lessonPath, "utf8"));
  brokenLesson.sessions[0].phrases[0].clipSha256 = "f".repeat(64);
  const brokenLessonBytes = Buffer.from(JSON.stringify(brokenLesson));
  fs.writeFileSync(lessonPath, brokenLessonBytes);
  current.lessons[0].sha256 = sha(brokenLessonBytes);
  current.lessons[0].byteSize = brokenLessonBytes.length;
  const currentBytes = Buffer.from(JSON.stringify(current));
  fs.writeFileSync(currentPath, currentBytes);
  const publishPath = path.join(second, "publish-manifest.json");
  const publish = JSON.parse(fs.readFileSync(publishPath, "utf8"));
  const lessonObject = publish.objects.find(
    (object: any) =>
      path.resolve(second, object.localPath) === path.resolve(lessonPath),
  );
  lessonObject.sha256 = sha(brokenLessonBytes);
  lessonObject.byteSize = brokenLessonBytes.length;
  const currentObject = publish.objects.find(
    (object: any) => object.localPath === "current.json",
  );
  currentObject.sha256 = sha(currentBytes);
  currentObject.byteSize = currentBytes.length;
  fs.writeFileSync(publishPath, JSON.stringify(publish));
  expect(() =>
    execFileSync(
      process.execPath,
      [
        path.resolve("scripts/publish_learning_v2_progressive_audio_packs.mjs"),
        "--root",
        second,
      ],
      { encoding: "utf8", stdio: "pipe" },
    ),
  ).toThrow(/phrase_binding_invalid/u);
});
