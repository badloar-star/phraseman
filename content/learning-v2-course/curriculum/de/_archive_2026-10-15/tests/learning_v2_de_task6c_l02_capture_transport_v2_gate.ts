import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign as signBytes,
} from "node:crypto";
import { gzipSync } from "node:zlib";

import {
  assertGermanTask6cL02CaptureRootAvailableDeV2,
  canonicalizeGermanTask6cL02CaptureReceiptPayloadDeV2,
  getGermanTask6cL02CaptureInputContractDeV2,
  loadGermanTask6cL02CaptureTransportDeV2,
  validateGermanTask6cL02CaptureTransportFixtureDeV2,
} from "../modules/learning-v2/curriculum/de/task6c_l02_capture_transport_de_v2";

type JsonRecord = Record<string, unknown>;
type Fixture = {
  readonly receiptBytes: Buffer;
  readonly trustRootBytes: Buffer;
  readonly manifestBytes: Buffer;
  readonly files: ReadonlyMap<string, Buffer>;
};

const sha256 = (bytes: Buffer | string): string =>
  createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (value: unknown): Buffer =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as JsonRecord;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  assert.notEqual(serialized, undefined);
  return serialized!;
};
const canonicalJsonLineBytes = (value: unknown): Buffer =>
  Buffer.from(`${canonicalJson(value)}\n`, "utf8");
