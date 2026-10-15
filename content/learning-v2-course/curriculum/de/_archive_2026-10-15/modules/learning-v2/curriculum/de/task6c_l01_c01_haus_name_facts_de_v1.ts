import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  germanTask6cL01C01HausNameDirectCaptureTestHarnessDeV1,
  loadGermanTask6cL01C01HausNameDirectCaptureDeV1,
} from "./task6c_l01_c01_haus_name_direct_capture_de_v1";
type R = Record<string, unknown>;
const ROOT = path.resolve(
    __dirname,
    "evidence/task6c_l01_c01_haus_name_facts_v1",
  ),
  CAPTURE = path.resolve(
    __dirname,
    "evidence/task6c_l01_c01_haus_name_direct_capture_v1",
  );
const CAPTURE_SHA =
  "3a22f2f16fab0e2894fca4f03c195d10e8ff17dea97f87f6c745f0e9b5817d63";
const sha = (v: Buffer | string) =>
  createHash("sha256").update(v).digest("hex");
function record(v: unknown, c: string): asserts v is R {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw Error(c);
}
const exact = (v: R, k: readonly string[], c: string) => {
  if (Object.keys(v).sort().join("\0") !== [...k].sort().join("\0"))
    throw Error(c);
};
const outer = (h: string, marker: string) => {
  const s = h.indexOf(marker);
  if (s < 0) throw Error("task6c_c01_facts_span_missing");
  const r = /<\/?div\b[^>]*>/gi;
  r.lastIndex = s;
  let d = 0,
    m: RegExpExecArray | null;
  while ((m = r.exec(h))) {
    if (m.index < s) continue;
    d += m[0][1] === "/" ? -1 : 1;
    if (d === 0) return h.slice(s, r.lastIndex);
  }
  throw Error("task6c_c01_facts_span_unbalanced");
};
export type GermanTask6cL01C01HausNameFactsDeV1 = Readonly<{
  status: "HOLD_FACTS_ONLY";
  canonicalAdmission: "FORBIDDEN";
  rowsPromoted: 0;
  task7Unlock: false;
  learnerFacing: false;
  phraseClaim: false;
  facts: readonly Readonly<R>[];
}>;
function loadAtTrustedFixtureRoots(
  rootForTest: string,
  captureRootForTest: string,
): GermanTask6cL01C01HausNameFactsDeV1 {
  const trustedFactsRoot = fs.realpathSync(rootForTest);
  const trustedCaptureRoot = fs.realpathSync(captureRootForTest);
  const factsPath = fs.realpathSync(path.join(trustedFactsRoot, "facts.json"));
  if (!factsPath.startsWith(`${trustedFactsRoot}${path.sep}`))
    throw Error("task6c_c01_facts_path_escape");
  germanTask6cL01C01HausNameDirectCaptureTestHarnessDeV1.validateFixture(
    captureRootForTest,
  );
  const data: unknown = JSON.parse(fs.readFileSync(factsPath, "utf8"));
  record(data, "task6c_c01_facts_invalid");
  exact(
    data,
    [
      "schemaVersion",
      "status",
      "canonicalAdmission",
      "semanticAdmission",
      "rowsPromoted",
      "task7Unlock",
      "learnerFacing",
      "phraseClaim",
      "capture",
      "facts",
      "factReceipt",
    ],
    "task6c_c01_facts_schema",
  );
  if (
    data.schemaVersion !== "learning-v2-de-task6c-l01-c01-haus-name-facts.v1" ||
    data.status !== "HOLD_FACTS_ONLY" ||
    data.canonicalAdmission !== "FORBIDDEN" ||
    data.semanticAdmission !== "NOT_EVALUATED" ||
    data.rowsPromoted !== 0 ||
    data.task7Unlock !== false ||
    data.learnerFacing !== false ||
    data.phraseClaim !== false
  )
    throw Error("task6c_c01_facts_authority");
  record(data.capture, "task6c_c01_facts_capture");
  exact(data.capture, ["path", "sha256"], "task6c_c01_facts_capture_schema");
  if (
    data.capture.path !==
      "modules/learning-v2/curriculum/de/evidence/task6c_l01_c01_haus_name_direct_capture_v1/manifest.json" ||
    data.capture.sha256 !== CAPTURE_SHA ||
    sha(
      fs.readFileSync(
        realContained(
          trustedCaptureRoot,
          "manifest.json",
          "task6c_c01_facts_capture_path_escape",
        ),
      ),
    ) !== CAPTURE_SHA
  )
    throw Error("task6c_c01_facts_capture");
  if (!Array.isArray(data.facts) || data.facts.length !== 2)
    throw Error("task6c_c01_facts_roster");
  const expected = [
    [
      "de_lex_plan_task6c_l01_c01_haus_v1",
      "Haus",
      "das",
      "Häuser",
      "Neutrum",
      "zum Wohnen, Wohnhaus",
    ],
    [
      "de_lex_plan_task6c_l01_c01_name_v1",
      "Name",
      "der",
      "Namen",
      "Maskulinum",
      "Bezeichnung für eine Person, Familienname oder Vorname",
    ],
  ] as const;
  for (let i = 0; i < 2; i++) {
    const f = data.facts[i];
    record(f, "task6c_c01_facts_row");
    exact(
      f,
      ["sourcePlanId", "sourceSense", "morphology"],
      "task6c_c01_facts_row_schema",
    );
    const [plan, lemma, article, plural, gender, definition] = expected[i];
    if (f.sourcePlanId !== plan) throw Error("task6c_c01_facts_crosswire");
    record(f.sourceSense, "task6c_c01_facts_sense");
    exact(
      f.sourceSense,
      [
        "sourceAnchor",
        "senseSpanSha256",
        "senseSpanUtf8Bytes",
        "definitionGerman",
      ],
      "task6c_c01_facts_sense_schema",
    );
    record(f.morphology, "task6c_c01_facts_morph");
    exact(
      f.morphology,
      [
        "morphologySpanSha256",
        "morphologySpanUtf8Bytes",
        "headwordArticleSpanSha256",
        "headwordArticleSpanUtf8Bytes",
        "lemma",
        "article",
        "plural",
        "sourceGenderLabel",
      ],
      "task6c_c01_facts_morph_schema",
    );
    const raw = fs.readFileSync(
        realContained(
          trustedCaptureRoot,
          `raw/${plan}.html`,
          "task6c_c01_facts_capture_path_escape",
        ),
        "utf8",
      ),
      sense = outer(raw, '<div class="dwdswb-lesart" id="d-1-1-1">'),
      morph = outer(
        raw,
        '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
      );
    const headwordArticle = raw.match(
      /<h1[^>]*><b>[^<]+<\/b>, (?:der|die|das)<\/h1>/u,
    )?.[0];
    if (
      f.sourceSense.sourceAnchor !== "d-1-1-1" ||
      f.sourceSense.senseSpanSha256 !== sha(sense) ||
      f.sourceSense.senseSpanUtf8Bytes !== Buffer.byteLength(sense, "utf8") ||
      f.sourceSense.definitionGerman !== definition ||
      !sense
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .includes(definition) ||
      f.morphology.morphologySpanSha256 !== sha(morph) ||
      f.morphology.morphologySpanUtf8Bytes !==
        Buffer.byteLength(morph, "utf8") ||
      f.morphology.headwordArticleSpanSha256 !== sha(headwordArticle ?? "") ||
      f.morphology.headwordArticleSpanUtf8Bytes !==
        Buffer.byteLength(headwordArticle ?? "", "utf8") ||
      f.morphology.lemma !== lemma ||
      f.morphology.article !== article ||
      f.morphology.plural !== plural ||
      f.morphology.sourceGenderLabel !== gender ||
      !headwordArticle?.includes(`<b>${lemma}</b>, ${article}</h1>`) ||
      !morph.includes(`Substantiv (${gender})`) ||
      !morph.includes(`Nominativ Plural: <b>${plural}</b>`)
    )
      throw Error("task6c_c01_facts_source_mismatch");
  }
  record(data.factReceipt, "task6c_c01_facts_receipt");
  exact(
    data.factReceipt,
    [
      "scope",
      "verdict",
      "noSemanticAdmission",
      "noTranslationClaim",
      "noRegionalOrProductiveClaim",
      "noRegisterClaim",
      "noCanonicalPromotion",
    ],
    "task6c_c01_facts_receipt_schema",
  );
  if (
    data.factReceipt.scope !== "RAW_SOURCE_FACTS_ONLY" ||
    data.factReceipt.verdict !== "HOLD_FACTS_ONLY" ||
    data.factReceipt.noSemanticAdmission !== true ||
    data.factReceipt.noTranslationClaim !== true ||
    data.factReceipt.noRegionalOrProductiveClaim !== true ||
    data.factReceipt.noRegisterClaim !== true ||
    data.factReceipt.noCanonicalPromotion !== true
  )
    throw Error("task6c_c01_facts_receipt");
  return data as GermanTask6cL01C01HausNameFactsDeV1;
}
function realContained(root: string, relative: string, code: string): string {
  const candidate = path.resolve(root, relative);
  const real = fs.realpathSync(candidate);
  if (!real.startsWith(`${root}${path.sep}`)) throw Error(code);
  return real;
}
/** Production authority has no caller-controlled source path. */
export function loadGermanTask6cL01C01HausNameFactsDeV1(): GermanTask6cL01C01HausNameFactsDeV1 {
  loadGermanTask6cL01C01HausNameDirectCaptureDeV1();
  return loadAtTrustedFixtureRoots(ROOT, CAPTURE);
}
/** Test-only fixture validator; it cannot promote, admit, or deliver content. */
export const germanTask6cL01C01HausNameFactsTestHarnessDeV1 = Object.freeze({
  validateFixture(root: string, capture: string): void {
    loadAtTrustedFixtureRoots(root, capture);
  },
});
