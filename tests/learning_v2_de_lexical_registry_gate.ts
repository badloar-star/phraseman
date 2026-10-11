import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import * as blueprintModule from "../modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1";
import * as itemEvidenceModule from "../modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1";
import * as kernelModule from "../modules/learning-v2/curriculum/de/task6_registry_contract_de_v1";

type JsonRecord = Record<string, unknown>;

const readJson = (path: string): unknown =>
  JSON.parse(fs.readFileSync(path, "utf8")) as unknown;

const AUTHORITY_SOURCES = {
  grammarConstructs: readJson(
    "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json",
  ),
  lessonBlueprints: readJson(
    "modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json",
  ),
  chapterBlueprints: readJson(
    "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
  ),
};

const parseLexical = blueprintModule.parseGermanLexicalSenseRegistryDeV1 as (
  input: unknown,
  lexicalItemEvidence?: unknown,
) => readonly JsonRecord[];
const parsePhrase = blueprintModule.parseGermanPhraseFrameRegistryDeV1 as (
  input: unknown,
) => readonly JsonRecord[];
const parseFullBlueprint = blueprintModule.parseGermanCourseBlueprintDeV1 as (
  input: unknown,
  lexicalItemEvidence?: unknown,
) => JsonRecord;
const canonicalFullBlueprintJson =
  blueprintModule.canonicalGermanCourseBlueprintJsonDeV1 as (
    input: unknown,
    lexicalItemEvidence?: unknown,
  ) => string;
const parseItemEvidence =
  itemEvidenceModule.parseGermanLexicalItemEvidenceRegistryDeV1 as (
    input: unknown,
  ) => readonly JsonRecord[];
const parseContext =
  kernelModule.parseGermanTask6RegistryAuthorityContextDeV1 as (
    input: unknown,
  ) => unknown;
const parseKernel = kernelModule.parseGermanTask6RegistryContractDeV1 as (
  input: unknown,
  context: unknown,
  lexicalItemEvidence?: unknown,
) => JsonRecord;

const NACHBARIN_ITEM_EVIDENCE_ID =
  "DE-LEX-ITEM-L01-C01-NACHBARIN-SENSE-FORM-001";
const AUFZUG_ITEM_EVIDENCE_ID = "DE-LEX-ITEM-L01-C02-AUFZUG-SENSE-FORM-001";

function canonicalNachbarin(): JsonRecord {
  return {
    id: "de_lex_l01_c01_nachbarin_v1",
    lemma: "Nachbarin",
    senseGloss: "female person living nearby",
    partOfSpeech: "noun",
    nounGender: "die",
    nounPlural: "Nachbarinnen",
    verbValency: null,
    verbFrame: null,
    verbSeparability: null,
    verbAuxiliary: null,
    productionPolicy: "productive",
    region: null,
    evidenceIds: [NACHBARIN_ITEM_EVIDENCE_ID, "DE-REG-BASELINE-001"],
  };
}

function canonicalAufzug(): JsonRecord {
  return {
    id: "de_lex_l01_c02_aufzug_v1",
    lemma: "Aufzug",
    senseGloss: "lift in a building",
    partOfSpeech: "noun",
    nounGender: "der",
    nounPlural: "Aufz\u00fcge",
    verbValency: null,
    verbFrame: null,
    verbSeparability: null,
    verbAuxiliary: null,
    productionPolicy: "productive",
    region: null,
    evidenceIds: [AUFZUG_ITEM_EVIDENCE_ID, "DE-REG-BASELINE-001"],
  };
}

function unrelatedHouseWithNachbarinEvidence(): JsonRecord {
  return {
    id: "de_lex_unrelated_haus_v1",
    lemma: "Haus",
    senseGloss: "building used as a home",
    partOfSpeech: "noun",
    nounGender: "das",
    nounPlural: "H\u00e4user",
    verbValency: null,
    verbFrame: null,
    verbSeparability: null,
    verbAuxiliary: null,
    productionPolicy: "productive",
    region: null,
    evidenceIds: [NACHBARIN_ITEM_EVIDENCE_ID, "DE-REG-BASELINE-001"],
  };
}

function nachbarinItemEvidence(): JsonRecord {
  return {
    id: NACHBARIN_ITEM_EVIDENCE_ID,
    canonicalLexicalSenseId: "de_lex_l01_c01_nachbarin_v1",
    sourcePlanId: "de_lex_plan_l01_c01_nachbarin_v1",
    evidenceStatus: "DIRECT_LEXICOGRAPHIC_SOURCE",
    authority: "DWDS / Berlin-Brandenburg Academy of Sciences and Humanities",
    sourceUrl: "https://www.dwds.de/wb/Nachbarin#d-1-1",
    verifiedOn: "2026-10-08",
    transport: {
      cachePath:
        ".tmp/de-task6a-exact-transport/.cache/47db1ae871efbfe6dfe9aa8874eed57219c125b38d9153d0a99a577d7fbafb02.json",
      cacheAccessedOn: "2026-10-07",
      cacheSha256:
        "ed554682fa1947a20f780615a6768da1d4c95703d4fac1d9ad1bdba4ad4644f5",
      responseSha256:
        "550baada63bde85a8cecd4faf23048b0e96df8af528577a78265dc9acfeec895",
      responseBytes: 69935,
    },
    sourceClaims: {
      definitionGerman:
        "weibliche Person, die in unmittelbarer N\u00e4he wohnt",
      normalizedDefinitionLength: 49,
      normalizedDefinitionSha256:
        "1fe61df7ff89d0230f07258661b1d9f88dd6ba51b7de9f147c230b543676b004",
      lemma: "Nachbarin",
      partOfSpeechLabel: "Substantiv",
      nounGenderLabel: "Femininum",
      nounArticle: "die",
      nounPlural: "Nachbarinnen",
    },
    curriculumClaims: {
      semanticIdentity: "nachbarin|female person living nearby",
      lemma: "Nachbarin",
      senseGloss: "female person living nearby",
      partOfSpeech: "noun",
      nounGender: "die",
      nounPlural: "Nachbarinnen",
    },
    derivation: {
      semanticIdentity: "TASK5_EXACT_MATCH",
      partOfSpeechInterpretation: "DWDS_SUBSTANTIV_TO_NOUN",
    },
    limitation: "NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY",
  };
}

