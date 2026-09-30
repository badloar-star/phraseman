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
import { useCoinRankUpgrade } from '../../hooks/use_coin_rank_upgrade';
import { useMyProfileCard } from '../../hooks/use_my_profile_card';
import { PC, t4 } from './profile_card_copy';

const LOG = '[PROFILE-CARD]';

export type SheetKind = 'none' | 'buy' | 'style' | 'bio';
type Toast = (message: string, type?: 'error' | 'info') => void;

export function useSelfProfileCard(isMe: boolean, lang: Lang, toast: Toast) {
  const { rankBinding, next, isMaxRank, upgrading, upgrade, ceremony, dismissCeremony } = useCoinRankUpgrade();
  const { balance, forceBalanceReconcile } = useCoinBalance();
  const myCard = useMyProfileCard(isMe);
  const [balanceReconciling, setBalanceReconciling] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>('none');
  const [proBusy, setProBusy] = useState(false);

  const myPro = myCard.pro;
  const myProOwned = isMe && myPro?.owned === true && !!myPro.style;

  const eligible = isMe && isCoinRankUpgradeEligible({
    rank: rankBinding?.rank ?? null,
    balance,
    nextPrice: next?.priceToReach ?? null,
    upgrading,
    balanceReconciling,
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

  const handleUpgrade = useCallback(async () => {
    if (!eligible || !rankBinding) {
      DebugLogger.info(LOG, `повышение: кнопка неактивна ${JSON.stringify({ eligible, rank: rankBinding?.rank ?? null, balance })}`);
      return;
    }
    const result = await upgrade();
    if (result.ok) {
      if (result.status === 'already_applied') toast(t4(lang, PC.rankAlready), 'info');
      return;
    }
    DebugLogger.info(LOG, `повышение: отказ ${JSON.stringify(result)}`);
    switch (result.reason) {
      case 'insufficient_coins': {
        setBalanceReconciling(true);
        const quality = await forceBalanceReconcile();
        setBalanceReconciling(false);
        toast(t4(lang, quality === 'durable' ? PC.notEnough : PC.balanceUnknown), 'error');
        return;
      }
      case 'stale_rank':
      case 'max_rank':
        toast(t4(lang, PC.rankChanged), 'info');
        return;
      case 'identity_changed':
        toast(t4(lang, PC.accountChanged), 'error');
        return;
      default:
        toast(t4(lang, PC.failedNoCharge), 'error');
    }
  }, [balance, eligible, forceBalanceReconcile, lang, rankBinding, toast, upgrade]);

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
      if (result.reason === 'insufficient_coins') {
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
    balanceReconciling,
    eligible,
    visibleCeremony,
    dismissCeremony,
    handleUpgrade,
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
