import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

import {
  GERMAN_TASK6C_L02_IDENTITY_CAPTURE_PATHS_DE_V4,
  GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4,
  GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4,
  buildGermanTask6cL02IdentityCaptureEvidenceFilesDeV4,
  canonicalizeGermanTask6cL02IdentityCaptureJsonLineDeV4,
  getGermanTask6cL02IdentityCaptureContractDeV4,
  loadGermanTask6cL02IdentityCaptureTransportDeV4,
  validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4,
  validateGermanTask6cL02IdentityCaptureResponseDeV4,
} from "../modules/learning-v2/curriculum/de/task6c_l02_identity_capture_transport_de_v4";

const REPO_ROOT = path.resolve(__dirname, "..");
const sha256 = (bytes: Buffer | string): string =>
  createHash("sha256").update(bytes).digest("hex");

const contract = getGermanTask6cL02IdentityCaptureContractDeV4();

assert.equal(
  contract.schemaVersion,
  "learning-v2-de-task6c-l02-identity-capture-contract.v4",
);
assert.equal(contract.targetLanguage, "de");
assert.deepEqual(contract.authority, {
  canonicalAdmission: "FORBIDDEN",
  learnerFacing: false,
  releaseAuthorized: false,
  rowsPromoted: 0,
  status: "HOLD_CAPTURE_ONLY",
  task7Unlock: false,
  translationsPresent: false,
});
assert.deepEqual(contract.task5, {
  path: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
  byteSha256:
    "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  canonicalBodySha256:
    "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3",
});
assert.deepEqual(
  contract.roster.map(
    ({
      sourcePlanId,
      lemma,
      chapterId,
      checkpointPacketId,
      sourceAnchor,
      canonicalUrl,
      outputSlug,
    }) => ({
      sourcePlanId,
      lemma,
      chapterId,
      checkpointPacketId,
      sourceAnchor,
      canonicalUrl,
      outputSlug,
    }),
  ),
  [
    {
      sourcePlanId: "de_lex_plan_l02_c01_wohnen_v1",
      lemma: "wohnen",
      chapterId: "de_l02_c01",
      checkpointPacketId: "de_l02_c01_s08",
      sourceAnchor: "d-1-1",
      canonicalUrl: "https://www.dwds.de/wb/wohnen",
      outputSlug: "wohnen",
    },
    {
      sourcePlanId: "de_lex_plan_l02_c01_kueche_v1",
      lemma: "Küche",
      chapterId: "de_l02_c01",
      checkpointPacketId: "de_l02_c01_s08",
      sourceAnchor: "d-1-1",
      canonicalUrl: "https://www.dwds.de/wb/K%C3%BCche",
      outputSlug: "kueche",
    },
    {
      sourcePlanId: "de_lex_plan_l02_c02_tasse_v1",
      lemma: "Tasse",
      chapterId: "de_l02_c02",
      checkpointPacketId: "de_l02_c02_s16",
      sourceAnchor: "d-1-1",
      canonicalUrl: "https://www.dwds.de/wb/Tasse",
      outputSlug: "tasse",
    },
    {
      sourcePlanId: "de_lex_plan_l02_c02_teller_v1",
      lemma: "Teller",
      chapterId: "de_l02_c02",
      checkpointPacketId: "de_l02_c02_s16",
      sourceAnchor: "d-1-1",
      canonicalUrl: "https://www.dwds.de/wb/Teller",
      outputSlug: "teller",
    },
  ],
);
assert.equal(GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4.length, 4);
assert.deepEqual(GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4, {
  method: "GET",
  headers: {
    accept: "text/html,application/xhtml+xml",
    "accept-encoding": "identity",
    "user-agent": "Phraseman-Learning-V2-evidence/4.0",
  },
  redirectMode: "REJECT",
  maxRedirects: 0,
  exactScheme: "https:",
  exactHost: "www.dwds.de",
  exactPort: 443,
  responseContentCoding: "identity",
  responseTransferEncoding: "ABSENT_OR_SINGLE_CHUNKED_HTTP_1_1",
  contentLengthPolicy:
    "FORBIDDEN_WITH_CHUNKED_OTHERWISE_ABSENT_OR_SINGLE_CANONICAL_DECIMAL_MATCHING_ENTITY_BYTES",
  nodeIncomingMessagePolicy: {
    dataChunks: "BUFFER_ONLY_NO_SET_ENCODING_DECOMPRESS_OR_TRANSFORM",
    validateAfterEnd: true,
    complete: true,
    aborted: false,
    errorObserved: false,
    closeBeforeEnd: false,
    trailers: "FORBIDDEN",
  },
  transferFramingSemantic: "ENTITY_BYTES_AFTER_HTTP_TRANSFER_FRAMING_REMOVAL",
  maximumBodyBytes: 8 * 1024 * 1024,
});
assert.equal(contract.implementationFiles.length, 2);
for (const descriptor of contract.implementationFiles) {
  assert.equal(
    descriptor.sha256,
    sha256(readFileSync(path.join(REPO_ROOT, ...descriptor.path.split("/")))),
  );
}
assert.match(contract.inputDigestSha256, /^[0-9a-f]{64}$/u);

