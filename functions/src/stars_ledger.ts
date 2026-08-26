import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Единый журнал звёзд — ЕДИНСТВЕННЫЙ писатель звёздного баланса во всём
 * приложении.
 *
 * Владелец (2026-08-12, D-05/D-06): звезда — одна общая валюта. Любое
 * начисление в любом разделе обновляет всё сразу, расхождений между разделами
 * быть не может.
 *
 * Ключевые решения, каждое оплачено разбором кода:
 *
 * 1. Баланс лежит картой `stars` в `users/{stableUid}` — документе, который
 *    приложение и так читает один раз при старте. Ноль дополнительных чтений.
 * 2. Звёзды целые. Подъединиц нет: все правила начисления оперируют целыми,
 *    а пороги наград и сортировка лиг обязаны сравнивать целые.
 * 3. Операции принимаются МАССИВОМ. В `settleMatch` один и тот же игрок
 *    получает звёзды дважды в одной транзакции (матч и пороги мастерства);
 *    два отдельных вызова читали бы одно и то же состояние, и второй затёр бы
 *    первый.
 * 4. Две фазы: `prepareStarOperations` только читает, `commitStarOperations`
 *    только пишет. Firestore требует, чтобы все чтения шли до всех записей, а
 *    вызывающий код их перемежает.
 * 5. Ключ дедупликации — `<sourceKind>:<sourceId>`, без версии правил. Ключ,
 *    который меняется при смене суммы, дедупликацией не является.
 * 6. Четыре счётчика вместо двух. `earnedTotal` (заработано, открывает награды)
 *    отделён от `grantedTotal` (обмен монет, ручные выдачи) — иначе деньги
 *    покупали бы прогресс сезонного пропуска.
 */

export const STARS_SCHEMA_VERSION = 'stars.v1' as const;
export const STAR_OP_SCHEMA_VERSION = 'star-op.v1' as const;

/** Максимальный модуль одной операции. Защита от арифметической ошибки выше. */
export const STAR_OP_MAX_ABS_DELTA = 5_000;
/** Насколько в прошлое разрешено датировать операцию (оффлайн-отчёт). */
export const STAR_OP_MAX_BACKDATE_MS = 8 * 24 * 60 * 60 * 1_000;
export const STAR_OP_RETENTION_MS = 400 * 24 * 60 * 60 * 1_000;
export const STAR_OPERATIONS_COLLECTION = 'star_operations';

export type StarsState = {
  schemaVersion: typeof STARS_SCHEMA_VERSION;
  /** Тратимое. Может расти и убывать. Никогда не отрицательное. */
  balance: number;
  /** D-10: заработано за всё время. Растёт только вверх, траты его не трогают. */
  earnedTotal: number;
  /** Не заработанный приток: обмен монет, ручные выдачи. Награды не открывает. */
  grantedTotal: number;
  spentTotal: number;
  /** D-11: неделя в формате ISO 'YYYY-Www'. */
  weekKey: string;
  weekEarned: number;
  prevWeekKey: string;
  prevWeekEarned: number;
  /** D-09: один общий турнирный сезон. */
  seasonId: string;
  seasonEarned: number;
  /**
   * Разрез положительного притока по источникам (earn + grant). Растёт только
   * вверх, траты его не трогают — это «сколько всего пришло откуда», а не
   * остаток. Сумма значений равна earnedTotal + grantedTotal для операций,
   * записанных после 2026-08-26; у старых аккаунтов карта догоняет постепенно,
   * поэтому клиент никогда не считает по ней главное число.
   */
  bySource: Readonly<Partial<Record<RuneSourceKey, number>>>;
  /** Монотонный счётчик операций игрока — якорь цепочки аудита. */
  seq: number;
  lastOpId: string;
  updatedAtMs: number;
};

export const EMPTY_STARS_STATE: StarsState = Object.freeze({
  schemaVersion: STARS_SCHEMA_VERSION,
  balance: 0,
  earnedTotal: 0,
  grantedTotal: 0,
  spentTotal: 0,
  weekKey: '',
  weekEarned: 0,
  prevWeekKey: '',
  prevWeekEarned: 0,
  seasonId: '',
  seasonEarned: 0,
  bySource: Object.freeze({}),
  seq: 0,
  lastOpId: '',
  updatedAtMs: 0,
});

