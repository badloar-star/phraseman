import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import * as blueprintModule from "../modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1";
import * as itemEvidenceModule from "../modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1";

const candidateFiles = {
  evidence: "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts",
  registry:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json",
  lexicalGate: "tests/learning_v2_de_lexical_registry_gate.ts",
} as const;

const expectedCandidateHashes = {
  evidence: "10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c",
  registry: "3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29",
  lexicalGate:
    "3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58",
} as const;

const canonicalId = "de_lex_l01_c02_aufzug_v1";
const sourcePlanId = "de_lex_plan_l01_c02_aufzug_v1";
const evidenceId = "DE-LEX-ITEM-L01-C02-AUFZUG-SENSE-FORM-001";
const limitation = "NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY";
const b1ReceiptPath =
  "docs/v2/curriculum/de/TASK6B1_LEXICAL_REVIEW_RECEIPT_2026-10-08.md";
const b2ReceiptPath =
  "docs/v2/curriculum/de/TASK6B2_SOURCE_ADJUDICATION_RECEIPT_2026-10-11.md";
const expectedReceiptHashes = {
  b1: "183d82f9f83d5d79ab7078767cb468004b54a6b7fac656022c0daab642bd9bd0",
  b2: "a87d60144ff8274e54f41a1a0cea76ec716d09dea4da75e94a922339f9a63746",
} as const;

type JsonRecord = Record<string, unknown>;

const parseLexical = blueprintModule.parseGermanLexicalSenseRegistryDeV1 as (
  input: unknown,
  lexicalItemEvidence?: unknown,
) => readonly JsonRecord[];
const parseEvidence =
  itemEvidenceModule.parseGermanLexicalItemEvidenceRegistryDeV1 as (
    input: unknown,
  ) => readonly JsonRecord[];

const b1LexicalFixture: JsonRecord = {
  id: "de_lex_l01_c01_nachbarin_v1",
  lemma: "Nachbarin",
  senseGloss: "female person living nearby",
  partOfSpeech: "noun",
  nounGender: "die",
  nounPlural: "Nachbarinnen",
  verbValency: null,
  verbFrame: null,
  verbSeparability: null,
  verbAuxiliary: null,
  productionPolicy: "productive",
  region: null,
  evidenceIds: [
    "DE-LEX-ITEM-L01-C01-NACHBARIN-SENSE-FORM-001",
    "DE-REG-BASELINE-001",
  ],
};
const b1EvidenceFixture: JsonRecord = {
  id: "DE-LEX-ITEM-L01-C01-NACHBARIN-SENSE-FORM-001",
  canonicalLexicalSenseId: "de_lex_l01_c01_nachbarin_v1",
  sourcePlanId: "de_lex_plan_l01_c01_nachbarin_v1",
  evidenceStatus: "DIRECT_LEXICOGRAPHIC_SOURCE",
  authority: "DWDS / Berlin-Brandenburg Academy of Sciences and Humanities",
  sourceUrl: "https://www.dwds.de/wb/Nachbarin#d-1-1",
  verifiedOn: "2026-10-08",
  transport: {
    cachePath:
      ".tmp/de-task6a-exact-transport/.cache/47db1ae871efbfe6dfe9aa8874eed57219c125b38d9153d0a99a577d7fbafb02.json",
    cacheAccessedOn: "2026-10-07",
    cacheSha256:
      "ed554682fa1947a20f780615a6768da1d4c95703d4fac1d9ad1bdba4ad4644f5",
    responseSha256:
      "550baada63bde85a8cecd4faf23048b0e96df8af528577a78265dc9acfeec895",
    responseBytes: 69935,
  },
  sourceClaims: {
    definitionGerman: "weibliche Person, die in unmittelbarer Nähe wohnt",
    normalizedDefinitionLength: 49,
    normalizedDefinitionSha256:
      "1fe61df7ff89d0230f07258661b1d9f88dd6ba51b7de9f147c230b543676b004",
    lemma: "Nachbarin",
    partOfSpeechLabel: "Substantiv",
    nounGenderLabel: "Femininum",
    nounArticle: "die",
    nounPlural: "Nachbarinnen",
  },
  curriculumClaims: {
    semanticIdentity: "nachbarin|female person living nearby",
    lemma: "Nachbarin",
    senseGloss: "female person living nearby",
    partOfSpeech: "noun",
    nounGender: "die",
    nounPlural: "Nachbarinnen",
  },
  derivation: {
    semanticIdentity: "TASK5_EXACT_MATCH",
    partOfSpeechInterpretation: "DWDS_SUBSTANTIV_TO_NOUN",
  },
  limitation,
};
const b1FixtureSha256 =
  "fdb57469e6d855a6592bd5b21d841ab9c043ea9dae47f0938364f51936bc8d31";

const sha256 = (path: string): string =>
  createHash("sha256").update(fs.readFileSync(path)).digest("hex");

