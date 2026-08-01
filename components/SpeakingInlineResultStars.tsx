import React, { memo } from 'react';
import { View } from 'react-native';

import { PLAN_PRONUNCIATION_PASS_THRESHOLD } from '../app/personal_plan_pronunciation_scoring_client';
import { speakingBand } from '../app/speaking_score_bands';
import SpeakingScoreStars from './SpeakingScoreStars';
import { inlineSpeakingResultColor, type SpeakingPanelTheme } from './SpeakingPanel';

export interface SpeakingAttemptResult {
  score: number;
  passed: boolean;
}

interface SpeakingInlineResultStarsProps {
  result: SpeakingAttemptResult;
  theme: Pick<SpeakingPanelTheme, 'correct' | 'wrong' | 'textMuted'>;
  testID?: string;
}

function SpeakingInlineResultStars({ result, theme, testID }: SpeakingInlineResultStarsProps) {
  const band = speakingBand(result.score, PLAN_PRONUNCIATION_PASS_THRESHOLD);
  return (
    <View testID={testID} accessibilityLabel={`${result.score}`}>
      <SpeakingScoreStars
        score={result.score}
        passThreshold={PLAN_PRONUNCIATION_PASS_THRESHOLD}
        color={inlineSpeakingResultColor(band, theme)}
        emptyColor={theme.textMuted}
        size={20}
      />
    </View>
  );
}

export default memo(SpeakingInlineResultStars);
