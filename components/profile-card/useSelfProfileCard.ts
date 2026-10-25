// ─── Своя визитка: повышение ранга, «Про», стиль, свой текст — действия ───────
// зачем: вся «своя» механика визитки в одном месте, чтобы PlayerProfileModal
// оставался раскладкой. Правила те же, что у экрана «Ранг игрока» (app/coin_rank.tsx):
// кнопка активна только при известном балансе, отказ «не хватает монет» сверяет
// кошелёк, церемония показывается, только когда показанный ранг уже новый.
import { useCallback, useEffect, useState } from 'react';

import { captureAccountGeneration } from '../../app/account_generation';
import { DebugLogger } from '../../app/debug-logger';
import type { ProfileCardProStyle } from '../../app/profile_card_styles';
import type { Lang } from '../../constants/i18n';
import {
  isCoinRankCeremonyBindingCurrent,
  isCoinRankUpgradeEligible,
} from '../../hooks/coin_rank_upgrade_guard';
import { useCoinBalance } from '../../hooks/use_coin_balance';
import { COIN_RANK_MAX, nextCoinRankRow } from '../../app/coin_rank_table_v1';
import type { CoinRankCeremony } from '../../hooks/use_coin_rank_upgrade';
import { useMyCoinRankBinding } from '../../hooks/use_my_coin_rank';
import { useMyProfileCard } from '../../hooks/use_my_profile_card';
import { PC, t4 } from './profile_card_copy';

const LOG = '[PROFILE-CARD]';

export type SheetKind = 'none' | 'buy' | 'style' | 'bio';
type Toast = (message: string, type?: 'error' | 'info') => void;

