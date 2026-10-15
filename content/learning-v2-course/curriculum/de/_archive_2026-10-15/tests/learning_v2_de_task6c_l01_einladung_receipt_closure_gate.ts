import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadGermanTask6cL01EinladungReceiptClosureDeV1 } from "../modules/learning-v2/curriculum/de/task6c_l01_einladung_receipt_closure_de_v1";

const repo = process.cwd();
const root = path.join(repo, "modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_receipt_closure_v1");
const admission = path.join(repo, "modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_admission_v1/manifest.json");
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const read = (pathname: string): any => JSON.parse(fs.readFileSync(pathname, "utf8"));
const write = (pathname: string, value: unknown): void => fs.writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`, "utf8");
function fixture() { const directory = fs.mkdtempSync(path.join(os.tmpdir(), "einladung-receipt-")); const evidence = path.join(directory, "evidence"); fs.cpSync(root, evidence, { recursive: true }); const candidate = path.join(directory, "admission.json"); fs.copyFileSync(admission, candidate); return { directory, evidence, candidate }; }
function hostile(mutate: (value: ReturnType<typeof fixture>) => void, expression: RegExp): void { const value = fixture(); try { mutate(value); assert.throws(() => loadGermanTask6cL01EinladungReceiptClosureDeV1({ rootForTest: value.evidence, admissionManifestPathForTest: value.candidate }), expression); } finally { fs.rmSync(value.directory, { recursive: true, force: true }); } }

const receipt = loadGermanTask6cL01EinladungReceiptClosureDeV1();
assert.equal(receipt.candidateAcceptance, "ACCEPTED_UNDER_TASK6C_CURRENT_STATE");
assert.equal(receipt.canonicalAdmission, "FORBIDDEN");
assert.equal(receipt.task6CompletionEstablished, false);
assert.equal(receipt.task7Unlock, false);

hostile((value) => fs.appendFileSync(value.candidate, " "), /einladung_receipt_admission_binding/u);
hostile((value) => { const p = path.join(value.evidence, "native_review.json"), v = read(p); v.findings.p0ToP2 = 1; write(p, v); }, /einladung_receipt_native_review_hash/u);
hostile((value) => { const p = path.join(value.evidence, "adversarial_review.json"), v = read(p); v.fullForgeReplaysRejected = false; write(p, v); }, /einladung_receipt_adversarial_review_hash/u);
hostile((value) => { const p = path.join(value.evidence, "closure.json"), v = read(p); v.canonicalAdmission = "CANONICAL"; write(p, v); }, /einladung_receipt_closure_authority/u);
hostile((value) => { const p = path.join(value.evidence, "closure.json"), v = read(p); v.reviewRecords.native.selfProofOfIndependence = true; write(p, v); }, /einladung_receipt_closure_schema/u);
hostile((value) => { const p = path.join(value.evidence, "closure.json"), v = read(p); v.task6CompletionEstablished = true; write(p, v); }, /einladung_receipt_closure_authority/u);

process.stdout.write("TASK6C_L01_EINLADUNG_RECEIPT_CLOSURE candidateAcceptance=ACCEPTED_UNDER_TASK6C_CURRENT_STATE canonicalAdmission=FORBIDDEN task7Unlock=false\n");
