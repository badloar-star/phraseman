/**
 * CelebrationSceneViews — визуалы сцен акта 2 празднования (v6 «Золотая палата»).
 *
 * зачем: владелец потребовал (2026-08-24), чтобы КАЖДОЕ преимущество имело свою
 * механику, а не строку в общей ленте. Каждая сцена ниже — маленький спектакль
 * со своими таймингами; те же миллисекунды лежат в картах ударов
 * docs/design/CELEBRATION_SOUND_PROMPTS.md, поэтому менять их здесь можно
 * только вместе с документом и modules/audio/sound_motion.ts.
 *
 * Все анимации — только opacity/transform (UI-поток Reanimated), без scrollTo
 * и без анимации layout-свойств. На слабых устройствах и при «Уменьшении
 * движения» сцена показывает финальный кадр без движения.
 *
 * Макет-эталон: .motion-mockups/phraseman-celebration-v6.html
 */
import React, { memo, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Reanimated, {
  Easing as REasing,
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from '../SafeLinearGradient';
import type { CelebrationPalette } from './celebrationContent';
import type { CelebrationSceneId } from './celebrationScenes';
import { CELEBRATION_SCENE_COLORS as C } from '../../constants/celebrationSceneColors';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

/** Сильная кривая выхода — единый словарь движения проекта. */
const EASE_OUT = REasing.bezier(0.23, 1, 0.32, 1);
const POP = { mass: 0.5, damping: 11, stiffness: 190 } as const;

export interface SceneViewProps {
  palette: CelebrationPalette;
  /** true — играть анимацию; false — сразу финальный кадр (reduce motion / low-end). */
  animate: boolean;
}

/** Общий помощник: значение 0→1 с задержкой, либо сразу 1 без движения. */
function useCue(animate: boolean, delayMs: number, durationMs: number) {
  const v = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) { v.value = 1; return undefined; }
    v.value = 0;
    v.value = withDelay(delayMs, withTiming(1, { duration: durationMs, easing: EASE_OUT }));
    return () => cancelAnimation(v);
  }, [animate, delayMs, durationMs, v]);
  return v;
}

/** Пружинный «выпрыг» — для чисел и знаков (никогда не из scale 0). */
function usePop(animate: boolean, delayMs: number) {
  const v = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) { v.value = 1; return undefined; }
    v.value = 0;
    v.value = withDelay(delayMs, withSpring(1, POP));
    return () => cancelAnimation(v);
  }, [animate, delayMs, v]);
  return v;
}

// ═══════════ 1 · ЭНЕРГИЯ — шкала лопается в ∞ ═══════════
// Карта ударов: 110 рост кольца · 580 вспышка молнии · 600 «5/5» рвётся · 810 ∞
const GAUGE_R = 74;
const GAUGE_C = 2 * Math.PI * GAUGE_R;

const EnergyScene = memo(function EnergyScene({ palette, animate }: SceneViewProps) {
  const fill = useSharedValue(animate ? 0.3 : 1);
  const bolt = useSharedValue(1);
  const capOut = useCue(animate, 600, 420);
  const inf = usePop(animate, 810);

  useEffect(() => {
    if (!animate) { fill.value = 1; bolt.value = 1; return undefined; }
    fill.value = 0.3;
    fill.value = withDelay(110, withTiming(1, { duration: 680, easing: EASE_OUT }));
    bolt.value = withDelay(580, withSequence(
      withTiming(1.42, { duration: 180, easing: EASE_OUT }),
      withSpring(1, POP),
    ));
    return () => { cancelAnimation(fill); cancelAnimation(bolt); };
  }, [animate, fill, bolt]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: GAUGE_C * (1 - fill.value) }));
  const boltStyle = useAnimatedStyle(() => ({ transform: [{ scale: bolt.value }] }));
  const capStyle = useAnimatedStyle(() => ({
    opacity: 1 - capOut.value,
    transform: [{ scale: interpolate(capOut.value, [0, 1], [1, 1.55]) }],
  }));
  const infStyle = useAnimatedStyle(() => ({ opacity: inf.value, transform: [{ scale: inf.value }] }));

  return (
    <View style={styles.center}>
      <View style={styles.gauge}>
        <Svg width={168} height={168}>
          <Circle cx={84} cy={84} r={GAUGE_R} stroke={C.trackDim} strokeWidth={11} fill="none" />
          <AnimatedCircle
            cx={84} cy={84} r={GAUGE_R}
            stroke={palette.main} strokeWidth={11} fill="none" strokeLinecap="round"
            strokeDasharray={GAUGE_C}
            animatedProps={ringProps}
            transform="rotate(-90 84 84)"
          />
        </Svg>
        <Reanimated.View style={[styles.gaugeCore, boltStyle]}>
          <Ionicons name="flash" size={52} color={palette.bright} />
        </Reanimated.View>
        <Reanimated.View style={[styles.gaugeCap, capStyle]}>
          <Text style={styles.gaugeCapText}>5 / 5</Text>
        </Reanimated.View>
        <Reanimated.View style={[styles.gaugeInf, infStyle]}>
          <Text style={[styles.gaugeInfText, { color: palette.bright }]}>∞</Text>
        </Reanimated.View>
      </View>
    </View>
  );
});

