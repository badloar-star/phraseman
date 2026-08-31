// ════════════════════════════════════════════════════════════════════════════
// quests_core.ts — чистое ядро системы «Задания» (без firebase-admin).
//
// зачем (владелец, 2026-08-31): владелец назначает задание из админки, оно
// появляется на Главной пульсирующей плашкой под карточкой последнего урока.
// Юзер открывает модал, видит что нужно сделать и какие подарки получит,
// выполняет — и забирает награду.
//
// Правила владельца, зашитые здесь:
//   • АКТИВНО НЕ БОЛЕЕ ОДНОГО задания. Пока текущее живёт (72ч по умолчанию),
//     следующее назначить нельзя — оно встаёт В ОЧЕРЕДЬ.
//   • Очередь разбирается сама: закончилось активное → поднимается следующее
//     (либо сразу, либо в назначенную дату старта).
//   • Не успел выполнить — награда сгорает. Выполнил, но не забрал до дедлайна —
//     тоже сгорает (решение владельца 2026-08-31, вариант «строго в дедлайн»).
//
// Здесь ТОЛЬКО чистые функции: парсинг конфига, валидация, проверка прогресса,
// разбор очереди. Транзакции и Firestore — в quests.ts (образец: пара
// shard_survey_core.ts / shard_survey.ts).
// ════════════════════════════════════════════════════════════════════════════

export const QUEST_SCHEMA_VERSION = 'quest.v1' as const;

export const SUPPORTED_QUEST_LANGS = [
  'ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
] as const;
export type QuestLang = (typeof SUPPORTED_QUEST_LANGS)[number];

/** Локализованная строка. Минимум обязателен `ru` (fallback-язык проекта). */
export type LocalizedString = { ru: string } & Partial<Record<QuestLang, string>>;

// ────────────────────────────────────────────────────────────────────────────
// Типы заданий.
//
// Каждый тип обязан опираться на УЖЕ СУЩЕСТВУЮЩИЙ сигнал, иначе получается
// «механизм есть, а данных не дали» — класс бага, который в этом проекте
// повторялся многократно (память project_reward_shown_not_credited_class).
// ────────────────────────────────────────────────────────────────────────────
export const QUEST_KINDS = [
  /** Создать набор карточек и отправить его в сообщество. Засчёт — по отправке на ревью. */
  'community_pack_submit',
  /** Пригласить друга: засчитывается активация реферала. */
  'invite_friend',
  /** Заработать N рун (считается ПРИРОСТ с момента старта задания). */
  'earn_runes',
  /** Крутить колесо наград N раз (в том числе платные спины за руны). */
  'spin_wheel',
  /** Посмотреть видео суммарно N минут. */
  'watch_video',
  /** Пройти N занятий. */
  'complete_lessons',
  /** Сыграть N матчей на Арене. */
  'arena_matches',
  /** Серия: заниматься N дней подряд. */
  'streak_days',
  /** Потренировать N карточек. */
  'flashcards_reviewed',
  /** Заработать N опыта. */
  'earn_xp',
] as const;
export type QuestKind = (typeof QUEST_KINDS)[number];

export type QuestTargetUnit = 'count' | 'runes' | 'minutes' | 'days' | 'xp';

/** Единица измерения цели — нужна для показа («3 раза», «30 минут»). */
export const QUEST_TARGET_UNIT: Readonly<Record<QuestKind, QuestTargetUnit>> = Object.freeze({
  community_pack_submit: 'count',
  invite_friend: 'count',
  earn_runes: 'runes',
  spin_wheel: 'count',
  watch_video: 'minutes',
  complete_lessons: 'count',
  arena_matches: 'count',
  streak_days: 'days',
  flashcards_reviewed: 'count',
  earn_xp: 'xp',
});

/**
 * Цели, которые считаются ПРИРОСТОМ от значения на момент старта задания.
 *
 * зачем: «заработать 1000 рун» обязано означать «заработать ещё 1000 ПОСЛЕ
 * начала задания», а не «иметь 1000 на балансе». Иначе игрок с большим
 * балансом закрывает задание мгновенно, ничего не сделав, — и наоборот,
 * потратив руны, терял бы уже честно набранный прогресс.
 */
