import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

export const GLOBAL_BROADCAST_PUBLIC_SCHEMA_VERSION = 1;

export const FORBIDDEN_GLOBAL_BROADCAST_METADATA_FIELDS = [
  'createdBy', 'createdByUid', 'createdByRole', 'adminOperationId',
  'replacedBy', 'replacedByUid', 'replacedByRole', 'replacementOperationId',
  'deactivatedBy', 'deactivatedByUid', 'deactivatedByRole', 'deactivationOperationId',
] as const;

export const PUBLIC_GLOBAL_BROADCAST_FIELDS = [
  'publicPayloadSchemaVersion', 'publicPayloadValidatedV1',
  'kind', 'premiumAudience', 'audience', 'active',
  'rewardType', 'rewardAmount', 'shards', 'premiumRewardDays',
  'createdAt', 'createdAtMs', 'replacedAt', 'replacedAtMs',
  'deactivatedAt', 'deactivatedAtMs', 'expiresAt', 'expiresAtMs',
  'titleRu', 'titleUk', 'titleEs', 'titlePtBr', 'titleVi', 'titleId', 'titleTr', 'titlePl',
  'messageRu', 'messageUk', 'messageEs', 'messagePtBr', 'messageVi', 'messageId', 'messageTr', 'messagePl',
  'reviewUrlIos', 'reviewUrlAndroid',
  'reviewCtaRu', 'reviewCtaUk', 'reviewCtaEs', 'reviewCtaPtBr', 'reviewCtaVi', 'reviewCtaId', 'reviewCtaTr', 'reviewCtaPl',
] as const;

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const publicFields = new Set<string>(PUBLIC_GLOBAL_BROADCAST_FIELDS);
const forbiddenFields = new Set<string>(FORBIDDEN_GLOBAL_BROADCAST_METADATA_FIELDS);

export const GLOBAL_BROADCAST_PUBLIC_SCHEMA_HASH = createHash('sha256')
  .update(JSON.stringify({
    schemaVersion: GLOBAL_BROADCAST_PUBLIC_SCHEMA_VERSION,
    fields: PUBLIC_GLOBAL_BROADCAST_FIELDS,
    forbidden: FORBIDDEN_GLOBAL_BROADCAST_METADATA_FIELDS,
  }))
  .digest('hex');

export function inspectGlobalBroadcastPublicAuthority(value: unknown): Readonly<{
  valid: boolean;
  schemaVersionValid: boolean;
  serverValidationValid: boolean;
  forbiddenKeys: string[];
  unknownKeys: string[];
}> {
  const row = isRow(value) ? value : {};
  const forbiddenKeys = Object.keys(row).filter((field) => forbiddenFields.has(field)).sort();
  const unknownKeys = Object.keys(row)
    .filter((field) => !publicFields.has(field) && !forbiddenFields.has(field))
    .sort();
  const schemaVersionValid = row.publicPayloadSchemaVersion === GLOBAL_BROADCAST_PUBLIC_SCHEMA_VERSION;
  const serverValidationValid = row.publicPayloadValidatedV1 === true;
  return Object.freeze({
    valid: schemaVersionValid && serverValidationValid && forbiddenKeys.length === 0 && unknownKeys.length === 0,
    schemaVersionValid,
    serverValidationValid,
    forbiddenKeys,
    unknownKeys,
  });
}

export function requireGlobalBroadcastPublicAuthority<T extends Row>(row: T): T {
  if (!inspectGlobalBroadcastPublicAuthority(row).valid) {
    throw new HttpsError('failed-precondition', 'broadcast_public_schema_invalid');
  }
  return row;
}
