// ════════════════════════════════════════════════════════════════════════════
// shard_survey_core.ts — чистое ядро опросов за осколки (без firebase-admin).
//
// Здесь только чистые функции: парсинг конфига опроса, валидация ответов,
// таргетинг аудитории, инкремент агрегата. Юнит-тесты тривиальны (нет Firestore).
// Callable-обёртка и транзакции — в shard_survey.ts (по образцу пары
// arena_season.ts / arena_season_config.ts).
// ════════════════════════════════════════════════════════════════════════════

export const SUPPORTED_SURVEY_LANGS = [
  'ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
] as const;
export type SurveyLang = (typeof SUPPORTED_SURVEY_LANGS)[number];

/** Локализованная строка. Минимум обязателен `ru` (fallback-язык проекта). */
export type LocalizedString = { ru: string } & Partial<Record<SurveyLang, string>>;

export type SurveyQuestionType = 'single_choice' | 'text';

export type SurveyOption = {
  id: string;
  label: LocalizedString;
};

export type SurveyQuestion = {
  id: string;
  type: SurveyQuestionType;
  text: LocalizedString;
  options: SurveyOption[]; // пусто для type 'text'
};

export type SurveyTier = 'free' | 'premium' | 'any';
export type SurveyPlatform = 'ios' | 'android';

export type SurveyAudience = {
  tier: SurveyTier;
  minLessons: number | null;
  maxLessons: number | null;
  platforms: SurveyPlatform[]; // пусто = любые
};

export type ShardSurveyConfig = {
  surveyId: string;
  enabled: boolean;
  title: LocalizedString;
  subtitle: LocalizedString;
  rewardShards: number;
  minDaysBetweenSurveys: number;
  audience: SurveyAudience;
  questions: SurveyQuestion[];
  createdAtMs: number;
  updatedAtMs: number;
  updatedBy: string;
};

export type SurveyAnswer = {
  optionId: string; // для text-вопроса = 'comment'
  comment?: string;
};

export const SURVEY_ID_RE = /^[a-z0-9_]+$/;
export const REWARD_SHARDS_MIN = 1;
export const REWARD_SHARDS_MAX = 20;
export const DEFAULT_MIN_DAYS_BETWEEN_SURVEYS = 7;
// Пол анти-спама: даже если админ поставит 0, сервер держит минимум 1 день между
// опросами. Иначе опрос с cooldown=0 обходит глобальную метку shard_survey_last_at_ms
// и юзер проходит цепочку опросов подряд, фармя осколки (аудит 2026-07-05).
export const MIN_DAYS_BETWEEN_SURVEYS_FLOOR = 1;
const TEXT_ANSWER_MAX = 500;
const OPTION_ID_MAX = 40;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function toBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function toInt(value: unknown, fallback: number): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

/** Парс локализованной строки. Требует непустой `ru`; иначе null. */
export function parseLocalizedString(value: unknown): LocalizedString | null {
  const raw = asRecord(value);
  const ru = text(raw.ru, 300);
  if (!ru) return null;
  const out: LocalizedString = { ru };
  for (const lang of SUPPORTED_SURVEY_LANGS) {
    if (lang === 'ru') continue;
    const v = text(raw[lang], 300);
    if (v) (out as Record<string, string>)[lang] = v;
  }
  return out;
}

/** Разрешить локализованную строку в конкретный язык с fallback на ru. */
export function resolveLocalized(str: LocalizedString, lang: string): string {
  const key = lang as SurveyLang;
  return (str as Record<string, string>)[key] || str.ru;
}

function parseAudience(value: unknown): SurveyAudience {
  const raw = asRecord(value);
  const tierRaw = text(raw.tier, 20);
  const tier: SurveyTier =
    tierRaw === 'free' || tierRaw === 'premium' ? tierRaw : 'any';
  const minLessons =
    raw.minLessons == null ? null : Math.max(0, toInt(raw.minLessons, 0));
  const maxLessons =
    raw.maxLessons == null ? null : Math.max(0, toInt(raw.maxLessons, 0));
  const platformsRaw = Array.isArray(raw.platforms) ? raw.platforms : [];
  const platforms = platformsRaw
    .map((p) => text(p, 10))
    .filter((p): p is SurveyPlatform => p === 'ios' || p === 'android');
  return { tier, minLessons, maxLessons, platforms };
}

