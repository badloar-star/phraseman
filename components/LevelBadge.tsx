import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

// Static require map — Metro bundler needs literal paths
const GIFS: Record<number, any> = {
  1:  require('../assets/images/levels/generated-v4/1.webp'),
  2:  require('../assets/images/levels/generated-v4/2.webp'),
  3:  require('../assets/images/levels/generated-v4/3.webp'),
  4:  require('../assets/images/levels/generated-v4/4.webp'),
  5:  require('../assets/images/levels/generated-v4/5.webp'),
  6:  require('../assets/images/levels/generated-v4/6.webp'),
  7:  require('../assets/images/levels/generated-v4/7.webp'),
  8:  require('../assets/images/levels/generated-v4/8.webp'),
  9:  require('../assets/images/levels/generated-v4/9.webp'),
  10: require('../assets/images/levels/generated-v4/10.webp'),
  11: require('../assets/images/levels/generated-v4/11.webp'),
  12: require('../assets/images/levels/generated-v4/12.webp'),
  13: require('../assets/images/levels/generated-v4/13.webp'),
  14: require('../assets/images/levels/generated-v4/14.webp'),
  15: require('../assets/images/levels/generated-v4/15.webp'),
  16: require('../assets/images/levels/generated-v4/16.webp'),
  17: require('../assets/images/levels/generated-v4/17.webp'),
  18: require('../assets/images/levels/generated-v4/18.webp'),
  19: require('../assets/images/levels/generated-v4/19.webp'),
  20: require('../assets/images/levels/generated-v4/20.webp'),
  21: require('../assets/images/levels/generated-v4/21.webp'),
  22: require('../assets/images/levels/generated-v4/22.webp'),
  23: require('../assets/images/levels/generated-v4/23.webp'),
  24: require('../assets/images/levels/generated-v4/24.webp'),
  25: require('../assets/images/levels/generated-v4/25.webp'),
  26: require('../assets/images/levels/generated-v4/26.webp'),
  27: require('../assets/images/levels/generated-v4/27.webp'),
  28: require('../assets/images/levels/generated-v4/28.webp'),
  29: require('../assets/images/levels/generated-v4/29.webp'),
  30: require('../assets/images/levels/generated-v4/30.webp'),
  31: require('../assets/images/levels/generated-v4/31.webp'),
  32: require('../assets/images/levels/generated-v4/32.webp'),
  33: require('../assets/images/levels/generated-v4/33.webp'),
  34: require('../assets/images/levels/generated-v4/34.webp'),
  35: require('../assets/images/levels/generated-v4/35.webp'),
  36: require('../assets/images/levels/generated-v4/36.webp'),
  37: require('../assets/images/levels/generated-v4/37.webp'),
  38: require('../assets/images/levels/generated-v4/38.webp'),
  39: require('../assets/images/levels/generated-v4/39.webp'),
  40: require('../assets/images/levels/generated-v4/40.webp'),
  41: require('../assets/images/levels/generated-v4/41.webp'),
  42: require('../assets/images/levels/generated-v4/42.webp'),
  43: require('../assets/images/levels/generated-v4/43.webp'),
  44: require('../assets/images/levels/generated-v4/44.webp'),
  45: require('../assets/images/levels/generated-v4/45.webp'),
  46: require('../assets/images/levels/generated-v4/46.webp'),
  47: require('../assets/images/levels/generated-v4/47.webp'),
  48: require('../assets/images/levels/generated-v4/48.webp'),
  49: require('../assets/images/levels/generated-v4/49.webp'),
  50: require('../assets/images/levels/generated-v4/50.webp'),
  51: require('../assets/images/levels/generated-v4/51.webp'),
  52: require('../assets/images/levels/generated-v4/52.webp'),
  53: require('../assets/images/levels/generated-v4/53.webp'),
  54: require('../assets/images/levels/generated-v4/54.webp'),
  55: require('../assets/images/levels/generated-v4/55.webp'),
  56: require('../assets/images/levels/generated-v4/56.webp'),
  57: require('../assets/images/levels/generated-v4/57.webp'),
  58: require('../assets/images/levels/generated-v4/58.webp'),
  59: require('../assets/images/levels/generated-v4/59.webp'),
  60: require('../assets/images/levels/generated-v4/60.webp'),
};

interface Props {
  level: number;
  size?: number;
  height?: number;
  /**
   * Анимация бейджа (много `autoplay` на одном экране сильно грузит CPU/GPU).
   * Для длинных списков (карта уровней) передавайте false почти везде.
   */
  autoplay?: boolean;
  centeredNumber?: boolean;
}

export default function LevelBadge({ level, size = 40, height, autoplay: autoplayEnabled = true, centeredNumber = false }: Props) {
  const clamped = Math.max(1, Math.min(60, level));
  const source = GIFS[clamped];
  const fallbackSource = source ?? GIFS[1];
  const badgeHeight = height ?? size;
  const numberFontSize = size * (clamped < 10 ? 0.42 : 0.37);
  const numberLineHeight = size * 0.42;
  const numberGradientId = `levelBadgeNumber_${clamped}_${Math.round(size)}_${Math.round(badgeHeight)}`;
  const image = (
    <Image
      source={fallbackSource}
      style={{ width: size, height: badgeHeight }}
      contentFit={height ? 'fill' : 'contain'}
      autoplay={autoplayEnabled}
    />
  );

  if (!centeredNumber) return image;

  return (
    <View style={{ width: size, height: badgeHeight, alignItems: 'center', justifyContent: 'center' }}>
      {image}
      <Svg
        pointerEvents="none"
        width={size}
        height={badgeHeight}
        style={{ position: 'absolute', overflow: 'visible' }}
      >
        <Defs>
          <LinearGradient id={numberGradientId} x1="0" y1="0" x2="0" y2={badgeHeight} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.48" stopColor="#F7FDFF" />
            <Stop offset="1" stopColor="#C7F6FF" />
          </LinearGradient>
        </Defs>
        <SvgText
          x={size / 2}
          y={(badgeHeight + numberLineHeight) / 2 - size * 0.045}
          textAnchor="middle"
          fontSize={numberFontSize}
          fontWeight="900"
          fill="rgba(255, 255, 255, 0.92)"
          stroke="rgba(36, 151, 230, 0.66)"
          strokeWidth={size * 0.05}
        >
          {clamped}
        </SvgText>
        <SvgText
          x={size / 2}
          y={(badgeHeight + numberLineHeight) / 2 - size * 0.065}
          textAnchor="middle"
          fontSize={numberFontSize}
          fontWeight="900"
          fill="#FFFFFF"
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth={size * 0.012}
        >
          {clamped}
        </SvgText>
      </Svg>
    </View>
  );
}
