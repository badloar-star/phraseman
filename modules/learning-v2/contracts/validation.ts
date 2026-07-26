import {
  V2_ACTIVITY_FAMILIES,
  type ModeTemplateArtifactBody,
  type ModeTemplateLifecycleHead,
  type V2ResolvedPolicyDescriptor,
  type V2ResolvedModeTemplate,
} from "./activity";
import type { V2CurriculumProjection } from "./curriculum";
import type { V2CheckpointContract, V2EpisodeContract } from "./episode";
import type {
  ContentGateReceiptBody,
  ContentReceiptSubject,
} from "./content_studio";
import { buildLearningEvidenceTupleKey } from "./evidence";
import { V2_IDENTITY_REGEX } from "./identities";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  validateDecisionRegistry,
  type ResolvedDecisionRegistry,
} from "../policies/decision_registry";

type JsonObject = Record<string, unknown>;

export interface V2LearningPackageDependencies {
  readonly templates: readonly V2ResolvedModeTemplate[];
  readonly policies: readonly V2ResolvedPolicyDescriptor[];
  readonly fadeRuleIds: readonly string[];
  readonly escalationRuleIds: readonly string[];
  readonly assetIds: readonly string[];
  readonly contentUnitIds: readonly string[];
}

export interface V2LearningPackage {
  readonly schemaVersion: "learning-v2-contract-fixture.v1";
  readonly dependencies: V2LearningPackageDependencies;
  readonly episode: V2EpisodeContract;
  readonly curriculum: V2CurriculumProjection;
}

export interface V2ContractValidationContext {
  readonly decisionRegistry: unknown;
}

export interface V2CheckpointValidationContext {
  readonly independentProbeNodeIds: readonly string[];
  readonly nodePhases: Readonly<Record<string, string>>;
  readonly declarations: readonly {
    readonly nodeId: string;
    readonly declaration: Readonly<Record<string, unknown>>;
  }[];
  readonly taughtScope: Readonly<Record<string, readonly string[]>>;
  readonly requiredCheckpointMaterial: Readonly<
    Record<string, readonly string[]>
  >;
}

export interface V2ContractIssue {
  readonly code: string;
  readonly path: string;
  readonly severity: "blocking";
  readonly waivable: false;
}

export type V2ContractValidationResult<Value> =
  | { readonly ok: true; readonly issues: readonly []; readonly value: Value }
  | { readonly ok: false; readonly issues: readonly V2ContractIssue[] };

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const CODE_OWNED_FADE_RULE_IDS = new Set(["fade.model-to-partial.v1"]);
const CODE_OWNED_ESCALATION_RULE_IDS = new Set(["escalate.targeted-repair.v1"]);
const POLICY_KINDS = [
  "evidence",
  "scoring",
  "progress",
  "reward",
  "recovery",
] as const;
const PACKAGE_KEYS = [
  "schemaVersion",
  "dependencies",
  "episode",
  "curriculum",
] as const;
const DEPENDENCY_KEYS = [
  "templates",
  "policies",
  "fadeRuleIds",
  "escalationRuleIds",
  "assetIds",
  "contentUnitIds",
] as const;
const TEMPLATE_KEYS = ["templateRef", "body"] as const;
const TEMPLATE_BODY_KEYS = [
  "schemaVersion",
  "templateId",
  "version",
  "family",
  "humanName",
  "description",
  "pedagogicalPurpose",
  "kernel",
  "policies",
  "authoring",
  "capabilityContract",
  "evidenceClaims",
  "learnerCopy",
  "fixtures",
  "compatibility",
  "learningContractRefs",
] as const;
const TEMPLATE_BODY_OPTIONAL_KEYS = ["voiceReleaseRequirements"] as const;
const TEMPLATE_PURPOSE_KEYS = [
  "phase",
  "primarySkillIds",
  "modalities",
  "estimatedSeconds",
] as const;
const TEMPLATE_KERNEL_KEYS = [
  "activityTypeKey",
  "kernelVersion",
  "rendererKey",
  "rendererSchemaVersion",
  "payloadSchemaKey",
  "payloadSchemaVersion",
  "payloadSchemaHash",
] as const;
const TEMPLATE_AUTHORING_KEYS = [
  "editableFieldPaths",
  "requiredFieldPaths",
  "defaultValues",
  "allowedOverridePaths",
] as const;
const TEMPLATE_CAPABILITY_KEYS = [
  "microphone",
  "speechRecognition",
  "audioPlayback",
  "network",
] as const;
const TEMPLATE_COPY_KEYS = [
  "instruction",
  "primaryAction",
  "retryAction",
  "successMessage",
  "needsWorkMessage",
  "recoveryMessage",
] as const;
const TEMPLATE_FIXTURE_KEYS = [
  "fixtureId",
  "label",
  "state",
  "payload",
] as const;
const TEMPLATE_COMPATIBILITY_KEYS = [
  "minAppVersion",
  "requiredSupportManifestHashes",
  "progressCompatibilityNamespace",
] as const;
const TEMPLATE_LEARNING_REF_KEYS = [
  "learningEvidenceContractRef",
  "prerequisiteGraphRef",
  "supportFadePolicyRef",
] as const;
const POLICY_DESCRIPTOR_KEYS = ["ref", "body"] as const;
const POLICY_BODY_KEYS = [
  "schemaVersion",
  "kind",
  "key",
  "version",
  "humanName",
  "description",
  "compatibleFamilies",
  "compatibleKernelKeys",
  "configurableFieldPaths",
  "evidenceKinds",
  "claims",
] as const;
const ACTIVITY_KEYS = [
  "activityId",
  "progressCompatibilityKey",
  "family",
  "activityTypeKey",
  "kernelVersion",
  "templateRef",
  "payloadSchemaVersion",
  "estimatedSeconds",
  "contentUnitIds",
  "assetIds",
  "capabilities",
  "requirements",
  "targets",
  "tags",
  "payload",
] as const;
const EPISODE_KEYS = [
  "schemaVersion",
  "episodeId",
  "seasonId",
  "episodeKind",
  "ordinal",
  "chapterId",
  "estimatedMinutes",
  "title",
  "canDoOutcome",
  "scenario",
  "objectiveIds",
  "skillIds",
  "phraseFrames",
  "semanticSlots",
  "criticalConstraints",
  "grammarDistinctionIds",
  "soundFocusIds",
  "assetIds",
  "activities",
  "graph",
  "starSlots",
  "requiredLoops",
  "assessmentNodes",
  "capstoneContract",
  "learningDesign",
  "masteryContract",
  "delayedProbeDefinitions",
  "reviewLinks",
  "accessibilityRoutes",
  "checkpointContract",
] as const;
const EPISODE_V2_KEYS = [...EPISODE_KEYS, "sessionSetRef"] as const;
const EPISODE_REQUIRED_ARRAY_KEYS = [
  "phraseFrames",
  "semanticSlots",
  "criticalConstraints",
  "activities",
  "starSlots",
  "delayedProbeDefinitions",
  "reviewLinks",
  "accessibilityRoutes",
] as const;
const EPISODE_REQUIRED_OBJECT_KEYS = [
  "scenario",
  "graph",
  "requiredLoops",
  "assessmentNodes",
  "capstoneContract",
  "learningDesign",
  "masteryContract",
] as const;
const GRAPH_KEYS = ["startNodeId", "capstoneNodeId", "nodes", "edges"] as const;
const NODE_KEYS = [
  "nodeId",
  "activityId",
  "position",
  "visible",
  "requiredForCore",
  "voiceEvidenceOptional",
  "fallback",
  "transferFromNodeId",
  "variedSemanticSlotIds",
  "phase",
  "evidenceDeclarations",
  "pedagogicalContextContract",
  "gateEligible",
  "starSlotId",
  "maxStars",
] as const;
const DECLARATION_KEYS = [
  "objectiveId",
  "skillId",
  "construct",
  "phase",
  "target",
] as const;
const EDGE_KEYS = ["edgeId", "fromNodeId", "toNodeId", "condition"] as const;
const CURRICULUM_KEYS = [
  "schemaVersion",
  "curriculumId",
  "seasonId",
  "scope",
  "environment",
  "decisionRegistryRef",
  "studyTarget",
  "learnerSourceLocale",
  "requiredLocales",
  "chapters",
  "episodeRefs",
  "checkpointOrdinals",
  "requiredAssetIds",
  "requiredCapabilityKeys",
] as const;

const hasOwn = (value: JsonObject, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isPlainObject = (value: unknown): value is JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isRecordArray = (value: unknown): value is JsonObject[] =>
  Array.isArray(value) && value.every(isPlainObject);

const isPositiveInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;

const issue = (code: string, path: string): V2ContractIssue => ({
  code,
  path,
  severity: "blocking",
  waivable: false,
});

const fail = <Value>(
  issues: readonly V2ContractIssue[],
): V2ContractValidationResult<Value> => ({
  ok: false,
  issues,
});

const pass = <Value>(value: Value): V2ContractValidationResult<Value> => ({
  ok: true,
  issues: [],
  value,
});

const safely = <Value>(
  run: () => V2ContractValidationResult<Value>,
): V2ContractValidationResult<Value> => {
  try {
    return run();
  } catch {
    return fail([issue("contract_internal_error", "$")]);
  }
};

type JsonInspectionFrame =
  | {
      readonly kind: "visit";
      readonly value: unknown;
      readonly path: string;
      readonly assign: (snapshot: unknown) => void;
    }
  | { readonly kind: "leave"; readonly value: object };

type CanonicalJsonSnapshotResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly issue: V2ContractIssue };

interface CanonicalJsonSnapshotOptions {
  readonly permittedUndefinedDataPropertyPath?: string;
}

/**
 * Builds a data-descriptor-only JSON snapshot before any semantic parser or
 * canonical hash runs. Accessors, cycles, sparse arrays, exotic prototypes,
 * trap failures and non-JSON values fail at the nearest stable JSON path.
 */
const snapshotCanonicalJsonInput = (
  input: unknown,
  rootPath: string,
  options?: CanonicalJsonSnapshotOptions,
): CanonicalJsonSnapshotResult => {
  const active = new WeakSet<object>();
  const root: { value: unknown } = { value: undefined };
  const stack: JsonInspectionFrame[] = [
    {
      kind: "visit",
      value: input,
      path: rootPath,
      assign: (snapshot) => {
        root.value = snapshot;
      },
    },
  ];
  let stablePath = rootPath;

  try {
    while (stack.length > 0) {
      const frame = stack.pop() as JsonInspectionFrame;
      if (frame.kind === "leave") {
        active.delete(frame.value);
        continue;
      }

      const { value, path } = frame;
      stablePath = path;
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean"
      ) {
        frame.assign(value);
        continue;
      }
      if (typeof value === "number") {
        if (!Number.isFinite(value)) {
          return { ok: false, issue: issue("contract_input_invalid", path) };
        }
        frame.assign(value);
        continue;
      }
      if (typeof value !== "object") {
        return { ok: false, issue: issue("contract_input_invalid", path) };
      }

      const objectValue = value as object;
      if (active.has(objectValue)) {
        return { ok: false, issue: issue("contract_input_invalid", path) };
      }
      active.add(objectValue);
      stack.push({ kind: "leave", value: objectValue });

      if (Array.isArray(value)) {
        const prototype = Reflect.getPrototypeOf(objectValue);
        const ownKeys = Reflect.ownKeys(objectValue);
        const lengthDescriptor = Reflect.getOwnPropertyDescriptor(
          objectValue,
          "length",
        );
        if (
          prototype !== Array.prototype ||
          !lengthDescriptor ||
          lengthDescriptor.get ||
          lengthDescriptor.set ||
          lengthDescriptor.enumerable !== false ||
          !hasOwn(lengthDescriptor as JsonObject, "value")
        ) {
          return { ok: false, issue: issue("contract_input_invalid", path) };
        }
        const length = lengthDescriptor.value;
        const accessedLength = Reflect.get(objectValue, "length");
        if (
          !Number.isSafeInteger(length) ||
          length < 0 ||
          length > 0xffffffff ||
          accessedLength !== length
        ) {
          return { ok: false, issue: issue("contract_input_invalid", path) };
        }

        const entries: { readonly index: number; readonly value: unknown }[] =
          [];
        for (const key of ownKeys) {
          if (key === "length") continue;
          if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)) {
            return { ok: false, issue: issue("contract_input_invalid", path) };
          }
          const index = Number(key);
          if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
            return { ok: false, issue: issue("contract_input_invalid", path) };
          }
          stablePath = `${path}[${index}]`;
          const descriptor = Reflect.getOwnPropertyDescriptor(objectValue, key);
          if (
            !descriptor ||
            descriptor.get ||
            descriptor.set ||
            descriptor.enumerable !== true ||
            !hasOwn(descriptor as JsonObject, "value")
          ) {
            return {
              ok: false,
              issue: issue("contract_input_invalid", stablePath),
            };
          }
          entries.push({ index, value: descriptor.value });
        }
        if (ownKeys.length !== length + 1 || entries.length !== length) {
          return { ok: false, issue: issue("contract_input_invalid", path) };
        }
        const snapshot = new Array<unknown>(length);
        frame.assign(snapshot);
        for (const entry of entries.sort(
          (left, right) => right.index - left.index,
        )) {
          stack.push({
            kind: "visit",
            value: entry.value,
            path: `${path}[${entry.index}]`,
            assign: (childSnapshot) => {
              snapshot[entry.index] = childSnapshot;
            },
          });
        }
        continue;
      }

      const prototype = Reflect.getPrototypeOf(objectValue);
      const ownKeys = Reflect.ownKeys(objectValue);
      if (prototype !== Object.prototype && prototype !== null) {
        return { ok: false, issue: issue("contract_input_invalid", path) };
      }
      if (ownKeys.some((key) => typeof key !== "string")) {
        return { ok: false, issue: issue("contract_input_invalid", path) };
      }
      const entries: { readonly key: string; readonly value: unknown }[] = [];
      for (const key of ownKeys as string[]) {
        stablePath = `${path}.${key}`;
        const descriptor = Reflect.getOwnPropertyDescriptor(objectValue, key);
        if (!descriptor) {
          return {
            ok: false,
            issue: issue("contract_input_invalid", stablePath),
          };
        }
        if (descriptor.enumerable !== true) {
          return { ok: false, issue: issue("contract_input_invalid", path) };
        }
        if (
          descriptor.get ||
          descriptor.set ||
          !hasOwn(descriptor as JsonObject, "value")
        ) {
          return {
            ok: false,
            issue: issue("contract_input_invalid", stablePath),
          };
        }
        if (
          descriptor.value === undefined &&
          options?.permittedUndefinedDataPropertyPath === stablePath
        ) {
          continue;
        }
        entries.push({ key, value: descriptor.value });
      }
      const snapshot: JsonObject =
        prototype === null ? (Object.create(null) as JsonObject) : {};
      for (const entry of entries) {
        Object.defineProperty(snapshot, entry.key, {
          configurable: true,
          enumerable: true,
          value: undefined,
          writable: true,
        });
      }
      frame.assign(snapshot);
      for (const entry of [...entries].reverse()) {
        stack.push({
          kind: "visit",
          value: entry.value,
          path: `${path}.${entry.key}`,
          assign: (childSnapshot) => {
            snapshot[entry.key] = childSnapshot;
          },
        });
      }
    }
    return { ok: true, value: root.value };
  } catch {
    return { ok: false, issue: issue("contract_input_invalid", stablePath) };
  }
};

const sameValue = (left: unknown, right: unknown): boolean => {
  try {
    return canonicalJsonV1(left) === canonicalJsonV1(right);
  } catch {
    return false;
  }
};

const sameStringSet = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length &&
  [...left].sort().every((value, index) => value === [...right].sort()[index]);

const exactObjectIssues = (
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  path: string,
  unknownCode = "field_unknown",
): readonly V2ContractIssue[] => {
  if (!isPlainObject(value)) return [issue("field_type_invalid", path)];
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  const issues: V2ContractIssue[] = [];
  for (const key of Object.keys(value)
    .filter((key) => !allowed.has(key))
    .sort()) {
    issues.push(issue(unknownCode, `${path}.${key}`));
  }
  for (const key of requiredKeys) {
    if (!hasOwn(value, key))
      issues.push(issue("field_missing", `${path}.${key}`));
  }
  return issues;
};

const episodeContainerShapeIssue = (
  episode: JsonObject,
): V2ContractIssue | undefined => {
  for (const key of EPISODE_REQUIRED_ARRAY_KEYS) {
    if (!Array.isArray(episode[key])) {
      return issue("field_type_invalid", `$.episode.${key}`);
    }
  }
  for (const key of EPISODE_REQUIRED_OBJECT_KEYS) {
    if (!isPlainObject(episode[key])) {
      return issue("field_type_invalid", `$.episode.${key}`);
    }
  }
  return undefined;
};

const uniqueSecondIndex = (values: readonly unknown[]): number => {
  const seen = new Set<unknown>();
  for (let index = 0; index < values.length; index += 1) {
    if (seen.has(values[index])) return index;
    seen.add(values[index]);
  }
  return -1;
};

const resolveRegistry = (
  context: unknown,
): V2ContractValidationResult<ResolvedDecisionRegistry> => {
  if (!isPlainObject(context) || !hasOwn(context, "decisionRegistry")) {
    return fail([
      issue("decision_registry_context_invalid", "$.decisionRegistry"),
    ]);
  }
  const result = validateDecisionRegistry(context.decisionRegistry);
  if (!result.ok)
    return fail([
      issue("decision_registry_context_invalid", "$.decisionRegistry"),
    ]);
  return pass(result.value);
};

const decisionSettings = (
  registry: ResolvedDecisionRegistry,
  decisionId: string,
): JsonObject | undefined => {
  const decisions = registry.body.decisions as unknown as JsonObject;
  const decision = decisions[decisionId];
  if (!isPlainObject(decision) || !isPlainObject(decision.settings))
    return undefined;
  return decision.settings;
};

const rangeContains = (range: unknown, value: number): boolean =>
  isPlainObject(range) &&
  typeof range.min === "number" &&
  typeof range.max === "number" &&
  value >= range.min &&
  value <= range.max;

const validatePackageShape = (input: unknown): readonly V2ContractIssue[] => {
  const rootIssues = exactObjectIssues(input, PACKAGE_KEYS, [], "$");
  if (rootIssues.length > 0) return rootIssues;
  const root = input as JsonObject;
  if (root.schemaVersion !== "learning-v2-contract-fixture.v1") {
    return [issue("schema_version_invalid", "$.schemaVersion")];
  }

  const dependencyIssues = exactObjectIssues(
    root.dependencies,
    DEPENDENCY_KEYS,
    [],
    "$.dependencies",
  );
  if (dependencyIssues.length > 0) return dependencyIssues;
  const dependencies = root.dependencies as JsonObject;
  if (!isRecordArray(dependencies.templates))
    return [issue("field_type_invalid", "$.dependencies.templates")];
  if (!isRecordArray(dependencies.policies))
    return [issue("field_type_invalid", "$.dependencies.policies")];
  for (const key of [
    "fadeRuleIds",
    "escalationRuleIds",
    "assetIds",
    "contentUnitIds",
  ]) {
    if (!isStringArray(dependencies[key]))
      return [issue("field_type_invalid", `$.dependencies.${key}`)];
  }

  for (let index = 0; index < dependencies.templates.length; index += 1) {
    const templateIssues = exactObjectIssues(
      dependencies.templates[index],
      TEMPLATE_KEYS,
      [],
      `$.dependencies.templates[${index}]`,
    );
    if (templateIssues.length > 0) return templateIssues;
  }

  const episode = root.episode as JsonObject;
  const episodeKeys =
    episode?.schemaVersion === "v2-episode-contract.v2"
      ? EPISODE_V2_KEYS
      : EPISODE_KEYS;
  if (
    episode?.schemaVersion === "v2-episode-contract.v2" &&
    (!hasOwn(episode, "sessionSetRef") || episode.sessionSetRef === undefined)
  ) {
    return [
      issue("episode_session_set_ref_required", "$.episode.sessionSetRef"),
    ];
  }
  const episodeIssues = exactObjectIssues(
    root.episode,
    episodeKeys.filter((key) => key !== "checkpointContract"),
    ["checkpointContract"],
    "$.episode",
  );
  if (episodeIssues.length > 0) return episodeIssues;
  if (
    episode.schemaVersion !== "v2-episode-contract.v1" &&
    episode.schemaVersion !== "v2-episode-contract.v2"
  ) {
    return [issue("schema_version_invalid", "$.episode.schemaVersion")];
  }
  if (episode.schemaVersion === "v2-episode-contract.v2") {
    const episodeResult = validateV2EpisodeContract(episode);
    if (!episodeResult.ok) return episodeResult.issues;
  }
  if (!isRecordArray(episode.activities))
    return [issue("field_type_invalid", "$.episode.activities")];

  const activityUnknownIssues: V2ContractIssue[] = [];
  for (let index = 0; index < episode.activities.length; index += 1) {
    activityUnknownIssues.push(
      ...exactObjectIssues(
        episode.activities[index],
        ACTIVITY_KEYS,
        [],
        `$.episode.activities[${index}]`,
        "activity_forbidden_field",
      ),
    );
    const activity = episode.activities[index];
    const tagIssues = exactObjectIssues(
      activity.tags,
      ["skillIds", "grammar", "vocabulary", "scenario", "modalities"],
      [],
      `$.episode.activities[${index}].tags`,
    );
    activityUnknownIssues.push(...tagIssues);
    const capabilityIssues = exactObjectIssues(
      activity.capabilities,
      ["microphone", "speechRecognition", "audioPlayback", "network"],
      [],
      `$.episode.activities[${index}].capabilities`,
    );
    activityUnknownIssues.push(...capabilityIssues);
  }
  if (activityUnknownIssues.length > 0) return activityUnknownIssues;

  const scenarioIssues = exactObjectIssues(
    episode.scenario,
    [
      "scenarioId",
      "title",
      "setting",
      "learnerRole",
      "partnerRole",
      "communicativeGoal",
      "successCondition",
      "criticalConstraintIds",
    ],
    [],
    "$.episode.scenario",
  );
  if (scenarioIssues.length > 0) return scenarioIssues;
  if (!isRecordArray(episode.phraseFrames))
    return [issue("field_type_invalid", "$.episode.phraseFrames")];
  for (let index = 0; index < episode.phraseFrames.length; index += 1) {
    const phraseIssues = exactObjectIssues(
      episode.phraseFrames[index],
      [
        "phraseFrameId",
        "targetPattern",
        "learnerMeaning",
        "semanticSlotIds",
        "skillIds",
        "required",
      ],
      [],
      `$.episode.phraseFrames[${index}]`,
    );
    if (phraseIssues.length > 0) return phraseIssues;
  }
  if (!isRecordArray(episode.semanticSlots))
    return [issue("field_type_invalid", "$.episode.semanticSlots")];
  for (let index = 0; index < episode.semanticSlots.length; index += 1) {
    const slotIssues = exactObjectIssues(
      episode.semanticSlots[index],
      [
        "semanticSlotId",
        "role",
        "acceptedTargetValues",
        "allowedContentUnitIds",
        "minimumDistinctValues",
        "requiredInCapstone",
        "critical",
      ],
      [],
      `$.episode.semanticSlots[${index}]`,
    );
    if (slotIssues.length > 0) return slotIssues;
  }

  const graphIssues = exactObjectIssues(
    episode.graph,
    GRAPH_KEYS,
    [],
    "$.episode.graph",
  );
  if (graphIssues.length > 0) return graphIssues;
  const graph = episode.graph as JsonObject;
  if (!isRecordArray(graph.nodes))
    return [issue("field_type_invalid", "$.episode.graph.nodes")];
  if (!isRecordArray(graph.edges))
    return [issue("field_type_invalid", "$.episode.graph.edges")];
  for (let index = 0; index < graph.nodes.length; index += 1) {
    const nodePath = `$.episode.graph.nodes[${index}]`;
    const nodeIssues = exactObjectIssues(
      graph.nodes[index],
      NODE_KEYS.filter(
        (key) =>
          ![
            "fallback",
            "transferFromNodeId",
            "variedSemanticSlotIds",
            "starSlotId",
            "pedagogicalContextContract",
          ].includes(key),
      ),
      [
        "fallback",
        "transferFromNodeId",
        "variedSemanticSlotIds",
        "starSlotId",
        "pedagogicalContextContract",
      ],
      nodePath,
    );
    if (nodeIssues.length > 0) return nodeIssues;
    const declarations = graph.nodes[index].evidenceDeclarations;
    if (!isRecordArray(declarations))
      return [issue("field_type_invalid", `${nodePath}.evidenceDeclarations`)];
    for (
      let declarationIndex = 0;
      declarationIndex < declarations.length;
      declarationIndex += 1
    ) {
      const declarationIssues = exactObjectIssues(
        declarations[declarationIndex],
        DECLARATION_KEYS,
        [],
        `${nodePath}.evidenceDeclarations[${declarationIndex}]`,
      );
      if (declarationIssues.length > 0) return declarationIssues;
    }
  }
  for (let index = 0; index < graph.edges.length; index += 1) {
    const edgeIssues = exactObjectIssues(
      graph.edges[index],
      EDGE_KEYS,
      [],
      `$.episode.graph.edges[${index}]`,
    );
    if (edgeIssues.length > 0) return edgeIssues;
  }

  const loopShapeIssues = exactObjectIssues(
    episode.requiredLoops,
    ["encounterBuildNodeIds", "nearTransferNodeIds"],
    [],
    "$.episode.requiredLoops",
  );
  if (loopShapeIssues.length > 0) return loopShapeIssues;
  const assessmentShapeIssues = exactObjectIssues(
    episode.assessmentNodes,
    ["independentProbeNodeIds", "optionalReviewNodeIds"],
    [],
    "$.episode.assessmentNodes",
  );
  if (assessmentShapeIssues.length > 0) return assessmentShapeIssues;

  if (!isRecordArray(episode.reviewLinks))
    return [issue("field_type_invalid", "$.episode.reviewLinks")];
  for (let index = 0; index < episode.reviewLinks.length; index += 1) {
    const link = episode.reviewLinks[index];
    const materializedKey = [
      "outcome",
      "success",
      "result",
      "evidence",
      "attempt",
    ].find((key) => hasOwn(link, key));
    if (materializedKey) {
      return [
        issue(
          "review_link_materialization_forbidden",
          `$.episode.reviewLinks[${index}].${materializedKey}`,
        ),
      ];
    }
  }

  return [];
};

const oneExactObjectIssue = (
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  path: string,
): V2ContractIssue | undefined =>
  exactObjectIssues(value, requiredKeys, optionalKeys, path)[0];

const identityValueIssue = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined =>
  typeof value === "string" && !V2_IDENTITY_REGEX.test(value)
    ? issue("identity_invalid", path)
    : undefined;

const identityArrayIssue = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  if (!isStringArray(value)) return undefined;
  const invalidIndex = value.findIndex(
    (candidate) => !V2_IDENTITY_REGEX.test(candidate),
  );
  return invalidIndex >= 0
    ? issue("identity_invalid", `${path}[${invalidIndex}]`)
    : undefined;
};

const identityFieldsIssue = (
  value: unknown,
  path: string,
  scalarFields: readonly string[],
  arrayFields: readonly string[],
): V2ContractIssue | undefined => {
  if (!isPlainObject(value)) return undefined;
  for (const field of scalarFields) {
    const fieldIssue = identityValueIssue(value[field], `${path}.${field}`);
    if (fieldIssue) return fieldIssue;
  }
  for (const field of arrayFields) {
    const fieldIssue = identityArrayIssue(value[field], `${path}.${field}`);
    if (fieldIssue) return fieldIssue;
  }
  return undefined;
};

const declarationIdentityIssue = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  const declarationIssue = identityFieldsIssue(
    value,
    path,
    ["objectiveId", "skillId"],
    [],
  );
  if (declarationIssue || !isPlainObject(value)) return declarationIssue;
  return identityFieldsIssue(value.target, `${path}.target`, ["targetId"], []);
};

const pedagogicalContextIdentityIssue = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  if (!isPlainObject(value)) return undefined;
  return (
    identityFieldsIssue(
      value.context,
      `${path}.context`,
      ["contextId", "surfaceFormId"],
      [],
    ) ?? identityFieldsIssue(value.prompt, `${path}.prompt`, ["promptId"], [])
  );
};

