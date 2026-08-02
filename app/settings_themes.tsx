import React, { memo, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import BouncyScrollView from '../components/BouncyScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from '../components/SafeLinearGradient';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SectionSheetHeader from '../components/SectionSheetHeader';
import { useTheme, getVolumetricShadow } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useFeatureAccess } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { ENABLE_DEV_TOOLS } from './config';
import { triLang, type Lang } from '../constants/i18n';
import {
  type Theme,
  isLightThemeMode,
  INDIGO,
  SAGE_PORCELAIN,
  MIDNIGHT,
  EMBER,
  AURORA,
  VOLT,
  DARK,
  CORAL,
  GOLD,
} from '../constants/theme';
import { GOLD_GRADIENTS, GOLD_RICH } from '../constants/goldTheme';
import { safeRouterBack } from './navigation_back';

// зачем: «Примерочная» (решение владельца 2026-08-02) — каждая плашка рисуется
// НАСТОЯЩИМИ токенами своей темы (никаких ручных дублей цветов: они уже
// разъезжались с палитрами), тап примеряет тему на весь экран через
// previewThemeMode, применение/пейволл — кнопкой внизу.

type ThemeOption = {
  mode: PickerThemeMode;
  labelRU: string;
  labelUK: string;
  labelES: string;
  labelPtBr: string;
  labelVi: string;
  labelId: string;
  labelTr: string;
  labelPl: string;
  premiumOnly?: boolean;
  rewardOnly?: boolean;
};

// ENABLE_DEV_TOOLS уже гасится `!IS_STORE_RELEASE` — в стор-сборке премиум/наградные
// темы остаются закрытыми. Голый DEV_MODE здесь был багом (открывал темы бесплатно в проде).
const DEV_THEME_UNLOCKS = ENABLE_DEV_TOOLS;

const THEME_OPTIONS: ThemeOption[] = [
  // зачем: «Индиго» и «Нефрит» — фри-витрина (выбор владельца); «Полночь» в премиуме,
  // но у «дедушек» (жили на ней бесплатно) остаётся открытой.
  { mode: 'indigo', labelRU: 'Индиго', labelUK: 'Індиго', labelES: 'Índigo', labelPtBr: 'Índigo', labelVi: 'Chàm', labelId: 'Indigo', labelTr: 'İndigo', labelPl: 'Indygo' },
  { mode: 'sagePorcelain', labelRU: 'Нефрит', labelUK: 'Нефрит', labelES: 'Jade', labelPtBr: 'Jade', labelVi: 'Ngọc bích', labelId: 'Giok', labelTr: 'Yeşim', labelPl: 'Jadeit' },
  { mode: 'midnight', labelRU: 'Полночь', labelUK: 'Північ', labelES: 'Medianoche', labelPtBr: 'Meia-noite', labelVi: 'Nửa đêm', labelId: 'Tengah malam', labelTr: 'Gece yarısı', labelPl: 'Północ', premiumOnly: true },
  { mode: 'ember', labelRU: 'Янтарь', labelUK: 'Бурштин', labelES: 'Ámbar', labelPtBr: 'Âmbar', labelVi: 'Hổ phách', labelId: 'Amber', labelTr: 'Kehribar', labelPl: 'Bursztyn', premiumOnly: true },
  { mode: 'aurora', labelRU: 'Сияние', labelUK: 'Сяйво', labelES: 'Aurora', labelPtBr: 'Aurora', labelVi: 'Cực quang', labelId: 'Aurora', labelTr: 'Aurora', labelPl: 'Zorza', premiumOnly: true },
  { mode: 'volt', labelRU: 'Лайм', labelUK: 'Лайм', labelES: 'Lima', labelPtBr: 'Lima', labelVi: 'Chanh', labelId: 'Lime', labelTr: 'Limon', labelPl: 'Limetka', premiumOnly: true },
  { mode: 'dark', labelRU: 'Форест', labelUK: 'Форест', labelES: 'Forest', labelPtBr: 'Floresta', labelVi: 'Rừng', labelId: 'Hutan', labelTr: 'Orman', labelPl: 'Las', premiumOnly: true },
  { mode: 'coral', labelRU: 'Корал', labelUK: 'Корал', labelES: 'Coral', labelPtBr: 'Coral', labelVi: 'San hô', labelId: 'Koral', labelTr: 'Mercan', labelPl: 'Koral', premiumOnly: true },
  { mode: 'gold', labelRU: 'Золото', labelUK: 'Золото', labelES: 'Oro', labelPtBr: 'Ouro', labelVi: 'Vàng', labelId: 'Emas', labelTr: 'Altın', labelPl: 'Złoto', rewardOnly: true },
];

