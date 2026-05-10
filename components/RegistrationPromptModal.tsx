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

import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { GoogleSignInButton, AppleSignInButton } from './AuthProviderButtons';
import {
  signInWithProvider,
  signOutCurrentProvider,
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  AUTH_PROMPT_SHOWN_KEY,
  APPLE_ANDROID_MISSING_SERVICE_ID,
  type SignInResult,
  type AuthProviderId,
} from '../app/auth_provider';
import { clearStableId } from '../app/stable_id';
import { ensureAnonUser } from '../app/cloud_sync';
import { logEvent } from '../app/firebase';
import { emitAppEvent } from '../app/events';
import { triLang } from '../constants/i18n';

interface Props {
  visible: boolean;
  /** Контекст показа — для аналитики. 'home_banner' — открыт из persistent
   *  баннера на Home для незалогиненных юзеров с XP ≥ 1000. */
  context: 'lesson1' | 'settings' | 'onboarding' | 'dev' | 'home_banner';
  /** Кастомный заголовок (опц., иначе используется дефолт под контекст). */
  title?: string;
  /** Кастомный подзаголовок (опц.). */
  subtitle?: string;
  onClose: () => void;
  onSignedIn?: (result: SignInResult) => void;
}

export default function RegistrationPromptModal({
  visible,
  context,
  title,
  subtitle,
  onClose,
  onSignedIn,
}: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [appleAvail, setAppleAvail] = useState(false);
  const [googleAvail, setGoogleAvail] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<AuthProviderId | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setInlineError(null);
    isAppleSignInAvailable().then(setAppleAvail);
    isGoogleSignInAvailable().then(setGoogleAvail);
    logEvent('auth_prompt_view', { context });
  }, [visible, context]);

  const showInlineError = useCallback((title: string, message: string) => {
    setInlineError(`${title}\n${message}`);
  }, []);

  const headerEmoji = context === 'lesson1' ? '🛡️' : context === 'onboarding' ? '🚀' : '🔐';

  const defaultTitle = triLang(lang, {
    ru:
      context === 'lesson1'
        ? 'Сохрани свой прогресс!'
        : context === 'onboarding'
        ? 'Быстрый старт'
        : 'Войти или зарегистрироваться',
    uk:
      context === 'lesson1'
        ? 'Збережи свій прогрес!'
        : context === 'onboarding'
        ? 'Швидкий старт'
        : 'Війти або зареєструватись',
    es:
      context === 'lesson1'
        ? '¡Guarda tu progreso!'
        : context === 'onboarding'
        ? 'Inicio rápido'
        : 'Iniciar sesión o registrarse',
  });

  const defaultSubtitle = triLang(lang, {
    ru:
      context === 'lesson1'
        ? 'Один клик через Google — и твой прогресс в безопасности. Сменишь телефон? Прогресс с тобой. Удалишь приложение? Восстановим в один тап.'
        : context === 'onboarding'
        ? 'Один тап — и твой прогресс сохраняется навсегда. Без паролей, без форм, без лишних шагов.'
        : 'Быстрый вход через Google или Apple. Прогресс синхронизируется между устройствами.',
    uk:
      context === 'lesson1'
        ? 'Один тап через Google — і твій прогрес у безпеці. Заміниш телефон? Прогрес з тобою. Видалиш додаток? Відновимо одним кліком.'
        : context === 'onboarding'
        ? 'Один тап — і твій прогрес зберігається назавжди. Без паролів, без форм, без зайвих кроків.'
        : 'Швидкий вхід через Google або Apple. Прогрес синхронізується між пристроями.',
    es:
      context === 'lesson1'
        ? 'Con un toque en Google, tu progreso queda a salvo. ¿Cambias de móvil? Va contigo. ¿Desinstalas la app? Recupéralo con un solo toque.'
        : context === 'onboarding'
        ? 'Un toque y tu progreso se guarda para siempre. Sin contraseñas, sin formularios ni pasos innecesarios.'
        : 'Acceso rápido con Google o Apple. El progreso se sincroniza entre dispositivos.',
  });

  const finalTitle = title ?? defaultTitle;
  const finalSubtitle = subtitle ?? defaultSubtitle;

  const labelGoogle = triLang(lang, { ru: 'Войти через Google', uk: 'Війти з Google', es: 'Entrar con Google' });
  const labelApple = triLang(lang, { ru: 'Войти через Apple', uk: 'Війти з Apple', es: 'Entrar con Apple' });
  const labelLater = triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde' });
  const labelPrivacy = triLang(lang, {
    ru: 'Мы не публикуем ваш email и не отправляем спам.',
    uk: 'Ми не публікуємо ваш email і не надсилаємо спам.',
    es: 'No publicamos tu correo electrónico ni enviamos spam.',
  });

  const handleSignIn = useCallback(
    async (provider: AuthProviderId) => {
      setLoadingProvider(provider);
      logEvent('auth_prompt_click', { context, provider });
      if (__DEV__) console.log('[RegistrationPromptModal] handleSignIn start, provider=', provider);
      try {
        const result = await signInWithProvider(provider);
        setLoadingProvider(null);
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
              triLang(lang, { ru: 'Вход не завершён', uk: 'Вхід не завершено', es: 'Acceso sin terminar' }),
              triLang(lang, {
                ru: 'Окно входа закрылось без выбора аккаунта. Нажми кнопку ещё раз или попробуй другой способ.',
                uk: 'Вікно входу закрилось без вибору акаунта. Натисни кнопку ще раз або спробуй інший спосіб.',
                es: 'Se cerró el acceso sin elegir cuenta. Toca de nuevo o prueba otro método.',
              }),
            );
          }
          return;
        }
        if (result.result === 'error') {
          if (__DEV__) console.warn('[RegistrationPromptModal] sign-in error', result.error);
          if (result.error?.includes(APPLE_ANDROID_MISSING_SERVICE_ID)) {
            showInlineError(
              triLang(lang, { ru: 'Apple на Android', uk: 'Apple на Android', es: 'Apple en Android' }),
              triLang(lang, {
                ru:
                  'Для входа через Apple на Android в сборке должен быть задан Services ID (переменная EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID в EAS / .env). В Apple Developer добавь тот же return URL, что у приложения (часто phraseman://apple-auth).',
                uk:
                  'Для входу через Apple на Android у збірці має бути заданий Services ID (змінна EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID у EAS / .env). У Apple Developer додай той самий return URL, що й у застосунку (часто phraseman://apple-auth).',
                es:
                  'Para entrar con Apple en Android hace falta el Services ID en la build (EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID en EAS / .env). En Apple Developer añade el mismo return URL que usa la app (a menudo phraseman://apple-auth).',
              }),
            );
            return;
          }
          const baseMsg = triLang(lang, {
            ru: 'Не получилось войти. Попробуй позже.',
            uk: 'Не вдалося увійти. Спробуй пізніше.',
            es: 'No se ha podido iniciar sesión. Inténtalo más tarde.',
          });
          // Показываем код ошибки и в проде: без него бессмысленно отлаживать жалобы
          // тестеров («тапнул — выскочило "Не получилось войти"»). Один скриншот —
          // и видно, native_google_signin_no_id_token (SHA в Firebase) vs
          // firebase_auth/* (не включён провайдер) vs transaction_* (Firestore rules
          // / нет сети). Текст компактный, ничего секретного — просто мнемоника.
          const detailedMsg = result.error
            ? `${baseMsg}\n\n${triLang(lang, { ru: 'Код:', uk: 'Код:', es: 'Código:' })} ${result.error}`
            : baseMsg;
          showInlineError(
            triLang(lang, { ru: 'Ошибка', uk: 'Помилка', es: 'Error' }),
            detailedMsg,
          );
          return;
        }

        // success — сохраняем что показали, закрываем, эмитим событие
        await AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(() => {});
        emitAppEvent('auth_provider_linked');
        onSignedIn?.(result);
        onClose();
      } catch (e: any) {
        setLoadingProvider(null);
        if (__DEV__) console.warn('[RegistrationPromptModal] unexpected error', e);
        // В проде раньше ловили throw молча → «тапнул Apple — ничего». Покажем компактную ошибку.
        const detail = String(e?.message ?? e ?? 'unknown');
        showInlineError(
          triLang(lang, { ru: 'Ошибка', uk: 'Помилка', es: 'Error' }),
          `${triLang(lang, {
            ru: 'Что-то пошло не так при входе.',
            uk: 'Щось пішло не так під час входу.',
            es: 'Algo salió mal al iniciar sesión.',
          })}\n\n${detail.slice(0, 200)}`,
        );
      }
    },
    [context, lang, onClose, onSignedIn, showInlineError],
  );

  // Аварийная кнопка для DEV: полный wipe identity-state (Keychain stable_id +
  // Google session + Firebase Auth) + поднятие чистой анонимной сессии.
  // Помогает выйти из «зомби»-состояния после старого battery delete-account-flow,
  // когда auth_links/{providerUid} указывают на удалённый users/{stable_id} и
  // signIn повисает или silently возвращает `cancelled`.
  const handleResetAndRetry = useCallback(async () => {
    setLoadingProvider('google');
    try {
      try { await signOutCurrentProvider(); } catch { /* ignore */ }
      try { await clearStableId(); } catch { /* ignore */ }
      try { await ensureAnonUser(); } catch { /* ignore */ }
      showInlineError(
        'Сброс выполнен',
        'Identity-state очищен. Теперь нажми "Войти через Google" — должен появиться picker аккаунтов.',
      );
    } finally {
      setLoadingProvider(null);
    }
  }, []);

  const handleLater = useCallback(async () => {
    logEvent('auth_prompt_dismissed', { context });
    await AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(() => {});
    onClose();
  }, [context, onClose]);

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
            { backgroundColor: t.bgCard, borderColor: t.border },
          ]}
        >
          <Text style={[styles.emoji]}>{headerEmoji}</Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>{finalTitle}</Text>
          <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.body }]}>{finalSubtitle}</Text>

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

          {!googleAvail && !appleAvail && (
            <Text style={[styles.errorNote, { color: t.wrong, fontSize: f.caption }]}>
              {triLang(lang, {
                ru: 'Ни один провайдер не доступен на этом устройстве.',
                uk: 'Жоден провайдер не доступний на цьому пристрої.',
                es: 'Ningún método de entrada está disponible en este dispositivo.',
              })}
            </Text>
          )}

          {!!inlineError && (
            <Text style={[styles.errorNote, { color: t.wrong, fontSize: f.caption }]}>
              {inlineError}
            </Text>
          )}

          {__DEV__ && (
            <Pressable
              onPress={handleResetAndRetry}
              disabled={loadingProvider !== null}
              style={[styles.laterButton, { borderWidth: 1, borderColor: t.border, borderRadius: 12, marginTop: 6 }]}
            >
              <Text style={[styles.laterText, { color: t.wrong, fontSize: f.caption }]}>
                DEBUG: Сбросить identity и войти заново
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleLater}
            disabled={loadingProvider !== null}
            style={styles.laterButton}
            testID="auth-prompt-later"
          >
            <Text style={[styles.laterText, { color: t.textMuted, fontSize: f.body }]}>
              {labelLater}
            </Text>
          </Pressable>

          <Text style={[styles.privacy, { color: t.textGhost, fontSize: f.caption }]}>
            {labelPrivacy}
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
    borderWidth: 0.5,
    padding: 28,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
    textAlign: 'center',
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    width: '100%',
    marginBottom: 16,
  },
  laterButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 4,
  },
  laterText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  privacy: {
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
  errorNote: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
});
