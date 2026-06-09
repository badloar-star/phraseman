import React from 'react';
import { Animated, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import BouncyScrollView from '../components/BouncyScrollView';
import TapScale from '../components/TapScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from '../components/SafeLinearGradient';
import CompassDepthSurface from '../components/CompassDepthSurface';
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
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { safeRouterBack } from './navigation_back';

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
  { mode: 'compass', labelRU: 'Компас', labelUK: 'Компас', labelES: 'Brújula', labelPtBr: 'Bússola', labelVi: 'La bàn', labelId: 'Kompas', labelTr: 'Pusula', labelPl: 'Kompas', bg: '#171719', accent: '#F2C48D', text: '#FFF8E8', preview2: '#FFE6B5', preview3: '#B4774E' },
  { mode: 'minimalDark', labelRU: 'Графит', labelUK: 'Графіт', labelES: 'Grafito', labelPtBr: 'Grafite', labelVi: 'Than chì', labelId: 'Grafit', labelTr: 'Grafit', labelPl: 'Grafit', bg: '#111827', accent: '#6EA8FF', text: '#F9FAFB', preview2: '#9CA3AF', preview3: '#1F2937' },
  { mode: 'minimalLight', labelRU: 'Скетч', labelUK: 'Скетч', labelES: 'Sketch', labelPtBr: 'Sketch', labelVi: 'Phác thảo', labelId: 'Sketsa', labelTr: 'Eskiz', labelPl: 'Szkic', bg: '#F3ECDC', accent: '#343842', text: '#171615', preview2: '#BCA98E', preview3: '#DED4C0' },
  { mode: 'dark', labelRU: 'Форест', labelUK: 'Форест', labelES: 'Forest', labelPtBr: 'Floresta', labelVi: 'Rừng', labelId: 'Hutan', labelTr: 'Orman', labelPl: 'Las', bg: '#152019', accent: '#47C870', text: '#F0F7F2', preview2: '#47C870', preview3: '#253630', premiumOnly: true },
  { mode: 'neon', labelRU: 'Неон', labelUK: 'Неон', labelES: 'Neón', labelPtBr: 'Neon', labelVi: 'Neon', labelId: 'Neon', labelTr: 'Neon', labelPl: 'Neon', bg: '#202020', accent: '#C8FF00', text: '#F0F0F0', preview2: '#C8FF00', preview3: '#343434', premiumOnly: true },
  { mode: 'coral', labelRU: 'Корал', labelUK: 'Корал', labelES: 'Coral', labelPtBr: 'Coral', labelVi: 'San hô', labelId: 'Koral', labelTr: 'Mercan', labelPl: 'Koral', bg: '#1C1113', accent: '#FF6464', text: '#FFFFFF', preview2: '#FF6464', preview3: '#3A2A2E', premiumOnly: true },
  { mode: 'gold', labelRU: 'Золото', labelUK: 'Золото', labelES: 'Oro', labelPtBr: 'Ouro', labelVi: 'Vàng', labelId: 'Emas', labelTr: 'Altın', labelPl: 'Złoto', bg: '#050504', accent: '#D7AD56', text: '#FFF7E6', preview2: '#F1CC72', preview3: '#18140D', rewardOnly: true },
];

function themeSwatches(item: ThemeOption): [string, string, string] {
  switch (item.mode) {
    case 'minimalDark':
      return ['#A8CBFF', item.accent, '#2F5C9B'];
    case 'compass':
      return [COMPASS_RICH.cream, COMPASS_RICH.champagne, COMPASS_RICH.copperDark];
    case 'minimalLight':
      return ['#FFFDF6', item.bg, item.preview3];
    case 'dark':
      return ['#8AB49A', item.accent, '#1E6B3A'];
    case 'neon':
      return ['#E5FF66', item.accent, '#6C8A00'];
    case 'coral':
      return ['#FF9A9A', item.accent, '#8A2E3D'];
    case 'gold':
      return ['#F6E3A1', item.accent, '#6E4B14'];
    default:
      return [item.accent, item.preview2, item.preview3];
  }
}

function rgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function themeRowColors(item: ThemeOption, active: boolean) {
  const swatches = themeSwatches(item);
  const cardText = '#F5F5F5';
  const accentWash = rgba(item.accent, active ? 0.14 : 0.06);
  const topGlow = 'rgba(255,255,255,0.12)';
  const borderColor = active ? item.accent : rgba(item.accent, 0.30);

  if (item.mode === 'minimalLight') {
    return {
      gradient: ['#3A3D43', '#282B31', '#1A1C21'] as const,
      shine: [topGlow, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)'] as const,
      borderColor,
      textColor: cardText,
      mutedColor: rgba(cardText, 0.56),
      activeIconColor: item.accent,
      shadowColor: '#101114',
      swatches,
    };
  }

  return {
    gradient: ['#3A3D43', '#282B31', '#1A1C21'] as const,
    shine: [topGlow, accentWash, 'rgba(255,255,255,0)'] as const,
    borderColor,
    textColor: cardText,
    mutedColor: rgba(cardText, 0.56),
    activeIconColor: item.accent,
    shadowColor: '#101114',
    swatches,
  };
}

export default function SettingsThemes() {
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const router = useRouter();
  const { theme: t, themeMode, setThemeMode, isGoldThemeUnlocked } = useTheme();
  const { lang } = useLang();
  const { hasPremiumAccess: isPremium } = usePremium();
  const isCompassTheme = themeMode === 'compass';
  const themeRowRadius = 10;
  const themeRowHeight = 58;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TapScale
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)}
              style={{
                width: 38,
                height: 38,
                borderRadius: isCompassTheme ? 8 : 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : 'transparent',
                borderWidth: isCompassTheme ? 0.5 : 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent',
                overflow: 'hidden',
                ...(isCompassTheme ? compassShadow(1) : {}),
              }}
            >
              {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TapScale>
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
              style={{
                width: 38,
                height: 38,
                borderRadius: isCompassTheme ? 8 : 19,
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderWidth: 0.5,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                ...(isCompassTheme ? compassShadow(1) : {}),
              }}
            />
          </View>

          <BouncyWrap>
            <Animated.View style={bouncyStyle}>
          <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 }} onScroll={onBouncyScroll} scrollEventThrottle={16}>
            {THEME_OPTIONS.filter(item => !item.rewardOnly || DEV_THEME_UNLOCKS || (item.mode === 'gold' && isGoldThemeUnlocked)).map((item) => {
              const active = themeMode === item.mode;
              const locked = !!item.premiumOnly && !isPremium && !DEV_THEME_UNLOCKS;
              const row = themeRowColors(item, active);
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
                      borderRadius: themeRowRadius,
                      height: themeRowHeight,
                      marginBottom: 8,
                      overflow: 'hidden',
                      ...compassShadow(active ? 2 : 1),
                      shadowColor: row.shadowColor,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={row.gradient as any}
                    locations={[0, 0.58, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 0,
                      height: themeRowHeight,
                      backgroundColor: '#282B31',
                      borderRadius: themeRowRadius,
                      borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                      borderColor: row.borderColor,
                      overflow: 'hidden',
                    }}
                  >
                    <LinearGradient
                      pointerEvents="none"
                      colors={row.shine as any}
                      locations={[0, 0.36, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[StyleSheet.absoluteFillObject, { borderRadius: themeRowRadius }]}
                    />
                    <Text style={{ color: row.textColor, fontSize: 15, fontWeight: active ? '900' : '800' }} numberOfLines={1}>
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
                      {row.swatches.map((color, idx) => (
                        <View
                          key={`${item.mode}-${idx}`}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            backgroundColor: color,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: active ? row.textColor : rgba(item.text, 0.24),
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
                      <Ionicons name="lock-closed" size={14} color={row.mutedColor} style={{ opacity: 0.8 }} />
                    ) : active ? (
                      <Ionicons name="checkmark-circle" size={18} color={row.activeIconColor} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={row.mutedColor} style={{ opacity: 0.72 }} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </BouncyScrollView>
            </Animated.View>
          </BouncyWrap>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
