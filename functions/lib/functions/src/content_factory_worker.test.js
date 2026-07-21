"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const content_factory_worker_1 = require("./content_factory_worker");
const source_registry_1 = require("./content_factory/source_registry");
describe('content factory unit runner request', () => {
    it('accepts one bounded canonical generation unit', () => {
        expect((0, content_factory_worker_1.parseGenerationUnitRequest)({ jobId: 'job-1', surface: 'quiz', lessonId: 3 })).toEqual({ jobId: 'job-1', surface: 'quiz', lessonId: 3 });
    });
    it('rejects unsupported or unsafe units', () => {
        expect(() => (0, content_factory_worker_1.parseGenerationUnitRequest)({ jobId: '../escape', surface: 'quiz', lessonId: 1 })).toThrow(https_1.HttpsError);
        expect(() => (0, content_factory_worker_1.parseGenerationUnitRequest)({ jobId: 'job', surface: 'theory', lessonId: 1 })).toThrow(https_1.HttpsError);
        expect(() => (0, content_factory_worker_1.parseGenerationUnitRequest)({ jobId: 'job', surface: 'quiz', lessonId: 101 })).toThrow(https_1.HttpsError);
    });
    it('requires an explicit immutable blueprint reference', () => {
        expect((0, source_registry_1.parseSourceRegistryReference)('english-core-32:v1')).toEqual({ blueprintId: 'english-core-32', version: 'v1' });
        expect(() => (0, source_registry_1.parseSourceRegistryReference)('en-v1')).toThrow('source_registry_reference_invalid');
    });
});
//# sourceMappingURL=content_factory_worker.test.js.map