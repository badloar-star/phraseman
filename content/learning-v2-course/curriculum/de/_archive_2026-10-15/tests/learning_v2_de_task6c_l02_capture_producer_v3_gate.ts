import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, deflateSync, gzipSync } from "node:zlib";

import {
  GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3,
  computeGermanTask6cL02CaptureProducerInputDigestDeV3,
  getGermanTask6cL02CaptureProducerContractDeV3,
} from "../modules/learning-v2/curriculum/de/task6c_l02_capture_producer_contract_de_v3";
import {
  assertGermanTask6cL02CaptureProducerRuntimeSnapshotDeV3,
  buildGermanTask6cL02CaptureEvidenceFilesDeV3,
  isGermanTask6cL02CapturePublicIpDeV3,
  normalizeGermanTask6cL02CaptureHeadersDeV3,
  validateGermanTask6cL02CaptureEvidenceFilesDeV3,
  validateGermanTask6cL02CaptureResponseDeV3,
} from "../modules/learning-v2/curriculum/de/task6c_l02_capture_producer_de_v3";

const REPO_ROOT = path.resolve(__dirname, "..");
const sha256 = (bytes: Buffer | string): string =>
  createHash("sha256").update(bytes).digest("hex");

const contract = getGermanTask6cL02CaptureProducerContractDeV3();

assert.equal(
  contract.schemaVersion,
  "learning-v2-de-task6c-l02-capture-producer-contract.v3",
);
assert.equal(contract.targetLanguage, "de");
assert.equal(
  contract.predecessor.inputDigestSha256,
  "d241bc8dfbeb828712972d58e8070aedc7ab9f7f5edf88d143902d3ff3c1163a",
);
assert.equal(
  contract.predecessor.transportModuleSha256,
  "71dbacbe5c43ef32c956f8a8d1dc4c427c6ee8870232dc2bd07ea74f4afed752",
);
assert.equal(
  contract.predecessor.preparationScriptSha256,
  "84f32d2592cd8efdc8d7b764efe1d3e49cbe4cd7950e2717ed0b83919307192a",
);
assert.equal(
  contract.task5.byteSha256,
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
);
assert.equal(
  contract.task5.canonicalBodySha256,
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3",
);
assert.equal(
  contract.workflow.sha256,
  "5a0ed33bd69a70eee644e00266aecf0f35126ce1097f5f0d7f11d9fc6476b4a6",
);
assert.deepEqual(
  contract.roster.map(({ lemma, canonicalUrl, outputSlug }) => ({
    lemma,
    canonicalUrl,
    outputSlug,
  })),
  [
    {
      lemma: "wohnen",
      canonicalUrl: "https://www.dwds.de/wb/wohnen",
      outputSlug: "wohnen",
    },
    {
      lemma: "Küche",
      canonicalUrl: "https://www.dwds.de/wb/K%C3%BCche",
      outputSlug: "kueche",
    },
    {
      lemma: "Tasse",
      canonicalUrl: "https://www.dwds.de/wb/Tasse",
      outputSlug: "tasse",
    },
    {
      lemma: "Teller",
      canonicalUrl: "https://www.dwds.de/wb/Teller",
      outputSlug: "teller",
    },
  ],
);
assert.equal(contract.networkPolicy.httpStack, "node:https");
assert.equal(contract.networkPolicy.maxRedirects, 0);
assert.equal(
  contract.networkPolicy.dnsPolicy,
  "ALL_RESOLVED_AND_CONNECTED_ADDRESSES_PUBLIC",
);
assert.equal(
  contract.networkPolicy.tlsPolicy,
  "AUTHORIZED_TLS_1_2_OR_1_3_EXACT_HOST",
);
assert.equal(contract.implementationFiles.length, 7);
assert.deepEqual(
  contract.implementationFiles.map(({ path: filePath }) => filePath),
  [
    "modules/learning-v2/curriculum/de/task6c_l02_capture_archive_de_v3.ts",
    "modules/learning-v2/curriculum/de/task6c_l02_capture_predicate_de_v3.ts",
    "modules/learning-v2/curriculum/de/task6c_l02_capture_producer_contract_de_v3.ts",
    "modules/learning-v2/curriculum/de/task6c_l02_capture_producer_de_v3.ts",
    "scripts/build_learning_v2_de_task6c_l02_capture_archive_v3.ts",
    "scripts/build_learning_v2_de_task6c_l02_capture_predicate_v3.ts",
    "scripts/produce_learning_v2_de_task6c_l02_capture_v3.ts",
  ],
);
for (const descriptor of contract.implementationFiles) {
  assert.equal(
    descriptor.sha256,
    sha256(readFileSync(path.join(REPO_ROOT, ...descriptor.path.split("/")))),
    `implementation hash drift: ${descriptor.path}`,
  );
}
const changedFiles = contract.implementationFiles.map((descriptor, index) =>
  index === 0 ? { ...descriptor, sha256: "0".repeat(64) } : descriptor,
);
assert.notEqual(
  computeGermanTask6cL02CaptureProducerInputDigestDeV3(changedFiles),
  contract.inputDigestSha256,
  "implementation byte drift must change the v3 digest",
);

