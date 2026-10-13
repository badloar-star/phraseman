import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, any>;

export type GermanTask6cL01GutenTagPositiveAdmissionOptionsDeV1 = Readonly<
  Partial<
    Record<
      | "rawPathForTest"
      | "metadataPathForTest"
      | "extractionPathForTest"
      | "evidencePathForTest"
      | "lexicalV7PathForTest"
      | "task6V7PathForTest"
      | "inventoryV7PathForTest"
      | "manifestPathForTest"
      | "receiptPathForTest",
      string
    >
  >
>;

export type GermanTask6cL01GutenTagPositiveAdmissionResultDeV1 = Readonly<{
  status: "PASS";
  decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION";
  admissionScope: "DWDS_D_1_1_GREETING_HALF_LEXICAL_ONLY";
  sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1";
  canonicalSenseId: "de_lex_l01_c04_guten_tag_v1";
  checkpointPacketId: "de_l01_c04_s32";
  firstIntroductionPacketId: null;
  phraseAuthority: false;
  resolvedPlanIds: 11;
  unresolvedPlanIds: 277;
  packetIds: 1792;
  materializedPackets: 0;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const BASE =
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1";
const PATHS = Object.freeze({
  task5: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
  lexicalV2:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v2.json",
  task6V2:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json",
  inventoryV2:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
  lexicalV3:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v3.json",
  task6V3:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v3.json",
  inventoryV3:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v3.json",
  lexicalV4:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v4.json",
  task6V4:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v4.json",
  inventoryV4:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v4.json",
  lexicalV5:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v5.json",
  task6V5:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v5.json",
  inventoryV5:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v5.json",
  lexicalV6:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v6.json",
  task6V6:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v6.json",
  inventoryV6:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v6.json",
  v6Closure:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_final_review_closure_v1/closure.json",
  oldHoldModule:
    "modules/learning-v2/curriculum/de/task7_v2_l01_c04_guten_tag_source_hold_de_v1.ts",
  oldHoldManifest:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1/manifest.json",
  oldHoldMap:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1/extraction_map.json",
  goethePdf:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1/raw/goethe_a1_redemittel.pdf",
  goetheMetadata:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1/raw/goethe_a1_redemittel.http_metadata.txt",
  formulaicManifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/manifest.json",
  formulaicMap:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/extraction_map.json",
  formulaicClosure:
    "docs/v2/curriculum/de/task6c-l01-seven-formulaic-closure-v1/F.json",
  defaultConsumer:
    "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
  englishManifest:
    "modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2.ts",
  raw: `${BASE}/raw/dwds_guten_tag.html`,
  metadata: `${BASE}/raw/dwds_guten_tag.http_metadata.json`,
  extraction: `${BASE}/extraction_map.json`,
  evidence: `${BASE}/lexical_evidence.json`,
  lexicalV7:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v7.json",
  task6V7:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v7.json",
  inventoryV7:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v7.json",
  manifest: `${BASE}/manifest.json`,
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
} as const);

const HASHES = Object.freeze({
  [PATHS.task5]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
  [PATHS.lexicalV2]:
    "31934e35b5278c7a7e901d08e02da5398f3503825782acbb604d06de094726a5",
  [PATHS.task6V2]:
    "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f",
  [PATHS.inventoryV2]:
    "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
  [PATHS.lexicalV3]:
    "475caad2f4a56a576301836c2bb4590061dd4536cd40553b1638ce605bfdbcbb",
  [PATHS.task6V3]:
    "8f54a19fcaad578a374c06e3a4ecf5504ab761b1790a296056334aa35bf36862",
  [PATHS.inventoryV3]:
    "702a491699774d2f0cc90c19755bc8747a0b1663ddd2e94f272b68d40ddc1d88",
  [PATHS.lexicalV4]:
    "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
  [PATHS.task6V4]:
    "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
  [PATHS.inventoryV4]:
    "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
  [PATHS.lexicalV5]:
    "4ed741cc0e457eff0c3500f98e6c8d62a33a951110d428ff1333075eca99a2c7",
  [PATHS.task6V5]:
    "9bbf41335e13dff8f97be3bbd05f21284c99e62c31d5fcb63f7b5f0ab324af91",
  [PATHS.inventoryV5]:
    "e1c01fa8ef727c23d128d07bbe5cf67f7c04c6539610817ba39b6e0b555fb3b4",
  [PATHS.lexicalV6]:
    "3d45077cba6f20e826ce3fa04732a91fec15d571ac9a0cb54923c8ec84c66e55",
  [PATHS.task6V6]:
    "63d65319b2f41dc6cb08e8e4e407fbf4a6ca71c061229da64a886c62ba9403bc",
  [PATHS.inventoryV6]:
    "e940b37e2ea29e479710dada185c8bc1466bb04b61176c8c839432eeaf392677",
  [PATHS.v6Closure]:
    "7d12e8f92cc4f190a53cbd2a04463fbd04dde42d39063b704059400e8af0577c",
  [PATHS.oldHoldModule]:
    "1804b07619e917f942e47f4518b4364a67150dfd16cdaf7e210aa2dfabaa68c0",
  [PATHS.oldHoldManifest]:
    "c253a9a16764f19804e320effefb5f4d9ff85e3ab1eb045f0f2aecb90dc8b7bb",
  [PATHS.oldHoldMap]:
    "b72e8f7ef2e66170cdbba46f34fffe1efffcbe07bbcb93e410636b34bbac1db6",
  [PATHS.goethePdf]:
    "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085",
  [PATHS.goetheMetadata]:
    "afa2a1f9de300071b9e885fb3ade745766b53d7f7bd5bee5732f188806db8f47",
  [PATHS.formulaicManifest]:
    "2c3bca21dc11dee134979bacf64520cca3ce1dce1d0bd58b16657d2f75955e98",
  [PATHS.formulaicMap]:
    "4cb9d040275870fe6857b222c9bad26fab46646094994a7704bb9d9f0c93c3a7",
  [PATHS.formulaicClosure]:
    "48040a29b481c4c29f325f0f2529b95e6ef58e212196ac68298272a611c1e1be",
  [PATHS.defaultConsumer]:
    "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
  [PATHS.englishManifest]:
    "bfcc82ba0300eba9f706bdd82e7b2a6a9d2b5a9ea18859bff2d451b39d7fe976",
  [PATHS.raw]:
    "542050aad29117960da3264eaa73dbb41ffe252b7330d1809a4dc6e47c97ebf2",
  [PATHS.metadata]:
    "b6ecc0a42a37f89f327d30b344ec32b18d7fa79b4995d386fe28699c41fa150b",
  [PATHS.extraction]:
    "ce73ac77e2b97229ef9ea94f47ba2b3318bead5886dfe26f4e523911af9f1e57",
  [PATHS.evidence]:
    "132f65574f9e858a8c7ec22fc6269732a269c4e122fa6a2304caab8bcfd21ddc",
  [PATHS.lexicalV7]:
    "a52b925ee5e6d3adbd1de87749e7722424f6fc9c1fb5a50e3f306d2ad2fce5b1",
  [PATHS.task6V7]:
    "29e2c6b7e379acd2fa69431e28d25eb6c1e97466555bc7751eafe05693b33195",
  [PATHS.inventoryV7]:
    "d409e6cc0a909fdcf486c69308f8d2de84b2a6db688d7a90d31f933e14c0f69b",
  [PATHS.manifest]:
    "23c83a69e545957a8a5314894d27707a2a63991c68dbaeebd50d8592dcb8a0be",
  [PATHS.receipt]:
    "7a018a3bad0755a0b918def7a240e5f9955743b27d709eff662ecc0d5677d855",
});

const OPTION_KEYS = new Set([
  "rawPathForTest",
  "metadataPathForTest",
  "extractionPathForTest",
  "evidencePathForTest",
  "lexicalV7PathForTest",
  "task6V7PathForTest",
  "inventoryV7PathForTest",
  "manifestPathForTest",
  "receiptPathForTest",
]);

function fail(code: string): never {
  throw new Error(code);
}

function sha256(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function exact(value: unknown, expected: unknown, code: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(code);
}

function exactKeys(
  value: JsonRecord,
  keys: readonly string[],
  code: string,
): void {
  exact(Object.keys(value).sort(), [...keys].sort(), code);
}

function record(value: unknown, code: string): asserts value is JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    fail(code);
}

function parseJson(bytes: Buffer, code: string): any {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return fail(code);
  }
}