const htmlFor = (lemma: string, url: string, anchor: string): Buffer =>
  Buffer.from(
    `<!doctype html><html><head><link rel="canonical" href="${url}"/><title>${lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS</title></head><body><div class="dwdswb-artikel"><div class="dwdswb-ft dwdswb-new-ft" data-content-name="DWDSWB Artikel"><h1 class="dwdswb-ft-lemmaansatz"><b>${lemma}</b>${lemma === "Teller" ? ", der" : lemma === "Tasse" || lemma === "Küche" ? ", die" : ""}</h1></div></div><section id="${anchor}">sense</section></body></html>`,
    "utf8",
  );

const baseTls = {
  authorized: true,
  protocol: "TLSv1.3",
  servername: "www.dwds.de",
  subjectAltName: "DNS:www.dwds.de, DNS:dwds.de",
} as const;

const exactRequest = {
  method: "GET",
  headers: {
    accept: "text/html,application/xhtml+xml",
    "accept-encoding": "identity",
    "user-agent": "Phraseman-Learning-V2-evidence/4.0",
  },
  redirectMode: "REJECT",
  maxRedirects: 0,
} as const;

const completeHttp11Observation = {
  httpVersion: "1.1",
  endObserved: true,
  complete: true,
  aborted: false,
  errorObserved: false,
  closeBeforeEnd: false,
  rawTrailers: [] as readonly string[],
} as const;

const captures = contract.roster.map((row, index) =>
  validateGermanTask6cL02IdentityCaptureResponseDeV4(row, {
    ...completeHttp11Observation,
    request: exactRequest,
    finalUrl: row.canonicalUrl,
    statusCode: 200,
    rawHeaders:
      index % 2 === 0
        ? ["Content-Type", "text/html; charset=UTF-8"]
        : [
            "Content-Encoding",
            "identity",
            "Content-Type",
            "text/html; charset=UTF-8",
          ],
    bodyChunks: [
      htmlFor(row.lemma, row.canonicalUrl, row.sourceAnchor).subarray(0, 7),
      htmlFor(row.lemma, row.canonicalUrl, row.sourceAnchor).subarray(7),
    ],
    dnsAddresses: ["93.184.216.34"],
    connectedAddress: "93.184.216.34",
    tls: baseTls,
  }),
);

for (const capture of captures) {
  assert.equal(capture.contentCoding, "identity");
  assert.deepEqual(
    capture.encodedEntityBody,
    capture.decodedRepresentationBody,
  );
}

for (const row of contract.roster) {
  const savedDwdsPage = readFileSync(
    path.join(
      REPO_ROOT,
      "modules",
      "learning-v2",
      "curriculum",
      "de",
      "evidence",
      "task6c_l02_direct_capture_v1",
      "raw",
      `${row.sourcePlanId}.html`,
    ),
  );
  const savedPageCapture = validateGermanTask6cL02IdentityCaptureResponseDeV4(
    row,
    {
      ...completeHttp11Observation,
      request: exactRequest,
      finalUrl: row.canonicalUrl,
      statusCode: 200,
      rawHeaders: ["Content-Type", "text/html; charset=UTF-8"],
      bodyChunks: [savedDwdsPage],
      dnsAddresses: ["93.184.216.34"],
      connectedAddress: "93.184.216.34",
      tls: baseTls,
    },
  );
  assert.deepEqual(savedPageCapture.encodedEntityBody, savedDwdsPage);
}

