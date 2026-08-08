"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseV2SchemaVersion = exports.isSupportedV2SchemaVersion = exports.V2SchemaVersionError = exports.V2_SCHEMA_VERSION_ERROR_CODE = exports.V2_SCHEMA_VERSIONS = void 0;
const schemaVersion = (value) => value;
exports.V2_SCHEMA_VERSIONS = Object.freeze({
    modeTemplateRuntime: schemaVersion('v2-mode-template.v1'),
    delayedProbeDefinition: schemaVersion('v2-delayed-probe-definition.v1'),
    attemptBody: schemaVersion('v2-attempt-body.v1'),
    attemptRef: schemaVersion('v2-attempt-ref.v1'),
    attemptEnvelope: schemaVersion('v2-attempt-envelope.v1'),
    delayedAttemptCandidate: schemaVersion('v2-delayed-attempt-candidate.v1'),
    delayedAttemptAck: schemaVersion('v2-delayed-attempt-ack.v2'),
    publishedSeason: schemaVersion('v2-season.v1'),
    lessonBundle: schemaVersion('lesson-bundle.v2'),
});
exports.V2_SCHEMA_VERSION_ERROR_CODE = 'unsupported_v2_schema_version';
class V2SchemaVersionError extends Error {
    constructor() {
        super(exports.V2_SCHEMA_VERSION_ERROR_CODE);
        this.code = exports.V2_SCHEMA_VERSION_ERROR_CODE;
        this.name = 'V2SchemaVersionError';
    }
}
exports.V2SchemaVersionError = V2SchemaVersionError;
const isSupportedV2SchemaVersion = (kind, value) => Object.prototype.hasOwnProperty.call(exports.V2_SCHEMA_VERSIONS, kind) &&
    typeof value === 'string' &&
    exports.V2_SCHEMA_VERSIONS[kind] === value;
exports.isSupportedV2SchemaVersion = isSupportedV2SchemaVersion;
const parseV2SchemaVersion = (kind, value) => {
    if (!(0, exports.isSupportedV2SchemaVersion)(kind, value))
        throw new V2SchemaVersionError();
    return value;
};
exports.parseV2SchemaVersion = parseV2SchemaVersion;
//# sourceMappingURL=schema_versions.js.map