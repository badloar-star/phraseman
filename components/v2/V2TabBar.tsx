import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  PixelRatio,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import { alphaHex } from '../../constants/v2Style';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { DebugLogger } from '../../app/debug-logger';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { TAB_BAR_PAD, TAB_BAR_SIDE_MARGIN, V2_TAB_BAR_HEIGHT, computeTabBarGeometry, tabCapRightFits } from './tab_bar_geometry';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type V2TabBarItem = Readonly<{
  key: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
  /** Точка «есть новое» (макет system.html: 8px, белая, с кольцом цвета капсулы). */
  badge?: boolean;
}>;

// зачем: размеры сняты с референса владельца 24.09 и утверждены на макете
// docs/design/tabbar/tabbar-variants.html (вариант «В · Тёплая кромка»).
// зачем (владелец 15.10): значение живёт в tab_bar_geometry — от него считают верх капсулы скролл-отступ, тосты и доки; здесь только повторный экспорт для прежних импортов
export { V2_TAB_BAR_HEIGHT };
const PAD = TAB_BAR_PAD;
const CAP_H = V2_TAB_BAR_HEIGHT - PAD * 2;
const CAP_RADIUS = 18;
// зачем: запас от краёв холста SVG, чтобы рамка плашки не резалась на округлении ширины (см. CapFill).
const CAP_EDGE_INSET = 1.5;
const SIDE_MARGIN = TAB_BAR_SIDE_MARGIN;
// зачем: подписи убраны по просьбе владельца 29.09 — иконка занимает место текста и крупнее (капсула 48dp).
const ICON_SIZE = 28;
const HOLD_TO_DRAG_MS = 170;
const DRAG_SLOP = 8;
// зачем: на Android BlurView без экспериментального режима ничего не размывает,
// а экспериментальный режим пересчитывается каждый кадр скролла. Поэтому там
// та же тёмная стеклянная заливка, но плотнее — текст под капсулой не читается
// (владелец: «прозрачный с затемнением, не насквозь»).
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

// зачем (владелец 12.10, стиль «Тень» + сверка снимков 6b3890202): у таб-бара НЕТ обводок — ни SVG-ободка капсулы, ни второй кромки, ни рамки вокруг активной
// вкладки. Капсулу отделяют тон заливки (стекло темы + плашка активной вкладки) и внешняя тень бара.
const RIM_SHEEN = '#FFFFFF'; // theme-exempt: белый блик кромки и заливки плашки таб-бара — как на утверждённом варианте «В · Тёплая кромка»

const CapFill = memo(function CapFill({ width, color }: { width: number; color: string }) {
  return (
    <Svg width={width} height={CAP_H} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="v2TabCapFill" cx="22%" cy="0%" rx="120%" ry="95%" fx="22%" fy="0%">
          {/* зачем: заливка плашки не гаснет к правому краю (было 0.03) — минимум 0.10, иначе плашка выглядит срезанной справа */}
          <Stop offset="0" stopColor={color} stopOpacity={0.32} />
          <Stop offset="0.55" stopColor={color} stopOpacity={0.16} />
          <Stop offset="1" stopColor={RIM_SHEEN} stopOpacity={0.1} />
        </RadialGradient>
      </Defs>
      {/* зачем (владелец 11.10, 8-й раз: «капсула обрезается справа»; виден на кадре эмулятора 09:35 — у плашки активной вкладки пропадает ПРАВАЯ рамка):
          Android округляет ширину холста SVG вниз до целого пикселя (73,9 dp × 2,625 = 193,95 px → 193), а рамка 1 dp лежала ровно на краю — правая линия
          и закругления обрезались, плашка выглядела срезанной. Рисуем с запасом CAP_EDGE_INSET (≥1 пикселя целого холста) от всех краёв. */}
      <Rect x={CAP_EDGE_INSET} y={CAP_EDGE_INSET} width={width - CAP_EDGE_INSET * 2} height={CAP_H - CAP_EDGE_INSET * 2} rx={CAP_RADIUS - CAP_EDGE_INSET} fill="url(#v2TabCapFill)" />
    </Svg>
  );
});

