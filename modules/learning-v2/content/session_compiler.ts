// зачем: урок — это 56 сессий по 12 заданий (владелец, 2026-08-16) в зонах
// understand/use/master с угасанием подсказок. Раньше здесь стояло 12×12, и
// генератор обрезал урок вчетверо; число сессий теперь берётся из топологии.
// Компилятор ДЕТЕРМИНИРОВАННЫЙ (версионная таблица, без random): один и тот же
// банк контента всегда даёт байт-в-байт одинаковые сессии — иначе нельзя ни
// кэшировать по hash, ни воспроизводить баги. Ошибки — только броском.
import { V2_ACTIVITY_FAMILIES, type V2ActivityFamily } from '../contracts/activity';
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from './course_topology_v1';
import type { LearningSupportLevel } from '../contracts/episode';
import type {
  V2RequiredSessionDefinitionV2,
  V2SessionCardPlanV2,
  V2SessionLearningFunction,
} from '../contracts/session';
import type { V2LanguageProfileBody } from './language_profile';
import {
  assertContentItemCompatibleWithProfile,
  validateV2ContentItem,
  type V2ContentItem,
} from './content_item';

export interface V2CompileSessionsInput {
  readonly episodeId: string;
  readonly canDoOutcomeId: string;
  readonly profile: V2LanguageProfileBody;
  readonly items: readonly V2ContentItem[];
  readonly activityBindings: readonly V2SessionActivityBinding[];
}

export interface V2SessionActivityBinding {
  readonly activityId: string;
  readonly family: V2ActivityFamily;
  readonly contentUnitIds: readonly string[];
}

export interface V2CompiledRequiredSession extends Omit<V2RequiredSessionDefinitionV2, 'cards'> {
  // зачем: доминирующий уровень поддержки сессии нужен QA и адаптеру; в каноническое
  // тело session-set он не сериализуется (там support живёт на карточках).
  readonly support: LearningSupportLevel;
  readonly cards: readonly V2SessionCardPlanV2[];
}

export interface V2CompiledEpisodeContent {
  readonly schemaVersion: 'v2-compiled-episode-content.v2';
  readonly episodeId: string;
  readonly canDoOutcomeId: string;
  readonly sessions: readonly V2CompiledRequiredSession[];
}

interface SessionPolicyEntry {
  readonly zone: 'understand' | 'use' | 'master';
  readonly support: LearningSupportLevel;
  readonly families: readonly V2ActivityFamily[];
}

// зачем: таблица задаёт ЧИСЛО СЕССИЙ в уроке (индекс = requiredSessionOrdinal-1).
// До 2026-08-16 в ней было 12 записей, и генератор молча обрезал урок на 12-й
// сессии, хотя топология курса (course_topology_v1.ts) объявляет 56: семь глав
// по восемь. Владелец потребовал привести валидатор к 56 — контент не должен
// подгоняться под заниженный шлюз. Первые 12 записей НЕ ТРОГАТЬ: по ним уже
// собран контент эпизода 1, изменение молча переписало бы выданные сессии.
//
// Дальше идёт та же кривая поддержки, повторённая по главам: внутри каждой главы
// из восьми сессий ученик проходит путь от опоры на образец до работы без неё.
const CHAPTER_SUPPORT_CURVE_V1: readonly SessionPolicyEntry[] = Object.freeze([
  { zone: 'understand', support: 'model', families: ['listen_choose', 'speed_match', 'phrase_builder'] },
  { zone: 'understand', support: 'full_text', families: ['listen_choose', 'sound_contrast', 'phrase_builder'] },
  { zone: 'understand', support: 'partial_cue', families: ['speed_match', 'phrase_builder', 'context_gap_grammar'] },
  { zone: 'use', support: 'partial_cue', families: ['phrase_builder', 'context_gap_grammar', 'listen_build_dictation'] },
  { zone: 'use', support: 'partial_cue', families: ['listen_build_dictation', 'phrase_builder', 'scripted_repeat_compare'] },
  { zone: 'use', support: 'visual_only', families: ['context_gap_grammar', 'listen_choose', 'speed_match'] },
  { zone: 'master', support: 'visual_only', families: ['speed_match', 'listen_build_dictation', 'context_gap_grammar'] },
  // Восьмая сессия главы — граница чекпоинта: поддержки нет совсем.
  { zone: 'master', support: 'none', families: ['scripted_repeat_compare', 'phrase_builder', 'listen_build_dictation'] },
] as const);

