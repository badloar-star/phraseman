import { createHash } from "node:crypto";

import { canonicalJsonV1 } from "../../policies/decision_registry";

type JsonRecord = Record<string, unknown>;

export type GermanTask6V2VerbValencyAdjudicationDeV1 = Readonly<{
  schemaVersion: "learning-v2-german-verb-valency-adjudication.v1";
  id: "de_valency_l02_c01_wohnen_v1";
  sourcePlanId: "de_lex_plan_l02_c01_wohnen_v1";
  candidateCanonicalSenseId: "de_lex_l02_c01_wohnen_v1";
  task5CanonicalBodySha256: string;
  task5VerbPackageSha256: string;
  captureManifestSha256: string;
  source: Readonly<{
    url: "https://www.dwds.de/wb/wohnen";
    anchor: "d-1-1";
    bodySha256: string;
    senseSpanSha256: string;
    morphologySpanSha256: string;
    definitionGerman: string;
    constructionPatternGerman: "⟨jmd. wohnt irgendwo⟩";
  }>;
  scope: Readonly<{
    admittedSense: "RESIDENCE_CORE_ONLY";
    d1_2Admitted: false;
    metaphorAdmitted: false;
  }>;
  adjudication: Readonly<{
    frame: "intransitive residence frame";
    separability: "INSEPARABLE";
    perfectAuxiliary: "haben";
    slots: readonly ["subject", "residence-location complement"];
    complementObligatoriness: "UNCLAIMED";
    caseGovernment: "UNCLAIMED";
  }>;
  authority: Readonly<{
    status: "HOLD_ADJUDICATION_ONLY";
    canonicalAdmission: "FORBIDDEN";
    rowsPromoted: 0;
    task7Unlock: false;
    learnerFacing: false;
    phraseClaims: false;
    releaseAuthorized: false;
  }>;
}>;

export type GermanLexicalItemEvidenceDeV2 = Readonly<{
  schemaVersion: "learning-v2-german-lexical-item-evidence.v2";
  id: string;
  sourcePlanId: string;
  candidateCanonicalSenseId: string;
  candidateManifestSha256: string;
  captureManifestSha256: string;
  evidenceMembership: "CANDIDATE_ONLY_NOT_CANONICAL_ADMISSION";
  regionalEvidenceId: "DE-REG-BASELINE-001";
  semanticIdentity: string;
  lemma: string;
  senseGloss: string;
  communicativeUse: string;
  partOfSpeech: "noun" | "verb";
  noun: Readonly<{
    article: "der" | "die";
    singular: string;
    plural: string;
    sourceGenderLabel: "Maskulinum" | "Femininum";
  }> | null;
  verb: Readonly<{
    infinitive: "wohnen";
    valencyFrame: "intransitive residence frame";
    separability: "INSEPARABLE";
    perfectAuxiliary: "haben";
    slots: readonly ["subject", "residence-location complement"];
    complementObligatoriness: "UNCLAIMED";
    caseGovernment: "UNCLAIMED";
  }> | null;
  source: Readonly<{
    url: string;
    anchor: "d-1-1";
    bodySha256: string;
    senseSpanSha256: string;
    morphologySpanSha256: string;
    definitionGerman: string;
  }>;
  canonicalAdmission: "FORBIDDEN";
  rowsPromoted: 0;
  task7Unlock: false;
  learnerFacing: false;
  phraseClaims: false;
  releaseAuthorized: false;
}>;

const TASK5_CANONICAL_SHA =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";
const TASK5_VERB_PACKAGE_SHA =
  "8528c540c8028de3ea0740abbe128c9f62e6e9f002f2433250252a3cd762d2fc";
const CAPTURE_MANIFEST_SHA =
  "e79b6c6016638ecc943ef633b814761ed5c95595a4e61171fb057da84273a535";
const CANDIDATE_MANIFEST_SHA =
  "d3430ade94b3901bca987f91d9a8ead5ec2efee530470835585e4447d6c3746c";

