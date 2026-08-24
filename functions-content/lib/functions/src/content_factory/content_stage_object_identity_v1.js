"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentStageObjectPathFromHashV1 = contentStageObjectPathFromHashV1;
exports.contentStagePlanObjectPathV1 = contentStagePlanObjectPathV1;
const node_crypto_1 = require("node:crypto");
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
const HASH_RE = /^[a-f0-9]{64}$/u;
function contentStageObjectPathFromHashV1(stageId, revision, attempt, leaseTokenHash) {
    if (!STAGE_ID_RE.test(stageId) ||
        !Number.isSafeInteger(revision) ||
        revision < 1 ||
        !Number.isSafeInteger(attempt) ||
        attempt < 1 ||
        !HASH_RE.test(leaseTokenHash))
        throw new Error("content_stage_object_identity_invalid");
    return `content-factory-stages/${(0, node_crypto_1.createHash)("sha256").update(stageId).digest("hex")}/r${revision}/a${attempt}-${leaseTokenHash}.json`;
}
function contentStagePlanObjectPathV1(stageId, planRequestRawHash) {
    if (!STAGE_ID_RE.test(stageId) || !HASH_RE.test(planRequestRawHash))
        throw new Error("content_stage_plan_object_identity_invalid");
    return `content-factory-stage-plans/${(0, node_crypto_1.createHash)("sha256").update(stageId).digest("hex")}/${planRequestRawHash}.json`;
}
//# sourceMappingURL=content_stage_object_identity_v1.js.map