function aufzugItemEvidence(): JsonRecord {
  return {
    id: AUFZUG_ITEM_EVIDENCE_ID,
    canonicalLexicalSenseId: "de_lex_l01_c02_aufzug_v1",
    sourcePlanId: "de_lex_plan_l01_c02_aufzug_v1",
    evidenceStatus: "DIRECT_LEXICOGRAPHIC_SOURCE",
    authority: "DWDS / Berlin-Brandenburg Academy of Sciences and Humanities",
    sourceUrl: "https://www.dwds.de/wb/Aufzug#d-1-2",
    verifiedOn: "2026-10-08",
    transport: {
      cachePath:
        ".tmp/de-task6a-exact-transport/.cache/4c87bd53f5a1910c90722fdb781dd1a1fbf77671675ea53c710dd80d61abb009.json",
      cacheAccessedOn: "2026-10-07",
      cacheSha256:
        "dbf2dd7a50af696489f3b3ff5d0edd9c79e7c195082eec2060cf874ec4e7c677",
      responseSha256:
        "9cbff3df3c2ce1fdfcc95ec2cd663d1428b8a48975e42d7c1c38ee41708d0f7c",
      responseBytes: 106091,
    },
    sourceClaims: {
      definitionGerman: "Vorrichtung zum Hochziehen, Lift",
      normalizedDefinitionLength: 32,
      normalizedDefinitionSha256:
        "3e0cc6e2cb389852ad79b4683db5d9f46193707a273a30a33161d449d10add46",
      lemma: "Aufzug",
      partOfSpeechLabel: "Substantiv",
      nounGenderLabel: "Maskulinum",
      nounArticle: "der",
      nounPlural: "Aufz\u00fcge",
    },
    curriculumClaims: {
      semanticIdentity: "aufzug|lift in a building",
      lemma: "Aufzug",
      senseGloss: "lift in a building",
      partOfSpeech: "noun",
      nounGender: "der",
      nounPlural: "Aufz\u00fcge",
    },
    derivation: {
      semanticIdentity: "TASK5_EXACT_MATCH",
      partOfSpeechInterpretation: "DWDS_SUBSTANTIV_TO_NOUN",
    },
    limitation: "NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY",
  };
}

function canonicalAuthorityContext(): JsonRecord {
  const context = authorityContext();
  context.lexicalMappings = [
    {
      sourcePlanId: "de_lex_plan_l01_c01_nachbarin_v1",
      canonicalId: "de_lex_l01_c01_nachbarin_v1",
      plannedWordFirstPacketId: "de_l01_c01_s07",
      plannedFirstScoredUsePacketId: "de_l01_c01_s08",
    },
    {
      sourcePlanId: "de_lex_plan_l01_c02_aufzug_v1",
      canonicalId: "de_lex_l01_c02_aufzug_v1",
      plannedWordFirstPacketId: "de_l01_c02_s15",
      plannedFirstScoredUsePacketId: "de_l01_c02_s16",
    },
  ];
  context.phraseFrameMappings = [];
  context.communicativeOutcomeMappings = [];
  return context;
}

function canonicalRegistryInput(): JsonRecord {
  return {
    lexicalSenses: [canonicalNachbarin(), canonicalAufzug()],
    phraseFrames: [],
    pronunciationTargets: [],
  };
}

function expectItemEvidenceFailure(
  mutate: (evidence: JsonRecord) => void,
  expected: RegExp,
): void {
  const evidence = nachbarinItemEvidence();
  mutate(evidence);
  assert.throws(() => parseItemEvidence([evidence]), expected);
}

function expectAufzugEvidenceFailure(
  mutate: (evidence: JsonRecord) => void,
  expected: RegExp,
): void {
  const evidence = aufzugItemEvidence();
  mutate(evidence);
  assert.throws(
    () => parseItemEvidence([nachbarinItemEvidence(), evidence]),
    expected,
  );
}

function validateCanonical(
  input: JsonRecord = canonicalRegistryInput(),
  evidence: unknown = [nachbarinItemEvidence(), aufzugItemEvidence()],
): JsonRecord {
  return parseKernel(
    input,
    parseContext(canonicalAuthorityContext()),
    evidence,
  );
}

function noun(): JsonRecord {
  return {
    id: "de_lex_nachbarin_v1",
    lemma: "Nachbarin",
    senseGloss: "female person living nearby",
    partOfSpeech: "noun",
    nounGender: "die",
    nounPlural: "Nachbarinnen",
    verbValency: null,
    verbFrame: null,
    verbSeparability: null,
    verbAuxiliary: null,
    productionPolicy: "productive",
    region: null,
    evidenceIds: ["DE-LEX-FREQ-001"],
  };
}

function verb(): JsonRecord {
  return {
    id: "de_lex_ankommen_v1",
    lemma: "ankommen",
    senseGloss: "arrive at one stated destination in a verified sein class",
    partOfSpeech: "verb",
    nounGender: null,
    nounPlural: null,
    verbValency: ["subject", "destination-location complement"],
    verbFrame:
      "intransitive arrival frame with one explicit destination-location complement",
    verbSeparability: "SEPARABLE",
    verbAuxiliary: "sein",
    productionPolicy: "productive",
    region: null,
    evidenceIds: ["DE-LEX-FREQ-001"],
  };
}

function unsupportedVerb(): JsonRecord {
  return {
    id: "de_lex_wohnen_v1",
    lemma: "wohnen",
    senseGloss: "live or reside at a home",
    partOfSpeech: "verb",
    nounGender: null,
    nounPlural: null,
    verbValency: ["subject"],
    verbFrame: "intransitive residence frame",
    verbSeparability: "INSEPARABLE",
    verbAuxiliary: "haben",
    productionPolicy: "productive",
    region: null,
    evidenceIds: ["DE-LEX-FREQ-001"],
  };
}

function phraseFrame(): JsonRecord {
  return {
    id: "de_pf_neighbor_v1",
    frame: "Hallo, Nachbarin!",
    grammarConstructIds: ["de_gc_pre_a1_formulaic_chunks_v1"],
    lexicalSenseIds: ["de_lex_nachbarin_v1"],
    communicativeOutcomeIds: ["de_out_l01_ch01_v1"],
    forbiddenSurfaceFormIds: [],
    evidenceIds: ["DE-RSCH-CEFR-003"],
  };
}

