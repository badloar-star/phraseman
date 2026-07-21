import {
  episodeGateRequirement,
  localPerformanceMinimum,
} from "../progress/gate_policy";
import {
  hashCanonicalBody,
  type DecisionRegistryRecord,
  type VersionRef,
} from "../policies/decision_registry";

export type SeasonScope = "vertical_slice" | "chapter_internal" | "full_season";
export type SeasonEnvironment = "lab" | "staging" | "production";

export interface ApprovedEpisodeRevision {
  readonly draftId: string;
  readonly episodeId: string;
  readonly revision: number;
  readonly revisionFingerprint: string;
  readonly contentHash: string;
  readonly ordinal: number;
  readonly chapterId: string;
  readonly approvalStatus: "draft" | "approved" | "released";
}

export interface SeasonEpisodeRevisionRef extends ApprovedEpisodeRevision {}

export interface SeasonGateDefinition {
  readonly gateId: string;
  readonly targetEpisodeId: string;
  readonly priorEpisodeId: string;
  readonly localEarnedMinimum: number;
  readonly requiredCumulativeAccess: number;
  readonly requiresPriorLoopsComplete: true;
  readonly accessBoostPolicyKey: "HYP-V2-006";
}

export interface SeasonChapter {
  readonly chapterId: string;
  readonly ordinal: number;
  readonly episodeIds: readonly string[];
  readonly checkpointEpisodeId: string;
}

export interface SeasonReleaseScope {
  readonly kind: SeasonScope;
  readonly includedChapterOrdinals: readonly number[];
  readonly includedEpisodeOrdinals: readonly number[];
}

export interface SeasonDraftBody {
  readonly schemaVersion: "season-draft-body.v1";
  readonly draftId: string;
  readonly seasonId: string;
  readonly releaseScope: SeasonReleaseScope;
  readonly episodeRevisionRefs: readonly SeasonEpisodeRevisionRef[];
  readonly chapters: readonly SeasonChapter[];
  readonly gates: readonly SeasonGateDefinition[];
  readonly gatePolicyVersion: string;
  readonly decisionRegistryRef: VersionRef;
}

export interface SeasonDraftRecord {
  readonly schemaVersion: "season-draft-record.v1";
  readonly draftId: string;
  readonly seasonId: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly fingerprint: string;
  readonly status: "draft" | "approved" | "released";
}

export interface SeasonDraft {
  readonly body: SeasonDraftBody;
  readonly record: SeasonDraftRecord;
}

export interface GatePolicyCatalog {
  readonly version: string;
  readonly resolveEpisodeRevision?: (ref: ApprovedEpisodeRevision) => boolean;
}

const requiredDecisionIds = [
  "HYP-V2-001",
  "HYP-V2-002",
  "HYP-V2-003",
  "HYP-V2-004",
  "HYP-V2-005",
  "HYP-V2-006",
  "HYP-V2-007",
  "HYP-V2-008",
] as const;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const makeFingerprint = (body: SeasonDraftBody, revision: number): string =>
  hashCanonicalBody({
    draftId: body.draftId,
    revision,
    contentHash: hashCanonicalBody(body),
  });
const persist = (
  body: SeasonDraftBody,
  revision: number,
  status: SeasonDraftRecord["status"] = "draft",
): SeasonDraft => ({
  body,
  record: {
    schemaVersion: "season-draft-record.v1",
    draftId: body.draftId,
    seasonId: body.seasonId,
    revision,
    contentHash: hashCanonicalBody(body),
    fingerprint: makeFingerprint(body, revision),
    status,
  },
});

const ordinalsFor = (scope: SeasonScope): number[] =>
  scope === "vertical_slice"
    ? [1]
    : scope === "chapter_internal"
      ? Array.from({ length: 8 }, (_, index) => index + 1)
      : Array.from({ length: 32 }, (_, index) => index + 1);
