import { Redirect, useLocalSearchParams } from 'expo-router';

import {
  IRREGULAR_VERB_COUNT_BY_LESSON,
  LESSONS_WITH_IRREGULAR_VERBS,
} from './irregular_verbs_data';

export const LESSONS_WITH_VERBS = LESSONS_WITH_IRREGULAR_VERBS;
export const VERB_COUNT_BY_LESSON = IRREGULAR_VERB_COUNT_BY_LESSON;
export { LESSONS_WITH_IRREGULAR_VERBS };

export default function LessonVerbsRedirect() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/lesson_irregular_verbs', params }} />;
}
