// зачем: вертикальный срез E1 — доказательство, что исходный банк контента реально
// компилируется в утверждённые 12 сессий, проходит блокирующий QA и не трогает
// каноническую легаси-фикстуру episode-01.valid.json. Это финальный гейт пакета.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileV2RequiredSessions } from '../modules/learning-v2/content/session_compiler';
import { validateV2LanguageProfile } from '../modules/learning-v2/content/language_profile';
import { validateV2ContentItem, type V2ContentItem } from '../modules/learning-v2/content/content_item';
import { hashCanonicalBody } from '../modules/learning-v2/policies/decision_registry';
import { validateOptionalPracticeRewardPolicy } from '../modules/learning-v2/progress/optional_practice_reward';
import { qaV2EpisodeContent } from '../functions/src/content_factory/v2_episode_content_qa';
import { buildActivityBindingsForContentItems } from './support/learning_v2_content_builders';

function readJson(relativePath: string): any {
  return JSON.parse(readFileSync(join(__dirname, relativePath), 'utf8'));
}

const source = readJson('fixtures/learning-v2/content-studio/e1-content-source.json');

function validatedProfile() {
  const result = validateV2LanguageProfile(source.languageProfile);
  if (!result.ok) throw new Error('fixture_profile_invalid: ' + result.issues.join(','));
  return result.value;
}

function validatedItems(): readonly V2ContentItem[] {
  return source.contentItems.map((raw: unknown) => {
    const result = validateV2ContentItem(raw);
    if (!result.ok) throw new Error('fixture_item_invalid: ' + result.issues.join(','));
    return result.value;
  });
}

test('compiles the E1 source into the approved twelve-session semantics', () => {
  const canonical = readJson('fixtures/learning-v2/episode-01.valid.json');
  const compiled = compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: source.canDoOutcomeId,
    profile: validatedProfile(),
    items: validatedItems(),
    activityBindings: buildActivityBindingsForContentItems(validatedItems()),
  });
  const qa = qaV2EpisodeContent(
    compiled,
    validatedItems(),
    validatedProfile(),
    buildActivityBindingsForContentItems(validatedItems()),
  );
  expect(qa.ok).toBe(true);
  expect(compiled.sessions).toHaveLength(12);
  expect(compiled.sessions.flatMap((session) => session.cards).every((card) =>
    source.contentItems.some((item: { contentItemId: string }) => item.contentItemId === card.contentItemId),
  )).toBe(true);
  expect(canonical.episode.episodeId).toBe('ep-01');
  expect(canonical.episode.canDoOutcome.some((value: { value: string }) => value.value.trim().length > 0)).toBe(true);
});

test('keeps optional reward output outside canonical mastery evidence', () => {
  expect(source.optionalPracticeTemplates.length).toBeLessThanOrEqual(2);
  expect(source.optionalPracticeTemplates.every((template: { requiredForProgress: boolean; canWriteMastery: boolean }) =>
    template.requiredForProgress === false && template.canWriteMastery === false,
  )).toBe(true);
});

// зачем: доп. броня — хэши в фикстуре обязаны быть НАСТОЯЩИМИ canonical-хэшами
// (профиль и политика наград), иначе exact-ref пайплайн Task 6/7 не сможет им доверять.
test('fixture refs carry real canonical hashes', () => {
  expect(hashCanonicalBody(validatedProfile())).toBe(source.languageProfileRef.contentHash);
  expect(source.languageProfileRef.profileId).toBe(source.languageProfile.profileId);
  expect(source.languageProfileRef.version).toBe(source.languageProfile.version);
  const policy = validateOptionalPracticeRewardPolicy(source.rewardPolicy);
  expect(policy.ok).toBe(true);
  expect(hashCanonicalBody(source.rewardPolicy)).toBe(source.rewardPolicyRef.contentHash);
  expect(source.rewardPolicyRef.kind).toBe('reward');
  expect(source.rewardPolicy.key).toBe('optional-practice-test-policy');
});

test('legacy canonical fixture stays byte-compatible with v1 expectations', () => {
  const canonical = readJson('fixtures/learning-v2/episode-01.valid.json');
  // Пакет E1 не имеет права переписывать легаси-фикстуру: id и структура неизменны.
  expect(canonical.episode.episodeId).toBe('ep-01');
  expect(Array.isArray(canonical.episode.canDoOutcome)).toBe(true);
});
