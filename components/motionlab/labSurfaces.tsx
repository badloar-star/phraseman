// ════════════════════════════════════════════════════════════════════════════
// labSurfaces.tsx — 13 поверхностей Motion Lab × 3 направления.
// Каждый сценарий перенесён из HTML-макета один в один: те же миллисекунды,
// те же пружины, тот же порядок событий.
// ════════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  type SharedValue,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import { hapticHeavyImpact, hapticLightImpact, hapticSuccess, hapticWarning } from '../../hooks/use-haptics';
import {
  EASE, IMPACT, LAB_COPY, LUMEN, METRO,
  type LabDirectionId, type LabSurfaceId, type Slow,
} from './labKit';
import {
  ImpactDust, ImpactRing, LabBackdrop, LabCta, LabLine, LabPanel, LabReward, LabRule,
  LumenBeam, LumenMote, LumenSource, labAlpha as alpha, tintColor,
} from './labPrimitives';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export type SurfaceProps = Readonly<{
  dir: LabDirectionId;
  run: number;
  slow: Slow;
  reduce: boolean;
}>;

// ─── СЧЁТЧИК НА UI-ТРЕДЕ ────────────────────────────────────────────────────
// Ровно та же техника, что в эталоне (components/feedback/ResultsSequence.tsx):
// AnimatedTextInput + useAnimatedProps. Ни одного setState за кадр.
// Ширина слота фиксируется заранее — цифры не двигают соседей на 9→10.

function LabCounter({
  run, slow, reduce, from, to, delay, duration, prefix = '', suffix = '', style, slotWidth,
}: {
  run: number; slow: Slow; reduce: boolean;
  from: number; to: number; delay: number; duration: number;
  prefix?: string; suffix?: string; style?: TextStyle; slotWidth?: number;
}) {
  const v = useSharedValue(from);

  useEffect(() => {
    cancelAnimation(v);
    v.value = from;
    if (reduce) { v.value = to; return; }
    v.value = withDelay(slow.ms(delay), withTiming(to, slow.t(duration, EASE.out)));
  }, [run, reduce, from, to, delay, duration, v, slow]);

  const props = useAnimatedProps(() => ({
    text: `${prefix}${Math.round(v.value)}${suffix}`,
  }) as never);

  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      defaultValue={`${prefix}${from}${suffix}`}
      animatedProps={props}
      style={[
        { padding: 0, includeFontPadding: false, textAlignVertical: 'center' },
        slotWidth ? { width: slotWidth } : null,
        style,
      ]}
    />
  );
}

// ─── ГЕРОЙ ──────────────────────────────────────────────────────────────────

type HeroKind = 'level' | 'energy' | 'streak' | 'danger' | 'empty';

/** I «Чекан»: диск падает, сплющивается, бьёт по панели. */
function ImpactHero({
  run, slow, reduce, kind, label, recoil, onImpact,
}: SurfaceProps & { kind: HeroKind; label: string; recoil: SharedValue<number>; onImpact?: () => void }) {
  const { theme: t } = useTheme();
  const y = useSharedValue(-180);
  const sc = useSharedValue(1.45);
  const op = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const hit = useSharedValue(0);

  const gold = kind === 'danger' ? t.wrong : kind === 'streak' ? '#FF9A3D' : t.gold;

  const fireHaptic = useCallback(() => {
    if (kind === 'danger' || kind === 'streak') void hapticWarning();
    else void hapticHeavyImpact();
    onImpact?.();
  }, [kind, onImpact]);

  // конфиги считаем на JS-стороне: внутрь worklet попадают простые объекты
  const squashCfg = slow.s(IMPACT.SQUASH);
  const recoilCfg = slow.s(IMPACT.RECOIL);

  useEffect(() => {
    [y, sc, op, sx, sy, hit].forEach(cancelAnimation);
    y.value = -180; sc.value = 1.45; op.value = 0; sx.value = 1; sy.value = 1; hit.value = 0;
    recoil.value = 0;
    if (reduce) { y.value = 0; sc.value = 1; op.value = 1; hit.value = 1; return; }

    op.value = withDelay(slow.ms(200), withTiming(1, slow.t(110, EASE.linear)));
    sc.value = withDelay(slow.ms(200 + IMPACT.ANTICIPATION_MS), withTiming(1, slow.t(IMPACT.FALL_MS, EASE.fall)));
    y.value = withDelay(
      slow.ms(200),
      withSequence(
        withTiming(-210, slow.t(IMPACT.ANTICIPATION_MS, EASE.inOut)),
        withTiming(0, slow.t(IMPACT.FALL_MS, EASE.fall), (finished) => {
          'worklet';
          if (!finished) return;
          // Закон 3 эталона: удар порождает три вещи одновременно —
          // сплющивание тела, отдачу поверхности и кольцо. Деформация
          // задаётся ровно в кадре удара, а не заранее.
          sy.value = 0.84;
          sx.value = 1.16;
          recoil.value = 6;
          sy.value = withSpring(1, squashCfg);
          sx.value = withSpring(1, squashCfg);
          recoil.value = withSpring(0, recoilCfg);
          hit.value = 1;
          runOnJS(fireHaptic)();
        }),
      ),
    );
  }, [run, reduce, y, sc, op, sx, sy, hit, recoil, slow, fireHaptic, squashCfg, recoilCfg]);

  const discStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: y.value }, { scale: sc.value }, { scaleX: sx.value }, { scaleY: sy.value }],
  }));
  const ringWrap = useAnimatedStyle(() => ({ opacity: hit.value }));

  return (
    <View style={{ height: 104, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, ringWrap]} pointerEvents="none">
        <ImpactRing run={run} slow={slow} reduce={reduce} index={0} size={92} color={gold} />
        <ImpactRing run={run} slow={slow} reduce={reduce} index={1} size={92} color={gold} />
        {Array.from({ length: 12 }, (_, i) => (
          <ImpactDust
            key={i} run={run} slow={slow} reduce={reduce} index={i} total={12}
            color={gold} up={kind === 'streak'} spread={40}
          />
        ))}
      </Animated.View>
      <Animated.View
        style={[
          {
            width: 92, height: 92, borderRadius: 46,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: gold,
            shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 10 },
            elevation: 12,
          },
          discStyle,
        ]}
      >
        <Text style={{ fontSize: kind === 'level' ? 34 : 32, fontWeight: '900', color: '#3A2A00' }}>{label}</Text>
      </Animated.View>
    </View>
  );
}

