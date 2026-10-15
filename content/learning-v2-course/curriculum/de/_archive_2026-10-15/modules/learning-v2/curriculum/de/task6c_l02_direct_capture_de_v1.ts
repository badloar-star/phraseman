import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type RecordValue = Record<string, unknown>;
const ROOT = path.resolve(__dirname, "evidence/task6c_l02_direct_capture_v1");
const TASK5 = path.resolve(__dirname, "chapter_blueprints_de_v1.json");
const TASK5_SHA =
  "494abd91c59c88ed652b3b4cdaaeaa118bc53ef64beb57ff54f735433612eb29";
const sha = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
const expected = [
  [
    "de_lex_plan_l02_c01_wohnen_v1",
    "wohnen",
    "https://www.dwds.de/wb/wohnen",
    "c416efecc34d2f09387ff9e3384ae76cdbad32778af8feaad364048c86737249",
    "1b2f4f0d0758994c9318e2dfd43feae66a3eaff35747ea439ccc7ad6440c85ce",
    "cfe8f854857d65223619ea5c223c076592ff6424dbeb7a93f0b3526d0bebafb0",
    "71208e25cfa546245f0970b02ad201564630f5fff576acfc38d851daa520be72",
  ],
  [
    "de_lex_plan_l02_c01_kueche_v1",
    "Küche",
    "https://www.dwds.de/wb/K%C3%BCche",
    "4b5781b2a94907d358b22fea42916b03713e8f0e5b9ed6e79b743dfc9c6076de",
    "6b416970816020195cb24b458209c78327f404e8d0e71b5c9f6b43692509af3e",
    "1394d2752dd905044eeb49b03b75062e2bd42e7c9beca7f3ddf106ab6c29f97b",
    "da8cfb368db1428770a22217e70127760325dd3c278f98a1b901b52d954879ed",
  ],
  [
    "de_lex_plan_l02_c02_tasse_v1",
    "Tasse",
    "https://www.dwds.de/wb/Tasse",
    "2245af3889257ca38f18f9391a6c21365050062fb9fe443a5ca4ffa88311dc56",
    "b2c6778db4fdc35540b354128ec30370027e41ec035769cc013140a852d269bb",
    "15c9ae0e32b41c0594e402146f55d59977b01110ffbce5fe49389efa85ef1849",
    "8ae608d82a86b4a06da26eb41d19fc0f72dcb0f76ef367d699ed097b355037bc",
  ],
  [
    "de_lex_plan_l02_c02_teller_v1",
    "Teller",
    "https://www.dwds.de/wb/Teller",
    "794a777e849a32e05a689d7001403985d98f4d0895ce9ce009ba14d85bfa6679",
    "7be76f44dd449c750844755fbb553bdc5e66f9edcc3a197fdb9afcb0a5d01b9b",
    "b7792d5c8dde13ea5d7796c223da7619e219d4f53b12bc0231fe357dbca443e6",
    "9d4c48146b1462b661d790dcb0b8fc042fb6b51ab498155eeed0073714007a0b",
  ],
] as const;
function assertRecord(
  value: unknown,
  code: string,
): asserts value is RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error(code);
}
const exact = (value: RecordValue, keys: readonly string[], code: string) => {
  if (Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0"))
    throw Error(code);
};
const contained = (root: string, relative: string, code: string) => {
  if (path.isAbsolute(relative) || relative.includes("..")) throw Error(code);
  const candidate = fs.realpathSync(path.resolve(root, relative));
  if (!candidate.startsWith(`${root}${path.sep}`)) throw Error(code);
  return candidate;
};
const outer = (html: string, marker: string) => {
  const start = html.indexOf(marker);
  if (start < 0) throw Error("task6c_l02_capture_span_missing");
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0;
  for (let match: RegExpExecArray | null; (match = re.exec(html)); ) {
    if (match.index < start) continue;
    depth += match[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  throw Error("task6c_l02_capture_span_unbalanced");
};
export type GermanTask6cL02DirectCaptureDeV1 = Readonly<{
  status: "HOLD";
  canonicalAdmission: "FORBIDDEN";
  rowsPromoted: 0;
  task7Unlock: false;
  learnerFacing: false;
  phraseClaim: false;
  captures: readonly Readonly<RecordValue>[];
}>;
function validate(rootForTest: string): GermanTask6cL02DirectCaptureDeV1 {
  const root = fs.realpathSync(rootForTest);
  const manifest = contained(
    root,
    "manifest.json",
    "task6c_l02_capture_path_escape",
  );
  const data: unknown = JSON.parse(fs.readFileSync(manifest, "utf8"));
  assertRecord(data, "task6c_l02_capture_manifest_invalid");
  exact(
    data,
    [
      "schemaVersion",
      "captureKind",
      "status",
      "canonicalAdmission",
      "rowsPromoted",
      "task7Unlock",
      "learnerFacing",
      "phraseClaim",
      "upstream",
      "captures",
      "admission",
    ],
    "task6c_l02_capture_schema",
  );
  if (
    data.schemaVersion !== "learning-v2-de-task6c-l02-direct-capture.v1" ||
    data.captureKind !== "RAW_AUTHORITATIVE_RESPONSE_BYTES" ||
    data.status !== "HOLD" ||
    data.canonicalAdmission !== "FORBIDDEN" ||
    data.rowsPromoted !== 0 ||
    data.task7Unlock !== false ||
    data.learnerFacing !== false ||
    data.phraseClaim !== false
  )
    throw Error("task6c_l02_capture_authority");
  assertRecord(data.upstream, "task6c_l02_capture_upstream");
  exact(
    data.upstream,
    ["task5BlueprintPath", "task5BlueprintSha256"],
    "task6c_l02_capture_upstream_schema",
  );
  if (
    data.upstream.task5BlueprintPath !==
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json" ||
    data.upstream.task5BlueprintSha256 !== TASK5_SHA ||
    sha(fs.readFileSync(TASK5)) !== TASK5_SHA
  )
    throw Error("task6c_l02_capture_upstream");
  if (!Array.isArray(data.captures) || data.captures.length !== expected.length)
    throw Error("task6c_l02_capture_roster");
  for (let index = 0; index < expected.length; index += 1) {
    const row = data.captures[index];
    assertRecord(row, "task6c_l02_capture_row");
    exact(
      row,
      [
        "sourcePlanId",
        "lemma",
        "canonicalUrl",
        "finalUrl",
        "httpStatus",
        "contentType",
        "title",
        "headword",
        "headers",
        "rawBody",
        "exactSenseSpan",
        "morphologySpan",
      ],
      "task6c_l02_capture_row_schema",
    );
    const [plan, lemma, url, headersHash, rawHash, senseHash, morphHash] =
      expected[index];
    if (
      row.sourcePlanId !== plan ||
      row.lemma !== lemma ||
      row.canonicalUrl !== url ||
      row.finalUrl !== url ||
      row.httpStatus !== 200 ||
      row.contentType !== "text/html; charset=UTF-8" ||
      row.title !==
        `${lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS` ||
      row.headword !== lemma
    )
      throw Error("task6c_l02_capture_identity");
    for (const [field, hash] of [
      ["headers", headersHash],
      ["rawBody", rawHash],
    ] as const) {
      assertRecord(row[field], "task6c_l02_capture_bytes");
      exact(
        row[field],
        ["path", "sha256", "bytes"],
        "task6c_l02_capture_bytes_schema",
      );
      const bytes = fs.readFileSync(
        contained(
          root,
          row[field].path as string,
          "task6c_l02_capture_path_escape",
        ),
      );
      if (
        row[field].sha256 !== hash ||
        sha(bytes) !== hash ||
        row[field].bytes !== bytes.length
      )
        throw Error("task6c_l02_capture_immutable_tuple");
    }
    const raw = fs.readFileSync(
      contained(
        root,
        (row.rawBody as RecordValue).path as string,
        "task6c_l02_capture_path_escape",
      ),
      "utf8",
    );
    if (
      !raw.includes(`<link rel="canonical" href="${url}"/>`) ||
      !raw.includes(`<title>${row.title}</title>`) ||
      !raw.includes(`<h1`) ||
      !raw.includes(`<b>${lemma}</b>`)
    )
      throw Error("task6c_l02_capture_raw_identity");
    for (const [field, marker, hash] of [
      ["exactSenseSpan", '<div class="dwdswb-lesart" id="d-1-1"', senseHash],
      [
        "morphologySpan",
        '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
        morphHash,
      ],
    ] as const) {
      assertRecord(row[field], "task6c_l02_capture_span");
      exact(
        row[field],
        field === "exactSenseSpan"
          ? ["sourceAnchor", "sha256", "utf8Bytes"]
          : ["sha256", "utf8Bytes"],
        "task6c_l02_capture_span_schema",
      );
      const span = outer(raw, marker);
      if (
        (field === "exactSenseSpan" && row[field].sourceAnchor !== "d-1-1") ||
        row[field].sha256 !== hash ||
        sha(span) !== hash ||
        row[field].utf8Bytes !== Buffer.byteLength(span, "utf8")
      )
        throw Error("task6c_l02_capture_span");
    }
  }
  assertRecord(data.admission, "task6c_l02_capture_admission");
  exact(
    data.admission,
    ["semanticAdmission", "holdReason"],
    "task6c_l02_capture_admission_schema",
  );
  if (
    data.admission.semanticAdmission !== "NOT_EVALUATED" ||
    data.admission.holdReason !==
      "DIRECT_RAW_CAPTURE_ONLY_FACTS_AND_INDEPENDENT_REVIEW_REQUIRED"
  )
    throw Error("task6c_l02_capture_admission");
  return data as GermanTask6cL02DirectCaptureDeV1;
}
export function loadGermanTask6cL02DirectCaptureDeV1(): GermanTask6cL02DirectCaptureDeV1 {
  return validate(ROOT);
}
export const germanTask6cL02DirectCaptureTestHarnessDeV1 = Object.freeze({
  validateFixture(root: string): void {
    validate(root);
  },
});
