import React, { useRef, useMemo } from 'react';
import { View, Text, Image } from 'react-native';
import { Canvas, Circle, Path, Skia, Group, Paint, BlurMask, Line } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { getFrameById } from '../constants/avatars';
import LevelBadge from './LevelBadge';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  emoji?:    string;
  image?:    any;
  frameId:   string;
  size?:     number;
  style?:    any;
  fontSize?: number;
  noAvatar?: boolean;
  bgColor?:  string;
  animated?: boolean;
}

// AnimatedFrameProvider and useAnimCtx live in AnimContext.tsx (no Skia imports there)
import { useAnimCtx } from './AnimContext';
export { useAnimCtx };
// Re-export provider for backwards compatibility
export { AnimatedFrameProvider } from './AnimContext';

// ─── ErrorBoundary ────────────────────────────────────────────────────────────
class FrameErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ─── Component ────────────────────────────────────────────────────────────────
function AnimatedFrameInner({
  emoji, image, frameId, size = 44, style,
  fontSize, noAvatar = false, bgColor, animated = true,
}: Props) {
  const frame   = getFrameById(frameId);
  const [imageLoadFailed, setImageLoadFailed] = React.useState(false);
  const BW      = Math.max(2, Math.round(size * 0.055));
  const outerW  = size + BW * 2;
  const avR     = outerW / 2;
  const glowPad    = 48; // extra room for glow — canvas bleeds beyond layout bounds
  const canvasS    = outerW + glowPad * 2;
  const canvasOffset = -(glowPad - 16); // centers oversized canvas over the avatar
  const cx         = canvasS / 2;
  const cy         = canvasS / 2;
  const R          = outerW / 2 + 2;

  const { t, tSlow, tMed, tFast, breathe, pulse } = useAnimCtx();

  const isLevel = emoji && /^\d+$/.test(emoji);

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const renderAvatar = () => {
    if (noAvatar) {
      return bgColor
        ? <View style={{ position:'absolute', width:outerW, height:outerW, borderRadius:outerW/2, backgroundColor:bgColor }} />
        : null;
    }
    return (
      <View style={{ position:'absolute', width:outerW, height:outerW, borderRadius:outerW/2, overflow:'hidden', alignItems:'center', justifyContent:'center' }}>
        {image && !imageLoadFailed
          ? <Image source={image} style={{ width:outerW, height:outerW, borderRadius:outerW/2 }}
              onError={() => setImageLoadFailed(true)}
              onLoadStart={() => setImageLoadFailed(false)} />
          : isLevel
          ? <LevelBadge level={parseInt(emoji!)} size={Math.round(outerW * 0.86)} />
          : <Text style={{ fontSize: fontSize ?? Math.round(outerW * 0.5) }}>{emoji}</Text>
        }
      </View>
    );
  };

  // ── Skia frame ──────────────────────────────────────────────────────────────
  const renderSkiaFrame = () => {
    const col  = frame.color;
    const col2 = frame.color2 || frame.color;
    const anim = frame.animation;

    if (anim === 'plain') return null;

    if (anim === 'sprout') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <SproutEffect cx={cx} cy={cy} R={R} col={col} t={t} breathe={breathe} animated={animated} />
      </Canvas>
    );

    if (anim === 'arc' || anim === 'arc_red') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <ArcEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} tFast={tFast} animated={animated} BW={BW} />
      </Canvas>
    );

    if (anim === 'ice') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <IceEffect cx={cx} cy={cy} R={R} col={col} col2={col2} tSlow={tSlow} tFast={tFast} breathe={breathe} animated={animated} />
      </Canvas>
    );

    if (anim === 'plasma') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <PlasmaEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} tFast={tFast} animated={animated} BW={BW} />
      </Canvas>
    );

    if (anim === 'magnet') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <MagnetEffect cx={cx} cy={cy} R={R} col={col} col2={col2} tSlow={tSlow} breathe={breathe} animated={animated} />
      </Canvas>
    );

    if (anim === 'vortex') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <VortexEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} tMed={tMed} animated={animated} />
      </Canvas>
    );

    if (anim === 'dna') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <DnaEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} animated={animated} strands={1} avR={avR} />
      </Canvas>
    );

    if (anim === 'double_dna') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <DnaEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} animated={animated} strands={2} avR={avR} />
      </Canvas>
    );

    if (anim === 'triple_dna') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <DnaEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} animated={animated} strands={3} avR={avR} />
      </Canvas>
    );

    if (anim === 'rainbow_dna') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <RainbowDnaEffect cx={cx} cy={cy} R={R} t={t} tSlow={tSlow} animated={animated} avR={avR} />
      </Canvas>
    );

    if (anim === 'runes') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <RunesEffect cx={cx} cy={cy} R={R} col={col} col2={col2} tSlow={tSlow} tMed={tMed} animated={animated} />
      </Canvas>
    );

    if (anim === 'atom') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <AtomEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} tSlow={tSlow} breathe={breathe} animated={animated} />
      </Canvas>
    );

    if (anim === 'web') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <WebEffect cx={cx} cy={cy} R={R} col={col} col2={col2} tSlow={tSlow} breathe={breathe} animated={animated} />
      </Canvas>
    );

    if (anim === 'hex') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <HexEffect cx={cx} cy={cy} R={R} col={col} col2={col2} tSlow={tSlow} t={t} animated={animated} />
      </Canvas>
    );

    if (anim === 'geometry') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <GeometryEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} tSlow={tSlow} tMed={tMed} animated={animated} />
      </Canvas>
    );

    if (anim === 'neural') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <NeuralEffect cx={cx} cy={cy} R={R} col={col} col2={col2} tSlow={tSlow} t={t} animated={animated} />
      </Canvas>
    );

    if (anim === 'aurora_star') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <AuroraStarEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} tMed={tMed} tSlow={tSlow} animated={animated} />
      </Canvas>
    );

    if (anim === 'crystal') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <CrystalEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} tMed={tMed} tSlow={tSlow} animated={animated} />
      </Canvas>
    );

    if (anim === 'pulsar') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <PulsarEffect cx={cx} cy={cy} R={R} col={col} t={t} animated={animated} />
      </Canvas>
    );

    if (anim === 'double_square') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <DoubleSquareEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} tMed={tMed} tSlow={tSlow} animated={animated} />
      </Canvas>
    );

    if (anim === 'triple_tri') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <TripleTriEffect cx={cx} cy={cy} R={R} col={col} col2={col2} t={t} tMed={tMed} tSlow={tSlow} animated={animated} />
      </Canvas>
    );

    if (anim === 'solar_cycle') return (
      <Canvas style={{ position:'absolute', width:canvasS, height:canvasS, left:canvasOffset, top:canvasOffset }}>
        <SolarCycleEffect cx={cx} cy={cy} R={R} col={col} col2={col2} tSlow={tSlow} t={t} animated={animated} />
      </Canvas>
    );

    return null;
  };

  const layoutS = outerW + 32; // visual footprint (unchanged)

  return (
    <View style={[{ width: layoutS, height: layoutS, justifyContent:'center', alignItems:'center', overflow:'visible' }, style]}>
      {renderSkiaFrame()}
      <View style={{ width: outerW, height: outerW }}>
        {renderAvatar()}
        <View style={{
          position:'absolute', width:outerW, height:outerW,
          borderRadius: outerW/2,
          borderWidth: BW, borderColor: frame.color,
          backgroundColor:'transparent',
        }} />
      </View>
    </View>
  );
}

