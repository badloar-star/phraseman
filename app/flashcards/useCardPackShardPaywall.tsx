import React, { useCallback, useEffect, useRef, useState } from 'react';
import CardPackShardPaywallModal from './CardPackShardPaywallModal';
import type { FlashcardMarketPack } from './marketplace';
import type { Lang } from '../../constants/i18n';
import { purchaseCardPackWithShards, redeemPackGiftVoucher } from './cardPackShardPurchase';
import { isPackCeremoniallyOpened } from './openedPacksTracker';
import { navigateAfterModalClose } from '../safe_modal_navigation';
import { emitAppEvent } from '../events';
import { reconcileShardsBeforePurchase } from '../shards_purchase_reconcile';
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
  const [paywall, setPaywall] = useState<{ pack: FlashcardMarketPack; mode: 'confirm' | 'insufficient' | 'voucher'; verifiedBalance: number } | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const purchasingRef = useRef(false);
  const paywallRef = useRef(paywall);
  const balanceRefreshIdRef = useRef(0);
  paywallRef.current = paywall;

  const openPaywall = useCallback(
    (pack: FlashcardMarketPack) => {
      if (purchasing) return;
      // Активний подарунок можна обміняти на будь-який доступний набір каталогу.
      // Для community постійний entitlement підтверджує захищений server callable.
      const voucherEligible = hasVoucher && (!pack.isCommunityUgc || hasCommunityVoucher);
      const mode: 'voucher' | 'confirm' | 'insufficient' = voucherEligible
        ? 'voucher'
        : balance < pack.priceShards
        ? 'insufficient'
        : 'confirm';
      const refreshId = ++balanceRefreshIdRef.current;
      setPaywall({ pack, mode, verifiedBalance: balance });
      // Модалка открывается сразу, затем сверяет локальный и серверный кошелёк.
      // Если локаль была занижена/завышена, режим меняется без повторного входа.
      void reconcileShardsBeforePurchase().then((freshBalance) => {
        if (refreshId !== balanceRefreshIdRef.current || purchasingRef.current) return;
        emitAppEvent('shards_balance_updated', { balance: freshBalance });
        setPaywall((prev) => {
          if (!prev || prev.pack.id !== pack.id) return prev;
          const freshVoucherEligible = hasVoucher && (!prev.pack.isCommunityUgc || hasCommunityVoucher);
          const freshMode: 'voucher' | 'confirm' | 'insufficient' = freshVoucherEligible
            ? 'voucher'
            : freshBalance < prev.pack.priceShards
              ? 'insufficient'
              : 'confirm';
          return { ...prev, mode: freshMode, verifiedBalance: freshBalance };
        });
      }).catch(() => {});
    },
    [balance, hasCommunityVoucher, hasVoucher, purchasing],
  );

  useEffect(() => {
    if (purchasingRef.current) return;
    setPaywall((prev) => {
      if (!prev) return prev;
      const voucherEligible = hasVoucher && (!prev.pack.isCommunityUgc || hasCommunityVoucher);
      const desiredMode = voucherEligible
        ? 'voucher'
        : balance < prev.pack.priceShards
          ? 'insufficient'
          : 'confirm';
      if (prev.mode === desiredMode && prev.verifiedBalance === balance) return prev;
      return { ...prev, mode: desiredMode, verifiedBalance: balance };
    });
  }, [balance, hasCommunityVoucher, hasVoucher]);

  const closePaywall = useCallback(() => {
    if (purchasing) return;
    balanceRefreshIdRef.current += 1;
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
      } else if (r === 'insufficient') {
        // Сервер авторитетен. Ещё раз согласуем баланс и показываем точное число,
        // чтобы пользователь не нажимал «Купить» по кругу со старым значением.
        const freshBalance = await reconcileShardsBeforePurchase();
        emitAppEvent('shards_balance_updated', { balance: freshBalance });
        setPaywall((prev) => (prev
          ? { ...prev, mode: 'insufficient', verifiedBalance: freshBalance }
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
  }, [onAfterPurchase, onPurchaseStart, onPurchaseEnd, router, studyTarget]);

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
        balance={paywall.verifiedBalance}
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
