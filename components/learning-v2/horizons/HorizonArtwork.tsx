import { useTheme } from "../../ThemeContext";
import { horizonPalette } from "./model";
import React, { memo, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useRuntimeActive } from "../../../hooks/use_runtime_active";
import { horizonLandscapeXml, horizonPortalXml } from "./art";

export const HorizonArtwork = memo(function HorizonArtwork({
  lesson,
  portal = false,
  // зачем: дефолт был `false`, и два из трёх вызовов проп не передавали — у них
  // анимация портала не играла НИКОГДА, хотя сторож вечных анимаций при этом
  // числил файл нарушителем. Дефолт `true` возвращает движение всем вызовам, а
  // за остановку в фоне теперь отвечает сам компонент (useRuntimeActive ниже),
  // а не добросовестность вызывающего.
  active = true,
  reducedMotion = true,
}: Readonly<{
  lesson: number;
  portal?: boolean;
  active?: boolean;
  reducedMotion?: boolean;
}>) {
  const { theme } = useTheme();
  const xml = useMemo(
    () =>
      portal ? horizonPortalXml(lesson, horizonPalette(lesson, theme)) : horizonLandscapeXml(lesson, true, horizonPalette(lesson, theme)),
    [lesson, portal, theme],
  );
  // зачем: вечная анимация (withRepeat(-1)) обязана замирать, когда экран не
  // виден или приложение ушло в фон — иначе она греет телефон на Главной и в
  // других вкладках. Раньше это зависело только от пропа `active`, который
  // передавал ОДИН вызов из трёх. Гейт живёт внутри компонента.
  const runtimeActive = useRuntimeActive();
  const float = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(float);
    float.value = 0;
    if (portal && active && runtimeActive && !reducedMotion) {
      float.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
    }
    return () => cancelAnimation(float);
  }, [active, float, portal, reducedMotion, runtimeActive]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <SvgXml xml={xml} width="100%" height="100%" />
      </Animated.View>
    </View>
  );
});
