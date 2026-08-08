"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// зачем: адаптер Functions обязан компилировать ТОЛЬКО при точном совпадении hash
// профиля из запроса с каноническим hash резолвленного тела — иначе админ мог бы
// подменить профиль после утверждения. RED до реализации.
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const v2_content_compilation_1 = require("./v2_content_compilation");
const v2_admin_generation_contract_1 = require("./v2_admin_generation_contract");
const learning_v2_content_builders_1 = require("../../../tests/support/learning_v2_content_builders");
const templateRef = { templateId: 'phrase-builder', version: 1, contentHash: 'a'.repeat(64) };
function buildValidRequest() {
    const profileBody = (0, learning_v2_content_builders_1.buildEnglishProfile)();
    return (0, v2_admin_generation_contract_1.parseV2AdminGenerationRequest)({
        schemaVersion: 'v2-admin-generation-request.v1',
        seasonId: 'season-01',
        scope: 'vertical_slice',
        episodeIds: ['ep-01'],
        studyTarget: 'en',
        sourceLocale: 'ru',
        targetLocales: ['de'],
        templateBindings: [{ episodeId: 'ep-01', templateRefs: [templateRef] }],
        idempotencyKey: 'generate-e1',
        languageProfileRef: {
            profileId: profileBody.profileId,
            version: profileBody.version,
            contentHash: (0, decision_registry_1.hashCanonicalBody)(profileBody),
        },
    });
}
test('compiles only when the resolved profile body matches the pinned hash', async () => {
    const validRequest = buildValidRequest();
    const compiled = await (0, v2_content_compilation_1.compileV2EpisodeContent)({
        request: validRequest,
        episodeId: 'ep-01',
        canDoOutcomeId: 'obj-introduce-self',
        contentItems: (0, learning_v2_content_builders_1.buildE1ContentItems)(),
        resolveLanguageProfile: async () => ({ ref: validRequest.languageProfileRef, body: (0, learning_v2_content_builders_1.buildEnglishProfile)() }),
    });
    expect(compiled.episodeId).toBe('ep-01');
    expect(compiled.sessions).toHaveLength(12);
});
test('rejects a profile body whose canonical hash differs from the request ref', async () => {
    const validRequest = buildValidRequest();
    await expect((0, v2_content_compilation_1.compileV2EpisodeContent)({
        request: validRequest,
        episodeId: 'ep-01',
        canDoOutcomeId: 'obj-introduce-self',
        contentItems: (0, learning_v2_content_builders_1.buildE1ContentItems)(),
        resolveLanguageProfile: async () => ({
            ref: validRequest.languageProfileRef,
            body: { ...(0, learning_v2_content_builders_1.buildEnglishProfile)(), targetLanguage: 'de' },
        }),
    })).rejects.toThrow('language_profile_hash_mismatch');
});
// зачем: доп. броня — резолвер обязан вернуть ровно запрошенный ref; эпизод обязан
// входить в запрос; результат — замороженный компилят с QA-отчётом ok=true.
test('rejects a resolver that returns a different ref than requested', async () => {
    const validRequest = buildValidRequest();
    await expect((0, v2_content_compilation_1.compileV2EpisodeContent)({
        request: validRequest,
        episodeId: 'ep-01',
        canDoOutcomeId: 'obj-introduce-self',
        contentItems: (0, learning_v2_content_builders_1.buildE1ContentItems)(),
        resolveLanguageProfile: async () => ({
            ref: { ...validRequest.languageProfileRef, version: validRequest.languageProfileRef.version + 1 },
            body: (0, learning_v2_content_builders_1.buildEnglishProfile)(),
        }),
    })).rejects.toThrow('language_profile_ref_mismatch');
});
test('rejects an episode that is not part of the generation request', async () => {
    const validRequest = buildValidRequest();
    await expect((0, v2_content_compilation_1.compileV2EpisodeContent)({
        request: validRequest,
        episodeId: 'ep-99',
        canDoOutcomeId: 'obj-introduce-self',
        contentItems: (0, learning_v2_content_builders_1.buildE1ContentItems)(),
        resolveLanguageProfile: async () => ({ ref: validRequest.languageProfileRef, body: (0, learning_v2_content_builders_1.buildEnglishProfile)() }),
    })).rejects.toThrow('compilation_episode_not_requested');
});
test('returns a frozen compiled artifact with a passing quality report', async () => {
    const validRequest = buildValidRequest();
    const compiled = await (0, v2_content_compilation_1.compileV2EpisodeContent)({
        request: validRequest,
        episodeId: 'ep-01',
        canDoOutcomeId: 'obj-introduce-self',
        contentItems: (0, learning_v2_content_builders_1.buildE1ContentItems)(),
        resolveLanguageProfile: async () => ({ ref: validRequest.languageProfileRef, body: (0, learning_v2_content_builders_1.buildEnglishProfile)() }),
    });
    expect(Object.isFrozen(compiled)).toBe(true);
    expect(compiled.qualityReport.ok).toBe(true);
    expect(compiled.qualityReport.blockingIssues).toEqual([]);
    expect(compiled.qualityReport.languageProfileRef).toEqual(validRequest.languageProfileRef);
    expect(compiled.optionalPracticeTemplates.length).toBeLessThanOrEqual(2);
    expect(compiled.optionalPracticeTemplates.every((template) => template.requiredForProgress === false && template.canWriteMastery === false)).toBe(true);
});
//# sourceMappingURL=v2_content_compilation.test.js.map