const templateIdentityIssue = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  if (!isPlainObject(value)) return undefined;
  const refIssue = identityFieldsIssue(
    value.templateRef,
    `${path}.templateRef`,
    ["templateId"],
    [],
  );
  if (refIssue || !isPlainObject(value.body)) return refIssue;
  const body = value.body;
  const bodyPath = `${path}.body`;
  const bodyIssue = identityFieldsIssue(body, bodyPath, ["templateId"], []);
  if (bodyIssue) return bodyIssue;
  const purposeIssue = identityFieldsIssue(
    body.pedagogicalPurpose,
    `${bodyPath}.pedagogicalPurpose`,
    [],
    ["primarySkillIds"],
  );
  if (purposeIssue) return purposeIssue;
  const kernelIssue = identityFieldsIssue(
    body.kernel,
    `${bodyPath}.kernel`,
    ["activityTypeKey", "rendererKey", "payloadSchemaKey"],
    [],
  );
  if (kernelIssue) return kernelIssue;
  if (isPlainObject(body.policies)) {
    for (const kind of POLICY_KINDS) {
      const policyRefIssue = identityFieldsIssue(
        body.policies[kind],
        `${bodyPath}.policies.${kind}`,
        ["key"],
        [],
      );
      if (policyRefIssue) return policyRefIssue;
    }
  }
  if (isPlainObject(body.capabilityContract)) {
    const fallbackIssue = identityFieldsIssue(
      body.capabilityContract.fallbackTemplateRef,
      `${bodyPath}.capabilityContract.fallbackTemplateRef`,
      ["templateId"],
      [],
    );
    if (fallbackIssue) return fallbackIssue;
  }
  if (isRecordArray(body.fixtures)) {
    for (let index = 0; index < body.fixtures.length; index += 1) {
      const fixtureIssue = identityFieldsIssue(
        body.fixtures[index],
        `${bodyPath}.fixtures[${index}]`,
        ["fixtureId"],
        [],
      );
      if (fixtureIssue) return fixtureIssue;
    }
  }
  const compatibilityIssue = identityFieldsIssue(
    body.compatibility,
    `${bodyPath}.compatibility`,
    ["progressCompatibilityNamespace"],
    [],
  );
  if (compatibilityIssue) return compatibilityIssue;
  if (isPlainObject(body.learningContractRefs)) {
    for (const key of TEMPLATE_LEARNING_REF_KEYS) {
      const learningRefIssue = identityFieldsIssue(
        body.learningContractRefs[key],
        `${bodyPath}.learningContractRefs.${key}`,
        ["id"],
        [],
      );
      if (learningRefIssue) return learningRefIssue;
    }
  }
  if (isPlainObject(body.voiceReleaseRequirements)) {
    const voicePath = `${bodyPath}.voiceReleaseRequirements`;
    const calibrationIssue = identityFieldsIssue(
      body.voiceReleaseRequirements.calibrationReceiptRef,
      `${voicePath}.calibrationReceiptRef`,
      ["receiptId"],
      [],
    );
    if (calibrationIssue) return calibrationIssue;
    const policyIssue = identityFieldsIssue(
      body.voiceReleaseRequirements.voiceDataPolicyRef,
      `${voicePath}.voiceDataPolicyRef`,
      ["policyId"],
      [],
    );
    if (policyIssue) return policyIssue;
    const activeRegistryIssue = identityFieldsIssue(
      body.voiceReleaseRequirements,
      voicePath,
      ["activePolicyRegistryKey"],
      [],
    );
    if (activeRegistryIssue) return activeRegistryIssue;
    return identityFieldsIssue(
      body.voiceReleaseRequirements.networkEgressRef,
      `${voicePath}.networkEgressRef`,
      ["gatewayId"],
      [],
    );
  }
  return undefined;
};

const activityIdentityIssue = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  if (!isPlainObject(value)) return undefined;
  const directIssue = identityFieldsIssue(
    value,
    path,
    ["activityId", "progressCompatibilityKey", "activityTypeKey"],
    ["contentUnitIds", "assetIds"],
  );
  if (directIssue) return directIssue;
  const templateIssue = identityFieldsIssue(
    value.templateRef,
    `${path}.templateRef`,
    ["templateId"],
    [],
  );
  if (templateIssue) return templateIssue;
  const requirementsIssue = identityFieldsIssue(
    value.requirements,
    `${path}.requirements`,
    [],
    ["prompt", "media", "input"],
  );
  if (requirementsIssue) return requirementsIssue;
  const targetsIssue = identityFieldsIssue(
    value.targets,
    `${path}.targets`,
    [],
    ["skillIds", "phraseFrameIds", "semanticSlotIds"],
  );
  if (targetsIssue) return targetsIssue;
  return identityFieldsIssue(
    value.tags,
    `${path}.tags`,
    [],
    ["skillIds", "grammar", "vocabulary", "scenario"],
  );
};

const graphNodeIdentityIssue = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  if (!isPlainObject(value)) return undefined;
  const nodeIssue = identityFieldsIssue(
    value,
    path,
    ["nodeId", "activityId", "transferFromNodeId", "starSlotId"],
    ["variedSemanticSlotIds"],
  );
  if (nodeIssue) return nodeIssue;
  const fallbackIssue = identityFieldsIssue(
    value.fallback,
    `${path}.fallback`,
    ["alternateNodeId"],
    [],
  );
  if (fallbackIssue) return fallbackIssue;
  if (isRecordArray(value.evidenceDeclarations)) {
    for (let index = 0; index < value.evidenceDeclarations.length; index += 1) {
      const declarationIssue = declarationIdentityIssue(
        value.evidenceDeclarations[index],
        `${path}.evidenceDeclarations[${index}]`,
      );
      if (declarationIssue) return declarationIssue;
    }
  }
  return pedagogicalContextIdentityIssue(
    value.pedagogicalContextContract,
    `${path}.pedagogicalContextContract`,
  );
};

const episodeIdentityIssue = (value: unknown): V2ContractIssue | undefined => {
  if (!isPlainObject(value)) return undefined;
  const path = "$.episode";
  const episodeIssue = identityFieldsIssue(
    value,
    path,
    ["episodeId", "seasonId", "chapterId"],
    [
      "objectiveIds",
      "skillIds",
      "grammarDistinctionIds",
      "soundFocusIds",
      "assetIds",
    ],
  );
  if (episodeIssue) return episodeIssue;
  const scenarioIssue = identityFieldsIssue(
    value.scenario,
    `${path}.scenario`,
    ["scenarioId"],
    ["criticalConstraintIds"],
  );
  if (scenarioIssue) return scenarioIssue;
  if (isRecordArray(value.phraseFrames)) {
    for (let index = 0; index < value.phraseFrames.length; index += 1) {
      const phraseIssue = identityFieldsIssue(
        value.phraseFrames[index],
        `${path}.phraseFrames[${index}]`,
        ["phraseFrameId"],
        ["semanticSlotIds", "skillIds"],
      );
      if (phraseIssue) return phraseIssue;
    }
  }
  if (isRecordArray(value.semanticSlots)) {
    for (let index = 0; index < value.semanticSlots.length; index += 1) {
      const slotIssue = identityFieldsIssue(
        value.semanticSlots[index],
        `${path}.semanticSlots[${index}]`,
        ["semanticSlotId"],
        ["allowedContentUnitIds"],
      );
      if (slotIssue) return slotIssue;
    }
  }
  if (isRecordArray(value.criticalConstraints)) {
    for (let index = 0; index < value.criticalConstraints.length; index += 1) {
      const constraintIssue = identityFieldsIssue(
        value.criticalConstraints[index],
        `${path}.criticalConstraints[${index}]`,
        ["criticalConstraintId"],
        [],
      );
      if (constraintIssue) return constraintIssue;
    }
  }
  if (isRecordArray(value.activities)) {
    for (let index = 0; index < value.activities.length; index += 1) {
      const activityIssue = activityIdentityIssue(
        value.activities[index],
        `${path}.activities[${index}]`,
      );
      if (activityIssue) return activityIssue;
    }
  }
  if (isPlainObject(value.graph)) {
    const graphIssue = identityFieldsIssue(
      value.graph,
      `${path}.graph`,
      ["startNodeId", "capstoneNodeId"],
      [],
    );
    if (graphIssue) return graphIssue;
    if (isRecordArray(value.graph.nodes)) {
      for (let index = 0; index < value.graph.nodes.length; index += 1) {
        const nodeIssue = graphNodeIdentityIssue(
          value.graph.nodes[index],
          `${path}.graph.nodes[${index}]`,
        );
        if (nodeIssue) return nodeIssue;
      }
    }
    if (isRecordArray(value.graph.edges)) {
      for (let index = 0; index < value.graph.edges.length; index += 1) {
        const edgeIssue = identityFieldsIssue(
          value.graph.edges[index],
          `${path}.graph.edges[${index}]`,
          ["edgeId", "fromNodeId", "toNodeId"],
          [],
        );
        if (edgeIssue) return edgeIssue;
      }
    }
  }
  if (isRecordArray(value.starSlots)) {
    for (let index = 0; index < value.starSlots.length; index += 1) {
      const starIssue = identityFieldsIssue(
        value.starSlots[index],
        `${path}.starSlots[${index}]`,
        ["starSlotId"],
        ["acceptedNodeIds"],
      );
      if (starIssue) return starIssue;
    }
  }
  const loopIssue = identityFieldsIssue(
    value.requiredLoops,
    `${path}.requiredLoops`,
    [],
    ["encounterBuildNodeIds", "nearTransferNodeIds"],
  );
  if (loopIssue) return loopIssue;
  const assessmentIssue = identityFieldsIssue(
    value.assessmentNodes,
    `${path}.assessmentNodes`,
    [],
    ["independentProbeNodeIds", "optionalReviewNodeIds"],
  );
  if (assessmentIssue) return assessmentIssue;
  const capstoneIssue = identityFieldsIssue(
    value.capstoneContract,
    `${path}.capstoneContract`,
    [],
    [
      "objectiveIds",
      "requiredSemanticSlotIds",
      "criticalConstraintIds",
      "primaryNodeIds",
      "deterministicAlternateNodeIds",
    ],
  );
  if (capstoneIssue) return capstoneIssue;
  if (isPlainObject(value.learningDesign)) {
    const learningPath = `${path}.learningDesign`;
    const learningIssue = identityFieldsIssue(
      value.learningDesign,
      learningPath,
      ["primaryOutcomeId", "independentProbeRef", "delayedWindowPolicyId"],
      ["objectiveIds"],
    );
    if (learningIssue) return learningIssue;
    if (isRecordArray(value.learningDesign.prerequisiteEdges)) {
      for (
        let index = 0;
        index < value.learningDesign.prerequisiteEdges.length;
        index += 1
      ) {
        const edge = value.learningDesign.prerequisiteEdges[index];
        const edgePath = `${learningPath}.prerequisiteEdges[${index}]`;
        const fromIssue = identityFieldsIssue(
          edge.from,
          `${edgePath}.from`,
          ["id", "sourceEpisodeId"],
          [],
        );
        if (fromIssue) return fromIssue;
        const toIssue = identityFieldsIssue(
          edge,
          edgePath,
          ["toObjectiveId"],
          [],
        );
        if (toIssue) return toIssue;
      }
    }
    if (isRecordArray(value.learningDesign.supportPlan)) {
      for (
        let index = 0;
        index < value.learningDesign.supportPlan.length;
        index += 1
      ) {
        const supportIssue = identityFieldsIssue(
          value.learningDesign.supportPlan[index],
          `${learningPath}.supportPlan[${index}]`,
          ["objectiveId", "fadeRuleId", "escalationRuleId"],
          [],
        );
        if (supportIssue) return supportIssue;
      }
    }
    const delayedRefIssue = identityFieldsIssue(
      value.learningDesign.delayedProbeRef,
      `${learningPath}.delayedProbeRef`,
      ["probeId"],
      [],
    );
    if (delayedRefIssue) return delayedRefIssue;
  }
  if (isPlainObject(value.masteryContract)) {
    const masteryPath = `${path}.masteryContract`;
    const policyIssue = identityFieldsIssue(
      value.masteryContract.evidencePolicyRef,
      `${masteryPath}.evidencePolicyRef`,
      ["key"],
      [],
    );
    if (policyIssue) return policyIssue;
    if (isRecordArray(value.masteryContract.requirements)) {
      for (
        let index = 0;
        index < value.masteryContract.requirements.length;
        index += 1
      ) {
        const requirementIssue = identityFieldsIssue(
          value.masteryContract.requirements[index],
          `${masteryPath}.requirements[${index}]`,
          ["objectiveId"],
          [],
        );
        if (requirementIssue) return requirementIssue;
      }
    }
  }
  if (isRecordArray(value.delayedProbeDefinitions)) {
    for (
      let index = 0;
      index < value.delayedProbeDefinitions.length;
      index += 1
    ) {
      const definition = value.delayedProbeDefinitions[index];
      const definitionPath = `${path}.delayedProbeDefinitions[${index}]`;
      const refIssue = identityFieldsIssue(
        definition.ref,
        `${definitionPath}.ref`,
        ["probeId"],
        [],
      );
      if (refIssue || !isPlainObject(definition.body)) return refIssue;
      const body = definition.body;
      const bodyPath = `${definitionPath}.body`;
      const bodyIssue = identityFieldsIssue(
        body,
        bodyPath,
        [
          "probeId",
          "targetEpisodeId",
          "probeNodeId",
          "accessibilityAlternateActivityId",
        ],
        [],
      );
      if (bodyIssue) return bodyIssue;
      const bindingIssue = identityFieldsIssue(
        body.activityBinding,
        `${bodyPath}.activityBinding`,
        ["activityId", "progressCompatibilityKey"],
        [],
      );
      if (bindingIssue) return bindingIssue;
      if (isPlainObject(body.activityBinding)) {
        const templateIssue = identityFieldsIssue(
          body.activityBinding.templateRef,
          `${bodyPath}.activityBinding.templateRef`,
          ["templateId"],
          [],
        );
        if (templateIssue) return templateIssue;
      }
      if (isRecordArray(body.evidenceDeclarations)) {
        for (
          let declarationIndex = 0;
          declarationIndex < body.evidenceDeclarations.length;
          declarationIndex += 1
        ) {
          const declarationIssue = declarationIdentityIssue(
            body.evidenceDeclarations[declarationIndex],
            `${bodyPath}.evidenceDeclarations[${declarationIndex}]`,
          );
          if (declarationIssue) return declarationIssue;
        }
      }
      const contextIssue = pedagogicalContextIdentityIssue(
        body.pedagogicalContextContract,
        `${bodyPath}.pedagogicalContextContract`,
      );
      if (contextIssue) return contextIssue;
    }
  }
  if (isRecordArray(value.reviewLinks)) {
    for (let index = 0; index < value.reviewLinks.length; index += 1) {
      const link = value.reviewLinks[index];
      const linkPath = `${path}.reviewLinks[${index}]`;
      const linkIssue = identityFieldsIssue(
        link,
        linkPath,
        ["targetEpisodeId", "windowPolicyId"],
        ["skillIds"],
      );
      if (linkIssue) return linkIssue;
      const probeIssue = identityFieldsIssue(
        link.probeRef,
        `${linkPath}.probeRef`,
        ["probeId"],
        [],
      );
      if (probeIssue) return probeIssue;
    }
  }
  if (isRecordArray(value.accessibilityRoutes)) {
    for (let index = 0; index < value.accessibilityRoutes.length; index += 1) {
      const routeIssue = identityFieldsIssue(
        value.accessibilityRoutes[index],
        `${path}.accessibilityRoutes[${index}]`,
        ["routeId"],
        ["nodeIds", "reachableStarSlotIds"],
      );
      if (routeIssue) return routeIssue;
    }
  }
  return undefined;
};

const curriculumMaterialIdentityIssue = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined =>
  identityFieldsIssue(
    value,
    path,
    [],
    [
      "skillIds",
      "phraseFrameIds",
      "grammarDistinctionIds",
      "semanticSlotIds",
      "criticalConstraintIds",
    ],
  );

const curriculumIdentityIssue = (
  value: unknown,
): V2ContractIssue | undefined => {
  if (!isPlainObject(value)) return undefined;
  const path = "$.curriculum";
  const curriculumIssue = identityFieldsIssue(
    value,
    path,
    ["curriculumId", "seasonId"],
    ["requiredAssetIds", "requiredCapabilityKeys"],
  );
  if (curriculumIssue) return curriculumIssue;
  const registryIssue = identityFieldsIssue(
    value.decisionRegistryRef,
    `${path}.decisionRegistryRef`,
    ["id"],
    [],
  );
  if (registryIssue) return registryIssue;
  if (isRecordArray(value.chapters)) {
    for (let index = 0; index < value.chapters.length; index += 1) {
      const chapterIssue = identityFieldsIssue(
        value.chapters[index],
        `${path}.chapters[${index}]`,
        ["chapterId", "checkpointEpisodeId"],
        ["episodeIds"],
      );
      if (chapterIssue) return chapterIssue;
    }
  }
  if (isRecordArray(value.episodeRefs)) {
    for (let index = 0; index < value.episodeRefs.length; index += 1) {
      const episodeRef = value.episodeRefs[index];
      const episodePath = `${path}.episodeRefs[${index}]`;
      const episodeIssue = identityFieldsIssue(
        episodeRef,
        episodePath,
        ["episodeId", "chapterId"],
        ["prerequisiteEpisodeIds"],
      );
      if (episodeIssue) return episodeIssue;
      const introducedIssue = curriculumMaterialIdentityIssue(
        episodeRef.introducedMaterial,
        `${episodePath}.introducedMaterial`,
      );
      if (introducedIssue) return introducedIssue;
      const requiredIssue = curriculumMaterialIdentityIssue(
        episodeRef.requiredCheckpointMaterial,
        `${episodePath}.requiredCheckpointMaterial`,
      );
      if (requiredIssue) return requiredIssue;
    }
  }
  return undefined;
};

const learningPackageIdentityIssue = (
  root: JsonObject,
): V2ContractIssue | undefined => {
  if (isPlainObject(root.dependencies)) {
    const dependencies = root.dependencies;
    if (isRecordArray(dependencies.templates)) {
      for (let index = 0; index < dependencies.templates.length; index += 1) {
        const currentIssue = templateIdentityIssue(
          dependencies.templates[index],
          `$.dependencies.templates[${index}]`,
        );
        if (currentIssue) return currentIssue;
      }
    }
    if (isRecordArray(dependencies.policies)) {
      for (let index = 0; index < dependencies.policies.length; index += 1) {
        const policy = dependencies.policies[index];
        const policyPath = `$.dependencies.policies[${index}]`;
        const refIssue = identityFieldsIssue(
          policy.ref,
          `${policyPath}.ref`,
          ["key"],
          [],
        );
        if (refIssue) return refIssue;
        const bodyIssue = identityFieldsIssue(
          policy.body,
          `${policyPath}.body`,
          ["key"],
          ["compatibleKernelKeys"],
        );
        if (bodyIssue) return bodyIssue;
      }
    }
    const dependencyIssue = identityFieldsIssue(
      dependencies,
      "$.dependencies",
      [],
      ["fadeRuleIds", "escalationRuleIds", "assetIds", "contentUnitIds"],
    );
    if (dependencyIssue) return dependencyIssue;
  }
  return (
    episodeIdentityIssue(root.episode) ??
    curriculumIdentityIssue(root.curriculum)
  );
};

const validateTemplateRefShape = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  const shapeIssue = oneExactObjectIssue(
    value,
    ["templateId", "version", "contentHash"],
    [],
    path,
  );
  if (shapeIssue) return shapeIssue;
  const ref = value as JsonObject;
  if (
    !isNonEmptyString(ref.templateId) ||
    !isPositiveInteger(ref.version) ||
    typeof ref.contentHash !== "string" ||
    !HASH_PATTERN.test(ref.contentHash)
  ) {
    return issue("field_value_invalid", path);
  }
  return undefined;
};

const validatePolicyRefShape = (
  value: unknown,
  path: string,
  expectedKind?: (typeof POLICY_KINDS)[number],
): V2ContractIssue | undefined => {
  const shapeIssue = oneExactObjectIssue(
    value,
    ["kind", "key", "version", "contentHash"],
    [],
    path,
  );
  if (shapeIssue) return shapeIssue;
  const ref = value as JsonObject;
  if (
    !POLICY_KINDS.includes(ref.kind as (typeof POLICY_KINDS)[number]) ||
    (expectedKind !== undefined && ref.kind !== expectedKind) ||
    !isNonEmptyString(ref.key) ||
    !isPositiveInteger(ref.version) ||
    typeof ref.contentHash !== "string" ||
    !HASH_PATTERN.test(ref.contentHash)
  ) {
    return issue("field_value_invalid", path);
  }
  return undefined;
};

const validateCapabilitiesShape = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  const shapeIssue = oneExactObjectIssue(
    value,
    ["microphone", "speechRecognition", "audioPlayback", "network"],
    [],
    path,
  );
  if (shapeIssue) return shapeIssue;
  const capabilities = value as JsonObject;
  if (
    !["none", "optional", "required"].includes(
      String(capabilities.microphone),
    ) ||
    !["none", "optional", "required"].includes(
      String(capabilities.speechRecognition),
    ) ||
    typeof capabilities.audioPlayback !== "boolean" ||
    !["none", "preferred", "required"].includes(String(capabilities.network))
  ) {
    return issue("field_value_invalid", path);
  }
  return undefined;
};

const validatePolicyDescriptorShape = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  const descriptorShape = oneExactObjectIssue(
    value,
    POLICY_DESCRIPTOR_KEYS,
    [],
    path,
  );
  if (descriptorShape) return descriptorShape;
  const descriptor = value as JsonObject;
  const refIssue = validatePolicyRefShape(descriptor.ref, `${path}.ref`);
  if (refIssue) return refIssue;
  const bodyShape = oneExactObjectIssue(
    descriptor.body,
    POLICY_BODY_KEYS,
    [],
    `${path}.body`,
  );
  if (bodyShape) return bodyShape;
  const ref = descriptor.ref as JsonObject;
  const body = descriptor.body as JsonObject;
  const claims = [
    "completion",
    "accuracy",
    "spoken_attempt",
    "spoken_confident",
    "acoustic_pronunciation",
    "transfer",
  ];
  if (
    body.schemaVersion !== "content-studio-policy-body.v1" ||
    !POLICY_KINDS.includes(body.kind as (typeof POLICY_KINDS)[number]) ||
    !isNonEmptyString(body.key) ||
    !isPositiveInteger(body.version) ||
    !isNonEmptyString(body.humanName) ||
    !isNonEmptyString(body.description) ||
    !isStringArray(body.compatibleFamilies) ||
    body.compatibleFamilies.some(
      (family) =>
        !V2_ACTIVITY_FAMILIES.includes(
          family as (typeof V2_ACTIVITY_FAMILIES)[number],
        ),
    ) ||
    !isStringArray(body.compatibleKernelKeys) ||
    body.compatibleKernelKeys.some((key) => key.length === 0) ||
    !isStringArray(body.configurableFieldPaths) ||
    !isStringArray(body.evidenceKinds) ||
    body.evidenceKinds.some(
      (kind) =>
        !["semantic", "listening", "recall", "spoken", "interaction"].includes(
          kind,
        ),
    ) ||
    !isStringArray(body.claims) ||
    body.claims.some((claim) => !claims.includes(claim))
  ) {
    return issue("field_value_invalid", `${path}.body`);
  }
  if (
    ref.kind !== body.kind ||
    ref.key !== body.key ||
    ref.version !== body.version
  ) {
    return issue("policy_identity_mismatch", `${path}.ref`);
  }
  if (ref.contentHash !== hashCanonicalBody(body)) {
    return issue("policy_content_hash_mismatch", `${path}.ref.contentHash`);
  }
  return undefined;
};

const validateLocalizedValuesShape = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  if (!isRecordArray(value) || value.length === 0)
    return issue("field_type_invalid", path);
  for (let index = 0; index < value.length; index += 1) {
    const itemPath = `${path}[${index}]`;
    const shapeIssue = oneExactObjectIssue(
      value[index],
      ["locale", "value", "sourceHash"],
      [],
      itemPath,
    );
    if (shapeIssue) return shapeIssue;
    const item = value[index];
    if (
      !isNonEmptyString(item.locale) ||
      !isNonEmptyString(item.value) ||
      typeof item.sourceHash !== "string" ||
      !HASH_PATTERN.test(item.sourceHash)
    ) {
      return issue("field_value_invalid", itemPath);
    }
  }
  return undefined;
};

const validateVersionRefShape = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  const shapeIssue = oneExactObjectIssue(
    value,
    ["id", "version", "contentHash"],
    [],
    path,
  );
  if (shapeIssue) return shapeIssue;
  const ref = value as JsonObject;
  if (
    !isNonEmptyString(ref.id) ||
    !isPositiveInteger(ref.version) ||
    typeof ref.contentHash !== "string" ||
    !HASH_PATTERN.test(ref.contentHash)
  ) {
    return issue("field_value_invalid", path);
  }
  return undefined;
};

export const validateVoiceReleaseRequirementsShape = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  if (!isPlainObject(value)) return issue("field_type_invalid", path);
  const onDevice = value.processingMode === "on_device_only";
  const network =
    value.processingMode === "network_allowed" ||
    value.processingMode === "network_required";
  if (!onDevice && !network)
    return issue("field_value_invalid", `${path}.processingMode`);
  const requiredKeys = network
    ? [
        "allowedTaskTypes",
        "processingMode",
        "voiceDataPolicyRef",
        "activePolicyRegistryKey",
        "requiredNetworkPurposes",
        "networkEgressRef",
      ]
    : ["allowedTaskTypes", "processingMode"];
  const shapeIssue = oneExactObjectIssue(
    value,
    requiredKeys,
    ["calibrationReceiptRef"],
    path,
  );
  if (shapeIssue) return shapeIssue;
  if (
    !isStringArray(value.allowedTaskTypes) ||
    value.allowedTaskTypes.length === 0 ||
    value.allowedTaskTypes.some(
      (taskType) => !["scripted", "spontaneous"].includes(taskType),
    ) ||
    uniqueSecondIndex(value.allowedTaskTypes) >= 0
  ) {
    return issue("field_value_invalid", `${path}.allowedTaskTypes`);
  }
  if (hasOwn(value, "calibrationReceiptRef")) {
    const calibrationPath = `${path}.calibrationReceiptRef`;
    const calibrationShape = oneExactObjectIssue(
      value.calibrationReceiptRef,
      ["receiptId", "version", "contentHash"],
      [],
      calibrationPath,
    );
    if (calibrationShape) return calibrationShape;
    const calibration = value.calibrationReceiptRef as JsonObject;
    if (
      !isNonEmptyString(calibration.receiptId) ||
      !isPositiveInteger(calibration.version) ||
      typeof calibration.contentHash !== "string" ||
      !HASH_PATTERN.test(calibration.contentHash)
    ) {
      return issue("field_value_invalid", calibrationPath);
    }
  }
  if (!network) return undefined;
  const policyPath = `${path}.voiceDataPolicyRef`;
  const policyShape = oneExactObjectIssue(
    value.voiceDataPolicyRef,
    ["policyId", "version", "contentHash"],
    [],
    policyPath,
  );
  if (policyShape) return policyShape;
  const policy = value.voiceDataPolicyRef as JsonObject;
  if (
    !isNonEmptyString(policy.policyId) ||
    !isPositiveInteger(policy.version) ||
    typeof policy.contentHash !== "string" ||
    !HASH_PATTERN.test(policy.contentHash)
  ) {
    return issue("field_value_invalid", policyPath);
  }
  if (
    !isNonEmptyString(value.activePolicyRegistryKey) ||
    !isStringArray(value.requiredNetworkPurposes) ||
    value.requiredNetworkPurposes.length === 0 ||
    value.requiredNetworkPurposes.some(
      (purpose) =>
        ![
          "recognition",
          "speech_scoring",
          "club_reply",
          "safety_review",
        ].includes(purpose),
    ) ||
    uniqueSecondIndex(value.requiredNetworkPurposes) >= 0
  ) {
    return issue("field_value_invalid", path);
  }
  const egressPath = `${path}.networkEgressRef`;
  const egressShape = oneExactObjectIssue(
    value.networkEgressRef,
    ["gatewayId", "version", "contentHash"],
    [],
    egressPath,
  );
  if (egressShape) return egressShape;
  const egress = value.networkEgressRef as JsonObject;
  if (
    egress.gatewayId !== "voice-network-egress" ||
    !isPositiveInteger(egress.version) ||
    typeof egress.contentHash !== "string" ||
    !HASH_PATTERN.test(egress.contentHash)
  ) {
    return issue("field_value_invalid", egressPath);
  }
  return undefined;
};

