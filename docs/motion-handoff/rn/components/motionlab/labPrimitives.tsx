// ════════════════════════════════════════════════════════════════════════════
// labPrimitives.tsx — общие детали Motion Lab: панель, награда, кнопка,
// оболочка тоста, частицы. Каждая деталь знает про три направления и
// анимируется ровно так, как в HTML-макете соответствующего направления.
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  type SharedValue,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import { EASE, IMPACT, LUMEN, METRO, type LabDirectionId, type Slow } from './labKit';

// ─── общее ──────────────────────────────────────────────────────────────────

export type LabCtx = Readonly<{
  dir: LabDirectionId;
  run: number;
  slow: Slow;
  reduce: boolean;
}>;

/** Тинт награды/тоста → цвет темы. */
export function tintColor(tint: string, t: ReturnType<typeof useTheme>['theme']): string {
  switch (tint) {
    case 'gold': return t.gold;
    case 'accent': return t.accent;
    case 'second': return t.textSecond;
    case 'wrong': return t.wrong;
    default: return t.accent;
  }
}

function alpha(hex: string, a: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const n = parseInt(clean, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export { alpha as labAlpha };

// ─── ЧАСТИЦЫ ────────────────────────────────────────────────────────────────

/** I «Чекан»: расходящееся кольцо ударной волны. */
export function ImpactRing({
  run, slow, reduce, index, size, color, delay = 0,
}: { run: number; slow: Slow; reduce: boolean; index: number; size: number; color: string; delay?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (reduce) return;
    const dur = 720 + index * 200;
    p.value = withDelay(slow.ms(delay + index * 80), withTiming(1, slow.t(dur, EASE.out)));
  }, [run, reduce, index, delay, p, slow]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.02, 1], [0, 0.8 - index * 0.3, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.5, 3.2 + index]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size, height: size, borderRadius: size / 2,
          borderWidth: 2, borderColor: color,
        },
        style,
      ]}
    />
  );
}

/** I «Чекан»: оседающая (или взлетающая) пыль. */
export function ImpactDust({
  run, slow, reduce, index, total, color, up = false, spread = 44, delay = 0,
}: {
  run: number; slow: Slow; reduce: boolean; index: number; total: number;
  color: string; up?: boolean; spread?: number; delay?: number;
}) {
  const p = useSharedValue(0);
  const angle = -Math.PI + (index / Math.max(1, total - 1)) * Math.PI;
  const dist = spread + (index % 5) * 18;
  const dx = Math.cos(angle) * dist;
  const dy = up ? -Math.abs(Math.sin(angle)) * 40 - 10 : Math.sin(angle) * dist * 0.5 + 36;

  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (reduce) return;
    p.value = withDelay(slow.ms(delay), withTiming(1, slow.t(860 + (index % 4) * 130, EASE.linear)));
  }, [run, reduce, index, delay, p, slow]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.05, 1], [0, 0.95, 0]),
    transform: [
      { translateX: interpolate(p.value, [0, 1], [0, dx]) },
      // вертикаль со сносом вниз: гравитация, а не прямая линия
      { translateY: interpolate(p.value, [0, 0.35, 1], [0, dy * 0.55, dy]) },
      { scale: interpolate(p.value, [0, 1], [1.05, 0.3]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: color }, style]}
    />
  );
}

/** II «Световод»: луч из источника. */
export function LumenBeam({
  run, slow, reduce, index, total, color, length, delay = 0,
}: {
  run: number; slow: Slow; reduce: boolean; index: number; total: number;
  color: string; length: number; delay?: number;
}) {
  const p = useSharedValue(0);
  const rot = (index / total) * 360;

  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (reduce) return;
    p.value = withDelay(slow.ms(delay + index * 22), withTiming(1, slow.t(920, EASE.out)));
  }, [run, reduce, index, delay, p, slow]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.3, 1], [0, 0.85, 0]),
    transform: [{ rotate: `${rot}deg` }, { scaleY: interpolate(p.value, [0, 1], [0.2, 1]) }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 1.5, height: length }, style]}>
      <LinearGradient
        colors={['transparent', color, 'transparent']}
        style={StyleSheet.absoluteFill as ViewStyle}
      />
    </Animated.View>
  );
}

