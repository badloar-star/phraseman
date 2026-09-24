// ═══════════════════════════════════════════════════════════════════════════
// spire_league_migration_contract.ts — ЧИСТАЯ логика одноразового переноса
// мест лиги в шпили-камни (PM-278, T16, T29, TOWER.md §4.8).
//
// Здесь нет Firestore, сети и часов: всё, что решает судьбу места игрока,
// проверяется тестом без эмулятора (spire_league_migration_contract.test.ts).
// Обёртка с транзакцией — spire_league_migration.ts.
//
// зачем (владелец 2026-09-24): «12 ступеней лиги → 12 шпилей, заработанные
// места сохраняются» (T16). Лига одна на человека (не по языкам), а Шпиль —
// свой на каждый изучаемый язык (T15). Поэтому место лиги уходит в шпиль
// ТЕКУЩЕГО языка, остальные языки начинают с Гранита (§4.8, рекомендация О1 —
// окончательное «да» владельца не записано, см. evidence/PM-278).
//
// Главные свойства (их и стережёт тест):
//   1. Прямое соответствие индекса: Медная=0 → Гранит=0 … Высшая=11 → Алмаз=11.
//      Никаких «сжатий»: 12 ступеней = 12 шпилей.
//   2. Миграция АДДИТИВНА: поля лиги (leagueId, groupId, league_groups,
//      league_state_v3) не трогаются. Откат = снять spireTiers/spireMigration,
//      Лига продолжает жить как жила.
//   3. Уже записанный шпиль (итог недели PM-276, ручная правка) никогда не
//      перезаписывается и не понижается миграцией.
//   4. Если итог прошлой недели лиги ещё не подведён (окно после полуночи
//      понедельника) — НЕ мигрируем устаревшее место, а просим повторить
//      позже (как resolveAuthoritativeLeagueId в league_groups.ts).
// ═══════════════════════════════════════════════════════════════════════════

import { ARENA_STUDY_TARGETS, type ArenaStudyTarget } from './arena_target_registry';

export const SPIRE_LEAGUE_MIGRATION_SCHEMA = 'spire-league-migration-v1' as const;
/** Резервная копия «как было до переноса» — только сервер, клиенту закрыто правилами. */
export const SPIRE_LEAGUE_MIGRATION_BACKUP_COLLECTION = 'spire_league_migration' as const;
/** Выключатель миграции: config/spire_league_migration_v1 {mode:'on'|'paused'}. */
export const SPIRE_LEAGUE_MIGRATION_SWITCH_DOC = 'spire_league_migration_v1' as const;

/** 12 ступеней лиги (CLUBS в app/league_engine.ts, MAX_LEAGUE_ID=11 на сервере). */
export const LEAGUE_TIER_COUNT = 12;
/** 12 шпилей-камней (T29). Равенство с LEAGUE_TIER_COUNT — условие «без потерь». */
export const SPIRE_TIER_COUNT = 12;
/** То же окно, что LEAGUE_FINALIZATION_GRACE_MS в league_groups.ts (15 мин). */
export const LEAGUE_FINALIZATION_GRACE_MS = 15 * 60 * 1000;
/** Предохранитель: сырой league_state_v3 в резервной копии не длиннее этого. */
const RAW_BACKUP_MAX = 4000;

export type SpireMigrationMode = 'on' | 'paused';

export function spireMigrationModeFrom(raw: unknown): SpireMigrationMode {
  // зачем: нет документа = 'on'. Шпиль ещё не выпущен, а «выключено по
  // умолчанию» на запуске означало бы, что все войдут в Гранит и места лиги
  // пропадут на первую неделю. Пауза — явное действие владельца.
  const mode = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).mode : undefined;
  return mode === 'paused' ? 'paused' : 'on';
}

type TierMapping = Readonly<{ tier: number; clamped: boolean }>;

/**
 * Прямое соответствие leagueId → tier. null — значение не число (источник
 * пуст/битый, решает вызывающий). clamped=true — число было вне 0..11 и
 * прижато к краю (такое значение пишется в запись миграции для разбора).
 */
export function leagueIdToSpireTier(leagueId: unknown): TierMapping | null {
  if (leagueId === null || leagueId === undefined || leagueId === '') return null;
  const n = Number(leagueId);
  if (!Number.isFinite(n)) return null;
  const whole = Math.trunc(n);
  const tier = Math.max(0, Math.min(SPIRE_TIER_COUNT - 1, whole));
  return { tier, clamped: tier !== n };
}

/** Обратное соответствие — для отката и для сверки в админке. */
export function spireTierToLeagueId(tier: number): number {
  return Math.max(0, Math.min(LEAGUE_TIER_COUNT - 1, Math.trunc(tier) || 0));
}

