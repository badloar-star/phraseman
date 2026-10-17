/**
 * Договор документа `config/spire_v1` — единственная живая поверхность
 * настроек Шпиля (TOWER_CONTRACT.md §3, §7).
 *
 * зачем: владелец (T8, T35, T37) — таймер, монеты, высота и поведение ботов
 * меняются БЕЗ релиза через админку, как уже устроено у Арены
 * (arena_config_contract.ts). Этот модуль — тот же принцип, специально проще:
 * у Шпиля нет версий контентной публикации с хешами (пакет недели и его
 * готовность решает PM-272/PM-287 отдельно, через spire_packs в Storage, не
 * через этот конфиг), поэтому здесь только числа, которые оператор реально
 * должен уметь подвинуть.
 *
 * Чистый модуль: ни сети, ни Firestore, ни времени.
 *
 * СИНХРОНИЗАЦИЯ: клиентская копия — `modules/spire/config_contract.ts`.
 * `functions/tsconfig.json` ограничен `include: ["src"]`, поэтому сервер не
 * может импортировать общие модули из `modules/` (та же граница, что уже
 * держит Арену — сервер и клиент несут параллельные копии форм, а не один
 * файл). Правишь поле здесь — правь то же поле там же ходом, иначе клиент
 * посчитает бюджет ступени/монеты не так, как сервер их проверит.
 */

export const SPIRE_CONFIG_SCHEMA_VERSION = 'spire-v1-config.v1' as const;
export const SPIRE_CONFIG_DOC_ID = 'spire_v1' as const;
export const SPIRE_CONFIG_COLLECTION = 'config' as const;

/** Заданий в ступени. Число фиксировано в движке (SPIRE_STEP_TASK_COUNT), здесь не меняется. */
export const SPIRE_STEP_TASK_COUNT = 10 as const;

/** T10: ступеней в этаже — растёт 5 → 10, дальше по 10. */
export function spireStepsForFloor(floor: number): number {
  if (!Number.isFinite(floor) || floor < 1) return 5;
  return floor <= 5 ? 4 + floor : 10;
}

/** T32: этаж вершины. Дальше — «над облаками», те же правила, только за место. */
export const SPIRE_SUMMIT_FLOOR = 15 as const;

/** T34: каждый 5-й этаж — Страж (монеты ×2, смешанный набор режимов). */
export function spireIsGuardianFloor(floor: number): boolean {
  return Number.isInteger(floor) && floor > 0 && floor % 5 === 0;
}

export type SpireTaskTimerKind =
  | 'choice' | 'translate' | 'timeattack' | 'voice' | 'listen' | 'dictate' | 'match';

/** T3.4: бюджет ступени = сумма по типам заданий, не фиксированное число. */
export const SPIRE_TASK_TIMER_KINDS: readonly SpireTaskTimerKind[] = [
  'choice', 'translate', 'timeattack', 'voice', 'listen', 'dictate', 'match',
];

export type SpireTimerConfig = Readonly<{
  /** Мс на одно задание каждого вида — стартовый бюджет этажа 1. */
  baseMsByKind: Readonly<Record<SpireTaskTimerKind, number>>;
  /** T8: −4% бюджета за этаж. */
  perFloorDecay: number;
  /** T8: нижний предел ужатия — 65% стартового, дальше не падает. */
  floorMinRatio: number;
}>;

export type SpireCoinsConfig = Readonly<{
  /** T35: монеты за пройденную ступень. */
  perStep: number;
  /** T35: множитель на номер этажа (этаж N = perFloorPerLevel × N). */
  perFloorPerLevel: number;
  /** T34: множитель монет этажа-Стража поверх perFloorPerLevel × N. */
  guardianMultiplier: number;
  /** T35: бонус за вершину (этаж SPIRE_SUMMIT_FLOOR). */
  summitBonus: number;
  /** T35: место 1/2/3 недели. */
  weekPlace1: number;
  weekPlace2: number;
  weekPlace3: number;
  /** T35: бонус за повышение в следующий шпиль. */
  promotionBonus: number;
}>;