/** II «Световод»: мотылёк света. */
export function LumenMote({
  run, slow, reduce, index, total, color, delay = 0,
}: { run: number; slow: Slow; reduce: boolean; index: number; total: number; color: string; delay?: number }) {
  const p = useSharedValue(0);
  const a = (index / total) * Math.PI * 2;
  const d = 56 + (index % 3) * 18;

  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (reduce) return;
    p.value = withDelay(slow.ms(delay + index * 30), withTiming(1, slow.t(1200, EASE.out)));
  }, [run, reduce, index, delay, p, slow]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.2, 1], [0, 0.9, 0]),
    transform: [
      { translateX: interpolate(p.value, [0, 1], [0, Math.cos(a) * d]) },
      { translateY: interpolate(p.value, [0, 1], [0, Math.sin(a) * d - 20]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }, style]}
    />
  );
}

// ─── ФОН ────────────────────────────────────────────────────────────────────

export function LabBackdrop({ dir, run, slow, reduce, tone = 'default' }: LabCtx & { tone?: 'default' | 'deep' }) {
  const p = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (reduce) { p.value = 1; return; }
    const ms = dir === 'impact' ? IMPACT.BACKDROP_MS : dir === 'lumen' ? 380 : 240;
    p.value = withTiming(1, slow.t(ms, EASE.out));
  }, [run, reduce, dir, p, slow]);

  const style = useAnimatedStyle(() => ({ opacity: p.value }));
  const bg =
    dir === 'impact' ? 'rgba(2,3,8,0.74)'
      : dir === 'lumen' ? (tone === 'deep' ? 'rgba(1,2,6,0.76)' : 'rgba(1,2,6,0.66)')
        : 'rgba(0,0,0,0.78)';

  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: bg }, style]} />;
}

/** II «Световод»: источник света за панелью. Загорается ПЕРВЫМ. */
export function LumenSource({
  run, slow, reduce, color, size = 340, fade = false, delay = 0,
}: { run: number; slow: Slow; reduce: boolean; color: string; size?: number; fade?: boolean; delay?: number }) {
  const o = useSharedValue(0);
  const s = useSharedValue(0.5);

  useEffect(() => {
    cancelAnimation(o); cancelAnimation(s);
    o.value = 0; s.value = 0.5;
    if (reduce) { o.value = fade ? 0.3 : 0.9; s.value = 1; return; }
    if (fade) {
      // единственная обратная динамика направления: вспыхнуть и угаснуть
      o.value = withDelay(slow.ms(delay), withTiming(1, slow.t(260, EASE.out)));
      s.value = withDelay(slow.ms(delay), withTiming(1.1, slow.t(260, EASE.out)));
      const after = slow.ms(delay + 260);
      o.value = withDelay(after, withTiming(0.3, slow.t(900, EASE.inOut)));
      s.value = withDelay(after, withTiming(0.82, slow.t(900, EASE.inOut)));
    } else {
      o.value = withDelay(slow.ms(delay), withTiming(0.9, slow.t(LUMEN.BLOOM_MS, EASE.out)));
      s.value = withDelay(slow.ms(delay), withTiming(1, slow.t(760, EASE.out)));
    }
  }, [run, reduce, fade, delay, o, s, slow]);

  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, alignSelf: 'center' },
        style,
      ]}
    >
      <LinearGradient
        colors={[alpha(color, 0.4), alpha(color, 0.12), 'transparent']}
        locations={[0, 0.34, 0.66]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: size / 2 }}
      />
    </Animated.View>
  );
}

// ─── ПАНЕЛЬ ─────────────────────────────────────────────────────────────────

