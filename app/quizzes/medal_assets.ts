import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '../../constants/theme';

export type QuizCompletionMedalTheme = ThemeMode | 'forest' | 'neonGreen' | 'neon-green';

const QUIZ_COMPLETION_MEDALS: Record<Exclude<QuizCompletionMedalTheme, 'neon-green'>, ImageSourcePropType> = {
  dark: require('../../assets/images/quizzes/medals/quiz-completion-medal-dark-cutout.webp'),
  neon: require('../../assets/images/quizzes/medals/quiz-completion-medal-neon-cutout.webp'),
  gold: require('../../assets/images/quizzes/medals/quiz-completion-medal-gold-cutout.webp'),
  coral: require('../../assets/images/quizzes/medals/quiz-completion-medal-coral-cutout.webp'),
  minimalLight: require('../../assets/images/quizzes/medals/quiz-completion-medal-minimal-light-cutout.webp'),
  minimalDark: require('../../assets/images/quizzes/medals/quiz-completion-medal-minimal-dark-cutout.webp'),
  compass: require('../../assets/images/quizzes/medals/quiz-completion-medal-compass-premium-cutout.webp'),
  midnight: require('../../assets/images/quizzes/medals/quiz-completion-medal-compass-premium-cutout.webp'),
  ember: require('../../assets/images/quizzes/medals/quiz-completion-medal-compass-premium-cutout.webp'),
  aurora: require('../../assets/images/quizzes/medals/quiz-completion-medal-compass-premium-cutout.webp'),
  volt: require('../../assets/images/quizzes/medals/quiz-completion-medal-compass-premium-cutout.webp'),
  forest: require('../../assets/images/quizzes/medals/quiz-completion-medal-forest-cutout.webp'),
  neonGreen: require('../../assets/images/quizzes/medals/quiz-completion-medal-neon-green-cutout.webp'),
};

export function getQuizCompletionMedalSource(
  theme: QuizCompletionMedalTheme | string | null | undefined,
): ImageSourcePropType {
  const key = theme === 'neon-green' ? 'neonGreen' : theme;
  return (key && QUIZ_COMPLETION_MEDALS[key as keyof typeof QUIZ_COMPLETION_MEDALS])
    || QUIZ_COMPLETION_MEDALS.minimalDark;
}