/** II «Световод»: лампа проявляется из расфокуса, ядро разгорается. */
function LumenHero({
  run, slow, reduce, kind, label,
}: SurfaceProps & { kind: HeroKind; label: string }) {
  const { theme: t } = useTheme();
  const c = kind === 'danger' ? t.wrong : kind === 'streak' ? '#FF9A3D' : kind === 'energy' ? t.gold : t.accent;
  const op = useSharedValue(0);
  const sc = useSharedValue(1.2);
  const core = useSharedValue(0);

  useEffect(() => {
    [op, sc, core].forEach(cancelAnimation);
    op.value = 0; sc.value = 1.2; core.value = 0;
    if (reduce) { op.value = 1; sc.value = 1; core.value = 1; return; }
    op.value = withDelay(slow.ms(340), withTiming(1, slow.t(420, EASE.out)));
    sc.value = withDelay(slow.ms(340), withTiming(1, slow.t(560, EASE.out)));
    if (kind === 'energy') {
      // единственное место направления, где свет УГАСАЕТ
      core.value = withDelay(slow.ms(400), withSequence(
        withTiming(1, slow.t(300, EASE.out)),
        withTiming(0.22, slow.t(1100, EASE.inOut)),
      ));
    } else {
      core.value = withDelay(slow.ms(400), withTiming(1, slow.t(720, EASE.out)));
    }
    if (kind === 'level') void hapticSuccess();
  }, [run, reduce, kind, op, sc, core, slow]);

  const lampStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: sc.value }] }));
  const coreStyle = useAnimatedStyle(() => ({
    opacity: core.value,
    transform: [{ scale: interpolate(core.value, [0, 1], [0.3, 1]) }],
  }));

  return (
    <View style={{ height: 104, alignItems: 'center', justifyContent: 'center' }}>
      {kind === 'level' ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          {Array.from({ length: 10 }, (_, i) => (
            <LumenMote key={i} run={run} slow={slow} reduce={reduce} index={i} total={10} color={c} delay={520} />
          ))}
        </View>
      ) : null}
      <Animated.View
        style={[
          {
            width: 96, height: 96, borderRadius: 48,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: StyleSheet.hairlineWidth * 2, borderColor: alpha(c, 0.26),
          },
          lampStyle,
        ]}
      >
        <Animated.View style={[{ position: 'absolute', left: 16, right: 16, top: 16, bottom: 16, borderRadius: 32 }, coreStyle]}>
          <LinearGradient
            colors={[alpha(c, 0.62), alpha(c, 0.18), 'transparent']}
            locations={[0, 0.58, 0.72]}
            start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderRadius: 32 }}
          />
        </Animated.View>
        <Text style={{ fontSize: 32, fontWeight: '800', color: t.textPrimary }}>{label}</Text>
      </Animated.View>
    </View>
  );
}

// ─── ТОСТ ───────────────────────────────────────────────────────────────────