/**
 * Вход панели по направлениям:
 *   I  — садится пружиной 165/15 из scale 0.94, потом вздрагивает от удара
 *   II — выходит ИЗ ГЛУБИНЫ: scale 1.06 → 1, посадка без отскока (damping 22)
 *   III— РАСКРЫВАЕТСЯ по вертикали за 420 мс, содержимое компенсирует scaleY
 */
export function LabPanel({
  dir, run, slow, reduce, children, variant = 'center', delay = 0, recoil,
}: LabCtx & {
  children: React.ReactNode;
  variant?: 'center' | 'sheet' | 'danger';
  delay?: number;
  /** Общий shared value отдачи (I): панель вздрагивает в момент удара. */
  recoil?: SharedValue<number>;
}) {
  const { theme: t } = useTheme();
  const op = useSharedValue(0);
  const sc = useSharedValue(dir === 'lumen' ? LUMEN.DEFOCUS : 0.94);
  const ty = useSharedValue(variant === 'sheet' ? (dir === 'lumen' ? LUMEN.SHIFT : 420) : dir === 'metro' ? 0 : 0);
  const open = useSharedValue(dir === 'metro' ? 0 : 1);
  const anticip = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(op); cancelAnimation(sc); cancelAnimation(ty);
    cancelAnimation(open); cancelAnimation(anticip);
    op.value = 0;
    sc.value = dir === 'lumen' ? LUMEN.DEFOCUS : 0.94;
    ty.value = variant === 'sheet' ? (dir === 'lumen' ? LUMEN.SHIFT : 420) : 0;
    open.value = dir === 'metro' ? 0 : 1;
    anticip.value = 0;

    if (reduce) { op.value = 1; sc.value = 1; ty.value = 0; open.value = 1; return; }

    if (dir === 'impact') {
      op.value = withDelay(slow.ms(delay), withTiming(1, slow.t(170, EASE.out)));
      sc.value = withDelay(slow.ms(delay), withSpring(1, slow.s(IMPACT.PANEL)));
      if (variant === 'sheet') ty.value = withDelay(slow.ms(delay + 40), withSpring(0, slow.s(IMPACT.PANEL)));
      if (variant === 'danger') {
        // единственная панель с замахом вверх: 140 мс, за которые глаз считывает «стоп»
        anticip.value = withDelay(
          slow.ms(delay + 60),
          withTiming(1, slow.t(140, EASE.inOut)),
        );
      }
    } else if (dir === 'lumen') {
      op.value = withDelay(slow.ms(delay + 180), withTiming(1, slow.t(LUMEN.RESOLVE_MS, EASE.out)));
      sc.value = withDelay(slow.ms(delay + 180), withSpring(1, slow.s(LUMEN.SETTLE)));
      if (variant === 'sheet') ty.value = withDelay(slow.ms(delay + 200), withSpring(0, slow.s(LUMEN.SETTLE)));
    } else {
      op.value = withDelay(slow.ms(delay + 120), withTiming(1, slow.t(120, EASE.linear)));
      sc.value = 1;
      open.value = withDelay(slow.ms(delay + 120), withTiming(1, slow.t(METRO.OPEN_MS, EASE.std)));
    }
  }, [run, reduce, dir, variant, delay, op, sc, ty, open, anticip, slow]);

  const outer = useAnimatedStyle(() => {
    const anticipY = interpolate(anticip.value, [0, 0.55, 1], [0, -8, 6]);
    return {
      opacity: op.value,
      transform: [
        { translateY: ty.value + anticipY + (recoil ? recoil.value : 0) },
        { scale: sc.value },
        ...(dir === 'metro' ? [{ scaleY: Math.max(0.02, open.value) }] : []),
      ],
    };
  });

  const inner = useAnimatedStyle(() =>
    dir === 'metro' ? { transform: [{ scaleY: 1 / Math.max(0.02, open.value) }], opacity: interpolate(open.value, [0.35, 1], [0, 1]) } : {},
  );

  const geo: ViewStyle =
    dir === 'impact'
      ? { borderRadius: variant === 'sheet' ? 0 : 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 0 }
      : dir === 'lumen'
        ? { borderRadius: variant === 'sheet' ? 0 : 28, borderTopLeftRadius: 30, borderTopRightRadius: 30 }
        : { borderRadius: variant === 'sheet' ? 0 : 18, borderTopLeftRadius: 20, borderTopRightRadius: 20 };

  const border =
    dir === 'lumen' ? alpha(t.accent, 0.14) : dir === 'metro' ? t.border : t.border;

  return (
    <Animated.View
      style={[
        {
          width: '100%',
          maxWidth: variant === 'sheet' ? undefined : dir === 'impact' ? 300 : dir === 'lumen' ? 302 : 304,
          alignSelf: 'center',
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: border,
          backgroundColor: t.bgCard,
          transformOrigin: dir === 'metro' ? 'top' : 'center',
        },
        geo,
        dir === 'metro'
          ? {}
          : {
            shadowColor: '#000',
            shadowOpacity: 0.6,
            shadowRadius: 26,
            shadowOffset: { width: 0, height: 20 },
            elevation: 18,
          },
        outer,
      ]}
    >
      <LinearGradient
        colors={dir === 'metro' ? [t.bgCard, t.bgCard] : t.cardGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill as ViewStyle}
      />
      <Animated.View style={inner}>{children}</Animated.View>
    </Animated.View>
  );
}