function read(relative: string, candidate?: string): Buffer {
  return fs.readFileSync(candidate ?? path.join(ROOT, relative));
}

function pinned(relative: keyof typeof HASHES): Buffer {
  const bytes = read(relative);
  if (sha256(bytes) !== HASHES[relative])
    fail("guten_tag_positive_predecessor_drift");
  return bytes;
}

function canonicalJson(relative: keyof typeof HASHES): any {
  return parseJson(pinned(relative), "guten_tag_positive_canonical_json");
}

function candidateJson(
  relative: keyof typeof HASHES,
  candidate: string | undefined,
  code: string,
): any {
  return parseJson(read(relative, candidate), code);
}

function validateTask5(task5: JsonRecord): void {
  const matches = task5.lessons
    .flatMap((lesson: JsonRecord) => lesson.chapters)
    .flatMap((chapter: JsonRecord) =>
      chapter.checkpoint.plannedNewLexicalSenses.map((row: JsonRecord) => ({
        chapter,
        row,
      })),
    )
    .filter(
      ({ row }: { row: JsonRecord }) =>
        row.id === "de_lex_plan_l01_c04_guten_tag_v1",
    );
  if (matches.length !== 1) fail("guten_tag_positive_task5_scope");
  const { chapter, row } = matches[0];
  if (
    chapter.checkpoint.packetId !== "de_l01_c04_s32" ||
    row.lemmaOrExpression !== "Guten Tag" ||
    row.partOfSpeech !== "fixed_expression" ||
    row.lexicalKind !== "FIXED_EXPRESSION" ||
    row.utilityProof.checkpointPacketId !== "de_l01_c04_s32" ||
    JSON.stringify(row.utilityProof.plannedUsePacketIds) !==
      JSON.stringify(["de_l01_c04_s32"])
  )
    fail("guten_tag_positive_task5_scope");
}

