// зачем: адаптер «банк E1 → раунды демо для каждого режима». Чистые функции без
// сети: варианты ответов строятся из принятых/отклонённых форм банка, дистракторы —
// из соседних фраз. Детерминированно (сортировка по id, без random) — раунд режима
// всегда одинаковый, баг воспроизводим.
import type { V2ActivityFamily } from '../../modules/learning-v2/contracts/activity';
import type { V2ContentItem } from '../../modules/learning-v2/content/content_item';
import {
  compileV2RequiredSessions,
  type V2CompiledEpisodeContent,
} from '../../modules/learning-v2/content/session_compiler';
import {
  buildE1DemoItems,
  buildE1DemoProfile,
  E1_DEMO_CAN_DO_OUTCOME_ID,
  E1_DEMO_EPISODE_ID,
} from '../../modules/learning-v2/content/e1_demo_bank';
import type { LabInteraction } from './mode_catalog';

export interface LabChoiceOption {
  readonly value: string;
  readonly correct: boolean;
  // зачем: у отклонённого варианта есть код причины — плеер показывает разбор ошибки.
  readonly reasonCode?: string;
}

export interface LabDemoRound {
  readonly family: V2ActivityFamily;
  readonly interaction: LabInteraction;
  readonly instruction: string;
  readonly phrase: string;
  readonly meaning: string;
  readonly options: readonly LabChoiceOption[];
  readonly tiles: readonly string[];
  readonly answer: string;
}

const INSTRUCTIONS: Partial<Record<V2ActivityFamily, string>> = {
  visual_discovery: 'Выбери фразу, которая подходит к смыслу',
  listen_choose: 'Прослушай и выбери услышанное',
  microstory_radio: 'Прослушай историю и выбери реплику героя',
  branching_scene: 'Выбери, как продолжить сцену',
  sound_contrast: 'Прослушай и выбери форму, которая звучала',
  sound_syllable_lab: 'Выбери фразу с правильным ударением',
  scripted_repeat_compare: 'Произнеси фразу и сравни с образцом',
  shadowing_prosody: 'Повторяй вслух в темпе диктора',
  phrase_builder: 'Собери фразу из плиток',
  listen_build_dictation: 'Прослушай и собери услышанное',
  context_gap_grammar: 'Выбери форму для пропуска',
  speed_match: 'Успей выбрать перевод до конца таймера',
  quick_spoken_response: 'Ответь вслух одной фразой',
  scripted_dialogue: 'Произнеси свою реплику диалога',
  personalized_review: 'Выбери верный вариант из своей истории',
  describe_scene: 'Режим снят с направления владельцем',
};

let cachedUnit: V2CompiledEpisodeContent | null = null;

// зачем: юнит компилируется НАСТОЯЩИМ компилятором один раз и переиспользуется —
// лаборатория показывает ровно те 12 сессий, которые получит ученик.
export function getDemoUnit(): V2CompiledEpisodeContent {
  if (cachedUnit) return cachedUnit;
  cachedUnit = compileV2RequiredSessions({
    episodeId: E1_DEMO_EPISODE_ID,
    canDoOutcomeId: E1_DEMO_CAN_DO_OUTCOME_ID,
    profile: buildE1DemoProfile(),
    items: buildE1DemoItems(),
  });
  return cachedUnit;
}

function itemsForFamily(family: V2ActivityFamily): readonly V2ContentItem[] {
  const eligible = buildE1DemoItems().filter((item) => item.compatibleFamilies.includes(family));
  // Для снятых/непокрытых банком семей демо строится на всём банке — плеер всё равно
  // помечает такие режимы, а пустой раунд хуже честной заглушки.
  const base = eligible.length > 0 ? eligible : buildE1DemoItems();
  return [...base].sort((a, b) => a.contentItemId.localeCompare(b.contentItemId, 'en'));
}

function tilesFromPhrase(phrase: string): readonly string[] {
  const words = phrase.replace(/[.?!]/g, '').split(' ').filter(Boolean);
  // Детерминированная перетасовка: чётные слова, затем нечётные в обратном порядке.
  const even = words.filter((_, index) => index % 2 === 0);
  const odd = words.filter((_, index) => index % 2 === 1).reverse();
  return [...odd, ...even];
}

export function buildDemoRound(family: V2ActivityFamily, interaction: LabInteraction): LabDemoRound {
  const pool = itemsForFamily(family);
  const item = pool[0];
  const distractorPool = pool.length > 1 ? pool.slice(1) : buildE1DemoItems().filter((entry) => entry.contentItemId !== item.contentItemId);

  const correct = item.acceptedAnswers[0];
  const rejected = item.rejectedAnswers[0];
  const options: LabChoiceOption[] = [
    { value: correct, correct: true },
    ...(rejected ? [{ value: rejected.value, correct: false, reasonCode: rejected.reasonCode }] : []),
    ...distractorPool.slice(0, rejected ? 2 : 3).map((entry) => ({ value: entry.acceptedAnswers[0], correct: false })),
  ];
  // Детерминированный порядок показа: по алфавиту, чтобы правильный не стоял всегда первым.
  const sortedOptions = [...options].sort((a, b) => a.value.localeCompare(b.value, 'en'));

  return Object.freeze({
    family,
    interaction,
    instruction: INSTRUCTIONS[family] ?? 'Выполни задание',
    phrase: item.target.text,
    meaning: item.learnerMeanings[0]?.value ?? '',
    options: Object.freeze(sortedOptions),
    tiles: Object.freeze([...tilesFromPhrase(correct)]),
    answer: correct,
  });
}

// зачем: проверка сборки не наказывает за регистр/краевые пробелы — как в контракте
// контент-айтемов (нормализация сравнением, показ — оригиналом).
export function isAssembledCorrect(assembled: readonly string[], answer: string): boolean {
  const normalized = assembled.join(' ').trim().toLowerCase();
  const expected = answer.replace(/[.?!]/g, '').trim().toLowerCase();
  return normalized === expected;
}
