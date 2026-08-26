import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { KNOWLY_LEGAL_PRIVACY_URL } from './config';
import { hapticTap } from '../hooks/use-haptics';
import PRIVACY_POLICY_EN from './legal/privacy_policy_en.json';
import SectionSheetHeader from '../components/SectionSheetHeader';
import PRIVACY_POLICY_EN_IOS from './legal/privacy_policy_en_ios.json';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { safeRouterBack } from './navigation_back';
import BouncyScrollView from '../components/BouncyScrollView';

type PolicySection = { heading: string; body: string };

export default function PrivacyScreen() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const PRIVACY_EN = useMemo(
    () => (effectiveOs === 'ios' ? PRIVACY_POLICY_EN_IOS : PRIVACY_POLICY_EN) as PolicySection[],
    [effectiveOs],
  );
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  return (
    <ScreenGradient artBackdrop="settings">
      <SafeAreaView style={{ flex: 1 }}>
        {/* зачем: стандарт «шторки раздела» (референс владельца — Bevel):
            документ выезжает снизу как модал, шапка — центрированный заголовок
            + крестик; «открыть на сайте» — аксессуар рядом с крестиком. */}
        <SectionSheetHeader
          title="Privacy Policy"
          onClose={() => safeRouterBack(router, '/(tabs)/settings' as any)}
          accessory={(
            <TouchableOpacity
              onPress={() => {
                hapticTap();
                void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL);
              }}
              style={{ padding: 6 }}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Открыть политику на сайте Knowly',
                uk: 'Відкрити політику на сайті Knowly',
                es: 'Abrir la política en knowlyapps.com',
                'pt-BR': 'Abrir a política em knowlyapps.com',
                vi: 'Mở chính sách trên knowlyapps.com',
                id: 'Buka kebijakan di knowlyapps.com',
                tr: 'Politikayı knowlyapps.com üzerinde aç',
                pl: 'Otwórz politykę na knowlyapps.com',
              })}
            >
              <Ionicons name="open-outline" size={22} color={t.textSecond} />
            </TouchableOpacity>
          )}
        />
        <BouncyScrollView decelerationRate="fast" contentContainerStyle={{ padding: 20, paddingBottom: 60 }} scrollEventThrottle={16}>
          {PRIVACY_EN.map((s, i) => (
                <View key={i} style={{ marginBottom: 20 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 6 }}>
                    {s.heading}
                  </Text>
                  <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.6 }}>
                    {s.body}
                  </Text>
                </View>
              ))}
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
