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
import { AccessibilityInfo, ActivityIndicator, Modal, View, Text, Pressable, StyleSheet, Platform, Linking, ScrollView, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { GoogleSignInButton, AppleSignInButton } from './AuthProviderButtons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { emitAppEvent } from '../app/events';
import { KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../app/config';
import { triLang } from '../constants/i18n';
import { createAuthPromptAttemptLifecycle } from './auth_prompt_attempt_lifecycle';

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
  context: 'lesson1' | 'settings' | 'onboarding' | 'dev' | 'home_banner' | 'startup_recovery';
  /** Кастомный заголовок (опц., иначе используется дефолт под контекст). */
  title?: string;
  /** Кастомный подзаголовок (опц.). */
  subtitle?: string;
  onClose: () => void;
  onSignedIn?: (result: SignInResult) => void;
}

function RegistrationPromptModal({
  visible,
  context,
  title,
  subtitle,
  onClose,
  onSignedIn,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const { height: viewportHeight } = useWindowDimensions();

  const [appleAvail, setAppleAvail] = useState(false);
  const [googleAvail, setGoogleAvail] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<AuthProviderId | null>(null);
  const [signInSlow, setSignInSlow] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
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

  const isAttemptCurrent = useCallback(
    (attemptToken: number) => attemptLifecycle.isCurrent(attemptToken),
    [attemptLifecycle],
  );

  useEffect(() => {
    attemptLifecycle.mount();
    return () => {
      attemptLifecycle.unmount();
      clearSlowTimer();
    };
  }, [attemptLifecycle, clearSlowTimer]);

  useLayoutEffect(() => {
    attemptLifecycle.setVisible(visible);
  }, [attemptLifecycle, visible]);

  useEffect(() => {
    if (!visible) {
      clearSlowTimer();
      setLoadingProvider(null);
      setSignInSlow(false);
      return;
    }
    setInlineError(null);
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
  }, [visible, context, clearSlowTimer, backdropO, sheetY, sheetOpacity, dragTranslateY, cascade]);

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

  const handleSignIn = useCallback(
    async (provider: AuthProviderId) => {
      if (loadingProvider !== null) return;
      const attemptToken = attemptLifecycle.startAttempt();
      if (attemptToken === null) return;
      setLoadingProvider(provider);
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
          if (__DEV__) console.warn('[RegistrationPromptModal] sign-in error', result.error);
          if (result.error === 'recovery_provider_mismatch') {
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
          // Показываем код ошибки и в проде: без него бессмысленно отлаживать жалобы
          // тестеров («тапнул — выскочило "Не получилось войти"»). Один скриншот —
          // и видно, native_google_signin_no_id_token (SHA в Firebase) vs
          // firebase_auth/* (не включён провайдер) vs transaction_* (Firestore rules
          // / нет сети). Текст компактный, ничего секретного — просто мнемоника.
          const detailedMsg = result.error
            ? `${baseMsg}\n\n${triLang(lang, { ru: 'Код:', uk: 'Код:', es: 'Código:', 'pt-BR': 'Código:', vi: 'Mã:', id: 'Kode:', tr: 'Kod:', pl: 'Kod:' })} ${result.error}`
            : baseMsg;
          showInlineError(
            triLang(lang, { ru: 'Ошибка', uk: 'Помилка', es: 'Error', 'pt-BR': 'Erro', vi: 'Lỗi', id: 'Error', tr: 'Hata', pl: 'Błąd' }),
            detailedMsg,
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
        const detail = String(e?.message ?? e ?? 'unknown');
        showInlineError(
          triLang(lang, { ru: 'Ошибка', uk: 'Помилка', es: 'Error', 'pt-BR': 'Erro', vi: 'Lỗi', id: 'Error', tr: 'Hata', pl: 'Błąd' }),
          `${triLang(lang, {
            ru: 'Что-то пошло не так при входе.',
            uk: 'Щось пішло не так під час входу.',
            es: 'Algo salió mal al iniciar sesión.',
            'pt-BR': 'Algo deu errado ao entrar.',
            vi: 'Có lỗi xảy ra khi đăng nhập.',
            id: 'Ada yang salah saat masuk.',
            tr: 'Giriş sırasında bir şeyler ters gitti.',
            pl: 'Coś poszło nie tak podczas logowania.',
          })}\n\n${detail.slice(0, 200)}`,
        );
      } finally {
        if (isAttemptCurrent(attemptToken)) {
          clearSlowTimer();
          setLoadingProvider(null);
          setSignInSlow(false);
        }
        attemptLifecycle.completeAttempt(attemptToken);
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
    if (loadingProvider !== null && !signInSlow) return;
    logEvent('auth_prompt_dismissed', { context });
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
  }, [attemptLifecycle, clearSlowTimer, context, loadingProvider, onClose, signInSlow]);

  const handleLaterRef = useRef(handleLater);
  handleLaterRef.current = handleLater;

  // Анимированное закрытие (крестик/фон/«Позже»): лист уезжает вниз + подложка тает,
  // затем общий путь handleLater (те же правила, включая signInSlow).
  const dismissSheet = useCallback(() => {
    if (loadingProvider !== null && !signInSlow) return;
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(handleLaterRef.current)();
    });
  }, [backdropO, sheetOpacity, sheetY, loadingProvider, signInSlow]);

  const closeAfterSwipe = useCallback(() => {
    void handleLaterRef.current();
  }, []);

  // Блокировка жестов во время входа (как purchasingSV в CardPackShardPaywallModal).
  const signInBlockingSV = useSharedValue(false);
  useEffect(() => {
    signInBlockingSV.value = loadingProvider !== null && !signInSlow;
  }, [loadingProvider, signInSlow, signInBlockingSV]);

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
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet}>
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
          <View style={styles.grabberZone}>
            <View style={[styles.grabber, { backgroundColor: t.border }]} />
          </View>
          <Pressable
            onPress={dismissSheet}
            accessibilityLabel={labelLater}
            hitSlop={8}
            style={[styles.closeBtn, { backgroundColor: t.bgSurface }]}
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

          <Animated.View style={[styles.buttons, rise2]}>
            {googleAvail && (
              <GoogleSignInButton
                onPress={() => handleSignIn('google')}
                loading={loadingProvider === 'google'}
                disabled={loadingProvider !== null}
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
                disabled={loadingProvider !== null}
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
            <Pressable
              onPress={dismissSheet}
              disabled={loadingProvider !== null && !signInSlow}
              accessibilityRole="button"
              accessibilityLabel={labelLaterAccessibility}
              accessibilityState={{ disabled: loadingProvider !== null && !signInSlow }}
              style={styles.laterButton}
              testID="auth-prompt-later"
            >
              <Text style={[styles.laterText, { color: t.textMuted, fontSize: f.body }]}>
                {labelLater}
              </Text>
            </Pressable>
            <View style={styles.legalLinks}>
              <Pressable onPress={() => Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL)} hitSlop={8}>
                <Text style={[styles.legalLink, { color: t.accent, fontSize: f.caption, lineHeight: captionLineHeight }]}>Privacy Policy</Text>
              </Pressable>
              <Text style={{ color: t.textGhost, fontSize: f.caption, lineHeight: captionLineHeight }}>|</Text>
              <Pressable onPress={() => Linking.openURL(KNOWLY_LEGAL_TERMS_URL)} hitSlop={8}>
                <Text style={[styles.legalLink, { color: t.accent, fontSize: f.caption, lineHeight: captionLineHeight }]}>Terms of Use</Text>
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
    top: 10,
    right: 12,
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
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
    minHeight: 40,
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
});
