import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Политика серверного кошелька монет (Q13, владелец 01.10).
 *
 * зачем: серверный кошелёк монет, спины удалены (владелец 01.10). Клиент шлёт
 * в `levelSpinStarGrant` уже посчитанную операцию начисления; сервер обязан
 * принять ТОЛЬКО утверждённые источники монет и только в пределах их таблиц —
 * иначе любой самодельный клиент печатал бы монеты, просто придумывая
 * requestId. Модуль чистый (без Firestore): его зовёт callable и тесты.
 *
 * Источник определяется по префиксу requestId — так его формирует клиент
 * (поля «источник» в контракте нет, и клиент мы не меняем):
 *   - `report_reward_<messageId>`        — награда за жалобу (D109, Q4);
 *   - `dailyjourney_<hash32>_<n>`        — монеты блока «Сегодня» (D49, modules/today-tasks).
 *     зачем: префикс унаследован от удалённого «Дневного пути» и НЕ переименован —
 *     совместимость с уже выданными ключами и задеплоенным белым списком;
 *     переименование источника — только отдельным решением владельца;
 *   - `videofull_<40 hex>`               — +500 за просмотр 70 % видео (владелец 05.11), ОДИН раз навсегда на (uid, videoId):
 *     hex = sha1(uid|videoId) считает телефон, поэтому повтор того же видео даёт тот же requestId и кошелёк его не начислит
 *     дважды (идемпотентность по номеру операции). Сумма зашита здесь (РОВНО stars_500), множителя «Супер-воскресенья» нет.
 *     Сервер НЕ судит, досмотрел ли человек (закон «телефон решает, сервер хранит»), только хранит и помечает аномалии.
 * зачем (курс занятий удалён): источники `chapterexam_` (экзамен главы) и `lessontogether_` («Урок вместе»)
 * сняты вместе с курсом — такие операции старых версий приложения получают отказ `coin_wallet_source_not_allowed`.
 * Счётчики этих источников в users/{uid}.coinWalletLimitsV1 больше не читаются и не пишутся.
 * Всё остальное (спины уровня, задания `quest_*`, компенсация подарков `g2c1_`/`g2cdj_`,
 * что угодно ещё) — отказ.
 *
 * зачем (PM-080, D148, владелец 01.10): компенсация «подарки → монеты» отменена — старые
 * подарки и спины удаляются без перевода. Источники `g2c1_`/`g2cdj_` и их лимиты сняты:
 * без них выдуманный клиентом ключ не мог бы напечатать до 30 000 монет за жизнь.
 */

export type CoinWalletSource = 'report_reward' | 'daily_journey' | 'video_full';
export type CoinWalletSubSource = 'report' | 'journey_runes' | 'video_watch';

export type CoinWalletOperationShape = Readonly<{
  requestId: string;
  lane: 'base' | 'premium';
  giftId: string;
  amount: number;
  promotionEligibility?: 'gameplay' | 'excluded_compensation';
}>;

export type CoinWalletClassification = Readonly<{
  source: CoinWalletSource;
  subSource: CoinWalletSubSource;
}>;

const SOURCE_PATTERNS: readonly (readonly [RegExp, CoinWalletClassification])[] = Object.freeze([
  [/^report_reward_[A-Za-z0-9_-]{1,66}$/, Object.freeze({ source: 'report_reward', subSource: 'report' })],
  [/^dailyjourney_[A-Za-z0-9]{32}_\d{1,3}$/, Object.freeze({ source: 'daily_journey', subSource: 'journey_runes' })],
  [/^videofull_[0-9a-f]{40}$/, Object.freeze({ source: 'video_full', subSource: 'video_watch' })],
] as const);

/**
 * Лимиты. Каждое число обосновано таблицей своего источника; превышение —
 * отказ с логом, операция остаётся у клиента в очереди и повторится позже
 * (суточные потолки обнуляются на следующие сутки UTC).
 */