export type StarOpReason =
  | 'arena_match' | 'arena_mastery' | 'arena_today' | 'arena_today_mastery'
  | 'arena_partner' | 'arena_tier' | 'spend_shop' | 'admin_grant' | 'admin_revoke' | 'coin_exchange'
  | 'level_spin_grant'
  // «Вместе» (friends_together.ts): веха уровня дружбы и сундук недели — оба заработок
  // (клеймится только за реально накопленные дни/XP, не подарок).
  | 'friends_together_level' | 'friends_together_chest'
  // зачем: владелец 2026-08-23 — звёзды Арены, турниров и Learning V2 это одна
  // валюта. Занятие оплачено учёбой, поэтому earn (обязано открывать награды
  // сезона); открытие занятия — spend по лестнице 45/50/55/60/65.
  | 'learning_v2_session' | 'learning_v2_unlock'
  // Стартовый подарок новичку (+300, владелец 2026-08-26): grant, не earn —
  // подарок не оплачен игрой и не должен двигать соревновательный earnedTotal.
  | 'welcome_gift';

export type StarOpClass = 'earn' | 'grant' | 'spend';

/** Куда идёт положительная дельта. Таблица серверная, клиент её не задаёт. */
export const STAR_OP_CLASS: Readonly<Record<StarOpReason, StarOpClass>> = Object.freeze({
  arena_match: 'earn',
  arena_mastery: 'earn',
  arena_today: 'earn',
  arena_today_mastery: 'earn',
  arena_partner: 'earn',
  // Награда за взятый тир — заработок, а не подарок: её оплатили матчами.
  arena_tier: 'earn',
  spend_shop: 'spend',
  admin_revoke: 'spend',
  admin_grant: 'grant',
  coin_exchange: 'grant',
  level_spin_grant: 'grant',
  friends_together_level: 'earn',
  friends_together_chest: 'earn',
  learning_v2_session: 'earn',
  learning_v2_unlock: 'spend',
  welcome_gift: 'grant',
});

/**
 * Источник притока для разреза «откуда руны» в разделе «Руны» (клиент:
 * app/runes_wallet.tsx).
 *
 * зачем (владелец, 2026-08-26: «получил бонус 300 за вход, а в разделе Руны
 * написано заработано за всё время 0»): строки источников на экране всегда
 * рисовались без чисел, потому что разреза не существовало. Считаем его здесь,
 * в единственном писателе баланса — ноль дополнительных чтений и записей:
 * карта живёт в том же объекте `stars` того же документа users/{uid}.
 *
 * Таблица серверная, клиент её не задаёт — ровно как STAR_OP_CLASS.
 */
export type RuneSourceKey = 'arena' | 'learning' | 'friends' | 'spin' | 'exchange' | 'other';

export const STAR_OP_SOURCE: Readonly<Record<StarOpReason, RuneSourceKey>> = Object.freeze({
  arena_match: 'arena',
  arena_mastery: 'arena',
  arena_today: 'arena',
  arena_today_mastery: 'arena',
  arena_partner: 'arena',
  arena_tier: 'arena',
  friends_together_level: 'friends',
  friends_together_chest: 'friends',
  learning_v2_session: 'learning',
  level_spin_grant: 'spin',
  coin_exchange: 'exchange',
  // Стартовый подарок и ручные выдачи админки — «другое»: у них нет своей
  // строки на экране, но приток обязан быть виден в сумме (иначе снова 0).
  welcome_gift: 'other',
  admin_grant: 'other',
  // Траты в разрез притока не попадают вовсе — значение здесь недостижимо,
  // но тип обязан быть полным, иначе новая причина проедет незамеченной.
  spend_shop: 'other',
  admin_revoke: 'other',
  learning_v2_unlock: 'other',
});

export type StarOpMeta = Record<string, string | number | boolean>;

export type StarOpRequest = {
  opId: string;
  /** Ненулевое целое, |delta| <= STAR_OP_MAX_ABS_DELTA. Знак обязан совпасть с классом. */
  delta: number;
  reason: StarOpReason;
  sourceKind: string;
  sourceId: string;
  /** Только тело расписки, никогда не часть ключа. */
  ruleVersion: number;
  earnedAtMs?: number;
  meta?: StarOpMeta;
};