// ═══════════ 2 · УРОКИ — замки слетают диагональной волной ═══════════
// Карта ударов: 70 · 116 · 162 · 208 · 254 · 300 (группы по 1-2-3-3-2-1)
const LOCK_CELLS = Array.from({ length: 12 }, (_, i) => ({
  i,
  delay: 70 + ((i % 4) + Math.floor(i / 4)) * 46,
}));

const LockCell = memo(function LockCell({ delay, palette, animate }: { delay: number; palette: CelebrationPalette; animate: boolean }) {
  const t = useCue(animate, delay, 480);
  const cellStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 0.52, 1], [C.trackDim, `${palette.main}94`, `${palette.main}42`]),
    transform: [{ scale: interpolate(t.value, [0, 0.52, 1], [1, 1.15, 1]) }],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, t.value / 0.8),
    transform: [
      { translateY: interpolate(t.value, [0, 0.8], [0, -22], 'clamp') },
      { rotate: `${interpolate(t.value, [0, 0.8], [0, -26], 'clamp')}deg` },
    ],
  }));
  return (
    <Reanimated.View style={[styles.lockCell, cellStyle]}>
      <Reanimated.View style={lockStyle}>
        <Ionicons name="lock-closed" size={18} color={C.lockIcon} />
      </Reanimated.View>
    </Reanimated.View>
  );
});

const LessonsScene = memo(function LessonsScene({ palette, animate }: SceneViewProps) {
  return (
    <View style={styles.center}>
      <View style={styles.lockGrid}>
        {LOCK_CELLS.map((c) => (
          <LockCell key={c.i} delay={c.delay} palette={palette} animate={animate} />
        ))}
      </View>
    </View>
  );
});

// ═══════════ 3 · КАРТОЧКИ — веер ═══════════
// Карта ударов: 90 · 178 · 266 · 354 · 442 (ровно 88 мс — раздача карт), 700 счётчик
const DECK = [
  { rot: -15, dx: -18, dy: 6 },
  { rot: -8, dx: -9, dy: 3 },
  { rot: -2, dx: 0, dy: 0 },
  { rot: 5, dx: 9, dy: -3 },
  { rot: 12, dx: 18, dy: -6 },
];

const DeckCard = memo(function DeckCard({ spec, index, palette, animate }: {
  spec: typeof DECK[number]; index: number; palette: CelebrationPalette; animate: boolean;
}) {
  const t = useCue(animate, 90 + index * 88, 460);
  const st = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, spec.dx]) },
      { translateY: interpolate(t.value, [0, 1], [-34, spec.dy]) },
      { rotate: `${interpolate(t.value, [0, 1], [0, spec.rot])}deg` },
      { scale: interpolate(t.value, [0, 1], [0.86, 1]) },
    ],
  }));
  return (
    <Reanimated.View style={[styles.deckCard, st]}>
      <LinearGradient
        colors={[`${palette.main}57`, C.deckCardBottom]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Reanimated.View>
  );
});

const CardsScene = memo(function CardsScene({ palette, animate }: SceneViewProps) {
  const n = usePop(animate, 700);
  const nStyle = useAnimatedStyle(() => ({ opacity: n.value, transform: [{ scale: n.value }] }));
  return (
    <View style={styles.center}>
      <View style={styles.deckStage}>
        {DECK.map((spec, i) => (
          <DeckCard key={`deck_${spec.rot}`} spec={spec} index={i} palette={palette} animate={animate} />
        ))}
      </View>
      <Reanimated.View style={nStyle}>
        <Text style={[styles.bigNote, { color: palette.bright }]}>20 → ∞</Text>
      </Reanimated.View>
    </View>
  );
});

