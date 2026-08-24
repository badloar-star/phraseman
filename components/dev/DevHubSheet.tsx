import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from '../../app/account_generation';
import {
  readDevLocalPlusOverride,
  setDevLocalPlusOverride,
  type DevLocalPlusOverride,
} from '../../app/dev_plus_controls';
import { emitAppEvent } from '../../app/events';
import { grantLocalDevSpin } from '../../app/local_level_spins';
import { isMaxVoiceNativeAvailable } from '../../app/max_webrtc_module';
import { hapticTap } from '../../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import LevelUpThresholdModal, { type LevelUpPreviewVariant } from '../LevelUpThresholdModal';
import ResultsSequence from '../feedback/ResultsSequence';
import { SpinRewardPlaque } from '../SpinRewardPlaque';
import { useOverlayVisible } from '../OverlayArbiter';
import { usePremium } from '../PremiumContext';
import { useTheme } from '../ThemeContext';
import {
  getOrderedDevToolSections,
  type DevTool,
  type DevToolAction,
} from './devToolRegistry';
import LeagueResultModal from '../../app/LeagueResultModal';
import { buildLeagueDevSeed, type LeagueDevSeedId } from './leagueDevSeeds';
import { CANCEL_FLOW_PREVIEW_ROUTE, MOTION_SHOWCASE_ROUTE, SHOP_ROUTE } from '../../constants/devRoutes';
import { resolveCurrentPaywallRoute } from '../../app/paywall_navigation';

export type DevHubSheetProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  onOpen?: () => void;
  onSurfaceActiveChange?: (active: boolean) => void;
}>;

type PreviewState =
  | Readonly<{
      type: 'level-up';
      variant: LevelUpPreviewVariant;
      run: number;
    }>
  | Readonly<{
      type: 'lesson-results';
      variant?: never;
      run: number;
    }>
  | Readonly<{
      type: 'spin-plaque';
      variant?: never;
      run: number;
    }>
  | Readonly<{
      type: 'league';
      seed: LeagueDevSeedId;
      run: number;
    }>;

const SHEET_HIDDEN_Y = 720;