function registryInput(): JsonRecord {
  return {
    lexicalSenses: [noun(), verb()],
    phraseFrames: [phraseFrame()],
    pronunciationTargets: [],
  };
}

function authorityContext(): JsonRecord {
  return {
    schemaVersion: "learning-v2-german-task6-registry-authority.v1",
    authoritySources: structuredClone(AUTHORITY_SOURCES),
    lexicalMappings: [
      {
        sourcePlanId: "de_lex_plan_l01_c01_nachbarin_v1",
        canonicalId: "de_lex_nachbarin_v1",
        plannedWordFirstPacketId: "de_l01_c01_s07",
        plannedFirstScoredUsePacketId: "de_l01_c01_s08",
      },
      {
        sourcePlanId: "de_lex_plan_l16_c01_ankommen_v1",
        canonicalId: "de_lex_ankommen_v1",
        plannedWordFirstPacketId: "de_l16_c01_s07",
        plannedFirstScoredUsePacketId: "de_l16_c01_s08",
      },
    ],
    phraseFrameMappings: [
      {
        sourceChapterId: "de_l01_c01",
        canonicalId: "de_pf_neighbor_v1",
        plannedFirstUsePacketId: "de_l01_c01_s08",
      },
    ],
    pronunciationMappings: [],
    communicativeOutcomeMappings: [
      {
        sourceOutcomeId: "de_l01_ch01",
        canonicalId: "de_out_l01_ch01_v1",
      },
    ],
    forbiddenSurfaceForms: [],
    pronunciationPresentationPolicies: [],
  };
}

function validate(
  input: JsonRecord = registryInput(),
  context: JsonRecord = authorityContext(),
): JsonRecord {
  return parseKernel(input, parseContext(context));
}

function expectFailure(
  mutateInput: (input: JsonRecord) => void,
  mutateContext: (context: JsonRecord) => void,
  expected: RegExp,
): void {
  const input = registryInput();
  const context = authorityContext();
  mutateInput(input);
  mutateContext(context);
  assert.throws(() => validate(input, context), expected);
}

function findSourceLexicalPlan(
  authoritySources: JsonRecord,
  sourcePlanId: string,
): JsonRecord {
  const chapterBlueprints = authoritySources.chapterBlueprints as JsonRecord;
  for (const lesson of chapterBlueprints.lessons as JsonRecord[]) {
    for (const chapter of lesson.chapters as JsonRecord[]) {
      const checkpoint = chapter.checkpoint as JsonRecord;
      for (const plan of checkpoint.plannedNewLexicalSenses as JsonRecord[]) {
        if (plan.id === sourcePlanId) return plan;
      }
    }
  }
  throw new Error(`missing source lexical plan: ${sourcePlanId}`);
}

const parsedLexical = parseLexical([noun(), verb()]);
assert.ok(Object.isFrozen(parsedLexical));
assert.ok(Object.isFrozen(parsedLexical[0]));
assert.throws(() => parseLexical([noun(), noun()]), /duplicate_id/u);

const valid = validate();
assert.equal(valid.status, "TASK6_CONTRACT_KERNEL_PARTIAL");
assert.equal(valid.rowsPromoted, 0);
assert.equal(valid.verifiedLexicalItemEvidenceRows, 0);
assert.equal(valid.packetMaterializationStatus, "UNVERIFIED_UNTIL_TASK7");
assert.equal(
  valid.sourceAuthorityStatus,
  "CONTENT_ADDRESSED_TASK3_TASK4_TASK5",
);

for (const missing of ["nounGender", "nounPlural"] as const) {
  const candidate = noun();
  candidate[missing] = null;
  assert.throws(() => parseLexical([candidate]), /noun_package_invalid/u);
}

for (const missing of [
  "verbValency",
  "verbFrame",
  "verbSeparability",
  "verbAuxiliary",
] as const) {
  const candidate = verb();
  candidate[missing] = null;
  assert.throws(() => parseLexical([candidate]), /verb_package_invalid/u);
}

expectFailure(
  (input) => {
    (input.lexicalSenses as JsonRecord[]).push(unsupportedVerb());
  },
  (context) => {
    (context.lexicalMappings as JsonRecord[]).push({
      sourcePlanId: "de_lex_plan_l02_c01_wohnen_v1",
      canonicalId: "de_lex_wohnen_v1",
      plannedWordFirstPacketId: "de_l02_c01_s07",
      plannedFirstScoredUsePacketId: "de_l02_c01_s08",
    });
  },
  /lexical_verb_valency_unadjudicated:de_lex_plan_l02_c01_wohnen_v1/u,
);

expectFailure(
  (input) => {
    (input.lexicalSenses as JsonRecord[])[1].verbValency = ["direct object"];
  },
  () => {},
  /lexical_verb_valency_mismatch:de_lex_ankommen_v1/u,
);

const callerOwnedContext = authorityContext();
callerOwnedContext.authoritySources = structuredClone(AUTHORITY_SOURCES);
const callerSources = callerOwnedContext.authoritySources as JsonRecord;
const callerVerbPackage = findSourceLexicalPlan(
  callerSources,
  "de_lex_plan_l16_c01_ankommen_v1",
).verbPackage as JsonRecord;
const parsedCallerContext = parseContext(callerOwnedContext) as JsonRecord;
const parsedVerbFact = (
  parsedCallerContext.lexicalPlanFacts as JsonRecord[]
).find((fact) => fact.sourcePlanId === "de_lex_plan_l16_c01_ankommen_v1")!;
assert.equal(Object.isFrozen(callerVerbPackage), false);
assert.notEqual(parsedVerbFact.verbPackage, callerVerbPackage);
assert.ok(Object.isFrozen(parsedCallerContext));
assert.ok(Object.isFrozen(parsedVerbFact.verbPackage));
callerVerbPackage.callerMutationProbe = "writable";
assert.equal(callerVerbPackage.callerMutationProbe, "writable");

const changingVersionContext = authorityContext();
let schemaVersionReads = 0;
Object.defineProperty(changingVersionContext, "schemaVersion", {
  enumerable: true,
  get: () => {
    schemaVersionReads += 1;
    return schemaVersionReads === 1
      ? "learning-v2-german-task6-registry-authority.v1"
      : "forged-after-validation";
  },
});
const parsedChangingVersionContext = parseContext(
  changingVersionContext,
) as JsonRecord;
assert.equal(
  parsedChangingVersionContext.schemaVersion,
  "learning-v2-german-task6-registry-authority.v1",
);
assert.equal(schemaVersionReads, 1);

