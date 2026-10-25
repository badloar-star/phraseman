// ═══ Визитка «Про»: покупка за монеты, стиль, кэш своего текста (D73/D93/D114) ═══
// зачем (владелец 2026-09-30): «Про визитка» — 10 000 монет (PM-185, та же константа
// PROFILE_CARD_UPGRADE_PRICE_COINS), стиль A–F выбирается СРАЗУ при покупке и потом
// меняется бесплатно. Кошелёк монет = рунный кошелёк, поэтому покупка идёт тем же
// путём, что и повышение ранга (app/coin_rank_upgrade_v1.ts): prepareRuneSpend готовит
// записи траты, НИЧЕГО не пишет, а мы кладём их ОДНИМ multiSet вместе с правом «Про».
// «Монеты сняли, а Про не дали» невозможно по построению.
//
// Идемпотентность: operationId `profile_card_pro:v1` один на аккаунт. Повторный тап /
// ретрай найдёт уже записанную трату и выдаст «Про» без второй цены.
// Офлайн: сети в покупке нет (телефон авторитетен, как у всех рунных трат); публичный
// профиль (виден другим) обновляется best effort после записи на диск.
// Состояние и кэш — app/profile_card_pro_state_v1.ts.
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { DebugLogger } from './debug-logger';
import { prepareRuneSpend, publishRuneSpend } from './level_spin_star_grants';
import { PROFILE_CARD_UPGRADE_PRICE_COINS } from './profile_card_system';
import {
  parseProfileCardProState,
  profileCardProStateKey,
  publishProfileCardPro,
  type ProfileCardProStateV1,
} from './profile_card_pro_state_v1';
import { isProfileCardProStyle, type ProfileCardProStyle } from './profile_card_styles';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { withStorageLock } from './storage_mutex';

const LOG = '[PROFILE-CARD]';

function trace(message: string, data?: Record<string, unknown>): void {
  DebugLogger.info(LOG, data ? `${message} ${JSON.stringify(data)}` : message);
}

/** Цена «Про визитки» в монетах — из решения PM-185, не своя копия. */
export const PROFILE_CARD_PRO_PRICE_COINS: number = PROFILE_CARD_UPGRADE_PRICE_COINS;
export const PROFILE_CARD_PRO_OPERATION_ID = 'profile_card_pro:v1';

export type ProfileCardProPurchaseResult =
  | Readonly<{ ok: true; status: 'purchased'; style: ProfileCardProStyle; price: number; balanceAfter: number; recovered: boolean }>
  | Readonly<{ ok: true; status: 'already_owned'; style: ProfileCardProStyle }>
  | Readonly<{
      ok: false;
      reason: 'identity_changed' | 'invalid_style' | 'insufficient_coins' | 'coins_saving' | 'state_corrupt' | 'failed';
      price?: number;
    }>;

function syncPublicProfile(token: AccountGenerationToken, owner: string): void {
  // Публичная визитка — best effort после durable multiSet. Сеть не имеет права
  // откатить уже состоявшуюся покупку.
  try {
    void syncPublicProfileSnapshot({ reason: 'display_change' }, token).catch((error: unknown) => {
      DebugLogger.warn(LOG, `публичный профиль не обновился (повторит следующая синхронизация) ${JSON.stringify({ owner, error: String(error) })}`);
    });
  } catch (error) {
    DebugLogger.warn(LOG, `публичный профиль: синхронный сбой ${JSON.stringify({ owner, error: String(error) })}`);
  }
}

