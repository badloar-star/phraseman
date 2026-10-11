import { canonicalJsonV1 } from "../../policies/decision_registry";
import { GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1 } from "./research_evidence_bindings_de_v1";

export type GermanLexicalItemEvidenceDeV1 = Readonly<{
  id: string;
  canonicalLexicalSenseId: string;
  sourcePlanId: string;
  evidenceStatus: "DIRECT_LEXICOGRAPHIC_SOURCE";
  authority: string;
  sourceUrl: string;
  verifiedOn: string;
  transport: Readonly<{
    cachePath: string;
    cacheAccessedOn: string;
    cacheSha256: string;
    responseSha256: string;
    responseBytes: number;
  }>;
  sourceClaims: Readonly<{
    definitionGerman: string;
    normalizedDefinitionLength: number;
    normalizedDefinitionSha256: string;
    lemma: string;
    partOfSpeechLabel: string;
    nounGenderLabel: string;
    nounArticle: string;
    nounPlural: string;
  }>;
  curriculumClaims: Readonly<{
    semanticIdentity: string;
    lemma: string;
    senseGloss: string;
    partOfSpeech: "noun";
    nounGender: "der" | "die";
    nounPlural: string;
  }>;
  derivation: Readonly<{
    semanticIdentity: "TASK5_EXACT_MATCH";
    partOfSpeechInterpretation: "DWDS_SUBSTANTIV_TO_NOUN";
  }>;
  limitation: "NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY";
}>;

export type GermanLexicalItemEvidenceRegistryDeV1 =
  readonly GermanLexicalItemEvidenceDeV1[];

const ITEM_KEYS = Object.freeze([
  "id",
  "canonicalLexicalSenseId",
  "sourcePlanId",
  "evidenceStatus",
  "authority",
  "sourceUrl",
  "verifiedOn",
  "transport",
  "sourceClaims",
  "curriculumClaims",
  "derivation",
  "limitation",
] as const);
const TRANSPORT_KEYS = Object.freeze([
  "cachePath",
  "cacheAccessedOn",
  "cacheSha256",
  "responseSha256",
  "responseBytes",
] as const);
const SOURCE_CLAIM_KEYS = Object.freeze([
  "definitionGerman",
  "normalizedDefinitionLength",
  "normalizedDefinitionSha256",
  "lemma",
  "partOfSpeechLabel",
  "nounGenderLabel",
  "nounArticle",
  "nounPlural",
] as const);
const CURRICULUM_CLAIM_KEYS = Object.freeze([
  "semanticIdentity",
  "lemma",
  "senseGloss",
  "partOfSpeech",
  "nounGender",
  "nounPlural",
] as const);
const DERIVATION_KEYS = Object.freeze([
  "semanticIdentity",
  "partOfSpeechInterpretation",
] as const);

const EXPECTED_NACHBARIN_EVIDENCE = {
  id: "DE-LEX-ITEM-L01-C01-NACHBARIN-SENSE-FORM-001",
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
    definitionGerman: "weibliche Person, die in unmittelbarer N\u00e4he wohnt",
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
} as const satisfies GermanLexicalItemEvidenceDeV1;

const EXPECTED_AUFZUG_EVIDENCE = {
  id: "DE-LEX-ITEM-L01-C02-AUFZUG-SENSE-FORM-001",
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
} as const satisfies GermanLexicalItemEvidenceDeV1;

const EXPECTED_BY_ID = new Map<string, GermanLexicalItemEvidenceDeV1>([
  [EXPECTED_NACHBARIN_EVIDENCE.id, EXPECTED_NACHBARIN_EVIDENCE],
  [EXPECTED_AUFZUG_EVIDENCE.id, EXPECTED_AUFZUG_EVIDENCE],
]);
const GENERIC_EVIDENCE_IDS = new Set<string>(
  GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1.map((binding) => binding.id),
);
const TRUSTED_REGISTRIES = new WeakSet<object>();

function fail(code: string, detail?: string): never {
  throw new Error(detail === undefined ? code : `${code}:${detail}`);
}

function assertRecord(
  value: unknown,
  path: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("lexical_item_evidence_plain_record_required", path);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("lexical_item_evidence_plain_record_required", path);
  }
}

function assertClosedKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key))
      fail("lexical_item_evidence_missing_field", `${path}.${key}`);
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key))
      fail("lexical_item_evidence_unknown_field", `${path}.${key}`);
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

export function parseGermanLexicalItemEvidenceRegistryDeV1(
  input: unknown,
): GermanLexicalItemEvidenceRegistryDeV1 {
  let normalized: unknown;
  try {
    normalized = JSON.parse(canonicalJsonV1(input)) as unknown;
  } catch (error: unknown) {
    fail(
      "lexical_item_evidence_canonical_json_invalid",
      error instanceof Error ? error.message : undefined,
    );
  }
  if (!Array.isArray(normalized)) fail("lexical_item_evidence_array_required");
  const seen = new Set<string>();
  for (let index = 0; index < normalized.length; index += 1) {
    const path = `$[${index}]`;
    const candidate = normalized[index];
    assertRecord(candidate, path);
    assertClosedKeys(candidate, ITEM_KEYS, path);
    assertRecord(candidate.transport, `${path}.transport`);
    assertClosedKeys(candidate.transport, TRANSPORT_KEYS, `${path}.transport`);
    assertRecord(candidate.sourceClaims, `${path}.sourceClaims`);
    assertClosedKeys(
      candidate.sourceClaims,
      SOURCE_CLAIM_KEYS,
      `${path}.sourceClaims`,
    );
    assertRecord(candidate.curriculumClaims, `${path}.curriculumClaims`);
    assertClosedKeys(
      candidate.curriculumClaims,
      CURRICULUM_CLAIM_KEYS,
      `${path}.curriculumClaims`,
    );
    assertRecord(candidate.derivation, `${path}.derivation`);
    assertClosedKeys(
      candidate.derivation,
      DERIVATION_KEYS,
      `${path}.derivation`,
    );
    if (typeof candidate.id !== "string")
      fail("lexical_item_evidence_id_invalid", path);
    if (GENERIC_EVIDENCE_IDS.has(candidate.id)) {
      fail("lexical_item_evidence_id_collision", candidate.id);
    }
    if (seen.has(candidate.id))
      fail("duplicate_lexical_item_evidence_id", candidate.id);
    seen.add(candidate.id);
    const expected = EXPECTED_BY_ID.get(candidate.id);
    if (expected === undefined)
      fail("unknown_lexical_item_evidence_id", candidate.id);
    if (canonicalJsonV1(candidate) !== canonicalJsonV1(expected)) {
      fail("lexical_item_evidence_identity_mismatch", candidate.id);
    }
  }
  const parsed = deepFreeze(
    normalized,
  ) as GermanLexicalItemEvidenceRegistryDeV1;
  TRUSTED_REGISTRIES.add(parsed);
  return parsed;
}

export function resolveGermanLexicalItemEvidenceDeV1(
  registry: GermanLexicalItemEvidenceRegistryDeV1,
  evidenceId: string,
): GermanLexicalItemEvidenceDeV1 | undefined {
  if (!TRUSTED_REGISTRIES.has(registry))
    fail("untrusted_lexical_item_evidence_registry");
  return registry.find((candidate) => candidate.id === evidenceId);
}

export const GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V1 =
  parseGermanLexicalItemEvidenceRegistryDeV1([
    EXPECTED_NACHBARIN_EVIDENCE,
    EXPECTED_AUFZUG_EVIDENCE,
  ]);