const chaptersFor = (
  refs: readonly SeasonEpisodeRevisionRef[],
): SeasonChapter[] => {
  const groups = new Map<number, SeasonEpisodeRevisionRef[]>();
  for (const ref of refs) {
    const chapter = Math.ceil(ref.ordinal / 8);
    groups.set(chapter, [...(groups.get(chapter) ?? []), ref]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([ordinal, items]) => ({
      chapterId: `chapter-${String(ordinal).padStart(2, "0")}`,
      ordinal,
      episodeIds: items.map((item) => item.episodeId),
      checkpointEpisodeId: items.at(-1)?.episodeId ?? "",
    }));
};

export function createSeasonDraft(input: {
  readonly draftId: string;
  readonly seasonId: string;
  readonly scope: SeasonScope;
  readonly gatePolicyVersion?: string;
  readonly decisionRegistryRef?: VersionRef;
}): SeasonDraft {
  const body: SeasonDraftBody = {
    schemaVersion: "season-draft-body.v1",
    draftId: input.draftId,
    seasonId: input.seasonId,
    releaseScope: {
      kind: input.scope,
      includedChapterOrdinals:
        input.scope === "full_season" ? [1, 2, 3, 4] : [1],
      includedEpisodeOrdinals: ordinalsFor(input.scope),
    },
    episodeRevisionRefs: [],
    chapters: [],
    gates: [],
    gatePolicyVersion: input.gatePolicyVersion ?? "v2-gates-1",
    decisionRegistryRef: input.decisionRegistryRef ?? {
      id: "phraseman-v2-product-decisions",
      version: 1,
      contentHash: "",
    },
  };
  return persist(body, 1);
}

export function materializeSeasonGates(
  refs: readonly SeasonEpisodeRevisionRef[],
  policy: GatePolicyCatalog | string,
): SeasonGateDefinition[] {
  const version = typeof policy === "string" ? policy : policy.version;
  if (version !== "v2-gates-1") throw new Error("season_gate_policy_unknown");
  return refs.slice(1).map((ref, index) => ({
    gateId: `gate-ep-${String(ref.ordinal).padStart(2, "0")}`,
    targetEpisodeId: ref.episodeId,
    priorEpisodeId:
      refs[index]?.episodeId ??
      `ep-${String(ref.ordinal - 1).padStart(2, "0")}`,
    localEarnedMinimum: localPerformanceMinimum(ref.ordinal - 1),
    requiredCumulativeAccess: episodeGateRequirement(ref.ordinal),
    requiresPriorLoopsComplete: true,
    accessBoostPolicyKey: "HYP-V2-006",
  }));
}

export function validateSeasonComposition(
  draft: SeasonDraft,
  refs: readonly SeasonEpisodeRevisionRef[] = draft.body.episodeRevisionRefs,
): string[] {
  const issues: string[] = [];
  const expected = ordinalsFor(draft.body.releaseScope.kind);
  if (
    refs.length !== expected.length ||
    refs.some((ref, index) => ref.ordinal !== expected[index])
  )
    issues.push("season_episode_ordinals_invalid");
  if (new Set(refs.map((ref) => ref.episodeId)).size !== refs.length)
    issues.push("season_episode_duplicate");
  if (
    refs.some(
      (ref) =>
        ref.approvalStatus !== "approved" ||
        !HASH_PATTERN.test(ref.contentHash) ||
        !ref.revisionFingerprint ||
        !ref.draftId ||
        !ref.episodeId ||
        !ref.chapterId ||
        !Number.isInteger(ref.revision) ||
        ref.revision < 1,
    )
  )
    issues.push("season_episode_revision_not_approved_or_stale");
  if (
    draft.body.releaseScope.kind === "full_season" &&
    draft.body.chapters.length !== 4
  )
    issues.push("season_chapter_composition_invalid");
  if (draft.body.releaseScope.kind === "full_season") {
    if (
      draft.body.releaseScope.includedChapterOrdinals.join(",") !== "1,2,3,4" ||
      draft.body.releaseScope.includedEpisodeOrdinals.join(",") !==
        expected.join(",")
    )
      issues.push("season_scope_composition_invalid");
    if (
      draft.body.chapters.some(
        (chapter, index) =>
          chapter.ordinal !== index + 1 ||
          chapter.episodeIds.length !== 8 ||
          chapter.checkpointEpisodeId !== refs[(index + 1) * 8 - 1]?.episodeId,
      )
    )
      issues.push("season_checkpoint_invalid");
  }
  if (
    draft.body.releaseScope.kind === "chapter_internal" &&
    draft.body.chapters[0]?.checkpointEpisodeId !== refs[7]?.episodeId
  )
    issues.push("season_checkpoint_invalid");
  if (draft.body.gates.length !== Math.max(0, refs.length - 1))
    issues.push("season_gate_composition_invalid");
  if (
    JSON.stringify(draft.body.gates) !==
    JSON.stringify(materializeSeasonGates(refs, draft.body.gatePolicyVersion))
  )
    issues.push("season_gate_policy_mismatch");
  return issues;
}

export function pinApprovedEpisodeRevisions(
  draft: SeasonDraft,
  refs: readonly ApprovedEpisodeRevision[],
  policyCatalog: GatePolicyCatalog,
): SeasonDraft {
  if (
    policyCatalog.resolveEpisodeRevision &&
    refs.some((ref) => !policyCatalog.resolveEpisodeRevision?.(ref))
  )
    throw new Error("season_episode_revision_not_approved_or_stale");
  const body: SeasonDraftBody = {
    ...draft.body,
    episodeRevisionRefs: refs.map((ref) => ({ ...ref })),
    chapters: chaptersFor(refs),
    gates: materializeSeasonGates(refs, policyCatalog),
  };
  const next = persist(body, draft.record.revision + 1);
  const issues = validateSeasonComposition(next);
  if (issues.length) throw new Error(issues[0]);
  return next;
}

export function replacePinnedEpisodeRevision(
  draft: SeasonDraft,
  replacement: ApprovedEpisodeRevision,
): SeasonDraft {
  const refs = draft.body.episodeRevisionRefs.map((ref) =>
    ref.ordinal === replacement.ordinal ? replacement : ref,
  );
  return pinApprovedEpisodeRevisions(draft, refs, {
    version: draft.body.gatePolicyVersion,
  });
}

export function reorderSeasonEpisode(
  draft: SeasonDraft,
  orderedOrdinals: readonly number[],
): SeasonDraft {
  const expected = ordinalsFor(draft.body.releaseScope.kind);
  if (
    orderedOrdinals.length !== expected.length ||
    new Set(orderedOrdinals).size !== expected.length ||
    orderedOrdinals.some((ordinal, index) => ordinal !== expected[index])
  )
    throw new Error("season_episode_reorder_invalid");
  return pinApprovedEpisodeRevisions(
    draft,
    orderedOrdinals
      .map(
        (ordinal) =>
          draft.body.episodeRevisionRefs.find(
            (ref) => ref.ordinal === ordinal,
          )!,
      )
      .filter(Boolean),
    { version: draft.body.gatePolicyVersion },
  );
}

export function assertSeasonEnvironmentEligible(
  draft: SeasonDraft,
  environment: SeasonEnvironment,
  registry?: DecisionRegistryRecord & {
    readonly body?: { readonly decisions?: Record<string, unknown> };
  },
): void {
  if (
    environment === "production" &&
    draft.body.releaseScope.kind !== "full_season"
  )
    throw new Error("season_scope_not_production_eligible");
  const issues = validateSeasonComposition(draft);
  if (issues.length) throw new Error(issues[0]);
  if (environment === "production") {
    if (!registry) throw new Error("season_decision_registry_unresolved");
    resolveSeasonDecisionSettings(draft.body, registry);
  }
  if (
    draft.body.releaseScope.kind === "full_season" &&
    draft.body.episodeRevisionRefs.length !== 32
  )
    throw new Error("season_full_scope_incomplete");
}

export function resolveSeasonDecisionSettings(
  body: SeasonDraftBody,
  registry: DecisionRegistryRecord & {
    readonly body?: { readonly decisions?: Record<string, unknown> };
  },
): { readonly decisionIds: readonly string[] } {
  const registryRef =
    registry.ref ??
    (registry as unknown as { readonly record?: { readonly ref?: VersionRef } })
      .record?.ref;
  if (
    !registryRef ||
    !body.decisionRegistryRef.contentHash ||
    body.decisionRegistryRef.id !== registryRef.id ||
    body.decisionRegistryRef.version !== registryRef.version ||
    (body.decisionRegistryRef.contentHash &&
      registryRef.contentHash &&
      body.decisionRegistryRef.contentHash !== registryRef.contentHash)
  )
    throw new Error("season_decision_registry_incomplete_or_mismatched");
  if (
    registry.body &&
    registryRef.contentHash !== hashCanonicalBody(registry.body)
  )
    throw new Error("season_decision_registry_incomplete_or_mismatched");
  const decisions = registry.body?.decisions;
  if (
    !decisions ||
    requiredDecisionIds.some(
      (id) => !Object.prototype.hasOwnProperty.call(decisions, id),
    )
  )
    throw new Error("season_decision_registry_incomplete_or_mismatched");
  return { decisionIds: requiredDecisionIds };
}

export function cloneSeasonDraft(
  current: SeasonDraft,
  ids: { readonly draftId: string; readonly seasonId: string },
): SeasonDraft {
  const body: SeasonDraftBody = {
    ...current.body,
    draftId: ids.draftId,
    seasonId: ids.seasonId,
    episodeRevisionRefs: current.body.episodeRevisionRefs.map((ref) => ({
      ...ref,
    })),
    chapters: current.body.chapters.map((chapter) => ({
      ...chapter,
      chapterId: `${ids.seasonId}-${chapter.chapterId}`,
    })),
    gates: current.body.gates.map((gate) => ({
      ...gate,
      gateId: `${ids.seasonId}-${gate.gateId}`,
    })),
  };
  return persist(body, 1, "draft");
}
