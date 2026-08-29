import Ionicons from '@expo/vector-icons/Ionicons';
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
import SectionSheetHeader from '../components/SectionSheetHeader';
import TERMS_OF_USE_EN_IOS from './legal/terms_of_use_en_ios.json';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { safeRouterBack } from './navigation_back';
import BouncyScrollView from '../components/BouncyScrollView';

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
        {/* зачем: стандарт «шторки раздела» (референс владельца — Bevel):
            документ выезжает снизу как модал, шапка — центрированный заголовок
            + крестик; «открыть на сайте» — аксессуар рядом с крестиком. */}
        <SectionSheetHeader
          title={triLang(lang, { ru: 'Условия использования', uk: 'Умови використання', en: 'Terms of Use', es: 'Términos de uso', 'pt-BR': 'Termos de uso', vi: 'Điều khoản sử dụng', id: 'Ketentuan penggunaan', tr: 'Kullanım Koşulları', pl: 'Warunki korzystania' })}
          onClose={() => safeRouterBack(router, '/(tabs)/settings' as any)}
          accessory={(
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
              en: 'Open the terms on knowlyapps.com',
              es: 'Abrir los términos en knowlyapps.com',
              'pt-BR': 'Abrir os termos em knowlyapps.com',
              vi: 'Mở điều khoản trên knowlyapps.com',
              id: 'Buka ketentuan di knowlyapps.com',
              tr: 'Şartları knowlyapps.com üzerinde aç',
              pl: 'Otwórz warunki na knowlyapps.com',
            })}
          >
            <Ionicons name="open-outline" size={22} color={t.textSecond} />
          </TouchableOpacity>
          )}
        />
        <BouncyScrollView decelerationRate="fast" contentContainerStyle={{ padding: 20, paddingBottom: 60 }} scrollEventThrottle={16}>
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
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
