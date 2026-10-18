// зачем (ТЕМЫ 2.0, 2026-10-04, ТЗ docs/phraseman-2.0/ASSETS_V2_PROMPTS.md): предметы 2.0 нейтральных
// цветов + ОДНА цветная деталь отдельным слоем `<name>.accent.webp`. Приложение берёт тёмный или
// светлый комплект по оформлению темы и красит деталь в акцент темы — у Авроры мятная, у Туманности
// лавандовая, предмет тот же. Пока картинок нет — нынешняя картинка этого места (реестр).
//
// Только именованный экспорт: файл лежит в app/, и default-экспорт превратил бы его в экран роутера.
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import {
  resolveThemedArt,
  themedArtBrightnessForBackground,
  type ThemedArtBrightness,
  type ThemedArtName,
} from './themed_art_registry';
import { spireRankSmallAccent } from '../spire/spire_rank_accent_small';

export type ThemedArtProps = Readonly<{
  name: ThemedArtName;
  /** Сторона квадрата. Для широких холстов (continue, intro_*) — задать width/height. */
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Явная яркость (например, превью тем); по умолчанию — оформление текущей темы. */
  brightness?: ThemedArtBrightness;
  accessibilityLabel?: string;
  testID?: string;
}>;

function ThemedArtImpl({ name, size = 96, width, height, style, brightness, accessibilityLabel, testID }: ThemedArtProps) {
  const { liquidGlassThemeId, liquidGlassAppearance, liquidGlassIntensity } = useTheme();
  // Палитра уже кэширована по теме+оформлению+шагу ползунка — тот же объект, без расчётов.
  const tokens = liquidGlassTokens(liquidGlassThemeId, { level: 'calm', appearance: liquidGlassAppearance, intensity: liquidGlassIntensity });
  // Комплект — по яркости фона темы: светлые → light, тёмные и тёмные градиентные → dark.
  const tone: ThemedArtBrightness = brightness ?? themedArtBrightnessForBackground(tokens.bg);
  // Источники — из кэша реестра по имени+яркости: ползунок и смена темы их не пересоздают.
  const art = useMemo(() => resolveThemedArt(name, tone), [name, tone]);
  // зачем (координатор 18.10, R154): у значков рангов Пика маска .accent в реестре 1024² (~4 МБ в памяти ради 25 dp) — берём копию 128²; остальные предметы как были.
  const accent = art.accent ? spireRankSmallAccent(name, tone) ?? art.accent : null;
  // Цвет детали. Слоя .accent пока нет ни у одного предмета — тогда рисуется чистый предмет.
  const tint = tokens.accentBright;
  const box = useMemo<ViewStyle>(() => ({ width: width ?? size, height: height ?? size }), [width, height, size]);

  return (
    // Размер резервируется всегда — даже без картинки геометрия первого кадра финальная.
    <View style={[box, style]} testID={testID} accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityLabel ? 'image' : undefined}>
      {art.base ? <Image source={art.base} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} accessible={false} /> : null}
      {accent ? <Image source={accent} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} tintColor={tint} accessible={false} /> : null}
    </View>
  );
}

export const ThemedArt = memo(ThemedArtImpl);