function ToolRow({
  tool,
  disabled,
  onPress,
}: {
  tool: DevTool;
  disabled: boolean;
  onPress: () => void;
}) {
  const { theme: t, f } = useTheme();
  const danger = tool.tone === 'danger';
  return (
    <Pressable
      testID={tool.testID}
      accessibilityRole="button"
      accessibilityLabel={`${tool.title}. ${tool.detail}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolRow,
        { backgroundColor: t.bgSurface },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={[styles.toolIcon, { backgroundColor: danger ? t.wrongBg : t.accentBg }]}>
        <Ionicons name={tool.icon} size={20} color={danger ? t.wrong : t.accent} />
      </View>
      <View style={styles.toolCopy}>
        <Text style={[styles.toolTitle, { color: t.textPrimary, fontSize: f.body }]}>{tool.title}</Text>
        <Text style={[styles.toolDetail, { color: t.textMuted, fontSize: f.caption }]}>{tool.detail}</Text>
      </View>
      <View style={[styles.actionPill, { backgroundColor: danger ? t.wrongBg : t.accentBg }]}>
        <Text style={[styles.actionLabel, { color: danger ? t.wrong : t.accent, fontSize: f.label }]}>
          {tool.actionLabel}
        </Text>
      </View>
    </Pressable>
  );
}

export default function DevHubSheet({ visible, onClose, onOpen, onSurfaceActiveChange }: DevHubSheetProps) {
  const router = useRouter();
  const { theme: t, themeMode, f } = useTheme();
  const { hasPremiumAccess, reload } = usePremium();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [account, setAccount] = useState(captureAccountGeneration);
  const [plusOverride, setPlusOverride] = useState<DevLocalPlusOverride>('inherit');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const runRef = useRef(0);
  const headingRef = useRef<Text>(null);
  const headingFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SHEET_HIDDEN_Y)).current;
  const sections = useMemo(() => getOrderedDevToolSections(), []);
  // зачем: свёрнутые секции (пейволы) не должны оттеснять остальные инструменты
  // вниз. Храним только РАСКРЫТЫЕ id — состояние по умолчанию берётся из
  // реестра, поэтому новая свёрнутая секция не требует правок здесь.
  const [expandedSections, setExpandedSections] = useState<readonly string[]>([]);
  const toggleSection = useCallback((id: string) => {
    setExpandedSections((current) => (current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]));
  }, []);
  const devSurfaceWanted = visible || preview !== null;
  const devSurfaceGranted = useOverlayVisible('devHub', devSurfaceWanted);

  useEffect(() => {
    const active = devSurfaceWanted && devSurfaceGranted;
    onSurfaceActiveChange?.(active);
    return () => onSurfaceActiveChange?.(false);
  }, [devSurfaceGranted, devSurfaceWanted, onSurfaceActiveChange]);

  const focusDevHeading = useCallback(() => {
    if (headingFocusTimerRef.current) clearTimeout(headingFocusTimerRef.current);
    headingFocusTimerRef.current = setTimeout(() => {
      headingFocusTimerRef.current = null;
      if (headingRef.current) AccessibilityInfo.sendAccessibilityEvent(headingRef.current, 'focus');
    }, 40);
  }, []);

  useEffect(() => () => {
    if (headingFocusTimerRef.current) clearTimeout(headingFocusTimerRef.current);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    setAccount(captureAccountGeneration());
    const subscription = subscribeAccountGeneration(setAccount);
    return () => subscription.remove();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    sheetY.setValue(reduceMotion ? 0 : SHEET_HIDDEN_Y);
    backdropOpacity.setValue(reduceMotion ? 1 : 0);
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(sheetY, {
        toValue: 0,
        damping: 24,
        stiffness: 260,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, reduceMotion, sheetY, visible]);

  useEffect(() => {
    if (!visible || account.phase !== 'active' || !account.stableId) {
      setPlusOverride('inherit');
      return undefined;
    }
    let active = true;
    void readDevLocalPlusOverride(account.stableId)
      .then((value) => { if (active) setPlusOverride(value); })
      .catch(() => { if (active) setPlusOverride('inherit'); });
    return () => { active = false; };
  }, [account.phase, account.stableId, visible]);

  const requestClose = useCallback((preservePreview = false, onClosed?: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    hapticTap();
    if (!preservePreview) setPreview(null);
    if (reduceMotion) {
      onClose();
      onClosed?.();
      return;
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: SHEET_HIDDEN_Y, duration: 240, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        onClose();
        onClosed?.();
      }
      else closingRef.current = false;
    });
  }, [backdropOpacity, onClose, reduceMotion, sheetY]);
  const handleSheetClose = useCallback(() => {
    requestClose();
  }, [requestClose]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => (
      gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
    ),
    onPanResponderMove: (_, gestureState) => {
      sheetY.setValue(Math.max(0, gestureState.dy));
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 96 || gestureState.vy > 1.05) {
        requestClose();
        return;
      }
      Animated.spring(sheetY, {
        toValue: 0,
        damping: 24,
        stiffness: 280,
        useNativeDriver: true,
      }).start();
    },
  }), [requestClose, sheetY]);

  const openPreview = useCallback((variant: LevelUpPreviewVariant) => {
    hapticTap();
    runRef.current += 1;
    setPreview({ type: 'level-up', variant, run: runRef.current });
    requestClose(true);
  }, [requestClose]);

  const openLessonResultsPreview = useCallback(() => {
    hapticTap();
    runRef.current += 1;
    setPreview({ type: 'lesson-results', run: runRef.current });
    requestClose(true);
  }, [requestClose]);

  const openLeaguePreview = useCallback((seed: LeagueDevSeedId) => {
    hapticTap();
    runRef.current += 1;
    setPreview({ type: 'league', seed, run: runRef.current });
    requestClose(true);
  }, [requestClose]);

  // Результат собирается в памяти на каждый показ: ни диска, ни сети.
  const leagueSeedResult = useMemo(
    () => (preview?.type === 'league' ? buildLeagueDevSeed(preview.seed) : null),
    [preview],
  );

  const openSpinRewardPreview = useCallback(async () => {
    if (busy || account.phase !== 'active' || !account.stableId) return;
    const accountToken = captureAccountGeneration();
    setBusy(true);
    setNotice('');
    const granted = await grantLocalDevSpin(accountToken).catch(() => false);
    if (!granted || !isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
      setBusy(false);
      return;
    }
    hapticTap();
    runRef.current += 1;
    setPreview({ type: 'spin-plaque', run: runRef.current });
    requestClose(true);
    setBusy(false);
  }, [account.phase, account.stableId, busy, requestClose]);

  const closePreview = useCallback((message = '') => {
    setPreview(null);
    setNotice(message);
  }, []);

  const applyPlusOverride = useCallback(async (mode: 'granted' | 'removed') => {
    if (busy || account.phase !== 'active' || !account.stableId) return;
    const accountToken = account;
    hapticTap();
    setBusy(true);
    setNotice('');
    try {
      await setDevLocalPlusOverride(account.stableId, mode);
      if (!isCurrentAccountGeneration(accountToken, account.stableId)) return;
      await reload();
      if (!isCurrentAccountGeneration(accountToken, account.stableId)) return;
      setPlusOverride(mode);
      setNotice(mode === 'granted'
        ? 'Plus включён локально для текущего аккаунта.'
        : 'Локальная DEV-выдача снята. Покупка и VIP не изменены.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось изменить локальный Plus.');
    } finally {
      setBusy(false);
    }
  }, [account, busy, reload]);

  // «Пройти онбординг»: боевой оверлей с первого экрана. Сбрасываем ТОЛЬКО
  // ключи прохождения (done/step/version) — профиль, прогресс и согласия не
  // трогаются; завершение отработает обычным handleOnboardingDone.
  //
  // зачем: событие эмитим ИЗ onClosed, то есть после того как native Modal
  // DEV-центра действительно снят. Иначе оверлей онбординга поднимается под
  // ещё живым Modal — на iOS это даёт кадр, в котором виден DEV-шит поверх
  // первого экрана (та же беда, что чинили в open-max-voice).
  const runOnboardingPreview = useCallback(async () => {
    await AsyncStorage.multiRemove([
      'onboarding_done',
      'onboarding_step',
      'onboarding_flow_version_v1',
    ]).catch(() => {});
    requestClose(false, () => emitAppEvent('dev_onboarding_restart'));
  }, [requestClose]);

  const handleTool = useCallback((action: DevToolAction) => {
    switch (action) {
      case 'run-onboarding':
        void runOnboardingPreview();
        return;
      case 'open-motion-showcase':
        // Витрина движения — обычный маршрут. Закрываем native Modal до
        // смены route, иначе iOS оставит DEV-sheet поверх сцены.
        requestClose(false, () => router.push(MOTION_SHOWCASE_ROUTE as never));
        return;
      case 'open-shop':
        // Магазин пока БЕЗ входа из приложения — эта кнопка единственная дверь.
        requestClose(false, () => router.push(SHOP_ROUTE as never));
        return;
      case 'open-max-voice':
        if (!isMaxVoiceNativeAvailable()) {
          setNotice('MAX Voice не встроен в установленную DEV-сборку. Metro обновляет только JavaScript — пересобери и установи приложение на iPhone.');
          return;
        }
        // Полноценный режим, не preview: закрываем native Modal до смены route,
        // чтобы iOS не оставлял DEV-sheet поверх pre-start экрана звонка.
        requestClose(false, () => router.push({
          pathname: '/max_call_session',
          params: { devMode: '1' },
        } as never));
        return;
      // зачем 2026-08-24: прямые кнопки на каждый экран пейвола — «Витрина
      // движения» их отфильтровывала (isExecutableHybridItem), владелец не
      // мог их открыть. source: 'dev_hub' даёт честный контекст «generic»
      // вместо синтетического direct, params остаются реальными (цены из
      // стора через usePaywallPurchase — тут ничего не подменяется).
      case 'open-paywall-a':
        requestClose(false, () => router.push({ pathname: '/paywall_a', params: { source: 'dev_hub' } } as never));
        return;
      case 'open-paywall-b':
        requestClose(false, () => router.push({ pathname: '/paywall_b', params: { source: 'dev_hub' } } as never));
        return;
      case 'open-paywall-c':
        requestClose(false, () => router.push({ pathname: '/paywall_c', params: { source: 'dev_hub' } } as never));
        return;
      case 'open-paywall-d':
        requestClose(false, () => router.push({ pathname: '/paywall_d', params: { source: 'dev_hub' } } as never));
        return;
      case 'open-paywall-e':
        requestClose(false, () => router.push({ pathname: '/paywall_e', params: { source: 'dev_hub' } } as never));
        return;
      case 'open-paywall-f':
        requestClose(false, () => router.push({ pathname: '/paywall_f', params: { source: 'dev_hub' } } as never));
        return;
      case 'open-paywall-g':
        requestClose(false, () => router.push({ pathname: '/paywall_g', params: { source: 'dev_hub' } } as never));
        return;
      // зачем: source: 'onboarding_plan' — тот же флаг, что ставит настоящий
      // онбординг (isOnboarding=true): полноэкранный без слайда, sticky-CTA,
      // Pro и MAX скрыты. Роут берётся из resolveCurrentPaywallRoute() — это
      // и есть текущий активный A/B-вариант, который реально увидит новичок.
      case 'open-paywall-onboarding':
        requestClose(false, () => router.push({
          pathname: resolveCurrentPaywallRoute(),
          params: { source: 'onboarding_plan' },
        } as never));
        return;
      case 'open-max-paywall':
        requestClose(false, () => router.push({ pathname: '/max_paywall', params: { source: 'dev_hub' } } as never));
        return;
      case 'preview-level-standard':
        openPreview('standard');
        return;
      case 'preview-level-milestone':
        openPreview('milestone');
        return;
      case 'preview-lesson-results':
        openLessonResultsPreview();
        return;
      case 'preview-spin-reward':
        void openSpinRewardPreview();
        return;
      case 'preview-league-promoted':
        openLeaguePreview('promoted');
        return;
      case 'preview-league-demoted':
        openLeaguePreview('demoted');
        return;
      case 'preview-league-stay':
        openLeaguePreview('stay');
        return;
      case 'preview-league-rank-mismatch':
        openLeaguePreview('rank-mismatch');
        return;
      case 'open-cancel-flow':
        // Витрина сценариев отписки — обычный маршрут; закрываем native Modal
        // до смены route, иначе iOS оставит DEV-sheet поверх сцены.
        requestClose(false, () => router.push(CANCEL_FLOW_PREVIEW_ROUTE as never));
        return;
      case 'open-manage-subscription':
        requestClose(false, () => router.push({ pathname: '/manage_subscription', params: { source: 'dev_hub' } } as never));
        return;
      case 'grant-plus':
        void applyPlusOverride('granted');
        return;
      case 'revoke-plus':
        void applyPlusOverride('removed');
    }
  }, [applyPlusOverride, openLeaguePreview, openLessonResultsPreview, openPreview, openSpinRewardPreview, requestClose, router, runOnboardingPreview]);

  const accountReady = account.phase === 'active' && Boolean(account.stableId);
  const milestone = preview?.type === 'level-up' && preview.variant === 'milestone';
  const overrideLabel = plusOverride === 'granted'
    ? 'DEV-выдача активна'
    : plusOverride === 'removed'
      ? 'DEV-выдача снята'
      : 'без DEV-выдачи';

  return (
    <>
      <Modal
        visible={visible && devSurfaceGranted}
        transparent
        animationType="none"
        statusBarTranslucent
        onShow={focusDevHeading}
      onRequestClose={handleSheetClose}
      >
        <View style={styles.root}>
        <Pressable
          testID="dev-hub-backdrop"
          accessibilityRole="button"
          accessibilityLabel="Закрыть DEV-центр"
          onPress={handleSheetClose}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          testID="dev-hub-sheet"
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: t.bgCard,
              paddingBottom: 14 + normalizeSafeAreaBottomInset(insets.bottom),
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.grabberWrap}>
              <View style={[styles.grabber, { backgroundColor: t.border }]} />
            </View>
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: t.accentBg }]}>
                <Ionicons name="flask-outline" size={20} color={t.accent} />
              </View>
              <View style={styles.headerCopy}>
                <Text ref={headingRef} accessibilityRole="header" style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>DEV-центр</Text>
                <Text style={[styles.subtitle, { color: t.textMuted, fontSize: f.caption }]}>Локальные инструменты разработки</Text>
              </View>
              <Pressable
                testID="dev-hub-close"
                accessibilityRole="button"
                accessibilityLabel="Закрыть DEV-центр"
                hitSlop={10}
                onPress={handleSheetClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: t.bgSurface },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={22} color={t.textPrimary} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.status, { backgroundColor: t.bgSurface }]}>
            <View style={styles.statusItem}>
              <Text style={[styles.statusLabel, { color: t.textMuted, fontSize: f.caption }]}>Plus</Text>
              <Text style={[styles.statusValue, { color: hasPremiumAccess ? t.correct : t.textPrimary, fontSize: f.caption }]}>
                {hasPremiumAccess ? 'активен' : 'неактивен'} · {overrideLabel}
              </Text>
            </View>
            {!accountReady ? (
              <Text accessibilityLiveRegion="polite" style={[styles.accountNotice, { color: t.wrong, fontSize: f.caption }]}>Аккаунт ещё загружается</Text>
            ) : null}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {sections.map((section) => {
              const open = section.collapsed ? expandedSections.includes(section.id) : true;
              return (
              <View key={section.id} testID={section.testID} style={styles.section}>
                {section.collapsed ? (
                  <Pressable
                    testID={`${section.testID}-toggle`}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    accessibilityLabel={section.title}
                    onPress={() => toggleSection(section.id)}
                    style={({ pressed }) => [styles.sectionHeading, { opacity: pressed ? 0.72 : 1 }]}
                  >
                    <View style={[styles.sectionIcon, { backgroundColor: t.accentBg }]}>
                      <Ionicons name={section.icon} size={18} color={t.accent} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: t.textPrimary, fontSize: f.body, flex: 1 }]}>{section.title}</Text>
                    {/* Счётчик заменяет запрещённую подпись-расшифровку: сколько
                        внутри — видно, не раскрывая. */}
                    <Text style={[styles.sectionCount, { color: t.textMuted, fontSize: f.caption }]}>{section.tools.length}</Text>
                    <Ionicons
                      name={open ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={t.textMuted}
                    />
                  </Pressable>
                ) : (
                  <View style={styles.sectionHeading}>
                    <View style={[styles.sectionIcon, { backgroundColor: t.accentBg }]}>
                      <Ionicons name={section.icon} size={18} color={t.accent} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: t.textPrimary, fontSize: f.body }]}>{section.title}</Text>
                  </View>
                )}
                {open ? (
                  <View style={styles.toolList}>
                    {section.tools.map((tool) => (
                      <ToolRow
                        key={tool.id}
                        tool={tool}
                        disabled={busy || (section.id === 'subscription' && !accountReady)}
                        onPress={() => handleTool(tool.action)}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
              );
            })}
            {notice ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.notice, { backgroundColor: t.bgSurface, color: t.textPrimary, fontSize: f.caption }]}
              >
                {notice}
              </Text>
            ) : null}
          </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {preview?.type === 'level-up' ? (
        <LevelUpThresholdModal
          key={preview?.run ?? 0}
          visible={!visible && preview !== null}
          variant={preview?.variant ?? 'standard'}
          level={milestone ? 20 : 13}
          themeMode={themeMode}
          kicker={milestone ? 'КАЖДЫЙ ПЯТЫЙ УРОВЕНЬ' : 'УРОВЕНЬ ПОВЫШЕН'}
          headline={`Уровень ${milestone ? 20 : 13}`}
          message={milestone
            ? 'Особый порог: более праздничная анимация. Уровень и награды не записываются.'
            : 'Обычное повышение уровня. XP, уровень и награды профиля не изменяются.'}
          xpLabel="Бонус уровня"
          xpValue="+100 XP"
          titleLabel="Новый титул"
          energyLabel="Энергия"
          energyValue={(amount) => `Теперь ${amount} энергии в день`}
          spinReward={true}
          spinReceiptId={`dev-level-spin-${preview?.run ?? 0}`}
          continueLabel="Готово"
          onShow={() => {}}
          onContinue={() => closePreview()}
        />
      ) : null}

      <Modal
        testID="dev-lesson-results-preview"
        visible={!visible && preview?.type === 'lesson-results'}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => closePreview()}
      >
        {!visible && preview?.type === 'lesson-results' ? (
          <View style={[styles.resultsPreview, { backgroundColor: t.bgCard }]}> 
            <ResultsSequence
              key={preview.run}
              stars={3}
              xp={120}
              title="DEV · Учебный пример"
              subtitle="Синтетический результат: прогресс и награды не изменяются."
              rewards={{
                activeGift: { label: 'Активный подарок: +1 подсказка' },
                multipliers: [
                  { label: 'Множитель XP ×1.5', xpDelta: 15 },
                  { label: 'Множитель XP ×2', xpDelta: 20 },
                  { label: 'Множитель XP ×3', xpDelta: 30 },
                ],
              }}
              spinReward={{ amount: 1, receiptId: `dev-lesson-spin-${preview.run}` }}
              ctaPrimaryLabel="Вернуться в Dev Hub"
              onCtaPrimary={closePreview}
              ctaSecondaryLabel="Закрыть preview"
              onCtaSecondary={closePreview}
            />
          </View>
        ) : null}
      </Modal>

      <Modal
        testID="dev-spin-reward-preview-modal"
        visible={!visible && preview?.type === 'spin-plaque'}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closePreview()}
      >
        <View pointerEvents="box-none" style={styles.spinPlaqueOverlay}>
          {preview?.type === 'spin-plaque' ? (
            <SpinRewardPlaque
              key={preview.run}
              amount={1}
              receiptId={`dev-spin-plaque-${preview.run}`}
              visible
              onComplete={() => closePreview()}
              testID="dev-spin-reward-plaque"
            />
          ) : null}
        </View>
      </Modal>

      {preview?.type === 'league' && leagueSeedResult ? (
        <LeagueResultModal
          key={preview.run}
          visible={!visible && devSurfaceGranted}
          result={leagueSeedResult}
          previewMode
          onClose={() => {
            closePreview();
            onOpen?.();
          }}
        />
      ) : null}

    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  grabberWrap: { alignItems: 'center', paddingTop: 9, paddingBottom: 7 },
  grabber: { width: 42, height: 5, borderRadius: 3, opacity: 0.8 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontWeight: '700', letterSpacing: -0.35 },
  subtitle: { marginTop: 1, fontWeight: '400' },
  closeButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  status: { marginTop: 10, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 11, gap: 4 },
  statusItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statusLabel: { fontWeight: '700' },
  statusValue: { flexShrink: 1, textAlign: 'right', fontWeight: '700' },
  accountNotice: { fontWeight: '400' },
  content: { paddingTop: 16, paddingBottom: 8, gap: 18 },
  section: { gap: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 2 },
  sectionIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontWeight: '700' },
  sectionCount: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  toolList: { gap: 8 },
  toolRow: { minHeight: 72, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  toolIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  toolCopy: { flex: 1, minWidth: 0 },
  toolTitle: { fontWeight: '700' },
  toolDetail: { marginTop: 3, lineHeight: 17, fontWeight: '400' },
  actionPill: { minHeight: 34, minWidth: 68, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontWeight: '700' },
  notice: { borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, lineHeight: 18, fontWeight: '400' },
  pressed: { opacity: 0.74, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.46 },
  resultsPreview: { flex: 1 },
  spinPlaqueOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