// Fallback: plain border ring shown when Skia crashes
function AnimatedFrameFallback({ size = 44, frameId, style }: Partial<Props>) {
  const frame = getFrameById(frameId ?? 'plain');
  const BW = Math.max(2, Math.round(size! * 0.055));
  const outerW = size! + BW * 2;
  return (
    <View style={[{ width: outerW + 8, height: outerW + 8, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ width: outerW, height: outerW, borderRadius: outerW / 2, borderWidth: BW, borderColor: frame.color }} />
    </View>
  );
}

export default function AnimatedFrame(props: Props) {
  return (
    <FrameErrorBoundary fallback={<AnimatedFrameFallback size={props.size} frameId={props.frameId} style={props.style} />}>
      <AnimatedFrameInner {...props} />
    </FrameErrorBoundary>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EFFECT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── SPROUT ────────────────────────────────────────────────────────────────────
function SproutEffect({ cx, cy, R, col, t, breathe, animated }: any) {
  const waveOpacity = useDerivedValue(() => Math.max(0, 0.45 * (1 - t.value)), [t]);
  const glowOpacity = useDerivedValue(() => 0.08 + breathe.value * 0.18, [breathe]);
  const waveTransform = useDerivedValue(
    () => [{ translateX: cx }, { translateY: cy }, { scale: 1 + t.value * 0.55 }, { translateX: -cx }, { translateY: -cy }],
    [t]
  );
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 4} color={col} opacity={glowOpacity}>
        <Paint style="fill"><BlurMask blur={8} style="normal" /></Paint>
      </Circle>
      <Circle cx={cx} cy={cy} r={R} color={col} opacity={waveOpacity}
        transform={waveTransform}
        style="stroke" strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={R} color={col} style="stroke" strokeWidth={2} opacity={0.9} />
    </Group>
  );
}

// ── ARC spark sub-component ───────────────────────────────────────────────────
function ArcSpark({ cx, cy, rOuter, sparkAngle, offsetRad, dotColor, dotR, sparkOp }: any) {
  const a = useDerivedValue(() => sparkAngle.value + offsetRad, [sparkAngle]);
  const x = useDerivedValue(() => cx + Math.cos(a.value) * rOuter, [a]);
  const y = useDerivedValue(() => cy + Math.sin(a.value) * rOuter, [a]);
  return <Circle cx={x} cy={y} r={dotR} color={dotColor} opacity={sparkOp} />;
}

// ── ARC ───────────────────────────────────────────────────────────────────────
function ArcEffect({ cx, cy, R, col, col2, t, tFast, animated, BW }: any) {
  const outerAngle = useDerivedValue(() => t.value * Math.PI * 2, [t]);
  const innerAngle = useDerivedValue(() => -tFast.value * Math.PI * 2, [tFast]);
  const glowOp     = useDerivedValue(() => 0.10 + t.value * 0.15, [t]);
  const sparkAngle = useDerivedValue(() => tFast.value * Math.PI * 2 * 1.8, [tFast]);
  const sparkOp    = useDerivedValue(() => {
    const phase = (tFast.value * 3) % 1;
    return phase < 0.3 ? phase / 0.3 : phase < 0.6 ? 1 - (phase - 0.3) / 0.3 : 0;
  }, [tFast]);
  const rOuter = R + 4;
  const rInner = R - 2;

  const outerTransform = useDerivedValue(
    () => [{ translateX: cx }, { translateY: cy }, { rotate: outerAngle.value }, { translateX: -cx }, { translateY: -cy }],
    [outerAngle]
  );
  const innerTransform = useDerivedValue(
    () => [{ translateX: cx }, { translateY: cy }, { rotate: innerAngle.value }, { translateX: -cx }, { translateY: -cy }],
    [innerAngle]
  );
  const SPARKS = [-30, -15, 0, 15, 30];
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={rOuter + 4} color={col} opacity={glowOp}>
        <Paint style="fill"><BlurMask blur={10} style="normal" /></Paint>
      </Circle>
      <Group transform={outerTransform}>
        <Circle cx={cx} cy={cy} r={rOuter} color={col} style="stroke" strokeWidth={BW * 0.9} strokeCap="round" opacity={0.92} />
      </Group>
      <Group transform={innerTransform}>
        <Circle cx={cx} cy={cy} r={rInner} color={col2} style="stroke" strokeWidth={BW * 0.65} strokeCap="round" opacity={0.82} />
      </Group>
      {SPARKS.map((offset, i) => (
        <ArcSpark key={i}
          cx={cx} cy={cy} rOuter={rOuter}
          sparkAngle={sparkAngle}
          offsetRad={offset * Math.PI / 180}
          dotColor={i === 2 ? '#FFFFFF' : col2}
          dotR={i === 2 ? 5 : 3}
          sparkOp={sparkOp}
        />
      ))}
    </Group>
  );
}

// ── ICE ───────────────────────────────────────────────────────────────────────
function IceEffect({ cx, cy, R, col, col2, tSlow, tFast, breathe, animated }: any) {
  const SPIKES = 8;
  const rotAngle    = useDerivedValue(() => tSlow.value * Math.PI * 2, [tSlow]);
  const breatheScl  = useDerivedValue(() => 0.92 + breathe.value * 0.08, [breathe]);
  const shimmerOp   = useDerivedValue(() => {
    const phase = (tFast.value * 2.5) % 1;
    return phase < 0.3 ? phase / 0.3 * 0.8 : phase < 0.7 ? 0.8 - (phase - 0.3) / 0.4 * 0.8 : 0;
  }, [tFast]);
  const shimmerAngle = useDerivedValue(() => tFast.value * Math.PI * 2, [tFast]);
  const glowOp       = useDerivedValue(() => 0.06 + breathe.value * 0.08, [breathe]);
  const ringOp       = useDerivedValue(() => 0.55 + breathe.value * 0.15, [breathe]);

  // Pre-compute static dot positions + properties
  const iceSpikes = useMemo(() => Array.from({ length: SPIKES }).map((_, i) => {
    const angle = (i / SPIKES) * Math.PI * 2;
    const big = i % 2 === 0;
    const r = R + 10;
    return { angle, big, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  }), [cx, cy, R]);

  const spikesTransform = useDerivedValue(
    () => [
      { translateX: cx }, { translateY: cy },
      { rotate: rotAngle.value },
      { translateX: -cx }, { translateY: -cy },
      { translateX: cx }, { translateY: cy },
      { scale: breatheScl.value },
      { translateX: -cx }, { translateY: -cy },
    ],
    [rotAngle, breatheScl]
  );
  const shimmerTransform = useDerivedValue(
    () => [{ translateX: cx }, { translateY: cy }, { rotate: shimmerAngle.value }, { translateX: -cx }, { translateY: -cy }],
    [shimmerAngle]
  );
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 8} color={col2} opacity={glowOp}>
        <Paint style="fill"><BlurMask blur={12} style="normal" /></Paint>
      </Circle>
      <Circle cx={cx} cy={cy} r={R} color={col} style="stroke" strokeWidth={2} opacity={ringOp} />
      <Group transform={spikesTransform}>
        {iceSpikes.map(({ x, y, big }, i) => (
          <Circle key={i} cx={x} cy={y} r={big ? 5 : 3}
            color={big ? col : col2} opacity={big ? 0.95 : 0.65} />
        ))}
      </Group>
      <Group transform={shimmerTransform}>
        <Circle cx={cx} cy={cy} r={R + 4} color="#FFFFFF" style="stroke" strokeWidth={4}
          opacity={shimmerOp} strokeCap="round" />
      </Group>
    </Group>
  );
}

