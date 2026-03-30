import React from 'react';
import { Image } from 'expo-image';

// Static require map — Metro bundler needs literal paths
const GIFS: Record<number, any> = {
  1:  require('../assets/images/levels/1.png'),
  2:  require('../assets/images/levels/2.gif'),
  3:  require('../assets/images/levels/3.gif'),
  4:  require('../assets/images/levels/4.gif'),
  5:  require('../assets/images/levels/5.gif'),
  6:  require('../assets/images/levels/6.gif'),
  7:  require('../assets/images/levels/7.gif'),
  8:  require('../assets/images/levels/8.gif'),
  9:  require('../assets/images/levels/9.gif'),
  10: require('../assets/images/levels/10.gif'),
  11: require('../assets/images/levels/11.gif'),
  12: require('../assets/images/levels/12.gif'),
  13: require('../assets/images/levels/13.gif'),
  14: require('../assets/images/levels/14.gif'),
  15: require('../assets/images/levels/15.gif'),
  16: require('../assets/images/levels/16.gif'),
  17: require('../assets/images/levels/17.gif'),
  18: require('../assets/images/levels/18.gif'),
  19: require('../assets/images/levels/19.gif'),
  20: require('../assets/images/levels/20.gif'),
  21: require('../assets/images/levels/21.gif'),
  22: require('../assets/images/levels/22.gif'),
  23: require('../assets/images/levels/23.gif'),
  24: require('../assets/images/levels/24.gif'),
  25: require('../assets/images/levels/25.gif'),
  26: require('../assets/images/levels/26.gif'),
  27: require('../assets/images/levels/27.gif'),
  28: require('../assets/images/levels/28.gif'),
  29: require('../assets/images/levels/29.gif'),
  30: require('../assets/images/levels/30.gif'),
  31: require('../assets/images/levels/31.gif'),
  32: require('../assets/images/levels/32.gif'),
  33: require('../assets/images/levels/33.gif'),
  34: require('../assets/images/levels/34.gif'),
  35: require('../assets/images/levels/35.gif'),
  36: require('../assets/images/levels/36.gif'),
  37: require('../assets/images/levels/37.gif'),
  38: require('../assets/images/levels/38.gif'),
  39: require('../assets/images/levels/39.gif'),
  40: require('../assets/images/levels/40.gif'),
  41: require('../assets/images/levels/41.gif'),
  42: require('../assets/images/levels/42.gif'),
  43: require('../assets/images/levels/43.gif'),
  44: require('../assets/images/levels/44.gif'),
  45: require('../assets/images/levels/45.gif'),
  46: require('../assets/images/levels/46.gif'),
  47: require('../assets/images/levels/47.gif'),
  48: require('../assets/images/levels/48.gif'),
  49: require('../assets/images/levels/49.gif'),
  50: require('../assets/images/levels/50.gif'),
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