export type LeagueSourceInput = Readonly<{
  /** leaderboard/{uid} — пишет только сервер (правила: create/update isAdmin). */
  leaderboard: Readonly<Record<string, unknown>> | undefined;
  /** users/{uid}/league_week_results/{previousWeekId}, если есть. */
  previousWeekResult: Readonly<Record<string, unknown>> | undefined;
  /** users/{uid}.progress.league_state_v3 (JSON-строка, синкается клиентом). */
  progressLeagueStateRaw: unknown;
  currentWeekId: string;
  previousWeekId: string;
  nowMs: number;
}>;

export type LeagueSource =
  | 'leaderboard_current_week'
  | 'leaderboard_plus_last_result'
  | 'leaderboard'
  | 'progress_fallback'
  | 'none';

export type LeagueSourceResolution =
  | Readonly<{
    ok: true;
    leagueId: number;
    source: LeagueSource;
    clamped: boolean;
    /** Расхождения источников — пишутся в запись миграции, решение не меняют. */
    conflicts: readonly string[];
  }>
  | Readonly<{ ok: false; reason: 'league_finalization_pending' }>;

function text(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function mondayStartMs(nowMs: number): number {
  const now = new Date(nowMs);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
}

export function parseProgressLeagueId(raw: unknown): number | null {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return null;
    const mapped = leagueIdToSpireTier((parsed as Record<string, unknown>).leagueId);
    return mapped ? mapped.tier : null;
  } catch {
    // Битый JSON — не источник. Вызывающий залогирует conflict.
    return null;
  }
}

/**
 * Какое место лиги у человека СЕЙЧАС. Порядок доверия:
 *   1) leaderboard.leagueId + итог прошлой недели, если он подведён и
 *      согласован (та же проверка, что resolveAuthoritativeLeagueId лиги);
 *   2) leaderboard.leagueId как есть;
 *   3) progress.league_state_v3 — ТОЛЬКО если в leaderboard поля нет вовсе.
 *      зачем: progress синкает клиент, это самый слабый источник, но у
 *      человека без строки в leaderboard другого следа лиги нет, а «потерять
 *      место» хуже. Так же поступал бэкфилл sync_leaderboard.ts.
 *   4) ничего нет — Гранит (человек в лиге не играл).
 */
export function resolveLeagueSource(input: LeagueSourceInput): LeagueSourceResolution {
  const conflicts: string[] = [];
  const lb = input.leaderboard;
  const lbMapped = leagueIdToSpireTier(lb?.leagueId);
  const progressLeagueId = parseProgressLeagueId(input.progressLeagueStateRaw);
  if (input.progressLeagueStateRaw !== undefined && input.progressLeagueStateRaw !== null && progressLeagueId === null) {
    conflicts.push('progress_league_state_unreadable');
  }

  if (!lbMapped) {
    if (progressLeagueId !== null) {
      return { ok: true, leagueId: progressLeagueId, source: 'progress_fallback', clamped: false, conflicts: [...conflicts, 'leaderboard_league_missing'] };
    }
    return { ok: true, leagueId: 0, source: 'none', clamped: false, conflicts };
  }

  const lbLeagueId = lbMapped.tier;
  if (lbMapped.clamped) conflicts.push(`leaderboard_league_clamped:${String(lb?.leagueId)}`);
  if (progressLeagueId !== null && progressLeagueId !== lbLeagueId) {
    conflicts.push(`progress_differs:${progressLeagueId}`);
  }

  const groupWeekId = text(lb?.groupWeekId, 16);
  if (groupWeekId === input.currentWeekId) {
    // Уже вошёл в комнату лиги этой недели — leagueId уже учёл прошлый итог.
    return { ok: true, leagueId: lbLeagueId, source: 'leaderboard_current_week', clamped: lbMapped.clamped, conflicts };
  }

  const monday = mondayStartMs(input.nowMs);
  const finalizationPending = groupWeekId === input.previousWeekId
    && input.nowMs >= monday
    && input.nowMs - monday < LEAGUE_FINALIZATION_GRACE_MS;

  const result = input.previousWeekResult;
  if (!result) {
    if (finalizationPending) return { ok: false, reason: 'league_finalization_pending' };
    return { ok: true, leagueId: lbLeagueId, source: 'leaderboard', clamped: lbMapped.clamped, conflicts };
  }

  const prev = leagueIdToSpireTier(result.prevLeagueId)?.tier ?? lbLeagueId;
  const next = leagueIdToSpireTier(result.newLeagueId)?.tier ?? prev;
  const resultGroupId = text(result.groupId, 180);
  const lbGroupId = text(lb?.groupId, 180);
  const valid = prev === lbLeagueId
    && Math.abs(next - prev) <= 1
    && (!lbGroupId || !resultGroupId || resultGroupId === lbGroupId);
  if (!valid) {
    if (finalizationPending) return { ok: false, reason: 'league_finalization_pending' };
    conflicts.push(`last_result_inconsistent:${prev}->${next}`);
    return { ok: true, leagueId: lbLeagueId, source: 'leaderboard', clamped: lbMapped.clamped, conflicts };
  }
  return { ok: true, leagueId: next, source: 'leaderboard_plus_last_result', clamped: lbMapped.clamped, conflicts };
}