// ── PLASMA ────────────────────────────────────────────────────────────────────
function PlasmaEffect({ cx, cy, R, col, col2, t, tFast, animated, BW }: any) {
  const SEGS = 60;
  const node0Angle = useDerivedValue(() => tFast.value * Math.PI * 2 * 1.8, [tFast]);
  const node1Angle = useDerivedValue(() => tFast.value * Math.PI * 2 * 1.3 + Math.PI, [tFast]);
  const node2Angle = useDerivedValue(() => tFast.value * Math.PI * 2 * 2.0 + Math.PI * 0.6, [tFast]);
  const nodePulse  = useDerivedValue(() => 0.8 + Math.sin(tFast.value * Math.PI * 6) * 0.2, [tFast]);
  const glowOp     = useDerivedValue(() => 0.09 + Math.sin(t.value * Math.PI * 2) * 0.04, [t]);
  const midRingOp  = useDerivedValue(() => 0.20 + Math.sin(t.value * Math.PI * 3) * 0.08, [t]);
  const hotOp      = useDerivedValue(() => 0.45 + Math.sin(t.value * Math.PI * 7) * 0.28, [t]);

  const jitterPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    for (let i = 0; i <= SEGS; i++) {
      const angle = (i / SEGS) * Math.PI * 2;
      const noise = Math.sin(angle * 7 + t.value * Math.PI * 4) * 2.5
                  + Math.sin(angle * 13 + t.value * Math.PI * 6) * 1.5;
      const r = R + noise;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.close();
    return path;
  }, [t]);

  const n0x = useDerivedValue(() => cx + Math.cos(node0Angle.value) * R, [node0Angle]);
  const n0y = useDerivedValue(() => cy + Math.sin(node0Angle.value) * R, [node0Angle]);
  const n1x = useDerivedValue(() => cx + Math.cos(node1Angle.value) * R, [node1Angle]);
  const n1y = useDerivedValue(() => cy + Math.sin(node1Angle.value) * R, [node1Angle]);
  const n2x = useDerivedValue(() => cx + Math.cos(node2Angle.value) * R, [node2Angle]);
  const n2y = useDerivedValue(() => cy + Math.sin(node2Angle.value) * R, [node2Angle]);
  const n0r = useDerivedValue(() => 5 * nodePulse.value, [nodePulse]);
  const n1r = useDerivedValue(() => 4 * nodePulse.value, [nodePulse]);
  const n2r = useDerivedValue(() => 3.5 * nodePulse.value, [nodePulse]);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 6} color={col} opacity={glowOp}>
        <Paint style="fill"><BlurMask blur={14} style="normal" /></Paint>
      </Circle>
      <Circle cx={cx} cy={cy} r={R} color={col} style="stroke" strokeWidth={BW * 1.8} opacity={midRingOp} />
      <Path path={jitterPath} color={col} style="stroke" strokeWidth={BW * 0.9} strokeJoin="round" strokeCap="round" opacity={0.92} />
      <Path path={jitterPath} color="#FFFFFF" style="stroke" strokeWidth={BW * 0.3} opacity={hotOp} />
      <Circle cx={n0x} cy={n0y} r={n0r} color="#FFFFFF" opacity={nodePulse} />
      <Circle cx={n1x} cy={n1y} r={n1r} color={col} opacity={nodePulse} />
      <Circle cx={n2x} cy={n2y} r={n2r} color={col2} opacity={nodePulse} />
    </Group>
  );
}

// ── MAGNET line sub-component ─────────────────────────────────────────────────
function MagnetLine({ cx, cy, R, col, tSlow, breathe, baseAngle, curveDir, lenFrac, strokeWidth }: any) {
  const r0 = R * 0.88;
  const len = R * lenFrac;

  const lineOp = useDerivedValue(() =>
    0.45 + 0.25 * Math.sin(tSlow.value * Math.PI * 2 * 2.2 + baseAngle), [tSlow]);
  const rotFrac = useDerivedValue(() => tSlow.value * Math.PI * 2 * 0.28, [tSlow]);
  const lineAngle = useDerivedValue(() => baseAngle + rotFrac.value, [rotFrac]);

  const linePath = useDerivedValue(() => {
    const bv = 0.88 + breathe.value * 0.12;
    const sx = cx + Math.cos(lineAngle.value) * r0;
    const sy = cy + Math.sin(lineAngle.value) * r0;
    const ex = cx + Math.cos(lineAngle.value + curveDir * 0.18) * (r0 + len * bv);
    const ey = cy + Math.sin(lineAngle.value + curveDir * 0.18) * (r0 + len * bv);
    const p = Skia.Path.Make();
    p.moveTo(sx, sy);
    p.lineTo(ex, ey);
    return p;
  }, [lineAngle, breathe]);

  return <Path path={linePath} color={col} strokeWidth={strokeWidth} strokeCap="round" style="stroke" opacity={lineOp} />;
}

// ── MAGNET ────────────────────────────────────────────────────────────────────
function MagnetEffect({ cx, cy, R, col, col2, tSlow, breathe, animated }: any) {
  const glowOp = useDerivedValue(() => 0.07 + breathe.value * 0.04, [breathe]);
  const ringOp = useDerivedValue(() => 0.55 + breathe.value * 0.15, [breathe]);
  const LINES = 8;
  const lineConfigs = useMemo(() => Array.from({ length: LINES }).map((_, i) => ({
    baseAngle: (i / LINES) * Math.PI * 2,
    curveDir: i % 2 === 0 ? 1 : -1,
    lenFrac: i % 3 === 0 ? 0.16 : i % 2 === 0 ? 0.12 : 0.09,
    strokeWidth: i % 3 === 0 ? 2 : 1.2,
  })), []);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 6} color={col} opacity={glowOp}>
        <Paint style="fill"><BlurMask blur={14} style="normal" /></Paint>
      </Circle>
      <Circle cx={cx} cy={cy} r={R} color={col2} style="stroke" strokeWidth={2} opacity={ringOp} />
      <Circle cx={cx} cy={cy} r={R * 0.86} color={col} style="stroke" strokeWidth={1} opacity={0.18} />
      {lineConfigs.map((cfg, i) => (
        <MagnetLine key={i} cx={cx} cy={cy} R={R} col={col}
          tSlow={tSlow} breathe={breathe}
          baseAngle={cfg.baseAngle} curveDir={cfg.curveDir}
          lenFrac={cfg.lenFrac} strokeWidth={cfg.strokeWidth} />
      ))}
    </Group>
  );
}

// ── VORTEX ────────────────────────────────────────────────────────────────────
function VortexEffect({ cx, cy, R, col, col2, t, tMed, animated }: any) {
  const TRAIL = 8;
  const PARTICLES = [
    { speed: 1.4,  color: col,  offset: 0,               rOff: 0.02 * R },
    { speed: -1.1, color: col2, offset: Math.PI * 0.66,  rOff: -0.02 * R },
    { speed: 2.0,  color: col,  offset: Math.PI * 1.33,  rOff: 0.02 * R },
    { speed: 1.7,  color: col2, offset: Math.PI * 0.5,   rOff: -0.02 * R },
  ];
  const glowOp = useDerivedValue(() => 0.08 + Math.sin(t.value * Math.PI * 2) * 0.04, [t]);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 4} color={col} opacity={glowOp}>
        <Paint style="fill"><BlurMask blur={10} style="normal" /></Paint>
      </Circle>
      <Circle cx={cx} cy={cy} r={R} color={col} style="stroke" strokeWidth={1} opacity={0.30} />
      {PARTICLES.map((p, pi) =>
        Array.from({ length: TRAIL }).map((_, ti) => (
          <VortexDot key={`${pi}-${ti}`}
            cx={cx} cy={cy} R={R} t={t}
            speed={p.speed} offset={p.offset} rOff={p.rOff}
            trailIdx={ti} trail={TRAIL} color={p.color} />
        ))
      )}
    </Group>
  );
}

function VortexDot({ cx, cy, R, t, speed, offset, rOff, trailIdx, trail, color }: any) {
  const partR = R + rOff;
  const trailOffset = -trailIdx * 0.08;
  const angle = useDerivedValue(() => t.value * Math.PI * 2 * speed + offset + trailOffset, [t]);
  const x = useDerivedValue(() => cx + Math.cos(angle.value) * partR, [angle]);
  const y = useDerivedValue(() => cy + Math.sin(angle.value) * partR, [angle]);
  const frac = (trail - trailIdx) / trail;
  const dotR = trailIdx === 0 ? 5 : 4 * frac * frac;
  const opacity = trailIdx === 0 ? 0.95 : frac * frac * 0.6;
  return <Circle cx={x} cy={y} r={dotR} color={trailIdx === 0 ? '#FFFFFF' : color} opacity={opacity} />;
}

