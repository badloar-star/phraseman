/**
 * Шпиль — чистая проверка правдоподобия пачки отчётов о ступенях (PM-275).
 *
 * зачем: владелец (TOWER.md §6, TOWER_CONTRACT.md §5–§6, D56) — ступень целиком
 * играется на устройстве, сервер узнаёт о ней ПАЧКОЙ (при уходе с экрана или раз
 * в 5 минут) и пишет ОДНУ агрегированную запись `progress.spire_week_v1`.
 *
 * ⛔ Сервер НЕ судит, правда ли ступень пройдена (владелец 2026-09-24, дословно:
 * «сервер идёт нахуй с самого начала, никакого сервера, сервер только для
 * синхронизации»). Раньше здесь были отказы по скорости прохождения
 * (`too_fast`/`rate_limited`) — они убраны: локальный прогресс на устройстве
 * авторитетен всегда, сервер синхронизирует его в общий рейтинг комнаты, не
 * откатывает. Остаются только проверки ЦЕЛОСТНОСТИ данных (не правды):
 *   • отпечаток пакета недели совпадает с ожидаемым (`pack_mismatch`/`pack_unknown`);
 *   • не из будущего (`clock_ahead`) и не из прошлой недели (`stale_week`);
 *   • шпиль отчёта совпадает со шпилем комнаты (`tier_mismatch`);
 *   • форма отчёта корректна (`malformed`).
 * Если накрутка станет проблемой — перевести верхние шпили на серверный план
 * (как в Арене, TOWER.md §6), а не возвращать эти отказы.
 *
 * Чистый модуль: ни Firestore, ни часов, ни сети — всё приходит аргументами,
 * поэтому проверяется тестом целиком (`spire_progress_contract.test.ts`).
 *
 * Идемпотентность — по времени, а не по номеру: отчёт с `completedAtMs` не
 * позже последнего принятого считается уже учтённым (`duplicate`). Номер-счётчик
 * на устройстве сбрасывается при переустановке и тогда навсегда глушил бы новые
 * отчёты до конца недели; время так не ломается, и оно же закрывает повтор
 * старых отчётов (replay) — их время уже «позади».
 *
 * СИНХРОНИЗАЦИЯ: клиентская форма отчёта — `modules/spire/report_queue.ts`
 * (SpireStepReport). Сервер не может импортировать `modules/` (functions/tsconfig
 * include: ["src"]), поэтому формы параллельные — правишь поле здесь, правь там.
 */

import type { SpireIntegrityConfig } from './spire_config_contract';

import { SPIRE_GOLD_DAILY_CAP, spireGoldDayKey, spireGoldenTaskIndex } from './spire_golden';

export const SPIRE_PROGRESS_FIELD = 'spire_week_v1' as const;
export const SPIRE_REPORT_SCHEMA_VERSION = 'spire-step-report.v1' as const;
export const SPIRE_WEEK_RECORD_SCHEMA_VERSION = 'spire-week-record.v1' as const;

/** TOWER.md §4.8: шпиль свой на каждый изучаемый язык. */
export const SPIRE_LANGS = ['en', 'es', 'de', 'fr', 'it'] as const;
export type SpireLang = typeof SPIRE_LANGS[number];

/** Больше этого за один вызов не принимаем — клиент режет пачку сам. */
export const SPIRE_REPORT_MAX_BATCH = 60;
/** Часы телефона могут спешить; больше двух минут «из будущего» — отказ. */
export const SPIRE_CLOCK_SKEW_MS = 2 * 60_000;
/** Верх для длительности одной ступени: бюджет этажа 1 ≈ 2 мин, пауза таймер не тратит. */
export const SPIRE_STEP_MAX_DURATION_MS = 30 * 60_000;
/**
 * зачем (владелец 2026-09-24, О-275-3): ступень пройдена в последние минуты
 * старой недели, а отчёт (пачкой, раз в 5 мин) дошёл уже после полуночи
 * понедельника — окно засчитывает её в ТЕКУЩУЮ неделю, а не отбрасывает
 * `stale_week`. Не разбивает запись на две недели (усложнение архитектуры) —
 * достаточно принять погрешность в несколько минут на границе.
 */
