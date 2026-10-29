// зачем (приказ координатора 15.10): плитки и карточка «Сегодня» Главной рисуют предмет двумя слоями — основа и необязательный слой `.accent`,
// который красится в цвет темы (tintColor = artAccentTint: accent в тёмном, accentBright в светлом; см. art_tint.ts и CLAY_ACCENT_SATURATION_2026-10-12.md). Слоя нет у большинства предметов — тогда рисуется один Image, как раньше.
import React, { memo, useEffect } from 'react';
import { StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { artAccentTint } from './art_tint';
import { liquidGlassLevelForIntensity } from '../../constants/liquidGlassThemeIntensity';
import { useMemHomeRegisterSources } from '../../app/mem_home_probe';

// зачем (координатор 15.10, кадры clay_home: деталь рисуется, но бледно): dev-журнал реального цвета слоя .accent — тема, уровень, оттенок tint. Одна строка на смену ключа.
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const loggedTints = new Set<string>();

type Props = Readonly<{
  source: ImageSourcePropType;
  /** Слой цветной детали; null/undefined — второго Image нет. */
  accent?: ImageSourcePropType | null;
  /** Размер и отступы контейнера — те же, что были у одиночной картинки. */
  style?: StyleProp<ViewStyle>;
  contentFit?: 'contain' | 'cover';
  contentPosition?: 'center' | 'right';
  /** false — слой accent рисуется своими цветами арта, без окраски цветом темы (герой Главной, слово владельца 29.10). */
  tintAccent?: boolean;
}>;

function ThemedArtLayersImpl({ source, accent = null, style, contentFit = 'contain', contentPosition = 'center', tintAccent = true }: Props) {
  const { liquidGlassThemeId, liquidGlassAppearance, liquidGlassIntensity } = useTheme();
  // Палитра уже кэширована по теме+оформлению+шагу ползунка — тот же объект, без расчётов.
  const tint = artAccentTint(liquidGlassTokens(liquidGlassThemeId, { level: 'calm', appearance: liquidGlassAppearance, intensity: liquidGlassIntensity }), liquidGlassAppearance); // зачем (координатор 15.10, предложение А): см. art_tint.ts
  const hasAccent = Boolean(accent);
  useMemHomeRegisterSources('themed_art', source, accent); // зачем ([MEM-HOME] 18.10, R129): сколько слоёв арта живо и какой у них размер источника; dev, в релизе пусто
  useEffect(() => {
    if (!IS_DEV || !hasAccent) return;
    const level = liquidGlassLevelForIntensity(liquidGlassIntensity);
    const key = `${liquidGlassThemeId}|${liquidGlassAppearance}|${level}|${tint}`;
    if (loggedTints.has(key)) return;
    loggedTints.add(key);
    // зачем ([HERO-TINT], слово владельца 29.10: «краска не должна ложиться на иконки»; сперва логи): какой слой красится и чем — основа рисуется без tintColor, слой accent красится цветом темы
    console.log(`[HERO-TINT] layers=base(untinted)+accent(tintColor=${tint}) accent=${hasAccent ? 1 : 0} theme=${liquidGlassThemeId} appearance=${liquidGlassAppearance} level=${level}`); // guard-ok: dev-журнал, одна строка на смену ключа
    console.log(`[THEMED-ART] tint=${tint} level=${level} intensity=${liquidGlassIntensity} theme=${liquidGlassThemeId} appearance=${liquidGlassAppearance}`); // guard-ok: dev-журнал цвета слоя accent, одна строка на смену
  }, [hasAccent, tint, liquidGlassThemeId, liquidGlassAppearance, liquidGlassIntensity]);
  return (
    <View style={style} pointerEvents="none">
      <Image source={source} style={StyleSheet.absoluteFill} contentFit={contentFit} contentPosition={contentPosition} transition={0} accessible={false} />
      {accent ? <Image source={accent} style={StyleSheet.absoluteFill} contentFit={contentFit} contentPosition={contentPosition} transition={0} tintColor={tintAccent ? tint : undefined} accessible={false} /> : null}
    </View>
  );
}

export const ThemedArtLayers = memo(ThemedArtLayersImpl);
