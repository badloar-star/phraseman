import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient as SvgLinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from '../SafeLinearGradient';
import { hapticTap } from '../../hooks/use-haptics';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type V2TabBarItem = Readonly<{
  key: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
}>;

// зачем: размеры сняты с референса владельца 24.09 и утверждены на макете
// docs/design/tabbar/tabbar-variants.html (вариант «В · Тёплая кромка»).
export const V2_TAB_BAR_HEIGHT = 66;
const PAD = 9;
const CAP_H = V2_TAB_BAR_HEIGHT - PAD * 2;
const CAP_RADIUS = 18;
const SIDE_MARGIN = 12;
const ICON_SIZE = 20;
const HOLD_TO_DRAG_MS = 170;
const DRAG_SLOP = 8;
const COLOR = { idle: '#8D8A87', on: '#F6E9DA', hover: '#D5CEC6' } as const;
// зачем: на Android BlurView без экспериментального режима ничего не размывает,
// а экспериментальный режим пересчитывается каждый кадр скролла. Поэтому там
// та же тёмная стеклянная заливка, но плотнее — текст под капсулой не читается
// (владелец: «прозрачный с затемнением, не насквозь»).
const GLASS_FILL = Platform.OS === 'ios'
  ? (['rgba(42,40,38,0.64)', 'rgba(18,17,16,0.76)'] as const)
  : (['rgba(42,40,38,0.90)', 'rgba(18,17,16,0.94)'] as const);
const CAP_SPRING = { stiffness: 260, damping: 19, mass: 1, useNativeDriver: true } as const;
// Слежение за пальцем: быстро, без перелёта — капсула «едет» за ним, а не прыгает.
const CAP_FOLLOW_SPRING = { stiffness: 700, damping: 48, mass: 0.7, useNativeDriver: true } as const;
const ACTIVATE_ACTION = [{ name: 'activate' as const }];

type Gesture = { x0: number; idx: number; moved: boolean; timer: ReturnType<typeof setTimeout> | null };

type Props = {
  items: readonly V2TabBarItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onInteract?: () => void;
  bottomOffset: number;
  collapseStyle?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  reduceMotion: boolean;
};

const BarRim = memo(function BarRim({ width }: { width: number }) {
  const h = V2_TAB_BAR_HEIGHT;
  return (
    <Svg pointerEvents="none" width={width} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id="v2TabRim" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFE2BE" stopOpacity={0.62} />
          <Stop offset="0.22" stopColor="#FFECD6" stopOpacity={0.24} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.1} />
          <Stop offset="0.8" stopColor="#FFFFFF" stopOpacity={0.08} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.24} />
        </SvgLinearGradient>
      </Defs>
      <Rect x={0.5} y={0.5} width={width - 1} height={h - 1} rx={(h - 1) / 2} fill="none" stroke="url(#v2TabRim)" strokeWidth={1} />
    </Svg>
  );
});

const CapFill = memo(function CapFill({ width }: { width: number }) {
  return (
    <Svg width={width} height={CAP_H} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="v2TabCapFill" cx="22%" cy="0%" rx="120%" ry="95%" fx="22%" fy="0%">
          <Stop offset="0" stopColor="#FFE8CC" stopOpacity={0.32} />
          <Stop offset="0.55" stopColor="#FFECD6" stopOpacity={0.08} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.03} />
        </RadialGradient>
        <SvgLinearGradient id="v2TabCapRim" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE4C4" stopOpacity={0.8} />
          <Stop offset="0.5" stopColor="#FFECD6" stopOpacity={0.14} />
          <Stop offset="1" stopColor="#FFECD6" stopOpacity={0.32} />
        </SvgLinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={CAP_H} rx={CAP_RADIUS} fill="url(#v2TabCapFill)" />
      <Rect x={0.5} y={0.5} width={width - 1} height={CAP_H - 1} rx={CAP_RADIUS - 0.5} fill="none" stroke="url(#v2TabCapRim)" strokeWidth={1} />
    </Svg>
  );
});

/**
 * Плавающая стеклянная капсула таббара 2.0. Капсула активного пункта едет
 * пружиной; её можно зажать (или сразу повести пальцем) и перетащить — где
 * отпустил, та вкладка и открывается.
 */
