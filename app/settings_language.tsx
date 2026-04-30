import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { ENABLE_SPANISH_LOCALE } from './config';
import type { Lang } from '../constants/i18n';

const LANG_OPTIONS: { code: Lang; native: string }[] = [
  { code: 'ru', native: 'Русский' },
  { code: 'uk', native: 'Українська' },
  { code: 'es', native: 'Español' },
];

export default function SettingsLanguage() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang, setLang, s } = useLang();

  const visible = LANG_OPTIONS.filter((o) => o.code !== 'es' || ENABLE_SPANISH_LOCALE);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TouchableOpacity
              onPress={() => {
                hapticTap();
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/settings' as any);
              }}
            >
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginLeft: 8 }}>
              {s.settings.lang}
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 }}>
            {visible.map((item) => {
              const active = lang === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  activeOpacity={0.85}
                  onPress={() => {
                    hapticTap();
                    void setLang(item.code);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    borderRadius: 14,
                    borderWidth: active ? 2 : 0.5,
                    borderColor: active ? t.accent : t.border,
                    backgroundColor: t.bgCard,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ flex: 1, color: t.textPrimary, fontSize: 15, fontWeight: active ? '800' : '600' }}>
                    {item.native}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={18} color={t.accent} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={t.textMuted} style={{ opacity: 0.7 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