export const COIN_WALLET_LIMITS = Object.freeze({
  /** D109/Q4: награда за жалобу 300/600/1000 — одна жалоба не больше 1000. */
  reportMaxPerReward: 1_000,
  /**
   * Жалоба приходит двумя операциями (base+premium): 250+50, 500+100 или
   * 1000 одной. Других номиналов клиент не шлёт (app/report_reward_bundle.ts).
   */
  reportGiftsByLane: Object.freeze({
    base: Object.freeze(['stars_250', 'stars_500', 'stars_1000']),
    premium: Object.freeze(['stars_50', 'stars_100']),
  }),
  /** Пять критических жалоб в сутки — с запасом выше реального темпа модерации. */
  reportMaxPerDay: 5_000,
  /**
   * D49: потолок операции унаследован от «Дневного пути» (1000 рун × 2 в
   * «Супер-воскресенье»). Сейчас источник — только «Сегодня»: 50 монет за
   * задачу (modules/today-tasks/today_tasks_core.ts, номиналы там же).
   */
  journeyRuneGiftIds: Object.freeze([
    'stars_10', 'stars_20', 'stars_50', 'stars_100', 'stars_250', 'stars_500', 'stars_1000',
  ]),
  journeyMaxPerOperation: 2_000,
  /** Один день пути в сутки: не больше самой крупной награды дня с удвоением. */
  journeyMaxPerDay: 2_000,
  /** Награда за видео (владелец 05.11): ровно stars_500, 70 % просмотра, один раз на видео. Дневного предела НЕТ. */
  videoFullGiftId: 'stars_500',
  videoFullCoins: 500,
  /**
   * Только пометка `[VIDEO-REWARD] limits_flag` (операция ПРИНИМАЕТСЯ): больше 10 наград за сутки UTC = 5000 монет.
   * Серверу длительность видео неизвестна, поэтому «интервал ≥ 0,6 × длительность» проверить нечем; это грубый сигнал накрутки.
   */
  videoFullFlagPerDay: 5_000,
});

/** Счётчики лимитов — поле users/{uid}.coinWalletLimitsV1 (клиенту запрещено правилами). */
export type CoinWalletLimitsState = Readonly<{
  schemaVersion: 1;
  reportDayKey: string;
  reportDayCoins: number;
  journeyDayKey: string;
  journeyDayCoins: number;
  videoFullDayKey: string;
  videoFullDayCoins: number;
}>;

export const COIN_WALLET_LIMITS_FIELD = 'coinWalletLimitsV1' as const;

export const EMPTY_COIN_WALLET_LIMITS: CoinWalletLimitsState = Object.freeze({
  schemaVersion: 1,
  reportDayKey: '',
  reportDayCoins: 0,
  journeyDayKey: '',
  journeyDayCoins: 0,
  videoFullDayKey: '',
  videoFullDayCoins: 0,
});

function nonNegativeInt(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

export function normalizeCoinWalletLimits(raw: unknown): CoinWalletLimitsState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_COIN_WALLET_LIMITS;
  const value = raw as Record<string, unknown>;
  return Object.freeze({
    schemaVersion: 1,
    reportDayKey: typeof value.reportDayKey === 'string' ? value.reportDayKey : '',
    reportDayCoins: nonNegativeInt(value.reportDayCoins),
    journeyDayKey: typeof value.journeyDayKey === 'string' ? value.journeyDayKey : '',
    journeyDayCoins: nonNegativeInt(value.journeyDayCoins),
    videoFullDayKey: typeof value.videoFullDayKey === 'string' ? value.videoFullDayKey : '',
    videoFullDayCoins: nonNegativeInt(value.videoFullDayCoins),
  });
}

export function coinWalletDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function log(event: string, fields: Record<string, unknown>): void {
  console.log(`[COIN-WALLET] ${event} ${JSON.stringify(fields)}`);
}

function reject(code: HttpsError['code'], reason: string, fields: Record<string, unknown>): never {
  console.warn(`[COIN-WALLET] reject reason=${reason} ${JSON.stringify(fields)}`);
  throw new HttpsError(code, reason);
}

