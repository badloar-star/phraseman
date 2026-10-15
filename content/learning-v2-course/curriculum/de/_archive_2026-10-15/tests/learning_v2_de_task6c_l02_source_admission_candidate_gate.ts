import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  loadGermanTask6cL02SourceAdmissionCandidateDeV1,
  type GermanTask6cL02SourceAdmissionCandidateAnchorPathsDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_l02_source_admission_candidate_de_v1";

const repo = process.cwd();
const candidateRoot = path.join(
  repo,
  "modules/learning-v2/curriculum/de/evidence/task6c_l02_source_admission_candidate_v1",
);
const evidenceRoot = path.join(
  repo,
  "modules/learning-v2/curriculum/de/evidence/learning-v2-de-task6c-l02-identity-capture-v4-live-20261012T085552906Z",
);
const task5Path = path.join(
  repo,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const anchorPaths: GermanTask6cL02SourceAdmissionCandidateAnchorPathsDeV1 = {
  lexicalEvidence: path.join(
    repo,
    "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts",
  ),
  lexicalRegistry: path.join(
    repo,
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json",
  ),
  task6Kernel: path.join(
    repo,
    "modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts",
  ),
  canonicalBundle: path.join(
    repo,
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json",
  ),
};

type Fixture = Readonly<{
  root: string;
  manifestPath: string;
  evidenceRoot: string;
  task5Path: string;
  anchorPaths: GermanTask6cL02SourceAdmissionCandidateAnchorPathsDeV1;
}>;

const read = (pathname: string): any =>
  JSON.parse(fs.readFileSync(pathname, "utf8"));
const write = (pathname: string, value: unknown): void =>
  fs.writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`, "utf8");

function fixture(options: Readonly<{ copyEvidence?: boolean }> = {}): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-l02-admission-"));
  const manifestPath = path.join(root, "manifest.json");
  fs.copyFileSync(path.join(candidateRoot, "manifest.json"), manifestPath);
  const copiedTask5 = path.join(root, "task5.json");
  fs.copyFileSync(task5Path, copiedTask5);
  const copiedAnchors = Object.fromEntries(
    Object.entries(anchorPaths).map(([name, source]) => {
      const target = path.join(root, `anchor-${name}${path.extname(source)}`);
      fs.copyFileSync(source, target);
      return [name, target];
    }),
  ) as GermanTask6cL02SourceAdmissionCandidateAnchorPathsDeV1;
  const copiedEvidence = options.copyEvidence
    ? path.join(root, "capture")
    : evidenceRoot;
  if (options.copyEvidence)
    fs.cpSync(evidenceRoot, copiedEvidence, { recursive: true });
  return {
    root,
    manifestPath,
    evidenceRoot: copiedEvidence,
    task5Path: copiedTask5,
    anchorPaths: copiedAnchors,
  };
}

function load(value: Fixture = fixture()) {
  return loadGermanTask6cL02SourceAdmissionCandidateDeV1({
    manifestPathForTest: value.manifestPath,
    evidenceRootForTest: value.evidenceRoot,
    task5PathForTest: value.task5Path,
    anchorPathsForTest: value.anchorPaths,
  });
}

function hostile(
  mutate: (value: Fixture) => void,
  expected: RegExp,
  options: Readonly<{ copyEvidence?: boolean }> = {},
): void {
  const value = fixture(options);
  try {
    mutate(value);
    assert.throws(() => load(value), expected);
  } finally {
    fs.rmSync(value.root, { recursive: true, force: true });
  }
}

const result = load();
assert.deepEqual(result, {
  status: "HOLD",
  admissionStatus: "PARTIAL_CANDIDATE",
  candidateAcceptance: "HOLD",
  reviewStatus: "PENDING_INDEPENDENT_REVIEW",
  canonicalAdmission: "FORBIDDEN",
  rowsPromoted: 0,
  task7Unlock: false,
  learnerFacing: false,
  releaseAuthorized: false,
  rows: 4,
});

hostile((value) => {
  const candidate = read(value.manifestPath);
  candidate.status = "PASS";
  candidate.canonicalAdmission = "CANONICAL";
  candidate.rowsPromoted = 4;
  candidate.task7Unlock = true;
  candidate.learnerFacing = true;
  candidate.releaseAuthorized = true;
  write(value.manifestPath, candidate);
}, /task6c_l02_admission_authority/u);

hostile((value) => {
  const candidate = read(value.manifestPath);
  candidate.rows.pop();
  write(value.manifestPath, candidate);
}, /task6c_l02_admission_roster/u);

hostile((value) => {
  const candidate = read(value.manifestPath);
  candidate.rows[0].sourcePlanId = "de_lex_plan_l02_c02_teller_v1";
  write(value.manifestPath, candidate);
}, /task6c_l02_admission_row_identity/u);

hostile((value) => {
  const candidate = read(value.manifestPath);
  candidate.rows[2].source.definitionGerman = "fabricated";
  write(value.manifestPath, candidate);
}, /task6c_l02_admission_source_definition/u);

hostile((value) => {
  const candidate = read(value.manifestPath);
  candidate.rows[0].lexicalPackage.verb.valencyFrame = "transitive";
  write(value.manifestPath, candidate);
}, /task6c_l02_admission_lexical_package/u);

hostile((value) => {
  const candidate = read(value.manifestPath);
  candidate.rows[1].lexicalPackage.noun.article = "der";
  write(value.manifestPath, candidate);
}, /task6c_l02_admission_lexical_package/u);

hostile((value) => {
  const candidate = read(value.manifestPath);
  candidate.platformExecution.captureEventId = "exec-forged";
  write(value.manifestPath, candidate);
}, /task6c_l02_admission_platform_provenance/u);

hostile((value) => {
  fs.appendFileSync(value.task5Path, "\n");
}, /task6c_l02_admission_task5_bytes/u);

hostile((value) => {
  fs.appendFileSync(value.anchorPaths.task6Kernel, "\n// drift\n");
}, /task6c_l02_admission_anchor_bytes/u);

hostile(
  (value) => {
    fs.appendFileSync(
      path.join(value.evidenceRoot, "decoded-representation/tasse.html"),
      "x",
    );
  },
  /(?:identity_capture|task6c_l02_admission_capture)/u,
  { copyEvidence: true },
);

hostile((value) => {
  const candidate = read(value.manifestPath);
  candidate.rows[0].translationByLocale = { ru: "жить", uk: "жити" };
  write(value.manifestPath, candidate);
}, /task6c_l02_admission_row_schema/u);

process.stdout.write(
  "TASK6C_L02_SOURCE_ADMISSION_CANDIDATE_GATE PASS rows=4 status=HOLD admissionStatus=PARTIAL_CANDIDATE rowsPromoted=0 task7Unlock=false review=PENDING_INDEPENDENT_REVIEW\n",
);
