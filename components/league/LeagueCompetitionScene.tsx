import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Polygon, Stop } from 'react-native-svg';
import { triLang, type Lang } from '../../constants/i18n';
import type { GroupMember } from '../../app/league_engine';
import { leaguePublicName } from '../../app/league_public_name';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import { FlowText } from '../text-integrity';
import type { LeagueHubPalette } from './leagueHubPalette';

import { noAndroidOutline } from '../../constants/androidGlow';
/**
 * Сцена соревнования Лиги: парящая эмблема, прожекторы, подиум топ-3, падающая корона,
 * конфетти при готовом сундуке.
 * Моушн: входы и корона — конечные; лучи/левитация/конфетти — циклы,
 * загаженные useIsScreenFocused + AppState (паттерн AvatarAura,
 * файл зарегистрирован в runtime_lifecycle_ratchet).
 */

interface LeagueCompetitionSceneProps {
  lang: Lang;
  palette: LeagueHubPalette;
  leagueName: string;
  participantLabel: string;
  leagueIcon: React.ReactNode;
  topMembers: GroupMember[];
  renderAvatar: (member: GroupMember, size: number) => React.ReactNode;
  hasCrown: (uid?: string) => boolean;
  onOpenProfile: (member: GroupMember) => void;
  chestReady: boolean;
}

// `ring` — только кольцо аватара (не контейнер), ступень отделяется тоном.
type StepStyle = { colors: [string, string]; ring: string; text: string };

const STEP_COLORS: Record<number, StepStyle> = {
  1: { colors: ['rgba(255,212,59,0.42)', 'rgba(255,212,59,0.06)'], ring: 'rgba(255,212,59,0.32)', text: '#FFD43B' },
  2: { colors: ['rgba(201,212,220,0.3)', 'rgba(201,212,220,0.05)'], ring: 'rgba(201,212,220,0.24)', text: '#C9D4DC' },
  3: { colors: ['rgba(210,154,106,0.32)', 'rgba(210,154,106,0.05)'], ring: 'rgba(210,154,106,0.26)', text: '#D29A6A' },
};

/**
 * зачем: на светлой теме ступени подиума были почти невидимы — прозрачное
 * золото/серебро на белом фоне и цифры #FFD43B/#C9D4DC с контрастом ~1.4:1.
 * Здесь те же три металла, но насыщенные и с тёмным текстом: ступень
 * читается как плотная плашка тоном, без обводки.
 */
const STEP_COLORS_LIGHT: Record<number, StepStyle> = {
  1: { colors: ['#F2D584', '#E3BB4E'], ring: 'rgba(138,100,16,0.42)', text: '#5E4206' },
  2: { colors: ['#DAE1E7', '#BFCAD3'], ring: 'rgba(61,75,84,0.34)', text: '#33404A' },
  3: { colors: ['#E9C6A4', '#D5A97C'], ring: 'rgba(107,67,34,0.36)', text: '#5C3819' },
};
const STEP_HEIGHT: Record<number, number> = { 1: 74, 2: 54, 3: 42 };

const CONFETTI_DOTS = [
  { left: '12%', color: '#FFD43B', delay: 0 },
  { left: '26%', color: '#47C870', delay: 900 },
  { left: '41%', color: '#FF8FA3', delay: 450 },
  { left: '55%', color: '#7EC8FF', delay: 1500 },
  { left: '68%', color: '#FFD43B', delay: 2100 },
  { left: '80%', color: '#47C870', delay: 700 },
  { left: '90%', color: '#FF8FA3', delay: 1800 },
] as const;

// ── Луч прожектора: конус (узкий верх → широкий низ) с градиентным затуханием ─
const BEAM_W = 150;
const BEAM_H = 290;

function CompetitionBeam({ rotate, opacity, side, isLight }: {
  rotate: Animated.AnimatedInterpolation<string>;
  opacity: Animated.AnimatedInterpolation<number>;
  side: 'left' | 'right';
  isLight: boolean;
}) {
  // зачем: белый луч #FFF6CF на светлом фоне давал грязное жёлтое пятно по
  // краям сцены вместо света. На светлой теме прожектор работает наоборот —
  // мягкой тенью тёплого тона, поэтому конус темнее фона, а не светлее.
  const beamColor = isLight ? '#8A6410' : '#FFF6CF';
  const beamTop = isLight ? '0.16' : '0.5';
  const beamMid = isLight ? '0.05' : '0.14';
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.beamPivot, side === 'left' ? { left: '9%' } : { right: '9%' }, { opacity, transform: [{ rotate }] }]}
    >
      <Svg width={BEAM_W} height={BEAM_H}>
        <Defs>
          <SvgLinearGradient id={`competitionBeam-${side}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={beamColor} stopOpacity={beamTop} />
            <Stop offset="0.55" stopColor={beamColor} stopOpacity={beamMid} />
            <Stop offset="1" stopColor={beamColor} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Polygon
          points={`${BEAM_W / 2 - 11},0 ${BEAM_W / 2 + 11},0 ${BEAM_W},${BEAM_H} 0,${BEAM_H}`}
          fill={`url(#competitionBeam-${side})`}
        />
      </Svg>
    </Animated.View>
  );
}

