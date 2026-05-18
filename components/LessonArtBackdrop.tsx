import React from 'react';
import AppArtBackdrop from './AppArtBackdrop';
import type { AppArtBackdropName } from './appArtBackdropRegistry';

type LessonArtBackdropVariant = 'menu' | 'intro' | 'practice';

const VARIANT_TO_APP_ART: Record<LessonArtBackdropVariant, AppArtBackdropName> = {
  menu: 'lessons',
  intro: 'lessonIntro',
  practice: 'lessonPractice',
};

export default function LessonArtBackdrop({ variant = 'menu' }: { variant?: LessonArtBackdropVariant }) {
  return <AppArtBackdrop name={VARIANT_TO_APP_ART[variant]} />;
}
