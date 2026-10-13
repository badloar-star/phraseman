import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(
  root,
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_c01_haus_name_direct_capture_v1",
);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const outer = (html, marker) => {
  const start = html.indexOf(marker);
  if (start < 0) throw Error("saved_raw_marker_missing");
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0,
    m;
  while ((m = re.exec(html))) {
    if (m.index < start) continue;
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  throw Error("saved_raw_unbalanced");
};
const rows = [
  [
    "haus",
    "Haus",
    "das",
    "de_lex_plan_task6c_l01_c01_haus_v1",
    "de_lex_task6c_l01_c01_haus_v1",
  ],
  [
    "name",
    "Name",
    "der",
    "de_lex_plan_task6c_l01_c01_name_v1",
    "de_lex_task6c_l01_c01_name_v1",
  ],
];
const captures = rows.map(
  ([slug, lemma, article, sourcePlanId, canonicalSenseId]) => {
    const rawPath = `raw/${sourcePlanId}.html`,
      raw = fs.readFileSync(path.join(evidence, rawPath));
    const html = raw.toString("utf8"),
      headers = fs.readFileSync(
        path.join(evidence, `${slug}.http_headers.txt`),
        "utf8",
      ),
      sense = outer(html, '<div class="dwdswb-lesart" id="d-1-1-1">'),
      morph = outer(
        html,
        '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
      ),
      headwordArticle = html.match(
        /<h1[^>]*><b>[^<]+<\/b>, (?:der|die|das)<\/h1>/u,
      )?.[0];
    if (
      !headwordArticle ||
      !headwordArticle.includes(`<b>${lemma}</b>, ${article}</h1>`)
    )
      throw Error("saved_raw_headword_invalid");
    return {
      sourcePlanId,
      canonicalSenseId,
      lemma,
      canonicalUrl: `https://www.dwds.de/wb/${lemma}`,
      finalUrl: `https://www.dwds.de/wb/${lemma}`,
      httpStatus: 200,
      contentType: "text/html; charset=UTF-8",
      title: `${lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS`,
      headword: lemma,
      headwordArticleSpan: {
        sha256: sha(headwordArticle),
        utf8Bytes: Buffer.byteLength(headwordArticle),
      },
      headers: {
        path: `${slug}.http_headers.txt`,
        sha256: sha(headers),
        bytes: Buffer.byteLength(headers),
      },
      rawBody: { path: rawPath, sha256: sha(raw), bytes: raw.length },
      exactSenseSpan: {
        sourceAnchor: "d-1-1-1",
        sha256: sha(sense),
        utf8Bytes: Buffer.byteLength(sense),
      },
      morphologySpan: {
        sha256: sha(morph),
        utf8Bytes: Buffer.byteLength(morph),
      },
    };
  },
);
const expected = {
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
    additiveContractSha256: sha(
      fs.readFileSync(
        path.join(
          root,
          "modules/learning-v2/curriculum/de/task6c_additive_source_plan_contract_de_v1.ts",
        ),
      ),
    ),
    task5BlueprintPath:
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
    task5BlueprintSha256: sha(
      fs.readFileSync(
        path.join(
          root,
          "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
        ),
      ),
    ),
  },
  captures,
  admission: {
    semanticAdmission: "NOT_EVALUATED",
    holdReason: "DIRECT_RAW_CAPTURE_ONLY_INDEPENDENT_SEMANTIC_REVIEW_REQUIRED",
  },
};
const actual = JSON.parse(
  fs.readFileSync(path.join(evidence, "manifest.json"), "utf8"),
);
if (JSON.stringify(actual) !== JSON.stringify(expected))
  throw Error("saved_raw_manifest_mismatch");
process.stdout.write(
  "TASK6C_C01_SAVED_RAW_MANIFEST_REPLAY PASS network=false writes=0 rows=2\n",
);
