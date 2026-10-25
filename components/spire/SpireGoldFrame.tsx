/**
 * [SPIRE-GOLD] Рамка «золотого задания» вокруг задания ступени (ТЗ docs/work/tasks/spire-engagement-2026-10-25.md §3,
 * живой макет docs/design/v2-app/spire-step-live.html, сцена «Золотое задание ×2»; вид «золото — цвет темы»).
 *
 * зачем (владелец 25.10, координатор 25.10): плита задания наливается цветом темы (300 мс), тонкая полупрозрачная кромка и
 * мягкое свечение (стиль 2.0 разрешает hairline), один блик 600 мс linear, «×2» выходит из 0,9 (180 мс, задержка 120 мс).
 * Верно с первой попытки: «×2» вспыхивает 0,95 → 1,04 → 1 за 260 мс, кольцо-волна расходится 460 мс. Без вечных циклов, всё на
 * UI-треде, «Уменьшить движение» — без блика и масштаба, только прозрачность. Раскладка задания не сдвигается: слои
 * абсолютные, касания проходят к заданию. «Тёплое золото» — позже, сменой токена (координатор 25.10).
 */
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { lv2Alpha } from '../learning-v2/LearningV2Glass';
import { useSpirePalette } from './useSpirePalette';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function SpireGoldFrame({ active, hit, children }: Readonly<{ active: boolean; hit: boolean; children: React.ReactNode }>) {
  const p = useSpirePalette();
  const reduce = useReducedMotion();
  const fill = useSharedValue(0);
  const badge = useSharedValue(0);
  const shine = useSharedValue(0);
  const pulse = useSharedValue(1);
  const ring = useSharedValue(0);
  const width = useSharedValue(0);

  useEffect(() => {
    if (!active) { fill.value = 0; badge.value = 0; return; }
    fill.value = withTiming(1, { duration: 300, easing: EASE_OUT });
    badge.value = withDelay(120, withTiming(1, { duration: 180, easing: EASE_OUT }));
    shine.value = 0;
    if (!reduce) shine.value = withDelay(300, withTiming(1, { duration: 600, easing: Easing.linear }));
  }, [active, badge, fill, reduce, shine]);

  useEffect(() => {
    if (!active || !hit) return;
    if (reduce) return;
    pulse.value = withSequence(
      withTiming(0.95, { duration: 65, easing: EASE_OUT }),
      withTiming(1.04, { duration: 117, easing: EASE_OUT }),
      withTiming(1, { duration: 78, easing: EASE_OUT }),
    );
    ring.value = 0;
    ring.value = withTiming(1, { duration: 460, easing: EASE_OUT });
  }, [active, hit, pulse, reduce, ring]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value > 0 && shine.value < 1 ? 1 : 0,
    transform: [{ translateX: (shine.value * 2.2 - 1.1) * width.value }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badge.value,
    transform: [{ scale: reduce ? 1 : (0.9 + 0.1 * badge.value) * pulse.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value > 0 && ring.value < 1 ? 0.45 * (1 - ring.value) : 0,
    transform: [{ scale: 1 + 0.7 * ring.value }],
  }));
  const onLayout = (e: LayoutChangeEvent): void => { width.value = e.nativeEvent.layout.width; };

  if (!active) return <>{children}</>;
  return (
    <View onLayout={onLayout} testID="spire-gold-frame">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.plate, { borderColor: lv2Alpha(p.accentGraphic, 0.3), shadowColor: p.accentGraphic }, fillStyle]}> {/* guard-ok: hairline 30 % — исключение 2.0 */}
        <LinearGradient colors={[lv2Alpha(p.accentGraphic, 0.22), lv2Alpha(p.accentGraphic, 0)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, s.round]} />
        <View style={[StyleSheet.absoluteFill, s.round, s.clip]}>
          <Animated.View style={[s.shine, shineStyle]}>
            <LinearGradient colors={['transparent', lv2Alpha(p.text, 0.18), 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      </Animated.View>
      {children}
      <Animated.View pointerEvents="none" style={[s.badge, { backgroundColor: p.accentGraphic }, badgeStyle]} testID="spire-gold-x2" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Animated.View style={[StyleSheet.absoluteFill, s.ring, { backgroundColor: p.accentGraphic }, ringStyle]} />
        <Text style={[s.badgeText, { color: p.bg }]}>×2</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  round: { borderRadius: 20 },
  clip: { overflow: 'hidden' },
  plate: { margin: -6, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } }, // guard-ok: hairline полупрозрачная кромка — исключение PhraseMan 2.0 (владелец 24.09), как --goldEdge макета
  shine: { position: 'absolute', top: 0, bottom: 0, width: '45%' },
  badge: { position: 'absolute', top: -14, right: 8, height: 30, minWidth: 46, paddingHorizontal: 10, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  ring: { borderRadius: 17 },
  badgeText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
});

export default memo(SpireGoldFrame);