const validRuntime = {
  argumentCount: 0,
  env: {
    GITHUB_ACTIONS: "true",
    CI: "true",
    RUNNER_ENVIRONMENT: "github-hosted",
    GITHUB_REPOSITORY: "badloar-star/phraseman",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/master",
    GITHUB_REF_PROTECTED: "true",
    GITHUB_WORKFLOW_REF:
      "badloar-star/phraseman/.github/workflows/learning-v2-de-l02-capture-attestation.yml@refs/heads/master",
    GITHUB_SHA: "a".repeat(40),
    GITHUB_WORKFLOW_SHA: "a".repeat(40),
    GITHUB_WORKSPACE: "/runner/work/phraseman/phraseman",
    RUNNER_TEMP: "/runner/_temp",
  },
  cwdRealpath: "/runner/work/phraseman/phraseman",
  workspaceRealpath: "/runner/work/phraseman/phraseman",
  gitHead: "a".repeat(40),
  gitStatusPorcelain: "",
  runnerTempIsAbsolute: true,
  runnerTempIsSymlink: false,
  runnerTempIsDirectory: true,
  outputRootExists: false,
} as const;

const {
  runnerTempIsDirectory: _runnerTempIsDirectory,
  ...runtimeWithoutDirectory
} = validRuntime;

