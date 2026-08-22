// ════════════════════════════════════════════════════════════════════════════
// RegistrationPromptModal.tsx — модалка предложения зарегистрироваться/войти.
//
// Показывается:
//   1. После завершения первого урока (см. lesson_complete.tsx).
//   2. Из секции "Аккаунт" в Settings.
//   3. Опционально из онбординга (гибридный триггер).
//   4. Из dev-режима для тестирования.
//
// Поведение после успешного login:
//   • Модалка закрывается.
//   • Запоминаем что показали (auth_prompt_shown_v1) — не показывать повторно.
//   • Эмитим событие auth_provider_linked (для обновления UI Settings).
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, Modal, View, Text, TextInput, Pressable, StyleSheet, Platform, Linking, ScrollView, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { GoogleSignInButton, AppleSignInButton } from './AuthProviderButtons';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { StreakChainIcon } from './StreakChainIcon';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing as REasing,
} from 'react-native-reanimated';
import {
  signInWithProvider,
  signOutAndWipeForAccountSwitch,
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  AUTH_PROMPT_SHOWN_KEY,
  APPLE_ANDROID_MISSING_SERVICE_ID,
  type SignInResult,
  type AuthProviderId,
} from '../app/auth_provider';
import { logEvent } from '../app/firebase';
import { fetchAuthRecoveryHint, restoreFromCloudDetailed, warmAuthSignInCallables, type AuthRecoveryHint } from '../app/cloud_sync';
import { getStableId } from '../app/stable_id';
import { emitAppEvent } from '../app/events';
import { KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../app/config';
import { triLang } from '../constants/i18n';
import { createAuthPromptAttemptLifecycle } from './auth_prompt_attempt_lifecycle';
import { createAuthRecoveryFlow, type AuthRecoveryFlowController, type AuthRecoveryFlowState } from '../app/auth_recovery_flow';
import {
  createCleanInstallRecoveryFlow,
  type CleanInstallRecoveryFlowController,
  type CleanInstallRecoveryFlowState,
} from '../app/auth_clean_install_recovery_flow';
import type { SecondaryRecoveryProvider } from '../app/auth_recovery_secondary';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { animateNextLayoutTransition } from '../app/smooth_layout';
import {
  createAuthRecoveryCompletion,
  createAuthOperationGate,
  createRecoveryDisposeBarrier,
  getAuthRecoveryCopy,
  getAuthRecoveryEntryMode,
  getAuthRecoveryErrorMessage,
  getCleanInstallRecoveryCopy,
  getCleanInstallRecoveryScreen,
  getRecoveryCountdownSeconds,
  isRecoveryEmailValid,
  isRecoveryDismissible,
  isRecoveryFlowLeaseCurrent,
  normalizeRecoveryCodeInput,
  normalizeRecoveryEmailInput,
} from './auth_recovery_modal_model';
// зачем: гибрид «Световод + Чекан» (владелец, 2026-08-16) — bloom-подложка над
// шитом и вторичная кнопка «Позже» через общий пресс-стандарт. Существующий
// GestureDetector/PanResponder (drag-to-dismiss) и вся auth-логика НЕ трогаются —
// добавка только рядом, под prop motionVariant (default 'classic').
import { LinearGradient } from './SafeLinearGradient';
import PressableHybrid from './PressableHybrid';
import { LUM } from '../constants/motionHybrid';

const SIGN_IN_SLOW_THRESHOLD_MS = 45_000;

function waitForAuthPromptBusyFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

// ── Streak-заголовок «Всё в безопасности» ────────────────────────────────────
// Дни серии читаем из локального прогресса — тот же ключ, что используют
// достижения/главная ('streak_count'). Если серии нет — мягкий фолбэк-текст.
const STREAK_COUNT_KEY = 'streak_count';
const SHEET_HIDDEN = 320; // стартовая позиция листа под экраном (выезд/уезд)

/** Склонение «день» для ru/uk/pl: 1 день / 3 дня / 5 дней. */
function slavicDayWord(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const d = a % 10;
  if (a > 10 && a < 15) return many;
  if (d > 1 && d < 5) return few;
  if (d === 1) return one;
  return many;
}

/**
 * Акцентная часть строки («148 дней») + остаток фразы про облако.
 * Возвращает null при нулевой серии — тогда показываем фолбэк-строку.
 */
function streakDaysLine(lang: string, n: number): { accent: string; rest: string } | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (lang) {
    case 'ru':
      return { accent: `${n} ${slavicDayWord(n, 'день', 'дня', 'дней')}`, rest: n === 1 ? ' вашего прогресса ждёт в облаке' : ' вашего прогресса ждут в облаке' };
    case 'uk':
      return { accent: `${n} ${slavicDayWord(n, 'день', 'дні', 'днів')}`, rest: n === 1 ? ' вашого прогресу чекає в хмарі' : ' вашого прогресу чекають у хмарі' };
    case 'es':
      return { accent: `${n} ${n === 1 ? 'día' : 'días'}`, rest: n === 1 ? ' de tu progreso te espera en la nube' : ' de tu progreso te esperan en la nube' };
    case 'pt-BR':
      return { accent: `${n} ${n === 1 ? 'dia' : 'dias'}`, rest: n === 1 ? ' do seu progresso espera por você na nuvem' : ' do seu progresso esperam por você na nuvem' };
    case 'vi':
      return { accent: `${n} ngày`, rest: ' tiến trình của bạn đang chờ trên đám mây' };
    case 'id':
      return { accent: `${n} hari`, rest: ' progresmu menunggu di cloud' };
    case 'tr':
      return { accent: `${n} gün`, rest: ' ilerlemen bulutta seni bekliyor' };
    case 'pl':
      return { accent: `${n} ${slavicDayWord(n, 'dzień', 'dni', 'dni')}`, rest: n === 1 ? ' Twoich postępów czeka w chmurze' : ' Twoich postępów czekają w chmurze' };
    default:
      return { accent: `${n} ${n === 1 ? 'day' : 'days'}`, rest: n === 1 ? ' of your progress is waiting in the cloud' : ' of your progress are waiting in the cloud' };
  }
}

interface Props {
  visible: boolean;
  /** Контекст показа — для аналитики. 'home_banner' — открыт из persistent
   *  баннера на Home для незалогиненных юзеров с XP ≥ 1000. */
  // зачем: 'compass' добавлен для экрана брифинга компаса — он не требует своих
  // текстов и осознанно попадает в ветку по умолчанию («Быстрый вход. Прогресс
  // синхронизируется между устройствами»), как settings/home_banner.
  context: 'lesson1' | 'settings' | 'onboarding' | 'dev' | 'home_banner' | 'startup_recovery' | 'compass';
  /** Кастомный заголовок (опц., иначе используется дефолт под контекст). */
  title?: string;
  /** Кастомный подзаголовок (опц.). */
  subtitle?: string;
  onClose: () => void;
  onSignedIn?: (result: SignInResult) => void;
  /**
   * зачем: гибрид «Световод + Чекан» живёт РЯДОМ со старым видом под флагом —
   * боевой дефолт 'classic' не меняется без явного включения владельцем.
   * 'hybrid' добавляет bloom-подложку над шитом (свет загорается первым) и
   * переводит вторичную кнопку «Позже» на PressableHybrid; drag-to-dismiss,
   * каскад появления и вся auth-логика — без изменений в обоих режимах.
   */
  motionVariant?: 'classic' | 'hybrid';
}