export type SpireResidentConfig = Readonly<{
  /** T25: боты не должны попадать в зону повышения/понижения. */
  targetZoneMarginSteps: number;
  /** Верхняя граница правдоподобных ступеней/час для одного жителя. */
  maxStepsPerHour: number;
}>;

export type SpireIntegrityConfig = Readonly<{
  /** §5 TOWER_CONTRACT: минимум мс на ступень — отсекает нереалистично быстрые отчёты. */
  minStepMs: number;
  /** §5 TOWER_CONTRACT: максимум ступеней в час на одного игрока. */
  maxStepsPerHour: number;
}>;

/**
 * Чем решается место в комнате, места 1–3, повышение и понижение (D162, OWNER_FINAL 10.10).
 * 'steps' — ступени Пика (как было до D162); 'coins' — монеты, заработанные за неделю во ВСЕХ режимах
 * (users.stars.weekEarned журнала монет). Рубильник ставит владелец своим словом; нет поля — 'steps'.
 */
export type SpireRankBy = 'steps' | 'coins';
/** Неделя, с которой 'coins' вообще действует: правило не меняется посреди начатой недели (координатор 13.10). */
export const SPIRE_RANK_BY_COINS_FROM_WEEK = '2026-W43';
/** Потолок монет недели при ранжировании — против накрутки суммы практики клиентом (PM-291). Замер 13.10: максимум честной недели ≈ 8 500. */
export const SPIRE_WEEK_COINS_CAP_DEFAULT = 20_000;

/**
 * D162: монеты недели бота — ТОЛЬКО для показа места в комнате (повышение/понижение и места 1–3 считаются по живым).
 * Бот «играет» лишь в Пике; множитель изображает, что живой игрок зарабатывает и в других режимах. Не деньги и не журнал.
 */
export const SPIRE_BOT_WEEK_COINS_PER_STEP = 30;
export function spireBotWeekCoins(steps: number): number {
  const n = Math.trunc(Number(steps));
  return Number.isFinite(n) && n > 0 ? n * SPIRE_BOT_WEEK_COINS_PER_STEP : 0;
}

export type SpireConfigDoc = Readonly<{
  schemaVersion: typeof SPIRE_CONFIG_SCHEMA_VERSION;
  enabled: boolean;
  timer: SpireTimerConfig;
  coins: SpireCoinsConfig;
  residents: SpireResidentConfig;
  integrity: SpireIntegrityConfig;
  /** D162: чем решается место в комнате; нет поля — 'steps'. */
  rankBy: SpireRankBy;
  /** D162: потолок монет недели участника при ранжировании по монетам. */
  weekCoinsCap: number;
}>;

/** Стартовые значения — ориентиры из TOWER.md §4.3/§4.6, редактируются в админке. */
export const SPIRE_CONFIG_DEFAULTS: SpireConfigDoc = Object.freeze({
  schemaVersion: SPIRE_CONFIG_SCHEMA_VERSION,
  enabled: false,
  timer: Object.freeze({
    baseMsByKind: Object.freeze({
      choice: 9_000,
      translate: 18_000,
      timeattack: 9_000,
      voice: 15_000,
      listen: 12_000,
      dictate: 15_000,
      match: 9_000,
    }),
    perFloorDecay: 0.04,
    floorMinRatio: 0.65,
  }),
  coins: Object.freeze({
    perStep: 10,
    perFloorPerLevel: 10,
    guardianMultiplier: 2,
    summitBonus: 200,
    weekPlace1: 300,
    weekPlace2: 200,
    weekPlace3: 150,
    promotionBonus: 100,
  }),
  residents: Object.freeze({
    targetZoneMarginSteps: 1,
    maxStepsPerHour: 6,
  }),
  integrity: Object.freeze({
    minStepMs: 45_000,
    maxStepsPerHour: 30,
  }),
  rankBy: 'steps',
  weekCoinsCap: SPIRE_WEEK_COINS_CAP_DEFAULT,
});