export const SPIRE_WEEK_ROLLOVER_GRACE_MS = 10 * 60_000;
const HOUR_MS = 60 * 60_000;
const PACK_HASH_RE = /^[A-Za-z0-9:_-]{8,128}$/u;
const REPORT_ID_RE = /^[A-Za-z0-9:_.-]{1,160}$/u;
const WEEK_KEY_RE = /^\d{4}-W\d{2}$/u;

export type SpireStepOutcome = 'passed' | 'failed';

export type SpireStepReportWire = Readonly<{
  reportId: string;
  weekKey: string;
  tier: number;
  outcome: SpireStepOutcome;
  /** Сколько бюджета ступени израсходовано (SpireStepState.elapsedBudgetMs). */
  durationMs: number;
  /** Часы устройства в момент вердикта ступени. */
  completedAtMs: number;
  packHash: string;
  /** [SPIRE-GOLD] клиент: золотое задание этой ступени решено верно с первой попытки (нет поля — false). */
  goldenHit: boolean;
}>;

export type SpireLangWeekRecord = Readonly<{
  schemaVersion: typeof SPIRE_WEEK_RECORD_SCHEMA_VERSION;
  weekKey: string;
  lang: SpireLang;
  tier: number;
  /** Очки комнаты = пройденные ступени (TOWER_CONTRACT §2.1). */
  steps: number;
  /** Ничья → кто раньше добрался (время последней пройденной ступени). */
  reachedAtMs: number;
  /** Затем меньшее суммарное время — сумма длительностей ПРОЙДЕННЫХ ступеней. */
  totalMs: number;
  packHash: string;
  /** Проваленные попытки — не очки, только для аналитики и честного лога. */
  failedAttempts: number;
  /** Время последнего принятого отчёта (пройден или провален) — якорь идемпотентности. */
  lastCompletedAtMs: number;
  /** Время пройденных ступеней за последний час — окно для maxStepsPerHour. */
  recentPassedAtMs: readonly number[];
  updatedAtMs: number;
  /** [SPIRE-GOLD] день UTC последнего засчитанного золота и сколько их в этот день (потолок SPIRE_GOLD_DAILY_CAP). */
  goldDay: string;
  goldCount: number;
}>;

export type SpireWeekProgress = Readonly<Partial<Record<SpireLang, SpireLangWeekRecord>>>;

/**
 * зачем: 'too_fast'/'rate_limited' убраны владельцем 2026-09-24 (сервер не
 * судит правду о скорости — см. комментарий в шапке файла). Оставшиеся
 * причины — только целостность данных, не правдоподобие прохождения.
 */
export type SpireReportRejectReason =
  | 'malformed'
  | 'stale_week'
  | 'clock_ahead'
  | 'pack_unknown'
  | 'pack_mismatch'
  | 'tier_mismatch';

export type SpireReportVerdict =
  | Readonly<{ reportId: string; verdict: 'accepted'; outcome: SpireStepOutcome }>
  | Readonly<{ reportId: string; verdict: 'duplicate' }>
  | Readonly<{ reportId: string; verdict: 'rejected'; reason: SpireReportRejectReason }>;

export type SpireBatchEvaluation = Readonly<{
  record: SpireLangWeekRecord;
  results: readonly SpireReportVerdict[];
  acceptedPassed: number;
  acceptedFailed: number;
  /** [SPIRE-GOLD] номера ступеней недели, за которые засчитано золото (×2 ставки ступени). */
  goldenSteps: readonly number[];
  /** [SPIRE-GOLD] reportId засчитанного золота — клиент гасит отдельную «ожидающую» строку золота именно по ним. */
  goldAccepted: readonly string[];
  /** [SPIRE-GOLD] заявки золота, которые не засчитаны, с причиной — в журнал. */
  goldSkipped: readonly Readonly<{ reportId: string; step: number; reason: 'not_golden' | 'daily_cap' | 'gold_off' }>[];
  /** false → писать в Firestore нечего (экономия записи на пустой/дублирующей пачке). */
  changed: boolean;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonNegInt(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
}

export function spireIsLang(value: unknown): value is SpireLang {
  return typeof value === 'string' && (SPIRE_LANGS as readonly string[]).includes(value);
}

/** Разбор одной строки пачки. Закрытый: непонятное — null, а не «починка догадкой». */
export function spireNormalizeReport(raw: unknown): SpireStepReportWire | null {
  if (!isRecord(raw)) return null;
  const reportId = typeof raw.reportId === 'string' ? raw.reportId : '';
  const weekKey = typeof raw.weekKey === 'string' ? raw.weekKey : '';
  const packHash = typeof raw.packHash === 'string' ? raw.packHash : '';
  const outcome = raw.outcome;
  const tier = Number(raw.tier);
  const durationMs = Number(raw.durationMs);
  const completedAtMs = Number(raw.completedAtMs);
  if (!REPORT_ID_RE.test(reportId)) return null;
  if (!WEEK_KEY_RE.test(weekKey)) return null;
  if (!PACK_HASH_RE.test(packHash)) return null;
  if (outcome !== 'passed' && outcome !== 'failed') return null;
  // Шпили 0 = Гранит … 11 = Алмаз — та же шкала, что SPIRE_MAX_TIER в spire_groups.ts (PM-277).
  if (!Number.isInteger(tier) || tier < 0 || tier > 11) return null;
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > SPIRE_STEP_MAX_DURATION_MS) return null;
  if (!Number.isSafeInteger(completedAtMs) || completedAtMs <= 0) return null;
  return { reportId, weekKey, packHash, outcome, tier, durationMs: Math.trunc(durationMs), completedAtMs, goldenHit: raw.goldenHit === true };
}

