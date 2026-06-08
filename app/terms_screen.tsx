import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { KNOWLY_LEGAL_TERMS_URL } from './config';
import { hapticTap } from '../hooks/use-haptics';
import TERMS_OF_USE_EN from './legal/terms_of_use_en.json';
import TapScale from '../components/TapScale';
import TERMS_OF_USE_EN_IOS from './legal/terms_of_use_en_ios.json';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { safeRouterBack } from './navigation_back';

type PolicySection = { heading: string; body: string };

export default function TermsScreen() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const TERMS_EN = useMemo(
    () => (effectiveOs === 'ios' ? TERMS_OF_USE_EN_IOS : TERMS_OF_USE_EN) as PolicySection[],
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
            Terms of Use
          </Text>
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              void Linking.openURL(KNOWLY_LEGAL_TERMS_URL);
            }}
            style={{ padding: 6 }}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Открыть условия на сайте Knowly',
              uk: 'Відкрити умови на сайті Knowly',
              es: 'Abrir los términos en knowlyapps.com',
              'pt-BR': 'Abrir os termos em knowlyapps.com',
              vi: 'Mở điều khoản trên knowlyapps.com',
              id: 'Buka ketentuan di knowlyapps.com',
              tr: 'Şartları knowlyapps.com üzerinde aç',
              pl: 'Otwórz warunki na knowlyapps.com',
            })}
          >
            <Ionicons name="open-outline" size={24} color={t.textSecond} />
          </TouchableOpacity>
        </View>
        <ScrollView decelerationRate="normal" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {TERMS_EN.map((s, i) => (
            <View key={i} style={{ marginBottom: 20 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 6 }}>
                {s.heading}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.6 }}>
                {s.body}
              </Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
