import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import ReportErrorButton from '../components/ReportErrorButton';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { DEV_MODE, ENABLE_DEV_TOOLS } from './config';
import { triLang } from '../constants/i18n';
import type { ThemeMode } from '../constants/theme';

type ThemeOption = {
  mode: ThemeMode;
  labelRU: string;
  labelUK: string;
  labelES: string;
  labelPtBr: string;
  labelVi: string;
  labelId: string;
  labelTr: string;
  labelPl: string;
  bg: string;
  accent: string;
  text: string;
  preview2: string;
  preview3: string;
  premiumOnly?: boolean;
  rewardOnly?: boolean;
};

const DEV_THEME_UNLOCKS = DEV_MODE || ENABLE_DEV_TOOLS;

const THEME_OPTIONS: ThemeOption[] = [
  { mode: 'minimalDark', labelRU: 'Графит', labelUK: 'Графіт', labelES: 'Grafito', labelPtBr: 'Grafite', labelVi: 'Than chì', labelId: 'Grafit', labelTr: 'Grafit', labelPl: 'Grafit', bg: '#111827', accent: '#9CA3AF', text: '#F9FAFB', preview2: '#4B5563', preview3: '#1F2937' },
  { mode: 'minimalLight', labelRU: 'Скетч', labelUK: 'Скетч', labelES: 'Sketch', labelPtBr: 'Sketch', labelVi: 'Phác thảo', labelId: 'Sketsa', labelTr: 'Eskiz', labelPl: 'Szkic', bg: '#F3ECDC', accent: '#343842', text: '#171615', preview2: '#BCA98E', preview3: '#DED4C0' },
  { mode: 'dark', labelRU: 'Форест', labelUK: 'Форест', labelES: 'Forest', labelPtBr: 'Floresta', labelVi: 'Rừng', labelId: 'Hutan', labelTr: 'Orman', labelPl: 'Las', bg: '#152019', accent: '#47C870', text: '#F0F7F2', preview2: '#47C870', preview3: '#253630', premiumOnly: true },
  { mode: 'neon', labelRU: 'Неон', labelUK: 'Неон', labelES: 'Neón', labelPtBr: 'Neon', labelVi: 'Neon', labelId: 'Neon', labelTr: 'Neon', labelPl: 'Neon', bg: '#202020', accent: '#C8FF00', text: '#F0F0F0', preview2: '#C8FF00', preview3: '#343434', premiumOnly: true },
  { mode: 'coral', labelRU: 'Корал', labelUK: 'Корал', labelES: 'Coral', labelPtBr: 'Coral', labelVi: 'San hô', labelId: 'Koral', labelTr: 'Mercan', labelPl: 'Koral', bg: '#1C1113', accent: '#FF6464', text: '#FFFFFF', preview2: '#FF6464', preview3: '#3A2A2E', premiumOnly: true },
  { mode: 'gold', labelRU: 'Золото', labelUK: 'Золото', labelES: 'Oro', labelPtBr: 'Ouro', labelVi: 'Vàng', labelId: 'Emas', labelTr: 'Altın', labelPl: 'Złoto', bg: '#050504', accent: '#D7AD56', text: '#FFF7E6', preview2: '#F1CC72', preview3: '#18140D', rewardOnly: true },
];

function themeSwatches(item: ThemeOption): [string, string, string] {
  if (item.mode === 'gold') return ['#030303', '#171717', '#D6B35A'];
  return [item.bg, item.preview3, item.preview2];
}

export default function SettingsThemes() {
  const router = useRouter();
  const { theme: t, themeMode, setThemeMode, isGoldThemeUnlocked } = useTheme();
  const { lang } = useLang();
  const { hasPremiumAccess: isPremium } = usePremium();

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
              {triLang(lang, {
                ru: 'Темы',
                uk: 'Теми',
                es: 'Temas',
                'pt-BR': 'Temas',
                vi: 'Chủ đề',
                id: 'Tema',
                tr: 'Temalar',
                pl: 'Motywy',
              })}
            </Text>
            <View style={{ flex: 1 }} />
            <ReportErrorButton
              screen="settings_themes"
              dataId="settings_themes"
              dataText={triLang(lang, {
                ru: 'Экран выбора темы',
                uk: 'Екран вибору теми',
                es: 'Pantalla de selección de tema',
                'pt-BR': 'Tela de seleção de tema',
                vi: 'Màn hình chọn chủ đề',
                id: 'Layar pemilihan tema',
                tr: 'Tema seçme ekranı',
                pl: 'Ekran wyboru motywu',
              })}
              variant="icon-flag"
              accessibilityLabel="Сообщить о баге на экране темы"
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border }}
            />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 }}>
            {THEME_OPTIONS.filter(item => !item.rewardOnly || DEV_THEME_UNLOCKS || (item.mode === 'gold' && isGoldThemeUnlocked)).map((item) => {
              const active = themeMode === item.mode;
              const locked = !!item.premiumOnly && !isPremium && !DEV_THEME_UNLOCKS;
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
                    void (async () => {
                      const { checkAchievements } = await import('./achievements');
                      void checkAchievements({ type: 'profile_theme_set' });
                    })();
                  }}
                  style={[
                    {
                      borderRadius: 14,
                      marginBottom: 10,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      backgroundColor: t.bgCard,
                      borderRadius: 14,
                      borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                      borderColor: active ? t.accent : t.border,
                      overflow: 'hidden',
                    }}
                  >
                    <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: active ? '900' : '700' }} numberOfLines={1}>
                      {triLang(lang, {
                        ru: item.labelRU,
                        uk: item.labelUK,
                        es: item.labelES,
                        'pt-BR': item.labelPtBr,
                        vi: item.labelVi,
                        id: item.labelId,
                        tr: item.labelTr,
                        pl: item.labelPl,
                      })}
                    </Text>
                    <View
                      pointerEvents="none"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 }}
                    >
                      {themeSwatches(item).map((color, idx) => (
                        <View
                          key={`${item.mode}-${idx}`}
                          style={{
                            width: 15,
                            height: 15,
                            borderRadius: 8,
                            backgroundColor: color,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: active && idx === 2 ? t.textPrimary : 'rgba(255,255,255,0.20)',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0,
                            shadowRadius: 2,
                            elevation: 0,
                          }}
                        />
                      ))}
                    </View>
                    <View style={{ flex: 1 }} />

                    {locked ? (
                      <Ionicons name="lock-closed" size={14} color={t.textMuted} style={{ opacity: 0.8 }} />
                    ) : active ? (
                      <Ionicons name="checkmark-circle" size={18} color={t.accent} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={t.textMuted} style={{ opacity: 0.7 }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
