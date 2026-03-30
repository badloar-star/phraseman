import React from 'react';
import { View, Text } from 'react-native';

// ── Flat-top hex perimeter: starts at LEFT vertex, goes clockwise (down first) ─
// Flat-top vertices: 0°=RIGHT, 60°=LR, 120°=LL, 180°=LEFT, 240°=UL, 300°=UR
// Start at 180° (LEFT), going in decreasing-angle direction → clockwise in screen
function hexPerimPoint(idx: number, total: number, R: number) {
  const t     = idx / total;
  const edgeF = t * 6;
  const eIdx  = Math.floor(edgeF) % 6;
  const frac  = edgeF - Math.floor(edgeF);

  // 180° start, counter-clockwise (upward): each step adds 60°
  const a0 = (180 + eIdx * 60) * Math.PI / 180;
  const a1 = (180 + (eIdx + 1) * 60) * Math.PI / 180;

  const v0x = R * Math.cos(a0);
  const v0y = R * Math.sin(a0);
  const v1x = R * Math.cos(a1);
  const v1y = R * Math.sin(a1);

  const x        = v0x + (v1x - v0x) * frac;
  const y        = v0y + (v1y - v0y) * frac;
  const angleDeg = Math.atan2(v1y - v0y, v1x - v0x) * 180 / Math.PI;

  return { x, y, angleDeg };
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  progress:  string[];    // 'correct'|'replay_correct'|'wrong'|'empty'
  cellIndex: number;      // current cell (-1 if not in lesson)
  score:     string;      // display string e.g. "0.1" or "5.0"
  total:     number;      // 50
  t: any;
  f: any;
  size?: number;          // outer container size (default 118)
}

const REPLAY_BLUE = '#4090FF';

export default function LessonHexProgress({
  progress, cellIndex, score, total, t, f, size = 118,
}: Props) {
  const OUTER = size;
  const cx    = OUTER / 2;
  const cy    = OUTER / 2;

  // Segment ring circumradius
  const RING_R = OUTER * 0.44;
  const SEG_H  = 4.2;   // length along edge
  const SEG_W  = 4.5;   // perpendicular thickness

  // Inner flat-top hex background
  // flat-top: width = HEX_W, height = HEX_W * 0.866, tips = HEX_W/4
  const HEX_W  = OUTER * 0.72;
  const innerH = HEX_W * 0.866;
  const tipW   = HEX_W / 4;
  const midW   = HEX_W / 2;  // tip + mid + tip = HEX_W/4 + HEX_W/2 + HEX_W/4 = HEX_W

  return (
    <View style={{ width: OUTER, height: OUTER, alignItems: 'center', justifyContent: 'center' }}>

      {/* Inner flat-top hexagon background */}
      <View style={{
        position: 'absolute',
        left: cx - HEX_W / 2,
        top:  cy - innerH / 2,
        flexDirection: 'row',
        width: HEX_W,
        height: innerH,
      }}>
        {/* Left tip */}
        <View style={{ width: 0, height: 0,
          borderTopWidth: innerH / 2, borderBottomWidth: innerH / 2, borderRightWidth: tipW,
          borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: t.bgCard,
        }} />
        {/* Center rectangle */}
        <View style={{ width: midW, height: innerH, backgroundColor: t.bgCard }} />
        {/* Right tip */}
        <View style={{ width: 0, height: 0,
          borderTopWidth: innerH / 2, borderBottomWidth: innerH / 2, borderLeftWidth: tipW,
          borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: t.bgCard,
        }} />
      </View>

      {/* Hexagonal ring of 50 segments */}
      {Array.from({ length: total }, (_, i) => {
        const { x, y, angleDeg } = hexPerimPoint(i, total, RING_R);
        const p      = progress[i] ?? 'empty';
        const isCurr = i === cellIndex && p === 'empty';
        const bg =
          p === 'replay_correct' ? REPLAY_BLUE :
          p === 'correct'        ? t.correct   :
          p === 'wrong'          ? t.wrong     :
          isCurr                 ? t.bgSurface2 :
          t.bgSurface;
        return (
          <View key={i} style={{
            position:        'absolute',
            width:           SEG_H,
            height:          SEG_W,
            borderRadius:    SEG_W / 2,
            backgroundColor: bg,
            left:            cx + x - SEG_H / 2,
            top:             cy + y - SEG_W / 2,
            transform:       [{ rotate: `${angleDeg}deg` }],
          }} />
        );
      })}

      {/* Score text centered */}
      <Text
        style={{ color: t.textPrimary, fontSize: size * 0.145, fontWeight: '800', textAlign: 'center' }}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {score}
      </Text>
    </View>
  );
}