function LabToast({
  dir, run, slow, reduce, tone, title, sub, value, action, life, offsetIndex = 0, delay = 0,
}: SurfaceProps & {
  tone: 'success' | 'reward' | 'error' | 'info';
  title: string; sub?: string; value?: string; action?: string;
  life: number; offsetIndex?: number; delay?: number;
}) {
  const { theme: t, f } = useTheme();
  const c = tone === 'error' ? t.wrong : tone === 'reward' ? t.gold : t.accent;
  const p = useSharedValue(0);
  const out = useSharedValue(0);
  const rail = useSharedValue(1);
  const shake = useSharedValue(0);
  const open = useSharedValue(dir === 'metro' ? 0 : 1);

  useEffect(() => {
    [p, out, rail, shake, open].forEach(cancelAnimation);
    p.value = 0; out.value = 0; rail.value = 1; shake.value = 0;
    open.value = dir === 'metro' ? 0 : 1;
    if (reduce) { p.value = 1; open.value = 1; return; }

    if (dir === 'impact') {
      p.value = withDelay(slow.ms(delay), withSpring(1, slow.s(tone === 'error' ? IMPACT.TOAST_ERR : IMPACT.TOAST)));
      if (tone === 'error') {
        shake.value = withDelay(slow.ms(delay + 210), withSequence(
          withTiming(-1, slow.t(60, EASE.linear)),
          withTiming(1, slow.t(70, EASE.linear)),
          withSpring(0, slow.s({ stiffness: 300, damping: 8, mass: 1 })),
        ));
      }
    } else if (dir === 'lumen') {
      p.value = withDelay(slow.ms(delay + 120), withSpring(1, slow.s(LUMEN.SETTLE)));
    } else {
      open.value = withDelay(slow.ms(delay), withTiming(1, slow.t(METRO.TEXT_MS, EASE.out)));
      p.value = withDelay(slow.ms(delay), withTiming(1, slow.t(METRO.TEXT_MS, EASE.out)));
    }

    if (life > 0) {
      rail.value = withDelay(slow.ms(delay + 300), withTiming(0, slow.t(life, EASE.linear)));
      out.value = withDelay(slow.ms(delay + 300 + life), withTiming(1, slow.t(
        dir === 'impact' ? IMPACT.EXIT_MS : dir === 'lumen' ? LUMEN.EXIT_MS : METRO.EXIT_MS,
        dir === 'lumen' ? EASE.in : EASE.exit,
      )));
    }
    void hapticLightImpact();
  }, [run, reduce, dir, tone, life, delay, p, out, rail, shake, open, slow]);

  const anim = useAnimatedStyle(() => {
    if (dir === 'impact') {
      return {
        opacity: interpolate(p.value, [0, 0.35, 1], [0, 1, 1]) * (1 - out.value),
        transform: [
          { translateY: interpolate(p.value, [0, 1], [IMPACT.OFFSET, 0]) + out.value * IMPACT.OFFSET - offsetIndex * 68 },
          { translateX: shake.value * 4 },
        ],
      };
    }
    if (dir === 'lumen') {
      return {
        opacity: p.value * (1 - out.value),
        transform: [
          { translateY: interpolate(p.value, [0, 1], [LUMEN.SHIFT, 0]) - offsetIndex * 70 },
          { scale: interpolate(p.value, [0, 1], [1.04, 1]) + out.value * 0.05 },
        ],
      };
    }
    return {
      opacity: 1,
      transform: [{ scaleY: Math.max(0.001, open.value * (1 - out.value)) }],
    };
  });

  const inner = useAnimatedStyle(() =>
    dir === 'metro' ? { opacity: interpolate(open.value, [0.4, 1], [0, 1]) } : {},
  );

  const railStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: rail.value }] }));

  return (
    <Animated.View
      style={[
        {
          alignSelf: 'stretch',
          marginHorizontal: dir === 'metro' ? 0 : 12,
          borderRadius: dir === 'metro' ? 0 : dir === 'lumen' ? 20 : 18,
          overflow: 'hidden',
          backgroundColor: t.bgCard,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: dir === 'lumen' ? alpha(c, 0.2) : t.border,
          transformOrigin: 'bottom',
          shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        },
        anim,
      ]}
    >
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 }, inner]}>
        {dir === 'impact' ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: c }} /> : null}
        {dir === 'metro' ? (
          <Text style={{ color: c, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, fontVariant: ['tabular-nums'] }}>
            {String(offsetIndex + 1).padStart(2, '0')}
          </Text>
        ) : (
          <View
            style={{
              width: 38, height: 38, borderRadius: dir === 'lumen' ? 19 : 13,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: alpha(c, 0.16),
              borderWidth: StyleSheet.hairlineWidth * 2, borderColor: alpha(c, 0.32),
            }}
          >
            <Text style={{ fontSize: 18 }}>
              {tone === 'error' ? '!' : tone === 'reward' ? '🎁' : '✓'}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{title}</Text>
          {sub ? <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 2 }}>{sub}</Text> : null}
        </View>
        {value ? (
          <Text style={{ color: dir === 'metro' ? t.textPrimary : c, fontSize: f.body, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{value}</Text>
        ) : null}
        {action ? (
          <View style={{
            paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12,
            backgroundColor: tone === 'error' ? 'transparent' : c,
            borderWidth: tone === 'error' ? StyleSheet.hairlineWidth * 2 : 0, borderColor: t.border,
          }}>
            <Text style={{ color: tone === 'error' ? t.textMuted : t.correctText, fontSize: 12, fontWeight: '800' }}>{action}</Text>
          </View>
        ) : null}
      </Animated.View>
      {life > 0 ? (
        <Animated.View
          style={[
            { position: 'absolute', left: 0, right: 0, bottom: 0, height: dir === 'metro' ? 2 : 2.5, backgroundColor: c, transformOrigin: 'left' },
            railStyle,
          ]}
        />
      ) : null}
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ПОВЕРХНОСТИ
// ════════════════════════════════════════════════════════════════════════════

const pad = (dir: LabDirectionId): ViewStyle =>
  dir === 'metro' ? { padding: 20 } : { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 };

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>{children}</View>;
}

// ─── Повышение уровня ───────────────────────────────────────────────────────

function LevelUp(props: SurfaceProps) {
  const { dir, run, slow, reduce } = props;
  const { theme: t, f } = useTheme();
  const c = LAB_COPY.level;
  const recoil = useSharedValue(0);

  return (
    <>
      <LabBackdrop {...props} />
      <Centered>
        <LabPanel {...props} recoil={dir === 'impact' ? recoil : undefined}>
          {dir === 'lumen' ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: -20, right: -20, top: -30, height: 220, alignItems: 'center' }}>
              <LumenSource run={run} slow={slow} reduce={reduce} color={t.accent} size={260} />
            </View>
          ) : null}

          <View style={pad(dir)}>
            {dir === 'impact' ? (
              <ImpactHero {...props} kind="level" label={String(c.level)} recoil={recoil} />
            ) : dir === 'lumen' ? (
              <LumenHero {...props} kind="level" label={String(c.level)} />
            ) : null}

            <LabLine {...props} index={0} baseDelay={dir === 'metro' ? 240 : 680} style={{ marginTop: dir === 'metro' ? 0 : 10 }}>
              <Text style={{
                color: dir === 'metro' ? t.textMuted : t.gold,
                fontSize: 9.5, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase',
                textAlign: dir === 'metro' ? 'left' : 'center',
              }}>
                {c.kicker}
              </Text>
            </LabLine>

            {/* Главное число. Закон 6-7: считается на UI-треде, слот фиксирован. */}
            <View style={{
              flexDirection: 'row', alignItems: 'baseline',
              justifyContent: dir === 'metro' ? 'flex-start' : 'center',
              gap: 10, marginTop: dir === 'metro' ? 12 : 4,
            }}>
              <LabCounter
                run={run} slow={slow} reduce={reduce}
                from={c.prevLevel} to={c.level}
                delay={dir === 'metro' ? 360 : 742}
                duration={dir === 'metro' ? METRO.COUNT_MS : 620}
                slotWidth={Math.max(84, String(c.level).length * 32 + 20)}
                style={{
                  color: dir === 'metro' ? t.textPrimary : t.gold,
                  fontSize: dir === 'metro' ? 64 : 50,
                  fontWeight: '900',
                  letterSpacing: -2.4,
                  textAlign: dir === 'metro' ? 'left' : 'center',
                }}
              />
              {dir === 'metro' ? (
                <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' }}>уровень</Text>
              ) : null}
            </View>

            {dir === 'metro' ? (
              <View style={{ marginVertical: 16 }}>
                <LabRule {...props} delay={1080} accent />
              </View>
            ) : null}

            <LabLine {...props} index={1} baseDelay={dir === 'metro' ? 1140 : 680} style={{ marginTop: dir === 'metro' ? 0 : 8 }}>
              <Text style={{
                color: t.textPrimary, fontSize: dir === 'metro' ? f.bodyLg + 3 : f.body,
                fontWeight: dir === 'metro' ? '800' : '700',
                textAlign: dir === 'metro' ? 'left' : 'center',
              }}>
                {c.title}
              </Text>
            </LabLine>

            <LabLine {...props} index={2} baseDelay={dir === 'metro' ? 1140 : 680} style={{ marginTop: 6 }}>
              <Text style={{
                color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.5,
                textAlign: dir === 'metro' ? 'left' : 'center',
              }}>
                {c.sub}
              </Text>
            </LabLine>

            <View style={{ marginTop: dir === 'metro' ? 16 : 8 }}>
              {c.rewards.map((r, i) => (
                <React.Fragment key={r.label}>
                  {dir === 'metro' && i > 0 ? <LabRule {...props} delay={1320 + METRO.LADDER[i]} /> : null}
                  <LabReward
                    {...props}
                    index={i}
                    baseDelay={dir === 'metro' ? 1320 : dir === 'lumen' ? 760 : 330}
                    icon={r.icon} label={r.label} value={r.value} tint={r.tint}
                  />
                </React.Fragment>
              ))}
            </View>

            {dir === 'metro' ? null : (
              <LabCta {...props} delay={dir === 'lumen' ? 1090 : 620} label={c.cta} />
            )}
          </View>

          {dir === 'metro' ? (
            <View style={{ flexDirection: 'row' }}>
              <LabCta {...props} delay={1920} label={c.cta} />
            </View>
          ) : null}
        </LabPanel>
      </Centered>
    </>
  );
}

