import { createHash } from 'crypto';

export const V2_DECISION_IDS = [
  'HYP-V2-001',
  'HYP-V2-002',
  'HYP-V2-003',
  'HYP-V2-004',
  'HYP-V2-005',
  'HYP-V2-006',
  'HYP-V2-007',
  'HYP-V2-008',
] as const;

export type V2DecisionId = (typeof V2_DECISION_IDS)[number];
export type ClaimLabel = 'PRODUCT_HYPOTHESIS' | 'CALIBRATED' | 'OFFICIAL_STANDARD';
export type Sha256 = string;
export type IsoDateTime = string;

export interface NumericRange {
  readonly min: number;
  readonly max: number;
}

export interface VersionRef {
  readonly id: string;
  readonly version: number;
  readonly contentHash: Sha256;
}

export interface ImmutableObjectRef {
  readonly objectPath: string;
  readonly contentHash: Sha256;
  readonly objectGeneration: string;
  readonly byteSize: number;
}

export interface DecisionEntryBase {
  readonly decisionId: V2DecisionId;
  readonly claimLabel: ClaimLabel;
  readonly owner: string;
  readonly evidenceRefs: readonly VersionRef[];
}

export type V2DecisionEntry =
  | (DecisionEntryBase & {
      readonly decisionId: 'HYP-V2-001';
      readonly settings: {
        readonly seasonEpisodeCount: number;
        readonly chapterCount: number;
        readonly episodesPerChapter: number;
        readonly checkpointOrdinals: readonly number[];
        readonly visibleNodeCount: NumericRange;
        readonly targetEpisodeMinutes: NumericRange;
      };
    })
  | (DecisionEntryBase & {
      readonly decisionId: 'HYP-V2-002';
      readonly settings: {
        readonly newPhraseFrames: NumericRange;
        readonly newSemanticSlots: NumericRange;
        readonly newSoundContrasts: NumericRange;
        readonly targetVoiceTurns: NumericRange;
        readonly maxMandatoryLearningRetries: number;
      };
    })
  | (DecisionEntryBase & {
      readonly decisionId: 'HYP-V2-003';
      readonly settings: {
        readonly completionCutoff: number;
        readonly independentMasteryCutoff: number;
        readonly checkpointCutoffById: Readonly<Record<string, number>>;
      };
    })
  | (DecisionEntryBase & {
      readonly decisionId: 'HYP-V2-004';
      readonly settings: {
        readonly maxStarsPerSlot: number;
        readonly gateEligibleSlotsPerEpisode: number;
        readonly maxStarsPerEpisode: number;
        readonly maxStarsPerSeason: number;
      };
    })
  | (DecisionEntryBase & {
      readonly decisionId: 'HYP-V2-005';
      readonly settings: {
        readonly requiredLoopKinds: readonly ['encounter_build', 'near_transfer'];
        readonly localEarnedMinimumByEpisodeOrdinal: readonly {
          readonly episodeOrdinal: number;
          readonly value: number;
        }[];
        readonly cumulativeAccessByEpisodeOrdinal: readonly {
          readonly episodeOrdinal: number;
          readonly value: number;
        }[];
        readonly seasonAccessTarget: number;
      };
    })
  | (DecisionEntryBase & {
      readonly decisionId: 'HYP-V2-006';
      readonly settings: {
        readonly accessBoostPriceShards: number;
        readonly maxBoostsPerGate: number;
        readonly maxBoostsPerChapter: number;
        readonly maxBoostsPerSeason: number;
        readonly eligibleDeficit: NumericRange;
        readonly recoveryImpressionCount: number;
        readonly quoteTtlSeconds: number;
      };
    })
  | (DecisionEntryBase & {
      readonly decisionId: 'HYP-V2-007';
      readonly settings: {
        readonly delayedWindowPolicyId: string;
        readonly assessableWindowDays: NumericRange;
        readonly postSeasonReviewDays: readonly number[];
        readonly successPolicyId: string;
      };
    })
  | (DecisionEntryBase & {
      readonly decisionId: 'HYP-V2-008';
      readonly settings: {
        readonly rolloutMilestones: readonly {
          readonly rolloutPercent: 0 | 1 | 5 | 10 | 25 | 50 | 100;
          readonly minimumObservationHours: number;
          readonly minimumEligibleAssignments: number;
        }[];
      };
    });

export interface DecisionRegistryBody {
  readonly schemaVersion: 'v2-decision-registry-body.v1';
  readonly registryId: 'phraseman-v2-product-decisions';
  readonly version: number;
  readonly decisions: {
    readonly [K in V2DecisionId]: Extract<V2DecisionEntry, { readonly decisionId: K }>;
  };
}

export interface DecisionRegistryRecord {
  readonly schemaVersion: 'v2-decision-registry-record.v1';
  readonly ref: VersionRef;
  readonly object: ImmutableObjectRef;
  readonly createdAt: IsoDateTime;
}

export interface ResolvedDecisionRegistry {
  readonly body: DecisionRegistryBody;
  readonly record: DecisionRegistryRecord;
}

export type CanonicalJsonErrorCode =
  | 'canonical_json_non_nfc'
  | 'canonical_json_lone_surrogate'
  | 'canonical_json_non_json_value'
  | 'canonical_json_non_finite_number'
  | 'canonical_json_negative_zero'
  | 'canonical_json_sparse_array'
  | 'canonical_json_cycle';

