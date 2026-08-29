import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const htmlPath = path.join(
  process.cwd(),
  ".codex-tmp",
  "learning-v2-curriculum-owner-map",
  "index.html",
);
const html = fs.readFileSync(htmlPath, "utf8");

for (const marker of [
  'data-curriculum-exact-packets="1792"',
  'data-curriculum-hold-packets="0"',
  'data-curriculum-chapter-blueprints="224"',
  'data-curriculum-lexical-senses="280"',
  'data-curriculum-grammar-operations="136"',
  'data-curriculum-dag-edges="194"',
  'data-curriculum-dag-findings="0"',
  "READY FOR OWNER REVIEW · все 1 792 packets материализованы",
  "EXACT PACKET · OWNER REVIEW REQUIRED",
  "en.hello.sense.l01",
  "013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a",
  "en.copula.i_am.affirmative",
  "en.copula.you_are.contraction",
]) {
  assert.ok(html.includes(marker), `owner_map_marker_missing:${marker}`);
}

for (const forbiddenPlaceholder of [
  "Ordinary session slot; exact role not yet authored",
  "Нужно разложить из lesson outcome на exact session step",
  "HOLD · EXACT PACKET PENDING",
]) {
  assert.ok(!html.includes(forbiddenPlaceholder), `owner_map_placeholder_present:${forbiddenPlaceholder}`);
}

const clientScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(clientScript, "owner_map_client_script_missing");
assert.doesNotThrow(
  () => new Function(clientScript),
  "owner_map_client_script_invalid",
);

process.stdout.write("LEARNING V2 CURRICULUM OWNER MAP GATE: PASS\n");