// ─── Нет энергии ────────────────────────────────────────────────────────────

function NoEnergy(props: SurfaceProps) {
  const { dir, run, slow, reduce } = props;
  const { theme: t, f } = useTheme();
  const c = LAB_COPY.energy;
  const recoil = useSharedValue(0);

  return (
    <>
      <LabBackdrop {...props} />
      <Centered>
        <LabPanel {...props} recoil={dir === 'impact' ? recoil : undefined} delay={dir === 'impact' ? 120 : 0}>
          {dir === 'lumen' ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: -20, right: -20, top: -40, height: 220, alignItems: 'center' }}>
              <LumenSource run={run} slow={slow} reduce={reduce} color={t.gold} size={240} fade />
            </View>
          ) : null}

          <View style={pad(dir)}>
            {dir === 'impact' ? (
              <ImpactHero {...props} kind="energy" label="⚡" recoil={recoil} />
            ) : dir === 'lumen' ? (
              <LumenHero {...props} kind="energy" label="⚡" />
            ) : null}

            <LabLine {...props} index={0} baseDelay={dir === 'metro' ? 240 : 540}>
              <Text style={{
                color: dir === 'metro' ? t.textMuted : t.textPrimary,
                fontSize: dir === 'metro' ? 9.5 : f.bodyLg + 4,
                fontWeight: dir === 'metro' ? '900' : '900',
                letterSpacing: dir === 'metro' ? 2 : -0.5,
                textTransform: dir === 'metro' ? 'uppercase' : 'none',
                textAlign: dir === 'metro' ? 'left' : 'center',
                marginTop: dir === 'metro' ? 0 : 8,
              }}>
                {dir === 'metro' ? c.kicker : c.title}
              </Text>
            </LabLine>

            {dir === 'metro' ? (
              <>
                <Text style={{ color: t.textPrimary, fontSize: 52, fontWeight: '800', letterSpacing: -2.4, marginTop: 12, fontVariant: ['tabular-nums'] }}>
                  14:32
                </Text>
                <LabLine {...props} index={1} baseDelay={480} style={{ marginTop: 6 }}>
                  <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' }}>
                    до следующей единицы
                  </Text>
                </LabLine>
                <View style={{ marginVertical: 16 }}><LabRule {...props} delay={660} /></View>
              </>
            ) : (
              <LabLine {...props} index={1} baseDelay={540} style={{ marginTop: 7 }}>
                <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', lineHeight: f.caption * 1.5 }}>{c.sub}</Text>
              </LabLine>
            )}

            {c.rewards.map((r, i) => (
              <LabReward key={r.label} {...props} index={i} baseDelay={dir === 'metro' ? 720 : 600} icon={r.icon} label={r.label} value={r.value} tint={r.tint} />
            ))}

            {dir === 'metro' ? null : (
              <View style={{ flexDirection: 'row', gap: 9, marginTop: 4 }}>
                <View style={{ flex: 1 }}><LabCta {...props} delay={880} label={c.ctaGhost} tone="ghost" /></View>
                <View style={{ flex: 1 }}><LabCta {...props} delay={940} label={c.cta} /></View>
              </View>
            )}
          </View>

          {dir === 'metro' ? (
            <View style={{ flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.border }}>
              <LabCta {...props} delay={900} label={c.ctaGhost} tone="ghost" />
              <LabCta {...props} delay={960} label={c.cta} />
            </View>
          ) : null}
        </LabPanel>
      </Centered>
    </>
  );
}