// ── DNA ───────────────────────────────────────────────────────────────────────
function DnaEffect({ cx, cy, R, col, col2, t, animated, strands, avR }: any) {
  const STEPS = 48;
  const rotSpeed = 0.55;

  const pathA = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const rot = t.value * Math.PI * 2 * rotSpeed;
    for (let si = 0; si < strands; si++) {
      const off = (si / strands) * Math.PI * 2;
      for (let i = 0; i < STEPS; i++) {
        const base = (i / STEPS) * Math.PI * 2 + rot + off;
        const zA = Math.sin(base * 2);
        const rA = R + zA * R * 0.09;
        const xA = cx + Math.cos(base) * rA;
        const yA = cy + Math.sin(base) * rA;
        const dA = 2 + 2.5 * ((zA + 1) / 2);
        if (Math.sqrt((xA - cx) ** 2 + (yA - cy) ** 2) > avR + 2)
          p.addCircle(xA, yA, dA);
      }
    }
    return p;
  }, [t]);

  const pathB = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const rot = t.value * Math.PI * 2 * rotSpeed;
    for (let si = 0; si < strands; si++) {
      const off = (si / strands) * Math.PI * 2;
      for (let i = 0; i < STEPS; i++) {
        const base = (i / STEPS) * Math.PI * 2 + rot + off;
        const zB = Math.sin(base * 2 + Math.PI);
        const rB = R + zB * R * 0.09;
        const xB = cx + Math.cos(base) * rB;
        const yB = cy + Math.sin(base) * rB;
        const dB = 2 + 2.5 * ((zB + 1) / 2);
        if (Math.sqrt((xB - cx) ** 2 + (yB - cy) ** 2) > avR + 2)
          p.addCircle(xB, yB, dB);
      }
    }
    return p;
  }, [t]);

  const bridgePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const rot = t.value * Math.PI * 2 * rotSpeed;
    for (let si = 0; si < strands; si++) {
      const off = (si / strands) * Math.PI * 2;
      for (let i = 0; i < STEPS; i += 4) {
        const base = (i / STEPS) * Math.PI * 2 + rot + off;
        const zA = Math.sin(base * 2);
        const rA = R + zA * R * 0.09;
        const xA = cx + Math.cos(base) * rA;
        const yA = cy + Math.sin(base) * rA;
        const zB = Math.sin(base * 2 + Math.PI);
        const rB = R + zB * R * 0.09;
        const xB = cx + Math.cos(base) * rB;
        const yB = cy + Math.sin(base) * rB;
        const dA = Math.sqrt((xA - cx) ** 2 + (yA - cy) ** 2);
        const dB = Math.sqrt((xB - cx) ** 2 + (yB - cy) ** 2);
        if (dA > avR + 2 && dB > avR + 2) {
          p.moveTo(xA, yA);
          p.lineTo(xB, yB);
        }
      }
    }
    return p;
  }, [t]);

  return (
    <Group>
      <Path path={bridgePath} color={col} style="stroke" strokeWidth={0.8} opacity={0.18} />
      <Path path={pathA} color={col} style="fill" opacity={0.88} />
      <Path path={pathB} color={col2} style="fill" opacity={0.78} />
    </Group>
  );
}

// ── RAINBOW DNA ───────────────────────────────────────────────────────────────
const RAINBOW_COLORS = ['#FF4466', '#FFD700', '#00CCFF'];

function makeRainbowStrandPath(
  cx: number, cy: number, R: number, avR: number,
  tVal: number, strandIdx: number, strands: number,
): ReturnType<typeof Skia.Path.Make> {
  'worklet';
  const STEPS = 48;
  const rotSpeed = 0.55;
  const p = Skia.Path.Make();
  const rot = tVal * Math.PI * 2 * rotSpeed;
  const off = (strandIdx / strands) * Math.PI * 2;
  for (let i = 0; i < STEPS; i++) {
    const base = (i / STEPS) * Math.PI * 2 + rot + off;
    const zA = Math.sin(base * 2);
    const rA = R + zA * R * 0.09;
    const xA = cx + Math.cos(base) * rA;
    const yA = cy + Math.sin(base) * rA;
    const dA = 2 + 2.5 * ((zA + 1) / 2);
    if (Math.sqrt((xA - cx) ** 2 + (yA - cy) ** 2) > avR + 2)
      p.addCircle(xA, yA, dA);
    const zB = Math.sin(base * 2 + Math.PI);
    const rB = R + zB * R * 0.09;
    const xB = cx + Math.cos(base) * rB;
    const yB = cy + Math.sin(base) * rB;
    const dB = 2 + 2.5 * ((zB + 1) / 2);
    if (Math.sqrt((xB - cx) ** 2 + (yB - cy) ** 2) > avR + 2)
      p.addCircle(xB, yB, dB);
  }
  return p;
}

function RainbowDnaEffect({ cx, cy, R, t, tSlow, animated, avR }: any) {
  const STRANDS = RAINBOW_COLORS.length;
  const p0 = useDerivedValue(() => makeRainbowStrandPath(cx, cy, R, avR, t.value, 0, STRANDS), [t]);
  const p1 = useDerivedValue(() => makeRainbowStrandPath(cx, cy, R, avR, t.value, 1, STRANDS), [t]);
  const p2 = useDerivedValue(() => makeRainbowStrandPath(cx, cy, R, avR, t.value, 2, STRANDS), [t]);
  const op = useDerivedValue(() => 0.75 + Math.sin(tSlow.value * Math.PI * 2) * 0.15, [tSlow]);

  return (
    <Group>
      <Path path={p0} color={RAINBOW_COLORS[0]} style="fill" opacity={op} />
      <Path path={p1} color={RAINBOW_COLORS[1]} style="fill" opacity={op} />
      <Path path={p2} color={RAINBOW_COLORS[2]} style="fill" opacity={op} />
    </Group>
  );
}

// ── RUNES ─────────────────────────────────────────────────────────────────────
const RUNE_SHAPES = [
  [[-4,-10,-4,10],[-4,-3,7,3],[-4,3,7,-3]],
  [[-5,-10,-5,10],[5,-10,5,10],[-5,5,5,5]],
  [[0,-10,-8,10],[0,-10,8,10],[0,-10,0,10],[-5,2,5,2]],
  [[-6,10,0,-10],[6,10,0,-10],[-6,10,6,10]],
  [[0,-10,0,10],[0,-5,7,0],[0,2,7,0]],
  [[-7,-8,7,8],[7,-8,-7,8]],
  [[-5,-10,0,-10,0,10],[-5,-10,-5,10]],
  [[-7,5,0,-10],[7,5,0,-10],[-7,5,7,5]],
];

function RunesEffect({ cx, cy, R, col, col2, tSlow, tMed, animated }: any) {
  const N = 8;
  const rot1 = useDerivedValue(() => tSlow.value * Math.PI * 2, [tSlow]);
  const rot2 = useDerivedValue(() => -tMed.value * Math.PI * 2 * 0.6, [tMed]);
  const ringOp = useDerivedValue(() => 0.25 + Math.sin(tSlow.value * Math.PI * 2) * 0.15, [tSlow]);

  const runesPath1 = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 + rot1.value;
      const rx = cx + Math.cos(angle) * (R + 2);
      const ry = cy + Math.sin(angle) * (R + 2);
      const shape = RUNE_SHAPES[i % RUNE_SHAPES.length];
      const sz = 9;
      const cos = Math.cos(angle + Math.PI / 2);
      const sin = Math.sin(angle + Math.PI / 2);
      for (const seg of shape) {
        const [x1, y1, x2, y2] = seg as number[];
        const ax = rx + (x1 * cos - y1 * sin) * sz / 10;
        const ay = ry + (x1 * sin + y1 * cos) * sz / 10;
        const bx = rx + (x2 * cos - y2 * sin) * sz / 10;
        const by = ry + (x2 * sin + y2 * cos) * sz / 10;
        p.moveTo(ax, ay);
        p.lineTo(bx, by);
      }
    }
    return p;
  }, [tSlow]);

  const runesPath2 = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 + Math.PI / N + rot2.value;
      const rx = cx + Math.cos(angle) * (R + 12);
      const ry = cy + Math.sin(angle) * (R + 12);
      const shape = RUNE_SHAPES[(i + 4) % RUNE_SHAPES.length];
      const sz = 7;
      const cos = Math.cos(angle + Math.PI / 2);
      const sin = Math.sin(angle + Math.PI / 2);
      for (const seg of shape) {
        const [x1, y1, x2, y2] = seg as number[];
        const ax = rx + (x1 * cos - y1 * sin) * sz / 10;
        const ay = ry + (x1 * sin + y1 * cos) * sz / 10;
        const bx = rx + (x2 * cos - y2 * sin) * sz / 10;
        const by = ry + (x2 * sin + y2 * cos) * sz / 10;
        p.moveTo(ax, ay);
        p.lineTo(bx, by);
      }
    }
    return p;
  }, [tMed]);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R} color={col} style="stroke" strokeWidth={1.5} opacity={ringOp} />
      <Circle cx={cx} cy={cy} r={R + 10} color={col2} style="stroke" strokeWidth={1}
        opacity={useDerivedValue(() => ringOp.value * 0.5, [ringOp])} />
      <Path path={runesPath1} color={col} style="stroke" strokeWidth={2.2} strokeCap="round" strokeJoin="round" opacity={0.85} />
      <Path path={runesPath2} color={col2} style="stroke" strokeWidth={1.8} strokeCap="round" strokeJoin="round" opacity={0.65} />
    </Group>
  );
}

