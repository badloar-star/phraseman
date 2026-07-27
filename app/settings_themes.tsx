import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from '../components/SafeLinearGradient';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SectionSheetHeader from '../components/SectionSheetHeader';
import PlusBadge from '../components/PlusBadge';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useFeatureAccess } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { ENABLE_DEV_TOOLS } from './config';
import { triLang } from '../constants/i18n';
import type { ThemeMode } from '../constants/theme';
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

// ENABLE_DEV_TOOLS уже гасится `!IS_STORE_RELEASE` — в стор-сборке премиум/наградные
// темы остаются закрытыми. Голый DEV_MODE здесь был багом (открывал темы бесплатно в проде).
const DEV_THEME_UNLOCKS = ENABLE_DEV_TOOLS;

const THEME_OPTIONS: ThemeOption[] = [
  // зачем: «Горизонт» — бесплатная тема-витрина (2026-07-27); «Полночь» ушла в
  // премиум, но у «дедушек» (жили на ней бесплатно) остаётся открытой.
  { mode: 'horizon', labelRU: 'Горизонт', labelUK: 'Горизонт', labelES: 'Horizonte', labelPtBr: 'Horizonte', labelVi: 'Chân trời', labelId: 'Cakrawala', labelTr: 'Ufuk', labelPl: 'Horyzont', bg: '#010102', accent: '#FFAD7A', text: '#FFFFFF', preview2: '#FF9E6B', preview3: '#FF5E8A' },
  { mode: 'midnight', labelRU: 'Полночь', labelUK: 'Північ', labelES: 'Medianoche', labelPtBr: 'Meia-noite', labelVi: 'Nửa đêm', labelId: 'Tengah malam', labelTr: 'Gece yarısı', labelPl: 'Północ', bg: '#010102', accent: '#8FA0FF', text: '#FFFFFF', preview2: '#5B7CFF', preview3: '#A95BFF', premiumOnly: true },
  { mode: 'ember', labelRU: 'Янтарь', labelUK: 'Бурштин', labelES: 'Ámbar', labelPtBr: 'Âmbar', labelVi: 'Hổ phách', labelId: 'Amber', labelTr: 'Kehribar', labelPl: 'Bursztyn', bg: '#010101', accent: '#FFA245', text: '#FFFFFF', preview2: '#FF8A2A', preview3: '#FF3D6E', premiumOnly: true },
  { mode: 'aurora', labelRU: 'Сияние', labelUK: 'Сяйво', labelES: 'Aurora', labelPtBr: 'Aurora', labelVi: 'Cực quang', labelId: 'Aurora', labelTr: 'Aurora', labelPl: 'Zorza', bg: '#010201', accent: '#3DE8A6', text: '#FFFFFF', preview2: '#2EE6A0', preview3: '#2E9DFF', premiumOnly: true },
  { mode: 'volt', labelRU: 'Лайм', labelUK: 'Лайм', labelES: 'Lima', labelPtBr: 'Lima', labelVi: 'Chanh', labelId: 'Lime', labelTr: 'Limon', labelPl: 'Limetka', bg: '#010200', accent: '#C6FF34', text: '#FFFFFF', preview2: '#A8E81E', preview3: '#2EE08C', premiumOnly: true },
  { mode: 'minimalDark', labelRU: 'Оникс', labelUK: 'Онікс', labelES: 'Ónix', labelPtBr: 'Ônix', labelVi: 'Mã não', labelId: 'Onyx', labelTr: 'Oniks', labelPl: 'Onyks', bg: '#0B0B0C', accent: '#6EA8FF', text: '#F9FAFB', preview2: '#9CA3AF', preview3: '#171717', premiumOnly: true },
  { mode: 'candyBlue', labelRU: 'Кенди Блу', labelUK: 'Кенді Блу', labelES: 'Azul caramelo', labelPtBr: 'Azul candy', labelVi: 'Xanh kẹo', labelId: 'Biru permen', labelTr: 'Şeker mavisi', labelPl: 'Cukrowy błękit', bg: '#0B161B', accent: '#B2D5E5', text: '#EAF4F8', preview2: '#7FA0AD', preview3: '#1C323B', premiumOnly: true },
  { mode: 'indigo', labelRU: 'Индиго', labelUK: 'Індиго', labelES: 'Índigo', labelPtBr: 'Índigo', labelVi: 'Chàm', labelId: 'Indigo', labelTr: 'İndigo', labelPl: 'Indygo', bg: '#14131F', accent: '#C8C3FF', text: '#F1EFFF', preview2: '#273468', preview3: '#2A2952', premiumOnly: true },
  { mode: 'dark', labelRU: 'Форест', labelUK: 'Форест', labelES: 'Forest', labelPtBr: 'Floresta', labelVi: 'Rừng', labelId: 'Hutan', labelTr: 'Orman', labelPl: 'Las', bg: '#152019', accent: '#47C870', text: '#F0F7F2', preview2: '#47C870', preview3: '#253630', premiumOnly: true },
  { mode: 'coral', labelRU: 'Корал', labelUK: 'Корал', labelES: 'Coral', labelPtBr: 'Coral', labelVi: 'San hô', labelId: 'Koral', labelTr: 'Mercan', labelPl: 'Koral', bg: '#1C1113', accent: '#FF7F50', text: '#FFFFFF', preview2: '#FF7F50', preview3: '#3A2A2E', premiumOnly: true },
  { mode: 'gold', labelRU: 'Золото', labelUK: 'Золото', labelES: 'Oro', labelPtBr: 'Ouro', labelVi: 'Vàng', labelId: 'Emas', labelTr: 'Altın', labelPl: 'Złoto', bg: '#050504', accent: '#D7AD56', text: '#FFF7E6', preview2: '#F1CC72', preview3: '#18140D', rewardOnly: true },
];

