import React from 'react';
import { Image } from 'expo-image';

// Static require map — Metro bundler needs literal paths
const GIFS: Record<number, any> = {
  1:  require('../assets/images/levels/1.png'),
  2:  require('../assets/images/levels/2.png'),
  3:  require('../assets/images/levels/3.png'),
  4:  require('../assets/images/levels/4.png'),
  5:  require('../assets/images/levels/5.png'),
  6:  require('../assets/images/levels/6.png'),
  7:  require('../assets/images/levels/7.png'),
  8:  require('../assets/images/levels/8.png'),
  9:  require('../assets/images/levels/9.png'),
  10: require('../assets/images/levels/10.png'),
  11: require('../assets/images/levels/11.png'),
  12: require('../assets/images/levels/12.png'),
  13: require('../assets/images/levels/13.png'),
  14: require('../assets/images/levels/14.png'),
  15: require('../assets/images/levels/15.png'),
  16: require('../assets/images/levels/16.png'),
  17: require('../assets/images/levels/17.png'),
  18: require('../assets/images/levels/18.png'),
  19: require('../assets/images/levels/19.png'),
  20: require('../assets/images/levels/20.png'),
  21: require('../assets/images/levels/21.png'),
  22: require('../assets/images/levels/22.png'),
  23: require('../assets/images/levels/23.png'),
  24: require('../assets/images/levels/24.png'),
  25: require('../assets/images/levels/25.png'),
  26: require('../assets/images/levels/26.png'),
  27: require('../assets/images/levels/27.png'),
  28: require('../assets/images/levels/28.png'),
  29: require('../assets/images/levels/29.png'),
  30: require('../assets/images/levels/30.png'),
  31: require('../assets/images/levels/31.png'),
  32: require('../assets/images/levels/32.png'),
  33: require('../assets/images/levels/33.png'),
  34: require('../assets/images/levels/34.png'),
  // 35: require('../assets/images/levels/35.png'), // MISSING FILE - fallback to 34
  36: require('../assets/images/levels/36.png'),
  37: require('../assets/images/levels/37.png'),
  38: require('../assets/images/levels/38.png'),
  39: require('../assets/images/levels/39.png'),
  40: require('../assets/images/levels/40.png'),
  41: require('../assets/images/levels/41.png'),
  42: require('../assets/images/levels/42.png'),
  43: require('../assets/images/levels/43.png'),
  44: require('../assets/images/levels/44.png'),
  45: require('../assets/images/levels/45.png'),
  46: require('../assets/images/levels/46.png'),
  47: require('../assets/images/levels/47.png'),
  48: require('../assets/images/levels/48.png'),
  49: require('../assets/images/levels/49.png'),
  50: require('../assets/images/levels/50.png'),
};

interface Props {
  level: number;
  size?: number;
  height?: number;
}

export default function LevelBadge({ level, size = 40, height }: Props) {
  const clamped = Math.max(1, Math.min(50, level));
  const source = GIFS[clamped] ?? GIFS[1];
  return (
    <Image
      source={source}
      style={{ width: size, height: height ?? size, borderRadius: size * 0.08 }}
      contentFit={height ? 'fill' : 'contain'}
      autoplay
    />
  );
}