function RegistrationPromptModal({
  visible,
  context,
  title,
  subtitle,
  onClose,
  onSignedIn,
  motionVariant = 'classic',
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { height: viewportHeight } = useWindowDimensions();
  const screenFocused = useIsScreenFocused();

  const [appleAvail, setAppleAvail] = useState(false);
  const [googleAvail, setGoogleAvail] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<AuthProviderId | null>(null);
  const [signInSlow, setSignInSlow] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  // Провайдер последней неуспешной попытки — для кнопки «Повторить» под ошибкой.
  const [retryProvider, setRetryProvider] = useState<AuthProviderId | null>(null);
  // Recovery hint: каким аккаунтом входить (маска email с сервера).
  const [recoveryHint, setRecoveryHint] = useState<AuthRecoveryHint | null>(null);
  const [recoveryPanelVisible, setRecoveryPanelVisible] = useState(false);
  const [recoveryOfferedAfterMismatch, setRecoveryOfferedAfterMismatch] = useState(false);
  const [recoveryFlowState, setRecoveryFlowState] = useState<AuthRecoveryFlowState>({ stage: 'idle' });
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryDisposing, setRecoveryDisposing] = useState(false);
  const [recoveryNow, setRecoveryNow] = useState(() => Date.now());
  const [recoveryAppActive, setRecoveryAppActive] = useState(() => AppState.currentState === 'active');
  const [cleanRecoveryPanelVisible, setCleanRecoveryPanelVisible] = useState(false);
  const [cleanRecoveryFlowState, setCleanRecoveryFlowState] = useState<CleanInstallRecoveryFlowState>({ stage: 'idle' });
  const [cleanRecoveryEmail, setCleanRecoveryEmail] = useState('');
  const [cleanRecoveryCode, setCleanRecoveryCode] = useState('');
  const [cleanRecoveryError, setCleanRecoveryError] = useState<string | null>(null);
  const [cleanRecoveryDisposing, setCleanRecoveryDisposing] = useState(false);
  const [cleanRecoveryCancelling, setCleanRecoveryCancelling] = useState(false);
  const [cleanRecoveryResendAvailableAt, setCleanRecoveryResendAvailableAt] = useState<number | undefined>();
  const [streakDays, setStreakDays] = useState(0);

  // Анимация листа (reanimated, паттерн CardPackShardPaywallModal):
  // подложка + выезд снизу + каскад элементов + интерактивный драг.
  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const cascade = useSharedValue(0);
  const attemptLifecycleRef = useRef<ReturnType<typeof createAuthPromptAttemptLifecycle> | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryFlowRef = useRef<AuthRecoveryFlowController | null>(null);
  const recoveryGenerationRef = useRef(0);
  const authOperationGateRef = useRef(createAuthOperationGate());
  const recoveryCompletionRef = useRef<ReturnType<typeof createAuthRecoveryCompletion> | null>(null);
  const recoveryDisposePromiseRef = useRef<Promise<void> | null>(null);
  const recoveryDisposeBarrierRef = useRef(createRecoveryDisposeBarrier());
  const cleanRecoveryFlowRef = useRef<CleanInstallRecoveryFlowController | null>(null);
  const cleanRecoveryGenerationRef = useRef(0);
  const cleanRecoveryDisposePromiseRef = useRef<Promise<void> | null>(null);
  const cleanRecoveryDisposeBarrierRef = useRef(createRecoveryDisposeBarrier());
  const cleanRecoveryCancelPromiseRef = useRef<Promise<void> | null>(null);
  const cleanRecoveryCancellingRef = useRef(false);
  const componentMountedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  if (attemptLifecycleRef.current === null) {
    attemptLifecycleRef.current = createAuthPromptAttemptLifecycle(visible);
  }
  const attemptLifecycle = attemptLifecycleRef.current;

  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current !== null) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  }, []);

  const disposeRecoveryFlow = useCallback((flow: AuthRecoveryFlowController) => {
    if (componentMountedRef.current) setRecoveryDisposing(true);
    const task = recoveryDisposeBarrierRef.current.begin(() => flow.dispose());
    recoveryDisposePromiseRef.current = task;
    void task.finally(() => {
      if (recoveryDisposePromiseRef.current !== task) return;
      recoveryDisposePromiseRef.current = null;
      if (componentMountedRef.current) setRecoveryDisposing(false);
    });
  }, []);

  const disposeCleanRecoveryFlow = useCallback((flow: CleanInstallRecoveryFlowController) => {
    if (componentMountedRef.current) setCleanRecoveryDisposing(true);
    const task = cleanRecoveryDisposeBarrierRef.current.begin(() => flow.dispose());
    cleanRecoveryDisposePromiseRef.current = task;
    void task.finally(() => {
      if (cleanRecoveryDisposePromiseRef.current !== task) return;
      cleanRecoveryDisposePromiseRef.current = null;
      if (componentMountedRef.current) setCleanRecoveryDisposing(false);
    });
  }, []);

  const isAttemptCurrent = useCallback(
    (attemptToken: number) => attemptLifecycle.isCurrent(attemptToken),
    [attemptLifecycle],
  );

  useEffect(() => {
    componentMountedRef.current = true;
    attemptLifecycle.mount();
    return () => {
      componentMountedRef.current = false;
      attemptLifecycle.unmount();
      clearSlowTimer();
      recoveryGenerationRef.current += 1;
      cleanRecoveryGenerationRef.current += 1;
      authOperationGateRef.current.reset();
      const flow = recoveryFlowRef.current;
      recoveryFlowRef.current = null;
      if (flow) disposeRecoveryFlow(flow);
      const cleanFlow = cleanRecoveryFlowRef.current;
      cleanRecoveryFlowRef.current = null;
      if (cleanFlow) disposeCleanRecoveryFlow(cleanFlow);
    };
  }, [attemptLifecycle, clearSlowTimer, disposeCleanRecoveryFlow, disposeRecoveryFlow]);

  useLayoutEffect(() => {
    attemptLifecycle.setVisible(visible);
  }, [attemptLifecycle, visible]);

  // зачем: владелец 2026-08-22 — прогрев серверных функций входа при открытии
  // модалки: пока юзер выбирает провайдера и аккаунт в окне Google, контейнеры
  // уже подняты — холодный старт (3–10 с) не попадает в цепочку входа.
  // Троттл и fire-and-forget внутри warmAuthSignInCallables.
  useEffect(() => {
    if (visible) warmAuthSignInCallables();
  }, [visible]);

  useEffect(() => {
    recoveryGenerationRef.current += 1;
    cleanRecoveryGenerationRef.current += 1;
    authOperationGateRef.current.reset();
    if (!visible) {
      clearSlowTimer();
      setLoadingProvider(null);
      setSignInSlow(false);
      const flow = recoveryFlowRef.current;
      recoveryFlowRef.current = null;
      if (flow) disposeRecoveryFlow(flow);
      const cleanFlow = cleanRecoveryFlowRef.current;
      cleanRecoveryFlowRef.current = null;
      if (cleanFlow) disposeCleanRecoveryFlow(cleanFlow);
      return;
    }
    setInlineError(null);
    setRetryProvider(null);
    setRecoveryPanelVisible(false);
    setRecoveryOfferedAfterMismatch(false);
    setRecoveryFlowState({ stage: 'idle' });
    setRecoveryCode('');
    setRecoveryError(null);
    setCleanRecoveryPanelVisible(false);
    setCleanRecoveryFlowState({ stage: 'idle' });
    setCleanRecoveryEmail('');
    setCleanRecoveryCode('');
    setCleanRecoveryError(null);
    setCleanRecoveryCancelling(false);
    setCleanRecoveryResendAvailableAt(undefined);
    setRecoveryNow(Date.now());
    recoveryCompletionRef.current = createAuthRecoveryCompletion({
      emit: (event) => emitAppEvent(event),
      close: () => onCloseRef.current(),
      restore: () => restoreFromCloudDetailed(),
    });
    let active = true;
    void isAppleSignInAvailable().then((available) => {
      if (active) setAppleAvail(available);
    });
    void isGoogleSignInAvailable().then((available) => {
      if (active) setGoogleAvail(available);
    });
    void AsyncStorage.getItem(STREAK_COUNT_KEY)
      .then((v) => {
        if (!active) return;
        const n = v ? parseInt(v, 10) : 0;
        setStreakDays(Number.isFinite(n) ? n : 0);
      })
      .catch(() => {});
    logEvent('auth_prompt_view', { context });

    // Вход: подложка + лист выезжает снизу + каскад элементов (60мс стаггер).
    dragTranslateY.value = 0;
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = withTiming(1, { duration: 220 });
    sheetY.value = withTiming(0, { duration: 380, easing: REasing.bezier(0.32, 0.72, 0, 1) });
    cascade.value = 0;
    cascade.value = withTiming(1, { duration: 640, easing: REasing.out(REasing.cubic) });
    return () => {
      active = false;
    };
  }, [visible, context, clearSlowTimer, disposeCleanRecoveryFlow, disposeRecoveryFlow, backdropO, sheetY, sheetOpacity, dragTranslateY, cascade]);

  // Recovery hint: в startup_recovery подтягиваем с сервера, КАКИМ аккаунтом
  // входить (маска email + провайдер). Полный email с сервера не уходит.
  useEffect(() => {
    if (!visible || context !== 'startup_recovery') {
      if (!visible) setRecoveryHint(null);
      return;
    }
    let active = true;
    void (async () => {
      const stableId = await getStableId().catch(() => null);
      if (!stableId) return;
      const hint = await fetchAuthRecoveryHint(stableId);
      if (active && hint?.linked) setRecoveryHint(hint);
    })();
    return () => { active = false; };
  }, [visible, context]);

  useEffect(() => {
    if (!visible || (recoveryFlowState.stage !== 'code_sent' && cleanRecoveryFlowState.stage !== 'code_sent')) return undefined;
    setRecoveryAppActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      setRecoveryAppActive(state === 'active');
      if (state === 'active') setRecoveryNow(Date.now());
    });
    return () => subscription.remove();
  }, [visible, recoveryFlowState.stage, cleanRecoveryFlowState.stage]);

  useEffect(() => {
    if (
      !visible
      || (recoveryFlowState.stage !== 'code_sent' && cleanRecoveryFlowState.stage !== 'code_sent')
      || !screenFocused
      || !recoveryAppActive
    ) return undefined;
    setRecoveryNow(Date.now());
    const timer = setInterval(() => setRecoveryNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible, recoveryFlowState.stage, cleanRecoveryFlowState.stage, screenFocused, recoveryAppActive]);

  // Каскад появления элемента i: своё окно внутри общего 640мс прогресса.
  const useRiseStyle = (i: number) =>
    useAnimatedStyle(() => {
      const start = (60 + i * 60) / 640;
      const end = Math.min(1, start + 280 / 640);
      const v = interpolate(cascade.value, [start, end], [0, 1], 'clamp');
      return { opacity: v, transform: [{ translateY: interpolate(v, [0, 1], [8, 0]) }] };
    }, [cascade]);
  const rise0 = useRiseStyle(0);
  const rise1 = useRiseStyle(1);
  const rise2 = useRiseStyle(2);
  const rise3 = useRiseStyle(3);
  const rise4 = useRiseStyle(4);
  const rise5 = useRiseStyle(5);

  const showInlineError = useCallback((title: string, message: string) => {
    setInlineError(`${title}\n${message}`);
  }, []);

  // Заголовок по утверждённому редизайну: «Всё в безопасности» (для всех контекстов).
  // Контекстные акценты остаются в подзаголовке (finalSubtitle), проп title по-прежнему перекрывает.
  const defaultTitle = triLang(lang, {
    ru: 'Всё в безопасности',
    uk: 'Все в безпеці',
    es: 'Todo está a salvo',
    'pt-BR': 'Tudo está seguro',
    vi: 'Mọi thứ đều an toàn',
    id: 'Semuanya aman',
    tr: 'Her şey güvende',
    pl: 'Wszystko jest bezpieczne',
  });

  // Подзаголовок: короткие формулировки (редизайн — меньше текста на экране).
  const defaultSubtitle = triLang(lang, {
    ru:
      context === 'lesson1'
        ? 'Один клик через Google — и прогресс в безопасности.'
        : context === 'startup_recovery'
        ? 'Войди в тот же аккаунт Google или Apple — вернём прогресс из облака.'
        : context === 'onboarding'
        ? 'Можно пропустить, но без аккаунта прогресс легко потерять.'
        : 'Быстрый вход. Прогресс синхронизируется между устройствами.',
    uk:
      context === 'lesson1'
        ? 'Один тап через Google — і прогрес у безпеці.'
        : context === 'startup_recovery'
        ? 'Увійди в той самий акаунт Google або Apple — повернемо прогрес із хмари.'
        : context === 'onboarding'
        ? 'Можна пропустити, але без акаунта прогрес легко втратити.'
        : 'Швидкий вхід. Прогрес синхронізується між пристроями.',
    es:
      context === 'lesson1'
        ? 'Un toque en Google y tu progreso queda a salvo.'
        : context === 'startup_recovery'
        ? 'Entra con la misma cuenta de Google o Apple y recuperaremos tu progreso.'
        : context === 'onboarding'
        ? 'Puedes omitirlo, pero sin cuenta tu progreso puede perderse.'
        : 'Acceso rápido. El progreso se sincroniza entre dispositivos.',
    'pt-BR':
      context === 'lesson1'
        ? 'Um toque no Google e seu progresso fica seguro.'
        : context === 'startup_recovery'
        ? 'Entre com a mesma conta Google ou Apple — restauraremos seu progresso.'
        : context === 'onboarding'
        ? 'Você pode pular, mas sem conta seu progresso pode se perder.'
        : 'Entrada rápida. O progresso sincroniza entre dispositivos.',
    vi:
      context === 'lesson1'
        ? 'Một chạm qua Google — tiến trình của bạn an toàn.'
        : context === 'startup_recovery'
        ? 'Đăng nhập đúng tài khoản Google hoặc Apple cũ để khôi phục tiến độ.'
        : context === 'onboarding'
        ? 'Có thể bỏ qua, nhưng không tài khoản tiến trình dễ bị mất.'
        : 'Đăng nhập nhanh. Tiến trình đồng bộ giữa các thiết bị.',
    id:
      context === 'lesson1'
        ? 'Sekali ketuk lewat Google — progresmu aman.'
        : context === 'startup_recovery'
        ? 'Masuk ke akun Google atau Apple yang sama — progresmu akan dipulihkan.'
        : context === 'onboarding'
        ? 'Boleh dilewati, tapi tanpa akun progres mudah hilang.'
        : 'Masuk cepat. Progres tersinkron antarperangkat.',
    tr:
      context === 'lesson1'
        ? 'Google ile tek dokunuş — ilerlemen güvende.'
        : context === 'startup_recovery'
        ? 'Aynı Google veya Apple hesabıyla giriş yap — ilerlemeni geri yükleyelim.'
        : context === 'onboarding'
        ? 'Atlayabilirsin, ama hesap olmadan ilerleme kolayca kaybolur.'
        : 'Hızlı giriş. İlerleme cihazlar arasında eşitlenir.',
    pl:
      context === 'lesson1'
        ? 'Jedno kliknięcie przez Google — postępy są bezpieczne.'
        : context === 'startup_recovery'
        ? 'Zaloguj się na to samo konto Google lub Apple — przywrócimy postęp z chmury.'
        : context === 'onboarding'
        ? 'Możesz pominąć, ale bez konta postępy łatwo stracić.'
        : 'Szybkie logowanie. Postępy synchronizują się między urządzeniami.',
  });

  const finalTitle = title ?? defaultTitle;
  const finalSubtitle = subtitle ?? defaultSubtitle;
  const titleLineHeight = Math.round(f.h1 * 1.12);
  const bodyLineHeight = Math.round(f.body * 1.32);
  const captionLineHeight = Math.max(18, Math.round(f.caption * 1.4));
  const cardMaxHeight = Math.max(280, viewportHeight - 64);
  const cardPadding = viewportHeight < 720 ? 20 : 24;

  const labelGoogle = triLang(lang, { ru: 'Войти через Google', uk: 'Війти з Google', es: 'Entrar con Google', 'pt-BR': 'Entrar com Google', vi: 'Đăng nhập bằng Google', id: 'Masuk dengan Google', tr: 'Google ile giriş yap', pl: 'Zaloguj przez Google' });
  const labelApple = triLang(lang, { ru: 'Войти через Apple', uk: 'Війти з Apple', es: 'Entrar con Apple', 'pt-BR': 'Entrar com Apple', vi: 'Đăng nhập bằng Apple', id: 'Masuk dengan Apple', tr: 'Apple ile giriş yap', pl: 'Zaloguj przez Apple' });
  const labelLater = triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti saja', tr: 'Daha sonra', pl: 'Później' });
  const signInBusyLabel = triLang(lang, {
    ru: 'Входим... подожди пару секунд',
    uk: 'Входимо... зачекай кілька секунд',
    es: 'Iniciando sesión... espera unos segundos',
    'pt-BR': 'Entrando... aguarde alguns segundos',
    vi: 'Đang đăng nhập... chờ vài giây',
    id: 'Sedang masuk... tunggu beberapa detik',
    tr: 'Giriş yapılıyor... birkaç saniye bekle',
    pl: 'Logowanie... poczekaj kilka sekund',
  });
  const signInSlowLabel = triLang(lang, {
    ru: 'Вход занимает больше времени. Можно безопасно закрыть это окно — попытка продолжится.',
    uk: 'Вхід триває довше. Це вікно можна безпечно закрити — спроба продовжиться.',
    es: 'El acceso tarda más de lo normal. Puedes cerrar esta ventana; el intento continuará.',
    'pt-BR': 'A entrada está demorando. Você pode fechar esta janela; a tentativa continuará.',
    vi: 'Đăng nhập đang lâu hơn bình thường. Bạn có thể đóng cửa sổ này; lần thử vẫn tiếp tục.',
    id: 'Proses masuk lebih lama. Jendela ini boleh ditutup; proses akan tetap berjalan.',
    tr: 'Giriş normalden uzun sürüyor. Bu pencereyi kapatabilirsin; deneme devam eder.',
    pl: 'Logowanie trwa dłużej. Możesz zamknąć to okno; próba będzie kontynuowana.',
  });
  const labelLaterAccessibility = signInSlow
    ? triLang(lang, {
        ru: 'Закрыть окно. Вход продолжится в фоне.',
        uk: 'Закрити вікно. Вхід продовжиться у фоні.',
        es: 'Cerrar la ventana. El acceso continuará en segundo plano.',
        'pt-BR': 'Fechar a janela. A entrada continuará em segundo plano.',
        vi: 'Đóng cửa sổ. Quá trình đăng nhập sẽ tiếp tục trong nền.',
        id: 'Tutup jendela. Proses masuk akan dilanjutkan di latar belakang.',
        tr: 'Pencereyi kapat. Giriş arka planda devam edecek.',
        pl: 'Zamknij okno. Logowanie będzie kontynuowane w tle.',
      })
    : labelLater;
  // Строка со щитом под кнопками (утверждённый редизайн).
  // Строка со щитом под кнопками (утверждённый редизайн).
  const labelShield = triLang(lang, {
    ru: 'Данные на устройстве сохранятся',
    uk: 'Дані на пристрої збережуться',
    es: 'Los datos del dispositivo se conservarán',
    'pt-BR': 'Os dados do dispositivo serão mantidos',
    vi: 'Dữ liệu trên thiết bị được giữ lại',
    id: 'Data di perangkat tetap tersimpan',
    tr: 'Cihazdaki veriler korunur',
    pl: 'Dane na urządzeniu zostaną zachowane',
  });
  // Фолбэк-строка под заголовком, если серии ещё нет.
  const labelNoStreak = triLang(lang, {
    ru: 'Ваш прогресс будет ждать вас в облаке',
    uk: 'Ваш прогрес чекатиме на вас у хмарі',
    es: 'Tu progreso te esperará en la nube',
    'pt-BR': 'Seu progresso estará esperando por você na nuvem',
    vi: 'Tiến trình của bạn sẽ chờ trên đám mây',
    id: 'Progresmu akan menunggumu di cloud',
    tr: 'İlerlemen bulutta seni bekliyor olacak',
    pl: 'Twoje postępy będą czekać na Ciebie w chmurze',
  });
  const daysLine = streakDaysLine(lang, streakDays);
  const recoveryCopy = getAuthRecoveryCopy(lang);
  const cleanRecoveryCopy = getCleanInstallRecoveryCopy(lang);
  const recoveryEntryMode = getAuthRecoveryEntryMode(recoveryHint);
  const recoveryStage = recoveryFlowState.stage;
  const cleanRecoveryStage = cleanRecoveryFlowState.stage;
  const cleanRecoveryScreen = getCleanInstallRecoveryScreen(cleanRecoveryStage);
  const recoveryBlocking = recoveryStage === 'adopting'
    || cleanRecoveryStage === 'adopting'
    || cleanRecoveryCancelling;
  const cleanRecoveryDismissAllowed = !cleanRecoveryCancelling && isRecoveryDismissible(cleanRecoveryStage);
  const recoveryDismissAllowed = isRecoveryDismissible(recoveryStage) && cleanRecoveryDismissAllowed;
  const recoveryBusy = recoveryStage === 'starting'
    || recoveryStage === 'requesting'
    || recoveryStage === 'confirming'
    || recoveryBlocking
    || recoveryDisposing
    || loadingProvider !== null;
  const recoverySessionActive = recoveryFlowRef.current !== null
    && recoveryStage !== 'cancelled'
    && recoveryStage !== 'completed'
    && recoveryStage !== 'ack_pending'
    && recoveryStage !== 'failed'
    && recoveryStage !== 'quarantined';
  const cleanRecoveryBusy = cleanRecoveryStage === 'starting'
    || cleanRecoveryStage === 'requesting'
    || cleanRecoveryStage === 'confirming'
    || cleanRecoveryStage === 'issuing'
    || cleanRecoveryStage === 'adopting'
    || cleanRecoveryCancelling
    || cleanRecoveryDisposing
    || loadingProvider !== null;
  const cleanRecoverySessionActive = cleanRecoveryFlowRef.current !== null
    && cleanRecoveryStage !== 'cancelled'
    && cleanRecoveryStage !== 'completed'
    && cleanRecoveryStage !== 'ack_pending'
    && cleanRecoveryStage !== 'failed'
    && cleanRecoveryStage !== 'quarantined';
  const authOperationBusy = authOperationGateRef.current.owner() !== null
    || loadingProvider !== null
    || recoveryDisposing
    || cleanRecoveryDisposing
    || recoverySessionActive
    || cleanRecoverySessionActive;
  const recoveryCountdown = getRecoveryCountdownSeconds(
    recoveryFlowState.resendAvailableAt,
    recoveryNow,
  );
  const recoveryExpiryCountdown = getRecoveryCountdownSeconds(
    recoveryFlowState.expiresAt,
    recoveryNow,
  );
  const recoveryExpired = typeof recoveryFlowState.expiresAt === 'number'
    && recoveryFlowState.expiresAt <= recoveryNow;
  const cleanRecoveryCountdown = getRecoveryCountdownSeconds(
    cleanRecoveryResendAvailableAt,
    recoveryNow,
  );
  const cleanRecoveryExpiryCountdown = getRecoveryCountdownSeconds(
    cleanRecoveryFlowState.expiresAt,
    recoveryNow,
  );
  const cleanRecoveryExpired = typeof cleanRecoveryFlowState.expiresAt === 'number'
    && cleanRecoveryFlowState.expiresAt <= recoveryNow;
  const showRecoveryEntry = context === 'startup_recovery' || recoveryOfferedAfterMismatch;

  const isCurrentRecoveryFlow = useCallback((flow: AuthRecoveryFlowController, generation: number) => (
    isRecoveryFlowLeaseCurrent(
      recoveryFlowRef.current,
      recoveryGenerationRef.current,
      flow,
      generation,
    )
  ), []);

  const syncRecoveryState = useCallback((flow: AuthRecoveryFlowController, generation: number) => {
    if (!isCurrentRecoveryFlow(flow, generation)) return false;
    setRecoveryFlowState(flow.getState());
    return true;
  }, [isCurrentRecoveryFlow]);

  const handleRecoveryEntry = useCallback(() => {
    if (loadingProvider !== null) return;
    animateNextLayoutTransition();
    setRecoveryPanelVisible(true);
    setRecoveryError(null);
    setRecoveryFlowState({ stage: 'idle' });
    setRecoveryCode('');
  }, [loadingProvider]);

  const handleRecoveryStart = useCallback(async (provider: SecondaryRecoveryProvider) => {
    if (recoveryDisposePromiseRef.current || loadingProvider !== null || recoveryBusy || recoveryFlowRef.current) return;
    if (!authOperationGateRef.current.tryBegin('recovery')) return;
    const flow = createAuthRecoveryFlow();
    const generation = recoveryGenerationRef.current + 1;
    recoveryGenerationRef.current = generation;
    recoveryFlowRef.current = flow;
    setRecoveryError(null);
    setRecoveryFlowState({ stage: 'starting', provider });
    try {
      const started = await flow.start(provider);
      if (!isCurrentRecoveryFlow(flow, generation)) return;
      setRecoveryFlowState(started);
      if (started.stage === 'cancelled') {
        if (isCurrentRecoveryFlow(flow, generation)) recoveryFlowRef.current = null;
        authOperationGateRef.current.release('recovery');
        setRecoveryError(recoveryCopy.errorCancelled);
        return;
      }
      const sent = await flow.requestCode();
      if (!isCurrentRecoveryFlow(flow, generation)) return;
      setRecoveryFlowState(sent);
      setRecoveryNow(Date.now());
      setRecoveryCode('');
    } catch (error) {
      if (!isCurrentRecoveryFlow(flow, generation)) return;
      syncRecoveryState(flow, generation);
      const state = flow.getState();
      if (state.stage === 'failed' || state.stage === 'quarantined') {
        setRecoveryError(recoveryCopy.errorSupport);
      } else {
        setRecoveryError(getAuthRecoveryErrorMessage(lang, error));
        if (state.stage === 'cancelled' && isCurrentRecoveryFlow(flow, generation)) {
          recoveryFlowRef.current = null;
        }
      }
    }
  }, [isCurrentRecoveryFlow, lang, loadingProvider, recoveryBusy, recoveryCopy.errorCancelled, recoveryCopy.errorSupport, syncRecoveryState]);

  const handleRecoveryRequest = useCallback(async (provider: SecondaryRecoveryProvider) => {
    const existing = recoveryFlowRef.current;
    if (!existing) {
      await handleRecoveryStart(provider);
      return;
    }
    if (existing.getState().stage !== 'ready' || recoveryBusy) return;
    const generation = recoveryGenerationRef.current;
    setRecoveryError(null);
    try {
      const sent = await existing.requestCode();
      if (!isCurrentRecoveryFlow(existing, generation)) return;
      setRecoveryFlowState(sent);
      setRecoveryNow(Date.now());
      setRecoveryCode('');
    } catch (error) {
      if (!isCurrentRecoveryFlow(existing, generation)) return;
      syncRecoveryState(existing, generation);
      const state = existing.getState();
      setRecoveryError(
        state.stage === 'failed' || state.stage === 'quarantined'
          ? recoveryCopy.errorSupport
          : getAuthRecoveryErrorMessage(lang, error),
      );
    }
  }, [handleRecoveryStart, isCurrentRecoveryFlow, lang, recoveryBusy, recoveryCopy.errorSupport, syncRecoveryState]);

  const handleRecoveryConfirm = useCallback(async () => {
    const flow = recoveryFlowRef.current;
    if (!flow || recoveryBusy || recoveryCode.length !== 6 || recoveryExpired) return;
    setRecoveryError(null);
    const generation = recoveryGenerationRef.current;
    setRecoveryFlowState({ ...flow.getState(), stage: 'confirming' });
    try {
      const result = await flow.confirmCode(recoveryCode);
      if (!isCurrentRecoveryFlow(flow, generation)) return;
      syncRecoveryState(flow, generation);
      if (result.result === 'quarantined') {
        setRecoveryError(recoveryCopy.errorSupport);
        return;
      }
      recoveryCompletionRef.current?.(result.result);
    } catch (error) {
      if (!isCurrentRecoveryFlow(flow, generation)) return;
      syncRecoveryState(flow, generation);
      const state = flow.getState();
      setRecoveryError(
        state.stage === 'failed' || state.stage === 'quarantined'
          ? recoveryCopy.errorSupport
          : getAuthRecoveryErrorMessage(lang, error),
      );
    }
  }, [isCurrentRecoveryFlow, lang, recoveryBusy, recoveryCode, recoveryCopy.errorSupport, recoveryExpired, syncRecoveryState]);

  const handleRecoveryResend = useCallback(async () => {
    const flow = recoveryFlowRef.current;
    if (!flow || recoveryBusy || recoveryCountdown > 0) return;
    setRecoveryError(null);
    const generation = recoveryGenerationRef.current;
    try {
      const sent = await flow.resendCode();
      if (!isCurrentRecoveryFlow(flow, generation)) return;
      setRecoveryFlowState(sent);
      setRecoveryNow(Date.now());
      setRecoveryCode('');
    } catch (error) {
      if (!isCurrentRecoveryFlow(flow, generation)) return;
      syncRecoveryState(flow, generation);
      const state = flow.getState();
      setRecoveryError(
        state.stage === 'failed' || state.stage === 'quarantined'
          ? recoveryCopy.errorSupport
          : getAuthRecoveryErrorMessage(lang, error),
      );
    }
  }, [isCurrentRecoveryFlow, lang, recoveryBusy, recoveryCopy.errorSupport, recoveryCountdown, syncRecoveryState]);

  const isCurrentCleanRecoveryFlow = useCallback((
    flow: CleanInstallRecoveryFlowController,
    generation: number,
  ) => isRecoveryFlowLeaseCurrent(
    cleanRecoveryFlowRef.current,
    cleanRecoveryGenerationRef.current,
    flow,
    generation,
  ), []);

  const syncCleanRecoveryState = useCallback((
    flow: CleanInstallRecoveryFlowController,
    generation: number,
  ) => {
    if (!isCurrentCleanRecoveryFlow(flow, generation)) return false;
    setCleanRecoveryFlowState(flow.getState());
    return true;
  }, [isCurrentCleanRecoveryFlow]);

  const handleCleanRecoveryEntry = useCallback(() => {
    if (authOperationBusy || cleanRecoveryCancellingRef.current) return;
    animateNextLayoutTransition();
    setCleanRecoveryPanelVisible(true);
    setCleanRecoveryFlowState({ stage: 'idle' });
    setCleanRecoveryEmail('');
    setCleanRecoveryCode('');
    setCleanRecoveryError(null);
    setCleanRecoveryResendAvailableAt(undefined);
  }, [authOperationBusy]);

  const handleCleanRecoveryStart = useCallback(async (provider: SecondaryRecoveryProvider) => {
    if (
      cleanRecoveryDisposePromiseRef.current
      || cleanRecoveryCancelPromiseRef.current
      || recoveryDisposePromiseRef.current
      || loadingProvider !== null
      || cleanRecoveryBusy
      || cleanRecoveryFlowRef.current
      || recoveryFlowRef.current
    ) return;
    if (!authOperationGateRef.current.tryBegin('clean_recovery')) return;
    const flow = createCleanInstallRecoveryFlow();
    const generation = cleanRecoveryGenerationRef.current + 1;
    cleanRecoveryGenerationRef.current = generation;
    cleanRecoveryFlowRef.current = flow;
    setCleanRecoveryError(null);
    setCleanRecoveryFlowState({ stage: 'starting', provider });
    try {
      const started = await flow.start(provider);
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      setCleanRecoveryFlowState(started);
      setRecoveryNow(Date.now());
      setCleanRecoveryResendAvailableAt(undefined);
      if (started.stage === 'cancelled') {
        cleanRecoveryFlowRef.current = null;
        authOperationGateRef.current.release('clean_recovery');
        setCleanRecoveryError(recoveryCopy.errorCancelled);
      }
    } catch (error) {
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      syncCleanRecoveryState(flow, generation);
      const current = flow.getState();
      setCleanRecoveryError(
        current.stage === 'failed' || current.stage === 'quarantined'
          ? cleanRecoveryCopy.supportBody
          : getAuthRecoveryErrorMessage(lang, error),
      );
    }
  }, [cleanRecoveryBusy, cleanRecoveryCopy.supportBody, isCurrentCleanRecoveryFlow, lang, loadingProvider, recoveryCopy.errorCancelled, syncCleanRecoveryState]);

  const handleCleanRecoveryRequest = useCallback(async () => {
    const flow = cleanRecoveryFlowRef.current;
    const email = normalizeRecoveryEmailInput(cleanRecoveryEmail);
    if (!flow || cleanRecoveryBusy || flow.getState().stage !== 'ready') return;
    if (!isRecoveryEmailValid(email)) {
      setCleanRecoveryError(cleanRecoveryCopy.errorEmail);
      return;
    }
    const generation = cleanRecoveryGenerationRef.current;
    setCleanRecoveryEmail(email);
    setCleanRecoveryError(null);
    setCleanRecoveryFlowState({ ...flow.getState(), stage: 'requesting' });
    try {
      const sent = await flow.requestCode(email);
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      setCleanRecoveryFlowState(sent);
      const timestamp = Date.now();
      setRecoveryNow(timestamp);
      setCleanRecoveryResendAvailableAt(timestamp + Math.max(0, sent.retryAfterSec ?? 0) * 1000);
      setCleanRecoveryCode('');
    } catch (error) {
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      syncCleanRecoveryState(flow, generation);
      setCleanRecoveryError(getAuthRecoveryErrorMessage(lang, error));
    }
  }, [cleanRecoveryBusy, cleanRecoveryCopy.errorEmail, cleanRecoveryEmail, isCurrentCleanRecoveryFlow, lang, syncCleanRecoveryState]);

  const handleCleanRecoveryConfirm = useCallback(async () => {
    const flow = cleanRecoveryFlowRef.current;
    if (!flow || cleanRecoveryBusy || cleanRecoveryCode.length !== 6 || cleanRecoveryExpired) return;
    const generation = cleanRecoveryGenerationRef.current;
    setCleanRecoveryError(null);
    // Confirmation can immediately cross into handoff adoption. Keep the sheet
    // non-dismissible for the whole authoritative transition, not only after a
    // later render observes the coordinator's internal `adopting` state.
    setCleanRecoveryFlowState({ ...flow.getState(), stage: 'adopting' });
    try {
      const result = await flow.confirmCode(cleanRecoveryCode);
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      syncCleanRecoveryState(flow, generation);
      if (result.result === 'quarantined') {
        setCleanRecoveryError(cleanRecoveryCopy.supportBody);
        return;
      }
      recoveryCompletionRef.current?.(result.result);
    } catch (error) {
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      syncCleanRecoveryState(flow, generation);
      setCleanRecoveryError(getAuthRecoveryErrorMessage(lang, error));
    }
  }, [cleanRecoveryBusy, cleanRecoveryCode, cleanRecoveryCopy.supportBody, cleanRecoveryExpired, isCurrentCleanRecoveryFlow, lang, syncCleanRecoveryState]);

  const handleCleanRecoveryResume = useCallback(async () => {
    const flow = cleanRecoveryFlowRef.current;
    if (!flow || cleanRecoveryBusy || flow.getState().stage !== 'confirmed') return;
    const generation = cleanRecoveryGenerationRef.current;
    setCleanRecoveryError(null);
    setCleanRecoveryFlowState({ ...flow.getState(), stage: 'adopting' });
    try {
      const result = await flow.resumeConfirmed();
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      syncCleanRecoveryState(flow, generation);
      if (result.result === 'quarantined') {
        setCleanRecoveryError(cleanRecoveryCopy.supportBody);
        return;
      }
      recoveryCompletionRef.current?.(result.result);
    } catch (error) {
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      syncCleanRecoveryState(flow, generation);
      setCleanRecoveryError(getAuthRecoveryErrorMessage(lang, error));
    }
  }, [cleanRecoveryBusy, cleanRecoveryCopy.supportBody, isCurrentCleanRecoveryFlow, lang, syncCleanRecoveryState]);

  const handleCleanRecoveryResend = useCallback(async () => {
    const flow = cleanRecoveryFlowRef.current;
    if (
      !flow
      || cleanRecoveryBusy
      || cleanRecoveryCountdown > 0
      || cleanRecoveryExpired
      || !isRecoveryEmailValid(cleanRecoveryEmail)
    ) return;
    const generation = cleanRecoveryGenerationRef.current;
    setCleanRecoveryError(null);
    try {
      const sent = await flow.resendCode(cleanRecoveryEmail);
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      setCleanRecoveryFlowState(sent);
      const timestamp = Date.now();
      setRecoveryNow(timestamp);
      setCleanRecoveryResendAvailableAt(timestamp + Math.max(0, sent.retryAfterSec ?? 0) * 1000);
      setCleanRecoveryCode('');
    } catch (error) {
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      syncCleanRecoveryState(flow, generation);
      setCleanRecoveryError(getAuthRecoveryErrorMessage(lang, error));
    }
  }, [cleanRecoveryBusy, cleanRecoveryCountdown, cleanRecoveryEmail, cleanRecoveryExpired, isCurrentCleanRecoveryFlow, lang, syncCleanRecoveryState]);

  const handleCleanRecoveryChangeEmail = useCallback(async () => {
    const flow = cleanRecoveryFlowRef.current;
    if (!flow || cleanRecoveryBusy || flow.getState().stage !== 'code_sent') return;
    const generation = cleanRecoveryGenerationRef.current;
    setCleanRecoveryError(null);
    cleanRecoveryCancellingRef.current = true;
    setCleanRecoveryCancelling(true);
    setCleanRecoveryFlowState({ ...flow.getState(), stage: 'adopting' });
    try {
      const cancelTask = flow.cancel();
      cleanRecoveryCancelPromiseRef.current = cancelTask;
      await cancelTask;
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      cleanRecoveryGenerationRef.current += 1;
      cleanRecoveryFlowRef.current = null;
      authOperationGateRef.current.release('clean_recovery');
      setCleanRecoveryFlowState({ stage: 'idle' });
      setCleanRecoveryEmail('');
      setCleanRecoveryCode('');
      setCleanRecoveryResendAvailableAt(undefined);
    } catch (error) {
      if (!isCurrentCleanRecoveryFlow(flow, generation)) return;
      syncCleanRecoveryState(flow, generation);
      setCleanRecoveryError(getAuthRecoveryErrorMessage(lang, error));
    } finally {
      cleanRecoveryCancelPromiseRef.current = null;
      cleanRecoveryCancellingRef.current = false;
      if (componentMountedRef.current) setCleanRecoveryCancelling(false);
    }
  }, [cleanRecoveryBusy, isCurrentCleanRecoveryFlow, lang, syncCleanRecoveryState]);

  const handleSignIn = useCallback(
    async (provider: AuthProviderId) => {
      if (
        recoveryDisposePromiseRef.current
        || cleanRecoveryDisposePromiseRef.current
        || loadingProvider !== null
        || recoveryFlowRef.current !== null
        || cleanRecoveryFlowRef.current !== null
      ) return;
      const attemptToken = attemptLifecycle.startAttempt();
      if (attemptToken === null) return;
      if (!authOperationGateRef.current.tryBegin('provider')) {
        attemptLifecycle.completeAttempt(attemptToken);
        return;
      }
      setLoadingProvider(provider);
      setRetryProvider(null);
      setSignInSlow(false);
      clearSlowTimer();
      slowTimerRef.current = setTimeout(() => {
        slowTimerRef.current = null;
        if (isAttemptCurrent(attemptToken)) {
          setSignInSlow(true);
          void AccessibilityInfo.announceForAccessibility(signInSlowLabel);
        }
      }, SIGN_IN_SLOW_THRESHOLD_MS);
      logEvent('auth_prompt_click', { context, provider });
      if (__DEV__) console.log('[RegistrationPromptModal] handleSignIn start, provider=', provider);
      try {
        await waitForAuthPromptBusyFrame();
        if (!isAttemptCurrent(attemptToken)) return;
        // Firebase credential mutations cannot be cancelled. Keep this modal busy
        // until the original task settles so a second picker cannot race it.
        const result = await signInWithProvider(provider, {
          requireCurrentStableIdOwnership: context === 'startup_recovery',
        });
        if (!isAttemptCurrent(attemptToken)) return;
        clearSlowTimer();
        if (__DEV__) console.log('[RegistrationPromptModal] signInWithProvider returned', result);

        if (result.result === 'cancelled') {
          // Отмена picker'а — retryable: даём «Повторить» под сообщением.
          setRetryProvider(provider);
          // В TestFlight/проде раньше молчали — выглядело как «кнопка сломана».
          if (__DEV__) {
            const gpsLine =
              Platform.OS === 'android'
                ? '• Google Play Services вернул PSerror.\n'
                : '';
            showInlineError(
              'DEBUG: cancelled',
              'Native sign-in вернул `cancelled`. Возможные причины:\n\n' +
              '• Юзер закрыл picker.\n' +
              gpsLine +
              '• На устройстве нет Google аккаунта.\n' +
              '• webClientId / SHA-1 неверный — modal автозакрылся.\n\n' +
              'Попробуй "Сбросить и войти заново" внизу.',
            );
          } else {
            showInlineError(
              triLang(lang, { ru: 'Вход не завершён', uk: 'Вхід не завершено', es: 'Acceso sin terminar', 'pt-BR': 'Entrada não concluída', vi: 'Chưa đăng nhập xong', id: 'Masuk belum selesai', tr: 'Giriş tamamlanmadı', pl: 'Logowanie nieukończone' }),
              triLang(lang, {
                ru: 'Окно входа закрылось без выбора аккаунта. Нажми кнопку ещё раз или попробуй другой способ.',
                uk: 'Вікно входу закрилось без вибору акаунта. Натисни кнопку ще раз або спробуй інший спосіб.',
                es: 'Se cerró el acceso sin elegir cuenta. Toca de nuevo o prueba otro método.',
                'pt-BR': 'A janela de login foi fechada sem escolher uma conta. Toque de novo ou tente outro método.',
                vi: 'Cửa sổ đăng nhập đã đóng mà chưa chọn tài khoản. Hãy nhấn lại hoặc thử cách khác.',
                id: 'Jendela masuk tertutup tanpa memilih akun. Ketuk lagi atau coba cara lain.',
                tr: 'Giriş penceresi hesap seçilmeden kapandı. Tekrar dokun veya başka bir yöntem dene.',
                pl: 'Okno logowania zamknęło się bez wyboru konta. Naciśnij ponownie albo spróbuj innej metody.',
              }),
            );
          }
          return;
        }
        if (result.result === 'error') {
          // Большинство ошибок входа retryable (сеть/холодный старт/App Check) —
          // покажем «Повторить»; ветки ниже снимают его там, где повтор бессмыслен.
          setRetryProvider(provider);
          if (__DEV__) console.warn('[RegistrationPromptModal] sign-in error', result.error);
          if (result.error === 'recovery_provider_mismatch') {
            // Тут нужен ДРУГОЙ аккаунт, а не повтор того же — «Повторить» прячем.
            setRetryProvider(null);
            animateNextLayoutTransition();
            setRecoveryOfferedAfterMismatch(true);
            showInlineError(
              triLang(lang, { ru: 'Нужен прежний аккаунт', uk: 'Потрібен попередній акаунт', es: 'Necesitas la cuenta anterior', 'pt-BR': 'Use a conta anterior', vi: 'Cần tài khoản trước đây', id: 'Gunakan akun sebelumnya', tr: 'Önceki hesap gerekli', pl: 'Potrzebne jest poprzednie konto' }),
              triLang(lang, {
                ru: 'Выбранный аккаунт не связан с этим прогрессом. Попробуй тот Google- или Apple-аккаунт, которым ты пользовался раньше. Локальные данные не изменены.',
                uk: 'Вибраний акаунт не пов’язаний із цим прогресом. Спробуй той Google- або Apple-акаунт, яким користувався раніше. Локальні дані не змінено.',
                es: 'La cuenta elegida no está vinculada a este progreso. Prueba la cuenta de Google o Apple que usabas antes. Los datos locales no cambiaron.',
                'pt-BR': 'A conta escolhida não está vinculada a este progresso. Tente a conta Google ou Apple que você usava antes. Os dados locais não foram alterados.',
                vi: 'Tài khoản đã chọn không liên kết với tiến độ này. Hãy thử tài khoản Google hoặc Apple bạn đã dùng trước đây. Dữ liệu trên máy không thay đổi.',
                id: 'Akun yang dipilih tidak tertaut ke progres ini. Coba akun Google atau Apple yang pernah digunakan. Data lokal tidak berubah.',
                tr: 'Seçilen hesap bu ilerlemeye bağlı değil. Daha önce kullandığın Google veya Apple hesabını dene. Yerel veriler değişmedi.',
                pl: 'Wybrane konto nie jest połączone z tym postępem. Spróbuj konta Google lub Apple używanego wcześniej. Dane lokalne nie zostały zmienione.',
              }),
            );
            return;
          }
          if (result.error?.includes(APPLE_ANDROID_MISSING_SERVICE_ID)) {
            // Конфиг сборки, а не транзиент — повтор не поможет.
            setRetryProvider(null);
            showInlineError(
              triLang(lang, { ru: 'Apple на Android', uk: 'Apple на Android', es: 'Apple en Android', 'pt-BR': 'Apple no Android', vi: 'Apple trên Android', id: 'Apple di Android', tr: 'Android’da Apple', pl: 'Apple na Androidzie' }),
              triLang(lang, {
                ru:
                  'Для входа через Apple на Android в сборке должен быть задан Services ID (переменная EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID в EAS / .env). В Apple Developer добавь тот же return URL, что у приложения (часто phraseman://apple-auth).',
                uk:
                  'Для входу через Apple на Android у збірці має бути заданий Services ID (змінна EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID у EAS / .env). У Apple Developer додай той самий return URL, що й у застосунку (часто phraseman://apple-auth).',
                es:
                  'Para entrar con Apple en Android hace falta el Services ID en la build (EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID en EAS / .env). En Apple Developer añade el mismo return URL que usa la app (a menudo phraseman://apple-auth).',
                'pt-BR':
                  'Para entrar com Apple no Android, a build precisa do Services ID (EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID no EAS / .env). No Apple Developer, adicione o mesmo return URL do app (geralmente phraseman://apple-auth).',
                vi: 'Để đăng nhập bằng Apple trên Android, bản build cần Services ID (EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID trong EAS / .env). Trong Apple Developer, hãy thêm cùng return URL mà ứng dụng dùng (thường là phraseman://apple-auth).',
                id: 'Untuk masuk dengan Apple di Android, build harus memiliki Services ID (EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID di EAS / .env). Di Apple Developer, tambahkan return URL yang sama dengan aplikasi (seringnya phraseman://apple-auth).',
                tr: 'Android’da Apple ile giriş için build içinde Services ID gerekir (EAS / .env içinde EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID). Apple Developer’da uygulamanın kullandığı aynı return URL’yi ekle (çoğunlukla phraseman://apple-auth).',
                pl: 'Aby logować się przez Apple na Androidzie, build musi mieć Services ID (EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID w EAS / .env). W Apple Developer dodaj ten sam return URL co w aplikacji (często phraseman://apple-auth).',
              }),
            );
            return;
          }
          const baseMsg = triLang(lang, {
            ru: 'Не получилось войти. Попробуй позже.',
            uk: 'Не вдалося увійти. Спробуй пізніше.',
            es: 'No se ha podido iniciar sesión. Inténtalo más tarde.',
            'pt-BR': 'Não foi possível entrar. Tente mais tarde.',
            vi: 'Không thể đăng nhập. Hãy thử lại sau.',
            id: 'Tidak bisa masuk. Coba lagi nanti.',
            tr: 'Giriş yapılamadı. Daha sonra tekrar dene.',
            pl: 'Nie udało się zalogować. Spróbuj później.',
          });
          showInlineError(
            triLang(lang, { ru: 'Ошибка', uk: 'Помилка', es: 'Error', 'pt-BR': 'Erro', vi: 'Lỗi', id: 'Error', tr: 'Hata', pl: 'Błąd' }),
            baseMsg,
          );
          return;
        }

        // Provider mutation is complete. Keep finalization non-dismissible while
        // the idempotent marker commit starts; a hidden/unmounted attempt never
        // starts a new storage write or UI/event continuation.
        if (!isAttemptCurrent(attemptToken)) return;
        setSignInSlow(false);
        await AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(() => {});
        if (!isAttemptCurrent(attemptToken)) return;
        emitAppEvent('auth_provider_linked');
        onSignedIn?.(result);
        onClose();
      } catch (e: any) {
        if (!isAttemptCurrent(attemptToken)) return;
        clearSlowTimer();
        if (__DEV__) console.warn('[RegistrationPromptModal] unexpected error', e);
        // В проде раньше ловили throw молча → «тапнул Apple — ничего». Покажем компактную ошибку.
        showInlineError(
          triLang(lang, { ru: 'Ошибка', uk: 'Помилка', es: 'Error', 'pt-BR': 'Erro', vi: 'Lỗi', id: 'Error', tr: 'Hata', pl: 'Błąd' }),
          triLang(lang, {
            ru: 'Что-то пошло не так при входе.',
            uk: 'Щось пішло не так під час входу.',
            es: 'Algo salió mal al iniciar sesión.',
            'pt-BR': 'Algo deu errado ao entrar.',
            vi: 'Có lỗi xảy ra khi đăng nhập.',
            id: 'Ada yang salah saat masuk.',
            tr: 'Giriş sırasında bir şeyler ters gitti.',
            pl: 'Coś poszło nie tak podczas logowania.',
          }),
        );
      } finally {
        if (isAttemptCurrent(attemptToken)) {
          clearSlowTimer();
          setLoadingProvider(null);
          setSignInSlow(false);
        }
        attemptLifecycle.completeAttempt(attemptToken);
        authOperationGateRef.current.release('provider');
      }
    },
    [
      attemptLifecycle,
      clearSlowTimer,
      context,
      isAttemptCurrent,
      lang,
      loadingProvider,
      onClose,
      onSignedIn,
      showInlineError,
      signInSlowLabel,
    ],
  );

  // Аварийная кнопка для DEV: полный wipe identity-state (Keychain stable_id +
  // Google session + Firebase Auth) + поднятие чистой анонимной сессии.
  // Помогает выйти из «зомби»-состояния после старого battery delete-account-flow,
  // когда auth_links/{providerUid} указывают на удалённый users/{stable_id} и
  // signIn повисает или silently возвращает `cancelled`.
  const handleResetAndRetry = useCallback(async () => {
    setLoadingProvider('google');
    try {
      // DEV-кнопка сброса identity: wipe — сама цель, поэтому не отменяем его
      // при провале синка (обычный флоу «Сменить аккаунт» — отменяет).
      const reset = await signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true });
      if (reset.ok === false) throw new Error(('detail' in reset && reset.detail) || reset.reason || 'account_switch_reset_failed');
      showInlineError(
        'Сброс выполнен',
        'Identity-state очищен. Теперь нажми "Войти через Google" — должен появиться picker аккаунтов.',
      );
    } finally {
      setLoadingProvider(null);
    }
  }, [showInlineError]);

  const handleLater = useCallback(async () => {
    if (cleanRecoveryCancellingRef.current) return;
    if (loadingProvider !== null && !signInSlow) return;
    if (!recoveryDismissAllowed) return;
    logEvent('auth_prompt_dismissed', { context });
    recoveryGenerationRef.current += 1;
    cleanRecoveryGenerationRef.current += 1;
    authOperationGateRef.current.reset();
    const flow = recoveryFlowRef.current;
    recoveryFlowRef.current = null;
    if (flow) disposeRecoveryFlow(flow);
    const cleanFlow = cleanRecoveryFlowRef.current;
    cleanRecoveryFlowRef.current = null;
    if (cleanFlow) disposeCleanRecoveryFlow(cleanFlow);
    if (loadingProvider !== null) {
      attemptLifecycle.invalidateActiveAttempt();
      clearSlowTimer();
      onClose();
      return;
    }
    if (context !== 'startup_recovery') {
      await AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(() => {});
    }
    onClose();
  }, [attemptLifecycle, clearSlowTimer, context, disposeCleanRecoveryFlow, disposeRecoveryFlow, loadingProvider, onClose, recoveryDismissAllowed, signInSlow]);

  const handleLaterRef = useRef(handleLater);
  handleLaterRef.current = handleLater;

  // Анимированное закрытие (крестик/фон/«Позже»): лист уезжает вниз + подложка тает,
  // затем общий путь handleLater (те же правила, включая signInSlow).
  const dismissSheet = useCallback(() => {
    if (cleanRecoveryCancellingRef.current) return;
    if (loadingProvider !== null && !signInSlow) return;
    if (!recoveryDismissAllowed) return;
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(handleLaterRef.current)();
    });
  }, [backdropO, sheetOpacity, sheetY, loadingProvider, recoveryDismissAllowed, signInSlow]);

  const closeAfterSwipe = useCallback(() => {
    void handleLaterRef.current();
  }, []);

  // Блокировка жестов во время входа (как purchasingSV в CardPackShardPaywallModal).
  const signInBlockingSV = useSharedValue(false);
  useEffect(() => {
    signInBlockingSV.value = (loadingProvider !== null && !signInSlow) || recoveryBlocking;
  }, [loadingProvider, recoveryBlocking, signInSlow, signInBlockingSV]);

  const swipeOffDistance = useMemo(() => Math.max(480, viewportHeight * 0.6), [viewportHeight]);

  // Интерактивный лист: тянешь вниз 1:1, вверх — резиновое сопротивление (x0.12);
  // отпустил — spring обратно или уезд вниз + закрытие (порог 88px / velocityY 900).
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          'worklet';
          if (signInBlockingSV.value) return;
          const ty = e.translationY;
          dragTranslateY.value = ty < 0 ? ty * 0.12 : ty;
        })
        .onEnd((e) => {
          'worklet';
          if (signInBlockingSV.value) {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
            return;
          }
          const shouldClose = dragTranslateY.value > 88 || e.velocityY > 900;
          if (shouldClose) {
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 260 }, (finished) => {
              if (finished) {
                runOnJS(closeAfterSwipe)();
              }
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeAfterSwipe, dragTranslateY, signInBlockingSV, swipeOffDistance],
  );

  // Подложка: затемнение по backdropO, посветление при оттягивании листа вниз.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * 0.6 * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismissSheet}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} disabled={!recoveryDismissAllowed}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: t.bgCard,
                borderColor: t.border,
                maxHeight: cardMaxHeight,
              },
              sheetStyle,
            ]}
          >
          {motionVariant === 'hybrid' && (
            // Bloom: свет загорается ПЕРВЫМ над шитом (закон базы «Световод»,
            // LUM.bloomMs) — чисто декоративный слой, не влияет на разметку.
            <LinearGradient
              colors={[`${t.accent}1F`, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.5 }}
              style={styles.hybridSheetGlow}
              pointerEvents="none"
            />
          )}
          <View style={styles.grabberZone}>
            <View style={[styles.grabber, { backgroundColor: t.border }]} />
          </View>
          <Pressable
            onPress={dismissSheet}
            disabled={!recoveryDismissAllowed}
            accessibilityRole="button"
            accessibilityLabel={labelLater}
            accessibilityState={{ disabled: !recoveryDismissAllowed }}
            hitSlop={8}
            style={[styles.closeBtn, { backgroundColor: t.bgSurface, opacity: recoveryDismissAllowed ? 1 : 0.45 }]}
          >
            <Ionicons name="close" size={14} color={t.textSecond} />
          </Pressable>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={[styles.sheetContent, { paddingHorizontal: cardPadding, paddingBottom: Math.max(insets.bottom, 14) + 18 }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Заголовок: streak-бейдж + «Всё в безопасности» + дни серии из прогресса */}
          <Animated.View style={[styles.headerRow, rise0]}>
            <View style={[styles.streakBadge, { backgroundColor: `${t.accent}1A`, borderColor: `${t.accent}40` }]}>
              <StreakChainIcon themeMode={themeMode} streakDays={streakDays} size={30} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1, lineHeight: titleLineHeight }]} numberOfLines={2}>
                {finalTitle}
              </Text>
              <Text style={[styles.daysLine, { color: t.textSecond, fontSize: f.caption }]} numberOfLines={2}>
                {daysLine ? (
                  <>
                    <Text style={{ color: t.accent, fontWeight: '700' }}>{daysLine.accent}</Text>
                    {daysLine.rest}
                  </>
                ) : (
                  labelNoStreak
                )}
              </Text>
            </View>
          </Animated.View>

          <Animated.Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.body, lineHeight: bodyLineHeight }, rise1]}>
            {finalSubtitle}
          </Animated.Text>

          {context === 'startup_recovery' && recoveryHint?.linked === true && (
            <Animated.Text style={[styles.subtitle, { color: t.accent, fontSize: f.caption }, rise1]}>
              {recoveryHint.maskedEmail
                ? `${triLang(lang, { ru: 'Твой прогресс привязан к аккаунту', uk: 'Твій прогрес прив’язаний до акаунта', es: 'Tu progreso está vinculado a la cuenta', 'pt-BR': 'Seu progresso está vinculado à conta', vi: 'Tiến độ của bạn được liên kết với tài khoản', id: 'Progresmu tertaut ke akun', tr: 'İlerlemen bu hesaba bağlı', pl: 'Twój postęp jest powiązany z kontem' })} ${recoveryHint.maskedEmail} ${triLang(lang, { ru: '— войди через него', uk: '— увійди через нього', es: '— inicia sesión con ella', 'pt-BR': '— entre com ela', vi: '— hãy đăng nhập bằng tài khoản đó', id: '— masuk dengan akun itu', tr: '— onunla giriş yap', pl: '— zaloguj się przez nie' })}`
                : triLang(lang, { ru: `Прогресс привязан к аккаунту ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — выбери его при входе`, uk: `Прогрес прив’язаний до акаунта ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — обери його під час входу`, es: `El progreso está vinculado a una cuenta de ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'}: elígela al entrar`, 'pt-BR': `O progresso está vinculado a uma conta ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — escolha-a ao entrar`, vi: `Tiến độ được liên kết với tài khoản ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — hãy chọn đúng tài khoản đó`, id: `Progres tertaut ke akun ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — pilih akun itu saat masuk`, tr: `İlerleme bir ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} hesabına bağlı — girişte onu seç`, pl: `Postęp jest powiązany z kontem ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — wybierz je przy logowaniu` })}
            </Animated.Text>
          )}

          <Animated.View style={[styles.buttons, rise2]}>
            {googleAvail && (
              <GoogleSignInButton
                onPress={() => handleSignIn('google')}
                loading={loadingProvider === 'google'}
                disabled={authOperationBusy}
                label={labelGoogle}
                variant="light"
              />
            )}
          </Animated.View>
          <Animated.View style={[styles.buttons, rise3]}>
            {appleAvail && (
              <AppleSignInButton
                onPress={() => handleSignIn('apple')}
                loading={loadingProvider === 'apple'}
                disabled={authOperationBusy}
                label={labelApple}
              />
            )}
          </Animated.View>

          {loadingProvider !== null && (
            <View
              testID={signInSlow ? 'auth-prompt-slow' : 'auth-prompt-busy'}
              accessibilityRole="progressbar"
              accessibilityLabel={signInSlow ? signInSlowLabel : signInBusyLabel}
              accessibilityLiveRegion="polite"
              accessibilityState={{ busy: true }}
              style={[
                styles.busyPanel,
                {
                  backgroundColor: t.bgSurface,
                  borderColor: t.border,
                },
              ]}
            >
              <ActivityIndicator size="small" color={t.accent} />
              <Text style={[styles.busyText, { color: t.textSecond, fontSize: f.caption }]}>
                {signInSlow ? signInSlowLabel : signInBusyLabel}
              </Text>
            </View>
          )}

          {!googleAvail && !appleAvail && (
            <Text style={[styles.errorNote, { color: t.wrong, fontSize: f.caption }]}>
              {triLang(lang, {
                ru: 'Ни один провайдер не доступен на этом устройстве.',
                uk: 'Жоден провайдер не доступний на цьому пристрої.',
                es: 'Ningún método de entrada está disponible en este dispositivo.',
                'pt-BR': 'Nenhum método de entrada está disponível neste dispositivo.',
                vi: 'Không có phương thức đăng nhập nào khả dụng trên thiết bị này.',
                id: 'Tidak ada metode masuk yang tersedia di perangkat ini.',
                tr: 'Bu cihazda kullanılabilir giriş yöntemi yok.',
                pl: 'Na tym urządzeniu nie ma dostępnej metody logowania.',
              })}
            </Text>
          )}

          {!!inlineError && (
            <Text style={[styles.errorNote, { color: t.wrong, fontSize: f.caption }]}>
              {inlineError}
            </Text>
          )}

          {!!inlineError && retryProvider !== null && loadingProvider === null && !recoverySessionActive && (
            <Pressable
              onPress={() => { void handleSignIn(retryProvider); }}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, { ru: 'Повторить вход', uk: 'Повторити вхід', es: 'Reintentar acceso', 'pt-BR': 'Tentar entrar novamente', vi: 'Thử đăng nhập lại', id: 'Coba masuk lagi', tr: 'Girişi tekrar dene', pl: 'Spróbuj zalogować ponownie' })}
              style={[styles.laterButton, { borderRadius: 12, marginTop: 8, backgroundColor: t.accent }]}
            >
              <Text style={[styles.laterText, { color: t.correctText, fontSize: f.body }]}>
                {triLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
              </Text>
            </Pressable>
          )}

          {showRecoveryEntry && !recoveryPanelVisible && !cleanRecoveryPanelVisible && (
            <Pressable
              testID="auth-recovery-entry"
              onPress={handleRecoveryEntry}
              disabled={authOperationBusy}
              accessibilityRole="button"
              accessibilityLabel={recoveryCopy.entry}
              accessibilityState={{ disabled: authOperationBusy }}
              style={styles.recoveryTertiaryButton}
            >
              <Text style={[styles.recoveryTertiaryText, { color: t.accent, fontSize: f.body }]}>
                {recoveryCopy.entry}
              </Text>
            </Pressable>
          )}

          {!recoveryPanelVisible && !cleanRecoveryPanelVisible && (
            <Pressable
              testID="auth-clean-recovery-entry"
              onPress={handleCleanRecoveryEntry}
              disabled={authOperationBusy}
              accessibilityRole="button"
              accessibilityLabel={cleanRecoveryCopy.entry}
              accessibilityState={{ disabled: authOperationBusy }}
              style={styles.recoveryTertiaryButton}
            >
              <Text style={[styles.recoveryTertiaryText, { color: t.accent, fontSize: f.body }]}>
                {cleanRecoveryCopy.entry}
              </Text>
            </Pressable>
          )}

          {cleanRecoveryPanelVisible && (
            <View
              style={[styles.recoveryPanel, { backgroundColor: t.bgSurface }]}
              accessibilityLiveRegion="polite"
            >
              {cleanRecoveryScreen === 'support' ? (
                <View testID="auth-clean-recovery-support" accessible accessibilityRole="alert">
                  <Text style={[styles.recoveryTitle, { color: t.textPrimary, fontSize: f.body }]}>
                    {cleanRecoveryCopy.supportTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: t.textSecond, fontSize: f.caption }]}>
                    {cleanRecoveryCopy.supportBody}
                  </Text>
                </View>
              ) : cleanRecoveryScreen === 'code' ? (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: t.textPrimary, fontSize: f.body }]}>
                    {cleanRecoveryCopy.sentTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: t.textSecond, fontSize: f.caption }]}>
                    {cleanRecoveryCopy.sentBody}
                  </Text>
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.recoveryExpiry, { color: cleanRecoveryExpired ? t.wrong : t.textMuted, fontSize: f.caption }]}
                  >
                    {cleanRecoveryExpired
                      ? recoveryCopy.errorExpired
                      : `${cleanRecoveryCopy.expiresIn} ${cleanRecoveryExpiryCountdown} s`}
                  </Text>
                  <TextInput
                    testID="auth-clean-recovery-code-input"
                    value={cleanRecoveryCode}
                    onChangeText={(value) => setCleanRecoveryCode(normalizeRecoveryCodeInput(value))}
                    editable={!cleanRecoveryBusy && !cleanRecoveryExpired}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    accessibilityLabel={cleanRecoveryCopy.codeLabel}
                    style={[
                      styles.recoveryCodeInput,
                      {
                        color: t.textPrimary,
                        backgroundColor: t.bgPrimary,
                        borderColor: cleanRecoveryError ? t.wrong : t.border,
                        fontSize: Math.max(22, f.h1),
                      },
                    ]}
                  />
                  {!isRecoveryEmailValid(cleanRecoveryEmail) && (
                    <View>
                      <Text style={[styles.recoveryBody, { color: t.textSecond, fontSize: f.caption }]}>
                        {cleanRecoveryCopy.resendEmailHint}
                      </Text>
                      <TextInput
                        testID="auth-clean-recovery-resend-email-input"
                        value={cleanRecoveryEmail}
                        onChangeText={setCleanRecoveryEmail}
                        editable={!cleanRecoveryBusy}
                        keyboardType="email-address"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="emailAddress"
                        accessibilityLabel={cleanRecoveryCopy.emailLabel}
                        placeholder={cleanRecoveryCopy.emailPlaceholder}
                        placeholderTextColor={t.textMuted}
                        style={[
                          styles.recoveryEmailInput,
                          {
                            color: t.textPrimary,
                            backgroundColor: t.bgPrimary,
                            borderColor: t.border,
                            fontSize: f.body,
                          },
                        ]}
                      />
                    </View>
                  )}
                  <Pressable
                    onPress={() => { void handleCleanRecoveryConfirm(); }}
                    disabled={cleanRecoveryBusy || cleanRecoveryExpired || cleanRecoveryCode.length !== 6}
                    accessibilityRole="button"
                    accessibilityLabel={cleanRecoveryCopy.confirm}
                    accessibilityState={{ disabled: cleanRecoveryBusy || cleanRecoveryExpired || cleanRecoveryCode.length !== 6, busy: cleanRecoveryBusy }}
                    style={[
                      styles.recoveryPrimaryButton,
                      { backgroundColor: t.accent, opacity: cleanRecoveryBusy || cleanRecoveryExpired || cleanRecoveryCode.length !== 6 ? 0.55 : 1 },
                    ]}
                  >
                    <Text style={[styles.recoveryPrimaryText, { color: t.correctText, fontSize: f.body }]}>
                      {cleanRecoveryBusy ? cleanRecoveryCopy.working : cleanRecoveryCopy.confirm}
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="auth-clean-recovery-resend"
                    onPress={() => { void handleCleanRecoveryResend(); }}
                    disabled={cleanRecoveryBusy || cleanRecoveryExpired || cleanRecoveryCountdown > 0 || !isRecoveryEmailValid(cleanRecoveryEmail)}
                    accessibilityRole="button"
                    accessibilityLabel={cleanRecoveryCountdown > 0 ? `${cleanRecoveryCopy.resendIn} ${cleanRecoveryCountdown}` : cleanRecoveryCopy.resend}
                    accessibilityState={{ disabled: cleanRecoveryBusy || cleanRecoveryExpired || cleanRecoveryCountdown > 0 || !isRecoveryEmailValid(cleanRecoveryEmail) }}
                    style={styles.recoverySecondaryButton}
                  >
                    <Text style={[styles.recoverySecondaryText, { color: t.accent, fontSize: f.caption }]}>
                      {cleanRecoveryCountdown > 0
                        ? `${cleanRecoveryCopy.resendIn} ${cleanRecoveryCountdown} s`
                        : cleanRecoveryCopy.resend}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void handleCleanRecoveryChangeEmail();
                    }}
                    disabled={cleanRecoveryBusy}
                    accessibilityRole="button"
                    accessibilityLabel={cleanRecoveryCopy.changeEmail}
                    accessibilityState={{ disabled: cleanRecoveryBusy, busy: cleanRecoveryBusy }}
                    style={styles.recoverySecondaryButton}
                  >
                    <Text style={[styles.recoverySecondaryText, { color: t.textSecond, fontSize: f.caption }]}>
                      {cleanRecoveryCopy.changeEmail}
                    </Text>
                  </Pressable>
                </View>
              ) : cleanRecoveryScreen === 'email' ? (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: t.textPrimary, fontSize: f.body }]}>
                    {cleanRecoveryCopy.emailTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: t.textSecond, fontSize: f.caption }]}>
                    {cleanRecoveryCopy.emailBody}
                  </Text>
                  <TextInput
                    testID="auth-clean-recovery-email-input"
                    value={cleanRecoveryEmail}
                    onChangeText={(value) => {
                      setCleanRecoveryEmail(value);
                      if (cleanRecoveryError) setCleanRecoveryError(null);
                    }}
                    editable={!cleanRecoveryBusy}
                    keyboardType="email-address"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    accessibilityLabel={cleanRecoveryCopy.emailLabel}
                    placeholder={cleanRecoveryCopy.emailPlaceholder}
                    placeholderTextColor={t.textMuted}
                    style={[
                      styles.recoveryEmailInput,
                      {
                        color: t.textPrimary,
                        backgroundColor: t.bgPrimary,
                        borderColor: cleanRecoveryError ? t.wrong : t.border,
                        fontSize: f.body,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={() => { void handleCleanRecoveryRequest(); }}
                    disabled={cleanRecoveryBusy || !isRecoveryEmailValid(cleanRecoveryEmail)}
                    accessibilityRole="button"
                    accessibilityLabel={cleanRecoveryCopy.sendCode}
                    accessibilityState={{ disabled: cleanRecoveryBusy || !isRecoveryEmailValid(cleanRecoveryEmail), busy: cleanRecoveryBusy }}
                    style={[
                      styles.recoveryPrimaryButton,
                      { backgroundColor: t.accent, opacity: cleanRecoveryBusy || !isRecoveryEmailValid(cleanRecoveryEmail) ? 0.55 : 1 },
                    ]}
                  >
                    <Text style={[styles.recoveryPrimaryText, { color: t.correctText, fontSize: f.body }]}>
                      {cleanRecoveryBusy ? cleanRecoveryCopy.working : cleanRecoveryCopy.sendCode}
                    </Text>
                  </Pressable>
                </View>
              ) : cleanRecoveryScreen === 'resume' ? (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: t.textPrimary, fontSize: f.body }]}>
                    {cleanRecoveryCopy.resumeTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: t.textSecond, fontSize: f.caption }]}>
                    {cleanRecoveryCopy.resumeBody}
                  </Text>
                  <Pressable
                    onPress={() => {
                      void handleCleanRecoveryResume();
                    }}
                    disabled={cleanRecoveryBusy || cleanRecoveryStage !== 'confirmed'}
                    accessibilityRole="button"
                    accessibilityLabel={cleanRecoveryCopy.resume}
                    accessibilityState={{ disabled: cleanRecoveryBusy || cleanRecoveryStage !== 'confirmed', busy: cleanRecoveryBusy }}
                    style={[styles.recoveryPrimaryButton, { backgroundColor: t.accent, opacity: cleanRecoveryBusy ? 0.55 : 1 }]}
                  >
                    <Text style={[styles.recoveryPrimaryText, { color: t.correctText, fontSize: f.body }]}>
                      {cleanRecoveryBusy ? cleanRecoveryCopy.working : cleanRecoveryCopy.resume}
                    </Text>
                  </Pressable>
                </View>
              ) : cleanRecoveryScreen === 'provider' ? (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: t.textPrimary, fontSize: f.body }]}>
                    {cleanRecoveryCopy.providerTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: t.textSecond, fontSize: f.caption }]}>
                    {cleanRecoveryCopy.providerBody}
                  </Text>
                  <View style={styles.recoveryProviderChoices}>
                    {googleAvail && (
                      <Pressable
                        onPress={() => { void handleCleanRecoveryStart('google'); }}
                        disabled={cleanRecoveryBusy}
                        accessibilityRole="button"
                        accessibilityLabel={recoveryCopy.useGoogle}
                        accessibilityState={{ disabled: cleanRecoveryBusy, busy: cleanRecoveryBusy }}
                        style={[styles.recoveryPrimaryButton, { backgroundColor: t.accent, opacity: cleanRecoveryBusy ? 0.55 : 1 }]}
                      >
                        <Text style={[styles.recoveryPrimaryText, { color: t.correctText, fontSize: f.body }]}>
                          {recoveryCopy.useGoogle}
                        </Text>
                      </Pressable>
                    )}
                    {appleAvail && (
                      <Pressable
                        onPress={() => { void handleCleanRecoveryStart('apple'); }}
                        disabled={cleanRecoveryBusy}
                        accessibilityRole="button"
                        accessibilityLabel={recoveryCopy.useApple}
                        accessibilityState={{ disabled: cleanRecoveryBusy, busy: cleanRecoveryBusy }}
                        style={[styles.recoverySecondaryOutlinedButton, { borderColor: t.border, opacity: cleanRecoveryBusy ? 0.55 : 1 }]}
                      >
                        <Text style={[styles.recoveryPrimaryText, { color: t.textPrimary, fontSize: f.body }]}>
                          {recoveryCopy.useApple}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : null}
              {!!cleanRecoveryError && (
                <Text accessibilityRole="alert" style={[styles.recoveryError, { color: t.wrong, fontSize: f.caption }]}>
                  {cleanRecoveryError}
                </Text>
              )}
            </View>
          )}

          {recoveryPanelVisible && (
            <View
              style={[styles.recoveryPanel, { backgroundColor: t.bgSurface }]}
              accessibilityLiveRegion="polite"
            >
              {(recoveryStage === 'failed' || recoveryStage === 'quarantined') ? (
                <View testID="auth-recovery-support" accessible accessibilityRole="alert">
                  <Text style={[styles.recoveryTitle, { color: t.textPrimary, fontSize: f.body }]}>
                    {recoveryCopy.supportTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: t.textSecond, fontSize: f.caption }]}>
                    {recoveryCopy.supportBody}
                  </Text>
                </View>
              ) : recoveryStage === 'code_sent' || recoveryStage === 'confirming' || recoveryStage === 'adopting' ? (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: t.textPrimary, fontSize: f.body }]}>
                    {recoveryCopy.codeTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: t.textSecond, fontSize: f.caption }]}>
                    {recoveryFlowState.maskedEmail || recoveryCopy.codeDescription}
                  </Text>
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.recoveryExpiry, { color: recoveryExpired ? t.wrong : t.textMuted, fontSize: f.caption }]}
                  >
                    {recoveryExpired
                      ? recoveryCopy.errorExpired
                      : `${recoveryCopy.expiresIn} ${recoveryExpiryCountdown} s`}
                  </Text>
                  <TextInput
                    testID="auth-recovery-code-input"
                    value={recoveryCode}
                    onChangeText={(value) => setRecoveryCode(normalizeRecoveryCodeInput(value))}
                    editable={!recoveryBusy && !recoveryExpired}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    accessibilityLabel={recoveryCopy.codeLabel}
                    style={[
                      styles.recoveryCodeInput,
                      {
                        color: t.textPrimary,
                        backgroundColor: t.bgPrimary,
                        borderColor: recoveryError ? t.wrong : t.border,
                        fontSize: Math.max(22, f.h1),
                      },
                    ]}
                  />
                  <Pressable
                    onPress={() => { void handleRecoveryConfirm(); }}
                    disabled={recoveryBusy || recoveryExpired || recoveryCode.length !== 6}
                    accessibilityRole="button"
                    accessibilityLabel={recoveryCopy.confirm}
                    accessibilityState={{ disabled: recoveryBusy || recoveryExpired || recoveryCode.length !== 6, busy: recoveryBusy }}
                    style={[
                      styles.recoveryPrimaryButton,
                      { backgroundColor: t.accent, opacity: recoveryBusy || recoveryExpired || recoveryCode.length !== 6 ? 0.55 : 1 },
                    ]}
                  >
                    <Text style={[styles.recoveryPrimaryText, { color: t.correctText, fontSize: f.body }]}>
                      {recoveryBusy ? recoveryCopy.working : recoveryCopy.confirm}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { void handleRecoveryResend(); }}
                    disabled={recoveryBusy || recoveryCountdown > 0}
                    accessibilityRole="button"
                    accessibilityLabel={recoveryCountdown > 0 ? `${recoveryCopy.resendIn} ${recoveryCountdown}` : recoveryCopy.resend}
                    accessibilityState={{ disabled: recoveryBusy || recoveryCountdown > 0 }}
                    style={styles.recoverySecondaryButton}
                  >
                    <Text style={[styles.recoverySecondaryText, { color: t.accent, fontSize: f.caption }]}>
                      {recoveryCountdown > 0
                        ? `${recoveryCopy.resendIn} ${recoveryCountdown} s`
                        : recoveryCopy.resend}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: t.textPrimary, fontSize: f.body }]}>
                    {recoveryEntryMode === 'google_instruction'
                      ? recoveryCopy.instructionTitle
                      : recoveryCopy.codeTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: t.textSecond, fontSize: f.caption }]}>
                    {recoveryEntryMode === 'google_instruction'
                      ? `${recoveryCopy.googleInstruction}${recoveryHint?.maskedEmail ? ` ${recoveryHint.maskedEmail}.` : ''}`
                      : recoveryEntryMode === 'provider_choice'
                      ? recoveryCopy.providerChoice
                      : recoveryCopy.codeDescription}
                  </Text>
                  {recoveryEntryMode === 'provider_choice' ? (
                    <View style={styles.recoveryProviderChoices}>
                      {googleAvail && (
                        <Pressable
                          onPress={() => { void handleRecoveryStart('google'); }}
                          disabled={recoveryBusy}
                          accessibilityRole="button"
                          accessibilityLabel={recoveryCopy.useGoogle}
                          accessibilityState={{ disabled: recoveryBusy, busy: recoveryBusy }}
                          style={[styles.recoveryPrimaryButton, { backgroundColor: t.accent, opacity: recoveryBusy ? 0.55 : 1 }]}
                        >
                          <Text style={[styles.recoveryPrimaryText, { color: t.correctText, fontSize: f.body }]}>
                            {recoveryCopy.useGoogle}
                          </Text>
                        </Pressable>
                      )}
                      {appleAvail && (
                        <Pressable
                          onPress={() => { void handleRecoveryStart('apple'); }}
                          disabled={recoveryBusy}
                          accessibilityRole="button"
                          accessibilityLabel={recoveryCopy.useApple}
                          accessibilityState={{ disabled: recoveryBusy, busy: recoveryBusy }}
                          style={[styles.recoverySecondaryOutlinedButton, { borderColor: t.border, opacity: recoveryBusy ? 0.55 : 1 }]}
                        >
                          <Text style={[styles.recoveryPrimaryText, { color: t.textPrimary, fontSize: f.body }]}>
                            {recoveryCopy.useApple}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => { void handleRecoveryRequest(recoveryHint?.provider === 'apple' ? 'apple' : 'google'); }}
                      disabled={recoveryBusy}
                      accessibilityRole="button"
                      accessibilityLabel={recoveryCopy.sendCode}
                      accessibilityState={{ disabled: recoveryBusy, busy: recoveryBusy }}
                      style={[styles.recoveryPrimaryButton, { backgroundColor: t.accent, opacity: recoveryBusy ? 0.55 : 1 }]}
                    >
                      <Text style={[styles.recoveryPrimaryText, { color: t.correctText, fontSize: f.body }]}>
                        {recoveryBusy ? recoveryCopy.working : recoveryCopy.sendCode}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
              {!!recoveryError && (
                <Text accessibilityRole="alert" style={[styles.recoveryError, { color: t.wrong, fontSize: f.caption }]}>
                  {recoveryError}
                </Text>
              )}
            </View>
          )}

          {__DEV__ && context !== 'startup_recovery' && (
            <Pressable
              onPress={handleResetAndRetry}
              disabled={loadingProvider !== null}
              style={[
                styles.laterButton,
                {
                  borderRadius: 12,
                  marginTop: 6,
                  backgroundColor: t.bgSurface,
                },
              ]}
            >
              <Text style={[styles.laterText, { color: t.wrong, fontSize: f.caption }]}>
                DEBUG: Сбросить identity и войти заново
              </Text>
            </Pressable>
          )}

          {/* Строка доверия со щитом */}
          <Animated.View style={[styles.shieldRow, rise4]}>
            <Ionicons name="shield-checkmark" size={13} color={t.accent} />
            <Text style={[styles.shieldText, { color: t.textGhost, fontSize: f.caption, lineHeight: captionLineHeight }]}>
              {labelShield}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.footerCol, rise5]}>
            {motionVariant === 'hybrid' ? (
              // Вторичное действие — единый пресс-стандарт PressableHybrid
              // (variant secondary: PRESS.scale.secondary, без перелёта на
              // возврате — закон «удар/вес только у героя кульминации»).
              <PressableHybrid
                onPress={dismissSheet}
                disabled={(loadingProvider !== null && !signInSlow) || !recoveryDismissAllowed}
                accessibilityLabel={labelLaterAccessibility}
                accessibilityState={{ disabled: (loadingProvider !== null && !signInSlow) || !recoveryDismissAllowed }}
                variant="secondary"
                style={[styles.laterButton, { opacity: recoveryDismissAllowed ? 1 : 0.45 }]}
                contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
                testID="auth-prompt-later"
              >
                <Text style={[styles.laterText, { color: t.textMuted, fontSize: f.body }]}>
                  {labelLater}
                </Text>
              </PressableHybrid>
            ) : (
              <Pressable
                onPress={dismissSheet}
                disabled={(loadingProvider !== null && !signInSlow) || !recoveryDismissAllowed}
                accessibilityRole="button"
                accessibilityLabel={labelLaterAccessibility}
                accessibilityState={{ disabled: (loadingProvider !== null && !signInSlow) || !recoveryDismissAllowed }}
                style={[styles.laterButton, { opacity: recoveryDismissAllowed ? 1 : 0.45 }]}
                testID="auth-prompt-later"
              >
                <Text style={[styles.laterText, { color: t.textMuted, fontSize: f.body }]}>
                  {labelLater}
                </Text>
              </Pressable>
            )}
            <View style={styles.legalLinks}>
              <Pressable onPress={() => Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL)} hitSlop={8}>
                <Text style={[styles.legalLink, { color: t.accent, fontSize: f.caption, lineHeight: captionLineHeight }]}>{triLang(lang, { ru: 'Политика конфиденциальности', uk: 'Політика конфіденційності', es: 'Política de privacidad', 'pt-BR': 'Política de privacidade', vi: 'Chính sách quyền riêng tư', id: 'Kebijakan privasi', tr: 'Gizlilik Politikası', pl: 'Polityka prywatności' })}</Text>
              </Pressable>
              <Text style={{ color: t.textGhost, fontSize: f.caption, lineHeight: captionLineHeight }}>|</Text>
              <Pressable onPress={() => Linking.openURL(KNOWLY_LEGAL_TERMS_URL)} hitSlop={8}>
                <Text style={[styles.legalLink, { color: t.accent, fontSize: f.caption, lineHeight: captionLineHeight }]}>{triLang(lang, { ru: 'Условия использования', uk: 'Умови використання', es: 'Términos de uso', 'pt-BR': 'Termos de uso', vi: 'Điều khoản sử dụng', id: 'Ketentuan penggunaan', tr: 'Kullanım Koşulları', pl: 'Warunki korzystania' })}</Text>
              </Pressable>
            </View>
          </Animated.View>
          </ScrollView>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default memo(RegistrationPromptModal);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  hybridSheetGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  grabberZone: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 4,
    right: 8,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    width: '100%',
  },
  sheetContent: {
    paddingTop: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 12,
    paddingRight: 30,
  },
  streakBadge: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    textAlign: 'left',
  },
  daysLine: {
    marginTop: 2,
    lineHeight: 18,
  },
  subtitle: {
    textAlign: 'left',
    marginBottom: 18,
  },
  buttons: {
    width: '100%',
    marginBottom: 10,
  },
  busyPanel: {
    width: '100%',
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  busyText: {
    flex: 1,
    fontWeight: '700',
    textAlign: 'left',
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 2,
  },
  shieldText: {
    textAlign: 'center',
  },
  footerCol: {
    alignItems: 'center',
  },
  laterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  laterText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    rowGap: 2,
    marginTop: 8,
    width: '100%',
  },
  legalLink: {
    fontWeight: '700',
    textAlign: 'center',
  },
  errorNote: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  recoveryTertiaryButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoveryTertiaryText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  recoveryPanel: {
    width: '100%',
    minHeight: 224,
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
    marginBottom: 10,
    justifyContent: 'center',
  },
  recoveryContentSlot: {
    minHeight: 190,
    justifyContent: 'center',
  },
  recoveryTitle: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  recoveryBody: {
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
  },
  recoveryCodeInput: {
    width: '100%',
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '800',
    marginBottom: 10,
  },
  recoveryEmailInput: {
    width: '100%',
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  recoveryExpiry: {
    minHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  recoveryPrimaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoverySecondaryOutlinedButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoveryPrimaryText: {
    fontWeight: '800',
    textAlign: 'center',
  },
  recoverySecondaryButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoverySecondaryText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  recoveryProviderChoices: {
    gap: 10,
  },
  recoveryError: {
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
});