expectFailure(
  (input) => {
    (input.lexicalSenses as JsonRecord[])[0].senseGloss =
      "a newly invented second meaning";
  },
  () => {},
  /lexical_plan_semantics_mismatch:de_lex_nachbarin_v1/u,
);

expectFailure(
  () => {},
  (context) => {
    (context.lexicalMappings as JsonRecord[])[0].sourcePlanId =
      "DE-LEX-ITEM-001";
  },
  /unknown_task5_lexical_plan:DE-LEX-ITEM-001/u,
);

expectFailure(
  () => {},
  (context) => {
    (context.lexicalMappings as JsonRecord[])[0].sourcePlanId =
      "de_lex_plan_l01_c01_fabricated_v1";
  },
  /unknown_task5_lexical_plan:de_lex_plan_l01_c01_fabricated_v1/u,
);

expectFailure(
  () => {},
  (context) => {
    (context.lexicalMappings as JsonRecord[])[0].ownerId =
      "de_gc_fabricated_v1";
  },
  /unknown_field:.*ownerId/u,
);

expectFailure(
  () => {},
  (context) => {
    context.lexicalMappings = (context.lexicalMappings as JsonRecord[]).slice(
      1,
    );
  },
  /canonical_item_without_task5_lexical_plan:de_lex_nachbarin_v1/u,
);

expectFailure(
  () => {},
  (context) => {
    (context.lexicalMappings as JsonRecord[]).push(
      structuredClone((context.lexicalMappings as JsonRecord[])[0]),
    );
  },
  /duplicate_task5_lexical_plan_mapping:de_lex_plan_l01_c01_nachbarin_v1/u,
);

expectFailure(
  () => {},
  (context) => {
    (context.lexicalMappings as JsonRecord[])[0].plannedWordFirstPacketId =
      "de_l01_c01_s08";
  },
  /word_first_chronology_invalid:de_lex_nachbarin_v1/u,
);

expectFailure(
  () => {},
  (context) => {
    (context.lexicalMappings as JsonRecord[])[0].plannedFirstScoredUsePacketId =
      "de_l01_c02_s09";
  },
  /planned_use_packet_not_declared_by_task5:de_lex_nachbarin_v1/u,
);

expectFailure(
  () => {},
  (context) => {
    const sources = context.authoritySources as JsonRecord;
    const grammar = structuredClone(sources.grammarConstructs) as JsonRecord[];
    grammar.push({ id: "de_gc_fabricated_v1" });
    sources.grammarConstructs = grammar;
  },
  /authority_source_hash_mismatch:grammarConstructs/u,
);

assert.throws(
  () => parseKernel(registryInput(), authorityContext()),
  /untrusted_authority_context/u,
);

const canonicalRegistry = readJson(
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json",
) as JsonRecord[];
assert.deepEqual(canonicalRegistry, [canonicalNachbarin(), canonicalAufzug()]);
assert.equal(
  hashCanonicalBody(canonicalNachbarin()),
  "6f8b491e59dd5a0ef344695f70dd054d7e379c8f4f61c413fa0b301af08902b9",
);
assert.equal(
  hashCanonicalBody(nachbarinItemEvidence()),
  "f591d203ee1b0b441425d972f750eba1dfaf9e50fbf8c8929ddf0dd8399c2c02",
);
const parsedNachbarinOnlyEvidence = parseItemEvidence([
  nachbarinItemEvidence(),
]);
assert.doesNotThrow(() =>
  parseLexical([canonicalNachbarin()], parsedNachbarinOnlyEvidence),
);
const parsedItemEvidence = parseItemEvidence([
  nachbarinItemEvidence(),
  aufzugItemEvidence(),
]);
assert.deepEqual(
  parsedItemEvidence,
  itemEvidenceModule.GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V1,
);
assert.ok(Object.isFrozen(parsedItemEvidence));
assert.ok(Object.isFrozen(parsedItemEvidence[0]));
assert.doesNotThrow(() => parseLexical(canonicalRegistry, parsedItemEvidence));
assert.throws(
  () => parseLexical(canonicalRegistry, [nachbarinItemEvidence()]),
  /untrusted_lexical_item_evidence_registry/u,
);
assert.throws(
  () => parseLexical(canonicalRegistry, parsedNachbarinOnlyEvidence),
  /undeclared_evidence_id:DE-LEX-ITEM-L01-C02-AUFZUG-SENSE-FORM-001/u,
);
for (const [row, wrongEvidenceId] of [
  [canonicalNachbarin(), AUFZUG_ITEM_EVIDENCE_ID],
  [canonicalAufzug(), NACHBARIN_ITEM_EVIDENCE_ID],
] as const) {
  const candidate = structuredClone(row);
  candidate.evidenceIds = [wrongEvidenceId, "DE-REG-BASELINE-001"];
  assert.throws(
    () => parseLexical([candidate], parsedItemEvidence),
    /lexical_item_evidence_scope_mismatch/u,
  );
}
assert.throws(
  () =>
    parseLexical(
      [canonicalNachbarin(), unrelatedHouseWithNachbarinEvidence()],
      parsedItemEvidence,
    ),
  /lexical_item_evidence_scope_mismatch/u,
);
for (const [field, replacement] of [
  ["lemma", "Nachbar"],
  ["senseGloss", "a different meaning under the same identifier"],
] as const) {
  const changedClaims = canonicalNachbarin();
  changedClaims[field] = replacement;
  assert.throws(
    () => parseLexical([changedClaims], parsedItemEvidence),
    /lexical_item_evidence_claim_mismatch/u,
  );
}
for (const [field, replacement] of [
  ["lemma", "Fahrstuhl"],
  ["senseGloss", "a ceremonial procession"],
] as const) {
  const changedClaims = canonicalAufzug();
  changedClaims[field] = replacement;
  assert.throws(
    () => parseLexical([changedClaims], parsedItemEvidence),
    /lexical_item_evidence_claim_mismatch/u,
  );
}
assert.throws(
  () =>
    parsePhrase([
      {
        ...phraseFrame(),
        evidenceIds: [NACHBARIN_ITEM_EVIDENCE_ID],
      },
    ]),
  /undeclared_evidence_id:DE-LEX-ITEM-L01-C01-NACHBARIN-SENSE-FORM-001/u,
);