// Единственный источник цветов плашек — реальные палитры тем.
const PALETTES = {
  indigo: INDIGO,
  sagePorcelain: SAGE_PORCELAIN,
  midnight: MIDNIGHT,
  ember: EMBER,
  aurora: AURORA,
  volt: VOLT,
  dark: DARK,
  coral: CORAL,
  gold: GOLD,
} as const;

type PickerThemeMode = keyof typeof PALETTES;

// зачем: иконки тем сгенерированы через OpenAI по решению владельца (2026-08-02),
// лежат бандл-ассетами — ноль сети и генераций в рантайме.
const THEME_ICONS: Record<PickerThemeMode, number> = {
  indigo: require('../assets/theme-icons/indigo.png'),
  sagePorcelain: require('../assets/theme-icons/sagePorcelain.png'),
  midnight: require('../assets/theme-icons/midnight.png'),
  ember: require('../assets/theme-icons/ember.png'),
  aurora: require('../assets/theme-icons/aurora.png'),
  volt: require('../assets/theme-icons/volt.png'),
  dark: require('../assets/theme-icons/dark.png'),
  coral: require('../assets/theme-icons/coral.png'),
  gold: require('../assets/theme-icons/gold.png'),
};

// Мини-прогресс в плашке — живая деталь «приложения в миниатюре»; проценты
// разные, чтобы список не выглядел штампованным.
const PREVIEW_PROGRESS: Record<PickerThemeMode, number> = {
  indigo: 62,
  sagePorcelain: 48,
  midnight: 70,
  ember: 55,
  aurora: 64,
  volt: 40,
  dark: 58,
  coral: 66,
  gold: 52,
};

type ChipKind = 'free' | 'plus' | 'award';

function chipLabel(kind: ChipKind, lang: Lang): string {
  if (kind === 'plus') return 'Plus';
  if (kind === 'award') {
    return triLang(lang, { ru: 'Награда', uk: 'Нагорода', es: 'Premio', 'pt-BR': 'Prêmio', vi: 'Phần thưởng', id: 'Hadiah', tr: 'Ödül', pl: 'Nagroda' });
  }
  return triLang(lang, { ru: 'Фри', uk: 'Фрі', es: 'Gratis', 'pt-BR': 'Grátis', vi: 'Miễn phí', id: 'Gratis', tr: 'Ücretsiz', pl: 'Za darmo' });
}

type ThemeRowProps = {
  option: ThemeOption;
  label: string;
  chipText: string;
  applied: boolean;
  candidate: boolean;
  onPress: (mode: PickerThemeMode) => void;
};

