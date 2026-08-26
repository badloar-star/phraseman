import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import { useStudyTarget } from '../components/StudyTargetContext';
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
  releaseUndeliveredLocalLevelSpin,
  type LocalLevelSpinReceipt,
} from './local_level_spins';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  waitForActiveAccountGeneration,
} from './account_generation';
import { applyLocalLevelSpinRewardExactlyOnce } from './local_level_spin_auto_delivery';

export default function LevelRewardSpinScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { energy, maxEnergy, reload: reloadEnergy } = useEnergy();
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
  const rewardRuntimeRef = useRef({ energy, maxEnergy, reloadEnergy, studyTarget });
  rewardRuntimeRef.current = { energy, maxEnergy, reloadEnergy, studyTarget };
  const rewardDeliveryRef = useRef<{
    requestId: string;
    promise: ReturnType<typeof applyLocalLevelSpinRewardExactlyOnce>;
  } | null>(null);

  const rewardInventory = useMemo(() => {
    if (!receipt) return null;
    try {
      return localLevelSpinReceiptToInventory(receipt);
    } catch {
      return null;
    }
  }, [receipt]);
  const rewardGift = rewardInventory?.gift;

  const beginRewardDelivery = useCallback((
    nextReceipt: LocalLevelSpinReceipt,
    accountToken = captureAccountGeneration(),
  ) => {
    const existing = rewardDeliveryRef.current;
    if (existing?.requestId === nextReceipt.requestId) return existing.promise;
    const runtime = rewardRuntimeRef.current;
    const promise = (async () => {
      const userName = (await AsyncStorage.getItem('user_name').catch(() => null)) ?? '';
      // зачем (инцидент 2026-08-26): доставка стартует сразу при получении
      // чека — аккаунт в этот момент мог быть ещё `transitioning`. В такой
      // фазе очередь XP молча отдавала staleValue, начисление НЕ выполнялось,
      // а приз считался «не доставленным» навсегда: чек не подтверждался, и
      // следующий спин возвращал его же (тот же приз, кредит не тратится).
      // Ждём активной генерации и работаем с ней, а не с протухшим токеном.
      const activeToken = isCurrentAccountGeneration(accountToken)
        ? accountToken
        : await waitForActiveAccountGeneration();
      if (!activeToken) return { success: false };
      return applyLocalLevelSpinRewardExactlyOnce(nextReceipt, {
        accountToken: activeToken,
        userName,
        currentEnergy: runtime.energy,
        maxEnergy: runtime.maxEnergy,
        setEnergy: () => { void rewardRuntimeRef.current.reloadEnergy().catch(() => {}); },
        studyTarget: runtime.studyTarget,
      });
    })();
    rewardDeliveryRef.current = { requestId: nextReceipt.requestId, promise };
    return promise;
  }, []);

  // зачем: делёвери может зависнуть (внутренний лок так и не освободился) —
  // без таймаута «ГОТОВО» ждёт бесконечно, модалка не закрывается и не даёт
  // никакой обратной связи. Таймаут НЕ отменяет саму доставку (промис из
  // rewardDeliveryRef продолжает жить и допишет журнал, когда наконец
  // разрешится) — он только перестаёт держать интерфейс в ожидании.
  const REWARD_DELIVERY_TIMEOUT_MS = 8_000;
  const settleRewardDelivery = useCallback(async (requestId: string): Promise<boolean> => {
    if (!receipt || receipt.requestId !== requestId) return false;
    const raceWithTimeout = (
      promise: ReturnType<typeof applyLocalLevelSpinRewardExactlyOnce>,
    ): ReturnType<typeof applyLocalLevelSpinRewardExactlyOnce> => Promise.race([
      promise,
      new Promise<{ success: false }>((resolve) => {
        setTimeout(() => resolve({ success: false }), REWARD_DELIVERY_TIMEOUT_MS);
      }),
    ]);
    let delivery = rewardDeliveryRef.current?.requestId === requestId
      ? rewardDeliveryRef.current.promise
      : beginRewardDelivery(receipt);
    let result = await raceWithTimeout(delivery);
    if (!result.success && !result.alreadyClaimed) {
      rewardDeliveryRef.current = null;
      delivery = beginRewardDelivery(receipt);
      result = await raceWithTimeout(delivery);
    }
    return result.success || result.alreadyClaimed === true;
  }, [beginRewardDelivery, receipt]);

  const run = useCallback(async (recoverOnly: boolean) => {
    if (busyRef.current) return;
    // зачем (инцидент 2026-08-26): раньше при неактивной фазе аккаунта экран
    // просто выходил — не делал даже recovery. Заход сразу после старта
    // приложения оставлял экран в 'recovering' навсегда. Ждём активации.
    const captured = captureAccountGeneration();
    const accountToken = isCurrentAccountGeneration(captured)
      ? captured
      : await waitForActiveAccountGeneration();
    if (!accountToken || !isCurrentAccountGeneration(accountToken)) return;
    busyRef.current = true;
    const runId = ++runIdRef.current;
    setPhase(recoverOnly ? 'recovering' : 'spinning');
    try {
      const nextReceipt = recoverOnly
        ? await recoverLocalLevelSpin()
        : await claimLocalLevelSpin();
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      if (nextReceipt) {
        void beginRewardDelivery(nextReceipt, accountToken);
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
  }, [beginRewardDelivery]);

  useEffect(() => {
    mountedRef.current = true;
    void run(true);
    const accountSubscription = subscribeAccountGeneration((accountToken) => {
      runIdRef.current += 1;
      busyRef.current = false;
      resultActionBusyRef.current = false;
      rewardDeliveryRef.current = null;
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
  }, [receipt?.requestId]);

  // зачем: владелец (2026-08-23) — раздел спина НЕ должен закрываться после
  // получения подарка. Раньше «ГОТОВО» уводило в «Подарки» даже при остатке
  // спинов: человек крутил, его выкидывало, он возвращался руками. Теперь
  // модалка гаснет, экран остаётся, барабан сам сбрасывается на receipt=null.
  //
  // зачем (2026-08-26): если доставка зависла/не удаётся (напр. внутренний лок
  // не освободился), «ГОТОВО» раньше молча ничего не делало на КАЖДЫЙ тап —
  // игрок видел зависшую модалку без единой подсказки. После нескольких
  // попыток УБИРАЕМ МОДАЛКУ (не блокируем игрока вечно), но НЕ вызываем
  // acknowledgeLocalLevelSpin — она стирает activeReceipt/pending-reveal,
  // а без подтверждённой доставки это значило бы потерять сам приз
  // безвозвратно. Чек остаётся в журнале как pending: recoverLocalLevelSpin
  // честно подберёт его на следующем входе и покажет барабан снова.
  const settleAttemptsRef = useRef(0);
  const MAX_SETTLE_ATTEMPTS = 2;
  const settleRewardPreview = useCallback(async (requestId: string | null) => {
    if (resultActionBusyRef.current) return;
    const accountToken = captureAccountGeneration();
    if (!isCurrentAccountGeneration(accountToken)) return;
    resultActionBusyRef.current = true;
    try {
      let delivered = true;
      if (requestId) {
        delivered = await settleRewardDelivery(requestId);
        if (!delivered) {
          settleAttemptsRef.current += 1;
          if (settleAttemptsRef.current < MAX_SETTLE_ATTEMPTS) return;
        }
      }
      settleAttemptsRef.current = 0;
      // зачем: доставка удалась — гасим чек штатно. Провалилась окончательно —
      // ВОЗВРАЩАЕМ спин в кредит, иначе чек залипает и следующий спин отдаёт
      // тот же приз без списания (инцидент «всегда 20 жемчужин»).
      let refunded = false;
      if (requestId) {
        if (delivered) await acknowledgeLocalLevelSpin(requestId);
        else refunded = await releaseUndeliveredLocalLevelSpin(requestId);
      }
      setRewardPreviewVisible(false);
      setReceipt(null);
      rewardDeliveryRef.current = null;
      if (refunded) {
        // Кредит вернулся — перечитываем реальный баланс, а не гадаем.
        void run(true);
        return;
      }
      setPhase((balance ?? 0) > 0 ? 'idle' : 'empty');
    } catch {
      // Журнал переживёт: recoverLocalLevelSpin подберёт неподтверждённый чек
      // при следующем входе. Экран из-за этого ломать нельзя.
    } finally {
      resultActionBusyRef.current = false;
    }
  }, [balance, run, settleRewardDelivery]);

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
        const delivered = await settleRewardDelivery(receipt.requestId);
        // зачем: провал доставки больше не запирает экран — чек возвращается
        // в кредит, спин снова доступен и разыграет НОВЫЙ приз.
        if (!delivered) {
          const refunded = await releaseUndeliveredLocalLevelSpin(receipt.requestId);
          if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
          if (refunded) {
            setReceipt(null);
            rewardDeliveryRef.current = null;
            await run(true);
          }
          return;
        }
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
  }, [balance, receipt, run, settleRewardDelivery]);

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
            ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
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
              en: 'Spins: loading count',
              es: 'Cargando giros', 'pt-BR': 'Carregando giros', vi: 'Đang tải lượt quay',
              id: 'Memuat putaran', tr: 'Çevirmeler yükleniyor', pl: 'Wczytywanie spinów',
            })
            : triLang(lang, {
              ru: `Спины: ${balance}`, uk: `Спіни: ${balance}`, en: `Spins: ${balance}`, es: `Giros: ${balance}`,
              'pt-BR': `Giros: ${balance}`, vi: `Lượt quay: ${balance}`, id: `Putaran: ${balance}`,
              tr: `Çevirmeler: ${balance}`, pl: `Spiny: ${balance}`,
            })}
          style={[styles.balancePill, { backgroundColor: t.goldBg }]}
        >
          <Text style={[styles.balanceLabel, { color: t.gold }]}>
            {triLang(lang, {
              ru: 'Спины', uk: 'Спіни', en: 'Spins', es: 'Giros', 'pt-BR': 'Giros',
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
