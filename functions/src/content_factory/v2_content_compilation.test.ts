// зачем: адаптер Functions обязан компилировать ТОЛЬКО при точном совпадении hash
// профиля из запроса с каноническим hash резолвленного тела — иначе админ мог бы
// подменить профиль после утверждения. RED до реализации.
import { hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';
import { compileV2EpisodeContent } from './v2_content_compilation';
import { parseV2AdminGenerationRequest } from './v2_admin_generation_contract';
import {
  buildEnglishProfile,
  buildE1ContentItems,
  buildActivityBindingsForContentItems,
} from '../../../tests/support/learning_v2_content_builders';

const templateRef = { templateId: 'phrase-builder', version: 1, contentHash: 'a'.repeat(64) };

function buildValidRequest() {
  const profileBody = buildEnglishProfile();
  return parseV2AdminGenerationRequest({
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
      contentHash: hashCanonicalBody(profileBody),
    },
  });
}

test('compiles only when the resolved profile body matches the pinned hash', async () => {
  const validRequest = buildValidRequest();
  const compiled = await compileV2EpisodeContent({
    request: validRequest,
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    contentItems: buildE1ContentItems(),
    activityBindings: buildActivityBindingsForContentItems(buildE1ContentItems()),
    resolveLanguageProfile: async () => ({ ref: validRequest.languageProfileRef, body: buildEnglishProfile() }),
  });
  expect(compiled.episodeId).toBe('ep-01');
  expect(compiled.sessions).toHaveLength(12);
  const requiredCardCount = compiled.sessions.flatMap((session) => session.cards)
    .filter((card) => card.family !== 'scripted_repeat_compare').length;
  expect(compiled.requiredTaskAnswerKeys).toHaveLength(requiredCardCount);
  expect(compiled.requiredTaskAnswerKeys.every((entry) =>
    !JSON.stringify(entry).includes('Hello') &&
    /^[a-f0-9]{64}$/.test(entry.expectedAnswerFingerprint),
  )).toBe(true);
});

test('rejects a profile body whose canonical hash differs from the request ref', async () => {
  const validRequest = buildValidRequest();
  await expect(compileV2EpisodeContent({
    request: validRequest,
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    contentItems: buildE1ContentItems(),
    activityBindings: buildActivityBindingsForContentItems(buildE1ContentItems()),
    resolveLanguageProfile: async () => ({
      ref: validRequest.languageProfileRef,
      body: { ...buildEnglishProfile(), targetLanguage: 'de' as const },
    }),
  })).rejects.toThrow('language_profile_hash_mismatch');
});

// зачем: доп. броня — резолвер обязан вернуть ровно запрошенный ref; эпизод обязан
// входить в запрос; результат — замороженный компилят с QA-отчётом ok=true.
test('rejects a resolver that returns a different ref than requested', async () => {
  const validRequest = buildValidRequest();
  await expect(compileV2EpisodeContent({
    request: validRequest,
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    contentItems: buildE1ContentItems(),
    activityBindings: buildActivityBindingsForContentItems(buildE1ContentItems()),
    resolveLanguageProfile: async () => ({
      ref: { ...validRequest.languageProfileRef, version: validRequest.languageProfileRef.version + 1 },
      body: buildEnglishProfile(),
    }),
  })).rejects.toThrow('language_profile_ref_mismatch');
});

test('rejects an episode that is not part of the generation request', async () => {
  const validRequest = buildValidRequest();
  await expect(compileV2EpisodeContent({
    request: validRequest,
    episodeId: 'ep-99',
    canDoOutcomeId: 'obj-introduce-self',
    contentItems: buildE1ContentItems(),
    activityBindings: buildActivityBindingsForContentItems(buildE1ContentItems()),
    resolveLanguageProfile: async () => ({ ref: validRequest.languageProfileRef, body: buildEnglishProfile() }),
  })).rejects.toThrow('compilation_episode_not_requested');
});

test('returns a frozen compiled artifact with a passing quality report', async () => {
  const validRequest = buildValidRequest();
  const compiled = await compileV2EpisodeContent({
    request: validRequest,
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    contentItems: buildE1ContentItems(),
    activityBindings: buildActivityBindingsForContentItems(buildE1ContentItems()),
    resolveLanguageProfile: async () => ({ ref: validRequest.languageProfileRef, body: buildEnglishProfile() }),
  });
  expect(Object.isFrozen(compiled)).toBe(true);
  expect(compiled.qualityReport.ok).toBe(true);
  expect(compiled.qualityReport.blockingIssues).toEqual([]);
  expect(compiled.qualityReport.languageProfileRef).toEqual(validRequest.languageProfileRef);
  expect(compiled.optionalPracticeTemplates.length).toBeLessThanOrEqual(2);
  expect(compiled.optionalPracticeTemplates.every(
    (template) => template.requiredForProgress === false && template.canWriteMastery === false,
  )).toBe(true);
  expect(Object.isFrozen(compiled.requiredTaskAnswerKeys)).toBe(true);
});
