// зачем: адаптер Functions между утверждённым запросом генерации и чистым компилятором.
// Порядок жёсткий: (1) эпизод входит в запрос; (2) резолвер вернул РОВНО запрошенный
// ref профиля; (3) канонический hash резолвленного тела совпал с hash из ref —
// только после этого компиляция, шаблоны опциональной практики и блокирующий QA.
// Здесь НЕТ Firestore-чтений: резолвер инжектится вызывающим (тестируемость + стоимость).
import { hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';
import {
  compileV2RequiredSessions,
  type V2CompiledEpisodeContent,
  type V2SessionActivityBinding,
} from '../../../modules/learning-v2/content/session_compiler';
import { selectOptionalPracticeSlots } from '../../../modules/learning-v2/content/optional_practice';
import { validateV2LanguageProfile, type V2LanguageProfileBody, type V2LanguageProfileRef } from '../../../modules/learning-v2/content/language_profile';
import type { V2ContentItem } from '../../../modules/learning-v2/content/content_item';
import type { V2OptionalPracticeSlot } from '../../../modules/learning-v2/contracts/session';
import type { V2AdminGenerationRequest } from './v2_admin_generation_contract';
import {
  qaV2EpisodeContent,
  type V2EpisodeContentQualityReport,
} from './v2_episode_content_qa';
import {
  materializeRequiredSessionTaskAnswerKey,
  type RequiredSessionTaskAnswerKeyV1,
  type ServerVerifiableRequiredSessionFamily,
} from '../learning_v2/required_session_answer_verifier';

export interface V2ResolvedLanguageProfile {
  readonly ref: V2LanguageProfileRef;
  readonly body: V2LanguageProfileBody;
}

export interface V2CompileEpisodeContentInput {
  // зачем: компиляции нужны только эпизоды и пин профиля — сужение типа позволяет
  // прямой E1-прогон без полного запроса генерации (пины шаблонов там не участвуют).
  readonly request: Pick<V2AdminGenerationRequest, 'episodeIds' | 'languageProfileRef'>;
  readonly episodeId: string;
  readonly canDoOutcomeId: string;
  readonly contentItems: readonly V2ContentItem[];
  readonly activityBindings: readonly V2SessionActivityBinding[];
  readonly resolveLanguageProfile: (ref: V2LanguageProfileRef) => Promise<V2ResolvedLanguageProfile>;
}

export interface V2CompiledEpisodeArtifact extends V2CompiledEpisodeContent {
  readonly languageProfileRef: V2LanguageProfileRef;
  readonly optionalPracticeTemplates: readonly V2OptionalPracticeSlot[];
  /** Server-only answer fingerprints for the six non-voice required modes. */
  readonly requiredTaskAnswerKeys: readonly RequiredSessionTaskAnswerKeyV1[];
  readonly qualityReport: V2EpisodeContentQualityReport;
}

const SERVER_VERIFIABLE_FAMILIES = new Set<ServerVerifiableRequiredSessionFamily>([
  'phrase_builder',
  'listen_choose',
  'sound_contrast',
  'listen_build_dictation',
  'context_gap_grammar',
  'speed_match',
]);

const expectedAnswerForCard = (
  family: ServerVerifiableRequiredSessionFamily,
  item: V2ContentItem,
): string => {
  if (family === 'listen_choose') {
    const meaning = item.learnerMeanings[0]?.value;
    if (!meaning) throw new Error('required_session_answer_source_missing');
    return meaning;
  }
  if (family === 'context_gap_grammar') {
    const tokens = item.target.text.replace(/[?.!,]/g, '').split(/\s+/).filter(Boolean);
    const answer = tokens[Math.min(1, tokens.length - 1)];
    if (!answer) throw new Error('required_session_answer_source_missing');
    return answer;
  }
  return item.target.text;
};

/**
 * Derives answer fingerprints from the same immutable content/card mapping as
 * the compiler. Raw answers are consumed here and are not stored in the key.
 */
export const materializeCompiledRequiredTaskAnswerKeys = (
  compiled: V2CompiledEpisodeContent,
  contentItems: readonly V2ContentItem[],
): readonly RequiredSessionTaskAnswerKeyV1[] => {
  const items = new Map(contentItems.map((item) => [item.contentItemId, item]));
  const answerKeys = compiled.sessions.flatMap((session) => session.cards.flatMap((card) => {
    if (!SERVER_VERIFIABLE_FAMILIES.has(card.family as ServerVerifiableRequiredSessionFamily)) {
      if (card.family !== 'scripted_repeat_compare') {
        throw new Error('required_session_answer_family_unsupported');
      }
      return [];
    }
    const item = items.get(card.contentItemId);
    if (!item || item.episodeId !== compiled.episodeId) {
      throw new Error('required_session_answer_source_missing');
    }
    const family = card.family as ServerVerifiableRequiredSessionFamily;
    return [materializeRequiredSessionTaskAnswerKey({
      taskId: card.cardId,
      activityId: card.activityId,
      family,
      expectedAnswer: expectedAnswerForCard(family, item),
    })];
  }));
  if (new Set(answerKeys.map((entry) => entry.taskId)).size !== answerKeys.length) {
    throw new Error('required_session_answer_key_duplicate');
  }
  return Object.freeze(answerKeys);
};

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export async function compileV2EpisodeContent(
  input: V2CompileEpisodeContentInput,
): Promise<V2CompiledEpisodeArtifact> {
  const { request, episodeId, canDoOutcomeId, contentItems, activityBindings, resolveLanguageProfile } = input;

  if (!request.episodeIds.includes(episodeId)) {
    throw new Error(`compilation_episode_not_requested: ${episodeId}`);
  }

  const resolved = await resolveLanguageProfile(request.languageProfileRef);
  const requested = request.languageProfileRef;
  if (
    resolved.ref.profileId !== requested.profileId
    || resolved.ref.version !== requested.version
    || resolved.ref.contentHash !== requested.contentHash
  ) {
    throw new Error('language_profile_ref_mismatch');
  }

  // Профиль перепроверяется настоящим валидатором и его канонический hash обязан
  // совпасть с закреплённым в запросе — подмена тела после утверждения невозможна.
  const validated = validateV2LanguageProfile(resolved.body);
  if (!validated.ok) throw new Error(`language_profile_body_invalid: ${validated.issues.join(',')}`);
  const actualHash = hashCanonicalBody(validated.value);
  if (actualHash !== requested.contentHash) throw new Error('language_profile_hash_mismatch');

  const compiled = compileV2RequiredSessions({
    episodeId,
    canDoOutcomeId,
    profile: validated.value,
    items: contentItems,
    activityBindings,
  });

  // Шаблоны опциональной практики консервативны: возможности устройства неизвестны
  // на этапе генерации, поэтому фильтров «нет микрофона/сети» здесь нет — рантайм
  // отфильтрует сам через selectOptionalPracticeSlots на устройстве.
  const optionalPracticeTemplates = selectOptionalPracticeSlots({
    episodeId,
    microphoneAvailable: true,
    networkAvailable: true,
    dueContentItemIds: [],
    mistakeContentItemIds: [],
    capabilities: ([
      { capabilityId: 'quick-speak-v1', family: 'quick_spoken_response', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 75 },
      { capabilityId: 'echo-rhythm-v1', family: 'shadowing_prosody', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 90 },
    ] as const).filter((capability) => validated.value.supportedActivityFamilies.includes(capability.family)),
  });

  const qualityReport = qaV2EpisodeContent(
    compiled,
    contentItems,
    validated.value,
    activityBindings,
    optionalPracticeTemplates,
    requested,
  );
  if (!qualityReport.ok) {
    throw new Error(`episode_content_qa_blocked: ${qualityReport.blockingIssues.join(',')}`);
  }

  const requiredTaskAnswerKeys = materializeCompiledRequiredTaskAnswerKeys(
    compiled,
    contentItems,
  );

  return deepFreeze({
    ...compiled,
    languageProfileRef: requested,
    optionalPracticeTemplates,
    requiredTaskAnswerKeys,
    qualityReport,
  });
}