const first = contract.roster[0];
const validFirst = {
  ...completeHttp11Observation,
  request: exactRequest,
  finalUrl: first.canonicalUrl,
  statusCode: 200,
  rawHeaders: ["Content-Type", "text/html; charset=UTF-8"],
  bodyChunks: [htmlFor(first.lemma, first.canonicalUrl, first.sourceAnchor)],
  dnsAddresses: ["93.184.216.34"],
  connectedAddress: "93.184.216.34",
  tls: baseTls,
} as const;

const expectedFirstTitle = `${first.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS`;
const firstHeadIdentity = `<link rel="canonical" href="${first.canonicalUrl}"/><title>${expectedFirstTitle}</title>`;
const firstBodyIdentity = `<h1 class="dwdswb-ft-lemmaansatz"><b>${first.lemma}</b></h1><section id="${first.sourceAnchor}">sense</section>`;
const hostileHtmlObservation = (html: string) => ({
  ...validFirst,
  bodyChunks: [Buffer.from(html, "utf8")],
});
const hostileNoscriptObservation = (fallback: string) => ({
  ...validFirst,
  bodyChunks: [
    Buffer.from(
      validFirst.bodyChunks[0]
        .toString("utf8")
        .replace("<body>", `<body><noscript>${fallback}</noscript>`),
      "utf8",
    ),
  ],
});