// ── ATOM ──────────────────────────────────────────────────────────────────────
function AtomEffect({ cx, cy, R, col, col2, t, tSlow, breathe, animated }: any) {
  const coreOp  = useDerivedValue(() => 0.35 + breathe.value * 0.45, [breathe]);
  const orbit1  = useDerivedValue(() => t.value * Math.PI * 2, [t]);
  const orbit2  = useDerivedValue(() => t.value * Math.PI * 2 * 1.28 + Math.PI * 2 / 3, [t]);
  const orbit3  = useDerivedValue(() => t.value * Math.PI * 2 * 0.84 + Math.PI * 4 / 3, [t]);
  const outerRot = useDerivedValue(() => -tSlow.value * Math.PI * 2, [tSlow]);
  const ringOp  = useDerivedValue(() => 0.30 + Math.sin(tSlow.value * Math.PI * 2) * 0.08, [tSlow]);

  const orbW = R * 1.4;
  const orbH = R * 0.38;

  const orbitPaths = useMemo(() => [0, 60, 120].map(tiltDeg => {
    const tiltRad = tiltDeg * Math.PI / 180;
    const path = Skia.Path.Make();
    const steps = 64;
    for (let j = 0; j <= steps; j++) {
      const a = (j / steps) * Math.PI * 2;
      const lx = Math.cos(a) * orbW;
      const ly = Math.sin(a) * orbH;
      const x = cx + lx * Math.cos(tiltRad) - ly * Math.sin(tiltRad);
      const y = cy + lx * Math.sin(tiltRad) + ly * Math.cos(tiltRad);
      if (j === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.close();
    return path;
  }), [cx, cy, orbW, orbH]);

  function ePos(angle: any, tiltDeg: number) {
    const tiltRad = tiltDeg * Math.PI / 180;
    return {
      x: useDerivedValue(() => {
        const lx = Math.cos(angle.value) * orbW;
        const ly = Math.sin(angle.value) * orbH;
        return cx + lx * Math.cos(tiltRad) - ly * Math.sin(tiltRad);
      }, [angle]),
      y: useDerivedValue(() => {
        const lx = Math.cos(angle.value) * orbW;
        const ly = Math.sin(angle.value) * orbH;
        return cy + lx * Math.sin(tiltRad) + ly * Math.cos(tiltRad);
      }, [angle]),
    };
  }

  const e1 = ePos(orbit1, 0);
  const e2 = ePos(orbit2, 60);
  const e3 = ePos(orbit3, 120);

  const outerDots = useMemo(() => [0, Math.PI, Math.PI / 2], []);
  const atomOuterTransform = useDerivedValue(
    () => [{ translateX: cx }, { translateY: cy }, { rotate: outerRot.value }, { translateX: -cx }, { translateY: -cy }],
    [outerRot]
  );

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R - 4} color={col} style="stroke" strokeWidth={1.5} opacity={coreOp} />
      {orbitPaths.map((path, i) => (
        <Path key={i} path={path} color={col} style="stroke" strokeWidth={1.5} opacity={ringOp} />
      ))}
      <Circle cx={e1.x} cy={e1.y} r={5} color={col} /><Circle cx={e1.x} cy={e1.y} r={2.5} color="#FFFFFF" />
      <Circle cx={e2.x} cy={e2.y} r={4.5} color={col2} /><Circle cx={e2.x} cy={e2.y} r={2} color="#FFFFFF" />
      <Circle cx={e3.x} cy={e3.y} r={4} color={col} /><Circle cx={e3.x} cy={e3.y} r={2} color="#FFFFFF" />
      <Group transform={atomOuterTransform}>
        <Circle cx={cx} cy={cy} r={R + 10} color={col2} style="stroke" strokeWidth={1} opacity={0.30} />
        {outerDots.map((a, i) => (
          <Circle key={i}
            cx={cx + Math.cos(a) * (R + 10)}
            cy={cy + Math.sin(a) * (R + 10)}
            r={3.5 - i * 0.5} color={i === 0 ? col : col2} opacity={0.8} />
        ))}
      </Group>
    </Group>
  );
}

// ── WEB node sub-component ────────────────────────────────────────────────────
function WebNode({ cx, cy, R, col, tSlow, breathe, baseAngle }: any) {
  const nodeAngle = useDerivedValue(() => baseAngle + tSlow.value * Math.PI * 2 * 0.5, [tSlow]);
  const nx = useDerivedValue(() => cx + Math.cos(nodeAngle.value) * R, [nodeAngle]);
  const ny = useDerivedValue(() => cy + Math.sin(nodeAngle.value) * R, [nodeAngle]);
  const nodeOp = useDerivedValue(() => 0.35 + breathe.value * 0.55, [breathe]);
  return <Circle cx={nx} cy={ny} r={5} color={col} opacity={nodeOp} />;
}

// ── WEB ───────────────────────────────────────────────────────────────────────
function WebEffect({ cx, cy, R, col, col2, tSlow, breathe, animated }: any) {
  const rot = useDerivedValue(() => tSlow.value * Math.PI * 2 * 0.5, [tSlow]);
  const outerOp = useDerivedValue(() => 0.22 + breathe.value * 0.12, [breathe]);

  const webPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const N = 5;
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 - Math.PI / 2 + rot.value;
      p.moveTo(cx, cy);
      p.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
    }
    for (const fr of [0.4, 0.7, 1.0]) {
      for (let i = 0; i <= N; i++) {
        const angle = (i / N) * Math.PI * 2 - Math.PI / 2 + rot.value;
        const x = cx + Math.cos(angle) * R * fr;
        const y = cy + Math.sin(angle) * R * fr;
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
      }
    }
    return p;
  }, [tSlow]);

  const baseAngles = useMemo(() =>
    Array.from({ length: 5 }).map((_, i) => (i / 5) * Math.PI * 2 - Math.PI / 2), []);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 2} color={col} style="stroke" strokeWidth={1.5} opacity={outerOp} />
      <Path path={webPath} color={col} style="stroke" strokeWidth={0.9} strokeCap="round" opacity={0.55} />
      {baseAngles.map((angle, i) => (
        <WebNode key={i} cx={cx} cy={cy} R={R} col={col} tSlow={tSlow} breathe={breathe} baseAngle={angle} />
      ))}
    </Group>
  );
}

