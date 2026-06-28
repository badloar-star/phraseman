import React, { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { safeRouterBack } from './navigation_back';
import LessonIntroScreens from './lesson_intro_screens';
import { getLessonIntroScreens } from './lesson_data_all';
import { useStudyTarget } from '../components/StudyTargetContext';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : (value ?? '');
}

/**
 * Экран теории урока (новый аккордеон-путь) для входа из тайла «Теория».
 *
 * Это вторая точка входа в теорию урока (первая — pre-lesson intro внутри
 * lesson1.tsx). Раньше тайл вёл в lesson_help.tsx (монолит с .render()).
 * Здесь — единый LessonIntroScreens, который сам выберет аккордеон-путь, если у
 * урока есть interaction/topicAccent, иначе покажет legacy. Закрывает раздвоение
 * «теории» из аудита (UX-03) без правки большого dirty-файла lesson_help.tsx.
 */
export default function LessonTheoryV2Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { studyTarget } = useStudyTarget();

  const lessonId = Number(firstParam(params.id) || '1');
  const introScreens = useMemo(
    () => getLessonIntroScreens(lessonId, studyTarget),
    [lessonId, studyTarget],
  );

  const goBack = () => safeRouterBack(router, '/lesson_menu');

  return (
    <LessonIntroScreens
      introScreens={introScreens}
      lessonId={lessonId}
      onComplete={goBack}
      onBack={goBack}
    />
  );
}
