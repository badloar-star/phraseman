import React, { memo } from 'react';
import { View } from 'react-native';

import { SPEECH_PRONUNCIATION_PASS_THRESHOLD } from '../app/pronunciation_scoring_client';
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
  const band = speakingBand(result.score, SPEECH_PRONUNCIATION_PASS_THRESHOLD);
  return (
    <View testID={testID} accessibilityLabel={`${result.score}`}>
      <SpeakingScoreStars
        score={result.score}
        passThreshold={SPEECH_PRONUNCIATION_PASS_THRESHOLD}
        color={inlineSpeakingResultColor(band, theme)}
        emptyColor={theme.textMuted}
        size={20}
      />
    </View>
  );
}

export default memo(SpeakingInlineResultStars);