// ═══════════ 4 · ДИАЛОГИ — три реплики ═══════════
// Карта ударов: 120 · 300 · 520 (неравномерно — пауза на обдумывание)
const BUBBLES = [
  { delay: 120, me: true, text: 'Can I get a coffee?' },
  { delay: 300, me: false, text: 'Sure! For here or to go?' },
  { delay: 520, me: true, text: 'To go, please.' },
];

const Bubble = memo(function Bubble({ b, palette, animate }: { b: typeof BUBBLES[number]; palette: CelebrationPalette; animate: boolean }) {
  const t = usePop(animate, b.delay);
  const st = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [
      { translateY: interpolate(t.value, [0, 1], [12, 0]) },
      { scale: interpolate(t.value, [0, 1], [0.92, 1]) },
    ],
  }));
  return (
    <Reanimated.View
      style={[
        styles.bubble,
        b.me ? styles.bubbleMe : styles.bubbleAi,
        { backgroundColor: b.me ? palette.main : C.bubbleAiBg },
        st,
      ]}
    >
      <Text style={[styles.bubbleText, { color: b.me ? palette.ctaText : C.bubbleAiText }]}>{b.text}</Text>
    </Reanimated.View>
  );
});

const DialogsScene = memo(function DialogsScene({ palette, animate }: SceneViewProps) {
  return (
    <View style={styles.center}>
      <View style={styles.chat}>
        {BUBBLES.map((b) => <Bubble key={`bub_${b.delay}`} b={b} palette={palette} animate={animate} />)}
      </View>
    </View>
  );
});

// ═══════════ 5 · ГОЛОС — волна собирается в оценку ═══════════
// Карта ударов: 70-510 рост столбиков (каждые 40 мс) · 690 оценка · 720 волна гаснет
const WAVE_H = [24, 54, 98, 70, 116, 50, 84, 112, 60, 92, 40, 66];

const WaveBar = memo(function WaveBar({ h, index, palette, animate }: { h: number; index: number; palette: CelebrationPalette; animate: boolean }) {
  const t = useCue(animate, 70 + index * 40, 800);
  const st = useAnimatedStyle(() => ({
    height: interpolate(t.value, [0, 1], [8, h]),
    opacity: interpolate(t.value, [0, 0.42, 1], [0.32, 1, 0.88]),
  }));
  return <Reanimated.View style={[styles.waveBar, { backgroundColor: palette.main }, st]} />;
});

const VoiceScene = memo(function VoiceScene({ palette, animate }: SceneViewProps) {
  const score = usePop(animate, 690);
  const fade = useCue(animate, 720, 360);
  const scoreStyle = useAnimatedStyle(() => ({ opacity: score.value, transform: [{ scale: score.value }] }));
  const waveStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fade.value, [0, 1], [1, 0.14]),
    transform: [{ scale: interpolate(fade.value, [0, 1], [1, 0.9]) }],
  }));
  return (
    <View style={styles.center}>
      <Reanimated.View style={[styles.wave, waveStyle]}>
        {WAVE_H.map((h, i) => <WaveBar key={`wave_${i}_${h}`} h={h} index={i} palette={palette} animate={animate} />)}
      </Reanimated.View>
      <Reanimated.View style={[styles.scoreWrap, scoreStyle]}>
        <Text style={[styles.scoreText, { color: palette.bright }]}>92</Text>
      </Reanimated.View>
    </View>
  );
});

// ═══════════ 6 · ТРЕНЕР — узлы лечатся ═══════════
// Карта ударов: 160 · 350 · 540 (три пары «проблема → решение»)
const NODES = [
  { x: 16, y: 24, weak: false }, { x: 84, y: 12, weak: true },
  { x: 150, y: 38, weak: false }, { x: 44, y: 84, weak: false },
  { x: 116, y: 72, weak: true }, { x: 182, y: 98, weak: false },
  { x: 72, y: 124, weak: true }, { x: 138, y: 120, weak: false },
];
const LINKS: [number, number][] = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7]];
const WEAK_ORDER = [1, 4, 6];

