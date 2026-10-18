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
import { AccessibilityInfo, AppState, Modal, View, Text, TextInput, Pressable, StyleSheet, Platform, ScrollView, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { isLightThemeMode } from '../constants/theme'; // зачем: стиль кнопки Apple по теме шторки (координатор 13.10)
import { useLang } from './LangContext';
import { AuthProviderButtonPlaceholder } from './AuthProviderButtons';
// зачем (координатор 18.10, auth-states.html): кнопки входа с кольцом на месте значка, строка «Входим…» с 3 с и мягкая карточка сбоя вместо красного текста
import SignInProgressButton from './auth/SignInProgressButton';
import { SignInFailureCard, SignInStatusLine } from './auth/SignInProgressNote';
import { cancelGuestSwitchOffer, runGuestSwitchToExistingAccount, useGuestSwitchOffer } from '../app/guest_switch_offer';
import { RecoveryCodeLine, formatRecoveryClock, recoveryExpiredSendingText, recoveryNewCodeSentText } from './auth/RecoveryCodeLine';
import type { SignInFailureKind } from './auth/sign_in_progress_copy';
import GuestSwitchWarningSheet from './auth/GuestSwitchWarningSheet';
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
  isGoogleSignInAvailableSync,
  peekAppleSignInAvailability,
  peekAppleUnavailableReason,
  peekLinkedAuthFromCurrentUser,
  AUTH_PROMPT_SHOWN_KEY,
  APPLE_ANDROID_MISSING_SERVICE_ID,
  type SignInResult,
  type AuthProviderId,
} from '../app/auth_provider';
import { logEvent } from '../app/firebase';
import { fetchAuthRecoveryHint, restoreFromCloudDetailed, warmAuthSignInCallables, type AuthRecoveryHint } from '../app/cloud_sync';
import { getStableId } from '../app/stable_id';
import { emitAppEvent } from '../app/events';
import {
  ENABLE_AUTH_IDENTITY_DEBUG,
  KNOWLY_LEGAL_PRIVACY_URL,
  KNOWLY_LEGAL_TERMS_URL,
} from '../app/config';
import { openLegalLink } from '../app/open_legal_link';
import { triLang, type Lang } from '../constants/i18n';
import {
  getStartupRecoveryHonestCopy,
  resolveStartupRecoveryLinkState,
  shouldShowSavedJourneyLine,
} from './startup_recovery_link_copy';
import { accountRestoreFailedCopy, promptAccountRestoreAfterSignInRefusal } from '../app/account_delete_restore_prompt';
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
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { nestedBoxShadow } from './v2/ShadowSurface';
import { useKeyboardBottomInset } from './keyboardAvoidance';
import { signInRefusalCopyFor } from '../app/account_sync_copy';
import { noteSwallowedAs, noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { identityErrorCode } from '../app/identity_trace';
import { authErrorKind, authErrorLogCode, authErrorTextForKind } from '../app/auth_error_copy';
import { reportSignInOutcome, reportSignInThrew } from '../app/auth_release_reasons';

// зачем: владелец 2026-08-22 — было 45 с: почти минута на занятой кнопке без
// обратной связи и без выхода. После ускорения входа (тёплый authEnsureStableLink,
// прогрев, параллельный refresh токена) нормальный вход укладывается в секунды,
// поэтому подсказка «вход занимает больше времени» и аварийный выход из модалки
// включаются через 8 с. Задача входа остаётся авторитетной (Promise.race нет),
// повторный тап держит authOperationGate — контракт stable_link не тронут.
const SIGN_IN_SLOW_THRESHOLD_MS = 8_000;
// зачем (правило владельца 18.10: красного во входе нет; эталон auth-states блок 7): просроченный код приложение отправляет заново само — не чаще двух раз за показ окна (серверный лимит повторов)
const RECOVERY_AUTO_RESEND_MAX = 2;

/**
 * зачем (аудит двойного тапа 11.10): catch-блоки восстановления только показывали текст —
 * причина отказа в лог не попадала. Пишем код без текста ошибки (в тексте может быть почта).
 */
function logAuthModalCatch(step: string, error: unknown): void {
  console.warn(`[AUTH-MODAL] ${step} failed code=${identityErrorCode(error)}`); // guard-ok: catch пишет причину (правило владельца)
}

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
 * Акцентная часть строки («148 дней») + остаток фразы про сохранённый путь.
 * Возвращает null при нулевой серии — тогда показываем фолбэк-строку.
 *
 * зачем склонение отдельно от текста: у каждого языка своё правило для «дней»
 * (slavicDayWord для ru/uk/pl, единственное-множественное для es/pt-BR), а сам
 * текст идёт через triLang — так сторож i18n видит переводчик.
 */
// зачем (аудит по Библии, 2026-08-26): было «вашего прогресса ждёт в облаке» —
// обращение на «вы» (Правило 14), запрещённое «прогресс» (словарь: прогресс →
// путь) и техническое «в облаке» (Часть V п.3). Правлено во всех локалях.
function streakDaysLine(lang: string, n: number): { accent: string; rest: string } | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  const one = n === 1;
  // Акцент («148 дней») собирается по правилу склонения своего языка.
  // Слово «день» в нужном числе: у ru/uk/pl падежи, у остальных — число.
  const dayForms = triLang(lang as Lang, {
    ru: ['день', 'дня', 'дней'], uk: ['день', 'дні', 'днів'], en: ['day', 'days', 'days'],
    es: ['día', 'días', 'días'], 'pt-BR': ['dia', 'dias', 'dias'], vi: ['ngày', 'ngày', 'ngày'],
    id: ['hari', 'hari', 'hari'], tr: ['gün', 'gün', 'gün'], pl: ['dzień', 'dni', 'dni'],
  }) as readonly [string, string, string];
  const slavic = lang === 'ru' || lang === 'uk' || lang === 'pl';
  const dayWord = slavic
    ? slavicDayWord(n, dayForms[0], dayForms[1], dayForms[2])
    : (one ? dayForms[0] : dayForms[1]);
  const accent = `${n} ${dayWord}`;
  // Остаток фразы — через triLang: так сторож i18n видит переводчик, а не
  // «забытый русский», и правка текста не выглядит ростом долга.
  const rest = triLang(lang as Lang, one
    ? {
      ru: ' твоего пути уже сохранён',
      uk: ' твого шляху вже збережено',
      en: ' of your journey is already saved',
      es: ' de tu camino ya está guardado',
      'pt-BR': ' do seu caminho já está salvo',
      vi: ' hành trình của bạn đã được lưu',
      id: ' perjalananmu sudah tersimpan',
      tr: ' yolculuğun kayıtlı duruyor',
      pl: ' twojej drogi jest już zapisany',
    }
    : {
      ru: ' твоего пути уже сохранены',
      uk: ' твого шляху вже збережені',
      en: ' of your journey are already saved',
      es: ' de tu camino ya están guardados',
      'pt-BR': ' do seu caminho já estão salvos',
      vi: ' hành trình của bạn đã được lưu',
      id: ' perjalananmu sudah tersimpan',
      tr: ' yolculuğun kayıtlı duruyor',
      pl: ' twojej drogi jest już zapisanych',
    });
  return { accent, rest };
}