// ─── Стрик ──────────────────────────────────────────────────────────────────

function Streak(props: SurfaceProps) {
  const { dir, run, slow, reduce } = props;
  const { theme: t, f } = useTheme();
  const c = LAB_COPY.streak;
  const recoil = useSharedValue(0);

  return (
    <>
      <LabBackdrop {...props} />
      <Centered>
        <LabPanel {...props} recoil={dir === 'impact' ? recoil : undefined} delay={dir === 'impact' ? 140 : 0}>
          {dir === 'lumen' ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: -20, right: -20, top: -40, height: 240, alignItems: 'center' }}>
              <LumenSource run={run} slow={slow} reduce={reduce} color="#FF9A3D" size={260} />
            </View>
          ) : null}

          <View style={pad(dir)}>
            {dir === 'impact' ? (
              <ImpactHero {...props} kind="streak" label={String(c.days)} recoil={recoil} />
            ) : dir === 'lumen' ? (
              <LumenHero {...props} kind="streak" label="🔥" />
            ) : (
              <>
                <LabLine {...props} index={0} baseDelay={240}>
                  <Text style={{ color: t.gold, fontSize: 9.5, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>{c.kicker}</Text>
                </LabLine>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
                  <LabCounter
                    run={run} slow={slow} reduce={reduce} from={0} to={c.days}
                    delay={360} duration={METRO.COUNT_MS} slotWidth={84}
                    style={{ color: t.textPrimary, fontSize: 64, fontWeight: '800', letterSpacing: -2.6 }}
                  />
                  <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' }}>дней подряд</Text>
                </View>
                <View style={{ marginVertical: 16 }}><LabRule {...props} delay={1140} /></View>
              </>
            )}

            <LabLine {...props} index={dir === 'metro' ? 0 : 0} baseDelay={dir === 'metro' ? 1200 : 620} style={{ marginTop: dir === 'metro' ? 0 : 10 }}>
              <Text style={{
                color: t.textPrimary, fontSize: dir === 'metro' ? f.bodyLg + 3 : f.bodyLg + 2, fontWeight: '900',
                textAlign: dir === 'metro' ? 'left' : 'center', letterSpacing: -0.4,
              }}>
                {c.title}
              </Text>
            </LabLine>
            <LabLine {...props} index={1} baseDelay={dir === 'metro' ? 1200 : 620} style={{ marginTop: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.5, textAlign: dir === 'metro' ? 'left' : 'center' }}>{c.sub}</Text>
            </LabLine>

            {dir === 'metro' ? null : (
              <View style={{ flexDirection: 'row', gap: 9, marginTop: 4 }}>
                <View style={{ flex: 1 }}><LabCta {...props} delay={900} label={c.ctaGhost} tone="ghost" /></View>
                <View style={{ flex: 1 }}><LabCta {...props} delay={960} label={c.cta} /></View>
              </View>
            )}
          </View>

          {dir === 'metro' ? (
            <View style={{ flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.border }}>
              <LabCta {...props} delay={1380} label={c.ctaGhost} tone="ghost" />
              <LabCta {...props} delay={1440} label={c.cta} />
            </View>
          ) : null}
        </LabPanel>
      </Centered>
    </>
  );
}

// ─── Подтверждение удаления ─────────────────────────────────────────────────

