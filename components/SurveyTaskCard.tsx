import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { SurveyOfferSnapshot } from '../app/survey_offer_model';

const SURVEY_ACCENT = '#B98CFF';
const SURVEY_SURFACE = '#211B31';

export type SurveyTaskCardProps = {
  challenge: SurveyOfferSnapshot;
  onOpen: (challenge: SurveyOfferSnapshot) => void;
};

export default function SurveyTaskCard({ challenge, onOpen }: SurveyTaskCardProps) {
  const completed = challenge.phase === 'completed';
  const active = challenge.phase === 'active' && challenge.survey !== null;

  return (
    <Pressable
      testID="survey-offer-card"
      onPress={active ? () => onOpen(challenge) : undefined}
      disabled={!active}
      accessibilityRole={active ? 'button' : undefined}
      accessibilityState={{ disabled: !active }}
      accessibilityLabel={`${challenge.title}. ${challenge.description}`}
      style={({ pressed }) => [styles.card, pressed && active ? styles.pressed : null]}
    >
      <View pointerEvents="none" style={styles.fill} />
      <View pointerEvents="none" style={styles.glow} />
      <View pointerEvents="none" style={styles.accentBar} />
      <Image testID="survey-offer-art" source={require('../assets/images/survey/survey.webp')} contentFit="contain" style={styles.art} accessible={false} />
      <View style={styles.copy}>
        <Text testID="survey-offer-title" style={styles.title}>{challenge.title}</Text>
        <Text testID="survey-offer-description" style={styles.description}>{challenge.description}</Text>
      </View>
      {completed ? <Ionicons testID="survey-offer-claimed" name="checkmark-circle" size={24} color={SURVEY_ACCENT} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 92, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden', backgroundColor: SURVEY_SURFACE, borderWidth: 1, borderColor: 'rgba(185,140,255,0.55)' },
  pressed: { opacity: 0.82 },
  art: { width: 68, height: 68, flexShrink: 0 },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  description: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 3 },
  fill: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(185,140,255,0.16)', borderRadius: 22 },
  glow: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(185,140,255,0.07)', borderRadius: 22 },
  accentBar: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4, opacity: 0.88, backgroundColor: SURVEY_ACCENT },
});
