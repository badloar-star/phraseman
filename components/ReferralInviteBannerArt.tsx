import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, {
  cancelAnimation,
  Easing as REasing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import { LUM } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LinearGradient } from './SafeLinearGradient';

interface ReferralInviteBannerArtProps {
  /**
   * зачем: гибрид «Световод + Чекан» (владелец, 2026-08-16) — баннер въезжает
   * сверху ИЗ СВЕТА (opacity + y -14→0, LUM.settle, без отскока) и один раз
   * вспыхивает по кромке после появления (LUM.rimMs). Чисто декоративная
   * добавка поверх текущего вида — CTA/навигация живут в родителе
   * (app/(tabs)/settings.tsx) и этим пропом не затрагиваются. Default 'classic'
   * не меняет боевой вид.
   */
  motionVariant?: 'classic' | 'hybrid';
}

function ReferralInviteBannerArt({ motionVariant = 'hybrid' }: ReferralInviteBannerArtProps) {
  const { themeMode, theme } = useTheme();
  const isHybrid = motionVariant === 'hybrid';
  const reduceMotion = useReduceMotion();

  const entryOpacity = useSharedValue(0);
  const entryY = useSharedValue(-14);
  const rimOpacity = useSharedValue(0);
  useEffect(() => {
    if (!isHybrid) return;
    if (reduceMotion) {
      entryOpacity.value = 1;
      entryY.value = 0;
      rimOpacity.value = 0;
      return;
    }
    entryOpacity.value = withTiming(1, { duration: LUM.resolveMs, easing: REasing.out(REasing.cubic) });
    entryY.value = withSpring(0, LUM.settle);
    // Микро-перелив по кромке ОДИН РАЗ при появлении (после посадки листа).
    rimOpacity.value = withSequence(
      withTiming(0, { duration: LUM.resolveMs }),
      withTiming(1, { duration: 0 }),
      withTiming(0, { duration: LUM.rimMs, easing: REasing.linear }),
    );
    return () => {
      cancelAnimation(entryOpacity);
      cancelAnimation(entryY);
      cancelAnimation(rimOpacity);
    };
  }, [isHybrid, reduceMotion, entryOpacity, entryY, rimOpacity]);
  const hybridEntryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryY.value }],
  }));
  const rimStyle = useAnimatedStyle(() => ({ opacity: rimOpacity.value }));

  const content = (
    <View
      testID={`settings-invite-art-${themeMode}`}
      pointerEvents="none"
      style={[styles.root, { backgroundColor: theme.bgSurface2 }]}
    >
      {/* Векторный знак без старого тематического изображения. */}
      <View style={styles.fallback}>
        <Ionicons name="gift-outline" size={44} color={theme.accentText} />
      </View>
      {isHybrid && (
        // Перелив по кромке — тон/свет (LinearGradient), НЕ обводка: владелец
        // запрещает borderWidth/borderColor у контейнеров.
        <Reanimated.View pointerEvents="none" style={[styles.rimGlow, rimStyle]}>
          <LinearGradient
            colors={[`${theme.accent}55`, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>
      )}
    </View>
  );

  if (!isHybrid) return content;
  return <Reanimated.View style={hybridEntryStyle}>{content}</Reanimated.View>;
}

const styles = StyleSheet.create({
  root: { width: '100%', height: 132, overflow: 'hidden' },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  rimGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 48 },
});

export default memo(ReferralInviteBannerArt);