function Confirm(props: SurfaceProps) {
  const { dir, run, slow, reduce } = props;
  const { theme: t, f } = useTheme();
  const c = LAB_COPY.confirm;
  const recoil = useSharedValue(0);

  return (
    <>
      <LabBackdrop {...props} tone="deep" />
      <Centered>
        <LabPanel {...props} variant="danger" recoil={dir === 'impact' ? recoil : undefined}>
          <View style={pad(dir)}>
            {dir === 'metro' ? (
              <>
                <LabLine {...props} index={0} baseDelay={240}>
                  <Text style={{ color: t.wrong, fontSize: 9.5, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>{c.kicker}</Text>
                </LabLine>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
                  {/* Число досчитывает 54 → 0: последствие показано, а не описано */}
                  <LabCounter
                    run={run} slow={slow} reduce={reduce} from={c.count} to={0}
                    delay={420} duration={METRO.COUNT_MS} slotWidth={84}
                    style={{ color: t.wrong, fontSize: 64, fontWeight: '800', letterSpacing: -2.6 }}
                  />
                  <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', flex: 1 }}>
                    карточки будут удалены
                  </Text>
                </View>
                <View style={{ marginVertical: 16 }}><LabRule {...props} delay={1020} /></View>
                <LabLine {...props} index={0} baseDelay={1080}>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.55 }}>{c.sub}</Text>
                </LabLine>
              </>
            ) : (
              <>
                {dir === 'impact'
                  ? <ImpactHero {...props} kind="danger" label="✕" recoil={recoil} />
                  : <LumenHero {...props} kind="danger" label="✕" />}
                <LabLine {...props} index={0} baseDelay={dir === 'lumen' ? 400 : 200} style={{ marginTop: 8 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg + 4, fontWeight: '900', textAlign: 'center' }}>{c.title}</Text>
                </LabLine>
                <LabLine {...props} index={1} baseDelay={dir === 'lumen' ? 400 : 200} style={{ marginTop: 7 }}>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', lineHeight: f.caption * 1.5 }}>{c.sub}</Text>
                </LabLine>
                <View style={{ flexDirection: 'row', gap: 9, marginTop: 4 }}>
                  <View style={{ flex: 1 }}><LabCta {...props} delay={dir === 'lumen' ? 600 : 330} label={c.ctaGhost} tone="ghost" /></View>
                  {/* опасная кнопка приходит ПОСЛЕДНЕЙ — её труднее нажать вслепую */}
                  <View style={{ flex: 1 }}><LabCta {...props} delay={dir === 'lumen' ? 700 : 400} label={c.cta} tone="danger" /></View>
                </View>
              </>
            )}
          </View>

          {dir === 'metro' ? (
            <View style={{ flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.border }}>
              <LabCta {...props} delay={1200} label={c.ctaGhost} tone="ghost" />
              <LabCta {...props} delay={1320} label={c.cta} tone="danger" />
            </View>
          ) : null}
        </LabPanel>
      </Centered>
    </>
  );
}

// ─── Нижний лист ────────────────────────────────────────────────────────────

function Sheet(props: SurfaceProps) {
  const { dir, run, slow, reduce } = props;
  const { theme: t, f } = useTheme();
  const c = LAB_COPY.sheet;

  return (
    <>
      <LabBackdrop {...props} />
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {dir === 'lumen' ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: -40, right: -40, bottom: -120, height: 320, alignItems: 'center' }}>
            <LumenSource run={run} slow={slow} reduce={reduce} color={t.accent} size={320} />
          </View>
        ) : null}
        <LabPanel {...props} variant="sheet">
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.borderLight, alignSelf: 'center', marginBottom: 18 }} />
            <LabLine {...props} index={0} baseDelay={dir === 'metro' ? 240 : 360}>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg + 3, fontWeight: '900', letterSpacing: -0.5 }}>{c.title}</Text>
            </LabLine>
            {c.rows.map((r, i) => (
              <LabReward key={r.label} {...props} index={i} baseDelay={dir === 'metro' ? 420 : dir === 'lumen' ? 420 : 300} icon={r.icon} label={r.label} value={r.value} tint="accent" />
            ))}
            <LabCta {...props} delay={dir === 'lumen' ? 660 : 500} label={c.cta} />
          </View>
        </LabPanel>
      </View>
    </>
  );
}

// ─── Тосты ──────────────────────────────────────────────────────────────────

function ToastOne(props: SurfaceProps & { tone: 'success' | 'reward' | 'error' }) {
  const { tone } = props;
  const c = tone === 'success' ? LAB_COPY.toasts.success : tone === 'reward' ? LAB_COPY.toasts.reward : LAB_COPY.toasts.error;
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 40 }}>
      <LabToast
        {...props}
        tone={tone}
        title={c.title}
        sub={c.sub}
        value={tone === 'success' ? '+50 XP' : undefined}
        action={'action' in c ? (c as { action?: string }).action : undefined}
        life={c.life}
      />
    </View>
  );
}

function ToastQueue(props: SurfaceProps) {
  const rows = LAB_COPY.toasts.queue;
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 40, gap: props.dir === 'metro' ? 0 : 10 }}>
      {rows.map((r, i) => (
        <LabToast
          key={r.title}
          {...props}
          tone={i === 1 ? 'reward' : 'success'}
          title={r.title}
          sub={r.sub}
          value={r.value || undefined}
          life={3000}
          delay={i * 600}
          offsetIndex={props.dir === 'metro' ? i : 0}
        />
      ))}
    </View>
  );
}

// ─── Загрузка → содержимое ──────────────────────────────────────────────────

