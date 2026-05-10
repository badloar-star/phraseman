import React from 'react';
import { Image } from 'expo-image';

// Static require map — Metro bundler needs literal paths
const GIFS: Record<number, any> = {
  1:  require('../assets/images/levels/1.webp'),
  2:  require('../assets/images/levels/2.webp'),
  3:  require('../assets/images/levels/3.webp'),
  4:  require('../assets/images/levels/4.webp'),
  5:  require('../assets/images/levels/5.webp'),
  6:  require('../assets/images/levels/6.webp'),
  7:  require('../assets/images/levels/7.webp'),
  8:  require('../assets/images/levels/8.webp'),
  9:  require('../assets/images/levels/9.webp'),
  10: require('../assets/images/levels/10.webp'),
  11: require('../assets/images/levels/11.webp'),
  12: require('../assets/images/levels/12.webp'),
  13: require('../assets/images/levels/13.webp'),
  14: require('../assets/images/levels/14.webp'),
  15: require('../assets/images/levels/15.webp'),
  16: require('../assets/images/levels/16.webp'),
  17: require('../assets/images/levels/17.webp'),
  18: require('../assets/images/levels/18.webp'),
  19: require('../assets/images/levels/19.webp'),
  20: require('../assets/images/levels/20.webp'),
  21: require('../assets/images/levels/21.webp'),
  22: require('../assets/images/levels/22.webp'),
  23: require('../assets/images/levels/23.webp'),
  24: require('../assets/images/levels/24.webp'),
  25: require('../assets/images/levels/25.webp'),
  26: require('../assets/images/levels/26.webp'),
  27: require('../assets/images/levels/27.webp'),
  28: require('../assets/images/levels/28.webp'),
  29: require('../assets/images/levels/29.webp'),
  30: require('../assets/images/levels/30.webp'),
  31: require('../assets/images/levels/31.webp'),
  32: require('../assets/images/levels/32.webp'),
  33: require('../assets/images/levels/33.webp'),
  34: require('../assets/images/levels/34.webp'),
  35: require('../assets/images/levels/35.webp'),
  36: require('../assets/images/levels/36.webp'),
  37: require('../assets/images/levels/37.webp'),
  38: require('../assets/images/levels/38.webp'),
  39: require('../assets/images/levels/39.webp'),
  40: require('../assets/images/levels/40.webp'),
  41: require('../assets/images/levels/41.webp'),
  42: require('../assets/images/levels/42.webp'),
  43: require('../assets/images/levels/43.webp'),
  44: require('../assets/images/levels/44.webp'),
  45: require('../assets/images/levels/45.webp'),
  46: require('../assets/images/levels/46.webp'),
  47: require('../assets/images/levels/47.webp'),
  48: require('../assets/images/levels/48.webp'),
  49: require('../assets/images/levels/49.webp'),
  50: require('../assets/images/levels/50.webp'),
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
}

export default function LevelBadge({ level, size = 40, height, autoplay: autoplayEnabled = true }: Props) {
  const clamped = Math.max(1, Math.min(50, level));
  const source = GIFS[clamped] ?? GIFS[1];
  return (
    <Image
      source={source}
      style={{ width: size, height: height ?? size, borderRadius: size * 0.08 }}
      contentFit={height ? 'fill' : 'contain'}
      autoplay={autoplayEnabled}
    />
  );
}