// ─── СТРОКА КОНТЕНТА ────────────────────────────────────────────────────────

/** Заголовок/подпись с каскадом по лестнице направления. */
export function LabLine({
  dir, run, slow, reduce, index, baseDelay, children, style,
}: LabCtx & { index: number; baseDelay: number; children: React.ReactNode; style?: ViewStyle }) {
  const p = useSharedValue(0);
  const ladder = dir === 'impact' ? IMPACT.LADDER : dir === 'lumen' ? LUMEN.LADDER : METRO.LADDER;
  const delay = baseDelay + (ladder[index] ?? ladder[ladder.length - 1]);

  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (reduce) { p.value = 1; return; }
    const ms = dir === 'impact' ? 250 : dir === 'lumen' ? 420 : METRO.TEXT_MS;
    p.value = withDelay(slow.ms(delay), withTiming(1, slow.t(ms, EASE.out)));
  }, [run, reduce, dir, delay, p, slow]);

  const anim = useAnimatedStyle(() => {
    if (dir === 'lumen') {
      return { opacity: p.value, transform: [{ scale: interpolate(p.value, [0, 1], [1.05, 1]) }] };
    }
    const shift = dir === 'impact' ? 12 : METRO.SHIFT;
    return { opacity: p.value, transform: [{ translateY: interpolate(p.value, [0, 1], [shift, 0]) }] };
  });

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** III «Метроном»: разделитель, который прочерчивается слева направо. */
export function LabRule({
  dir, run, slow, reduce, delay, accent = false,
}: LabCtx & { delay: number; accent?: boolean }) {
  const { theme: t } = useTheme();
  const p = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (reduce) { p.value = 1; return; }
    p.value = withDelay(slow.ms(delay), withTiming(1, slow.t(METRO.LINE_MS, EASE.out)));
  }, [run, reduce, delay, p, slow]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: p.value }] }));

  return (
    <Animated.View
      style={[
        {
          height: accent ? 2 : StyleSheet.hairlineWidth * 2,
          backgroundColor: accent ? t.accent : t.border,
          transformOrigin: 'left',
        },
        style,
      ]}
    />
  );
}

// ─── НАГРАДА ────────────────────────────────────────────────────────────────