export function spireEmptyWeekRecord(lang: SpireLang, weekKey: string, tier: number): SpireLangWeekRecord {
  return {
    schemaVersion: SPIRE_WEEK_RECORD_SCHEMA_VERSION,
    weekKey,
    lang,
    tier,
    steps: 0,
    reachedAtMs: 0,
    totalMs: 0,
    packHash: '',
    failedAttempts: 0,
    lastCompletedAtMs: 0,
    recentPassedAtMs: [],
    updatedAtMs: 0,
    goldDay: '',
    goldCount: 0,
  };
}

/**
 * `progress.spire_week_v1` хранится строкой JSON (как week_points_v2: все поля
 * progress — строки). Битое значение → пустой прогресс, а не падение функции:
 * иначе один испорченный документ навсегда заблокировал бы приём отчётов.
 */
export function spireParseWeekProgress(raw: unknown): SpireWeekProgress {
  if (typeof raw !== 'string' || !raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isRecord(parsed)) return {};
  const out: Partial<Record<SpireLang, SpireLangWeekRecord>> = {};
  for (const lang of SPIRE_LANGS) {
    const row = parsed[lang];
    if (!isRecord(row) || row.schemaVersion !== SPIRE_WEEK_RECORD_SCHEMA_VERSION) continue;
    const weekKey = typeof row.weekKey === 'string' && WEEK_KEY_RE.test(row.weekKey) ? row.weekKey : '';
    if (!weekKey) continue;
    out[lang] = {
      schemaVersion: SPIRE_WEEK_RECORD_SCHEMA_VERSION,
      weekKey,
      lang,
      tier: Math.min(11, nonNegInt(row.tier, 0)),
      steps: nonNegInt(row.steps),
      reachedAtMs: nonNegInt(row.reachedAtMs),
      totalMs: nonNegInt(row.totalMs),
      packHash: typeof row.packHash === 'string' ? row.packHash : '',
      failedAttempts: nonNegInt(row.failedAttempts),
      lastCompletedAtMs: nonNegInt(row.lastCompletedAtMs),
      recentPassedAtMs: Array.isArray(row.recentPassedAtMs)
        ? row.recentPassedAtMs.map((v) => nonNegInt(v)).filter((v) => v > 0)
        : [],
      updatedAtMs: nonNegInt(row.updatedAtMs),
      goldDay: typeof row.goldDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.goldDay) ? row.goldDay : '',
      goldCount: nonNegInt(row.goldCount),
    };
  }
  return out;
}

export function spireSerializeWeekProgress(progress: SpireWeekProgress): string {
  return JSON.stringify(progress);
}

