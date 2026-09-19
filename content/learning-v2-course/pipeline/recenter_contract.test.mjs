import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  applicableRequirements,
  loadRequirementManifest,
  resolveRequirementSourcePath,
  validateRequirementManifest,
} from "./recenter_contract.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const desktopCodexRoot = process.env.PHRASEMAN_CODEX_START_DIR
  || "C:/Users/badlo/OneDrive/Desktop/Codex";
const manifestFile = path.join(
  repoRoot,
  "content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json",
);

const load = () => loadRequirementManifest(manifestFile, {
  repoRoot,
  desktopCodexRoot,
});

test("German requirement manifest is complete, explicit, and hash-current", () => {
  const manifest = load();
  assert.deepEqual(validateRequirementManifest(manifest, {
    repoRoot,
    desktopCodexRoot,
  }), []);

  assert.equal(manifest.schemaVersion, "learning-v2-de-requirements.v1");
  assert.equal(manifest.targetLanguage, "de");
  assert.deepEqual(manifest.interfaceLocales, ["ru", "uk"]);

  const requiredFamilies = new Set([
    "desktop_codex",
    "constitution",
    "work_method",
    "owner_judgements",
    "exemplars",
    "exact_packet",
    "progression",
    "locales_ru_uk",
    "feedback",
    "diagnostics",
    "release",
    "owner_map_freshness",
    "english_isolation",
  ]);
  const actualFamilies = new Set(manifest.requirements.map((item) => item.family));
  for (const family of requiredFamilies) {
    assert.ok(actualFamilies.has(family), `missing_requirement_family:${family}`);
  }
});

test("manifest rejects duplicate IDs, globs, unknown fields, and stale hashes", () => {
  const manifest = structuredClone(load());
  manifest.requirements.push({ ...manifest.requirements[0] });
  manifest.requirements[1].sourcePath = "factory/judgements/owner/*.md";
  manifest.requirements[2].unexpected = true;
  manifest.sourceDocuments[0].sha256 = "0".repeat(64);

  const issues = validateRequirementManifest(manifest, {
    repoRoot,
    desktopCodexRoot,
  }).join("\n");
  assert.match(issues, /duplicate_requirement_id/u);
  assert.match(issues, /source_path_glob_forbidden/u);
  assert.match(issues, /unknown_requirement_field:unexpected/u);
  assert.match(issues, /source_hash_stale/u);
});

test("phase and applicability filtering is closed and deterministic", () => {
  const manifest = load();
  const preVoice = applicableRequirements(manifest, {
    phase: "PRE_AUTHOR",
    applicability: "voice",
  });
  assert.ok(preVoice.length > 0);
  assert.ok(preVoice.every((item) => item.phase.includes("PRE_AUTHOR")));
  assert.ok(preVoice.every((item) => ["always", "voice"].includes(item.applicability)));

  assert.throws(
    () => applicableRequirements(manifest, {
      phase: "UNKNOWN",
      applicability: "voice",
    }),
    /recenter_phase_unknown:UNKNOWN/u,
  );
});

test("latest owner override applies lexical growth and a new situation to every session type", () => {
  const manifest = load();
  const lexical = manifest.requirements.find((item) => item.id === "DE-PROGRESSION-001");
  const situation = manifest.requirements.find((item) => item.id === "DE-PROGRESSION-002");

  assert.equal(lexical?.applicability, "always");
  assert.match(lexical?.assertion || "", /1–5/u);
  assert.equal(situation?.applicability, "always");
  assert.match(situation?.assertion || "", /нов/u);
});

test("mandatory German authorities are content-addressed and every source has a requirement row", () => {
  const manifest = load();
  const sourcePaths = new Set(manifest.sourceDocuments.map((item) => item.sourcePath));
  for (const required of [
    "repo/AGENTS.md",
    "repo/docs/superpowers/specs/2026-09-19-learning-v2-german-grammar-first-course-design.md",
    "repo/docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md",
    "repo/docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md",
    "repo/docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md",
    "repo/docs/v2/curriculum/de/OWNER_DECISIONS.md",
    "repo/docs/v2/curriculum/de/LINGUISTIC_REVIEW_RECEIPT_2026-09-19.md",
    "repo/modules/learning-v2/curriculum/de/research_authority_de_v1.ts",
    "factory/pipeline/prompts/judge_recenter_pre.md",
    "factory/pipeline/prompts/judge_recenter_post.md",
    "factory/pipeline/prompts/judge_recenter_release.md",
  ]) assert.ok(sourcePaths.has(required), `missing_authority_source:${required}`);

  const usedPaths = new Set(manifest.requirements.map((item) => item.sourcePath));
  for (const sourcePath of sourcePaths) {
    assert.ok(usedPaths.has(sourcePath), `source_without_requirement:${sourcePath}`);
  }
});

test("sourceSection is an exact locator present in the cited source", () => {
  const manifest = load();
  for (const requirement of manifest.requirements) {
    const absolutePath = resolveRequirementSourcePath(requirement.sourcePath, {
      repoRoot,
      desktopCodexRoot,
    });
    const text = fs.readFileSync(absolutePath, "utf8");
    assert.ok(
      text.includes(requirement.sourceSection),
      `source_section_missing:${requirement.id}:${requirement.sourceSection}`,
    );
  }

  const broken = structuredClone(manifest);
  broken.requirements[0].sourceSection = "SECTION THAT DOES NOT EXIST";
  assert.match(validateRequirementManifest(broken, {
    repoRoot,
    desktopCodexRoot,
  }).join("\n"), /source_section_missing/u);
});

test("independent high-risk obligations have independent stable IDs", () => {
  const manifest = load();
  const byId = new Map(manifest.requirements.map((item) => [item.id, item]));
  for (const id of [
    "DE-PROGRESSION-005",
    "DE-LISTEN-001",
    "DE-LISTEN-002",
    "DE-BLUEPRINT-001",
    "DE-BLUEPRINT-002",
    "DE-BLUEPRINT-003",
    "DE-BLUEPRINT-004",
    "DE-BLUEPRINT-005",
    "DE-BLUEPRINT-006",
    "DE-BLUEPRINT-007",
    "DE-BLUEPRINT-008",
    "DE-RELEASE-004",
    "DE-RELEASE-005",
    "DE-RELEASE-006",
    "DE-RELEASE-007",
    "DE-RELEASE-008",
    "DE-RELEASE-009",
    "DE-RELEASE-010",
    "DE-RELEASE-011",
  ]) assert.ok(byId.has(id), `missing_independent_requirement:${id}`);

  assert.equal(byId.get("DE-LISTEN-001")?.applicability, "always");
  assert.equal(
    byId.get("DE-LISTEN-001")?.sourcePath,
    "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md",
  );
  assert.equal(byId.get("DE-LISTEN-002")?.applicability, "always");
  assert.equal(byId.get("DE-MOCKUP-001")?.applicability, "always");
  assert.deepEqual(byId.get("DE-MOCKUP-001")?.phase, ["RELEASE_PROJECTION"]);
  assert.ok(applicableRequirements(manifest, {
    phase: "RELEASE_PROJECTION",
    applicability: "release",
  }).some((item) => item.id === "DE-MOCKUP-001"));
});
