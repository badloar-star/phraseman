import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, TextStyle } from 'react-native';
import { useTheme } from './ThemeContext';

function safeXpAmount(raw: unknown): number {
  const v = Number(raw);
  if (Number.isFinite(v) && v >= 0) return v;
  return 0;
}

type Props = {
  /** Pass undefined only by mistake; coerced to 0 so +XP is never "empty" in JSX. */
  amount: number | undefined | null;
  visible: boolean;
  style?: TextStyle;
  /** Parent already animates opacity — skip inner fade/translate so цифра не "мигает" и лучше читается. */
  noInnerAnimation?: boolean;
};

export default function XpGainBadge({ amount, visible, style, noInnerAnimation = false }: Props) {
  const { theme: t, f } = useTheme();
  const n = safeXpAmount(amount);
  const flyY = useRef(new Animated.Value(8)).current;
  const fade = useRef(new Animated.Value(noInnerAnimation ? 1 : 0)).current;

  useEffect(() => {
    if (!visible) return;
    if (noInnerAnimation) {
      flyY.setValue(0);
      fade.setValue(1);
      return;
    }
    flyY.setValue(8);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(flyY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, noInnerAnimation, fade, flyY]);

  if (!visible) return null;

  if (noInnerAnimation) {
    return (
      <Text
        style={[
          { color: t.correct, fontSize: f.h2, fontWeight: '800' },
          style,
        ]}
      >
        +{n} XP
      </Text>
    );
  }

  return (
    <Animated.Text
      style={[
        {
          color: t.correct,
          fontSize: f.h2,
          fontWeight: '800',
          opacity: fade,
          transform: [{ translateY: flyY }],
        },
        style,
      ]}
    >
      +{n} XP
    </Animated.Text>
  );
}