const LEGACY_FIRST_TWELVE_V1: readonly SessionPolicyEntry[] = Object.freeze([
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
] as const);

export const REQUIRED_SESSION_POLICY_V1: readonly SessionPolicyEntry[] =
  Object.freeze([
    ...LEGACY_FIRST_TWELVE_V1,
    ...Array.from(
      { length: LEARNING_V2_LESSON_SESSION_COUNT_V1 - LEGACY_FIRST_TWELVE_V1.length },
      (_unused, index) =>
        CHAPTER_SUPPORT_CURVE_V1[
          (LEGACY_FIRST_TWELVE_V1.length + index) % CHAPTER_SUPPORT_CURVE_V1.length
        ],
    ),
  ]);

// зачем: profile может поддерживать исторические или экспериментальные режимы,
// но обязательная V2-сессия не имеет права молча подставить их как fallback.
// Список синхронизирован с решением владельца о семи режимах.
const REQUIRED_SESSION_ALLOWED_FAMILIES = new Set<V2ActivityFamily>([
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
const FAMILY_LEARNING_FUNCTION: Readonly<Record<V2ActivityFamily, V2SessionLearningFunction>> = Object.freeze({
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

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function detachActivityBindings(input: unknown): readonly V2SessionActivityBinding[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 4096) {
    throw new Error('session_activity_binding_missing');
  }
  const arrayKeys = Reflect.ownKeys(input);
  if (arrayKeys.length !== input.length + 1 || arrayKeys.some((key) =>
    typeof key !== 'string' || (key !== 'length' && !/^(?:0|[1-9][0-9]*)$/.test(key)))) {
    throw new Error('session_activity_binding_invalid');
  }
  const detached: V2SessionActivityBinding[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const slot = Object.getOwnPropertyDescriptor(input, String(index));
    if (!slot || !('value' in slot) || !slot.enumerable) {
      throw new Error('session_activity_binding_invalid');
    }
    const value = slot.value as unknown;
    if (typeof value !== 'object' || value === null || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
      throw new Error('session_activity_binding_invalid');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(value);
    const expected = ['activityId', 'family', 'contentUnitIds'] as const;
    if (keys.length !== expected.length || keys.some((key) =>
      typeof key !== 'string' || !expected.includes(key as typeof expected[number]))) {
      throw new Error('session_activity_binding_invalid');
    }
    const read = (key: typeof expected[number]): unknown => {
      const descriptor = descriptors[key];
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        throw new Error('session_activity_binding_invalid');
      }
      return descriptor.value;
    };
    const activityId = read('activityId');
    const family = read('family');
    const unitIds = read('contentUnitIds');
    if (!Array.isArray(unitIds) || unitIds.length === 0 || unitIds.length > 4096) {
      throw new Error('session_activity_binding_invalid');
    }
    const unitKeys = Reflect.ownKeys(unitIds);
    if (unitKeys.length !== unitIds.length + 1 || unitKeys.some((key) =>
      typeof key !== 'string' || (key !== 'length' && !/^(?:0|[1-9][0-9]*)$/.test(key)))) {
      throw new Error('session_activity_binding_invalid');
    }
    const contentUnitIds: string[] = [];
    for (let unitIndex = 0; unitIndex < unitIds.length; unitIndex += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(unitIds, String(unitIndex));
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable ||
        typeof descriptor.value !== 'string') {
        throw new Error('session_activity_binding_invalid');
      }
      contentUnitIds.push(descriptor.value);
    }
    detached.push(Object.freeze({
      activityId: activityId as string,
      family: family as V2ActivityFamily,
      contentUnitIds: Object.freeze(contentUnitIds),
    }));
  }
  return Object.freeze(detached);
}

// зачем: novelty независимой проверки не может быть 'trained' — QA (Task 7) блокирует
// повторное использование натренированных формулировок в зоне master.
function noveltyForZone(zone: SessionPolicyEntry['zone']): V2SessionCardPlanV2['promptNovelty'] {
  if (zone === 'understand') return 'trained';
  if (zone === 'use') return 'varied';
  return 'novel';
}

function eligibleItemsForFamily(
  items: readonly V2ContentItem[],
  family: V2ActivityFamily,
): readonly V2ContentItem[] {
  return items.filter((item) => item.compatibleFamilies.includes(family));
}

function resolveSessionFamilies(
  policy: SessionPolicyEntry,
  profile: V2LanguageProfileBody,
  items: readonly V2ContentItem[],
  ordinal: number,
): readonly V2ActivityFamily[] {
  const supported = new Set(profile.supportedActivityFamilies);
  const resolved: V2ActivityFamily[] = [];
  for (const family of policy.families) {
    if (supported.has(family) && eligibleItemsForFamily(items, family).length > 0) {
      if (!resolved.includes(family)) resolved.push(family);
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
    if (fallback.length > 0) resolved.push(fallback[0]);
  }
  if (resolved.length < 3) {
    throw new Error(
      `session_content_insufficient: session ${ordinal} resolves only ${resolved.length} families`,
    );
  }
  return resolved;
}

function pickObjectiveId(item: V2ContentItem, canDoOutcomeId: string): string {
  return item.objectiveIds.includes(canDoOutcomeId) ? canDoOutcomeId : item.objectiveIds[0];
}

export function compileV2RequiredSessions(input: V2CompileSessionsInput): V2CompiledEpisodeContent {
  const { episodeId, canDoOutcomeId, profile, items } = input;
  if (typeof episodeId !== 'string' || !episodeId.trim()) throw new Error('session_compile_episode_required');
  if (typeof canDoOutcomeId !== 'string' || !canDoOutcomeId.trim()) throw new Error('session_compile_outcome_required');
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('session_content_insufficient: empty content bank');
  }
  const activityBindings = detachActivityBindings(input.activityBindings);

  // зачем: fail-closed вход — компилятор не доверяет вызывающему и перепроверяет
  // каждый айтем настоящим валидатором, принадлежность эпизоду и совместимость с профилем.
  const seenIds = new Set<string>();
  for (const item of items) {
    const validated = validateV2ContentItem(item);
    if (!validated.ok) throw new Error(`session_content_item_invalid: ${validated.issues.join(',')}`);
    if (item.episodeId !== episodeId) throw new Error(`session_content_episode_mismatch: ${item.contentItemId}`);
    if (seenIds.has(item.contentItemId)) throw new Error(`session_content_item_duplicate: ${item.contentItemId}`);
    seenIds.add(item.contentItemId);
    assertContentItemCompatibleWithProfile(item, profile);
  }
  if (!items.some((item) => item.objectiveIds.includes(canDoOutcomeId))) {
    throw new Error('session_can_do_untraceable');
  }

  const bindingIds = new Set<string>();
  const bindingsByCoordinate = new Map<string, V2SessionActivityBinding[]>();
  for (const binding of activityBindings) {
    if (
      binding === null
      || typeof binding !== 'object'
      || Array.isArray(binding)
      || Object.keys(binding).sort().join(',') !== 'activityId,contentUnitIds,family'
      || typeof binding.activityId !== 'string'
      || !binding.activityId.trim()
      || !(V2_ACTIVITY_FAMILIES as readonly unknown[]).includes(binding.family)
      || !Array.isArray(binding.contentUnitIds)
      || binding.contentUnitIds.length === 0
      || binding.contentUnitIds.some((id: unknown) => typeof id !== 'string' || !seenIds.has(id))
      || new Set(binding.contentUnitIds).size !== binding.contentUnitIds.length
      || bindingIds.has(binding.activityId)
    ) {
      throw new Error('session_activity_binding_invalid');
    }
    bindingIds.add(binding.activityId);
    for (const contentUnitId of binding.contentUnitIds) {
      const coordinate = `${binding.family}\u0000${contentUnitId}`;
      const candidates = bindingsByCoordinate.get(coordinate) ?? [];
      candidates.push(binding);
      bindingsByCoordinate.set(coordinate, candidates);
    }
  }

  const resolveActivityId = (family: V2ActivityFamily, contentItemId: string): string => {
    const candidates = bindingsByCoordinate.get(`${family}\u0000${contentItemId}`) ?? [];
    if (candidates.length === 0) throw new Error(`session_activity_binding_missing:${family}:${contentItemId}`);
    if (candidates.length !== 1) throw new Error(`session_activity_binding_ambiguous:${family}:${contentItemId}`);
    return candidates[0].activityId;
  };

  // Детерминизм: внутренняя сортировка отвязывает результат от порядка входа.
  const sortedItems = [...items].sort((a, b) => a.contentItemId.localeCompare(b.contentItemId, 'en'));

  let promptCounter = 0;
  const sessions = REQUIRED_SESSION_POLICY_V1.map((policy, index) => {
    const ordinal = index + 1;
    const families = resolveSessionFamilies(policy, profile, sortedItems, ordinal);

    // Кандидаты: round-robin по семьям, внутри семьи — айтемы по алфавиту;
    // пара (айтем, семья) используется в сессии максимум один раз.
    const perFamilyQueues = families.map((family) => ({
      family,
      queue: eligibleItemsForFamily(sortedItems, family),
    }));
    const cards: V2SessionCardPlanV2[] = [];
    const familyCursor = perFamilyQueues.map(() => 0);
    let progressed = true;
    while (cards.length < MAX_CARDS && progressed) {
      progressed = false;
      for (let f = 0; f < perFamilyQueues.length && cards.length < MAX_CARDS; f += 1) {
        const { family, queue } = perFamilyQueues[f];
        if (familyCursor[f] >= queue.length) continue;
        const item = queue[familyCursor[f]];
        familyCursor[f] += 1;
        progressed = true;
        promptCounter += 1;
        cards.push({
          cardId: `card-${episodeId}-s${pad(ordinal)}-${pad(cards.length + 1)}`,
          contentItemId: item.contentItemId,
          activityId: resolveActivityId(family, item.contentItemId),
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
      throw new Error(
        `session_content_insufficient: session ${ordinal} produced ${cards.length} of ${MIN_CARDS} cards`,
      );
    }
    const distinctFamilies = new Set(cards.map((card) => card.family)).size;
    if (distinctFamilies < 3 || distinctFamilies > 4) {
      throw new Error(`session_content_insufficient: session ${ordinal} has ${distinctFamilies} families`);
    }

    const targetSeconds = Math.min(
      MAX_TARGET_SECONDS,
      Math.max(MIN_TARGET_SECONDS, cards.length * SECONDS_PER_CARD),
    );

    const session: V2CompiledRequiredSession = {
      sessionId: `session-${episodeId}-${pad(ordinal)}` as V2CompiledRequiredSession['sessionId'],
      ordinal,
      zone: policy.zone,
      support: policy.support,
      targetSeconds,
      cards,
    };
    return session;
  });

  return deepFreeze({
    schemaVersion: 'v2-compiled-episode-content.v2',
    episodeId,
    canDoOutcomeId,
    sessions,
  });
}