function V2TabBar({ items, activeIndex, onSelect, onInteract, bottomOffset, collapseStyle, reduceMotion }: Props) {
  const count = items.length;
  const [width, setWidth] = useState(0);
  const slotW = width > 0 ? (width - PAD * 2) / count : 0;
  const capX = useRef(new Animated.Value(0)).current;
  const capLift = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;
  const [pressedIdx, setPressedIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const placedRef = useRef(false);
  const draggingRef = useRef(false);
  const dragLeftRef = useRef(0);
  // Куда капсула сейчас едет/стоит — чтобы эффект не перезапускал ту же пружину.
  const targetLeftRef = useRef(0);
  const gestureRef = useRef<Gesture | null>(null);
  // Обработчики жеста создаются один раз — свежие значения читают отсюда.
  const live = useRef({ slotW, count, onSelect, onInteract, reduceMotion });
  live.current = { slotW, count, onSelect, onInteract, reduceMotion };

  const travelTo = (left: number) => {
    targetLeftRef.current = left;
    if (live.current.reduceMotion) {
      capX.setValue(left);
      return;
    }
    Animated.spring(capX, { toValue: left, ...CAP_SPRING }).start(); // guard-ok: useNativeDriver в CAP_SPRING
  };

  useEffect(() => {
    if (slotW <= 0 || activeIndex < 0 || draggingRef.current) return;
    const to = PAD + activeIndex * slotW;
    // Первый кадр — капсула сразу на месте (стабильная геометрия), дальше едет пружиной.
    if (!placedRef.current) {
      capX.setValue(to);
      targetLeftRef.current = to;
      placedRef.current = true;
      return;
    }
    // Тап уже запустил переезд к этой вкладке — не перезапускаем пружину.
    if (Math.abs(targetLeftRef.current - to) < 0.5) return;
    travelTo(to);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, slotW]);

  const pressIn = useCallback((idx: number) => {
    setPressedIdx(idx);
    pressAnim.stopAnimation();
    if (live.current.reduceMotion) pressAnim.setValue(0);
    else Animated.spring(pressAnim, { toValue: 1, speed: 34, bounciness: 0, useNativeDriver: true }).start();
    hapticTap();
  }, [pressAnim]);

  const pressOut = useCallback(() => {
    pressAnim.stopAnimation();
    if (live.current.reduceMotion) {
      pressAnim.setValue(0);
      setPressedIdx(null);
      return;
    }
    Animated.spring(pressAnim, { toValue: 0, speed: 28, bounciness: 4, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setPressedIdx(null);
    });
  }, [pressAnim]);

  const clampIdx = (i: number) => Math.max(0, Math.min(live.current.count - 1, i));
  const setLift = (on: boolean) => {
    Animated.spring(capLift, on
      ? { toValue: 1, speed: 30, bounciness: 0, useNativeDriver: true }
      : { toValue: 0, speed: 24, bounciness: 4, useNativeDriver: true }).start();
  };

  const followFinger = (fingerX: number) => {
    const { slotW: sw, count: n } = live.current;
    const left = Math.max(PAD, Math.min(PAD + (n - 1) * sw, fingerX - sw / 2));
    dragLeftRef.current = left;
    targetLeftRef.current = left;
    // Капсула догоняет палец быстрой пружиной — едет за ним, а не телепортируется.
    Animated.spring(capX, { toValue: left, ...CAP_FOLLOW_SPRING }).start(); // guard-ok: useNativeDriver в CAP_FOLLOW_SPRING
    const near = clampIdx(Math.round((left - PAD) / sw));
    setHoverIdx((prev) => (prev === near ? prev : near));
  };

  // зачем (владелец 24.09: «при НАЖАТИИ капсула должна переехать, а не прыгнуть»):
  // раньше удержание 0,17 с сразу ставило капсулу под палец. На загруженном JS
  // таймер срабатывал раньше отпускания, и обычный тап превращался в рывок.
  // Теперь удержание только приподнимает капсулу на месте; за пальцем она идёт
  // лишь когда палец реально сдвинулся, иначе это тап — и она плавно переезжает.
  const grab = () => {
    if (draggingRef.current) return;
    draggingRef.current = true;
    dragLeftRef.current = targetLeftRef.current;
    pressOut();
    hapticTap();
    setLift(true);
  };

  const tapSelect = (idx: number) => {
    // Переезд стартует прямо в обработчике касания, до тяжёлой перерисовки экрана вкладки.
    travelTo(PAD + idx * live.current.slotW);
    live.current.onSelect(idx);
  };

  const endGesture = (cancelled: boolean) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g) return;
    if (g.timer) clearTimeout(g.timer);
    if (draggingRef.current) {
      draggingRef.current = false;
      setHoverIdx(null);
      setLift(false);
      if (!g.moved) {
        if (cancelled) travelTo(targetLeftRef.current);
        else tapSelect(g.idx);
        return;
      }
      const target = clampIdx(Math.round((dragLeftRef.current - PAD) / live.current.slotW));
      travelTo(PAD + target * live.current.slotW);
      live.current.onSelect(target);
      return;
    }
    pressOut();
    if (!cancelled) tapSelect(g.idx);
  };

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    // Пока капсулу тащат, жест у таббара не отбирают.
    onPanResponderTerminationRequest: () => !draggingRef.current,
    onPanResponderGrant: (e) => {
      if (live.current.slotW <= 0) return;
      const x0 = e.nativeEvent.locationX;
      const idx = clampIdx(Math.floor((x0 - PAD) / live.current.slotW));
      live.current.onInteract?.();
      pressIn(idx);
      const g: Gesture = { x0, idx, moved: false, timer: null };
      g.timer = setTimeout(() => {
        if (gestureRef.current === g) grab();
      }, HOLD_TO_DRAG_MS);
      gestureRef.current = g;
    },
    onPanResponderMove: (_e, gs) => {
      const g = gestureRef.current;
      if (!g) return;
      if (!g.moved && Math.abs(gs.dx) > DRAG_SLOP) {
        g.moved = true;
        if (g.timer) clearTimeout(g.timer);
        grab();
      }
      if (g.moved) followFinger(g.x0 + gs.dx);
    },
    onPanResponderRelease: () => endGesture(false),
    onPanResponderTerminate: () => endGesture(true),
  })).current;

  const handleLayout = useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), []);
  const capScale = capLift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const capBright = capLift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] });
  const iconPressScale = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] });

  return (
    <Animated.View
      testID="v2-tab-bar"
      onLayout={handleLayout}
      style={[s.bar, { bottom: bottomOffset }, collapseStyle]}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={s.clip}>
        {Platform.OS === 'ios' ? <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={GLASS_FILL} style={StyleSheet.absoluteFill} />
        <View style={s.innerRim} />
      </View>
      {width > 0 ? <BarRim width={width} /> : null}
      {slotW > 0 && activeIndex >= 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[s.cap, { width: slotW, transform: [{ translateX: capX }, { scale: capScale }] }]}
        >
          <CapFill width={slotW} />
          <Animated.View style={[s.capBright, { opacity: capBright }]} />
        </Animated.View>
      ) : null}
      {/* Касания ловит сама капсула (координата от её края), пункты — только вид и доступность. */}
      <View pointerEvents="none" style={s.row}>
        {items.map((item, i) => {
          const on = i === activeIndex;
          const color = on ? COLOR.on : hoverIdx === i ? COLOR.hover : COLOR.idle;
          return (
            <View
              key={item.key}
              testID={`tab-${item.key}`}
              style={s.tab}
              accessible
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: on }}
              accessibilityActions={ACTIVATE_ACTION}
              onAccessibilityAction={() => onSelect(i)}
            >
              <Animated.View style={pressedIdx === i ? { transform: [{ scale: iconPressScale }] } : null}>
                <Ionicons name={on ? item.activeIcon : item.icon} size={ICON_SIZE} color={color} />
              </Animated.View>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
                style={[s.label, { color, fontWeight: on ? '600' : '500' }]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default memo(V2TabBar);

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: SIDE_MARGIN,
    right: SIDE_MARGIN,
    height: V2_TAB_BAR_HEIGHT,
    borderRadius: V2_TAB_BAR_HEIGHT / 2,
    // Android рисует тень elevation только у вида с фоном.
    backgroundColor: Platform.OS === 'android' ? '#141312' : 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 20, // guard-ok: только iOS, на Android тень даёт elevation
    elevation: 14,
  },
  clip: { ...StyleSheet.absoluteFillObject, borderRadius: V2_TAB_BAR_HEIGHT / 2, overflow: 'hidden' },
  innerRim: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: V2_TAB_BAR_HEIGHT / 2 - 5,
    borderWidth: 1, // guard-ok: D43 вторая кромка «толщины стекла», как на референсе
    borderColor: 'rgba(255,255,255,0.045)', // guard-ok: D43
  },
  cap: {
    position: 'absolute',
    top: PAD,
    left: 0,
    height: CAP_H,
    borderRadius: CAP_RADIUS,
    shadowColor: '#FFD2A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 11,
  },
  capBright: { ...StyleSheet.absoluteFillObject, borderRadius: CAP_RADIUS, backgroundColor: '#FFFFFF' },
  row: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', paddingHorizontal: PAD },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 10.5, lineHeight: 13, letterSpacing: -0.1 },
});
