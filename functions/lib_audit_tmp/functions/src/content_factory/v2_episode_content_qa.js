"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qaV2EpisodeContent = qaV2EpisodeContent;
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
]);
function qaV2EpisodeContent(compiled, contentItems, profile, optionalPracticeTemplates = [], languageProfileRef = null) {
    const blocking = [];
    const warnings = [];
    const itemsById = new Map(contentItems.map((item) => [item.contentItemId, item]));
    const supportedFamilies = new Set(profile.supportedActivityFamilies);
    const usedContentItemIds = new Set();
    const promptIds = new Set();
    const cardIds = new Set();
    if (compiled.episodeId !== contentItems[0]?.episodeId)
        blocking.push('compiled_episode_mismatch');
    if (compiled.sessions.length !== REQUIRED_SESSION_COUNT)
        blocking.push('compiled_session_count_invalid');
    compiled.sessions.forEach((session, index) => {
        if (session.ordinal !== index + 1)
            blocking.push('compiled_session_order_invalid');
        if (EXPECTED_ZONES[index] && session.zone !== EXPECTED_ZONES[index])
            blocking.push('compiled_session_zone_invalid');
        if (session.cards.length < MIN_CARDS || session.cards.length > MAX_CARDS) {
            blocking.push('compiled_card_count_invalid');
        }
        const families = new Set(session.cards.map((card) => card.family));
        if (families.size < MIN_FAMILIES || families.size > MAX_FAMILIES)
            blocking.push('compiled_family_count_invalid');
        for (const card of session.cards) {
            if (cardIds.has(card.cardId))
                blocking.push('compiled_card_id_duplicate');
            cardIds.add(card.cardId);
            const item = itemsById.get(card.contentItemId);
            if (!item) {
                blocking.push('compiled_card_content_missing');
            }
            else {
                usedContentItemIds.add(item.contentItemId);
                if (!item.objectiveIds.includes(card.objectiveId))
                    blocking.push('compiled_card_objective_missing');
                if (!item.compatibleFamilies.includes(card.family))
                    blocking.push('compiled_card_family_untraceable');
            }
            if (!supportedFamilies.has(card.family))
                blocking.push('compiled_family_unsupported');
            if (promptIds.has(card.promptId))
                blocking.push('compiled_prompt_duplicate');
            promptIds.add(card.promptId);
            // Независимая проверка = карточка без поддержки; натренированная формулировка
            // там измеряет память формулировки, а не язык.
            if (card.support === 'none' && card.promptNovelty === 'trained') {
                blocking.push('compiled_trained_prompt_in_independent_check');
            }
        }
    });
    if (optionalPracticeTemplates.length > MAX_OPTIONAL_TEMPLATES)
        blocking.push('optional_template_count_invalid');
    for (const template of optionalPracticeTemplates) {
        if (template.episodeId !== compiled.episodeId)
            blocking.push('optional_template_episode_mismatch');
        if (template.requiredForProgress !== false)
            blocking.push('optional_template_progress_forbidden');
        if (template.canWriteMastery !== false)
            blocking.push('optional_template_mastery_forbidden');
        if (!supportedFamilies.has(template.family))
            blocking.push('optional_template_family_unsupported');
    }
    // Неиспользованный контент не блокирует (банк может быть шире юнита), но подсвечивается.
    for (const item of contentItems) {
        if (!usedContentItemIds.has(item.contentItemId))
            warnings.push(`content_item_unused:${item.contentItemId}`);
    }
    const uniqueBlocking = Object.freeze([...new Set(blocking)]);
    return Object.freeze({
        schemaVersion: 'v2-episode-content-quality-report.v1',
        episodeId: compiled.episodeId,
        ok: uniqueBlocking.length === 0,
        blockingIssues: uniqueBlocking,
        warningIssues: Object.freeze([...new Set(warnings)]),
        checkedContentItemIds: Object.freeze([...usedContentItemIds].sort()),
        checkedSessionIds: Object.freeze(compiled.sessions.map((session) => session.sessionId)),
        languageProfileRef,
    });
}
//# sourceMappingURL=v2_episode_content_qa.js.map