function validateRaw(bytes: Buffer): void {
  if (
    bytes.length !== 44909 ||
    sha256(bytes) !== HASHES[PATHS.raw] ||
    !bytes.includes(Buffer.from('id="d-1-1"', "utf8")) ||
    !bytes.includes(
      Buffer.from(
        "höfliche Formel zur Begrüßung, gelegentlich auch zum Abschied",
        "utf8",
      ),
    ) ||
    !bytes.includes(Buffer.from('id="d-1-2"', "utf8")) ||
    !bytes.includes(Buffer.from("Mehrwortausdruck", "utf8"))
  )
    fail("guten_tag_positive_source_drift");
}

function validateMetadata(value: JsonRecord, canonical: JsonRecord): void {
  exactKeys(
    value,
    [
      "schemaVersion",
      "requestedUrl",
      "effectiveUrl",
      "transport",
      "capturedAtHttpDate",
      "curlExit",
      "httpStatus",
      "contentType",
      "contentLengthHeader",
      "downloadedBytes",
      "sha256",
      "responseHeaders",
    ],
    "guten_tag_positive_metadata",
  );
  if (
    value.httpStatus !== 200 ||
    value.downloadedBytes !== 44909 ||
    value.sha256 !== HASHES[PATHS.raw]
  )
    fail("guten_tag_positive_metadata");
  exact(value, canonical, "guten_tag_positive_metadata");
}

function validateExtraction(value: JsonRecord, canonical: JsonRecord): void {
  record(value.dwds, "guten_tag_positive_extraction");
  record(value.dwds.extractions, "guten_tag_positive_extraction");
  const fields = value.dwds.extractions;
  if (
    fields.headword?.text !== "guten Tag" ||
    fields.partOfSpeech?.text !== "Mehrwortausdruck" ||
    fields.d11Definition?.anchor !== "d-1-1" ||
    fields.d11Definition?.sha256 !==
      "3ecf0cefaebe0bae7eb5f97fdd31781c4d9e936bfeeb7f4803f28049847540fe" ||
    fields.admittedGreetingHalf?.text !== "höfliche Formel zur Begrüßung" ||
    fields.excludedOccasionalFarewellTail?.text !==
      "gelegentlich auch zum Abschied" ||
    fields.exactGutenTagExclamation?.sha256 !==
      "00d9b37dae9964f9c6b631c8f9330e8b6177109bbfba9faf7f7537cd074d574c" ||
    fields.excludedD12?.anchor !== "d-1-2" ||
    fields.excludedD12?.usageMarker !== "selten" ||
    JSON.stringify(value.goethe?.extractions?.timingRows) !==
      JSON.stringify(["am Vormittag", "am Mittag", "am Nachmittag"]) ||
    value.goethe?.extractions?.expressionSha256 !==
      "e545fb373a9a5e0e5fa664af788d68528275b6b527241f01f684b2f4e4f31949"
  )
    fail("guten_tag_positive_extraction");
  exact(value, canonical, "guten_tag_positive_extraction");
}

const CLOSED_AUTHORITY = Object.freeze({
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  currentlyMaterializable: false,
  materializedPackets: 0,
  consumerCutover: "NONE",
  defaultConsumerChanged: false,
  ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
});

function validateEvidence(value: JsonRecord, canonical: JsonRecord): void {
  record(value.exclusions, "guten_tag_positive_source_scope");
  if (
    value.admittedSourceSenseAnchor !== "d-1-1" ||
    value.admittedMeaning !== "höfliche Formel zur Begrüßung" ||
    value.pragmaticFunction !== "interaction_opening" ||
    value.exclusions.occasionalFarewellTailExcluded !== true ||
    value.exclusions.rareAngryDismissalD12Excluded !== true
  )
    fail("guten_tag_positive_source_scope");
  record(value.claimBoundaries, "guten_tag_positive_evidence_scope");
  if (
    value.register !== null ||
    value.sourceRegisterMarkers !== null ||
    value.sourcePolitenessMarker !== "höfliche" ||
    value.claimBoundaries.neutralRegisterClaim !== false ||
    value.claimBoundaries.formalRegisterClaim !== false ||
    value.claimBoundaries.unqualifiedFormalAddressClaim !== false
  )
    fail("guten_tag_positive_register");
  exact(
    value.timeOfDayScope,
    ["am Vormittag", "am Mittag", "am Nachmittag"],
    "guten_tag_positive_time_scope",
  );
  if (
    value.exclusions.morningExcluded !== true ||
    value.exclusions.eveningExcluded !== true ||
    value.exclusions.nightExcluded !== true ||
    value.exclusions.unrestrictedAllDayExcluded !== true
  )
    fail("guten_tag_positive_time_scope");
  if (
    value.claimBoundaries.phraseAuthority !== false ||
    value.claimBoundaries.phraseFrameClaim !== false ||
    value.claimBoundaries.phraseMappingClaim !== false ||
    value.claimBoundaries.addresseeCompositionClaim !== false
  )
    fail("guten_tag_positive_phrase_forbidden");
  exact(
    value.allocation,
    {
      checkpointPacketId: "de_l01_c04_s32",
      plannedUsePacketIds: ["de_l01_c04_s32"],
      firstIntroductionPacketId: null,
      firstScoredUsePacketId: null,
    },
    "guten_tag_positive_plan_mapping",
  );
  exact(
    value.authority,
    CLOSED_AUTHORITY,
    "guten_tag_positive_authority_boundary",
  );
  if (value.productionPolicy !== "NOT_AUTHORIZED_BY_THIS_ADMISSION")
    fail("guten_tag_positive_evidence_scope");
  exact(value, canonical, "guten_tag_positive_evidence_scope");
}