const fullBlueprintWithCanonicalLexicalRow = structuredClone(
  blueprintModule.GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1,
) as unknown as JsonRecord;
fullBlueprintWithCanonicalLexicalRow.lexicalSenses = canonicalRegistry;
const parsedFullBlueprint = parseFullBlueprint(
  fullBlueprintWithCanonicalLexicalRow,
  parsedItemEvidence,
);
assert.deepEqual(parsedFullBlueprint.lexicalSenses, canonicalRegistry);
const fullBlueprintWithEvidenceReuse = structuredClone(
  blueprintModule.GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1,
) as unknown as JsonRecord;
fullBlueprintWithEvidenceReuse.lexicalSenses = [
  canonicalNachbarin(),
  unrelatedHouseWithNachbarinEvidence(),
];
assert.throws(
  () => parseFullBlueprint(fullBlueprintWithEvidenceReuse, parsedItemEvidence),
  /lexical_item_evidence_scope_mismatch/u,
);
const wrongScopeFullBlueprint = structuredClone(
  blueprintModule.GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1,
) as unknown as JsonRecord;
wrongScopeFullBlueprint.phraseFrames = [
  {
    ...phraseFrame(),
    evidenceIds: [NACHBARIN_ITEM_EVIDENCE_ID],
  },
];
assert.throws(
  () => parseFullBlueprint(wrongScopeFullBlueprint, parsedItemEvidence),
  /undeclared_evidence_id:DE-LEX-ITEM-L01-C01-NACHBARIN-SENSE-FORM-001/u,
);
const canonicalFullBlueprint = canonicalFullBlueprintJson(
  fullBlueprintWithCanonicalLexicalRow,
  parsedItemEvidence,
);
const decodedCanonicalFullBlueprint = JSON.parse(
  canonicalFullBlueprint,
) as JsonRecord;
assert.deepEqual(
  decodedCanonicalFullBlueprint.lexicalSenses,
  canonicalRegistry,
);
assert.deepEqual(
  (decodedCanonicalFullBlueprint.lexicalSenses as JsonRecord[])[0].evidenceIds,
  [NACHBARIN_ITEM_EVIDENCE_ID, "DE-REG-BASELINE-001"],
);
assert.deepEqual(
  (decodedCanonicalFullBlueprint.lexicalSenses as JsonRecord[])[1].evidenceIds,
  [AUFZUG_ITEM_EVIDENCE_ID, "DE-REG-BASELINE-001"],
);
assert.equal(
  canonicalFullBlueprintJson(decodedCanonicalFullBlueprint, parsedItemEvidence),
  canonicalFullBlueprint,
);
assert.ok(
  canonicalFullBlueprint.includes(
    `"evidenceIds":["${NACHBARIN_ITEM_EVIDENCE_ID}","DE-REG-BASELINE-001"]`,
  ),
);
assert.ok(
  canonicalFullBlueprint.includes(
    `"evidenceIds":["${AUFZUG_ITEM_EVIDENCE_ID}","DE-REG-BASELINE-001"]`,
  ),
);
const canonicalLegacyEmptyBlueprint = canonicalFullBlueprintJson(
  blueprintModule.GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1,
);
assert.deepEqual(
  JSON.parse(canonicalLegacyEmptyBlueprint),
  blueprintModule.GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1,
);
assert.throws(
  () => canonicalFullBlueprintJson(wrongScopeFullBlueprint, parsedItemEvidence),
  /undeclared_evidence_id:DE-LEX-ITEM-L01-C01-NACHBARIN-SENSE-FORM-001/u,
);
assert.throws(
  () =>
    canonicalFullBlueprintJson(fullBlueprintWithCanonicalLexicalRow, [
      nachbarinItemEvidence(),
    ]),
  /untrusted_lexical_item_evidence_registry/u,
);

const expectedTransports = [
  {
    cachePath:
      ".tmp/de-task6a-exact-transport/.cache/47db1ae871efbfe6dfe9aa8874eed57219c125b38d9153d0a99a577d7fbafb02.json",
    cacheAccessedOn: "2026-10-07",
    cacheSha256:
      "ed554682fa1947a20f780615a6768da1d4c95703d4fac1d9ad1bdba4ad4644f5",
    responseSha256:
      "550baada63bde85a8cecd4faf23048b0e96df8af528577a78265dc9acfeec895",
    responseBytes: 69935,
  },
  {
    cachePath:
      ".tmp/de-task6a-exact-transport/.cache/4c87bd53f5a1910c90722fdb781dd1a1fbf77671675ea53c710dd80d61abb009.json",
    cacheAccessedOn: "2026-10-07",
    cacheSha256:
      "dbf2dd7a50af696489f3b3ff5d0edd9c79e7c195082eec2060cf874ec4e7c677",
    responseSha256:
      "9cbff3df3c2ce1fdfcc95ec2cd663d1428b8a48975e42d7c1c38ee41708d0f7c",
    responseBytes: 106091,
  },
];
for (let index = 0; index < expectedTransports.length; index += 1) {
  assert.deepEqual(
    parsedItemEvidence[index].transport,
    expectedTransports[index],
  );
}