function parseQuestion(value: unknown): SurveyQuestion | null {
  const raw = asRecord(value);
  const id = text(raw.id, 60).replace(/[^a-z0-9_]/gi, '_');
  if (!id) return null;
  const type: SurveyQuestionType = raw.type === 'text' ? 'text' : 'single_choice';
  const qText = parseLocalizedString(raw.text);
  if (!qText) return null;

  if (type === 'text') {
    return { id, type, text: qText, options: [] };
  }

  const optionsRaw = Array.isArray(raw.options) ? raw.options : [];
  const options: SurveyOption[] = [];
  for (const o of optionsRaw) {
    const or = asRecord(o);
    const oid = text(or.id, OPTION_ID_MAX).replace(/[^a-z0-9_]/gi, '_');
    const label = parseLocalizedString(or.label);
    if (oid && label) options.push({ id: oid, label });
  }
  if (options.length < 2) return null; // single_choice требует ≥2 вариантов
  return { id, type, text: qText, options };
}

/**
 * Парс конфига опроса из Firestore-документа. Возвращает null, если документ
 * структурно невалиден (нет id, нет вопросов, битые локали). НИКОГДА не бросает.
 */
export function parseSurveyConfig(value: unknown): ShardSurveyConfig | null {
  const raw = asRecord(value);
  const surveyId = text(raw.surveyId, 80);
  if (!SURVEY_ID_RE.test(surveyId)) return null;

  const title = parseLocalizedString(raw.title);
  const subtitle = parseLocalizedString(raw.subtitle) ?? { ru: '' };
  if (!title) return null;

  const questionsRaw = Array.isArray(raw.questions) ? raw.questions : [];
  const questions: SurveyQuestion[] = [];
  for (const q of questionsRaw) {
    const parsed = parseQuestion(q);
    if (parsed) questions.push(parsed);
  }
  if (questions.length === 0) return null;
  // Дубликаты id вопросов недопустимы.
  const ids = new Set(questions.map((q) => q.id));
  if (ids.size !== questions.length) return null;

  const rewardShards = Math.min(
    REWARD_SHARDS_MAX,
    Math.max(REWARD_SHARDS_MIN, toInt(raw.rewardShards, 3)),
  );
  const minDaysBetweenSurveys = Math.max(
    MIN_DAYS_BETWEEN_SURVEYS_FLOOR,
    toInt(raw.minDaysBetweenSurveys, DEFAULT_MIN_DAYS_BETWEEN_SURVEYS),
  );

  return {
    surveyId,
    enabled: toBool(raw.enabled),
    title,
    subtitle,
    rewardShards,
    minDaysBetweenSurveys,
    audience: parseAudience(raw.audience),
    questions,
    createdAtMs: toInt(raw.createdAtMs, 0),
    updatedAtMs: toInt(raw.updatedAtMs, 0),
    updatedBy: text(raw.updatedBy, 80),
  };
}

export type ValidateAnswersResult =
  | { ok: true; answers: Record<string, SurveyAnswer> }
  | { ok: false; error: string };

/**
 * Валидация ответов пользователя по вопросам ЭТОГО опроса.
 * - single_choice: optionId обязан быть из списка options; comment опционален.
 * - text: обязателен непустой comment (≤500), optionId := 'comment'.
 * Лишние ключи в input игнорируются; порядок задают вопросы конфига.
 */
export function validateAnswers(
  questions: SurveyQuestion[],
  input: unknown,
): ValidateAnswersResult {
  const raw = asRecord(input);
  if (Object.keys(raw).length === 0 && questions.length > 0) {
    return { ok: false, error: 'answers_required' };
  }
  const out: Record<string, SurveyAnswer> = {};

  for (const question of questions) {
    const row = asRecord(raw[question.id]);
    const comment = text(row.comment, TEXT_ANSWER_MAX);

    if (question.type === 'text') {
      if (!comment) return { ok: false, error: `comment_required:${question.id}` };
      out[question.id] = { optionId: 'comment', comment };
      continue;
    }

    const optionId = text(row.optionId, OPTION_ID_MAX);
    const allowed = question.options.some((o) => o.id === optionId);
    if (!allowed) return { ok: false, error: `invalid_option:${question.id}` };
    out[question.id] = comment ? { optionId, comment } : { optionId };
  }

  return { ok: true, answers: out };
}

export type TargetingContext = {
  isPremium: boolean;
  lessonsCompleted: number;
  platform: string;
};