export type StarOpErrorCode =
  | 'insufficient_stars' | 'invalid_delta' | 'invalid_op_id'
  | 'invalid_reason' | 'meta_too_large' | 'op_conflict';

export type StarOpOutcome = {
  status: 'applied' | 'already_applied' | 'rejected';
  errorCode?: StarOpErrorCode;
  opId: string;
  seq: number;
  appliedDelta: number;
};

export type StarOpReceipt = {
  schemaVersion: typeof STAR_OP_SCHEMA_VERSION;
  opId: string;
  seq: number;
  delta: number;
  reason: StarOpReason;
  opClass: StarOpClass;
  sourceKind: string;
  sourceId: string;
  ruleVersion: number;
  balanceBefore: number;
  balanceAfter: number;
  earnedTotalAfter: number;
  grantedTotalAfter: number;
  spentTotalAfter: number;
  weekKey: string;
  weekEarnedAfter: number;
  seasonId: string;
  seasonEarnedAfter: number;
  /** D-69: операции Арены несут опыт, начисленный в ТОЙ ЖЕ транзакции. */
  xpDelta: number;
  xpTotalAfter: number;
  authUid: string;
  deviceId: string | null;
  earnedAtMs: number;
  serverAtMs: number;
  meta: StarOpMeta;
  expireAt: admin.firestore.Timestamp;
};

export type StarLedgerCtx = {
  nowMs: number;
  /** Обязан приходить из arenaSeasonWindow(nowMs).seasonId — один производитель. */
  activeSeasonId: string;
  /** getWeekKey(...) из progress_events.ts. Другого помощника не заводить. */
  weekKeyNow: string;
  /**
   * Ключ недели для произвольного момента — тот же getWeekKey. Нужен только
   * для операций задним числом (оффлайн-отчёт приходит на следующий день и
   * обязан попасть в СВОЮ неделю, иначе лига посчитает его дважды не там).
   * Не передан — операция кладётся в текущую неделю.
   */
  weekKeyForMs?: (ms: number) => string;
  authUid: string;
  deviceId?: string | null;
  /** Опыт, начисляемый в этой же транзакции — попадает в расписки. */
  xpDelta?: number;
  xpTotalAfter?: number;
};

export type StarLedgerResult = {
  outcomes: StarOpOutcome[];
  balance: number;
  earnedTotal: number;
  grantedTotal: number;
  spentTotal: number;
  weekKey: string;
  weekEarned: number;
  seasonId: string;
  seasonEarned: number;
  seq: number;
  updatedAtMs: number;
  schemaVersion: typeof STARS_SCHEMA_VERSION;
};

export type StarLedgerPrepared = {
  stableUid: string;
  userRef: admin.firestore.DocumentReference;
  before: StarsState;
  after: StarsState;
  outcomes: StarOpOutcome[];
  receipts: Array<{ ref: admin.firestore.DocumentReference; data: StarOpReceipt }>;
  result: StarLedgerResult;
  /** Ни одна операция не изменила состояние — записей быть не должно. */
  noop: boolean;
};

/* ------------------------------- проекции -------------------------------- */

/**
 * Единственный законный способ прочитать недельный счётчик.
 *
 * Устаревшая неделя читается как ноль и НЕ чинится записью — именно это делает
 * смену недели бесплатной: без ремонта нет ни одной лишней записи в понедельник.
 */
export function starsWeekEarned(stars: StarsState | undefined, weekKeyNow: string): number {
  if (!stars) return 0;
  if (stars.weekKey === weekKeyNow) return Math.max(0, stars.weekEarned);
  if (stars.prevWeekKey === weekKeyNow) return Math.max(0, stars.prevWeekEarned);
  return 0;
}

/**
 * Единственный законный способ прочитать сезонный счётчик.
 *
 * Без этой проекции экран сезонного пропуска сравнивал бы порог награды с
 * числом ПРОШЛОГО сезона и раздавал награды бесплатно.
 */
export function starsSeasonEarned(stars: StarsState | undefined, activeSeasonId: string): number {
  if (!stars || stars.seasonId !== activeSeasonId) return 0;
  return Math.max(0, stars.seasonEarned);
}

export function starsSpendable(stars: StarsState | undefined): number {
  return Math.max(0, stars?.balance ?? 0);
}

/* ------------------------------ нормализация ----------------------------- */