const coldTransportProbeSource = String.raw`
import fs from "node:fs";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const transportPaths = [
  ".tmp/de-task6a-exact-transport/.cache/47db1ae871efbfe6dfe9aa8874eed57219c125b38d9153d0a99a577d7fbafb02.json",
  ".tmp/de-task6a-exact-transport/.cache/4c87bd53f5a1910c90722fdb781dd1a1fbf77671675ea53c710dd80d61abb009.json",
];
const normalizedTransportPaths = new Set(
  transportPaths.map((candidate) => path.resolve(candidate).toLowerCase()),
);
const normalizePathLike = (candidate) => {
  if (typeof candidate === "number") return null;
  const value = candidate instanceof URL ? fileURLToPath(candidate) : String(candidate);
  return path.resolve(value).toLowerCase();
};
const originalReadFileSync = fs.readFileSync.bind(fs);
const originalStatSync = fs.statSync.bind(fs);
let ignoredTransportReadAttempts = 0;
const rejectIgnoredTransportRead = (candidate) => {
  const normalized = normalizePathLike(candidate);
  if (normalized !== null && normalizedTransportPaths.has(normalized)) {
    ignoredTransportReadAttempts += 1;
    throw new Error("ignored_transport_cache_read_forbidden:" + normalized);
  }
};
fs.readFileSync = (candidate, ...args) => {
  rejectIgnoredTransportRead(candidate);
  return originalReadFileSync(candidate, ...args);
};
fs.statSync = (candidate, ...args) => {
  rejectIgnoredTransportRead(candidate);
  return originalStatSync(candidate, ...args);
};
syncBuiltinESMExports();

for (const [method, candidate] of [
  ["readFileSync", transportPaths[0]],
  ["statSync", path.resolve(transportPaths[1])],
]) {
  try {
    fs[method](candidate);
    throw new Error("transport_trap_canary_did_not_throw:" + candidate);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("ignored_transport_cache_read_forbidden:")) {
      throw error;
    }
  }
}
if (ignoredTransportReadAttempts !== 2) {
  throw new Error("transport_trap_canary_count_invalid:" + ignoredTransportReadAttempts);
}
ignoredTransportReadAttempts = 0;

const loadTypeScriptModule = async (relativePath) => {
  const namespace = await import(pathToFileURL(path.resolve(relativePath)).href);
  return namespace.default ?? namespace["module.exports"] ?? namespace;
};
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(relativePath, "utf8"));
const evidenceModule = await loadTypeScriptModule(
  "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts",
);
const blueprintModule = await loadTypeScriptModule(
  "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
);
const kernelModule = await loadTypeScriptModule(
  "modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts",
);
const evidenceInput = JSON.parse(
  JSON.stringify(evidenceModule.GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V1),
);
const parsedEvidence = evidenceModule.parseGermanLexicalItemEvidenceRegistryDeV1(
  evidenceInput,
);
const lexicalRegistry = readJson(
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json",
);
const parsedLexical = blueprintModule.parseGermanLexicalSenseRegistryDeV1(
  lexicalRegistry,
  parsedEvidence,
);
if (parsedLexical.length !== 2) throw new Error("cold_lexical_count_invalid");
const fullBlueprint = JSON.parse(
  JSON.stringify(blueprintModule.GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1),
);
fullBlueprint.lexicalSenses = lexicalRegistry;
const parsedFullBlueprint = blueprintModule.parseGermanCourseBlueprintDeV1(
  fullBlueprint,
  parsedEvidence,
);
if (parsedFullBlueprint.lexicalSenses.length !== 2) {
  throw new Error("cold_full_blueprint_lexical_count_invalid");
}
const canonicalFullBlueprint = blueprintModule.canonicalGermanCourseBlueprintJsonDeV1(
  fullBlueprint,
  parsedEvidence,
);
if (JSON.parse(canonicalFullBlueprint).lexicalSenses.length !== 2) {
  throw new Error("cold_canonical_blueprint_lexical_count_invalid");
}
const authoritySources = {
  grammarConstructs: readJson(
    "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json",
  ),
  lessonBlueprints: readJson(
    "modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json",
  ),
  chapterBlueprints: readJson(
    "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
  ),
};
const authorityContext = kernelModule.parseGermanTask6RegistryAuthorityContextDeV1({
  schemaVersion: "learning-v2-german-task6-registry-authority.v1",
  authoritySources,
  lexicalMappings: [
    {
      sourcePlanId: "de_lex_plan_l01_c01_nachbarin_v1",
      canonicalId: "de_lex_l01_c01_nachbarin_v1",
      plannedWordFirstPacketId: "de_l01_c01_s07",
      plannedFirstScoredUsePacketId: "de_l01_c01_s08",
    },
    {
      sourcePlanId: "de_lex_plan_l01_c02_aufzug_v1",
      canonicalId: "de_lex_l01_c02_aufzug_v1",
      plannedWordFirstPacketId: "de_l01_c02_s15",
      plannedFirstScoredUsePacketId: "de_l01_c02_s16",
    },
  ],
  phraseFrameMappings: [],
  pronunciationMappings: [],
  communicativeOutcomeMappings: [],
  forbiddenSurfaceForms: [],
  pronunciationPresentationPolicies: [],
});
const kernelResult = kernelModule.parseGermanTask6RegistryContractDeV1(
  {
    lexicalSenses: lexicalRegistry,
    phraseFrames: [],
    pronunciationTargets: [],
  },
  authorityContext,
  evidenceInput,
);
if (kernelResult.verifiedLexicalItemEvidenceRows !== 2) {
  throw new Error("cold_kernel_verified_evidence_count_invalid");
}
if (ignoredTransportReadAttempts !== 0) {
  throw new Error("ignored_transport_cache_read_attempted:" + ignoredTransportReadAttempts);
}
process.stdout.write(
  "COLD_TRANSPORT_TRAP_PASS canaryAttempts=2 validationAttempts=0 verifiedRows=2\n",
);
`;
const coldTransportProbe = spawnSync(
  process.execPath,
  ["--import", "tsx", "--input-type=module", "-"],
  {
    cwd: process.cwd(),
    input: coldTransportProbeSource,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  },
);
assert.equal(
  coldTransportProbe.status,
  0,
  `cold transport probe failed\nstdout:\n${coldTransportProbe.stdout}\nstderr:\n${coldTransportProbe.stderr}`,
);
assert.match(
  coldTransportProbe.stdout,
  /COLD_TRANSPORT_TRAP_PASS canaryAttempts=2 validationAttempts=0 verifiedRows=2/u,
);
process.stdout.write(coldTransportProbe.stdout);
const sourceClaims = parsedItemEvidence[0].sourceClaims as JsonRecord;
assert.equal((sourceClaims.definitionGerman as string).length, 49);
assert.equal(
  createHash("sha256")
    .update(sourceClaims.definitionGerman as string, "utf8")
    .digest("hex"),
  "1fe61df7ff89d0230f07258661b1d9f88dd6ba51b7de9f147c230b543676b004",
);
const aufzugSourceClaims = parsedItemEvidence[1].sourceClaims as JsonRecord;
assert.equal((aufzugSourceClaims.definitionGerman as string).length, 32);
assert.equal(
  createHash("sha256")
    .update(aufzugSourceClaims.definitionGerman as string, "utf8")
    .digest("hex"),
  "3e0cc6e2cb389852ad79b4683db5d9f46193707a273a30a33161d449d10add46",
);

