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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CLOUD_SYNC_ENABLED } from '../app/config';
import { getLinkedAuthInfo } from '../app/auth_provider';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { LinearGradient } from './SafeLinearGradient';
import PremiumCard from './PremiumCard';
import RegistrationPromptModal from './RegistrationPromptModal';

const DISMISSED_AT_KEY = 'auth_save_banner_dismissed_at';
const XP_THRESHOLD = 1000;
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

async function shouldShow(): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED) return false;
  try {
    const info = await getLinkedAuthInfo();
    if (info) return false; // уже залогинен
  } catch {
    return false;
  }
  try {
    const xpRaw = await AsyncStorage.getItem('user_total_xp');
    const xp = parseInt(xpRaw ?? '0', 10) || 0;
    if (xp < XP_THRESHOLD) return false;
  } catch {
    return false;
  }
  try {
    const dismissedRaw = await AsyncStorage.getItem(DISMISSED_AT_KEY);
    if (dismissedRaw) {
      const dismissedAt = parseInt(dismissedRaw, 10) || 0;
      if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return false;
    }
  } catch { /* ignore */ }
  return true;
}

function SaveProgressBanner() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [visible, setVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const enterAnim = useRef(new Animated.Value(0)).current;

  const recheck = useCallback(async () => {
    const ok = await shouldShow();
    setVisible(ok);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await shouldShow();
      if (alive) setVisible(ok);
    })();
    // Любое изменение XP или линка — перепроверяем.
    const xpSub = DeviceEventEmitter.addListener('xp_changed', recheck);
    const xpUpdSub = DeviceEventEmitter.addListener('xp_updated', recheck);
    const linkSub = DeviceEventEmitter.addListener('auth_provider_linked', () => setVisible(false));
    return () => {
      alive = false;
      xpSub.remove();
      xpUpdSub.remove();
      linkSub.remove();
    };
  }, [recheck]);

  useEffect(() => {
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
  }, [enterAnim, visible]);

  const handleDismiss = useCallback(async () => {
    hapticTap();
    setVisible(false);
    try {
      await AsyncStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch { /* ignore */ }
  }, []);

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

  return (
    <>
      <Animated.View
        style={{
          opacity: enterAnim,
          transform: [{ translateY: bannerTranslateY }, { scale: bannerScale }],
        }}
      >
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
              elevation: 5,
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
            borderTopColor: 'rgba(255,255,255,0.08)',
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
      </Animated.View>

      <RegistrationPromptModal
        visible={authModalVisible}
        context="home_banner"
        onClose={() => setAuthModalVisible(false)}
        onSignedIn={() => {
          setAuthModalVisible(false);
          setVisible(false);
        }}
      />
    </>
  );
}

export default memo(SaveProgressBanner);
