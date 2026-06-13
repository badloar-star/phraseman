import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';

interface AiTypingBubbleProps {
  bubbleColor: string;
  borderColor: string;
  dotColor: string;
  glowColor: string;
}

export default function AiTypingBubble({
  bubbleColor,
  borderColor,
  dotColor,
  glowColor,
}: AiTypingBubbleProps) {
  const dotAnimations = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const loopRefs = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    let mounted = true;

    const stop = () => {
      loopRefs.current.forEach((loop) => loop.stop());
      loopRefs.current = [];
    };

    const setStatic = () => {
      dotAnimations.forEach((dot) => dot.setValue(0));
      glowPulse.setValue(0);
    };

    const start = (shouldAnimate: boolean) => {
      stop();
      if (!shouldAnimate) {
        setStatic();
        return;
      }

      const dotLoops = dotAnimations.map((dot, index) => {
        dot.setValue(0);
        return Animated.loop(
          Animated.sequence([
            Animated.delay(index * 140),
            Animated.timing(dot, {
              toValue: 1,
              duration: 240,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 340,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.delay(620 - index * 140),
          ]),
        );
      });

      glowPulse.setValue(0);
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1,
            duration: 680,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0,
            duration: 680,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      );

      loopRefs.current = [...dotLoops, glowLoop];
      loopRefs.current.forEach((loop) => loop.start());
    };

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotionEnabled) => {
      if (mounted) start(!reduceMotionEnabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduceMotionEnabled) => {
      start(!reduceMotionEnabled);
    });

    return () => {
      mounted = false;
      stop();
      subscription.remove();
    };
  }, [dotAnimations, glowPulse]);

  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });
  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });

  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel="AI is typing a reply"
      accessibilityLiveRegion="polite"
      testID="ai-typing-bubble"
      style={styles.wrap}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: glowColor,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      >
        <View style={[styles.bubble, { backgroundColor: bubbleColor, borderColor }]}>
          {dotAnimations.map((dot, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: dotColor,
                  opacity: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.58, 1],
                  }),
                  transform: [
                    {
                      translateY: dot.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -7],
                      }),
                    },
                    {
                      scale: dot.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1.16],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 10,
  },
  glow: {
    borderRadius: 32,
    padding: 9,
  },
  bubble: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 0.5,
    elevation: 5,
    flexDirection: 'row',
    gap: 10,
    height: 62,
    justifyContent: 'center',
    minWidth: 112,
    paddingHorizontal: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  dot: {
    borderRadius: 7,
    height: 14,
    width: 14,
  },
});
