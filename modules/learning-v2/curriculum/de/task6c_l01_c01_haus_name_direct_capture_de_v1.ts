import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
type R = Record<string, unknown>;
const ROOT = path.resolve(
  __dirname,
  "evidence/task6c_l01_c01_haus_name_direct_capture_v1",
);
const TASK5 = path.resolve(__dirname, "chapter_blueprints_de_v1.json");
const CONTRACT = path.resolve(
  __dirname,
  "task6c_additive_source_plan_contract_de_v1.ts",
);
const CONTRACT_SHA =
  "33d0e3bc1fc31b2785291dfd7cc8519d582d26b5a4d9e6a1e0d86208269cb480";
const TASK5_SHA =
  "494abd91c59c88ed652b3b4cdaaeaa118bc53ef64beb57ff54f735433612eb29";
const EXPECTED_CAPTURE_BYTES = [
  {
    headers: "19df1cd818fc94a700a3bb2f8654cd1934e2ba534061d201a500444d2b2905cd",
    raw: "55a7d95020c931a914aa37d8c8e4f3d06db9f2eccd04a879aaea2a2030cfd758",
    sense: "5e018aeb07d6f345078cc956ece1c3bfdb7275745901707924415e189ed3eae8",
    morphology:
      "19878c724acd5f0f8f912a50e7ac3a5a274fb256eda15a68814ab7aadb61bf95",
  },
  {
    headers: "239790c75a2d32602d01b1c05a1925f7b06a76cc1ccec75bd38d459c5ff3bfd6",
    raw: "515a517f61911b381d487ef7ab1072747ae99abcccb90252aaca30a864d899b6",
    sense: "80ad42be5dac63958a2107e113d53a0b4d1a53d55572b3d674fd9db68a4f2f1b",
    morphology:
      "bcb0fa68d2fe801156db77dddf44cd40534a1103924d52fcbfbd260981fa872b",
  },
] as const;
const sha = (v: Buffer | string) =>
  createHash("sha256").update(v).digest("hex");
