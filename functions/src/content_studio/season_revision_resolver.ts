import type { SeasonRevisionEnvelope, SeasonRevisionRecord, SeasonLifecycleHead } from "../../../modules/learning-v2/authoring/season_revision";
import { validateSeasonRevisionEnvelope } from "../../../modules/learning-v2/authoring/season_revision";
import { readImmutableCanonicalObject } from "./immutable_object_reader";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface SeasonRevisionObjectReader {
  read(path: string, expectedHash: string, expectedGeneration: string, expectedByteSize: number): Promise<{ body: unknown; contentHash: string; objectGeneration: string; byteSize: number }>;
}

export interface SeasonRevisionDocumentReader {
  read(path: string): Promise<{ exists: boolean; data(): unknown }>;
}

export async function resolveImmutableSeasonRevision(input: {
  readonly revisionPath: string;
  readonly lifecyclePath: string;
  readonly objectReader: SeasonRevisionObjectReader;
  readonly documentReader: SeasonRevisionDocumentReader;
}): Promise<SeasonRevisionEnvelope> {
  const revision = await input.documentReader.read(input.revisionPath);
  const lifecycle = await input.documentReader.read(input.lifecyclePath);
  if (!revision.exists || !lifecycle.exists) throw new Error("season_revision_missing");
  const revisionValue = revision.data() as Record<string, unknown>;
  const record = (isRecord(revisionValue.record) ? revisionValue.record : revisionValue) as Record<string, unknown>;
  const lifecycleValue = lifecycle.data() as Record<string, unknown>;
  const object = record.object as SeasonRevisionRecord["object"];
  const resolved = await input.objectReader.read(object.objectPath, object.contentHash, object.objectGeneration, object.byteSize);
  if (resolved.contentHash !== object.contentHash || resolved.objectGeneration !== object.objectGeneration || resolved.byteSize !== object.byteSize) {
    throw new Error("season_revision_object_metadata_invalid");
  }
  const envelope = { body: resolved.body, record, lifecycle: lifecycleValue };
  if (!validateSeasonRevisionEnvelope(envelope)) throw new Error("season_revision_object_invalid");
  return envelope;
}

export function createStorageSeasonRevisionObjectReader(bucket: { file(path: string): { getMetadata(): Promise<[Record<string, unknown>]>; download(): Promise<[Buffer]> } }): SeasonRevisionObjectReader {
  return {
    async read(path, expectedHash, expectedGeneration, expectedByteSize) {
      const object = bucket.file(path);
      const result = await readImmutableCanonicalObject({
        getMetadata: () => object.getMetadata(),
        download: () => object.download(),
      }, { expectedHash, expectedGeneration, expectedByteSize });
      return { body: result.body, contentHash: result.contentHash, objectGeneration: result.objectGeneration, byteSize: result.byteSize };
    },
  };
}
