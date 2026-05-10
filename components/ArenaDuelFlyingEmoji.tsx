import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type ArenaDuelFlyEmoji = {
  key: string;
  emoji: string;
  from: 'self' | 'opponent';
};

const DURATION_MS = 2400;

type SpriteProps = {
  emoji: string;
  from: 'self' | 'opponent';
  layoutW: number;
  layoutH: number;
  onEnd: () => void;
};

function FlyingEmojiSprite({ emoji, from, layoutW, layoutH, onEnd }: SpriteProps) {
  const progress = useSharedValue(0);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: DURATION_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onEndRef.current)();
      },
    );
  }, [emoji, from, progress]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const cycles = 4;
    const amp = Math.min(56, layoutW * 0.13) * (1 - 0.38 * t);
    const sway = Math.sin(t * Math.PI * 2 * cycles) * amp;
    const topStart = layoutH * 0.74;
    const topEnd = layoutH * 0.06;
    const top = interpolate(t, [0, 1], [topStart, topEnd]);
    /** Половина визуальной ширины глифа (~fontSize 46), чтобы траектория шла от центра экрана. */
    const emojiHalfW = 28;
    const left = layoutW * 0.5 - emojiHalfW + sway;
    return {
      position: 'absolute',
      left,
      top,
      opacity: interpolate(t, [0, 0.04, 0.78, 1], [0, 1, 1, 0]),
      transform: [{ scale: interpolate(t, [0, 0.1, 0.38, 1], [0.52, 1.12, 1.02, 0.9]) }],
    };
  }, [layoutW, layoutH, progress]);

  return (
    <Reanimated.Text
      style={[styles.emoji, style]}
      pointerEvents="none"
      accessibilityLabel={emoji}
    >
      {emoji}
    </Reanimated.Text>
  );
}

type OverlayProps = {
  items: ArenaDuelFlyEmoji[];
  layoutW: number;
  layoutH: number;
  onRemove: (key: string) => void;
};

export function ArenaDuelFlyingEmojiOverlay({ items, layoutW, layoutH, onRemove }: OverlayProps) {
  if (items.length === 0) return null;
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none" collapsable={false}>
      {items.map((it) => (
        <FlyingEmojiSprite
          key={it.key}
          emoji={it.emoji}
          from={it.from}
          layoutW={layoutW}
          layoutH={layoutH}
          onEnd={() => onRemove(it.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emoji: {
    fontSize: 46,
    zIndex: 85,
    elevation: 16,
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