/**
 * Плавающая стеклянная капсула таббара 2.0. Капсула активного пункта едет
 * пружиной; её можно зажать (или сразу повести пальцем) и перетащить — где
 * отпустил, та вкладка и открывается.
 */
function V2TabBar({ items, activeIndex, onSelect, onInteract, bottomOffset, collapseStyle, reduceMotion }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const palette = liquidGlassTokens(liquidGlassThemeId);
  const glassFill = useMemo(() => Platform.OS === 'ios'
    ? ([alphaHex(palette.opaqueControl, 0.64), alphaHex(palette.bgBottom, 0.76)] as const)
    : ([alphaHex(palette.opaqueControl, 0.90), alphaHex(palette.bgBottom, 0.94)] as const),
  [palette.opaqueControl, palette.bgBottom]);
  const count = items.length;
  // зачем (владелец 11.10, «кнопки справа обрезаны»): боковые отступы считаем от ширины ОКНА и безопасных зон слева/справа, а капсула
  // не шире окна — даже если родитель по какой-то причине шире экрана. Реальная геометрия пишется в журнал [TABBAR].
  const { width: windowWidth } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const geo = computeTabBarGeometry({ windowWidth, insetLeft: insets.left, insetRight: insets.right, count });
  const barRef = useRef<View>(null);
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
    capX.stopAnimation(); // зачем: старая пружина не должна тянуть плашку назад, пока стартует новая
    if (live.current.reduceMotion) {
      capX.setValue(left);
      return;
    }
    Animated.spring(capX, { toValue: left, ...CAP_SPRING }).start(); // guard-ok: useNativeDriver в CAP_SPRING
  };

  // зачем (Сверка 11.10: «кусок мятной заливки слева у ▶ на вкладках Сообщество/Настройки — хвост анимации плашки?»): когда меняется ШИРИНА слота
  // (появилась/исчезла вкладка, повернули экран, сменился шрифт), пружина шла бы из старой геометрии и плашка на кадры оставалась между вкладками.
  // Тогда плашка ставится на место сразу, а незавершённая пружина гасится; пружина ездит только при смене вкладки.
  const lastSlotWRef = useRef(0);
  useEffect(() => {
    if (slotW <= 0 || activeIndex < 0 || draggingRef.current) return;
    const to = PAD + activeIndex * slotW;
    const slotChanged = lastSlotWRef.current > 0 && Math.abs(lastSlotWRef.current - slotW) > 0.5;
    lastSlotWRef.current = slotW;
    if (slotChanged) {
      capX.stopAnimation();
      capX.setValue(to);
      targetLeftRef.current = to;
      placedRef.current = true;
      DebugLogger.info('[TABBAR]', `cap: ширина слота изменилась → плашка на месте сразу to=${Math.round(to * 10) / 10} slotW=${Math.round(slotW * 10) / 10} activeIndex=${activeIndex}`);
      return;
    }
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

  // зачем (владелец 04.10: «на таббаре не должно быть обрезано ничего», скриншот капсулы):
  // в коде у капсулы нет обрезающего родителя — СПЕРВА лог реальной геометрии, потом починка.
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    const slot = w > 0 ? (w - PAD * 2) / count : 0;
    const fits = tabCapRightFits(w, slot, Math.max(0, activeIndex));
    // зачем: журнал нужен и в релизе (баг владельца со скриншота) — один короткий ряд на изменение раскладки, без спама
    const snapshot = {
      windowW: Math.round(windowWidth * 10) / 10, fontScale: PixelRatio.getFontScale(), pixelRatio: PixelRatio.get(),
      insetL: insets.left, insetR: insets.right, count, activeIndex,
      barX: Math.round(e.nativeEvent.layout.x * 10) / 10, barW: Math.round(w * 10) / 10, barH: h, expectedH: V2_TAB_BAR_HEIGHT,
      expectedW: Math.round(geo.width * 10) / 10, slotW: Math.round(slot * 10) / 10, slotsOverflow: Math.round(geo.overflow * 100) / 100,
      capLeft: PAD + Math.max(0, activeIndex) * slot, capRight: PAD + (Math.max(0, activeIndex) + 1) * slot, barInnerRight: w - PAD, capFits: fits,
    };
    DebugLogger.info('[TABBAR]', `layout ${JSON.stringify(snapshot)}`);
    // абсолютное положение на экране: правый край капсулы за краем окна — это и есть «обрезано справа»
    requestAnimationFrame(() => {
      barRef.current?.measureInWindow?.((x, y, mw, mh) => {
        const right = x + mw;
        const out = x < -0.5 || right > windowWidth + 0.5;
        const line = `window x=${Math.round(x * 10) / 10} y=${Math.round(y)} w=${Math.round(mw * 10) / 10} h=${Math.round(mh)} right=${Math.round(right * 10) / 10} windowW=${Math.round(windowWidth * 10) / 10}${out ? ' OVERFLOW' : ''}`;
        if (out || !fits) DebugLogger.warn('[TABBAR]', line); else DebugLogger.info('[TABBAR]', line);
      });
    });
    setWidth(w);
  }, [count, activeIndex, windowWidth, insets.left, insets.right, geo.width, geo.overflow]);
  // зачем (координатор 11.10, «один кадр должен дать причину»): ширины ЯЧЕЕК вкладок, измеренные самой раскладкой, — рядом с шириной окна,
  // отступами и ожидаемой слотовой шириной. Если сумма ячеек или правый край последней выходят за внутренний край капсулы — это и есть обрезка.
  const cellsRef = useRef<Array<{ x: number; w: number } | undefined>>([]);
  const rowWidthRef = useRef(0);
  const cellsLogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportCells = useCallback(() => {
    if (cellsLogTimerRef.current) clearTimeout(cellsLogTimerRef.current);
    cellsLogTimerRef.current = setTimeout(() => {
      cellsLogTimerRef.current = null;
      const cells = cellsRef.current.slice(0, count);
      const measured = cells.filter((c): c is { x: number; w: number } => !!c);
      if (measured.length < count) {
        DebugLogger.warn('[TABBAR]', `cells incomplete measured=${measured.length}/${count} windowW=${Math.round(windowWidth * 10) / 10} insetL=${insets.left} insetR=${insets.right}`);
        return;
      }
      const sum = measured.reduce((acc, c) => acc + c.w, 0);
      const last = measured[measured.length - 1]!;
      const lastRight = last.x + last.w;
      const innerRight = rowWidthRef.current > 0 ? rowWidthRef.current : 0;
      const cut = innerRight > 0 && lastRight > innerRight + 0.5;
      const line = `cells windowW=${Math.round(windowWidth * 10) / 10} insetL=${insets.left} insetR=${insets.right} count=${count} fontScale=${PixelRatio.getFontScale()} `
        + `rowW=${Math.round(rowWidthRef.current * 10) / 10} expectedSlot=${Math.round(((geo.width - PAD * 2) / count) * 10) / 10} `
        + `widths=[${measured.map((c) => Math.round(c.w * 10) / 10).join(',')}] xs=[${measured.map((c) => Math.round(c.x * 10) / 10).join(',')}] `
        + `sum=${Math.round(sum * 10) / 10} lastRight=${Math.round(lastRight * 10) / 10}${cut ? ' [CELLS-OVERFLOW]' : ''}`;
      if (cut) DebugLogger.warn('[TABBAR]', line); else DebugLogger.info('[TABBAR]', line);
    }, 120);
  }, [count, geo.width, insets.left, insets.right, windowWidth]);
  const capScale = capLift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const capBright = capLift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] });
  const iconPressScale = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] });

  return (
    <Animated.View
      ref={barRef as never}
      testID="v2-tab-bar"
      onLayout={handleLayout}
      style={[
        s.bar,
        // зачем: ширина задана явно от окна (а не left+right от родителя) — если родитель шире экрана, правые кнопки всё равно целиком в окне
        { left: geo.left, width: geo.width },
        { bottom: bottomOffset, backgroundColor: Platform.OS === 'android' ? palette.bgBottom : 'transparent' },
        // зачем (темы 2.0, светлое): тень в тон темы и мягче — чёрная .55 на светлом фоне грязнит.
        palette.isLight ? { shadowColor: palette.shadowTint, shadowOpacity: 1, elevation: 8 } : null,
        collapseStyle,
      ]}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={s.clip}>
        {Platform.OS === 'ios' ? <BlurView intensity={22} tint={palette.isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={glassFill} style={StyleSheet.absoluteFill} />
      </View>
      {slotW > 0 && activeIndex >= 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[s.cap, { width: slotW, shadowColor: palette.accentCap, transform: [{ translateX: capX }, { scale: capScale }] }]}
        >
          {/* зачем (темы 2.0): капсула в цвете темы в «Акценте/Максимуме»; в «Спокойно» accentCap = cta (как было). */}
          <CapFill width={slotW} color={palette.accentCap} />
          <Animated.View style={[s.capBright, { opacity: capBright }]} />
        </Animated.View>
      ) : null}
      {/* Касания ловит сама капсула (координата от её края), пункты — только вид и доступность. */}
      <View
        pointerEvents="none"
        style={s.row}
        onLayout={(e) => { rowWidthRef.current = e.nativeEvent.layout.width; reportCells(); }}
      >
        {items.map((item, i) => {
          const on = i === activeIndex;
          // Активный значок: в «Спокойно» accentBright = cta (как было), иначе — цвет темы.
          const color = on ? palette.accentBright : hoverIdx === i ? palette.secondary : palette.mutedText;
          return (
            <View
              key={item.key}
              testID={`tab-${item.key}`}
              style={s.tab}
              onLayout={(e) => { cellsRef.current[i] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width }; reportCells(); }}
              accessible
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: on }}
              accessibilityActions={ACTIVATE_ACTION}
              onAccessibilityAction={() => onSelect(i)}
            >
              {/* зачем (владелец 29.09): таббар без подписей — только крупные иконки по центру капсулы;
                  название вкладки остаётся в accessibilityLabel для TalkBack/VoiceOver. */}
              <Animated.View style={pressedIdx === i ? { transform: [{ scale: iconPressScale }] } : null}>
                <Ionicons name={on ? item.activeIcon : item.icon} size={ICON_SIZE} color={color} />
                {item.badge ? (
                  <View
                    testID={`tab-${item.key}-badge`}
                    style={[s.badge, { backgroundColor: palette.text, borderColor: palette.bgBottom }]}
                  />
                ) : null}
              </Animated.View>
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
    height: V2_TAB_BAR_HEIGHT,
    borderRadius: V2_TAB_BAR_HEIGHT / 2,
    // Android рисует тень elevation только у вида с фоном.
    backgroundColor: 'transparent',
    shadowColor: '#000', // theme-exempt: тень капсулы таб-бара — чёрная в любой теме
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 20, // guard-ok: только iOS, на Android тень даёт elevation
    elevation: 14,
  },
  clip: { ...StyleSheet.absoluteFillObject, borderRadius: V2_TAB_BAR_HEIGHT / 2, overflow: 'hidden' },
  cap: {
    position: 'absolute',
    top: PAD,
    left: 0,
    height: CAP_H,
    borderRadius: CAP_RADIUS,
    shadowColor: '#000000', // theme-exempt: тень плашки активной вкладки — чёрная в любой теме
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 11,
  },
  capBright: { ...StyleSheet.absoluteFillObject, borderRadius: CAP_RADIUS, backgroundColor: '#FFFFFF' }, // theme-exempt: яркая вспышка плашки при нажатии — белая в любой теме
  row: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', paddingHorizontal: PAD },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -1, right: -3, width: 12, height: 12, borderRadius: 6, borderWidth: 2 }, // shadow-ok: кольцо-вырез значка непрочитанного на иконке вкладки, не контейнер
});