// ── HEX ───────────────────────────────────────────────────────────────────────
function HexEffect({ cx, cy, R, col, col2, tSlow, t, animated }: any) {
  const rot = useDerivedValue(() => tSlow.value * Math.PI * 2, [tSlow]);
  const hexGroupTransform = useDerivedValue(
    () => [{ translateX: cx }, { translateY: cy }, { rotate: rot.value }, { translateX: -cx }, { translateY: -cy }],
    [rot]
  );

  const hexPaths = useMemo(() => Array.from({ length: 8 }).map((_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const hcx = cx + Math.cos(angle) * R;
    const hcy = cy + Math.sin(angle) * R;
    const hexR = R * 0.22;
    const path = Skia.Path.Make();
    for (let j = 0; j <= 6; j++) {
      const a = (j / 6) * Math.PI * 2 + Math.PI / 6;
      const x = hcx + Math.cos(a) * hexR;
      const y = hcy + Math.sin(a) * hexR;
      if (j === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.close();
    return path;
  }), [cx, cy, R]);

  return (
    <Group transform={hexGroupTransform}>
      <Circle cx={cx} cy={cy} r={R} color={col2} style="stroke" strokeWidth={1} opacity={0.30} />
      {hexPaths.map((path, i) => (
        <HexCell key={i} path={path} col={col} t={t} idx={i} />
      ))}
    </Group>
  );
}

function HexCell({ path, col, t, idx }: any) {
  const opVal = useDerivedValue(() => {
    const phase = ((t.value * 8) - idx) % 8;
    const norm = phase < 0 ? phase + 8 : phase;
    if (norm < 1) return 0.20 + norm * 0.70;
    if (norm < 2) return 0.90 - (norm - 1) * 0.70;
    return 0.20;
  }, [t]);
  return <Path path={path} color={col} style="stroke" strokeWidth={1.8} strokeJoin="round" opacity={opVal} />;
}

// ── GEOMETRY dot sub-component ────────────────────────────────────────────────
function GeoDot({ cx, cy, R, color, baseAngle, radiusFrac, tVal, speed }: any) {
  const x = useDerivedValue(() => cx + Math.cos(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radiusFrac, [tVal]);
  const y = useDerivedValue(() => cy + Math.sin(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radiusFrac, [tVal]);
  return <Circle cx={x} cy={y} r={5.5} color={color} opacity={0.85} />;
}

function GeoDot2({ cx, cy, R, color, baseAngle, radiusFrac, tVal, speed }: any) {
  const x = useDerivedValue(() => cx + Math.cos(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radiusFrac, [tVal]);
  const y = useDerivedValue(() => cy + Math.sin(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radiusFrac, [tVal]);
  return <Circle cx={x} cy={y} r={4.5} color={color} opacity={0.75} />;
}

// ── GEOMETRY ──────────────────────────────────────────────────────────────────
function GeometryEffect({ cx, cy, R, col, col2, t, tSlow, tMed, animated }: any) {
  const negTMed = useDerivedValue(() => -tMed.value, [tMed]);
  const negTSlowHalf = useDerivedValue(() => -tSlow.value * 0.5, [tSlow]);

  function polyPath(n: number, r: number, angleOffset: number, rotVal: any) {
    return useDerivedValue(() => {
      const p = Skia.Path.Make();
      for (let i = 0; i <= n; i++) {
        const angle = (i / n) * Math.PI * 2 + angleOffset + rotVal.value * Math.PI * 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
      }
      p.close();
      return p;
    }, [rotVal]);
  }

  const tri  = polyPath(3, R * 0.90, -Math.PI / 2, t);
  const sq   = polyPath(4, R * 0.85, -Math.PI / 4, negTMed);
  const pent = polyPath(5, R * 0.92, -Math.PI / 2, negTSlowHalf);
  const outerRingOp = useDerivedValue(() => 0.22 + Math.sin(t.value * Math.PI * 2) * 0.08, [t]);

  const triAngles = useMemo(() => Array.from({ length: 3 }).map((_, i) => (i / 3) * Math.PI * 2 - Math.PI / 2), []);
  const sqAngles  = useMemo(() => Array.from({ length: 4 }).map((_, i) => (i / 4) * Math.PI * 2 - Math.PI / 4), []);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 2} color={col} style="stroke" strokeWidth={1} opacity={outerRingOp} />
      <Path path={tri}  color={col}  style="stroke" strokeWidth={1.8} strokeJoin="round" opacity={0.80} />
      <Path path={sq}   color={col2} style="stroke" strokeWidth={1.5} strokeJoin="round" opacity={0.65} />
      <Path path={pent} color={col}  style="stroke" strokeWidth={1.2} strokeJoin="round" opacity={0.42} />
      {triAngles.map((angle, i) => (
        <GeoDot key={`t${i}`} cx={cx} cy={cy} R={R} color={col} baseAngle={angle} radiusFrac={0.90} tVal={t} speed={1} />
      ))}
      {sqAngles.map((angle, i) => (
        <GeoDot2 key={`s${i}`} cx={cx} cy={cy} R={R} color={col2} baseAngle={angle} radiusFrac={0.85} tVal={tMed} speed={-1} />
      ))}
    </Group>
  );
}

// ── NEURAL ────────────────────────────────────────────────────────────────────
function NeuralEffect({ cx, cy, R, col, col2, tSlow, t, animated }: any) {
  const N = 10;
  const rot = useDerivedValue(() => tSlow.value * Math.PI * 2, [tSlow]);
  const nodeAngles = useMemo(() => Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2), []);
  const edges = useMemo(() => {
    const result: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      result.push([i, (i + 1) % N]);
      result.push([i, (i + 2) % N]);
      if (i < N / 2) result.push([i, (i + 4) % N]);
    }
    return result;
  }, []);

  const edgePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const r = rot.value;
    const nodes = nodeAngles.map(a => ({
      x: cx + Math.cos(a + r) * R,
      y: cy + Math.sin(a + r) * R,
    }));
    for (const [a, b] of edges) {
      p.moveTo(nodes[a].x, nodes[a].y);
      p.lineTo(nodes[b].x, nodes[b].y);
    }
    return p;
  }, [tSlow]);

  const sigIdx = useDerivedValue(() => (t.value * N * 2.5) % N, [t]);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R} color={col} style="stroke" strokeWidth={1} opacity={0.25} />
      <Path path={edgePath} color={col} style="stroke" strokeWidth={1.2} strokeCap="round" opacity={0.50} />
      {nodeAngles.map((baseAngle, i) => (
        <NeuralNode key={i} cx={cx} cy={cy} R={R} col={col} col2={col2}
          baseAngle={baseAngle} idx={i} N={N} rot={rot} sigIdx={sigIdx} />
      ))}
    </Group>
  );
}

function NeuralNode({ cx, cy, R, col, col2, baseAngle, idx, N, rot, sigIdx }: any) {
  const nx = useDerivedValue(() => cx + Math.cos(baseAngle + rot.value) * R, [rot]);
  const ny = useDerivedValue(() => cy + Math.sin(baseAngle + rot.value) * R, [rot]);
  const nodeOp = useDerivedValue(() => {
    const dist = Math.abs(((sigIdx.value - idx) % N + N) % N);
    return dist < 1 ? 0.35 + (1 - dist) * 0.65 : 0.35;
  }, [sigIdx]);
  return <Circle cx={nx} cy={ny} r={idx % 2 === 0 ? 5 : 4} color={idx % 2 === 0 ? col : col2} opacity={nodeOp} />;
}

// ── AURORA STAR dot sub-component ─────────────────────────────────────────────
function StarDot({ cx, cy, R, color, baseAngle, tVal, speed, radius, dotR }: any) {
  const x = useDerivedValue(() => cx + Math.cos(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radius, [tVal]);
  const y = useDerivedValue(() => cy + Math.sin(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radius, [tVal]);
  const op = useDerivedValue(() => 0.30 + Math.sin(tVal.value * Math.PI * 2) * 0.60, [tVal]);
  return <Circle cx={x} cy={y} r={dotR} color={color} opacity={op} />;
}

// ── AURORA STAR ───────────────────────────────────────────────────────────────
function AuroraStarEffect({ cx, cy, R, col, col2, t, tMed, tSlow, animated }: any) {
  const negTMed083 = useDerivedValue(() => -tMed.value * 0.83, [tMed]);
  const tFast16 = useDerivedValue(() => t.value * 1.6, [t]);
  const negTSlow05 = useDerivedValue(() => -tSlow.value * 0.5, [tSlow]);

  function triPath(rotVal: any, up: boolean) {
    return useDerivedValue(() => {
      const p = Skia.Path.Make();
      const base = up ? -Math.PI / 2 : Math.PI / 2;
      for (let i = 0; i <= 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + base + rotVal.value * Math.PI * 2;
        const x = cx + Math.cos(angle) * R * 0.90;
        const y = cy + Math.sin(angle) * R * 0.90;
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
      }
      p.close();
      return p;
    }, [rotVal]);
  }

  const tri1 = triPath(t, true);
  const tri2 = triPath(negTMed083, false);
  const tri3 = triPath(tFast16, true);
  const tri4 = triPath(negTSlow05, false);

  const ringOp = useDerivedValue(() => 0.22 + Math.sin(tSlow.value * Math.PI * 2) * 0.12, [tSlow]);
  const innerRingOp = useDerivedValue(() => ringOp.value * 0.55, [ringOp]);
  const innerSmallOp = useDerivedValue(() => 0.15 + Math.sin(t.value * Math.PI * 2) * 0.08, [t]);

  const d1Angles = useMemo(() => Array.from({ length: 3 }).map((_, i) => (i / 3) * Math.PI * 2 - Math.PI / 2), []);
  const d2Angles = useMemo(() => Array.from({ length: 3 }).map((_, i) => (i / 3) * Math.PI * 2 + Math.PI / 2), []);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 2}  color={col}  style="stroke" strokeWidth={1.5} opacity={ringOp} />
      <Circle cx={cx} cy={cy} r={R - 8}  color={col2} style="stroke" strokeWidth={1}   opacity={innerRingOp} />
      <Circle cx={cx} cy={cy} r={R - 18} color={col}  style="stroke" strokeWidth={1}   opacity={innerSmallOp} />
      <Path path={tri1} color={col}  style="stroke" strokeWidth={1.8} strokeJoin="round" opacity={0.88} />
      <Path path={tri2} color={col2} style="stroke" strokeWidth={1.8} strokeJoin="round" opacity={0.88} />
      <Path path={tri3} color={col}  style="stroke" strokeWidth={1.2} strokeJoin="round" opacity={0.45} />
      <Path path={tri4} color={col2} style="stroke" strokeWidth={1.1} strokeJoin="round" opacity={0.38} />
      {d1Angles.map((angle, i) => (
        <StarDot key={`d1${i}`} cx={cx} cy={cy} R={R} color={col} baseAngle={angle} tVal={t} speed={1} radius={0.90} dotR={5.5} />
      ))}
      {d2Angles.map((angle, i) => (
        <StarDot key={`d2${i}`} cx={cx} cy={cy} R={R} color={col2} baseAngle={angle} tVal={tMed} speed={-0.83} radius={0.90} dotR={5} />
      ))}
    </Group>
  );
}

