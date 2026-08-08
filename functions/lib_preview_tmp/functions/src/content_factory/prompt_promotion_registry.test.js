"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const prompt_promotion_registry_1 = require("./prompt_promotion_registry");
const prompt_registry_1 = require("./prompt_registry");
const stage_contracts_1 = require("./stage_contracts");
describe('prompt promotion registry', () => {
    it('has evidence-pinned active versions for every supported stage kind', () => {
        expect(Object.keys(prompt_promotion_registry_1.ACTIVE_PROMPT_PROFILES).sort()).toEqual([...stage_contracts_1.GENERATION_STAGE_KINDS].sort());
        expect((0, prompt_promotion_registry_1.activePromptProfile)('challenge_questions')).toMatchObject({
            promptVersion: 'v2',
            schemaVersion: 2,
            qaPolicy: 'question-studio-quality-v2',
        });
        expect((0, prompt_promotion_registry_1.activePromptProfile)('lesson_phrases')).toMatchObject({ promptVersion: 'v3', schemaVersion: 3 });
    });
    it('rejects a candidate that weakens the active challenge schema', () => {
        const current = (0, prompt_registry_1.promptDefinitionFor)('challenge_questions', 'v2');
        const weak = {
            ...current,
            version: 'v3',
            outputSchema: { type: 'object', properties: { stage: { const: 'challenge_questions' }, items: { type: 'array' } } },
        };
        const report = (0, prompt_promotion_registry_1.buildPromptPromotionReportForDefinition)('challenge_questions', 'v2', 'v3', weak);
        expect(report.summary.regressions).toBe(0);
        expect(report.summary.candidateFailures).toBeGreaterThan(0);
        expect(report.passed).toBe(false);
        expect(report.candidateChecks.find((check) => check.id === 'schema_compatibility')?.passed).toBe(false);
    });
    it('routes single and bulk stage creation through the promotion registry', () => {
        const adminSource = node_fs_1.default.readFileSync(__filename.replace(/content_factory[\\/]prompt_promotion_registry\.test\.ts$/, 'admin_content_stages.ts'), 'utf8');
        const bulkSource = node_fs_1.default.readFileSync(__filename.replace(/prompt_promotion_registry\.test\.ts$/, 'bulk_stage_plan.ts'), 'utf8');
        expect(adminSource).toContain('activePromptProfile(input.kind)');
        expect(bulkSource).toContain('activePromptProfile(kind)');
    });
});
//# sourceMappingURL=prompt_promotion_registry.test.js.map