const CoachNode = memo(function CoachNode({ node, palette, animate }: {
  node: typeof NODES[number]; palette: CelebrationPalette; animate: boolean;
}) {
  const idx = WEAK_ORDER.indexOf(NODES.indexOf(node));
  const t = useCue(animate && node.weak, node.weak ? 160 + Math.max(0, idx) * 190 : 0, 640);
  const st = useAnimatedStyle(() => {
    if (!node.weak) return { backgroundColor: C.nodeIdle, transform: [{ scale: 1 }] };
    return {
      backgroundColor: interpolateColor(t.value, [0, 0.46, 1], [C.nodeWeak, C.nodeWeak, palette.main]),
      transform: [{ scale: interpolate(t.value, [0, 0.46, 1], [1, 1.65, 1.18]) }],
    };
  });
  return <Reanimated.View style={[styles.node, { left: node.x, top: node.y }, st]} />;
});

const CoachLink = memo(function CoachLink({ a, b, index, palette, animate }: {
  a: typeof NODES[number]; b: typeof NODES[number]; index: number; palette: CelebrationPalette; animate: boolean;
}) {
  const t = useCue(animate, 90 + index * 26, 560);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const st = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [C.linkIdle, `${palette.main}70`]),
  }));
  return (
    <Reanimated.View
      style={[
        styles.link,
        { left: a.x + 7, top: a.y + 7, width: len, transform: [{ rotate: `${angle}deg` }] },
        st,
      ]}
    />
  );
});

const CoachScene = memo(function CoachScene({ palette, animate }: SceneViewProps) {
  return (
    <View style={styles.center}>
      <View style={styles.brain}>
        {LINKS.map(([i, j], k) => (
          <CoachLink key={`link_${i}_${j}`} a={NODES[i]} b={NODES[j]} index={k} palette={palette} animate={animate} />
        ))}
        {NODES.map((n) => <CoachNode key={`node_${n.x}_${n.y}`} node={n} palette={palette} animate={animate} />)}
      </View>
    </View>
  );
});

// ═══════════ 7 · РАЗБОР ОШИБОК ═══════════
// Карта ударов: 320 вычёркивание · 560 верная фраза · 800 объяснение
const ErrorsScene = memo(function ErrorsScene({ palette, animate }: SceneViewProps) {
  const strike = useCue(animate, 320, 300);
  const badOut = useCue(animate, 320, 480);
  const good = useCue(animate, 560, 460);
  const why = useCue(animate, 800, 380);

  const strikeStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: strike.value }] }));
  const badStyle = useAnimatedStyle(() => ({
    opacity: 1 - badOut.value,
    transform: [{ translateY: interpolate(badOut.value, [0, 1], [0, -26]) }],
  }));
  const goodStyle = useAnimatedStyle(() => ({
    opacity: good.value,
    transform: [{ translateY: interpolate(good.value, [0, 1], [16, 0]) }],
  }));
  const whyStyle = useAnimatedStyle(() => ({ opacity: why.value }));

  return (
    <View style={styles.center}>
      <View style={styles.fixRow}>
        <Reanimated.View style={badStyle}>
          <Text style={styles.badText}>I am go to work</Text>
          <Reanimated.View style={[styles.strikeLine, strikeStyle]} />
        </Reanimated.View>
        <Reanimated.View style={[styles.goodWrap, goodStyle]}>
          <Text style={[styles.goodText, { color: palette.bright }]}>I go to work</Text>
        </Reanimated.View>
      </View>
      <Reanimated.View style={whyStyle}>
        <Text style={[styles.whyText, { color: palette.rowSub }]}>после «I» — простая форма, без «am»</Text>
      </Reanimated.View>
    </View>
  );
});

// ═══════════ 8 · ПЛАН — маршрут прочерчивается ═══════════
// Карта ударов: точки 100/230/360/490/620, линии 160/290/420/550
const PATH = [
  { x: 6, y: 110 }, { x: 52, y: 66 }, { x: 100, y: 96 }, { x: 146, y: 40 }, { x: 172, y: 8 },
];

