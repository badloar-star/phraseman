// ═══════════════════════════════════════════════════════════════════════════
// announcement_v2_particles.tsx — частицы и штриховые детали кадров объявлений (макет stories-announcements-v1.html, v2.1): шары, сердца,
// искры, облака, лавровое кольцо, лучи лампочки, пунктир между монетами, «печатает…».
//
// зачем: формулы раскладки, периоды и задержки — из макета 1:1 (шары: дорожки 3/20/66/84 %, 9 + 1,5·i с, качание ±7° за 3,6 с;
// сердца: 12 штук, x = 5 + 23·i % 90, 14 + 8·(i % 4), 4 + i % 3 с, задержка −700·i; искры: 2,4 с, задержка 330·i; облака 26 + 7·i с).
// «Уменьшить движение» — частиц нет (display: none макета), штриховые детали стоят в конечном состоянии.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { EASE_CSS_OUT, frameMs, loop, phase, useStoryFrameClock } from '../templates/story_frame_clock';
import { EASE_CSS, EASE_CSS_IN_OUT, EASE_LINEAR, Keyframed, Loop, type Key } from './announcement_v2_motion';
import { useAnnPalette } from './announcement_v2_palette';

// ── шары (День рождения): 4 дорожки по краям, подъём 820 dp, качание ──────────────────────────────────────────────

const BALLOON_LANES = [3, 20, 66, 84] as const;
const RISE: readonly Key[] = [{ at: 0, y: 0, opacity: 0 }, { at: 0.08, opacity: 1 }, { at: 1, y: -820, opacity: 1 }]; // зачем: y только на 0/100 % — одна кривая на весь подъём, как в макете
const SWAY: readonly Key[] = [{ at: 0, rot: -7 }, { at: 1, rot: 7 }];

export const Balloons = memo(function Balloons() {
  const pal = useAnnPalette();
  const { final } = useStoryFrameClock();
  const colors = [pal.accG, pal.accB, pal.gradB, pal.accG];
  if (final) return null;
  return (
    <>
      {BALLOON_LANES.map((x, i) => (
        <Loop key={x} keys={RISE} periodMs={(9 + i * 1.5) * 1000} d={-(i * 2600)} ease={EASE_CSS_IN_OUT} style={[p.balloon, { left: `${x}%` }]}>
          <Loop keys={SWAY} periodMs={3600} alternate ease={EASE_CSS_IN_OUT}>
            <Svg width={70} height={105} viewBox="0 0 70 105">
              <Ellipse cx={35} cy={34} rx={27} ry={33} fill={colors[i]} />
              <Path d="M35 67 l-4 7 h8 z" fill={colors[i]} />
              <Path d="M35 74 q7 12 0 26" stroke={pal.tx} strokeOpacity={0.45} strokeWidth={2} fill="none" />
            </Svg>
          </Loop>
        </Loop>
      ))}
    </>
  );
});

// ── сердца (Спасибо): поднимаются на 640 с боковым сносом, растут и тают ──────────────────────────────────────────

export const Hearts = memo(function Hearts() {
  const pal = useAnnPalette();
  const { final } = useStoryFrameClock();
  const specs = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    key: `h${i}`, x: 5 + ((i * 23) % 90), size: 14 + (i % 4) * 8, periodMs: (4 + (i % 3)) * 1000, d: -(i * 700), sx: ((i % 3) - 1) * 40,
  })), []);
  if (final) return null;
  return (
    <>
      {specs.map((s) => {
        // зачем (stHeart макета): на ключе 10 % задана только прозрачность .9 — движение и рост идут одним отрезком 0 → 100 % с общим
        // ease; ключи без свойства keyValue пропускает, так что y/x/scale на 10 % не задаём, иначе изгиб траектории отличается от CSS.
        const keys: readonly Key[] = [{ at: 0, y: 0, x: 0, scale: 0.6, opacity: 0 }, { at: 0.1, opacity: 0.9 }, { at: 1, y: -640, x: s.sx, scale: 1.1, opacity: 0 }];
        return (
          <Loop key={s.key} keys={keys} periodMs={s.periodMs} d={s.d} ease={EASE_CSS_OUT} style={[p.heart, { left: `${s.x}%` }]}>
            <Ionicons name="heart" size={s.size} color={pal.accG} />
          </Loop>
        );
      })}
    </>
  );
});

