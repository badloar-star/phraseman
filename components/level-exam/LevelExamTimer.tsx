import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { ExamPill } from './ExamGlassParts';
import { formatLevelExamRemaining, getLevelExamTimerUrgency } from './levelExamTime';

export { formatLevelExamRemaining, getLevelExamTimerUrgency } from './levelExamTime';

type Props = {
  remainingMs: number;
  totalMs: number;
};

export default function LevelExamTimer({ remainingMs, totalMs }: Props) {
  const { theme: t, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const urgency = getLevelExamTimerUrgency(remainingMs);
  // зачем: totalMs остаётся в контракте пропсов (кольцо/полоса могут вернуться), в макете зачёта — пилюля времени
  void totalMs;
  const color = urgency === 'normal' ? glass.text : t.wrong;

  return (
    <View
      accessibilityRole="timer"
      accessibilityLiveRegion={urgency === 'normal' ? 'none' : 'polite'}
      accessibilityLabel={formatLevelExamRemaining(remainingMs)}
    >
      <ExamPill glass={glass} icon="timer-outline" text={formatLevelExamRemaining(remainingMs)} color={color} />
    </View>
  );
}
