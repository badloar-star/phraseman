import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import * as fs from "node:fs";
import * as https from "node:https";
import * as path from "node:path";
import type { TLSSocket } from "node:tls";

import {
  buildGermanTask6cL02IdentityCaptureEvidenceFilesDeV4,
  GERMAN_TASK6C_L02_IDENTITY_CAPTURE_PATHS_DE_V4,
  GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4,
  GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4,
  getGermanTask6cL02IdentityCaptureContractDeV4,
  type GermanTask6cL02IdentityCaptureRosterRowDeV4,
  type GermanTask6cL02IdentityCaptureValidatedResponseDeV4,
  validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4,
  validateGermanTask6cL02IdentityCaptureResponseDeV4,
} from "../modules/learning-v2/curriculum/de/task6c_l02_identity_capture_transport_de_v4";

const REPO_ROOT = path.resolve(__dirname, "..");
const EVIDENCE_PARENT = path.join(
  REPO_ROOT,
  "modules/learning-v2/curriculum/de/evidence",
);
const RESPONSE_TIMEOUT_MS = 30_000;

const FROZEN_FILES = Object.freeze([
  Object.freeze({
    path: "modules/learning-v2/curriculum/de/task6c_l02_identity_capture_transport_de_v4.ts",
    sha256: "fe43a73bdc1af25124006e2bfc9f445d5feab40cc14e00712b38a045b7adfc6a",
  }),
  Object.freeze({
    path: "scripts/inspect_learning_v2_de_task6c_l02_identity_capture_v4.ts",
    sha256: "09f43dd4a5e9e46e1b0dfd35fd6ac5a105e5c17707738e8e7e1783e2f10740bf",
  }),
  Object.freeze({
    path: "tests/learning_v2_de_task6c_l02_identity_capture_transport_v4_gate.ts",
    sha256: "32fd5d871d73dbe8e7dde34a7454f4ccc5fc1ca50ddbda84e97e1be095047aa0",
  }),
  Object.freeze({
    path: "docs/v2/curriculum/de/task6c-l02-identity-capture-transport-v4/README.md",
    sha256: "e4e27990457bd7897c84f29685fd1fc0a4df026cbefe1a1feeb98b5d29ad2c90",
  }),
]);

