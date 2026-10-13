import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const require = createRequire(import.meta.url);
const sha256 = (file: string) =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const closure: Record<string, string> = {
  "docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md": "82d29e357da2e5444aa377de33dd07f06fe12dbaa8f1e3c3de8285d297489ba5",
  "docs/v2/curriculum/de/OWNER_DECISIONS.md": "eff5412a13531052aa56c1e40f4058f35da405297b418ca8fcbb7b44bc19f615",
  "docs/v2/curriculum/de/TASK6B4_FINAL_METHOD_ADVISOR_RECEIPT_R4_2026-10-11.md": "48c08d2d83962ea6f9110f34005c078423221df53d2c127937384b049704b206",
  "docs/v2/curriculum/de/TASK6B4_AUTHORITY_RECORD_2026-10-11.md": "5859467b20dff7b3b915997b8f300c8aea700cb3d94c1a070c9821a814441508",
  "docs/v2/curriculum/de/TASK6B4_GUARDIAN_RECEIPT_2026-10-11.md": "906776679332d683ef3488dbdb3876a2758baad9decf176e198c25739ba7a3e1",
  "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts":
    "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
  "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts":
    "10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c",
  "modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts":
    "4e0a1dc41a62ae81eb516333f19339658590c5cbef39edaf20a1d6219ecfca4d",
  "modules/learning-v2/curriculum/de/research_evidence_bindings_de_v1.ts":
    "8366f2440f2ae338c7f4f4b55a7686e28a5b19e2cf9fd59f88600329cfc587f7",
  "modules/learning-v2/curriculum/de/research_authority_de_v1.ts":
    "0cf28be0b30fe66735cbdd609de10bcda88193290c129006e7a6e393749873fb",
  "modules/learning-v2/policies/decision_registry.ts":
    "d8236a0635a9e741d001f36fd209a47637491b655c5c7db9e26962264e389ec8",
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json":
    "3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29",
  "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json":
    "a8131c418606eb700266f43a8d30c218ee58a006bdf475ad2ed955d8d56f88fb",
  "modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json":
    "fcb602e9c1993a034b77cac4b46808b24b323909731cdf9d72db0984332082ad",
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json":
    "494abd91c59c88ed652b3b4cdaaeaa118bc53ef64beb57ff54f735433612eb29",
  "tests/learning_v2_de_lexical_registry_gate.ts":
    "3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58",
  "docs/v2/curriculum/de/TASK6B1_LEXICAL_REVIEW_RECEIPT_2026-10-08.md":
    "183d82f9f83d5d79ab7078767cb468004b54a6b7fac656022c0daab642bd9bd0",
  "docs/v2/curriculum/de/TASK6B2_SOURCE_ADJUDICATION_RECEIPT_2026-10-11.md":
    "a87d60144ff8274e54f41a1a0cea76ec716d09dea4da75e94a922339f9a63746",
  "docs/v2/curriculum/de/TASK6B2_QUARANTINE_DECISION_2026-10-11.md":
    "e3f700d0d6a8553af4d1807f3188bc16f1c4f3d2f0b20c7a7a571e5768487acf",
  "docs/v2/curriculum/de/TASK_PACKET_6B3_AUFZUG_CANONICAL_MATERIALIZATION.md":
    "ef5548642c83759464cb51754bb75a1288e4ecd3a191a080334fab4d9395c1c3",
  "docs/v2/curriculum/de/TASK_PACKET_6B4_AUFZUG_CURRENT_STATE_ADMISSION.md":
    "cdf079e2d7b9ab4c0701de8e5922f293ad40dfd1365a3e9179cf5f3c18eba328",
};
for (const [relative, expected] of Object.entries(closure))
  assert.equal(
    sha256(path.join(repoRoot, relative)),
    expected,
    `closure_hash_mismatch:${relative}`,
  );

const candidateId = "de_lex_l01_c02_aufzug_v1";
const evidenceId = "DE-LEX-ITEM-L01-C02-AUFZUG-SENSE-FORM-001";
const requireCandidate = (
  rows: readonly Record<string, unknown>[],
  evidence: readonly Record<string, unknown>[],
): void => {
  const row = rows.find((candidate) => candidate.id === candidateId);
  const record = evidence.find((candidate) => candidate.id === evidenceId);
  if (row === undefined || record === undefined)
    throw new Error("aufzug_canonical_materialization_missing");
  assert.equal(row.lemma, "Aufzug");
  assert.equal(row.nounGender, "der");
  assert.equal(row.nounPlural, "Aufzüge");
  assert.equal(record.canonicalLexicalSenseId, candidateId);
  assert.equal(
    record.limitation,
    "NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY",
  );
};
const probe =
  process.argv.length === 4 &&
  process.argv[2] === "--probe" &&
  process.argv[3] === "absent-aufzug";
assert.ok(
  probe || process.argv.length === 2,
  "unexpected B4 admission arguments",
);

async function main(): Promise<void> {
  const blueprint = await import(
    pathToFileURL(
      path.join(
        repoRoot,
        "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
      ),
    ).href
  );
  const itemEvidence = await import(
    pathToFileURL(
      path.join(
        repoRoot,
        "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts",
      ),
    ).href
  );
  const registry = JSON.parse(
    fs.readFileSync(
      path.join(
        repoRoot,
        "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json",
      ),
      "utf8",
    ),
  ) as Record<string, unknown>[];
  const evidence =
    itemEvidence.GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V1 as readonly Record<
      string,
      unknown
    >[];
  if (probe) {
    const rows = registry.filter((row) => row.id !== candidateId);
    const records = evidence.filter((row) => row.id !== evidenceId);
    const parsedEvidence =
      itemEvidence.parseGermanLexicalItemEvidenceRegistryDeV1(records);
    const parsedRows = blueprint.parseGermanLexicalSenseRegistryDeV1(
      rows,
      parsedEvidence,
    );
    assert.equal(parsedRows.length, 1);
    assert.equal(parsedRows[0]?.id, "de_lex_l01_c01_nachbarin_v1");
    requireCandidate(rows, records);
    assert.fail("counterfactual probe unexpectedly retained Aufzug");
  }
  requireCandidate(registry, evidence);
  const tsxPreload = pathToFileURL(require.resolve("tsx")).href;
  const child = spawnSync(
    process.execPath,
    [
      "--import",
      tsxPreload,
      path.join(repoRoot, "tests/learning_v2_de_lexical_registry_gate.ts"),
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      env: { ...process.env, NODE_OPTIONS: "" },
    },
  );
  assert.equal(child.error, undefined, "lexical_gate_spawn_failed");
  assert.equal(child.status, 0, child.stderr);
  assert.match(
    child.stdout,
    /verifiedLexicalItemEvidenceRows=2 rowsPromoted=0 task7Contacts=UNVERIFIED status=HOLD/u,
  );
  console.log(
    "TASK6B4_CURRENT_STATE_CANDIDATE_VALIDATED canonicalRows=2 verifiedLexicalItemEvidenceRows=2 rowsPromoted=0 task7Contacts=UNVERIFIED status=HOLD",
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