/** Источник по requestId; неизвестный — отказ `coin_wallet_source_not_allowed`. */
export function classifyCoinWalletSource(requestId: string): CoinWalletClassification {
  for (const [pattern, classification] of SOURCE_PATTERNS) {
    if (pattern.test(requestId)) {
      log('source', { requestIdPrefix: requestId.slice(0, 16), ...classification });
      return classification;
    }
  }
  return reject('permission-denied', 'coin_wallet_source_not_allowed', {
    requestIdPrefix: requestId.slice(0, 16),
    note: 'not report_reward_/dailyjourney_/videofull_ (spins, quests, gift compensation g2c*, chapter exam, lesson together and others are retired)',
  });
}

function assertReportShape(operation: CoinWalletOperationShape, fields: Record<string, unknown>): void {
  // зачем (Ревизор 22.10, 13 отказов shape_invalid в 18:10): старые операции награды за жалобу ставились в очередь ДО появления
  // promotionEligibility — поля нет. Для жалобы ожидаемое значение одно (excluded_compensation): нет поля → оно и есть;
  // явное gameplay — по-прежнему отказ. Таблица номиналов и потолки не меняются.
  if (operation.promotionEligibility !== 'excluded_compensation' && operation.promotionEligibility !== undefined) {
    reject('invalid-argument', 'coin_wallet_source_shape_invalid', { ...fields, why: 'report_requires_excluded_compensation' });
  }
  const allowed: readonly string[] = COIN_WALLET_LIMITS.reportGiftsByLane[operation.lane];
  if (!allowed.includes(operation.giftId)) {
    reject('invalid-argument', 'coin_wallet_source_shape_invalid', { ...fields, why: 'report_gift_not_in_tier_table', allowed });
  }
  if (operation.amount > COIN_WALLET_LIMITS.reportMaxPerReward) {
    reject('invalid-argument', 'coin_wallet_amount_over_limit', { ...fields, limit: COIN_WALLET_LIMITS.reportMaxPerReward });
  }
}

/** Награда за видео: форма записи (stars_500, сумма 500, gameplay, базовая полоса). Решает ли человек «досмотрел» — телефон. */
function assertVideoFullShape(operation: CoinWalletOperationShape, fields: Record<string, unknown>): void {
  if (operation.promotionEligibility !== 'gameplay') {
    reject('invalid-argument', 'coin_wallet_source_shape_invalid', { ...fields, why: 'video_full_requires_gameplay' });
  }
  if (operation.giftId !== COIN_WALLET_LIMITS.videoFullGiftId || operation.amount !== COIN_WALLET_LIMITS.videoFullCoins) {
    reject('invalid-argument', 'coin_wallet_source_shape_invalid', { ...fields, why: 'video_full_must_be_stars_500' });
  }
}

function assertJourneyShape(operation: CoinWalletOperationShape, fields: Record<string, unknown>): void {
  // зачем (кнопка владельца 22.10 «Да, выложить»): старые операции «Дневного пути» ставились в очередь ДО появления
  // promotionEligibility — у них поля нет. После заплатки очереди (OTA 22.10) такая пришла и получила отказ, человек терял
  // законные монеты. Нет поля → считаем gameplay; явное excluded_compensation — по-прежнему отказ; потолок 2000 остаётся.
  if (operation.promotionEligibility !== 'gameplay' && operation.promotionEligibility !== undefined) {
    reject('invalid-argument', 'coin_wallet_source_shape_invalid', { ...fields, why: 'journey_requires_gameplay' });
  }
  if (!(COIN_WALLET_LIMITS.journeyRuneGiftIds as readonly string[]).includes(operation.giftId)) {
    reject('invalid-argument', 'coin_wallet_source_shape_invalid', { ...fields, why: 'journey_gift_not_a_denomination' });
  }
  if (operation.amount > COIN_WALLET_LIMITS.journeyMaxPerOperation) {
    reject('invalid-argument', 'coin_wallet_amount_over_limit', { ...fields, limit: COIN_WALLET_LIMITS.journeyMaxPerOperation });
  }
}

/**
 * Статическая проверка одной операции против таблицы источника (без чтений).
 * Бросает `invalid-argument` с кодом причины; ничего не пишет.
 */
