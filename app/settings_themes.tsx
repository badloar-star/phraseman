import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View, TouchableOpacity } from 'react-native';
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
import { FlowText } from '../components/text-integrity/FlowText';
import { useLang } from '../components/LangContext';
import { useFeatureAccess } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import TapScale from '../components/TapScale';
import PlusBadge from '../components/PlusBadge';
import { ENABLE_DEV_TOOLS } from './config';
import { triLang, type Lang } from '../constants/i18n';
import {
  type Theme,
  INDIGO,
  SAGE_PORCELAIN,
  MIDNIGHT,
  EMBER,
  AURORA,
  VOLT,
  DARK,
  GOLD,
} from '../constants/theme';
import { GOLD_GRADIENTS, GOLD_RICH } from '../constants/goldTheme';
import { safeRouterBack } from './navigation_back';
import { isThemePlusOnly, isThemeRewardOnly } from './theme_access_policy';

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
};

// ENABLE_DEV_TOOLS уже гасится `!IS_STORE_RELEASE` — в стор-сборке премиум/наградные
// темы остаются закрытыми. Голый DEV_MODE здесь был багом (открывал темы бесплатно в проде).
const DEV_THEME_UNLOCKS = ENABLE_DEV_TOOLS;

const THEME_OPTIONS: ThemeOption[] = [
  // зачем: «Индиго» и «Нефрит» — фри-витрина (выбор владельца); «Полночь» в премиуме,
  // но у «дедушек» (жили на ней бесплатно) остаётся открытой.
  { mode: 'indigo', labelRU: 'Индиго', labelUK: 'Індиго', labelES: 'Índigo', labelPtBr: 'Índigo', labelVi: 'Chàm', labelId: 'Indigo', labelTr: 'İndigo', labelPl: 'Indygo' },
  { mode: 'sagePorcelain', labelRU: 'Нефрит', labelUK: 'Нефрит', labelES: 'Jade', labelPtBr: 'Jade', labelVi: 'Ngọc bích', labelId: 'Giok', labelTr: 'Yeşim', labelPl: 'Jadeit' },
  { mode: 'midnight', labelRU: 'Полночь', labelUK: 'Північ', labelES: 'Medianoche', labelPtBr: 'Meia-noite', labelVi: 'Nửa đêm', labelId: 'Tengah malam', labelTr: 'Gece yarısı', labelPl: 'Północ' },
  { mode: 'ember', labelRU: 'Янтарь', labelUK: 'Бурштин', labelES: 'Ámbar', labelPtBr: 'Âmbar', labelVi: 'Hổ phách', labelId: 'Amber', labelTr: 'Kehribar', labelPl: 'Bursztyn' },
  { mode: 'aurora', labelRU: 'Сияние', labelUK: 'Сяйво', labelES: 'Aurora', labelPtBr: 'Aurora', labelVi: 'Cực quang', labelId: 'Aurora', labelTr: 'Aurora', labelPl: 'Zorza' },
  { mode: 'volt', labelRU: 'Лайм', labelUK: 'Лайм', labelES: 'Lima', labelPtBr: 'Lima', labelVi: 'Chanh', labelId: 'Lime', labelTr: 'Limon', labelPl: 'Limetka' },
  { mode: 'dark', labelRU: 'Форест', labelUK: 'Форест', labelES: 'Forest', labelPtBr: 'Floresta', labelVi: 'Rừng', labelId: 'Hutan', labelTr: 'Orman', labelPl: 'Las' },
  { mode: 'gold', labelRU: 'Золото', labelUK: 'Золото', labelES: 'Oro', labelPtBr: 'Ouro', labelVi: 'Vàng', labelId: 'Emas', labelTr: 'Altın', labelPl: 'Złoto' },
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
  gold: require('../assets/theme-icons/gold.png'),
};

type ThemeTileProps = {
  option: ThemeOption;
  label: string;
  nameColor: string;
  locked: boolean;
  applied: boolean;
  candidate: boolean;
  size: number;
  onPress: (mode: PickerThemeMode) => void;
};