assert.doesNotThrow(() =>
  assertGermanTask6cL02CaptureProducerRuntimeSnapshotDeV3(validRuntime),
);
const runtimeCases: readonly [string, unknown][] = [
  [
    "CAPTURE_PRODUCER_CALLER_INPUT_FORBIDDEN",
    { ...validRuntime, argumentCount: 1 },
  ],
  [
    "CAPTURE_PRODUCER_GITHUB_ACTIONS_REQUIRED",
    { ...validRuntime, env: { ...validRuntime.env, GITHUB_ACTIONS: "false" } },
  ],
  [
    "CAPTURE_PRODUCER_CI_REQUIRED",
    { ...validRuntime, env: { ...validRuntime.env, CI: "false" } },
  ],
  [
    "CAPTURE_PRODUCER_RUNNER_NOT_GITHUB_HOSTED",
    {
      ...validRuntime,
      env: { ...validRuntime.env, RUNNER_ENVIRONMENT: "self-hosted" },
    },
  ],
  [
    "CAPTURE_PRODUCER_REPOSITORY_MISMATCH",
    {
      ...validRuntime,
      env: { ...validRuntime.env, GITHUB_REPOSITORY: "fork/phraseman" },
    },
  ],
  [
    "CAPTURE_PRODUCER_EVENT_MISMATCH",
    {
      ...validRuntime,
      env: { ...validRuntime.env, GITHUB_EVENT_NAME: "push" },
    },
  ],
  [
    "CAPTURE_PRODUCER_REF_MISMATCH",
    {
      ...validRuntime,
      env: { ...validRuntime.env, GITHUB_REF: "refs/heads/feature" },
    },
  ],
  [
    "CAPTURE_PRODUCER_WORKFLOW_REF_MISMATCH",
    {
      ...validRuntime,
      env: {
        ...validRuntime.env,
        GITHUB_WORKFLOW_REF:
          "badloar-star/phraseman/.github/workflows/other.yml@refs/heads/master",
      },
    },
  ],
  [
    "CAPTURE_PRODUCER_REF_UNPROTECTED",
    {
      ...validRuntime,
      env: { ...validRuntime.env, GITHUB_REF_PROTECTED: "false" },
    },
  ],
  [
    "CAPTURE_PRODUCER_SHA_INVALID",
    {
      ...validRuntime,
      env: { ...validRuntime.env, GITHUB_SHA: "A".repeat(40) },
    },
  ],
  [
    "CAPTURE_PRODUCER_WORKFLOW_SHA_MISMATCH",
    {
      ...validRuntime,
      env: { ...validRuntime.env, GITHUB_WORKFLOW_SHA: "b".repeat(40) },
    },
  ],
  [
    "CAPTURE_PRODUCER_WORKSPACE_MISMATCH",
    { ...validRuntime, cwdRealpath: "/tmp/elsewhere" },
  ],
  [
    "CAPTURE_PRODUCER_HEAD_MISMATCH",
    { ...validRuntime, gitHead: "b".repeat(40) },
  ],
  [
    "CAPTURE_PRODUCER_CHECKOUT_DIRTY",
    { ...validRuntime, gitStatusPorcelain: "?? hostile" },
  ],
  [
    "CAPTURE_PRODUCER_RUNNER_TEMP_INVALID",
    { ...validRuntime, runnerTempIsAbsolute: false },
  ],
  [
    "CAPTURE_PRODUCER_RUNNER_TEMP_INVALID",
    { ...validRuntime, runnerTempIsDirectory: false },
  ],
  ["CAPTURE_PRODUCER_RUNNER_TEMP_INVALID", runtimeWithoutDirectory],
  [
    "CAPTURE_PRODUCER_RUNNER_TEMP_SYMLINK",
    { ...validRuntime, runnerTempIsSymlink: true },
  ],
  [
    "CAPTURE_PRODUCER_IMMUTABLE_ROOT_EXISTS",
    { ...validRuntime, outputRootExists: true },
  ],
];
for (const [code, snapshot] of runtimeCases) {
  assert.throws(
    () => assertGermanTask6cL02CaptureProducerRuntimeSnapshotDeV3(snapshot),
    new RegExp(code, "u"),
  );
}

assert.equal(isGermanTask6cL02CapturePublicIpDeV3("93.184.216.34"), true);
assert.equal(
  isGermanTask6cL02CapturePublicIpDeV3("2606:2800:220:1:248:1893:25c8:1946"),
  true,
);
for (const blocked of [
  "127.0.0.1",
  "10.0.0.1",
  "100.64.0.1",
  "169.254.1.1",
  "172.16.0.1",
  "192.168.1.1",
  "192.0.2.1",
  "224.0.0.1",
  "::",
  "::1",
  "fc00::1",
  "fe80::1",
  "ff00::1",
  "2001::1",
  "2001:2::1",
  "2001:10::1",
  "2001:20::1",
  "2001:db8::1",
  "2002::1",
  "3fff::1",
  "::ffff:127.0.0.1",
  "not-an-ip",
])
  assert.equal(isGermanTask6cL02CapturePublicIpDeV3(blocked), false, blocked);

const htmlFor = (lemma: string, url: string): Buffer =>
  Buffer.from(
    `<!doctype html><html><head><link rel="canonical" href="${url}"/><title>${lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS</title></head><body><h1><b>${lemma}</b></h1><section id="d-1-1">sense</section></body></html>`,
    "utf8",
  );

