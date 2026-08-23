import { WALLET_SUBUNITS_PER_STAR } from "../../../modules/learning-v2/contracts/wallet";
import type { StarOpRequest } from "../stars_ledger";

/**
 * Мост Learning V2 → единый журнал звёзд.
 *
 * зачем: владелец 2026-08-23 — звёзды Арены, турниров и Learning V2 это ОДНА
 * валюта (жемчужины отдельно). Кошелёк Learning V2 ведёт свой хеш-цепочный
 * учёт в подъединицах, журнал — целые звёзды. Этот модуль единственное место,
 * где одно переводится в другое, чтобы правило перевода нельзя было случайно
 * продублировать по-разному в двух местах.
 *
 * Дизайн — docs/superpowers/specs/2026-08-23-learning-v2-unified-stars-design.md
 *
 * Клиент авторитетен (D-B): телефон уже посчитал награду и открыл занятие,
 * сюда приходит свершившийся факт. Задача моста — оформить его так, чтобы
 * повторная доставка из очереди была бесплатной.
 */

/** Курс перевода один на весь мост. Подъединиц в журнале не существует. */
export const LEARNING_V2_STARS_SOURCE_KIND = "learning_v2" as const;
export const LEARNING_V2_UNLOCK_SOURCE_KIND = "learning_v2_unlock" as const;

/** Дедуп журнала: opId = `<sourceKind>:<sourceId>`, двоеточий внутри быть не может. */
const SOURCE_ID_RE = /^[A-Za-z0-9_.-]{1,96}$/;

export type LearningV2StarsBridgeErrorCode =
  | "subunits_not_whole_stars"
  | "source_id_unusable";

export class LearningV2StarsBridgeError extends Error {
  readonly code: LearningV2StarsBridgeErrorCode;
  constructor(code: LearningV2StarsBridgeErrorCode) {
    super(code);
    this.code = code;
  }
}

/**
 * Подъединицы → целые звёзды.
 *
 * зачем: дробной звезды в приложении не существует ни на одном пути (цены и
 * награды кратны звезде), поэтому остаток от деления — это порча данных, а не
 * повод округлить. Молчаливое округление здесь развело бы баланс кошелька и
 * баланс журнала, а журнал такое расхождение ловит только позже и жёстко
 * (star_ledger_inconsistent). Падаем сразу и громко.
 */
export function starsFromWalletSubunits(subunits: number): number {
  if (!Number.isSafeInteger(subunits) || subunits < 0 ||
    subunits % WALLET_SUBUNITS_PER_STAR !== 0) {
    throw new LearningV2StarsBridgeError("subunits_not_whole_stars");
  }
  return subunits / WALLET_SUBUNITS_PER_STAR;
}

function assertUsableSourceId(sourceId: string): void {
  if (!SOURCE_ID_RE.test(sourceId)) {
    throw new LearningV2StarsBridgeError("source_id_unusable");
  }
}

/**
 * Начисление за завершённое занятие.
 *
 * Возвращает null, когда начислять нечего — журнал отвергает нулевую дельту,
 * а пустая операция всё равно стоила бы записи.
 */
export function learningV2SessionStarOp(input: {
  readonly courseSessionId: string;
  readonly awardedSubunits: number;
  readonly ruleVersion: number;
  readonly earnedAtMs?: number;
}): StarOpRequest | null {
  const delta = starsFromWalletSubunits(input.awardedSubunits);
  if (delta === 0) return null;
  assertUsableSourceId(input.courseSessionId);
  return {
    opId: `${LEARNING_V2_STARS_SOURCE_KIND}:${input.courseSessionId}`,
    delta,
    reason: "learning_v2_session",
    sourceKind: LEARNING_V2_STARS_SOURCE_KIND,
    sourceId: input.courseSessionId,
    ruleVersion: input.ruleVersion,
    ...(input.earnedAtMs === undefined ? {} : { earnedAtMs: input.earnedAtMs }),
  };
}

/**
 * Списание за открытие занятия.
 *
 * зачем: курс и порядковый номер склеиваются через '_', а не ':' — двоеточие
 * разделяет sourceKind и sourceId в ключе дедупа, и внутри id оно сделало бы
 * ключ невалидным. Списание молча отвалилось бы, а занятие осталось открытым
 * (D-C: открытое не отбираем) — то есть человек учился бы бесплатно.
 */
export function learningV2UnlockStarOp(input: {
  readonly courseId: string;
  readonly requiredSessionOrdinal: number;
  readonly priceStars: number;
  readonly ruleVersion: number;
  readonly earnedAtMs?: number;
}): StarOpRequest | null {
  if (!Number.isSafeInteger(input.priceStars) || input.priceStars < 0) {
    throw new LearningV2StarsBridgeError("subunits_not_whole_stars");
  }
  // Первое занятие бесплатно — операции нет вовсе.
  if (input.priceStars === 0) return null;
  if (!Number.isSafeInteger(input.requiredSessionOrdinal) ||
    input.requiredSessionOrdinal < 0) {
    throw new LearningV2StarsBridgeError("source_id_unusable");
  }
  const sourceId = `${input.courseId}_${input.requiredSessionOrdinal}`;
  assertUsableSourceId(sourceId);
  return {
    opId: `${LEARNING_V2_UNLOCK_SOURCE_KIND}:${sourceId}`,
    delta: -input.priceStars,
    reason: "learning_v2_unlock",
    sourceKind: LEARNING_V2_UNLOCK_SOURCE_KIND,
    sourceId,
    ruleVersion: input.ruleVersion,
    ...(input.earnedAtMs === undefined ? {} : { earnedAtMs: input.earnedAtMs }),
  };
}
