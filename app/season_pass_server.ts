// ════════════════════════════════════════════════════════════════════════════
// season_pass_server.ts — клиентские обёртки callable'ов Season Pass.
// Сервер: functions/src/season_pass.ts. Все вызовы идемпотентны на сервере
// (маркеры в users/{uid}/season_pass/{seasonId}), сетевые ошибки безопасно
// ретраятся вызывающим кодом.
// ════════════════════════════════════════════════════════════════════════════
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { DebugLogger } from './debug-logger';
import { getSeasonPassSeasonId } from './season_pass_model';
import type { SeasonRewardKind } from './season_pass_track_config';

const REGION = 'us-central1';

export interface SeasonClaimResponse {
  ok: boolean;
  alreadyClaimed?: boolean;
  /** Серверный баланс жемчуга после начисления (для сверки optimistic-кэша). */
  shardsBalance?: number;
  /** До какого момента действует Plus (plus_days). */
  vipUntilMs?: number;
  /** Canonical remaining server-owned club gift vouchers. */
  clubGiftFreeBoostCount?: number;
  error?: string;
}

export interface SeasonBuyPassResponse {
  ok: boolean;
  alreadyOwned?: boolean;
  shardsBalance?: number;
  error?: 'insufficient_shards' | 'network' | string;
}

async function call<T>(name: string, payload: Record<string, unknown>): Promise<T | null> {
  try {
    const fn = httpsCallable(getFunctions(getApp(), REGION), name);
    const res = await fn(payload);
    return ((res as { data?: unknown } | null)?.data ?? null) as T | null;
  } catch (e) {
    DebugLogger.error(`season_pass_server:${name}`, e, 'warning');
    return null;
  }
}

/** Фиксация клейма уровня + серверная выдача (pearls/plus_days/ownership-снапшот). */
export async function seasonClaimRewardOnServer(params: {
  level: number;
  side: 'free' | 'pass';
  kind: SeasonRewardKind;
  amount?: number;
  /**
   * Снимок прогресса на момент клейма — аудит серверной выдачи.
   *
   * зачем 2026-08-03: поле звалось totalXp, но с переводом дорожки на турнирные
   * звёзды (владелец) в него кладётся другая валюта. Имя обязано соответствовать
   * содержимому, иначе серверные логи и разбор спорных выдач врут.
   */
  totalStars: number;
}): Promise<SeasonClaimResponse | null> {
  return call<SeasonClaimResponse>('seasonClaimReward', {
    seasonId: getSeasonPassSeasonId(),
    ...params,
  });
}

/** Активация серверного расходника из инвентаря (магнит/билет). */
export async function seasonRedeemConsumableOnServer(params: {
  giftId: string;
  kind: SeasonRewardKind;
}): Promise<SeasonClaimResponse | null> {
  return call<SeasonClaimResponse>('seasonRedeemConsumable', {
    seasonId: getSeasonPassSeasonId(),
    ...params,
  });
}

/** Отправка другу щита серии (+1 день chain_shield). */
export async function seasonSendFriendShieldOnServer(params: {
  giftId: string;
  friendStableId: string;
}): Promise<SeasonClaimResponse | null> {
  return call<SeasonClaimResponse>('seasonSendFriendShield', {
    seasonId: getSeasonPassSeasonId(),
    ...params,
  });
}

/** Покупка платной дорожки за жемчуг (сервер списывает и разблокирует). */
export async function seasonBuyPassOnServer(): Promise<SeasonBuyPassResponse | null> {
  return call<SeasonBuyPassResponse>('seasonBuyPass', {
    seasonId: getSeasonPassSeasonId(),
  });
}

export { REGION as SEASON_PASS_FUNCTIONS_REGION };
