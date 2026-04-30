import React from 'react';
import { View, Text, Image } from 'react-native';
import LevelBadge from './LevelBadge';

// Simple avatar display — frames removed
interface Props {
  emoji?:    string;
  image?:    any;
  frameId?:  string;  // kept for API compatibility, unused
  size?:     number;
  style?:    any;
  fontSize?: number;
  noAvatar?: boolean;
  bgColor?:  string;
  animated?: boolean; // kept for API compatibility, unused
}

export { useAnimCtx } from './AnimContext';
export { AnimatedFrameProvider } from './AnimContext';

export default function AnimatedFrame({
  emoji, image, size = 44, style, fontSize, noAvatar = false, bgColor,
}: Props) {
  const [imageLoadFailed, setImageLoadFailed] = React.useState(false);
  const isLevel = emoji && /^\d+$/.test(emoji);

  if (noAvatar) {
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor ?? 'transparent' }, style]} />
    );
  }

  // Гексагональные бейджи уровней не обрезаем кругом — убираем borderRadius и overflow
  if (isLevel) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <LevelBadge level={parseInt(emoji!)} size={size} />
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      {image && !imageLoadFailed
        ? <Image source={image} style={{ width: size, height: size, borderRadius: size / 2 }}
            onError={() => setImageLoadFailed(true)}
            onLoadStart={() => setImageLoadFailed(false)} />
        : <Text style={{ fontSize: fontSize ?? Math.round(size * 0.5) }}>{emoji}</Text>
      }
    </View>
  );
}
