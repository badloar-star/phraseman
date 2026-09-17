import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  claimLocalLevelSpinWithRunes,
  localLevelSpinReceiptToInventory,
  readLocalLevelSpinBalance,
  recoverLocalLevelSpin,
  type LocalLevelSpinReceipt,
} from './local_level_spins';
import { DebugLogger } from './debug-logger';
import { PAID_LEVEL_SPIN_RUNE_PRICE } from './level_spin_star_grants';
import { isInstantLevelSpinReward } from './level_spin_reward_delivery_channel';
import { applyLocalLevelSpinRewardExactlyOnce } from './local_level_spin_auto_delivery';
import { getRunesBalance, peekRunes, subscribeRunesSnapshot } from './runes_system';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import FeatureIntroEntry from '../components/feature_intro/FeatureIntroEntry';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  waitForActiveAccountGeneration,
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
  const [runeBalance, setRuneBalance] = useState(() => peekRunes());
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

  const runPaid = useCallback(async () => {
    if (busyRef.current || runeBalance < PAID_LEVEL_SPIN_RUNE_PRICE) return;
    const captured = captureAccountGeneration();
    const accountToken = isCurrentAccountGeneration(captured)
      ? captured
      : await waitForActiveAccountGeneration();
    if (!accountToken || !isCurrentAccountGeneration(accountToken)) return;
    busyRef.current = true;
    const runId = ++runIdRef.current;
    setPhase('spinning');
    try {
      const nextReceipt = await claimLocalLevelSpinWithRunes();
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      setReceipt(nextReceipt);
      setBalance(nextReceipt.balanceAfter);
      setRuneBalance((await getRunesBalance()).balance);
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      setPhase('spinning');
    } catch {
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      const [localBalance, runes] = await Promise.all([
        readLocalLevelSpinBalance().catch(() => 0),
        getRunesBalance().catch(() => ({ balance: peekRunes(), earnedTotal: 0 })),
      ]);
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      setBalance(localBalance);
      setRuneBalance(runes.balance);
      setPhase(localBalance > 0 ? 'idle' : 'empty');
    } finally {
      if (runIdRef.current === runId) busyRef.current = false;
    }
  }, [runeBalance]);

  useEffect(() => {
    let active = true;
    void getRunesBalance().then((next) => {
      if (active) setRuneBalance(next.balance);
    });
    const unsubscribe = subscribeRunesSnapshot((next) => {
      if (active) setRuneBalance(next.balance);
    });
    return () => {
      active = false;
      unsubscribe();
    };
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
      setRuneBalance(peekRunes());
      setPhase('recovering');
      if (accountToken.phase === 'active') queueMicrotask(() => {
        void getRunesBalance().then((next) => setRuneBalance(next.balance));
        void run(true);
      });
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
  // зачем: мгновенная выдача валюты/опыта. Энергия сюда не приходит (она в
  // канале inventory), поэтому передаём нули как безусловно безопасные: ни одна
  // instant-ветка applyGift их не читает. Имя берём из того же ключа, что и
  // экран «Подарки» — оно попадает в событие XP, подставлять заглушку нельзя.
  const applyInstantSpinReward = useCallback(async (receiptToApply: LocalLevelSpinReceipt) => {
    const accountToken = captureAccountGeneration();
    if (!isCurrentAccountGeneration(accountToken)) {
      DebugLogger.warn(
        'level_reward_spin:instant_skip_account_changed',
        `[GIFT-DELIVERY] instant delivery skipped: account generation changed.`
        + ` giftId=${receiptToApply.baseGiftId} requestId=${receiptToApply.requestId}`,
      );
      return;
    }
    const storedName = await AsyncStorage.getItem('user_name').catch((e: unknown) => {
      DebugLogger.error(
        'level_reward_spin:user_name_read',
        e instanceof Error ? e : new Error(String(e)),
        'warning',
      );
      return null;
    });
    const result = await applyLocalLevelSpinRewardExactlyOnce(receiptToApply, {
      accountToken,
      userName: storedName || '',
      currentEnergy: 0,
      maxEnergy: 0,
      setEnergy: () => {},
    });
    DebugLogger.info(
      'level_reward_spin:instant_applied',
      `[GIFT-DELIVERY] instant delivery giftId=${receiptToApply.baseGiftId}`
      + ` requestId=${receiptToApply.requestId} success=${String(result.success)}`
      + ` alreadyClaimed=${String(result.alreadyClaimed)}`,
    );
  }, []);

  const settleRewardPreview = useCallback(async (
    requestId: string | null,
    // зачем: расписку передаём значением, а не читаем из state внутри — между
    // тапом и этим кодом состояние могло обнулиться (сброс барабана, смена
    // аккаунта), и мгновенный приз молча не начислился бы.
    settledReceipt: LocalLevelSpinReceipt | null,
  ) => {
    if (resultActionBusyRef.current) return;
    const accountToken = captureAccountGeneration();
    if (!isCurrentAccountGeneration(accountToken)) return;
    resultActionBusyRef.current = true;
    // зачем (Optimistic UI, владелец): модалка гаснет НЕМЕДЛЕННО, до записи в
    // хранилище. В первой версии этой правки закрытие стояло ПОСЛЕ `await` —
    // кнопка давала хаптик и звук, а окно ещё висело, пока шла выдача. Награда
    // уже показана на экране, ждать её записи пользователю незачем.
    setRewardPreviewVisible(false);
    setReceipt(null);
    setPhase((balance ?? 0) > 0 ? 'idle' : 'empty');
    try {
      // зачем (владелец, 2026-09-17): «я не хочу, чтобы мне ещё заходить надо
      // было и их как-то активировать… должно сразу показывать изменения в
      // счётчике рун». Валюта и опыт применяются здесь же, плитка в «Подарках»
      // не создаётся. Энергия, расходники с длительностью и косметика остаются
      // отложенными — их владелец включает сам, когда они нужны (полная
      // энергия при полной шкале сгорела бы впустую).
      if (settledReceipt && isInstantLevelSpinReward(settledReceipt.baseGiftId)) {
        await applyInstantSpinReward(settledReceipt);
      }
      if (requestId) await acknowledgeLocalLevelSpin(requestId);
    } catch (e) {
      // Награда НЕ теряется: пока occurrence не помечен claimed, приз остаётся
      // в журнале и появится плиткой в «Подарках» — inventory-фильтр смотрит
      // на claimed, а не на канал доставки.
      DebugLogger.error(
        'level_reward_spin:settle_reward_preview',
        e instanceof Error ? e : new Error(String(e)),
        'warning',
      );
    } finally {
      resultActionBusyRef.current = false;
    }
  }, [applyInstantSpinReward, balance]);

  const handleRewardPreviewClaim = useCallback(() => {
    void settleRewardPreview(receipt?.requestId ?? null, receipt);
  }, [receipt, settleRewardPreview]);

  const handleRewardPreviewClose = useCallback(() => {
    void settleRewardPreview(receipt?.requestId ?? null, receipt);
  }, [receipt, settleRewardPreview]);

  const handleResultAction = useCallback(async () => {
    if (resultActionBusyRef.current) return;
    const accountToken = captureAccountGeneration();
    if (!isCurrentAccountGeneration(accountToken)) return;
    resultActionBusyRef.current = true;
    try {
      if (receipt) {
        // зачем: это второй путь закрытия результата (кнопка «Крутить ещё»).
        // Без выдачи здесь мгновенный приз не начислился бы до следующего
        // захода в «Подарки», а владелец просил счётчик прямо сейчас.
        if (isInstantLevelSpinReward(receipt.baseGiftId)) {
          await applyInstantSpinReward(receipt);
        }
        // зачем: между выдачей и acknowledge НЕЛЬЗЯ делать ранний выход.
        // Такая проверка стояла здесь в первой версии правки и оставляла
        // расписку активной после успешной выдачи: при следующем входе
        // recoverLocalLevelSpin показывал бы тот же приз повторно (начислен
        // он второй раз не был бы — защита claimed держит, — но человек видел
        // бы награду, которой уже владеет). Проверка поколения аккаунта живёт
        // внутри самой выдачи и внутри acknowledge.
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
    } catch (e) {
      DebugLogger.error(
        'level_reward_spin:result_action',
        e instanceof Error ? e : new Error(String(e)),
        'warning',
      );
      if (!mountedRef.current || !isCurrentAccountGeneration(accountToken)) return;
      setPhase((balance ?? 0) > 0 ? 'idle' : 'empty');
    } finally {
      resultActionBusyRef.current = false;
    }
  }, [applyInstantSpinReward, balance, receipt, run]);

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
        runeBalance={runeBalance}
        paidSpinPrice={PAID_LEVEL_SPIN_RUNE_PRICE}
        receipt={receipt}
        onSpin={() => { void run(false); }}
        onPaidSpin={() => { void runPaid(); }}
        onRetry={() => { void run(false); }}
        onAgain={() => { void handleResultAction(); }}
        onRevealed={handleRevealed}
      />
      <FeatureIntroEntry id="spin_first_visit" enabled={phase !== 'recovering'} />
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
