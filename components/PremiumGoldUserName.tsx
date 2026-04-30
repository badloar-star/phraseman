import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from './ThemeContext';

type Props = {
  text: string;
  fontSize: number;
};

const GOLD_STOPS: { offset: string; color: string }[] = [
  { offset: '0', color: '#7A6220' },
  { offset: '0.18', color: '#B8941F' },
  { offset: '0.38', color: '#E8C547' },
  { offset: '0.5', color: '#FFF4C8' },
  { offset: '0.62', color: '#E8C547' },
  { offset: '0.82', color: '#9A7B1A' },
  { offset: '1', color: '#6B5414' },
];

const GOLD_STOPS_SKETCH: { offset: string; color: string }[] = [
  { offset: '0', color: '#4B3A14' },
  { offset: '0.2', color: '#7A5C1A' },
  { offset: '0.4', color: '#B18422' },
  { offset: '0.55', color: '#E0AF36' },
  { offset: '0.72', color: '#9B741F' },
  { offset: '1', color: '#5A4517' },
];

/** Имя на главной для Premium: золотой градиент по буквам (через SVG, без @react-native-masked-view).
 *  Ширина SVG = реально измеренной ширине RN <Text> с теми же параметрами,
 *  чтобы длинные/широкие ники (Gamma7816, заглавные, цифры) не обрезались. */
export default function PremiumGoldUserName({ text, fontSize }: Props) {
  const { themeMode } = useTheme();
  const isSketch = themeMode === 'minimalLight';
  const gradientStops = isSketch ? GOLD_STOPS_SKETCH : GOLD_STOPS;
  const display = text || '...';
  const lineHeight = Math.ceil(fontSize * 1.28);

  const [measuredW, setMeasuredW] = useState(0);

  const fallbackW = useMemo(
    () => Math.max(Math.ceil(display.length * fontSize * 0.7), 56),
    [display, fontSize],
  );
  const safetyPad = Math.ceil(fontSize * 0.18);
  const w = (measuredW > 0 ? Math.ceil(measuredW) : fallbackW) + safetyPad;
  const h = lineHeight;

  const gradientId = useMemo(() => {
    const hash = Math.abs((display + fontSize).split('').reduce((acc, ch) => ((acc * 31) + ch.charCodeAt(0)) | 0, 7));
    return `premiumGold_${hash}`;
  }, [display, fontSize]);
  const textY = fontSize * 0.82;

  const onMeasure = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (Math.abs(next - measuredW) > 0.5) setMeasuredW(next);
  };

  return (
    <View style={[styles.wrap, { marginTop: 2, minHeight: h }]}>
      <Text
        onLayout={onMeasure}
        style={[styles.measure, { fontSize, lineHeight: h }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {display}
      </Text>
      <Svg width={w} height={h} style={styles.svg}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2={w} y2="0" gradientUnits="userSpaceOnUse">
            {gradientStops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        </Defs>
        <SvgText
          fill={`url(#${gradientId})`}
          fontSize={fontSize}
          fontWeight="700"
          x={0}
          y={textY}
        >
          {display}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', position: 'relative' },
  svg: { overflow: 'visible' },
  measure: {
    position: 'absolute',
    opacity: 0,
    color: 'transparent',
    fontWeight: '700',
    includeFontPadding: false,
    left: 0,
    top: 0,
  },
});
