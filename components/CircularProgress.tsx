import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  pct: number;      // 0-100
  size?: number;
  sw?: number;      // stroke width
  color: string;
  bg: string;
  textColor: string;
  fontSize?: number;
  innerBg?: string;
  cardBg?: string;  // устарело, игнорируется
}

/**
 * Circular progress ring — colored fill technique.
 * Fills CW from 12 o'clock.
 *
 * All fill layers are clipped to a circle via the outer borderRadius+overflow:hidden
 * wrapper, so the ring edges are always smooth.
 */
export default function CircularProgress({
  pct, size = 52, sw = 4, color, bg, textColor, fontSize = 11, innerBg,
}: Props) {
  const clamped = Math.min(100, Math.max(0, pct));
  const deg     = (clamped / 100) * 360;
  const h       = size / 2;
  const holeBg  = innerBg ?? bg;

  const rightFillRot = Math.min(180, deg) - 180;
  const leftFillRot  = deg > 180 ? deg - 360 : -180;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>

      {/* Circular clip wrapper — clamps all fill layers to the circle boundary */}
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: h, overflow: 'hidden',
      }}>
        {/* 1. Gray track disc */}
        <View style={{
          position: 'absolute', width: size, height: size,
          backgroundColor: bg,
        }} />

        {/* 2. Left colored fill — sweeps CW 6→9→12 (active after 50%) */}
        <View style={{
          position: 'absolute', left: 0, top: 0,
          width: h, height: size, overflow: 'hidden',
        }}>
          <View style={{
            position: 'absolute', left: 0, top: 0,
            width: h, height: size,
            backgroundColor: color,
            transform: [
              { translateX: h / 2 },
              { rotate: `${leftFillRot}deg` },
              { translateX: -(h / 2) },
            ],
          }} />
        </View>

        {/* 3. Right colored fill — sweeps CW 12→3→6 */}
        <View style={{
          position: 'absolute', left: h, top: 0,
          width: h, height: size, overflow: 'hidden',
        }}>
          <View style={{
            position: 'absolute', left: 0, top: 0,
            width: h, height: size,
            backgroundColor: color,
            transform: [
              { translateX: -(h / 2) },
              { rotate: `${rightFillRot}deg` },
              { translateX: h / 2 },
            ],
          }} />
        </View>

        {/* 4. Inner hole — creates the ring */}
        <View style={{
          position: 'absolute',
          left: sw, top: sw,
          width: size - sw * 2,
          height: size - sw * 2,
          borderRadius: (size - sw * 2) / 2,
          backgroundColor: holeBg,
        }} />
      </View>

      {/* 5. Percentage label — outside clip wrapper so it's not cut */}
      <Text
        style={{ color: textColor, fontSize, fontWeight: '700', textAlign: 'center' }}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {Math.round(clamped)}%
      </Text>
    </View>
  );
}