/** Разбор рубильника: только явное 'coins' включает монеты, всё остальное — 'steps' (безопасный дефолт). */
export function spireRankByOr(value: unknown): SpireRankBy {
  return value === 'coins' ? 'coins' : 'steps';
}

/**
 * Чем ранжировать комнату недели weekId: 'coins' только при рубильнике 'coins' И неделе не раньше
 * SPIRE_RANK_BY_COINS_FROM_WEEK (формат 'YYYY-Www' сравнивается как строка).
 */
export function spireEffectiveRankBy(config: Readonly<{ rankBy: SpireRankBy }>, weekId: string): SpireRankBy {
  return config.rankBy === 'coins' && String(weekId) >= SPIRE_RANK_BY_COINS_FROM_WEEK ? 'coins' : 'steps';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function positiveOr(value: unknown, fallback: number): number {
  const n = finiteOr(value, fallback);
  return n > 0 ? n : fallback;
}

function ratioOr(value: unknown, fallback: number): number {
  const n = finiteOr(value, fallback);
  return n > 0 && n <= 1 ? n : fallback;
}

function buildTimer(raw: unknown): SpireTimerConfig {
  const doc = isRecord(raw) ? raw : {};
  const rawByKind = isRecord(doc.baseMsByKind) ? doc.baseMsByKind : {};
  const baseMsByKind = {} as Record<SpireTaskTimerKind, number>;
  for (const kind of SPIRE_TASK_TIMER_KINDS) {
    baseMsByKind[kind] = positiveOr(rawByKind[kind], SPIRE_CONFIG_DEFAULTS.timer.baseMsByKind[kind]);
  }
  return {
    baseMsByKind,
    perFloorDecay: ratioOr(doc.perFloorDecay, SPIRE_CONFIG_DEFAULTS.timer.perFloorDecay),
    floorMinRatio: ratioOr(doc.floorMinRatio, SPIRE_CONFIG_DEFAULTS.timer.floorMinRatio),
  };
}

function buildCoins(raw: unknown): SpireCoinsConfig {
  const doc = isRecord(raw) ? raw : {};
  const d = SPIRE_CONFIG_DEFAULTS.coins;
  return {
    perStep: positiveOr(doc.perStep, d.perStep),
    perFloorPerLevel: positiveOr(doc.perFloorPerLevel, d.perFloorPerLevel),
    guardianMultiplier: positiveOr(doc.guardianMultiplier, d.guardianMultiplier),
    summitBonus: positiveOr(doc.summitBonus, d.summitBonus),
    weekPlace1: positiveOr(doc.weekPlace1, d.weekPlace1),
    weekPlace2: positiveOr(doc.weekPlace2, d.weekPlace2),
    weekPlace3: positiveOr(doc.weekPlace3, d.weekPlace3),
    promotionBonus: positiveOr(doc.promotionBonus, d.promotionBonus),
  };
}

function buildResidents(raw: unknown): SpireResidentConfig {
  const doc = isRecord(raw) ? raw : {};
  const d = SPIRE_CONFIG_DEFAULTS.residents;
  return {
    targetZoneMarginSteps: positiveOr(doc.targetZoneMarginSteps, d.targetZoneMarginSteps),
    maxStepsPerHour: positiveOr(doc.maxStepsPerHour, d.maxStepsPerHour),
  };
}

function buildIntegrity(raw: unknown): SpireIntegrityConfig {
  const doc = isRecord(raw) ? raw : {};
  const d = SPIRE_CONFIG_DEFAULTS.integrity;
  return {
    minStepMs: positiveOr(doc.minStepMs, d.minStepMs),
    maxStepsPerHour: positiveOr(doc.maxStepsPerHour, d.maxStepsPerHour),
  };
}

/**
 * Собирает документ целиком из ввода оператора — как arenaBuildConfigDoc:
 * частичная запись оставляла бы документ, которого никто не видел целиком.
 * Каждое поле fail-safe на дефолт при мусоре на входе, а не на 0/NaN — иначе
 * опечатка в одном поле обнулила бы таймер или награды для всех игроков.
 */
export function spireBuildConfigDoc(input: Readonly<{
  enabled?: boolean;
  timer?: unknown;
  coins?: unknown;
  residents?: unknown;
  integrity?: unknown;
  rankBy?: unknown;
  weekCoinsCap?: unknown;
}>): SpireConfigDoc {
  return {
    schemaVersion: SPIRE_CONFIG_SCHEMA_VERSION,
    enabled: input.enabled === true,
    timer: buildTimer(input.timer),
    coins: buildCoins(input.coins),
    residents: buildResidents(input.residents),
    integrity: buildIntegrity(input.integrity),
    rankBy: spireRankByOr(input.rankBy),
    weekCoinsCap: positiveOr(input.weekCoinsCap, SPIRE_CONFIG_DEFAULTS.weekCoinsCap),
  };
}

export type SpireConfigStatus = Readonly<{
  exists: boolean;
  valid: boolean;
  liveForPlayers: boolean;
  config: SpireConfigDoc;
}>;

/** Что показать администратору. Документа нет → честный дефолт, не падение. */
export function spireConfigStatus(raw: unknown): SpireConfigStatus {
  const exists = isRecord(raw) && Object.keys(raw).length > 0;
  const doc = isRecord(raw) ? raw : {};
  const valid = !exists || doc.schemaVersion === SPIRE_CONFIG_SCHEMA_VERSION;
  const config = spireBuildConfigDoc(exists ? doc : SPIRE_CONFIG_DEFAULTS);
  return {
    exists,
    valid,
    liveForPlayers: exists && valid && config.enabled,
    config,
  };
}

// ── Шкала времени ступени (владелец 17.10; аудит docs/work/tasks/spire-timing-audit-2026-10-17.md, вариант (б)) ──
// зачем: копия modules/spire/step_budget_scale.ts — клиент и сервер считают бюджет одинаково (сторож tests/spire_time_scale.test.ts
// сверяет числа). Сервер пока бюджет не проверяет (durationMs только пишется) — копия уезжает с выкладкой 18.10 заранее.
// Жёстко только 12-я лига и 15-й этаж, ниже — щедро. Запись в прод config/spire_v1 не делается.
export const SPIRE_COMFORT_BASE_MS: Readonly<Record<SpireTaskTimerKind, number>> = Object.freeze({
  choice: 11_000,
  translate: 20_000,
  match: 20_000,
  timeattack: 20_000,
  listen: 14_000,
  dictate: 20_000,
  voice: 18_000,
});

export const SPIRE_LEAGUE_TIME_MULTIPLIER: readonly number[] = Object.freeze([1.8, 1.77, 1.74, 1.71, 1.68, 1.64, 1.6, 1.55, 1.48, 1.4, 1.3, 1.0]);

export function spireLeagueTimeMultiplier(tier: number): number {
  const i = Number.isFinite(tier) ? Math.max(0, Math.min(SPIRE_LEAGUE_TIME_MULTIPLIER.length - 1, Math.trunc(tier))) : 0;
  return SPIRE_LEAGUE_TIME_MULTIPLIER[i] ?? 1;
}

export function spireFloorTimeFactor(floor: number): number {
  const f = Number.isFinite(floor) ? Math.trunc(floor) : 1;
  if (f >= 15) return 0.85;
  if (f <= 1) return 1;
  return 1 - (0.1 * (f - 1)) / 13;
}

export function spireTaskBudgetMs(kind: SpireTaskTimerKind, tier: number, floor: number): number {
  return Math.round((SPIRE_COMFORT_BASE_MS[kind] ?? SPIRE_COMFORT_BASE_MS.choice) * spireLeagueTimeMultiplier(tier) * spireFloorTimeFactor(floor));
}

export function spireScaledStepBudgetMs(tier: number, floor: number, kinds: readonly SpireTaskTimerKind[]): number {
  return kinds.reduce((sum, kind) => sum + spireTaskBudgetMs(kind, tier, floor), 0);
}