export type SpireEvaluateInput = Readonly<{
  lang: SpireLang;
  existing: SpireLangWeekRecord | null | undefined;
  reports: readonly unknown[];
  serverNowMs: number;
  serverWeekKey: string;
  /** Понедельник 00:00 UTC текущей недели — раньше этой точки отчёт чужой недели. */
  weekStartMs: number;
  integrity: SpireIntegrityConfig;
  /**
   * Ожидаемый отпечаток пакета по шпилю (tier) на текущую неделю. `null` —
   * пакета нет/не опубликован: отказ `pack_unknown` (fail-closed — без пакета
   * нечего сверять, а принять «на слово» значит открыть накрутку).
   */
  expectedPackHashByTier: Readonly<Record<number, string | null>>;
  /**
   * Шпиль игрока по серверу (комната недели или leaderboard.spireTiers).
   * Отчёт с другим шпилем отвергается `tier_mismatch` — иначе можно играть
   * пакет лёгкого шпиля, а очки нести в комнату трудного. null — не сверяем
   * (сервер шпиль не знает; очки всё равно никуда, кроме progress, не идут).
   */
  expectedTier?: number | null;
  /**
   * [SPIRE-GOLD] stableUid игрока для правила золотого задания (functions/src/spire_golden.ts). null/нет — золото не
   * засчитывается (gold_off). Сервер не судит «верно ли ответил» (телефон решает) — только «было ли золото в этой ступени»
   * по хешу и дневной потолок.
   */
  goldStableId?: string | null;
}>;

/**
 * Главная проверка. Отчёты обрабатываются в порядке времени завершения —
 * ступени на устройстве идут строго друг за другом, и только так окно «в час»
 * и проверка пересечения имеют смысл.
 */
