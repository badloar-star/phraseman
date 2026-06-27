// ════════════════════════════════════════════════════════════════════════════
// WelcomeSlides.tsx — приветствие-«знакомство» как ОТДЕЛЬНЫЙ экран-слайды.
//
// Полноэкранный поток поверх всего (Modal). По одному разделу на слайд:
// крупная РЕАЛЬНАЯ иконка-ассет раздела + заголовок + понятный текст. Листается
// «Далее»/свайпом, точки прогресса, «Пропустить». Анимация — плавный
// fade+slide между слайдами (Reanimated), последний шаг → плавный fade-out
// всего экрана при закрытии. БЕЗ координат/наведений → не ломается.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence,
  Easing, useReducedMotion, cancelAnimation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import { getWelcomeSlidesScriptBase, resolveSlideImage, type WelcomeSlide } from './welcome_slides';
import { resolveWelcomeSlides } from './welcome_copy_overrides';
import type { WelcomeBranch } from './welcome_gate';

interface Props {
  branch: WelcomeBranch;
  onClose: (completed: boolean) => void;
}

function readableTextOn(bg: string): string {
  let hex = bg.trim().replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6) return '#FFFFFF';
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#101014' : '#FFFFFF';
}

export default function WelcomeSlides({ branch, onClose }: Props) {
  const { theme: t, themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();

  const script = useMemo(() => resolveWelcomeSlides(branch, getWelcomeSlidesScriptBase(branch)), [branch]);
  // Линейный список «слайдов»: intro → разделы → финал.
  const items = useMemo<WelcomeSlide[]>(() => {
    const outro: WelcomeSlide = { id: 'outro', asset: { kind: 'image', from: 'compass' }, tone: '#7F77DD', title: script.outro.title, body: script.outro.body };
    return [script.intro, ...script.slides, outro];
  }, [script]);

  const [idx, setIdx] = useState(0);
  const last = idx >= items.length - 1;
  const item = items[idx]!;

  // Анимация смены слайда (fade + лёгкий сдвиг) + мягкий пульс иконки.
  const enter = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    enter.value = 0;
    enter.value = reduce ? 1 : withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [idx, reduce, enter]);

  useEffect(() => {
    if (reduce) { pulse.value = 0; return; }
    pulse.value = withRepeat(withSequence(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(pulse);
  }, [reduce, pulse]);

  const slideStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 14 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.05 }] }));

  const closedRef = React.useRef(false);
  // Закрытие: сразу размонтируем (onClose → branch=null) — Modal сам делает fade
  // через animationType="fade". НЕ держим Modal с opacity:0 (иначе невидимый
  // Pressable перехватит касания и экран «зависнет»).
  const close = useCallback((completed: boolean) => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose(completed);
  }, [onClose]);

  const next = useCallback(() => {
    hapticTap();
    if (last) { close(true); return; }
    setIdx((i) => i + 1);
  }, [last, close]);

  const accent = item.tone || t.accent || '#7F77DD';
  const onAccent = readableTextOn(accent);
  const img = resolveSlideImage(item.asset, themeMode);

  return (
    <Modal transparent visible statusBarTranslucent animationType="fade" onRequestClose={() => close(false)}>
      <View style={[styles.fill, { backgroundColor: t.bgPrimary }]}>
        {/* Тап в любом месте = следующий слайд (как в интро игр). */}
        <Pressable style={StyleSheet.absoluteFill} onPress={next} />

        <View style={[styles.body, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]} pointerEvents="box-none">
          <Animated.View style={[styles.slide, slideStyle]} pointerEvents="none">
            <Animated.View style={[styles.iconWrap, { backgroundColor: accent + '1F', borderColor: accent }, iconStyle]}>
              {img ? (
                <Image source={img} style={styles.iconImg} contentFit="contain" />
              ) : (
                <Ionicons name={(item.asset.kind === 'icon' ? item.asset.icon : 'star') as any} size={52} color={accent} />
              )}
            </Animated.View>
            <Text style={[styles.title, { color: t.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.bodyText, { color: t.textSecond }]}>{item.body}</Text>
          </Animated.View>

          <View style={styles.footer} pointerEvents="box-none">
            <View style={styles.dots}>
              {items.map((_, k) => (
                <View key={k} style={[styles.dot, k === idx ? { width: 20, backgroundColor: accent } : { backgroundColor: t.border }]} />
              ))}
            </View>
            <Pressable style={[styles.primaryBtn, { backgroundColor: accent }]} onPress={next}>
              <Text style={[styles.primaryTxt, { color: onAccent }]}>{last ? script.primaryStart : 'Дальше →'}</Text>
            </Pressable>
            {!last && (
              <Pressable style={styles.skipBtn} onPress={() => close(false)}>
                <Text style={[styles.skipTxt, { color: t.textMuted }]}>Пропустить</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, zIndex: 9000, elevation: 9000 },
  body: { flex: 1, paddingHorizontal: 26, justifyContent: 'space-between' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 132, height: 132, borderRadius: 36, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  iconImg: { width: 104, height: 104 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  bodyText: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  footer: { alignItems: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  primaryBtn: { width: '100%', maxWidth: 420, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  primaryTxt: { fontSize: 16, fontWeight: '800' },
  skipBtn: { paddingVertical: 12, marginTop: 2 },
  skipTxt: { fontSize: 14, fontWeight: '500' },
});
