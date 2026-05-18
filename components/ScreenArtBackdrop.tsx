import React from 'react';
import AppArtBackdrop from './AppArtBackdrop';
export type ScreenArtBackdropName = 'achievements' | 'dailyTasks' | 'quizzes' | 'diagnosticTest' | 'exam' | 'flashcards';

export default function ScreenArtBackdrop({ screen }: { screen: ScreenArtBackdropName }) {
  return <AppArtBackdrop name={screen} />;
}
