import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { SurveyDailyChallengeSnapshot } from '../app/survey_daily_challenge_model';
import { DailyTaskCard } from './daily-tasks/DailyTaskCard';

const SURVEY_ACCENT = '#B98CFF';
const SURVEY_SURFACE = '#211B31';

export type SurveyTaskCardProps = {
  challenge: SurveyDailyChallengeSnapshot;
  onOpen: (challenge: SurveyDailyChallengeSnapshot) => void;
};

export default function SurveyTaskCard({ challenge, onOpen }: SurveyTaskCardProps) {
  const completed = challenge.phase === 'completed';
  const active = challenge.phase === 'active' && challenge.survey !== null;

  return (
    <DailyTaskCard
      testID="daily-survey-task"
      title={challenge.title}
      description={challenge.description}
      titleColor="#FFFFFF"
      descriptionColor="rgba(255,255,255,0.78)"
      surfaceColor={SURVEY_SURFACE}
      borderColor="rgba(185,140,255,0.55)"
      accentColor={SURVEY_ACCENT}
      outerStyle={styles.card}
      onPress={active ? () => onOpen(challenge) : undefined}
      icon={<Image testID="daily-survey-task-art" source={require('../assets/images/daily_task_icons/survey.webp')} contentFit="contain" style={styles.art} accessible={false} />}
      claimed={completed}
      claimedIndicator={completed ? <Ionicons name="checkmark-circle" size={24} color={SURVEY_ACCENT} /> : undefined}
      background={<>
        <View pointerEvents="none" style={[styles.fill, { backgroundColor: 'rgba(185,140,255,0.16)' }]} />
        <View pointerEvents="none" style={[styles.glow, { backgroundColor: 'rgba(185,140,255,0.07)' }]} />
        <View pointerEvents="none" style={[styles.accentBar, { backgroundColor: SURVEY_ACCENT }]} />
      </>}
    />
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 92, borderRadius: 22, paddingHorizontal: 22, justifyContent: 'flex-start' },
  art: { width: 68, height: 68, flexShrink: 0 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 22 },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 22 },
  accentBar: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4, opacity: 0.88 },
});