const WOHNEN_ADJUDICATION = {
  schemaVersion: "learning-v2-german-verb-valency-adjudication.v1",
  id: "de_valency_l02_c01_wohnen_v1",
  sourcePlanId: "de_lex_plan_l02_c01_wohnen_v1",
  candidateCanonicalSenseId: "de_lex_l02_c01_wohnen_v1",
  task5CanonicalBodySha256: TASK5_CANONICAL_SHA,
  task5VerbPackageSha256: TASK5_VERB_PACKAGE_SHA,
  captureManifestSha256: CAPTURE_MANIFEST_SHA,
  source: {
    url: "https://www.dwds.de/wb/wohnen",
    anchor: "d-1-1",
    bodySha256:
      "1b2f4f0d0758994c9318e2dfd43feae66a3eaff35747ea439ccc7ad6440c85ce",
    senseSpanSha256:
      "cfe8f854857d65223619ea5c223c076592ff6424dbeb7a93f0b3526d0bebafb0",
    morphologySpanSha256:
      "71208e25cfa546245f0970b02ad201564630f5fff576acfc38d851daa520be72",
    definitionGerman:
      "seinen ständigen Aufenthalt an einem bestimmten Ort, seine Wohnung in einem bestimmten Haus haben",
    constructionPatternGerman: "⟨jmd. wohnt irgendwo⟩",
  },
  scope: {
    admittedSense: "RESIDENCE_CORE_ONLY",
    d1_2Admitted: false,
    metaphorAdmitted: false,
  },
  adjudication: {
    frame: "intransitive residence frame",
    separability: "INSEPARABLE",
    perfectAuxiliary: "haben",
    slots: ["subject", "residence-location complement"],
    complementObligatoriness: "UNCLAIMED",
    caseGovernment: "UNCLAIMED",
  },
  authority: {
    status: "HOLD_ADJUDICATION_ONLY",
    canonicalAdmission: "FORBIDDEN",
    rowsPromoted: 0,
    task7Unlock: false,
    learnerFacing: false,
    phraseClaims: false,
    releaseAuthorized: false,
  },
} as const satisfies GermanTask6V2VerbValencyAdjudicationDeV1;

const EVIDENCE_AUTHORITY = Object.freeze({
  canonicalAdmission: "FORBIDDEN" as const,
  rowsPromoted: 0 as const,
  task7Unlock: false as const,
  learnerFacing: false as const,
  phraseClaims: false as const,
  releaseAuthorized: false as const,
});

const evidenceRow = (
  value: Omit<
    GermanLexicalItemEvidenceDeV2,
    | "schemaVersion"
    | "candidateManifestSha256"
    | "captureManifestSha256"
    | "evidenceMembership"
    | "regionalEvidenceId"
    | keyof typeof EVIDENCE_AUTHORITY
  >,
): GermanLexicalItemEvidenceDeV2 => ({
  schemaVersion: "learning-v2-german-lexical-item-evidence.v2",
  ...value,
  candidateManifestSha256: CANDIDATE_MANIFEST_SHA,
  captureManifestSha256: CAPTURE_MANIFEST_SHA,
  evidenceMembership: "CANDIDATE_ONLY_NOT_CANONICAL_ADMISSION",
  regionalEvidenceId: "DE-REG-BASELINE-001",
  ...EVIDENCE_AUTHORITY,
});