const ThemeRow = memo(function ThemeRow({ option, label, chipText, applied, candidate, onPress }: ThemeRowProps) {
  const palette: Theme = PALETTES[option.mode];
  const light = isLightThemeMode(option.mode);
  const shadow = getVolumetricShadow(option.mode, palette, candidate ? 3 : 2);
  return (
    <TouchableOpacity
      testID={`theme-row-${option.mode}`}
      activeOpacity={0.88}
      onPress={() => onPress(option.mode)}
      accessibilityRole="button"
      accessibilityState={{ selected: applied }}
      accessibilityLabel={label}
      style={[
        styles.row,
        shadow,
        // зачем: выделение примеряемой темы — подъёмом и тенью, НЕ обводкой (запрет владельца).
        candidate ? styles.rowCandidate : null,
      ]}
    >
      <LinearGradient
        colors={palette.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.rowInner}
      >
        <Image source={THEME_ICONS[option.mode]} style={styles.icon} contentFit="contain" accessible={false} />
        <View style={styles.rowMid}>
          <Text numberOfLines={1} style={[styles.name, { color: palette.textPrimary }]}>{label}</Text>
          <View style={styles.miniRow}>
            <View
              style={[
                styles.track,
                { backgroundColor: light ? palette.bgSurface : 'rgba(255,255,255,0.07)' },
              ]}
            >
              <View style={[styles.fill, { width: `${PREVIEW_PROGRESS[option.mode]}%`, backgroundColor: palette.accent }]} />
            </View>
            <View style={[styles.chip, { backgroundColor: palette.accent }]}>
              <Text numberOfLines={1} style={[styles.chipText, { color: palette.correctText }]}>{chipText}</Text>
            </View>
          </View>
        </View>
        <View style={styles.rowEnd}>
          {applied ? <Ionicons name="checkmark-circle" size={22} color={palette.accent} /> : null}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

export default function SettingsThemes() {
  const router = useRouter();
  const {
    appliedThemeMode,
    previewThemeMode,
    setPreviewThemeMode,
    setThemeMode,
    isGoldThemeUnlocked,
    isMidnightGrandfathered,
  } = useTheme();
  const { lang } = useLang();
  // «Пульт»: замок премиум-тем снимается, когда фича переведена в «Фри».
  const isPremium = useFeatureAccess('themes');

  // зачем: примерка живёт только пока открыт экран «Темы» — уход с экрана
  // всегда возвращает применённую тему (превью не персистится).
  useEffect(() => () => setPreviewThemeMode(null), [setPreviewThemeMode]);

  const candidate: PickerThemeMode = (previewThemeMode ?? appliedThemeMode) as PickerThemeMode;
  const candidatePalette: Theme = PALETTES[candidate] ?? PALETTES.indigo;
  const candidateOption = THEME_OPTIONS.find(o => o.mode === candidate);
  const candidateLocked =
    !!candidateOption?.premiumOnly && !isPremium && !DEV_THEME_UNLOCKS &&
    !(candidate === 'midnight' && isMidnightGrandfathered);
  const candidateApplied = candidate === appliedThemeMode;

  const onRowPress = useCallback((mode: PickerThemeMode) => {
    hapticTap();
    // Тап по применённой теме = выход из примерки; по любой другой — мгновенная примерка.
    setPreviewThemeMode(mode === appliedThemeMode ? null : mode);
  }, [appliedThemeMode, setPreviewThemeMode]);

  const onCtaPress = useCallback(() => {
    hapticTap();
    if (candidateLocked) {
      // Примерку не сбрасываем: юзер вернётся из пейволла в примеряемой теме,
      // а после покупки кнопка сама станет «Применить тему».
      router.push({ pathname: '/premium_modal', params: { context: 'theme' } } as any);
      return;
    }
    if (candidateApplied) return;
    setThemeMode(candidate);
    setPreviewThemeMode(null);
    // зачем: ачивка — только за НАСТОЯЩЕЕ применение, примерка её не триггерит.
    void (async () => {
      const { checkAchievements } = await import('./achievements');
      void checkAchievements({ type: 'profile_theme_set' });
    })();
  }, [candidate, candidateApplied, candidateLocked, router, setPreviewThemeMode, setThemeMode]);

  const ctaLabel = candidateLocked
    ? triLang(lang, { ru: 'Открыть с Plus', uk: 'Відкрити з Plus', es: 'Desbloquear con Plus', 'pt-BR': 'Desbloquear com Plus', vi: 'Mở khoá với Plus', id: 'Buka dengan Plus', tr: 'Plus ile aç', pl: 'Odblokuj z Plus' })
    : candidateApplied
      ? triLang(lang, { ru: 'Тема применена', uk: 'Тему застосовано', es: 'Tema aplicado', 'pt-BR': 'Tema aplicado', vi: 'Đã áp dụng chủ đề', id: 'Tema diterapkan', tr: 'Tema uygulandı', pl: 'Motyw zastosowany' })
      : triLang(lang, { ru: 'Применить тему', uk: 'Застосувати тему', es: 'Aplicar tema', 'pt-BR': 'Aplicar tema', vi: 'Áp dụng chủ đề', id: 'Terapkan tema', tr: 'Temayı uygula', pl: 'Zastosuj motyw' });

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

          <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }} scrollEventThrottle={16}>
            {THEME_OPTIONS.filter(item => !item.rewardOnly || DEV_THEME_UNLOCKS || (item.mode === 'gold' && isGoldThemeUnlocked)).map(item => {
              const chipKind: ChipKind = item.rewardOnly ? 'award' : item.premiumOnly ? 'plus' : 'free';
              return (
                <ThemeRow
                  key={item.mode}
                  option={item}
                  label={triLang(lang, {
                    ru: item.labelRU,
                    uk: item.labelUK,
                    es: item.labelES,
                    'pt-BR': item.labelPtBr,
                    vi: item.labelVi,
                    id: item.labelId,
                    tr: item.labelTr,
                    pl: item.labelPl,
                  })}
                  chipText={chipLabel(chipKind, lang)}
                  applied={item.mode === appliedThemeMode}
                  candidate={item.mode === candidate}
                  onPress={onRowPress}
                />
              );
            })}
          </BouncyScrollView>

          {/* Кнопка существует с первого кадра (стабильная геометрия), меняется только содержимое. */}
          <View style={styles.footer}>
            <TouchableOpacity
              testID="theme-cta"
              activeOpacity={0.9}
              disabled={candidateApplied && !candidateLocked}
              onPress={onCtaPress}
              accessibilityRole="button"
              accessibilityState={{ disabled: candidateApplied && !candidateLocked }}
              accessibilityLabel={ctaLabel}
              style={[
                styles.cta,
                candidateLocked
                  ? null
                  : { backgroundColor: candidateApplied ? candidatePalette.accentBg : candidatePalette.accent },
                !candidateLocked && !candidateApplied ? getVolumetricShadow(candidate, candidatePalette, 2) : null,
              ]}
            >
              {candidateLocked ? (
                <LinearGradient
                  pointerEvents="none"
                  colors={GOLD_GRADIENTS.primaryButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              {candidateLocked ? (
                <Ionicons name="diamond" size={16} color={GOLD_RICH.bronzeDark} />
              ) : (
                <Ionicons
                  name={candidateApplied ? 'checkmark-circle' : 'color-palette'}
                  size={18}
                  color={candidateApplied ? candidatePalette.accent : candidatePalette.correctText}
                />
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.ctaText,
                  { color: candidateLocked ? GOLD_RICH.bronzeDark : candidateApplied ? candidatePalette.accent : candidatePalette.correctText },
                ]}
              >
                {ctaLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 22,
    marginBottom: 10,
  },
  rowCandidate: {
    transform: [{ translateY: -2 }],
  },
  rowInner: {
    borderRadius: 22,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 16,
    minHeight: 88,
  },
  icon: {
    width: 44,
    height: 44,
    flexShrink: 0,
  },
  rowMid: {
    flex: 1,
    minWidth: 0,
    gap: 9,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 5,
    borderRadius: 3,
  },
  chip: {
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
  },
  rowEnd: {
    width: 24,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  cta: {
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
});