const hostileResponses: readonly (readonly [string, unknown])[] = [
  [
    "CAPTURE_V4_FINAL_URL_MISMATCH",
    { ...validFirst, finalUrl: `${first.canonicalUrl}?redirected=1` },
  ],
  ["CAPTURE_V4_REDIRECT_FORBIDDEN", { ...validFirst, statusCode: 302 }],
  [
    "CAPTURE_V4_REQUEST_OBSERVATION_MISMATCH",
    {
      ...validFirst,
      request: { ...exactRequest, method: "POST" },
    },
  ],
  [
    "CAPTURE_V4_REQUEST_OBSERVATION_MISMATCH",
    {
      ...validFirst,
      request: {
        ...exactRequest,
        headers: { ...exactRequest.headers, "accept-encoding": "gzip" },
      },
    },
  ],
  [
    "CAPTURE_V4_REQUEST_OBSERVATION_MISMATCH",
    {
      ...validFirst,
      request: { ...exactRequest, redirectMode: "FOLLOW", maxRedirects: 3 },
    },
  ],
  [
    "CAPTURE_V4_IDENTITY_CONTENT_ENCODING_REQUIRED",
    {
      ...validFirst,
      rawHeaders: [
        "Content-Type",
        "text/html; charset=UTF-8",
        "Content-Encoding",
        "gzip",
      ],
      bodyChunks: [gzipSync(validFirst.bodyChunks[0])],
    },
  ],
  [
    "CAPTURE_V4_IDENTITY_CONTENT_ENCODING_REQUIRED",
    {
      ...validFirst,
      rawHeaders: [
        "Content-Type",
        "text/html; charset=UTF-8",
        "Content-Encoding",
        "identity, gzip",
      ],
    },
  ],
  ...[
    "",
    "identity",
    "gzip",
    "deflate",
    "gzip, chunked",
    "chunked, gzip",
    "chunked, chunked",
    "chunked;level=1",
  ].map(
    (transferEncoding) =>
      [
        "CAPTURE_V4_TRANSFER_FRAMING_INVALID",
        {
          ...validFirst,
          rawHeaders: [
            "Content-Type",
            "text/html; charset=UTF-8",
            "Transfer-Encoding",
            transferEncoding,
          ],
        },
      ] as const,
  ),
  [
    "CAPTURE_V4_TRANSFER_FRAMING_INVALID",
    {
      ...validFirst,
      rawHeaders: [
        "Content-Type",
        "text/html; charset=UTF-8",
        "Transfer-Encoding",
        "chunked",
        "Transfer-Encoding",
        "chunked",
      ],
    },
  ],
  ...["01", "1, 1", "+1"].map(
    (contentLength) =>
      [
        "CAPTURE_V4_TRANSFER_FRAMING_INVALID",
        {
          ...validFirst,
          rawHeaders: [
            "Content-Type",
            "text/html; charset=UTF-8",
            "Content-Length",
            contentLength,
          ],
        },
      ] as const,
  ),
  [
    "CAPTURE_V4_TRANSFER_FRAMING_INVALID",
    {
      ...validFirst,
      rawHeaders: [
        "Content-Type",
        "text/html; charset=UTF-8",
        "Transfer-Encoding",
        "chunked",
        "Content-Length",
        String(validFirst.bodyChunks[0].length),
      ],
    },
  ],
  ...["1.0", "2.0"].map(
    (httpVersion) =>
      [
        "CAPTURE_V4_TRANSFER_FRAMING_INVALID",
        {
          ...validFirst,
          httpVersion,
          rawHeaders: [
            "Content-Type",
            "text/html; charset=UTF-8",
            "Transfer-Encoding",
            "chunked",
          ],
        },
      ] as const,
  ),
  [
    "CAPTURE_V4_TRANSFER_FRAMING_INVALID",
    {
      ...validFirst,
      rawHeaders: [
        "Content-Type",
        "text/html; charset=UTF-8",
        "Trailer",
        "Digest",
      ],
    },
  ],
  ...[
    { endObserved: false },
    { complete: false },
    { aborted: true },
    { errorObserved: true },
    { closeBeforeEnd: true },
    { rawTrailers: ["Digest", "sha-256=unsafe"] },
  ].map(
    (transportState) =>
      [
        "CAPTURE_V4_TRANSFER_FRAMING_INVALID",
        { ...validFirst, ...transportState },
      ] as const,
  ),
  [
    "CAPTURE_V4_TRANSFER_FRAMING_INVALID",
    {
      ...validFirst,
      rawHeaders: [
        "Content-Type",
        "text/html; charset=UTF-8",
        "Content-Length",
        String(validFirst.bodyChunks[0].length + 1),
      ],
    },
  ],
  [
    "CAPTURE_V4_TRANSFER_FRAMING_INVALID",
    {
      ...validFirst,
      rawHeaders: [
        "Content-Type",
        "text/html; charset=UTF-8",
        "Content-Length",
        String(validFirst.bodyChunks[0].length),
        "Content-Length",
        String(validFirst.bodyChunks[0].length),
      ],
    },
  ],
  [
    "CAPTURE_V4_UTF8_INVALID",
    { ...validFirst, bodyChunks: [Buffer.from([0xc3, 0x28])] },
  ],
  [
    "CAPTURE_V4_BODY_SIZE_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.alloc(4 * 1024 * 1024 + 1),
        Buffer.alloc(4 * 1024 * 1024),
      ],
    },
  ],
  [
    "CAPTURE_V4_NETWORK_OBSERVATION_INVALID",
    {
      ...validFirst,
      dnsAddresses: ["not-an-ip"],
      connectedAddress: "not-an-ip",
    },
  ],
  [
    "CAPTURE_V4_NETWORK_OBSERVATION_INVALID",
    {
      ...validFirst,
      dnsAddresses: ["127.0.0.1"],
      connectedAddress: "127.0.0.1",
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [htmlFor(first.lemma, first.canonicalUrl, "wrong-anchor")],
    },
  ],
  [
    "CAPTURE_V4_HEADWORD_BLOCK_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace("<b>wohnen</b>", "<b>Wohnen</b>"),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<body>",
              '<body><link rel="canonical" href="https://www.dwds.de/wb/wrong"/>',
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<body>",
              `<body><link rel="canonical" href="${first.canonicalUrl}"/>`,
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<body>",
              '<body><link REL="CANONICAL" href="https://www.dwds.de/wb/wrong-case"/>',
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace("<head>", `<head><meta id="${first.sourceAnchor}">`),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<head>",
              '<head><link rel="can&#111;nical" href="https://www.dwds.de/wb/wrong-entity"/>',
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<body>",
              '<body><h1 class="dwdswb-ft-lemma&#97;nsatz"><b>evil</b></h1>',
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace("<head>", '<head><meta id="d-1-&#49;">'),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<head>",
              '<head><link REL="CANONICAL" href="https://www.dwds.de/wb/wrong"/>',
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace("<head>", '<head><title id="duplicate">wrong</TITLE>'),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace("</head>", `<title>${expectedFirstTitle}</title></head>`),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_HEADWORD_BLOCK_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<body>",
              '<body><h1 CLASS="dwdswb-ft-lemmaansatz"><b>evil</b></h1>',
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_HEADWORD_BLOCK_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<body>",
              '<body><div class="dwdswb-ft-lemmaansatz">evil</div>',
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<body>",
              `<body><section ID="${first.sourceAnchor}">duplicate</section>`,
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<body>",
              `<body><noscript>${firstBodyIdentity}</noscript>`,
            ),
          "utf8",
        ),
      ],
    },
  ],
  ...[
    "script",
    "style",
    "xmp",
    "iframe",
    "noembed",
    "noframes",
    "template",
    "select",
  ].map(
    (tagName) =>
      [
        "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
        hostileNoscriptObservation(`<${tagName}>safe</${tagName}>`),
      ] as const,
  ),
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileNoscriptObservation(
      `<textarea></noscript>${firstBodyIdentity}</textarea>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileNoscriptObservation(`<plaintext></noscript>${firstBodyIdentity}`),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileNoscriptObservation(`<!-- </noscript> -->${firstBodyIdentity}`),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileNoscriptObservation(
      `<div data-close="</noscript>">${firstBodyIdentity}</div>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileNoscriptObservation(
      `<div class="x"id="${first.sourceAnchor}"></div>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileNoscriptObservation("<div><noscript></noscript></div>"),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileNoscriptObservation("<div>"),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileNoscriptObservation(
      `<DIV class="x"ID\f="${first.sourceAnchor}"></DIV>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileNoscriptObservation(
      '<div class="dwdswb-ft-lemmaansatz">shadow</div>',
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace("<body>", `<body><x_y id="${first.sourceAnchor}"></x_y>`),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "<body>",
              '<body><x_y class="dwdswb-ft-lemmaansatz"></x_y>',
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              `<title>${first.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS</title>`,
              "",
            )
            .replace(
              "<body>",
              `<body><title>${first.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS</title>`,
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              `<link rel="canonical" href="${first.canonicalUrl}"/>`,
              '<link rel="alternate" href="https://www.dwds.de/wb/wrong"/>',
            )
            .replace(
              `<title>${first.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS</title>`,
              "",
            )
            .replace(
              "<head>",
              `<head><template><link rel="canonical" href="${first.canonicalUrl}"/><title>${first.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS</title></template>`,
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              '<h1 class="dwdswb-ft-lemmaansatz"><b>wohnen</b></h1>',
              "<h1><b>wrong</b></h1>",
            )
            .replace('id="d-1-1"', 'id="wrong-anchor"')
            .replace(
              "<body>",
              '<body><textarea><h1 class="dwdswb-ft-lemmaansatz"><b>wohnen</b></h1><section id="d-1-1"></section></textarea>',
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_METADATA_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              `<link rel="canonical" href="${first.canonicalUrl}"/>`,
              '<link rel="canonical" href="https://www.dwds.de/wb/wrong"/>',
            )
            .replace(
              `<title>${first.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS</title>`,
              "<title>wrong | DWDS</title>",
            )
            .replace('id="d-1-1"', 'id="wrong-anchor"')
            .replace(
              "<body>",
              `<body><!-- <link rel="canonical" href="${first.canonicalUrl}"/><title>${first.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS</title><section id="d-1-1"></section> -->`,
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_HEADWORD_BLOCK_INVALID",
    {
      ...validFirst,
      bodyChunks: [
        Buffer.from(
          validFirst.bodyChunks[0]
            .toString("utf8")
            .replace(
              "</body>",
              '<h1 class="dwdswb-ft-lemmaansatz"><b>wohnen</b></h1></body>',
            ),
          "utf8",
        ),
      ],
    },
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><head>${firstHeadIdentity}</head><body>${firstBodyIdentity}</body>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html></html><html><head>${firstHeadIdentity}</head><body>${firstBodyIdentity}</body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><body><head>${firstHeadIdentity}</head>${firstBodyIdentity}</body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><body>${firstBodyIdentity}</body><head>${firstHeadIdentity}</head></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head>${firstHeadIdentity}<body>${firstBodyIdentity}</head></body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><head>${firstHeadIdentity}</head><html></html><body>${firstBodyIdentity}</body>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><main><head>${firstHeadIdentity}</head></main><body>${firstBodyIdentity}</body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head>${firstHeadIdentity}</head><main><body>${firstBodyIdentity}</body></main></html>`,
    ),
  ],
  ...(["div", "p", "main", "section", "h1"] as const).map(
    (tagName) =>
      [
        "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
        hostileHtmlObservation(
          `<!doctype html><html><head><${tagName}>closes head</${tagName}>${firstHeadIdentity}</head><body>${firstBodyIdentity}</body></html>`,
        ),
      ] as const,
  ),
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head>non-whitespace closes head${firstHeadIdentity}</head><body>${firstBodyIdentity}</body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head>${firstHeadIdentity}</head><body><script><!--<script></script>${firstBodyIdentity}</script></body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html>X<head>${firstHeadIdentity}</head><body>${firstBodyIdentity}</body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head><!--><div>closes head</div>-->${firstHeadIdentity}</head><body>${firstBodyIdentity}</body></html>`,
    ),
  ],
  ...[
    "<!----!><div>ambiguous comment tail</div>-->",
    "<!-- nested <!-- comment -->",
    "<!-- unclosed comment",
  ].map(
    (comment) =>
      [
        "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
        hostileHtmlObservation(
          `<!doctype html><html><head>${comment}${firstHeadIdentity}</head><body>${firstBodyIdentity}</body></html>`,
        ),
      ] as const,
  ),
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head><noscript>parser state depends on scripting</noscript>${firstHeadIdentity}</head><body>${firstBodyIdentity}</body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head>${firstHeadIdentity}</head><body><title>fake ${firstBodyIdentity}</title></body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head>${firstHeadIdentity}</head><body><select><option>${firstBodyIdentity}</option></select></body></html>`,
    ),
  ],
  ...(["option", "optgroup", "frame"] as const).map(
    (tagName) =>
      [
        "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
        hostileHtmlObservation(
          `<!doctype html><html><head>${firstHeadIdentity}</head><body><${tagName}>${firstBodyIdentity}</${tagName}></body></html>`,
        ),
      ] as const,
  ),
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head>${firstHeadIdentity}</head><body><frameset>${firstBodyIdentity}</frameset></body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head><svg>${firstHeadIdentity}</svg></head><body>${firstBodyIdentity}</body></html>`,
    ),
  ],
  [
    "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
    hostileHtmlObservation(
      `<!doctype html><html><head>${firstHeadIdentity}</head><body><math>${firstBodyIdentity}</math></body></html>`,
    ),
  ],
  ...(["xmp", "iframe", "noembed", "noframes", "plaintext"] as const).map(
    (tagName) =>
      [
        "CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID",
        {
          ...validFirst,
          bodyChunks: [
            Buffer.from(
              validFirst.bodyChunks[0]
                .toString("utf8")
                .replace("</body>", `<${tagName}>inert</${tagName}></body>`),
              "utf8",
            ),
          ],
        },
      ] as const,
  ),
  [
    "CAPTURE_V4_HEADER_VALUE_INVALID",
    {
      ...validFirst,
      rawHeaders: ["Content-Type", "text/html; charset=UTF-8\r\nunsafe"],
    },
  ],
];
for (const [code, observation] of hostileResponses) {
  assert.throws(
    () =>
      validateGermanTask6cL02IdentityCaptureResponseDeV4(first, observation),
    new RegExp(code, "u"),
  );
}

