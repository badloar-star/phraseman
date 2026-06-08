import React, { memo } from 'react';
import AppArtBackdrop from './AppArtBackdrop';
export type ScreenArtBackdropName = 'achievements' | 'dailyTasks' | 'quizzes' | 'diagnosticTest' | 'exam' | 'flashcards' | 'levelGifts';

function ScreenArtBackdrop({ screen }: { screen: ScreenArtBackdropName }) {
  return <AppArtBackdrop name={screen} />;
}

export default memo(ScreenArtBackdrop);