function validateLexicalV7(
  value: unknown,
  canonical: unknown,
  lexicalV6: unknown,
): JsonRecord[] {
  if (!Array.isArray(value) || !Array.isArray(lexicalV6))
    fail("guten_tag_positive_lexical_scope");
  if (value.length !== lexicalV6.length + 1)
    fail("guten_tag_positive_lexical_scope");
  exact(value.slice(0, -1), lexicalV6, "guten_tag_positive_predecessor_drift");
  const row = value.at(-1) as JsonRecord;
  record(row, "guten_tag_positive_lexical_scope");
  exactKeys(
    row,
    [
      "id",
      "lemma",
      "senseGloss",
      "partOfSpeech",
      "sourceHeadword",
      "sourcePartOfSpeech",
      "sourceSenseAnchor",
      "sourceSense",
      "excludedSourceSenseSegments",
      "pragmaticFunction",
      "partOfSpeechInterpretation",
      "sourcePolitenessMarker",
      "sourceRegisterMarkers",
      "register",
      "timeOfDayScope",
      "neutralRegisterClaim",
      "formalRegisterClaim",
      "unqualifiedFormalAddressClaim",
      "nounGender",
      "nounPlural",
      "verbValency",
      "verbFrame",
      "verbSeparability",
      "verbAuxiliary",
      "productionPolicy",
      "region",
      "evidenceIds",
    ],
    "guten_tag_positive_lexical_scope",
  );
  if (
    row.id !== "de_lex_l01_c04_guten_tag_v1" ||
    row.lemma !== "Guten Tag" ||
    row.senseGloss !== "polite formula used as a greeting" ||
    row.partOfSpeech !== "fixed_expression" ||
    row.sourceHeadword !== "guten Tag" ||
    row.sourcePartOfSpeech !== "Mehrwortausdruck" ||
    row.sourceSenseAnchor !== "d-1-1" ||
    row.sourceSense !== "höfliche Formel zur Begrüßung" ||
    row.pragmaticFunction !== "interaction_opening" ||
    row.partOfSpeechInterpretation !==
      "SOURCE_GROUNDED_MULTIWORD_EXPRESSION_TO_FIXED_EXPRESSION" ||
    row.sourcePolitenessMarker !== "höfliche" ||
    row.sourceRegisterMarkers !== null ||
    row.register !== null ||
    row.neutralRegisterClaim !== false ||
    row.formalRegisterClaim !== false ||
    row.unqualifiedFormalAddressClaim !== false ||
    row.productionPolicy !== "NOT_AUTHORIZED_BY_THIS_ADMISSION"
  )
    fail("guten_tag_positive_lexical_scope");
  exact(
    row.timeOfDayScope,
    ["am Vormittag", "am Mittag", "am Nachmittag"],
    "guten_tag_positive_time_scope",
  );
  exact(
    row.excludedSourceSenseSegments,
    ["gelegentlich auch zum Abschied", "d-1-2"],
    "guten_tag_positive_source_scope",
  );
  exact(value, canonical, "guten_tag_positive_lexical_scope");
  return value as JsonRecord[];
}

