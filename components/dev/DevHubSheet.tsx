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
import { makeDevRunesSeed } from '../../app/dev_practice_runes_seed';
import { setDevAsFreeFlag } from '../../app/dev_as_free_flag';
import { hapticTap } from '../../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import PremiumCelebrationModal from '../PremiumCelebrationModal';
import FirstPurchaseSealCelebration, {
  type FirstPurchaseKind,
} from '../FirstPurchaseSealCelebration';
import ResultsSequence from '../feedback/ResultsSequence';
import { useOverlayVisible } from '../OverlayArbiter';
import { usePremium } from '../PremiumContext';
import { useTheme } from '../ThemeContext';
import {
  getOrderedDevToolSections,
  type DevTool,
  type DevToolAction,
} from './devToolRegistry';
import {
  CANCEL_FLOW_PREVIEW_ROUTE,
  LEARNING_V2_AUTHORING_PREVIEW_ROUTE,
  LEARNING_V2_MODES_SHOWCASE_ROUTE,
  MOTION_SHOWCASE_ROUTE,
  SHOP_ROUTE,
} from '../../constants/devRoutes';
import type { PremiumContext } from '../../app/premium_context';
import { setDevFeatureIntroReplay, useDevFeatureIntroReplay } from '../../app/feature_intro_dev_replay';
import { DEV_PAYWALL_CONTEXTS } from './paywallDevContexts';
import { noteSwallowedHandler } from '../../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export type DevHubSheetProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  onOpen?: () => void;
  onSurfaceActiveChange?: (active: boolean) => void;
}>;