// ── CRYSTAL dot sub-component ─────────────────────────────────────────────────
function CrystalDot({ cx, cy, R, color, baseAngle, radiusFrac, tVal, speed, dotR }: any) {
  const x = useDerivedValue(() => cx + Math.cos(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radiusFrac, [tVal]);
  const y = useDerivedValue(() => cy + Math.sin(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radiusFrac, [tVal]);
  const op = useDerivedValue(() => 0.25 + Math.sin(tVal.value * Math.PI * 2) * 0.70, [tVal]);
  return <Circle cx={x} cy={y} r={dotR} color={color} opacity={op} />;
}

// ── CRYSTAL ───────────────────────────────────────────────────────────────────
function CrystalEffect({ cx, cy, R, col, col2, t, tMed, tSlow, animated }: any) {
  const negTMed071 = useDerivedValue(() => -tMed.value * 0.71, [tMed]);
  const tSlow038 = useDerivedValue(() => tSlow.value * 0.38, [tSlow]);

  function squarePath(r: number, rotVal: any) {
    return useDerivedValue(() => {
      const p = Skia.Path.Make();
      for (let i = 0; i <= 4; i++) {
        const angle = (i / 4) * Math.PI * 2 - Math.PI / 4 + rotVal.value * Math.PI * 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
      }
      p.close();
      return p;
    }, [rotVal]);
  }

  const sq1 = squarePath(R * 0.95, t);
  const sq2 = squarePath(R * 0.78, negTMed071);
  const sq3 = squarePath(R * 0.60, tSlow038);

  const outerOp = useDerivedValue(() => 0.20 + Math.sin(t.value * Math.PI * 2) * 0.10, [t]);
  const innerOp = useDerivedValue(() => 0.15 + Math.sin(tMed.value * Math.PI * 2) * 0.08, [tMed]);

  const sq1Angles = useMemo(() => Array.from({ length: 4 }).map((_, i) => (i / 4) * Math.PI * 2 - Math.PI / 4), []);
  const sq2Angles = useMemo(() => Array.from({ length: 4 }).map((_, i) => (i / 4) * Math.PI * 2 - Math.PI / 4), []);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 4} color={col}  style="stroke" strokeWidth={1} opacity={outerOp} />
      <Circle cx={cx} cy={cy} r={R - 4} color={col2} style="stroke" strokeWidth={1} opacity={innerOp} />
      <Path path={sq1} color={col}  style="stroke" strokeWidth={2.0} strokeJoin="round" opacity={0.85} />
      <Path path={sq2} color={col2} style="stroke" strokeWidth={1.5} strokeJoin="round" opacity={0.70} />
      <Path path={sq3} color={col}  style="stroke" strokeWidth={1.1} strokeJoin="round" opacity={0.42} />
      {sq1Angles.map((angle, i) => (
        <CrystalDot key={`s1${i}`} cx={cx} cy={cy} R={R} color={col}  baseAngle={angle} radiusFrac={0.95} tVal={t}    speed={1}     dotR={6}   />
      ))}
      {sq2Angles.map((angle, i) => (
        <CrystalDot key={`s2${i}`} cx={cx} cy={cy} R={R} color={col2} baseAngle={angle} radiusFrac={0.78} tVal={tMed} speed={-0.71} dotR={4.5} />
      ))}
    </Group>
  );
}

// ── PULSAR ────────────────────────────────────────────────────────────────────
function PulsarEffect({ cx, cy, R, col, t, animated }: any) {
  const TRAIL = 12;
  const angle = useDerivedValue(() => t.value * Math.PI * 2 * 2.0, [t]);
  const headX = useDerivedValue(() => cx + Math.cos(angle.value) * R, [angle]);
  const headY = useDerivedValue(() => cy + Math.sin(angle.value) * R, [angle]);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R} color={col} style="stroke" strokeWidth={1.5} opacity={0.22} />
      {Array.from({ length: TRAIL }).map((_, i) => (
        <PulsarDot key={i} cx={cx} cy={cy} R={R} col={col} t={t} trailIdx={i} trail={TRAIL} />
      ))}
      <Circle cx={headX} cy={headY} r={12} color={col} opacity={0.22}>
        <Paint style="fill"><BlurMask blur={8} style="normal" /></Paint>
      </Circle>
    </Group>
  );
}

function PulsarDot({ cx, cy, R, col, t, trailIdx, trail }: any) {
  const trailOffset = -(trailIdx / trail) * 0.7;
  const frac = (trail - trailIdx) / trail;
  const a = useDerivedValue(() => t.value * Math.PI * 2 * 2.0 + trailOffset, [t]);
  const x = useDerivedValue(() => cx + Math.cos(a.value) * R, [a]);
  const y = useDerivedValue(() => cy + Math.sin(a.value) * R, [a]);
  const dotR = trailIdx === 0 ? 7 : Math.max(2, 6 * frac * frac);
  const opacity = trailIdx === 0 ? 1.0 : frac * frac * 0.75;
  return <Circle cx={x} cy={y} r={dotR} color={trailIdx === 0 ? '#FFFFFF' : col} opacity={opacity} />;
}

