import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import LevelSpinRewardModal from '../components/LevelSpinRewardModal';
import LevelSpinFinishLine, {
  type LevelSpinFinishLinePhase,
} from '../components/LevelSpinFinishLine';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import {
  acknowledgeLocalLevelSpin,
  claimLocalLevelSpin,
  localLevelSpinReceiptToInventory,
  readLocalLevelSpinBalance,
  recoverLocalLevelSpin,
  type LocalLevelSpinReceipt,
} from './local_level_spins';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from './account_generation';

export default function LevelRewardSpinScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const resultActionBusyRef = useRef(false);
  const runIdRef = useRef(0);
  const [phase, setPhase] = useState<LevelSpinFinishLinePhase>('recovering');
  const [balance, setBalance] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<LocalLevelSpinReceipt | null>(null);
  const [rewardPreviewVisible, setRewardPreviewVisible] = useState(false);

  const rewardInventory = useMemo(() => {
    if (!receipt) return null;
    try {
      return localLevelSpinReceiptToInventory(receipt);
    } catch {
      return null;
    }
  }, [receipt]);
  const rewardGift = rewardInventory?.gift;

  const run = useCallback(async (recoverOnly: boolean) => {
    if (busyRef.current) return;
    const accountToken = captureAccountGeneration();
    if (!isCurrentAccountGeneration(accountToken)) return;
    busyRef.current = true;
    const runId = ++runIdRef.current;
    setPhase(recoverOnly ? 'recovering' : 'spinning');
    try {
      const nextReceipt = recoverOnly
        ? await recoverLocalLevelSpin()
        : await claimLocalLevelSpin();
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      if (nextReceipt) {
        setReceipt(nextReceipt);
        setBalance(nextReceipt.balanceAfter);
        setPhase('spinning');
        return;
      }
      const localBalance = await readLocalLevelSpinBalance();
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      setBalance(localBalance);
      setPhase(localBalance > 0 ? 'idle' : 'empty');
    } catch {
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      const localBalance = await readLocalLevelSpinBalance().catch(() => 0);
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      setBalance(localBalance);
      setPhase(localBalance > 0 ? 'idle' : 'empty');
    } finally {
      if (runIdRef.current === runId) busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void run(true);
    const accountSubscription = subscribeAccountGeneration((accountToken) => {
      runIdRef.current += 1;
      busyRef.current = false;
      resultActionBusyRef.current = false;
      setReceipt(null);
      setRewardPreviewVisible(false);
      setBalance(null);
      setPhase('recovering');
      if (accountToken.phase === 'active') queueMicrotask(() => { void run(true); });
    });
    return () => {
      mountedRef.current = false;
      accountSubscription.remove();
    };
  }, [run]);

  const handleRevealed = useCallback((requestId: string) => {
    const accountToken = captureAccountGeneration();
    if (!isCurrentAccountGeneration(accountToken) || receipt?.requestId !== requestId) return;
    setPhase('revealed');
    setRewardPreviewVisible(true);
    void acknowledgeLocalLevelSpin(requestId).catch(() => {});
  }, [receipt?.requestId]);

  // зачем: владелец (2026-08-23) — раздел спина НЕ должен закрываться после
  // получения подарка. Раньше «ГОТОВО» уводило в «Подарки» даже при остатке
  // спинов: человек крутил, его выкидывало, он возвращался руками. Теперь
  // модалка гаснет, экран остаётся, барабан сам сбрасывается на receipt=null.
  const settleRewardPreview = useCallback(async (requestId: string | null) => {
    if (resultActionBusyRef.current) return;
    const accountToken = captureAccountGeneration();
    if (!isCurrentAccountGeneration(accountToken)) return;
    resultActionBusyRef.current = true;
    // Оптимистично: модалка гаснет мгновенно, журнал догоняет фоном —
    // награда уже сохранена локально в момент claim, ждать нечего.
    setRewardPreviewVisible(false);
    setReceipt(null);
    setPhase((balance ?? 0) > 0 ? 'idle' : 'empty');
    try {
      if (requestId) await acknowledgeLocalLevelSpin(requestId);
    } catch {
      // Журнал переживёт: recoverLocalLevelSpin подберёт неподтверждённый чек
      // при следующем входе. Экран из-за этого ломать нельзя.
    } finally {
      resultActionBusyRef.current = false;
    }
  }, [balance]);

  const handleRewardPreviewClaim = useCallback(() => {
    void settleRewardPreview(receipt?.requestId ?? null);
  }, [receipt?.requestId, settleRewardPreview]);

  const handleRewardPreviewClose = useCallback(() => {
    void settleRewardPreview(receipt?.requestId ?? null);
  }, [receipt?.requestId, settleRewardPreview]);

  const handleResultAction = useCallback(async () => {
    if (resultActionBusyRef.current) return;
    const accountToken = captureAccountGeneration();
    if (!isCurrentAccountGeneration(accountToken)) return;
    resultActionBusyRef.current = true;
    try {
      if (receipt) {
        await acknowledgeLocalLevelSpin(receipt.requestId);
        if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      }
      setReceipt(null);
      if ((balance ?? 0) > 0) {
        await run(false);
        return;
      }
      // зачем: спинов больше нет — но экран всё равно остаётся открытым.
      // Уход отсюда делает только стрелка «Назад» в шапке.
      setPhase('empty');
    } catch {
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      setPhase((balance ?? 0) > 0 ? 'idle' : 'empty');
    } finally {
      resultActionBusyRef.current = false;
    }
  }, [balance, receipt, run]);

  return (
    <SafeAreaView
      edges={[]}
      style={[
        styles.root,
        {
          backgroundColor: t.bgPrimary,
          paddingTop: Math.max(12, insets.top),
          paddingBottom: Math.max(12, insets.bottom),
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar',
            vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
          })}
          hitSlop={12}
          onPress={() => safeRouterBack(router, '/level_gifts_inventory' as never)}
          style={[styles.backButton, { backgroundColor: t.bgSurface }]}
        >
          <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
        </Pressable>
        <View style={styles.headerSpacer} />
        <View
          accessible
          accessibilityLabel={balance === null
            ? triLang(lang, {
              ru: 'Спины: количество загружается', uk: 'Спіни: кількість завантажується',
              es: 'Cargando giros', 'pt-BR': 'Carregando giros', vi: 'Đang tải lượt quay',
              id: 'Memuat putaran', tr: 'Çevirmeler yükleniyor', pl: 'Wczytywanie spinów',
            })
            : triLang(lang, {
              ru: `Спины: ${balance}`, uk: `Спіни: ${balance}`, es: `Giros: ${balance}`,
              'pt-BR': `Giros: ${balance}`, vi: `Lượt quay: ${balance}`, id: `Putaran: ${balance}`,
              tr: `Çevirmeler: ${balance}`, pl: `Spiny: ${balance}`,
            })}
          style={[styles.balancePill, { backgroundColor: t.goldBg }]}
        >
          <Text style={[styles.balanceLabel, { color: t.gold }]}>
            {triLang(lang, {
              ru: 'Спины', uk: 'Спіни', es: 'Giros', 'pt-BR': 'Giros',
              vi: 'Lượt', id: 'Putaran', tr: 'Çevirmeler', pl: 'Spiny',
            })}
          </Text>
          <View testID="level-spin-balance-count" style={[styles.balanceCount, { backgroundColor: `${t.gold}22` }]}>
            <Text style={[styles.balanceCountText, { color: t.gold }]}>{balance ?? '…'}</Text>
          </View>
        </View>
      </View>

      <LevelSpinFinishLine
        lang={lang}
        phase={phase}
        balance={balance}
        receipt={receipt}
        onSpin={() => { void run(false); }}
        onRetry={() => { void run(false); }}
        onAgain={() => { void handleResultAction(); }}
        onRevealed={handleRevealed}
      />
      <LevelSpinRewardModal
        visible={rewardPreviewVisible}
        gift={rewardGift ?? null}
        giftId={receipt?.baseGiftId ?? null}
        lang={lang}
        isPremium={false}
        requestId={receipt?.requestId ?? null}
        onClaim={() => { void handleRewardPreviewClaim(); }}
        onClose={handleRewardPreviewClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { flex: 1 },
  balancePill: {
    minWidth: 112,
    minHeight: 44,
    borderRadius: 14,
    paddingLeft: 13,
    paddingRight: 7,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: { fontSize: 14, fontWeight: '900' },
  balanceCount: { minWidth: 30, height: 30, borderRadius: 10, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  balanceCountText: { fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