function int(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

const RUNE_SOURCE_KEYS: readonly RuneSourceKey[] = Object.freeze([
  'arena', 'learning', 'friends', 'spin', 'exchange', 'other',
] as const);

/**
 * Карта источников из документа. Неизвестные ключи отбрасываются молча — это
 * не порча данных, а старая или будущая схема; главные счётчики от неё не
 * зависят, поэтому ронять транзакцию тут нечем.
 */
function normalizeBySource(raw: unknown): Readonly<Partial<Record<RuneSourceKey, number>>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return Object.freeze({});
  const data = raw as Record<string, unknown>;
  const out: Partial<Record<RuneSourceKey, number>> = {};
  for (const key of RUNE_SOURCE_KEYS) {
    const value = Math.max(0, int(data[key]));
    if (value > 0) out[key] = value;
  }
  return Object.freeze(out);
}

export function normalizeStars(raw: unknown): StarsState {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    schemaVersion: STARS_SCHEMA_VERSION,
    balance: Math.max(0, int(data.balance)),
    earnedTotal: Math.max(0, int(data.earnedTotal)),
    grantedTotal: Math.max(0, int(data.grantedTotal)),
    spentTotal: Math.max(0, int(data.spentTotal)),
    weekKey: str(data.weekKey),
    weekEarned: Math.max(0, int(data.weekEarned)),
    prevWeekKey: str(data.prevWeekKey),
    prevWeekEarned: Math.max(0, int(data.prevWeekEarned)),
    seasonId: str(data.seasonId),
    seasonEarned: Math.max(0, int(data.seasonEarned)),
    bySource: normalizeBySource(data.bySource),
    seq: Math.max(0, int(data.seq)),
    lastOpId: str(data.lastOpId),
    updatedAtMs: Math.max(0, int(data.updatedAtMs)),
  };
}

function isPristine(state: StarsState): boolean {
  return state.balance === 0 && state.earnedTotal === 0
    && state.grantedTotal === 0 && state.spentTotal === 0 && state.seq === 0;
}

/**
 * Жёсткий инвариант. Нарушение — это порча данных, а не повод для ремонта:
 * журнал, который тихо чинит сам себя, уничтожает единственную улику.
 */
function assertInvariant(state: StarsState, stableUid: string, stage: 'before' | 'after'): void {
  const expected = state.earnedTotal + state.grantedTotal - state.spentTotal;
  if (expected === state.balance) return;
  if (stage === 'before' && isPristine(state)) return;
  console.error('[stars_ledger] INCONSISTENT', { stableUid, stage, stars: state, expected });
  throw new HttpsError('failed-precondition', 'star_ledger_inconsistent');
}

/* ------------------------------- валидация ------------------------------- */

const OP_ID_RE = /^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/;

function validate(op: StarOpRequest, seen: Set<string>): StarOpErrorCode | null {
  if (typeof op.opId !== 'string' || !OP_ID_RE.test(op.opId) || op.opId.startsWith('__')) return 'invalid_op_id';
  const suffix = op.opId.slice(op.opId.indexOf(':') + 1);
  if (suffix === '.' || suffix === '..') return 'invalid_op_id';
  if (seen.has(op.opId)) return 'op_conflict';
  if (!Number.isSafeInteger(op.delta) || op.delta === 0
    || Math.abs(op.delta) > STAR_OP_MAX_ABS_DELTA) return 'invalid_delta';
  const cls = STAR_OP_CLASS[op.reason];
  if (!cls) return 'invalid_reason';
  if ((cls === 'earn' || cls === 'grant') && op.delta < 0) return 'invalid_reason';
  if (cls === 'spend' && op.delta > 0) return 'invalid_reason';
  if (op.meta) {
    const keys = Object.keys(op.meta);
    if (keys.length > 10) return 'meta_too_large';
    if (JSON.stringify(op.meta).length > 512) return 'meta_too_large';
  }
  return null;
}

/* --------------------------- защита от двойного --------------------------- */

/**
 * Механическая защита от второго `prepare` для того же игрока в одной
 * транзакции. Полагаться на ревью здесь нельзя: ошибка тихая и стоит звёзд.
 */
const preparedInTx = new WeakMap<admin.firestore.Transaction, Set<string>>();

