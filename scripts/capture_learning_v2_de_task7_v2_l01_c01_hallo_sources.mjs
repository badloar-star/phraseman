import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(
  repoRoot,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1",
);
const rawRoot = path.join(outputRoot, "raw");
const TARGET_URL = "https://www.dwds.de/wb/hallo";
const REJECTED_URL = "https://www.dwds.de/wb/Hallo";
const GOETHE_URL =
  "https://lernen.goethe.de/deutschonline/A1/PDF/DE/deutschonline_Redemittel_und_Grammatik_1-18.pdf";
const GOETHE_SHA256 =
  "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fail = (code) => {
  throw new Error(code);
};

function outerDiv(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) fail(`TASK7_HALLO_MARKER_MISSING:${marker}`);
  const tags = /<\/?div\b[^>]*>/giu;
  tags.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tags.exec(html))) {
    depth += match[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, tags.lastIndex);
  }
  fail(`TASK7_HALLO_UNBALANCED_MARKER:${marker}`);
}

function selectedMetadata(response, canonicalUrl, transport) {
  const fields = [
    ["canonical-url", canonicalUrl],
    ["final-url", response.url],
    ["http-status", String(response.status)],
    ["content-type", response.headers.get("content-type") ?? ""],
    ["etag", response.headers.get("etag") ?? ""],
    ["last-modified", response.headers.get("last-modified") ?? ""],
    ["transport", transport],
  ];
  return `${fields.map(([key, value]) => `${key}: ${value}`).join("\n")}\n`;
}

async function captureHtml(url, rawName, metadataName) {
  const response = await fetch(url, {
    redirect: "error",
    headers: {
      "user-agent": "Phraseman-Learning-V2-evidence/1.0 (+source-bound-hold)",
    },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok || response.url !== url) {
    fail(`TASK7_HALLO_HTTP_IDENTITY:${url}:${response.status}:${response.url}`);
  }
  const metadata = selectedMetadata(response, url, "DIRECT_PUBLIC_HTTPS");
  fs.writeFileSync(path.join(rawRoot, rawName), bytes);
  fs.writeFileSync(path.join(rawRoot, metadataName), metadata, "utf8");
  return {
    bytes,
    html: bytes.toString("utf8"),
    metadata,
    contentType: response.headers.get("content-type"),
  };
}

async function captureGoethe() {
  const response = await fetch(GOETHE_URL, {
    redirect: "error",
    headers: {
      "user-agent": "Phraseman-Learning-V2-evidence/1.0 (+source-bound-hold)",
    },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok || response.url !== GOETHE_URL) {
    fail(`TASK7_HALLO_GOETHE_HTTP_IDENTITY:${response.status}:${response.url}`);
  }
  if (sha256(bytes) !== GOETHE_SHA256) {
    fail("TASK7_HALLO_GOETHE_SOURCE_DRIFT");
  }
  return {
    bytes,
    metadata: selectedMetadata(response, GOETHE_URL, "DIRECT_PUBLIC_HTTPS"),
    transport: "DIRECT_PUBLIC_HTTPS",
  };
}

fs.mkdirSync(rawRoot, { recursive: true });
const target = await captureHtml(
  TARGET_URL,
  "dwds_hallo_interjection.html",
  "dwds_hallo_interjection.http_metadata.txt",
);
const rejected = await captureHtml(
  REJECTED_URL,
  "dwds_Hallo_noun.html",
  "dwds_Hallo_noun.http_metadata.txt",
);
const goethe = await captureGoethe();
fs.writeFileSync(path.join(rawRoot, "goethe_a1_redemittel.pdf"), goethe.bytes);
fs.writeFileSync(
  path.join(rawRoot, "goethe_a1_redemittel.http_metadata.txt"),
  goethe.metadata,
  "utf8",
);

const targetTitle = target.html.match(/<title>([^<]+)<\/title>/u)?.[1];
const targetCanonical = target.html.match(
  /<link rel="canonical" href="([^"]+)"\/>/u,
)?.[1];
const targetHeadword = target.html.match(
  /<h1 class="dwdswb-ft-lemmaansatz"><b>([^<]+)<\/b><\/h1>/u,
)?.[1];
const targetGrammar = outerDiv(
  target.html,
  '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
);
const greetingSpan = outerDiv(
  target.html,
  '<div class="dwdswb-lesart" id="d-1-1-2">',
);
if (
  targetCanonical !== TARGET_URL ||
  targetHeadword !== "hallo" ||
  !targetTitle?.startsWith("hallo – ") ||
  !targetGrammar.includes("<span>Interjektion</span>") ||
  !greetingSpan.includes("Anrede zur Begrüßung")
) {
  fail("TASK7_HALLO_TARGET_IDENTITY");
}