const validateTemplateArtifactBodyShape = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  if (!isPlainObject(value)) return issue("field_type_invalid", path);
  if (value.schemaVersion !== "v2-mode-template-body.v1") {
    return issue("field_value_invalid", `${path}.schemaVersion`);
  }
  const bodyShape = oneExactObjectIssue(
    value,
    TEMPLATE_BODY_KEYS,
    TEMPLATE_BODY_OPTIONAL_KEYS,
    path,
  );
  if (bodyShape) return bodyShape;
  if (
    !isNonEmptyString(value.templateId) ||
    !isPositiveInteger(value.version) ||
    !V2_ACTIVITY_FAMILIES.includes(
      value.family as (typeof V2_ACTIVITY_FAMILIES)[number],
    ) ||
    !isNonEmptyString(value.humanName) ||
    !isNonEmptyString(value.description)
  ) {
    return issue("field_value_invalid", path);
  }

  const purposePath = `${path}.pedagogicalPurpose`;
  const purposeShape = oneExactObjectIssue(
    value.pedagogicalPurpose,
    TEMPLATE_PURPOSE_KEYS,
    [],
    purposePath,
  );
  if (purposeShape) return purposeShape;
  const purpose = value.pedagogicalPurpose as JsonObject;
  const purposePhases = [
    "discover",
    "comprehend",
    "controlled_production",
    "guided_transfer",
    "free_transfer",
    "review",
    "checkpoint",
  ];
  const modalities = ["reading", "listening", "writing", "speaking"];
  if (
    !purposePhases.includes(String(purpose.phase)) ||
    !isStringArray(purpose.primarySkillIds) ||
    purpose.primarySkillIds.length === 0 ||
    purpose.primarySkillIds.some((skillId) => !isNonEmptyString(skillId)) ||
    !isStringArray(purpose.modalities) ||
    purpose.modalities.length === 0 ||
    purpose.modalities.some((modality) => !modalities.includes(modality)) ||
    !isPositiveInteger(purpose.estimatedSeconds)
  ) {
    return issue("field_value_invalid", purposePath);
  }
  const invalidPrimarySkillIndex = purpose.primarySkillIds.findIndex(
    (skillId) => !V2_IDENTITY_REGEX.test(skillId),
  );
  if (invalidPrimarySkillIndex >= 0) {
    return issue(
      "identity_invalid",
      `${purposePath}.primarySkillIds[${invalidPrimarySkillIndex}]`,
    );
  }

  const kernelPath = `${path}.kernel`;
  const kernelShape = oneExactObjectIssue(
    value.kernel,
    TEMPLATE_KERNEL_KEYS,
    [],
    kernelPath,
  );
  if (kernelShape) return kernelShape;
  const kernel = value.kernel as JsonObject;
  if (
    !isNonEmptyString(kernel.activityTypeKey) ||
    !isPositiveInteger(kernel.kernelVersion) ||
    !isNonEmptyString(kernel.rendererKey) ||
    !isPositiveInteger(kernel.rendererSchemaVersion) ||
    !isNonEmptyString(kernel.payloadSchemaKey) ||
    !isPositiveInteger(kernel.payloadSchemaVersion) ||
    typeof kernel.payloadSchemaHash !== "string" ||
    !HASH_PATTERN.test(kernel.payloadSchemaHash)
  ) {
    return issue("field_value_invalid", kernelPath);
  }

  if (!isPlainObject(value.policies))
    return issue("field_type_invalid", `${path}.policies`);
  const policyExtra = Object.keys(value.policies)
    .filter(
      (key) => !POLICY_KINDS.includes(key as (typeof POLICY_KINDS)[number]),
    )
    .sort()[0];
  if (policyExtra)
    return issue(
      "activity_policy_set_invalid",
      `${path}.policies.${policyExtra}`,
    );
  for (const kind of POLICY_KINDS) {
    if (!hasOwn(value.policies, kind)) {
      return issue("activity_policy_set_invalid", `${path}.policies.${kind}`);
    }
    const policyRefIssue = validatePolicyRefShape(
      value.policies[kind],
      `${path}.policies.${kind}`,
    );
    if (policyRefIssue) return policyRefIssue;
    if ((value.policies[kind] as JsonObject).kind !== kind) {
      return issue(
        "activity_policy_ref_mismatch",
        `${path}.policies.${kind}.kind`,
      );
    }
  }

  const authoringPath = `${path}.authoring`;
  const authoringShape = oneExactObjectIssue(
    value.authoring,
    TEMPLATE_AUTHORING_KEYS,
    [],
    authoringPath,
  );
  if (authoringShape) return authoringShape;
  const authoring = value.authoring as JsonObject;
  if (
    !isStringArray(authoring.editableFieldPaths) ||
    !isStringArray(authoring.requiredFieldPaths) ||
    !isPlainObject(authoring.defaultValues) ||
    !isStringArray(authoring.allowedOverridePaths)
  ) {
    return issue("field_type_invalid", authoringPath);
  }

  const capabilityPath = `${path}.capabilityContract`;
  const capabilityShape = oneExactObjectIssue(
    value.capabilityContract,
    TEMPLATE_CAPABILITY_KEYS,
    ["fallbackTemplateRef"],
    capabilityPath,
  );
  if (capabilityShape) return capabilityShape;
  const capability = value.capabilityContract as JsonObject;
  if (
    !["none", "optional", "required"].includes(String(capability.microphone)) ||
    !["none", "optional", "required"].includes(
      String(capability.speechRecognition),
    ) ||
    typeof capability.audioPlayback !== "boolean" ||
    !["none", "preferred", "required"].includes(String(capability.network))
  ) {
    return issue("field_value_invalid", capabilityPath);
  }
  if (hasOwn(capability, "fallbackTemplateRef")) {
    const fallbackIssue = validateTemplateRefShape(
      capability.fallbackTemplateRef,
      `${capabilityPath}.fallbackTemplateRef`,
    );
    if (fallbackIssue) return fallbackIssue;
  }

  const claims = [
    "completion",
    "accuracy",
    "spoken_attempt",
    "spoken_confident",
    "acoustic_pronunciation",
    "transfer",
  ];
  if (
    !isStringArray(value.evidenceClaims) ||
    value.evidenceClaims.some((claim) => !claims.includes(claim)) ||
    uniqueSecondIndex(value.evidenceClaims) >= 0
  ) {
    return issue("field_value_invalid", `${path}.evidenceClaims`);
  }

  const copyPath = `${path}.learnerCopy`;
  const copyShape = oneExactObjectIssue(
    value.learnerCopy,
    TEMPLATE_COPY_KEYS,
    [],
    copyPath,
  );
  if (copyShape) return copyShape;
  const copy = value.learnerCopy as JsonObject;
  for (const key of TEMPLATE_COPY_KEYS) {
    const localizedIssue = validateLocalizedValuesShape(
      copy[key],
      `${copyPath}.${key}`,
    );
    if (localizedIssue) return localizedIssue;
    const locales = (copy[key] as JsonObject[]).map((entry) => entry.locale);
    if (uniqueSecondIndex(locales) >= 0)
      return issue("field_value_invalid", `${copyPath}.${key}`);
  }

  if (!isRecordArray(value.fixtures) || value.fixtures.length === 0) {
    return issue("field_type_invalid", `${path}.fixtures`);
  }
  for (let index = 0; index < value.fixtures.length; index += 1) {
    const fixturePath = `${path}.fixtures[${index}]`;
    const fixtureShape = oneExactObjectIssue(
      value.fixtures[index],
      TEMPLATE_FIXTURE_KEYS,
      ["expectedResultKind"],
      fixturePath,
    );
    if (fixtureShape) return fixtureShape;
    const fixture = value.fixtures[index];
    if (
      !isNonEmptyString(fixture.fixtureId) ||
      !isNonEmptyString(fixture.label) ||
      ![
        "prompt",
        "active",
        "processing",
        "success",
        "needs_work",
        "recovery",
      ].includes(String(fixture.state)) ||
      (hasOwn(fixture, "expectedResultKind") &&
        !isNonEmptyString(fixture.expectedResultKind))
    ) {
      return issue("field_value_invalid", fixturePath);
    }
  }

  const compatibilityPath = `${path}.compatibility`;
  const compatibilityShape = oneExactObjectIssue(
    value.compatibility,
    TEMPLATE_COMPATIBILITY_KEYS,
    [],
    compatibilityPath,
  );
  if (compatibilityShape) return compatibilityShape;
  const compatibility = value.compatibility as JsonObject;
  if (
    !isNonEmptyString(compatibility.minAppVersion) ||
    !isStringArray(compatibility.requiredSupportManifestHashes) ||
    compatibility.requiredSupportManifestHashes.length === 0 ||
    compatibility.requiredSupportManifestHashes.some(
      (hash) => !HASH_PATTERN.test(hash),
    ) ||
    !isNonEmptyString(compatibility.progressCompatibilityNamespace)
  ) {
    return issue("field_value_invalid", compatibilityPath);
  }

  const learningPath = `${path}.learningContractRefs`;
  const learningShape = oneExactObjectIssue(
    value.learningContractRefs,
    TEMPLATE_LEARNING_REF_KEYS,
    [],
    learningPath,
  );
  if (learningShape) return learningShape;
  const learningRefs = value.learningContractRefs as JsonObject;
  for (const key of TEMPLATE_LEARNING_REF_KEYS) {
    const refIssue = validateVersionRefShape(
      learningRefs[key],
      `${learningPath}.${key}`,
    );
    if (refIssue) return refIssue;
  }
  if (hasOwn(value, "voiceReleaseRequirements")) {
    return validateVoiceReleaseRequirementsShape(
      value.voiceReleaseRequirements,
      `${path}.voiceReleaseRequirements`,
    );
  }
  return undefined;
};

/** Public adapter for immutable Content Studio ModeTemplate resolvers. */
export const validateModeTemplateArtifactBody = (
  input: unknown,
): V2ContractValidationResult<ModeTemplateArtifactBody> => {
  const issueResult = validateTemplateArtifactBodyShape(input, "$.template");
  return issueResult
    ? fail([issueResult])
    : pass(input as ModeTemplateArtifactBody);
};

/** Shared strict validator for the mutable ModeTemplate lifecycle projection. */
export const validateModeTemplateLifecycleHead = (
  input: unknown,
): V2ContractValidationResult<ModeTemplateLifecycleHead> => {
  if (!isPlainObject(input))
    return fail([issue("mode_template_lifecycle_invalid", "$")]);
  const allowed = [
    "schemaVersion",
    "templateId",
    "version",
    "contentHash",
    "status",
    "reason",
    "replacementRef",
    "noReplacement",
    "changedBy",
    "changedAt",
    "lifecycleRevision",
  ];
  const required = [
    "schemaVersion",
    "templateId",
    "version",
    "contentHash",
    "status",
    "reason",
    "changedBy",
    "changedAt",
    "lifecycleRevision",
  ];
  if (
    Object.keys(input).some((key) => !allowed.includes(key)) ||
    required.some((key) => !hasOwn(input, key))
  )
    return fail([issue("mode_template_lifecycle_keys_invalid", "$")]);
  if (
    input.schemaVersion !== "v2-mode-template-lifecycle.v1" ||
    typeof input.templateId !== "string" ||
    input.templateId.length === 0 ||
    !Number.isSafeInteger(input.version) ||
    Number(input.version) < 1 ||
    typeof input.contentHash !== "string" ||
    !HASH_PATTERN.test(input.contentHash) ||
    !["approved", "published", "deprecated", "archived"].includes(
      String(input.status),
    ) ||
    typeof input.reason !== "string" ||
    input.reason.length === 0 ||
    typeof input.changedBy !== "string" ||
    input.changedBy.length === 0 ||
    typeof input.changedAt !== "string" ||
    input.changedAt.length === 0 ||
    !Number.isSafeInteger(input.lifecycleRevision) ||
    Number(input.lifecycleRevision) < 1
  )
    return fail([issue("mode_template_lifecycle_fields_invalid", "$")]);
  const hasReplacement = hasOwn(input, "replacementRef");
  const hasNoReplacement = hasOwn(input, "noReplacement");
  if (hasNoReplacement && input.noReplacement !== true)
    return fail([
      issue(
        "mode_template_lifecycle_no_replacement_invalid",
        "$.noReplacement",
      ),
    ]);
  if (hasReplacement) {
    if (!isPlainObject(input.replacementRef))
      return fail([
        issue(
          "mode_template_lifecycle_replacement_invalid",
          "$.replacementRef",
        ),
      ]);
    const replacement = input.replacementRef;
    if (
      Object.keys(replacement).some(
        (key) => !["templateId", "version", "contentHash"].includes(key),
      ) ||
      !["templateId", "version", "contentHash"].every((key) =>
        hasOwn(replacement, key),
      ) ||
      typeof replacement.templateId !== "string" ||
      !/^[A-Za-z0-9._-]{1,160}$/.test(replacement.templateId) ||
      !Number.isSafeInteger(replacement.version) ||
      Number(replacement.version) < 1 ||
      typeof replacement.contentHash !== "string" ||
      !HASH_PATTERN.test(replacement.contentHash)
    )
      return fail([
        issue(
          "mode_template_lifecycle_replacement_invalid",
          "$.replacementRef",
        ),
      ]);
    if (
      replacement.templateId === input.templateId &&
      replacement.version === input.version &&
      replacement.contentHash === input.contentHash
    )
      return fail([
        issue(
          "mode_template_lifecycle_replacement_self_reference",
          "$.replacementRef",
        ),
      ]);
  }
  if (input.status === "deprecated" && hasReplacement === hasNoReplacement)
    return fail([
      issue("mode_template_lifecycle_deprecation_choice_invalid", "$"),
    ]);
  if (input.status === "published" && (hasReplacement || hasNoReplacement))
    return fail([
      issue("mode_template_lifecycle_published_metadata_invalid", "$"),
    ]);
  if (input.status === "archived" && (hasReplacement || hasNoReplacement))
    return fail([
      issue("mode_template_lifecycle_archived_metadata_invalid", "$"),
    ]);
  return pass(input as unknown as ModeTemplateLifecycleHead);
};

const CONTENT_RECEIPT_ENTITY_TYPES = new Set([
  "mode_template",
  "activity_instance",
  "episode",
  "season",
  "release_manifest",
]);

export const validateContentReceiptSubject = (
  input: unknown,
): V2ContractValidationResult<ContentReceiptSubject> => {
  if (
    !isPlainObject(input) ||
    Object.keys(input).length !== 4 ||
    !["entityType", "entityId", "entityRevision", "entityFingerprint"].every(
      (key) => hasOwn(input, key),
    ) ||
    !CONTENT_RECEIPT_ENTITY_TYPES.has(String(input.entityType)) ||
    typeof input.entityId !== "string" ||
    input.entityId.length === 0 ||
    !Number.isSafeInteger(input.entityRevision) ||
    Number(input.entityRevision) < 1 ||
    typeof input.entityFingerprint !== "string" ||
    !HASH_PATTERN.test(input.entityFingerprint)
  )
    return fail([issue("content_receipt_subject_invalid", "$.subject")]);
  return pass(input as unknown as ContentReceiptSubject);
};

export const validateContentGateReceiptBody = (
  input: unknown,
): V2ContractValidationResult<ContentGateReceiptBody> => {
  if (!isPlainObject(input))
    return fail([issue("content_gate_receipt_invalid", "$")]);
  const required = [
    "schemaVersion",
    "gateKind",
    "subject",
    "validationReceiptHash",
    "localizationReceiptSetHash",
    "reviewReceiptHash",
    "waiverSetHash",
    "evaluatedBy",
    "evaluatedAt",
  ];
  const allowed = [...required, "devicePreviewReceiptHashes"];
  if (
    Object.keys(input).some((key) => !allowed.includes(key)) ||
    required.some((key) => !hasOwn(input, key))
  )
    return fail([issue("content_gate_receipt_keys_invalid", "$")]);
  const subject = validateContentReceiptSubject(input.subject);
  if (!subject.ok) return fail(subject.issues);
  if (
    input.schemaVersion !== "content-gate-receipt-body.v1" ||
    !["approval", "release_seal"].includes(String(input.gateKind)) ||
    ![
      "validationReceiptHash",
      "localizationReceiptSetHash",
      "reviewReceiptHash",
      "waiverSetHash",
    ].every(
      (key) =>
        typeof input[key] === "string" && HASH_PATTERN.test(String(input[key])),
    ) ||
    typeof input.evaluatedBy !== "string" ||
    input.evaluatedBy.length === 0 ||
    typeof input.evaluatedAt !== "string" ||
    input.evaluatedAt.length === 0
  )
    return fail([issue("content_gate_receipt_fields_invalid", "$")]);
  if (hasOwn(input, "devicePreviewReceiptHashes")) {
    const previews = input.devicePreviewReceiptHashes;
    if (
      !isPlainObject(previews) ||
      Object.keys(previews).length !== 2 ||
      !["ios", "android"].every((key) => hasOwn(previews, key)) ||
      typeof previews.ios !== "string" ||
      !HASH_PATTERN.test(previews.ios) ||
      typeof previews.android !== "string" ||
      !HASH_PATTERN.test(previews.android)
    )
      return fail([
        issue(
          "content_gate_receipt_preview_hashes_invalid",
          "$.devicePreviewReceiptHashes",
        ),
      ]);
  }
  return pass(input as unknown as ContentGateReceiptBody);
};

const validateEvidenceDeclarationShape = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  const declarationShape = oneExactObjectIssue(
    value,
    DECLARATION_KEYS,
    [],
    path,
  );
  if (declarationShape) return declarationShape;
  const declaration = value as JsonObject;
  if (
    !isNonEmptyString(declaration.objectiveId) ||
    !isNonEmptyString(declaration.skillId) ||
    !["semantic", "listening", "recall", "spoken", "interaction"].includes(
      String(declaration.construct),
    ) ||
    ![
      "encounter_build",
      "near_transfer",
      "independent_probe",
      "delayed_probe",
    ].includes(String(declaration.phase))
  ) {
    return issue(
      "field_value_invalid",
      !["semantic", "listening", "recall", "spoken", "interaction"].includes(
        String(declaration.construct),
      )
        ? `${path}.construct`
        : path,
    );
  }
  const targetPath = `${path}.target`;
  const targetShape = oneExactObjectIssue(
    declaration.target,
    ["targetKind", "targetId"],
    [],
    targetPath,
  );
  if (targetShape) return targetShape;
  const target = declaration.target as JsonObject;
  if (
    !["objective", "semantic_slot", "critical_constraint"].includes(
      String(target.targetKind),
    )
  ) {
    return issue("field_value_invalid", `${targetPath}.targetKind`);
  }
  if (!isNonEmptyString(target.targetId))
    return issue("field_value_invalid", `${targetPath}.targetId`);
  return undefined;
};

const validatePedagogicalContextShape = (
  value: unknown,
  path: string,
  expectedPhase: unknown,
): V2ContractIssue | undefined => {
  const shapeIssue = oneExactObjectIssue(
    value,
    [
      "phase",
      "allowedSupportLevels",
      "maximumHints",
      "answerExposure",
      "context",
      "prompt",
    ],
    [],
    path,
  );
  if (shapeIssue) return shapeIssue;
  const contract = value as JsonObject;
  if (contract.phase !== expectedPhase) {
    return issue("phase_contract_mismatch", `${path}.phase`);
  }
  const contextShape = oneExactObjectIssue(
    contract.context,
    ["contextId", "surfaceFormId", "novelty"],
    ["newSurfaceForm"],
    `${path}.context`,
  );
  if (contextShape) return contextShape;
  const promptShape = oneExactObjectIssue(
    contract.prompt,
    ["promptId", "reusedFromTraining"],
    ["separatePrompt"],
    `${path}.prompt`,
  );
  if (promptShape) return promptShape;
  const context = contract.context as JsonObject;
  const prompt = contract.prompt as JsonObject;
  const supportLevels = [
    "model",
    "full_text",
    "partial_cue",
    "visual_only",
    "none",
  ];
  if (!isStringArray(contract.allowedSupportLevels)) {
    return issue("field_value_invalid", path);
  }
  if (
    expectedPhase === "independent_probe" ||
    expectedPhase === "delayed_probe"
  ) {
    const assessmentSupportLevels = ["partial_cue", "visual_only", "none"];
    if (
      contract.allowedSupportLevels.length === 0 ||
      uniqueSecondIndex(contract.allowedSupportLevels) >= 0 ||
      contract.allowedSupportLevels.some(
        (level) => !assessmentSupportLevels.includes(level),
      )
    ) {
      return issue(
        expectedPhase === "delayed_probe"
          ? "delayed_probe_context_invalid"
          : "independent_context_invalid",
        path,
      );
    }
  }
  if (
    contract.allowedSupportLevels.some(
      (level) => !supportLevels.includes(level),
    ) ||
    !Number.isSafeInteger(contract.maximumHints) ||
    Number(contract.maximumHints) < 0 ||
    !["allowed", "forbidden"].includes(String(contract.answerExposure)) ||
    !isNonEmptyString(context.contextId) ||
    !isNonEmptyString(context.surfaceFormId) ||
    !["trained", "varied", "novel"].includes(String(context.novelty)) ||
    !isNonEmptyString(prompt.promptId) ||
    typeof prompt.reusedFromTraining !== "boolean"
  ) {
    return issue("field_value_invalid", path);
  }
  if (
    expectedPhase === "independent_probe" ||
    expectedPhase === "delayed_probe"
  ) {
    if (
      contract.maximumHints !== 0 ||
      contract.answerExposure !== "forbidden" ||
      prompt.reusedFromTraining !== false ||
      prompt.separatePrompt !== true ||
      !["varied", "novel"].includes(String(context.novelty)) ||
      (expectedPhase === "delayed_probe" && context.newSurfaceForm !== true)
    ) {
      return issue(
        expectedPhase === "delayed_probe"
          ? "delayed_probe_context_invalid"
          : "independent_context_invalid",
        path,
      );
    }
  }
  return undefined;
};

const validateFallbackShape = (
  value: unknown,
  path: string,
): V2ContractIssue | undefined => {
  const shapeIssue = oneExactObjectIssue(
    value,
    [
      "policy",
      "reasonCodes",
      "coreCompletionEquivalent",
      "voiceEvidenceEquivalent",
    ],
    ["alternateNodeId"],
    path,
  );
  if (shapeIssue) return shapeIssue;
  const fallback = value as JsonObject;
  const reasons = [
    "permission_denied",
    "microphone_unavailable",
    "speech_locale_unsupported",
    "network_unavailable",
    "accessibility_preference",
  ];
  if (
    !["same_node", "alternate_node"].includes(String(fallback.policy)) ||
    !isStringArray(fallback.reasonCodes) ||
    fallback.reasonCodes.some((reason) => !reasons.includes(reason)) ||
    typeof fallback.coreCompletionEquivalent !== "boolean" ||
    fallback.voiceEvidenceEquivalent !== false ||
    (fallback.policy === "alternate_node" &&
      !isNonEmptyString(fallback.alternateNodeId)) ||
    (fallback.policy === "same_node" && hasOwn(fallback, "alternateNodeId"))
  ) {
    return issue("field_value_invalid", path);
  }
  return undefined;
};

const validateActivityDeepShape = (
  activity: JsonObject,
  path: string,
): V2ContractIssue | undefined => {
  const templateRefIssue = validateTemplateRefShape(
    activity.templateRef,
    `${path}.templateRef`,
  );
  if (templateRefIssue) return templateRefIssue;
  const capabilityIssue = validateCapabilitiesShape(
    activity.capabilities,
    `${path}.capabilities`,
  );
  if (capabilityIssue) return capabilityIssue;
  if (
    !V2_ACTIVITY_FAMILIES.includes(
      activity.family as (typeof V2_ACTIVITY_FAMILIES)[number],
    )
  ) {
    return issue("activity_family_invalid", `${path}.family`);
  }
  if (
    !isNonEmptyString(activity.activityId) ||
    !isNonEmptyString(activity.progressCompatibilityKey) ||
    !isNonEmptyString(activity.activityTypeKey) ||
    !isPositiveInteger(activity.kernelVersion) ||
    !isPositiveInteger(activity.payloadSchemaVersion) ||
    !isPositiveInteger(activity.estimatedSeconds)
  ) {
    return issue(
      "field_value_invalid",
      !isPositiveInteger(activity.estimatedSeconds)
        ? `${path}.estimatedSeconds`
        : path,
    );
  }
  if (
    !isStringArray(activity.contentUnitIds) ||
    !isStringArray(activity.assetIds)
  ) {
    return issue("field_type_invalid", path);
  }
  const requirementsShape = oneExactObjectIssue(
    activity.requirements,
    ["prompt", "media", "input", "fallback"],
    [],
    `${path}.requirements`,
  );
  if (requirementsShape) return requirementsShape;
  const requirements = activity.requirements as JsonObject;
  const fallbackShape = oneExactObjectIssue(
    requirements.fallback,
    ["deterministicScripted", "offline", "nonVoiceCoreEquivalent"],
    [],
    `${path}.requirements.fallback`,
  );
  if (fallbackShape) return fallbackShape;
  const fallback = requirements.fallback as JsonObject;
  if (
    !isStringArray(requirements.prompt) ||
    requirements.prompt.length === 0 ||
    !isStringArray(requirements.media) ||
    !isStringArray(requirements.input) ||
    requirements.input.length === 0 ||
    typeof fallback.deterministicScripted !== "boolean" ||
    !["full", "cached_assets_only", "not_supported"].includes(
      String(fallback.offline),
    ) ||
    typeof fallback.nonVoiceCoreEquivalent !== "boolean"
  ) {
    return issue("field_type_invalid", `${path}.requirements`);
  }
  const targetsShape = oneExactObjectIssue(
    activity.targets,
    ["skillIds", "phraseFrameIds", "semanticSlotIds"],
    [],
    `${path}.targets`,
  );
  if (targetsShape) return targetsShape;
  const targets = activity.targets as JsonObject;
  if (
    !isStringArray(targets.skillIds) ||
    !isStringArray(targets.phraseFrameIds) ||
    !isStringArray(targets.semanticSlotIds)
  ) {
    return issue("field_type_invalid", `${path}.targets`);
  }
  if (!isPlainObject(activity.tags))
    return issue("field_type_invalid", `${path}.tags`);
  for (const key of [
    "skillIds",
    "grammar",
    "vocabulary",
    "scenario",
    "modalities",
  ]) {
    if (!isStringArray(activity.tags[key]))
      return issue("field_type_invalid", `${path}.tags.${key}`);
  }
  if (
    (activity.tags.modalities as string[]).some(
      (value) =>
        !["reading", "listening", "writing", "speaking"].includes(value),
    )
  ) {
    return issue("field_value_invalid", `${path}.tags.modalities`);
  }
  return undefined;
};

