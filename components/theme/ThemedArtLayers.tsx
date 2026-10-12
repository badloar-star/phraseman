// зачем (приказ координатора 15.10): плитки и карточка «Сегодня» Главной рисуют предмет двумя слоями — основа и необязательный слой `.accent`,
// который красится в цвет темы (tintColor = accentBright, как в ThemedArt). Слоя нет у большинства предметов — тогда рисуется один Image, как раньше.
import React, { memo } from 'react';
import { StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

type Props = Readonly<{
  source: ImageSourcePropType;
  /** Слой цветной детали; null/undefined — второго Image нет. */
  accent?: ImageSourcePropType | null;
  /** Размер и отступы контейнера — те же, что были у одиночной картинки. */
  style?: StyleProp<ViewStyle>;
  contentFit?: 'contain' | 'cover';
  contentPosition?: 'center' | 'right';
}>;

function ThemedArtLayersImpl({ source, accent = null, style, contentFit = 'contain', contentPosition = 'center' }: Props) {
  const { liquidGlassThemeId, liquidGlassAppearance, liquidGlassIntensity } = useTheme();
  // Палитра уже кэширована по теме+оформлению+шагу ползунка — тот же объект, без расчётов.
  const tint = liquidGlassTokens(liquidGlassThemeId, { level: 'calm', appearance: liquidGlassAppearance, intensity: liquidGlassIntensity }).accentBright;
  return (
    <View style={style} pointerEvents="none">
      <Image source={source} style={StyleSheet.absoluteFill} contentFit={contentFit} contentPosition={contentPosition} transition={0} accessible={false} />
      {accent ? <Image source={accent} style={StyleSheet.absoluteFill} contentFit={contentFit} contentPosition={contentPosition} transition={0} tintColor={tint} accessible={false} /> : null}
    </View>
  );
}

export const ThemedArtLayers = memo(ThemedArtLayersImpl);
