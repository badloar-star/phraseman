// ════════════════════════════════════════════════════════════════════════════
// SaveProgressBanner.tsx — persistent баннер на Home для незалогиненных юзеров.
//
// Зачем:
//   Анонимный юзер играет → прогресс пишется в users/{stable_id} в Firestore,
//   но stable_id живёт в SecureStore (iOS Keychain / Android EncryptedSharedPreferences).
//   На Android без включённого Google Drive Backup при удалении приложения
//   stable_id пропадает, и облачный документ становится сиротой.
//   Логин через Google/Apple создаёт auth_links/{providerUid → stable_id} —
//   единственный способ гарантированно восстановить прогресс при переустановке
//   или смене устройства.
//
// Условия показа:
//   • CLOUD_SYNC_ENABLED (без облака баннер бесполезен).
//   • Юзер ещё не привязан к Google/Apple (linkedAuth === null).
//   • user_total_xp >= 1000 — раньше нет смысла беспокоить, прогресс не критичный.
//   • Не дисмиссили в последние 7 дней (auth_save_banner_dismissed_at).
//
// Поведение:
//   • При тапе «Привязать» — открывает RegistrationPromptModal (context='home_banner').
//   • При тапе "×" — ставит timestamp дисмисса; через 7 дней снова появится.
//   • После успешного логина (event 'auth_provider_linked') — мгновенно скрывается.
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, Easing, Text, TouchableOpacity, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing as REasing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CLOUD_SYNC_ENABLED } from '../app/config';
import { getLinkedAuthInfo } from '../app/auth_provider';
import { subscribeAccountGeneration } from '../app/account_generation';
// зачем: visible стартует false → async shouldShow() вставляет карточку в поток Home
// вторым проходом и телепортирует всё, что ниже. Оборачиваем каждый flip видимости
// в плавный layout-переход (Performance Bible → Layout Stability), а не в телепорт.
import { animateNextLayoutTransition } from '../app/smooth_layout';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { LUM, TOAST } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LinearGradient } from './SafeLinearGradient';
import PremiumCard from './PremiumCard';
import RegistrationPromptModal from './RegistrationPromptModal';

import { noAndroidOutline } from '../constants/androidGlow';
import { DebugLogger } from '../app/debug-logger';
const DISMISSED_AT_KEY = 'auth_save_banner_dismissed_at';
const XP_THRESHOLD = 1000;
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