const validateEpisodeDeepShape = (
  episode: JsonObject,
): readonly V2ContractIssue[] => {
  if (
    !isNonEmptyString(episode.episodeId) ||
    !isNonEmptyString(episode.seasonId) ||
    !["ordinary", "checkpoint"].includes(String(episode.episodeKind)) ||
    !isPositiveInteger(episode.ordinal) ||
    !isNonEmptyString(episode.chapterId) ||
    !isPositiveInteger(episode.estimatedMinutes)
  ) {
    return [issue("field_value_invalid", "$.episode")];
  }
  for (const [key, path] of [
    ["title", "$.episode.title"],
    ["canDoOutcome", "$.episode.canDoOutcome"],
  ] as const) {
    const localizedIssue = validateLocalizedValuesShape(episode[key], path);
    if (localizedIssue) return [localizedIssue];
  }
  if (!isPlainObject(episode.scenario))
    return [issue("field_type_invalid", "$.episode.scenario")];
  for (const key of [
    "title",
    "setting",
    "learnerRole",
    "partnerRole",
    "communicativeGoal",
    "successCondition",
  ]) {
    const localizedIssue = validateLocalizedValuesShape(
      episode.scenario[key],
      `$.episode.scenario.${key}`,
    );
    if (localizedIssue) return [localizedIssue];
  }
  if (
    !isNonEmptyString(episode.scenario.scenarioId) ||
    !isStringArray(episode.scenario.criticalConstraintIds)
  ) {
    return [issue("field_type_invalid", "$.episode.scenario")];
  }
  for (const key of [
    "objectiveIds",
    "skillIds",
    "grammarDistinctionIds",
    "soundFocusIds",
    "assetIds",
  ]) {
    if (!isStringArray(episode[key]))
      return [issue("field_type_invalid", `$.episode.${key}`)];
  }

  for (
    let index = 0;
    index < (episode.phraseFrames as JsonObject[]).length;
    index += 1
  ) {
    const phrase = (episode.phraseFrames as JsonObject[])[index];
    const phrasePath = `$.episode.phraseFrames[${index}]`;
    if (
      !isNonEmptyString(phrase.phraseFrameId) ||
      !isNonEmptyString(phrase.targetPattern) ||
      !isStringArray(phrase.semanticSlotIds) ||
      !isStringArray(phrase.skillIds) ||
      typeof phrase.required !== "boolean"
    ) {
      return [issue("field_type_invalid", phrasePath)];
    }
    const localizedIssue = validateLocalizedValuesShape(
      phrase.learnerMeaning,
      `${phrasePath}.learnerMeaning`,
    );
    if (localizedIssue) return [localizedIssue];
  }
  for (
    let index = 0;
    index < (episode.semanticSlots as JsonObject[]).length;
    index += 1
  ) {
    const slot = (episode.semanticSlots as JsonObject[])[index];
    const slotPath = `$.episode.semanticSlots[${index}]`;
    if (
      !isNonEmptyString(slot.semanticSlotId) ||
      !isStringArray(slot.acceptedTargetValues) ||
      slot.acceptedTargetValues.length === 0 ||
      !isStringArray(slot.allowedContentUnitIds) ||
      !isPositiveInteger(slot.minimumDistinctValues) ||
      typeof slot.requiredInCapstone !== "boolean" ||
      typeof slot.critical !== "boolean"
    ) {
      return [issue("field_type_invalid", slotPath)];
    }
    const localizedIssue = validateLocalizedValuesShape(
      slot.role,
      `${slotPath}.role`,
    );
    if (localizedIssue) return [localizedIssue];
  }
  if (!isRecordArray(episode.criticalConstraints)) {
    return [issue("field_type_invalid", "$.episode.criticalConstraints")];
  }
  for (let index = 0; index < episode.criticalConstraints.length; index += 1) {
    const path = `$.episode.criticalConstraints[${index}]`;
    const shapeIssue = oneExactObjectIssue(
      episode.criticalConstraints[index],
      ["criticalConstraintId", "description"],
      [],
      path,
    );
    if (shapeIssue) return [shapeIssue];
  }
  for (
    let index = 0;
    index < (episode.activities as JsonObject[]).length;
    index += 1
  ) {
    const activityIssue = validateActivityDeepShape(
      (episode.activities as JsonObject[])[index],
      `$.episode.activities[${index}]`,
    );
    if (activityIssue) return [activityIssue];
  }

  const graph = episode.graph as JsonObject;
  const nodes = graph.nodes as JsonObject[];
  const edges = graph.edges as JsonObject[];
  if (nodes.length > 512)
    return [issue("collection_limit_exceeded", "$.episode.graph.nodes")];
  if (edges.length > 2048)
    return [issue("collection_limit_exceeded", "$.episode.graph.edges")];
  if (
    !isNonEmptyString(graph.startNodeId) ||
    !isNonEmptyString(graph.capstoneNodeId)
  ) {
    return [issue("field_type_invalid", "$.episode.graph")];
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const nodePath = `$.episode.graph.nodes[${index}]`;
    if (
      !isNonEmptyString(node.nodeId) ||
      !isNonEmptyString(node.activityId) ||
      !isPositiveInteger(node.position) ||
      typeof node.visible !== "boolean" ||
      typeof node.requiredForCore !== "boolean" ||
      typeof node.voiceEvidenceOptional !== "boolean" ||
      ![
        "encounter_build",
        "near_transfer",
        "independent_probe",
        "optional_review",
      ].includes(String(node.phase)) ||
      typeof node.gateEligible !== "boolean" ||
      !Number.isSafeInteger(node.maxStars)
    ) {
      return [
        issue(
          ![
            "encounter_build",
            "near_transfer",
            "independent_probe",
            "optional_review",
          ].includes(String(node.phase))
            ? "phase_contract_mismatch"
            : "field_value_invalid",
          ![
            "encounter_build",
            "near_transfer",
            "independent_probe",
            "optional_review",
          ].includes(String(node.phase))
            ? `${nodePath}.phase`
            : nodePath,
        ),
      ];
    }
    if (
      hasOwn(node, "transferFromNodeId") &&
      !isNonEmptyString(node.transferFromNodeId)
    ) {
      return [issue("field_type_invalid", `${nodePath}.transferFromNodeId`)];
    }
    if (
      hasOwn(node, "variedSemanticSlotIds") &&
      !isStringArray(node.variedSemanticSlotIds)
    ) {
      return [issue("field_type_invalid", `${nodePath}.variedSemanticSlotIds`)];
    }
    if (hasOwn(node, "fallback")) {
      const fallbackIssue = validateFallbackShape(
        node.fallback,
        `${nodePath}.fallback`,
      );
      if (fallbackIssue) return [fallbackIssue];
    }
    const declarations = node.evidenceDeclarations as JsonObject[];
    for (
      let declarationIndex = 0;
      declarationIndex < declarations.length;
      declarationIndex += 1
    ) {
      const declarationIssue = validateEvidenceDeclarationShape(
        declarations[declarationIndex],
        `${nodePath}.evidenceDeclarations[${declarationIndex}]`,
      );
      if (declarationIssue) return [declarationIssue];
    }
    if (node.phase !== "optional_review") {
      const contextIssue = validatePedagogicalContextShape(
        node.pedagogicalContextContract,
        `${nodePath}.pedagogicalContextContract`,
        node.phase,
      );
      if (contextIssue) return [contextIssue];
    }
  }
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    const path = `$.episode.graph.edges[${index}]`;
    if (
      !isNonEmptyString(edge.edgeId) ||
      !isNonEmptyString(edge.fromNodeId) ||
      !isNonEmptyString(edge.toNodeId) ||
      ![
        "completed",
        "passed",
        "needs_reinforcement",
        "fallback_selected",
      ].includes(String(edge.condition))
    ) {
      return [issue("field_value_invalid", `${path}.condition`)];
    }
  }

  if (!isRecordArray(episode.starSlots))
    return [issue("field_type_invalid", "$.episode.starSlots")];
  for (let index = 0; index < episode.starSlots.length; index += 1) {
    const path = `$.episode.starSlots[${index}]`;
    const shapeIssue = oneExactObjectIssue(
      episode.starSlots[index],
      ["starSlotId", "maxStars", "acceptedNodeIds"],
      [],
      path,
    );
    if (shapeIssue) return [shapeIssue];
    if (
      !isNonEmptyString(episode.starSlots[index].starSlotId) ||
      !Number.isSafeInteger(episode.starSlots[index].maxStars) ||
      !isStringArray(episode.starSlots[index].acceptedNodeIds)
    ) {
      return [issue("field_type_invalid", path)];
    }
  }
  for (const key of ["encounterBuildNodeIds", "nearTransferNodeIds"]) {
    if (!isStringArray((episode.requiredLoops as JsonObject)[key])) {
      return [issue("field_type_invalid", `$.episode.requiredLoops.${key}`)];
    }
  }
  for (const key of ["independentProbeNodeIds", "optionalReviewNodeIds"]) {
    if (!isStringArray((episode.assessmentNodes as JsonObject)[key])) {
      return [issue("field_type_invalid", `$.episode.assessmentNodes.${key}`)];
    }
  }

  const capstoneShape = oneExactObjectIssue(
    episode.capstoneContract,
    [
      "objectiveIds",
      "requiredSemanticSlotIds",
      "criticalConstraintIds",
      "primaryNodeIds",
      "deterministicAlternateNodeIds",
    ],
    [],
    "$.episode.capstoneContract",
  );
  if (capstoneShape) return [capstoneShape];
  for (const key of [
    "objectiveIds",
    "requiredSemanticSlotIds",
    "criticalConstraintIds",
    "primaryNodeIds",
    "deterministicAlternateNodeIds",
  ]) {
    if (!isStringArray((episode.capstoneContract as JsonObject)[key])) {
      return [issue("field_type_invalid", `$.episode.capstoneContract.${key}`)];
    }
  }

  const learningShape = oneExactObjectIssue(
    episode.learningDesign,
    [
      "primaryOutcomeId",
      "objectiveIds",
      "prerequisiteEdges",
      "supportPlan",
      "independentProbeRef",
      "delayedProbeRef",
      "delayedWindowPolicyId",
    ],
    [],
    "$.episode.learningDesign",
  );
  if (learningShape) return [learningShape];
  const learning = episode.learningDesign as JsonObject;
  if (
    !isNonEmptyString(learning.primaryOutcomeId) ||
    !isStringArray(learning.objectiveIds) ||
    !isRecordArray(learning.prerequisiteEdges) ||
    !isRecordArray(learning.supportPlan) ||
    !isNonEmptyString(learning.independentProbeRef) ||
    !isNonEmptyString(learning.delayedWindowPolicyId)
  ) {
    return [issue("field_type_invalid", "$.episode.learningDesign")];
  }
  if (!isPlainObject(learning.delayedProbeRef)) {
    return [
      issue(
        "delayed_probe_ref_invalid",
        "$.episode.learningDesign.delayedProbeRef",
      ),
    ];
  }
  const delayedRefShape = oneExactObjectIssue(
    learning.delayedProbeRef,
    ["probeId", "contentHash"],
    [],
    "$.episode.learningDesign.delayedProbeRef",
  );
  if (delayedRefShape) return [delayedRefShape];
  for (let index = 0; index < learning.prerequisiteEdges.length; index += 1) {
    const path = `$.episode.learningDesign.prerequisiteEdges[${index}]`;
    const edgeShape = oneExactObjectIssue(
      learning.prerequisiteEdges[index],
      ["from", "toObjectiveId", "requiredState"],
      [],
      path,
    );
    if (edgeShape) return [edgeShape];
    const fromShape = oneExactObjectIssue(
      learning.prerequisiteEdges[index].from,
      ["kind", "id", "sourceEpisodeId"],
      [],
      `${path}.from`,
    );
    if (fromShape) return [fromShape];
  }
  for (let index = 0; index < learning.supportPlan.length; index += 1) {
    const path = `$.episode.learningDesign.supportPlan[${index}]`;
    const supportShape = oneExactObjectIssue(
      learning.supportPlan[index],
      ["objectiveId", "initialSupport", "fadeRuleId", "escalationRuleId"],
      [],
      path,
    );
    if (supportShape) return [supportShape];
  }

  const masteryShape = oneExactObjectIssue(
    episode.masteryContract,
    [
      "evidencePolicyRef",
      "requirements",
      "durableClaimRequiresDelayedProbe",
      "accessibilityHandling",
      "numericCutoffHypothesisRef",
      "performanceStarsAreLearningEvidence",
      "confidentVoiceTurnCountAloneIsSufficient",
    ],
    [],
    "$.episode.masteryContract",
  );
  if (masteryShape) return [masteryShape];
  const mastery = episode.masteryContract as JsonObject;
  const masteryPolicyIssue = validatePolicyRefShape(
    mastery.evidencePolicyRef,
    "$.episode.masteryContract.evidencePolicyRef",
    "evidence",
  );
  if (masteryPolicyIssue) return [masteryPolicyIssue];
  const masteryContractLiterals: readonly (readonly [string, unknown])[] = [
    ["durableClaimRequiresDelayedProbe", true],
    ["accessibilityHandling", "learning_non_assessment_no_failure"],
    ["numericCutoffHypothesisRef", "HYP-V2-003"],
    ["performanceStarsAreLearningEvidence", false],
    ["confidentVoiceTurnCountAloneIsSufficient", false],
  ];
  for (const [field, expectedValue] of masteryContractLiterals) {
    if (mastery[field] !== expectedValue) {
      return [
        issue("mastery_contract_invalid", `$.episode.masteryContract.${field}`),
      ];
    }
  }
  if (!isRecordArray(mastery.requirements)) {
    return [
      issue("field_type_invalid", "$.episode.masteryContract.requirements"),
    ];
  }
  if (mastery.requirements.length === 0) {
    return [
      issue(
        "mastery_requirement_invalid",
        "$.episode.masteryContract.requirements",
      ),
    ];
  }
  const requirementIdentities: string[] = [];
  for (let index = 0; index < mastery.requirements.length; index += 1) {
    const path = `$.episode.masteryContract.requirements[${index}]`;
    const requirementShape = oneExactObjectIssue(
      mastery.requirements[index],
      [
        "objectiveId",
        "construct",
        "phase",
        "requiredValidity",
        "requiredOutcome",
        "maximumSupport",
      ],
      [],
      path,
    );
    if (requirementShape) return [requirementShape];
    const requirement = mastery.requirements[index];
    const literalChecks: readonly (readonly [string, readonly string[]])[] = [
      [
        "construct",
        ["semantic", "listening", "recall", "spoken", "interaction"],
      ],
      ["phase", ["near_transfer", "independent_probe", "delayed_probe"]],
      ["requiredValidity", ["assessed"]],
      ["requiredOutcome", ["success"]],
      [
        "maximumSupport",
        ["model", "full_text", "partial_cue", "visual_only", "none"],
      ],
    ];
    if (!isNonEmptyString(requirement.objectiveId)) {
      return [issue("mastery_requirement_invalid", `${path}.objectiveId`)];
    }
    for (const [field, allowedValues] of literalChecks) {
      if (!allowedValues.includes(String(requirement[field]))) {
        return [issue("mastery_requirement_invalid", `${path}.${field}`)];
      }
    }
    const identity = `${String(requirement.objectiveId)}\u0000${String(requirement.construct)}\u0000${String(requirement.phase)}`;
    if (requirementIdentities.includes(identity)) {
      return [issue("mastery_requirement_invalid", path)];
    }
    requirementIdentities.push(identity);
  }
  if (
    !mastery.requirements.some(
      (requirement) => requirement.phase === "independent_probe",
    ) ||
    !mastery.requirements.some(
      (requirement) => requirement.phase === "delayed_probe",
    )
  ) {
    return [
      issue(
        "mastery_requirement_invalid",
        "$.episode.masteryContract.requirements",
      ),
    ];
  }

  if (!isRecordArray(episode.delayedProbeDefinitions)) {
    return [issue("field_type_invalid", "$.episode.delayedProbeDefinitions")];
  }
  for (
    let index = 0;
    index < episode.delayedProbeDefinitions.length;
    index += 1
  ) {
    const definition = episode.delayedProbeDefinitions[index];
    const path = `$.episode.delayedProbeDefinitions[${index}]`;
    const pairShape = oneExactObjectIssue(
      definition,
      ["ref", "body"],
      [],
      path,
    );
    if (pairShape) return [pairShape];
    const refShape = oneExactObjectIssue(
      definition.ref,
      ["probeId", "contentHash"],
      [],
      `${path}.ref`,
    );
    if (refShape) return [refShape];
    const bodyShape = oneExactObjectIssue(
      definition.body,
      [
        "schemaVersion",
        "probeId",
        "targetEpisodeId",
        "probeNodeId",
        "activityBinding",
        "evidenceDeclarations",
        "pedagogicalContextContract",
      ],
      ["accessibilityAlternateActivityId"],
      `${path}.body`,
    );
    if (bodyShape) return [bodyShape];
    const body = definition.body as JsonObject;
    const bindingShape = oneExactObjectIssue(
      body.activityBinding,
      ["activityId", "progressCompatibilityKey", "templateRef"],
      [],
      `${path}.body.activityBinding`,
    );
    if (bindingShape) return [bindingShape];
    const bindingRefIssue = validateTemplateRefShape(
      (body.activityBinding as JsonObject).templateRef,
      `${path}.body.activityBinding.templateRef`,
    );
    if (bindingRefIssue) return [bindingRefIssue];
    if (!isRecordArray(body.evidenceDeclarations))
      return [issue("field_type_invalid", `${path}.body.evidenceDeclarations`)];
    for (
      let declarationIndex = 0;
      declarationIndex < body.evidenceDeclarations.length;
      declarationIndex += 1
    ) {
      const declarationIssue = validateEvidenceDeclarationShape(
        body.evidenceDeclarations[declarationIndex],
        `${path}.body.evidenceDeclarations[${declarationIndex}]`,
      );
      if (declarationIssue) return [declarationIssue];
    }
    const contextIssue = validatePedagogicalContextShape(
      body.pedagogicalContextContract,
      `${path}.body.pedagogicalContextContract`,
      "delayed_probe",
    );
    if (contextIssue) return [contextIssue];
  }

  for (
    let index = 0;
    index < (episode.reviewLinks as JsonObject[]).length;
    index += 1
  ) {
    const link = (episode.reviewLinks as JsonObject[])[index];
    const path = `$.episode.reviewLinks[${index}]`;
    const materializedKey = [
      "outcome",
      "success",
      "result",
      "evidence",
      "attempt",
    ].find((key) => hasOwn(link, key));
    if (materializedKey)
      return [
        issue(
          "review_link_materialization_forbidden",
          `${path}.${materializedKey}`,
        ),
      ];
    const requiredKeys =
      link.scheduleKind === "optional_review"
        ? ["scheduleKind", "targetEpisodeId", "delay", "skillIds"]
        : [
            "scheduleKind",
            "targetEpisodeId",
            "delay",
            "probeRef",
            "windowPolicyId",
            "skillIds",
          ];
    const linkShape = oneExactObjectIssue(link, requiredKeys, [], path);
    if (linkShape) return [linkShape];
    if (!isStringArray(link.skillIds))
      return [issue("field_type_invalid", `${path}.skillIds`)];
  }

  if (!isRecordArray(episode.accessibilityRoutes)) {
    return [issue("field_type_invalid", "$.episode.accessibilityRoutes")];
  }
  if (episode.accessibilityRoutes.length === 0) {
    return [
      issue("accessibility_route_missing", "$.episode.accessibilityRoutes"),
    ];
  }
  for (let index = 0; index < episode.accessibilityRoutes.length; index += 1) {
    const route = episode.accessibilityRoutes[index];
    const path = `$.episode.accessibilityRoutes[${index}]`;
    const routeShape = oneExactObjectIssue(
      route,
      [
        "routeId",
        "routeKind",
        "nodeIds",
        "reachableStarSlotIds",
        "completesRequiredLoops",
        "usesAccessBoost",
        "requiresNetwork",
        "requiresAi",
        "requiresVoiceSpecificStar",
        "measuredConstructs",
      ],
      [],
      path,
    );
    if (routeShape) return [routeShape];
    if (
      !isNonEmptyString(route.routeId) ||
      !["primary", "accessibility", "capability_fallback"].includes(
        String(route.routeKind),
      ) ||
      !isStringArray(route.nodeIds) ||
      !isStringArray(route.reachableStarSlotIds) ||
      !isStringArray(route.measuredConstructs)
    ) {
      return [issue("field_type_invalid", path)];
    }
  }
  if (
    !episode.accessibilityRoutes.some((route) => route.routeKind === "primary")
  ) {
    return [
      issue(
        "accessibility_primary_route_missing",
        "$.episode.accessibilityRoutes",
      ),
    ];
  }
  return [];
};

const validateCurriculumDeepShape = (
  input: unknown,
): readonly V2ContractIssue[] => {
  if (!isPlainObject(input))
    return [issue("field_type_invalid", "$.curriculum")];
  const curriculum = input;
  const scopeShape = oneExactObjectIssue(
    curriculum.scope,
    ["kind", "includedChapterOrdinals", "includedEpisodeOrdinals"],
    [],
    "$.curriculum.scope",
  );
  if (scopeShape) return [scopeShape];
  if (
    !isStringArray(curriculum.requiredLocales) ||
    !isStringArray(curriculum.requiredAssetIds) ||
    !isStringArray(curriculum.requiredCapabilityKeys) ||
    !Array.isArray(curriculum.checkpointOrdinals)
  ) {
    return [issue("field_type_invalid", "$.curriculum")];
  }
  if (!isNonEmptyString(curriculum.studyTarget)) {
    return [
      issue(
        typeof curriculum.studyTarget === "string"
          ? "field_value_invalid"
          : "field_type_invalid",
        "$.curriculum.studyTarget",
      ),
    ];
  }
  if (!isNonEmptyString(curriculum.learnerSourceLocale)) {
    return [
      issue(
        typeof curriculum.learnerSourceLocale === "string"
          ? "field_value_invalid"
          : "field_type_invalid",
        "$.curriculum.learnerSourceLocale",
      ),
    ];
  }
  if (
    curriculum.requiredLocales.length === 0 ||
    curriculum.requiredLocales.some((locale) => !isNonEmptyString(locale)) ||
    uniqueSecondIndex(curriculum.requiredLocales) >= 0 ||
    !curriculum.requiredLocales.includes(String(curriculum.studyTarget)) ||
    !curriculum.requiredLocales.includes(String(curriculum.learnerSourceLocale))
  ) {
    return [
      issue(
        "curriculum_locale_closure_invalid",
        "$.curriculum.requiredLocales",
      ),
    ];
  }
  if (
    curriculum.requiredCapabilityKeys.some((key) => !isNonEmptyString(key)) ||
    uniqueSecondIndex(curriculum.requiredCapabilityKeys) >= 0
  ) {
    return [
      issue(
        "curriculum_capability_closure_invalid",
        "$.curriculum.requiredCapabilityKeys",
      ),
    ];
  }
  if (!isRecordArray(curriculum.chapters))
    return [issue("field_type_invalid", "$.curriculum.chapters")];
  for (let index = 0; index < curriculum.chapters.length; index += 1) {
    const chapter = curriculum.chapters[index];
    const path = `$.curriculum.chapters[${index}]`;
    const chapterShape = oneExactObjectIssue(
      chapter,
      ["chapterId", "ordinal", "episodeIds"],
      ["checkpointEpisodeId"],
      path,
    );
    if (chapterShape) return [chapterShape];
    if (
      !isNonEmptyString(chapter.chapterId) ||
      !isPositiveInteger(chapter.ordinal) ||
      !isStringArray(chapter.episodeIds)
    ) {
      return [issue("field_type_invalid", path)];
    }
  }
  if (!isRecordArray(curriculum.episodeRefs))
    return [issue("field_type_invalid", "$.curriculum.episodeRefs")];
  const materialKeys = [
    "skillIds",
    "phraseFrameIds",
    "grammarDistinctionIds",
    "semanticSlotIds",
    "criticalConstraintIds",
  ];
  for (let index = 0; index < curriculum.episodeRefs.length; index += 1) {
    const ref = curriculum.episodeRefs[index];
    const path = `$.curriculum.episodeRefs[${index}]`;
    const refShape = oneExactObjectIssue(
      ref,
      [
        "episodeId",
        "ordinal",
        "chapterId",
        "episodeKind",
        "contentHash",
        "prerequisiteEpisodeIds",
        "introducedMaterial",
        "requiredCheckpointMaterial",
      ],
      [],
      path,
    );
    if (refShape) return [refShape];
    if (
      !isNonEmptyString(ref.episodeId) ||
      !isPositiveInteger(ref.ordinal) ||
      !isNonEmptyString(ref.chapterId) ||
      !["ordinary", "checkpoint"].includes(String(ref.episodeKind)) ||
      typeof ref.contentHash !== "string" ||
      !HASH_PATTERN.test(ref.contentHash) ||
      !isStringArray(ref.prerequisiteEpisodeIds)
    ) {
      return [issue("field_type_invalid", path)];
    }
    for (const materialKey of [
      "introducedMaterial",
      "requiredCheckpointMaterial",
    ]) {
      const materialPath = `${path}.${materialKey}`;
      const materialShape = oneExactObjectIssue(
        ref[materialKey],
        materialKeys,
        [],
        materialPath,
      );
      if (materialShape) return [materialShape];
      for (const key of materialKeys) {
        if (!isStringArray((ref[materialKey] as JsonObject)[key])) {
          return [issue("field_type_invalid", `${materialPath}.${key}`)];
        }
      }
    }
  }
  return [];
};

const validatePackageDeepShape = (
  root: JsonObject,
): readonly V2ContractIssue[] => {
  const dependencies = root.dependencies as JsonObject;
  const templates = dependencies.templates as JsonObject[];
  for (let index = 0; index < templates.length; index += 1) {
    const template = templates[index];
    const path = `$.dependencies.templates[${index}]`;
    const templateRefIssue = validateTemplateRefShape(
      template.templateRef,
      `${path}.templateRef`,
    );
    if (templateRefIssue) return [templateRefIssue];
    const bodyShapeIssue = validateTemplateArtifactBodyShape(
      template.body,
      `${path}.body`,
    );
    if (bodyShapeIssue) return [bodyShapeIssue];
    const body = template.body as JsonObject;
    const templateRef = template.templateRef as JsonObject;
    if (
      templateRef.templateId !== body.templateId ||
      templateRef.version !== body.version
    ) {
      return [issue("template_identity_mismatch", `${path}.templateRef`)];
    }
  }
  for (let index = 0; index < templates.length; index += 1) {
    const capabilityContract = (templates[index].body as JsonObject)
      .capabilityContract as JsonObject;
    const fallbackTemplateRef = capabilityContract.fallbackTemplateRef;
    if (
      fallbackTemplateRef !== undefined &&
      !templates.some((candidate) =>
        sameValue(candidate.templateRef, fallbackTemplateRef),
      )
    ) {
      return [
        issue(
          "template_fallback_reference_missing",
          `$.dependencies.templates[${index}].body.capabilityContract.fallbackTemplateRef`,
        ),
      ];
    }
  }
  const policies = dependencies.policies as JsonObject[];
  for (let index = 0; index < policies.length; index += 1) {
    const policyIssue = validatePolicyDescriptorShape(
      policies[index],
      `$.dependencies.policies[${index}]`,
    );
    if (policyIssue) return [policyIssue];
  }
  const episodeIssues = validateEpisodeDeepShape(root.episode as JsonObject);
  if (episodeIssues.length > 0) return episodeIssues;
  return validateCurriculumDeepShape(root.curriculum);
};

