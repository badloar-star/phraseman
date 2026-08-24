const LARGE_SNAPSHOT_VALUE_BYTES = 64 * 1024;
const FINGERPRINT_PREFIX = '@phraseman-sync-fingerprint:v1:';

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 3;
      }
    } else bytes += 3;
  }
  return bytes;
}

function dualHash(value: string): string {
  let fnv = 2166136261;
  let djb = 5381;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    fnv ^= code;
    fnv = Math.imul(fnv, 16777619);
    djb = Math.imul(djb, 33) ^ code;
  }
  return `${(fnv >>> 0).toString(36)}:${(djb >>> 0).toString(36)}`;
}

export function encodeCloudSyncSnapshotValue(value: string | null): string | null {
  if (value === null) return null;
  const byteLength = utf8ByteLength(value);
  if (byteLength <= LARGE_SNAPSHOT_VALUE_BYTES) return value;
  return `${FINGERPRINT_PREFIX}${byteLength}:${value.length}:${dualHash(value)}`;
}

export function cloudSyncSnapshotValueMatches(
  stored: string | null | undefined,
  value: string | null,
): boolean {
  return stored === value || stored === encodeCloudSyncSnapshotValue(value);
}

export function encodeCloudSyncSnapshotRecord(
  values: Record<string, string | null>,
): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, encodeCloudSyncSnapshotValue(value)]),
  );
}

export default function __RouteShim() { return null; }