const EXPECTED_EVIDENCE = [
  evidenceRow({
    id: "DE-LEX-ITEM-L02-C01-WOHNEN-SENSE-FORM-001",
    sourcePlanId: "de_lex_plan_l02_c01_wohnen_v1",
    candidateCanonicalSenseId: "de_lex_l02_c01_wohnen_v1",
    semanticIdentity: "wohnen|live or reside at a home",
    lemma: "wohnen",
    senseGloss: "live or reside at a home",
    communicativeUse:
      "notice the person-number choice in a bounded residence action",
    partOfSpeech: "verb",
    noun: null,
    verb: {
      infinitive: "wohnen",
      valencyFrame: "intransitive residence frame",
      separability: "INSEPARABLE",
      perfectAuxiliary: "haben",
      slots: ["subject", "residence-location complement"],
      complementObligatoriness: "UNCLAIMED",
      caseGovernment: "UNCLAIMED",
    },
    source: {
      url: "https://www.dwds.de/wb/wohnen",
      anchor: "d-1-1",
      bodySha256:
        "1b2f4f0d0758994c9318e2dfd43feae66a3eaff35747ea439ccc7ad6440c85ce",
      senseSpanSha256:
        "cfe8f854857d65223619ea5c223c076592ff6424dbeb7a93f0b3526d0bebafb0",
      morphologySpanSha256:
        "71208e25cfa546245f0970b02ad201564630f5fff576acfc38d851daa520be72",
      definitionGerman:
        "seinen ständigen Aufenthalt an einem bestimmten Ort, seine Wohnung in einem bestimmten Haus haben",
    },
  }),
  evidenceRow({
    id: "DE-LEX-ITEM-L02-C01-KUECHE-SENSE-FORM-001",
    sourcePlanId: "de_lex_plan_l02_c01_kueche_v1",
    candidateCanonicalSenseId: "de_lex_l02_c01_kueche_v1",
    semanticIdentity: "kuche|room for preparing food",
    lemma: "Küche",
    senseGloss: "room for preparing food",
    communicativeUse:
      "identify the shared room without a gender prediction rule",
    partOfSpeech: "noun",
    noun: {
      article: "die",
      singular: "Küche",
      plural: "Küchen",
      sourceGenderLabel: "Femininum",
    },
    verb: null,
    source: {
      url: "https://www.dwds.de/wb/K%C3%BCche",
      anchor: "d-1-1",
      bodySha256:
        "6b416970816020195cb24b458209c78327f404e8d0e71b5c9f6b43692509af3e",
      senseSpanSha256:
        "1394d2752dd905044eeb49b03b75062e2bd42e7c9beca7f3ddf106ab6c29f97b",
      morphologySpanSha256:
        "da8cfb368db1428770a22217e70127760325dd3c278f98a1b901b52d954879ed",
      definitionGerman:
        "Raum, in dem die Speisen zubereitet und gekocht werden",
    },
  }),
  evidenceRow({
    id: "DE-LEX-ITEM-L02-C02-TASSE-SENSE-FORM-001",
    sourcePlanId: "de_lex_plan_l02_c02_tasse_v1",
    candidateCanonicalSenseId: "de_lex_l02_c02_tasse_v1",
    semanticIdentity: "tasse|handled cup for a hot drink",
    lemma: "Tasse",
    senseGloss: "handled cup for a hot drink",
    communicativeUse:
      "retrieve a complete noun package for an everyday shared object",
    partOfSpeech: "noun",
    noun: {
      article: "die",
      singular: "Tasse",
      plural: "Tassen",
      sourceGenderLabel: "Femininum",
    },
    verb: null,
    source: {
      url: "https://www.dwds.de/wb/Tasse",
      anchor: "d-1-1",
      bodySha256:
        "b2c6778db4fdc35540b354128ec30370027e41ec035769cc013140a852d269bb",
      senseSpanSha256:
        "15c9ae0e32b41c0594e402146f55d59977b01110ffbce5fe49389efa85ef1849",
      morphologySpanSha256:
        "8ae608d82a86b4a06da26eb41d19fc0f72dcb0f76ef367d699ed097b355037bc",
      definitionGerman: "Trinkgefäß (mit Henkel), besonders für heiße Getränke",
    },
  }),
  evidenceRow({
    id: "DE-LEX-ITEM-L02-C02-TELLER-SENSE-FORM-001",
    sourcePlanId: "de_lex_plan_l02_c02_teller_v1",
    candidateCanonicalSenseId: "de_lex_l02_c02_teller_v1",
    semanticIdentity: "teller|flat dish used for serving food",
    lemma: "Teller",
    senseGloss: "flat dish used for serving food",
    communicativeUse:
      "contrast a complete masculine singular-plural package with a visible object",
    partOfSpeech: "noun",
    noun: {
      article: "der",
      singular: "Teller",
      plural: "Teller",
      sourceGenderLabel: "Maskulinum",
    },
    verb: null,
    source: {
      url: "https://www.dwds.de/wb/Teller",
      anchor: "d-1-1",
      bodySha256:
        "7be76f44dd449c750844755fbb553bdc5e66f9edcc3a197fdb9afcb0a5d01b9b",
      senseSpanSha256:
        "b7792d5c8dde13ea5d7796c223da7619e219d4f53b12bc0231fe357dbca443e6",
      morphologySpanSha256:
        "9d4c48146b1462b661d790dcb0b8fc042fb6b51ab498155eeed0073714007a0b",
      definitionGerman:
        "rundes Essgeschirr mit erhöhtem Rand, meist aus Porzellan oder Steingut",
    },
  }),
] as const satisfies readonly GermanLexicalItemEvidenceDeV2[];