const rejectedTitle = rejected.html.match(/<title>([^<]+)<\/title>/u)?.[1];
const rejectedCanonical = rejected.html.match(
  /<link rel="canonical" href="([^"]+)"\/>/u,
)?.[1];
const rejectedHeadwordSpan = rejected.html.match(
  /<h1 class="dwdswb-ft-lemmaansatz"><b>Hallo<\/b>, das<\/h1>/u,
)?.[0];
const rejectedGrammar = outerDiv(
  rejected.html,
  '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
);
if (
  rejectedCanonical !== REJECTED_URL ||
  !rejectedTitle?.startsWith("Hallo – ") ||
  rejectedHeadwordSpan === undefined ||
  !rejectedGrammar.includes("<span>Substantiv (Neutrum)</span>")
) {
  fail("TASK7_HALLO_REJECTED_NOUN_IDENTITY");
}

const extractionMap = {
  schemaVersion:
    "learning-v2-de-task7-v2-l01-c01-hallo-source-extraction-map.v1",
  rawSources: {
    dwdsInterjection: {
      path: "raw/dwds_hallo_interjection.html",
      sha256: sha256(target.bytes),
      bytes: target.bytes.length,
      metadataPath: "raw/dwds_hallo_interjection.http_metadata.txt",
      metadataSha256: sha256(target.metadata),
      metadataBytes: Buffer.byteLength(target.metadata, "utf8"),
    },
    dwdsRejectedNoun: {
      path: "raw/dwds_Hallo_noun.html",
      sha256: sha256(rejected.bytes),
      bytes: rejected.bytes.length,
      metadataPath: "raw/dwds_Hallo_noun.http_metadata.txt",
      metadataSha256: sha256(rejected.metadata),
      metadataBytes: Buffer.byteLength(rejected.metadata, "utf8"),
    },
    goetheA1: {
      path: "raw/goethe_a1_redemittel.pdf",
      sha256: sha256(goethe.bytes),
      bytes: goethe.bytes.length,
      metadataPath: "raw/goethe_a1_redemittel.http_metadata.txt",
      metadataSha256: sha256(goethe.metadata),
      metadataBytes: Buffer.byteLength(goethe.metadata, "utf8"),
      transport: goethe.transport,
    },
  },
  extractions: {
    dwdsTargetIdentity: {
      canonicalUrl: TARGET_URL,
      title: targetTitle,
      headword: targetHeadword,
      sourcePartOfSpeech: "Interjektion",
      grammarSpanSha256: sha256(targetGrammar),
      grammarSpanUtf8Bytes: Buffer.byteLength(targetGrammar, "utf8"),
    },
    dwdsRejectedIdentity: {
      canonicalUrl: REJECTED_URL,
      title: rejectedTitle,
      headword: "Hallo",
      sourcePartOfSpeech: "Substantiv (Neutrum)",
      grammarSpanSha256: sha256(rejectedGrammar),
      grammarSpanUtf8Bytes: Buffer.byteLength(rejectedGrammar, "utf8"),
      rejectionReason: "NOUN_ENTRY_IS_NOT_THE_TARGET_GREETING_INTERJECTION",
    },
    dwdsGreeting: {
      sourceAnchor: "d-1-1-2",
      exactDefinitionGerman: "Anrede zur Begrüßung",
      spanSha256: sha256(greetingSpan),
      spanUtf8Bytes: Buffer.byteLength(greetingSpan, "utf8"),
    },
    goetheOccurrence: {
      text: "Guten Tag! / Hallo!",
      utf8Bytes: Buffer.byteLength("Guten Tag! / Hallo!", "utf8"),
      sha256: sha256("Guten Tag! / Hallo!"),
      pdfPage: 3,
      heading: "WIE SAGT MAN? > BEGRÜSSEN UND VERABSCHIEDEN",
      evidenceFunction: "EXACT_OCCURRENCE_IN_OFFICIAL_A1_LEARNING_INVENTORY",
    },
  },
};
const extractionBytes = Buffer.from(
  `${JSON.stringify(extractionMap, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(path.join(outputRoot, "extraction_map.json"), extractionBytes);

const manifest = {
  schemaVersion: "learning-v2-de-task7-v2-l01-c01-hallo-source-allocation.v1",
  status: "HOLD",
  authority: {
    scope: "SOURCE_BOUND_HOLD_ALLOCATION_ONLY",
    decision: "PHRASE_AUTHORITY_REQUIRED",
    canonicalAdmission: false,
    inventoryResolutionApplied: false,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    consumerCutover: "NONE",
  },
  task5V2: {
    path: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
    schemaVersion: "learning-v2-german-chapter-blueprints.v2",
    byteSha256:
      "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
    canonicalBodySha256:
      "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3",
    sourcePlanId: "de_lex_plan_l01_c01_hallo_v1",
    checkpointPacketId: "de_l01_c01_s08",
    planCanonicalBodySha256:
      "4616ba8b2c84d2f7880cca5a79d76bb8453503b9b2244004c72d455d78fae301",
  },
  allocationScope: {
    sessionId: "de_l01_s01",
    phraseContextId: "de_pf_l01_c01_hallo_nachbarin_v1",
    targetSourcePlanIds: ["de_lex_plan_l01_c01_hallo_v1"],
    excludedSourcePlanIds: ["de_lex_plan_l01_c01_nachbarin_v1"],
  },
  sources: {
    extractionMap: {
      path: "extraction_map.json",
      sha256: sha256(extractionBytes),
      bytes: extractionBytes.length,
    },
    dwds: {
      target: {
        canonicalUrl: TARGET_URL,
        headword: "hallo",
        sourcePartOfSpeech: "Interjektion",
        greetingSenseAnchor: "d-1-1-2",
      },
      rejected: {
        canonicalUrl: REJECTED_URL,
        headword: "Hallo",
        sourcePartOfSpeech: "Substantiv (Neutrum)",
        rejectionReason: "NOUN_ENTRY_IS_NOT_THE_TARGET_GREETING_INTERJECTION",
      },
    },
    goetheA1: {
      canonicalUrl: GOETHE_URL,
      rawSha256: sha256(goethe.bytes),
      transport: goethe.transport,
    },
  },
  fieldSupport: {
    supportedClaims: {
      sourceHeadword: "hallo",
      sourcePartOfSpeech: "Interjektion",
      greetingDefinitionGerman: "Anrede zur Begrüßung",
      officialLearningOccurrence: "Guten Tag! / Hallo!",
    },
    unsupportedClaims: {
      neutralRegister: "UNSUPPORTED_BY_CAPTURED_SOURCES",
      phraseContextAuthority: "REQUIRES_SEPARATE_AUTHORITY",
    },
  },
  allocations: [
    {
      sourcePlanId: "de_lex_plan_l01_c01_hallo_v1",
      checkpointPacketId: "de_l01_c01_s08",
      sessionId: "de_l01_s01",
      phraseContextId: "de_pf_l01_c01_hallo_nachbarin_v1",
      contacts: [
        { role: "INTRODUCTION_CONTEXT", packetId: "de_l01_c01_s01" },
        { role: "CHECKPOINT_PLANNED_USE", packetId: "de_l01_c01_s08" },
      ],
      excludedSourcePlanIds: ["de_lex_plan_l01_c01_nachbarin_v1"],
      supportedFields: [
        "lemmaOrExpression",
        "sourcePartOfSpeech",
        "greetingFunction",
        "officialLearningOccurrence",
      ],
      decision: "PHRASE_AUTHORITY_REQUIRED",
    },
  ],
};
fs.writeFileSync(
  path.join(outputRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
process.stdout.write(
  `TASK7_HALLO_CAPTURE status=HOLD dwds=DIRECT_PUBLIC_HTTPS goethe=${goethe.transport} manifestSha256=${sha256(fs.readFileSync(path.join(outputRoot, "manifest.json")))}\n`,
);