for (const [field, replacement] of [
  ["verifiedOn", "2026-10-07"],
  ["sourceUrl", "https://www.dwds.de/wb/Nachbarin"],
  ["sourcePlanId", "de_lex_plan_l01_c01_fabricated_v1"],
  ["canonicalLexicalSenseId", "de_lex_fabricated_v1"],
] as const) {
  expectItemEvidenceFailure((evidence) => {
    evidence[field] = replacement;
  }, /lexical_item_evidence_identity_mismatch/u);
}

for (const wrongAnchor of ["d-1-1", "d-1-3", "d-1-4"]) {
  expectAufzugEvidenceFailure((evidence) => {
    evidence.sourceUrl = `https://www.dwds.de/wb/Aufzug#${wrongAnchor}`;
  }, /lexical_item_evidence_identity_mismatch/u);
}
for (const [field, replacement] of [
  ["verifiedOn", "2026-10-07"],
  ["sourceUrl", "https://www.dwds.de/wb/Aufzug"],
  ["sourcePlanId", "de_lex_plan_l01_c02_fabricated_v1"],
  ["canonicalLexicalSenseId", "de_lex_l01_c02_fabricated_v1"],
  ["id", "DE-LEX-ITEM-L01-C02-AUFZUG-SENSE-FORM-999"],
] as const) {
  expectAufzugEvidenceFailure((evidence) => {
    evidence[field] = replacement;
  }, /(?:lexical_item_evidence_identity_mismatch|unknown_lexical_item_evidence_id)/u);
}
for (const [field, replacement] of [
  ["cachePath", ".tmp/fabricated.json"],
  ["cacheAccessedOn", "2026-10-08"],
  ["cacheSha256", "0".repeat(64)],
  ["responseSha256", "0".repeat(64)],
  ["responseBytes", 1],
] as const) {
  expectAufzugEvidenceFailure((evidence) => {
    (evidence.transport as JsonRecord)[field] = replacement;
  }, /lexical_item_evidence_identity_mismatch/u);
}
for (const [field, replacement] of [
  ["definitionGerman", "feierlicher Einzug"],
  ["normalizedDefinitionLength", 31],
  ["normalizedDefinitionSha256", "0".repeat(64)],
  ["lemma", "Aufzugsanlage"],
  ["partOfSpeechLabel", "Verb"],
  ["nounGenderLabel", "Femininum"],
  ["nounArticle", "die"],
  ["nounPlural", "Aufzuge"],
] as const) {
  expectAufzugEvidenceFailure((evidence) => {
    (evidence.sourceClaims as JsonRecord)[field] = replacement;
  }, /lexical_item_evidence_identity_mismatch/u);
}
for (const [field, replacement] of [
  ["semanticIdentity", "aufzug|procession"],
  ["lemma", "Fahrstuhl"],
  ["senseGloss", "ceremonial procession"],
  ["nounGender", "die"],
  ["nounPlural", "Aufzuge"],
] as const) {
  expectAufzugEvidenceFailure((evidence) => {
    (evidence.curriculumClaims as JsonRecord)[field] = replacement;
  }, /lexical_item_evidence_identity_mismatch/u);
}
expectAufzugEvidenceFailure((evidence) => {
  evidence.packetContacts = ["de_l01_c02_s16"];
}, /lexical_item_evidence_unknown_field/u);
expectAufzugEvidenceFailure((evidence) => {
  (evidence.curriculumClaims as JsonRecord).productionPolicy = "productive";
}, /lexical_item_evidence_unknown_field/u);
expectAufzugEvidenceFailure((evidence) => {
  (evidence.curriculumClaims as JsonRecord).region = "AT";
}, /lexical_item_evidence_unknown_field/u);

for (const [field, replacement] of [
  ["cacheSha256", "0".repeat(64)],
  ["responseSha256", "0".repeat(64)],
  ["responseBytes", 1],
] as const) {
  expectItemEvidenceFailure((evidence) => {
    (evidence.transport as JsonRecord)[field] = replacement;
  }, /lexical_item_evidence_identity_mismatch/u);
}

expectItemEvidenceFailure((evidence) => {
  (evidence.sourceClaims as JsonRecord).definitionGerman =
    "eine nicht belegte Bedeutung";
}, /lexical_item_evidence_identity_mismatch/u);
expectItemEvidenceFailure((evidence) => {
  (evidence.sourceClaims as JsonRecord).normalizedDefinitionSha256 = "0".repeat(
    64,
  );
}, /lexical_item_evidence_identity_mismatch/u);
expectItemEvidenceFailure((evidence) => {
  evidence.id = "DE-LEX-ITEM-L01-C01-UNKNOWN-001";
}, /unknown_lexical_item_evidence_id/u);
expectItemEvidenceFailure((evidence) => {
  evidence.id = "DE-REG-BASELINE-001";
}, /lexical_item_evidence_id_collision/u);
assert.throws(
  () => parseItemEvidence([nachbarinItemEvidence(), nachbarinItemEvidence()]),
  /duplicate_lexical_item_evidence_id/u,
);
expectItemEvidenceFailure((evidence) => {
  evidence.authority = "TEMP_TASK6A_FORM_MORPH";
}, /lexical_item_evidence_identity_mismatch/u);
expectItemEvidenceFailure((evidence) => {
  evidence.packetContacts = ["de_l01_c01_s08"];
}, /lexical_item_evidence_unknown_field/u);
expectItemEvidenceFailure((evidence) => {
  (evidence.curriculumClaims as JsonRecord).productionPolicy = "productive";
}, /lexical_item_evidence_unknown_field/u);
expectItemEvidenceFailure((evidence) => {
  delete (evidence.curriculumClaims as JsonRecord).nounPlural;
}, /lexical_item_evidence_missing_field/u);

