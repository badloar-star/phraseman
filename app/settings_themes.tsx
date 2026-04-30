import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { DEV_MODE } from './config';
import { triLang } from '../constants/i18n';

type ThemeOption = {
  mode: 'dark' | 'neon' | 'gold' | 'ocean' | 'sakura' | 'minimalLight' | 'minimalDark';
  labelRU: string;
  labelUK: string;
  labelES: string;
  bg: string;
  accent: string;
  text: string;
  preview2: string;
  preview3: string;
  premiumOnly?: boolean;
};

const THEME_OPTIONS: ThemeOption[] = [
  { mode: 'minimalDark', labelRU: 'Графит', labelUK: 'Графіт', labelES: 'Grafito', bg: '#111827', accent: '#9CA3AF', text: '#F9FAFB', preview2: '#4B5563', preview3: '#1F2937' },
  { mode: 'minimalLight', labelRU: 'Скетч', labelUK: 'Скетч', labelES: 'Sketch', bg: '#F4F1E8', accent: '#3F3F46', text: '#191919', preview2: '#D7D1C2', preview3: '#ECE7DB' },
  { mode: 'dark', labelRU: 'Форест', labelUK: 'Форест', labelES: 'Forest', bg: '#152019', accent: '#47C870', text: '#F0F7F2', preview2: '#47C870', preview3: '#253630', premiumOnly: true },
  { mode: 'neon', labelRU: 'Неон', labelUK: 'Неон', labelES: 'Neón', bg: '#202020', accent: '#C8FF00', text: '#F0F0F0', preview2: '#C8FF00', preview3: '#343434', premiumOnly: true },
  { mode: 'gold', labelRU: 'Корал', labelUK: 'Корал', labelES: 'Coral', bg: '#14142A', accent: '#FF6464', text: '#FFFFFF', preview2: '#FF6464', preview3: '#25254A', premiumOnly: true },
  { mode: 'ocean', labelRU: 'Океан', labelUK: 'Океан', labelES: 'Océano', bg: '#B8DEFF', accent: '#0076C0', text: '#0A2540', preview2: '#00A878', preview3: '#D4EDFF', premiumOnly: true },
  { mode: 'sakura', labelRU: 'Сакура', labelUK: 'Сакура', labelES: 'Sakura', bg: '#FFB8D5', accent: '#C0006A', text: '#2D0A1A', preview2: '#C0006A', preview3: '#FFD8EA', premiumOnly: true },
];

export default function SettingsThemes() {
  const router = useRouter();
  const { theme: t, themeMode, setThemeMode } = useTheme();
  const { lang } = useLang();
  const { isPremium } = usePremium();

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TouchableOpacity onPress={() => {
              hapticTap();
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)/home' as any);
            }}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginLeft: 8 }}>
              {triLang(lang, { ru: 'Темы', uk: 'Теми', es: 'Temas' })}
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 }}>
            {THEME_OPTIONS.map((item) => {
              const active = themeMode === item.mode;
              const locked = !!item.premiumOnly && !isPremium && !DEV_MODE;
              return (
                <TouchableOpacity
                  key={item.mode}
                  activeOpacity={0.85}
                  onPress={() => {
                    hapticTap();
                    if (locked) {
                      router.push({ pathname: '/premium_modal', params: { context: 'theme' } } as any);
                      return;
                    }
                    setThemeMode(item.mode);
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
                    {triLang(lang, { ru: item.labelRU, uk: item.labelUK, es: item.labelES })}
                  </Text>

                  {locked ? (
                    <Ionicons name="lock-closed" size={14} color={t.textMuted} style={{ opacity: 0.8 }} />
                  ) : active ? (
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
