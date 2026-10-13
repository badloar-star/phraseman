import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadGermanTask6cL01EinladungAdmissionCandidateDeV1 } from "../modules/learning-v2/curriculum/de/task6c_l01_einladung_admission_candidate_de_v1";

const repo = process.cwd();
const admissionRoot = path.join(repo, "modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_admission_v1");
const captureRoot = path.join(repo, "modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_direct_capture_v1");
const factsPath = path.join(repo, "modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_facts_v1/facts.json");
const task5Path = path.join(repo, "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json");
const authorityPaths = {
  researchAuthority: path.join(repo, "modules/learning-v2/curriculum/de/research_authority_de_v1.ts"),
  canonicalRegistry: path.join(repo, "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json"),
  task6Kernel: path.join(repo, "modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts"),
  lexicalEvidenceContract: path.join(repo, "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts"),
};
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const read = (pathname: string): any => JSON.parse(fs.readFileSync(pathname, "utf8"));
const write = (pathname: string, value: unknown): void => fs.writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`, "utf8");
function outer(html: string, marker: string): string { const start = html.indexOf(marker); if (start < 0) throw new Error("fixture_span_marker"); const tags = /<\/?div\b[^>]*>/gi; tags.lastIndex = start; let depth = 0; for (let match = tags.exec(html); match; match = tags.exec(html)) { if (match.index < start) continue; depth += match[0][1] === "/" ? -1 : 1; if (depth === 0) return html.slice(start, tags.lastIndex); } throw new Error("fixture_span_unbalanced"); }

type Fixture = ReturnType<typeof fixture>;
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "einladung-admission-"));
  const admission = path.join(root, "admission"); fs.cpSync(admissionRoot, admission, { recursive: true });
  const capture = path.join(root, "capture"); fs.cpSync(captureRoot, capture, { recursive: true });
  const facts = path.join(root, "facts.json"); fs.copyFileSync(factsPath, facts);
  const task5 = path.join(root, "task5.json"); fs.copyFileSync(task5Path, task5);
  const authorities = Object.fromEntries(Object.entries(authorityPaths).map(([key, source]) => { const target = path.join(root, `${key}${path.extname(source)}`); fs.copyFileSync(source, target); return [key, target]; })) as typeof authorityPaths;
  return { root, admission, capture, facts, task5, authorities };
}
function load(value: Fixture = fixture()) {
  return loadGermanTask6cL01EinladungAdmissionCandidateDeV1({ manifestPathForTest: path.join(value.admission, "manifest.json"), captureRootForTest: value.capture, factsPathForTest: value.facts, task5PathForTest: value.task5, authorityPathsForTest: value.authorities });
}
function rehashEvidence(value: Fixture): void {
  const manifestPath = path.join(value.admission, "manifest.json"); const manifest = read(manifestPath);
  manifest.evidence.captureManifestSha256 = sha(fs.readFileSync(path.join(value.capture, "manifest.json")));
  manifest.evidence.factsSha256 = sha(fs.readFileSync(value.facts));
  write(manifestPath, manifest);
}
function forgeRawAndRehash(value: Fixture): void {
  const rawPath = path.join(value.capture, "raw/de_lex_plan_l01_c07_einladung_v1.html");
  let raw = '<div class="dwdswb-lesart" id="d-1-1">entsprechend der Bedeutung von ²einladen jmdn. als Gast zu sich bitten; jmdn. zu etw. auffordern und für ihn bezahlen eine Einladung zum Abendessen</div><div class="dwdswb-ft dwdswb-new-ft"><b>Einladung</b>, die</h1>Nominativ Plural: <b>Einladungen</b></div>';
  raw += " ".repeat(336 - Buffer.byteLength(raw, "utf8")); fs.writeFileSync(rawPath, raw, "utf8");
  const captureManifestPath = path.join(value.capture, "manifest.json"); const captureManifest = read(captureManifestPath); captureManifest.directResponse.canonicalUrl = "https://attacker.invalid/Einladung"; captureManifest.directResponse.finalUrl = captureManifest.directResponse.canonicalUrl; captureManifest.directResponse.title = "forged"; captureManifest.directResponse.headword = "forged"; captureManifest.directResponse.rawBody.sha256 = sha(raw); captureManifest.directResponse.rawBody.bytes = Buffer.byteLength(raw, "utf8"); const sense = outer(raw, '<div class="dwdswb-lesart" id="d-1-1">'); const morphology = outer(raw, '<div class="dwdswb-ft dwdswb-new-ft"'); captureManifest.directResponse.exactSenseSpan.sha256 = sha(sense); captureManifest.directResponse.exactSenseSpan.utf8Bytes = Buffer.byteLength(sense, "utf8"); write(captureManifestPath, captureManifest);
  const facts = read(value.facts); facts.capture.sha256 = sha(fs.readFileSync(captureManifestPath)); facts.sourceSense.senseSpanSha256 = sha(sense); facts.sourceSense.senseSpanUtf8Bytes = Buffer.byteLength(sense, "utf8"); facts.morphology.morphologySpanSha256 = sha(morphology); facts.morphology.morphologySpanUtf8Bytes = Buffer.byteLength(morphology, "utf8"); write(value.facts, facts);
  const manifestPath = path.join(value.admission, "manifest.json"); const manifest = read(manifestPath); manifest.evidence.rawBodySha256 = sha(raw); manifest.evidence.senseSpanSha256 = sha(sense); manifest.evidence.morphologySpanSha256 = sha(morphology); write(manifestPath, manifest); rehashEvidence(value);
}
function hostile(mutate: (value: Fixture) => void, expression: RegExp): void {
  const value = fixture();
  try { mutate(value); assert.throws(() => load(value), expression); }
  finally { fs.rmSync(value.root, { recursive: true, force: true }); }
}

const candidate = load();
assert.equal(candidate.status, "HOLD");
assert.equal(candidate.admissionStatus, "PARTIAL_CANDIDATE");
assert.equal(candidate.task7Unlock, false);
assert.equal(candidate.rowsPromoted, 0);
assert.equal(candidate.learnerFacing, false);
assert.equal(candidate.phraseClaim, false);

// Rehashing surrounding manifests cannot turn a cross-slice conflation into evidence.
hostile((value) => { const facts = read(value.facts); facts.sourceSense.sourceCoreGerman = facts.task5.communicativeUse; write(value.facts, facts); rehashEvidence(value); }, /einladung_admission_source_core/u);
hostile((value) => { const facts = read(value.facts); facts.morphology.plural = "Einladung"; write(value.facts, facts); rehashEvidence(value); }, /einladung_admission_morphology/u);
hostile((value) => { const manifestPath = path.join(value.admission, "manifest.json"); const manifest = read(manifestPath); manifest.row.sourceExampleGerman = "Wortinformation"; write(manifestPath, manifest); }, /einladung_admission_source_example/u);
hostile((value) => { const facts = read(value.facts); facts.sourceSense.senseSpanSha256 = facts.morphology.morphologySpanSha256; write(value.facts, facts); rehashEvidence(value); }, /einladung_admission_sense_span/u);
hostile((value) => forgeRawAndRehash(value), /einladung_admission_capture_(?:identity|raw)/u);
hostile((value) => { const facts = read(value.facts); facts.task5.byteSha256 = "0".repeat(64); write(value.facts, facts); rehashEvidence(value); }, /einladung_admission_facts_task5/u);
hostile((value) => { const facts = read(value.facts); facts.factReceipt.noCanonicalPromotion = false; write(value.facts, facts); rehashEvidence(value); }, /einladung_admission_facts_receipt/u);
hostile((value) => {
  const captureManifestPath = path.join(value.capture, "manifest.json"); const captureManifest = read(captureManifestPath);
  captureManifest.status = "ADMITTED"; captureManifest.canonicalAdmission = "CANONICAL"; captureManifest.rowsPromoted = 1; captureManifest.task7Unlock = true; captureManifest.learnerFacing = true; captureManifest.phraseClaim = true; captureManifest.admission.semanticAdmission = "ADMITTED"; write(captureManifestPath, captureManifest);
  const facts = read(value.facts); facts.status = "ADMITTED"; facts.canonicalAdmission = "CANONICAL"; facts.semanticAdmission = "ADMITTED"; facts.rowsPromoted = 1; facts.task7Unlock = true; facts.learnerFacing = true; facts.phraseClaim = true; facts.capture.sha256 = sha(fs.readFileSync(captureManifestPath)); write(value.facts, facts);
  rehashEvidence(value);
}, /einladung_admission_(?:capture|facts)_authority/u);

for (const authority of Object.keys(authorityPaths) as (keyof typeof authorityPaths)[]) {
  hostile((value) => { fs.appendFileSync(value.authorities[authority], "\n// drift\n"); }, new RegExp(`einladung_admission_${authority}_bytes`, "u"));
  hostile((value) => { const manifestPath = path.join(value.admission, "manifest.json"); const manifest = read(manifestPath); manifest.provenance.authorities[authority].actualByteSha256 = "0".repeat(64); write(manifestPath, manifest); }, new RegExp(`einladung_admission_${authority}_declared`, "u"));
}
hostile((value) => { const manifestPath = path.join(value.admission, "manifest.json"); const manifest = read(manifestPath); manifest.provenance.predecessorAnchors.directCaptureRegistry.role = "RUNTIME_DEPENDENCY"; write(manifestPath, manifest); }, /einladung_admission_predecessor_anchor/u);
hostile((value) => { const manifestPath = path.join(value.admission, "manifest.json"); const manifest = read(manifestPath); manifest.row.task5SituationContext = manifest.row.sourceSenseGloss; write(manifestPath, manifest); }, /einladung_admission_row/u);
hostile((value) => { const manifestPath = path.join(value.admission, "manifest.json"); const manifest = read(manifestPath); manifest.row.canonicalAdmission = "CANONICAL"; write(manifestPath, manifest); }, /einladung_admission_row_schema/u);
hostile((value) => { const manifestPath = path.join(value.admission, "manifest.json"); const manifest = read(manifestPath); manifest.row.noun.learnerFacing = true; write(manifestPath, manifest); }, /einladung_admission_noun_schema/u);
hostile((value) => { const manifestPath = path.join(value.admission, "manifest.json"); const manifest = read(manifestPath); manifest.regionalPolicy.release = "APPROVED"; write(manifestPath, manifest); }, /einladung_admission_policy_schema/u);

process.stdout.write("TASK6C_L01_EINLADUNG_ADMISSION status=HOLD admissionStatus=PARTIAL_CANDIDATE rowsPromoted=0 task7Unlock=false\n");
