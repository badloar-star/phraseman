import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(
  root,
  "modules/learning-v2/curriculum/de/evidence/task6c_l02_direct_capture_v1",
);
const task5 = path.join(
  root,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const outer = (html, marker) => {
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`TASK6C_L02_CAPTURE_MARKER_MISSING:${marker}`);
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0;
  for (let match; (match = re.exec(html)); ) {
    if (match.index < start) continue;
    depth += match[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  throw new Error(`TASK6C_L02_CAPTURE_UNBALANCED:${marker}`);
};
const rows = [
  [
    "wohnen",
    "wohnen",
    "de_lex_plan_l02_c01_wohnen_v1",
    "d-1-1",
    "seinen ständigen Aufenthalt an einem bestimmten Ort",
  ],
  [
    "kueche",
    "Küche",
    "de_lex_plan_l02_c01_kueche_v1",
    "d-1-1",
    "Raum, in dem die Speisen zubereitet und gekocht werden",
  ],
  [
    "tasse",
    "Tasse",
    "de_lex_plan_l02_c02_tasse_v1",
    "d-1-1",
    "Trinkgefäß (mit Henkel), besonders für heiße Getränke",
  ],
  [
    "teller",
    "Teller",
    "de_lex_plan_l02_c02_teller_v1",
    "d-1-1",
    "rundes Essgeschirr mit erhöhtem Rand",
  ],
];
if (fs.existsSync(path.join(output, "manifest.json"))) {
  throw new Error(
    "TASK6C_L02_CAPTURE_IMMUTABLE_EXISTS_CREATE_A_NEW_VERSIONED_EVIDENCE_ROOT",
  );
}
fs.mkdirSync(path.join(output, "raw"), { recursive: true });
const captures = [];
for (const [
  slug,
  lemma,
  sourcePlanId,
  sourceAnchor,
  definitionNeedle,
] of rows) {
  const canonicalUrl = `https://www.dwds.de/wb/${encodeURIComponent(lemma)}`;
  const response = await fetch(canonicalUrl, {
    redirect: "follow",
    headers: { "user-agent": "Phraseman-Learning-V2-evidence/1.0" },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const html = bytes.toString("utf8");
  const title = (html.match(/<title>([^<]+)<\/title>/u) ?? [])[1];
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"\/>/u) ??
    [])[1];
  const headword = html.match(/<h1[^>]*><b>([^<]+)<\/b>/u)?.[1];
  if (
    !response.ok ||
    response.url !== canonicalUrl ||
    canonical !== canonicalUrl ||
    !title?.startsWith(`${lemma} – `) ||
    headword !== lemma
  ) {
    throw new Error(`TASK6C_L02_CAPTURE_IDENTITY_MISMATCH:${lemma}`);
  }
  const exactSenseSpan = outer(
    html,
    `<div class="dwdswb-lesart" id="${sourceAnchor}"`,
  );
  const morphologySpan = outer(
    html,
    '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
  );
  if (!exactSenseSpan.includes(definitionNeedle)) {
    throw new Error(`TASK6C_L02_CAPTURE_SEMANTIC_ANCHOR_AMBIGUOUS:${lemma}`);
  }
  const rawPath = `raw/${sourcePlanId}.html`;
  const headerPath = `${slug}.http_headers.txt`;
  const headers = [
    `HTTP ${response.status} ${response.statusText}`,
    ...[...response.headers]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}: ${value}`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(output, rawPath), bytes);
  fs.writeFileSync(path.join(output, headerPath), headers, "utf8");
  captures.push({
    sourcePlanId,
    lemma,
    canonicalUrl,
    finalUrl: response.url,
    httpStatus: response.status,
    contentType: response.headers.get("content-type"),
    title,
    headword,
    headers: {
      path: headerPath,
      sha256: sha(headers),
      bytes: Buffer.byteLength(headers),
    },
    rawBody: { path: rawPath, sha256: sha(bytes), bytes: bytes.length },
    exactSenseSpan: {
      sourceAnchor,
      sha256: sha(exactSenseSpan),
      utf8Bytes: Buffer.byteLength(exactSenseSpan),
    },
    morphologySpan: {
      sha256: sha(morphologySpan),
      utf8Bytes: Buffer.byteLength(morphologySpan),
    },
  });
}
const manifest = {
  schemaVersion: "learning-v2-de-task6c-l02-direct-capture.v1",
  captureKind: "RAW_AUTHORITATIVE_RESPONSE_BYTES",
  status: "HOLD",
  canonicalAdmission: "FORBIDDEN",
  rowsPromoted: 0,
  task7Unlock: false,
  learnerFacing: false,
  phraseClaim: false,
  upstream: {
    task5BlueprintPath:
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
    task5BlueprintSha256: sha(fs.readFileSync(task5)),
  },
  captures,
  admission: {
    semanticAdmission: "NOT_EVALUATED",
    holdReason: "DIRECT_RAW_CAPTURE_ONLY_FACTS_AND_INDEPENDENT_REVIEW_REQUIRED",
  },
};
fs.writeFileSync(
  path.join(output, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `TASK6C_L02_CAPTURE status=HOLD rows=${captures.length} manifestSha256=${sha(fs.readFileSync(path.join(output, "manifest.json")))}`,
);
