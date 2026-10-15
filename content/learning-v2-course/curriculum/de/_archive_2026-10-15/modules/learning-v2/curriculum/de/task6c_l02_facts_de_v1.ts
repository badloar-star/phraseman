import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  germanTask6cL02DirectCaptureTestHarnessDeV1,
  loadGermanTask6cL02DirectCaptureDeV1,
} from "./task6c_l02_direct_capture_de_v1";

type RecordValue = Record<string, unknown>;
const ROOT = path.resolve(__dirname, "evidence/task6c_l02_facts_v1");
const CAPTURE = path.resolve(
  __dirname,
  "evidence/task6c_l02_direct_capture_v1",
);
const CAPTURE_SHA =
  "f6aea4f863f4ea06b54a99b4fb8913493d4352c0292c6382c641c88a1fbddbe9";
const sha = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
const expected = [
  [
    "de_lex_plan_l02_c01_wohnen_v1",
    "wohnen",
    "seinen ständigen Aufenthalt an einem bestimmten Ort, seine Wohnung in einem bestimmten Haus haben",
    "Verb",
  ],
  [
    "de_lex_plan_l02_c01_kueche_v1",
    "Küche",
    "Raum, in dem die Speisen zubereitet und gekocht werden",
    "die",
    "Küchen",
    "Femininum",
  ],
  [
    "de_lex_plan_l02_c02_tasse_v1",
    "Tasse",
    "Trinkgefäß (mit Henkel), besonders für heiße Getränke",
    "die",
    "Tassen",
    "Femininum",
  ],
  [
    "de_lex_plan_l02_c02_teller_v1",
    "Teller",
    "rundes Essgeschirr mit erhöhtem Rand, meist aus Porzellan oder Steingut",
    "der",
    "Teller",
    "Maskulinum",
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
  if (start < 0) throw Error("task6c_l02_facts_span_missing");
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0;
  for (let match: RegExpExecArray | null; (match = re.exec(html)); ) {
    if (match.index < start) continue;
    depth += match[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  throw Error("task6c_l02_facts_span_unbalanced");
};
export type GermanTask6cL02FactsDeV1 = Readonly<{
  status: "HOLD_FACTS_ONLY";
  canonicalAdmission: "FORBIDDEN";
  rowsPromoted: 0;
  task7Unlock: false;
  learnerFacing: false;
  phraseClaim: false;
  facts: readonly Readonly<RecordValue>[];
}>;
function validate(
  rootForTest: string,
  captureRootForTest: string,
): GermanTask6cL02FactsDeV1 {
  const root = fs.realpathSync(rootForTest);
  const captureRoot = fs.realpathSync(captureRootForTest);
  germanTask6cL02DirectCaptureTestHarnessDeV1.validateFixture(
    captureRootForTest,
  );
  const data: unknown = JSON.parse(
    fs.readFileSync(
      contained(root, "facts.json", "task6c_l02_facts_path_escape"),
      "utf8",
    ),
  );
  assertRecord(data, "task6c_l02_facts_invalid");
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
    "task6c_l02_facts_schema",
  );
  if (
    data.schemaVersion !== "learning-v2-de-task6c-l02-facts.v1" ||
    data.status !== "HOLD_FACTS_ONLY" ||
    data.canonicalAdmission !== "FORBIDDEN" ||
    data.semanticAdmission !== "NOT_EVALUATED" ||
    data.rowsPromoted !== 0 ||
    data.task7Unlock !== false ||
    data.learnerFacing !== false ||
    data.phraseClaim !== false
  )
    throw Error("task6c_l02_facts_authority");
  assertRecord(data.capture, "task6c_l02_facts_capture");
  exact(data.capture, ["path", "sha256"], "task6c_l02_facts_capture_schema");
  if (
    data.capture.path !==
      "modules/learning-v2/curriculum/de/evidence/task6c_l02_direct_capture_v1/manifest.json" ||
    data.capture.sha256 !== CAPTURE_SHA ||
    sha(
      fs.readFileSync(
        contained(
          captureRoot,
          "manifest.json",
          "task6c_l02_facts_capture_path_escape",
        ),
      ),
    ) !== CAPTURE_SHA
  )
    throw Error("task6c_l02_facts_capture");
  if (!Array.isArray(data.facts) || data.facts.length !== expected.length)
    throw Error("task6c_l02_facts_roster");
  for (let index = 0; index < expected.length; index += 1) {
    const row = data.facts[index];
    assertRecord(row, "task6c_l02_facts_row");
    const [plan, lemma, definition, ...form] = expected[index];
    exact(
      row,
      plan.includes("wohnen")
        ? ["sourcePlanId", "sourceSense", "sourceFormFacts"]
        : ["sourcePlanId", "sourceSense", "morphology"],
      "task6c_l02_facts_row_schema",
    );
    if (row.sourcePlanId !== plan) throw Error("task6c_l02_facts_crosswire");
    assertRecord(row.sourceSense, "task6c_l02_facts_sense");
    exact(
      row.sourceSense,
      [
        "sourceAnchor",
        "senseSpanSha256",
        "senseSpanUtf8Bytes",
        "definitionGerman",
      ],
      "task6c_l02_facts_sense_schema",
    );
    const raw = fs.readFileSync(
      contained(
        captureRoot,
        `raw/${plan}.html`,
        "task6c_l02_facts_capture_path_escape",
      ),
      "utf8",
    );
    const sense = outer(raw, '<div class="dwdswb-lesart" id="d-1-1"');
    const morphology = outer(
      raw,
      '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
    );
    if (
      row.sourceSense.sourceAnchor !== "d-1-1" ||
      row.sourceSense.senseSpanSha256 !== sha(sense) ||
      row.sourceSense.senseSpanUtf8Bytes !== Buffer.byteLength(sense, "utf8") ||
      row.sourceSense.definitionGerman !== definition ||
      !sense
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .includes(definition)
    )
      throw Error("task6c_l02_facts_source_mismatch");
    if (plan.includes("wohnen")) {
      assertRecord(row.sourceFormFacts, "task6c_l02_facts_verb");
      exact(
        row.sourceFormFacts,
        [
          "morphologySpanSha256",
          "morphologySpanUtf8Bytes",
          "lemma",
          "partOfSpeech",
          "attestedPresent3sg",
          "attestedPreterite3sg",
          "attestedPerfect3sg",
          "separability",
          "verbPackage",
        ],
        "task6c_l02_facts_verb_schema",
      );
      if (
        row.sourceFormFacts.morphologySpanSha256 !== sha(morphology) ||
        row.sourceFormFacts.morphologySpanUtf8Bytes !==
          Buffer.byteLength(morphology, "utf8") ||
        row.sourceFormFacts.lemma !== lemma ||
        row.sourceFormFacts.partOfSpeech !== form[0] ||
        row.sourceFormFacts.attestedPresent3sg !== "wohnt" ||
        row.sourceFormFacts.attestedPreterite3sg !== "wohnte" ||
        row.sourceFormFacts.attestedPerfect3sg !== "hat gewohnt" ||
        row.sourceFormFacts.separability !== "NOT_ADJUDICATED" ||
        row.sourceFormFacts.verbPackage !== "NOT_ADJUDICATED" ||
        !morphology.includes("<b>wohnt</b>") ||
        !morphology.includes("<b>wohnte</b>") ||
        !morphology.includes("<b>hat</b>") ||
        !morphology.includes("<b>gewohnt</b>")
      )
        throw Error("task6c_l02_facts_verb_source_mismatch");
    } else {
      assertRecord(row.morphology, "task6c_l02_facts_noun");
      exact(
        row.morphology,
        [
          "morphologySpanSha256",
          "morphologySpanUtf8Bytes",
          "lemma",
          "article",
          "plural",
          "sourceGenderLabel",
        ],
        "task6c_l02_facts_noun_schema",
      );
      const [article, plural, gender] = form;
      const headword =
        raw.match(/<h1[^>]*><b>[^<]+<\/b>, (?:der|die|das)<\/h1>/u)?.[0] ?? "";
      if (
        row.morphology.morphologySpanSha256 !== sha(morphology) ||
        row.morphology.morphologySpanUtf8Bytes !==
          Buffer.byteLength(morphology, "utf8") ||
        row.morphology.lemma !== lemma ||
        row.morphology.article !== article ||
        row.morphology.plural !== plural ||
        row.morphology.sourceGenderLabel !== gender ||
        !headword.includes(`<b>${lemma}</b>, ${article}</h1>`) ||
        !morphology.includes(`Substantiv (${gender})`) ||
        !morphology.includes(`Nominativ Plural: <b>${plural}</b>`)
      )
        throw Error("task6c_l02_facts_noun_source_mismatch");
    }
  }
  assertRecord(data.factReceipt, "task6c_l02_facts_receipt");
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
    "task6c_l02_facts_receipt_schema",
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
    throw Error("task6c_l02_facts_receipt");
  return data as GermanTask6cL02FactsDeV1;
}
export function loadGermanTask6cL02FactsDeV1(): GermanTask6cL02FactsDeV1 {
  loadGermanTask6cL02DirectCaptureDeV1();
  return validate(ROOT, CAPTURE);
}
export const germanTask6cL02FactsTestHarnessDeV1 = Object.freeze({
  validateFixture(root: string, capture: string): void {
    validate(root, capture);
  },
});
