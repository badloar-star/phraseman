import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTournamentPalette } from '../ui/v2_theme';
import { SUITE } from '../../constants/motionHybrid';
import { ArenaStarGlyph } from './ArenaStarGlyph';
import { noAndroidOutline } from '../../constants/androidGlow';

/**
 * Тост на хабе: «Одна победа до {ранга}» — сцена H принятого макета
 * phraseman-arena-stars.html (владелец, 2026-08-23).
 *
 * Показывается при 2/3 звёзд: подъём 12px + fade, пустой третий слот
 * подмигивает ОДИН раз тёплым нимбом (не вечный цикл), автоуход через 2.8s.
 * Не звучит. Частоту показа (раз в день) сторожит вызывающий экран.
 */
export function ArenaNextRankToast({ label, visible, reduceMotion, onDone, bottomOffset = 0 }: Readonly<{
  label: string;
  visible: boolean;
  reduceMotion: boolean;
  onDone: () => void;
  /** Подъём над плавающим таббаром: тост не должен прятаться под ним. */
  bottomOffset?: number;
}>) {
  const P = useTournamentPalette();
  const opacity = useSharedValue(0);
  const y = useSharedValue(12);
  const winkScale = useSharedValue(1);
  const winkHalo = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      opacity.value = 1; y.value = 0;
      const quickTimer = setTimeout(onDone, 2800);
      return () => clearTimeout(quickTimer);
    }
    opacity.value = withDelay(600, withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }));
    y.value = withDelay(600, withSpring(0, SUITE.pulse));
    winkScale.value = withDelay(980, withSequence(
      withTiming(1.18, { duration: 150, easing: Easing.inOut(Easing.ease) }),
      withTiming(1, { duration: 230, easing: Easing.inOut(Easing.ease) }),
    ));
    winkHalo.value = withDelay(980, withSequence(
      withTiming(0.4, { duration: 0 }),
      withTiming(0, { duration: 520, easing: Easing.linear }),
    ));
    const hideTimer = setTimeout(() => {
      // Выход короче входа (закон №15).
      opacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
      y.value = withTiming(8, { duration: 200, easing: Easing.out(Easing.quad) });
    }, 3400);
    const doneTimer = setTimeout(onDone, 3650);
    return () => {
      clearTimeout(hideTimer); clearTimeout(doneTimer);
      cancelAnimation(opacity); cancelAnimation(y);
      cancelAnimation(winkScale); cancelAnimation(winkHalo);
    };
    // зачем: хореография собирается один раз на показ тоста.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
  const winkStyle = useAnimatedStyle(() => ({ transform: [{ scale: winkScale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: winkHalo.value }));

  if (!visible) return null;
  return (
    <Reanimated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
      style={[styles.toast, { backgroundColor: P.elev, bottom: 18 + bottomOffset }, noAndroidOutline, style]}
    >
      <View style={styles.pips}>
        <ArenaStarGlyph lit size={17} glow={false} />
        <ArenaStarGlyph lit size={17} glow={false} />
        <View style={styles.winkWrap}>
          <Reanimated.View pointerEvents="none" style={[styles.winkHalo, haloStyle]} />
          <Reanimated.View style={winkStyle}>
            <ArenaStarGlyph lit={false} size={17} />
          </Reanimated.View>
        </View>
      </View>
      <Text style={[styles.text, { color: P.text }]} numberOfLines={1}>{label}</Text>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 17, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  pips: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  winkWrap: { alignItems: 'center', justifyContent: 'center' },
  winkHalo: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFD43B', opacity: 0 },
  text: { flex: 1, fontSize: 13.5, fontWeight: '800' },
});
