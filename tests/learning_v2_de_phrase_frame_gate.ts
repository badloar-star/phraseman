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

const parsePhraseFrames =
  blueprintModule.parseGermanPhraseFrameRegistryDeV1 as (
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

function lexicalSense(): JsonRecord {
  return {
    id: "de_lex_morgen_v1",
    lemma: "morgen",
    senseGloss: "on the day after today as an explicit future-time expression",
    partOfSpeech: "adverb",
    nounGender: null,
    nounPlural: null,
    verbValency: null,
    verbFrame: null,
    verbSeparability: null,
    verbAuxiliary: null,
    productionPolicy: "productive",
    region: null,
    evidenceIds: ["DE-LEX-FREQ-001"],
  };
}

function phraseFrame(): JsonRecord {
  return {
    id: "de_pf_future_meeting_v1",
    frame: "Morgen komme ich.",
    grammarConstructIds: ["de_gc_present_future_reference_v1"],
    lexicalSenseIds: ["de_lex_morgen_v1"],
    communicativeOutcomeIds: ["de_out_l17_ch01_v1"],
    forbiddenSurfaceFormIds: ["de_forbid_werden_infinitive_v1"],
    evidenceIds: ["DE-GRM-FUTURE-001", "DE-LEX-FREQ-001"],
  };
}

function registryInput(): JsonRecord {
  return {
    lexicalSenses: [lexicalSense()],
    phraseFrames: [phraseFrame()],
    pronunciationTargets: [],
  };
}

function authorityContext(): JsonRecord {
  return {
    schemaVersion: "learning-v2-german-task6-registry-authority.v1",
    authoritySources: AUTHORITY_SOURCES,
    lexicalMappings: [
      {
        sourcePlanId: "de_lex_plan_l17_c01_morgen_v1",
        canonicalId: "de_lex_morgen_v1",
        plannedWordFirstPacketId: "de_l17_c01_s07",
        plannedFirstScoredUsePacketId: "de_l17_c01_s08",
      },
    ],
    phraseFrameMappings: [
      {
        sourceChapterId: "de_l17_c01",
        canonicalId: "de_pf_future_meeting_v1",
        plannedFirstUsePacketId: "de_l17_c01_s08",
      },
    ],
    pronunciationMappings: [],
    communicativeOutcomeMappings: [
      {
        sourceOutcomeId: "de_l17_ch01",
        canonicalId: "de_out_l17_ch01_v1",
      },
    ],
    forbiddenSurfaceForms: [
      {
        id: "de_forbid_werden_infinitive_v1",
        surface: "werden + Infinitiv",
        unlockConstructId: "de_gc_werden_infinitive_meanings_v1",
        infinitiveTokens: ["kommen"],
      },
    ],
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

const parsed = parsePhraseFrames([phraseFrame()]);
assert.ok(Object.isFrozen(parsed));
assert.ok(Object.isFrozen(parsed[0]));
assert.throws(
  () => parsePhraseFrames([phraseFrame(), phraseFrame()]),
  /duplicate_id/u,
);

const valid = validate();
assert.equal(valid.phraseFrameQuantityStatus, "UNVERIFIED_UNTIL_TASK7");
assert.equal(valid.nativePhraseJudgementStatus, "REQUIRED");
assert.equal(
  valid.patternMatcherScope,
  "BOUNDED_MANDATORY_AND_DECLARED_PATTERNS_ONLY",
);

expectFailure(
  (input) => {
    const frame = (input.phraseFrames as JsonRecord[])[0];
    frame.frame = "Wir werden morgen kommen.";
  },
  () => {},
  /forbidden_surface_leak:de_pf_future_meeting_v1:de_forbid_werden_infinitive_v1/u,
);

const mandatoryRestrictionOmissionsAccepted: string[] = [];
for (const [label, mutateInput, mutateContext] of [
  [
    "frame marker omitted",
    (input: JsonRecord) => {
      const frame = (input.phraseFrames as JsonRecord[])[0];
      frame.frame = "Wir werden morgen kommen.";
      frame.forbiddenSurfaceFormIds = [];
    },
    (_context: JsonRecord) => {},
  ],
  [
    "caller fact omitted",
    (input: JsonRecord) => {
      const frame = (input.phraseFrames as JsonRecord[])[0];
      frame.frame = "Wir werden morgen kommen.";
      frame.forbiddenSurfaceFormIds = [];
    },
    (context: JsonRecord) => {
      context.forbiddenSurfaceForms = [];
    },
  ],
] as const) {
  const input = registryInput();
  const context = authorityContext();
  mutateInput(input);
  mutateContext(context);
  try {
    validate(input, context);
    mandatoryRestrictionOmissionsAccepted.push(label);
  } catch (error: unknown) {
    assert.match(
      String(error),
      /forbidden_surface_leak:de_pf_future_meeting_v1:de_forbid_werden_infinitive_v1/u,
    );
  }
}
assert.deepEqual(
  mandatoryRestrictionOmissionsAccepted,
  [],
  `mandatory forbidden restriction bypassed: ${mandatoryRestrictionOmissionsAccepted.join(
    ", ",
  )}`,
);

const changingSourceInput = registryInput();
const changingSourceFrame = (
  changingSourceInput.phraseFrames as JsonRecord[]
)[0];
changingSourceFrame.frame = "Wir werden morgen kommen.";
changingSourceFrame.forbiddenSurfaceFormIds = [];
const changingSourceContext = authorityContext();
const canonicalGrammar = structuredClone(
  AUTHORITY_SOURCES.grammarConstructs,
) as JsonRecord[];
const forgedGrammar = structuredClone(canonicalGrammar);
const forgedUnlock = forgedGrammar.find(
  (construct) => construct.id === "de_gc_werden_infinitive_meanings_v1",
)!;
forgedUnlock.firstIntroductionPacketId = "de_l01_c01_s01";
let grammarSourceReads = 0;
const changingAuthoritySources = {} as JsonRecord;
Object.defineProperties(changingAuthoritySources, {
  grammarConstructs: {
    enumerable: true,
    get: () => {
      grammarSourceReads += 1;
      return grammarSourceReads === 1 ? canonicalGrammar : forgedGrammar;
    },
  },
  lessonBlueprints: {
    enumerable: true,
    value: AUTHORITY_SOURCES.lessonBlueprints,
  },
  chapterBlueprints: {
    enumerable: true,
    value: AUTHORITY_SOURCES.chapterBlueprints,
  },
});
changingSourceContext.authoritySources = changingAuthoritySources;
assert.throws(
  () => validate(changingSourceInput, changingSourceContext),
  /forbidden_surface_leak:de_pf_future_meeting_v1:de_forbid_werden_infinitive_v1/u,
);
assert.equal(grammarSourceReads, 1);

const boundaryInput = registryInput();
const boundaryContext = authorityContext();
const boundaryFrame = (boundaryInput.phraseFrames as JsonRecord[])[0];
boundaryFrame.frame = "Das ist seine Tasche.";
boundaryFrame.lexicalSenseIds = [];
boundaryFrame.forbiddenSurfaceFormIds = ["de_forbid_sein_literal_v1"];
(boundaryContext.forbiddenSurfaceForms as JsonRecord[])[0] = {
  id: "de_forbid_sein_literal_v1",
  surface: "sein",
  unlockConstructId: "de_gc_werden_infinitive_meanings_v1",
  infinitiveTokens: [],
};
assert.doesNotThrow(() => validate(boundaryInput, boundaryContext));

const sentenceInitialInput = registryInput();
const sentenceInitialContext = authorityContext();
(sentenceInitialInput.phraseFrames as JsonRecord[])[0].forbiddenSurfaceFormIds =
  [];
(sentenceInitialContext.forbiddenSurfaceForms as JsonRecord[]).push({
  id: "de_forbid_morgen_literal_v1",
  surface: "morgen",
  unlockConstructId: "de_gc_werden_infinitive_meanings_v1",
  infinitiveTokens: [],
});
assert.throws(
  () => validate(sentenceInitialInput, sentenceInitialContext),
  /forbidden_surface_leak:de_pf_future_meeting_v1:de_forbid_morgen_literal_v1/u,
);

const internalCaseInput = registryInput();
const internalCaseContext = authorityContext();
const internalCaseFrame = (internalCaseInput.phraseFrames as JsonRecord[])[0];
internalCaseFrame.frame = "Ich sehe Sie.";
internalCaseFrame.lexicalSenseIds = [];
internalCaseFrame.forbiddenSurfaceFormIds = [];
(internalCaseContext.forbiddenSurfaceForms as JsonRecord[]).push({
  id: "de_forbid_lowercase_sie_literal_v1",
  surface: "sie",
  unlockConstructId: "de_gc_werden_infinitive_meanings_v1",
  infinitiveTokens: [],
});
assert.doesNotThrow(() => validate(internalCaseInput, internalCaseContext));

expectFailure(
  () => {},
  (context) => {
    (context.forbiddenSurfaceForms as JsonRecord[])[0].surface =
      "sein + unknown abstraction";
  },
  /forbidden_surface_pattern_unverified/u,
);

expectFailure(
  (input) => {
    (input.phraseFrames as JsonRecord[])[0].grammarConstructIds = [
      "de_gc_werden_infinitive_meanings_v1",
    ];
  },
  () => {},
  /grammar_not_allowed_by_source_chapter/u,
);

for (const [field, value, expected] of [
  [
    "grammarConstructIds",
    ["de_gc_fabricated_v1"],
    /unknown_task3_grammar_ref/u,
  ],
  ["lexicalSenseIds", ["de_lex_fabricated_v1"], /unknown_lexical_sense_ref/u],
  [
    "communicativeOutcomeIds",
    ["de_out_fabricated_v1"],
    /unknown_outcome_mapping/u,
  ],
  [
    "forbiddenSurfaceFormIds",
    ["de_forbid_fabricated_v1"],
    /unknown_forbidden_surface_ref/u,
  ],
] as const) {
  expectFailure(
    (input) => {
      (input.phraseFrames as JsonRecord[])[0][field] = value;
    },
    () => {},
    expected,
  );
}

expectFailure(
  () => {},
  (context) => {
    (context.phraseFrameMappings as JsonRecord[])[0].sourceChapterId =
      "de_l99_c99";
  },
  /unknown_task5_chapter:de_l99_c99/u,
);

expectFailure(
  () => {},
  (context) => {
    (context.phraseFrameMappings as JsonRecord[])[0].plannedFirstUsePacketId =
      "de_l17_c02_s09";
  },
  /phrase_packet_not_owned_by_source_chapter/u,
);

expectFailure(
  () => {},
  (context) => {
    (context.lexicalMappings as JsonRecord[])[0].plannedWordFirstPacketId =
      "de_l17_c01_s08";
  },
  /word_first_chronology_invalid:de_lex_morgen_v1/u,
);

process.stdout.write(
  "TASK6_CONTRACT_KERNEL_PARTIAL phraseFrames=PASS quantity=UNVERIFIED_UNTIL_TASK7 nativeJudgement=REQUIRED rowsPromoted=0 status=HOLD\n",
);
