"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMPT_REGRESSION_CASES = void 0;
exports.promptRegressionManifest = promptRegressionManifest;
exports.promptRegressionManifestHash = promptRegressionManifestHash;
exports.regressionHash = regressionHash;
const node_crypto_1 = require("node:crypto");
const cases_1 = require("./fixtures/prompt-regression/cases");
function canonical(value) { if (Array.isArray(value))
    return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object')
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`; return JSON.stringify(value); }
function hash(value) { return (0, node_crypto_1.createHash)('sha256').update(canonical(value)).digest('hex'); }
exports.PROMPT_REGRESSION_CASES = cases_1.PROMPT_REGRESSION_FIXTURES;
function promptRegressionManifest(cases) { const entries = cases.map((item) => JSON.parse(JSON.stringify(item))); return Object.freeze({ schemaVersion: 'prompt-regression-manifest-v1', entries: Object.freeze(entries), hash: hash(entries) }); }
function promptRegressionManifestHash() { return promptRegressionManifest(exports.PROMPT_REGRESSION_CASES).hash; }
function regressionHash(value) { return hash(value); }
//# sourceMappingURL=quality_regression_corpus.js.map