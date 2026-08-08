"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectOptionalPracticeSlots = selectOptionalPracticeSlots;
const MAX_SLOTS = 2;
// зачем: порядок полезности практики утверждён планом — починка ошибок ценнее
// повторения должников, а свежий юнит — последний резерв.
const PRIORITY_ORDER = Object.freeze(['mistake', 'due', 'personal_plan', 'current_unit']);
function prioritisedSources(input) {
    const hasSource = {
        mistake: input.mistakeContentItemIds.length > 0,
        due: input.dueContentItemIds.length > 0,
        personal_plan: input.personalPlanContentItemIds.length > 0,
        current_unit: true,
    };
    return PRIORITY_ORDER.filter((source) => hasSource[source]);
}
function selectOptionalPracticeSlots(input) {
    if (typeof input.episodeId !== 'string' || !input.episodeId.trim()) {
        throw new Error('optional_practice_episode_required');
    }
    // Фильтр возможностей устройства: слот без микрофона/сети не показываем вовсе —
    // «мёртвая» кнопка хуже отсутствующей.
    const usable = input.capabilities
        .filter((capability) => !capability.requiresMicrophone || input.microphoneAvailable)
        .filter((capability) => !capability.requiresNetwork || input.networkAvailable)
        .filter((capability) => Number.isSafeInteger(capability.expectedSeconds) && capability.expectedSeconds >= 1);
    // Стабильная детерминированная сортировка — результат не зависит от порядка входа.
    const ordered = [...usable].sort((a, b) => a.capabilityId.localeCompare(b.capabilityId, 'en'));
    const sources = prioritisedSources(input);
    const slots = [];
    const usedCapabilities = new Set();
    for (let index = 0; index < ordered.length && slots.length < MAX_SLOTS; index += 1) {
        const capability = ordered[index];
        if (usedCapabilities.has(capability.capabilityId))
            continue;
        usedCapabilities.add(capability.capabilityId);
        // Первому слоту — самый полезный доступный источник, второму — следующий по списку;
        // так два слота не дублируют друг друга по смыслу.
        const sourcePriority = sources[Math.min(slots.length, sources.length - 1)];
        slots.push(Object.freeze({
            slotId: `optional-${input.episodeId}-${capability.capabilityId}`,
            episodeId: input.episodeId,
            capabilityId: capability.capabilityId,
            family: capability.family,
            sourcePriority,
            expectedSeconds: capability.expectedSeconds,
            requiredForProgress: false,
            canWriteMastery: false,
        }));
    }
    return Object.freeze(slots);
}
//# sourceMappingURL=optional_practice.js.map