function validateTask6V7(
  value: JsonRecord,
  canonical: JsonRecord,
  task6V6: JsonRecord,
  lexicalV7: JsonRecord[],
): void {
  exact(
    value.authority,
    {
      status: "TASK6_V7_CANONICAL_PARTIAL",
      upstreamCandidateCanonicalAdmission:
        "ADMITTED_EXACT_HALLO_TSCHUESS_ICH_HEISSE_BRIEFKASTEN_AND_GUTEN_TAG_SENSES_ONLY",
      phaseBMaterialization: "ADMITTED_FOR_TASK6_V7_REGISTRY_ONLY",
      rowsMaterialized: 11,
      newRowsMaterialized: 9,
      legacyRowsPreserved: 2,
      rowsPromoted: 5,
      task7Status: "TASK7_HOLD_GLOBAL_ALLOCATION_INCOMPLETE",
      task7Unlock: false,
      preauthoringAuthority: false,
      learnerFacing: false,
      phraseClaims: "HALLO_EXACT_ONLY",
      releaseAuthorized: false,
      currentlyMaterializable: false,
      materializedPackets: 0,
      consumerCutover: "NONE",
      defaultConsumerChanged: false,
      ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
    },
    "guten_tag_positive_authority_boundary",
  );
  if (value.schemaVersion !== "learning-v2-german-task6-canonical-registry.v7")
    fail("guten_tag_positive_task6");
  exact(value.registry.lexicalSenses, lexicalV7, "guten_tag_positive_task6");
  exact(
    value.registry.phraseFrames,
    task6V6.registry.phraseFrames,
    "guten_tag_positive_phrase_forbidden",
  );
  for (const key of ["pronunciationTargets"])
    exact(
      value.registry[key],
      task6V6.registry[key],
      "guten_tag_positive_predecessor_drift",
    );
  if (value.authority.phraseClaims !== task6V6.authority.phraseClaims)
    fail("guten_tag_positive_phrase_forbidden");
  const mappings = value.authorityContext.lexicalMappings as JsonRecord[];
  exact(
    mappings.slice(0, -1),
    task6V6.authorityContext.lexicalMappings,
    "guten_tag_positive_predecessor_drift",
  );
  exact(
    mappings.at(-1),
    {
      sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
      canonicalId: "de_lex_l01_c04_guten_tag_v1",
      plannedUsePacketIds: ["de_l01_c04_s32"],
      checkpointPacketId: "de_l01_c04_s32",
      firstIntroductionPacketId: null,
      firstScoredUsePacketId: null,
    },
    "guten_tag_positive_plan_mapping",
  );
  const {
    schemaVersion: _v7Schema,
    lexicalMappings: _v7Mappings,
    ...v7Rest
  } = value.authorityContext;
  const {
    schemaVersion: _v6Schema,
    lexicalMappings: _v6Mappings,
    ...v6Rest
  } = task6V6.authorityContext;
  exact(v7Rest, v6Rest, "guten_tag_positive_phrase_forbidden");
  exact(value, canonical, "guten_tag_positive_task6");
}

function validateInventoryV7(
  value: JsonRecord,
  canonical: JsonRecord,
  inventoryV6: JsonRecord,
): void {
  exact(
    value.authority,
    inventoryV6.authority,
    "guten_tag_positive_authority_boundary",
  );
  exact(
    value.counts,
    {
      task5PlanIds: 288,
      resolvedPlanIds: 11,
      unresolvedPlanIds: 277,
      packetIds: 1792,
      materializedPackets: 0,
    },
    "guten_tag_positive_inventory",
  );
  if (
    value.sequence.currentlyMaterializable !== false ||
    value.sequence.nextEligibleSessionId !== "de_l01_s01" ||
    !value.sequence.eligibilityKind.includes("REMAINING_277_ALLOCATIONS")
  )
    fail("guten_tag_positive_authority_boundary");
  exact(
    value.resolutions.slice(0, -1),
    inventoryV6.resolutions,
    "guten_tag_positive_predecessor_drift",
  );
  exact(
    value.resolutions.at(-1),
    {
      sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
      checkpointPacketId: "de_l01_c04_s32",
      canonicalSenseId: "de_lex_l01_c04_guten_tag_v1",
      firstIntroductionPacketId: null,
      firstScoredUsePacketId: null,
    },
    "guten_tag_positive_inventory",
  );
  exact(value, canonical, "guten_tag_positive_inventory");
}