// ── искры (Только сегодня): 6 искр мигают по 2,4 с ───────────────────────────────────────────────────────────────

const SPARK: readonly Key[] = [{ at: 0, opacity: 0, scale: 0.4, rot: 0 }, { at: 0.5, opacity: 1, scale: 1, rot: 20 }, { at: 1, opacity: 0, scale: 0.4, rot: 0 }];

export const Sparks = memo(function Sparks({ n = 6 }: Readonly<{ n?: number }>) {
  const pal = useAnnPalette();
  const { final } = useStoryFrameClock();
  const color = pal.isLight ? pal.accG : pal.accB;
  if (final) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => ( // guard-ok: искры — постоянный набор, порядок не меняется
        <Loop key={i} keys={SPARK} periodMs={2400} d={i * 330} ease={EASE_CSS_IN_OUT} style={[p.spark, { left: `${8 + ((i * 13) % 84)}%`, top: `${10 + ((i * 29) % 70)}%` }]}>
          <Ionicons name="sparkles" size={14 + (i % 3) * 8} color={color} />
        </Loop>
      ))}
    </>
  );
});

// ── облака (Пик): мягкие эллипсы плывут слева направо ─────────────────────────────────────────────────────────────

const CLOUD: readonly Key[] = [{ at: 0, x: 0 }, { at: 1, x: 640 }];

export const Clouds = memo(function Clouds({ id }: Readonly<{ id: string }>) {
  const pal = useAnnPalette();
  const { final } = useStoryFrameClock();
  if (final) return null;
  return (
    <>
      {[0, 1, 2].map((i) => ( // guard-ok: три облака, порядок постоянный
        <Loop key={i} keys={CLOUD} periodMs={(26 + i * 7) * 1000} d={-(i * 9000)} ease={EASE_LINEAR} style={[p.cloud, { top: 90 + i * 150 }]}>
          <Svg width={200} height={70} viewBox="0 0 200 70">
            <Defs>
              <RadialGradient id={`${id}${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={pal.tx} stopOpacity={0.12} />
                <Stop offset="0.7" stopColor={pal.tx} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={100} cy={35} rx={100} ry={35} fill={`url(#${id}${i})`} />
          </Svg>
        </Loop>
      ))}
    </>
  );
});

// ── лавровое кольцо (Автор недели): штрих 3/14, оборот 24 с ──────────────────────────────────────────────────────

const SPIN: readonly Key[] = [{ at: 0, rot: 0 }, { at: 1, rot: 360 }];

export const Laurel = memo(function Laurel() {
  const pal = useAnnPalette();
  return (
    <Loop keys={SPIN} periodMs={24000} ease={EASE_LINEAR} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={180} height={180} viewBox="0 0 180 180">
        <Circle cx={90} cy={90} r={80} fill="none" stroke={pal.accG} strokeWidth={6} strokeDasharray="3 14" strokeLinecap="round" />
      </Svg>
    </Loop>
  );
});

// ── лучи лампочки (Совет): 8 лучей загораются по кругу (2,6 с, задержка 300·i) ────────────────────────────────────

const AnimatedLine = Animated.createAnimatedComponent(Line);

const Ray = memo(function Ray({ angle, d, color }: Readonly<{ angle: number; d: number; color: string }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const r = (Math.PI * angle) / 180;
  const cx = 75 + Math.cos(r) * 63;
  const cy = 68 + Math.sin(r) * 63;
  const props = useAnimatedProps(() => {
    const t = frameMs(progress.value, durationMs, final);
    // stRay: 0 % и 100 % — прозрачно и scale .5; 50 % — видно и scale 1 (ease-in-out, бесконечно); final — лучи горят
    const u = final ? 0.5 : loop(Math.max(0, t - d), 2600, false);
    const k = EASE_CSS_IN_OUT(u <= 0.5 ? u * 2 : 2 - u * 2);
    const s = 0.5 + 0.5 * k;
    return { opacity: k, x1: cx - Math.cos(r) * 7 * s, y1: cy - Math.sin(r) * 7 * s, x2: cx + Math.cos(r) * 7 * s, y2: cy + Math.sin(r) * 7 * s };
  });
  return <AnimatedLine animatedProps={props} stroke={color} strokeWidth={5} strokeLinecap="round" />;
});

/** Лампочка 150 × 170 макета: колба accent·30 % с обводкой accent, цоколь secondary, 8 лучей. */
export const Bulb = memo(function Bulb() {
  const pal = useAnnPalette();
  return (
    <Svg width={150} height={170} viewBox="0 0 150 170">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => <Ray key={a} angle={a} d={i * 300} color={pal.accG} />)}
      <Circle cx={75} cy={68} r={36} fill={pal.accG} fillOpacity={0.3} stroke={pal.accG} strokeWidth={4} />
      <Path d="M60 98 h30 v10 a6 6 0 0 1 -6 6 h-18 a6 6 0 0 1 -6 -6 z" fill={pal.accG} fillOpacity={0.3} stroke={pal.accG} strokeWidth={4} />
      <Path d="M67 118 h16 a4 4 0 0 1 4 4 v4 a4 4 0 0 1 -4 4 h-16 a4 4 0 0 1 -4 -4 v-4 a4 4 0 0 1 4 -4 z" fill={pal.sec} />
    </Svg>
  );
});

