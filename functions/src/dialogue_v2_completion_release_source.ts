import type { DialogueV2ServerRelease } from './dialogue_v2_server_authorization';

const ACTIVE_RELEASE_POINTER_PATH = 'dialogue_v2_release_control/active';
const RELEASE_ID_PATTERN = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

export type DialogueV2CompletionReleaseRepository = Readonly<{
  readDocument(path: string): Promise<unknown | null>;
  readCollection(path: string): Promise<readonly Readonly<{ id: string; data: unknown }>[]>;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function packetAuthorityKey(value: unknown): string | null {
  const packet = record(value);
  const scenario = record(packet?.scenario);
  if (typeof packet?.studyTarget !== 'string' || typeof scenario?.id !== 'string') return null;
  return `${packet.studyTarget}:${scenario.id}`;
}

/**
 * Reads only the dedicated production release namespace. This loader does not
 * grant authority: the caller must still pass the candidate through the full
 * release coverage, review-receipt, manifest-pin and content-digest authorizer.
 */
export async function loadDialogueV2CompletionReleaseCandidate(
  repository: DialogueV2CompletionReleaseRepository,
): Promise<DialogueV2ServerRelease | null> {
  const pointer = record(await repository.readDocument(ACTIVE_RELEASE_POINTER_PATH));
  const releaseId = pointer?.releaseId;
  if (pointer?.schemaVersion !== 'dialogue-v2-release-pointer.v1'
    || pointer.status !== 'active'
    || typeof releaseId !== 'string'
    || !RELEASE_ID_PATTERN.test(releaseId)) return null;

  const releaseRoot = `dialogue_v2_releases/${releaseId}`;
  const releaseDocument = record(await repository.readDocument(releaseRoot));
  const manifest = record(releaseDocument?.manifest);
  if (releaseDocument?.schemaVersion !== 'dialogue-v2-server-release.v1'
    || releaseDocument.status !== 'approved'
    || !manifest) return null;

  const rows = await repository.readCollection(`${releaseRoot}/packets`);
  const packets: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const row of rows) {
    const key = packetAuthorityKey(row.data);
    if (!key || Object.prototype.hasOwnProperty.call(packets, key)) return null;
    packets[key] = row.data;
  }
  if (Object.keys(packets).length === 0) return null;

  return {
    manifest,
    packets,
  } as unknown as DialogueV2ServerRelease;
}