function Loading(props: SurfaceProps) {
  const { dir, run, slow, reduce } = props;
  const { theme: t, f } = useTheme();
  const swap = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(swap);
    swap.value = 0;
    if (reduce) { swap.value = 1; return; }
    swap.value = withDelay(slow.ms(dir === 'metro' ? 1440 : 1500), withTiming(1, slow.t(dir === 'lumen' ? 420 : 300, EASE.out)));
  }, [run, reduce, dir, swap, slow]);

  const skelStyle = useAnimatedStyle(() => ({ opacity: 1 - swap.value }));
  const realStyle = useAnimatedStyle(() => ({ opacity: swap.value }));

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 40 }}>
      {dir === 'metro' ? (
        // III: скелетонов нет вовсе — прочерчивается СТРУКТУРА
        <View>
          <Text style={{ color: t.textMuted, fontSize: 9.5, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Сегодня</Text>
          {LAB_COPY.loading.rows.map((r, i) => (
            <View key={r.title}>
              <LabLine {...props} index={i} baseDelay={1440} style={{ paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: t.textMuted, fontSize: f.caption }}>{r.kicker}</Text>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{r.title}</Text>
              </LabLine>
              <LabRule {...props} delay={i * 60} />
            </View>
          ))}
        </View>
      ) : (
        <View>
          <Animated.View style={skelStyle}>
            {[92, 70, 70].map((h, i) => (
              <View key={i} style={{ height: h, borderRadius: 22, backgroundColor: t.bgSurface, marginBottom: 12 }} />
            ))}
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, realStyle]}>
            {LAB_COPY.loading.rows.map((r, i) => (
              <LabLine key={r.title} {...props} index={i} baseDelay={dir === 'lumen' ? 1600 : 1580} style={{ marginBottom: 12 }}>
                <View style={{
                  borderRadius: 22, padding: 16, backgroundColor: t.bgCard,
                  borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.border,
                }}>
                  <Text style={{ color: t.accent, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' }}>{r.kicker}</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg + 1, fontWeight: '800', marginTop: 7 }}>{r.title}</Text>
                </View>
              </LabLine>
            ))}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ─── Пусто ──────────────────────────────────────────────────────────────────

function Empty(props: SurfaceProps) {
  const { dir, run, slow, reduce } = props;
  const { theme: t, f } = useTheme();
  const c = LAB_COPY.empty;
  const recoil = useSharedValue(0);

  return (
    <Centered>
      {dir === 'lumen' ? (
        <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center' }}>
          <LumenSource run={run} slow={slow} reduce={reduce} color={t.accent} size={250} delay={300} />
        </View>
      ) : null}

      {dir === 'impact' ? (
        <ImpactHero {...props} kind="empty" label="🗂" recoil={recoil} />
      ) : dir === 'lumen' ? (
        <LumenHero {...props} kind="empty" label="🗂" />
      ) : (
        <>
          <LabLine {...props} index={0} baseDelay={0}>
            <Text style={{ color: t.textMuted, fontSize: 9.5, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>{c.kicker}</Text>
          </LabLine>
          <LabCounter
            run={run} slow={slow} reduce={reduce} from={0} to={0}
            delay={240} duration={METRO.TEXT_MS} slotWidth={84}
            style={{ color: t.textPrimary, fontSize: 64, fontWeight: '800', letterSpacing: -2.6, marginTop: 12, textAlign: 'center' }}
          />
          <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' }}>карточек</Text>
          <View style={{ alignSelf: 'stretch', marginVertical: 20 }}><LabRule {...props} delay={600} accent /></View>
        </>
      )}

      <LabLine {...props} index={0} baseDelay={dir === 'metro' ? 720 : dir === 'lumen' ? 760 : 300} style={{ marginTop: dir === 'metro' ? 0 : 16 }}>
        <Text style={{ color: t.textPrimary, fontSize: f.bodyLg + 3, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 }}>{c.title}</Text>
      </LabLine>
      <LabLine {...props} index={1} baseDelay={dir === 'metro' ? 720 : dir === 'lumen' ? 760 : 300} style={{ marginTop: 7, maxWidth: 250 }}>
        <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', lineHeight: f.caption * 1.55 }}>{c.sub}</Text>
      </LabLine>
      <View style={{ alignSelf: 'stretch', paddingHorizontal: 40 }}>
        <LabCta {...props} delay={dir === 'metro' ? 840 : dir === 'lumen' ? 980 : 580} label={c.cta} />
      </View>
    </Centered>
  );
}

// ─── Кнопка ─────────────────────────────────────────────────────────────────

function ButtonDemo(props: SurfaceProps) {
  const { dir, run, slow, reduce } = props;
  const { theme: t, f } = useTheme();
  const press = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(press);
    press.value = 0;
    if (reduce) return;
    const loop = () => {
      press.value = withSequence(
        withDelay(slow.ms(400), withTiming(1, slow.t(dir === 'metro' ? 120 : dir === 'lumen' ? 120 : 90, EASE.out))),
        withDelay(slow.ms(500),
          dir === 'impact'
            ? withSpring(0, slow.s({ stiffness: 190, damping: 10, mass: 1 }))
            : withTiming(0, slow.t(dir === 'metro' ? 180 : 260, EASE.out))),
      );
    };
    loop();
    const id = setTimeout(loop, slow.ms(1300));
    return () => clearTimeout(id);
  }, [run, reduce, dir, press, slow]);

  const style = useAnimatedStyle(() => {
    if (dir === 'metro') return { opacity: interpolate(press.value, [0, 1], [1, 0.62]) };
    if (dir === 'lumen') return { transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.985]) }], shadowOpacity: interpolate(press.value, [0, 1], [0.28, 0.08]) };
    return { transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.96]) }] };
  });

  const note =
    dir === 'impact' ? 'Нажатие — 90 мс линейно. Отпускание — пружина 190/10 с отдачей.'
      : dir === 'lumen' ? 'Масштаб меняется на 1,5%. Обратную связь несёт свет, а не деформация.'
        : 'Ни масштаба, ни тени. Только заливка: 120 мс туда, 180 обратно.';

  return (
    <Centered>
      <Animated.View
        style={[
          {
            alignSelf: 'stretch', marginHorizontal: 20,
            borderRadius: dir === 'metro' ? 10 : 16, paddingVertical: 16, alignItems: 'center',
            backgroundColor: t.accent,
            shadowColor: t.accent, shadowRadius: 22, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28,
          },
          style,
        ]}
      >
        <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '900' }}>{LAB_COPY.button.label}</Text>
      </Animated.View>
      <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginTop: 24, lineHeight: f.caption * 1.55, paddingHorizontal: 30 }}>
        {note}
      </Text>
    </Centered>
  );
}