function validateManifest(value: JsonRecord, canonical: JsonRecord): void {
  if (
    value.schemaVersion !==
      "learning-v2-de-task6c-l01-guten-tag-positive-admission-manifest.v1" ||
    value.status !== "PASS" ||
    value.decision !== "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION" ||
    value.reviewStatus !== "PENDING_INDEPENDENT_REVIEW"
  )
    fail("guten_tag_positive_manifest");
  exact(
    value.scope,
    {
      admissionScope: "DWDS_D_1_1_GREETING_HALF_LEXICAL_ONLY",
      sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
      canonicalSenseId: "de_lex_l01_c04_guten_tag_v1",
      checkpointPacketId: "de_l01_c04_s32",
      plannedUsePacketIds: ["de_l01_c04_s32"],
      firstIntroductionPacketId: null,
      firstScoredUsePacketId: null,
    },
    "guten_tag_positive_manifest",
  );
  if (
    value.phraseBoundary?.phraseAdmission !== false ||
    value.phraseBoundary?.phraseAuthority !== false ||
    value.phraseBoundary?.phraseFrameModified !== false ||
    value.phraseBoundary?.phraseMappingModified !== false ||
    value.phraseBoundary?.addresseeCompositionClaim !== false ||
    value.phraseBoundary?.phraseClaims !== "HALLO_EXACT_ONLY"
  )
    fail("guten_tag_positive_phrase_forbidden");
  exact(
    value.authority,
    CLOSED_AUTHORITY,
    "guten_tag_positive_authority_boundary",
  );
  const requiredBindings = {
    dwdsRaw: HASHES[PATHS.raw],
    dwdsMetadata: HASHES[PATHS.metadata],
    extractionMap: HASHES[PATHS.extraction],
    lexicalEvidence: HASHES[PATHS.evidence],
    oldGutenTagHoldModule: HASHES[PATHS.oldHoldModule],
    oldGutenTagHoldManifest: HASHES[PATHS.oldHoldManifest],
    oldGutenTagHoldExtractionMap: HASHES[PATHS.oldHoldMap],
    goethePdf: HASHES[PATHS.goethePdf],
    goetheMetadata: HASHES[PATHS.goetheMetadata],
    formulaicManifest: HASHES[PATHS.formulaicManifest],
    formulaicExtractionMap: HASHES[PATHS.formulaicMap],
    formulaicClosure: HASHES[PATHS.formulaicClosure],
  };
  for (const [name, hash] of Object.entries(requiredBindings))
    if (value.sourceBindings?.[name]?.sha256 !== hash)
      fail("guten_tag_positive_manifest");
  const predecessorHashes = {
    task5V3: HASHES[PATHS.task5],
    lexicalV2: HASHES[PATHS.lexicalV2],
    task6V2: HASHES[PATHS.task6V2],
    inventoryV2: HASHES[PATHS.inventoryV2],
    lexicalV3: HASHES[PATHS.lexicalV3],
    task6V3: HASHES[PATHS.task6V3],
    inventoryV3: HASHES[PATHS.inventoryV3],
    lexicalV4: HASHES[PATHS.lexicalV4],
    task6V4: HASHES[PATHS.task6V4],
    inventoryV4: HASHES[PATHS.inventoryV4],
    lexicalV5: HASHES[PATHS.lexicalV5],
    task6V5: HASHES[PATHS.task6V5],
    inventoryV5: HASHES[PATHS.inventoryV5],
    lexicalV6: HASHES[PATHS.lexicalV6],
    task6V6: HASHES[PATHS.task6V6],
    inventoryV6: HASHES[PATHS.inventoryV6],
    v6Closure: HASHES[PATHS.v6Closure],
    defaultConsumer: HASHES[PATHS.defaultConsumer],
    englishManifest: HASHES[PATHS.englishManifest],
  };
  for (const [name, hash] of Object.entries(predecessorHashes))
    if (value.predecessorBindings?.[name]?.sha256 !== hash)
      fail("guten_tag_positive_manifest");
  for (const [name, hash] of Object.entries({
    lexicalV7: HASHES[PATHS.lexicalV7],
    task6V7: HASHES[PATHS.task6V7],
    inventoryV7: HASHES[PATHS.inventoryV7],
  }))
    if (value.artifactBindings?.[name]?.sha256 !== hash)
      fail("guten_tag_positive_manifest");
  exact(value, canonical, "guten_tag_positive_manifest");
}

