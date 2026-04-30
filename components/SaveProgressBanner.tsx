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
//   • При тапе "Войти" — открывает RegistrationPromptModal (context='home_banner').
//   • При тапе "×" — ставит timestamp дисмисса; через 7 дней снова появится.
//   • После успешного логина (event 'auth_provider_linked') — мгновенно скрывается.
// ════════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CLOUD_SYNC_ENABLED } from '../app/config';
import { getLinkedAuthInfo } from '../app/auth_provider';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
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

export default function SaveProgressBanner() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [visible, setVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);

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

  return (
    <>
      <PremiumCard
        level={1}
        innerStyle={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: t.correct + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="cloud-upload-outline" size={22} color={t.correct} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: t.textPrimary,
              fontSize: f.body,
              fontWeight: '700',
              marginBottom: 2,
            }}
            numberOfLines={1}
          >
            {triLang(lang, {
              ru: 'Сохрани свой прогресс',
              uk: 'Збережи свій прогрес',
              es: 'Guarda tu progreso',
            })}
          </Text>
          <Text
            style={{ color: t.textMuted, fontSize: f.caption, lineHeight: 16 }}
            numberOfLines={2}
          >
            {triLang(lang, {
              ru: 'Войди через Google или Apple — и прогресс не потеряется при смене телефона или переустановке.',
              uk: 'Увійди через Google або Apple — і прогрес не загубиться при зміні телефону чи перевстановленні.',
              es: 'Entra con Google o Apple para no perder tu progreso al cambiar de móvil o reinstalar.',
            })}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSignInPress}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: t.correct,
          }}
        >
          <Text style={{ color: '#fff', fontSize: f.sub, fontWeight: '800' }}>
            {triLang(lang, { ru: 'Войти', uk: 'Увійти', es: 'Entrar' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginLeft: -4, padding: 4 }}
        >
          <Ionicons name="close" size={18} color={t.textMuted} />
        </TouchableOpacity>
      </PremiumCard>

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