export function LabReward({
  dir, run, slow, reduce, index, baseDelay, icon, label, value, tint,
}: LabCtx & { index: number; baseDelay: number; icon: string; label: string; value: string; tint: string }) {
  const { theme: t, f } = useTheme();
  const c = tintColor(tint, t);
  const p = useSharedValue(0);
  const ladder = dir === 'impact' ? IMPACT.LADDER : dir === 'lumen' ? LUMEN.LADDER : METRO.LADDER;
  const delay = baseDelay + (ladder[index] ?? ladder[ladder.length - 1]);

  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (reduce) { p.value = 1; return; }
    if (dir === 'impact') p.value = withDelay(slow.ms(delay), withSpring(1, slow.s(IMPACT.ROW)));
    else if (dir === 'lumen') p.value = withDelay(slow.ms(delay), withTiming(1, slow.t(400, EASE.out)));
    else p.value = withDelay(slow.ms(delay), withTiming(1, slow.t(METRO.TEXT_MS, EASE.out)));
  }, [run, reduce, dir, delay, p, slow]);

  const anim = useAnimatedStyle(() => {
    if (dir === 'impact') return { opacity: p.value, transform: [{ translateX: interpolate(p.value, [0, 1], [-14, 0]) }] };
    if (dir === 'lumen') return { opacity: p.value, transform: [{ scale: interpolate(p.value, [0, 1], [1.04, 1]) }] };
    return { opacity: p.value, transform: [{ translateY: interpolate(p.value, [0, 1], [METRO.SHIFT, 0]) }] };
  });

  if (dir === 'metro') {
    return (
      <Animated.View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 11 }, anim]}>
        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: c, fontSize: f.body, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row', alignItems: 'center', gap: 10,
          borderRadius: dir === 'lumen' ? 16 : 14,
          paddingHorizontal: 11, paddingVertical: 9, marginTop: 8,
          backgroundColor: dir === 'lumen' ? alpha(c, 0.07) : 'rgba(255,255,255,0.035)',
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: dir === 'lumen' ? alpha(c, 0.17) : t.border,
        },
        anim,
      ]}
    >
      <View
        style={{
          width: 30, height: 30, borderRadius: dir === 'lumen' ? 15 : 10,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: alpha(c, 0.16),
          borderWidth: StyleSheet.hairlineWidth * 2, borderColor: alpha(c, 0.3),
        }}
      >
        <Text style={{ fontSize: 14 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</Text>
        <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700', marginTop: 1 }}>{value}</Text>
      </View>
    </Animated.View>
  );
}

// ─── КНОПКА ─────────────────────────────────────────────────────────────────

export function LabCta({
  dir, run, slow, reduce, delay, label, tone = 'primary',
}: LabCtx & { delay: number; label: string; tone?: 'primary' | 'ghost' | 'danger' }) {
  const { theme: t, f } = useTheme();
  const p = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (reduce) { p.value = 1; return; }
    const ms = dir === 'impact' ? 240 : dir === 'lumen' ? 400 : METRO.TEXT_MS;
    p.value = withDelay(slow.ms(delay), withTiming(1, slow.t(ms, EASE.out)));
  }, [run, reduce, dir, delay, p, slow]);

  const anim = useAnimatedStyle(() => {
    if (dir === 'lumen') return { opacity: p.value };
    return { opacity: p.value, transform: [{ translateY: interpolate(p.value, [0, 1], [dir === 'impact' ? 14 : METRO.SHIFT, 0]) }] };
  });

  const bg = tone === 'ghost' ? 'transparent' : tone === 'danger' ? t.wrong : t.accent;
  const fg = tone === 'ghost' ? t.textMuted : tone === 'danger' ? '#FFFFFF' : t.correctText;

  return (
    <Animated.View
      style={[
        {
          borderRadius: dir === 'metro' ? 0 : dir === 'lumen' ? 17 : 15,
          paddingVertical: 13,
          alignItems: 'center',
          backgroundColor: bg,
          borderWidth: tone === 'ghost' ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: t.border,
          marginTop: dir === 'metro' ? 0 : 15,
          flex: dir === 'metro' ? 1 : undefined,
        },
        anim,
      ]}
    >
      <Text style={{ color: fg, fontSize: f.caption + 1, fontWeight: dir === 'metro' ? '700' : '900' }}>{label}</Text>
    </Animated.View>
  );
}
