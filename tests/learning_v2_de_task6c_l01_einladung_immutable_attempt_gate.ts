import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { loadGermanTask6cL01EinladungImmutableAttemptDeV1 } from "../modules/learning-v2/curriculum/de/task6c_l01_einladung_immutable_attempt_de_v1";

const repo = process.cwd();
const root = path.join(repo, "modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_immutable_attempt_v1");
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const read = (pathname: string): any => JSON.parse(fs.readFileSync(pathname, "utf8"));
const write = (pathname: string, value: unknown): void => fs.writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`, "utf8");
function fixture() { const directory = fs.mkdtempSync(path.join(os.tmpdir(), "einladung-attempt-")); const evidence = path.join(directory, "evidence"); fs.cpSync(root, evidence, { recursive: true }); return { directory, evidence }; }
function hostile(mutate: (value: ReturnType<typeof fixture>) => void, expression: RegExp): void { const value = fixture(); try { mutate(value); assert.throws(() => loadGermanTask6cL01EinladungImmutableAttemptDeV1({ rootForTest: value.evidence }), expression); } finally { fs.rmSync(value.directory, { recursive: true, force: true }); } }

const attempt = loadGermanTask6cL01EinladungImmutableAttemptDeV1();
assert.equal(attempt.status, "PARTIAL_TASK6C_CURRENT_STATE_ACCEPTED");
assert.equal(attempt.canonicalAdmission, "FORBIDDEN");
assert.equal(attempt.task6Completion, "NOT_ESTABLISHED");
assert.equal(attempt.releaseStatus, "HOLD");

hostile((value) => { const p = path.join(value.evidence, "attempt.json"), v = read(p); v.snapshot.admissionManifestSha256 = "0".repeat(64); write(p, v); }, /einladung_attempt_snapshot/u);
hostile((value) => { const p = path.join(value.evidence, "attempt.json"), v = read(p); v.bindings.admissionManifest.sha256 = "0".repeat(64); write(p, v); }, /einladung_attempt_binding/u);
hostile((value) => { const p = path.join(value.evidence, "attempt.json"), v = read(p); v.bindings.receiptClosure.sha256 = "0".repeat(64); write(p, v); }, /einladung_attempt_binding/u);
hostile((value) => { const p = path.join(value.evidence, "attempt.json"), v = read(p); v.status = "COMPLETE"; write(p, v); }, /einladung_attempt_authority/u);
hostile((value) => { const p = path.join(value.evidence, "attempt.json"), v = read(p); v.task7Unlock = true; write(p, v); }, /einladung_attempt_authority/u);
hostile((value) => { const p = path.join(value.evidence, "attempt.json"), v = read(p); v.canonicalAdmission = "CANONICAL"; write(p, v); }, /einladung_attempt_authority/u);
hostile((value) => { const p = path.join(value.evidence, "attempt.json"), v = read(p); v.learnerFacing = true; write(p, v); }, /einladung_attempt_authority/u);
hostile((value) => { const p = path.join(value.evidence, "attempt.json"), v = read(p); v.release = "RELEASED"; write(p, v); }, /einladung_attempt_schema/u);

for (const pathname of ["modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_immutable_attempt_v1/attempt.json", "modules/learning-v2/curriculum/de/task6c_l01_einladung_immutable_attempt_de_v1.ts", "tests/learning_v2_de_task6c_l01_einladung_immutable_attempt_gate.ts"]) assert.notEqual(spawnSync("git", ["cat-file", "-e", `HEAD:${pathname}`], { cwd: repo }).status, 0, `${pathname} must be absent from HEAD`);
process.stdout.write(`TASK6C_L01_EINLADUNG_IMMUTABLE_ATTEMPT status=${attempt.status} canonicalAdmission=${attempt.canonicalAdmission} task7Unlock=false\n`);
