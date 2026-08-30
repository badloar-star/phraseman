import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(".codex-tmp/learning-v2-curriculum-owner-map/index.html");
const html = readFileSync(path, "utf8");
const markers = [
  'data-curriculum-lessons="32"',
  'data-curriculum-chapters="224"',
  'data-curriculum-exact-packets="1792"',
  'data-owner-approval="PENDING"',
  "FULL B1 GRAMMAR-FIRST · OWNER REVIEW REQUIRED",
  "Present be affirmative",
  "Probability and deduction",
  "COURSE START AMENDMENT — OWNER REVIEW REQUIRED",
  "первая сессия теперь учит только I + am",
  "146</b><span>planned senses · 638 возвратов",
  "en.happy.adjective.01",
  "en.scared.adjective.01",
  "en.tall.adjective.01",
  "en.important.adjective.01",
  "en.welcome.adjective.01",
  "en.different.adjective.01",
  "восемь локализаций создаются вручную только последовательно",
  "PLANNED_NOT_AUTHORED",
];
for (const marker of markers) assert.ok(html.includes(marker), `owner_map_marker_missing:${marker}`);
assert.match(html, /[a-f0-9]{64}/, "owner_map_fingerprint_missing");
assert.equal(html.includes("exact role not yet authored"), false, "generic_session_placeholder_forbidden");
assert.equal((html.match(/lessonOrdinal/g) ?? []).length >= 32, true, "all_lessons_must_be_serialized");
assert.equal((html.match(/sessionId/g) ?? []).length >= 1_792, true, "all_packets_must_be_serialized");

process.stdout.write("LEARNING V2 CURRICULUM OWNER MAP V2 GATE: PASS lessons=32 chapters=224 packets=1792\n");