export const QUEST_KIND_IS_DELTA: Readonly<Record<QuestKind, boolean>> = Object.freeze({
  community_pack_submit: false,
  invite_friend: false,
  earn_runes: true,
  spin_wheel: false,
  watch_video: false,
  complete_lessons: true,
  arena_matches: false,
  streak_days: false,
  flashcards_reviewed: false,
  earn_xp: true,
});

// ────────────────────────────────────────────────────────────────────────────
// Награды.
// ────────────────────────────────────────────────────────────────────────────
export const QUEST_REWARD_KINDS = ['pearls', 'runes', 'spins', 'plus_days', 'energy_full', 'freeze'] as const;
export type QuestRewardKind = (typeof QUEST_REWARD_KINDS)[number];

export type QuestReward = Readonly<{ kind: QuestRewardKind; amount: number }>;

/** Допустимые количества по каждому виду награды. */
export const QUEST_REWARD_LIMITS: Readonly<Record<QuestRewardKind, Readonly<{ min: number; max: number }>>> = Object.freeze({
  pearls: Object.freeze({ min: 1, max: 500 }),
  runes: Object.freeze({ min: 10, max: 3_000 }),
  spins: Object.freeze({ min: 1, max: 10 }),
  plus_days: Object.freeze({ min: 1, max: 60 }),
  energy_full: Object.freeze({ min: 1, max: 1 }),
  freeze: Object.freeze({ min: 1, max: 3 }),
});

/**
 * Номиналы рун-подарков каталога. Клиент раскладывает сумму ровно так же
 * (app/daily_journey_gift_activation.ts → RUNE_DENOMINATIONS), поэтому сумма
 * обязана раскладываться без остатка — иначе награда не выдастся.
 */
export const QUEST_RUNE_DENOMINATIONS: readonly number[] = Object.freeze([1_000, 500, 250, 100, 50, 20, 10]);

