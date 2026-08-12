// зачем: блокирующий контроль качества скомпилированного юнита. Владелец требует
// fail-closed: потеря трассируемости, сломанная кардинальность, неподдержанная семья,
// дубль подсказки, «натренированная» подсказка в независимой проверке или слот,
// способный писать mastery, — всё это БЛОКИРУЕТ выпуск, а не деградирует в warning.
import type { V2ActivityFamily } from '../../../modules/learning-v2/contracts/activity';
import type { V2OptionalPracticeSlot } from '../../../modules/learning-v2/contracts/session';
import type { V2CompiledEpisodeContent } from '../../../modules/learning-v2/content/session_compiler';
import type { V2SessionActivityBinding } from '../../../modules/learning-v2/content/session_compiler';
import type { V2ContentItem } from '../../../modules/learning-v2/content/content_item';
import type {
  V2LanguageProfileBody,
  V2LanguageProfileRef,
} from '../../../modules/learning-v2/content/language_profile';

export interface V2EpisodeContentQualityReport {
  readonly schemaVersion: 'v2-episode-content-quality-report.v1';
  readonly episodeId: string;
  readonly ok: boolean;
  readonly blockingIssues: readonly string[];
  readonly warningIssues: readonly string[];
  readonly checkedContentItemIds: readonly string[];
  readonly checkedSessionIds: readonly string[];
  readonly languageProfileRef: V2LanguageProfileRef | null;
}

const REQUIRED_SESSION_COUNT = 12;
const MIN_CARDS = 12;
const MAX_CARDS = 12;
const MIN_FAMILIES = 3;
const MAX_FAMILIES = 4;
const MAX_OPTIONAL_TEMPLATES = 2;
const EXPECTED_ZONES = Object.freeze([
  'understand', 'understand', 'understand', 'understand',
  'use', 'use', 'use', 'use',
  'master', 'master', 'master', 'master',
] as const);

export function qaV2EpisodeContent(
  compiled: V2CompiledEpisodeContent,
  contentItems: readonly V2ContentItem[],
  profile: V2LanguageProfileBody,
  activityBindings: readonly V2SessionActivityBinding[],
  optionalPracticeTemplates: readonly V2OptionalPracticeSlot[] = [],
  languageProfileRef: V2LanguageProfileRef | null = null,
): V2EpisodeContentQualityReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const itemsById = new Map(contentItems.map((item) => [item.contentItemId, item]));
  const supportedFamilies = new Set<V2ActivityFamily>(profile.supportedActivityFamilies);
  const usedContentItemIds = new Set<string>();
  const promptIds = new Set<string>();
  const cardIds = new Set<string>();
  const approvedActivityCoordinates = new Set(
    activityBindings.flatMap((binding) => binding.contentUnitIds.map(
      (contentUnitId) => `${binding.activityId}\u0000${binding.family}\u0000${contentUnitId}`,
    )),
  );

  if (compiled.episodeId !== contentItems[0]?.episodeId) blocking.push('compiled_episode_mismatch');
  if (compiled.sessions.length !== REQUIRED_SESSION_COUNT) blocking.push('compiled_session_count_invalid');

  compiled.sessions.forEach((session, index) => {
    if (session.ordinal !== index + 1) blocking.push('compiled_session_order_invalid');
    if (EXPECTED_ZONES[index] && session.zone !== EXPECTED_ZONES[index]) blocking.push('compiled_session_zone_invalid');
    if (session.cards.length < MIN_CARDS || session.cards.length > MAX_CARDS) {
      blocking.push('compiled_card_count_invalid');
    }
    const families = new Set(session.cards.map((card) => card.family));
    if (families.size < MIN_FAMILIES || families.size > MAX_FAMILIES) blocking.push('compiled_family_count_invalid');

    for (const card of session.cards) {
      if (cardIds.has(card.cardId)) blocking.push('compiled_card_id_duplicate');
      cardIds.add(card.cardId);
      const item = itemsById.get(card.contentItemId);
      if (!item) {
        blocking.push('compiled_card_content_missing');
      } else {
        usedContentItemIds.add(item.contentItemId);
        if (!item.objectiveIds.includes(card.objectiveId)) blocking.push('compiled_card_objective_missing');
        if (!item.compatibleFamilies.includes(card.family)) blocking.push('compiled_card_family_untraceable');
      }
      if (!supportedFamilies.has(card.family)) blocking.push('compiled_family_unsupported');
      if (!approvedActivityCoordinates.has(`${card.activityId}\u0000${card.family}\u0000${card.contentItemId}`)) {
        blocking.push('compiled_card_activity_untraceable');
      }
      if (promptIds.has(card.promptId)) blocking.push('compiled_prompt_duplicate');
      promptIds.add(card.promptId);
      // Независимая проверка = карточка без поддержки; натренированная формулировка
      // там измеряет память формулировки, а не язык.
      if (card.support === 'none' && card.promptNovelty === 'trained') {
        blocking.push('compiled_trained_prompt_in_independent_check');
      }
    }
  });

  if (optionalPracticeTemplates.length > MAX_OPTIONAL_TEMPLATES) blocking.push('optional_template_count_invalid');
  for (const template of optionalPracticeTemplates) {
    if (template.episodeId !== compiled.episodeId) blocking.push('optional_template_episode_mismatch');
    if (template.requiredForProgress !== false) blocking.push('optional_template_progress_forbidden');
    if (template.canWriteMastery !== false) blocking.push('optional_template_mastery_forbidden');
    if (!supportedFamilies.has(template.family)) blocking.push('optional_template_family_unsupported');
  }

  // Неиспользованный контент не блокирует (банк может быть шире юнита), но подсвечивается.
  for (const item of contentItems) {
    if (!usedContentItemIds.has(item.contentItemId)) warnings.push(`content_item_unused:${item.contentItemId}`);
  }

  const uniqueBlocking = Object.freeze([...new Set(blocking)]);
  return Object.freeze({
    schemaVersion: 'v2-episode-content-quality-report.v1',
    episodeId: compiled.episodeId,
    ok: uniqueBlocking.length === 0,
    blockingIssues: uniqueBlocking,
    warningIssues: Object.freeze([...new Set(warnings)]),
    checkedContentItemIds: Object.freeze([...usedContentItemIds].sort()),
    checkedSessionIds: Object.freeze(compiled.sessions.map((session) => session.sessionId as string)),
    languageProfileRef,
  });
}
