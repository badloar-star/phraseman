import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Defs, RadialGradient as SvgRadialGradient, Stop, Rect } from 'react-native-svg';
import AvatarView from '../AvatarView';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { getAvatarAuraById } from '../../constants/avatar_auras';

export interface CustomizationHeroProps {
  avatarValue: string;
  auraId: string | null;
  level: number;
  avatarLabel: string;
  auraLabel: string;
  themeAccent: string;
  motionEnabled: boolean;
  minHeight: number;
  /** null → у выбранного аватара нет настроек цвета (аватар уровня). */
  onEdit: (() => void) | null;
  editLabel: string;
}

const hex = /^#([0-9a-f]{6})$/i;
const withAlpha = (color: string, alpha: string): string => hex.test(color) ? `${color}${alpha}` : color;

const GLOW_SIZE = 330;

/**
 * зачем: владелец попросил убрать «коробку»-хиро с рамкой и космосом — сцена теперь
 * бесшовная: аватар живёт прямо на фоне экрана, а свечение берёт ЦВЕТ выбранной ауры,
 * так примерка ауры ощущается мгновенно всей сценой, а не только колечком.
 */
function StageGlow({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={styles.glowBox}>
      <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
        <Defs>
          <SvgRadialGradient id="stage-glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.30} />
            <Stop offset="55%" stopColor={color} stopOpacity={0.10} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        <Rect x="0" y="0" width={GLOW_SIZE} height={GLOW_SIZE} fill="url(#stage-glow)" />
      </Svg>
    </View>
  );
}

export const CustomizationHero = React.memo(function CustomizationHero(props: CustomizationHeroProps) {
  const { theme: t } = useTheme();
  const reduceMotion = useReduceMotion();
  const auraColor = getAvatarAuraById(props.auraId)?.color ?? props.themeAccent;
  const chipBg = withAlpha(t.bgSurface, 'D9');
  return (
    <View style={[styles.stage, { minHeight: props.minHeight }]}>
      <StageGlow color={auraColor} />
      <View>
        <AvatarView
          avatar={props.avatarValue}
          level={props.level}
          auraId={props.auraId}
          size={168}
          animateAura={props.motionEnabled && !reduceMotion}
        />
      </View>
      <Text style={[styles.name, { color: t.heroTextPrimary }]} numberOfLines={1}>{props.avatarLabel}</Text>
      <View style={styles.chips}>
        <View style={[styles.chip, { backgroundColor: chipBg }]}>
          <View style={[styles.auraDot, { backgroundColor: auraColor, shadowColor: auraColor }]} />
          <Text style={[styles.chipText, { color: t.heroTextMuted }]} numberOfLines={1}>{props.auraLabel}</Text>
        </View>
        {props.onEdit ? (
          <TapScale
            accessibilityRole="button"
            accessibilityLabel={props.editLabel}
            onPress={props.onEdit}
            scaleTo={0.95}
            style={[styles.chip, { backgroundColor: chipBg }]}
          >
            <Ionicons name="color-palette-outline" size={14} color={t.heroTextPrimary} />
            <Text style={[styles.chipText, { color: t.heroTextPrimary }]} numberOfLines={1}>{props.editLabel}</Text>
          </TapScale>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14, paddingHorizontal: 24 },
  glowBox: {
    position: 'absolute', top: -58, alignSelf: 'center',
    width: GLOW_SIZE, height: GLOW_SIZE, alignItems: 'center', justifyContent: 'center',
  },
  name: { marginTop: 16, fontSize: 22, lineHeight: 28, fontWeight: '900', textAlign: 'center', letterSpacing: -0.2 },
  chips: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    minHeight: 30, borderRadius: 15, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 7,
  },
  auraDot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  chipText: { fontSize: 12.5, lineHeight: 17, fontWeight: '800' },
});
