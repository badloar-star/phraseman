import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Animated, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { KNOWLY_LEGAL_PRIVACY_URL } from './config';
import { hapticTap } from '../hooks/use-haptics';
import PRIVACY_POLICY_EN from './legal/privacy_policy_en.json';
import TapScale from '../components/TapScale';
import PRIVACY_POLICY_EN_IOS from './legal/privacy_policy_en_ios.json';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { safeRouterBack } from './navigation_back';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import BouncyScrollView from '../components/BouncyScrollView';

type PolicySection = { heading: string; body: string };

export default function PrivacyScreen() {
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
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
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 0.5, borderBottomColor: t.border,
        }}>
          <TapScale onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)} style={{ marginRight: 12, padding: 4 }}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TapScale>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            Privacy Policy
          </Text>
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
            <Ionicons name="open-outline" size={24} color={t.textSecond} />
          </TouchableOpacity>
        </View>
        <BouncyWrap>
          <Animated.View style={bouncyStyle}>
            <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ padding: 20, paddingBottom: 60 }} onScroll={onBouncyScroll} scrollEventThrottle={16}>
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
          </Animated.View>
        </BouncyWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
