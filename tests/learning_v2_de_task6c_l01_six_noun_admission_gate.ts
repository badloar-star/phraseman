import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadGermanTask6cL01SixNounAdmissionCandidateDeV1 } from "../modules/learning-v2/curriculum/de/task6c_l01_six_noun_admission_candidate_de_v1";

const repo = process.cwd();
const candidatePath = path.join(repo, "modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1/admission_candidate.json");
const evidenceRoot = path.join(repo, "modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1");
const task5Path = path.join(repo, "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json");
const canonicalPath = path.join(repo, "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json");

function temporaryFixture(): { root: string; candidate: string; evidence: string; task5: string; canonical: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-six-noun-admission-"));
  const evidence = path.join(root, "evidence");
  fs.cpSync(evidenceRoot, evidence, { recursive: true });
  const candidate = path.join(root, "admission_candidate.json");
  fs.copyFileSync(candidatePath, candidate);
  const task5 = path.join(root, "task5.json"); fs.copyFileSync(task5Path, task5);
  const canonical = path.join(root, "canonical.json"); fs.copyFileSync(canonicalPath, canonical);
  return { root, candidate, evidence, task5, canonical };
}
function read(pathname: string): any { return JSON.parse(fs.readFileSync(pathname, "utf8")); }
function write(pathname: string, value: unknown): void { fs.writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function rehashCandidate(candidate: string): void {
  const value = read(candidate); const manifest = path.join(path.dirname(candidate), "evidence", "manifest.json");
  value.evidenceBundle.sha256 = createHash("sha256").update(fs.readFileSync(manifest)).digest("hex"); write(candidate, value);
}
function expectedFailure(mutate: (fixture: ReturnType<typeof temporaryFixture>) => void, expression: RegExp, deep = false): void {
  const fixture = temporaryFixture();
  try { mutate(fixture); if (deep) rehashCandidate(fixture.candidate); const expectedManifestSha256ForTest = deep ? createHash("sha256").update(fs.readFileSync(path.join(fixture.evidence, "manifest.json"))).digest("hex") : undefined; assert.throws(() => loadGermanTask6cL01SixNounAdmissionCandidateDeV1({ candidatePathForTest: fixture.candidate, evidenceRootForTest: fixture.evidence, task5PathForTest: fixture.task5, canonicalRegistryPathForTest: fixture.canonical, expectedManifestSha256ForTest }), expression); }
  finally { fs.rmSync(fixture.root, { recursive: true, force: true }); }
}

const candidate = loadGermanTask6cL01SixNounAdmissionCandidateDeV1();
assert.equal(candidate.status, "HOLD");
assert.equal(candidate.admissionStatus, "PARTIAL_CANDIDATE");
assert.equal(candidate.task7Unlock, false);
assert.equal(candidate.rowsPromoted, 0);
assert.equal(candidate.learnerFacing, false);
assert.equal(candidate.phraseClaim, false);
assert.equal(candidate.rows.length, 6);
assert.deepEqual(candidate.rows.map((row) => row.semanticAlignment), ["EXACT_TASK5_GLOSS", "EXACT_TASK5_GLOSS", "EXACT_TASK5_GLOSS", "SOURCE_CORE_PLUS_TASK5_SCENE_CONTEXT", "SOURCE_CORE_PLUS_TASK5_SCENE_CONTEXT", "SOURCE_CORE_EQUIVALENT_PARAPHRASE"]);

// Durable bytes and both exact extracted spans are independently hash-bound.
expectedFailure(({ evidence }) => { fs.appendFileSync(path.join(evidence, "raw/de_lex_plan_l01_c01_nachbarin_v1.html"), "x"); }, /task6c_l01_six_raw_integrity/u);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[0].senseSpan.sha256 = "0".repeat(64); write(p, v); }, /task6c_l01_six_evidence_manifest_hash/u);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[0].senseSpan.sha256 = "0".repeat(64); write(p, v); }, /task6c_l01_six_sense_span_integrity/u, true);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[0].morphologySpan.utf8Bytes = 1; write(p, v); }, /task6c_l01_six_morphology_span_integrity/u, true);