export function useSelfProfileCard(isMe: boolean, lang: Lang, toast: Toast) {
  // зачем (координатор 05.10, Сверка 04:45: «Повысить ранг · 6 000» на визитке списывал монеты одним тапом): визитка
  // больше НЕ тратит и хук траты (use_coin_rank_upgrade) не подключает вовсе — только чтение ранга. Кнопка ведёт на
  // экран подтверждения app/coin_rank.tsx (coins.html №3/№4): стоимость, баланс, «Проверяем повышение», трата
  // только по его кнопке. «Идёт повышение» и церемония жили в экземпляре хука траты визитки — раз визитка не
  // повышает, они у неё всегда пусты (церемония идёт на экране coin_rank).
  // Сторож: tests/profile_card_rank_upgrade_confirm_only.test.ts.
  const rankBinding = useMyCoinRankBinding();
  const rank = rankBinding?.rank ?? null;
  const next = rank === null ? null : nextCoinRankRow(rank);
  const isMaxRank = rank === COIN_RANK_MAX;
  const upgrading = false;
  // Тип задан через as: иначе TypeScript сузил бы константу до null, и чтение полей церемонии ниже не прошло бы проверку.
  const ceremony = null as CoinRankCeremony | null;
  const dismissCeremony = useCallback(() => undefined, []);
  const { balance, forceBalanceReconcile } = useCoinBalance();
  const myCard = useMyProfileCard(isMe);
  const [sheet, setSheet] = useState<SheetKind>('none');
  const [proBusy, setProBusy] = useState(false);

  const myPro = myCard.pro;
  const myProOwned = isMe && myPro?.owned === true && !!myPro.style;

  const eligible = isMe && isCoinRankUpgradeEligible({
    rank: rankBinding?.rank ?? null,
    balance,
    nextPrice: next?.priceToReach ?? null,
    upgrading,
    // Сверка баланса после отказа «не хватает монет» теперь живёт только на экране coin_rank.
    balanceReconciling: false,
  });
  const visibleCeremony = isMe && isCoinRankCeremonyBindingCurrent(ceremony, rankBinding, captureAccountGeneration())
    ? ceremony
    : null;
  const ceremonyKey = ceremony ? `${ceremony.fromRank}>${ceremony.toRank}|${rankBinding?.rank ?? 'null'}|${visibleCeremony ? 'show' : 'hide'}` : null;
  useEffect(() => {
    if (!ceremonyKey || !ceremony) return;
    DebugLogger.info(LOG, `повышение: показывать ли в визитке ${JSON.stringify({
      from: ceremony.fromRank, to: ceremony.toRank, displayedRank: rankBinding?.rank ?? null, visible: visibleCeremony !== null,
    })}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremonyKey]);

  /** Повышение ранга с визитки — только навигация на экран подтверждения; см. комментарий выше. */
  const describeRankUpgradeTap = useCallback(() => {
    DebugLogger.info(LOG, `повышение: открываем экран подтверждения ${JSON.stringify({
      rank: rankBinding?.rank ?? null, balance, eligible, nextPrice: next?.priceToReach ?? null,
    })}`);
  }, [balance, eligible, next, rankBinding]);

  const handleProConfirm = useCallback(async (style: ProfileCardProStyle) => {
    if (proBusy) {
      DebugLogger.info(LOG, 'про: повторный тап во время операции — игнорируем');
      return;
    }
    setProBusy(true);
    try {
      if (sheet === 'style') {
        const result = await myCard.changeStyle(style);
        if (result.ok) setSheet('none');
        else toast(t4(lang, PC.styleFailed), 'error');
        return;
      }
      const result = await myCard.purchase(style);
      if (result.ok) {
        setSheet('none');
        toast(t4(lang, result.status === 'purchased' ? PC.bought : PC.alreadyPro), 'info');
        return;
      }
      if (result.reason === 'coins_saving') {
        // зачем (координатор 25.10, [COIN-SPEND-GAP]): цена между кошельком и показанным числом, досылка не удалась — «монеты ещё сохраняются», а не «не хватает»
        const [{ coinsSavingToast }, { emitAppEvent }] = await Promise.all([import('../../app/coin_spend_gap'), import('../../app/events')]);
        emitAppEvent('action_toast', coinsSavingToast());
      } else if (result.reason === 'insufficient_coins') {
        const quality = await forceBalanceReconcile();
        toast(t4(lang, quality === 'durable' ? PC.notEnough : PC.balanceUnknown), 'error');
      } else if (result.reason === 'identity_changed') {
        toast(t4(lang, PC.accountChanged), 'error');
      } else {
        toast(t4(lang, PC.failedNoCharge), 'error');
      }
    } catch (error) {
      DebugLogger.warn(LOG, `про: сбой операции ${JSON.stringify({ error: String(error) })}`);
      toast(t4(lang, PC.failedNoCharge), 'error');
    } finally {
      setProBusy(false);
    }
  }, [forceBalanceReconcile, lang, myCard, proBusy, sheet, toast]);

  const handleSaveBio = useCallback((text: string) => {
    if (!myProOwned) {
      DebugLogger.info(LOG, 'свой текст: не «Про» — сохранение не запускаем');
      return;
    }
    // Optimistic: шторка закрывается сразу, текст уже на визитке; сбой — откат + причина.
    setSheet('none');
    void myCard.saveBio(text).then((result) => {
      if (result.ok) {
        toast(t4(lang, PC.bioSaved), 'info');
        return;
      }
      const copy = {
        profanity: PC.bioProfanity,
        too_long: PC.bioTooLong,
        line_break: PC.bioLineBreak,
        control_char: PC.bioControl,
        rate_limited: PC.bioRate,
        pro_required: PC.bioPro,
        offline: PC.bioOffline,
        failed: PC.bioFailed,
      }[result.reason];
      toast(t4(lang, copy), 'error');
    });
  }, [lang, myCard, myProOwned, toast]);

  return {
    next,
    isMaxRank,
    upgrading,
    balance,
    eligible,
    visibleCeremony,
    dismissCeremony,
    describeRankUpgradeTap,
    myPro,
    myProOwned,
    myBio: myCard.bio,
    bioSaving: myCard.bioSaving,
    sheet,
    setSheet,
    proBusy,
    handleProConfirm,
    handleSaveBio,
  };
}