const hiddenIdentityMarkers = `${firstHeadIdentity}${firstBodyIdentity}`;
for (const hidden of [
  `<template>${hiddenIdentityMarkers}</template>`,
  `<script>${hiddenIdentityMarkers}</script>`,
  `<textarea>${hiddenIdentityMarkers}</textarea>`,
  '<div id="unrelated" class="dwdswb-ft-other"><a rel="alternate">x</a></div>',
]) {
  const accepted = validateGermanTask6cL02IdentityCaptureResponseDeV4(first, {
    ...validFirst,
    bodyChunks: [
      Buffer.from(
        validFirst.bodyChunks[0]
          .toString("utf8")
          .replace("<body>", `<body>${hidden}`),
        "utf8",
      ),
    ],
  });
  assert.equal(accepted.row.sourcePlanId, first.sourcePlanId);
}

const contentLengthBound = validateGermanTask6cL02IdentityCaptureResponseDeV4(
  first,
  {
    ...validFirst,
    rawHeaders: [
      "Content-Type",
      "text/html; charset=UTF-8",
      "Content-Length",
      String(validFirst.bodyChunks[0].length),
    ],
  },
);
assert.equal(
  contentLengthBound.encodedEntityBody.length,
  validFirst.bodyChunks[0].length,
);

for (const transferEncoding of ["chunked", " Chunked\t"]) {
  const chunked = validateGermanTask6cL02IdentityCaptureResponseDeV4(first, {
    ...validFirst,
    rawHeaders: [
      "Content-Type",
      "text/html; charset=UTF-8",
      "Transfer-Encoding",
      transferEncoding,
    ],
  });
  assert.deepEqual(chunked.encodedEntityBody, validFirst.bodyChunks[0]);
}