// ── пунктир между монетами (Пригласи друзей): штрих 8/9, прочерчивается за 1100 мс после 300 ──────────────────────

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const DashedLink = memo(function DashedLink() {
  const pal = useAnnPalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const props = useAnimatedProps(() => ({ strokeDashoffset: 170 * (1 - EASE_CSS_OUT(phase(frameMs(progress.value, durationMs, final), 300, 1100))) }));
  return (
    <Svg width={120} height={24} viewBox="0 0 120 24" style={p.link}>
      <AnimatedPath d="M4 12 C 30 -6, 90 30, 116 12" stroke={pal.accG} strokeWidth={3} strokeLinecap="round" fill="none" strokeDasharray="8 9" animatedProps={props} />
    </Svg>
  );
});

// ── «печатает…» (Вопрос и ответ): пузырь всплывает и тает (1500 мс после 700), точки подпрыгивают ─────────────────

const DOTS_BUBBLE: readonly Key[] = [{ at: 0, opacity: 0, scale: 0.6 }, { at: 0.15, opacity: 1, scale: 1 }, { at: 0.8, opacity: 1, scale: 1 }, { at: 1, opacity: 0, scale: 0.8 }];
const DOT: readonly Key[] = [{ at: 0, y: 0 }, { at: 1, y: -5 }];

export const TypingDots = memo(function TypingDots() {
  const pal = useAnnPalette();
  return (
    <Keyframed keys={DOTS_BUBBLE} d={700} dur={1500} ease={EASE_CSS} originX={22} originY={17} style={[p.dots, { backgroundColor: pal.accG }]} pointerEvents="none">
      {[0, 150, 300].map((d) => <Loop key={d} keys={DOT} periodMs={450} alternate d={-d} ease={EASE_CSS_IN_OUT} style={[p.dot, { backgroundColor: pal.accInk }]} />)}
    </Keyframed>
  );
});

const p = StyleSheet.create({
  // зачем: базовая прозрачность 0, как в CSS (.bl / .hp / .sparks .io): до старта и в покое частица невидима, цикл сам поднимает opacity
  balloon: { position: 'absolute', bottom: -120, width: 70, height: 105, opacity: 0 },
  heart: { position: 'absolute', bottom: -40, opacity: 0 },
  spark: { position: 'absolute', opacity: 0 },
  cloud: { position: 'absolute', left: -200, width: 200, height: 70 },
  link: { position: 'absolute', left: 100, top: 43 },
  // .chat .dots: справа внизу, поля 14/16, радиус 20 (угол 6), точки 7 с зазором 5
  dots: { position: 'absolute', right: 0, bottom: 0, flexDirection: 'row', gap: 5, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, borderBottomRightRadius: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