interface Props {
  visible: boolean;
  /** Контекст показа — для аналитики. 'home_banner' — открыт из persistent
   *  баннера на Home для незалогиненных пользователей с сохранённым прогрессом. */
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
   * зачем (правило владельца 18.10: гость с прогрессом входит в ДРУГОЙ существующий аккаунт — одна шторка «Войти в другой аккаунт?»; приёмка Сайта
   * account_switch_owner_rules_1018): шторку показывает окно входа по сигналу из потока входа (auth_provider, Авторизация). Пока сигнала нет — пропс не передают
   * и шторка не монтируется. «Войти» — onConfirm (вход в B тем же выбором аккаунта), «Отмена»/смахивание — onCancel (остаёмся гостем).
   */
  guestSwitch?: Readonly<{ visible: boolean; accountLabel?: string; onConfirm: () => void; onCancel: () => void }>;
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
  guestSwitch,
  motionVariant = 'classic',
}: Props) {
  const { theme: t, f, themeMode, liquidGlassThemeId } = useTheme();
  // зачем: Liquid Glass (владелец 2026-09-29, макет overlays.html OV-AUTH-*/OV-REC-*/OV-CLEAN-*):
  // непрозрачная основа, нейтральные CTA и поверхности из токенов активной из 13 тем.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  // зачем: поля кода/email в восстановлении не должны перекрываться клавиатурой (Android).
  const keyboardInset = useKeyboardBottomInset(visible);
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { height: viewportHeight } = useWindowDimensions();
  const screenFocused = useIsScreenFocused();

  // зачем (TG-AA6EC9A6D998, кнопки входа без сдвига): Google известен синхронно (модуль +
  // переменная) — считаем к первому кадру открытия; только при visible, чтобы скрытая
  // модалка в корневом layout не тянула модуль Google на холодном старте.
  // Apple: null = iOS ещё не ответил → на его месте невидимая заглушка той же высоты.
  const googleAvail = useMemo(() => (visible ? isGoogleSignInAvailableSync() : false), [visible]);
  const [appleAvail, setAppleAvail] = useState<boolean | null>(peekAppleSignInAvailability);
  const [loadingProvider, setLoadingProvider] = useState<AuthProviderId | null>(null);
  const [signInSlow, setSignInSlow] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  // зачем (макет auth-states.html, блок 4): сбой входа — мягкая карточка с причиной по виду ошибки, а не красный текст; null — прежние сообщения (смена аккаунта, отказы)
  const [signInFailureKind, setSignInFailureKind] = useState<SignInFailureKind | null>(null);
  // зачем (Макеты A4.8, 18.10): отказы со своей причиной («Нужен прежний аккаунт», «Аккаунт восстановлен»…) — та же мягкая карточка, но со своим заголовком и текстом; null — тексты по виду сбоя
  const [signInFailureCopy, setSignInFailureCopy] = useState<{ title: string; body: string } | null>(null);
  // зачем (Макеты A3.2): фаза строки «Входим…» — пока она показана, она стоит НА МЕСТЕ строки «Данные на устройстве сохранятся»
  const [signInStatusPhase, setSignInStatusPhase] = useState<'quiet' | 'calm' | 'long'>('quiet');
  // зачем (правило владельца 18.10: вход не заканчивается ошибкой, кроме «нет сети»): после «Восстановить» вход продолжается сам, без карточки «войди ещё раз».
  // Заряд один за показ окна — если восстановление снова вернёт «восстановлен», показываем прежнюю карточку, а не крутим петлю.
  const [autoContinueProvider, setAutoContinueProvider] = useState<AuthProviderId | null>(null);
  const autoContinueArmedRef = useRef(false);
  // зачем (правило владельца 2, срочное поручение координатора 18.10): состояние шторки гостя ведёт app/guest_switch_offer (Авторизация); проп guestSwitch — переопределение для тестов
  const guestSwitchFromOffer = useGuestSwitchOffer();
  // зачем (решение координатора 18.10): на сторных сборках состояния «нет способа входа» быть не должно — если оно всё же показано, причина и значения идут в журнал [AUTH-NO-PROVIDER]
  useEffect(() => {
    if (!visible || googleAvail || appleAvail !== false) return;
    console.warn(`[AUTH-NO-PROVIDER] shown platform=${Platform.OS} google=${googleAvail ? 1 : 0} apple=${String(appleAvail)} appleReason=${peekAppleUnavailableReason() ?? 'unknown'}`); // guard-ok: ветка и значения, которые её решили
  }, [appleAvail, googleAvail, visible]);
  // зачем (эталон auth-states, A7.7): после автоматической отправки нового кода на месте строки срока — «✓ Отправили новый код», пока человек не начал вводить
  const [recoveryNewCodeNotice, setRecoveryNewCodeNotice] = useState(false);
  const autoResendCountRef = useRef(0);
  const autoResendInFlightRef = useRef(false);
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
    if (visible) warmAuthSignInCallables('registration_prompt');
  }, [visible]);

  useEffect(() => {
    recoveryGenerationRef.current += 1;
    cleanRecoveryGenerationRef.current += 1;
    authOperationGateRef.current.reset();
    if (!visible) {
      cancelGuestSwitchOffer('registration_modal_hidden'); // зачем: окно закрыли, пока шторка гостя ждёт ответа — как «Отмена», гость остаётся гостем
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
    setSignInFailureKind(null);
    setSignInFailureCopy(null);
    setSignInStatusPhase('quiet');
    setAutoContinueProvider(null);
    autoContinueArmedRef.current = false;
    setRecoveryNewCodeNotice(false);
    autoResendCountRef.current = 0;
    autoResendInFlightRef.current = false;
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
    // зачем (TG-AA6EC9A6D998): известный синхронно ответ ставим сразу; иначе спрашиваем iOS,
    // а прежнее значение (или заглушка) держит место — поздний ответ скрытого показа не пишет.
    const applePeek = peekAppleSignInAvailability();
    if (applePeek !== null) {
      setAppleAvail(applePeek);
      // зачем (координатор 18.10 05:45): тупиковой кнопки Apple нет — почему скрыта, видно одной строкой за показ окна.
      if (applePeek === false) {
        console.log(`[AUTH-MODAL] apple_hidden reason=${peekAppleUnavailableReason() ?? 'unknown'} platform=${Platform.OS}`); // guard-ok: одна строка за показ окна
      }
    } else {
      void isAppleSignInAvailable().then((available) => {
        if (active) setAppleAvail(available);
      });
    }
    void AsyncStorage.getItem(STREAK_COUNT_KEY)
      .then((v) => {
        if (!active) return;
        const n = v ? parseInt(v, 10) : 0;
        setStreakDays(Number.isFinite(n) ? n : 0);
      })
      .catch(noteSwallowedHandler('RegistrationPromptModal:useEffect.getItem'));
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
      const stableId = await getStableId().catch(noteSwallowedAs('RegistrationPromptModal:useEffect.getStableId', null));
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
    // зачем (LANG_PASS_REVIEW_R1 п.4, auth-gap-003): заголовки отказов без точки, и «…another account / Your progress is safe…»
    // читалось одним предложением. Точка ставится только если заголовок не кончается знаком конца фразы — одно правило на 9 языков.
    const titleEnded = /[.!?…:]$/.test(title.trim()) ? title.trim() : `${title.trim()}.`;
    setInlineError(`${titleEnded}\n${message}`);
  }, []);

  // зачем (Макеты A4.8, «красного в окне входа быть не должно»): отказ со своей причиной показывается мягкой карточкой; кнопка повтора — только если retryProvider задан
  const showFailureCopy = useCallback((title: string, message: string) => {
    setSignInFailureKind('other');
    setSignInFailureCopy({ title: title.trim(), body: message });
  }, []);

  // Заголовок по утверждённому редизайну: «Всё в безопасности» (для всех контекстов).
  // Контекстные акценты остаются в подзаголовке (finalSubtitle), проп title по-прежнему перекрывает.
  const defaultTitle = triLang(lang, {
    ru: 'Всё в безопасности',
    en: 'Everything is safe',
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
        : 'Быстрый вход. Прогресс будет на всех твоих устройствах.',
    en:
      context === 'lesson1'
        ? 'One tap with Google — and your progress is safe.'
        : context === 'startup_recovery'
        ? 'Sign in with the same Google or Apple account — we’ll restore your progress from the cloud.'
        : context === 'onboarding'
        ? 'You can skip this, but without an account your progress is easy to lose.'
        : 'Quick sign-in. Your progress will be on all your devices.',
    uk:
      context === 'lesson1'
        ? 'Один тап через Google — і прогрес у безпеці.'
        : context === 'startup_recovery'
        ? 'Увійди в той самий акаунт Google або Apple — повернемо прогрес із хмари.'
        : context === 'onboarding'
        ? 'Можна пропустити, але без акаунта прогрес легко втратити.'
        : 'Швидкий вхід. Прогрес буде на всіх твоїх пристроях.',
    es:
      context === 'lesson1'
        ? 'Un toque en Google y tu progreso queda a salvo.'
        : context === 'startup_recovery'
        ? 'Entra con la misma cuenta de Google o Apple y recuperaremos tu progreso.'
        : context === 'onboarding'
        ? 'Puedes omitirlo, pero sin cuenta tu progreso puede perderse.'
        : 'Acceso rápido. Tu progreso estará en todos tus dispositivos.',
    'pt-BR':
      context === 'lesson1'
        ? 'Um toque no Google e seu progresso fica seguro.'
        : context === 'startup_recovery'
        ? 'Entre com a mesma conta Google ou Apple — restauraremos seu progresso.'
        : context === 'onboarding'
        ? 'Você pode pular, mas sem conta seu progresso pode se perder.'
        : 'Entrada rápida. Seu progresso vai estar em todos os seus aparelhos.',
    vi:
      context === 'lesson1'
        ? 'Một chạm qua Google — tiến trình của bạn an toàn.'
        : context === 'startup_recovery'
        ? 'Đăng nhập đúng tài khoản Google hoặc Apple cũ để khôi phục tiến độ.'
        : context === 'onboarding'
        ? 'Có thể bỏ qua, nhưng không tài khoản tiến trình dễ bị mất.'
        : 'Đăng nhập nhanh. Tiến độ sẽ có trên mọi thiết bị của bạn.',
    id:
      context === 'lesson1'
        ? 'Sekali ketuk lewat Google — progresmu aman.'
        : context === 'startup_recovery'
        ? 'Masuk ke akun Google atau Apple yang sama — progresmu akan dipulihkan.'
        : context === 'onboarding'
        ? 'Boleh dilewati, tapi tanpa akun progres mudah hilang.'
        : 'Masuk cepat. Progresmu ada di semua perangkatmu.',
    tr:
      context === 'lesson1'
        ? 'Google ile tek dokunuş — ilerlemen güvende.'
        : context === 'startup_recovery'
        ? 'Aynı Google veya Apple hesabıyla giriş yap — ilerlemeni geri yükleyelim.'
        : context === 'onboarding'
        ? 'Atlayabilirsin, ama hesap olmadan ilerleme kolayca kaybolur.'
        : 'Hızlı giriş. İlerlemen tüm cihazlarında olacak.',
    pl:
      context === 'lesson1'
        ? 'Jedno kliknięcie przez Google — postępy są bezpieczne.'
        : context === 'startup_recovery'
        ? 'Zaloguj się na to samo konto Google lub Apple — przywrócimy postęp z chmury.'
        : context === 'onboarding'
        ? 'Możesz pominąć, ale bez konta postępy łatwo stracić.'
        : 'Szybkie logowanie. Postęp będzie na wszystkich twoich urządzeniach.',
  });

  // зачем (TG-AA6EC9A6D998): окно после переустановки не обещает «вернём прогресс», пока
  // привязка Google/Apple не доказана. Признак — провайдер ТЕКУЩЕЙ сессии (синхронный peek)
  // или подсказка сервера linked:true; без них — нейтральный текст (см. startup_recovery_link_copy).
  const sessionLinkedProvider = useMemo(
    () => (visible && context === 'startup_recovery' ? peekLinkedAuthFromCurrentUser()?.provider ?? null : null),
    [visible, context],
  );
  const recoveryLinkDecision = resolveStartupRecoveryLinkState({
    sessionProvider: sessionLinkedProvider,
    hintLinked: recoveryHint?.linked === true,
  });
  const recoveryHonestCopy = context === 'startup_recovery'
    ? getStartupRecoveryHonestCopy(lang, recoveryLinkDecision.state)
    : null;
  const showSavedJourneyLine = shouldShowSavedJourneyLine(context, recoveryLinkDecision.state);
  useEffect(() => {
    if (!visible || context !== 'startup_recovery') return;
    // зачем: лог [AUTH-RECOVERY-COPY] — какой текст увидел человек и какое значение это решило.
    console.log(
      `[AUTH-RECOVERY-COPY] state=${recoveryLinkDecision.state} decidedBy=${recoveryLinkDecision.decidedBy}`
        + ` sessionProvider=${String(sessionLinkedProvider)} hintLinked=${String(recoveryHint?.linked === true)}`
        + ` customTitle=${String(title !== undefined)} customSubtitle=${String(subtitle !== undefined)}`,
    );
  }, [visible, context, recoveryLinkDecision.state, recoveryLinkDecision.decidedBy, sessionLinkedProvider, recoveryHint?.linked, title, subtitle]);

  const finalTitle = title ?? recoveryHonestCopy?.title ?? defaultTitle;
  const finalSubtitle = subtitle ?? recoveryHonestCopy?.subtitle ?? defaultSubtitle;
  // зачем (overlay.css `.ov-title` 25/31): заголовок окна входа фиксированного кегля, как в макете.
  const titleLineHeight = 31;
  const bodyLineHeight = Math.round(f.body * 1.32);
  const captionLineHeight = Math.max(18, Math.round(f.caption * 1.4));
  const cardMaxHeight = Math.max(280, viewportHeight - 64 - keyboardInset);
  const cardPadding = viewportHeight < 720 ? 20 : 24;

  const labelGoogle = triLang(lang, { ru: 'Войти через Google', en: 'Sign in with Google', uk: 'Війти з Google', es: 'Entrar con Google', 'pt-BR': 'Entrar com Google', vi: 'Đăng nhập bằng Google', id: 'Masuk dengan Google', tr: 'Google ile giriş yap', pl: 'Zaloguj przez Google' });
  const labelApple = triLang(lang, { ru: 'Войти через Apple', en: 'Sign in with Apple', uk: 'Війти з Apple', es: 'Entrar con Apple', 'pt-BR': 'Entrar com Apple', vi: 'Đăng nhập bằng Apple', id: 'Masuk dengan Apple', tr: 'Apple ile giriş yap', pl: 'Zaloguj przez Apple' });
  const labelLater = triLang(lang, { ru: 'Позже', en: 'Later', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti saja', tr: 'Daha sonra', pl: 'Później' });
  const signInBusyLabel = triLang(lang, {
    ru: 'Входим... подожди пару секунд',
    en: 'Signing in... give it a couple seconds',
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
    en: 'Sign-in is taking longer than usual. It’s safe to close this window — the attempt will continue.',
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
        en: 'Close window. Sign-in will continue in the background.',
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
    en: 'Data on your device will be kept',
    es: 'Los datos del dispositivo se conservarán',
    'pt-BR': 'Os dados do dispositivo serão mantidos',
    vi: 'Dữ liệu trên thiết bị được giữ lại',
    id: 'Data di perangkat tetap tersimpan',
    tr: 'Cihazdaki veriler korunur',
    pl: 'Dane na urządzeniu zostaną zachowane',
  });
  // Фолбэк-строка под заголовком, если серии ещё нет.
  // зачем (аудит по Библии, 2026-08-26): строка нарушала три правила разом —
  // обращение на «вы» (Правило 14), запрещённое слово «прогресс» (словарь:
  // прогресс → путь) и техническое «в облаке» (Часть V п.3).
  const labelNoStreak = triLang(lang, {
    ru: 'Твой путь сохранится и дождётся тебя',
    uk: 'Твій шлях збережеться і дочекається тебе',
    en: 'Your journey stays saved and waiting for you',
    es: 'Tu camino queda guardado y te espera',
    'pt-BR': 'Seu caminho fica salvo e espera por você',
    vi: 'Hành trình của bạn được lưu và vẫn chờ bạn',
    id: 'Perjalananmu tersimpan dan menunggumu',
    tr: 'Yolculuğun kayıtlı kalır ve seni bekler',
    pl: 'Twoja droga zostaje zapisana i czeka na ciebie',
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
  // Owner 2026-08-28: provider sign-in is the only live recovery/creation path.
  // Existing profiles restore automatically; deleted profiles create empty ones.
  const showRecoveryEntry = false;
  const showCleanRecoveryEntry = false;

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
      logAuthModalCatch('recovery', error);
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
      logAuthModalCatch('recovery', error);
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
      logAuthModalCatch('recovery', error);
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

  const handleRecoveryResend = useCallback(async (auto: boolean = false) => {
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
      setRecoveryNewCodeNotice(auto);
    } catch (error) {
      logAuthModalCatch('recovery', error);
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

  // зачем (эталон auth-states A7.7, правило владельца 18.10): код просрочен — новый уходит сам, без красной строки «срок истёк, запроси»; повтор уважает серверный интервал (recoveryCountdown) и лимит два раза за показ
  useEffect(() => {
    if (!recoveryPanelVisible || recoveryStage !== 'code_sent' || !recoveryExpired) return;
    if (recoveryBusy || recoveryCountdown > 0 || autoResendInFlightRef.current) return;
    if (autoResendCountRef.current >= RECOVERY_AUTO_RESEND_MAX) {
      console.log(`[AUTH-RECOVERY] auto resend skipped reason=limit count=${autoResendCountRef.current}`); // guard-ok: ранний выход пишет причину
      return;
    }
    autoResendCountRef.current += 1;
    autoResendInFlightRef.current = true;
    console.log(`[AUTH-RECOVERY] code expired → auto resend n=${autoResendCountRef.current}`); // guard-ok: ветка и значение, которое её решило
    void handleRecoveryResend(true).finally(() => { autoResendInFlightRef.current = false; });
  }, [handleRecoveryResend, recoveryBusy, recoveryCountdown, recoveryExpired, recoveryPanelVisible, recoveryStage]);

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
      logAuthModalCatch('clean_recovery', error);
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
      logAuthModalCatch('clean_recovery', error);
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
      logAuthModalCatch('clean_recovery', error);
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
      logAuthModalCatch('clean_recovery', error);
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
      logAuthModalCatch('clean_recovery', error);
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
      logAuthModalCatch('clean_recovery', error);
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
      ) {
        // зачем (правило «каждый ранний выход пишет причину»): отбитый тап входа был немым.
        console.log(`[AUTH-MODAL] sign_in ignored provider=${provider} reason=${loadingProvider !== null ? 'loading' : 'recovery_busy'}`);
        return;
      }
      const attemptToken = attemptLifecycle.startAttempt();
      if (attemptToken === null) {
        console.log(`[AUTH-MODAL] sign_in ignored provider=${provider} reason=attempt_active`);
        return;
      }
      if (!authOperationGateRef.current.tryBegin('provider')) {
        console.log(`[AUTH-MODAL] sign_in ignored provider=${provider} reason=operation_gate_busy`);
        attemptLifecycle.completeAttempt(attemptToken);
        return;
      }
      setLoadingProvider(provider);
      setRetryProvider(null);
      setSignInFailureKind(null); // новая попытка снимает карточку сбоя
      setSignInFailureCopy(null);
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
      // зачем: [SIGNIN] — замер «от тапа до закрытия окна», чтобы владелец видел
      // фактическое время входа, а не оценку по таймаутам (правило «сперва логи»).
      const signInStartedAt = Date.now();
      console.log(`[SIGNIN] ui:tap provider=${provider} context=${context}`);
      try {
        await waitForAuthPromptBusyFrame();
        if (!isAttemptCurrent(attemptToken)) return;
        // Firebase credential mutations cannot be cancelled. Keep this modal busy
        // until the original task settles so a second picker cannot race it.
        let result = await signInWithProvider(provider, {
          requireCurrentStableIdOwnership: context === 'startup_recovery',
        });
        if (result.result === 'error' && result.error === 'account_switch_required' && isAttemptCurrent(attemptToken)) {
          // зачем (правило владельца 2, 18.10): гость с прогрессом входит в ДРУГОЙ существующий аккаунт — не карточка «Вход не завершился», а шторка предупреждения:
          // «Войти» = вход в тот аккаунт без слияния и без второго окна Google, «Отмена» = молча остаёмся гостем. Всё ведёт app/guest_switch_offer.
          console.log(`[AUTH-SWITCH-OFFER] modal guest sheet offered provider=${provider}`); // guard-ok: ветка и значение, которое её решило
          const offer = await runGuestSwitchToExistingAccount(provider);
          console.log(`[AUTH-SWITCH-OFFER] modal guest sheet outcome=${offer.kind} provider=${provider} current=${isAttemptCurrent(attemptToken) ? 1 : 0}`); // guard-ok: итог
          if (!isAttemptCurrent(attemptToken)) return;
          if (offer.kind === 'cancelled') {
            clearSlowTimer();
            setRetryProvider(null);
            return;
          }
          if (offer.kind === 'failed') {
            clearSlowTimer();
            console.warn(`[AUTH-SWITCH-OFFER] modal guest switch failed provider=${provider} reason=${authErrorLogCode(offer.reason)}`); // guard-ok: причина
            setRetryProvider(provider);
            setSignInFailureKind(authErrorKind(offer.reason));
            return;
          }
          result = offer.result;
        }
        // зачем (аудит 11.10): ранний выход пишет причину; строку возврата ниже сторожит auth_provider_stable_link.
        if (!isAttemptCurrent(attemptToken)) console.log(`[AUTH-MODAL] sign_in result dropped provider=${provider} result=${result.result} reason=attempt_invalidated`); // guard-ok: ранний выход пишет причину
        if (!isAttemptCurrent(attemptToken)) return;
        clearSlowTimer();
        console.log(`[SIGNIN] ui:returned provider=${provider} result=${result.result} in=${Date.now() - signInStartedAt}ms`);
        reportSignInOutcome(provider, result);

        if (result.result === 'cancelled') {
          // зачем (решение координатора 18.10, Макеты A4.8): человек сам закрыл окно выбора аккаунта Google/Apple — это не сбой. ТИХО: ни карточки, ни текста, ни «Повторить»;
          // кнопки входа снова активны (finally снимает loadingProvider), повторить можно обычным тапом. Причина — только в журнал.
          setRetryProvider(null);
          // зачем (координатор 18.10 06:12, «без системных текстов»): подсказки разработчика — только в журнал, на экране словарная фраза в любой сборке.
          console.warn(`[AUTH-MODAL] sign_in cancelled provider=${provider} — закрыли окно выбора, нет аккаунта Google на устройстве или неверный webClientId/SHA-1`); // guard-ok: ранний выход пишет причину
          console.log(`[AUTH-CANCEL] provider=${provider} shown=nothing buttons=active in=${Date.now() - signInStartedAt}ms`); // guard-ok: итог для человека — тишина
          setSignInFailureKind(null);
          setSignInFailureCopy(null);
          return;
        }
        if (result.result === 'error') {
          // Большинство ошибок входа retryable (сеть/холодный старт/App Check) —
          // покажем «Повторить»; ветки ниже снимают его там, где повтор бессмыслен.
          setRetryProvider(provider);
          // зачем (координатор 18.10 06:12): код ошибки — всегда в журнал (раньше только в отладке), человеку — словарь.
          console.warn(`[AUTH-MODAL] sign_in error provider=${provider} code=${authErrorLogCode(result.error)} kind=${authErrorKind(result.error)}`); // guard-ok: причина ошибки входа
          if (result.error === 'account_switch_required') {
            // зачем (правила владельца 18.10, приёмка Сайта): такого отказа больше нет — гость с прогрессом получает шторку «Войти в другой аккаунт?», вошедший A входит в B сразу.
            // Если старый ответ всё же пришёл — мягкая карточка «Вход не завершился», без текста про привязку телефона и без перехода в Настройки.
            console.warn('[AUTH-MODAL] account_switch_required received — legacy refusal, generic failure card'); // guard-ok: ветка называет причину
            setSignInFailureKind('other');
            return;
          }
          // зачем (AA S2d раунды 2–3, §134 (б), §135 ❓1): вход отменён без стирания —
          // прогресс цел. not_uploaded: «Повторить» остаётся, кнопки перехода нет.
          // backup_blocked: повтор не поможет — как account_switch_required.
          const refusalCopy = signInRefusalCopyFor(result.error, lang);
          if (refusalCopy) {
            if (refusalCopy.offersAccountSwitch) {
              setRetryProvider(null); // повтор не поможет; кнопки «Сменить аккаунт» с переходом в Настройки больше нет (правило владельца 18.10)
            }
            showFailureCopy(refusalCopy.title, refusalCopy.body);
            return;
          }
          if (result.error === 'recovery_provider_mismatch') {
            // Тут нужен ДРУГОЙ аккаунт, а не повтор того же — «Повторить» прячем.
            setRetryProvider(null);
            animateNextLayoutTransition();
            setRecoveryOfferedAfterMismatch(true);
            showFailureCopy(
              triLang(lang, { ru: 'Нужен прежний аккаунт', uk: 'Потрібен попередній акаунт', en: 'You need your previous account', es: 'Necesitas la cuenta anterior', 'pt-BR': 'Use a conta anterior', vi: 'Cần tài khoản trước đây', id: 'Gunakan akun sebelumnya', tr: 'Önceki hesap gerekli', pl: 'Potrzebne jest poprzednie konto' }),
              triLang(lang, {
                // зачем (координатор 18.10, проход по текстам входа): «локальные данные» — слово разработчика; «пользовался» — мужской род (D188)
                ru: 'Выбранный аккаунт не связан с этим прогрессом. Попробуй прежний Google- или Apple-аккаунт. Прогресс на этом телефоне не тронут.',
                uk: 'Вибраний акаунт не пов’язаний із цим прогресом. Спробуй попередній Google- або Apple-акаунт. Прогрес на цьому телефоні не зачеплено.',
                en: 'The chosen account isn’t linked to this progress. Try the Google or Apple account you used before. Your progress on this phone is untouched.',
                es: 'La cuenta elegida no está vinculada a este progreso. Prueba la cuenta de Google o Apple que usabas antes. Tu progreso en este teléfono sigue intacto.',
                'pt-BR': 'A conta escolhida não está vinculada a este progresso. Tente a conta Google ou Apple que você usava antes. Seu progresso neste celular continua intacto.',
                vi: 'Tài khoản đã chọn không liên kết với tiến độ này. Hãy thử tài khoản Google hoặc Apple bạn đã dùng trước đây. Tiến độ trên điện thoại này vẫn nguyên vẹn.',
                id: 'Akun yang dipilih tidak tertaut ke progres ini. Coba akun Google atau Apple yang pernah digunakan. Progres di ponsel ini tetap utuh.',
                tr: 'Seçilen hesap bu ilerlemeye bağlı değil. Daha önce kullandığın Google veya Apple hesabını dene. Bu telefondaki ilerlemen olduğu gibi duruyor.',
                pl: 'Wybrane konto nie jest połączone z tym postępem. Spróbuj konta Google lub Apple używanego wcześniej. Postęp na tym telefonie jest nienaruszony.',
              }),
            );
            return;
          }
          // зачем (релизный пол 10.10): аккаунт на удалении, но 14 дней ещё идут —
          // предлагаем вернуть его, как в онбординге, вместо общего «Не получилось».
          if (result.error === 'account_delete_pending') {
            const restore = await promptAccountRestoreAfterSignInRefusal(lang);
            console.log(`[ACCOUNT-RESTORE] registration_modal outcome=${restore}`); // guard-ok: одно событие на тап входа, нужно для диагностики
            // зачем (аудит Optimistic UI 13.10): пока висело окно восстановления, окно входа могли закрыть или открыть заново —
            // устаревший итог не должен писать ошибку/повтор в новую попытку
            if (!isAttemptCurrent(attemptToken)) {
              console.log(`[AUTH-MODAL] restore outcome dropped provider=${provider} outcome=${restore} reason=attempt_invalidated`); // guard-ok: ранний выход пишет причину
              return;
            }
            if (restore === 'restored') {
              if (!autoContinueArmedRef.current) {
                autoContinueArmedRef.current = true;
                console.log(`[AUTH-RESTORE-CONTINUE] restored → sign-in continues provider=${provider}`); // guard-ok: ветка и значение, которое её решило
                setAutoContinueProvider(provider);
                return;
              }
              console.log(`[AUTH-RESTORE-CONTINUE] restored again → card instead of loop provider=${provider}`); // guard-ok: защита от петли
              setRetryProvider(provider);
              showFailureCopy(
                triLang(lang, { ru: 'Аккаунт восстановлен', uk: 'Акаунт відновлено', en: 'Account restored', es: 'Cuenta restaurada', 'pt-BR': 'Conta restaurada', vi: 'Đã khôi phục tài khoản', id: 'Akun dipulihkan', tr: 'Hesap geri yüklendi', pl: 'Konto przywrócone' }),
                triLang(lang, {
                  ru: 'Войди ещё раз — весь прогресс на месте.',
                  uk: 'Увійди ще раз — увесь прогрес на місці.',
                  en: 'Sign in again — all progress is there.',
                  es: 'Entra de nuevo: todo el progreso sigue ahí.',
                  'pt-BR': 'Entre de novo: todo o progresso está lá.',
                  vi: 'Hãy đăng nhập lại — toàn bộ tiến trình vẫn còn.',
                  id: 'Masuk lagi — semua progres ada di sana.',
                  tr: 'Tekrar giriş yap — tüm ilerlemen yerinde.',
                  pl: 'Zaloguj się ponownie — cały postęp jest na miejscu.',
                }),
              );
              return;
            }
            if (restore === 'declined') {
              setRetryProvider(null);
              return;
            }
            // зачем (аудит Optimistic UI 12.10): «Восстановить» не сработало — свой текст и повтор, а не «аккаунт ещё удаляется».
            if (restore === 'restore_failed') {
              const failedCopy = accountRestoreFailedCopy(lang);
              setRetryProvider(provider);
              showFailureCopy(failedCopy.title, failedCopy.body);
              return;
            }
          }
          if (result.error === 'identity_retired') {
            // зачем (решение координатора 18.10; запрет владельца 22.09 на уведомления об удалении аккаунта): окна «аккаунт удалён навсегда» нет.
            // Окно закрывается тихо, а auth_provider уже поднял свежую личность: человек остаётся в приложении чистым аккаунтом (логику ведёт Авторизация).
            console.log(`[AUTH-RETIRED] identity_retired → sheet closed quietly, fresh identity continues provider=${provider}`); // guard-ok: ветка и значение, которое её решило
            setRetryProvider(null);
            setRecoveryPanelVisible(false);
            setCleanRecoveryPanelVisible(false);
            onClose();
            return;
          }
          if (result.error?.includes(APPLE_ANDROID_MISSING_SERVICE_ID)) {
            // Конфиг сборки, а не транзиент — повтор не поможет.
            // зачем (координатор 18.10 05:45): подробности для разработчика (переменная сборки, Apple Developer) — только в журнал;
            // человеку — простая фраза и путь через Google. Обычно сюда не попасть: без Services ID кнопки Apple на Android нет.
            console.warn('[AUTH-MODAL] apple_android_missing_service_id — нужен EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID в EAS/.env и return URL в Apple Developer (phraseman://apple-auth)'); // guard-ok: ранний выход пишет причину
            setRetryProvider(null);
            showFailureCopy(
              triLang(lang, { ru: 'Не получилось', uk: 'Не вийшло', en: 'It did not work', es: 'No salió', 'pt-BR': 'Não deu certo', vi: 'Chưa được', id: 'Belum berhasil', tr: 'Olmadı', pl: 'Nie udało się' }),
              triLang(lang, {
                ru: 'Вход через Apple на этом телефоне сейчас недоступен. Войди через Google.',
                uk: 'Вхід через Apple на цьому телефоні зараз недоступний. Увійди через Google.',
                en: 'Sign in with Apple isn’t available on this phone right now. Use Google instead.',
                es: 'Ahora no puedes entrar con Apple en este teléfono. Entra con Google.',
                'pt-BR': 'Entrar com a Apple não está disponível neste celular agora. Entre com o Google.',
                vi: 'Hiện không thể đăng nhập bằng Apple trên điện thoại này. Hãy đăng nhập bằng Google.',
                id: 'Masuk dengan Apple sedang tidak tersedia di ponsel ini. Masuk dengan Google saja.',
                tr: 'Bu telefonda şu an Apple ile giriş yapılamıyor. Google ile giriş yap.',
                pl: 'Logowanie przez Apple jest teraz niedostępne na tym telefonie. Zaloguj się przez Google.',
              }),
            );
            return;
          }
          // сеть и «слишком много попыток» — свои словарные фразы (общие с онбордингом); карточка сбоя берёт ту же причину
          setSignInFailureKind(authErrorKind(result.error));
          const baseMsg = authErrorTextForKind(authErrorKind(result.error), lang) ?? triLang(lang, {
            ru: 'Не получилось войти. Попробуй позже.',
            uk: 'Не вдалося увійти. Спробуй пізніше.',
            en: 'Couldn’t sign in. Try again later.',
            es: 'No se ha podido iniciar sesión. Inténtalo más tarde.',
            'pt-BR': 'Não foi possível entrar. Tente mais tarde.',
            vi: 'Không thể đăng nhập. Hãy thử lại sau.',
            id: 'Tidak bisa masuk. Coba lagi nanti.',
            tr: 'Giriş yapılamadı. Daha sonra tekrar dene.',
            pl: 'Nie udało się zalogować. Spróbuj później.',
          });
          showInlineError(
            triLang(lang, { ru: 'Не получилось', uk: 'Не вийшло', en: 'It did not work', es: 'No salió', 'pt-BR': 'Não deu certo', vi: 'Chưa được', id: 'Belum berhasil', tr: 'Olmadı', pl: 'Nie udało się' }),
            baseMsg,
          );
          return;
        }

        // Provider mutation is complete. Keep finalization non-dismissible while
        // the idempotent marker commit starts; a hidden/unmounted attempt never
        // starts a new storage write or UI/event continuation.
        if (!isAttemptCurrent(attemptToken)) return;
        setSignInSlow(false);
        await AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(noteSwallowedHandler('RegistrationPromptModal:useCallback.setItem'));
        if (!isAttemptCurrent(attemptToken)) return;
        emitAppEvent('auth_provider_linked');
        onSignedIn?.(result);
        onClose();
      } catch (e: any) {
        // зачем (аудит двойного тапа 11.10): причина под __DEV__ в релизе пропадала, а при
        // закрытом окне catch выходил вовсе немо — пишем всегда, без текста ошибки (там может быть почта).
        console.warn(`[AUTH-MODAL] sign_in threw provider=${provider} code=${identityErrorCode(e)} current=${isAttemptCurrent(attemptToken) ? 1 : 0}`); // guard-ok: catch пишет причину
        reportSignInThrew();
        if (!isAttemptCurrent(attemptToken)) return;
        clearSlowTimer();
        // В проде раньше ловили throw молча → «тапнул Apple — ничего». Покажем компактную ошибку.
        setSignInFailureKind('other');
        showInlineError(
          triLang(lang, { ru: 'Не получилось', uk: 'Не вийшло', en: 'It did not work', es: 'No salió', 'pt-BR': 'Não deu certo', vi: 'Chưa được', id: 'Belum berhasil', tr: 'Olmadı', pl: 'Nie udało się' }),
          triLang(lang, {
            ru: 'Сейчас не получилось войти. Попробуй ещё раз.',
            uk: 'Зараз не вдалося увійти. Спробуй ще раз.',
            en: "Couldn't sign in right now. Try again.",
            es: 'Ahora no se pudo iniciar sesión. Inténtalo de nuevo.',
            'pt-BR': 'Não deu para entrar agora. Tente de novo.',
            vi: 'Lúc này chưa đăng nhập được. Hãy thử lại.',
            id: 'Belum bisa masuk sekarang. Coba lagi.',
            tr: 'Şu an giriş yapılamadı. Tekrar dene.',
            pl: 'Teraz nie udało się zalogować. Spróbuj ponownie.',
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
      showFailureCopy,
      showInlineError,
      signInSlowLabel,
    ],
  );

  // зачем: продолжение входа после восстановления — когда прежняя попытка отпустила кнопки (finally сняла loadingProvider)
  useEffect(() => {
    if (autoContinueProvider === null || loadingProvider !== null || !visible) return;
    const next = autoContinueProvider;
    setAutoContinueProvider(null);
    console.log(`[AUTH-RESTORE-CONTINUE] start provider=${next}`); // guard-ok: запуск продолжения
    void handleSignIn(next);
  }, [autoContinueProvider, handleSignIn, loadingProvider, visible]);

  // Аварийная кнопка для DEV: полный wipe identity-state (Keychain stable_id +
  // Google session + Firebase Auth) + поднятие чистой анонимной сессии.
  // Помогает выйти из «зомби»-состояния после старого battery delete-account-flow,
  // когда auth_links/{providerUid} указывают на удалённый users/{stable_id} и
  // signIn повисает или silently возвращает `cancelled`.
  // зачем (аудит двойного тапа 11.10): disabled по состоянию видит старое значение в том же
  // кадре — два тапа запускали два стирания подряд; ссылка ставится синхронно.
  const resetInFlightRef = useRef(false);
  const handleResetAndRetry = useCallback(async () => {
    if (resetInFlightRef.current) {
      console.log('[AUTH-MODAL] reset ignored reason=in_flight'); // guard-ok: ранний выход пишет причину
      return;
    }
    resetInFlightRef.current = true;
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
    } catch (error) {
      // зачем: раньше исключение уходило из onPress необработанным — причина в лог, кнопка снова доступна.
      console.warn(`[AUTH-MODAL] reset failed code=${identityErrorCode(error)}`); // guard-ok: catch пишет причину
    } finally {
      resetInFlightRef.current = false;
      setLoadingProvider(null);
    }
  }, [showInlineError]);

  const handleLater = useCallback(async () => {
    // зачем (аудит двойного тапа 11.10): отбитый «Позже» был немым — пишем причину.
    if (cleanRecoveryCancellingRef.current) { console.log('[AUTH-MODAL] later ignored reason=recovery_cancelling'); return; } // guard-ok: ранний выход пишет причину
    if (loadingProvider !== null && !signInSlow) { console.log(`[AUTH-MODAL] later ignored reason=in_flight provider=${loadingProvider}`); return; } // guard-ok: ранний выход пишет причину
    if (!recoveryDismissAllowed) { console.log('[AUTH-MODAL] later ignored reason=dismiss_not_allowed'); return; } // guard-ok: ранний выход пишет причину
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
      await AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(noteSwallowedHandler('RegistrationPromptModal:useCallback.setItem_2'));
    }
    onClose();
  }, [attemptLifecycle, clearSlowTimer, context, disposeCleanRecoveryFlow, disposeRecoveryFlow, loadingProvider, onClose, recoveryDismissAllowed, signInSlow]);

  const handleLaterRef = useRef(handleLater);
  handleLaterRef.current = handleLater;
  // зачем (Макеты 15.10: «[Worklets] Tried to modify key `current` of an object which has been already passed to a worklet» ×2 каждые 0,5 с на «Друзьях»): worklet-коллбэк withTiming раньше брал `handleLaterRef.current` ВНУТРИ себя —
  // ref-объект попадал в worklet и становился неизменяемым, а присваивание `handleLaterRef.current = …` в каждом рендере после первого закрытия писало предупреждение. В worklet уходит стабильная функция, ref остаётся обычным JS-объектом.
  const invokeHandleLater = useCallback(() => { handleLaterRef.current(); }, []);

  // Анимированное закрытие (крестик/фон/«Позже»): лист уезжает вниз + подложка тает,
  // затем общий путь handleLater (те же правила, включая signInSlow).
  const dismissSheet = useCallback(() => {
    if (cleanRecoveryCancellingRef.current) return;
    if (loadingProvider !== null && !signInSlow) return;
    if (!recoveryDismissAllowed) return;
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(invokeHandleLater)();
    });
  }, [invokeHandleLater, backdropO, sheetOpacity, sheetY, loadingProvider, recoveryDismissAllowed, signInSlow]);

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
    // зачем ([BLEND-AUTH] 18.10): главные кнопки — ctaFill/ctaFillInk (сырой accent в светлых градиентных темах сливался со шторкой),
    // текст ошибок — bad темы (постоянный #F05454 давал ~3:1 на светлой шторке)
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
                backgroundColor: glass.opaqueSheet,
                maxHeight: cardMaxHeight,
                bottom: keyboardInset,
              },
              sheetStyle,
            ]}
          >
          {motionVariant === 'hybrid' && (
            // Bloom: свет загорается ПЕРВЫМ над шитом (закон базы «Световод»,
            // LUM.bloomMs) — чисто декоративный слой, не влияет на разметку.
            <LinearGradient
              colors={[glass.selected, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.5 }}
              style={styles.hybridSheetGlow}
              pointerEvents="none"
            />
          )}
          <View style={styles.grabberZone}>
            <View style={[styles.grabber, { backgroundColor: glass.mutedText, opacity: 0.4 }]} />
          </View>
          <Pressable
            onPress={dismissSheet}
            disabled={!recoveryDismissAllowed}
            accessibilityRole="button"
            accessibilityLabel={labelLater}
            accessibilityState={{ disabled: !recoveryDismissAllowed }}
            hitSlop={8}
            style={[styles.closeBtn, { backgroundColor: glass.buttonFill, opacity: !recoveryDismissAllowed ? 0.45 : (loadingProvider !== null && !signInSlow) ? 0.38 : 1 }]}
          >
            <Ionicons name="close" size={14} color={t.accentText} />
          </Pressable>

          <ScrollView decelerationRate="fast"
            style={styles.sheetScroll}
            contentContainerStyle={[styles.sheetContent, { paddingHorizontal: cardPadding, paddingBottom: Math.max(insets.bottom, 14) + 18 }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Заголовок: streak-бейдж + «Всё в безопасности» + дни серии из прогресса */}
          <Animated.View style={[styles.headerRow, rise0]}>
            <View style={[styles.streakBadge, { backgroundColor: glass.opaqueControl }]}>
              <StreakChainIcon themeMode={themeMode} streakDays={streakDays} size={30} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={[styles.title, { color: glass.text, fontSize: 25, lineHeight: titleLineHeight }]} numberOfLines={2}>
                {finalTitle}
              </Text>
              {/* зачем (TG-AA6EC9A6D998): строка — обещание сохранности; без доказанной привязки
                  в окне восстановления её нет (решение известно к первому кадру). */}
              {showSavedJourneyLine && (
                <Text style={[styles.daysLine, { color: glass.secondary, fontSize: f.caption }]} numberOfLines={2}>
                  {daysLine ? (
                    <>
                      <Text style={{ color: glass.text, fontWeight: '700' }}>{daysLine.accent}</Text>
                      {daysLine.rest}
                    </>
                  ) : (
                    labelNoStreak
                  )}
                </Text>
              )}
            </View>
          </Animated.View>

          <Animated.Text style={[styles.subtitle, { color: glass.secondary, fontSize: f.body, lineHeight: bodyLineHeight }, rise1]}>
            {finalSubtitle}
          </Animated.Text>

          {context === 'startup_recovery' && recoveryHint?.linked === true && (
            <Animated.Text style={[styles.subtitle, { color: glass.text, fontSize: f.caption }, rise1]}>
              {recoveryHint.maskedEmail
                ? `${triLang(lang, { ru: 'Твой прогресс привязан к аккаунту', uk: 'Твій прогрес прив’язаний до акаунта', en: 'Your progress is linked to an account', es: 'Tu progreso está vinculado a la cuenta', 'pt-BR': 'Seu progresso está vinculado à conta', vi: 'Tiến độ của bạn được liên kết với tài khoản', id: 'Progresmu tertaut ke akun', tr: 'İlerlemen bu hesaba bağlı', pl: 'Twój postęp jest powiązany z kontem' })} ${recoveryHint.maskedEmail} ${triLang(lang, { ru: '— войди через него', uk: '— увійди через нього', en: '— sign in with it', es: '— inicia sesión con ella', 'pt-BR': '— entre com ela', vi: '— hãy đăng nhập bằng tài khoản đó', id: '— masuk dengan akun itu', tr: '— onunla giriş yap', pl: '— zaloguj się przez nie' })}`
                : triLang(lang, { ru: `Прогресс привязан к аккаунту ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — выбери его при входе`, uk: `Прогрес прив’язаний до акаунта ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — обери його під час входу`, en: `Progress is linked to a ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} account — choose it when signing in`, es: `El progreso está vinculado a una cuenta de ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'}: elígela al entrar`, 'pt-BR': `O progresso está vinculado a uma conta ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — escolha-a ao entrar`, vi: `Tiến độ được liên kết với tài khoản ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — hãy chọn đúng tài khoản đó`, id: `Progres tertaut ke akun ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — pilih akun itu saat masuk`, tr: `İlerleme bir ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} hesabına bağlı — girişte onu seç`, pl: `Postęp jest powiązany z kontem ${recoveryHint.provider === 'apple' ? 'Apple' : 'Google'} — wybierz je przy logowaniu` })}
            </Animated.Text>
          )}

          {signInFailureKind !== null && loadingProvider === null && !recoverySessionActive ? (
            <SignInFailureCard
              kind={signInFailureKind}
              title={signInFailureCopy?.title}
              body={signInFailureCopy?.body}
              onRetry={retryProvider !== null ? () => { void handleSignIn(retryProvider); } : undefined}
            />
          ) : null}

          <Animated.View style={[styles.buttons, rise2]}>
            {googleAvail && (
              <SignInProgressButton
                provider="google"
                label={labelGoogle}
                busyLabel={signInBusyLabel}
                busy={loadingProvider === 'google'}
                // зачем: остальные кнопки приглушены до 38 % и не нажимаются, пока идёт вход другим способом или другая операция (макет, блок 2)
                dimmed={(loadingProvider !== null && loadingProvider !== 'google') || (loadingProvider === null && authOperationBusy)}
                surface={isLightThemeMode(themeMode) ? 'light' : 'dark'}
                // зачем ([BLEND-AUTH] 18.10): вариант Google по яркости шторки, как раньше — кнопка не сливается со шторкой
                sheetColor={glass.opaqueSheet}
                onPress={() => handleSignIn('google')}
              />
            )}
          </Animated.View>
          <Animated.View style={[styles.buttons, rise3]}>
            {appleAvail === true && (
              <SignInProgressButton
                provider="apple"
                label={labelApple}
                busyLabel={signInBusyLabel}
                busy={loadingProvider === 'apple'}
                dimmed={(loadingProvider !== null && loadingProvider !== 'apple') || (loadingProvider === null && authOperationBusy)}
                surface={isLightThemeMode(themeMode) ? 'light' : 'dark'}
                sheetColor={glass.opaqueSheet}
                onPress={() => handleSignIn('apple')}
              />
            )}
            {/* зачем (TG-AA6EC9A6D998): пока iOS не ответил про Apple — место под кнопку уже занято. */}
            {appleAvail === null && <AuthProviderButtonPlaceholder shape="sheet" testID="provider-apple-placeholder" />}
          </Animated.View>

          {loadingProvider !== null && (
            <View
              testID={signInSlow ? 'auth-prompt-slow' : 'auth-prompt-busy'}
              accessibilityRole="progressbar"
              accessibilityLabel={signInSlow ? signInSlowLabel : signInBusyLabel}
              accessibilityLiveRegion="polite"
              accessibilityState={{ busy: true }}
              // зачем (владелец 15.10): технические надписи о процессе входа не показываем — индикатор уже на самой кнопке провайдера;
              // подпись остаётся только для экранного диктора (progressbar + живая область). Узел невидим и места не занимает.
              collapsable={false}
              style={styles.busyA11y}
            />
          )}

          {!googleAvail && appleAvail === false && (
            // зачем (решение координатора 18.10): на сторных сборках этого состояния нет (Android — Google, iOS — Google и Apple); карточка из одного заголовка — последний рубеж, причина — в журнал [AUTH-NO-PROVIDER]
            // зачем (решение координатора 18.10, «красного в окне входа быть не должно»): это не сбой попытки, а состояние телефона — та же мягкая карточка, без кнопки повтора
            <SignInFailureCard
              testID="sign-in-no-method"
              kind="other"
              body=""
              title={triLang(lang, {
                // зачем (координатор 18.10, «никаких системных текстов»): «провайдер» → понятный «способ входа», как в en
                ru: 'На этом телефоне нет доступного способа входа.',
                uk: 'На цьому телефоні немає доступного способу входу.',
                en: 'No sign-in method is available on this device.',
                es: 'Ningún método de entrada está disponible en este dispositivo.',
                'pt-BR': 'Nenhum método de entrada está disponível neste dispositivo.',
                vi: 'Không có phương thức đăng nhập nào khả dụng trên thiết bị này.',
                id: 'Tidak ada metode masuk yang tersedia di perangkat ini.',
                tr: 'Bu cihazda kullanılabilir giriş yöntemi yok.',
                pl: 'Na tym urządzeniu nie ma dostępnej metody logowania.',
              })}
            />
          )}

          {!!inlineError && signInFailureKind === null && (
            <Text style={[styles.errorNote, { color: glass.secondary, fontSize: f.caption }]}>
              {inlineError}
            </Text>
          )}

          {!!inlineError && signInFailureKind === null && retryProvider !== null && loadingProvider === null && !recoverySessionActive && (
            <Pressable
              onPress={() => { void handleSignIn(retryProvider); }}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, { ru: 'Повторить вход', uk: 'Повторити вхід', en: 'Retry sign-in', es: 'Reintentar acceso', 'pt-BR': 'Tentar entrar novamente', vi: 'Thử đăng nhập lại', id: 'Coba masuk lagi', tr: 'Girişi tekrar dene', pl: 'Spróbuj zalogować ponownie' })}
              style={[styles.laterButton, { borderRadius: 12, marginTop: 8, backgroundColor: glass.ctaFill }]}
            >
              <Text style={[styles.laterText, { color: glass.ctaFillInk, fontSize: f.body }]}>
                {triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
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
              <Text style={[styles.recoveryTertiaryText, { color: glass.text, fontSize: f.body }]}>
                {recoveryCopy.entry}
              </Text>
            </Pressable>
          )}

          {showCleanRecoveryEntry && !recoveryPanelVisible && !cleanRecoveryPanelVisible && (
            <Pressable
              testID="auth-clean-recovery-entry"
              onPress={handleCleanRecoveryEntry}
              disabled={authOperationBusy}
              accessibilityRole="button"
              accessibilityLabel={cleanRecoveryCopy.entry}
              accessibilityState={{ disabled: authOperationBusy }}
              style={styles.recoveryTertiaryButton}
            >
              <Text style={[styles.recoveryTertiaryText, { color: glass.text, fontSize: f.body }]}>
                {cleanRecoveryCopy.entry}
              </Text>
            </Pressable>
          )}

          {cleanRecoveryPanelVisible && (
            <View
              style={[styles.recoveryPanel, { backgroundColor: glass.opaqueControl }]}
              accessibilityLiveRegion="polite"
            >
              {cleanRecoveryScreen === 'support' ? (
                <View testID="auth-clean-recovery-support" accessible accessibilityRole="alert">
                  <Text style={[styles.recoveryTitle, { color: glass.text, fontSize: f.body }]}>
                    {cleanRecoveryCopy.supportTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: glass.secondary, fontSize: f.caption }]}>
                    {cleanRecoveryCopy.supportBody}
                  </Text>
                </View>
              ) : cleanRecoveryScreen === 'code' ? (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: glass.text, fontSize: f.body }]}>
                    {cleanRecoveryCopy.sentTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: glass.secondary, fontSize: f.caption }]}>
                    {cleanRecoveryCopy.sentBody}
                  </Text>
                  {/* зачем (эталон auth-states блок 7): та же одна строка вторым цветом; автоматической отправки здесь нет — повтор после срока требует нового запроса (интерфейс для Авторизации) */}
                  {cleanRecoveryError ? (
                    <RecoveryCodeLine kind="error" text={cleanRecoveryError} secondaryColor={glass.secondary} inkColor={glass.text} />
                  ) : cleanRecoveryExpired ? (
                    <RecoveryCodeLine kind="expiry" text={recoveryCopy.errorExpired} secondaryColor={glass.secondary} inkColor={glass.text} />
                  ) : (
                    <RecoveryCodeLine kind="expiry" text={cleanRecoveryCopy.expiresIn} time={formatRecoveryClock(cleanRecoveryExpiryCountdown)} secondaryColor={glass.secondary} inkColor={glass.text} />
                  )}
                  <TextInput
                    testID="auth-clean-recovery-code-input"
                    value={cleanRecoveryCode}
                    onChangeText={(value) => {
                      setCleanRecoveryCode(normalizeRecoveryCodeInput(value));
                      if (cleanRecoveryError) setCleanRecoveryError(null);
                    }}
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
                        color: glass.text,
                        // зачем (A7.8): поле обычного тона и при ошибке — красноватого фона нет
                        backgroundColor: glass.bg,
                        borderWidth: 0,
                        // зачем (overlays.html `.field`): код вводится обычным полем 16, не крупным разрядным шрифтом.
                        fontSize: 16,
                      },
                    ]}
                  />
                  {!isRecoveryEmailValid(cleanRecoveryEmail) && (
                    <View>
                      <Text style={[styles.recoveryBody, { color: glass.secondary, fontSize: f.caption }]}>
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
                        placeholderTextColor={glass.mutedText}
                        style={[
                          styles.recoveryEmailInput,
                          {
                            color: glass.text,
                            backgroundColor: glass.bg,
                            borderWidth: 0,
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
                      { backgroundColor: glass.ctaFill, opacity: cleanRecoveryBusy || cleanRecoveryExpired || cleanRecoveryCode.length !== 6 ? 0.55 : 1 },
                    ]}
                  >
                    <Text style={[styles.recoveryPrimaryText, { color: glass.ctaFillInk, fontSize: f.body }]}>
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
                    <Text style={[styles.recoverySecondaryText, { color: glass.text, fontSize: f.caption }]}>
                      {cleanRecoveryCountdown > 0
                        ? `${cleanRecoveryCopy.resendIn} ${formatRecoveryClock(cleanRecoveryCountdown)}`
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
                    <Text style={[styles.recoverySecondaryText, { color: glass.secondary, fontSize: f.caption }]}>
                      {cleanRecoveryCopy.changeEmail}
                    </Text>
                  </Pressable>
                </View>
              ) : cleanRecoveryScreen === 'email' ? (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: glass.text, fontSize: f.body }]}>
                    {cleanRecoveryCopy.emailTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: glass.secondary, fontSize: f.caption }]}>
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
                    placeholderTextColor={glass.mutedText}
                    style={[
                      styles.recoveryEmailInput,
                      {
                        color: glass.text,
                        // зачем (A7.8): поле обычного тона и при ошибке — красноватого фона нет
                        backgroundColor: glass.bg,
                        borderWidth: 0,
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
                      { backgroundColor: glass.ctaFill, opacity: cleanRecoveryBusy || !isRecoveryEmailValid(cleanRecoveryEmail) ? 0.55 : 1 },
                    ]}
                  >
                    <Text style={[styles.recoveryPrimaryText, { color: glass.ctaFillInk, fontSize: f.body }]}>
                      {cleanRecoveryBusy ? cleanRecoveryCopy.working : cleanRecoveryCopy.sendCode}
                    </Text>
                  </Pressable>
                </View>
              ) : cleanRecoveryScreen === 'resume' ? (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: glass.text, fontSize: f.body }]}>
                    {cleanRecoveryCopy.resumeTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: glass.secondary, fontSize: f.caption }]}>
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
                    style={[styles.recoveryPrimaryButton, { backgroundColor: glass.ctaFill, opacity: cleanRecoveryBusy ? 0.55 : 1 }]}
                  >
                    <Text style={[styles.recoveryPrimaryText, { color: glass.ctaFillInk, fontSize: f.body }]}>
                      {cleanRecoveryBusy ? cleanRecoveryCopy.working : cleanRecoveryCopy.resume}
                    </Text>
                  </Pressable>
                </View>
              ) : cleanRecoveryScreen === 'provider' ? (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: glass.text, fontSize: f.body }]}>
                    {cleanRecoveryCopy.providerTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: glass.secondary, fontSize: f.caption }]}>
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
                        style={[styles.recoveryPrimaryButton, { backgroundColor: glass.ctaFill, opacity: cleanRecoveryBusy ? 0.55 : 1 }]}
                      >
                        <Text style={[styles.recoveryPrimaryText, { color: glass.ctaFillInk, fontSize: f.body }]}>
                          {recoveryCopy.useGoogle}
                        </Text>
                      </Pressable>
                    )}
                    {appleAvail === true && (
                      <Pressable
                        onPress={() => { void handleCleanRecoveryStart('apple'); }}
                        disabled={cleanRecoveryBusy}
                        accessibilityRole="button"
                        accessibilityLabel={recoveryCopy.useApple}
                        accessibilityState={{ disabled: cleanRecoveryBusy, busy: cleanRecoveryBusy }}
                        style={[styles.recoverySecondaryOutlinedButton, { backgroundColor: glass.selected, opacity: cleanRecoveryBusy ? 0.55 : 1 }]}
                      >
                        <Text style={[styles.recoveryPrimaryText, { color: glass.text, fontSize: f.body }]}>
                          {recoveryCopy.useApple}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : null}
              {/* зачем: на экране кода ошибка — в строке над полем; здесь только вне него, вторым цветом */}
              {!!cleanRecoveryError && cleanRecoveryScreen !== 'code' && (
                <Text accessibilityRole="text" style={[styles.recoveryError, { color: glass.secondary, fontSize: f.caption }]}>
                  {cleanRecoveryError}
                </Text>
              )}
            </View>
          )}

          {recoveryPanelVisible && (
            <View
              style={[styles.recoveryPanel, { backgroundColor: glass.opaqueControl }]}
              accessibilityLiveRegion="polite"
            >
              {(recoveryStage === 'failed' || recoveryStage === 'quarantined') ? (
                <View testID="auth-recovery-support" accessible accessibilityRole="alert">
                  <Text style={[styles.recoveryTitle, { color: glass.text, fontSize: f.body }]}>
                    {recoveryCopy.supportTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: glass.secondary, fontSize: f.caption }]}>
                    {recoveryCopy.supportBody}
                  </Text>
                </View>
              ) : recoveryStage === 'code_sent' || recoveryStage === 'confirming' || recoveryStage === 'adopting' ? (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: glass.text, fontSize: f.body }]}>
                    {recoveryCopy.codeTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: glass.secondary, fontSize: f.caption }]}>
                    {recoveryFlowState.maskedEmail || recoveryCopy.codeDescription}
                  </Text>
                  {/* зачем (эталон auth-states блок 7, A7.3/A7.7/A7.8): одна строка вторым цветом на одном месте — ошибка, «Отправили новый код» или срок «4:52»; красного нет */}
                  {recoveryError ? (
                    <RecoveryCodeLine kind="error" text={recoveryError} secondaryColor={glass.secondary} inkColor={glass.text} />
                  ) : recoveryNewCodeNotice ? (
                    <RecoveryCodeLine kind="notice" text={recoveryNewCodeSentText(lang)} secondaryColor={glass.secondary} inkColor={glass.text} />
                  ) : recoveryExpired ? (
                    <RecoveryCodeLine kind="expiry" text={recoveryExpiredSendingText(lang)} secondaryColor={glass.secondary} inkColor={glass.text} />
                  ) : (
                    <RecoveryCodeLine kind="expiry" text={recoveryCopy.expiresIn} time={formatRecoveryClock(recoveryExpiryCountdown)} secondaryColor={glass.secondary} inkColor={glass.text} />
                  )}
                  <TextInput
                    testID="auth-recovery-code-input"
                    value={recoveryCode}
                    onChangeText={(value) => {
                      setRecoveryCode(normalizeRecoveryCodeInput(value));
                      // зачем: начал править код — строка ошибки / «Отправили новый код» уступает место сроку
                      if (recoveryError) setRecoveryError(null);
                      if (recoveryNewCodeNotice) setRecoveryNewCodeNotice(false);
                    }}
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
                        color: glass.text,
                        // зачем (A7.8): при неверном коде поле обычного тона, не красноватого; цифры остаются — поправить одну
                        backgroundColor: glass.bg,
                        borderWidth: 0,
                        // зачем (overlays.html `.field`): код вводится обычным полем 16, не крупным разрядным шрифтом.
                        fontSize: 16,
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
                      { backgroundColor: glass.ctaFill, opacity: recoveryBusy || recoveryExpired || recoveryCode.length !== 6 ? 0.55 : 1 },
                    ]}
                  >
                    <Text style={[styles.recoveryPrimaryText, { color: glass.ctaFillInk, fontSize: f.body }]}>
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
                    <Text style={[styles.recoverySecondaryText, { color: glass.text, fontSize: f.caption }]}>
                      {recoveryCountdown > 0
                        ? `${recoveryCopy.resendIn} ${formatRecoveryClock(recoveryCountdown)}`
                        : recoveryCopy.resend}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.recoveryContentSlot}>
                  <Text style={[styles.recoveryTitle, { color: glass.text, fontSize: f.body }]}>
                    {recoveryEntryMode === 'google_instruction'
                      ? recoveryCopy.instructionTitle
                      : recoveryCopy.codeTitle}
                  </Text>
                  <Text style={[styles.recoveryBody, { color: glass.secondary, fontSize: f.caption }]}>
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
                          style={[styles.recoveryPrimaryButton, { backgroundColor: glass.ctaFill, opacity: recoveryBusy ? 0.55 : 1 }]}
                        >
                          <Text style={[styles.recoveryPrimaryText, { color: glass.ctaFillInk, fontSize: f.body }]}>
                            {recoveryCopy.useGoogle}
                          </Text>
                        </Pressable>
                      )}
                      {appleAvail === true && (
                        <Pressable
                          onPress={() => { void handleRecoveryStart('apple'); }}
                          disabled={recoveryBusy}
                          accessibilityRole="button"
                          accessibilityLabel={recoveryCopy.useApple}
                          accessibilityState={{ disabled: recoveryBusy, busy: recoveryBusy }}
                          style={[styles.recoverySecondaryOutlinedButton, { backgroundColor: glass.selected, opacity: recoveryBusy ? 0.55 : 1 }]}
                        >
                          <Text style={[styles.recoveryPrimaryText, { color: glass.text, fontSize: f.body }]}>
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
                      style={[styles.recoveryPrimaryButton, { backgroundColor: glass.ctaFill, opacity: recoveryBusy ? 0.55 : 1 }]}
                    >
                      <Text style={[styles.recoveryPrimaryText, { color: glass.ctaFillInk, fontSize: f.body }]}>
                        {recoveryBusy ? recoveryCopy.working : recoveryCopy.sendCode}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
              {/* зачем: в экране кода текст ошибки стоит в строке над полем; здесь — только вне него, вторым цветом */}
              {!!recoveryError && !(recoveryStage === 'code_sent' || recoveryStage === 'confirming' || recoveryStage === 'adopting') && (
                <Text accessibilityRole="text" style={[styles.recoveryError, { color: glass.secondary, fontSize: f.caption }]}>
                  {recoveryError}
                </Text>
              )}
            </View>
          )}

          {ENABLE_AUTH_IDENTITY_DEBUG && context !== 'startup_recovery' && (
            <Pressable
              onPress={handleResetAndRetry}
              disabled={loadingProvider !== null}
              style={[
                styles.laterButton,
                {
                  borderRadius: 12,
                  marginTop: 6,
                  backgroundColor: glass.buttonFill,
                },
              ]}
            >
              <Text style={[styles.laterText, { color: glass.bad, fontSize: f.caption }]}>
                DEBUG: Сбросить identity и войти заново
                {/* i18n-ok: отладочная кнопка, только ENABLE_AUTH_IDENTITY_DEBUG */}
              </Text>
            </Pressable>
          )}

          {/* Строка доверия со щитом */}
          <Animated.View style={[styles.shieldRow, rise4]}>
            {/* зачем (макет auth-states, блок 3; Макеты A3.2): через 3 с «Входим…», через 8 с «Вход занимает больше времени…» — НА МЕСТЕ строки доверия, ниже кнопок ничего не прыгает; объявляет читалке невидимый узел busyA11y */}
            <SignInStatusLine active={loadingProvider !== null} announce={false} flush onPhaseChange={setSignInStatusPhase} />
            {loadingProvider !== null && signInStatusPhase !== 'quiet' ? null : (
              // зачем (Макеты A2.3, `.trust.dim`): во время входа строка доверия приглушается вместе с крестиком, «Позже» и ссылками (38 %)
              <View style={[styles.shieldInner, loadingProvider !== null ? { opacity: 0.38 } : null]}>
                {/* зачем (`.ov-trust`): у строки доверия замок, как в макете. */}
                <Ionicons name="lock-closed" size={15} color={glass.mutedText} />
                <Text style={[styles.shieldText, { color: glass.mutedText, fontSize: f.caption, lineHeight: captionLineHeight }]}>
                  {labelShield}
                </Text>
              </View>
            )}
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
                // зачем (overlays.html `.cta.gh`): «Позже» — капсула 48 на всю ширину с тонким светлым контуром.
                style={[styles.laterButton, styles.laterGhost, { backgroundColor: glass.buttonFill, boxShadow: nestedBoxShadow(glass), opacity: !recoveryDismissAllowed ? 0.45 : (loadingProvider !== null && !signInSlow) ? 0.38 : 1 }]}
                contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
                testID="auth-prompt-later"
              >
                <Text style={[styles.laterText, { color: glass.text, fontSize: 16, fontWeight: '700' }]}>
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
                style={[styles.laterButton, styles.laterGhost, { backgroundColor: glass.buttonFill, boxShadow: nestedBoxShadow(glass), opacity: !recoveryDismissAllowed ? 0.45 : (loadingProvider !== null && !signInSlow) ? 0.38 : 1 }]}
                testID="auth-prompt-later"
              >
                <Text style={[styles.laterText, { color: glass.text, fontSize: 16, fontWeight: '700' }]}>
                  {labelLater}
                </Text>
              </Pressable>
            )}
            <View style={[styles.legalLinks, loadingProvider !== null && !signInSlow ? { opacity: 0.38 } : null]}>
              <Pressable onPress={() => openLegalLink(KNOWLY_LEGAL_PRIVACY_URL, 'registration_prompt')} hitSlop={8}>
                <Text style={[styles.legalLink, { color: glass.text, fontSize: f.caption, lineHeight: captionLineHeight }]}>{triLang(lang, { ru: 'Политика конфиденциальности', uk: 'Політика конфіденційності', en: 'Privacy Policy', es: 'Política de privacidad', 'pt-BR': 'Política de privacidade', vi: 'Chính sách quyền riêng tư', id: 'Kebijakan privasi', tr: 'Gizlilik Politikası', pl: 'Polityka prywatności' })}</Text>
              </Pressable>
              <Pressable onPress={() => openLegalLink(KNOWLY_LEGAL_TERMS_URL, 'registration_prompt')} hitSlop={8}>
                <Text style={[styles.legalLink, { color: glass.text, fontSize: f.caption, lineHeight: captionLineHeight }]}>{triLang(lang, { ru: 'Условия использования', uk: 'Умови використання', en: 'Terms of Use', es: 'Términos de uso', 'pt-BR': 'Termos de uso', vi: 'Điều khoản sử dụng', id: 'Ketentuan penggunaan', tr: 'Kullanım Koşulları', pl: 'Warunki korzystania' })}</Text>
              </Pressable>
            </View>
          </Animated.View>
          </ScrollView>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
      <GuestSwitchWarningSheet
        visible={(guestSwitch ?? guestSwitchFromOffer).visible}
        accountLabel={(guestSwitch ?? guestSwitchFromOffer).accountLabel}
        onConfirm={(guestSwitch ?? guestSwitchFromOffer).onConfirm}
        onCancel={(guestSwitch ?? guestSwitchFromOffer).onCancel}
      />
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
    backgroundColor: 'rgba(0,0,0,0.6)', // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // зачем (стиль «Тень», владелец 12.10): шторку отделяет затемнение, верхняя кромка снята
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
  // зачем (overlays.html `.tile.t55`): плитка 55, радиус 14.
  streakBadge: {
    width: 55,
    height: 55,
    borderRadius: 14,
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
  // Только для экранного диктора: точка 1×1 вне потока, без фона.
  busyA11y: {
    position: 'absolute',
    width: 1,
    height: 1,
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 2,
    // зачем (решение координатора 18.10, Макеты A3.2): «Входим…» (16/21) встаёт на место строки доверия — высота резервируется заранее, ниже кнопок ничего не прыгает
    minHeight: 21,
  },
  shieldInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  shieldText: {
    textAlign: 'center',
  },
  footerCol: {
    alignItems: 'center',
  },
  laterButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 2,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  laterGhost: {
    alignSelf: 'stretch',
    borderRadius: 24,
    // зачем (стиль «Тень»): `.cta.gh` — плашка с малой тенью вместо контура; цвет и тень ставит вызывающий
    marginTop: 10,
  },
  legalLinks: {
    // зачем (макет auth-states.html, координатор 18.10): «Политика» и «Условия» — по одной на строку, без разделителя
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 6,
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
  // зачем (overlay.css `.ov-panel`): радиус 18, поля 16.
  recoveryPanel: {
    width: '100%',
    minHeight: 224,
    borderRadius: 18,
    padding: 16,
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
  // `.field`: 48 высотой, радиус 14, поля 14, 16/500 по левому краю.
  recoveryCodeInput: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    textAlign: 'left',
    letterSpacing: 0,
    fontWeight: '500',
    marginBottom: 10,
  },
  recoveryEmailInput: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  recoveryExpiry: {
    minHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  // `.cta` / `.cta.gh`: пилюли 48 с радиусом 24.
  recoveryPrimaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoverySecondaryOutlinedButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoveryPrimaryText: {
    fontWeight: '700',
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