function record(v: unknown, c: string): asserts v is R {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw Error(c);
}
const exact = (v: R, keys: readonly string[], c: string) => {
  if (Object.keys(v).sort().join("\0") !== [...keys].sort().join("\0"))
    throw Error(c);
};
const outer = (html: string, marker: string) => {
  const start = html.indexOf(marker);
  if (start < 0) throw Error("task6c_c01_capture_span_missing");
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0,
    m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index < start) continue;
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  throw Error("task6c_c01_capture_span_unbalanced");
};
export type GermanTask6cL01C01HausNameDirectCaptureDeV1 = Readonly<{
  status: "HOLD";
  canonicalAdmission: "FORBIDDEN";
  rowsPromoted: 0;
  task7Unlock: false;
  learnerFacing: false;
  phraseClaim: false;
  captures: readonly Readonly<R>[];
}>;
function loadAtTrustedFixtureRoot(
  rootForTest: string,
): GermanTask6cL01C01HausNameDirectCaptureDeV1 {
  const trustedRoot = fs.realpathSync(rootForTest);
  const manifestPath = fs.realpathSync(path.join(trustedRoot, "manifest.json"));
  if (!manifestPath.startsWith(`${trustedRoot}${path.sep}`))
    throw Error("task6c_c01_capture_path_escape");
  const data: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  record(data, "task6c_c01_capture_manifest_invalid");
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
    "task6c_c01_capture_schema",
  );
  if (
    data.schemaVersion !==
      "learning-v2-de-task6c-l01-c01-haus-name-direct-capture.v1" ||
    data.captureKind !== "RAW_AUTHORITATIVE_RESPONSE_BYTES" ||
    data.status !== "HOLD" ||
    data.canonicalAdmission !== "FORBIDDEN" ||
    data.rowsPromoted !== 0 ||
    data.task7Unlock !== false ||
    data.learnerFacing !== false ||
    data.phraseClaim !== false
  )
    throw Error("task6c_c01_capture_authority");
  record(data.upstream, "task6c_c01_capture_upstream");
  exact(
    data.upstream,
    [
      "additiveContractPath",
      "additiveContractSha256",
      "task5BlueprintPath",
      "task5BlueprintSha256",
    ],
    "task6c_c01_capture_upstream_schema",
  );
  if (
    data.upstream.additiveContractPath !==
      "modules/learning-v2/curriculum/de/task6c_additive_source_plan_contract_de_v1.ts" ||
    data.upstream.additiveContractSha256 !== CONTRACT_SHA ||
    data.upstream.task5BlueprintPath !==
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json" ||
    data.upstream.task5BlueprintSha256 !== TASK5_SHA ||
    sha(fs.readFileSync(CONTRACT)) !== CONTRACT_SHA ||
    sha(fs.readFileSync(TASK5)) !== TASK5_SHA
  )
    throw Error("task6c_c01_capture_upstream");
  if (!Array.isArray(data.captures) || data.captures.length !== 2)
    throw Error("task6c_c01_capture_roster");
  const expected = [
    [
      "de_lex_plan_task6c_l01_c01_haus_v1",
      "de_lex_task6c_l01_c01_haus_v1",
      "Haus",
      "das",
      "Häuser",
    ],
    [
      "de_lex_plan_task6c_l01_c01_name_v1",
      "de_lex_task6c_l01_c01_name_v1",
      "Name",
      "der",
      "Namen",
    ],
  ] as const;
  for (let i = 0; i < 2; i++) {
    const x = data.captures[i];
    record(x, "task6c_c01_capture_row");
    exact(
      x,
      [
        "sourcePlanId",
        "canonicalSenseId",
        "lemma",
        "canonicalUrl",
        "finalUrl",
        "httpStatus",
        "contentType",
        "title",
        "headword",
        "headwordArticleSpan",
        "headers",
        "rawBody",
        "exactSenseSpan",
        "morphologySpan",
      ],
      "task6c_c01_capture_row_schema",
    );
    const [plan, id, lemma, article, plural] = expected[i];
    const immutable = EXPECTED_CAPTURE_BYTES[i];
    if (
      x.sourcePlanId !== plan ||
      x.canonicalSenseId !== id ||
      x.lemma !== lemma ||
      x.canonicalUrl !== `https://www.dwds.de/wb/${lemma}` ||
      x.finalUrl !== x.canonicalUrl ||
      x.httpStatus !== 200 ||
      x.contentType !== "text/html; charset=UTF-8" ||
      x.title !==
        `${lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS` ||
      x.headword !== lemma
    )
      throw Error("task6c_c01_capture_identity");
    record(x.headwordArticleSpan, "task6c_c01_capture_headword_article");
    exact(
      x.headwordArticleSpan,
      ["sha256", "utf8Bytes"],
      "task6c_c01_capture_headword_article_schema",
    );
    if (
      (x.headers as R).sha256 !== immutable.headers ||
      (x.rawBody as R).sha256 !== immutable.raw ||
      (x.exactSenseSpan as R).sha256 !== immutable.sense ||
      (x.morphologySpan as R).sha256 !== immutable.morphology
    )
      throw Error("task6c_c01_capture_immutable_tuple");
    for (const key of ["headers", "rawBody"]) {
      record(x[key], "task6c_c01_capture_bytes");
      exact(
        x[key] as R,
        ["path", "sha256", "bytes"],
        "task6c_c01_capture_bytes_schema",
      );
      const rel = (x[key] as R).path;
      if (typeof rel !== "string" || path.isAbsolute(rel) || rel.includes(".."))
        throw Error("task6c_c01_capture_path_escape");
      const candidate = path.resolve(trustedRoot, rel);
      const realCandidate = fs.realpathSync(candidate);
      if (!realCandidate.startsWith(`${trustedRoot}${path.sep}`))
        throw Error("task6c_c01_capture_path_escape");
      const bytes = fs.readFileSync(realCandidate);
      if (
        sha(bytes) !== (x[key] as R).sha256 ||
        bytes.length !== (x[key] as R).bytes
      )
        throw Error("task6c_c01_capture_bytes");
    }
    const raw = fs.readFileSync(
      fs.realpathSync(
        path.resolve(trustedRoot, (x.rawBody as R).path as string),
      ),
      "utf8",
    );
    const headwordArticle = raw.match(
      /<h1[^>]*><b>[^<]+<\/b>, (?:der|die|das)<\/h1>/u,
    )?.[0];
    if (
      !raw.includes(`<link rel="canonical" href="${x.canonicalUrl}"/>`) ||
      !raw.includes(`<title>${x.title}</title>`) ||
      !raw.includes(`<b>${lemma}</b>, ${article}</h1>`)
    )
      throw Error("task6c_c01_capture_raw_identity");
    if (
      !headwordArticle ||
      sha(headwordArticle) !== (x.headwordArticleSpan as R).sha256 ||
      Buffer.byteLength(headwordArticle, "utf8") !==
        (x.headwordArticleSpan as R).utf8Bytes
    )
      throw Error("task6c_c01_capture_headword_article");
    for (const [field, marker] of [
      ["exactSenseSpan", '<div class="dwdswb-lesart" id="d-1-1-1">'],
      [
        "morphologySpan",
        '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
      ],
    ] as const) {
      record(x[field], "task6c_c01_capture_span");
      exact(
        x[field] as R,
        field === "exactSenseSpan"
          ? ["sourceAnchor", "sha256", "utf8Bytes"]
          : ["sha256", "utf8Bytes"],
        "task6c_c01_capture_span_schema",
      );
      const span = outer(raw, marker);
      if (
        (field === "exactSenseSpan" &&
          (x[field] as R).sourceAnchor !== "d-1-1-1") ||
        sha(span) !== (x[field] as R).sha256 ||
        Buffer.byteLength(span, "utf8") !== (x[field] as R).utf8Bytes ||
        (!span.includes(`Nominativ Plural: <b>${plural}</b>`) &&
          field === "morphologySpan")
      )
        throw Error("task6c_c01_capture_span");
    }
  }
  record(data.admission, "task6c_c01_capture_admission");
  exact(
    data.admission,
    ["semanticAdmission", "holdReason"],
    "task6c_c01_capture_admission_schema",
  );
  if (
    data.admission.semanticAdmission !== "NOT_EVALUATED" ||
    data.admission.holdReason !==
      "DIRECT_RAW_CAPTURE_ONLY_INDEPENDENT_SEMANTIC_REVIEW_REQUIRED"
  )
    throw Error("task6c_c01_capture_admission");
  return data as GermanTask6cL01C01HausNameDirectCaptureDeV1;
}
/** Production authority has no caller-controlled source path. */
export function loadGermanTask6cL01C01HausNameDirectCaptureDeV1(): GermanTask6cL01C01HausNameDirectCaptureDeV1 {
  return loadAtTrustedFixtureRoot(ROOT);
}
/** Test-only validator; it grants no authority and is intentionally separate from the production loader. */
export const germanTask6cL01C01HausNameDirectCaptureTestHarnessDeV1 =
  Object.freeze({
    validateFixture(root: string): void {
      loadAtTrustedFixtureRoot(root);
    },
  });