export type SpireTiers = Readonly<Partial<Record<ArenaStudyTarget, number>>>;

export function readSpireTiers(leaderboard: Readonly<Record<string, unknown>> | undefined): SpireTiers {
  const raw = leaderboard?.spireTiers;
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<ArenaStudyTarget, number>> = {};
  for (const lang of ARENA_STUDY_TARGETS) {
    const mapped = leagueIdToSpireTier((raw as Record<string, unknown>)[lang]);
    if (mapped) out[lang] = mapped.tier;
  }
  return out;
}

export type SpireTierPlan = Readonly<{
  /** Полная карта шпилей после переноса — пишется в leaderboard.spireTiers. */
  tiers: Readonly<Record<ArenaStudyTarget, number>>;
  /** Языки, где уже был шпиль и миграция его НЕ трогала. */
  kept: readonly ArenaStudyTarget[];
}>;

/**
 * Карта шпилей по языкам: текущий язык получает место лиги, остальные —
 * Гранит (0). Уже записанное значение сохраняется как есть (свойство 3).
 */
export function buildSpireTierPlan(
  currentLang: ArenaStudyTarget,
  leagueId: number,
  existing: SpireTiers,
): SpireTierPlan {
  const migratedTier = leagueIdToSpireTier(leagueId)?.tier ?? 0;
  const tiers = {} as Record<ArenaStudyTarget, number>;
  const kept: ArenaStudyTarget[] = [];
  for (const lang of ARENA_STUDY_TARGETS) {
    const prior = existing[lang];
    if (prior !== undefined) {
      tiers[lang] = prior;
      kept.push(lang);
      continue;
    }
    tiers[lang] = lang === currentLang ? migratedTier : 0;
  }
  return { tiers, kept };
}

/** Публичная отметка в leaderboard (его читают все вошедшие — только цифры, без progress). */
export type SpireMigrationMarker = Readonly<{
  schema: typeof SPIRE_LEAGUE_MIGRATION_SCHEMA;
  migratedAtMs: number;
  lang: ArenaStudyTarget;
  tier: number;
  sourceLeagueId: number;
  source: LeagueSource;
}>;

/** Резервная копия (закрыта от клиента) — всё, что нужно для отката и разбора. */
export type SpireMigrationBackup = Readonly<{
  schema: typeof SPIRE_LEAGUE_MIGRATION_SCHEMA;
  uid: string;
  migratedAtMs: number;
  currentLang: ArenaStudyTarget;
  /** Откуда взят язык: 'client_current' — прислал клиент, 'room_lang' — язык входа в Шпиль. */
  currentLangSource: 'client_current' | 'room_lang';
  sourceLeagueId: number;
  source: LeagueSource;
  clamped: boolean;
  conflicts: readonly string[];
  tiersAfter: Readonly<Record<ArenaStudyTarget, number>>;
  kept: readonly ArenaStudyTarget[];
  before: Readonly<{
    leaderboardLeagueId: unknown;
    leaderboardGroupId: string | null;
    leaderboardGroupWeekId: string | null;
    spireTiers: SpireTiers;
    hadSpireTiersField: boolean;
    progressLeagueStateRaw: string | null;
  }>;
  rolledBackAtMs: number | null;
}>;