assert.throws(
  () =>
    validateGermanTask6cL02IdentityCaptureResponseDeV4(
      { ...first, lemma: "forged" } as unknown as typeof first,
      validFirst,
    ),
  /CAPTURE_V4_ROSTER_ROW_FORBIDDEN/u,
);

const files = buildGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(captures, {
  startedAt: "2026-10-12T12:00:00.000Z",
  completedAt: "2026-10-12T12:00:04.000Z",
  sourceSha: "a".repeat(40),
});
assert.equal(files.size, 13);
assert.deepEqual(
  [...files.keys()].sort(),
  GERMAN_TASK6C_L02_IDENTITY_CAPTURE_PATHS_DE_V4.evidenceFileAllowlist,
);
const manifestBytes = files.get("manifest.json");
assert(manifestBytes);
assert.equal(manifestBytes.at(-1), 0x0a);
assert.equal(manifestBytes.subarray(0, -1).includes(0x0a), false);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
assert.equal(manifest.status, "HOLD_CAPTURE_ONLY");
assert.equal(manifest.authority.canonicalAdmission, "FORBIDDEN");
assert.equal(manifest.authority.task7Unlock, false);
assert.equal(manifest.authority.learnerFacing, false);
assert.equal(manifest.authority.releaseAuthorized, false);
assert.equal(manifest.captures.length, 4);
for (const capture of manifest.captures) {
  assert.equal(capture.request.headers["accept-encoding"], "identity");
  assert.equal(capture.response.contentCoding, "identity");
  assert.equal(capture.response.httpVersion, "1.1");
  assert.equal(capture.response.transferFraming, "NONE");
  assert.equal(capture.response.messageComplete, true);
  assert.deepEqual(capture.response.nodeIncomingMessage, {
    aborted: false,
    closeBeforeEnd: false,
    complete: true,
    endObserved: true,
    errorObserved: false,
    rawTrailers: [],
  });
  assert.equal(
    capture.response.encodedEntityBody.sha256,
    capture.response.decodedRepresentationBody.sha256,
  );
  assert.equal(
    capture.response.encodedEntityBody.bytes,
    capture.response.decodedRepresentationBody.bytes,
  );
}
assert.equal(
  validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(files).status,
  "HOLD_CAPTURE_ONLY",
);