export function spireEvaluateBatch(input: SpireEvaluateInput): SpireBatchEvaluation {
  const results: SpireReportVerdict[] = [];
  const { integrity } = input;

  // Новая неделя → прогресс по языку с нуля (итог прошлой уже подвёл крон лиги).
  const base = input.existing && input.existing.weekKey === input.serverWeekKey
    ? input.existing
    : null;

  const parsed: SpireStepReportWire[] = [];
  for (const raw of input.reports) {
    const report = spireNormalizeReport(raw);
    if (!report) {
      const id = isRecord(raw) && typeof raw.reportId === 'string' ? raw.reportId.slice(0, 160) : 'unknown';
      results.push({ reportId: id, verdict: 'rejected', reason: 'malformed' });
      continue;
    }
    parsed.push(report);
  }
  parsed.sort((a, b) => a.completedAtMs - b.completedAtMs);

  let record: SpireLangWeekRecord = base
    ?? spireEmptyWeekRecord(input.lang, input.serverWeekKey, input.expectedTier ?? parsed[0]?.tier ?? input.existing?.tier ?? 0);
  let acceptedPassed = 0;
  let acceptedFailed = 0;
  const goldenSteps: number[] = [];
  const goldAccepted: string[] = [];
  const goldSkipped: { reportId: string; step: number; reason: 'not_golden' | 'daily_cap' | 'gold_off' }[] = [];

  for (const report of parsed) {
    const reject = (reason: SpireReportRejectReason) => {
      results.push({ reportId: report.reportId, verdict: 'rejected', reason });
    };

    // зачем (О-275-3): ступень пройдена в последние SPIRE_WEEK_ROLLOVER_GRACE_MS
    // старой недели — засчитываем в текущую запись вместо отказа. Клиент шлёт
    // report.weekKey своей недели; сервер сверяет только время, не строку,
    // чтобы часовой пояс клиента не решал, попала ли ступень в допуск.
    const withinRolloverGrace = report.completedAtMs >= input.weekStartMs - SPIRE_WEEK_ROLLOVER_GRACE_MS
      && report.completedAtMs < input.weekStartMs;
    if ((report.weekKey !== input.serverWeekKey && !withinRolloverGrace) || report.completedAtMs < input.weekStartMs - SPIRE_WEEK_ROLLOVER_GRACE_MS) {
      reject('stale_week');
      continue;
    }
    if (report.completedAtMs > input.serverNowMs + SPIRE_CLOCK_SKEW_MS) {
      reject('clock_ahead');
      continue;
    }
    if (report.completedAtMs <= record.lastCompletedAtMs) {
      // Уже учтено (повтор пачки после обрыва связи) — не ошибка.
      results.push({ reportId: report.reportId, verdict: 'duplicate' });
      continue;
    }
    if (input.expectedTier !== null && input.expectedTier !== undefined && report.tier !== input.expectedTier) {
      reject('tier_mismatch');
      continue;
    }
    const expected = input.expectedPackHashByTier[report.tier];
    if (expected === null || expected === undefined) {
      reject('pack_unknown');
      continue;
    }
    if (report.packHash !== expected) {
      reject('pack_mismatch');
      continue;
    }
    // зачем (владелец 30.09, дословно: «убери сервер! сервер только для синхронизации
    // уже полученного!»): прежний отказ 'overlap' судил по ВРЕМЕНИ, не «наехала» ли
    // ступень на предыдущую, — тот же класс, что снятые 'too_fast'/'rate_limited'.
    // Засчитанная на телефоне ступень принимается. Повтор той же ступени по-прежнему
    // гасится якорем lastCompletedAtMs (verdict 'duplicate'), а монеты — ключом
    // операции журнала по номеру ступени (spire_coins.ts), дважды не начисляются.

    if (report.outcome === 'failed') {
      // Провал не даёт очков, поэтому минимум времени к нему не применяется:
      // три ошибки подряд за 20 секунд — честный провал, а не накрутка.
      record = {
        ...record,
        tier: report.tier,
        failedAttempts: record.failedAttempts + 1,
        lastCompletedAtMs: report.completedAtMs,
      };
      acceptedFailed += 1;
      results.push({ reportId: report.reportId, verdict: 'accepted', outcome: 'failed' });
      continue;
    }

    // зачем (владелец 2026-09-24, О-275-1/О-275-2, дословно: «сервер идёт
    // нахуй с самого начала, никакого сервера, сервер только для
    // синхронизации»): раньше здесь стоял отказ 'too_fast'/'rate_limited',
    // который мог откатить ЛОКАЛЬНО уже пройденную на телефоне ступень в
    // общем рейтинге недели. Владелец это прямо запретил — сервер только
    // синхронизирует прогресс, не судит, правда ли ступень пройдена.
    // recentPassedAtMs остаётся в состоянии как диагностика (видно тому,
    // кто смотрит данные, кто проходит подозрительно быстро), но не
    // используется для отказа.
    const windowFrom = report.completedAtMs - HOUR_MS;
    record = {
      ...record,
      tier: report.tier,
      steps: record.steps + 1,
      reachedAtMs: report.completedAtMs,
      totalMs: record.totalMs + report.durationMs,
      packHash: report.packHash,
      lastCompletedAtMs: report.completedAtMs,
      // зачем: храним только последний час — окно для лимита, документ не растёт.
      recentPassedAtMs: [...record.recentPassedAtMs.filter((t) => t > windowFrom), report.completedAtMs]
        .slice(-Math.max(1, Math.ceil(integrity.maxStepsPerHour))),
    };
    acceptedPassed += 1;
    results.push({ reportId: report.reportId, verdict: 'accepted', outcome: 'passed' });
    if (report.goldenHit) {
      // [SPIRE-GOLD] золото: было ли оно в этой ступени (хеш), и не выбран ли дневной потолок (UTC-день прохождения)
      const step = record.steps;
      const day = spireGoldDayKey(report.completedAtMs);
      const used = record.goldDay === day ? record.goldCount : 0;
      if (!input.goldStableId) goldSkipped.push({ reportId: report.reportId, step, reason: 'gold_off' });
      else if (spireGoldenTaskIndex(input.goldStableId, input.serverWeekKey, step) === null) goldSkipped.push({ reportId: report.reportId, step, reason: 'not_golden' });
      else if (used >= SPIRE_GOLD_DAILY_CAP) goldSkipped.push({ reportId: report.reportId, step, reason: 'daily_cap' });
      else {
        goldenSteps.push(step);
        goldAccepted.push(report.reportId);
        record = { ...record, goldDay: day, goldCount: used + 1 };
      }
    }
  }

  // зачем: пустая/дублирующая пачка не стоит записи в Firestore (экономия).
  const changed = acceptedPassed + acceptedFailed > 0;
  return {
    record: changed ? { ...record, updatedAtMs: input.serverNowMs } : record,
    results,
    acceptedPassed,
    acceptedFailed,
    goldenSteps,
    goldAccepted,
    goldSkipped,
    changed,
  };
}

/** Понедельник 00:00 UTC для ISO-недели `YYYY-Www` — та же неделя, что getWeekKey. */
export function spireWeekStartMsFromDate(now: Date): number {
  const utcDay = now.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday);
}