async function purchaseProfileCardProOnce(
  input: Readonly<{ token: AccountGenerationToken; style: ProfileCardProStyle; nowMs?: number }>,
): Promise<ProfileCardProPurchaseResult> {
  const { token, style } = input;
  const owner = token.stableId?.trim() ?? '';
  trace('покупка: вход', { owner: owner || null, generation: token.generation, phase: token.phase, style });
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    trace('покупка: отказ — аккаунт сменился или не активен', { owner: owner || null });
    return { ok: false, reason: 'identity_changed' };
  }
  if (!isProfileCardProStyle(style)) {
    trace('покупка: отказ — неизвестный стиль', { style });
    return { ok: false, reason: 'invalid_style' };
  }
  try {
    return await withAccountTransitionLock(async (lease) => withStorageLock(async (storageLease) => {
      if (!isCurrentAccountGeneration(token, owner)) {
        trace('покупка: отказ — аккаунт сменился под замком', { owner });
        return { ok: false, reason: 'identity_changed' } as const;
      }
      const key = profileCardProStateKey(owner);
      let state: ProfileCardProStateV1;
      try {
        state = parseProfileCardProState(await AsyncStorage.getItem(key), owner);
      } catch (error) {
        DebugLogger.warn(LOG, `покупка: запись «Про» битая, списания нет ${JSON.stringify({ owner, error: String(error) })}`);
        return { ok: false, reason: 'state_corrupt' } as const;
      }
      if (state.owned && state.style) {
        publishProfileCardPro(owner, state);
        trace('покупка: «Про» уже есть — второй цены нет', { owner, style: state.style });
        return { ok: true, status: 'already_owned', style: state.style } as const;
      }
      const price = PROFILE_CARD_PRO_PRICE_COINS;
      const spend = await prepareRuneSpend({
        token,
        operationId: PROFILE_CARD_PRO_OPERATION_ID,
        kind: 'profile_card_pro',
        subjectId: 'profile_card_pro',
        price,
        createdAtMs: input.nowMs,
      }, lease, storageLease);
      if (!spend.ok) {
        trace('покупка: отказ — не хватает монет', { owner, price, reason: spend.reason });
        return { ok: false, reason: 'insufficient_coins', price } as const;
      }
      trace('покупка: трата подготовлена', {
        owner, price, alreadySpent: spend.alreadySpent, balanceBefore: spend.balanceBefore, balanceAfter: spend.balanceAfter,
      });
      const atMs = input.nowMs ?? Date.now();
      const nextState: ProfileCardProStateV1 = Object.freeze({
        ...state,
        owned: true,
        style,
        purchase: Object.freeze({ operationId: PROFILE_CARD_PRO_OPERATION_ID, price, atMs, style }),
      });
      // зачем одним multiSet: трата и «Про» ложатся вместе или не ложатся вовсе.
      await AsyncStorage.multiSet([
        ...spend.durableWrites.map(([k, v]) => [k, v] as [string, string]),
        [key, JSON.stringify(nextState)],
      ]);
      publishRuneSpend(token, spend);
      publishProfileCardPro(owner, nextState);
      syncPublicProfile(token, owner);
      trace('покупка: «Про» выдана', { owner, style, price, balanceAfter: spend.balanceAfter, recovered: spend.alreadySpent });
      return {
        ok: true, status: 'purchased', style, price, balanceAfter: spend.balanceAfter, recovered: spend.alreadySpent,
      } as const;
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'level_spin_star_identity_changed') {
      trace('покупка: отказ — аккаунт сменился во время траты', { owner });
      return { ok: false, reason: 'identity_changed' };
    }
    DebugLogger.error('profile_card_pro_purchase', error instanceof Error ? error : new Error(message), 'warning');
    DebugLogger.warn(LOG, `покупка: сбой, ничего не опубликовано ${JSON.stringify({ owner, error: message })}`);
    return { ok: false, reason: 'failed' };
  }
}

export type ProfileCardStyleChangeResult =
  | Readonly<{ ok: true; style: ProfileCardProStyle }>
  | Readonly<{ ok: false; reason: 'identity_changed' | 'invalid_style' | 'not_owned' | 'state_corrupt' | 'failed' }>;

/** Бесплатная смена стиля владельцем «Про». */
export async function setProfileCardProStyle(
  input: Readonly<{ token: AccountGenerationToken; style: ProfileCardProStyle }>,
): Promise<ProfileCardStyleChangeResult> {
  const { token, style } = input;
  const owner = token.stableId?.trim() ?? '';
  trace('стиль: вход', { owner: owner || null, style });
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    trace('стиль: отказ — аккаунт сменился', { owner: owner || null });
    return { ok: false, reason: 'identity_changed' };
  }
  if (!isProfileCardProStyle(style)) {
    trace('стиль: отказ — неизвестный стиль', { style });
    return { ok: false, reason: 'invalid_style' };
  }
  try {
    return await withAccountTransitionLock(async () => withStorageLock(async () => {
      if (!isCurrentAccountGeneration(token, owner)) {
        trace('стиль: отказ — аккаунт сменился под замком', { owner });
        return { ok: false, reason: 'identity_changed' } as const;
      }
      const key = profileCardProStateKey(owner);
      let state: ProfileCardProStateV1;
      try {
        state = parseProfileCardProState(await AsyncStorage.getItem(key), owner);
      } catch (error) {
        DebugLogger.warn(LOG, `стиль: запись битая ${JSON.stringify({ owner, error: String(error) })}`);
        return { ok: false, reason: 'state_corrupt' } as const;
      }
      if (!state.owned) {
        trace('стиль: отказ — «Про» не куплена', { owner });
        return { ok: false, reason: 'not_owned' } as const;
      }
      if (state.style === style) {
        trace('стиль: тот же стиль — записи нет', { owner, style });
        return { ok: true, style } as const;
      }
      const nextState: ProfileCardProStateV1 = Object.freeze({ ...state, style });
      await AsyncStorage.setItem(key, JSON.stringify(nextState));
      publishProfileCardPro(owner, nextState);
      syncPublicProfile(token, owner);
      trace('стиль: сменён', { owner, from: state.style, to: style });
      return { ok: true, style } as const;
    }));
  } catch (error) {
    DebugLogger.warn(LOG, `стиль: сбой ${JSON.stringify({ owner, error: String(error) })}`);
    return { ok: false, reason: 'failed' };
  }
}

// зачем (координатор 25.10, [COIN-SPEND-GAP]): на экране кошелёк + ожидающие монеты Пика, тратить можно только влитый кошелёк.
// Цена в этом разрыве → досылаем очередь Пика ВНЕ замков покупки и повторяем один раз; не вышло → coins_saving («монеты ещё сохраняются»).
export async function purchaseProfileCardPro(
  input: Readonly<{ token: AccountGenerationToken; style: ProfileCardProStyle; nowMs?: number }>,
): Promise<ProfileCardProPurchaseResult> {
  const { purchaseWithSpendGap } = await import('./coin_spend_gap');
  return purchaseWithSpendGap<ProfileCardProPurchaseResult>(
    'profile_card_pro',
    () => purchaseProfileCardProOnce(input),
    (r) => (!r.ok && r.reason === 'insufficient_coins' ? r.price ?? PROFILE_CARD_PRO_PRICE_COINS : null),
    (r) => (r.ok ? r : { ...r, reason: 'coins_saving' as const }),
  );
}