function assertSinglePrepare(tx: admin.firestore.Transaction, stableUid: string): void {
  let seen = preparedInTx.get(tx);
  if (!seen) {
    seen = new Set<string>();
    preparedInTx.set(tx, seen);
  }
  if (seen.has(stableUid)) {
    throw new HttpsError('internal', 'star_ledger_double_prepare');
  }
  seen.add(stableUid);
}

/* --------------------------------- фаза 1 -------------------------------- */

/**
 * ФАЗА 1 — ТОЛЬКО ЧТЕНИЯ. Обязана вызываться до любых записей в этой
 * транзакции. `userSnap` передаётся снаружи, чтобы документ игрока читался
 * ровно один раз на транзакцию.
 */
export async function prepareStarOperations(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  stableUid: string,
  userSnap: admin.firestore.DocumentSnapshot,
  ops: readonly StarOpRequest[],
  ctx: StarLedgerCtx,
): Promise<StarLedgerPrepared> {
  assertSinglePrepare(tx, stableUid);

  const userRef = userSnap.ref;
  const before = normalizeStars(userSnap.data()?.stars);
  assertInvariant(before, stableUid, 'before');

  // Ошибки хранятся ПО ИНДЕКСУ, а не по opId. При дубле в пакете обе операции
  // имеют один и тот же opId, и карта по ключу отвергла бы вместе с дублем
  // первую, законную операцию.
  const seen = new Set<string>();
  const errorByIndex: Array<StarOpErrorCode | null> = [];
  const validIndexByOp: number[] = [];
  const valid: StarOpRequest[] = [];
  ops.forEach((op) => {
    const error = validate(op, seen);
    errorByIndex.push(error);
    if (error) {
      validIndexByOp.push(-1);
      return;
    }
    seen.add(op.opId);
    validIndexByOp.push(valid.length);
    valid.push(op);
  });

  const receiptsCollection = userRef.collection(STAR_OPERATIONS_COLLECTION);
  const existing = valid.length
    ? await Promise.all(valid.map((op) => tx.get(receiptsCollection.doc(op.opId))))
    : [];

  const after: StarsState = { ...before };
  const outcomes: StarOpOutcome[] = [];
  const receipts: StarLedgerPrepared['receipts'] = [];

  for (let opIndex = 0; opIndex < ops.length; opIndex += 1) {
    const op = ops[opIndex] as StarOpRequest;
    const error = errorByIndex[opIndex];
    if (error) {
      outcomes.push({ status: 'rejected', errorCode: error, opId: String(op.opId ?? ''), seq: after.seq, appliedDelta: 0 });
      continue;
    }
    const prior = existing[validIndexByOp[opIndex] as number];
    if (prior?.exists) {
      outcomes.push({
        status: 'already_applied',
        opId: op.opId,
        seq: Math.max(0, int(prior.data()?.seq)),
        appliedDelta: 0,
      });
      continue;
    }

    const earnedAtMs = Math.max(
      ctx.nowMs - STAR_OP_MAX_BACKDATE_MS,
      Math.min(ctx.nowMs, int(op.earnedAtMs, ctx.nowMs)),
    );

    // Перенос недели и сезона — лениво, только в момент записи. Ни одного
    // планового прохода по базе в понедельник и в конце сезона.
    if (after.weekKey !== ctx.weekKeyNow) {
      after.prevWeekKey = after.weekKey;
      after.prevWeekEarned = after.weekEarned;
      after.weekKey = ctx.weekKeyNow;
      after.weekEarned = 0;
    }
    if (after.seasonId !== ctx.activeSeasonId) {
      after.seasonId = ctx.activeSeasonId;
      after.seasonEarned = 0;
    }

    const cls = STAR_OP_CLASS[op.reason];
    if (cls === 'spend' && after.balance + op.delta < 0) {
      // Не обрезаем и не пишем: недостаток средств — это отказ, а не частичная
      // трата. Остальные операции пакета при этом не страдают.
      outcomes.push({ status: 'rejected', errorCode: 'insufficient_stars', opId: op.opId, seq: after.seq, appliedDelta: 0 });
      continue;
    }

    const balanceBefore = after.balance;
    after.balance += op.delta;
    if (cls === 'earn') {
      after.earnedTotal += op.delta;
      after.seasonEarned += op.delta;
      // Задним числом заработанное попадает в свою неделю, если она ещё
      // хранится; более старое учитывается только в счётчике за всё время.
      const opWeekKey = ctx.weekKeyForMs ? ctx.weekKeyForMs(earnedAtMs) : ctx.weekKeyNow;
      if (opWeekKey === after.weekKey) after.weekEarned += op.delta;
      else if (opWeekKey === after.prevWeekKey) after.prevWeekEarned += op.delta;
    } else if (cls === 'grant') {
      after.grantedTotal += op.delta;
    } else {
      after.spentTotal += -op.delta;
    }

    // Разрез притока: только приход, только положительная дельта. Траты сюда
    // не пишутся намеренно — экран отвечает на вопрос «откуда руны пришли»,
    // а не «сколько осталось от каждого источника».
    if (cls !== 'spend' && op.delta > 0) {
      const sourceKey = STAR_OP_SOURCE[op.reason];
      after.bySource = Object.freeze({
        ...after.bySource,
        [sourceKey]: Math.max(0, int(after.bySource[sourceKey])) + op.delta,
      });
    }

    after.seq += 1;
    after.lastOpId = op.opId;

    const serverAtMs = ctx.nowMs;
    receipts.push({
      ref: receiptsCollection.doc(op.opId),
      data: {
        schemaVersion: STAR_OP_SCHEMA_VERSION,
        opId: op.opId,
        seq: after.seq,
        delta: op.delta,
        reason: op.reason,
        opClass: cls,
        sourceKind: op.sourceKind,
        sourceId: op.sourceId,
        ruleVersion: int(op.ruleVersion, 1),
        balanceBefore,
        balanceAfter: after.balance,
        earnedTotalAfter: after.earnedTotal,
        grantedTotalAfter: after.grantedTotal,
        spentTotalAfter: after.spentTotal,
        weekKey: after.weekKey,
        weekEarnedAfter: after.weekEarned,
        seasonId: after.seasonId,
        seasonEarnedAfter: after.seasonEarned,
        xpDelta: Math.max(0, int(ctx.xpDelta)),
        xpTotalAfter: Math.max(0, int(ctx.xpTotalAfter)),
        authUid: ctx.authUid,
        deviceId: ctx.deviceId ?? null,
        earnedAtMs,
        serverAtMs,
        meta: op.meta ?? {},
        expireAt: admin.firestore.Timestamp.fromMillis(serverAtMs + STAR_OP_RETENTION_MS),
      },
    });

    outcomes.push({ status: 'applied', opId: op.opId, seq: after.seq, appliedDelta: op.delta });
  }

  after.updatedAtMs = ctx.nowMs;
  after.schemaVersion = STARS_SCHEMA_VERSION;
  assertInvariant(after, stableUid, 'after');

  const noop = receipts.length === 0 && after.seq === before.seq && after.balance === before.balance;

  return {
    stableUid,
    userRef,
    before,
    after,
    outcomes,
    receipts,
    noop,
    result: {
      outcomes,
      balance: after.balance,
      earnedTotal: after.earnedTotal,
      grantedTotal: after.grantedTotal,
      spentTotal: after.spentTotal,
      weekKey: after.weekKey,
      weekEarned: after.weekEarned,
      seasonId: after.seasonId,
      seasonEarned: after.seasonEarned,
      seq: after.seq,
      updatedAtMs: after.updatedAtMs,
      schemaVersion: STARS_SCHEMA_VERSION,
    },
  };
}

/* --------------------------------- фаза 2 -------------------------------- */

/**
 * ФАЗА 2 — ТОЛЬКО ЗАПИСИ. Ровно один `tx.set` на документ игрока: сюда же
 * складывается `extraUserFields`, поэтому опыт Арены попадает в ту же запись,
 * а не во вторую.
 *
 * Чистый повтор (все операции уже применены) не пишет вообще ничего — именно
 * это делает ретрай дешёвым.
 */
export function commitStarOperations(
  tx: admin.firestore.Transaction,
  prepared: StarLedgerPrepared,
  extraUserFields?: Record<string, unknown>,
): StarLedgerResult {
  const hasExtra = Boolean(extraUserFields && Object.keys(extraUserFields).length);
  if (prepared.noop && !hasExtra) return prepared.result;

  tx.set(prepared.userRef, {
    ...(extraUserFields ?? {}),
    stars: prepared.after,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  for (const receipt of prepared.receipts) tx.create(receipt.ref, receipt.data);
  return prepared.result;
}