const validatePoliciesAndActivities = (
  root: JsonObject,
): readonly V2ContractIssue[] => {
  const dependencies = root.dependencies as JsonObject;
  const templates = dependencies.templates as JsonObject[];
  const policies = dependencies.policies as JsonObject[];
  const episode = root.episode as JsonObject;
  const activities = episode.activities as JsonObject[];

  const duplicatePolicyIndex = uniqueSecondIndex(
    policies.map((candidate) => {
      const ref = candidate.ref as JsonObject;
      return `${String(ref.kind)}\u0000${String(ref.key)}\u0000${String(ref.version)}`;
    }),
  );
  if (duplicatePolicyIndex >= 0) {
    return [
      issue(
        "dependency_duplicate_id",
        `$.dependencies.policies[${duplicatePolicyIndex}]`,
      ),
    ];
  }
  const duplicateTemplateIndex = uniqueSecondIndex(
    templates.map((candidate) => {
      const ref = isPlainObject(candidate.templateRef)
        ? candidate.templateRef
        : {};
      return `${String(ref.templateId)}\u0000${String(ref.version)}`;
    }),
  );
  if (duplicateTemplateIndex >= 0) {
    return [
      issue(
        "dependency_duplicate_id",
        `$.dependencies.templates[${duplicateTemplateIndex}]`,
      ),
    ];
  }

  for (
    let templateIndex = 0;
    templateIndex < templates.length;
    templateIndex += 1
  ) {
    const template = templates[templateIndex];
    const templateBody = template.body as JsonObject;
    const policyContainer = templateBody.policies;
    const policyPath = `$.dependencies.templates[${templateIndex}].body.policies`;
    if (!isPlainObject(policyContainer))
      return [issue("activity_policy_set_invalid", policyPath)];
    for (const kind of POLICY_KINDS) {
      if (!hasOwn(policyContainer, kind))
        return [issue("activity_policy_set_invalid", `${policyPath}.${kind}`)];
    }
    const extra = Object.keys(policyContainer)
      .filter(
        (key) => !POLICY_KINDS.includes(key as (typeof POLICY_KINDS)[number]),
      )
      .sort()[0];
    if (extra)
      return [issue("activity_policy_set_invalid", `${policyPath}.${extra}`)];

    for (const kind of POLICY_KINDS) {
      const ref = policyContainer[kind];
      const refPath = `${policyPath}.${kind}`;
      if (!isPlainObject(ref))
        return [issue("activity_policy_ref_mismatch", refPath)];
      if (ref.kind !== kind)
        return [issue("activity_policy_ref_mismatch", `${refPath}.kind`)];
      const sameKind = policies.filter(
        (candidate) => (candidate.ref as JsonObject).kind === kind,
      );
      if (sameKind.length === 0)
        return [issue("activity_policy_ref_mismatch", refPath)];
      const sameKey = sameKind.filter(
        (candidate) => (candidate.ref as JsonObject).key === ref.key,
      );
      if (sameKey.length === 0)
        return [issue("activity_policy_ref_mismatch", `${refPath}.key`)];
      const sameVersion = sameKey.filter(
        (candidate) => (candidate.ref as JsonObject).version === ref.version,
      );
      if (sameVersion.length === 0)
        return [issue("activity_policy_ref_mismatch", `${refPath}.version`)];
      const resolvedPolicy = sameVersion.find(
        (candidate) =>
          (candidate.ref as JsonObject).contentHash === ref.contentHash,
      );
      if (!resolvedPolicy) {
        return [
          issue("activity_policy_ref_mismatch", `${refPath}.contentHash`),
        ];
      }
      const resolvedBody = resolvedPolicy.body as JsonObject;
      const kernel = templateBody.kernel as JsonObject;
      if (
        !(resolvedBody.compatibleFamilies as string[]).includes(
          String(templateBody.family),
        ) ||
        !(resolvedBody.compatibleKernelKeys as string[]).includes(
          String(kernel.activityTypeKey),
        )
      ) {
        return [issue("policy_compatibility_mismatch", refPath)];
      }
    }
    if (
      (template.templateRef as JsonObject).contentHash !==
      hashCanonicalBody(templateBody)
    ) {
      return [
        issue(
          "template_content_hash_mismatch",
          `$.dependencies.templates[${templateIndex}].templateRef.contentHash`,
        ),
      ];
    }
  }

  const duplicateActivityIndex = uniqueSecondIndex(
    activities.map((activity) => activity.activityId),
  );
  if (duplicateActivityIndex >= 0) {
    return [
      issue(
        "graph_duplicate_id",
        `$.episode.activities[${duplicateActivityIndex}].activityId`,
      ),
    ];
  }

  const dependencyAssetIds = isStringArray(dependencies.assetIds)
    ? dependencies.assetIds
    : [];
  const dependencyContentUnitIds = isStringArray(dependencies.contentUnitIds)
    ? dependencies.contentUnitIds
    : [];

  for (
    let activityIndex = 0;
    activityIndex < activities.length;
    activityIndex += 1
  ) {
    const activity = activities[activityIndex];
    const activityPath = `$.episode.activities[${activityIndex}]`;
    if (
      typeof activity.activityId !== "string" ||
      !V2_IDENTITY_REGEX.test(activity.activityId)
    ) {
      return [issue("identity_invalid", `${activityPath}.activityId`)];
    }
    if (
      !isStringArray(activity.assetIds) ||
      !isStringArray(activity.contentUnitIds)
    ) {
      return [issue("field_type_invalid", activityPath)];
    }
    for (
      let assetIndex = 0;
      assetIndex < activity.assetIds.length;
      assetIndex += 1
    ) {
      if (!dependencyAssetIds.includes(activity.assetIds[assetIndex])) {
        return [
          issue(
            "asset_reference_missing",
            `${activityPath}.assetIds[${assetIndex}]`,
          ),
        ];
      }
    }
    for (
      let contentIndex = 0;
      contentIndex < activity.contentUnitIds.length;
      contentIndex += 1
    ) {
      if (
        !dependencyContentUnitIds.includes(
          activity.contentUnitIds[contentIndex],
        )
      ) {
        return [
          issue(
            "content_reference_missing",
            `${activityPath}.contentUnitIds[${contentIndex}]`,
          ),
        ];
      }
    }
    if (
      !V2_ACTIVITY_FAMILIES.includes(
        activity.family as (typeof V2_ACTIVITY_FAMILIES)[number],
      )
    ) {
      return [issue("activity_family_invalid", `${activityPath}.family`)];
    }
    if (!isPlainObject(activity.templateRef)) {
      return [
        issue("activity_template_mismatch", `${activityPath}.templateRef`),
      ];
    }
    const activityTemplateRef = activity.templateRef;
    const template = templates.find((candidate) => {
      const ref = candidate.templateRef;
      return (
        isPlainObject(ref) &&
        ref.templateId === activityTemplateRef.templateId &&
        ref.version === activityTemplateRef.version
      );
    });
    if (
      !template ||
      !isPlainObject(template.templateRef) ||
      template.templateRef.contentHash !== activityTemplateRef.contentHash
    ) {
      return [
        issue("activity_template_mismatch", `${activityPath}.templateRef`),
      ];
    }
    const templateBody = template.body as JsonObject;
    const kernel = templateBody.kernel as JsonObject;
    const capability = templateBody.capabilityContract as JsonObject;
    const compatibilityChecks: readonly (readonly [
      string,
      unknown,
      unknown,
    ])[] = [
      ["family", activity.family, templateBody.family],
      ["activityTypeKey", activity.activityTypeKey, kernel.activityTypeKey],
      ["kernelVersion", activity.kernelVersion, kernel.kernelVersion],
      [
        "payloadSchemaVersion",
        activity.payloadSchemaVersion,
        kernel.payloadSchemaVersion,
      ],
      [
        "capabilities",
        activity.capabilities,
        {
          microphone: capability.microphone,
          speechRecognition: capability.speechRecognition,
          audioPlayback: capability.audioPlayback,
          network: capability.network,
        },
      ],
    ];
    for (const [key, activityValue, templateValue] of compatibilityChecks) {
      if (!sameValue(activityValue, templateValue)) {
        return [issue("activity_template_mismatch", `${activityPath}.${key}`)];
      }
    }
  }
  return [];
};

const validateNodePhases = (
  episode: JsonObject,
): readonly V2ContractIssue[] => {
  const graph = episode.graph as JsonObject;
  const nodes = graph.nodes as JsonObject[];
  const assessment = isPlainObject(episode.assessmentNodes)
    ? episode.assessmentNodes
    : {};
  const independentIds = isStringArray(assessment.independentProbeNodeIds)
    ? assessment.independentProbeNodeIds
    : [];
  const optionalIds = isStringArray(assessment.optionalReviewNodeIds)
    ? assessment.optionalReviewNodeIds
    : [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const nodePath = `$.episode.graph.nodes[${index}]`;
    const declarations = node.evidenceDeclarations as JsonObject[];
    if (node.phase === "optional_review") {
      if (
        declarations.length > 0 ||
        hasOwn(node, "pedagogicalContextContract") ||
        independentIds.includes(String(node.nodeId))
      ) {
        return [issue("optional_review_assessment_forbidden", nodePath)];
      }
      continue;
    }
    if (
      !["encounter_build", "near_transfer", "independent_probe"].includes(
        String(node.phase),
      )
    ) {
      return [issue("phase_contract_mismatch", `${nodePath}.phase`)];
    }
    if (
      !isPlainObject(node.pedagogicalContextContract) ||
      node.pedagogicalContextContract.phase !== node.phase
    ) {
      return [
        issue(
          "phase_contract_mismatch",
          `${nodePath}.pedagogicalContextContract.phase`,
        ),
      ];
    }
    for (
      let declarationIndex = 0;
      declarationIndex < declarations.length;
      declarationIndex += 1
    ) {
      if (declarations[declarationIndex].phase !== node.phase) {
        return [
          issue(
            "phase_contract_mismatch",
            `${nodePath}.evidenceDeclarations[${declarationIndex}].phase`,
          ),
        ];
      }
    }
    const declarationKeys = declarations.map((declaration) =>
      canonicalJsonV1(declaration),
    );
    const duplicateDeclarationIndex = uniqueSecondIndex(declarationKeys);
    if (duplicateDeclarationIndex >= 0) {
      return [
        issue(
          "evidence_tuple_duplicate",
          `${nodePath}.evidenceDeclarations[${duplicateDeclarationIndex}]`,
        ),
      ];
    }
    if (
      node.phase === "independent_probe" &&
      node.requiredForCore === true &&
      episode.episodeKind === "ordinary"
    ) {
      return [
        issue("ordinary_probe_gates_access", `${nodePath}.requiredForCore`),
      ];
    }
    if (
      node.phase === "independent_probe" &&
      node.gateEligible === true &&
      episode.episodeKind === "ordinary"
    ) {
      return [issue("ordinary_probe_gates_access", `${nodePath}.gateEligible`)];
    }
    if (
      node.phase === "optional_review" &&
      !optionalIds.includes(String(node.nodeId))
    ) {
      return [issue("optional_review_assessment_forbidden", nodePath)];
    }
  }
  return [];
};

const validateAssessmentProjection = (
  episode: JsonObject,
): readonly V2ContractIssue[] => {
  const graph = episode.graph as JsonObject;
  const nodes = graph.nodes as JsonObject[];
  const assessment = episode.assessmentNodes as JsonObject;
  const checks = [
    ["independentProbeNodeIds", "independent_probe"],
    ["optionalReviewNodeIds", "optional_review"],
  ] as const;
  for (const [key, phase] of checks) {
    const declaredIds = assessment[key] as string[];
    const actualIds = nodes
      .filter((node) => node.phase === phase)
      .map((node) => String(node.nodeId));
    if (key === "independentProbeNodeIds" && declaredIds.length === 0) {
      return [
        issue("assessment_node_invalid", `$.episode.assessmentNodes.${key}`),
      ];
    }
    const duplicateIndex = uniqueSecondIndex(declaredIds);
    if (duplicateIndex >= 0) {
      return [
        issue(
          "assessment_node_invalid",
          `$.episode.assessmentNodes.${key}[${duplicateIndex}]`,
        ),
      ];
    }
    for (let index = 0; index < declaredIds.length; index += 1) {
      const node = nodes.find(
        (candidate) => candidate.nodeId === declaredIds[index],
      );
      if (!node || node.phase !== phase) {
        return [
          issue(
            "assessment_node_invalid",
            `$.episode.assessmentNodes.${key}[${index}]`,
          ),
        ];
      }
    }
    if (!sameStringSet(declaredIds, actualIds)) {
      return [
        issue("assessment_node_invalid", `$.episode.assessmentNodes.${key}`),
      ];
    }
  }
  const independentRef = (episode.learningDesign as JsonObject)
    .independentProbeRef;
  if (
    !(assessment.independentProbeNodeIds as string[]).includes(
      String(independentRef),
    )
  ) {
    return [
      issue(
        "independent_probe_ref_invalid",
        "$.episode.learningDesign.independentProbeRef",
      ),
    ];
  }
  return [];
};

const validateEpisodePackageBoundary = (
  root: JsonObject,
): readonly V2ContractIssue[] => {
  const episode = root.episode as JsonObject;
  const curriculum = root.curriculum as JsonObject;
  if (
    episode.episodeKind === "ordinary" &&
    hasOwn(episode, "checkpointContract")
  ) {
    return [
      issue("checkpoint_contract_forbidden", "$.episode.checkpointContract"),
    ];
  }
  if (episode.episodeKind === "checkpoint") {
    if (
      !isPlainObject(episode.graph) ||
      !isRecordArray((episode.graph as JsonObject).nodes) ||
      ((episode.graph as JsonObject).nodes as JsonObject[]).length !== 9 ||
      ((episode.graph as JsonObject).nodes as JsonObject[]).filter(
        (node) => node.visible === true,
      ).length !== 9
    ) {
      return [
        issue("checkpoint_node_count_policy_mismatch", "$.episode.graph.nodes"),
      ];
    }
    if (![8, 16, 24, 32].includes(Number(episode.ordinal))) {
      return [issue("checkpoint_ordinal_invalid", "$.episode.ordinal")];
    }
    if (!hasOwn(episode, "checkpointContract")) {
      return [
        issue("checkpoint_contract_missing", "$.episode.checkpointContract"),
      ];
    }
  }
  if (episode.seasonId !== curriculum.seasonId) {
    return [issue("episode_identity_mismatch", "$.episode.seasonId")];
  }
  if (isRecordArray(curriculum.episodeRefs)) {
    const ref = curriculum.episodeRefs.find(
      (candidate) => candidate.episodeId === episode.episodeId,
    );
    if (!ref || ref.ordinal !== episode.ordinal) {
      return [issue("episode_identity_mismatch", "$.episode.ordinal")];
    }
    if (
      ref.chapterId !== episode.chapterId ||
      ref.episodeKind !== episode.episodeKind
    ) {
      return [issue("episode_identity_mismatch", "$.episode")];
    }
  }
  return [];
};

const collectLocalizedValueSets = (
  value: unknown,
  path: string,
  output: Array<{ readonly path: string; readonly locales: readonly string[] }>,
): void => {
  if (Array.isArray(value)) {
    if (
      value.length > 0 &&
      value.every(
        (entry) =>
          isPlainObject(entry) &&
          isNonEmptyString(entry.locale) &&
          typeof entry.value === "string",
      )
    ) {
      output.push({
        path,
        locales: value.map((entry) => String((entry as JsonObject).locale)),
      });
    }
    value.forEach((entry, index) =>
      collectLocalizedValueSets(entry, `${path}[${index}]`, output),
    );
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      collectLocalizedValueSets(entry, `${path}.${key}`, output);
    }
  }
};

const detectDirectedCycle = (
  adjacency: ReadonlyMap<string, readonly string[]>,
): boolean => {
  const indegree = new Map<string, number>();
  for (const [node, nextNodes] of adjacency) {
    if (!indegree.has(node)) indegree.set(node, 0);
    for (const next of nextNodes)
      indegree.set(next, (indegree.get(next) ?? 0) + 1);
  }
  const queue = [...indegree]
    .filter(([, degree]) => degree === 0)
    .map(([node]) => node);
  let visited = 0;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const node = queue[cursor];
    visited += 1;
    for (const next of adjacency.get(node) ?? []) {
      const nextDegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) queue.push(next);
    }
  }
  return visited !== indegree.size;
};

const validateLearningReferences = (
  episode: JsonObject,
  dependencies: JsonObject,
): readonly V2ContractIssue[] => {
  const objectiveIds = episode.objectiveIds as string[];
  const skillIds = episode.skillIds as string[];
  const phraseFrames = episode.phraseFrames as JsonObject[];
  const semanticSlots = episode.semanticSlots as JsonObject[];
  const constraintIds = (episode.criticalConstraints as JsonObject[]).map(
    (constraint) => String(constraint.criticalConstraintId),
  );
  const phraseIds = phraseFrames.map((phrase) => String(phrase.phraseFrameId));
  const slotIds = semanticSlots.map((slot) => String(slot.semanticSlotId));
  const contentUnitIds = dependencies.contentUnitIds as string[];
  const graph = episode.graph as JsonObject;
  const nodes = graph.nodes as JsonObject[];
  const nodeIds = nodes.map((node) => String(node.nodeId));

  for (
    let phraseIndex = 0;
    phraseIndex < phraseFrames.length;
    phraseIndex += 1
  ) {
    const phrase = phraseFrames[phraseIndex];
    for (
      let index = 0;
      index < (phrase.semanticSlotIds as string[]).length;
      index += 1
    ) {
      if (!slotIds.includes((phrase.semanticSlotIds as string[])[index])) {
        return [
          issue(
            "content_reference_missing",
            `$.episode.phraseFrames[${phraseIndex}].semanticSlotIds[${index}]`,
          ),
        ];
      }
    }
    for (
      let index = 0;
      index < (phrase.skillIds as string[]).length;
      index += 1
    ) {
      if (!skillIds.includes((phrase.skillIds as string[])[index])) {
        return [
          issue(
            "content_reference_missing",
            `$.episode.phraseFrames[${phraseIndex}].skillIds[${index}]`,
          ),
        ];
      }
    }
  }
  for (let slotIndex = 0; slotIndex < semanticSlots.length; slotIndex += 1) {
    const allowed = semanticSlots[slotIndex].allowedContentUnitIds as string[];
    for (let index = 0; index < allowed.length; index += 1) {
      if (!contentUnitIds.includes(allowed[index])) {
        return [
          issue(
            "content_reference_missing",
            `$.episode.semanticSlots[${slotIndex}].allowedContentUnitIds[${index}]`,
          ),
        ];
      }
    }
  }

  const validateDeclaration = (
    declaration: JsonObject,
    path: string,
  ): V2ContractIssue | undefined => {
    if (!objectiveIds.includes(String(declaration.objectiveId))) {
      return issue("declaration_reference_missing", `${path}.objectiveId`);
    }
    if (!skillIds.includes(String(declaration.skillId))) {
      return issue("declaration_reference_missing", `${path}.skillId`);
    }
    const target = declaration.target as JsonObject;
    const targetId = String(target.targetId);
    const validTarget =
      target.targetKind === "objective"
        ? targetId === declaration.objectiveId &&
          objectiveIds.includes(targetId)
        : target.targetKind === "semantic_slot"
          ? slotIds.includes(targetId)
          : constraintIds.includes(targetId);
    return validTarget
      ? undefined
      : issue("declaration_reference_missing", `${path}.target.targetId`);
  };
  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
    const declarations = nodes[nodeIndex].evidenceDeclarations as JsonObject[];
    for (
      let declarationIndex = 0;
      declarationIndex < declarations.length;
      declarationIndex += 1
    ) {
      const declarationIssue = validateDeclaration(
        declarations[declarationIndex],
        `$.episode.graph.nodes[${nodeIndex}].evidenceDeclarations[${declarationIndex}]`,
      );
      if (declarationIssue) return [declarationIssue];
    }
  }

  const activities = episode.activities as JsonObject[];
  for (
    let activityIndex = 0;
    activityIndex < activities.length;
    activityIndex += 1
  ) {
    const activity = activities[activityIndex];
    const path = `$.episode.activities[${activityIndex}]`;
    const targets = activity.targets as JsonObject;
    for (const [key, published] of [
      ["skillIds", skillIds],
      ["phraseFrameIds", phraseIds],
      ["semanticSlotIds", slotIds],
    ] as const) {
      const values = targets[key] as string[];
      const missingIndex = values.findIndex(
        (value) => !published.includes(value),
      );
      if (missingIndex >= 0)
        return [
          issue(
            "content_reference_missing",
            `${path}.targets.${key}[${missingIndex}]`,
          ),
        ];
    }
    const requirements = activity.requirements as JsonObject;
    const payload = isPlainObject(activity.payload) ? activity.payload : {};
    if (
      isNonEmptyString(payload.promptId) &&
      !(requirements.prompt as string[]).includes(payload.promptId)
    ) {
      return [
        issue("activity_requirement_mismatch", `${path}.requirements.prompt`),
      ];
    }
    if (
      isNonEmptyString(payload.inputMode) &&
      !(requirements.input as string[]).includes(payload.inputMode)
    ) {
      return [
        issue("activity_requirement_mismatch", `${path}.requirements.input`),
      ];
    }
    if (
      (requirements.media as string[]).some(
        (assetId) => !(activity.assetIds as string[]).includes(assetId),
      )
    ) {
      return [
        issue("activity_requirement_mismatch", `${path}.requirements.media`),
      ];
    }
    if (
      isStringArray(payload.phraseFrameIds) &&
      !sameStringSet(payload.phraseFrameIds, targets.phraseFrameIds as string[])
    ) {
      return [
        issue("activity_target_mismatch", `${path}.targets.phraseFrameIds`),
      ];
    }
  }

  const delayedDefinitions = episode.delayedProbeDefinitions as JsonObject[];
  for (
    let definitionIndex = 0;
    definitionIndex < delayedDefinitions.length;
    definitionIndex += 1
  ) {
    const body = delayedDefinitions[definitionIndex].body as JsonObject;
    const declarations = body.evidenceDeclarations as JsonObject[];
    for (
      let declarationIndex = 0;
      declarationIndex < declarations.length;
      declarationIndex += 1
    ) {
      const declarationIssue = validateDeclaration(
        declarations[declarationIndex],
        `$.episode.delayedProbeDefinitions[${definitionIndex}].body.evidenceDeclarations[${declarationIndex}]`,
      );
      if (declarationIssue) return [declarationIssue];
    }
  }

  const capstone = episode.capstoneContract as JsonObject;
  for (const [key, published] of [
    ["objectiveIds", objectiveIds],
    ["requiredSemanticSlotIds", slotIds],
    ["criticalConstraintIds", constraintIds],
    ["primaryNodeIds", nodeIds],
    ["deterministicAlternateNodeIds", nodeIds],
  ] as const) {
    const values = capstone[key] as string[];
    const missingIndex = values.findIndex(
      (value) => !published.includes(value),
    );
    if (missingIndex >= 0)
      return [
        issue(
          "capstone_reference_missing",
          `$.episode.capstoneContract.${key}[${missingIndex}]`,
        ),
      ];
  }
  const expectedCapstoneSlots = (episode.semanticSlots as JsonObject[])
    .filter((slot) => slot.requiredInCapstone === true)
    .map((slot) => String(slot.semanticSlotId));
  if (
    !sameStringSet(
      capstone.requiredSemanticSlotIds as string[],
      expectedCapstoneSlots,
    )
  ) {
    return [
      issue(
        "capstone_reference_invalid",
        "$.episode.capstoneContract.requiredSemanticSlotIds",
      ),
    ];
  }
  const expectedCriticalConstraints = (
    episode.criticalConstraints as JsonObject[]
  ).map((constraint) => String(constraint.criticalConstraintId));
  if (
    !sameStringSet(
      capstone.criticalConstraintIds as string[],
      expectedCriticalConstraints,
    )
  ) {
    return [
      issue(
        "capstone_reference_invalid",
        "$.episode.capstoneContract.criticalConstraintIds",
      ),
    ];
  }
  const graphForCapstone = episode.graph as JsonObject;
  if (
    !sameStringSet(capstone.primaryNodeIds as string[], [
      String(graphForCapstone.capstoneNodeId),
    ])
  ) {
    return [
      issue(
        "capstone_reference_invalid",
        "$.episode.capstoneContract.primaryNodeIds",
      ),
    ];
  }
  const capstonePrimaryNodeIds = capstone.primaryNodeIds as string[];
  const capstoneAlternateNodeIds =
    capstone.deterministicAlternateNodeIds as string[];
  const duplicateCapstoneAlternateIndex = uniqueSecondIndex(
    capstoneAlternateNodeIds,
  );
  if (duplicateCapstoneAlternateIndex >= 0) {
    return [
      issue(
        "capstone_fallback_invalid",
        `$.episode.capstoneContract.deterministicAlternateNodeIds[${duplicateCapstoneAlternateIndex}]`,
      ),
    ];
  }
  if (
    capstoneAlternateNodeIds.length !== 0 &&
    capstoneAlternateNodeIds.length !== capstonePrimaryNodeIds.length
  ) {
    return [
      issue(
        "capstone_fallback_invalid",
        `$.episode.capstoneContract.deterministicAlternateNodeIds[${capstonePrimaryNodeIds.length}]`,
      ),
    ];
  }

  const nodesById = new Map(nodes.map((node) => [String(node.nodeId), node]));
  const capstoneEdges = graphForCapstone.edges as JsonObject[];
  const activitiesById = new Map(
    (episode.activities as JsonObject[]).map((activity) => [
      String(activity.activityId),
      activity,
    ]),
  );
  const graphOutgoing = new Map<string, string[]>();
  for (const node of nodes) graphOutgoing.set(String(node.nodeId), []);
  for (const edge of capstoneEdges) {
    graphOutgoing.get(String(edge.fromNodeId))?.push(String(edge.toNodeId));
  }
  const reaches = (fromNodeId: string, targetNodeId: string): boolean => {
    const visited = new Set<string>();
    const pending = [fromNodeId];
    while (pending.length > 0) {
      const nodeId = pending.pop() as string;
      if (nodeId === targetNodeId) return true;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      pending.push(...(graphOutgoing.get(nodeId) ?? []));
    }
    return false;
  };
  const requiredCapstoneSlots = capstone.requiredSemanticSlotIds as string[];
  for (let index = 0; index < capstoneAlternateNodeIds.length; index += 1) {
    const alternateNodeId = capstoneAlternateNodeIds[index];
    const primaryNodeId = capstonePrimaryNodeIds[index];
    const fallbackPath = `$.episode.capstoneContract.deterministicAlternateNodeIds[${index}]`;
    const alternateNode = nodesById.get(alternateNodeId);
    const primaryNode = nodesById.get(primaryNodeId);
    const alternateActivity = alternateNode
      ? activitiesById.get(String(alternateNode.activityId))
      : undefined;
    const alternateTargets = alternateActivity?.targets as
      | JsonObject
      | undefined;
    const alternateSlotIds = alternateTargets?.semanticSlotIds as
      | string[]
      | undefined;
    const alternateDeclarations = alternateNode?.evidenceDeclarations;
    const alternateObjectiveIds = isRecordArray(alternateDeclarations)
      ? alternateDeclarations.map((declaration) =>
          String(declaration.objectiveId),
        )
      : [];
    const alternateCriticalConstraintIds = isRecordArray(alternateDeclarations)
      ? alternateDeclarations
          .filter(
            (declaration) =>
              isPlainObject(declaration.target) &&
              declaration.target.targetKind === "critical_constraint",
          )
          .map((declaration) =>
            String((declaration.target as JsonObject).targetId),
          )
      : [];
    const alternateFallback = isPlainObject(alternateActivity?.requirements)
      ? alternateActivity.requirements.fallback
      : undefined;
    const alternateCapabilities = isPlainObject(alternateActivity?.capabilities)
      ? alternateActivity.capabilities
      : undefined;
    const hasReachableFallbackBranch = capstoneEdges.some(
      (edge) =>
        edge.condition === "fallback_selected" &&
        String(edge.toNodeId) === alternateNodeId &&
        reaches(String(graph.startNodeId), String(edge.fromNodeId)),
    );
    if (
      alternateNodeId === primaryNodeId ||
      capstonePrimaryNodeIds.includes(alternateNodeId) ||
      !alternateNode ||
      !primaryNode ||
      alternateNode.phase !== primaryNode.phase ||
      alternateNode.requiredForCore !== primaryNode.requiredForCore ||
      alternateNode.visible !== primaryNode.visible ||
      alternateNode.gateEligible !== primaryNode.gateEligible ||
      !hasReachableFallbackBranch ||
      !reaches(alternateNodeId, primaryNodeId) ||
      !isPlainObject(alternateFallback) ||
      alternateFallback.deterministicScripted !== true ||
      alternateFallback.offline === "not_supported" ||
      alternateFallback.nonVoiceCoreEquivalent !== true ||
      !isPlainObject(alternateCapabilities) ||
      alternateCapabilities.microphone === "required" ||
      alternateCapabilities.speechRecognition === "required" ||
      alternateCapabilities.network === "required" ||
      !isStringArray(alternateSlotIds) ||
      requiredCapstoneSlots.some(
        (slotId) => !alternateSlotIds.includes(slotId),
      ) ||
      (capstone.objectiveIds as string[]).some(
        (objectiveId) => !alternateObjectiveIds.includes(objectiveId),
      ) ||
      (capstone.criticalConstraintIds as string[]).some(
        (constraintId) =>
          !alternateCriticalConstraintIds.includes(constraintId),
      )
    ) {
      return [issue("capstone_fallback_invalid", fallbackPath)];
    }
  }

  const learningDesign = episode.learningDesign as JsonObject;
  const designObjectives = learningDesign.objectiveIds as string[];
  if (!sameStringSet(designObjectives, objectiveIds)) {
    return [
      issue("support_plan_invalid", "$.episode.learningDesign.objectiveIds"),
    ];
  }
  const supportPlan = learningDesign.supportPlan as JsonObject[];
  const supportObjectives = supportPlan.map((support) =>
    String(support.objectiveId),
  );
  if (
    uniqueSecondIndex(supportObjectives) >= 0 ||
    !sameStringSet(supportObjectives, objectiveIds)
  ) {
    return [
      issue("support_plan_invalid", "$.episode.learningDesign.supportPlan"),
    ];
  }
  for (let index = 0; index < supportPlan.length; index += 1) {
    const support = supportPlan[index];
    const objectiveId = String(support.objectiveId);
    const encounterNodes = nodes.filter(
      (node) =>
        node.phase === "encounter_build" &&
        (node.evidenceDeclarations as JsonObject[]).some(
          (declaration) => declaration.objectiveId === objectiveId,
        ),
    );
    const initialSupport = String(support.initialSupport);
    const supportedInitialValues = [
      "none",
      "visual_only",
      "partial_cue",
      "model",
      "full_text",
    ];
    if (
      supportedInitialValues.includes(initialSupport) &&
      encounterNodes.length > 0 &&
      encounterNodes.some(
        (node) =>
          !isPlainObject(node.pedagogicalContextContract) ||
          !(
            (node.pedagogicalContextContract as JsonObject)
              .allowedSupportLevels as string[]
          ).includes(initialSupport),
      )
    ) {
      return [
        issue(
          "support_plan_invalid",
          `$.episode.learningDesign.supportPlan[${index}].initialSupport`,
        ),
      ];
    }
  }

  const prerequisiteEdges = learningDesign.prerequisiteEdges as JsonObject[];
  const adjacency = new Map<string, string[]>();
  for (const edge of prerequisiteEdges) {
    const from = edge.from as JsonObject;
    if (
      from.sourceEpisodeId === episode.episodeId &&
      from.kind === "objective"
    ) {
      const fromId = String(from.id);
      const toId = String(edge.toObjectiveId);
      if (!objectiveIds.includes(fromId) || !objectiveIds.includes(toId)) {
        return [
          issue(
            "prerequisite_reference_missing",
            "$.episode.learningDesign.prerequisiteEdges",
          ),
        ];
      }
      if (!adjacency.has(fromId)) adjacency.set(fromId, []);
      adjacency.get(fromId)?.push(toId);
    }
  }
  if (detectDirectedCycle(adjacency)) {
    return [
      issue("prerequisite_cycle", "$.episode.learningDesign.prerequisiteEdges"),
    ];
  }

  const graphContexts = nodes
    .filter((node) => isPlainObject(node.pedagogicalContextContract))
    .map((node) => ({
      node,
      contract: node.pedagogicalContextContract as JsonObject,
    }));
  const independent = graphContexts.find(
    ({ node }) => node.nodeId === learningDesign.independentProbeRef,
  );
  if (independent) {
    const independentContext = independent.contract.context as JsonObject;
    const independentPrompt = independent.contract.prompt as JsonObject;
    const reusesTraining = graphContexts.some(
      ({ node, contract }) =>
        node.nodeId !== learningDesign.independentProbeRef &&
        ((contract.context as JsonObject).contextId ===
          independentContext.contextId ||
          (contract.context as JsonObject).surfaceFormId ===
            independentContext.surfaceFormId ||
          (contract.prompt as JsonObject).promptId ===
            independentPrompt.promptId),
    );
    if (reusesTraining) {
      const index = nodes.findIndex(
        (node) => node.nodeId === learningDesign.independentProbeRef,
      );
      return [
        issue(
          "probe_surface_reused",
          `$.episode.graph.nodes[${index}].pedagogicalContextContract`,
        ),
      ];
    }
  }
  const allGraphSurfaces = graphContexts.map(({ contract }) => ({
    contextId: (contract.context as JsonObject).contextId,
    surfaceFormId: (contract.context as JsonObject).surfaceFormId,
    promptId: (contract.prompt as JsonObject).promptId,
  }));
  for (let index = 0; index < delayedDefinitions.length; index += 1) {
    const delayedContext = (delayedDefinitions[index].body as JsonObject)
      .pedagogicalContextContract as JsonObject;
    const context = delayedContext.context as JsonObject;
    const prompt = delayedContext.prompt as JsonObject;
    if (
      allGraphSurfaces.some(
        (surface) =>
          surface.contextId === context.contextId ||
          surface.surfaceFormId === context.surfaceFormId ||
          surface.promptId === prompt.promptId,
      )
    ) {
      return [
        issue(
          "probe_surface_reused",
          `$.episode.delayedProbeDefinitions[${index}].body.pedagogicalContextContract`,
        ),
      ];
    }
  }

  const mastery = episode.masteryContract as JsonObject;
  const evidencePolicy = mastery.evidencePolicyRef as JsonObject;
  const policies = dependencies.policies as JsonObject[];
  const resolvedEvidencePolicy = policies.find((policy) =>
    sameValue(policy.ref, evidencePolicy),
  );
  if (!resolvedEvidencePolicy) {
    return [
      issue(
        "mastery_policy_mismatch",
        "$.episode.masteryContract.evidencePolicyRef",
      ),
    ];
  }
  const evidenceKinds = (resolvedEvidencePolicy.body as JsonObject)
    .evidenceKinds as string[];
  const graphDeclarations = nodes.flatMap(
    (node) => node.evidenceDeclarations as JsonObject[],
  );
  const delayedDeclarations = delayedDefinitions.flatMap(
    (definition) =>
      (definition.body as JsonObject).evidenceDeclarations as JsonObject[],
  );
  const independentCoverage = new Set(
    graphDeclarations
      .filter((declaration) => declaration.phase === "independent_probe")
      .map(
        (declaration) =>
          `${String(declaration.objectiveId)}\u0000${String(declaration.construct)}`,
      ),
  );
  const delayedCoverage = new Set(
    delayedDeclarations.map(
      (declaration) =>
        `${String(declaration.objectiveId)}\u0000${String(declaration.construct)}`,
    ),
  );
  if (
    independentCoverage.size !== delayedCoverage.size ||
    [...independentCoverage].some((key) => !delayedCoverage.has(key))
  ) {
    return [
      issue(
        "probe_coverage_mismatch",
        "$.episode.delayedProbeDefinitions[0].body.evidenceDeclarations",
      ),
    ];
  }
  const measurableDeclarations = [...graphDeclarations, ...delayedDeclarations];
  const masteryRequirements = mastery.requirements as JsonObject[];
  for (let index = 0; index < masteryRequirements.length; index += 1) {
    const requirement = masteryRequirements[index];
    if (!evidenceKinds.includes(String(requirement.construct))) {
      return [
        issue(
          "mastery_policy_mismatch",
          `$.episode.masteryContract.requirements[${index}].construct`,
        ),
      ];
    }
    if (
      !objectiveIds.includes(String(requirement.objectiveId)) ||
      !measurableDeclarations.some(
        (declaration) =>
          declaration.objectiveId === requirement.objectiveId &&
          declaration.construct === requirement.construct &&
          declaration.phase === requirement.phase,
      )
    ) {
      return [
        issue(
          "mastery_requirement_invalid",
          `$.episode.masteryContract.requirements[${index}]`,
        ),
      ];
    }
  }
  return [];
};

