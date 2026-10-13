import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(
  root,
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_c01_haus_name_direct_capture_v1",
);
const task5 = path.join(
  root,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
);
const contract = path.join(
  root,
  "modules/learning-v2/curriculum/de/task6c_additive_source_plan_contract_de_v1.ts",
);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const outer = (html, marker) => {
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`TASK6C_CAPTURE_MARKER_MISSING:${marker}`);
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0,
    match;
  while ((match = re.exec(html))) {
    if (match.index < start) continue;
    depth += match[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  throw new Error(`TASK6C_CAPTURE_UNBALANCED:${marker}`);
};
const rows = [
  [
    "haus",
    "Haus",
    "de_lex_plan_task6c_l01_c01_haus_v1",
    "de_lex_task6c_l01_c01_haus_v1",
  ],
  [
    "name",
    "Name",
    "de_lex_plan_task6c_l01_c01_name_v1",
    "de_lex_task6c_l01_c01_name_v1",
  ],
];
fs.mkdirSync(path.join(output, "raw"), { recursive: true });
const captures = [];
for (const [slug, lemma, sourcePlanId, canonicalSenseId] of rows) {
  const canonicalUrl = `https://www.dwds.de/wb/${lemma}`;
  const response = await fetch(canonicalUrl, {
    redirect: "follow",
    headers: { "user-agent": "Phraseman-Learning-V2-evidence/1.0" },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const html = bytes.toString("utf8");
  const title = (html.match(/<title>([^<]+)<\/title>/u) ?? [])[1];
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"\/>/u) ??
    [])[1];
  const headwordArticle = html.match(
    /<h1[^>]*><b>([^<]+)<\/b>, (?:der|die|das)<\/h1>/u,
  )?.[0];
  const headword = headwordArticle?.match(/<b>([^<]+)<\/b>/u)?.[1];
  if (
    !response.ok ||
    response.url !== canonicalUrl ||
    canonical !== canonicalUrl ||
    !title?.startsWith(`${lemma} – `) ||
    headword !== lemma
  )
    throw new Error(`TASK6C_CAPTURE_IDENTITY_MISMATCH:${lemma}`);
  const sense = outer(html, '<div class="dwdswb-lesart" id="d-1-1-1">');
  const morph = outer(
    html,
    '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
  );
  const rawPath = `raw/${sourcePlanId}.html`,
    headerPath = `${slug}.http_headers.txt`;
  const headers = [
    `HTTP ${response.status} ${response.statusText}`,
    ...[...response.headers]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}: ${v}`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(output, rawPath), bytes);
  fs.writeFileSync(path.join(output, headerPath), headers, "utf8");
  captures.push({
    sourcePlanId,
    canonicalSenseId,
    lemma,
    canonicalUrl,
    finalUrl: response.url,
    httpStatus: response.status,
    contentType: response.headers.get("content-type"),
    title,
    headword,
    headwordArticleSpan: {
      sha256: sha(headwordArticle),
      utf8Bytes: Buffer.byteLength(headwordArticle, "utf8"),
    },
    headers: {
      path: headerPath,
      sha256: sha(headers),
      bytes: Buffer.byteLength(headers),
    },
    rawBody: { path: rawPath, sha256: sha(bytes), bytes: bytes.length },
    exactSenseSpan: {
      sourceAnchor: "d-1-1-1",
      sha256: sha(sense),
      utf8Bytes: Buffer.byteLength(sense),
    },
    morphologySpan: { sha256: sha(morph), utf8Bytes: Buffer.byteLength(morph) },
  });
}
const manifest = {
  schemaVersion: "learning-v2-de-task6c-l01-c01-haus-name-direct-capture.v1",
  captureKind: "RAW_AUTHORITATIVE_RESPONSE_BYTES",
  status: "HOLD",
  canonicalAdmission: "FORBIDDEN",
  rowsPromoted: 0,
  task7Unlock: false,
  learnerFacing: false,
  phraseClaim: false,
  upstream: {
    additiveContractPath:
      "modules/learning-v2/curriculum/de/task6c_additive_source_plan_contract_de_v1.ts",
    additiveContractSha256: sha(fs.readFileSync(contract)),
    task5BlueprintPath:
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
    task5BlueprintSha256: sha(fs.readFileSync(task5)),
  },
  captures,
  admission: {
    semanticAdmission: "NOT_EVALUATED",
    holdReason: "DIRECT_RAW_CAPTURE_ONLY_INDEPENDENT_SEMANTIC_REVIEW_REQUIRED",
  },
};
fs.writeFileSync(
  path.join(output, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `TASK6C_C01_HAUS_NAME_CAPTURE status=HOLD rows=${captures.length} manifestSha256=${sha(fs.readFileSync(path.join(output, "manifest.json")))}`,
);
