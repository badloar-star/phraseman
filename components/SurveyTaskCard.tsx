import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import type { SurveyDailyChallengeSnapshot } from '../app/survey_daily_challenge_model';
import { DailyTaskCard } from './daily-tasks/DailyTaskCard';

const SURVEY_ACCENT = '#B98CFF';
const SURVEY_SURFACE = '#211B31';
const SURVEY_ICON_PLATE = '#493466';

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
      iconStyle={{ backgroundColor: SURVEY_ICON_PLATE, borderColor: SURVEY_ACCENT }}
      onPress={active ? () => onOpen(challenge) : undefined}
      icon={<Ionicons name="chatbubble-ellipses-outline" size={24} color={SURVEY_ACCENT} />}
      claimed={completed}
      claimedIndicator={completed ? <Ionicons name="checkmark-circle" size={24} color={SURVEY_ACCENT} /> : undefined}
    />
  );
}