// A claim cannot be cross-wired to another raw response or reused as a second row.
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[2].raw.path = v.rows[1].raw.path; write(p, v); }, /task6c_l01_six_raw_binding_invalid|task6c_l01_six_raw_reuse/u, true);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[2].candidateCanonicalSenseId = v.rows[1].candidateCanonicalSenseId; write(p, v); }, /task6c_l01_six_candidate_id_invalid/u, true);

// Task-5 scene context may not be relabelled as dictionary core or gloss.
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[3].sourceCoreGerman = v.rows[3].task5SituationContext; write(p, v); }, /task6c_l01_six_scene_smuggling/u, true);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[4].sourceSenseGloss = "garden beside a residence"; write(p, v); }, /task6c_l01_six_scene_smuggling|task6c_l01_six_semantic_alignment_invalid/u, true);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[4].task5SituationContext = "ground a communal welcome scene beside a residence"; write(p, v); }, /task6c_l01_six_task5_context_binding_invalid/u, true);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.historicalFactLayer.path = ".tmp/de-task6c-l01-morph-semantic-facts/registry.json"; write(p, v); }, /task6c_l01_six_manifest_facts_schema/u, true);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[0].noun.learnerFacingRu = "соседка"; write(p, v); }, /task6c_l01_six_noun_schema/u, true);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[0].raw.unrelated = "forged"; write(p, v); }, /task6c_l01_six_raw_schema/u, true);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[0].senseSpan.approval = "APPROVED"; write(p, v); }, /task6c_l01_six_sense_span_schema/u, true);
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.regionalPolicy.production.status = "RELEASED"; write(p, v); }, /task6c_l01_six_region_production_schema/u, true);

// Task 5 is hash-bound and each semantic identity / noun package must still match it.
expectedFailure(({ task5 }) => { const v = read(task5); v.lessons[0].chapters[0].checkpoint.plannedNewLexicalSenses[1].semanticIdentity = "forged|identity"; write(task5, v); }, /task6c_l01_six_task5_hash/u);

// Swiss Hausmeister d-1-2 may not become the admitted sense.
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.rows[5].senseAnchor = "d-1-2"; v.rows[5].excludedSenseAnchors = []; write(p, v); }, /task6c_l01_six_hausmeister_swiss_sense/u, true);

// Baseline policy is productive DE with null region, never exclusive or a regional verdict.
expectedFailure(({ evidence }) => { const p = path.join(evidence, "manifest.json"), v = read(p); v.regionalPolicy.claims.germanyExclusive = true; write(p, v); }, /task6c_l01_six_region_policy_invalid/u, true);

// Candidate cannot smuggle chronology, promotion, learner material, English, or Task 7 authority.
expectedFailure(({ candidate }) => { const v = read(candidate); v.rowsPromoted = 1; write(candidate, v); }, /task6c_l01_six_candidate_authority_invalid/u);
expectedFailure(({ candidate }) => { const v = read(candidate); v.task7Unlock = true; write(candidate, v); }, /task6c_l01_six_candidate_authority_invalid/u);
expectedFailure(({ candidate }) => { const v = read(candidate); v.learnerFacing = true; write(candidate, v); }, /task6c_l01_six_candidate_authority_invalid/u);
expectedFailure(({ candidate }) => { const v = read(candidate); v.phraseClaim = true; write(candidate, v); }, /task6c_l01_six_candidate_authority_invalid/u);
expectedFailure(({ candidate }) => { const v = read(candidate); v.integration.approval = "APPROVED"; write(candidate, v); }, /task6c_l01_six_integration_schema/u);
expectedFailure(({ candidate }) => { const v = read(candidate); v.integration.newCandidateIds.push("en_lex_l01_c01_fake_v1"); write(candidate, v); }, /task6c_l01_six_candidate_schema|task6c_l01_six_english_forbidden/u);
expectedFailure(({ candidate }) => { const v = read(candidate); v.firstIntroductionPacketId = "de_l01_c01_s01"; write(candidate, v); }, /task6c_l01_six_candidate_schema|task6c_l01_six_chronology_forbidden/u);

process.stdout.write("TASK6C_L01_SIX_NOUN_ADMISSION status=HOLD rows=6 rowsPromoted=0 task7Unlock=false learnerFacing=false phraseClaim=false\n");