export class CanonicalJsonError extends Error {
  constructor(readonly code: CanonicalJsonErrorCode) {
    super(code);
    this.name = 'CanonicalJsonError';
  }
}

const hasLoneSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
};

const assertCanonicalString = (value: string): void => {
  if (hasLoneSurrogate(value)) throw new CanonicalJsonError('canonical_json_lone_surrogate');
  if (value.normalize('NFC') !== value) throw new CanonicalJsonError('canonical_json_non_nfc');
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const serializeCanonical = (value: unknown, ancestors: Set<object>): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    assertCanonicalString(value);
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CanonicalJsonError('canonical_json_non_finite_number');
    }
    if (Object.is(value, -0)) throw new CanonicalJsonError('canonical_json_negative_zero');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    throw new CanonicalJsonError('canonical_json_non_json_value');
  }
  if (ancestors.has(value)) throw new CanonicalJsonError('canonical_json_cycle');
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw new CanonicalJsonError('canonical_json_non_json_value');
      }
      const keys = Reflect.ownKeys(value);
      const expectedKeys = new Set<string>(['length']);
      for (let index = 0; index < value.length; index += 1) expectedKeys.add(String(index));
      if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
        throw new CanonicalJsonError('canonical_json_non_json_value');
      }
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          throw new CanonicalJsonError('canonical_json_sparse_array');
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !('value' in descriptor)) {
          throw new CanonicalJsonError('canonical_json_non_json_value');
        }
        items.push(serializeCanonical(value[index], ancestors));
      }
      return `[${items.join(',')}]`;
    }
    if (!isPlainObject(value)) throw new CanonicalJsonError('canonical_json_non_json_value');
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== 'string')) {
      throw new CanonicalJsonError('canonical_json_non_json_value');
    }
    const keys = ownKeys as string[];
    for (const key of keys) {
      assertCanonicalString(key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !('value' in descriptor)) {
        throw new CanonicalJsonError('canonical_json_non_json_value');
      }
    }
    keys.sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${serializeCanonical(value[key], ancestors)}`).join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
};

export const canonicalJsonV1 = (value: unknown): string => serializeCanonical(value, new Set());

const utf8Bytes = (value: string): number[] => {
  assertCanonicalString(value);
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index) as number;
    if (codePoint > 0xffff) index += 1;
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
};

export const utf8ByteLengthV1 = (value: string): number => utf8Bytes(value).length;

const sha256Utf8 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const hashCanonicalBody = (body: unknown): Sha256 => sha256Utf8(canonicalJsonV1(body));

export const decisionRegistryObjectPath = (
  registryId: string,
  version: number,
  contentHash: Sha256,
): string =>
  `content-studio/decision-registries/${sha256Utf8(registryId)}/v${version}/${contentHash}.json`;

export interface DecisionRegistryIssue {
  readonly code: string;
  readonly path: string;
  readonly severity: 'blocking';
  readonly waivable: false;
}

const ISSUE_ORDER = [
  'decision_registry_latest_ref_forbidden',
  'decision_registry_body_type_invalid',
  'decision_registry_field_missing',
  'decision_registry_field_unknown',
  'decision_registry_schema_version_invalid',
  'decision_registry_id_invalid',
  'decision_registry_version_invalid',
  'decision_registry_incomplete',
  'decision_registry_decision_key_mismatch',
  'decision_registry_entry_invalid',
  'decision_registry_claim_label_invalid',
  'decision_registry_evidence_ref_invalid',
  'decision_registry_setting_invalid',
  'decision_registry_number_invalid',
  'decision_registry_integer_invalid',
  'decision_registry_fraction_invalid',
  'decision_registry_range_invalid',
  'decision_registry_array_duplicate',
  'decision_registry_array_order_invalid',
  'decision_registry_derived_total_mismatch',
  'decision_registry_curve_unreachable',
  'decision_registry_window_policy_invalid',
  'decision_registry_rollout_milestone_invalid',
  'decision_registry_record_invalid',
  'decision_registry_created_at_invalid',
  'canonical_json_non_nfc',
  'canonical_json_lone_surrogate',
  'canonical_json_non_json_value',
  'canonical_json_non_finite_number',
  'canonical_json_negative_zero',
  'canonical_json_sparse_array',
  'canonical_json_cycle',
  'decision_registry_hash_mismatch',
  'decision_registry_object_hash_mismatch',
  'decision_registry_object_path_mismatch',
  'decision_registry_object_generation_invalid',
  'decision_registry_object_byte_size_invalid',
] as const;

const ISSUE_RANK = new Map<string, number>(ISSUE_ORDER.map((code, index) => [code, index]));
const ID_PATTERN = /^[A-Za-z0-9._-]{1,160}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const CLAIM_LABELS = new Set(['PRODUCT_HYPOTHESIS', 'CALIBRATED', 'OFFICIAL_STANDARD']);
const ROLLOUT_PERCENTAGES = new Set([0, 1, 5, 10, 25, 50, 100]);

const issue = (issues: DecisionRegistryIssue[], code: string, path: string): void => {
  issues.push({ code, path, severity: 'blocking', waivable: false });
};

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
  issues: DecisionRegistryIssue[],
): boolean => {
  const actual = Object.keys(value);
  const missing = expected.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing.length > 0) {
    issue(issues, 'decision_registry_field_missing', `${path}.${missing.sort()[0]}`);
    return false;
  }
  const unknown = actual.filter((key) => !expected.includes(key));
  if (unknown.length > 0) {
    issue(issues, 'decision_registry_field_unknown', `${path}.${unknown.sort()[0]}`);
    return false;
  }
  return true;
};

const safeInteger = (
  value: unknown,
  path: string,
  minimum: number,
  issues: DecisionRegistryIssue[],
): value is number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || Object.is(value, -0)) {
    issue(issues, 'decision_registry_number_invalid', path);
    return false;
  }
  if (!Number.isSafeInteger(value) || value < minimum) {
    issue(issues, 'decision_registry_integer_invalid', path);
    return false;
  }
  return true;
};

const fraction = (value: unknown, path: string, issues: DecisionRegistryIssue[]): value is number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || Object.is(value, -0)) {
    issue(issues, 'decision_registry_number_invalid', path);
    return false;
  }
  if (value < 0 || value > 1) {
    issue(issues, 'decision_registry_fraction_invalid', path);
    return false;
  }
  return true;
};

const integerRange = (
  value: unknown,
  path: string,
  minimum: number,
  issues: DecisionRegistryIssue[],
): value is NumericRange => {
  if (!isPlainObject(value)) {
    issue(issues, 'decision_registry_setting_invalid', path);
    return false;
  }
  if (!exactKeys(value, ['min', 'max'], path, issues)) return false;
  const before = issues.length;
  const minValid = safeInteger(value.min, `${path}.min`, minimum, issues);
  const maxValid = safeInteger(value.max, `${path}.max`, minimum, issues);
  if (issues.length !== before || !minValid || !maxValid) return false;
  if ((value.min as number) > (value.max as number)) {
    issue(issues, 'decision_registry_range_invalid', path);
    return false;
  }
  return true;
};

const validateVersionRef = (
  value: unknown,
  path: string,
  issues: DecisionRegistryIssue[],
): value is VersionRef => {
  if (!isPlainObject(value)) {
    issue(issues, 'decision_registry_evidence_ref_invalid', path);
    return false;
  }
  if (!exactKeys(value, ['id', 'version', 'contentHash'], path, issues)) {
    return false;
  }
  if (typeof value.id !== 'string' || !ID_PATTERN.test(value.id)) {
    issue(issues, 'decision_registry_evidence_ref_invalid', `${path}.id`);
    return false;
  }
  if (typeof value.version !== 'number' || !Number.isSafeInteger(value.version) ||
      value.version < 1 || Object.is(value.version, -0)) {
    issue(issues, 'decision_registry_evidence_ref_invalid', `${path}.version`);
    return false;
  }
  if (typeof value.contentHash !== 'string' || !HASH_PATTERN.test(value.contentHash)) {
    issue(issues, 'decision_registry_evidence_ref_invalid', `${path}.contentHash`);
    return false;
  }
  return true;
};

const validateBaseEntry = (
  value: Record<string, unknown>,
  decisionId: V2DecisionId,
  path: string,
  issues: DecisionRegistryIssue[],
): boolean => {
  if (!exactKeys(value, ['decisionId', 'claimLabel', 'owner', 'evidenceRefs', 'settings'], path, issues)) {
    return false;
  }
  if (value.decisionId !== decisionId) {
    issue(issues, 'decision_registry_decision_key_mismatch', `${path}.decisionId`);
    return false;
  }
  if (typeof value.claimLabel !== 'string' || !CLAIM_LABELS.has(value.claimLabel)) {
    issue(issues, 'decision_registry_claim_label_invalid', `${path}.claimLabel`);
    return false;
  }
  if (typeof value.owner !== 'string' || value.owner.length === 0 || value.owner.length > 160 || value.owner.trim() !== value.owner) {
    issue(issues, 'decision_registry_entry_invalid', `${path}.owner`);
    return false;
  }
  if (!Array.isArray(value.evidenceRefs)) {
    issue(issues, 'decision_registry_evidence_ref_invalid', `${path}.evidenceRefs`);
    return false;
  }
  for (let index = 0; index < value.evidenceRefs.length; index += 1) {
    if (!validateVersionRef(value.evidenceRefs[index], `${path}.evidenceRefs[${index}]`, issues)) return false;
  }
  if (!isPlainObject(value.settings)) {
    issue(issues, 'decision_registry_setting_invalid', `${path}.settings`);
    return false;
  }
  return true;
};

type ValidationContext = {
  seasonEpisodeCount?: number;
  chapterCount?: number;
  checkpointOrdinals?: readonly number[];
  checkpointCutoffIds?: readonly string[];
  maxStarsPerEpisode?: number;
  maxStarsPerSeason?: number;
  checkpointCutoffCount?: number;
  localCurve?: readonly Record<string, unknown>[];
  cumulativeCurve?: readonly Record<string, unknown>[];
  seasonAccessTarget?: number;
};

const validateOrdinalItems = (
  value: unknown,
  path: string,
  issues: DecisionRegistryIssue[],
): readonly Record<string, unknown>[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) {
    issue(issues, 'decision_registry_setting_invalid', path);
    return undefined;
  }
  const items: Record<string, unknown>[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!isPlainObject(item) || !exactKeys(item, ['episodeOrdinal', 'value'], `${path}[${index}]`, issues)) {
      return undefined;
    }
    if (!safeInteger(item.episodeOrdinal, `${path}[${index}].episodeOrdinal`, 1, issues) ||
        !safeInteger(item.value, `${path}[${index}].value`, 0, issues)) return undefined;
    items.push(item);
  }
  const ordinals = items.map((item) => item.episodeOrdinal as number);
  if (new Set(ordinals).size !== ordinals.length) {
    issue(issues, 'decision_registry_array_duplicate', path);
    return undefined;
  }
  if (ordinals.some((ordinal, index) => index > 0 && ordinal <= ordinals[index - 1])) {
    issue(issues, 'decision_registry_array_order_invalid', path);
    return undefined;
  }
  return items;
};

const validateIncreasingIntegers = (
  value: unknown,
  path: string,
  minimum: number,
  issues: DecisionRegistryIssue[],
): readonly number[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) {
    issue(issues, 'decision_registry_setting_invalid', path);
    return undefined;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!safeInteger(value[index], `${path}[${index}]`, minimum, issues)) return undefined;
  }
  const numbers = value as number[];
  if (new Set(numbers).size !== numbers.length) {
    issue(issues, 'decision_registry_array_duplicate', path);
    return undefined;
  }
  if (numbers.some((number, index) => index > 0 && number <= numbers[index - 1])) {
    issue(issues, 'decision_registry_array_order_invalid', path);
    return undefined;
  }
  return numbers;
};

const validateDecisionSettings = (
  decisionId: V2DecisionId,
  settings: Record<string, unknown>,
  path: string,
  context: ValidationContext,
  issues: DecisionRegistryIssue[],
): boolean => {
  const before = issues.length;
  if (decisionId === 'HYP-V2-001') {
    if (!exactKeys(settings, ['seasonEpisodeCount', 'chapterCount', 'episodesPerChapter', 'checkpointOrdinals', 'visibleNodeCount', 'targetEpisodeMinutes'], path, issues)) return false;
    const seasonOk = safeInteger(settings.seasonEpisodeCount, `${path}.seasonEpisodeCount`, 1, issues);
    const chapterOk = safeInteger(settings.chapterCount, `${path}.chapterCount`, 1, issues);
    const perChapterOk = safeInteger(settings.episodesPerChapter, `${path}.episodesPerChapter`, 1, issues);
    const checkpoints = validateIncreasingIntegers(settings.checkpointOrdinals, `${path}.checkpointOrdinals`, 1, issues);
    integerRange(settings.visibleNodeCount, `${path}.visibleNodeCount`, 1, issues);
    integerRange(settings.targetEpisodeMinutes, `${path}.targetEpisodeMinutes`, 1, issues);
    if (issues.length === before && seasonOk && chapterOk && perChapterOk && checkpoints) {
      const season = settings.seasonEpisodeCount as number;
      const chapters = settings.chapterCount as number;
      const perChapter = settings.episodesPerChapter as number;
      if (season !== chapters * perChapter || checkpoints.length !== chapters ||
          checkpoints.some((ordinal, index) => ordinal !== (index + 1) * perChapter) ||
          checkpoints.at(-1) !== season) {
        issue(issues, 'decision_registry_derived_total_mismatch', path);
      } else {
        context.seasonEpisodeCount = season;
        context.chapterCount = chapters;
        context.checkpointOrdinals = checkpoints;
      }
    }
  } else if (decisionId === 'HYP-V2-002') {
    if (!exactKeys(settings, ['newPhraseFrames', 'newSemanticSlots', 'newSoundContrasts', 'targetVoiceTurns', 'maxMandatoryLearningRetries'], path, issues)) return false;
    integerRange(settings.newPhraseFrames, `${path}.newPhraseFrames`, 0, issues);
    integerRange(settings.newSemanticSlots, `${path}.newSemanticSlots`, 0, issues);
    integerRange(settings.newSoundContrasts, `${path}.newSoundContrasts`, 0, issues);
    integerRange(settings.targetVoiceTurns, `${path}.targetVoiceTurns`, 0, issues);
    safeInteger(settings.maxMandatoryLearningRetries, `${path}.maxMandatoryLearningRetries`, 0, issues);
  } else if (decisionId === 'HYP-V2-003') {
    if (!exactKeys(settings, ['completionCutoff', 'independentMasteryCutoff', 'checkpointCutoffById'], path, issues)) return false;
    fraction(settings.completionCutoff, `${path}.completionCutoff`, issues);
    fraction(settings.independentMasteryCutoff, `${path}.independentMasteryCutoff`, issues);
    if (!isPlainObject(settings.checkpointCutoffById) || Object.keys(settings.checkpointCutoffById).length === 0) {
      issue(issues, 'decision_registry_setting_invalid', `${path}.checkpointCutoffById`);
    } else {
      for (const checkpointId of Object.keys(settings.checkpointCutoffById).sort()) {
        if (!ID_PATTERN.test(checkpointId)) {
          issue(issues, 'decision_registry_id_invalid', `${path}.checkpointCutoffById.${checkpointId}`);
          break;
        }
        fraction(settings.checkpointCutoffById[checkpointId], `${path}.checkpointCutoffById.${checkpointId}`, issues);
      }
      context.checkpointCutoffIds = Object.keys(settings.checkpointCutoffById).sort();
      context.checkpointCutoffCount = context.checkpointCutoffIds.length;
    }
  } else if (decisionId === 'HYP-V2-004') {
    if (!exactKeys(settings, ['maxStarsPerSlot', 'gateEligibleSlotsPerEpisode', 'maxStarsPerEpisode', 'maxStarsPerSeason'], path, issues)) return false;
    const slotOk = safeInteger(settings.maxStarsPerSlot, `${path}.maxStarsPerSlot`, 1, issues);
    const countOk = safeInteger(settings.gateEligibleSlotsPerEpisode, `${path}.gateEligibleSlotsPerEpisode`, 1, issues);
    const episodeOk = safeInteger(settings.maxStarsPerEpisode, `${path}.maxStarsPerEpisode`, 1, issues);
    const seasonOk = safeInteger(settings.maxStarsPerSeason, `${path}.maxStarsPerSeason`, 1, issues);
    if (slotOk && countOk && episodeOk && seasonOk) {
      context.maxStarsPerEpisode = settings.maxStarsPerEpisode as number;
      context.maxStarsPerSeason = settings.maxStarsPerSeason as number;
      if ((settings.maxStarsPerEpisode as number) !==
            (settings.maxStarsPerSlot as number) * (settings.gateEligibleSlotsPerEpisode as number) ||
          (context.seasonEpisodeCount !== undefined &&
            (settings.maxStarsPerSeason as number) !==
              (settings.maxStarsPerEpisode as number) * context.seasonEpisodeCount)) {
        issue(issues, 'decision_registry_derived_total_mismatch', path);
      }
    }
  } else if (decisionId === 'HYP-V2-005') {
    if (!exactKeys(settings, ['requiredLoopKinds', 'localEarnedMinimumByEpisodeOrdinal', 'cumulativeAccessByEpisodeOrdinal', 'seasonAccessTarget'], path, issues)) return false;
    if (!Array.isArray(settings.requiredLoopKinds) || settings.requiredLoopKinds.length !== 2 ||
        settings.requiredLoopKinds[0] !== 'encounter_build' || settings.requiredLoopKinds[1] !== 'near_transfer') {
      issue(issues, 'decision_registry_setting_invalid', `${path}.requiredLoopKinds`);
    }
    context.localCurve = validateOrdinalItems(settings.localEarnedMinimumByEpisodeOrdinal, `${path}.localEarnedMinimumByEpisodeOrdinal`, issues);
    context.cumulativeCurve = validateOrdinalItems(settings.cumulativeAccessByEpisodeOrdinal, `${path}.cumulativeAccessByEpisodeOrdinal`, issues);
    if (safeInteger(settings.seasonAccessTarget, `${path}.seasonAccessTarget`, 0, issues)) {
      context.seasonAccessTarget = settings.seasonAccessTarget as number;
    }
  } else if (decisionId === 'HYP-V2-006') {
    if (!exactKeys(settings, ['accessBoostPriceShards', 'maxBoostsPerGate', 'maxBoostsPerChapter', 'maxBoostsPerSeason', 'eligibleDeficit', 'recoveryImpressionCount', 'quoteTtlSeconds'], path, issues)) return false;
    safeInteger(settings.accessBoostPriceShards, `${path}.accessBoostPriceShards`, 1, issues);
    const gateOk = safeInteger(settings.maxBoostsPerGate, `${path}.maxBoostsPerGate`, 1, issues);
    safeInteger(settings.maxBoostsPerChapter, `${path}.maxBoostsPerChapter`, 1, issues);
    safeInteger(settings.maxBoostsPerSeason, `${path}.maxBoostsPerSeason`, 1, issues);
    const deficitOk = integerRange(settings.eligibleDeficit, `${path}.eligibleDeficit`, 1, issues);
    safeInteger(settings.recoveryImpressionCount, `${path}.recoveryImpressionCount`, 0, issues);
    safeInteger(settings.quoteTtlSeconds, `${path}.quoteTtlSeconds`, 1, issues);
    if (gateOk && deficitOk) {
      const deficitMaximum = (settings.eligibleDeficit as NumericRange).max;
      const caps = [settings.maxBoostsPerGate, settings.maxBoostsPerChapter, settings.maxBoostsPerSeason];
      if (caps.every((cap) => typeof cap === 'number' && Number.isSafeInteger(cap)) &&
          caps.some((cap) => deficitMaximum > (cap as number))) {
        issue(issues, 'decision_registry_curve_unreachable', `${path}.eligibleDeficit`);
      }
    }
  } else if (decisionId === 'HYP-V2-007') {
    if (!exactKeys(settings, ['delayedWindowPolicyId', 'assessableWindowDays', 'postSeasonReviewDays', 'successPolicyId'], path, issues)) return false;
    if (settings.delayedWindowPolicyId !== 'dts-7.d3-d7.v1') {
      issue(issues, 'decision_registry_window_policy_invalid', `${path}.delayedWindowPolicyId`);
    }
    const windowOk = integerRange(settings.assessableWindowDays, `${path}.assessableWindowDays`, 1, issues);
    if (windowOk && ((settings.assessableWindowDays as NumericRange).min !== 3 || (settings.assessableWindowDays as NumericRange).max !== 7)) {
      issue(issues, 'decision_registry_window_policy_invalid', `${path}.assessableWindowDays`);
    }
    validateIncreasingIntegers(settings.postSeasonReviewDays, `${path}.postSeasonReviewDays`, 1, issues);
    if (settings.successPolicyId !== 'dts-7.independent-transfer-success.v1') {
      issue(issues, 'decision_registry_window_policy_invalid', `${path}.successPolicyId`);
    }
  } else {
    if (!exactKeys(settings, ['rolloutMilestones'], path, issues)) return false;
    const milestones = settings.rolloutMilestones;
    if (!Array.isArray(milestones) || milestones.length === 0) {
      issue(issues, 'decision_registry_rollout_milestone_invalid', `${path}.rolloutMilestones`);
    } else {
      const percentages: number[] = [];
      let structural = true;
      for (let index = 0; index < milestones.length; index += 1) {
        const milestone = milestones[index];
        const itemPath = `${path}.rolloutMilestones[${index}]`;
        if (!isPlainObject(milestone)) {
          issue(issues, 'decision_registry_setting_invalid', itemPath);
          structural = false;
          break;
        }
        if (!exactKeys(milestone, ['rolloutPercent', 'minimumObservationHours', 'minimumEligibleAssignments'], itemPath, issues)) {
          structural = false;
          break;
        }
        if (!safeInteger(milestone.rolloutPercent, `${itemPath}.rolloutPercent`, 0, issues) ||
            !ROLLOUT_PERCENTAGES.has(milestone.rolloutPercent as number)) {
          if (Number.isSafeInteger(milestone.rolloutPercent)) {
            issue(issues, 'decision_registry_rollout_milestone_invalid', `${itemPath}.rolloutPercent`);
          }
          structural = false;
          break;
        }
        const hoursOk = safeInteger(milestone.minimumObservationHours, `${itemPath}.minimumObservationHours`, 0, issues);
        const assignmentsOk = safeInteger(milestone.minimumEligibleAssignments, `${itemPath}.minimumEligibleAssignments`, 0, issues);
        if (hoursOk && assignmentsOk && (milestone.rolloutPercent as number) > 0 &&
            ((milestone.minimumObservationHours as number) === 0 || (milestone.minimumEligibleAssignments as number) === 0)) {
          issue(issues, 'decision_registry_rollout_milestone_invalid', itemPath);
          structural = false;
          break;
        }
        percentages.push(milestone.rolloutPercent as number);
      }
      if (structural) {
        if (new Set(percentages).size !== percentages.length) {
          issue(issues, 'decision_registry_array_duplicate', `${path}.rolloutMilestones`);
        } else if (percentages.some((percent, index) => index > 0 && percent <= percentages[index - 1])) {
          issue(issues, 'decision_registry_array_order_invalid', `${path}.rolloutMilestones`);
        } else {
          for (let index = 1; index < milestones.length; index += 1) {
            const previous = milestones[index - 1] as Record<string, number>;
            const current = milestones[index] as Record<string, number>;
            if (current.minimumObservationHours < previous.minimumObservationHours ||
                current.minimumEligibleAssignments < previous.minimumEligibleAssignments) {
              issue(issues, 'decision_registry_rollout_milestone_invalid', `${path}.rolloutMilestones[${index}]`);
              break;
            }
          }
        }
      }
    }
  }
  return issues.length === before;
};

const validateBody = (
  value: unknown,
  issues: DecisionRegistryIssue[],
): { body?: Record<string, unknown>; context: ValidationContext; valid: boolean } => {
  const context: ValidationContext = {};
  if (!isPlainObject(value)) {
    issue(issues, 'decision_registry_body_type_invalid', '$.body');
    return { context, valid: false };
  }
  if (!exactKeys(value, ['schemaVersion', 'registryId', 'version', 'decisions'], '$.body', issues)) {
    return { body: value, context, valid: false };
  }
  let valid = true;
  if (value.schemaVersion !== 'v2-decision-registry-body.v1') {
    issue(issues, 'decision_registry_schema_version_invalid', '$.body.schemaVersion');
    valid = false;
  }
  if (value.registryId !== 'phraseman-v2-product-decisions') {
    issue(issues, 'decision_registry_id_invalid', '$.body.registryId');
    valid = false;
  }
  if (!safeInteger(value.version, '$.body.version', 1, issues)) valid = false;
  if (!isPlainObject(value.decisions)) {
    issue(issues, 'decision_registry_incomplete', '$.body.decisions');
    return { body: value, context, valid: false };
  }
  const decisionKeys = Object.keys(value.decisions).sort();
  if (decisionKeys.length !== V2_DECISION_IDS.length ||
      decisionKeys.some((key, index) => key !== [...V2_DECISION_IDS].sort()[index])) {
    issue(issues, 'decision_registry_incomplete', '$.body.decisions');
    return { body: value, context, valid: false };
  }
  const decisionValidity = new Map<V2DecisionId, boolean>();
  for (const decisionId of V2_DECISION_IDS) {
    const entry = value.decisions[decisionId];
    const entryPath = `$.body.decisions.${decisionId}`;
    if (!isPlainObject(entry)) {
      issue(issues, 'decision_registry_entry_invalid', entryPath);
      valid = false;
      decisionValidity.set(decisionId, false);
      continue;
    }
    if (!validateBaseEntry(entry, decisionId, entryPath, issues)) {
      valid = false;
      decisionValidity.set(decisionId, false);
      continue;
    }
    const settingsValid = validateDecisionSettings(
      decisionId,
      entry.settings as Record<string, unknown>,
      `${entryPath}.settings`,
      context,
      issues,
    );
    decisionValidity.set(decisionId, settingsValid);
    if (!settingsValid) {
      valid = false;
    }
  }
  if (value.version === 1 && decisionValidity.get('HYP-V2-008')) {
    const rolloutMilestones = (
      (value.decisions['HYP-V2-008'] as Record<string, unknown>).settings as Record<string, unknown>
    ).rolloutMilestones as readonly Record<string, unknown>[];
    const internalMilestone = rolloutMilestones[0];
    if (
      rolloutMilestones.length !== 1 ||
      internalMilestone.rolloutPercent !== 0 ||
      internalMilestone.minimumObservationHours !== 0 ||
      internalMilestone.minimumEligibleAssignments !== 0
    ) {
      issue(
        issues,
        'decision_registry_rollout_milestone_invalid',
        '$.body.decisions.HYP-V2-008.settings.rolloutMilestones',
      );
      valid = false;
    }
  }
  if (decisionValidity.get('HYP-V2-001') && decisionValidity.get('HYP-V2-003')) {
    const expectedCheckpointIds = (context.checkpointOrdinals ?? [])
      .map((ordinal) => `ep-${String(ordinal).padStart(2, '0')}`)
      .sort();
    if (context.checkpointCutoffCount !== context.chapterCount ||
        context.checkpointCutoffIds?.some((id, index) => id !== expectedCheckpointIds[index])) {
      issue(issues, 'decision_registry_derived_total_mismatch', '$.body.decisions.HYP-V2-003.settings.checkpointCutoffById');
      valid = false;
    }
  }
  if (decisionValidity.get('HYP-V2-001') && decisionValidity.get('HYP-V2-004') &&
      decisionValidity.get('HYP-V2-005')) {
    const local = context.localCurve ?? [];
    const cumulative = context.cumulativeCurve ?? [];
    const seasonCount = context.seasonEpisodeCount as number;
    const maxEpisode = context.maxStarsPerEpisode as number;
    const maxSeason = context.maxStarsPerSeason as number;
    if (local.length !== seasonCount || local.some((item, index) => item.episodeOrdinal !== index + 1) ||
        cumulative.length !== seasonCount - 1 || cumulative.some((item, index) => item.episodeOrdinal !== index + 2)) {
      issue(issues, 'decision_registry_derived_total_mismatch', '$.body.decisions.HYP-V2-005.settings');
      valid = false;
    } else {
      const localUnreachable = local.some((item, index) =>
        (item.value as number) > maxEpisode ||
        (index > 0 && (item.value as number) < (local[index - 1].value as number)));
      const cumulativeUnreachable = cumulative.some((item, index) =>
        (item.value as number) > maxEpisode * ((item.episodeOrdinal as number) - 1) ||
        (index > 0 && (item.value as number) < (cumulative[index - 1].value as number)));
      const finalThreshold = cumulative.at(-1)?.value as number;
      if (localUnreachable || cumulativeUnreachable || (context.seasonAccessTarget as number) < finalThreshold ||
          (context.seasonAccessTarget as number) > maxSeason) {
        issue(issues, 'decision_registry_curve_unreachable', '$.body.decisions.HYP-V2-005.settings');
        valid = false;
      }
    }
  }
  return { body: value, context, valid };
};

const validIsoDateTime = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
};

const validateRecord = (
  value: unknown,
  issues: DecisionRegistryIssue[],
): { record?: Record<string, unknown>; valid: boolean } => {
  if (!isPlainObject(value) || !exactKeys(value, ['schemaVersion', 'ref', 'object', 'createdAt'], '$.record', issues)) {
    if (!isPlainObject(value)) issue(issues, 'decision_registry_record_invalid', '$.record');
    return { valid: false };
  }
  let valid = true;
  if (value.schemaVersion !== 'v2-decision-registry-record.v1') {
    issue(issues, 'decision_registry_record_invalid', '$.record.schemaVersion');
    valid = false;
  }
  if (!isPlainObject(value.ref)) {
    issue(issues, 'decision_registry_record_invalid', '$.record.ref');
    valid = false;
  } else if (!exactKeys(value.ref, ['id', 'version', 'contentHash'], '$.record.ref', issues)) {
    valid = false;
  } else {
    if (typeof value.ref.id !== 'string' || !ID_PATTERN.test(value.ref.id)) {
      issue(issues, 'decision_registry_id_invalid', '$.record.ref.id');
      valid = false;
    }
    if (!safeInteger(value.ref.version, '$.record.ref.version', 1, issues)) valid = false;
    if (typeof value.ref.contentHash !== 'string' || !HASH_PATTERN.test(value.ref.contentHash)) {
      issue(issues, 'decision_registry_hash_mismatch', '$.record.ref.contentHash');
      valid = false;
    }
  }
  if (!isPlainObject(value.object)) {
    issue(issues, 'decision_registry_record_invalid', '$.record.object');
    valid = false;
  } else if (!exactKeys(value.object, ['objectPath', 'contentHash', 'objectGeneration', 'byteSize'], '$.record.object', issues)) {
    valid = false;
  } else {
    if (typeof value.object.objectPath !== 'string' || value.object.objectPath.length === 0) {
      issue(issues, 'decision_registry_object_path_mismatch', '$.record.object.objectPath');
      valid = false;
    }
    if (typeof value.object.contentHash !== 'string' || !HASH_PATTERN.test(value.object.contentHash)) {
      issue(issues, 'decision_registry_object_hash_mismatch', '$.record.object.contentHash');
      valid = false;
    }
    if (typeof value.object.objectGeneration !== 'string' || value.object.objectGeneration.trim().length === 0) {
      issue(issues, 'decision_registry_object_generation_invalid', '$.record.object.objectGeneration');
      valid = false;
    }
    if (!safeInteger(value.object.byteSize, '$.record.object.byteSize', 1, issues)) {
      const latest = issues.at(-1);
      if (latest?.path === '$.record.object.byteSize') {
        issues.pop();
        issue(issues, 'decision_registry_object_byte_size_invalid', '$.record.object.byteSize');
      }
      valid = false;
    }
  }
  if (!validIsoDateTime(value.createdAt)) {
    issue(issues, 'decision_registry_created_at_invalid', '$.record.createdAt');
    valid = false;
  }
  return { record: value, valid };
};

export type DecisionRegistryValidationResult =
  | { readonly ok: true; readonly issues: readonly []; readonly value: ResolvedDecisionRegistry }
  | { readonly ok: false; readonly issues: readonly DecisionRegistryIssue[] };

const sortIssues = (issues: DecisionRegistryIssue[]): DecisionRegistryIssue[] =>
  issues.sort((left, right) => {
    const rank = (ISSUE_RANK.get(left.code) ?? Number.MAX_SAFE_INTEGER) -
      (ISSUE_RANK.get(right.code) ?? Number.MAX_SAFE_INTEGER);
    if (rank !== 0) return rank;
    return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
  });

export const validateDecisionRegistry = (input: unknown): DecisionRegistryValidationResult => {
  const issues: DecisionRegistryIssue[] = [];
  if (isPlainObject(input) && Object.prototype.hasOwnProperty.call(input, 'latest')) {
    issue(issues, 'decision_registry_latest_ref_forbidden', '$.latest');
    return { ok: false, issues };
  }
  if (!isPlainObject(input) || !exactKeys(input, ['body', 'record'], '$', issues)) {
    if (!isPlainObject(input)) issue(issues, 'decision_registry_body_type_invalid', '$');
    return { ok: false, issues: sortIssues(issues) };
  }
  const bodyResult = validateBody(input.body, issues);
  const recordResult = validateRecord(input.record, issues);
  if (bodyResult.valid && recordResult.valid && bodyResult.body && recordResult.record) {
    const body = bodyResult.body;
    const record = recordResult.record;
    const ref = record.ref as Record<string, unknown>;
    const object = record.object as Record<string, unknown>;
    let canonical: string;
    try {
      canonical = canonicalJsonV1(body);
    } catch (error: unknown) {
      if (!(error instanceof CanonicalJsonError)) throw error;
      issue(issues, error.code, '$.body');
      return { ok: false, issues: sortIssues(issues) };
    }
    const bodyHash = sha256Utf8(canonical);
    if (ref.id !== body.registryId) issue(issues, 'decision_registry_id_invalid', '$.record.ref.id');
    if (ref.version !== body.version) issue(issues, 'decision_registry_version_invalid', '$.record.ref.version');
    if (ref.contentHash !== bodyHash) issue(issues, 'decision_registry_hash_mismatch', '$.record.ref.contentHash');
    if (object.contentHash !== bodyHash) issue(issues, 'decision_registry_object_hash_mismatch', '$.record.object.contentHash');
    const expectedPath = decisionRegistryObjectPath(body.registryId as string, body.version as number, bodyHash);
    if (object.objectPath !== expectedPath) issue(issues, 'decision_registry_object_path_mismatch', '$.record.object.objectPath');
    if (object.byteSize !== utf8ByteLengthV1(canonical)) {
      issue(issues, 'decision_registry_object_byte_size_invalid', '$.record.object.byteSize');
    }
  }
  sortIssues(issues);
  if (issues.length > 0) return { ok: false, issues };
  if (!bodyResult.valid || !recordResult.valid) {
    return {
      ok: false,
      issues: [{
        code: 'decision_registry_record_invalid',
        path: '$',
        severity: 'blocking',
        waivable: false,
      }],
    };
  }
  return { ok: true, issues: [], value: input as unknown as ResolvedDecisionRegistry };
};

export class DecisionRegistryValidationError extends Error {
  constructor(readonly issues: readonly DecisionRegistryIssue[]) {
    super(issues[0]?.code ?? 'decision_registry_invalid');
    this.name = 'DecisionRegistryValidationError';
  }
}

export const resolveDecisionRegistry = (input: unknown): ResolvedDecisionRegistry => {
  const result = validateDecisionRegistry(input);
  if (!result.ok) throw new DecisionRegistryValidationError(result.issues);
  return result.value;
};
