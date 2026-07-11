import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SurveyDailyChallengeSnapshot } from '../app/survey_daily_challenge_model';
import { screenTextOnGradient } from '../constants/theme';
import TapScale from './TapScale';
import { useTheme } from './ThemeContext';

function isLightHex(hex: string): boolean {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((character) => character + character).join('');
  const red = parseInt(h.slice(0, 2), 16) / 255;
  const green = parseInt(h.slice(2, 4), 16) / 255;
  const blue = parseInt(h.slice(4, 6), 16) / 255;
  return 0.299 * red + 0.587 * green + 0.114 * blue > 0.6;
}

export type SurveyTaskCardProps = {
  challenge: SurveyDailyChallengeSnapshot;
  onOpen: (challenge: SurveyDailyChallengeSnapshot) => void;
};

export default function SurveyTaskCard({ challenge, onOpen }: SurveyTaskCardProps) {
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);

  if (challenge.phase === 'completed') {
    return (
      <View style={[styles.card, { backgroundColor: t.bgCard, opacity: 0.85 }]}>
        <View style={[styles.iconWrap, { backgroundColor: sx.ghost }]}>
          <Ionicons name="checkmark-circle" size={24} color="#63D98F" />
        </View>
        <View style={styles.content}>
          <Text numberOfLines={1} style={{ color: sx.primary, fontSize: f.body, fontWeight: '700' }}>
            {challenge.title}
          </Text>
          <Text numberOfLines={1} style={{ color: sx.muted, fontSize: f.label, marginTop: 2 }}>
            {challenge.description}
          </Text>
        </View>
      </View>
    );
  }

  const survey = challenge.survey;
  if (!survey) return null;

  const accent = survey.accentColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(survey.accentColor)
    ? survey.accentColor
    : null;
  const lightAccent = accent ? isLightHex(accent) : false;
  const foreground = lightAccent ? '#1A1A1A' : '#FFFFFF';
  const titleColor = accent ? foreground : sx.primary;
  const subtitleColor = accent
    ? (lightAccent ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.82)')
    : sx.muted;
  const iconColor = accent ? foreground : sx.second;
  const iconBackground = accent
    ? (lightAccent ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)')
    : sx.ghost;

  return (
    <TapScale onPress={() => onOpen(challenge)} style={[styles.card, { backgroundColor: accent || t.bgCard }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
        <Ionicons name="chatbubble-ellipses" size={22} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={{ color: titleColor, fontSize: f.body, fontWeight: '700' }}>
          {challenge.title}
        </Text>
        <Text numberOfLines={1} style={{ color: subtitleColor, fontSize: f.label, marginTop: 2 }}>
          {challenge.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={subtitleColor} />
    </TapScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
});
