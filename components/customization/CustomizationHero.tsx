import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import AvatarView from '../AvatarView';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

export interface CustomizationHeroProps {
  avatarValue: string;
  auraId: string | null;
  level: number;
  avatarLabel: string;
  auraLabel: string;
  themeAccent: string;
  motionEnabled: boolean;
  minHeight: number;
}

const hex = /^#([0-9a-f]{6})$/i;
const withAlpha = (color: string, alpha: string): string => hex.test(color) ? `${color}${alpha}` : color;

export function buildConstellationPalette(accent: string): {
  background: readonly [string, string, string]; glow: string;
} {
  return {
    background: ['#080B18', '#101329', withAlpha(accent, '30')],
    glow: accent,
  };
}

function ConstellationOrbits({ accent }: { accent: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, { backgroundColor: withAlpha(accent, '20') }]} />
      <View style={[styles.orbitLarge, { borderColor: withAlpha(accent, '42') }]} />
      <View style={[styles.orbitSmall, { borderColor: withAlpha(accent, '66') }]} />
      <View style={[styles.star, styles.starOne, { backgroundColor: accent }]} />
      <View style={[styles.star, styles.starTwo, { backgroundColor: accent }]} />
      <View style={[styles.star, styles.starThree, { backgroundColor: accent }]} />
    </View>
  );
}

export const CustomizationHero = React.memo(function CustomizationHero(props: CustomizationHeroProps) {
  const reduceMotion = useReduceMotion();
  const colors = buildConstellationPalette(props.themeAccent);
  return (
    <LinearGradient
      colors={colors.background}
      style={[styles.hero, { minHeight: props.minHeight, borderColor: withAlpha(props.themeAccent, '55') }]}
    >
      <ConstellationOrbits accent={colors.glow} />
      <View style={[styles.avatarHalo, { shadowColor: props.themeAccent }]}>
        <AvatarView
          avatar={props.avatarValue}
          level={props.level}
          auraId={props.auraId}
          size={176}
          animateAura={props.motionEnabled && !reduceMotion}
        />
      </View>
      <Text style={styles.name}>{props.avatarLabel}</Text>
      <Text style={styles.meta}>{props.auraLabel} · {props.level}</Text>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 12, borderRadius: 30, borderWidth: 1, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 36,
  },
  glow: { position: 'absolute', width: 310, height: 310, borderRadius: 155, top: '22%' },
  orbitLarge: { position: 'absolute', width: 330, height: 220, borderRadius: 180, borderWidth: 1, transform: [{ rotate: '-18deg' }], top: '31%' },
  orbitSmall: { position: 'absolute', width: 235, height: 235, borderRadius: 120, borderWidth: 1, top: '29%' },
  star: { position: 'absolute', width: 5, height: 5, borderRadius: 3, shadowOpacity: 0.9, shadowRadius: 8 },
  starOne: { left: '18%', top: '28%' }, starTwo: { right: '16%', top: '39%' }, starThree: { left: '28%', bottom: '25%' },
  avatarHalo: { shadowOpacity: 0.65, shadowRadius: 34, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  name: { marginTop: 18, color: '#FFFFFF', fontSize: 25, lineHeight: 31, fontWeight: '900', textAlign: 'center' },
  meta: { marginTop: 8, color: 'rgba(255,255,255,0.68)', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
});