const contentType = "text/html; charset=UTF-8";
const captures = contract.roster.map((row, index) => {
  const decoded = htmlFor(row.lemma, row.canonicalUrl);
  const codings = ["identity", "gzip", "br", "deflate"] as const;
  const coding = codings[index];
  const encoded =
    coding === "identity"
      ? decoded
      : coding === "gzip"
        ? gzipSync(decoded)
        : coding === "br"
          ? brotliCompressSync(decoded)
          : deflateSync(decoded);
  return validateGermanTask6cL02CaptureResponseDeV3(row, {
    canonicalUrl: row.canonicalUrl,
    statusCode: 200,
    rawHeaders: ["Content-Type", contentType, "Content-Encoding", coding],
    encodedEntityChunks: [encoded.subarray(0, 1), encoded.subarray(1)],
    dnsAddresses: ["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"],
    connectedAddress: "93.184.216.34",
    tls: {
      authorized: true,
      protocol: "TLSv1.3",
      servername: "www.dwds.de",
      subjectAltName: "DNS:www.dwds.de, DNS:dwds.de",
    },
  });
});

assert.deepEqual(
  normalizeGermanTask6cL02CaptureHeadersDeV3(["X-B", " two ", "x-a", "one"]),
  [
    { name: "x-a", value: "one" },
    { name: "x-b", value: "two" },
  ],
);
assert.throws(
  () => normalizeGermanTask6cL02CaptureHeadersDeV3(["x-a", "one\r\nunsafe"]),
  /CAPTURE_HEADER_VALUE_INVALID/u,
);

const firstRow = contract.roster[0];
const validFirst = {
  canonicalUrl: firstRow.canonicalUrl,
  statusCode: 200,
  rawHeaders: ["Content-Type", contentType, "Content-Encoding", "identity"],
  encodedEntityChunks: [htmlFor(firstRow.lemma, firstRow.canonicalUrl)],
  dnsAddresses: ["93.184.216.34"],
  connectedAddress: "93.184.216.34",
  tls: {
    authorized: true,
    protocol: "TLSv1.2",
    servername: "www.dwds.de",
    subjectAltName: "DNS:www.dwds.de",
  },
} as const;

const hostileResponses: readonly [string, unknown][] = [
  [
    "CAPTURE_URL_INVALID",
    { ...validFirst, canonicalUrl: "https://www.dwds.de/wb/wohnen?x=1" },
  ],
  ["CAPTURE_REDIRECT_FORBIDDEN", { ...validFirst, statusCode: 302 }],
  [
    "CAPTURE_DNS_ADDRESS_FORBIDDEN",
    { ...validFirst, dnsAddresses: ["127.0.0.1"] },
  ],
  [
    "CAPTURE_PEER_ADDRESS_MISMATCH",
    { ...validFirst, connectedAddress: "93.184.216.35" },
  ],
  [
    "CAPTURE_TLS_UNAUTHORIZED",
    { ...validFirst, tls: { ...validFirst.tls, authorized: false } },
  ],
  [
    "CAPTURE_TLS_PROTOCOL_INVALID",
    { ...validFirst, tls: { ...validFirst.tls, protocol: "TLSv1.1" } },
  ],
  [
    "CAPTURE_TLS_HOST_MISMATCH",
    {
      ...validFirst,
      tls: { ...validFirst.tls, subjectAltName: "DNS:example.com" },
    },
  ],
  [
    "CAPTURE_CONTENT_ENCODING_AMBIGUOUS",
    {
      ...validFirst,
      rawHeaders: ["Content-Type", contentType, "Content-Encoding", "gzip, br"],
    },
  ],
  [
    "CAPTURE_CONTENT_TYPE_MISMATCH",
    {
      ...validFirst,
      rawHeaders: [
        "Content-Type",
        "text/plain",
        "Content-Encoding",
        "identity",
      ],
    },
  ],
  [
    "CAPTURE_UTF8_INVALID",
    { ...validFirst, encodedEntityChunks: [Buffer.from([0xc3, 0x28])] },
  ],
  [
    "CAPTURE_DECODED_IDENTITY_INVALID",
    { ...validFirst, encodedEntityChunks: [Buffer.from("<html>wrong</html>")] },
  ],
];
for (const [code, response] of hostileResponses) {
  assert.throws(
    () => validateGermanTask6cL02CaptureResponseDeV3(firstRow, response),
    new RegExp(code, "u"),
    code,
  );
}

