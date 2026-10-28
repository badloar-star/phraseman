import type { DialogueV2StudyTarget } from '../../shared/dialogue_v2_language_pack_contract';
import {
  advanceQuestionObjective,
  type DialogueV2GoalAdvance,
  type DialogueV2GoalObjective,
} from './dialogue_v2_goal_progress';

// зачем (владелец 2026-09-30, D112): ход Диалогов V2 должен приносить ВМЕСТЕ с репликой
// перевод, «Почему так», «Лучше так», подсказку, настроение собеседника и признак
// «собеседник закрыл сцену» — всё одним вызовом модели, чтобы шторки открывались
// мгновенно и без второго платного запроса. Модуль чистый: ни сети, ни хранилища.
//
// Совместимость со старыми клиентами: расширенный ответ включается ТОЛЬКО когда
// запрос несёт `interfaceLang` (его шлёт лишь новый клиент 2.0). Старый клиент
// проверяет ответ по точному набору ключей — лишний ключ сломал бы ему ход.

export const DIALOGUE_V2_COACHING_INTERFACE_LANGS = Object.freeze([
  'ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'fr', 'de',
] as const);

export type DialogueV2CoachingInterfaceLang = typeof DIALOGUE_V2_COACHING_INTERFACE_LANGS[number];

export const DIALOGUE_V2_COACHING_MOODS = Object.freeze([
  'happy', 'smile', 'neutral', 'sad', 'angry',
] as const);

export type DialogueV2CoachingMood = typeof DIALOGUE_V2_COACHING_MOODS[number];

export type DialogueV2TurnCoaching = Readonly<{
  /** Перевод каждой реплики на язык интерфейса, по порядку `replies`. */
  replyTranslations: readonly string[] | null;
  /** «Почему так»: короткий разбор каждой реплики на языке интерфейса. */
  replyExplanations: readonly string[] | null;
  /** «Лучше так»: естественный вариант последней реплики ученика (язык изучения) или null. */
  betterPhrasing: string | null;
  /** Подсказка следующего шага на языке интерфейса (шаг, а не готовая фраза). */
  hint: string | null;
  /** Настроение собеседника после этого хода (5 зон макета). */
  mood: DialogueV2CoachingMood | null;
  /** Задание сцены, над которым ученик работает сейчас; null — всё выполнено или неизвестно. */
  activeObjectiveId: string | null;
  /** Собеседник закрыл сцену этой репликой. */
  dialogueEnded: boolean;
}>;

/** Пустой разбор: модель не прислала блок или прислала мусор — ход всё равно проходит. */
export const DIALOGUE_V2_EMPTY_COACHING: DialogueV2TurnCoaching = Object.freeze({
  replyTranslations: null,
  replyExplanations: null,
  betterPhrasing: null,
  hint: null,
  mood: null,
  activeObjectiveId: null,
  dialogueEnded: false,
});

/** Запас токенов на разбор: реплики + переводы + пояснения + подсказка. */
export const DIALOGUE_V2_COACHING_MAX_OUTPUT_TOKENS = 1_100 as const;

const MAX_TRANSLATION_LENGTH = 800;
const MAX_EXPLANATION_LENGTH = 600;
const MAX_BETTER_PHRASING_LENGTH = 400;
const MAX_HINT_LENGTH = 300;
const CONTROL_RE = /[\u0000-\u001f\u007f]/u;
const OBJECTIVE_ID_RE = /^(?=.{1,64}$)[a-z0-9]+(?:[_:-][a-z0-9]+)*$/;

const LANGUAGE_NAMES: Readonly<Record<DialogueV2CoachingInterfaceLang, string>> = Object.freeze({
  ru: 'Russian',
  uk: 'Ukrainian',
  en: 'English',
  es: 'Spanish',
  'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
  fr: 'French',
  de: 'German',
});

export function isDialogueV2CoachingInterfaceLang(value: unknown): value is DialogueV2CoachingInterfaceLang {
  return typeof value === 'string'
    && (DIALOGUE_V2_COACHING_INTERFACE_LANGS as readonly string[]).includes(value);
}

