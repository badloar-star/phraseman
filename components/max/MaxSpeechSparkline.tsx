// ═══════════════════════════════════════════════════════════════════════════
// MaxSpeechSparkline — «живая линия» минут речи (макет 01, выбор владельца).
//
// зачем (владелец 2026-09-01): «контейнеры дурацкие, раздел некрасивый и не
// анимирован». Столбики в карточке фиксированной высоты давали пустую яму на
// нулях. Линия рисуется штрихом слева направо, заливка под ней проявляется
// следом, точка «сейчас» выпрыгивает в конце — движение рассказывает историю
// само, без подписей. Высота вдвое меньше прежней карточки.
//
// На нулях — не пустота, а пунктир по низу с дыханием: видно, где появится
// линия, и не выглядит поломкой.
//
// Ширину берём из размеров окна, а не из onLayout: первый кадр обязан быть
// финальным (Performance Bible), а измерение дало бы кадр с пустой линией.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../ThemeContext';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

const AnimatedPath = Reanimated.createAnimatedComponent(Path);
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

const HEIGHT = 88;
const TOP_PAD = 10;
const BOTTOM_Y = HEIGHT - 8;
const DOT_R = 5.5;

interface Props {
  /** Минуты по отрезкам, слева старое → справа «сейчас». */
  values: number[];
  /** Сколько отступа по горизонтали снаружи — чтобы ширина совпала с окном на первом кадре. */
  horizontalInset: number;
  /** Подпись под пунктиром, когда истории ещё нет. */
  emptyHint: string;
  /** Лист открыт. Пока закрыт — бесконечное «дыхание» пунктира не крутится. */
  visible: boolean;
}

export default function MaxSpeechSparkline({ values, horizontalInset, emptyHint, visible }: Props) {
  const { theme: t, f } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(120, windowWidth - horizontalInset * 2);

  const peak = Math.max(0, ...values);
  const isEmpty = peak <= 0;
  // Гейт бесконечной анимации (Performance Bible / perf_freeze_contract):
  // экран в фокусе, приложение активно, лист виден. Иначе пунктир «дышал» бы
  // в фоне впустую — ровно тот класс утечки, который сторож и ловит.
  const runtimeActive = useRuntimeActive(visible);

  // Геометрия считается один раз на набор значений: точки, путь линии, путь
  // заливки и точная длина полилинии для штриховой анимации.
  const geo = useMemo(() => {
    const n = Math.max(2, values.length);
    // Отступ на радиус точки с обеих сторон: иначе «сейчас» режется краем.
    const stepX = (width - DOT_R * 2) / (n - 1);
    const pts = values.map((v, i) => ({
      x: DOT_R + i * stepX,
      y: peak > 0 ? BOTTOM_Y - (v / peak) * (BOTTOM_Y - TOP_PAD) : BOTTOM_Y,
    }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const lastX = pts[pts.length - 1].x.toFixed(1);
    const fill = `${line} L${lastX},${HEIGHT} L${pts[0].x.toFixed(1)},${HEIGHT} Z`;
    let length = 0;
    for (let i = 1; i < pts.length; i += 1) {
      length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    const last = pts[pts.length - 1];
    return { line, fill, length: Math.max(1, length), last };
  }, [values, width, peak]);

  const drawn = useSharedValue(0);
  const fillOpacity = useSharedValue(0);
  const dotScale = useSharedValue(0);
  const breath = useSharedValue(0.35);

  useEffect(() => {
    if (isEmpty) {
      if (!runtimeActive) {
        cancelAnimation(breath);
        breath.value = 0.5;
        return undefined;
      }
      // Пунктир дышит, пока истории нет — живой, но не навязчивый.
      breath.value = withRepeat(
        withTiming(0.7, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      return () => cancelAnimation(breath);
    }
    drawn.value = 0;
    fillOpacity.value = 0;
    dotScale.value = 0;
    drawn.value = withDelay(200, withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }));
    fillOpacity.value = withDelay(1100, withTiming(1, { duration: 900 }));
    dotScale.value = withDelay(1500, withSpring(1, { damping: 12, stiffness: 180 }));
    return () => {
      cancelAnimation(drawn);
      cancelAnimation(fillOpacity);
      cancelAnimation(dotScale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty, geo.length, runtimeActive]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: geo.length * (1 - drawn.value),
  }));
  const fillProps = useAnimatedProps(() => ({ opacity: fillOpacity.value }));
  const dotProps = useAnimatedProps(() => ({
    r: DOT_R * dotScale.value,
    opacity: dotScale.value,
  }));
  const breathStyle = useAnimatedStyle(() => ({ opacity: breath.value }));

  if (isEmpty) {
    return (
      <View style={{ height: HEIGHT + 22, justifyContent: 'flex-end' }}>
        <Reanimated.View style={breathStyle}>
          <Svg width={width} height={HEIGHT}>
            <Path
              d={`M0,${BOTTOM_Y} L${width},${BOTTOM_Y}`}
              stroke={t.bgSurface2}
              strokeWidth={2.5}
              strokeDasharray="5 7"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Reanimated.View>
        <Text
          style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', textAlign: 'center', marginTop: 4 }}
          maxFontSizeMultiplier={1.6}
        >
          {emptyHint}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height: HEIGHT + 22, justifyContent: 'flex-start' }}>
      <Svg width={width} height={HEIGHT}>
        <Defs>
          <SvgLinearGradient id="maxSparkFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.accent} stopOpacity={0.26} />
            <Stop offset="1" stopColor={t.accent} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <AnimatedPath d={geo.fill} fill="url(#maxSparkFill)" animatedProps={fillProps} />
        <AnimatedPath
          d={geo.line}
          fill="none"
          stroke={t.accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={geo.length}
          animatedProps={lineProps}
        />
        <AnimatedCircle cx={geo.last.x} cy={geo.last.y} fill={t.accent} animatedProps={dotProps} />
      </Svg>
    </View>
  );
}