function LeagueCompetitionSceneComponent({ lang, palette, leagueName, participantLabel, leagueIcon, topMembers, renderAvatar, hasCrown, onOpenProfile, chestReady }: LeagueCompetitionSceneProps) {
  const reduceMotion = useReduceMotion();
  const isFocused = useIsScreenFocused();

  const podium = useMemo(() => {
    const byPlace = new Map(topMembers.slice(0, 3).map((m, i) => [i + 1, m]));
    return [byPlace.get(2), byPlace.get(1), byPlace.get(3)]
      .map((member, idx) => (member ? { member, place: idx === 0 ? 2 : idx === 1 ? 1 : 3 } : null))
      .filter((x): x is { member: GroupMember; place: number } => Boolean(x));
  }, [topMembers]);
  const winnerUid = podium.find((p) => p.place === 1)?.member.uid;

  // Падение короны: конечный spring при маунте и при смене лидера.
  const crownY = useRef(new Animated.Value(-34)).current;
  const crownRot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion || !winnerUid) return;
    crownY.setValue(-34);
    crownRot.setValue(0);
    Animated.parallel([
      Animated.spring(crownY, { toValue: 0, friction: 5, tension: 70, delay: 420, useNativeDriver: true }),
      Animated.timing(crownRot, { toValue: 1, duration: 700, delay: 420, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
    ]).start();
  }, [reduceMotion, winnerUid, crownY, crownRot]);
  const crownRotate = crownRot.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '-8deg'] });

  // Idle-циклы: лучи, левитация эмблемы, конфетти. Гард по паттерну AvatarAura.
  const beamPhase = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(CONFETTI_DOTS.map(() => new Animated.Value(0))).current;
  const shouldAnimate = !reduceMotion && isFocused;
  useEffect(() => {
    if (!shouldAnimate) {
      beamPhase.setValue(0);
      floatY.setValue(0);
      confettiAnims.forEach((a) => a.setValue(0));
      return undefined;
    }
    const loops: Animated.CompositeAnimation[] = [];
    const start = () => {
      if (loops.length) return;
      loops.push(Animated.loop(Animated.sequence([
        Animated.timing(beamPhase, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(beamPhase, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])));
      loops.push(Animated.loop(Animated.sequence([
        Animated.timing(floatY, { toValue: -5, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])));
      if (chestReady) {
        confettiAnims.forEach((anim, i) => {
          loops.push(Animated.loop(
            Animated.timing(anim, { toValue: 1, duration: 3200, delay: CONFETTI_DOTS[i].delay, easing: Easing.linear, useNativeDriver: true }),
            { resetBeforeIteration: true },
          ));
        });
      }
      loops.forEach((l) => l.start());
    };
    const stop = () => {
      loops.forEach((l) => l.stop());
      loops.length = 0;
    };

    // Анимируем только на переднем плане — в фоне нет смысла перерисовывать.
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      stop();
    };
  }, [shouldAnimate, chestReady, beamPhase, floatY, confettiAnims]);

  const beamLRotate = beamPhase.interpolate({ inputRange: [0, 1], outputRange: ['-13deg', '10deg'] });
  const beamRRotate = beamPhase.interpolate({ inputRange: [0, 1], outputRange: ['13deg', '-10deg'] });
  const beamLOpacity = beamPhase.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.95] });
  const beamROpacity = beamPhase.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.5] });

  const meLabel = triLang(lang, { ru: 'Вы', uk: 'Ви', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' });

  return (
    <Reanimated.View
      entering={reduceMotion ? undefined : FadeInUp.delay(60).duration(280)}
      style={styles.stage}
      testID="league-competition-scene"
      accessibilityLabel={leagueName}
    >
      {!reduceMotion ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CompetitionBeam side="left" rotate={beamLRotate} opacity={beamLOpacity} isLight={palette.isLight} />
          <CompetitionBeam side="right" rotate={beamRRotate} opacity={beamROpacity} isLight={palette.isLight} />
        </View>
      ) : null}

      {chestReady && !reduceMotion ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {confettiAnims.map((anim, i) => {
            const dot = CONFETTI_DOTS[i];
            const translateY = anim.interpolate({ inputRange: [0, 0.08, 1], outputRange: [-12, -12, 300] });
            const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] });
            const opacity = anim.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 0.9, 0.9, 0] });
            return (
              <Animated.View
                key={dot.left}
                style={[styles.confettiDot, { left: dot.left as any, backgroundColor: dot.color, opacity, transform: [{ translateY }, { rotate }] }]}
              />
            );
          })}
        </View>
      ) : null}

      <Animated.View style={{ transform: [{ translateY: floatY }] }}>
        <View style={styles.emblemSlot} testID="league-competition-emblem">
          {leagueIcon}
        </View>
      </Animated.View>
      <Text style={[styles.leagueName, { color: palette.text }]}>{leagueName}</Text>
      <Text style={[styles.leagueSub, { color: palette.muted }]}>{participantLabel}</Text>

      <View style={styles.podiumRow}>
        {podium.map(({ member, place }, idx) => {
          const first = place === 1;
          const colors = palette.isLight ? STEP_COLORS_LIGHT[place] : STEP_COLORS[place];
          const displayName = leaguePublicName(member.name, member.uid ?? member.botId ?? member.name);
          const crowned = hasCrown(member.uid);
          return (
            <Reanimated.View
              key={`${place}:${member.uid ?? member.botId ?? member.name}`}
              entering={reduceMotion ? undefined : FadeInUp.delay(160 + idx * 90).duration(300)}
              style={styles.person}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${place}. ${displayName}, ${member.points} XP${member.isMe ? `, ${meLabel}` : ''}`}
                onPress={() => onOpenProfile(member)}
                style={({ pressed }) => [styles.personPress, { opacity: pressed ? 0.82 : 1 }]}
              >
                <View style={styles.avatarWrap}>
                  {first && crowned ? (
                    <Animated.Text style={[styles.crown, { transform: [{ translateY: crownY }, { rotate: crownRotate }] }]}>👑</Animated.Text>
                  ) : null}
                  <View style={[styles.avatarRing, first && styles.avatarRingWinner, { borderColor: first ? (palette.isLight ? 'rgba(138,100,16,0.55)' : 'rgba(255,212,59,0.65)') : colors.ring }]}>
                    {renderAvatar(member, first ? 62 : 52)}
                  </View>
                </View>
                <FlowText
                  testID={`league-podium-member-${place}-name`}
                  provenance="user"
                  style={[styles.personName, { color: palette.text }]}
                >
                  {displayName}
                </FlowText>
                <Text style={[styles.personPoints, { color: palette.muted }]}>{Math.max(0, Math.floor(Number(member.points) || 0)).toLocaleString()} XP</Text>
                {member.isMe ? (
                  <View style={[styles.mePill, { backgroundColor: palette.accent }]}>
                    <Text style={[styles.mePillText, { color: palette.accentText }]}>{meLabel}</Text>
                  </View>
                ) : null}
                <LinearGradient
                  colors={colors.colors}
                  style={[styles.step, { height: STEP_HEIGHT[place] }]}
                >
                  <Text style={[styles.stepNum, { color: colors.text }]}>{place}</Text>
                </LinearGradient>
              </Pressable>
            </Reanimated.View>
          );
        })}
      </View>
    </Reanimated.View>
  );
}

export const LeagueCompetitionScene = memo(LeagueCompetitionSceneComponent);

const styles = StyleSheet.create({
  stage: { paddingTop: 6, paddingBottom: 4, overflow: 'hidden' },
  beamPivot: {
    position: 'absolute',
    top: -16,
    width: BEAM_W,
    height: BEAM_H,
    transformOrigin: 'top center',
  },
  confettiDot: { position: 'absolute', top: 0, width: 6, height: 9, borderRadius: 2 },
  emblemSlot: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  leagueName: { fontSize: 16, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  leagueSub: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginTop: 14 },
  person: { width: 96 },
  personPress: { alignItems: 'center' },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarRingWinner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    shadowColor: '#FFD43B',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    ...noAndroidOutline,
  },
  crown: { position: 'absolute', top: -20, fontSize: 22, zIndex: 3 },
  personName: { fontSize: 12, fontWeight: '900', marginTop: 7, maxWidth: 92, textAlign: 'center' },
  personPoints: { fontSize: 10, fontWeight: '800', marginTop: 1 },
  mePill: { marginTop: 4, minHeight: 20, borderRadius: 10, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  mePillText: { fontSize: 9, fontWeight: '900' },
  // Ступень разделяется тоном градиента, без обводки (правило владельца).
  step: { width: '100%', marginTop: 9, borderRadius: 12, alignItems: 'center', paddingTop: 7 },
  stepNum: { fontSize: 15, fontWeight: '900' },
});
