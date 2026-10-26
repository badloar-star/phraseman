import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(".codex-tmp/learning-v2-curriculum-owner-map/index.html");
const html = readFileSync(path, "utf8");
const markers = [
  'data-curriculum-lessons="32"',
  'data-curriculum-chapters="224"',
  'data-curriculum-exact-packets="1792"',
  'data-owner-approval="APPROVED"',
  "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da",
  "FULL B1 GRAMMAR-FIRST · OWNER APPROVED",
  "Present be affirmative",
  "Probability and deduction",
  "COURSE START AMENDMENT — OWNER APPROVED",
  "первая сессия теперь учит только I + am",
  "1635</b><span>planned senses · 8851 возвратов",
  "en.happy.adjective.01",
  "en.scared.adjective.01",
  "en.tall.adjective.01",
  "en.important.adjective.01",
  "en.welcome.adjective.01",
  "en.different.adjective.01",
  "en.proud.adjective.01",
  "en.separate.adjective.01",
  "восемь локализаций создаются вручную только последовательно",
  "PLANNED_NOT_AUTHORED",
];
for (const marker of markers) assert.ok(html.includes(marker), `owner_map_marker_missing:${marker}`);
assert.equal(
  html.includes('"fingerprint":"d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da"'),
  true,
  "owner_map_exact_current_approved_fingerprint_missing",
);
assert.equal(html.includes("exact role not yet authored"), false, "generic_session_placeholder_forbidden");
assert.equal((html.match(/lessonOrdinal/g) ?? []).length >= 32, true, "all_lessons_must_be_serialized");
assert.equal((html.match(/sessionId/g) ?? []).length >= 1_792, true, "all_packets_must_be_serialized");

process.stdout.write("LEARNING V2 CURRICULUM OWNER MAP V2 GATE: PASS lessons=32 chapters=224 packets=1792\n");
