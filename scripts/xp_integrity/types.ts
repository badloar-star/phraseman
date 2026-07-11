export type IntegrityClass =
  | "confirmed_damaged"
  | "probable_damaged"
  | "indeterminate"
  | "consistent";

export type EvidenceState = "complete" | "incomplete" | "not_applicable";

export type EvidenceCompleteness = {
  ledger: EvidenceState;
  catalog: EvidenceState;
  alias: EvidenceState;
  migration: EvidenceState;
  prerequisites: EvidenceState;
};

export type ReasonCode =
  | "ledger_discontinuity_exact"
  | "achievement_overpayment_exact"
  | "achievement_impossible_prerequisite_exact"
  | "achievement_alias_replay_exact"
  | "migration_exact"
  | "migration_pattern_only"
  | "catalog_unmapped"
  | "prerequisite_unmapped"
  | "alias_history_incomplete"
  | "ledger_history_incomplete"
  | "projection_drift";

export type NormalizedAuditEvent = {
  ownerUid: string;
  eventId: string;
  type: string;
  xpDelta: number;
  totalXpAfter: number;
  totalXpBefore: number | null;
  serverCreatedAtMs: number | null;
  clientCreatedAtMs: number | null;
  appVersion: string | null;
  activeDate: string | null;
  weekKey: string | null;
  weekXpAfter: number | null;
  payload: Readonly<Record<string, unknown>>;
};

export type LedgerBaselineEvidence =
  | {
      kind: "exact";
      xp: number;
      derivedFrom: "first_ledger_result" | "retained_cutover";
      atMs: number;
    }
  | {
      kind: "unknown";
      reason:
        | "pre_cutover_unretained"
        | "ambiguous_chain"
        | "missing_timestamp";
    };

export type MigrationEvidence =
  | {
      kind: "exact";
      source: "retained_provenance" | "deterministic_ledger_discontinuity";
      beforeXp: number;
      afterXp: number;
      formulaVersion: string;
      exactInvalidDelta: number;
      occurredAtMs: number;
    }
  | {
      kind: "pattern_only";
      pattern: "250_to_400" | "repeated_startup_migration";
      markerPresent: boolean;
    }
  | { kind: "none" | "incomplete" };

export type EffectiveWindow = {
  fromMsInclusive: number;
  toMsExclusive: number | null;
  provenance: "release_tag" | "build_manifest" | "verified_release_commit";
};

export type LevelFormulaSnapshot = {
  sourceCommit: string;
  formulaId: string;
  effective: EffectiveWindow;
  totalXpThresholds: readonly number[];
  maxLevel: number;
};

export type AchievementPrerequisite =
  | { kind: "lifetime_xp"; minimum: number }
  | { kind: "weekly_xp"; minimum: number }
  | { kind: "counter"; counterKey: string; minimum: number }
  | { kind: "unsupported"; ruleId: string };

export type CatalogReward = {
  achievementId: string;
  xp: number;
  prerequisite: AchievementPrerequisite;
};

export type CatalogSnapshot = {
  commit: string;
  appVersion: string | null;
  effective: EffectiveWindow;
  rewards: ReadonlyMap<string, CatalogReward>;
  levelFormula: LevelFormulaSnapshot;
  complete: boolean;
};

export type CatalogMatch =
  | {
      kind: "exact";
      snapshot: CatalogSnapshot;
      basis: "verified_server_window";
    }
  | { kind: "consensus"; candidates: readonly CatalogSnapshot[] }
  | {
      kind: "unmapped";
      reason:
        | "gap"
        | "overlap"
        | "provenance_conflict"
        | "missing_server_time"
        | "unknown_version";
    };

export type PrerequisiteEvidence =
  | {
      eventId: string;
      prerequisite: AchievementPrerequisite;
      state: "exact";
      valueBefore: number;
      source: "server_result" | "immutable_event_chain";
    }
  | {
      eventId: string;
      prerequisite: AchievementPrerequisite;
      state: "missing" | "ambiguous";
    };

export type UserCutoverEvidence = {
  progressServerAuthoritative: boolean;
  progressServerCutoverAtMs: number | null;
  progressMigratedAtMs: number | null;
  xpLevelRestoreAtMs: number | null;
  progressServerStateXp: number | null;
  migrationDocument: {
    exists: boolean;
    createdAtMs: number | null;
    keys: readonly string[];
  };
};

export type AliasEvidence = {
  uid: string;
  canonicalUid: string;
  linkage: "canonical_pointer" | "duplicate_pointer" | "shared_auth_uid";
  identityMergedAtMs: number | null;
  events: readonly NormalizedAuditEvent[];
  complete: boolean;
};

export type RawUser = {
  uid: string;
  firebaseAuthUid: string | null;
  canonicalStableId: string | null;
  duplicateOfStableId: string | null;
  identityHidden: boolean;
  identityMergedAtMs: number | null;
  progress: Readonly<Record<string, unknown>>;
  cutover: UserCutoverEvidence;
};

export type MirrorValues = {
  leaderboardXp: number | null;
  arenaXp: number | null;
  leagueXp: number | null;
};

export type AccountAuditInput = {
  uid: string;
  currentXp: number;
  canonicalEvents: readonly NormalizedAuditEvent[];
  aliases: readonly AliasEvidence[];
  baseline: LedgerBaselineEvidence;
  migration: MigrationEvidence;
  prerequisites: readonly PrerequisiteEvidence[];
  mirrors: MirrorValues;
  completeness: EvidenceCompleteness;
};

export type AccountAuditResult = {
  classification: IntegrityClass;
  reasons: readonly ReasonCode[];
  completeness: EvidenceCompleteness;
  exactInvalidXp: number;
  proposedXp: number | null;
  exactReductionIsComplete: boolean;
  projectionDrift: boolean;
};