const mutate = (filePath: string, replacement: Buffer): Map<string, Buffer> => {
  const changed = new Map(files);
  changed.set(filePath, replacement);
  return changed;
};
assert.throws(
  () =>
    validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(
      mutate(
        "manifest.json",
        Buffer.from(` ${manifestBytes.toString("utf8")}`),
      ),
    ),
  /CAPTURE_V4_MANIFEST_CANONICAL_BYTES_INVALID/u,
);
const reorderedManifest = Buffer.from(
  `${JSON.stringify({ status: manifest.status, ...manifest })}\n`,
  "utf8",
);
assert.throws(
  () =>
    validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(
      mutate("manifest.json", reorderedManifest),
    ),
  /CAPTURE_V4_MANIFEST_CANONICAL_BYTES_INVALID/u,
);
const changedHeader = Buffer.from(files.get("headers/wohnen.normalized.json")!);
changedHeader[0] ^= 1;
assert.throws(
  () =>
    validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(
      mutate("headers/wohnen.normalized.json", changedHeader),
    ),
  /CAPTURE_V4_(HEADER_TRANSCRIPT_INVALID|OUTPUT_TAMPERED)/u,
);
const changedEncodedBody = Buffer.from(files.get("encoded-entity/wohnen.bin")!);
changedEncodedBody[0] ^= 1;
assert.throws(
  () =>
    validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(
      mutate("encoded-entity/wohnen.bin", changedEncodedBody),
    ),
  /CAPTURE_V4_(IDENTITY_BODY_MISMATCH|SOURCE_IDENTITY_MISMATCH|OUTPUT_TAMPERED)/u,
);
const changedDecodedBody = Buffer.from(
  files.get("decoded-representation/wohnen.html")!,
);
changedDecodedBody[0] ^= 1;
assert.throws(
  () =>
    validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(
      mutate("decoded-representation/wohnen.html", changedDecodedBody),
    ),
  /CAPTURE_V4_IDENTITY_BODY_MISMATCH/u,
);
const invalidTimestampManifest = structuredClone(manifest);
invalidTimestampManifest.captureWindow.completedAt = "2026-10-12 12:00:04";
assert.throws(
  () =>
    validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(
      mutate(
        "manifest.json",
        canonicalizeGermanTask6cL02IdentityCaptureJsonLineDeV4(
          invalidTimestampManifest,
        ),
      ),
    ),
  /CAPTURE_V4_WINDOW_INVALID/u,
);
const escalatedManifest = structuredClone(manifest);
escalatedManifest.authority.releaseAuthorized = true;
assert.throws(
  () =>
    validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(
      mutate(
        "manifest.json",
        canonicalizeGermanTask6cL02IdentityCaptureJsonLineDeV4(
          escalatedManifest,
        ),
      ),
    ),
  /CAPTURE_V4_OUTPUT_TAMPERED/u,
);

