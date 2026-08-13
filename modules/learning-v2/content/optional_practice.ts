// зачем: опциональная практика — источник фармимых звёзд доступа, но НЕ прогресса.
// Детерминированный выбор максимум двух слотов: ошибки → должники → текущий юнит;
// внутри приоритета — стабильно по capabilityId. Никакого UI здесь нет:
// выход — селекторы источников контента, а не скопированные тела фраз.
import type { V2ActivityFamily } from '../contracts/activity';
import type { V2OptionalPracticeSlot } from '../contracts/session';

export interface V2OptionalPracticeCapability {
  readonly capabilityId: string;
  readonly family: V2ActivityFamily;
  readonly requiresMicrophone: boolean;
  readonly requiresNetwork: boolean;
  readonly expectedSeconds: number;
}

export interface V2OptionalPracticeSelectionInput {
  readonly episodeId: string;
  readonly microphoneAvailable: boolean;
  readonly networkAvailable: boolean;
  readonly dueContentItemIds: readonly string[];
  readonly mistakeContentItemIds: readonly string[];
  readonly capabilities: readonly V2OptionalPracticeCapability[];
}

const MAX_SLOTS = 2;

// зачем: порядок полезности практики утверждён планом — починка ошибок ценнее
// повторения должников, а свежий юнит — последний резерв.
const PRIORITY_ORDER = Object.freeze(['mistake', 'due', 'current_unit'] as const);

type SourcePriority = (typeof PRIORITY_ORDER)[number];

function prioritisedSources(input: V2OptionalPracticeSelectionInput): readonly SourcePriority[] {
  const hasSource: Record<SourcePriority, boolean> = {
    mistake: input.mistakeContentItemIds.length > 0,
    due: input.dueContentItemIds.length > 0,
    current_unit: true,
  };
  return PRIORITY_ORDER.filter((source) => hasSource[source]);
}

export function selectOptionalPracticeSlots(
  input: V2OptionalPracticeSelectionInput,
): readonly V2OptionalPracticeSlot[] {
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

  const slots: V2OptionalPracticeSlot[] = [];
  const usedCapabilities = new Set<string>();
  for (let index = 0; index < ordered.length && slots.length < MAX_SLOTS; index += 1) {
    const capability = ordered[index];
    if (usedCapabilities.has(capability.capabilityId)) continue;
    usedCapabilities.add(capability.capabilityId);
    // Первому слоту — самый полезный доступный источник, второму — следующий по списку;
    // так два слота не дублируют друг друга по смыслу.
    const sourcePriority = sources[Math.min(slots.length, sources.length - 1)];
    slots.push(Object.freeze({
      slotId: `optional-${input.episodeId}-${capability.capabilityId}`,
      episodeId: input.episodeId as V2OptionalPracticeSlot['episodeId'],
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
