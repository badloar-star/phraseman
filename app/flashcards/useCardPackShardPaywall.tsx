import React, { useCallback, useEffect, useRef, useState } from 'react';
import CardPackShardPaywallModal from './CardPackShardPaywallModal';
import type { FlashcardMarketPack } from './marketplace';
import type { Lang } from '../../constants/i18n';
import { purchaseCardPackWithShards, redeemPackGiftVoucher } from './cardPackShardPurchase';
import { isPackCeremoniallyOpened } from './openedPacksTracker';
import { navigateAfterModalClose } from '../safe_modal_navigation';
import { getShardsBalance } from '../shards_system';
import type { RuntimeStudyTarget } from '../target_storage_keys';

type Routerish = { push: (h: any) => void };

/**
 * Стан paywall-модалки (замість системного Alert) для покупки набору за осколки.
 *
 * Підтримує 3 режими:
 *  - voucher       — активний 48-год подарунок-ваучер (офіційні + community): пропонуємо
 *                    забрати безкоштовно з попередженням, що подарунок «згорить».
 *  - confirm       — звичайна покупка за осколки.
 *  - insufficient  — балансу не вистачає, кидаємо в магазин осколків.
 */
export function useCardPackShardPaywall(args: {
  balance: number;
  /** Чи активний зараз 48-год ваучер. Приходить з shards_shop / flashcards. */
  hasVoucher?: boolean;
  /** Server-verifiable Flashcard Friday window for a permanent community entitlement. */
  hasCommunityVoucher?: boolean;
  studyTarget?: RuntimeStudyTarget;
  lang: Lang;
  router: Routerish;
  onAfterPurchase: () => void | Promise<void>;
  onPurchaseStart?: (packId: string) => void;
  onPurchaseEnd?: () => void;
  onCommunityPackHiddenOnDevice?: () => void;
}): {
  openPaywall: (pack: FlashcardMarketPack) => void;
  closePaywall: () => void;
  CardPackPaywallModalEl: React.ReactNode;
} {
  const {
    balance,
    hasVoucher = false,
    hasCommunityVoucher = false,
    studyTarget,
    lang,
    router,
    onAfterPurchase,
    onPurchaseStart,
    onPurchaseEnd,
    onCommunityPackHiddenOnDevice,
  } = args;
  const [paywall, setPaywall] = useState<{
    pack: FlashcardMarketPack;
    mode: 'confirm' | 'insufficient' | 'voucher';
    displayedBalance: number;
  } | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const purchasingRef = useRef(false);
  const paywallRef = useRef(paywall);
  paywallRef.current = paywall;

  const openPaywall = useCallback(
    (pack: FlashcardMarketPack) => {
      if (purchasing) return;
      // Активний подарунок можна обміняти на будь-який доступний набір каталогу.
      // Для community постійний entitlement підтверджує захищений server callable.
      const voucherEligible = hasVoucher && (!pack.isCommunityUgc || hasCommunityVoucher);
      // Локальный balance может быть устаревшим в обе стороны. Не запираем
      // серверную покупку в «Недостаточно» до фактического ответа сервера.
      const mode: 'voucher' | 'confirm' = voucherEligible ? 'voucher' : 'confirm';
      setPaywall({ pack, mode, displayedBalance: balance });
    },
    [balance, hasCommunityVoucher, hasVoucher, purchasing],
  );

  useEffect(() => {
    if (purchasingRef.current) return;
    setPaywall((prev) => {
      if (!prev) return prev;
      const voucherEligible = hasVoucher && (!prev.pack.isCommunityUgc || hasCommunityVoucher);
      if (voucherEligible) {
        if (prev.mode === 'voucher' && prev.displayedBalance === balance) return prev;
        return { ...prev, mode: 'voucher', displayedBalance: balance };
      }
      if (prev.mode === 'insufficient') {
        // Разблокируем только после реального изменения баланса до достаточного.
        if (balance >= prev.pack.priceShards && balance !== prev.displayedBalance) {
          return { ...prev, mode: 'confirm', displayedBalance: balance };
        }
        return prev.displayedBalance === balance ? prev : { ...prev, displayedBalance: balance };
      }
      if (prev.mode === 'confirm' && prev.displayedBalance === balance) return prev;
      return { ...prev, mode: 'confirm', displayedBalance: balance };
    });
  }, [balance, hasCommunityVoucher, hasVoucher]);

  const closePaywall = useCallback(() => {
    if (purchasing) return;
    setPaywall(null);
  }, [purchasing]);

  const onConfirmPurchase = useCallback(async () => {
    if (purchasingRef.current) return;
    const pw = paywallRef.current;
    if (!pw) return;
    if (pw.mode !== 'confirm' && pw.mode !== 'voucher') return;
    purchasingRef.current = true;
    setPurchasing(true);
    onPurchaseStart?.(pw.pack.id);
    try {
      const r =
        pw.mode === 'voucher'
          ? await redeemPackGiftVoucher(pw.pack, studyTarget)
          : await purchaseCardPackWithShards(pw.pack, studyTarget);
      if (r === 'ok') {
        /** Не await: `shards_shop` тягне Firestore у `loadCardMarket` — зависший `.get()` вічно тримає «Подождите…». */
        await Promise.race([
          Promise.resolve(onAfterPurchase()).catch(() => {}),
          new Promise<void>((resolve) => setTimeout(resolve, 900)),
        ]);
        // Hearthstone-стайл: показуємо церемонію відкриття лише першого разу
        const alreadyOpened = await isPackCeremoniallyOpened(pw.pack.id, studyTarget);
        if (!alreadyOpened) {
          navigateAfterModalClose(
            () => setPaywall(null),
            () => router.push({ pathname: '/pack_opening', params: { packId: pw.pack.id } }),
          );
        } else {
          setPaywall(null);
        }
      } else if (r === 'wallet_sync_pending') {
        // Replay мог успеть обновить локальный баланс прямо во время нажатия.
        // Обновляем число в открытой модалке, но не закрываем её: повтор безопасен.
        const freshBalance = await getShardsBalance().catch(() => balance);
        setPaywall((prev) => (prev
          ? { ...prev, displayedBalance: freshBalance }
          : prev));
      } else if (r === 'insufficient') {
        // Official spend и community reconcile уже попытались зеркалировать
        // авторитетный server balance. Показываем перечитанное число.
        const freshBalance = await getShardsBalance().catch(() => balance);
        setPaywall((prev) => (prev
          ? { ...prev, mode: 'insufficient', displayedBalance: freshBalance }
          : prev));
      } else if (r === 'no_voucher' || r === 'redeem_failed') {
        // The voucher expired or the server could not confirm it. The redeem helper
        // emits the visible error; close the stale confirmation instead of leaving a
        // tappable modal that can only repeat the same failure.
        setPaywall(null);
      }
    } finally {
      purchasingRef.current = false;
      setPurchasing(false);
      onPurchaseEnd?.();
    }
  }, [balance, onAfterPurchase, onPurchaseStart, onPurchaseEnd, router, studyTarget]);

  const onGoToShards = useCallback(() => {
    navigateAfterModalClose(
      () => setPaywall(null),
      () => router.push({ pathname: '/shards_shop', params: { tab: 'catalog', source: 'card_pack_insufficient' } }),
    );
  }, [router]);

  const CardPackPaywallModalEl =
    paywall != null ? (
      <CardPackShardPaywallModal
        visible
        mode={paywall.mode}
        pack={paywall.pack}
        balance={paywall.displayedBalance}
        lang={lang}
        studyTarget={studyTarget}
        purchasing={purchasing}
        onClose={closePaywall}
        onConfirmPurchase={onConfirmPurchase}
        onGoToShards={onGoToShards}
        onCommunityPackHiddenOnDevice={onCommunityPackHiddenOnDevice}
      />
    ) : null;

  return { openPaywall, closePaywall, CardPackPaywallModalEl };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
