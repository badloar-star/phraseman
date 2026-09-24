/**
 * Клиентская копия договора `config/spire_v1` (PM-283).
 *
 * зачем: `functions/src/spire_config_contract.ts` — серверный пакет (Node,
 * собственный tsconfig), `app/` его не импортирует напрямую — ни один файл в
 * проекте так не делает (Арена для этого держит `modules/arena/` — общую
 * папку с чистыми модулями без Firebase, откуда читают и клиент, и сервер
 * читает то же поведение своими копиями). Этот файл — тот же приём для
 * Шпиля: только типы и дефолты, ни сети, ни Firestore. Форма ОБЯЗАНА
 * совпадать с серверной версией до последнего поля — расхождение означает,
 * что клиент посчитает таймер/монеты не так, как сервер это проверит
 * (см. integrity в TOWER_CONTRACT.md §5).
 */

export const SPIRE_CONFIG_SCHEMA_VERSION = 'spire-v1-config.v1' as const;
export const SPIRE_CONFIG_DOC_ID = 'spire_v1' as const;
export const SPIRE_CONFIG_COLLECTION = 'config' as const;

export type SpireTaskTimerKind =
  | 'choice' | 'translate' | 'timeattack' | 'voice' | 'listen' | 'dictate' | 'match';

export const SPIRE_TASK_TIMER_KINDS: readonly SpireTaskTimerKind[] = [
  'choice', 'translate', 'timeattack', 'voice', 'listen', 'dictate', 'match',
];

export type SpireTimerConfig = Readonly<{
  baseMsByKind: Readonly<Record<SpireTaskTimerKind, number>>;
  perFloorDecay: number;
  floorMinRatio: number;
}>;

export type SpireCoinsConfig = Readonly<{
  perStep: number;
  perFloorPerLevel: number;
  guardianMultiplier: number;
  summitBonus: number;
  weekPlace1: number;
  weekPlace2: number;
  weekPlace3: number;
  promotionBonus: number;
}>;

export type SpireResidentConfig = Readonly<{
  targetZoneMarginSteps: number;
  maxStepsPerHour: number;
}>;

export type SpireIntegrityConfig = Readonly<{
  minStepMs: number;
  maxStepsPerHour: number;
}>;

export type SpireConfigDoc = Readonly<{
  schemaVersion: typeof SPIRE_CONFIG_SCHEMA_VERSION;
  enabled: boolean;
  timer: SpireTimerConfig;
  coins: SpireCoinsConfig;
  residents: SpireResidentConfig;
  integrity: SpireIntegrityConfig;
}>;

/** Синхронизировано вручную с SPIRE_CONFIG_DEFAULTS в functions/src/spire_config_contract.ts. */
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
});

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

/**
 * Собирает конфиг из сырого документа Firestore, с fail-safe дефолтами на
 * каждое поле — мусор в одном поле не должен обнулить таймер или награды.
 * Используется клиентом при чтении config/spire_v1 (spire_config_client.ts);
 * запись документа делает только сервер (admin_spire_config.ts).
 */
export function parseSpireConfigDoc(raw: unknown): SpireConfigDoc {
  const doc = isRecord(raw) ? raw : {};
  const d = SPIRE_CONFIG_DEFAULTS;

  const rawTimer = isRecord(doc.timer) ? doc.timer : {};
  const rawByKind = isRecord(rawTimer.baseMsByKind) ? rawTimer.baseMsByKind : {};
  const baseMsByKind = {} as Record<SpireTaskTimerKind, number>;
  for (const kind of SPIRE_TASK_TIMER_KINDS) {
    baseMsByKind[kind] = positiveOr(rawByKind[kind], d.timer.baseMsByKind[kind]);
  }
  const timer: SpireTimerConfig = {
    baseMsByKind,
    perFloorDecay: ratioOr(rawTimer.perFloorDecay, d.timer.perFloorDecay),
    floorMinRatio: ratioOr(rawTimer.floorMinRatio, d.timer.floorMinRatio),
  };

  const rawCoins = isRecord(doc.coins) ? doc.coins : {};
  const coins: SpireCoinsConfig = {
    perStep: positiveOr(rawCoins.perStep, d.coins.perStep),
    perFloorPerLevel: positiveOr(rawCoins.perFloorPerLevel, d.coins.perFloorPerLevel),
    guardianMultiplier: positiveOr(rawCoins.guardianMultiplier, d.coins.guardianMultiplier),
    summitBonus: positiveOr(rawCoins.summitBonus, d.coins.summitBonus),
    weekPlace1: positiveOr(rawCoins.weekPlace1, d.coins.weekPlace1),
    weekPlace2: positiveOr(rawCoins.weekPlace2, d.coins.weekPlace2),
    weekPlace3: positiveOr(rawCoins.weekPlace3, d.coins.weekPlace3),
    promotionBonus: positiveOr(rawCoins.promotionBonus, d.coins.promotionBonus),
  };

  const rawResidents = isRecord(doc.residents) ? doc.residents : {};
  const residents: SpireResidentConfig = {
    targetZoneMarginSteps: positiveOr(rawResidents.targetZoneMarginSteps, d.residents.targetZoneMarginSteps),
    maxStepsPerHour: positiveOr(rawResidents.maxStepsPerHour, d.residents.maxStepsPerHour),
  };

  const rawIntegrity = isRecord(doc.integrity) ? doc.integrity : {};
  const integrity: SpireIntegrityConfig = {
    minStepMs: positiveOr(rawIntegrity.minStepMs, d.integrity.minStepMs),
    maxStepsPerHour: positiveOr(rawIntegrity.maxStepsPerHour, d.integrity.maxStepsPerHour),
  };

  return {
    schemaVersion: SPIRE_CONFIG_SCHEMA_VERSION,
    enabled: doc.enabled === true,
    timer,
    coins,
    residents,
    integrity,
  };
}

export type SpireConfigStatus = Readonly<{
  exists: boolean;
  valid: boolean;
  liveForPlayers: boolean;
  config: SpireConfigDoc;
}>;

export function spireConfigStatus(raw: unknown): SpireConfigStatus {
  const exists = isRecord(raw) && Object.keys(raw).length > 0;
  const doc = isRecord(raw) ? raw : {};
  const valid = !exists || doc.schemaVersion === SPIRE_CONFIG_SCHEMA_VERSION;
  const config = parseSpireConfigDoc(exists ? doc : SPIRE_CONFIG_DEFAULTS);
  return {
    exists,
    valid,
    liveForPlayers: exists && valid && config.enabled,
    config,
  };
}

/** Бюджет ступени для этажа: сумма baseMsByKind по фактическим типам заданий в наборе, ужатая по T8. */
export function spireStepBudgetMs(
  timer: SpireTimerConfig,
  floor: number,
  taskKinds: readonly SpireTaskTimerKind[],
): number {
  const base = taskKinds.reduce((sum, kind) => sum + (timer.baseMsByKind[kind] ?? 0), 0);
  const decay = Math.max(timer.floorMinRatio, 1 - timer.perFloorDecay * Math.max(0, floor - 1));
  return Math.round(base * decay);
}
