import assert from "node:assert/strict";
import fs from "node:fs";
import * as blueprintModule from "../modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1";
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

const parsePronunciation =
  blueprintModule.parseGermanPronunciationTargetRegistryDeV1 as (
    input: unknown,
  ) => readonly JsonRecord[];
const parseContext =
  kernelModule.parseGermanTask6RegistryAuthorityContextDeV1 as (
    input: unknown,
  ) => unknown;
const parseKernel = kernelModule.parseGermanTask6RegistryContractDeV1 as (
  input: unknown,
  context: unknown,
) => JsonRecord;

function target(): JsonRecord {
  return {
    id: "de_pron_long_short_vowel_diagnostic_v1",
    target: "German vowel duration and length-quality diagnostic",
    perceptionEvidenceIds: ["DE-PHON-RU-001", "DE-PHON-RU-004"],
    productionEvidenceIds: ["DE-PHON-RU-001"],
    ruApplicability: {
      status: "APPLIES",
      correctiveRoute: "varied vowel duration and quality diagnostics",
      rationale:
        "Use varied diagnostic and recycling evidence without claiming native-like production.",
      evidenceBindings: [
        {
          kind: "CANONICAL_BINDING",
          evidenceId: "DE-PHON-RU-001",
          evidenceStatus: "DIRECT_L2_RU",
        },
        {
          kind: "CANONICAL_BINDING",
          evidenceId: "DE-PHON-RU-004",
          evidenceStatus: "DIRECT_L2_RU",
        },
      ],
    },
    ukApplicability: {
      status: "DIAGNOSTIC_ONLY",
      correctiveRoute: "diagnose length-quality after an observed response",
      rationale:
        "Contrastive risk is a hypothesis and is never a presumed nationality error.",
      evidenceBindings: [
        {
          kind: "CANONICAL_BINDING",
          evidenceId: "DE-PHON-UK-002",
          evidenceStatus: "CONTRASTIVE_RISK",
        },
      ],
    },
  };
}

function registryInput(): JsonRecord {
  return {
    lexicalSenses: [],
    phraseFrames: [],
    pronunciationTargets: [target()],
  };
}

