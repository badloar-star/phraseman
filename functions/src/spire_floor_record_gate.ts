/** Closed in source until independent review and explicit rollout approval.
 * A remote flag alone must never activate the legacy fingerprint/client-time path.
 */
const FLOOR_RECORD_AUTHORITY_READY: boolean = false;

export function floorRecordServerEnabled(raw: unknown): boolean {
  return FLOOR_RECORD_AUTHORITY_READY && !!raw && typeof raw === 'object'
    && (raw as Record<string, unknown>).floorRecordsEnabled === true;
}