const validateGraph = (episode: JsonObject): readonly V2ContractIssue[] => {
  const graph = episode.graph as JsonObject;
  const nodes = graph.nodes as JsonObject[];
  const edges = graph.edges as JsonObject[];
  const duplicateNodeIndex = uniqueSecondIndex(
    nodes.map((node) => node.nodeId),
  );
  if (duplicateNodeIndex >= 0) {
    return [
      issue(
        "graph_duplicate_id",
        `$.episode.graph.nodes[${duplicateNodeIndex}].nodeId`,
      ),
    ];
  }
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const activityIds = new Set(
    (episode.activities as JsonObject[]).map((activity) => activity.activityId),
  );
  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
    if (!activityIds.has(nodes[nodeIndex].activityId)) {
      return [
        issue(
          "graph_reference_missing",
          `$.episode.graph.nodes[${nodeIndex}].activityId`,
        ),
      ];
    }
  }
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
    for (const endpoint of ["fromNodeId", "toNodeId"] as const) {
      if (!nodeIds.has(edges[edgeIndex][endpoint])) {
        return [
          issue(
            "graph_reference_missing",
            `$.episode.graph.edges[${edgeIndex}].${endpoint}`,
          ),
        ];
      }
    }
  }
  const duplicateEdgeIndex = uniqueSecondIndex(
    edges.map((edge) => edge.edgeId),
  );
  if (duplicateEdgeIndex >= 0) {
    return [
      issue(
        "graph_duplicate_id",
        `$.episode.graph.edges[${duplicateEdgeIndex}].edgeId`,
      ),
    ];
  }

  const outgoing = new Map<unknown, unknown[]>();
  const incomingCount = new Map<unknown, number>();
  for (const node of nodes) {
    outgoing.set(node.nodeId, []);
    incomingCount.set(node.nodeId, 0);
  }
  for (const edge of edges) {
    outgoing.get(edge.fromNodeId)?.push(edge.toNodeId);
    incomingCount.set(
      edge.toNodeId,
      (incomingCount.get(edge.toNodeId) ?? 0) + 1,
    );
  }

  const remainingIndegree = new Map(incomingCount);
  const cycleQueue = nodes
    .filter((node) => (remainingIndegree.get(node.nodeId) ?? 0) === 0)
    .map((node) => node.nodeId);
  let visitedNodeCount = 0;
  for (let cursor = 0; cursor < cycleQueue.length; cursor += 1) {
    const nodeId = cycleQueue[cursor];
    visitedNodeCount += 1;
    for (const next of outgoing.get(nodeId) ?? []) {
      const nextIndegree = (remainingIndegree.get(next) ?? 0) - 1;
      remainingIndegree.set(next, nextIndegree);
      if (nextIndegree === 0) cycleQueue.push(next);
    }
  }
  if (visitedNodeCount !== nodes.length)
    return [issue("graph_cycle", "$.episode.graph.edges")];

  if (
    !nodeIds.has(graph.startNodeId) ||
    (nodes.length > 1 && (outgoing.get(graph.startNodeId)?.length ?? 0) === 0)
  ) {
    return [issue("graph_entry_count_invalid", "$.episode.graph")];
  }
  if (
    !nodeIds.has(graph.capstoneNodeId) ||
    (outgoing.get(graph.capstoneNodeId)?.length ?? 0) !== 0
  ) {
    return [
      issue("graph_capstone_count_invalid", "$.episode.graph.capstoneNodeId"),
    ];
  }

  const reachable = new Set<unknown>();
  const stack: unknown[] = [graph.startNodeId];
  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    stack.push(...(outgoing.get(nodeId) ?? []));
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (
      reachable.has(node.nodeId) &&
      node.nodeId !== graph.capstoneNodeId &&
      (outgoing.get(node.nodeId)?.length ?? 0) === 0
    ) {
      return [issue("graph_dead_end", `$.episode.graph.nodes[${index}]`)];
    }
  }
  for (let index = 0; index < nodes.length; index += 1) {
    if (
      nodes[index].requiredForCore === true &&
      !reachable.has(nodes[index].nodeId)
    ) {
      return [
        issue("graph_unreachable_required", `$.episode.graph.nodes[${index}]`),
      ];
    }
  }
  const entries = nodes.filter(
    (node) => (incomingCount.get(node.nodeId) ?? 0) === 0,
  );
  if (entries.length !== 1 || entries[0]?.nodeId !== graph.startNodeId) {
    return [issue("graph_entry_count_invalid", "$.episode.graph")];
  }
  return [];
};

const validateLoopsAndNearTransfer = (
  episode: JsonObject,
): readonly V2ContractIssue[] => {
  const graph = episode.graph as JsonObject;
  const nodes = graph.nodes as JsonObject[];
  const nodesById = new Map(nodes.map((node) => [node.nodeId, node]));
  if (!isPlainObject(episode.requiredLoops))
    return [issue("field_type_invalid", "$.episode.requiredLoops")];
  const loopChecks = [
    ["encounterBuildNodeIds", "encounter_build"],
    ["nearTransferNodeIds", "near_transfer"],
  ] as const;
  for (const [key, expectedPhase] of loopChecks) {
    const ids = episode.requiredLoops[key];
    if (!isStringArray(ids) || ids.length === 0)
      return [issue("loop_phase_mismatch", `$.episode.requiredLoops.${key}`)];
    const duplicateIndex = uniqueSecondIndex(ids);
    if (duplicateIndex >= 0) {
      return [
        issue(
          "loop_duplicate_id",
          `$.episode.requiredLoops.${key}[${duplicateIndex}]`,
        ),
      ];
    }
    for (let index = 0; index < ids.length; index += 1) {
      if (nodesById.get(ids[index])?.phase !== expectedPhase) {
        return [
          issue(
            "loop_phase_mismatch",
            `$.episode.requiredLoops.${key}[${index}]`,
          ),
        ];
      }
    }
  }

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.phase !== "near_transfer") continue;
    const source = nodesById.get(node.transferFromNodeId);
    const context = isPlainObject(node.pedagogicalContextContract)
      ? node.pedagogicalContextContract
      : undefined;
    const sourceContext =
      source && isPlainObject(source.pedagogicalContextContract)
        ? source.pedagogicalContextContract
        : undefined;
    const identity =
      context && isPlainObject(context.context) ? context.context : undefined;
    const sourceIdentity =
      sourceContext && isPlainObject(sourceContext.context)
        ? sourceContext.context
        : undefined;
    const prompt =
      context && isPlainObject(context.prompt) ? context.prompt : undefined;
    const sourcePrompt =
      sourceContext && isPlainObject(sourceContext.prompt)
        ? sourceContext.prompt
        : undefined;
    const varied = node.variedSemanticSlotIds;
    if (
      !source ||
      !identity ||
      !sourceIdentity ||
      !prompt ||
      !sourcePrompt ||
      identity.contextId === sourceIdentity.contextId ||
      identity.surfaceFormId === sourceIdentity.surfaceFormId ||
      prompt.promptId === sourcePrompt.promptId ||
      prompt.reusedFromTraining !== false ||
      !isStringArray(varied) ||
      varied.length === 0
    ) {
      return [
        issue(
          "near_transfer_replay_forbidden",
          `$.episode.graph.nodes[${index}]`,
        ),
      ];
    }
  }
  return [];
};

const validateEpisodePolicyLimits = (
  episode: JsonObject,
  registry: ResolvedDecisionRegistry,
): readonly V2ContractIssue[] => {
  const nodeSettings = decisionSettings(registry, "HYP-V2-001");
  const dosageSettings = decisionSettings(registry, "HYP-V2-002");
  const starSettings = decisionSettings(registry, "HYP-V2-004");
  if (!nodeSettings || !dosageSettings || !starSettings) {
    return [issue("decision_registry_context_invalid", "$.decisionRegistry")];
  }
  const graph = episode.graph as JsonObject;
  const nodes = graph.nodes as JsonObject[];
  if (episode.episodeKind === "checkpoint" && nodes.length !== 9) {
    return [
      issue("checkpoint_node_count_policy_mismatch", "$.episode.graph.nodes"),
    ];
  }
  if (episode.episodeKind === "ordinary") {
    const visibleCount = nodes.filter((node) => node.visible === true).length;
    if (!rangeContains(nodeSettings.visibleNodeCount, visibleCount)) {
      return [issue("node_count_policy_mismatch", "$.episode.graph.nodes")];
    }
    if (
      episode.schemaVersion === "v2-episode-contract.v1" &&
      (typeof episode.estimatedMinutes !== "number" ||
        !rangeContains(
          nodeSettings.targetEpisodeMinutes,
          episode.estimatedMinutes,
        ))
    ) {
      return [
        issue("episode_dosage_policy_mismatch", "$.episode.estimatedMinutes"),
      ];
    }
    const dosageChecks = [
      ["phraseFrames", dosageSettings.newPhraseFrames],
      ["semanticSlots", dosageSettings.newSemanticSlots],
    ] as const;
    for (const [key, range] of dosageChecks) {
      if (
        !Array.isArray(episode[key]) ||
        !rangeContains(range, episode[key].length)
      ) {
        return [issue("episode_dosage_policy_mismatch", `$.episode.${key}`)];
      }
    }
    if (
      !isStringArray(episode.grammarDistinctionIds) ||
      episode.grammarDistinctionIds.length > 2
    ) {
      return [
        issue("grammar_load_exceeded", "$.episode.grammarDistinctionIds"),
      ];
    }
    if (
      !isStringArray(episode.soundFocusIds) ||
      episode.soundFocusIds.length !== 1 ||
      !rangeContains(
        dosageSettings.newSoundContrasts,
        episode.soundFocusIds.length,
      )
    ) {
      return [
        issue("episode_dosage_policy_mismatch", "$.episode.soundFocusIds"),
      ];
    }
  }

  if (!isRecordArray(episode.starSlots))
    return [issue("field_type_invalid", "$.episode.starSlots")];
  const slots = episode.starSlots;
  const expectedSlotCount = starSettings.gateEligibleSlotsPerEpisode;
  const expectedMaxStars = starSettings.maxStarsPerSlot;
  if (
    typeof expectedSlotCount !== "number" ||
    slots.length !== expectedSlotCount
  ) {
    return [issue("star_slot_policy_mismatch", "$.episode.starSlots")];
  }
  for (let index = 0; index < slots.length; index += 1) {
    if (slots[index].maxStars !== expectedMaxStars) {
      return [
        issue(
          "star_slot_policy_mismatch",
          `$.episode.starSlots[${index}].maxStars`,
        ),
      ];
    }
  }

  const duplicateSlotIndex = uniqueSecondIndex(
    slots.map((slot) => slot.starSlotId),
  );
  if (duplicateSlotIndex >= 0) {
    return [
      issue(
        "graph_duplicate_id",
        `$.episode.starSlots[${duplicateSlotIndex}].starSlotId`,
      ),
    ];
  }
  const slotIds = new Set(slots.map((slot) => slot.starSlotId));
  const nodeById = new Map(nodes.map((node) => [node.nodeId, node]));
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const acceptedNodeIds = slots[slotIndex].acceptedNodeIds as string[];
    if (
      acceptedNodeIds.length === 0 ||
      uniqueSecondIndex(acceptedNodeIds) >= 0
    ) {
      return [
        issue(
          "star_slot_binding_invalid",
          `$.episode.starSlots[${slotIndex}].acceptedNodeIds`,
        ),
      ];
    }
    for (
      let acceptedIndex = 0;
      acceptedIndex < acceptedNodeIds.length;
      acceptedIndex += 1
    ) {
      const accepted = nodeById.get(acceptedNodeIds[acceptedIndex]);
      if (
        !accepted ||
        accepted.gateEligible !== true ||
        accepted.starSlotId !== slots[slotIndex].starSlotId
      ) {
        return [
          issue(
            "star_slot_binding_invalid",
            `$.episode.starSlots[${slotIndex}].acceptedNodeIds[${acceptedIndex}]`,
          ),
        ];
      }
    }
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const nodePath = `$.episode.graph.nodes[${index}]`;
    if (node.gateEligible === false && hasOwn(node, "starSlotId")) {
      return [issue("starless_binding_invalid", `${nodePath}.starSlotId`)];
    }
    if (node.gateEligible === false && node.maxStars !== 0) {
      return [issue("starless_binding_invalid", `${nodePath}.maxStars`)];
    }
    if (
      node.gateEligible === true &&
      (!slotIds.has(node.starSlotId) || node.maxStars !== expectedMaxStars)
    ) {
      return [issue("star_slot_policy_mismatch", nodePath)];
    }
    if (node.gateEligible === true) {
      const slot = slots.find(
        (candidate) => candidate.starSlotId === node.starSlotId,
      );
      if (
        !slot ||
        !(slot.acceptedNodeIds as string[]).includes(String(node.nodeId))
      ) {
        return [issue("star_slot_binding_invalid", nodePath)];
      }
    }
    if (
      isPlainObject(node.fallback) &&
      node.fallback.policy === "alternate_node"
    ) {
      const alternate = nodeById.get(node.fallback.alternateNodeId);
      if (!alternate || alternate.starSlotId !== node.starSlotId) {
        return [
          issue(
            "alternate_star_slot_mismatch",
            `${nodePath}.fallback.alternateNodeId`,
          ),
        ];
      }
    }
  }

  if (!isRecordArray(episode.accessibilityRoutes)) {
    return [issue("field_type_invalid", "$.episode.accessibilityRoutes")];
  }
  const requiredSlots = slots.map((slot) => String(slot.starSlotId));
  const graphEdges = graph.edges as JsonObject[];
  const requiredLoopIds = [
    ...((episode.requiredLoops as JsonObject)
      .encounterBuildNodeIds as string[]),
    ...((episode.requiredLoops as JsonObject).nearTransferNodeIds as string[]),
  ];
  for (let index = 0; index < episode.accessibilityRoutes.length; index += 1) {
    const route = episode.accessibilityRoutes[index];
    const routeNodeIds = route.nodeIds as string[];
    const routeNodeSet = new Set(routeNodeIds);
    const routeNodes = routeNodeIds.map((nodeId) => nodeById.get(nodeId));
    const derivedSlots = routeNodes
      .filter(
        (node): node is JsonObject =>
          Boolean(node) && node?.gateEligible === true,
      )
      .map((node) => String(node.starSlotId));
    const reachable = isStringArray(route.reachableStarSlotIds)
      ? route.reachableStarSlotIds
      : [];
    const routeOutgoing = new Map<string, string[]>();
    for (const nodeId of routeNodeIds) routeOutgoing.set(nodeId, []);
    for (const edge of graphEdges) {
      if (
        routeNodeSet.has(String(edge.fromNodeId)) &&
        routeNodeSet.has(String(edge.toNodeId))
      ) {
        routeOutgoing.get(String(edge.fromNodeId))?.push(String(edge.toNodeId));
      }
    }
    const reached = new Set<string>();
    const routeStack = routeNodeSet.has(String(graph.startNodeId))
      ? [String(graph.startNodeId)]
      : [];
    while (routeStack.length > 0) {
      const nodeId = routeStack.pop() as string;
      if (reached.has(nodeId)) continue;
      reached.add(nodeId);
      routeStack.push(...(routeOutgoing.get(nodeId) ?? []));
    }
    const routeInvalid =
      routeNodeIds.length === 0 ||
      routeNodes.some((node) => !node) ||
      !reached.has(String(graph.capstoneNodeId)) ||
      requiredLoopIds.some((nodeId) => !reached.has(nodeId)) ||
      !sameStringSet([...new Set(derivedSlots)], [...new Set(reachable)]) ||
      !sameStringSet([...new Set(derivedSlots)], requiredSlots) ||
      route.completesRequiredLoops !== true ||
      route.usesAccessBoost !== false ||
      route.requiresNetwork !== false ||
      route.requiresAi !== false ||
      route.requiresVoiceSpecificStar !== false;
    if (routeInvalid) {
      return [
        issue(
          "accessibility_route_unreachable",
          `$.episode.accessibilityRoutes[${index}]`,
        ),
      ];
    }
    if (
      route.routeKind === "accessibility" &&
      isStringArray(route.measuredConstructs) &&
      route.measuredConstructs.some(
        (construct) => construct === "spoken" || construct === "listening",
      )
    ) {
      return [
        issue(
          "accessibility_false_claim",
          `$.episode.accessibilityRoutes[${index}].measuredConstructs`,
        ),
      ];
    }
  }
  return [];
};

