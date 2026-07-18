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

import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Modal, View, Text, Pressable, StyleSheet, Platform, Linking, ScrollView, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { GoogleSignInButton, AppleSignInButton } from './AuthProviderButtons';
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
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
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
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { height: viewportHeight } = useWindowDimensions();
  const isCompassTheme = false;

  const [appleAvail, setAppleAvail] = useState(false);
  const [googleAvail, setGoogleAvail] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<AuthProviderId | null>(null);
  const [signInSlow, setSignInSlow] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
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
    logEvent('auth_prompt_view', { context });
    return () => {
      active = false;
    };
  }, [visible, context, clearSlowTimer]);

  const showInlineError = useCallback((title: string, message: string) => {
    setInlineError(`${title}\n${message}`);
  }, []);

  // Сапфировый медальон вместо эмодзи-замка (контекст доверия/безопасности).
  const headerIcon: React.ComponentProps<typeof Ionicons>['name'] =
    context === 'lesson1' ? 'shield-checkmark' : 'lock-closed';
  const TRUST_ACCENT = '#6EA8FF';

  const defaultTitle = triLang(lang, {
    ru:
      context === 'lesson1'
        ? 'Сохрани свой прогресс!'
        : context === 'startup_recovery'
        ? 'Восстанови свой аккаунт'
        : context === 'onboarding'
        ? 'Быстрый старт'
        : 'Войти или зарегистрироваться',
    uk:
      context === 'lesson1'
        ? 'Збережи свій прогрес!'
        : context === 'startup_recovery'
        ? 'Віднови свій акаунт'
        : context === 'onboarding'
        ? 'Швидкий старт'
        : 'Війти або зареєструватись',
    es:
      context === 'lesson1'
        ? '¡Guarda tu progreso!'
        : context === 'startup_recovery'
        ? 'Recupera tu cuenta'
        : context === 'onboarding'
        ? 'Inicio rápido'
        : 'Iniciar sesión o registrarse',
    'pt-BR':
      context === 'lesson1'
        ? 'Salve seu progresso!'
        : context === 'startup_recovery'
        ? 'Recupere sua conta'
        : context === 'onboarding'
        ? 'Início rápido'
        : 'Entrar ou cadastrar-se',
    vi:
      context === 'lesson1'
        ? 'Lưu tiến trình của bạn!'
        : context === 'startup_recovery'
        ? 'Khôi phục tài khoản'
        : context === 'onboarding'
        ? 'Bắt đầu nhanh'
        : 'Đăng nhập hoặc đăng ký',
    id:
      context === 'lesson1'
        ? 'Simpan progresmu!'
        : context === 'startup_recovery'
        ? 'Pulihkan akunmu'
        : context === 'onboarding'
        ? 'Mulai cepat'
        : 'Masuk atau daftar',
    tr:
      context === 'lesson1'
        ? 'İlerlemeni kaydet!'
        : context === 'startup_recovery'
        ? 'Hesabını geri yükle'
        : context === 'onboarding'
        ? 'Hızlı başlangıç'
        : 'Giriş yap veya kaydol',
    pl:
      context === 'lesson1'
        ? 'Zapisz swoje postępy!'
        : context === 'startup_recovery'
        ? 'Odzyskaj konto'
        : context === 'onboarding'
        ? 'Szybki start'
        : 'Zaloguj się lub zarejestruj',
  });

  const defaultSubtitle = triLang(lang, {
    ru:
      context === 'lesson1'
        ? 'Один клик через Google — и твой прогресс в безопасности. Сменишь телефон? Прогресс с тобой. Удалишь приложение? Восстановим в один тап.'
        : context === 'startup_recovery'
        ? 'Войди тем же способом и в тот же аккаунт Google или Apple, который был привязан раньше. После входа мы безопасно восстановим облачный прогресс; данные на этом устройстве пока сохранены.'
        : context === 'onboarding'
        ? 'Вход можно пропустить. Но если сменить телефон или случайно удалить приложение, есть риск потерять прогресс.'
        : 'Быстрый вход через Google или Apple. Прогресс синхронизируется между устройствами.',
    uk:
      context === 'lesson1'
        ? 'Один тап через Google — і твій прогрес у безпеці. Заміниш телефон? Прогрес з тобою. Видалиш додаток? Відновимо одним кліком.'
        : context === 'startup_recovery'
        ? 'Увійди тим самим способом і в той самий акаунт Google або Apple, який було прив’язано раніше. Після входу ми безпечно відновимо хмарний прогрес; дані на цьому пристрої поки збережені.'
        : context === 'onboarding'
        ? 'Можна продовжити без входу, але якщо видалити застосунок без привʼязки акаунта, прогрес може загубитися. Привʼязати акаунт можна пізніше в налаштуваннях.'
        : 'Швидкий вхід через Google або Apple. Прогрес синхронізується між пристроями.',
    es:
      context === 'lesson1'
        ? 'Con un toque en Google, tu progreso queda a salvo. ¿Cambias de móvil? Va contigo. ¿Desinstalas la app? Recupéralo con un solo toque.'
        : context === 'startup_recovery'
        ? 'Inicia sesión del mismo modo y con la misma cuenta de Google o Apple que vinculaste antes. Después restauraremos tu progreso de forma segura; los datos de este dispositivo siguen guardados.'
        : context === 'onboarding'
        ? 'Puedes seguir sin iniciar sesión, pero si eliminas la app sin vincular tu cuenta, podrías perder el progreso. Puedes vincularla más tarde en Ajustes.'
        : 'Acceso rápido con Google o Apple. El progreso se sincroniza entre dispositivos.',
    'pt-BR':
      context === 'lesson1'
        ? 'Com um toque no Google, seu progresso fica seguro. Vai trocar de celular? Ele vai com você. Desinstalou o app? Recupere com um toque.'
        : context === 'startup_recovery'
        ? 'Entre do mesmo jeito e com a mesma conta Google ou Apple vinculada antes. Depois, restauraremos seu progresso com segurança; os dados deste dispositivo continuam salvos.'
        : context === 'onboarding'
        ? 'Você pode continuar sem entrar, mas se apagar o app sem vincular a conta, pode perder o progresso. Dá para vincular depois em Ajustes.'
        : 'Entrada rápida com Google ou Apple. O progresso sincroniza entre dispositivos.',
    vi:
      context === 'lesson1'
        ? 'Chỉ một lần chạm qua Google là tiến trình của bạn được an toàn. Đổi điện thoại? Tiến trình đi theo bạn. Xóa ứng dụng? Khôi phục chỉ với một lần chạm.'
        : context === 'startup_recovery'
        ? 'Hãy đăng nhập bằng đúng cách và đúng tài khoản Google hoặc Apple đã liên kết trước đây. Sau đó, tiến độ đám mây sẽ được khôi phục an toàn; dữ liệu trên thiết bị này vẫn được giữ.'
        : context === 'onboarding'
        ? 'Bạn có thể tiếp tục không đăng nhập, nhưng nếu xóa ứng dụng khi chưa liên kết tài khoản, tiến trình có thể bị mất. Bạn có thể liên kết sau trong Cài đặt.'
        : 'Đăng nhập nhanh bằng Google hoặc Apple. Tiến trình sẽ được đồng bộ giữa các thiết bị.',
    id:
      context === 'lesson1'
        ? 'Sekali ketuk lewat Google, progresmu aman. Ganti ponsel? Progres ikut. Hapus aplikasi? Pulihkan dengan satu ketukan.'
        : context === 'startup_recovery'
        ? 'Masuk dengan cara dan akun Google atau Apple yang sama seperti yang pernah ditautkan. Setelah itu progres cloud akan dipulihkan dengan aman; data di perangkat ini tetap tersimpan.'
        : context === 'onboarding'
        ? 'Kamu bisa lanjut tanpa masuk, tetapi jika aplikasi dihapus tanpa menautkan akun, progres bisa hilang. Akun bisa ditautkan nanti di Pengaturan.'
        : 'Masuk cepat lewat Google atau Apple. Progres disinkronkan antarperangkat.',
    tr:
      context === 'lesson1'
        ? 'Google ile tek dokunuşta ilerlemen güvende kalır. Telefon değiştirirsen yanında gelir. Uygulamayı silersen tek dokunuşla geri yükleriz.'
        : context === 'startup_recovery'
        ? 'Daha önce bağladığın aynı yöntemle ve aynı Google veya Apple hesabıyla giriş yap. Ardından bulut ilerlemeni güvenle geri yükleyeceğiz; bu cihazdaki veriler korunuyor.'
        : context === 'onboarding'
        ? 'Giriş yapmadan devam edebilirsin, ama hesabını bağlamadan uygulamayı silersen ilerlemeni kaybedebilirsin. Hesabı daha sonra Ayarlar’dan bağlayabilirsin.'
        : 'Google veya Apple ile hızlı giriş. İlerleme cihazlar arasında eşitlenir.',
    pl:
      context === 'lesson1'
        ? 'Jedno kliknięcie przez Google i twoje postępy są bezpieczne. Zmieniasz telefon? Idą z tobą. Usuniesz aplikację? Odzyskamy je jednym kliknięciem.'
        : context === 'startup_recovery'
        ? 'Zaloguj się w ten sam sposób i na to samo konto Google lub Apple, które było wcześniej połączone. Potem bezpiecznie przywrócimy postęp z chmury; dane na tym urządzeniu są zachowane.'
        : context === 'onboarding'
        ? 'Możesz kontynuować bez logowania, ale jeśli usuniesz aplikację bez połączenia konta, możesz stracić postępy. Konto można połączyć później w Ustawieniach.'
        : 'Szybkie logowanie przez Google lub Apple. Postępy synchronizują się między urządzeniami.',
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
  const labelPrivacy = triLang(lang, {
    ru: 'Твой email остаётся у тебя — никакого спама.',
    uk: 'Твій email залишається в тебе — жодного спаму.',
    es: 'No publicamos tu correo electrónico ni enviamos spam.',
    'pt-BR': 'Não publicamos seu email nem enviamos spam.',
    vi: 'Chúng tôi không công khai email của bạn và không gửi spam.',
    id: 'Kami tidak mempublikasikan emailmu dan tidak mengirim spam.',
    tr: 'E-postanı paylaşmayız ve spam göndermeyiz.',
    pl: 'Nie publikujemy twojego emaila i nie wysyłamy spamu.',
  });

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
                vi:
                  'Để đăng nhập bằng Apple trên Android, bản build cần Services ID (EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID trong EAS / .env). Trong Apple Developer, hãy thêm cùng return URL mà ứng dụng dùng (thường là phraseman://apple-auth).',
                id:
                  'Untuk masuk dengan Apple di Android, build harus memiliki Services ID (EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID di EAS / .env). Di Apple Developer, tambahkan return URL yang sama dengan aplikasi (seringnya phraseman://apple-auth).',
                tr:
                  'Android’da Apple ile giriş için build içinde Services ID gerekir (EAS / .env içinde EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID). Apple Developer’da uygulamanın kullandığı aynı return URL’yi ekle (çoğunlukla phraseman://apple-auth).',
                pl:
                  'Aby logować się przez Apple na Androidzie, build musi mieć Services ID (EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID w EAS / .env). W Apple Developer dodaj ten sam return URL co w aplikacji (często phraseman://apple-auth).',
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleLater}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleLater}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.card,
            {
              backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
              borderRadius: isCompassTheme ? 14 : 24,
              maxHeight: cardMaxHeight,
              overflow: 'hidden',
              ...(isCompassTheme ? compassShadow(3) : null),
            },
          ]}
        >
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={[styles.cardContent, { padding: cardPadding }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
          {isCompassTheme && <CompassDepthSurface radius={14} selected />}
          <View style={[styles.medallion, { borderColor: `${TRUST_ACCENT}55` }]}>
            <LinearGradient
              pointerEvents="none"
              colors={[`${TRUST_ACCENT}30`, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name={headerIcon} size={34} color={TRUST_ACCENT} />
          </View>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1, lineHeight: titleLineHeight }]}>
            {finalTitle}
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.body, lineHeight: bodyLineHeight }]}>
            {finalSubtitle}
          </Text>

          <View style={styles.buttons}>
            {googleAvail && (
              <GoogleSignInButton
                onPress={() => handleSignIn('google')}
                loading={loadingProvider === 'google'}
                disabled={loadingProvider !== null}
                label={labelGoogle}
                variant="light"
              />
            )}
            {appleAvail && (
              <View style={{ marginTop: googleAvail ? 12 : 0 }}>
                <AppleSignInButton
                  onPress={() => handleSignIn('apple')}
                  loading={loadingProvider === 'apple'}
                  disabled={loadingProvider !== null}
                  label={labelApple}
                />
              </View>
            )}
          </View>

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
                  backgroundColor: isCompassTheme ? COMPASS_RICH.charcoal : t.bgSurface,
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
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
                  borderWidth: 0,
                  borderColor: 'transparent',
                  borderRadius: isCompassTheme ? 9 : 12,
                  marginTop: 6,
                  backgroundColor: isCompassTheme ? COMPASS_RICH.copperWash : t.bgSurface,
                  overflow: 'hidden',
                  ...(isCompassTheme ? compassShadow(1) : null),
                },
              ]}
            >
              {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
              <Text style={[styles.laterText, { color: t.wrong, fontSize: f.caption }]}>
                DEBUG: Сбросить identity и войти заново
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleLater}
            disabled={loadingProvider !== null && !signInSlow}
            accessibilityRole="button"
            accessibilityLabel={labelLaterAccessibility}
            accessibilityState={{ disabled: loadingProvider !== null && !signInSlow }}
            style={[
              styles.laterButton,
              isCompassTheme && {
                borderRadius: 9,
                borderWidth: 0,
                borderColor: 'transparent',
                backgroundColor: COMPASS_RICH.charcoal,
                overflow: 'hidden',
                ...compassShadow(1),
              },
            ]}
            testID="auth-prompt-later"
          >
            {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
            <Text style={[styles.laterText, { color: t.textMuted, fontSize: f.body }]}>
              {labelLater}
            </Text>
          </Pressable>

          <Text style={[styles.privacy, { color: t.textGhost, fontSize: f.caption, lineHeight: captionLineHeight }]}>
            {labelPrivacy}
          </Text>
          <View style={styles.legalLinks}>
            <Pressable onPress={() => Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL)} hitSlop={8}>
              <Text style={[styles.legalLink, { color: t.accent, fontSize: f.caption, lineHeight: captionLineHeight }]}>Privacy Policy</Text>
            </Pressable>
            <Text style={{ color: t.textGhost, fontSize: f.caption, lineHeight: captionLineHeight }}>|</Text>
            <Pressable onPress={() => Linking.openURL(KNOWLY_LEGAL_TERMS_URL)} hitSlop={8}>
              <Text style={[styles.legalLink, { color: t.accent, fontSize: f.caption, lineHeight: captionLineHeight }]}>Terms of Use</Text>
            </Pressable>
          </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default memo(RegistrationPromptModal);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 0,
    padding: 0,
    alignItems: 'center',
  },
  cardScroll: {
    width: '100%',
  },
  cardContent: {
    alignItems: 'center',
  },
  medallion: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  buttons: {
    width: '100%',
    marginBottom: 12,
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
  laterButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 2,
  },
  laterText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  privacy: {
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
    width: '100%',
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    rowGap: 2,
    marginTop: 6,
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