/**
 * Строгая схема ответа модели для хода с разбором (response_format json_schema).
 *
 * зачем (баг 02.10, прод-лог: «provider omitted coaching block» на ходах 1–3 даже после
 * инструкции 99f69f1e4): цели диалога и «к итогу» держатся на блоке разбора, а модель копировала
 * укороченную историю. Координатор: не зависеть только от модели — схема делает «coaching»
 * обязательным полем ответа на уровне API. Содержимое по-прежнему проверяет parseDialogueV2TurnCoaching.
 */
export function dialogueV2CoachingResponseFormat(): Readonly<Record<string, unknown>> {
  const nullableString = { type: ['string', 'null'] };
  return Object.freeze({
    type: 'json_schema',
    json_schema: {
      name: 'dialogue_v2_coached_turn',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['replies', 'coaching'],
        properties: {
          replies: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['personaId', 'text'],
              properties: { personaId: { type: 'string' }, text: { type: 'string' } },
            },
          },
          coaching: {
            type: 'object',
            additionalProperties: false,
            required: [
              'replyTranslations', 'replyExplanations', 'betterPhrasing', 'hint',
              'mood', 'activeObjectiveId', 'dialogueEnded',
            ],
            properties: {
              replyTranslations: { type: 'array', items: { type: 'string' } },
              replyExplanations: { type: 'array', items: { type: 'string' } },
              betterPhrasing: nullableString,
              hint: nullableString,
              mood: { type: 'string', enum: [...DIALOGUE_V2_COACHING_MOODS] },
              activeObjectiveId: nullableString,
              dialogueEnded: { type: 'boolean' },
            },
          },
        },
      },
    },
  });
}

/** Кавычки для цитаты фразы в «Почему так» — по норме языка интерфейса (dialogs-020). */
export const DIALOGUE_V2_EXPLANATION_QUOTES: Readonly<Record<DialogueV2CoachingInterfaceLang, string>> = Object.freeze({
  ru: '«…»',
  uk: '«…»',
  es: '«…»',
  'pt-BR': '«…»',
  fr: '« … »',
  de: '„…“',
  pl: '„…”',
  en: '“…”',
  vi: '“…”',
  id: '“…”',
  tr: '“…”',
});

/** Строки промпта, которые добавляются только в расширенном режиме. */
export function dialogueV2CoachingPromptLines(interfaceLang: DialogueV2CoachingInterfaceLang): readonly string[] {
  const language = LANGUAGE_NAMES[interfaceLang];
  return Object.freeze([
    'When every objective is complete, the persona may close the scene politely in character.',
    'Return one compact JSON object: {"replies":[{"personaId":"authorized_id","text":"study-language reply"}],"coaching":{...}}.',
    'Return exactly one reply per selectedSpeakerId, in the same order. "replies" items have no other fields.',
    // зачем (баг 02.10, прод-лог: «provider omitted coaching block» в 6 из 7 ходов, цели диалога
    // застряли на 3 из 6): прошлые ответы в истории сохранены только как {"replies":…}, и модель
    // копировала укороченный формат. Явно говорим, что «coaching» обязателен на КАЖДОМ ходе.
    'Earlier assistant messages in this conversation are stored shortened to {"replies":…} only. That is storage, not the format: every response you write MUST include the full "coaching" object.',
    `"coaching" is learner help written in ${language} unless stated otherwise, with exactly these fields:`,
    `- "replyTranslations": array with one faithful ${language} translation of each reply, same order.`,
    // зачем (координатор 12.10, dialogs-020, макет «Почему так»): разбор приходил от лица персонажа («Я использую … для
    // ясности») и общими словами («простая и прямая фраза»), с прямыми кавычками. Разбор пишет наставник О реплике:
    // называет конкретную фразу в кавычках языка интерфейса и что она делает в этой ситуации.
    `- "replyExplanations": array with one short ${language} note (max 2 sentences) per reply, written by a tutor ABOUT the reply: never in the persona's voice, never "I" or "me". Name the concrete study-language phrase from the reply in ${DIALOGUE_V2_EXPLANATION_QUOTES[interfaceLang]} quotes and say what it does in this situation (for example, how it softens a request or keeps the chat going). No generic praise such as "simple and clear", no grammar terminology.`,
    '- "betterPhrasing": a more natural version of the learner\'s last message in the study language, or null when it is already natural and correct.',
    `- "hint": one short ${language} suggestion of the learner's next step toward the current objective. Describe the step; never write the ready-made sentence.`,
    '- "mood": the selected persona\'s current mood caused by the learner\'s behaviour: one of "happy", "smile", "neutral", "sad", "angry".',
    '- "activeObjectiveId": id of the objective the learner should work on next, or null when all objectives are complete.',
    // зачем (координатор 28.10: «Задать один вопрос» не засчитывался ни у кого): модель не считала вопросом реплику без «?»
    // и вопрос в середине реплики; сервер страхует это сам (dialogue_v2_goal_progress.ts), а строка помогает модели.
    'Any learner message that asks something completes an objective that asks the learner to ask a question — with or without a question mark, at the start or in the middle of the message. Then point activeObjectiveId to the next objective.',
    '- "dialogueEnded": true only when the persona has closed the scene with this reply, otherwise false.',
  ]);
}