/** Проходит ли пользователь по аудитории опроса. */
export function matchesAudience(
  audience: SurveyAudience,
  ctx: TargetingContext,
): boolean {
  if (audience.tier === 'free' && ctx.isPremium) return false;
  if (audience.tier === 'premium' && !ctx.isPremium) return false;
  if (audience.minLessons != null && ctx.lessonsCompleted < audience.minLessons) return false;
  if (audience.maxLessons != null && ctx.lessonsCompleted > audience.maxLessons) return false;
  if (audience.platforms.length > 0) {
    const p = ctx.platform === 'ios' || ctx.platform === 'android' ? ctx.platform : '';
    if (!p || !audience.platforms.includes(p)) return false;
  }
  return true;
}

/** Прошёл ли достаточно дней с прошлого показанного/пройденного опроса. */
export function passesCooldown(
  lastSurveyAtMs: number,
  minDaysBetweenSurveys: number,
  nowMs: number,
): boolean {
  if (lastSurveyAtMs <= 0 || minDaysBetweenSurveys <= 0) return true;
  const elapsedDays = (nowMs - lastSurveyAtMs) / (24 * 60 * 60 * 1000);
  return elapsedDays >= minDaysBetweenSurveys;
}

/**
 * Инкремент агрегата для сводки в админке. Чистая функция: принимает текущий
 * агрегат и ответы, возвращает новый (иммутабельно). text-вопросы не разбиваются
 * по вариантам (считаем только количество через optionId 'comment').
 */
export type SurveyStats = {
  totalResponses: number;
  perQuestion: Record<string, Record<string, number>>;
  lastResponseAtMs: number;
};

export function incrementStats(
  prev: Partial<SurveyStats> | undefined,
  answers: Record<string, SurveyAnswer>,
  nowMs: number,
): SurveyStats {
  const base: SurveyStats = {
    totalResponses: toInt(prev?.totalResponses, 0),
    perQuestion: {},
    lastResponseAtMs: toInt(prev?.lastResponseAtMs, 0),
  };
  // Глубокая копия prev.perQuestion (иммутабельность).
  const prevPer = (prev?.perQuestion ?? {}) as Record<string, Record<string, number>>;
  for (const [qid, opts] of Object.entries(prevPer)) {
    base.perQuestion[qid] = { ...opts };
  }

  for (const [qid, answer] of Object.entries(answers)) {
    const optionId = answer.optionId || 'unknown';
    if (!base.perQuestion[qid]) base.perQuestion[qid] = {};
    base.perQuestion[qid][optionId] = toInt(base.perQuestion[qid][optionId], 0) + 1;
  }

  return {
    totalResponses: base.totalResponses + 1,
    perQuestion: base.perQuestion,
    lastResponseAtMs: nowMs,
  };
}

/** Валидация конфига перед записью из админки. Возвращает список ошибок. */
export function validateSurveyConfigForWrite(value: unknown): string[] {
  const errors: string[] = [];
  const raw = asRecord(value);
  const surveyId = text(raw.surveyId, 80);
  if (!SURVEY_ID_RE.test(surveyId)) errors.push('surveyId_invalid');

  if (!parseLocalizedString(raw.title)) errors.push('title_ru_required');

  const reward = toInt(raw.rewardShards, 3);
  if (reward < REWARD_SHARDS_MIN || reward > REWARD_SHARDS_MAX) {
    errors.push('reward_out_of_range');
  }

  const questionsRaw = Array.isArray(raw.questions) ? raw.questions : [];
  if (questionsRaw.length === 0) errors.push('questions_required');
  const seenIds = new Set<string>();
  for (const q of questionsRaw) {
    const qr = asRecord(q);
    const qid = text(qr.id, 60);
    if (!qid) errors.push('question_id_required');
    if (qid && seenIds.has(qid)) errors.push(`question_id_duplicate:${qid}`);
    seenIds.add(qid);
    if (!parseLocalizedString(qr.text)) errors.push(`question_text_ru_required:${qid || '?'}`);
    const type = qr.type === 'text' ? 'text' : 'single_choice';
    const opts = Array.isArray(qr.options) ? qr.options : [];
    if (type === 'single_choice' && opts.length < 2) {
      errors.push(`question_needs_2_options:${qid || '?'}`);
    }
    if (type === 'text' && opts.length > 0) {
      errors.push(`text_question_no_options:${qid || '?'}`);
    }
  }

  return errors;
}
