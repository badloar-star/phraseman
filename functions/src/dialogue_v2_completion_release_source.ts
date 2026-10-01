import type { DialogueV2ServerRelease } from './dialogue_v2_server_authorization';
import { loadEmbeddedDialogueV2ServerRelease } from './dialogue_v2_embedded_release';

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
 *
 * зачем (владелец 01.10, «Диалоги не загрузились»): если указателя выпуска в
 * Firestore НЕТ вовсе, источником служит встроенный выпуск из одобренного
 * кандидата (generated/dialogue_v2_server_release.json). Существующий указатель
 * (в т.ч. status != 'active' — рубильник оператора) встроенный выпуск НЕ обходит:
 * тогда как и раньше null. Одна точка покрывает каталог, старт сессии, ход,
 * завершение, память и разбор диалога — все они грузят выпуск через эту функцию.
 */
export async function loadDialogueV2CompletionReleaseCandidate(
  repository: DialogueV2CompletionReleaseRepository,
  loadEmbeddedRelease: () => DialogueV2ServerRelease | null = loadEmbeddedDialogueV2ServerRelease,
): Promise<DialogueV2ServerRelease | null> {
  const rawPointer = await repository.readDocument(ACTIVE_RELEASE_POINTER_PATH);
  if (rawPointer === null || rawPointer === undefined) {
    const embedded = loadEmbeddedRelease();
    console.info('[DIALOGUE-V2] release_source', JSON.stringify({
      source: 'embedded', reason: 'pointer_absent', available: Boolean(embedded),
    }));
    return embedded;
  }
  const pointer = record(rawPointer);
  const releaseId = pointer?.releaseId;
  if (pointer?.schemaVersion !== 'dialogue-v2-release-pointer.v1'
    || pointer.status !== 'active'
    || typeof releaseId !== 'string'
    || !RELEASE_ID_PATTERN.test(releaseId)) {
    console.warn('[DIALOGUE-V2] release_source', JSON.stringify({
      source: 'firestore', reason: 'pointer_invalid_or_inactive',
      schemaVersion: pointer?.schemaVersion ?? null, status: pointer?.status ?? null,
    }));
    return null;
  }

  const releaseRoot = `dialogue_v2_releases/${releaseId}`;
  const releaseDocument = record(await repository.readDocument(releaseRoot));
  const manifest = record(releaseDocument?.manifest);
  if (releaseDocument?.schemaVersion !== 'dialogue-v2-server-release.v1'
    || releaseDocument.status !== 'approved'
    || !manifest) {
    console.warn('[DIALOGUE-V2] release_source', JSON.stringify({
      source: 'firestore', reason: 'release_document_invalid', releaseId,
      schemaVersion: releaseDocument?.schemaVersion ?? null, status: releaseDocument?.status ?? null,
    }));
    return null;
  }

  const rows = await repository.readCollection(`${releaseRoot}/packets`);
  const packets: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const row of rows) {
    const key = packetAuthorityKey(row.data);
    if (!key || Object.prototype.hasOwnProperty.call(packets, key)) {
      console.warn('[DIALOGUE-V2] release_source', JSON.stringify({
        source: 'firestore', reason: key ? 'duplicate_packet' : 'packet_without_key', releaseId, rowId: row.id,
      }));
      return null;
    }
    packets[key] = row.data;
  }
  if (Object.keys(packets).length === 0) {
    console.warn('[DIALOGUE-V2] release_source', JSON.stringify({ source: 'firestore', reason: 'no_packets', releaseId }));
    return null;
  }

  return {
    manifest,
    packets,
  } as unknown as DialogueV2ServerRelease;
}