type PlainRecord = Record<string, unknown>;

function plainRecord(value: unknown): PlainRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null ? value as PlainRecord : null;
}

function learnerText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= 1 && text.length <= maxLength && !CONTROL_RE.test(text) ? text : null;
}

function alignedTexts(value: unknown, expectedLength: number, maxLength: number): readonly string[] | null {
  if (!Array.isArray(value) || value.length !== expectedLength) return null;
  const texts: string[] = [];
  for (const item of value) {
    const text = learnerText(item, maxLength);
    if (!text) return null;
    texts.push(text);
  }
  return Object.freeze(texts);
}

function normalizedComparable(text: string): string {
  return text.toLocaleLowerCase().replace(/[\s.,!?¡¿…'"’]+/gu, ' ').trim();
}

export type DialogueV2CoachingParseContext = Readonly<{
  replyCount: number;
  userMessage: string;
  studyTarget: DialogueV2StudyTarget;
  objectiveIds: readonly string[];
  /** Цели с подписями (на языке обучения): есть — сервер сам засчитывает «вопросную» цель по реплике ученика. */
  objectives?: readonly DialogueV2GoalObjective[];
  /** Номер хода в сессии (для страховки конца диалога); нет — страховка по числу ходов не применяется. */
  sessionTurnCount?: number;
  assertStudyLanguage(text: string, studyTarget: DialogueV2StudyTarget): void;
}>;

/**
 * Принять ли «диалог окончен» от модели.
 * зачем (Сверка 11.10, dialogs-038: диалог закрылся после 2-й реплики, цели 5–6 не выполнены, карточка цели пропала):
 * модель сама решает «персонаж закрыл сцену» и может сделать это рано. Конец засчитываем, только если активная цель —
 * последняя, или разговор уже длинный (страховка от вечного диалога, если модель не называет цель). Чистая функция.
 */
export function acceptDialogueEnded(input: Readonly<{
  modelEnded: boolean;
  activeObjectiveId: string | null;
  objectiveIds: readonly string[];
  sessionTurnCount?: number;
}>): { ended: boolean; reason: 'not_requested' | 'last_objective' | 'long_dialogue' | 'no_objectives' | 'premature' } {
  if (!input.modelEnded) return { ended: false, reason: 'not_requested' };
  if (input.objectiveIds.length === 0) return { ended: true, reason: 'no_objectives' };
  const last = input.objectiveIds[input.objectiveIds.length - 1];
  if (input.activeObjectiveId !== null && input.activeObjectiveId === last) return { ended: true, reason: 'last_objective' };
  // Одна цель и модель не назвала активную — это и есть последняя.
  if (input.activeObjectiveId === null && input.objectiveIds.length === 1) return { ended: true, reason: 'last_objective' };
  const minTurns = Math.max(6, input.objectiveIds.length * 2);
  if (typeof input.sessionTurnCount === 'number' && input.sessionTurnCount >= minTurns) return { ended: true, reason: 'long_dialogue' };
  return { ended: false, reason: 'premature' };
}

export type DialogueV2CoachingParseResult = Readonly<{
  coaching: DialogueV2TurnCoaching;
  /** Какие поля отброшены (только имена полей — без текста ученика и модели). */
  droppedFields: readonly string[];
  /** Решение по цели этого хода (для журнала [DIALOG-GOAL]); нет — подписей целей не передали. */
  goal?: Readonly<DialogueV2GoalAdvance & { modelActiveObjectiveId: string | null }>;
}>;

/**
 * Поле за полем: битое поле обнуляется, остальные остаются. Разбор — подсказка
 * к ходу, а не сам ход, поэтому его порча никогда не роняет реплику.
 */
export function parseDialogueV2TurnCoaching(
  value: unknown,
  context: DialogueV2CoachingParseContext,
): DialogueV2CoachingParseResult {
  const raw = plainRecord(value);
  if (!raw) {
    return Object.freeze({ coaching: DIALOGUE_V2_EMPTY_COACHING, droppedFields: Object.freeze(['coaching']) });
  }
  const dropped: string[] = [];
  const replyTranslations = alignedTexts(raw.replyTranslations, context.replyCount, MAX_TRANSLATION_LENGTH);
  if (!replyTranslations) dropped.push('replyTranslations');
  const replyExplanations = alignedTexts(raw.replyExplanations, context.replyCount, MAX_EXPLANATION_LENGTH);
  if (!replyExplanations) dropped.push('replyExplanations');

  let betterPhrasing: string | null = null;
  if (raw.betterPhrasing !== null && raw.betterPhrasing !== undefined) {
    const candidate = learnerText(raw.betterPhrasing, MAX_BETTER_PHRASING_LENGTH);
    let studyLanguageOk = false;
    if (candidate) {
      try {
        context.assertStudyLanguage(candidate, context.studyTarget);
        studyLanguageOk = true;
      } catch {
        studyLanguageOk = false;
      }
    }
    // зачем: «Лучше так» с тем же текстом, что написал ученик, — пустая кнопка.
    if (candidate && studyLanguageOk
      && normalizedComparable(candidate) !== normalizedComparable(context.userMessage)) {
      betterPhrasing = candidate;
    } else {
      dropped.push('betterPhrasing');
    }
  }

  const hint = raw.hint === null || raw.hint === undefined ? null : learnerText(raw.hint, MAX_HINT_LENGTH);
  if (raw.hint !== null && raw.hint !== undefined && !hint) dropped.push('hint');

  const mood = typeof raw.mood === 'string'
    && (DIALOGUE_V2_COACHING_MOODS as readonly string[]).includes(raw.mood)
    ? raw.mood as DialogueV2CoachingMood
    : null;
  if (!mood) dropped.push('mood');

  let activeObjectiveId: string | null = null;
  if (raw.activeObjectiveId !== null && raw.activeObjectiveId !== undefined) {
    if (typeof raw.activeObjectiveId === 'string'
      && OBJECTIVE_ID_RE.test(raw.activeObjectiveId)
      && context.objectiveIds.includes(raw.activeObjectiveId)) {
      activeObjectiveId = raw.activeObjectiveId;
    } else {
      dropped.push('activeObjectiveId');
    }
  }

  // зачем (координатор 28.10): модель держит активной «вопросную» цель, а ученик спросил — сервер сдвигает указатель сам.
  const modelActiveObjectiveId = activeObjectiveId;
  const goal = context.objectives && context.objectives.length > 0
    ? advanceQuestionObjective({
      activeObjectiveId,
      objectives: context.objectives,
      userMessage: context.userMessage,
      studyTarget: context.studyTarget,
    })
    : null;
  if (goal) activeObjectiveId = goal.activeObjectiveId;

  if (typeof raw.dialogueEnded !== 'boolean') dropped.push('dialogueEnded');
  const endDecision = acceptDialogueEnded({
    modelEnded: raw.dialogueEnded === true,
    activeObjectiveId,
    objectiveIds: context.objectiveIds,
    sessionTurnCount: context.sessionTurnCount,
  });
  const dialogueEnded = endDecision.ended;
  // Преждевременный конец снимаем и называем причину (только имя поля — без текстов, их пишет вызывающий лог).
  if (endDecision.reason === 'premature') dropped.push('dialogueEnded_premature');

  return Object.freeze({
    coaching: Object.freeze({
      replyTranslations,
      replyExplanations,
      betterPhrasing,
      hint,
      mood,
      activeObjectiveId,
      dialogueEnded,
    }),
    droppedFields: Object.freeze(dropped),
    ...(goal ? { goal: Object.freeze({ ...goal, modelActiveObjectiveId }) } : {}),
  });
}