export function buildMigrationRecords(input: Readonly<{
  uid: string;
  nowMs: number;
  currentLang: ArenaStudyTarget;
  currentLangSource: 'client_current' | 'room_lang';
  resolution: Extract<LeagueSourceResolution, { ok: true }>;
  plan: SpireTierPlan;
  leaderboard: Readonly<Record<string, unknown>> | undefined;
  progressLeagueStateRaw: unknown;
}>): { marker: SpireMigrationMarker; backup: SpireMigrationBackup } {
  const { resolution, plan, leaderboard } = input;
  const raw = input.progressLeagueStateRaw;
  const marker: SpireMigrationMarker = {
    schema: SPIRE_LEAGUE_MIGRATION_SCHEMA,
    migratedAtMs: input.nowMs,
    lang: input.currentLang,
    tier: plan.tiers[input.currentLang],
    sourceLeagueId: resolution.leagueId,
    source: resolution.source,
  };
  const backup: SpireMigrationBackup = {
    schema: SPIRE_LEAGUE_MIGRATION_SCHEMA,
    uid: input.uid,
    migratedAtMs: input.nowMs,
    currentLang: input.currentLang,
    currentLangSource: input.currentLangSource,
    sourceLeagueId: resolution.leagueId,
    source: resolution.source,
    clamped: resolution.clamped,
    conflicts: resolution.conflicts,
    tiersAfter: plan.tiers,
    kept: plan.kept,
    before: {
      leaderboardLeagueId: leaderboard?.leagueId ?? null,
      leaderboardGroupId: text(leaderboard?.groupId, 180) || null,
      leaderboardGroupWeekId: text(leaderboard?.groupWeekId, 16) || null,
      spireTiers: readSpireTiers(leaderboard),
      hadSpireTiersField: !!leaderboard && Object.prototype.hasOwnProperty.call(leaderboard, 'spireTiers'),
      progressLeagueStateRaw: typeof raw === 'string' ? raw.slice(0, RAW_BACKUP_MAX) : null,
    },
    rolledBackAtMs: null,
  };
  return { marker, backup };
}

export function hasSpireMigrationMarker(leaderboard: Readonly<Record<string, unknown>> | undefined): boolean {
  const m = leaderboard?.spireMigration;
  return !!m && typeof m === 'object' && (m as Record<string, unknown>).schema === SPIRE_LEAGUE_MIGRATION_SCHEMA;
}

/**
 * План отката одного человека. Лига миграцией НЕ менялась, поэтому откат —
 * вернуть leaderboard.spireTiers к состоянию «до» и снять отметку.
 *
 * зачем по языкам, а не целиком: после переноса итог недели Шпиля (PM-276)
 * пишет в тот же spireTiers. Откат целиком стёр бы честно заработанные
 * повышения/понижения. Поэтому язык откатывается ТОЛЬКО если его значение не
 * менялось с момента миграции (== tiersAfter); изменённые языки остаются и
 * перечисляются в changedSinceMigration — их владелец решает руками.
 *
 * Комнату текущей недели откат НЕ перекладывает (см. evidence, план отката).
 */
export type SpireRollbackPlan = Readonly<{
  /** Итоговая карта; пустая + deleteSpireTiers=true → поле удаляется целиком. */
  spireTiers: SpireTiers;
  deleteSpireTiers: boolean;
  deleteMarker: true;
  reverted: readonly ArenaStudyTarget[];
  changedSinceMigration: readonly ArenaStudyTarget[];
  /** Место лиги до переноса — для сверки в админке. */
  leagueIdBefore: number | null;
}>;

export function buildRollbackPlan(
  backup: Readonly<Record<string, unknown>> | undefined,
  currentLeaderboard: Readonly<Record<string, unknown>> | undefined,
): SpireRollbackPlan | null {
  if (!backup || backup.schema !== SPIRE_LEAGUE_MIGRATION_SCHEMA) return null;
  const before = backup.before && typeof backup.before === 'object'
    ? backup.before as Record<string, unknown>
    : {};
  const had = before.hadSpireTiersField === true;
  const priorTiers = readSpireTiers({ spireTiers: before.spireTiers });
  const after = readSpireTiers({ spireTiers: backup.tiersAfter });
  const current = readSpireTiers(currentLeaderboard);

  const out: Partial<Record<ArenaStudyTarget, number>> = {};
  const reverted: ArenaStudyTarget[] = [];
  const changed: ArenaStudyTarget[] = [];
  for (const lang of ARENA_STUDY_TARGETS) {
    const now = current[lang];
    if (now === undefined) {
      // Поля нет сейчас — восстанавливаем прежнее, если оно было.
      if (priorTiers[lang] !== undefined) out[lang] = priorTiers[lang];
      continue;
    }
    if (now === after[lang]) {
      if (priorTiers[lang] !== undefined) out[lang] = priorTiers[lang];
      reverted.push(lang);
    } else {
      out[lang] = now;
      changed.push(lang);
    }
  }
  return {
    spireTiers: out,
    deleteSpireTiers: !had && Object.keys(out).length === 0,
    deleteMarker: true,
    reverted,
    changedSinceMigration: changed,
    leagueIdBefore: leagueIdToSpireTier(before.leaderboardLeagueId)?.tier ?? null,
  };
}