// ─── Принцип ────────────────────────────────────────────────────────────────

function Principle(props: SurfaceProps) {
  const { dir, run, slow, reduce } = props;
  const { theme: t, f } = useTheme();
  const recoil = useSharedValue(0);

  const rows: [string, string][] =
    dir === 'impact'
      ? [['Падение', '220 мс · Easing.bezier(.6,0,.95,.5)'], ['Сплющивание', 'spring 260/5'], ['Отдача поверхности', 'spring 180/6'], ['Каскад', '0 → 62 → 146 → 262']]
      : dir === 'lumen'
        ? [['Источник света', '420 мс, первым'], ['Форма из расфокуса', '380 мс, scale 1.06 → 1'], ['Посадка', 'spring 150/22, без отскока'], ['Каскад', '0 → 74 → 172 → 306']]
        : [['Линия чертится', '360 мс · 6 тактов'], ['Строка приходит', '240 мс · 4 такта'], ['Число досчитывает', '720 мс · 12 тактов'], ['Шаг каскада', '60 → 80 → 120 → 160']];

  const title = dir === 'impact' ? 'Всё имеет вес' : dir === 'lumen' ? 'Сначала свет' : 'Сетка 60 мс';
  const sub =
    dir === 'impact' ? 'Тело падает с ускорением, сплющивается от удара и встаёт за один отскок. Поверхность отвечает отдачей.'
      : dir === 'lumen' ? 'Форма не прилетает — она проявляется из свечения. Движение идёт по глубине и фокусу, а не по экрану.'
        : 'Ни одной длительности вне кратности 60. Но каскад замедляется к кульминации — ровный метроном запрещён законом эталона.';

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
      {dir === 'impact' ? (
        <ImpactHero {...props} kind="level" label="12" recoil={recoil} />
      ) : dir === 'lumen' ? (
        <>
          <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center', top: 60 }}>
            <LumenSource run={run} slow={slow} reduce={reduce} color={t.accent} size={230} />
          </View>
          <View style={{ alignItems: 'center' }}>
            {Array.from({ length: 14 }, (_, i) => (
              <LumenBeam key={i} run={run} slow={slow} reduce={reduce} index={i} total={14} color={t.accent} length={20 + (i % 4) * 14} delay={420} />
            ))}
            <LumenHero {...props} kind="level" label="12" />
          </View>
        </>
      ) : (
        <>
          <LabLine {...props} index={0} baseDelay={0}>
            <Text style={{ color: t.textMuted, fontSize: 9.5, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>Принцип направления</Text>
          </LabLine>
          <View style={{ marginVertical: 16 }}><LabRule {...props} delay={120} accent /></View>
          <LabCounter
            run={run} slow={slow} reduce={reduce} from={0} to={60}
            delay={360} duration={METRO.COUNT_MS} slotWidth={110}
            style={{ color: t.textPrimary, fontSize: 64, fontWeight: '800', letterSpacing: -2.6 }}
          />
          <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', marginTop: 8 }}>
            миллисекунд — базовый такт
          </Text>
          <View style={{ marginVertical: 20 }}><LabRule {...props} delay={960} /></View>
        </>
      )}

      <LabLine {...props} index={0} baseDelay={dir === 'metro' ? 1080 : dir === 'lumen' ? 560 : 500} style={{ marginTop: dir === 'metro' ? 0 : 18 }}>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: dir === 'metro' ? 'left' : 'center', letterSpacing: -0.6 }}>{title}</Text>
      </LabLine>
      <LabLine {...props} index={1} baseDelay={dir === 'metro' ? 1080 : dir === 'lumen' ? 560 : 500} style={{ marginTop: 8 }}>
        <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.6, textAlign: dir === 'metro' ? 'left' : 'center' }}>{sub}</Text>
      </LabLine>

      <View style={{ marginTop: 18 }}>
        {rows.map(([k, v], i) => (
          <View key={k}>
            <LabLine {...props} index={Math.min(i + 2, 5)} baseDelay={dir === 'metro' ? 1080 : dir === 'lumen' ? 560 : 500}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 10 }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption }}>{k}</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{v}</Text>
            </LabLine>
            {i < rows.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: t.border }} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── ДИСПЕТЧЕР ──────────────────────────────────────────────────────────────

export function LabSurface({ id, ...props }: SurfaceProps & { id: LabSurfaceId }) {
  switch (id) {
    case 'principle': return <Principle {...props} />;
    case 'level-up': return <LevelUp {...props} />;
    case 'no-energy': return <NoEnergy {...props} />;
    case 'streak': return <Streak {...props} />;
    case 'confirm': return <Confirm {...props} />;
    case 'sheet': return <Sheet {...props} />;
    case 'toast-success': return <ToastOne {...props} tone="success" />;
    case 'toast-reward': return <ToastOne {...props} tone="reward" />;
    case 'toast-error': return <ToastOne {...props} tone="error" />;
    case 'toast-queue': return <ToastQueue {...props} />;
    case 'loading': return <Loading {...props} />;
    case 'empty': return <Empty {...props} />;
    case 'button': return <ButtonDemo {...props} />;
    default: return null;
  }
}

export { tintColor };