async function shouldShow(isCurrent: () => boolean): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED) return false;
  try {
    const xpRaw = await AsyncStorage.getItem('user_total_xp');
    if (!isCurrent()) return false;
    const xp = parseInt(xpRaw ?? '0', 10) || 0;
    if (xp < XP_THRESHOLD) return false;
  } catch {
    return false;
  }
  try {
    const dismissedRaw = await AsyncStorage.getItem(DISMISSED_AT_KEY);
    if (!isCurrent()) return false;
    if (dismissedRaw) {
      const dismissedAt = parseInt(dismissedRaw, 10) || 0;
      if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return false;
    }
  } catch (e) {
      // ignore
      DebugLogger.error('SaveProgressBanner:dismissedAt', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  try {
    if (!isCurrent()) return false;
    const info = await getLinkedAuthInfo();
    if (!isCurrent()) return false;
    if (info) return false; // уже залогинен
  } catch {
    return false;
  }
  return true;
}

interface SaveProgressBannerProps {
  ownerActive?: boolean;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
}

function SaveProgressBanner({ ownerActive = true, motionVariant = 'hybrid' }: SaveProgressBannerProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isHybrid = motionVariant === 'hybrid';
  const reduceMotion = useReduceMotion();

  const [visible, setVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const enterAnim = useRef(new Animated.Value(0)).current;
  // зачем: гибрид «Световод» (закон Motion DNA) — вход из света БЕЗ отскока
  // (LUM.settle), в отличие от боевой пружины enterAnim с перелётом scale/icon.
  // Независимый sharedValue, боевой путь остаётся нетронутым (тот же приём,
  // что MedalToast/OfflineBanner).
  const hybridOpacity = useSharedValue(0);
  const hybridY = useSharedValue(14);
  useEffect(() => {
    if (!isHybrid || !visible) return;
    if (reduceMotion) {
      hybridOpacity.value = 1;
      hybridY.value = 0;
      return;
    }
    hybridOpacity.value = withTiming(1, { duration: TOAST.enterMs, easing: REasing.out(REasing.cubic) });
    hybridY.value = withSpring(0, LUM.settle);
    return () => {
      cancelAnimation(hybridOpacity);
      cancelAnimation(hybridY);
    };
  }, [isHybrid, reduceMotion, visible, hybridOpacity, hybridY]);
  const hybridEntryStyle = useAnimatedStyle(() => ({
    opacity: hybridOpacity.value,
    transform: [{ translateY: hybridY.value }],
  }));
  const ownerActiveRef = useRef(ownerActive);
  const visibleRef = useRef(visible);
  const dirtyRef = useRef(false);
  const authLinkedRef = useRef(false);
  const checkGenerationRef = useRef(0);
  const checkInFlightRef = useRef<Promise<void> | null>(null);
  ownerActiveRef.current = ownerActive;
  visibleRef.current = visible;

  const applyVisibility = useCallback((nextVisible: boolean) => {
    if (visibleRef.current === nextVisible) return;
    visibleRef.current = nextVisible;
    animateNextLayoutTransition();
    setVisible(nextVisible);
  }, []);

  const recheck = useCallback((): Promise<void> => {
    if (!ownerActiveRef.current) {
      dirtyRef.current = true;
      return Promise.resolve();
    }
    // Пока карточка уже видима, XP-события не должны повторно ходить в auth/Firestore.
    if (visibleRef.current || authLinkedRef.current) return Promise.resolve();
    if (checkInFlightRef.current) {
      // The second event may contain newer XP/account state than the read that
      // is already underway. Preserve exactly one catch-up check instead of
      // silently treating the in-flight request as current.
      dirtyRef.current = true;
      return checkInFlightRef.current;
    }
    dirtyRef.current = false;
    const generation = checkGenerationRef.current;
    const isCurrent = () => ownerActiveRef.current
      && generation === checkGenerationRef.current
      && !authLinkedRef.current;
    const task = (async () => {
      const ok = await shouldShow(isCurrent);
      if (!isCurrent()) return;
    // зачем: setVisible здесь вставляет/убирает баннер из потока Home и двигает всё
    // ниже — планируем плавный layout-переход СТРОГО перед setState (не после).
      applyVisibility(ok);
    })().finally(() => {
      if (checkInFlightRef.current === task) checkInFlightRef.current = null;
      if (ownerActiveRef.current && dirtyRef.current && !visibleRef.current && !authLinkedRef.current) {
        void recheck();
      }
    });
    checkInFlightRef.current = task;
    return task;
  }, [applyVisibility]);

  useEffect(() => {
    // Любое изменение XP или линка — перепроверяем.
    const xpSub = DeviceEventEmitter.addListener('xp_changed', recheck);
    const xpUpdSub = DeviceEventEmitter.addListener('xp_updated', recheck);
    const linkSub = DeviceEventEmitter.addListener('auth_provider_linked', () => {
      checkGenerationRef.current += 1;
      authLinkedRef.current = true;
      dirtyRef.current = false;
      applyVisibility(false);
    });
    const deletedSub = DeviceEventEmitter.addListener('account_deleted', () => {
      checkGenerationRef.current += 1;
      authLinkedRef.current = false;
      dirtyRef.current = true;
      applyVisibility(false);
      void recheck();
    });
    return () => {
      xpSub.remove();
      xpUpdSub.remove();
      linkSub.remove();
      deletedSub.remove();
    };
  }, [applyVisibility, recheck]);

  useEffect(() => {
    return subscribeAccountGeneration(() => {
      // Account changes do not necessarily emit a provider or deletion event.
      // A pending request belongs to the old identity and must not decide B.
      checkGenerationRef.current += 1;
      checkInFlightRef.current = null;
      authLinkedRef.current = false;
      dirtyRef.current = true;
      applyVisibility(false);
      if (ownerActiveRef.current) void recheck();
    }).remove;
  }, [applyVisibility, recheck]);

  useEffect(() => {
    if (!ownerActive) {
      checkGenerationRef.current += 1;
      return;
    }
    void recheck();
  }, [ownerActive, recheck]);

  useEffect(() => () => {
    ownerActiveRef.current = false;
    checkGenerationRef.current += 1;
    checkInFlightRef.current = null;
  }, []);

  useEffect(() => {
    if (isHybrid) {
      // Гибрид анимирует opacity/translateY сам на Reanimated (hybridOpacity/
      // hybridY выше). enterAnim здесь используется только как СТАТИЧНЫЙ
      // источник для icon scale/glow интерполяций ниже — фиксируем на «конце»
      // сразу, без таймлайна, чтобы не задваивать вход.
      enterAnim.setValue(1);
      return;
    }
    if (!visible) {
      enterAnim.setValue(0);
      return;
    }

    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enterAnim, isHybrid, visible]);

  const handleDismiss = useCallback(async () => {
    hapticTap();
    // зачем: закрытие "×" убирает карточку из потока — плавный переход, а не телепорт.
    applyVisibility(false);
    try {
      await AsyncStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch (e) {
      // ignore
      DebugLogger.error('SaveProgressBanner:handleDismiss', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }, [applyVisibility]);

  const handleSignInPress = useCallback(() => {
    hapticTap();
    setAuthModalVisible(true);
  }, []);

  if (!visible) {
    // Даже если баннер скрыт, модалка может быть открыта из предыдущего рендера —
    // в норме нет, но на всякий случай рендерим её только когда баннер видим.
    return null;
  }

  const bannerTranslateY = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const bannerScale = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.965, 1] });
  const iconScale = enterAnim.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.82, 1.08, 1] });
  const iconGlowOpacity = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.62] });

  // зачем: гибрид рендерит вход через Reanimated.View (LUM.settle, без
  // отскока scale) — боевой путь остаётся на Animated.Value с прежней
  // пружиной enterAnim (перелёт scale/translateY).
  const EntryView = isHybrid ? Reanimated.View : Animated.View;
  const entryStyle = isHybrid
    ? hybridEntryStyle
    : {
        opacity: enterAnim,
        transform: [{ translateY: bannerTranslateY }, { scale: bannerScale }],
      };

  return (
    <>
      <EntryView style={entryStyle}>
      <PremiumCard
        testID="save-progress-banner"
        level={2}
        borderRadius={22}
        innerStyle={{
          paddingHorizontal: 18,
          paddingTop: 16,
          paddingBottom: 17,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[t.correct + '22', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            left: -34,
            top: -42,
            width: 170,
            height: 132,
            borderRadius: 66,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <Animated.View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              transform: [{ scale: iconScale }],
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: t.correct,
                opacity: iconGlowOpacity,
              }}
            />
            <LinearGradient
              colors={[t.correct + '33', t.correct + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 0,
                borderColor: t.correct + '55',
              }}
            >
              <Ionicons name="cloud-upload-outline" size={24} color={t.correct} />
            </LinearGradient>
          </Animated.View>

          <View style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
            <Text
              style={{
                color: t.textPrimary,
                fontSize: f.h3,
                fontWeight: '900',
                letterSpacing: 0,
                lineHeight: Math.round(f.h3 * 1.12),
              }}
            >
              {triLang(lang, {
                ru: 'Сохрани свой путь',
                uk: 'Збережи свій шлях',
                en: 'Save your progress',
                es: 'Guarda tu progreso',
                'pt-BR': 'Salve seu progresso',
                vi: 'Lưu tiến trình của bạn',
                id: 'Simpan progresmu',
                tr: 'İlerlemeni kaydet',
                pl: 'Zapisz swój postęp',
              })}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleSignInPress}
            style={{
              borderRadius: 15,
              flexShrink: 0,
              shadowColor: t.correct,
              shadowOpacity: 0.34,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              ...noAndroidOutline,
            }}
          >
            <LinearGradient
              colors={[t.correct, '#5F9DFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 15,
                borderWidth: 0,
                borderColor: t.correctText + '33',
              }}
            >
              <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '900' }}>
                {triLang(lang, {
                  ru: 'Привязать',
                  uk: 'Прив\'язати',
                  en: 'Link account',
                  es: 'Vincular',
                  'pt-BR': 'Vincular',
                  vi: 'Liên kết',
                  id: 'Tautkan',
                  tr: 'Bağla',
                  pl: 'Połącz',
                })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            testID="save-progress-banner-dismiss"
            activeOpacity={0.7}
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: -5, padding: 5, flexShrink: 0 }}
          >
            <Ionicons name="close" size={19} color={t.textMuted} />
          </TouchableOpacity>
        </View>

        <View
          style={{
            marginTop: 14,
            paddingTop: 13,
            borderTopWidth: 1,
            // зачем: белый 8% divider невидим на фарфоровой карточке sagePorcelain —
            // семантический t.border работает в обеих полярностях.
            borderTopColor: t.border,
          }}
        >
          <Text
            style={{
              color: t.textMuted,
              fontSize: f.sub,
              lineHeight: Math.round(f.sub * 1.34),
              fontWeight: '600',
            }}
          >
          {triLang(lang, {
            ru:
              'Привяжи аккаунт — и твои уроки, XP, серия и достижения останутся в безопасности. Даже если телефон внезапно решит уйти в отпуск.',
            uk:
              "Прив\'яжи акаунт — і твої уроки, XP, серія та досягнення будуть у безпеці. Навіть якщо телефон раптом вирішить піти у відпустку.",
            en:
              'Link your account — your lessons, XP, streak, and achievements stay safe. Even if your phone suddenly decides to go on vacation.',
            es:
              'Vincula tu cuenta: tus lecciones, XP, racha y logros siguen a salvo. Aunque el móvil decida irse de vacaciones sin avisar.',
            'pt-BR':
              'Vincule sua conta: suas lições, XP, sequência e conquistas ficam seguros. Mesmo se o celular decidir tirar férias sem avisar.',
            vi: 'Liên kết tài khoản để bài học, XP, chuỗi ngày và thành tích của bạn được an toàn. Kể cả khi điện thoại bất ngờ muốn nghỉ phép.',
            id: 'Tautkan akunmu agar pelajaran, XP, streak, dan pencapaian tetap aman. Bahkan jika ponsel tiba-tiba memutuskan liburan.',
            tr: 'Hesabını bağla; derslerin, XP, serin ve başarımların güvende kalsın. Telefon birden tatile çıkmaya karar verse bile.',
            pl: 'Połącz konto, a lekcje, XP, seria i osiągnięcia będą bezpieczne. Nawet jeśli telefon nagle postanowi zrobić sobie urlop.',
          })}
          </Text>
        </View>

      </PremiumCard>
      </EntryView>

      <RegistrationPromptModal
        visible={authModalVisible}
        context="home_banner"
        onClose={() => setAuthModalVisible(false)}
            onSignedIn={() => {
              setAuthModalVisible(false);
          // зачем: успешный логин убирает баннер из потока — плавный переход, не телепорт.
              authLinkedRef.current = true;
              applyVisibility(false);
            }}
      />
    </>
  );
}

export default memo(SaveProgressBanner);