type PreviewState =
  | Readonly<{
      type: 'lesson-results';
      variant?: never;
      run: number;
    }>
  // зачем (владелец 2026-09-20): празднование Plus/Pro первой кнопкой хаба.
  // variant хранится здесь, а не двумя типами, чтобы монтировался один и тот
  // же боевой компонент — палитра у него приходит пропом.
  | Readonly<{
      type: 'celebration';
      variant: 'premium' | 'pro';
      run: number;
    }>
  // зачем (владелец 2026-09-21): празднование ПЕРВОЙ покупки. kind хранится
  // здесь, а не двумя типами, по той же причине, что и variant выше — монтируем
  // один боевой компонент, валюта приходит пропом.
  | Readonly<{
      type: 'first-purchase';
      kind: FirstPurchaseKind;
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

function PaywallContextPicker({
  selected,
  onSelect,
}: {
  selected: PremiumContext;
  onSelect: (context: PremiumContext) => void;
}) {
  const { theme: t, f } = useTheme();
  return (
    <View
      testID="dev-paywall-context-picker"
      style={[styles.paywallContextPicker, { backgroundColor: t.bgSurface }]}
    >
      <View style={styles.paywallContextHeader}>
        <View style={styles.toolCopy}>
          <Text style={[styles.toolTitle, { color: t.textPrimary, fontSize: f.body }]}>Контекст пейвола</Text>
          <Text style={[styles.toolDetail, { color: t.textMuted, fontSize: f.caption }]}>Выбери контекст — затем открой любой вариант A–G.</Text>
        </View>
        <View style={[styles.contextCountPill, { backgroundColor: t.accentBg }]}>
          <Text style={[styles.actionLabel, { color: t.accent, fontSize: f.label }]}>{DEV_PAYWALL_CONTEXTS.length}</Text>
        </View>
      </View>
      <View style={styles.paywallContextGrid}>
        {DEV_PAYWALL_CONTEXTS.map((item) => {
          const active = item.context === selected;
          return (
            <Pressable
              key={item.context}
              testID={`dev-paywall-context-${item.context}`}
              accessibilityRole="radio"
              accessibilityLabel={`Контекст пейвола: ${item.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(item.context)}
              style={({ pressed }) => [
                styles.paywallContextChip,
                // зачем: без обводки — выбор читается тоном (правило владельца
                // «контейнеры без border»); на акценте всегда тёмный correctText.
                { backgroundColor: active ? t.accent : t.bgSurface2 },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.paywallContextChipText, { color: active ? t.correctText : t.textPrimary, fontSize: f.caption }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function DevHubSheet({ visible, onClose, onOpen, onSurfaceActiveChange }: DevHubSheetProps) {
  const devIntroReplay = useDevFeatureIntroReplay();
  const router = useRouter();
  const { theme: t, themeMode, f } = useTheme();
  const { hasPremiumAccess, reload } = usePremium();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [account, setAccount] = useState(captureAccountGeneration);
  const [plusOverride, setPlusOverride] = useState<DevLocalPlusOverride>('inherit');
  const [selectedPaywallContext, setSelectedPaywallContext] = useState<PremiumContext>('generic');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const runRef = useRef(0);
  const headingRef = useRef<Text>(null);
  const headingFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);
  const devHubMountedRef = useRef(true);
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
    devHubMountedRef.current = true;
    return () => {
      devHubMountedRef.current = false;
    };
  }, []);

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

  const openLessonResultsPreview = useCallback(() => {
    hapticTap();
    runRef.current += 1;
    setPreview({ type: 'lesson-results', run: runRef.current });
    requestClose(true);
  }, [requestClose]);

  // Хаб закрывается ДО показа celebration,
  // (requestClose(true) сохраняет preview), иначе native Modal хаба останется
  // поверх празднования и его не будет видно. Ни pending-флаг, ни consume
  // здесь не вызываются: реальная очередь празднования на Главной не трогается.
  const openCelebrationPreview = useCallback((variant: 'premium' | 'pro') => {
    hapticTap();
    runRef.current += 1;
    setPreview({ type: 'celebration', variant, run: runRef.current });
    requestClose(true);
  }, [requestClose]);

  // Празднование первой покупки. Закрываем хаб с сохранением превью по той же
  // причине, что и у празднования Plus: иначе native Modal хаба остаётся
  // поверх и анимации не видно.
  const openFirstPurchasePreview = useCallback((kind: FirstPurchaseKind) => {
    hapticTap();
    runRef.current += 1;
    setPreview({ type: 'first-purchase', kind, run: runRef.current });
    requestClose(true);
  }, [requestClose]);

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
  // первого экрана.
  const runOnboardingPreview = useCallback(async () => {
    await AsyncStorage.multiRemove([
      'onboarding_done',
      'onboarding_step',
      'onboarding_flow_version_v1',
    ]).catch(noteSwallowedHandler('DevHubSheet:useCallback.multiRemove'));
    requestClose(false, () => emitAppEvent('dev_onboarding_restart'));
  }, [requestClose]);

  const openPaywallVariant = useCallback(
    (
      pathname: string,
      context: PremiumContext,
      source: 'dev_hub' | 'onboarding_plan' = 'dev_hub',
    ) => {
      requestClose(false, () => router.push({ pathname, params: { context, source } } as never));
    },
    [requestClose, router],
  );

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
      case 'open-learning-v2-modes-showcase':
        // ОТДЕЛЬНЫЙ от «Витрины движения» подраздел — 7 одобренных режимов
        // Learning V2, каждый открывается полноэкранным пробным мини-уроком.
        requestClose(false, () => router.push(LEARNING_V2_MODES_SHOWCASE_ROUTE as never));
        return;
      case 'open-learning-v2-authoring-preview':
        requestClose(false, () => router.push(LEARNING_V2_AUTHORING_PREVIEW_ROUTE as never));
        return;
      case 'open-shop':
        // Магазин пока БЕЗ входа из приложения — эта кнопка единственная дверь.
        requestClose(false, () => router.push(SHOP_ROUTE as never));
        return;
      // зачем 2026-08-24: прямые кнопки на каждый экран пейвола — «Витрина
      // движения» их отфильтровывала (isExecutableHybridItem), владелец не
      // мог их открыть. source: 'dev_hub' даёт честный контекст «generic»
      // вместо синтетического direct, params остаются реальными (цены из
      // стора через usePaywallPurchase — тут ничего не подменяется).
      // зачем (владелец 2026-09-30): единственный пейвол Plus — через тот же
      // диспетчер, что и у игроков (проверка доступа + выбранный контекст).
      case 'open-paywall-plus':
        openPaywallVariant('/premium_modal', selectedPaywallContext);
        return;
      // зачем (владелец 2026-09-02): показать НАСТОЯЩЕЕ окно обновления на этом
      // телефоне. Хаб закрывается до показа, иначе native Modal хаба останется
      // поверх окна и его не будет видно. Ничего не пишется в remote_config,
      // поэтому другие пользователи окна не увидят.
      case 'preview-update-modal-optional':
        requestClose(false, () => emitAppEvent('update_modal_preview', { mode: 'optional' }));
        return;
      case 'preview-update-modal-force':
        requestClose(false, () => emitAppEvent('update_modal_preview', { mode: 'force' }));
        return;
      case 'preview-first-purchase-dialog':
        openFirstPurchasePreview('dialog');
        return;
      case 'preview-first-purchase-lesson':
        openFirstPurchasePreview('lesson');
        return;
      case 'preview-celebration-plus':
        openCelebrationPreview('premium');
        return;
      case 'preview-celebration-pro':
        openCelebrationPreview('pro');
        return;
      case 'preview-lesson-results':
        openLessonResultsPreview();
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
        return;
      // зачем (координатор 05.10, learn-1): проверка пейвола уроков на эмуляторе — доступ к урокам как у Free в релизе.
      case 'dev-as-free-on':
      case 'dev-as-free-off': {
        const enabled = action === 'dev-as-free-on';
        void setDevAsFreeFlag(enabled).then((applied) => {
          setNotice(applied
            ? (enabled ? 'Уроки как Free: включено — тап по уроку за Plus откроет пейвол.' : 'Уроки как Free: выключено.')
            : 'Флаг работает только в dev-сборке.');
        });
        return;
      }
      // зачем (владелец, 2026-08-27): «Проверка рун» — каждая кнопка открывает
      // НАСТОЯЩИЙ экран с реальным первым доступным контентом, но с новым
      // devRunesSeed на каждый тап — числа на экране меняются при повторном
      // открытии, не залипая на одно и то же значение.
      // зачем (владелец, 2026-08-27, после жёсткой правки): «мне надо только
      // экраны ЗАВЕРШЕНИЯ увидеть» — открывать игру с начала и проходить её,
      // чтобы дойти до финиша, не годится. Урок ведёт СРАЗУ на lesson_complete
      // (у него отдельный роут финиша); для остальных шести devRunesSeed
      // заставляет сам экран сразу отрендерить своё финишное состояние —
      // см. devJumpToFinale в каждом экране.
      case 'open-dev-runes-lesson':
        requestClose(false, () => router.push({
          pathname: '/lesson_complete',
          params: { id: '1', devRunesSeed: makeDevRunesSeed() },
        } as never));
        return;
      case 'open-dev-runes-vocabulary':
        requestClose(false, () => router.push({
          pathname: '/lesson_words',
          params: { id: '1', devRunesSeed: makeDevRunesSeed(), devJumpToFinale: '1' },
        } as never));
        return;
      case 'open-dev-runes-irregular-verbs':
        requestClose(false, () => router.push({
          pathname: '/lesson_irregular_verbs',
          params: { id: '1', devRunesSeed: makeDevRunesSeed(), devJumpToFinale: '1' },
        } as never));
        return;
      case 'open-dev-runes-blitz':
        requestClose(false, () => router.push({
          pathname: '/flashcards_blitz_session',
          params: { devRunesSeed: makeDevRunesSeed(), devJumpToFinale: '1' },
        } as never));
        return;
      case 'open-dev-runes-flashcards-training':
        requestClose(false, () => router.push({
          pathname: '/flashcards_swipe',
          params: { devRunesSeed: makeDevRunesSeed(), devJumpToFinale: '1' },
        } as never));
        return;
      case 'open-dev-runes-mistake-practice':
        requestClose(false, () => router.push({
          pathname: '/mistake_practice_session',
          params: { devRunesSeed: makeDevRunesSeed(), devJumpToFinale: '1' },
        } as never));
        return;
      case 'open-dev-runes-speaking':
        requestClose(false, () => router.push({
          pathname: '/flashcards_speaking_session',
          params: { devRunesSeed: makeDevRunesSeed(), devJumpToFinale: '1' },
        } as never));
        return;
    }
  }, [account, applyPlusOverride, busy, openCelebrationPreview, openFirstPurchasePreview, openLessonResultsPreview, openPaywallVariant, requestClose, router, runOnboardingPreview, selectedPaywallContext]);

  const accountReady = account.phase === 'active' && Boolean(account.stableId);
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

          <ScrollView decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <Pressable
              testID="dev-intro-replay-toggle"
              accessibilityRole="switch"
              accessibilityLabel="Повторять объяснения разделов"
              accessibilityState={{ checked: devIntroReplay }}
              onPress={() => { void hapticTap(); setDevFeatureIntroReplay(!devIntroReplay); }}
              style={({ pressed }) => [styles.toolRow, { backgroundColor: t.bgSurface }, pressed && styles.pressed]}
            >
              <View style={[styles.toolIcon, { backgroundColor: t.accentBg }]}><Ionicons name="refresh-outline" size={20} color={t.accent} /></View>
              <View style={styles.toolCopy}>
                <Text style={[styles.toolTitle, { color: t.textPrimary, fontSize: f.body }]}>Повторять объяснения</Text>
                <Text style={[styles.toolDetail, { color: t.textMuted, fontSize: f.caption }]}>При новом входе в раздел, до перезапуска приложения. История показов и согласие ИИ не меняются.</Text>
              </View>
              <View style={[styles.actionPill, { backgroundColor: devIntroReplay ? t.accent : t.bgSurface2 }]}>
                <Text style={[styles.actionLabel, { color: devIntroReplay ? t.correctText : t.textMuted, fontSize: f.label }]}>{devIntroReplay ? 'ВКЛ' : 'ВЫКЛ'}</Text>
              </View>
            </Pressable>
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
                    {section.id === 'paywalls' ? (
                      <PaywallContextPicker
                        selected={selectedPaywallContext}
                        onSelect={setSelectedPaywallContext}
                      />
                    ) : null}
                    {section.tools.map((tool) => (
                      <ToolRow
                        key={tool.id}
                        tool={tool}
                        disabled={busy || (
                          section.id === 'subscription'
                          && !accountReady
                        )}
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
              title="DEV · Учебный пример"
              subtitle="Синтетический результат: прогресс и награды не изменяются."
              rewards={{
                activeGift: { label: 'Активный подарок: +1 подсказка' },
              }}
              ctaPrimaryLabel="Вернуться в Dev Hub"
              onCtaPrimary={closePreview}
              ctaSecondaryLabel="Закрыть preview"
              onCtaSecondary={closePreview}
            />
          </View>
        ) : null}
      </Modal>

      {preview?.type === 'celebration' ? (
        // зачем: PremiumCelebrationModal рисует свой native Modal сама — второй
        // Modal снаружи на iOS ломает стек показа (та же причина, что у
        // key={run} перезапускает хореографию с нуля на
        // каждый тап, иначе повторный показ стартовал бы с конца анимации.
        <PremiumCelebrationModal
          key={preview.run}
          visible={!visible && devSurfaceGranted}
          variant={preview.variant}
          onClose={() => {
            closePreview();
            onOpen?.();
          }}
        />
      ) : null}

      {preview?.type === 'first-purchase' ? (
        // Тот же боевой компонент, что и в покупке: владелец обязан видеть
        // ровно то, что увидит человек. key={run} перезапускает хореографию с
        // нуля — иначе повторный тап стартовал бы с конца анимации.
        //
        // Отличие от боевого показа ровно одно: onDone никуда не ведёт, а
        // возвращает в хаб — превью не должно уносить в платный диалог/урок.
        <FirstPurchaseSealCelebration
          key={preview.run}
          visible={!visible && devSurfaceGranted}
          kind={preview.kind}
          subjectTitle={preview.kind === 'dialog' ? 'В ресторане' : 'Урок 4'}
          title={preview.kind === 'dialog' ? 'Диалог открыт' : 'Урок открыт'}
          subtitle="Теперь он твой навсегда"
          ctaLabel={preview.kind === 'dialog' ? 'Начать диалог' : 'Начать урок'}
          onDone={() => {
            console.log(`[DEV-CELEBRATION] first_purchase_done kind=${preview.kind}`); // guard-ok: исход обязан логироваться и в релизе
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
  paywallContextPicker: { borderRadius: 17, padding: 12, gap: 10 },
  paywallContextHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contextCountPill: { minWidth: 34, minHeight: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paywallContextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paywallContextChip: { minHeight: 44, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paywallContextChipText: { fontWeight: '700', textAlign: 'center' },
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
});