const validateDelayedAndLearning = (
  episode: JsonObject,
  dependencies: JsonObject,
  registry: ResolvedDecisionRegistry,
): readonly V2ContractIssue[] => {
  const graph = episode.graph as JsonObject;
  const nodes = graph.nodes as JsonObject[];
  const graphNodeIds = new Set(nodes.map((node) => String(node.nodeId)));
  const schedulerNamespaceIds = new Set<string>(graphNodeIds);
  for (const nodeId of (episode.assessmentNodes as JsonObject)
    .independentProbeNodeIds as string[])
    schedulerNamespaceIds.add(nodeId);
  for (const nodeId of (episode.assessmentNodes as JsonObject)
    .optionalReviewNodeIds as string[])
    schedulerNamespaceIds.add(nodeId);
  for (const slot of episode.starSlots as JsonObject[])
    schedulerNamespaceIds.add(String(slot.starSlotId));
  for (const loopId of [
    ...((episode.requiredLoops as JsonObject)
      .encounterBuildNodeIds as string[]),
    ...((episode.requiredLoops as JsonObject).nearTransferNodeIds as string[]),
  ])
    schedulerNamespaceIds.add(loopId);
  const checkpoint = episode.checkpointContract;
  if (isPlainObject(checkpoint)) {
    for (const nodeId of (checkpoint.assessmentNodeIds as
      | string[]
      | undefined) ?? [])
      schedulerNamespaceIds.add(nodeId);
    for (const route of (checkpoint.deterministicAlternateRoutes as
      | JsonObject[]
      | undefined) ?? []) {
      schedulerNamespaceIds.add(String(route.primaryNodeId));
      schedulerNamespaceIds.add(String(route.alternateNodeId));
    }
  }
  const activities = episode.activities as JsonObject[];
  if (
    !isRecordArray(episode.delayedProbeDefinitions) ||
    episode.delayedProbeDefinitions.length === 0
  ) {
    return [
      issue("delayed_probe_invalid", "$.episode.delayedProbeDefinitions"),
    ];
  }
  const learningDesign = episode.learningDesign;
  if (!isPlainObject(learningDesign))
    return [issue("field_type_invalid", "$.episode.learningDesign")];
  if (
    !isPlainObject(learningDesign.delayedProbeRef) ||
    exactObjectIssues(
      learningDesign.delayedProbeRef,
      ["probeId", "contentHash"],
      [],
      "$.episode.learningDesign.delayedProbeRef",
    ).length > 0
  ) {
    return [
      issue(
        "delayed_probe_ref_invalid",
        "$.episode.learningDesign.delayedProbeRef",
      ),
    ];
  }

  const delayedProbeIds = new Set<string>();
  for (
    let index = 0;
    index < episode.delayedProbeDefinitions.length;
    index += 1
  ) {
    const definition = episode.delayedProbeDefinitions[index];
    const definitionPath = `$.episode.delayedProbeDefinitions[${index}]`;
    if (!isPlainObject(definition.ref) || !isPlainObject(definition.body)) {
      return [issue("delayed_probe_invalid", definitionPath)];
    }
    const ref = definition.ref;
    const body = definition.body;
    if (delayedProbeIds.has(String(ref.probeId))) {
      return [
        issue("delayed_probe_ref_ambiguous", `${definitionPath}.ref.probeId`),
      ];
    }
    delayedProbeIds.add(String(ref.probeId));
    if (schedulerNamespaceIds.has(String(body.probeNodeId))) {
      return [
        issue(
          "delayed_probe_namespace_invalid",
          `${definitionPath}.body.probeNodeId`,
        ),
      ];
    }
    schedulerNamespaceIds.add(String(body.probeNodeId));
    if (!isPlainObject(body.activityBinding)) {
      return [
        issue(
          "delayed_probe_binding_mismatch",
          `${definitionPath}.body.activityBinding`,
        ),
      ];
    }
    const activityBinding = body.activityBinding;
    const activity = activities.find(
      (candidate) => candidate.activityId === activityBinding.activityId,
    );
    if (
      !activity ||
      activity.progressCompatibilityKey !==
        activityBinding.progressCompatibilityKey ||
      !sameValue(activity.templateRef, activityBinding.templateRef)
    ) {
      return [
        issue(
          "delayed_probe_binding_mismatch",
          `${definitionPath}.body.activityBinding`,
        ),
      ];
    }
    if (hasOwn(body, "accessibilityAlternateActivityId")) {
      const alternateActivity = activities.find(
        (candidate) =>
          candidate.activityId === body.accessibilityAlternateActivityId,
      );
      const alternateFallback = isPlainObject(alternateActivity?.requirements)
        ? alternateActivity.requirements.fallback
        : undefined;
      const primaryTargets = isPlainObject(activity.targets)
        ? activity.targets
        : undefined;
      const alternateTargets = isPlainObject(alternateActivity?.targets)
        ? alternateActivity.targets
        : undefined;
      const alternateCapabilities = isPlainObject(
        alternateActivity?.capabilities,
      )
        ? alternateActivity.capabilities
        : undefined;
      const targetsEquivalent =
        isPlainObject(primaryTargets) &&
        isPlainObject(alternateTargets) &&
        isStringArray(primaryTargets.skillIds) &&
        isStringArray(primaryTargets.phraseFrameIds) &&
        isStringArray(primaryTargets.semanticSlotIds) &&
        isStringArray(alternateTargets.skillIds) &&
        isStringArray(alternateTargets.phraseFrameIds) &&
        isStringArray(alternateTargets.semanticSlotIds) &&
        sameStringSet(primaryTargets.skillIds, alternateTargets.skillIds) &&
        sameStringSet(
          primaryTargets.phraseFrameIds,
          alternateTargets.phraseFrameIds,
        ) &&
        sameStringSet(
          primaryTargets.semanticSlotIds,
          alternateTargets.semanticSlotIds,
        );
      const evidenceEquivalent =
        targetsEquivalent &&
        isRecordArray(body.evidenceDeclarations) &&
        body.evidenceDeclarations.every(
          (declaration) =>
            isPlainObject(declaration) &&
            (alternateTargets.skillIds as string[]).includes(
              String(declaration.skillId),
            ) &&
            (!isPlainObject(declaration.target) ||
              declaration.target.targetKind !== "semantic_slot" ||
              (alternateTargets.semanticSlotIds as string[]).includes(
                String(declaration.target.targetId),
              )),
        );
      const alternateEvidenceDeclarations = nodes
        .filter((node) => node.activityId === alternateActivity?.activityId)
        .flatMap((node) =>
          isRecordArray(node.evidenceDeclarations)
            ? node.evidenceDeclarations
            : [],
        );
      const evidenceSignature = (declaration: JsonObject): string =>
        canonicalJsonV1({
          objectiveId: declaration.objectiveId,
          skillId: declaration.skillId,
          construct: declaration.construct,
          target: declaration.target,
        });
      const declarationsEquivalent =
        isRecordArray(body.evidenceDeclarations) &&
        body.evidenceDeclarations.every(isPlainObject) &&
        alternateEvidenceDeclarations.every(isPlainObject) &&
        sameValue(
          body.evidenceDeclarations
            .map((declaration) => evidenceSignature(declaration as JsonObject))
            .sort(),
          alternateEvidenceDeclarations
            .map((declaration) => evidenceSignature(declaration as JsonObject))
            .sort(),
        );
      const delayedObjectiveIds = isRecordArray(body.evidenceDeclarations)
        ? body.evidenceDeclarations.map((declaration) =>
            isPlainObject(declaration) ? String(declaration.objectiveId) : "",
          )
        : [];
      const alternateObjectiveIds = alternateEvidenceDeclarations.map(
        (declaration) =>
          isPlainObject(declaration) ? String(declaration.objectiveId) : "",
      );
      const criticalConstraintIds = (declarations: readonly unknown[]) =>
        declarations.flatMap((declaration) =>
          isPlainObject(declaration) &&
          isPlainObject(declaration.target) &&
          declaration.target.targetKind === "critical_constraint"
            ? [String(declaration.target.targetId)]
            : [],
        );
      const criticalCoverageEquivalent = sameStringSet(
        criticalConstraintIds(
          isRecordArray(body.evidenceDeclarations)
            ? body.evidenceDeclarations
            : [],
        ),
        criticalConstraintIds(alternateEvidenceDeclarations),
      );
      if (
        !alternateActivity ||
        alternateActivity.activityId === activity.activityId ||
        !isPlainObject(alternateFallback) ||
        alternateFallback.deterministicScripted !== true ||
        alternateFallback.offline === "not_supported" ||
        alternateFallback.nonVoiceCoreEquivalent !== true ||
        !isPlainObject(alternateCapabilities) ||
        alternateCapabilities.microphone === "required" ||
        alternateCapabilities.speechRecognition === "required" ||
        alternateCapabilities.network === "required" ||
        !evidenceEquivalent ||
        !declarationsEquivalent ||
        !sameStringSet(delayedObjectiveIds, alternateObjectiveIds) ||
        !criticalCoverageEquivalent
      ) {
        return [
          issue(
            "delayed_probe_accessibility_alternate_invalid",
            `${definitionPath}.body.accessibilityAlternateActivityId`,
          ),
        ];
      }
    }
    if (
      body.targetEpisodeId !== episode.episodeId ||
      body.probeId !== ref.probeId ||
      !isRecordArray(body.evidenceDeclarations) ||
      body.evidenceDeclarations.some(
        (declaration) => declaration.phase !== "delayed_probe",
      ) ||
      !isPlainObject(body.pedagogicalContextContract) ||
      body.pedagogicalContextContract.phase !== "delayed_probe"
    ) {
      return [issue("delayed_probe_invalid", `${definitionPath}.body`)];
    }
    const delayedContext = body.pedagogicalContextContract;
    const contextIdentity = isPlainObject(delayedContext.context)
      ? delayedContext.context
      : undefined;
    const promptIdentity = isPlainObject(delayedContext.prompt)
      ? delayedContext.prompt
      : undefined;
    if (
      !contextIdentity ||
      contextIdentity.newSurfaceForm !== true ||
      !promptIdentity ||
      promptIdentity.reusedFromTraining !== false ||
      promptIdentity.separatePrompt !== true ||
      delayedContext.maximumHints !== 0 ||
      delayedContext.answerExposure !== "forbidden"
    ) {
      return [
        issue(
          "delayed_probe_context_invalid",
          `${definitionPath}.body.pedagogicalContextContract`,
        ),
      ];
    }
    let bodyHash: string;
    try {
      bodyHash = hashCanonicalBody(body);
    } catch {
      return [
        issue(
          "delayed_probe_hash_mismatch",
          `${definitionPath}.ref.contentHash`,
        ),
      ];
    }
    if (ref.contentHash !== bodyHash) {
      return [
        issue(
          "delayed_probe_hash_mismatch",
          `${definitionPath}.ref.contentHash`,
        ),
      ];
    }
    if (!sameValue(learningDesign.delayedProbeRef, ref)) {
      return [
        issue(
          "delayed_probe_ref_mismatch",
          "$.episode.learningDesign.delayedProbeRef",
        ),
      ];
    }
  }

  if (!isRecordArray(episode.reviewLinks))
    return [issue("field_type_invalid", "$.episode.reviewLinks")];
  const delayedSettings = decisionSettings(registry, "HYP-V2-007");
  const expectedWindow = delayedSettings?.delayedWindowPolicyId;
  const delayedScheduleIndexes = episode.reviewLinks
    .map((link, index) => (link.scheduleKind === "delayed_probe" ? index : -1))
    .filter((index) => index >= 0);
  if (delayedScheduleIndexes.length === 0) {
    return [issue("delayed_probe_schedule_missing", "$.episode.reviewLinks")];
  }
  if (delayedScheduleIndexes.length > 1) {
    return [
      issue(
        "delayed_probe_schedule_ambiguous",
        `$.episode.reviewLinks[${delayedScheduleIndexes[1]}]`,
      ),
    ];
  }
  for (let index = 0; index < episode.reviewLinks.length; index += 1) {
    const link = episode.reviewLinks[index];
    const linkPath = `$.episode.reviewLinks[${index}]`;
    if (link.scheduleKind === "optional_review") {
      if (
        !["next_episode", "chapter_checkpoint"].includes(String(link.delay)) ||
        hasOwn(link, "probeRef") ||
        hasOwn(link, "windowPolicyId")
      ) {
        return [issue("review_link_invalid", linkPath)];
      }
    } else if (link.scheduleKind === "delayed_probe") {
      if (link.targetEpisodeId !== episode.episodeId) {
        return [issue("review_link_invalid", `${linkPath}.targetEpisodeId`)];
      }
      if (!["d_plus_1", "d_plus_7", "d_plus_21"].includes(String(link.delay))) {
        return [issue("review_link_invalid", `${linkPath}.delay`)];
      }
      if (
        !sameValue(link.probeRef, learningDesign.delayedProbeRef) ||
        link.windowPolicyId !== expectedWindow ||
        learningDesign.delayedWindowPolicyId !== expectedWindow
      ) {
        return [issue("review_link_invalid", linkPath)];
      }
    } else {
      return [issue("review_link_invalid", `${linkPath}.scheduleKind`)];
    }
  }

  if (!isPlainObject(episode.masteryContract))
    return [issue("field_type_invalid", "$.episode.masteryContract")];
  if (episode.masteryContract.performanceStarsAreLearningEvidence !== false) {
    return [
      issue(
        "mastery_contract_invalid",
        "$.episode.masteryContract.performanceStarsAreLearningEvidence",
      ),
    ];
  }
  if (
    episode.masteryContract.confidentVoiceTurnCountAloneIsSufficient !== false
  ) {
    return [
      issue(
        "mastery_contract_invalid",
        "$.episode.masteryContract.confidentVoiceTurnCountAloneIsSufficient",
      ),
    ];
  }

  if (!isRecordArray(learningDesign.prerequisiteEdges)) {
    return [
      issue("field_type_invalid", "$.episode.learningDesign.prerequisiteEdges"),
    ];
  }
  const prerequisiteEdges = learningDesign.prerequisiteEdges;
  if (
    prerequisiteEdges.some(
      (edge) =>
        isPlainObject(edge.from) &&
        edge.from.id === edge.toObjectiveId &&
        edge.from.sourceEpisodeId === episode.episodeId,
    )
  ) {
    return [
      issue("prerequisite_cycle", "$.episode.learningDesign.prerequisiteEdges"),
    ];
  }
  for (let index = 0; index < prerequisiteEdges.length; index += 1) {
    const edge = prerequisiteEdges[index];
    if (!isPlainObject(edge.from)) continue;
    const source = edge.from;
    if (!["objective", "outcome"].includes(String(source.kind))) {
      return [
        issue(
          "field_value_invalid",
          `$.episode.learningDesign.prerequisiteEdges[${index}].from.kind`,
        ),
      ];
    }
    if (
      !["exposed", "supported_success", "independent_evidence"].includes(
        String(edge.requiredState),
      )
    ) {
      return [
        issue(
          "field_value_invalid",
          `$.episode.learningDesign.prerequisiteEdges[${index}].requiredState`,
        ),
      ];
    }
    if (edge.requiredState !== "exposed") {
      const hasExposure = prerequisiteEdges.some(
        (candidate) =>
          isPlainObject(candidate.from) &&
          candidate.from.sourceEpisodeId === source.sourceEpisodeId &&
          candidate.from.kind === source.kind &&
          candidate.from.id === source.id &&
          candidate.toObjectiveId === edge.toObjectiveId &&
          candidate.requiredState === "exposed",
      );
      if (!hasExposure) {
        return [
          issue(
            "prerequisite_exposure_missing",
            `$.episode.learningDesign.prerequisiteEdges[${index}]`,
          ),
        ];
      }
    }
  }
  if (!isRecordArray(learningDesign.supportPlan)) {
    return [
      issue("field_type_invalid", "$.episode.learningDesign.supportPlan"),
    ];
  }
  const fadeIds = isStringArray(dependencies.fadeRuleIds)
    ? dependencies.fadeRuleIds
    : [];
  const escalationIds = isStringArray(dependencies.escalationRuleIds)
    ? dependencies.escalationRuleIds
    : [];
  for (let index = 0; index < learningDesign.supportPlan.length; index += 1) {
    const support = learningDesign.supportPlan[index];
    if (
      !["model", "full_text", "partial_cue", "visual_only", "none"].includes(
        String(support.initialSupport),
      )
    ) {
      return [
        issue(
          "field_value_invalid",
          `$.episode.learningDesign.supportPlan[${index}].initialSupport`,
        ),
      ];
    }
    if (!fadeIds.includes(String(support.fadeRuleId))) {
      return [
        issue(
          "support_rule_missing",
          `$.episode.learningDesign.supportPlan[${index}].fadeRuleId`,
        ),
      ];
    }
    if (!CODE_OWNED_FADE_RULE_IDS.has(String(support.fadeRuleId))) {
      return [
        issue(
          "support_rule_untrusted",
          `$.episode.learningDesign.supportPlan[${index}].fadeRuleId`,
        ),
      ];
    }
    if (!escalationIds.includes(String(support.escalationRuleId))) {
      return [
        issue(
          "support_rule_missing",
          `$.episode.learningDesign.supportPlan[${index}].escalationRuleId`,
        ),
      ];
    }
    if (!CODE_OWNED_ESCALATION_RULE_IDS.has(String(support.escalationRuleId))) {
      return [
        issue(
          "support_rule_untrusted",
          `$.episode.learningDesign.supportPlan[${index}].escalationRuleId`,
        ),
      ];
    }
  }
  return [];
};

const validateCurriculumInternal = (
  input: unknown,
  registry: ResolvedDecisionRegistry,
): V2ContractValidationResult<V2CurriculumProjection> => {
  const shapeIssues = exactObjectIssues(
    input,
    CURRICULUM_KEYS,
    [],
    "$.curriculum",
  );
  if (shapeIssues.length > 0) return fail(shapeIssues);
  const deepShapeIssues = validateCurriculumDeepShape(input);
  if (deepShapeIssues.length > 0) return fail(deepShapeIssues);
  const identityIssue = curriculumIdentityIssue(input);
  if (identityIssue) return fail([identityIssue]);
  const curriculum = input as JsonObject;
  if (curriculum.schemaVersion !== "v2-curriculum-contract.v1") {
    return fail([
      issue("schema_version_invalid", "$.curriculum.schemaVersion"),
    ]);
  }
  if (!isPlainObject(curriculum.decisionRegistryRef)) {
    return fail([
      issue(
        "decision_registry_ref_invalid",
        "$.curriculum.decisionRegistryRef",
      ),
    ]);
  }
  if (hasOwn(curriculum.decisionRegistryRef, "latest")) {
    return fail([
      issue(
        "decision_registry_ref_invalid",
        "$.curriculum.decisionRegistryRef.latest",
      ),
    ]);
  }
  const refIssues = exactObjectIssues(
    curriculum.decisionRegistryRef,
    ["id", "version", "contentHash"],
    [],
    "$.curriculum.decisionRegistryRef",
    "decision_registry_ref_invalid",
  );
  if (refIssues.length > 0) return fail(refIssues);

  if (!isRecordArray(curriculum.episodeRefs)) {
    return fail([issue("field_type_invalid", "$.curriculum.episodeRefs")]);
  }
  const seenIds = new Set<unknown>();
  const seenOrdinals = new Set<unknown>();
  for (let index = 0; index < curriculum.episodeRefs.length; index += 1) {
    const episodeRef = curriculum.episodeRefs[index];
    if (
      seenIds.has(episodeRef.episodeId) ||
      seenOrdinals.has(episodeRef.ordinal) ||
      episodeRef.ordinal !== index + 1
    ) {
      return fail([
        issue(
          "curriculum_episode_sequence_invalid",
          `$.curriculum.episodeRefs[${index}]`,
        ),
      ]);
    }
    seenIds.add(episodeRef.episodeId);
    seenOrdinals.add(episodeRef.ordinal);
  }

  if (
    !isPlainObject(curriculum.scope) ||
    !Array.isArray(curriculum.scope.includedChapterOrdinals) ||
    !curriculum.scope.includedChapterOrdinals.every((value) =>
      Number.isSafeInteger(value),
    ) ||
    !Array.isArray(curriculum.scope.includedEpisodeOrdinals) ||
    !curriculum.scope.includedEpisodeOrdinals.every((value) =>
      Number.isSafeInteger(value),
    )
  ) {
    return fail([issue("curriculum_scope_invalid", "$.curriculum.scope")]);
  }
  const scope = curriculum.scope;
  const chapterOrdinals = scope.includedChapterOrdinals;
  const episodeOrdinals = scope.includedEpisodeOrdinals;
  const checkpoints = curriculum.checkpointOrdinals;
  const expected =
    scope.kind === "vertical_slice"
      ? { chapters: [1], episodes: [1], checkpoints: [], count: 1 }
      : scope.kind === "chapter_internal"
        ? {
            chapters: [1],
            episodes: Array.from({ length: 8 }, (_, index) => index + 1),
            checkpoints: [8],
            count: 8,
          }
        : scope.kind === "full_season"
          ? {
              chapters: [1, 2, 3, 4],
              episodes: Array.from({ length: 32 }, (_, index) => index + 1),
              checkpoints: [8, 16, 24, 32],
              count: 32,
            }
          : undefined;
  const knownEnvironments = ["lab", "staging", "internal", "production"];
  if (!knownEnvironments.includes(String(curriculum.environment))) {
    return fail([
      issue("curriculum_environment_invalid", "$.curriculum.environment"),
    ]);
  }
  const allowedEnvironments =
    scope.kind === "vertical_slice"
      ? ["lab", "staging"]
      : scope.kind === "chapter_internal"
        ? ["internal", "staging"]
        : ["lab", "staging", "internal", "production"];
  if (
    !expected ||
    !sameValue(chapterOrdinals, expected.chapters) ||
    !sameValue(episodeOrdinals, expected.episodes) ||
    curriculum.episodeRefs.length !== expected.count ||
    !allowedEnvironments.includes(String(curriculum.environment))
  ) {
    return fail([issue("curriculum_scope_invalid", "$.curriculum.scope")]);
  }
  if (!sameValue(checkpoints, expected.checkpoints)) {
    return fail([
      issue("curriculum_checkpoint_invalid", "$.curriculum.checkpointOrdinals"),
    ]);
  }
  for (const checkpointOrdinal of expected.checkpoints) {
    if (
      curriculum.episodeRefs[checkpointOrdinal - 1]?.episodeKind !==
      "checkpoint"
    ) {
      return fail([
        issue(
          "curriculum_checkpoint_invalid",
          `$.curriculum.episodeRefs[${checkpointOrdinal - 1}]`,
        ),
      ]);
    }
  }
  for (let index = 0; index < curriculum.episodeRefs.length; index += 1) {
    if (
      !expected.checkpoints.includes(index + 1) &&
      curriculum.episodeRefs[index].episodeKind !== "ordinary"
    ) {
      return fail([
        issue(
          "curriculum_checkpoint_invalid",
          `$.curriculum.episodeRefs[${index}]`,
        ),
      ]);
    }
  }

  if (
    !isRecordArray(curriculum.chapters) ||
    curriculum.chapters.length !== expected.chapters.length
  ) {
    return fail([issue("curriculum_chapter_invalid", "$.curriculum.chapters")]);
  }
  for (let index = 0; index < curriculum.chapters.length; index += 1) {
    const chapter = curriculum.chapters[index];
    const chapterOrdinal = index + 1;
    const chapterStart = scope.kind === "vertical_slice" ? 0 : index * 8;
    const chapterEnd = scope.kind === "vertical_slice" ? 1 : chapterStart + 8;
    const expectedChapterRefs = curriculum.episodeRefs.slice(
      chapterStart,
      chapterEnd,
    );
    const expectedEpisodeIds = expectedChapterRefs.map((episodeRef) =>
      String(episodeRef.episodeId),
    );
    const expectedCheckpointId = expectedChapterRefs.find(
      (episodeRef) => episodeRef.episodeKind === "checkpoint",
    )?.episodeId;
    if (
      curriculum.chapters.some(
        (candidate, candidateIndex) =>
          candidateIndex < index && candidate.chapterId === chapter.chapterId,
      )
    ) {
      return fail([
        issue(
          "curriculum_chapter_invalid",
          `$.curriculum.chapters[${index}].chapterId`,
        ),
      ]);
    }
    if (
      chapter.ordinal !== chapterOrdinal ||
      !sameValue(chapter.episodeIds, expectedEpisodeIds) ||
      expectedChapterRefs.some(
        (episodeRef) => episodeRef.chapterId !== chapter.chapterId,
      ) ||
      (expectedCheckpointId !== undefined &&
        chapter.checkpointEpisodeId !== expectedCheckpointId) ||
      (expectedCheckpointId === undefined &&
        hasOwn(chapter, "checkpointEpisodeId"))
    ) {
      return fail([
        issue("curriculum_chapter_invalid", `$.curriculum.chapters[${index}]`),
      ]);
    }
  }
  const curriculumEpisodeIds = new Set(
    curriculum.episodeRefs.map((episodeRef) => episodeRef.episodeId),
  );
  for (let index = 0; index < curriculum.episodeRefs.length; index += 1) {
    const prerequisites = curriculum.episodeRefs[index].prerequisiteEpisodeIds;
    if (!isStringArray(prerequisites)) {
      return fail([
        issue(
          "curriculum_prerequisite_invalid",
          `$.curriculum.episodeRefs[${index}].prerequisiteEpisodeIds`,
        ),
      ]);
    }
    for (
      let prerequisiteIndex = 0;
      prerequisiteIndex < prerequisites.length;
      prerequisiteIndex += 1
    ) {
      const prerequisiteId = prerequisites[prerequisiteIndex];
      const prerequisiteRefIndex = curriculum.episodeRefs.findIndex(
        (candidate) => candidate.episodeId === prerequisiteId,
      );
      if (prerequisites.slice(0, prerequisiteIndex).includes(prerequisiteId)) {
        return fail([
          issue(
            "curriculum_prerequisite_invalid",
            `$.curriculum.episodeRefs[${index}].prerequisiteEpisodeIds[${prerequisiteIndex}]`,
          ),
        ]);
      }
      if (
        !curriculumEpisodeIds.has(prerequisiteId) ||
        prerequisiteRefIndex >= index
      ) {
        return fail([
          issue(
            "curriculum_prerequisite_invalid",
            `$.curriculum.episodeRefs[${index}].prerequisiteEpisodeIds[${prerequisiteIndex}]`,
          ),
        ]);
      }
    }
  }

  const accumulatedMaterial = new Map<string, Set<string>>(
    materialKeys.map((key) => [key, new Set<string>()]),
  );
  for (let index = 0; index < curriculum.episodeRefs.length; index += 1) {
    const episodeRef = curriculum.episodeRefs[index];
    const requiredMaterial =
      episodeRef.requiredCheckpointMaterial as JsonObject;
    if (episodeRef.episodeKind === "checkpoint") {
      for (const key of materialKeys) {
        const values = requiredMaterial[key] as string[];
        for (let valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
          if (!accumulatedMaterial.get(key)?.has(values[valueIndex])) {
            return fail([
              issue(
                "curriculum_checkpoint_material_invalid",
                `$.curriculum.episodeRefs[${index}].requiredCheckpointMaterial.${key}[${valueIndex}]`,
              ),
            ]);
          }
        }
      }
    } else if (
      materialKeys.some((key) => (requiredMaterial[key] as string[]).length > 0)
    ) {
      return fail([
        issue(
          "curriculum_checkpoint_material_invalid",
          `$.curriculum.episodeRefs[${index}].requiredCheckpointMaterial`,
        ),
      ]);
    }
    const introducedMaterial = episodeRef.introducedMaterial as JsonObject;
    for (const key of materialKeys) {
      for (const value of introducedMaterial[key] as string[]) {
        accumulatedMaterial.get(key)?.add(value);
      }
    }
  }

  if (!sameValue(curriculum.decisionRegistryRef, registry.record.ref)) {
    return fail([
      issue("decision_registry_mismatch", "$.curriculum.decisionRegistryRef"),
    ]);
  }
  return pass(input as V2CurriculumProjection);
};

const validateLearningPackageInternal = (
  input: unknown,
  context: unknown,
): V2ContractValidationResult<V2LearningPackage> => {
  const shapeIssues = validatePackageShape(input);
  if (shapeIssues.length > 0) return fail(shapeIssues);
  const root = input as JsonObject;
  const episode = root.episode as JsonObject;
  const identityIssue = learningPackageIdentityIssue(root);
  if (identityIssue) return fail([identityIssue]);
  const deepShapeIssues = validatePackageDeepShape(root);
  if (deepShapeIssues.length > 0) return fail(deepShapeIssues);
  const boundaryIssues = validateEpisodePackageBoundary(root);
  if (boundaryIssues.length > 0) return fail(boundaryIssues);
  const registryResult = resolveRegistry(context);
  if (!registryResult.ok) return fail(registryResult.issues);
  const registry = registryResult.value;

  const policyIssues = validatePoliciesAndActivities(root);
  if (policyIssues.length > 0) return fail(policyIssues);
  const phaseIssues = validateNodePhases(episode);
  if (phaseIssues.length > 0) return fail(phaseIssues);
  const assessmentIssues = validateAssessmentProjection(episode);
  if (assessmentIssues.length > 0) return fail(assessmentIssues);
  const graphIssues = validateGraph(episode);
  if (graphIssues.length > 0) return fail(graphIssues);
  const loopIssues = validateLoopsAndNearTransfer(episode);
  if (loopIssues.length > 0) return fail(loopIssues);
  const policyLimitIssues = validateEpisodePolicyLimits(episode, registry);
  if (policyLimitIssues.length > 0) return fail(policyLimitIssues);
  const learningReferenceIssues = validateLearningReferences(
    episode,
    root.dependencies as JsonObject,
  );
  if (learningReferenceIssues.length > 0) return fail(learningReferenceIssues);
  const delayedIssues = validateDelayedAndLearning(
    episode,
    root.dependencies as JsonObject,
    registry,
  );
  if (delayedIssues.length > 0) return fail(delayedIssues);
  const curriculumResult = validateCurriculumInternal(
    root.curriculum,
    registry,
  );
  if (!curriculumResult.ok) return fail(curriculumResult.issues);

  const requiredLocales = (root.curriculum as JsonObject)
    .requiredLocales as string[];
  const localizedValueSets: Array<{
    readonly path: string;
    readonly locales: readonly string[];
  }> = [];
  collectLocalizedValueSets(root.episode, "$.episode", localizedValueSets);
  for (const localized of localizedValueSets) {
    if (
      uniqueSecondIndex(localized.locales) >= 0 ||
      !sameStringSet([...localized.locales], requiredLocales)
    ) {
      return fail([issue("curriculum_locale_closure_invalid", localized.path)]);
    }
  }

  const learningDesign = episode.learningDesign as JsonObject;
  const objectiveIds = new Set(
    (learningDesign.objectiveIds as string[]).map(String),
  );
  const curriculumRefs = (root.curriculum as JsonObject)
    .episodeRefs as JsonObject[];
  const publishedEpisodeIds = new Set(
    curriculumRefs.map((ref) => String(ref.episodeId)),
  );
  const prerequisiteEdges = learningDesign.prerequisiteEdges as JsonObject[];
  for (let index = 0; index < prerequisiteEdges.length; index += 1) {
    const source = prerequisiteEdges[index].from as JsonObject;
    if (source.kind !== "outcome") continue;
    const path = `$.episode.learningDesign.prerequisiteEdges[${index}]`;
    if (
      !isNonEmptyString(source.id) ||
      !isNonEmptyString(source.sourceEpisodeId) ||
      !publishedEpisodeIds.has(String(source.sourceEpisodeId)) ||
      !objectiveIds.has(String(prerequisiteEdges[index].toObjectiveId))
    ) {
      return fail([issue("prerequisite_reference_missing", path)]);
    }
  }

  if (episode.episodeKind === "checkpoint") {
    const graph = episode.graph as JsonObject;
    const nodes = graph.nodes as JsonObject[];
    const curriculum = root.curriculum as JsonObject;
    const curriculumRefs = curriculum.episodeRefs as JsonObject[];
    const currentRefIndex = curriculumRefs.findIndex(
      (ref) => ref.episodeId === episode.episodeId,
    );
    const currentRef = curriculumRefs[currentRefIndex];
    const taughtScope = Object.fromEntries(
      materialKeys.map((key) => [
        key,
        [
          ...new Set(
            curriculumRefs
              .slice(0, currentRefIndex)
              .flatMap(
                (ref) =>
                  (ref.introducedMaterial as JsonObject)[key] as string[],
              ),
          ),
        ],
      ]),
    );
    const checkpointContext: V2CheckpointValidationContext = {
      independentProbeNodeIds: [
        ...((episode.assessmentNodes as JsonObject)
          .independentProbeNodeIds as string[]),
      ],
      nodePhases: Object.fromEntries(
        nodes.map((node) => [String(node.nodeId), String(node.phase)]),
      ),
      declarations: nodes.flatMap((node) =>
        (node.evidenceDeclarations as JsonObject[]).map((declaration) => ({
          nodeId: String(node.nodeId),
          declaration,
        })),
      ),
      taughtScope,
      requiredCheckpointMaterial:
        currentRef.requiredCheckpointMaterial as Readonly<
          Record<string, readonly string[]>
        >,
    };
    const checkpointResult = validateCheckpointInternal(
      episode.checkpointContract,
      checkpointContext,
    );
    if (!checkpointResult.ok) {
      return fail(
        checkpointResult.issues.map((checkpointIssue) => ({
          ...checkpointIssue,
          path: checkpointIssue.path.startsWith("$.checkpoint")
            ? checkpointIssue.path.replace(
                "$.checkpoint",
                "$.episode.checkpointContract",
              )
            : checkpointIssue.path,
        })),
      );
    }
  }

  const dependencies = root.dependencies as JsonObject;
  const curriculum = root.curriculum as JsonObject;
  const currentRefIndex = (curriculum.episodeRefs as JsonObject[]).findIndex(
    (candidate) => candidate.episodeId === episode.episodeId,
  );
  const currentRef =
    currentRefIndex >= 0
      ? (curriculum.episodeRefs as JsonObject[])[currentRefIndex]
      : undefined;
  if (!currentRef) {
    return fail([
      issue("curriculum_episode_ref_missing", "$.curriculum.episodeRefs"),
    ]);
  }
  const episodeMaterial: Record<string, string[]> = {
    skillIds: isStringArray(episode.skillIds) ? episode.skillIds : [],
    phraseFrameIds: isRecordArray(episode.phraseFrames)
      ? episode.phraseFrames.map((frame) => String(frame.phraseFrameId))
      : [],
    grammarDistinctionIds: isStringArray(episode.grammarDistinctionIds)
      ? episode.grammarDistinctionIds
      : [],
    semanticSlotIds: isRecordArray(episode.semanticSlots)
      ? episode.semanticSlots.map((slot) => String(slot.semanticSlotId))
      : [],
    criticalConstraintIds: isRecordArray(episode.criticalConstraints)
      ? episode.criticalConstraints.map((constraint) =>
          String(constraint.criticalConstraintId),
        )
      : [],
  };
  const introducedMaterial = currentRef.introducedMaterial as JsonObject;
  for (const key of materialKeys) {
    if (
      !sameStringSet(introducedMaterial[key] as string[], episodeMaterial[key])
    ) {
      return fail([
        issue(
          "curriculum_material_closure_invalid",
          `$.curriculum.episodeRefs[${currentRefIndex}].introducedMaterial.${key}`,
        ),
      ]);
    }
  }
  const dependencyAssetIds = new Set(dependencies.assetIds as string[]);
  if (
    (curriculum.requiredAssetIds as string[]).some(
      (assetId) => !dependencyAssetIds.has(assetId),
    )
  ) {
    return fail([
      issue("curriculum_asset_missing", "$.curriculum.requiredAssetIds"),
    ]);
  }
  const episodeAssetIds = isStringArray(episode.assetIds)
    ? episode.assetIds
    : [];
  if (
    !sameStringSet(curriculum.requiredAssetIds as string[], episodeAssetIds)
  ) {
    return fail([
      issue(
        "curriculum_asset_closure_invalid",
        "$.curriculum.requiredAssetIds",
      ),
    ]);
  }
  const resolvedCapabilityKeys = new Set(
    (dependencies.templates as JsonObject[]).map((template) =>
      String(
        ((template.body as JsonObject).kernel as JsonObject).activityTypeKey,
      ),
    ),
  );
  const templatesById = new Map(
    (dependencies.templates as JsonObject[]).map((template) => [
      String((template.templateRef as JsonObject).templateId),
      template,
    ]),
  );
  const usedCapabilityKeys = new Set<string>();
  for (const activity of episode.activities as JsonObject[]) {
    const template = templatesById.get(
      String((activity.templateRef as JsonObject).templateId),
    );
    if (template) {
      usedCapabilityKeys.add(
        String(
          ((template.body as JsonObject).kernel as JsonObject).activityTypeKey,
        ),
      );
    }
  }
  for (const definition of episode.delayedProbeDefinitions as JsonObject[]) {
    const binding = (definition.body as JsonObject)
      .activityBinding as JsonObject;
    const template = templatesById.get(
      String((binding.templateRef as JsonObject).templateId),
    );
    if (template) {
      usedCapabilityKeys.add(
        String(
          ((template.body as JsonObject).kernel as JsonObject).activityTypeKey,
        ),
      );
    }
  }
  if (
    (curriculum.requiredCapabilityKeys as string[]).some(
      (key) => !resolvedCapabilityKeys.has(key),
    ) ||
    !sameStringSet(curriculum.requiredCapabilityKeys as string[], [
      ...usedCapabilityKeys,
    ])
  ) {
    return fail([
      issue(
        "curriculum_capability_missing",
        "$.curriculum.requiredCapabilityKeys",
      ),
    ]);
  }

  const episodeRef = (root.curriculum as JsonObject).episodeRefs;
  if (isRecordArray(episodeRef)) {
    const matchingRef = episodeRef.find(
      (candidate) => candidate.episodeId === episode.episodeId,
    );
    if (
      !matchingRef ||
      matchingRef.contentHash !== hashCanonicalBody(episode)
    ) {
      return fail([
        issue("curriculum_episode_hash_mismatch", "$.curriculum.episodeRefs"),
      ]);
    }
  }
  return pass(input as V2LearningPackage);
};