function authorityContext(): JsonRecord {
  return {
    schemaVersion: "learning-v2-german-task6-registry-authority.v1",
    authoritySources: AUTHORITY_SOURCES,
    lexicalMappings: [],
    phraseFrameMappings: [],
    pronunciationMappings: [
      {
        sourcePlanId: "de_pron_plan_long_short_vowel_diagnostic_v1",
        sourceLessonId: "de_l03",
        canonicalId: "de_pron_long_short_vowel_diagnostic_v1",
      },
    ],
    communicativeOutcomeMappings: [],
    forbiddenSurfaceForms: [],
    pronunciationPresentationPolicies: [
      {
        pronunciationTargetId: "de_pron_long_short_vowel_diagnostic_v1",
        canonicalRegion: "DE_STANDARD",
        productionPolicy: "productive",
        learnerLabel: null,
      },
    ],
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

const parsed = parsePronunciation([target()]);
assert.ok(Object.isFrozen(parsed));
assert.ok(Object.isFrozen(parsed[0]));
assert.throws(() => parsePronunciation([target(), target()]), /duplicate_id/u);

const valid = validate();
assert.equal(valid.pronunciationPacketContactsStatus, "UNVERIFIED_UNTIL_TASK7");
assert.equal(valid.rowsPromoted, 0);

const alternateOwnerContext = authorityContext();
(
  alternateOwnerContext.pronunciationMappings as JsonRecord[]
)[0].sourceLessonId = "de_l13";
assert.doesNotThrow(() => validate(registryInput(), alternateOwnerContext));

expectFailure(
  (input) => {
    const duplicate = structuredClone(
      (input.pronunciationTargets as JsonRecord[])[0],
    );
    duplicate.id = "de_pron_long_short_vowel_diagnostic_duplicate_v1";
    (input.pronunciationTargets as JsonRecord[]).push(duplicate);
  },
  (context) => {
    (context.pronunciationMappings as JsonRecord[]).push({
      sourcePlanId: "de_pron_plan_long_short_vowel_diagnostic_v1",
      sourceLessonId: "de_l13",
      canonicalId: "de_pron_long_short_vowel_diagnostic_duplicate_v1",
    });
    (context.pronunciationPresentationPolicies as JsonRecord[]).push({
      pronunciationTargetId: "de_pron_long_short_vowel_diagnostic_duplicate_v1",
      canonicalRegion: "DE_STANDARD",
      productionPolicy: "productive",
      learnerLabel: null,
    });
  },
  /duplicate_pronunciation_semantics/u,
);

expectFailure(
  (input) => {
    const pronunciation = (input.pronunciationTargets as JsonRecord[])[0];
    const ru = pronunciation.ruApplicability as JsonRecord;
    const uk = pronunciation.ukApplicability as JsonRecord;
    uk.correctiveRoute = ru.correctiveRoute;
    uk.rationale = ru.rationale;
  },
  () => {},
  /pronunciation_locale_profiles_copied/u,
);

expectFailure(
  (input) => {
    const uk = (input.pronunciationTargets as JsonRecord[])[0]
      .ukApplicability as JsonRecord;
    uk.status = "APPLIES";
  },
  () => {},
  /contrastive_risk_applicability_invalid/u,
);

for (const field of ["perceptionEvidenceIds", "productionEvidenceIds"]) {
  expectFailure(
    (input) => {
      (input.pronunciationTargets as JsonRecord[])[0][field] = [];
    },
    () => {},
    /non_empty_array_required/u,
  );
}

expectFailure(
  (input) => {
    const pronunciation = (input.pronunciationTargets as JsonRecord[])[0];
    pronunciation.productionEvidenceIds = structuredClone(
      pronunciation.perceptionEvidenceIds,
    );
  },
  () => {},
  /pronunciation_perception_production_evidence_not_distinct/u,
);

for (const [field, evidenceIds] of [
  ["perceptionEvidenceIds", ["DE-PHON-UK-001"]],
  ["productionEvidenceIds", ["DE-PHON-RU-003"]],
  ["productionEvidenceIds", ["DE-PHON-RU-004"]],
] as const) {
  expectFailure(
    (input) => {
      (input.pronunciationTargets as JsonRecord[])[0][field] = evidenceIds;
    },
    () => {},
    /pronunciation_evidence_irrelevant:de_pron_long_short_vowel_diagnostic_v1/u,
  );
}

expectFailure(
  (input) => {
    const uk = (input.pronunciationTargets as JsonRecord[])[0]
      .ukApplicability as JsonRecord;
    (uk.evidenceBindings as JsonRecord[]).push({
      kind: "CANONICAL_BINDING",
      evidenceId: "DE-PHON-UK-003",
      evidenceStatus: "DIRECT_SYSTEM",
    });
  },
  () => {},
  /pronunciation_evidence_irrelevant:de_pron_long_short_vowel_diagnostic_v1/u,
);

expectFailure(
  () => {},
  (context) => {
    (context.pronunciationMappings as JsonRecord[])[0].sourcePlanId =
      "de_pron_plan_fabricated_v1";
  },
  /unknown_task4_pronunciation_plan/u,
);

expectFailure(
  () => {},
  (context) => {
    (context.pronunciationMappings as JsonRecord[])[0].sourceLessonId =
      "de_l99";
  },
  /pronunciation_plan_not_owned_by_source_lesson/u,
);

expectFailure(
  () => {},
  (context) => {
    const policy = (
      context.pronunciationPresentationPolicies as JsonRecord[]
    )[0];
    policy.canonicalRegion = "AT";
    policy.productionPolicy = "productive";
    policy.learnerLabel = null;
  },
  /pronunciation_region_policy_mismatch/u,
);

process.stdout.write(
  "TASK6_CONTRACT_KERNEL_PARTIAL pronunciation=PASS actualLessonOwner=BOUND packetContacts=UNVERIFIED_UNTIL_TASK7 rowsPromoted=0 status=HOLD\n",
);
