import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { seasonEpisodePinIndexDocumentPath } from "./season_pin_index_paths";

export interface SeasonPinIndexEntry {
  readonly schemaVersion: "season-episode-pin-index.v1";
  readonly documentPath: string;
  readonly seasonRevisionId: string;
  readonly seasonRevisionFingerprint: string;
  readonly episodeId: string;
  readonly revision: number;
  readonly revisionFingerprint: string;
  readonly contentHash: string;
  readonly status: "approved";
  readonly lifecycleRevision: number;
}

const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));

export function validateSeasonPinIndexEntry(value: unknown, expected: Pick<ApprovedEpisodeRevision, "episodeId" | "revision" | "revisionFingerprint" | "contentHash">): value is SeasonPinIndexEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return exactKeys(entry, ["schemaVersion", "documentPath", "seasonRevisionId", "seasonRevisionFingerprint", "episodeId", "revision", "revisionFingerprint", "contentHash", "status", "lifecycleRevision"]) &&
    entry.schemaVersion === "season-episode-pin-index.v1" &&
    typeof entry.documentPath === "string" && entry.documentPath === seasonEpisodePinIndexDocumentPath(expected) &&
    typeof entry.seasonRevisionId === "string" && entry.seasonRevisionId.length > 0 &&
    typeof entry.seasonRevisionFingerprint === "string" && /^[a-f0-9]{64}$/.test(entry.seasonRevisionFingerprint) &&
    entry.episodeId === expected.episodeId && entry.revision === expected.revision && entry.revisionFingerprint === expected.revisionFingerprint && entry.contentHash === expected.contentHash && entry.status === "approved" && Number.isSafeInteger(entry.lifecycleRevision) && Number(entry.lifecycleRevision) >= 1;
}

export interface SeasonPinIndexTransaction {
  set(path: string, value: Record<string, unknown>): void;
  delete(path: string): void;
}

export function applySeasonPinIndexProjection(input: {
  readonly transaction: SeasonPinIndexTransaction;
  readonly nextEntries: readonly SeasonPinIndexEntry[];
  readonly previousDocumentPaths?: readonly string[];
}): void {
  for (const path of input.previousDocumentPaths ?? []) input.transaction.delete(path);
  for (const entry of input.nextEntries) input.transaction.set(entry.documentPath, entry as unknown as Record<string, unknown>);
}

export function buildApprovedSeasonPinIndexEntries(input: {
  readonly seasonRevisionId: string;
  readonly seasonRevisionFingerprint: string;
  readonly lifecycleRevision?: number;
  readonly status: string;
  readonly episodeRevisionRefs: readonly ApprovedEpisodeRevision[];
}): readonly SeasonPinIndexEntry[] {
  if (input.status !== "approved") return [];
  if (!input.seasonRevisionId || !/^[a-f0-9]{64}$/.test(input.seasonRevisionFingerprint)) throw new Error("season_pin_index_identity_invalid");
  return input.episodeRevisionRefs.map((ref) => ({
    schemaVersion: "season-episode-pin-index.v1",
    documentPath: seasonEpisodePinIndexDocumentPath(ref),
    seasonRevisionId: input.seasonRevisionId,
    seasonRevisionFingerprint: input.seasonRevisionFingerprint,
    episodeId: ref.episodeId,
    revision: ref.revision,
    revisionFingerprint: ref.revisionFingerprint,
    contentHash: ref.contentHash,
    status: "approved" as const,
    lifecycleRevision: input.lifecycleRevision ?? 1,
  }));
}