export const validateV2LearningPackage = (
  input: unknown,
  context: V2ContractValidationContext,
): V2ContractValidationResult<V2LearningPackage> => {
  let snapshotOptions: CanonicalJsonSnapshotOptions | undefined;
  try {
    if (input !== null && typeof input === "object" && !Array.isArray(input)) {
      const episodeDescriptor = Reflect.getOwnPropertyDescriptor(
        input,
        "episode",
      );
      if (
        episodeDescriptor?.enumerable === true &&
        !episodeDescriptor.get &&
        !episodeDescriptor.set &&
        hasOwn(episodeDescriptor as unknown as JsonObject, "value") &&
        episodeDescriptor.value !== null &&
        typeof episodeDescriptor.value === "object" &&
        !Array.isArray(episodeDescriptor.value)
      ) {
        const episode = episodeDescriptor.value as object;
        const schemaDescriptor = Reflect.getOwnPropertyDescriptor(
          episode,
          "schemaVersion",
        );
        if (
          schemaDescriptor?.enumerable === true &&
          !schemaDescriptor.get &&
          !schemaDescriptor.set &&
          hasOwn(schemaDescriptor as unknown as JsonObject, "value") &&
          schemaDescriptor.value === "v2-episode-contract.v2"
        ) {
          snapshotOptions = {
            permittedUndefinedDataPropertyPath: "$.episode.sessionSetRef",
          };
        }
      }
    }
  } catch {
    // The canonical snapshot below reports hostile descriptor/proxy traps.
  }
  const inputSnapshot = snapshotCanonicalJsonInput(input, "$", snapshotOptions);
  if (inputSnapshot.ok === false) return fail([inputSnapshot.issue]);
  return safely(() =>
    validateLearningPackageInternal(inputSnapshot.value, context),
  );
};

export const validateV2CurriculumProjection = (
  input: unknown,
  context: V2ContractValidationContext,
): V2ContractValidationResult<V2CurriculumProjection> => {
  const inputSnapshot = snapshotCanonicalJsonInput(input, "$.curriculum");
  if (inputSnapshot.ok === false) return fail([inputSnapshot.issue]);
  return safely<V2CurriculumProjection>(() => {
    const registryResult = resolveRegistry(context);
    if (!registryResult.ok) return fail(registryResult.issues);
    return validateCurriculumInternal(
      inputSnapshot.value,
      registryResult.value,
    );
  });
};

const materialKeys = [
  "skillIds",
  "phraseFrameIds",
  "grammarDistinctionIds",
  "semanticSlotIds",
  "criticalConstraintIds",
] as const;

const targetKey = (target: unknown): string | undefined => {
  if (
    !isPlainObject(target) ||
    !isNonEmptyString(target.targetKind) ||
    !isNonEmptyString(target.targetId)
  ) {
    return undefined;
  }
  return `${target.targetKind}:${target.targetId}`;
};

const validateCheckpointDeepShape = (
  checkpoint: JsonObject,
): V2ContractIssue | undefined => {
  const stringSetKeys = [
    "coveredEpisodeIds",
    "assessedObjectiveIds",
    "assessmentNodeIds",
    "criticalSemanticSlotIds",
    "criticalConstraintIds",
  ] as const;
  for (const key of stringSetKeys) {
    if (
      !isStringArray(checkpoint[key]) ||
      (checkpoint[key] as string[]).some((value) => value.length === 0)
    ) {
      return issue("field_type_invalid", `$.checkpoint.${key}`);
    }
  }
  if (checkpoint.contractKind !== "chapter_assessment") {
    return issue("field_value_invalid", "$.checkpoint.contractKind");
  }
  if (checkpoint.passPolicyKey !== "checkpoint.independent.v1") {
    return issue("field_value_invalid", "$.checkpoint.passPolicyKey");
  }

  if (!isRecordArray(checkpoint.evidenceRequirements)) {
    return issue("field_type_invalid", "$.checkpoint.evidenceRequirements");
  }
  for (
    let index = 0;
    index < checkpoint.evidenceRequirements.length;
    index += 1
  ) {
    const requirement = checkpoint.evidenceRequirements[index];
    const path = `$.checkpoint.evidenceRequirements[${index}]`;
    const shapeIssue = oneExactObjectIssue(
      requirement,
      [
        "assessmentNodeId",
        "objectiveId",
        "skillId",
        "construct",
        "phase",
        "target",
        "requiredOutcome",
      ],
      [],
      path,
    );
    if (shapeIssue) return shapeIssue;
    const targetShape = oneExactObjectIssue(
      requirement.target,
      ["targetKind", "targetId"],
      [],
      `${path}.target`,
    );
    if (targetShape) return targetShape;
    const target = requirement.target as JsonObject;
    if (
      !isNonEmptyString(requirement.assessmentNodeId) ||
      !isNonEmptyString(requirement.objectiveId) ||
      !isNonEmptyString(requirement.skillId) ||
      !["semantic", "listening", "recall", "spoken", "interaction"].includes(
        String(requirement.construct),
      ) ||
      ![
        "encounter_build",
        "near_transfer",
        "independent_probe",
        "delayed_probe",
      ].includes(String(requirement.phase)) ||
      !["objective", "semantic_slot", "critical_constraint"].includes(
        String(target.targetKind),
      ) ||
      !isNonEmptyString(target.targetId) ||
      requirement.requiredOutcome !== "success"
    ) {
      return issue("field_value_invalid", path);
    }
  }

  if (!isRecordArray(checkpoint.deterministicAlternateRoutes)) {
    return issue(
      "field_type_invalid",
      "$.checkpoint.deterministicAlternateRoutes",
    );
  }
  for (
    let index = 0;
    index < checkpoint.deterministicAlternateRoutes.length;
    index += 1
  ) {
    const route = checkpoint.deterministicAlternateRoutes[index];
    const path = `$.checkpoint.deterministicAlternateRoutes[${index}]`;
    const shapeIssue = oneExactObjectIssue(
      route,
      [
        "primaryNodeId",
        "alternateNodeId",
        "assessedObjectiveIds",
        "evidenceTupleKeys",
        "aiIndependent",
        "voiceEvidenceEquivalent",
      ],
      [],
      path,
    );
    if (shapeIssue) return shapeIssue;
    if (
      !isNonEmptyString(route.primaryNodeId) ||
      !isNonEmptyString(route.alternateNodeId) ||
      !isStringArray(route.assessedObjectiveIds) ||
      !isStringArray(route.evidenceTupleKeys)
    ) {
      return issue("field_type_invalid", path);
    }
    if (route.aiIndependent !== true) {
      return issue("field_value_invalid", `${path}.aiIndependent`);
    }
    if (route.voiceEvidenceEquivalent !== false) {
      return issue("field_value_invalid", `${path}.voiceEvidenceEquivalent`);
    }
  }

  if (!isRecordArray(checkpoint.criticalRepairRoutes)) {
    return issue("field_type_invalid", "$.checkpoint.criticalRepairRoutes");
  }
  for (
    let index = 0;
    index < checkpoint.criticalRepairRoutes.length;
    index += 1
  ) {
    const route = checkpoint.criticalRepairRoutes[index];
    const path = `$.checkpoint.criticalRepairRoutes[${index}]`;
    const shapeIssue = oneExactObjectIssue(
      route,
      ["target", "repairNodeId", "reassessmentNodeId"],
      [],
      path,
    );
    if (shapeIssue) return shapeIssue;
    const targetShape = oneExactObjectIssue(
      route.target,
      ["targetKind", "targetId"],
      [],
      `${path}.target`,
    );
    if (targetShape) return targetShape;
    const target = route.target as JsonObject;
    if (
      !["semantic_slot", "critical_constraint"].includes(
        String(target.targetKind),
      ) ||
      !isNonEmptyString(target.targetId) ||
      !isNonEmptyString(route.repairNodeId) ||
      !isNonEmptyString(route.reassessmentNodeId)
    ) {
      return issue("field_value_invalid", path);
    }
  }
  return undefined;
};

const validateCheckpointInternal = (
  input: unknown,
  context: unknown,
): V2ContractValidationResult<V2CheckpointContract> => {
  const checkpointKeys = [
    "contractKind",
    "coveredEpisodeIds",
    "assessedObjectiveIds",
    "assessmentNodeIds",
    "criticalSemanticSlotIds",
    "criticalConstraintIds",
    "evidenceRequirements",
    "passPolicyKey",
    "deterministicAlternateRoutes",
    "criticalRepairRoutes",
  ] as const;
  const shapeIssues = exactObjectIssues(
    input,
    checkpointKeys,
    [],
    "$.checkpoint",
  );
  if (shapeIssues.length > 0) return fail(shapeIssues);
  if (!isPlainObject(context))
    return fail([issue("checkpoint_context_invalid", "$.checkpointContext")]);
  const checkpoint = input as JsonObject;
  const deepShapeIssue = validateCheckpointDeepShape(checkpoint);
  if (deepShapeIssue) return fail([deepShapeIssue]);
  if (
    !isStringArray(checkpoint.assessmentNodeIds) ||
    !isRecordArray(checkpoint.evidenceRequirements)
  ) {
    return fail([
      issue("checkpoint_set_mismatch", "$.checkpoint.assessmentNodeIds"),
    ]);
  }
  const requirementNodeIds = checkpoint.evidenceRequirements.map(
    (requirement) => String(requirement.assessmentNodeId),
  );
  if (
    uniqueSecondIndex(checkpoint.assessmentNodeIds) >= 0 ||
    !sameStringSet(checkpoint.assessmentNodeIds, requirementNodeIds)
  ) {
    return fail([
      issue("checkpoint_set_mismatch", "$.checkpoint.assessmentNodeIds"),
    ]);
  }

  if (
    !isRecordArray(context.declarations) ||
    !isStringArray(context.independentProbeNodeIds)
  ) {
    return fail([issue("checkpoint_context_invalid", "$.checkpointContext")]);
  }
  for (
    let index = 0;
    index < checkpoint.evidenceRequirements.length;
    index += 1
  ) {
    const requirement = checkpoint.evidenceRequirements[index];
    const contextual = context.declarations.find(
      (candidate) => candidate.nodeId === requirement.assessmentNodeId,
    );
    const expectedDeclaration = {
      objectiveId: requirement.objectiveId,
      skillId: requirement.skillId,
      construct: requirement.construct,
      phase: requirement.phase,
      target: requirement.target,
    };
    if (
      !contextual ||
      !sameValue(contextual.declaration, expectedDeclaration) ||
      requirement.phase !== "independent_probe" ||
      requirement.requiredOutcome !== "success" ||
      !context.independentProbeNodeIds.includes(
        String(requirement.assessmentNodeId),
      )
    ) {
      return fail([
        issue(
          "checkpoint_requirement_mismatch",
          `$.checkpoint.evidenceRequirements[${index}]`,
        ),
      ]);
    }
  }

  if (!isStringArray(checkpoint.assessedObjectiveIds)) {
    return fail([
      issue("checkpoint_set_mismatch", "$.checkpoint.assessedObjectiveIds"),
    ]);
  }
  const requirementObjectiveIds = [
    ...new Set(
      checkpoint.evidenceRequirements.map((requirement) =>
        String(requirement.objectiveId),
      ),
    ),
  ];
  if (
    !sameStringSet(checkpoint.assessedObjectiveIds, requirementObjectiveIds)
  ) {
    return fail([
      issue("checkpoint_set_mismatch", "$.checkpoint.assessedObjectiveIds"),
    ]);
  }
  if (
    !isPlainObject(context.nodePhases) ||
    !isRecordArray(checkpoint.deterministicAlternateRoutes)
  ) {
    return fail([
      issue("checkpoint_context_invalid", "$.checkpointContext.nodePhases"),
    ]);
  }
  for (
    let index = 0;
    index < checkpoint.deterministicAlternateRoutes.length;
    index += 1
  ) {
    const route = checkpoint.deterministicAlternateRoutes[index];
    const routePath = `$.checkpoint.deterministicAlternateRoutes[${index}]`;
    if (
      !(checkpoint.assessmentNodeIds as string[]).includes(
        String(route.primaryNodeId),
      )
    ) {
      return fail([
        issue("checkpoint_alternate_invalid", `${routePath}.primaryNodeId`),
      ]);
    }
    const routeRequirements = (
      checkpoint.evidenceRequirements as JsonObject[]
    ).filter(
      (requirement) => requirement.assessmentNodeId === route.primaryNodeId,
    );
    const expectedObjectiveIds = [
      ...new Set(
        routeRequirements.map((requirement) => String(requirement.objectiveId)),
      ),
    ];
    const expectedEvidenceTupleKeys = routeRequirements.map((requirement) =>
      buildLearningEvidenceTupleKey({
        nodeId: String(requirement.assessmentNodeId),
        objectiveId: String(requirement.objectiveId),
        skillId: String(requirement.skillId),
        construct: String(requirement.construct) as
          | "semantic"
          | "listening"
          | "recall"
          | "spoken"
          | "interaction",
        phase: String(requirement.phase) as
          | "encounter_build"
          | "near_transfer"
          | "independent_probe"
          | "delayed_probe",
        targetKind: String((requirement.target as JsonObject).targetKind) as
          | "objective"
          | "semantic_slot"
          | "critical_constraint",
        targetId: String((requirement.target as JsonObject).targetId),
      }),
    );
    if (
      !isStringArray(route.assessedObjectiveIds) ||
      route.assessedObjectiveIds.length === 0 ||
      uniqueSecondIndex(route.assessedObjectiveIds) >= 0 ||
      !sameStringSet(route.assessedObjectiveIds, expectedObjectiveIds)
    ) {
      return fail([
        issue(
          "checkpoint_alternate_invalid",
          `${routePath}.assessedObjectiveIds`,
        ),
      ]);
    }
    if (
      !isStringArray(route.evidenceTupleKeys) ||
      route.evidenceTupleKeys.length === 0 ||
      uniqueSecondIndex(route.evidenceTupleKeys) >= 0 ||
      route.evidenceTupleKeys.some((key) => key.length === 0) ||
      !sameStringSet(route.evidenceTupleKeys, expectedEvidenceTupleKeys)
    ) {
      return fail([
        issue("checkpoint_alternate_invalid", `${routePath}.evidenceTupleKeys`),
      ]);
    }
    if (
      context.nodePhases[String(route.primaryNodeId)] !== "independent_probe" ||
      String(route.alternateNodeId) === String(route.primaryNodeId) ||
      context.nodePhases[String(route.alternateNodeId)] !==
        "independent_probe" ||
      !context.independentProbeNodeIds.includes(String(route.primaryNodeId)) ||
      !context.independentProbeNodeIds.includes(String(route.alternateNodeId))
    ) {
      return fail([
        issue("checkpoint_alternate_invalid", `${routePath}.alternateNodeId`),
      ]);
    }
    const primaryDeclaration = context.declarations.find(
      (entry) => entry.nodeId === String(route.primaryNodeId),
    )?.declaration as JsonObject | undefined;
    const alternateDeclaration = context.declarations.find(
      (entry) => entry.nodeId === String(route.alternateNodeId),
    )?.declaration as JsonObject | undefined;
    const declarationTuple = (declaration: JsonObject | undefined) =>
      declaration &&
      JSON.stringify({
        objectiveId: declaration.objectiveId,
        skillId: declaration.skillId,
        construct: declaration.construct,
        phase: declaration.phase,
        target: declaration.target,
      });
    if (
      !primaryDeclaration ||
      !alternateDeclaration ||
      declarationTuple(primaryDeclaration) !==
        declarationTuple(alternateDeclaration)
    ) {
      return fail([
        issue("checkpoint_alternate_invalid", `${routePath}.alternateNodeId`),
      ]);
    }
  }
  const alternatePrimaryIds = checkpoint.deterministicAlternateRoutes.map(
    (route) => String(route.primaryNodeId),
  );
  const alternateNodeIds = checkpoint.deterministicAlternateRoutes.map(
    (route) => String(route.alternateNodeId),
  );
  if (
    uniqueSecondIndex(alternatePrimaryIds) >= 0 ||
    uniqueSecondIndex(alternateNodeIds) >= 0 ||
    !sameStringSet(
      alternatePrimaryIds,
      checkpoint.assessmentNodeIds as string[],
    )
  ) {
    return fail([
      issue(
        "checkpoint_alternate_invalid",
        "$.checkpoint.deterministicAlternateRoutes",
      ),
    ]);
  }

  if (
    !isStringArray(checkpoint.criticalSemanticSlotIds) ||
    !isStringArray(checkpoint.criticalConstraintIds) ||
    !isRecordArray(checkpoint.criticalRepairRoutes)
  ) {
    return fail([
      issue("checkpoint_critical_coverage_invalid", "$.checkpoint"),
    ]);
  }
  const duplicateSlotIndex = uniqueSecondIndex(
    checkpoint.criticalSemanticSlotIds,
  );
  if (duplicateSlotIndex >= 0) {
    return fail([
      issue(
        "checkpoint_critical_coverage_invalid",
        `$.checkpoint.criticalSemanticSlotIds[${duplicateSlotIndex}]`,
      ),
    ]);
  }
  const duplicateConstraintIndex = uniqueSecondIndex(
    checkpoint.criticalConstraintIds,
  );
  if (duplicateConstraintIndex >= 0) {
    return fail([
      issue(
        "checkpoint_critical_coverage_invalid",
        `$.checkpoint.criticalConstraintIds[${duplicateConstraintIndex}]`,
      ),
    ]);
  }
  const criticalTargets = [
    ...checkpoint.criticalSemanticSlotIds.map((id) => `semantic_slot:${id}`),
    ...checkpoint.criticalConstraintIds.map(
      (id) => `critical_constraint:${id}`,
    ),
  ];
  const requirementTargets = checkpoint.evidenceRequirements.map(
    (requirement) => targetKey(requirement.target),
  );
  const repairTargets = checkpoint.criticalRepairRoutes.map((route) =>
    targetKey(route.target),
  );
  for (
    let index = 0;
    index < checkpoint.criticalRepairRoutes.length;
    index += 1
  ) {
    const route = checkpoint.criticalRepairRoutes[index];
    if (
      context.nodePhases[String(route.repairNodeId)] !== "near_transfer" ||
      context.nodePhases[String(route.reassessmentNodeId)] !==
        "independent_probe" ||
      !context.independentProbeNodeIds.includes(
        String(route.reassessmentNodeId),
      )
    ) {
      return fail([
        issue(
          "checkpoint_critical_coverage_invalid",
          `$.checkpoint.criticalRepairRoutes[${index}].reassessmentNodeId`,
        ),
      ]);
    }
  }
  if (
    criticalTargets.some(
      (key) =>
        requirementTargets.filter((candidate) => candidate === key).length !==
          1 ||
        repairTargets.filter((candidate) => candidate === key).length !== 1,
    )
  ) {
    return fail([
      issue(
        "checkpoint_critical_coverage_invalid",
        "$.checkpoint.criticalRepairRoutes",
      ),
    ]);
  }

  if (
    !isPlainObject(context.taughtScope) ||
    !isPlainObject(context.requiredCheckpointMaterial)
  ) {
    return fail([issue("checkpoint_context_invalid", "$.checkpointContext")]);
  }
  for (const key of materialKeys) {
    const taught = context.taughtScope[key];
    const required = context.requiredCheckpointMaterial[key];
    if (
      !isStringArray(taught) ||
      !isStringArray(required) ||
      required.some((id) => !taught.includes(id))
    ) {
      return fail([
        issue(
          "checkpoint_new_material_forbidden",
          `$.checkpointContext.requiredCheckpointMaterial.${key}`,
        ),
      ]);
    }
  }
  return pass(input as V2CheckpointContract);
};

export const validateV2CheckpointContract = (
  input: unknown,
  context: unknown,
): V2ContractValidationResult<V2CheckpointContract> => {
  const inputSnapshot = snapshotCanonicalJsonInput(input, "$.checkpoint");
  if (inputSnapshot.ok === false) return fail([inputSnapshot.issue]);
  const contextSnapshot = snapshotCanonicalJsonInput(
    context,
    "$.checkpointContext",
  );
  if (contextSnapshot.ok === false) return fail([contextSnapshot.issue]);
  return safely(() =>
    validateCheckpointInternal(inputSnapshot.value, contextSnapshot.value),
  );
};

/** Validate an immutable Episode body without requiring a full package wrapper. */
export const validateV2EpisodeContract = (
  input: unknown,
): V2ContractValidationResult<V2EpisodeContract> => {
  let snapshotOptions: CanonicalJsonSnapshotOptions | undefined;
  try {
    if (input !== null && typeof input === "object" && !Array.isArray(input)) {
      const schemaDescriptor = Reflect.getOwnPropertyDescriptor(
        input,
        "schemaVersion",
      );
      if (
        schemaDescriptor?.enumerable === true &&
        !schemaDescriptor.get &&
        !schemaDescriptor.set &&
        hasOwn(schemaDescriptor as unknown as JsonObject, "value") &&
        schemaDescriptor.value === "v2-episode-contract.v2"
      ) {
        snapshotOptions = {
          permittedUndefinedDataPropertyPath: "$.episode.sessionSetRef",
        };
      }
    }
  } catch {
    // The canonical snapshot below reports hostile descriptors/proxies fail-closed.
  }
  const snapshot = snapshotCanonicalJsonInput(
    input,
    "$.episode",
    snapshotOptions,
  );
  if (snapshot.ok === false) return fail([snapshot.issue]);
  return safely(() => {
    if (!isPlainObject(snapshot.value)) {
      return fail([issue("field_type_invalid", "$.episode")]);
    }
    if (snapshot.value.schemaVersion === "v2-episode-contract.v2") {
      if (
        !hasOwn(snapshot.value, "sessionSetRef") ||
        snapshot.value.sessionSetRef === undefined
      ) {
        return fail([
          issue("episode_session_set_ref_required", "$.episode.sessionSetRef"),
        ]);
      }
      const exactV2Issues = exactObjectIssues(
        snapshot.value,
        EPISODE_V2_KEYS.filter((key) => key !== "checkpointContract"),
        ["checkpointContract"],
        "$.episode",
      );
      if (exactV2Issues.length > 0) return fail(exactV2Issues);
      if (
        !Number.isSafeInteger(snapshot.value.estimatedMinutes) ||
        Number(snapshot.value.estimatedMinutes) < 30 ||
        Number(snapshot.value.estimatedMinutes) > 48
      ) {
        return fail([
          issue(
            "episode_estimated_minutes_invalid",
            "$.episode.estimatedMinutes",
          ),
        ]);
      }
      const sessionSetRef = snapshot.value.sessionSetRef;
      if (
        !isPlainObject(sessionSetRef) ||
        exactObjectIssues(
          sessionSetRef,
          ["episodeId", "version", "contentHash"],
          [],
          "$.episode.sessionSetRef",
        ).length > 0 ||
        sessionSetRef.episodeId !== snapshot.value.episodeId ||
        !isNonEmptyString(sessionSetRef.episodeId) ||
        !V2_IDENTITY_REGEX.test(sessionSetRef.episodeId) ||
        !isPositiveInteger(sessionSetRef.version) ||
        typeof sessionSetRef.contentHash !== "string" ||
        !HASH_PATTERN.test(sessionSetRef.contentHash)
      ) {
        return fail([
          issue("episode_session_set_ref_invalid", "$.episode.sessionSetRef"),
        ]);
      }
      const containerShapeIssue = episodeContainerShapeIssue(snapshot.value);
      if (containerShapeIssue) return fail([containerShapeIssue]);
      const v2Issues = validateEpisodeDeepShape(snapshot.value);
      return v2Issues.length > 0
        ? fail(v2Issues)
        : pass(snapshot.value as unknown as V2EpisodeContract);
    }
    const exactIssues = exactObjectIssues(
      snapshot.value,
      EPISODE_KEYS.filter((key) => key !== "checkpointContract"),
      ["checkpointContract"],
      "$.episode",
    );
    if (exactIssues.length > 0) return fail(exactIssues);
    if (snapshot.value.schemaVersion !== "v2-episode-contract.v1") {
      return fail([issue("schema_version_invalid", "$.episode.schemaVersion")]);
    }
    const containerShapeIssue = episodeContainerShapeIssue(snapshot.value);
    if (containerShapeIssue) return fail([containerShapeIssue]);
    const issues = validateEpisodeDeepShape(snapshot.value);
    return issues.length > 0
      ? fail(issues)
      : pass(snapshot.value as unknown as V2EpisodeContract);
  });
};