const readText = (path: string): string => fs.readFileSync(path, "utf8");
const sha256Text = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

const hasBaselineArgument =
  process.argv.length === 4 &&
  process.argv[2] === "--baseline" &&
  process.argv[3] === "b1";

if (hasBaselineArgument) {
  assert.equal(sha256(b1ReceiptPath), expectedReceiptHashes.b1);
  assert.match(
    readText(b1ReceiptPath),
    /8c3b4650337fcb7502f4ad848464363d4cf9575a9fc0bcd76d06176438e6b045/u,
  );
  assert.match(
    readText(b1ReceiptPath),
    /e40ca8faa4524f44436b5f838bc7d6eb60a3905c5f6611f70f3265db0861b0b0/u,
  );
  const fixturePayload = JSON.stringify({
    lexicalSenses: [b1LexicalFixture],
    lexicalItemEvidence: [b1EvidenceFixture],
  });
  assert.equal(sha256Text(fixturePayload), b1FixtureSha256);
  const parsedEvidence = parseEvidence([b1EvidenceFixture]);
  const parsedRows = parseLexical([b1LexicalFixture], parsedEvidence);
  assert.equal(parsedRows.length, 1);
  assert.equal(parsedRows[0]?.id, "de_lex_l01_c01_nachbarin_v1");
  assert.equal(
    parsedRows.some((row) => row.id === canonicalId),
    false,
  );
  throw new Error("aufzug_canonical_materialization_missing");
}

assert.equal(process.argv.length, 2, "unexpected admission-gate arguments");

for (const [name, path] of Object.entries(candidateFiles)) {
  assert.equal(
    sha256(path),
    expectedCandidateHashes[name as keyof typeof expectedCandidateHashes],
    `candidate_hash_mismatch:${name}`,
  );
}

assert.equal(sha256(b1ReceiptPath), expectedReceiptHashes.b1);
assert.equal(sha256(b2ReceiptPath), expectedReceiptHashes.b2);
const b1Receipt = readText(b1ReceiptPath);
const b2Receipt = readText(b2ReceiptPath);
assert.match(b1Receipt, /registry contains exactly one row/u);
assert.match(b1Receipt, /de_lex_l01_c01_nachbarin_v1/u);
assert.match(b2Receipt, /SOURCE_ADJUDICATED/u);
assert.match(b2Receipt, /Vorrichtung zum Hochziehen, Lift/u);
assert.match(
  b2Receipt,
  /NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY/u,
);

const lexicalRows = JSON.parse(readText(candidateFiles.registry)) as unknown[];
const aufzug = lexicalRows.find(
  (row): row is Record<string, unknown> =>
    typeof row === "object" &&
    row !== null &&
    (row as { id?: unknown }).id === canonicalId,
);
assert.ok(aufzug, "aufzug_canonical_row_missing");
assert.equal(aufzug.lemma, "Aufzug");
assert.equal(aufzug.senseGloss, "lift in a building");
assert.equal(aufzug.nounGender, "der");
assert.equal(aufzug.nounPlural, "Aufzüge");
assert.equal(aufzug.productionPolicy, "productive");
assert.equal(aufzug.region, null);
assert.deepEqual(aufzug.evidenceIds, [evidenceId, "DE-REG-BASELINE-001"]);

const evidenceSource = readText(candidateFiles.evidence);
for (const requiredFragment of [
  evidenceId,
  canonicalId,
  sourcePlanId,
  'definitionGerman: "Vorrichtung zum Hochziehen, Lift"',
  'nounArticle: "der"',
  'nounPlural: "Aufz\\u00fcge"',
  `limitation: "${limitation}"`,
]) {
  assert.ok(
    evidenceSource.includes(requiredFragment),
    `evidence_fragment_missing:${requiredFragment}`,
  );
}

const lexicalGate =
  process.platform === "win32"
    ? spawnSync(
        process.env.ComSpec ?? "cmd.exe",
        [
          "/d",
          "/s",
          "/c",
          "npx --no-install tsx tests/learning_v2_de_lexical_registry_gate.ts",
        ],
        { encoding: "utf8", windowsHide: true },
      )
    : spawnSync("npx", ["--no-install", "tsx", candidateFiles.lexicalGate], {
        encoding: "utf8",
        windowsHide: true,
      });
assert.equal(lexicalGate.error, undefined, "lexical_gate_spawn_failed");
assert.equal(lexicalGate.status, 0, lexicalGate.stderr);
assert.match(
  lexicalGate.stdout,
  /verifiedLexicalItemEvidenceRows=2 rowsPromoted=0 task7Contacts=UNVERIFIED status=HOLD/u,
);

console.log(
  "TASK6B3_CANDIDATE_VALIDATED canonicalRows=2 verifiedLexicalItemEvidenceRows=2 rowsPromoted=0 task7Contacts=UNVERIFIED status=HOLD",
);
