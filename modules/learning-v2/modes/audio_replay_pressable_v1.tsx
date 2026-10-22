import React, { useCallback, useEffect } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { hapticLightImpact } from "../../../hooks/use-haptics";

const AUDIO_PRESS_HIT_SLOP = { top: 8, right: 8, bottom: 8, left: 8 } as const;

interface LearningV2AudioReplayPressablePropsV1
  extends Omit<PressableProps, "children" | "hitSlop" | "onPress" | "onPressIn" | "onPressOut" | "style"> {
  readonly children: React.ReactNode;
  readonly contentStyle: StyleProp<ViewStyle>;
  readonly onPress: (event: GestureResponderEvent) => void;
  readonly reducedMotion: boolean;
}

/** Shared hit target and visible press response for every Learning V2 audio replay control. */
export function LearningV2AudioReplayPressableV1({
  children,
  contentStyle,
  disabled = false,
  onPress,
  reducedMotion,
  testID = "learning-v2-audio-replay-button",
  ...pressableProps
}: LearningV2AudioReplayPressablePropsV1) {
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: reducedMotion ? 1 : 70 });
  }, [pressed, reducedMotion]);

  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: reducedMotion ? 1 : 110 });
  }, [pressed, reducedMotion]);

  const handlePress = useCallback((event: GestureResponderEvent) => {
    void hapticLightImpact();
    onPress(event);
  }, [onPress]);

  useEffect(() => () => cancelAnimation(pressed), [pressed]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.18,
    transform: [{ scale: reducedMotion ? 1 : 1 - pressed.value * 0.04 }],
  }));

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole={pressableProps.accessibilityRole ?? "button"}
      disabled={disabled}
      hitSlop={AUDIO_PRESS_HIT_SLOP}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={testID}
    >
      <Animated.View style={[contentStyle, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default LearningV2AudioReplayPressableV1;
