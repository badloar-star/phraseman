import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from './ThemeContext';

type Props = {
  text: string;
  fontSize: number;
};

const VIP_STOPS = [
  { offset: '0', color: '#064E3B' },
  { offset: '0.18', color: '#047857' },
  { offset: '0.38', color: '#22C55E' },
  { offset: '0.5', color: '#BBF7D0' },
  { offset: '0.62', color: '#22C55E' },
  { offset: '0.82', color: '#15803D' },
  { offset: '1', color: '#052E16' },
];

const VIP_STOPS_SKETCH = [
  { offset: '0', color: '#065F46' },
  { offset: '0.26', color: '#047857' },
  { offset: '0.52', color: '#16A34A' },
  { offset: '0.76', color: '#15803D' },
  { offset: '1', color: '#064E3B' },
];

export default function VipGreenUserName({ text, fontSize }: Props) {
  const { themeMode } = useTheme();
  const [measuredW, setMeasuredW] = useState(0);
  const display = text || 'Phraseman';
  const lineHeight = Math.ceil(fontSize * 1.28);

  const fallbackW = useMemo(
    () => Math.max(Math.ceil(display.length * fontSize * 0.7), 56),
    [display, fontSize],
  );
  const gradientId = useMemo(() => {
    const hash = Math.abs((display + fontSize).split('').reduce((acc, ch) => ((acc * 31) + ch.charCodeAt(0)) | 0, 17));
    return `vipGreen_${hash}`;
  }, [display, fontSize]);

  const gradientStops = themeMode === 'minimalLight' ? VIP_STOPS_SKETCH : VIP_STOPS;
  const safetyPad = Math.ceil(fontSize * 0.18);
  const w = (measuredW > 0 ? Math.ceil(measuredW) : fallbackW) + safetyPad;
  const h = lineHeight;
  const textY = fontSize * 0.82;

  const onMeasure = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (Math.abs(next - measuredW) > 0.5) setMeasuredW(next);
  };

  return (
    <View style={[styles.wrap, { minHeight: h }]}>
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
        <SvgText fill={`url(#${gradientId})`} fontSize={fontSize} fontWeight="700" x={0} y={textY}>
          {display}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', position: 'relative', marginTop: 2 },
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