function fail(code: string): never {
  throw new Error(code);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(canonicalJsonV1(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as JsonRecord)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function outerDiv(html: string, marker: string): string {
  const start = html.indexOf(marker);
  if (start < 0) fail("wohnen_source_span_missing");
  const tags = /<\/?div\b[^>]*>/giu;
  tags.lastIndex = start;
  let depth = 0;
  for (let match = tags.exec(html); match; match = tags.exec(html)) {
    if (match.index < start) continue;
    depth += match[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, tags.lastIndex);
  }
  fail("wohnen_source_span_missing");
}

export function parseGermanTask6V2VerbValencyAdjudicationsDeV1(
  input: unknown,
): readonly GermanTask6V2VerbValencyAdjudicationDeV1[] {
  const normalized = cloneJson(input);
  if (!Array.isArray(normalized) || normalized.length !== 1) {
    fail("wohnen_valency_roster");
  }
  const row = normalized[0] as JsonRecord;
  if (row.schemaVersion !== "learning-v2-german-verb-valency-adjudication.v1") {
    fail("wohnen_valency_schema");
  }
  const source = row.source as JsonRecord;
  const scope = row.scope as JsonRecord;
  const adjudication = row.adjudication as JsonRecord;
  const authority = row.authority as JsonRecord;
  if (
    row.id !== WOHNEN_ADJUDICATION.id ||
    row.sourcePlanId !== WOHNEN_ADJUDICATION.sourcePlanId ||
    row.candidateCanonicalSenseId !==
      WOHNEN_ADJUDICATION.candidateCanonicalSenseId ||
    row.task5CanonicalBodySha256 !== TASK5_CANONICAL_SHA ||
    row.task5VerbPackageSha256 !== TASK5_VERB_PACKAGE_SHA ||
    row.captureManifestSha256 !== CAPTURE_MANIFEST_SHA ||
    source?.url !== WOHNEN_ADJUDICATION.source.url ||
    source?.anchor !== "d-1-1" ||
    source?.bodySha256 !== WOHNEN_ADJUDICATION.source.bodySha256 ||
    source?.senseSpanSha256 !== WOHNEN_ADJUDICATION.source.senseSpanSha256 ||
    source?.morphologySpanSha256 !==
      WOHNEN_ADJUDICATION.source.morphologySpanSha256 ||
    source?.definitionGerman !== WOHNEN_ADJUDICATION.source.definitionGerman ||
    source?.constructionPatternGerman !== "⟨jmd. wohnt irgendwo⟩"
  ) {
    fail("wohnen_valency_identity");
  }
  if (
    scope?.admittedSense !== "RESIDENCE_CORE_ONLY" ||
    scope?.d1_2Admitted !== false ||
    scope?.metaphorAdmitted !== false
  ) {
    fail("wohnen_valency_scope");
  }
  if (
    adjudication?.frame !== "intransitive residence frame" ||
    adjudication?.separability !== "INSEPARABLE" ||
    adjudication?.perfectAuxiliary !== "haben" ||
    canonicalJsonV1(adjudication?.slots) !==
      canonicalJsonV1(["subject", "residence-location complement"]) ||
    adjudication?.complementObligatoriness !== "UNCLAIMED" ||
    adjudication?.caseGovernment !== "UNCLAIMED"
  ) {
    fail("wohnen_valency_adjudication");
  }
  if (
    authority?.status !== "HOLD_ADJUDICATION_ONLY" ||
    authority?.canonicalAdmission !== "FORBIDDEN" ||
    authority?.rowsPromoted !== 0 ||
    authority?.task7Unlock !== false ||
    authority?.learnerFacing !== false ||
    authority?.phraseClaims !== false ||
    authority?.releaseAuthorized !== false
  ) {
    fail("wohnen_valency_authority");
  }
  if (canonicalJsonV1(row) !== canonicalJsonV1(WOHNEN_ADJUDICATION)) {
    fail("wohnen_valency_closed_schema");
  }
  return deepFreeze(
    normalized,
  ) as readonly GermanTask6V2VerbValencyAdjudicationDeV1[];
}

export function validateGermanWohnenEvidenceSourceBindingDeV2(
  body: Buffer,
  adjudication: GermanTask6V2VerbValencyAdjudicationDeV1,
): Readonly<{
  bodySha256: string;
  senseSpanSha256: string;
  morphologySpanSha256: string;
}> {
  const bodySha256 = sha256(body);
  if (bodySha256 !== adjudication.source.bodySha256) {
    fail("wohnen_source_body_hash");
  }
  const html = body.toString("utf8");
  const sense = outerDiv(html, '<div class="dwdswb-lesart" id="d-1-1"');
  const morphology = outerDiv(
    html,
    '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
  );
  const senseSpanSha256 = sha256(sense);
  const morphologySpanSha256 = sha256(morphology);
  if (senseSpanSha256 !== adjudication.source.senseSpanSha256) {
    fail("wohnen_source_sense_hash");
  }
  if (morphologySpanSha256 !== adjudication.source.morphologySpanSha256) {
    fail("wohnen_source_morphology_hash");
  }
  const normalizedSense = sense.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ");
  if (
    !normalizedSense.includes(adjudication.source.definitionGerman) ||
    !sense.includes('title="jemand"') ||
    !sense.includes(">jmd.</abbr>") ||
    !sense.includes('<span class="dwdswb-stichwort">wohnt</span> irgendwo') ||
    !morphology.includes("<b>wohnt</b>") ||
    !morphology.includes("<b>wohnte</b>") ||
    !morphology.includes("<b>hat</b>") ||
    !morphology.includes("<b>gewohnt</b>")
  ) {
    fail("wohnen_source_claim_reextraction");
  }
  return Object.freeze({
    bodySha256,
    senseSpanSha256,
    morphologySpanSha256,
  });
}

export function parseGermanLexicalItemEvidenceRegistryDeV2(
  input: unknown,
): readonly GermanLexicalItemEvidenceDeV2[] {
  const normalized = cloneJson(input);
  if (!Array.isArray(normalized) || normalized.length !== 4) {
    fail("lexical_item_evidence_v2_roster");
  }
  for (let index = 0; index < normalized.length; index += 1) {
    const row = normalized[index] as JsonRecord;
    if (row.schemaVersion !== "learning-v2-german-lexical-item-evidence.v2") {
      fail("lexical_item_evidence_v2_schema_mix_forbidden");
    }
    if (
      row.canonicalAdmission !== "FORBIDDEN" ||
      row.rowsPromoted !== 0 ||
      row.task7Unlock !== false ||
      row.learnerFacing !== false ||
      row.phraseClaims !== false ||
      row.releaseAuthorized !== false ||
      row.evidenceMembership !== "CANDIDATE_ONLY_NOT_CANONICAL_ADMISSION"
    ) {
      fail("lexical_item_evidence_v2_authority");
    }
    if (canonicalJsonV1(row) !== canonicalJsonV1(EXPECTED_EVIDENCE[index])) {
      fail("lexical_item_evidence_v2_identity");
    }
  }
  return deepFreeze(normalized) as readonly GermanLexicalItemEvidenceDeV2[];
}

export const GERMAN_TASK6_V2_VERB_VALENCY_ADJUDICATIONS_DE_V1 =
  parseGermanTask6V2VerbValencyAdjudicationsDeV1([WOHNEN_ADJUDICATION]);

export const GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V2 =
  parseGermanLexicalItemEvidenceRegistryDeV2(EXPECTED_EVIDENCE);