const callerEvidence = nachbarinItemEvidence();
let verifiedOnReads = 0;
Object.defineProperty(callerEvidence, "verifiedOn", {
  enumerable: true,
  get: () => {
    verifiedOnReads += 1;
    return verifiedOnReads === 1 ? "2026-10-08" : "forged-after-validation";
  },
});
assert.throws(
  () => parseItemEvidence([callerEvidence]),
  /lexical_item_evidence_canonical_json_invalid:canonical_json_non_json_value/u,
);
assert.equal(verifiedOnReads, 0);
assert.equal(Object.isFrozen(callerEvidence), false);
callerEvidence.callerMutationProbe = "writable";
assert.equal(callerEvidence.callerMutationProbe, "writable");

assert.throws(
  () =>
    parseKernel(
      canonicalRegistryInput(),
      parseContext(canonicalAuthorityContext()),
    ),
  /undeclared_evidence_id:DE-LEX-ITEM-L01-C01-NACHBARIN-SENSE-FORM-001/u,
);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[0].evidenceIds = [
    NACHBARIN_ITEM_EVIDENCE_ID,
  ];
  validateCanonical(input);
}, /lexical_item_baseline_evidence_required/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[0].evidenceIds = [
    "DE-REG-BASELINE-001",
  ];
  validateCanonical(input);
}, /lexical_item_evidence_not_referenced/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[0].productionPolicy = "receptive";
  validateCanonical(input);
}, /lexical_item_baseline_policy_mismatch/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[1].evidenceIds = [
    AUFZUG_ITEM_EVIDENCE_ID,
  ];
  validateCanonical(input);
}, /lexical_item_baseline_evidence_required/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[1].productionPolicy =
    "regional_receptive";
  (input.lexicalSenses as JsonRecord[])[1].region = "AT";
  validateCanonical(input);
}, /lexical_item_baseline_policy_mismatch/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[0].productionPolicy =
    "regional_receptive";
  (input.lexicalSenses as JsonRecord[])[0].region = "AT";
  validateCanonical(input);
}, /lexical_item_baseline_policy_mismatch/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[0].evidenceIds = [
    NACHBARIN_ITEM_EVIDENCE_ID,
    "DE-REG-BASELINE-001",
    "DE-LEX-ITEM-UNKNOWN-001",
  ];
  validateCanonical(input);
}, /undeclared_evidence_id:DE-LEX-ITEM-UNKNOWN-001/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[0].nounGender = null;
  validateCanonical(input);
}, /noun_package_invalid/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  const reusedEvidenceVerb = verb();
  reusedEvidenceVerb.evidenceIds = [
    "DE-LEX-FREQ-001",
    NACHBARIN_ITEM_EVIDENCE_ID,
  ];
  (input.lexicalSenses as JsonRecord[]).push(reusedEvidenceVerb);
  const context = canonicalAuthorityContext();
  (context.lexicalMappings as JsonRecord[]).push({
    sourcePlanId: "de_lex_plan_l16_c01_ankommen_v1",
    canonicalId: "de_lex_ankommen_v1",
    plannedWordFirstPacketId: "de_l16_c01_s07",
    plannedFirstScoredUsePacketId: "de_l16_c01_s08",
  });
  parseKernel(input, parseContext(context), [
    nachbarinItemEvidence(),
    aufzugItemEvidence(),
  ]);
}, /lexical_item_evidence_scope_mismatch/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  const rows = input.lexicalSenses as JsonRecord[];
  rows[0].evidenceIds = [AUFZUG_ITEM_EVIDENCE_ID, "DE-REG-BASELINE-001"];
  rows[1].evidenceIds = [NACHBARIN_ITEM_EVIDENCE_ID, "DE-REG-BASELINE-001"];
  validateCanonical(input);
}, /lexical_item_evidence_scope_mismatch/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  input.lexicalSenses = [canonicalNachbarin()];
  const context = canonicalAuthorityContext();
  context.lexicalMappings = [(context.lexicalMappings as JsonRecord[])[0]];
  parseKernel(input, parseContext(context), [
    nachbarinItemEvidence(),
    aufzugItemEvidence(),
  ]);
}, /lexical_item_evidence_without_canonical_item:DE-LEX-ITEM-L01-C02-AUFZUG-SENSE-FORM-001/u);
assert.throws(
  () =>
    parseItemEvidence([
      nachbarinItemEvidence(),
      aufzugItemEvidence(),
      aufzugItemEvidence(),
    ]),
  /duplicate_lexical_item_evidence_id/u,
);
assert.throws(() => {
  const context = canonicalAuthorityContext();
  (context.lexicalMappings as JsonRecord[])[1].plannedFirstScoredUsePacketId =
    "de_l01_c02_s08";
  parseKernel(canonicalRegistryInput(), parseContext(context), [
    nachbarinItemEvidence(),
    aufzugItemEvidence(),
  ]);
}, /packet_id_topology_invalid:de_l01_c02_s08/u);
assert.throws(() => {
  const context = canonicalAuthorityContext();
  (context.lexicalMappings as JsonRecord[])[1].plannedWordFirstPacketId =
    "de_l01_c02_s16";
  parseKernel(canonicalRegistryInput(), parseContext(context), [
    nachbarinItemEvidence(),
    aufzugItemEvidence(),
  ]);
}, /word_first_chronology_invalid:de_lex_l01_c02_aufzug_v1/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[0].id = "de_lex_nachbarin_v1";
  validateCanonical(input);
}, /lexical_item_evidence_scope_mismatch/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[0].senseGloss =
    "a reused identifier with a new meaning";
  validateCanonical(input);
}, /lexical_item_evidence_claim_mismatch/u);
assert.throws(() => {
  const input = canonicalRegistryInput();
  (input.lexicalSenses as JsonRecord[])[0].packetContacts = ["de_l01_c01_s08"];
  validateCanonical(input);
}, /unknown_field:.*packetContacts/u);

const canonicalResult = validateCanonical();
assert.equal(canonicalResult.status, "TASK6_CONTRACT_KERNEL_PARTIAL");
assert.equal(canonicalResult.rowsPromoted, 0);
assert.equal(canonicalResult.verifiedLexicalItemEvidenceRows, 2);
assert.equal(
  canonicalResult.packetMaterializationStatus,
  "UNVERIFIED_UNTIL_TASK7",
);

process.stdout.write(
  "TASK6_CONTRACT_KERNEL_PARTIAL lexical=PASS actualTask5Plans=BOUND verifiedLexicalItemEvidenceRows=2 rowsPromoted=0 task7Contacts=UNVERIFIED status=HOLD\n",
);
