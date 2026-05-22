import React from 'react';
import AppArtBackdrop from './AppArtBackdrop';
export type ScreenArtBackdropName = 'achievements' | 'dailyTasks' | 'quizzes' | 'diagnosticTest' | 'exam' | 'flashcards' | 'progressMap' | 'levelGifts';

export default function ScreenArtBackdrop({ screen }: { screen: ScreenArtBackdropName }) {
  return <AppArtBackdrop name={screen} />;
}