// ── DOUBLE SQUARE dot sub-component ──────────────────────────────────────────
function SquareDot({ cx, cy, R, color, baseAngle, radiusFrac, tVal, speed, dotR }: any) {
  const x = useDerivedValue(() => cx + Math.cos(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radiusFrac, [tVal]);
  const y = useDerivedValue(() => cy + Math.sin(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radiusFrac, [tVal]);
  const op = useDerivedValue(() => 0.25 + Math.sin(tVal.value * Math.PI * 2) * 0.65, [tVal]);
  return <Circle cx={x} cy={y} r={dotR} color={color} opacity={op} />;
}

// ── DOUBLE SQUARE ─────────────────────────────────────────────────────────────
function DoubleSquareEffect({ cx, cy, R, col, col2, t, tMed, tSlow, animated }: any) {
  const negTMed071 = useDerivedValue(() => -tMed.value * 0.71, [tMed]);
  const t045 = useDerivedValue(() => t.value * 0.45, [t]);

  function sqPath(r: number, rotVal: any) {
    return useDerivedValue(() => {
      const p = Skia.Path.Make();
      for (let i = 0; i <= 4; i++) {
        const angle = (i / 4) * Math.PI * 2 - Math.PI / 4 + rotVal.value * Math.PI * 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
      }
      p.close();
      return p;
    }, [rotVal]);
  }

  const sq1 = sqPath(R * 0.95, tSlow);
  const sq2 = sqPath(R * 0.72, negTMed071);
  const sq3 = sqPath(R * 0.52, t045);

  const outerOp = useDerivedValue(() => 0.20 + Math.sin(tSlow.value * Math.PI * 2) * 0.08, [tSlow]);
  const sq1Angles = useMemo(() => Array.from({ length: 4 }).map((_, i) => (i / 4) * Math.PI * 2 - Math.PI / 4), []);
  const sq2Angles = useMemo(() => Array.from({ length: 4 }).map((_, i) => (i / 4) * Math.PI * 2 - Math.PI / 4), []);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 4} color={col} style="stroke" strokeWidth={1} opacity={outerOp} />
      <Path path={sq1} color={col}  style="stroke" strokeWidth={1.8} strokeJoin="round" opacity={0.85} />
      <Path path={sq2} color={col2} style="stroke" strokeWidth={1.4} strokeJoin="round" opacity={0.68} />
      <Path path={sq3} color={col}  style="stroke" strokeWidth={1.0} strokeJoin="round" opacity={0.40} />
      {sq1Angles.map((angle, i) => (
        <SquareDot key={`s1${i}`} cx={cx} cy={cy} R={R} color={col}  baseAngle={angle} radiusFrac={0.95} tVal={tSlow} speed={1}     dotR={6}   />
      ))}
      {sq2Angles.map((angle, i) => (
        <SquareDot key={`s2${i}`} cx={cx} cy={cy} R={R} color={col2} baseAngle={angle} radiusFrac={0.72} tVal={tMed}  speed={-0.71} dotR={4.5} />
      ))}
    </Group>
  );
}

// ── TRIPLE TRI dot sub-component ──────────────────────────────────────────────
function TriDot({ cx, cy, R, color, baseAngle, radiusFrac, tVal, speed, dotR }: any) {
  const x = useDerivedValue(() => cx + Math.cos(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radiusFrac, [tVal]);
  const y = useDerivedValue(() => cy + Math.sin(baseAngle + tVal.value * Math.PI * 2 * speed) * R * radiusFrac, [tVal]);
  const op = useDerivedValue(() => 0.30 + Math.sin(tVal.value * Math.PI * 2) * 0.60, [tVal]);
  return <Circle cx={x} cy={y} r={dotR} color={color} opacity={op} />;
}

// ── TRIPLE TRI ────────────────────────────────────────────────────────────────
function TripleTriEffect({ cx, cy, R, col, col2, t, tMed, tSlow, animated }: any) {
  const negTMed083 = useDerivedValue(() => -tMed.value * 0.83, [tMed]);
  const t15 = useDerivedValue(() => t.value * 1.5, [t]);
  const negTSlow05 = useDerivedValue(() => -tSlow.value * 0.5, [tSlow]);

  function triPath(r: number, rotVal: any, up: boolean) {
    return useDerivedValue(() => {
      const p = Skia.Path.Make();
      const base = up ? -Math.PI / 2 : Math.PI / 2;
      for (let i = 0; i <= 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + base + rotVal.value * Math.PI * 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
      }
      p.close();
      return p;
    }, [rotVal]);
  }

  const tri1 = triPath(R * 0.90, tSlow, true);
  const tri2 = triPath(R * 0.90, negTMed083, false);
  const tri3 = triPath(R * 0.65, t15, true);
  const tri4 = triPath(R * 0.65, negTSlow05, false);

  const innerOp = useDerivedValue(() => 0.18 + Math.sin(tMed.value * Math.PI * 2) * 0.08, [tMed]);

  const d1Angles = useMemo(() => Array.from({ length: 3 }).map((_, i) => (i / 3) * Math.PI * 2 - Math.PI / 2), []);
  const d2Angles = useMemo(() => Array.from({ length: 3 }).map((_, i) => (i / 3) * Math.PI * 2 + Math.PI / 2), []);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 2}  color={col}  style="stroke" strokeWidth={1} opacity={0.30} />
      <Circle cx={cx} cy={cy} r={R - 12} color={col2} style="stroke" strokeWidth={1} opacity={innerOp} />
      <Path path={tri1} color={col}  style="stroke" strokeWidth={1.8} strokeJoin="round" opacity={0.90} />
      <Path path={tri2} color={col2} style="stroke" strokeWidth={1.8} strokeJoin="round" opacity={0.85} />
      <Path path={tri3} color={col}  style="stroke" strokeWidth={1.2} strokeJoin="round" opacity={0.45} />
      <Path path={tri4} color={col2} style="stroke" strokeWidth={1.1} strokeJoin="round" opacity={0.38} />
      {d1Angles.map((angle, i) => (
        <TriDot key={`d1${i}`} cx={cx} cy={cy} R={R} color={col}  baseAngle={angle} radiusFrac={0.90} tVal={tSlow} speed={1}     dotR={5.5} />
      ))}
      {d2Angles.map((angle, i) => (
        <TriDot key={`d2${i}`} cx={cx} cy={cy} R={R} color={col2} baseAngle={angle} radiusFrac={0.90} tVal={tMed}  speed={-0.83} dotR={5}   />
      ))}
    </Group>
  );
}

// ── SOLAR CYCLE ───────────────────────────────────────────────────────────────
function SolarCycleEffect({ cx, cy, R, col, col2, tSlow, t, animated }: any) {
  const outerRot  = useDerivedValue(() => tSlow.value * Math.PI * 2 * 0.5, [tSlow]);
  const innerRot  = useDerivedValue(() => -t.value * Math.PI * 2, [t]);
  const signalIdx = useDerivedValue(() => (tSlow.value * 24) % 12, [tSlow]);
  const outerOp   = useDerivedValue(() => 0.22 + Math.sin(tSlow.value * Math.PI * 2) * 0.10, [tSlow]);

  const outerDots = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
    angle: (i / 12) * Math.PI * 2 - Math.PI / 2,
    big: i % 3 === 0,
    x: cx + Math.cos((i / 12) * Math.PI * 2 - Math.PI / 2) * (R + 6),
    y: cy + Math.sin((i / 12) * Math.PI * 2 - Math.PI / 2) * (R + 6),
    i,
  })), [cx, cy, R]);

  const solarOuterTransform = useDerivedValue(
    () => [{ translateX: cx }, { translateY: cy }, { rotate: outerRot.value }, { translateX: -cx }, { translateY: -cy }],
    [outerRot]
  );
  const solarInnerTransform = useDerivedValue(
    () => [{ translateX: cx }, { translateY: cy }, { rotate: innerRot.value }, { translateX: -cx }, { translateY: -cy }],
    [innerRot]
  );

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={R + 6} color={col} style="stroke" strokeWidth={1} opacity={outerOp} />
      <Group transform={solarOuterTransform}>
        {outerDots.map(({ x, y, big, i }) => (
          <SolarDot key={i} cx={x} cy={y} big={big} col={col} col2={col2} idx={i} signalIdx={signalIdx} />
        ))}
      </Group>
      <Circle cx={cx} cy={cy} r={R - 8} color={col2} style="stroke" strokeWidth={1} opacity={0.20} />
      <Group transform={solarInnerTransform}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SolarInnerDot key={i} cx={cx} cy={cy} R={R} col={col} t={t} idx={i} />
        ))}
      </Group>
    </Group>
  );
}

function SolarDot({ cx, cy, big, col, col2, idx, signalIdx }: any) {
  const op = useDerivedValue(() => {
    const dist = Math.abs(((signalIdx.value - idx) % 12 + 12) % 12);
    return big ? (dist < 1 ? 0.4 + (1 - dist) * 0.6 : 0.4) : 0.55;
  }, [signalIdx]);
  return <Circle cx={cx} cy={cy} r={big ? 6 : 4} color={big ? col : col2} opacity={op} />;
}

function SolarInnerDot({ cx, cy, R, col, t, idx }: any) {
  const angle = (idx / 6) * Math.PI * 2 - Math.PI / 2;
  const x = cx + Math.cos(angle) * (R - 8);
  const y = cy + Math.sin(angle) * (R - 8);
  const op = useDerivedValue(() => 0.35 + Math.sin(t.value * Math.PI * 2 + idx * Math.PI / 3) * 0.45, [t]);
  return <Circle cx={x} cy={y} r={4} color={col} opacity={op} />;
}