function validateReceipt(receipt: string, canonical: string): void {
  if (
    !receipt.includes("Status: `PENDING_INDEPENDENT_REVIEW`") ||
    receipt.includes("Status: `PASS`") ||
    !receipt.includes("Phrase authority: `false`.") ||
    !receipt.includes("Resolved plan IDs: `11`.") ||
    !receipt.includes("Unresolved plan IDs: `277`.") ||
    !receipt.includes("Task7 unlock: `false`.") ||
    !receipt.includes("Consumer cutover: `NONE`.") ||
    !receipt.includes(
      "Deterministic gate result: `PASS_EXIT_0_WRITER_VERIFICATION_ONLY`.",
    ) ||
    !receipt.includes(
      "Focused TypeScript result: `PASS_EXIT_0_DIAGNOSTICS_0`.",
    ) ||
    !receipt.includes(
      "Reviewed repository TypeScript result: `EXIT_1_DIAGNOSTICS_17_TRANSACTION_DIAGNOSTICS_0`.",
    ) ||
    !receipt.includes(
      "Fresh repair repository TypeScript result: `EXIT_2_DIAGNOSTICS_17_TRANSACTION_DIAGNOSTICS_0`.",
    ) ||
    !receipt.includes(
      "Default-heap probe result: `EXIT_134_OOM_DIAGNOSTICS_0_NOT_COMPILER_GREEN`.",
    )
  )
    fail("guten_tag_positive_receipt_boundary");

  const machineMatches = [
    ...receipt.matchAll(
      /<!-- guten-tag-positive-typescript-evidence-v1\s*([\s\S]*?)\s*guten-tag-positive-typescript-evidence-v1 -->/gu,
    ),
  ];
  if (machineMatches.length !== 1)
    fail("guten_tag_positive_receipt_typescript");
  const machine = parseJson(
    Buffer.from(machineMatches[0][1], "utf8"),
    "guten_tag_positive_receipt_typescript",
  ) as JsonRecord;
  record(machine, "guten_tag_positive_receipt_typescript");
  exactKeys(
    machine,
    [
      "schemaVersion",
      "status",
      "repositoryGreen",
      "focusedRun",
      "repositoryReviewedRun",
      "repositoryFreshRepairRun",
      "defaultHeapProbe",
      "transactionPaths",
    ],
    "guten_tag_positive_receipt_typescript",
  );
  if (
    machine.schemaVersion !== "guten_tag_positive_typescript_evidence_v1" ||
    machine.status !== "PENDING_INDEPENDENT_REVIEW"
  )
    fail("guten_tag_positive_receipt_typescript");
  if (machine.repositoryGreen !== false)
    fail("guten_tag_positive_receipt_typescript_repository_green");

  const focused = machine.focusedRun as JsonRecord;
  record(focused, "guten_tag_positive_receipt_typescript_focused");
  exactKeys(
    focused,
    ["command", "exitCode", "diagnostics", "logPath", "logSha256", "logBytes"],
    "guten_tag_positive_receipt_typescript_focused",
  );
  if (
    focused.command !==
    "node node_modules/typescript/bin/tsc --noEmit --pretty false --skipLibCheck --esModuleInterop --module commonjs --target es2022 --moduleResolution node modules/learning-v2/curriculum/de/task6c_l01_guten_tag_positive_admission_de_v1.ts tests/learning_v2_de_task6c_l01_guten_tag_positive_admission_gate.ts"
  )
    fail("guten_tag_positive_receipt_typescript_focused_command");
  if (focused.exitCode !== 0 || focused.diagnostics !== 0)
    fail("guten_tag_positive_receipt_typescript_focused_result");
  if (
    focused.logPath !==
      "C:\\Temp\\phraseman_guten_tag_v7_focused_tsc_repair_20261013.log" ||
    focused.logSha256 !==
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" ||
    focused.logBytes !== 0
  )
    fail("guten_tag_positive_receipt_typescript_focused_log");

  const validateRepositoryRun = (
    run: unknown,
    expectedExitCode: number,
    expectedLogPath: string,
    code: string,
  ): void => {
    record(run, code);
    if (!Object.hasOwn(run, "command")) fail(`${code}_command`);
    if (!Object.hasOwn(run, "nodeOptions") || !Object.hasOwn(run, "heapMb"))
      fail(`${code}_heap`);
    if (!Object.hasOwn(run, "repositoryGreen"))
      fail(`${code}_repository_green`);
    exactKeys(
      run,
      [
        "command",
        "nodeOptions",
        "heapMb",
        "exitCode",
        "diagnostics",
        "transactionDiagnostics",
        "repositoryGreen",
        "logPath",
        "logSha256",
        "logBytes",
      ],
      code,
    );
    if (run.command !== "npx tsc --noEmit --pretty false")
      fail(`${code}_command`);
    if (run.nodeOptions !== "--max-old-space-size=8192" || run.heapMb !== 8192)
      fail(`${code}_heap`);
    if (run.repositoryGreen !== false) fail(`${code}_repository_green`);
    if (
      run.exitCode !== expectedExitCode ||
      run.diagnostics !== 17 ||
      run.transactionDiagnostics !== 0
    )
      fail(`${code}_result`);
    if (
      run.logPath !== expectedLogPath ||
      run.logSha256 !==
        "81a77f0cc7a6f85f7806098c14cc1ebd833f0ce1f11ca0f93b0324327854faf6" ||
      run.logBytes !== 4680
    )
      fail(`${code}_log`);
  };
  validateRepositoryRun(
    machine.repositoryReviewedRun,
    1,
    "C:\\Temp\\phraseman_guten_tag_v7_tsc_20261013.log",
    "guten_tag_positive_receipt_typescript_repository_reviewed",
  );
  validateRepositoryRun(
    machine.repositoryFreshRepairRun,
    2,
    "C:\\Temp\\phraseman_guten_tag_v7_repository_repair_20261013.log",
    "guten_tag_positive_receipt_typescript_repository_fresh",
  );

  const oom = machine.defaultHeapProbe as JsonRecord;
  record(oom, "guten_tag_positive_receipt_typescript_oom");
  if (!Object.hasOwn(oom, "command"))
    fail("guten_tag_positive_receipt_typescript_oom_command");
  if (!Object.hasOwn(oom, "nodeOptions") || !Object.hasOwn(oom, "heapMb"))
    fail("guten_tag_positive_receipt_typescript_oom_heap");
  exactKeys(
    oom,
    [
      "command",
      "nodeOptions",
      "heapMb",
      "exitCode",
      "diagnostics",
      "outcome",
      "repositoryGreen",
      "logPath",
      "logSha256",
      "logBytes",
    ],
    "guten_tag_positive_receipt_typescript_oom",
  );
  if (
    oom.command !== "$env:NODE_OPTIONS=$null; npx tsc --noEmit --pretty false"
  )
    fail("guten_tag_positive_receipt_typescript_oom_command");
  if (oom.nodeOptions !== null || oom.heapMb !== null)
    fail("guten_tag_positive_receipt_typescript_oom_heap");
  if (
    oom.exitCode !== 134 ||
    oom.diagnostics !== 0 ||
    oom.outcome !== "OOM" ||
    oom.repositoryGreen !== false
  )
    fail("guten_tag_positive_receipt_typescript_oom_result");
  if (
    oom.logPath !==
      "C:\\Temp\\phraseman_guten_tag_v7_default_heap_probe_20261013.log" ||
    oom.logSha256 !==
      "42e99e88091a8bc7b59f8a923875b46357c22b19ef763ec6c0b76b50ed38143a" ||
    oom.logBytes !== 1368
  )
    fail("guten_tag_positive_receipt_typescript_oom_log");

  exact(
    machine.transactionPaths,
    [
      "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_positive_admission_de_v1.ts",
      "tests/learning_v2_de_task6c_l01_guten_tag_positive_admission_gate.ts",
      PATHS.raw,
      PATHS.metadata,
      PATHS.extraction,
      PATHS.evidence,
      PATHS.manifest,
      PATHS.lexicalV7,
      PATHS.task6V7,
      PATHS.inventoryV7,
      PATHS.receipt,
    ],
    "guten_tag_positive_receipt_typescript_transaction_paths",
  );
  if (receipt !== canonical) fail("guten_tag_positive_receipt_boundary");
}

