export type V2SchemaKind =
  | 'modeTemplateRuntime'
  | 'delayedProbeDefinition'
  | 'attemptBody'
  | 'attemptRef'
  | 'attemptEnvelope'
  | 'delayedAttemptCandidate'
  | 'delayedAttemptAck'
  | 'publishedSeason'
  | 'lessonBundle';

declare const V2_SCHEMA_VERSION_BRAND: unique symbol;

export type V2SchemaVersion<Kind extends V2SchemaKind> = string & {
  readonly [V2_SCHEMA_VERSION_BRAND]: Kind;
};

const schemaVersion = <Kind extends V2SchemaKind>(value: string): V2SchemaVersion<Kind> =>
  value as V2SchemaVersion<Kind>;

export const V2_SCHEMA_VERSIONS = Object.freeze({
  modeTemplateRuntime: schemaVersion<'modeTemplateRuntime'>('v2-mode-template.v1'),
  delayedProbeDefinition: schemaVersion<'delayedProbeDefinition'>('v2-delayed-probe-definition.v1'),
  attemptBody: schemaVersion<'attemptBody'>('v2-attempt-body.v1'),
  attemptRef: schemaVersion<'attemptRef'>('v2-attempt-ref.v1'),
  attemptEnvelope: schemaVersion<'attemptEnvelope'>('v2-attempt-envelope.v1'),
  delayedAttemptCandidate: schemaVersion<'delayedAttemptCandidate'>('v2-delayed-attempt-candidate.v1'),
  delayedAttemptAck: schemaVersion<'delayedAttemptAck'>('v2-delayed-attempt-ack.v2'),
  publishedSeason: schemaVersion<'publishedSeason'>('v2-season.v1'),
  lessonBundle: schemaVersion<'lessonBundle'>('lesson-bundle.v2'),
});

export const V2_SCHEMA_VERSION_ERROR_CODE = 'unsupported_v2_schema_version' as const;

export class V2SchemaVersionError extends Error {
  readonly code = V2_SCHEMA_VERSION_ERROR_CODE;

  constructor() {
    super(V2_SCHEMA_VERSION_ERROR_CODE);
    this.name = 'V2SchemaVersionError';
  }
}

export const isSupportedV2SchemaVersion = <Kind extends V2SchemaKind>(
  kind: Kind,
  value: unknown,
): value is V2SchemaVersion<Kind> =>
  Object.prototype.hasOwnProperty.call(V2_SCHEMA_VERSIONS, kind) &&
  typeof value === 'string' &&
  V2_SCHEMA_VERSIONS[kind] === value;

export const parseV2SchemaVersion = <Kind extends V2SchemaKind>(
  kind: Kind,
  value: unknown,
): V2SchemaVersion<Kind> => {
  if (!isSupportedV2SchemaVersion(kind, value)) throw new V2SchemaVersionError();
  return value;
};