function themeSwatches(item: ThemeOption): [string, string, string] {
  switch (item.mode) {
    case 'minimalDark':
      return ['#A8CBFF', item.accent, '#2F5C9B'];
    case 'candyBlue':
      return ['#D9EDF5', item.accent, '#3A5A68'];
    case 'indigo':
      return ['#E4E1FF', item.accent, '#273468'];
    case 'horizon':
      return ['#FFD4B0', item.accent, '#FF5E8A'];
    case 'midnight':
    case 'ember':
    case 'aurora':
    case 'volt':
      return [item.preview2, item.accent, item.preview3];
    case 'dark':
      return ['#8AB49A', item.accent, '#1E6B3A'];
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

  if (false) {
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
  const router = useRouter();
  const { theme: t, themeMode, setThemeMode, isGoldThemeUnlocked, isMidnightGrandfathered } = useTheme();
  const { lang } = useLang();
  // «Пульт»: замок премиум-тем снимается, когда фича переведена в «Фри».
  const isPremium = useFeatureAccess('themes');
  const themeRowRadius = 10;
  const themeRowHeight = 58;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* зачем: стандарт «шторки раздела» — модал с выездом снизу, шапка
              с центрированным заголовком и крестиком вместо стрелки «назад». */}
          <SectionSheetHeader
            title={triLang(lang, {
              ru: 'Темы',
              uk: 'Теми',
              es: 'Temas',
              'pt-BR': 'Temas',
              vi: 'Chủ đề',
              id: 'Tema',
              tr: 'Temalar',
              pl: 'Motywy',
            })}
            onClose={() => safeRouterBack(router, '/(tabs)/settings' as any)}
          />

          <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 }} scrollEventThrottle={16}>
            {THEME_OPTIONS.filter(item => !item.rewardOnly || DEV_THEME_UNLOCKS || (item.mode === 'gold' && isGoldThemeUnlocked)).map((item) => {
              const active = themeMode === item.mode;
              const grandfathered = item.mode === 'midnight' && isMidnightGrandfathered;
              const locked = !!item.premiumOnly && !isPremium && !DEV_THEME_UNLOCKS && !grandfathered;
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
                      borderWidth: 0,
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
                            borderWidth: 0,
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
                      <PlusBadge themeMode={themeMode} size="xs" />
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
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
