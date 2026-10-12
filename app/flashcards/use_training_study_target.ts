// зачем (владелец 12.10, п.83, cards-027): тренировки Карточек (блиц, говорение, вспомни и напиши, верно/неверно) идут на языке
// ВЫБРАННЫХ наборов, а не на языке изучения приложения. Один общий хук вместо точечных правок в четырёх сессиях:
// там `const { studyTarget } = useStudyTarget()` заменяется на `const studyTarget = useTrainingStudyTarget()`, и озвучка, проверка ответа,
// загрузка карточек, ошибки, id сессии и подписи сторон следуют сами. Контекст приложения (studyTarget) не меняется.
// Разбор и проверка параметра — в чистом fc_lang_filter.ts (trainingTargetFromParams), здесь только чтение маршрута.
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useStudyTarget } from '../../components/StudyTargetContext';
import type { LearningLanguageTarget } from '../learning_language_contour';
import { TRAINING_TARGET_PARAM, trainingTargetFromParams } from './fc_lang_filter';

export function useTrainingStudyTarget(): LearningLanguageTarget {
  const { studyTarget } = useStudyTarget();
  const params = useLocalSearchParams<{ target?: string | string[] }>();
  const rawParam = params[TRAINING_TARGET_PARAM];
  return useMemo(() => trainingTargetFromParams(rawParam, studyTarget), [rawParam, studyTarget]);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
