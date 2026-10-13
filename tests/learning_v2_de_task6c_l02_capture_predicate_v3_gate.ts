import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildGermanTask6cL02CapturePredicateDeV3,
  validateGermanTask6cL02CapturePredicateDeV3,
} from "../modules/learning-v2/curriculum/de/task6c_l02_capture_predicate_de_v3";
import { buildGermanTask6cL02CaptureArchiveDeV3 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_archive_de_v3";
import { getGermanTask6cL02CaptureProducerContractDeV3 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_producer_contract_de_v3";
import {
  buildGermanTask6cL02CaptureEvidenceFilesDeV3,
  validateGermanTask6cL02CaptureResponseDeV3,
} from "../modules/learning-v2/curriculum/de/task6c_l02_capture_producer_de_v3";

const sha256 = (bytes: Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");
const contract = getGermanTask6cL02CaptureProducerContractDeV3();
const captures = contract.roster.map((row) => {
  const body = Buffer.from(
    `<!doctype html><html><head><link rel="canonical" href="${row.canonicalUrl}"/><title>${row.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS</title></head><body><h1><b>${row.lemma}</b></h1><section id="${row.sourceAnchor}">sense</section></body></html>`,
    "utf8",
  );
  return validateGermanTask6cL02CaptureResponseDeV3(row, {
    canonicalUrl: row.canonicalUrl,
    statusCode: 200,
    rawHeaders: [
      "Content-Type",
      "text/html; charset=UTF-8",
      "Content-Encoding",
      "identity",
    ],
    encodedEntityChunks: [body],
    dnsAddresses: ["93.184.216.34"],
    connectedAddress: "93.184.216.34",
    tls: {
      authorized: true,
      protocol: "TLSv1.3",
      servername: "www.dwds.de",
      subjectAltName: "DNS:www.dwds.de",
    },
  });
});
const files = buildGermanTask6cL02CaptureEvidenceFilesDeV3(captures, {
  startedAt: "2026-10-12T12:00:00.000Z",
  completedAt: "2026-10-12T12:00:04.000Z",
  sourceSha: "a".repeat(40),
});
const archive = buildGermanTask6cL02CaptureArchiveDeV3(files);
const predicateBytes = buildGermanTask6cL02CapturePredicateDeV3({
  sourceSha: "a".repeat(40),
  files,
  archive,
});
assert.equal(predicateBytes.at(-1), 0x0a);
assert.equal(predicateBytes.subarray(0, -1).includes(0x0a), false);
const predicate = validateGermanTask6cL02CapturePredicateDeV3(
  predicateBytes,
  files,
  archive,
);
assert.equal(
  predicate.predicateType,
  "https://phraseman.app/attestations/learning-v2-de-task6c-l02-capture/v3",
);
assert.equal(
  predicate.captureContract.inputDigestSha256,
  contract.inputDigestSha256,
);
assert.deepEqual(
  predicate.captureContract.implementationFiles,
  contract.implementationFiles,
);
assert.deepEqual(predicate.predecessor, contract.predecessor);
assert.deepEqual(predicate.task5, contract.task5);
assert.deepEqual(predicate.workflow, {
  ...contract.workflow,
  repository: "badloar-star/phraseman",
  ref: "refs/heads/master",
  sourceSha: "a".repeat(40),
});
assert.deepEqual(predicate.networkPolicy, contract.networkPolicy);
assert.equal(predicate.manifest.sha256, sha256(files.get("manifest.json")!));
assert.equal(predicate.evidence.length, 12);
assert.equal(
  predicate.subject.name,
  "learning-v2-de-task6c-l02-capture-v3.tar",
);
assert.equal(predicate.subject.mediaType, "application/x-tar");
assert.equal(predicate.subject.sha256, sha256(archive));
assert.equal(predicate.subject.bytes, archive.length);
assert.deepEqual(predicate.authority, {
  canonicalAdmission: "FORBIDDEN",
  learnerFacing: false,
  releaseAuthorized: false,
  rowsPromoted: 0,
  task7Unlock: false,
  translationsPresent: false,
});
assert.equal(Object.hasOwn(predicate, "signature"), false);
assert.equal(Object.hasOwn(predicate, "bundle"), false);
assert.equal(Object.hasOwn(predicate, "receipt"), false);

const pretty = Buffer.from(JSON.stringify(predicate, null, 2) + "\n", "utf8");
assert.throws(
  () => validateGermanTask6cL02CapturePredicateDeV3(pretty, files, archive),
  /CAPTURE_PREDICATE_NOT_CANONICAL/u,
);
const modified = JSON.parse(predicateBytes.toString("utf8"));
modified.authority.releaseAuthorized = true;
assert.throws(
  () =>
    validateGermanTask6cL02CapturePredicateDeV3(
      Buffer.from(JSON.stringify(modified) + "\n", "utf8"),
      files,
      archive,
    ),
  /CAPTURE_PREDICATE_(NOT_CANONICAL|AUTHORITY_ESCALATION)/u,
);
assert.throws(
  () =>
    buildGermanTask6cL02CapturePredicateDeV3({
      sourceSha: "A".repeat(40),
      files,
      archive,
    }),
  /CAPTURE_PREDICATE_SOURCE_SHA_INVALID/u,
);
assert.throws(
  () =>
    buildGermanTask6cL02CapturePredicateDeV3({
      sourceSha: "a".repeat(40),
      files,
      archive: Buffer.from("text/plain arbitrary content", "utf8"),
    }),
  /CAPTURE_PREDICATE_SUBJECT_NOT_DETERMINISTIC/u,
);
const predicateCliSource = readFileSync(
  path.resolve(
    __dirname,
    "../scripts/build_learning_v2_de_task6c_l02_capture_predicate_v3.ts",
  ),
  "utf8",
);
assert.match(predicateCliSource, /files,/u);
assert.match(predicateCliSource, /archive: archiveBytes/u);
assert.doesNotMatch(predicateCliSource, /sha256.*archiveBytes/u);

process.stdout.write(
  `LEARNING V2 GERMAN L02 CAPTURE PREDICATE V3 OFFLINE GATE: PASS (evidence=12; signed=false; input=${contract.inputDigestSha256})\n`,
);