const PlanNode = memo(function PlanNode({ p, index, palette, animate }: {
  p: typeof PATH[number]; index: number; palette: CelebrationPalette; animate: boolean;
}) {
  const t = useCue(animate, 100 + index * 130, 440);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.4, 1]),
    backgroundColor: interpolateColor(t.value, [0, 1], [C.trackDim, `${palette.main}4D`]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.9, 1]) }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(t.value, [0, 1], [C.planIdleText, palette.bright]),
  }));
  return (
    <Reanimated.View style={[styles.planNode, { left: p.x, top: p.y }, st]}>
      <Reanimated.Text style={[styles.planNodeText, textStyle]}>{index + 1}</Reanimated.Text>
    </Reanimated.View>
  );
});

const PlanLine = memo(function PlanLine({ a, b, index, palette, animate }: {
  a: typeof PATH[number]; b: typeof PATH[number]; index: number; palette: CelebrationPalette; animate: boolean;
}) {
  const t = useCue(animate, 160 + index * 130, 340);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle}deg` }, { scaleX: t.value }] }));
  return (
    <Reanimated.View
      style={[styles.planLine, { left: a.x + 17, top: a.y + 16, width: len, backgroundColor: palette.main }, st]}
    />
  );
});

const PlanScene = memo(function PlanScene({ palette, animate }: SceneViewProps) {
  return (
    <View style={styles.center}>
      <View style={styles.pathStage}>
        {PATH.slice(0, -1).map((p, i) => (
          <PlanLine key={`l${i}`} a={p} b={PATH[i + 1]} index={i} palette={palette} animate={animate} />
        ))}
        {PATH.map((p, i) => <PlanNode key={`n${i}`} p={p} index={i} palette={palette} animate={animate} />)}
      </View>
    </View>
  );
});

// ═══════════ 9 · АНАЛИТИКА — столбцы лесенкой ═══════════
// Карта ударов: 80/132/184/236/288/340/392/444/496 (ровно 52 мс), 640 число
const BARS = [34, 52, 44, 76, 64, 96, 82, 118, 104];

const StatBar = memo(function StatBar({ h, index, palette, animate }: { h: number; index: number; palette: CelebrationPalette; animate: boolean }) {
  const t = useCue(animate, 80 + index * 52, 520);
  const st = useAnimatedStyle(() => ({
    height: interpolate(t.value, [0, 1], [5, h]),
    opacity: interpolate(t.value, [0, 1], [0.4, 1]),
  }));
  return (
    <Reanimated.View style={[styles.statBar, st]}>
      <LinearGradient
        colors={[palette.main, C.statBarBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Reanimated.View>
  );
});

const StatsScene = memo(function StatsScene({ palette, animate }: SceneViewProps) {
  const n = usePop(animate, 640);
  const nStyle = useAnimatedStyle(() => ({ opacity: n.value, transform: [{ scale: n.value }] }));
  return (
    <View style={styles.center}>
      <Reanimated.View style={[styles.statNumber, nStyle]}>
        <Text style={[styles.statNumberText, { color: palette.bright }]}>365</Text>
      </Reanimated.View>
      <View style={styles.chart}>
        {BARS.map((h, i) => <StatBar key={`bar_${i}_${h}`} h={h} index={i} palette={palette} animate={animate} />)}
      </View>
    </View>
  );
});

// ═══════════ 10 · СЕРИЯ — щит закрывает пропуск ═══════════
// Карта ударов: 110 щит начинает падать · 400 удар
const STREAK_DAYS = [1, 2, 3, 4, 5, 6, 7];
const GAP_DAY = 4;

const StreakScene = memo(function StreakScene({ palette, animate }: SceneViewProps) {
  const shield = useCue(animate, 110, 600);
  const seal = useCue(animate, 400, 600);

  const shieldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shield.value, [0, 0.6, 1], [0, 1, 0]),
    transform: [
      { translateY: interpolate(shield.value, [0, 0.6, 1], [-58, 0, 0]) },
      { scale: interpolate(shield.value, [0, 0.6, 1], [1.9, 0.92, 1.45]) },
    ],
  }));
  const gapStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(seal.value, [0, 0.5, 1], [C.trackDim, `${palette.main}BD`, `${palette.main}4D`]),
    transform: [{ scale: interpolate(seal.value, [0, 0.5, 1], [1, 1.32, 1]) }],
  }));
  const gapTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(seal.value, [0, 1], [C.planIdleText, palette.bright]),
  }));

  return (
    <View style={styles.center}>
      <View style={styles.streakRow}>
        {STREAK_DAYS.map((d) => {
          const isGap = d === GAP_DAY;
          if (!isGap) {
            return (
              <View key={d} style={[styles.streakDay, { backgroundColor: `${palette.main}4D` }]}>
                <Text style={[styles.streakDayText, { color: palette.bright }]}>{d}</Text>
              </View>
            );
          }
          return (
            <Reanimated.View key={d} style={[styles.streakDay, gapStyle]}>
              <Reanimated.Text style={[styles.streakDayText, gapTextStyle]}>{d}</Reanimated.Text>
            </Reanimated.View>
          );
        })}
      </View>
      <Reanimated.View style={[styles.shieldDrop, shieldStyle]} pointerEvents="none">
        <Ionicons name="shield-checkmark" size={74} color={palette.bright} />
      </Reanimated.View>
    </View>
  );
});

// ═══════════ 11 · АУРА — кольцо и образцы тем ═══════════
// Карта ударов: 220 аура · 420/478/536/594/652 образцы
const SWATCHES = C.auraSwatches;

const Swatch = memo(function Swatch({ color, index, animate }: { color: string; index: number; animate: boolean }) {
  const t = usePop(animate, 420 + index * 58);
  const st = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: interpolate(t.value, [0, 1], [12, 0]) }, { scale: interpolate(t.value, [0, 1], [0.7, 1]) }],
  }));
  return <Reanimated.View style={[styles.swatch, { backgroundColor: color }, st]} />;
});

const AuraScene = memo(function AuraScene({ palette, animate }: SceneViewProps) {
  const ring = useCue(animate, 220, 620);
  const ringStyle = useAnimatedStyle(() => ({ opacity: interpolate(ring.value, [0, 1], [0, 0.55]) }));
  return (
    <View style={styles.center}>
      <View style={styles.auraStage}>
        <Reanimated.View style={[styles.auraRing, ringStyle]}>
          <LinearGradient
            colors={[palette.main, C.auraHighlight, palette.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>
        <View style={styles.auraFace}>
          <Ionicons name="person" size={46} color={palette.bright} />
        </View>
      </View>
      <View style={styles.swatchRow}>
        {SWATCHES.map((c, i) => <Swatch key={c} color={c} index={i} animate={animate} />)}
      </View>
    </View>
  );
});

// ═══════════ 12 · MAX — сфера просыпается ═══════════
// Карта ударов: 80 сфера · 460/1020 кольца речи · 480 дорожка · 700 дыхание
const VOICE_LINES = [8, 15, 23, 12, 28, 19, 30, 16, 24, 11, 20, 7];

const MaxScene = memo(function MaxScene({ palette, animate }: SceneViewProps) {
  const wake = useCue(animate, 80, 620);
  const lines = useCue(animate, 420, 400);
  const ripple = useSharedValue(0);

  useEffect(() => {
    if (!animate) { ripple.value = 0; return undefined; }
    ripple.value = 0;
    ripple.value = withDelay(460, withTiming(1, { duration: 1700, easing: EASE_OUT }));
    return () => cancelAnimation(ripple);
  }, [animate, ripple]);

  const orbStyle = useAnimatedStyle(() => ({
    opacity: wake.value,
    transform: [{ scale: interpolate(wake.value, [0, 1], [0.84, 1]) }],
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ripple.value, [0, 0.14, 1], [0, 0.42, 0]),
    transform: [{ scale: interpolate(ripple.value, [0, 1], [1, 1.8]) }],
  }));
  const linesStyle = useAnimatedStyle(() => ({ opacity: lines.value }));

  return (
    <View style={styles.center}>
      <View style={styles.orbStage}>
        {/* guard-ok: это не обводка контейнера, а сама расходящаяся волна речи —
            кольцо и есть линия, тоном её не нарисовать */}
        <Reanimated.View style={[styles.orbRipple, { borderColor: palette.main }, rippleStyle]} />
        <Reanimated.View style={[styles.orb, orbStyle]}>
          <LinearGradient
            colors={C.orbGradient}
            start={{ x: 0.3, y: 0.2 }}
            end={{ x: 0.7, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.orbGlint} />
        </Reanimated.View>
      </View>
      <Reanimated.View style={[styles.voiceRow, linesStyle]}>
        {VOICE_LINES.map((h, i) => (
          <View key={`vl_${i}_${h}`} style={[styles.voiceLine, { height: h, backgroundColor: palette.main }]} />
        ))}
      </Reanimated.View>
    </View>
  );
});

// ═══════════ Реестр ═══════════

const SCENE_VIEWS: Record<CelebrationSceneId, React.ComponentType<SceneViewProps>> = {
  energy: EnergyScene,
  lessons: LessonsScene,
  cards: CardsScene,
  dialogs: DialogsScene,
  voice: VoiceScene,
  coach: CoachScene,
  errors: ErrorsScene,
  plan: PlanScene,
  stats: StatsScene,
  streak: StreakScene,
  aura: AuraScene,
  max: MaxScene,
};

export function CelebrationSceneView({ id, palette, animate }: SceneViewProps & { id: CelebrationSceneId }) {
  const Cmp = SCENE_VIEWS[id];
  if (!Cmp) return null;
  return <Cmp palette={palette} animate={animate} />;
}

export default memo(CelebrationSceneView);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  gauge: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
  gaugeCore: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  gaugeCap: {
    position: 'absolute', top: -6, paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 9, backgroundColor: C.capBg,
  },
  gaugeCapText: { color: C.capText, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.4 },
  gaugeInf: { position: 'absolute', top: -10 },
  gaugeInfText: { fontSize: 22, fontWeight: '900' },

  lockGrid: { width: 216, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  lockCell: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  deckStage: { width: 150, height: 168, alignItems: 'center', justifyContent: 'center' },
  deckCard: {
    position: 'absolute', width: 104, height: 138, borderRadius: 15, overflow: 'hidden',
  },
  bigNote: { fontSize: 19, fontWeight: '900', marginTop: 12 },

  chat: { width: 244, gap: 8 },
  bubble: { maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17 },
  bubbleMe: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  bubbleAi: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: 13.5, fontWeight: '600', lineHeight: 18 },

  wave: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 120 },
  waveBar: { width: 6, borderRadius: 3 },
  scoreWrap: { position: 'absolute' },
  scoreText: { fontSize: 54, fontWeight: '900' },

  brain: { width: 206, height: 146 },
  node: { position: 'absolute', width: 14, height: 14, borderRadius: 7 },
  link: { position: 'absolute', height: 1.4, transformOrigin: '0% 50%' },

  fixRow: { alignItems: 'center', minHeight: 72, justifyContent: 'center' },
  badText: { fontSize: 22, fontWeight: '800', color: C.nodeWeak },
  strikeLine: {
    position: 'absolute', left: -2, right: -2, top: '52%', height: 2.5,
    backgroundColor: C.nodeWeak, transformOrigin: '0% 50%',
  },
  goodWrap: { position: 'absolute' },
  goodText: { fontSize: 22, fontWeight: '800' },
  whyText: { fontSize: 13, fontWeight: '600', marginTop: 14, textAlign: 'center' },

  pathStage: { width: 206, height: 158 },
  planNode: {
    position: 'absolute', width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  planNodeText: { fontSize: 13, fontWeight: '800' },
  planLine: { position: 'absolute', height: 2.5, borderRadius: 2, transformOrigin: '0% 50%' },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: 132 },
  statBar: { width: 17, borderTopLeftRadius: 5, borderTopRightRadius: 5, overflow: 'hidden' },
  statNumber: { marginBottom: 14 },
  statNumberText: { fontSize: 31, fontWeight: '900' },

  streakRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  streakDay: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  streakDayText: { fontSize: 12.5, fontWeight: '800' },
  shieldDrop: { position: 'absolute' },

  auraStage: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  auraRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75, overflow: 'hidden' },
  auraFace: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: C.auraFaceBg,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  swatch: { width: 20, height: 20, borderRadius: 7 },

  orbStage: { width: 196, height: 196, alignItems: 'center', justifyContent: 'center' },
  orb: { width: 170, height: 170, borderRadius: 85, overflow: 'hidden' },
  // guard-ok: волна речи — линия по построению, а не рамка вокруг блока
  orbRipple: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 1.5 },
  orbGlint: {
    position: 'absolute', left: '19%', top: '13%', width: '44%', height: '25%',
    borderRadius: 40, backgroundColor: C.orbGlint,
  },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16, height: 32 },
  voiceLine: { width: 4, borderRadius: 2 },
});