const clone = <T>(value: T): T => structuredClone(value);
const asRecord = (value: unknown): JsonRecord => {
  assert(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as JsonRecord;
};

const keyPair = generateKeyPairSync("ed25519");
const publicKeySpkiPem = keyPair.publicKey.export({
  format: "pem",
  type: "spki",
}) as string;

function createFixture(): Fixture {
  const contract = getGermanTask6cL02CaptureInputContractDeV2();
  const files = new Map<string, Buffer>();
  const captures = contract.roster.map((entry) => {
    const title = `${entry.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS`;
    const html = Buffer.from(
      `<!doctype html><html><head><link rel="canonical" href="${entry.canonicalUrl}"/><title>${title}</title></head><body><h1><b>${entry.lemma}</b></h1><div class="dwdswb-lesart" id="${entry.sourceAnchor}">fixture sense</div></body></html>`,
      "utf8",
    );
    const encoded = gzipSync(html);
    const headerTranscript = canonicalJsonLineBytes({
      schemaVersion:
        "learning-v2-de-task6c-normalized-http-header-transcript.v2",
      statusLine: "HTTP/1.1 200 OK",
      headers: [
        { name: "content-encoding", value: "gzip" },
        { name: "content-type", value: "text/html; charset=UTF-8" },
      ],
    });
    const headerPath = `headers/${entry.outputSlug}.normalized.json`;
    const encodedPath = `encoded-entity/${entry.outputSlug}.bin`;
    const decodedPath = `decoded-representation/${entry.outputSlug}.html`;
    files.set(headerPath, headerTranscript);
    files.set(encodedPath, encoded);
    files.set(decodedPath, html);
    return {
      sourcePlanId: entry.sourcePlanId,
      lemma: entry.lemma,
      sourceAnchor: entry.sourceAnchor,
      request: {
        method: contract.request.method,
        canonicalUrl: entry.canonicalUrl,
        headers: contract.request.headers,
        redirectMode: contract.request.redirectMode,
        maxRedirects: contract.request.maxRedirects,
      },
      response: {
        finalUrl: entry.canonicalUrl,
        canonicalUrl: entry.canonicalUrl,
        httpStatus: 200,
        redirectChain: [],
        headerTranscript: {
          path: headerPath,
          sha256: sha256(headerTranscript),
          bytes: headerTranscript.length,
          format: "NORMALIZED_HTTP_RESPONSE_HEADERS_V2",
        },
        contentCoding: "gzip",
        encodedEntityBody: {
          path: encodedPath,
          sha256: sha256(encoded),
          bytes: encoded.length,
          semantic:
            "CONTENT_CODED_ENTITY_BYTES_AFTER_TRANSFER_DECODING_BEFORE_CONTENT_DECODING",
        },
        decodedRepresentationBody: {
          path: decodedPath,
          sha256: sha256(html),
          bytes: html.length,
          semantic: "DECODED_REPRESENTATION_BYTES",
          charset: "utf-8",
          decoder: "NODE_ZLIB_GUNZIP_SYNC",
        },
        contentType: "text/html; charset=UTF-8",
        title,
        headword: entry.lemma,
      },
    };
  });
  const manifest = {
    schemaVersion: "learning-v2-de-task6c-l02-direct-capture.v2",
    captureKind:
      "HTTP_CONTENT_CODED_ENTITY_AND_DECODED_REPRESENTATION_BYTES_V2",
    status: "HOLD_CAPTURE_ONLY",
    targetLanguage: "de",
    upstream: contract.task5,
    inputDigestSha256: contract.inputDigestSha256,
    captureWindow: {
      startedAt: "2026-10-12T10:00:00.000Z",
      completedAt: "2026-10-12T10:00:04.000Z",
    },
    captures,
    authority: {
      canonicalAdmission: "FORBIDDEN",
      rowsPromoted: 0,
      task7Unlock: false,
      learnerFacing: false,
      releaseAuthorized: false,
      translationsPresent: false,
    },
  };
  const manifestBytes = jsonBytes(manifest);
  const unsignedReceipt = {
    schemaVersion: "learning-v2-de-task6c-l02-capture-runner-receipt.v2",
    receiptStatus: "RUNNER_SIGNED_CAPTURE_COMPLETE",
    targetLanguage: "de",
    issuedAt: "2026-10-12T10:00:05.000Z",
    input: {
      inputDigestSha256: contract.inputDigestSha256,
      contractModulePath: contract.contractModule.path,
      contractModuleSha256: contract.contractModule.sha256,
      captureScriptPath: contract.captureScript.path,
      captureScriptSha256: contract.captureScript.sha256,
      task5: contract.task5,
    },
    runner: {
      runnerId: "fixture-capture-runner",
      runtimeFamily: "node",
      runtimeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      httpStack: "node:https",
      automaticContentDecoding: false,
    },
    manifest: {
      path: "manifest.json",
      sha256: sha256(manifestBytes),
      bytes: manifestBytes.length,
    },
    authority: {
      canonicalAdmission: "FORBIDDEN",
      rowsPromoted: 0,
      task7Unlock: false,
      learnerFacing: false,
      releaseAuthorized: false,
    },
  };
  const signedPayload =
    canonicalizeGermanTask6cL02CaptureReceiptPayloadDeV2(unsignedReceipt);
  const signature = signBytes(null, signedPayload, keyPair.privateKey);
  const receipt = {
    ...unsignedReceipt,
    signature: {
      keyId: "fixture-key-1",
      algorithm: "Ed25519",
      signedPayloadSha256: sha256(signedPayload),
      signatureBase64: signature.toString("base64"),
    },
  };
  const trustRoot = {
    schemaVersion: "learning-v2-de-task6c-capture-trust-root.v1",
    status: "ACTIVE",
    keyId: "fixture-key-1",
    runnerId: "fixture-capture-runner",
    algorithm: "Ed25519",
    publicKeySpkiPem,
    notBefore: "2026-10-12T00:00:00.000Z",
    notAfter: "2026-10-13T00:00:00.000Z",
    authority: {
      captureAttestationOnly: true,
      canonicalAdmission: "FORBIDDEN",
      task7Unlock: false,
      learnerFacing: false,
      releaseAuthorized: false,
    },
  };
  return {
    receiptBytes: jsonBytes(receipt),
    trustRootBytes: jsonBytes(trustRoot),
    manifestBytes,
    files,
  };
}

function mutateReceipt(
  fixture: Fixture,
  mutate: (receipt: JsonRecord) => void,
  resign = true,
): Fixture {
  const receipt = asRecord(JSON.parse(fixture.receiptBytes.toString("utf8")));
  mutate(receipt);
  if (resign) {
    delete receipt.signature;
    const payload =
      canonicalizeGermanTask6cL02CaptureReceiptPayloadDeV2(receipt);
    receipt.signature = {
      keyId: "fixture-key-1",
      algorithm: "Ed25519",
      signedPayloadSha256: sha256(payload),
      signatureBase64: signBytes(null, payload, keyPair.privateKey).toString(
        "base64",
      ),
    };
  }
  return { ...fixture, receiptBytes: jsonBytes(receipt) };
}

function mutateManifest(
  fixture: Fixture,
  mutate: (manifest: JsonRecord, files: Map<string, Buffer>) => void,
): Fixture {
  const manifest = asRecord(JSON.parse(fixture.manifestBytes.toString("utf8")));
  const files = new Map(fixture.files);
  mutate(manifest, files);
  const manifestBytes = jsonBytes(manifest);
  return mutateReceipt({ ...fixture, manifestBytes, files }, (receipt) => {
    receipt.manifest = {
      path: "manifest.json",
      sha256: sha256(manifestBytes),
      bytes: manifestBytes.length,
    };
  });
}

const valid = createFixture();
const loaded = validateGermanTask6cL02CaptureTransportFixtureDeV2(valid);
assert.equal(loaded.status, "HOLD_CAPTURE_ONLY");
assert.equal(loaded.targetLanguage, "de");
assert.equal(loaded.captures.length, 4);
assert.equal(loaded.task7Unlock, false);
assert.equal(loaded.learnerFacing, false);
assert.equal(loaded.releaseAuthorized, false);

assert.throws(
  () => loadGermanTask6cL02CaptureTransportDeV2(),
  /CAPTURE_EXTERNALLY_GOVERNED_ATTESTATION_UNAVAILABLE/u,
);
assert.doesNotMatch(
  loadGermanTask6cL02CaptureTransportDeV2.toString(),
  /readFileSync|existsSync|RECEIPT_PATH|TRUST_ROOT_PATH/u,
);

const repoLocalKeyAndResignedReceipt = mutateReceipt(valid, (receipt) => {
  receipt.issuedAt = "2026-10-12T10:00:06.000Z";
});
assert.equal(
  validateGermanTask6cL02CaptureTransportFixtureDeV2(
    repoLocalKeyAndResignedReceipt,
  ).status,
  "HOLD_CAPTURE_ONLY",
);
assert.throws(
  () => loadGermanTask6cL02CaptureTransportDeV2(),
  /CAPTURE_EXTERNALLY_GOVERNED_ATTESTATION_UNAVAILABLE/u,
);

assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateManifest(valid, (manifest) => {
        manifest.captureKind = "RAW_AUTHORITATIVE_RESPONSE_BYTES";
      }),
    ),
  /CAPTURE_KIND_INVALID/u,
);

assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateManifest(valid, (manifest, files) => {
        const captures = manifest.captures as JsonRecord[];
        const response = asRecord(captures[0].response);
        const decoded = asRecord(response.decodedRepresentationBody);
        const bytes = Buffer.from("not the decoded representation", "utf8");
        files.set(decoded.path as string, bytes);
        decoded.sha256 = sha256(bytes);
        decoded.bytes = bytes.length;
      }),
    ),
  /CAPTURE_DECODED_REPRESENTATION_MISMATCH/u,
);

assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateManifest(valid, (manifest, files) => {
        const captures = manifest.captures as JsonRecord[];
        const response = asRecord(captures[0].response);
        const descriptor = asRecord(response.headerTranscript);
        const transcript = asRecord(
          JSON.parse(files.get(descriptor.path as string)!.toString("utf8")),
        );
        (transcript.headers as JsonRecord[]).push({
          name: "content-encoding",
          value: "br",
        });
        (transcript.headers as JsonRecord[]).sort((left, right) =>
          `${left.name}\0${left.value}`.localeCompare(
            `${right.name}\0${right.value}`,
          ),
        );
        const bytes = canonicalJsonLineBytes(transcript);
        files.set(descriptor.path as string, bytes);
        descriptor.sha256 = sha256(bytes);
        descriptor.bytes = bytes.length;
      }),
    ),
  /CAPTURE_CONTENT_ENCODING_AMBIGUOUS/u,
);

assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateManifest(valid, (manifest, files) => {
        const captures = manifest.captures as JsonRecord[];
        const response = asRecord(captures[0].response);
        const descriptor = asRecord(response.headerTranscript);
        const transcript = JSON.parse(
          files.get(descriptor.path as string)!.toString("utf8"),
        ) as unknown;
        const semanticallyEquivalentNoncanonicalBytes = Buffer.from(
          `${JSON.stringify(transcript, null, 2)}\n`,
          "utf8",
        );
        files.set(
          descriptor.path as string,
          semanticallyEquivalentNoncanonicalBytes,
        );
        descriptor.sha256 = sha256(semanticallyEquivalentNoncanonicalBytes);
        descriptor.bytes = semanticallyEquivalentNoncanonicalBytes.length;
      }),
    ),
  /CAPTURE_HEADER_TRANSCRIPT_NOT_CANONICAL/u,
);

assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateReceipt(valid, (receipt) => {
        asRecord(receipt.input).captureScriptSha256 = "0".repeat(64);
      }),
    ),
  /CAPTURE_INPUT_BINDING_INVALID/u,
);

for (const mutate of [
  (manifest: JsonRecord) => {
    const captures = manifest.captures as JsonRecord[];
    asRecord(captures[0].request).method = "POST";
  },
  (manifest: JsonRecord) => {
    const captures = manifest.captures as JsonRecord[];
    const headers = clone(asRecord(captures[0].request).headers) as JsonRecord;
    headers["user-agent"] = "different-network-client";
    asRecord(captures[0].request).headers = headers;
  },
]) {
  assert.throws(
    () =>
      validateGermanTask6cL02CaptureTransportFixtureDeV2(
        mutateManifest(valid, mutate),
      ),
    /CAPTURE_REQUEST_CONTRACT_INVALID/u,
  );
}