export function inspectGermanTask6cL01GutenTagPositiveAdmissionDeV1(
  options: GermanTask6cL01GutenTagPositiveAdmissionOptionsDeV1 = {},
): GermanTask6cL01GutenTagPositiveAdmissionResultDeV1 {
  for (const key of Object.keys(options))
    if (!OPTION_KEYS.has(key)) fail("guten_tag_positive_options");

  for (const relative of [
    PATHS.lexicalV2,
    PATHS.task6V2,
    PATHS.inventoryV2,
    PATHS.lexicalV3,
    PATHS.task6V3,
    PATHS.inventoryV3,
    PATHS.lexicalV4,
    PATHS.task6V4,
    PATHS.inventoryV4,
    PATHS.lexicalV5,
    PATHS.task6V5,
    PATHS.inventoryV5,
    PATHS.v6Closure,
    PATHS.oldHoldModule,
    PATHS.oldHoldManifest,
    PATHS.oldHoldMap,
    PATHS.goethePdf,
    PATHS.goetheMetadata,
    PATHS.formulaicManifest,
    PATHS.formulaicMap,
    PATHS.formulaicClosure,
    PATHS.defaultConsumer,
    PATHS.englishManifest,
  ] as const)
    pinned(relative);

  const task5 = canonicalJson(PATHS.task5) as JsonRecord;
  validateTask5(task5);
  validateRaw(read(PATHS.raw, options.rawPathForTest));

  const metadataCanonical = canonicalJson(PATHS.metadata) as JsonRecord;
  validateMetadata(
    candidateJson(
      PATHS.metadata,
      options.metadataPathForTest,
      "guten_tag_positive_metadata_json",
    ),
    metadataCanonical,
  );
  const extractionCanonical = canonicalJson(PATHS.extraction) as JsonRecord;
  validateExtraction(
    candidateJson(
      PATHS.extraction,
      options.extractionPathForTest,
      "guten_tag_positive_extraction_json",
    ),
    extractionCanonical,
  );
  const evidenceCanonical = canonicalJson(PATHS.evidence) as JsonRecord;
  validateEvidence(
    candidateJson(
      PATHS.evidence,
      options.evidencePathForTest,
      "guten_tag_positive_evidence_json",
    ),
    evidenceCanonical,
  );

  const lexicalV6 = canonicalJson(PATHS.lexicalV6);
  const task6V6 = canonicalJson(PATHS.task6V6) as JsonRecord;
  const inventoryV6 = canonicalJson(PATHS.inventoryV6) as JsonRecord;
  const lexicalV7Canonical = canonicalJson(PATHS.lexicalV7);
  const lexicalV7 = validateLexicalV7(
    candidateJson(
      PATHS.lexicalV7,
      options.lexicalV7PathForTest,
      "guten_tag_positive_lexical_json",
    ),
    lexicalV7Canonical,
    lexicalV6,
  );
  const task6V7Canonical = canonicalJson(PATHS.task6V7) as JsonRecord;
  validateTask6V7(
    candidateJson(
      PATHS.task6V7,
      options.task6V7PathForTest,
      "guten_tag_positive_task6_json",
    ),
    task6V7Canonical,
    task6V6,
    lexicalV7,
  );
  const inventoryV7Canonical = canonicalJson(PATHS.inventoryV7) as JsonRecord;
  validateInventoryV7(
    candidateJson(
      PATHS.inventoryV7,
      options.inventoryV7PathForTest,
      "guten_tag_positive_inventory_json",
    ),
    inventoryV7Canonical,
    inventoryV6,
  );
  const manifestCanonical = canonicalJson(PATHS.manifest) as JsonRecord;
  validateManifest(
    candidateJson(
      PATHS.manifest,
      options.manifestPathForTest,
      "guten_tag_positive_manifest_json",
    ),
    manifestCanonical,
  );
  const canonicalReceipt = pinned(PATHS.receipt).toString("utf8");
  validateReceipt(
    read(PATHS.receipt, options.receiptPathForTest).toString("utf8"),
    canonicalReceipt,
  );

  return {
    status: "PASS",
    decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION",
    admissionScope: "DWDS_D_1_1_GREETING_HALF_LEXICAL_ONLY",
    sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
    canonicalSenseId: "de_lex_l01_c04_guten_tag_v1",
    checkpointPacketId: "de_l01_c04_s32",
    firstIntroductionPacketId: null,
    phraseAuthority: false,
    resolvedPlanIds: 11,
    unresolvedPlanIds: 277,
    packetIds: 1792,
    materializedPackets: 0,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    consumerCutover: "NONE",
  };
}