// зачем: владелец отверг «шумную» строку (полоска прогресса + текстовый чип внутри
// плашки) в пользу немой квадратной плитки — только крупная иконка. Имя переехало
// под плитку (правило: никаких подписей-расшифровок ВНУТРИ карточки), а состояние
// (заблокировано/выбрано) читается по угловому бейджу, как в студии кастомизации
// (components/customization/CustomizationCatalogCard.tsx) — тот же язык уже принят
// владельцем для сетки аватаров/аур.
//
// зачем size приходит числом, а не % — процентная ширина + flexGrow внутри
// flexWrap-контейнера НЕ гарантирует перенос ровно после 3 штук (Yoga считает
// перенос по НЕрастянутой базе; при flexBasis:0 база нулевая у всех 9 плиток,
// и они все встают в один ряд крошечными кружками — баг, который поймал
// владелец на скриншоте). Точный пиксельный размер, посчитанный один раз от
// ширины экрана в SettingsThemes, исключает эту неопределённость целиком.
const ThemeTile = memo(function ThemeTile({ option, label, nameColor, locked, applied, candidate, size, onPress }: ThemeTileProps) {
  const palette: Theme = PALETTES[option.mode];
  const shadow = getVolumetricShadow(option.mode, palette, candidate ? 3 : 2);
  return (
    <View style={{ width: size }}>
      <TapScale
        testID={`theme-tile-${option.mode}`}
        accessibilityRole="button"
        accessibilityState={{ selected: applied }}
        accessibilityLabel={label}
        onPress={() => onPress(option.mode)}
        scaleTo={0.95}
        style={[styles.tileWrap, shadow, candidate ? styles.tileCandidate : null]}
      >
        <LinearGradient
          colors={palette.cardGradient}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.tile, { width: size, height: size }]}
        >
          {/* зачем: владелец явно попросил иконку НА ВЕСЬ квадрат, не мелкий
              кружок в центре — absoluteFill растягивает картинку на всю
              плитку, tile уже overflow:'hidden' со скруглением, так что
              иконка обрежется точно по форме карточки. */}
          <Image source={THEME_ICONS[option.mode]} style={StyleSheet.absoluteFillObject} contentFit="cover" accessible={false} />
          {locked ? (
            <PlusBadge themeMode={option.mode} size="sm" style={styles.lockBadge} />
          ) : applied ? (
            <View style={[styles.appliedBadge, { backgroundColor: palette.accent }]}>
              <Ionicons name="checkmark" size={14} color={palette.correctText} />
            </View>
          ) : null}
        </LinearGradient>
      </TapScale>
      {/* зачем: FlowText намеренно не принимает numberOfLines (text-integrity: без
          усечений) — длинное имя темы на узкой плитке переносится на 2 строки,
          а не режется троеточием; centerText + lineHeight держат высоту стабильной. */}
      <FlowText testID={`theme-tile-name-${option.mode}`} provenance="authored" style={[styles.name, { color: nameColor }]}>{label}</FlowText>
    </View>
  );
});

// зачем: те же зазор и паддинг экрана, что и в сетке студии кастомизации
// (avatar_select.tsx GRID_GAP/GRID_PAD) — единый ритм сеток по приложению.
// Подняты сюда (а не в самый низ файла), потому что tileSize внутри
// SettingsThemes считает точный пиксельный размер плитки уже на их основе —
// объявление ДО использования исключает любую зависимость от hoisting.
const TILE_GRID_GAP = 10;
const GRID_SCREEN_PAD = 10;

export default function SettingsThemes() {
  const router = useRouter();
  const {
    theme: t,
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

  // зачем: явный пиксельный размер плитки вместо %/flexGrow — гарантирует РОВНО
  // 3 в ряд на любой ширине экрана (см. комментарий у ThemeTile). Экран открыт
  // на весь ЖЦ, ширина окна не меняется без ремаунта — Dimensions.get() без
  // подписки на resize достаточно (та же логика уже используется в customization
  // heroHeight).
  const tileSize = useMemo(() => {
    const windowWidth = Dimensions.get('window').width;
    const usableWidth = windowWidth - GRID_SCREEN_PAD * 2;
    return Math.floor((usableWidth - TILE_GRID_GAP * 2) / 3);
  }, []);

  // зачем: примерка живёт только пока открыт экран «Темы» — уход с экрана
  // всегда возвращает применённую тему (превью не персистится).
  useEffect(() => () => setPreviewThemeMode(null), [setPreviewThemeMode]);

  const candidate: PickerThemeMode = (previewThemeMode ?? appliedThemeMode) as PickerThemeMode;
  const candidatePalette: Theme = PALETTES[candidate] ?? PALETTES.indigo;
  const candidateLocked =
    isThemePlusOnly(candidate) && !isPremium && !DEV_THEME_UNLOCKS &&
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

          {/* зачем: владелец попросил КРУПНЫЕ квадраты — боковой паддинг экрана
              уменьшен (GRID_SCREEN_PAD), чтобы отдать эту ширину самим плиткам,
              а не воздуху по краям (3 в ряд остаются, но каждая заметно больше). */}
          <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ paddingHorizontal: GRID_SCREEN_PAD, paddingTop: 12, paddingBottom: 16 }} scrollEventThrottle={16}>
            <View style={styles.grid}>
              {THEME_OPTIONS.filter(item => !isThemeRewardOnly(item.mode) || DEV_THEME_UNLOCKS || (item.mode === 'gold' && isGoldThemeUnlocked)).map(item => {
                const locked = isThemePlusOnly(item.mode) && !isPremium && !DEV_THEME_UNLOCKS
                  && !(item.mode === 'midnight' && isMidnightGrandfathered);
                return (
                  <ThemeTile
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
                    nameColor={t.textPrimary}
                    locked={locked}
                    size={tileSize}
                    applied={item.mode === appliedThemeMode}
                    candidate={item.mode === candidate}
                    onPress={onRowPress}
                  />
                );
              })}
            </View>
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
              <FlowText
                testID="theme-cta-label"
                provenance="authored"
                style={[
                  styles.ctaText,
                  { color: candidateLocked ? GOLD_RICH.bronzeDark : candidateApplied ? candidatePalette.accent : candidatePalette.correctText },
                ]}
              >
                {ctaLabel}
              </FlowText>
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GRID_GAP,
  },
  tileWrap: {
    borderRadius: 22,
  },
  tileCandidate: {
    transform: [{ translateY: -2 }],
  },
  tile: {
    aspectRatio: 1,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  appliedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
    // зачем: минимум-высота под 2 строки резервируется сразу (layout stability —
    // first frame = final geometry), чтобы длинная локаль не «прыгала» сеткой,
    // когда её имя переносится, а короткие имена остальных тем — нет.
    minHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  cta: {
    // зачем: minHeight вместо height — длинная локаль переносится на 2 строки,
    // кнопка растёт, а не режет текст (правило text-integrity: без ужатий).
    minHeight: 54,
    paddingVertical: 8,
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