export function assertCoinWalletOperationShape(
  operation: CoinWalletOperationShape,
  classification: CoinWalletClassification,
): void {
  const fields = {
    requestIdPrefix: operation.requestId.slice(0, 16),
    source: classification.source,
    lane: operation.lane,
    giftId: operation.giftId,
    amount: operation.amount,
    promotionEligibility: operation.promotionEligibility ?? null,
  };
  if (classification.source === 'report_reward') {
    assertReportShape(operation, fields);
  } else if (operation.lane !== 'base') {
    reject('invalid-argument', 'coin_wallet_source_shape_invalid', { ...fields, why: 'only_report_uses_premium_lane' });
  } else if (classification.source === 'video_full') {
    assertVideoFullShape(operation, fields);
  } else {
    assertJourneyShape(operation, fields);
  }
  log('shape_ok', fields);
}

/**
 * Накопительные лимиты (сутки UTC по серверному времени / за жизнь).
 * `siblingReportAmount` — сумма уже проведённой второй половины той же жалобы
 * (другая «полоса»), 0 если её нет. Возвращает НОВОЕ состояние счётчиков.
 */
export function applyCoinWalletLimits(
  state: CoinWalletLimitsState,
  operation: CoinWalletOperationShape,
  classification: CoinWalletClassification,
  nowMs: number,
  siblingReportAmount: number,
): CoinWalletLimitsState {
  const dayKey = coinWalletDayKey(nowMs);
  const fields = {
    requestIdPrefix: operation.requestId.slice(0, 16),
    source: classification.source,
    subSource: classification.subSource,
    amount: operation.amount,
    dayKey,
  };
  if (classification.source === 'report_reward') {
    const rewardTotal = siblingReportAmount + operation.amount;
    if (rewardTotal > COIN_WALLET_LIMITS.reportMaxPerReward) {
      reject('invalid-argument', 'coin_wallet_amount_over_limit', {
        ...fields, siblingReportAmount, rewardTotal, limit: COIN_WALLET_LIMITS.reportMaxPerReward,
      });
    }
    const used = state.reportDayKey === dayKey ? state.reportDayCoins : 0;
    if (used + operation.amount > COIN_WALLET_LIMITS.reportMaxPerDay) {
      reject('resource-exhausted', 'coin_wallet_daily_limit_reached', { ...fields, used, limit: COIN_WALLET_LIMITS.reportMaxPerDay });
    }
    log('limits_ok', { ...fields, used, after: used + operation.amount, siblingReportAmount });
    return Object.freeze({ ...state, reportDayKey: dayKey, reportDayCoins: used + operation.amount });
  }
  if (classification.source === 'daily_journey') {
    const used = state.journeyDayKey === dayKey ? state.journeyDayCoins : 0;
    if (used + operation.amount > COIN_WALLET_LIMITS.journeyMaxPerDay) {
      reject('resource-exhausted', 'coin_wallet_daily_limit_reached', { ...fields, used, limit: COIN_WALLET_LIMITS.journeyMaxPerDay });
    }
    log('limits_ok', { ...fields, used, after: used + operation.amount });
    return Object.freeze({ ...state, journeyDayKey: dayKey, journeyDayCoins: used + operation.amount });
  }
  if (classification.source === 'video_full') {
    // зачем (владелец 05.11): дневного предела на награды за видео НЕТ — только пометка аномалии для админки, отказа нет.
    const used = state.videoFullDayKey === dayKey ? state.videoFullDayCoins : 0;
    const after = used + operation.amount;
    if (after > COIN_WALLET_LIMITS.videoFullFlagPerDay) {
      console.warn(`[VIDEO-REWARD] limits_flag ${JSON.stringify({ ...fields, used, after, flagAt: COIN_WALLET_LIMITS.videoFullFlagPerDay, accepted: true })}`);
    } else {
      console.log(`[VIDEO-REWARD] limits_ok ${JSON.stringify({ ...fields, used, after })}`);
    }
    return Object.freeze({ ...state, videoFullDayKey: dayKey, videoFullDayCoins: after });
  }
  // зачем: сюда доходят только известные источники (обработаны выше); неизвестный — отказ.
  return reject('permission-denied', 'coin_wallet_source_not_allowed', { ...fields, note: 'no limits table for source' });
}