for (const mutate of [
  (manifest: JsonRecord) => {
    const captures = manifest.captures as JsonRecord[];
    asRecord(captures[0].response).finalUrl =
      "https://www.dwds.de/wb/redirected";
  },
  (manifest: JsonRecord) => {
    const captures = manifest.captures as JsonRecord[];
    asRecord(captures[0].response).canonicalUrl =
      "https://www.dwds.de/wb/redirected";
  },
  (manifest: JsonRecord) => {
    const captures = manifest.captures as JsonRecord[];
    asRecord(captures[0].response).redirectChain = [
      {
        from: "https://www.dwds.de/wb/wohnen",
        status: 302,
        location: "https://www.dwds.de/wb/redirected",
      },
    ];
  },
]) {
  assert.throws(
    () =>
      validateGermanTask6cL02CaptureTransportFixtureDeV2(
        mutateManifest(valid, mutate),
      ),
    /CAPTURE_NETWORK_IDENTITY_INVALID/u,
  );
}

assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateReceipt(valid, (receipt) => {
        asRecord(receipt.runner).automaticContentDecoding = true;
      }),
    ),
  /CAPTURE_RUNNER_RUNTIME_INVALID/u,
);
assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateManifest(valid, (manifest) => {
        asRecord(manifest.captureWindow).completedAt =
          "2026-10-12T09:59:59.000Z";
      }),
    ),
  /CAPTURE_WINDOW_INVALID/u,
);
assert.throws(() => {
  const files = new Map(valid.files);
  files.set("encoded-entity/wohnen.bin", Buffer.from("tampered", "utf8"));
  validateGermanTask6cL02CaptureTransportFixtureDeV2({ ...valid, files });
}, /CAPTURE_ENCODED_ENTITY_INVALID/u);
assert.throws(() => {
  const files = new Map(valid.files);
  files.set("unexpected.txt", Buffer.from("extra", "utf8"));
  validateGermanTask6cL02CaptureTransportFixtureDeV2({ ...valid, files });
}, /CAPTURE_OUTPUT_FILE_SET_INVALID/u);

assert.throws(() => {
  const trustRoot = asRecord(JSON.parse(valid.trustRootBytes.toString("utf8")));
  asRecord(trustRoot.authority).releaseAuthorized = true;
  validateGermanTask6cL02CaptureTransportFixtureDeV2({
    ...valid,
    trustRootBytes: jsonBytes(trustRoot),
  });
}, /CAPTURE_AUTHORITY_ESCALATION/u);

assert.throws(
  () => (loadGermanTask6cL02CaptureTransportDeV2 as unknown as Function)("x"),
  /CAPTURE_CALLER_INPUT_FORBIDDEN/u,
);
assert.throws(
  () => assertGermanTask6cL02CaptureRootAvailableDeV2(true),
  /CAPTURE_V2_IMMUTABLE_ROOT_EXISTS/u,
);

assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateReceipt(valid, (receipt) => {
        asRecord(receipt.authority).task7Unlock = true;
      }),
    ),
  /CAPTURE_AUTHORITY_ESCALATION/u,
);
assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateReceipt(valid, (receipt) => {
        receipt.receiptStatus = "APPROVED";
      }),
    ),
  /CAPTURE_RECEIPT_STATUS_INVALID/u,
);
assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateManifest(valid, (manifest) => {
        manifest.targetLanguage = "en";
      }),
    ),
  /CAPTURE_TARGET_LANGUAGE_INVALID/u,
);
assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateManifest(valid, (manifest) => {
        manifest.translations = { ru: "forbidden" };
      }),
    ),
  /CAPTURE_MANIFEST_SCHEMA_INVALID/u,
);
assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateManifest(valid, (manifest) => {
        asRecord(manifest.authority).learnerFacing = true;
      }),
    ),
  /CAPTURE_AUTHORITY_ESCALATION/u,
);
assert.throws(
  () =>
    validateGermanTask6cL02CaptureTransportFixtureDeV2(
      mutateReceipt(
        valid,
        (receipt) => {
          asRecord(receipt.signature).signatureBase64 =
            Buffer.alloc(64).toString("base64");
        },
        false,
      ),
    ),
  /CAPTURE_RECEIPT_SIGNATURE_INVALID/u,
);

process.stdout.write(
  "LEARNING V2 GERMAN L02 CAPTURE TRANSPORT V2 STRUCTURAL GATE: PASS " +
    `(task5=${getGermanTask6cL02CaptureInputContractDeV2().task5.byteSha256}; rows=4; authority=HOLD)\n`,
);