function fail(code: string): never {
  throw new Error(code);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readRepoFile(relativePath: string): Buffer {
  const absolutePath = path.join(REPO_ROOT, ...relativePath.split("/"));
  if (!fs.existsSync(absolutePath)) fail("CAPTURE_V4_LIVE_FROZEN_FILE_MISSING");
  return fs.readFileSync(absolutePath);
}

function assertFrozenInputs(): void {
  for (const descriptor of FROZEN_FILES) {
    if (sha256(readRepoFile(descriptor.path)) !== descriptor.sha256) {
      fail("CAPTURE_V4_LIVE_FROZEN_HASH_MISMATCH");
    }
  }
  const contract = getGermanTask6cL02IdentityCaptureContractDeV4();
  if (
    contract.inputDigestSha256 !==
    "46b37ef51279390e64dfe29f10ce256a0525684718df1a04d93ac4af43a768b2"
  ) {
    fail("CAPTURE_V4_LIVE_INPUT_DIGEST_MISMATCH");
  }
}

function gitHead(): string {
  const value = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  if (!/^[0-9a-f]{40}$/u.test(value)) fail("CAPTURE_V4_LIVE_HEAD_INVALID");
  return value;
}

function requestHeaderObservation(): Readonly<Record<string, string>> {
  return Object.freeze({
    ...GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.headers,
  });
}

async function captureOne(
  row: GermanTask6cL02IdentityCaptureRosterRowDeV4,
): Promise<GermanTask6cL02IdentityCaptureValidatedResponseDeV4> {
  const url = new URL(row.canonicalUrl);
  const dnsResults = await lookup(url.hostname, {
    all: true,
    verbatim: true,
  });
  const dnsAddresses = [...new Set(dnsResults.map(({ address }) => address))];
  if (dnsAddresses.length === 0) fail("CAPTURE_V4_LIVE_DNS_EMPTY");

  return new Promise((resolve, reject) => {
    let settled = false;
    let responseSeen = false;
    const finishReject = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    const request = https.request(
      url,
      {
        method: GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.method,
        headers: requestHeaderObservation(),
        servername: url.hostname,
      },
      (response) => {
        responseSeen = true;
        const chunks: Buffer[] = [];
        let accumulatedBytes = 0;
        let endObserved = false;
        let errorObserved = false;
        let aborted = response.aborted;
        let closeBeforeEnd = false;
        const socket = response.socket as TLSSocket;
        const connectedAddress = socket.remoteAddress ?? "";
        const peerCertificate = socket.getPeerCertificate();
        const tlsObservation = Object.freeze({
          authorized: socket.authorized,
          protocol: socket.getProtocol(),
          servername: socket.servername ?? "",
          subjectAltName:
            typeof peerCertificate.subjectaltname === "string"
              ? peerCertificate.subjectaltname
              : "",
        });

        response.on("data", (chunk: unknown) => {
          if (!Buffer.isBuffer(chunk)) {
            response.destroy(new Error("CAPTURE_V4_LIVE_NON_BUFFER_CHUNK"));
            return;
          }
          accumulatedBytes += chunk.length;
          if (
            accumulatedBytes >
            GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.maximumBodyBytes
          ) {
            response.destroy(new Error("CAPTURE_V4_LIVE_BODY_SIZE_INVALID"));
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        response.on("aborted", () => {
          aborted = true;
        });
        response.on("error", (error) => {
          errorObserved = true;
          finishReject(error);
        });
        response.on("close", () => {
          if (!endObserved) {
            closeBeforeEnd = true;
            finishReject(new Error("CAPTURE_V4_LIVE_CLOSE_BEFORE_END"));
          }
        });
        response.on("end", () => {
          endObserved = true;
          try {
            const validated =
              validateGermanTask6cL02IdentityCaptureResponseDeV4(row, {
                request: {
                  method: request.method,
                  headers: requestHeaderObservation(),
                  redirectMode:
                    GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.redirectMode,
                  maxRedirects:
                    GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.maxRedirects,
                },
                finalUrl: url.href,
                statusCode: response.statusCode,
                httpVersion: response.httpVersion,
                endObserved,
                complete: response.complete,
                aborted,
                errorObserved,
                closeBeforeEnd,
                rawHeaders: [...response.rawHeaders],
                rawTrailers: [...response.rawTrailers],
                bodyChunks: chunks,
                dnsAddresses,
                connectedAddress,
                tls: tlsObservation,
              });
            if (!settled) {
              settled = true;
              resolve(validated);
            }
          } catch (error) {
            finishReject(error);
          }
        });
      },
    );

    request.setTimeout(RESPONSE_TIMEOUT_MS, () => {
      request.destroy(new Error("CAPTURE_V4_LIVE_TIMEOUT"));
    });
    request.on("error", finishReject);
    request.on("close", () => {
      if (!responseSeen && !settled) {
        finishReject(new Error("CAPTURE_V4_LIVE_REQUEST_CLOSED"));
      }
    });

    const explicitNames = request
      .getHeaderNames()
      .filter((name) => name !== "host")
      .sort();
    const expectedNames = Object.keys(requestHeaderObservation()).sort();
    if (JSON.stringify(explicitNames) !== JSON.stringify(expectedNames)) {
      request.destroy(new Error("CAPTURE_V4_LIVE_OUTGOING_HEADERS_MISMATCH"));
      return;
    }
    for (const [name, value] of Object.entries(requestHeaderObservation())) {
      if (request.getHeader(name) !== value) {
        request.destroy(new Error("CAPTURE_V4_LIVE_OUTGOING_HEADERS_MISMATCH"));
        return;
      }
    }
    request.end();
  });
}

function safeEvidenceRoot(startedAt: string): string {
  const suffix = startedAt.replace(/[-:.]/gu, "");
  if (!/^\d{8}T\d{6}\d{3}Z$/u.test(suffix)) {
    fail("CAPTURE_V4_LIVE_OUTPUT_SUFFIX_INVALID");
  }
  return path.join(
    EVIDENCE_PARENT,
    `${GERMAN_TASK6C_L02_IDENTITY_CAPTURE_PATHS_DE_V4.evidenceRootName}-live-${suffix}`,
  );
}

function writeEvidence(
  outputRoot: string,
  files: ReadonlyMap<string, Buffer>,
): void {
  if (fs.existsSync(outputRoot)) fail("CAPTURE_V4_LIVE_OUTPUT_EXISTS");
  fs.mkdirSync(outputRoot);
  for (const relativePath of [...files.keys()].sort()) {
    const bytes = files.get(relativePath);
    if (!bytes) fail("CAPTURE_V4_LIVE_OUTPUT_MISSING");
    const absolutePath = path.resolve(outputRoot, ...relativePath.split("/"));
    const rootPrefix = `${path.resolve(outputRoot)}${path.sep}`;
    if (!absolutePath.startsWith(rootPrefix)) {
      fail("CAPTURE_V4_LIVE_OUTPUT_PATH_INVALID");
    }
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, bytes, { flag: "wx" });
  }
}

function readEvidence(outputRoot: string): ReadonlyMap<string, Buffer> {
  return new Map(
    GERMAN_TASK6C_L02_IDENTITY_CAPTURE_PATHS_DE_V4.evidenceFileAllowlist.map(
      (relativePath) => [
        relativePath,
        fs.readFileSync(path.join(outputRoot, ...relativePath.split("/"))),
      ],
    ),
  );
}

async function main(): Promise<void> {
  assertFrozenInputs();
  const sourceSha = gitHead();
  const startedAt = new Date().toISOString();
  const captures: GermanTask6cL02IdentityCaptureValidatedResponseDeV4[] = [];
  for (const row of GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4) {
    captures.push(await captureOne(row));
  }
  const completedAt = new Date().toISOString();
  assertFrozenInputs();

  const files = buildGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(captures, {
    startedAt,
    completedAt,
    sourceSha,
  });
  const inMemoryManifest =
    validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(files);
  if (inMemoryManifest.status !== "HOLD_CAPTURE_ONLY") {
    fail("CAPTURE_V4_LIVE_AUTHORITY_ESCALATION");
  }

  const outputRoot = safeEvidenceRoot(startedAt);
  writeEvidence(outputRoot, files);
  const diskFiles = readEvidence(outputRoot);
  const diskManifest =
    validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(diskFiles);
  if (diskManifest.status !== "HOLD_CAPTURE_ONLY") {
    fail("CAPTURE_V4_LIVE_DISK_AUTHORITY_ESCALATION");
  }

  const report = {
    status: "HOLD_CAPTURE_ONLY",
    outputRoot: path.relative(REPO_ROOT, outputRoot).replaceAll("\\", "/"),
    sourceSha,
    inputDigestSha256:
      getGermanTask6cL02IdentityCaptureContractDeV4().inputDigestSha256,
    captureWindow: { startedAt, completedAt },
    files: [...diskFiles.entries()]
      .map(([filePath, bytes]) => ({
        path: filePath,
        bytes: bytes.length,
        sha256: sha256(bytes),
      }))
      .sort((left, right) => left.path.localeCompare(right.path)),
    authority: {
      canonicalAdmission: "FORBIDDEN",
      rowsPromoted: 0,
      task7Unlock: false,
      learnerFacing: false,
      releaseAuthorized: false,
      translationsPresent: false,
    },
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