assert.throws(
  () => loadGermanTask6cL02IdentityCaptureTransportDeV4(),
  /CAPTURE_V4_SEPARATE_AUTHORIZED_LIVE_TASK_REQUIRED/u,
);
assert.throws(
  () =>
    (
      loadGermanTask6cL02IdentityCaptureTransportDeV4 as unknown as (
        value: string,
      ) => never
    )("caller-input"),
  /CAPTURE_V4_CALLER_INPUT_FORBIDDEN/u,
);

for (const descriptor of contract.implementationFiles) {
  const source = readFileSync(
    path.join(REPO_ROOT, ...descriptor.path.split("/")),
    "utf8",
  );
  assert.doesNotMatch(source, /from ["']node:https["']/u);
  assert.doesNotMatch(source, /\bfetch\s*\(/u);
  assert.doesNotMatch(source, /\bcurl\b/u);
  assert.doesNotMatch(source, /OPENAI/u);
  assert.doesNotMatch(source, /releaseAuthorized:\s*true/u);
}

process.stdout.write(
  `LEARNING V2 GERMAN L02 IDENTITY CAPTURE TRANSPORT V4 GATE: PASS (rows=4; files=13; input=${contract.inputDigestSha256}; network=not-run; authority=HOLD_CAPTURE_ONLY)\n`,
);