const compressedBomb = gzipSync(
  Buffer.alloc(contract.networkPolicy.maximumDecodedBytes + 1, 0x61),
);
assert.ok(
  compressedBomb.length < contract.networkPolicy.maximumEncodedBytes,
  "compressed bomb fixture must pass the encoded-size gate",
);
assert.throws(
  () =>
    validateGermanTask6cL02CaptureResponseDeV3(firstRow, {
      ...validFirst,
      rawHeaders: ["Content-Type", contentType, "Content-Encoding", "gzip"],
      encodedEntityChunks: [compressedBomb],
    }),
  /CAPTURE_DECODED_BODY_TOO_LARGE/u,
);

const files = buildGermanTask6cL02CaptureEvidenceFilesDeV3(captures, {
  startedAt: "2026-10-12T12:00:00.000Z",
  completedAt: "2026-10-12T12:00:04.000Z",
  sourceSha: "a".repeat(40),
});
assert.equal(files.size, 13);
assert.deepEqual(
  [...files.keys()].sort(),
  GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist,
);
const manifestBytes = files.get("manifest.json");
assert(manifestBytes);
assert.equal(manifestBytes.at(-1), 0x0a);
assert.equal(manifestBytes.subarray(0, -1).includes(0x0a), false);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
assert.equal(manifest.status, "HOLD_CAPTURE_ONLY");
assert.deepEqual(manifest.authority, {
  canonicalAdmission: "FORBIDDEN",
  learnerFacing: false,
  releaseAuthorized: false,
  rowsPromoted: 0,
  task7Unlock: false,
  translationsPresent: false,
});
assert.equal(manifest.captures.length, 4);
assert.equal(Object.hasOwn(manifest, "receipt"), false);
assert.equal(Object.hasOwn(manifest, "signature"), false);
assert.equal(
  validateGermanTask6cL02CaptureEvidenceFilesDeV3(files).status,
  "HOLD_CAPTURE_ONLY",
);
const tamperedFiles = new Map(files);
const tamperedPath = "decoded-representation/wohnen.html";
const tamperedBody = Buffer.from(
  tamperedFiles.get(tamperedPath) ?? Buffer.alloc(0),
);
tamperedBody[0] ^= 1;
tamperedFiles.set(tamperedPath, tamperedBody);
assert.throws(
  () => validateGermanTask6cL02CaptureEvidenceFilesDeV3(tamperedFiles),
  /CAPTURE_OUTPUT_TAMPERED/u,
);

const implementationSources = new Map(
  contract.implementationFiles.map((descriptor) => [
    descriptor.path,
    readFileSync(path.join(REPO_ROOT, ...descriptor.path.split("/")), "utf8"),
  ]),
);
for (const [filePath, source] of implementationSources) {
  assert.doesNotMatch(source, /\bfetch\s*\(/u, filePath);
  assert.doesNotMatch(source, /\bcurl\b/u, filePath);
  assert.doesNotMatch(source, /captureScript/u, filePath);
  assert.doesNotMatch(source, /OPENAI/u, filePath);
}
const producerSource = implementationSources.get(
  "modules/learning-v2/curriculum/de/task6c_l02_capture_producer_de_v3.ts",
)!;
assert.match(producerSource, /from "node:https"/u);
assert.match(producerSource, /rawHeaders/u);
assert.match(producerSource, /lookup/u);
assert.match(producerSource, /maxOutputLength/u);
assert.match(
  producerSource,
  /runGermanTask6cL02CaptureProducerDeV3\(\): Promise<void>/u,
);

process.stdout.write(
  `LEARNING V2 GERMAN L02 CAPTURE PRODUCER V3 OFFLINE GATE: PASS (rows=4; files=13; input=${contract.inputDigestSha256}; network=not-run; authority=HOLD)\n`,
);
