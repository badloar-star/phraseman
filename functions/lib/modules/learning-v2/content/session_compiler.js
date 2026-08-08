"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIRED_SESSION_POLICY_V1 = void 0;
exports.compileV2RequiredSessions = compileV2RequiredSessions;
const content_item_1 = require("./content_item");
// зачем: версионная таблица из утверждённого плана — менять только новой версией,
// иначе перегенерация юнитов молча изменит уже выданные ученикам сессии.
exports.REQUIRED_SESSION_POLICY_V1 = Object.freeze([
    { zone: 'understand', support: 'model', families: ['listen_choose', 'speed_match', 'phrase_builder'] },
    { zone: 'understand', support: 'full_text', families: ['listen_choose', 'sound_contrast', 'phrase_builder'] },
    { zone: 'understand', support: 'full_text', families: ['speed_match', 'phrase_builder', 'context_gap_grammar'] },
    { zone: 'understand', support: 'partial_cue', families: ['listen_choose', 'phrase_builder', 'scripted_repeat_compare'] },
    { zone: 'use', support: 'partial_cue', families: ['phrase_builder', 'context_gap_grammar', 'listen_build_dictation'] },
    { zone: 'use', support: 'partial_cue', families: ['listen_build_dictation', 'phrase_builder', 'scripted_repeat_compare'] },
    { zone: 'use', support: 'partial_cue', families: ['context_gap_grammar', 'listen_choose', 'speed_match'] },
    { zone: 'use', support: 'visual_only', families: ['listen_build_dictation', 'scripted_repeat_compare', 'phrase_builder'] },
    { zone: 'master', support: 'visual_only', families: ['speed_match', 'listen_build_dictation', 'context_gap_grammar'] },
    { zone: 'master', support: 'none', families: ['scripted_repeat_compare', 'phrase_builder', 'listen_build_dictation'] },
    { zone: 'master', support: 'none', families: ['scripted_repeat_compare', 'context_gap_grammar', 'speed_match'] },
    { zone: 'master', support: 'none', families: ['phrase_builder', 'listen_choose', 'listen_build_dictation'] },
]);
// зачем: profile может поддерживать исторические или экспериментальные режимы,
// но обязательная V2-сессия не имеет права молча подставить их как fallback.
// Список синхронизирован с решением владельца о семи режимах.
const REQUIRED_SESSION_ALLOWED_FAMILIES = new Set([
    'phrase_builder',
    'listen_choose',
    'sound_contrast',
    'listen_build_dictation',
    'context_gap_grammar',
    'speed_match',
    'scripted_repeat_compare',
]);
// зачем: языково-безопасный фолбэк может подменить семью ТОЛЬКО на семью той же
// учебной функции — иначе сессия теряет смысл (нельзя менять диктант на «повтори вслух»).
const FAMILY_LEARNING_FUNCTION = Object.freeze({
    visual_discovery: 'notice',
    listen_choose: 'comprehend',
    sound_contrast: 'discriminate',
    sound_syllable_lab: 'discriminate',
    scripted_repeat_compare: 'pronounce',
    phrase_builder: 'assemble',
    listen_build_dictation: 'assemble',
    context_gap_grammar: 'retrieve',
    quick_spoken_response: 'respond',
    shadowing_prosody: 'pronounce',
    describe_scene: 'notice',
    microstory_radio: 'comprehend',
    branching_scene: 'transfer',
    scripted_dialogue: 'transfer',
    personalized_review: 'review',
    speed_match: 'retrieve',
});
const MIN_CARDS = 12;
const MAX_CARDS = 12;
const SECONDS_PER_CARD = 25;
const MIN_TARGET_SECONDS = 150;
const MAX_TARGET_SECONDS = 360;
function deepFreeze(value) {
    if (typeof value === 'object' && value !== null) {
        for (const child of Object.values(value))
            deepFreeze(child);
        Object.freeze(value);
    }
    return value;
}
function pad(value) {
    return String(value).padStart(2, '0');
}
// зачем: novelty независимой проверки не может быть 'trained' — QA (Task 7) блокирует
// повторное использование натренированных формулировок в зоне master.
function noveltyForZone(zone) {
    if (zone === 'understand')
        return 'trained';
    if (zone === 'use')
        return 'varied';
    return 'novel';
}
function eligibleItemsForFamily(items, family) {
    return items.filter((item) => item.compatibleFamilies.includes(family));
}
function resolveSessionFamilies(policy, profile, items, ordinal) {
    const supported = new Set(profile.supportedActivityFamilies);
    const resolved = [];
    for (const family of policy.families) {
        if (supported.has(family) && eligibleItemsForFamily(items, family).length > 0) {
            if (!resolved.includes(family))
                resolved.push(family);
            continue;
        }
        // Фолбэк: та же учебная функция, поддерживается профилем, есть контент, ещё не взята.
        const wanted = FAMILY_LEARNING_FUNCTION[family];
        const fallback = [...supported]
            .filter((candidate) => REQUIRED_SESSION_ALLOWED_FAMILIES.has(candidate))
            .filter((candidate) => FAMILY_LEARNING_FUNCTION[candidate] === wanted)
            .filter((candidate) => !resolved.includes(candidate))
            .filter((candidate) => eligibleItemsForFamily(items, candidate).length > 0)
            .sort();
        if (fallback.length > 0)
            resolved.push(fallback[0]);
    }
    if (resolved.length < 3) {
        throw new Error(`session_content_insufficient: session ${ordinal} resolves only ${resolved.length} families`);
    }
    return resolved;
}
function pickObjectiveId(item, canDoOutcomeId) {
    return item.objectiveIds.includes(canDoOutcomeId) ? canDoOutcomeId : item.objectiveIds[0];
}
function compileV2RequiredSessions(input) {
    const { episodeId, canDoOutcomeId, profile, items } = input;
    if (typeof episodeId !== 'string' || !episodeId.trim())
        throw new Error('session_compile_episode_required');
    if (typeof canDoOutcomeId !== 'string' || !canDoOutcomeId.trim())
        throw new Error('session_compile_outcome_required');
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('session_content_insufficient: empty content bank');
    }
    // зачем: fail-closed вход — компилятор не доверяет вызывающему и перепроверяет
    // каждый айтем настоящим валидатором, принадлежность эпизоду и совместимость с профилем.
    const seenIds = new Set();
    for (const item of items) {
        const validated = (0, content_item_1.validateV2ContentItem)(item);
        if (!validated.ok)
            throw new Error(`session_content_item_invalid: ${validated.issues.join(',')}`);
        if (item.episodeId !== episodeId)
            throw new Error(`session_content_episode_mismatch: ${item.contentItemId}`);
        if (seenIds.has(item.contentItemId))
            throw new Error(`session_content_item_duplicate: ${item.contentItemId}`);
        seenIds.add(item.contentItemId);
        (0, content_item_1.assertContentItemCompatibleWithProfile)(item, profile);
    }
    if (!items.some((item) => item.objectiveIds.includes(canDoOutcomeId))) {
        throw new Error('session_can_do_untraceable');
    }
    // Детерминизм: внутренняя сортировка отвязывает результат от порядка входа.
    const sortedItems = [...items].sort((a, b) => a.contentItemId.localeCompare(b.contentItemId, 'en'));
    let promptCounter = 0;
    const sessions = exports.REQUIRED_SESSION_POLICY_V1.map((policy, index) => {
        const ordinal = index + 1;
        const families = resolveSessionFamilies(policy, profile, sortedItems, ordinal);
        // Кандидаты: round-robin по семьям, внутри семьи — айтемы по алфавиту;
        // пара (айтем, семья) используется в сессии максимум один раз.
        const perFamilyQueues = families.map((family) => ({
            family,
            queue: eligibleItemsForFamily(sortedItems, family),
        }));
        const cards = [];
        const familyCursor = perFamilyQueues.map(() => 0);
        let progressed = true;
        while (cards.length < MAX_CARDS && progressed) {
            progressed = false;
            for (let f = 0; f < perFamilyQueues.length && cards.length < MAX_CARDS; f += 1) {
                const { family, queue } = perFamilyQueues[f];
                if (familyCursor[f] >= queue.length)
                    continue;
                const item = queue[familyCursor[f]];
                familyCursor[f] += 1;
                progressed = true;
                promptCounter += 1;
                cards.push({
                    cardId: `card-${episodeId}-s${pad(ordinal)}-${pad(cards.length + 1)}`,
                    contentItemId: item.contentItemId,
                    objectiveId: pickObjectiveId(item, canDoOutcomeId),
                    family,
                    learningFunction: FAMILY_LEARNING_FUNCTION[family],
                    support: policy.support,
                    promptId: `prompt-${episodeId}-${pad(ordinal)}-${String(promptCounter).padStart(3, '0')}`,
                    promptNovelty: noveltyForZone(policy.zone),
                });
            }
        }
        if (cards.length < MIN_CARDS) {
            throw new Error(`session_content_insufficient: session ${ordinal} produced ${cards.length} of ${MIN_CARDS} cards`);
        }
        const distinctFamilies = new Set(cards.map((card) => card.family)).size;
        if (distinctFamilies < 3 || distinctFamilies > 4) {
            throw new Error(`session_content_insufficient: session ${ordinal} has ${distinctFamilies} families`);
        }
        const targetSeconds = Math.min(MAX_TARGET_SECONDS, Math.max(MIN_TARGET_SECONDS, cards.length * SECONDS_PER_CARD));
        const session = {
            sessionId: `session-${episodeId}-${pad(ordinal)}`,
            ordinal,
            zone: policy.zone,
            support: policy.support,
            targetSeconds,
            cards,
        };
        return session;
    });
    return deepFreeze({
        schemaVersion: 'v2-compiled-episode-content.v1',
        episodeId,
        canDoOutcomeId,
        sessions,
    });
}
//# sourceMappingURL=session_compiler.js.map