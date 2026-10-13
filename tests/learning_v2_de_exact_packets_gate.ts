import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = "content/learning-v2-course/curriculum/de/packets";
const CHAPTERS =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json";
const TASK6 =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json";

type ChapterBlueprint = Readonly<{
  packetIds: readonly string[];
  checkpoint: Readonly<{ plannedNewLexicalSenses: readonly unknown[] }>;
}>;

const chapterDocument = JSON.parse(fs.readFileSync(CHAPTERS, "utf8")) as {
  lessons: readonly { chapters: readonly ChapterBlueprint[] }[];
};
const chapters = chapterDocument.lessons.flatMap((lesson) => lesson.chapters);
const plannedPacketIds = chapters.flatMap((chapter) => chapter.packetIds);
const task6 = JSON.parse(fs.readFileSync(TASK6, "utf8")) as {
  registry: Readonly<{ lexicalSenses: readonly unknown[] }>;
};

const materializer = spawnSync(
  process.execPath,
  ["scripts/learning-v2-de-materialize-packets.mjs"],
  { encoding: "utf8" },
);
assert.notEqual(
  materializer.status,
  0,
  "task7_materializer_must_fail_closed_before_full_course_allocation_authority",
);
assert.match(
  `${materializer.stdout}${materializer.stderr}`,
  /TASK7_FULL_ALLOCATION_AUTHORITY_PARTIAL/u,
  "task7_materializer_full_allocation_authority_hold_missing",
);

assert.equal(chapters.length, 224, "task7_requires_224_chapter_inputs");
assert.equal(
  plannedPacketIds.length,
  1792,
  "task7_requires_1792_planned_packets",
);
assert.equal(new Set(plannedPacketIds).size, 1792, "task7_packet_id_duplicate");

const packetFiles: string[] = [];
for (let lesson = 1; lesson <= 32; lesson += 1) {
  for (let session = 1; session <= 56; session += 1) {
    const sourcePath = path.join(
      ROOT,
      `l${String(lesson).padStart(2, "0")}`,
      `s${String(session).padStart(2, "0")}.json`,
    );
    if (fs.existsSync(sourcePath)) packetFiles.push(sourcePath);
  }
}

assert.equal(packetFiles.length, 1792, "task7_exact_packet_files_required");
process.stdout.write(
  `TASK7_EXACT_PACKETS files=${packetFiles.length} plannedPackets=${plannedPacketIds.length} canonicalSenses=${task6.registry.lexicalSenses.length} globalAllocation=DEFERRED_UNTIL_ALL_32_LESSON_ALLOCATIONS\n`,
);
