"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.v2ManifestHash = exports.validateV2SeasonReleasePointer = exports.validateV2SeasonReleaseManifestBody = exports.resolveV2ReleaseManifest = exports.buildV2SeasonReleaseRecord = exports.assertV2SeasonReleasePointer = exports.assertV2SeasonReleaseManifestBody = exports.assertV2RollbackTarget = void 0;
/**
 * Compatibility entry point for Functions. Canonical release contracts live in
 * the React/Functions-independent shared module so the client cannot drift.
 */
var release_manifest_1 = require("../../../modules/learning-v2/content/release_manifest");
Object.defineProperty(exports, "assertV2RollbackTarget", { enumerable: true, get: function () { return release_manifest_1.assertV2RollbackTarget; } });
Object.defineProperty(exports, "assertV2SeasonReleaseManifestBody", { enumerable: true, get: function () { return release_manifest_1.assertV2SeasonReleaseManifestBody; } });
Object.defineProperty(exports, "assertV2SeasonReleasePointer", { enumerable: true, get: function () { return release_manifest_1.assertV2SeasonReleasePointer; } });
Object.defineProperty(exports, "buildV2SeasonReleaseRecord", { enumerable: true, get: function () { return release_manifest_1.buildV2SeasonReleaseRecord; } });
Object.defineProperty(exports, "resolveV2ReleaseManifest", { enumerable: true, get: function () { return release_manifest_1.resolveV2ReleaseManifest; } });
Object.defineProperty(exports, "validateV2SeasonReleaseManifestBody", { enumerable: true, get: function () { return release_manifest_1.validateV2SeasonReleaseManifestBody; } });
Object.defineProperty(exports, "validateV2SeasonReleasePointer", { enumerable: true, get: function () { return release_manifest_1.validateV2SeasonReleasePointer; } });
Object.defineProperty(exports, "v2ManifestHash", { enumerable: true, get: function () { return release_manifest_1.v2ManifestHash; } });
//# sourceMappingURL=v2_release_adapter.js.map