/** Раскладывается ли сумма рун по номиналам каталога без остатка. */
export function runeAmountIsPayable(amount: number): boolean {
  if (!Number.isSafeInteger(amount) || amount <= 0) return false;
  let remaining = amount;
  for (const denomination of QUEST_RUNE_DENOMINATIONS) {
    while (remaining >= denomination) remaining -= denomination;
  }
  return remaining === 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Конфиг задания (документ коллекции `quests`).
// ────────────────────────────────────────────────────────────────────────────
export type QuestStatus =
  /** В очереди: ещё не показывается никому. */
  | 'queued'
  /** Активно: показывается на Главной, идёт отсчёт. */
  | 'active'
  /** Срок вышел. */
  | 'expired'
  /** Снято владельцем вручную. */
  | 'archived';

export type QuestConfig = Readonly<{
  questId: string;
  status: QuestStatus;
  kind: QuestKind;
  /** Целевое число: 3 спина, 1000 рун, 30 минут. Для одноразовых типов — 1. */
  target: number;
  title: LocalizedString;
  /** Текст «что нужно сделать» — человеческим языком, по Библии текстов. */
  body: LocalizedString;
  rewards: readonly QuestReward[];
  /** Сколько часов живёт задание после активации. */
  durationHours: number;
  /** Позиция в очереди (меньше — раньше). */
  queueOrder: number;
  /**
   * Не поднимать из очереди раньше этого момента (мс). 0 — «как только
   * освободится место». Владелец может назначить дату старта.
   */
  scheduledStartMs: number;
  /** Проставляется при активации. */
  activatedAtMs: number;
  expiresAtMs: number;
  createdAtMs: number;
  updatedAtMs: number;
  updatedBy: string;
}>;

export const QUEST_ID_RE = /^[a-z0-9_]{1,64}$/;
export const DEFAULT_QUEST_DURATION_HOURS = 72;
export const QUEST_DURATION_MIN_HOURS = 1;
export const QUEST_DURATION_MAX_HOURS = 30 * 24;
export const QUEST_MAX_REWARDS = 6;
export const QUEST_TITLE_MAX = 120;
export const QUEST_BODY_MAX = 600;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function toInt(value: unknown, fallback: number): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

/** Парс локализованной строки. Требует непустой `ru`; иначе null. */
export function parseLocalizedString(value: unknown, max: number): LocalizedString | null {
  const raw = asRecord(value);
  const ru = text(raw.ru, max);
  if (!ru) return null;
  const out: Record<string, string> = { ru };
  for (const lang of SUPPORTED_QUEST_LANGS) {
    if (lang === 'ru') continue;
    const v = text(raw[lang], max);
    if (v) out[lang] = v;
  }
  return out as LocalizedString;
}

/** Разрешить локализованную строку в конкретный язык с fallback на ru. */
export function resolveLocalized(str: LocalizedString, lang: string): string {
  const key = String(lang ?? 'ru');
  const value = (str as Record<string, string | undefined>)[key];
  return (value && value.trim()) || str.ru;
}

export function parseQuestReward(value: unknown): QuestReward | null {
  const raw = asRecord(value);
  const kind = text(raw.kind, 32) as QuestRewardKind;
  if (!QUEST_REWARD_KINDS.includes(kind)) return null;
  const amount = toInt(raw.amount, 0);
  const limits = QUEST_REWARD_LIMITS[kind];
  if (amount < limits.min || amount > limits.max) return null;
  if (kind === 'runes' && !runeAmountIsPayable(amount)) return null;
  return Object.freeze({ kind, amount });
}

export function parseQuestConfig(value: unknown): QuestConfig | null {
  const raw = asRecord(value);
  const questId = text(raw.questId, 64);
  if (!QUEST_ID_RE.test(questId)) return null;
  const kind = text(raw.kind, 40) as QuestKind;
  if (!QUEST_KINDS.includes(kind)) return null;
  const title = parseLocalizedString(raw.title, QUEST_TITLE_MAX);
  const body = parseLocalizedString(raw.body, QUEST_BODY_MAX);
  if (!title || !body) return null;

  const rewardsRaw = Array.isArray(raw.rewards) ? raw.rewards : [];
  const rewards = rewardsRaw
    .map(parseQuestReward)
    .filter((r): r is QuestReward => r !== null)
    .slice(0, QUEST_MAX_REWARDS);
  if (rewards.length === 0) return null;

  const statusRaw = text(raw.status, 20);
  const status: QuestStatus = statusRaw === 'active' || statusRaw === 'expired' || statusRaw === 'archived'
    ? statusRaw
    : 'queued';

  const durationHours = Math.min(
    QUEST_DURATION_MAX_HOURS,
    Math.max(QUEST_DURATION_MIN_HOURS, toInt(raw.durationHours, DEFAULT_QUEST_DURATION_HOURS)),
  );

  return Object.freeze({
    questId,
    status,
    kind,
    target: Math.max(1, toInt(raw.target, 1)),
    title,
    body,
    rewards: Object.freeze(rewards),
    durationHours,
    queueOrder: Math.max(0, toInt(raw.queueOrder, 0)),
    scheduledStartMs: Math.max(0, toInt(raw.scheduledStartMs, 0)),
    activatedAtMs: Math.max(0, toInt(raw.activatedAtMs, 0)),
    expiresAtMs: Math.max(0, toInt(raw.expiresAtMs, 0)),
    createdAtMs: Math.max(0, toInt(raw.createdAtMs, 0)),
    updatedAtMs: Math.max(0, toInt(raw.updatedAtMs, 0)),
    updatedBy: text(raw.updatedBy, 160),
  });
}

export type QuestWriteValidation =
  | Readonly<{ ok: true; config: QuestConfig }>
  | Readonly<{ ok: false; reason: string }>;

/**
 * Валидация конфига перед записью из админки. Возвращает причину отказа
 * строкой — админка показывает её владельцу дословно, без «что-то пошло не так»
 * (правило «сперва логи, потом починка»: отказ обязан называть себя).
 */
export function validateQuestConfigForWrite(value: unknown): QuestWriteValidation {
  const raw = asRecord(value);
  const questId = text(raw.questId, 64);
  if (!QUEST_ID_RE.test(questId)) {
    return Object.freeze({ ok: false, reason: 'Идентификатор задания: только латиница в нижнем регистре, цифры и подчёркивание.' });
  }
  const kind = text(raw.kind, 40) as QuestKind;
  if (!QUEST_KINDS.includes(kind)) {
    return Object.freeze({ ok: false, reason: 'Неизвестный тип задания.' });
  }
  if (!parseLocalizedString(raw.title, QUEST_TITLE_MAX)) {
    return Object.freeze({ ok: false, reason: 'Заголовок обязателен (минимум русский текст).' });
  }
  if (!parseLocalizedString(raw.body, QUEST_BODY_MAX)) {
    return Object.freeze({ ok: false, reason: 'Описание обязательно (минимум русский текст).' });
  }
  const rewardsRaw = Array.isArray(raw.rewards) ? raw.rewards : [];
  if (rewardsRaw.length === 0) {
    return Object.freeze({ ok: false, reason: 'Добавьте хотя бы одну награду.' });
  }
  if (rewardsRaw.length > QUEST_MAX_REWARDS) {
    return Object.freeze({ ok: false, reason: `Не больше ${QUEST_MAX_REWARDS} наград в одном задании.` });
  }
  for (const rewardRaw of rewardsRaw) {
    if (parseQuestReward(rewardRaw) === null) {
      const kindText = text(asRecord(rewardRaw).kind, 32);
      const amountText = text(asRecord(rewardRaw).amount, 32);
      if (kindText === 'runes') {
        return Object.freeze({
          ok: false,
          reason: `Руны: сумма ${amountText} не раскладывается по номиналам подарков (10, 20, 50, 100, 250, 500, 1000). Возьмите сумму из этих слагаемых.`,
        });
      }
      return Object.freeze({ ok: false, reason: `Награда «${kindText}» ${amountText} вне допустимых значений.` });
    }
  }
  const target = toInt(raw.target, 1);
  if (target < 1 || target > 1_000_000) {
    return Object.freeze({ ok: false, reason: 'Цель должна быть от 1 до 1 000 000.' });
  }
  const config = parseQuestConfig({ ...raw, questId, kind });
  if (!config) return Object.freeze({ ok: false, reason: 'Конфиг задания не прошёл разбор.' });
  return Object.freeze({ ok: true, config });
}

// ────────────────────────────────────────────────────────────────────────────
// Прогресс игрока (документ users/{uid}/quest_progress/{questId}).
// ────────────────────────────────────────────────────────────────────────────
export type QuestProgressState = Readonly<{
  questId: string;
  /** Базовое значение счётчика на момент старта — для дельта-целей. */
  baseline: number;
  /** Текущее значение счётчика (абсолютное для не-дельта, сырое для дельта). */
  current: number;
  completedAtMs: number;
  claimedAtMs: number;
  startedAtMs: number;
}>;

export function emptyQuestProgress(questId: string, nowMs: number): QuestProgressState {
  return Object.freeze({
    questId,
    baseline: 0,
    current: 0,
    completedAtMs: 0,
    claimedAtMs: 0,
    startedAtMs: nowMs,
  });
}

export function parseQuestProgress(value: unknown, questId: string, nowMs: number): QuestProgressState {
  const raw = asRecord(value);
  if (Object.keys(raw).length === 0) return emptyQuestProgress(questId, nowMs);
  return Object.freeze({
    questId,
    baseline: Math.max(0, toInt(raw.baseline, 0)),
    current: Math.max(0, toInt(raw.current, 0)),
    completedAtMs: Math.max(0, toInt(raw.completedAtMs, 0)),
    claimedAtMs: Math.max(0, toInt(raw.claimedAtMs, 0)),
    startedAtMs: Math.max(0, toInt(raw.startedAtMs, nowMs)),
  });
}

/**
 * Сколько засчитано игроку. Для дельта-целей — прирост от baseline; счётчик
 * никогда не уходит в минус (потратил руны → прогресс задания не падает).
 */
export function questProgressValue(config: QuestConfig, progress: QuestProgressState): number {
  if (!QUEST_KIND_IS_DELTA[config.kind]) return Math.max(0, progress.current);
  return Math.max(0, progress.current - progress.baseline);
}

export function questIsComplete(config: QuestConfig, progress: QuestProgressState): boolean {
  return questProgressValue(config, progress) >= config.target;
}

export type QuestPhase = 'active' | 'ready' | 'claimed' | 'expired';

/**
 * Фаза задания для конкретного игрока.
 *
 * Владелец (2026-08-31): выполненное, но не забранное задание сгорает СТРОГО
 * в дедлайн — послаблений нет, поэтому истёкший срок бьёт даже готовую награду.
 */
export function resolveQuestPhase(
  config: QuestConfig,
  progress: QuestProgressState,
  nowMs: number,
): QuestPhase {
  if (progress.claimedAtMs > 0) return 'claimed';
  const expired = config.status === 'expired'
    || config.status === 'archived'
    || (config.expiresAtMs > 0 && config.expiresAtMs <= nowMs);
  if (expired) return 'expired';
  return questIsComplete(config, progress) ? 'ready' : 'active';
}

// ────────────────────────────────────────────────────────────────────────────
// Очередь.
// ────────────────────────────────────────────────────────────────────────────
export type QueuePromotionDecision =
  | Readonly<{ action: 'keep_active'; questId: string }>
  | Readonly<{ action: 'expire_and_promote'; expireQuestId: string; promoteQuestId: string | null }>
  | Readonly<{ action: 'promote'; promoteQuestId: string }>
  | Readonly<{ action: 'idle' }>;

/**
 * Решение «что показывать сейчас»: живо ли активное задание, пора ли поднять
 * следующее из очереди.
 *
 * Кандидат — первый по (queueOrder, createdAtMs), у которого наступила
 * назначенная дата старта. Пустая дата = «как только освободится место».
 */
export function resolveQueuePromotion(input: Readonly<{
  active: QuestConfig | null;
  queued: readonly QuestConfig[];
  nowMs: number;
}>): QueuePromotionDecision {
  const { active, queued, nowMs } = input;
  const nextInQueue = [...queued]
    .filter((quest) => quest.status === 'queued')
    .filter((quest) => quest.scheduledStartMs <= 0 || quest.scheduledStartMs <= nowMs)
    .sort((a, b) => (a.queueOrder - b.queueOrder) || (a.createdAtMs - b.createdAtMs))[0] ?? null;

  if (active && active.status === 'active') {
    const stillLive = active.expiresAtMs <= 0 || active.expiresAtMs > nowMs;
    if (stillLive) return Object.freeze({ action: 'keep_active', questId: active.questId });
    return Object.freeze({
      action: 'expire_and_promote',
      expireQuestId: active.questId,
      promoteQuestId: nextInQueue?.questId ?? null,
    });
  }
  if (nextInQueue) return Object.freeze({ action: 'promote', promoteQuestId: nextInQueue.questId });
  return Object.freeze({ action: 'idle' });
}

/** Момент истечения задания при активации. */
export function questExpiryMs(config: QuestConfig, activatedAtMs: number): number {
  return activatedAtMs + config.durationHours * 60 * 60 * 1_000;
}

// ────────────────────────────────────────────────────────────────────────────
// Публичный снапшот для клиента.
// ────────────────────────────────────────────────────────────────────────────
export type PublicQuestSnapshot = Readonly<{
  questId: string;
  kind: QuestKind;
  target: number;
  unit: QuestTargetUnit;
  title: string;
  body: string;
  rewards: readonly QuestReward[];
  progress: number;
  phase: QuestPhase;
  expiresAtMs: number;
}>;

export function buildPublicQuestSnapshot(
  config: QuestConfig,
  progress: QuestProgressState,
  lang: string,
  nowMs: number,
): PublicQuestSnapshot {
  return Object.freeze({
    questId: config.questId,
    kind: config.kind,
    target: config.target,
    unit: QUEST_TARGET_UNIT[config.kind],
    title: resolveLocalized(config.title, lang),
    body: resolveLocalized(config.body, lang),
    rewards: config.rewards,
    progress: Math.min(config.target, questProgressValue(config, progress)),
    phase: resolveQuestPhase(config, progress, nowMs),
    expiresAtMs: config.expiresAtMs,
  });
}
