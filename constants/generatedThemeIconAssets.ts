import type { ImageSourcePropType } from "react-native";

import type { ThemeMode } from "./theme";

const LESSON_EXAM_ICONS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require("../assets/images/generated_theme_icons/lesson-exam-dark.webp"),
  gold: require("../assets/images/generated_theme_icons/lesson-exam-gold.webp"),
  olive: require("../assets/images/generated_theme_icons/lesson-exam-olive.webp"),
  sagePorcelain: require("../assets/images/generated_theme_icons/lesson-exam-sagePorcelain.webp"),
  midnight: require("../assets/images/generated_theme_icons/lesson-exam-midnight.webp"),
  ember: require("../assets/images/generated_theme_icons/lesson-exam-ember.webp"),
  aurora: require("../assets/images/generated_theme_icons/lesson-exam-aurora.webp"),
  volt: require("../assets/images/generated_theme_icons/lesson-exam-volt.webp"),
  indigo: require("../assets/images/generated_theme_icons/lesson-exam-indigo.webp"),
};

export function getLessonExamIcon(themeMode: ThemeMode): ImageSourcePropType {
  return LESSON_EXAM_ICONS[themeMode] ?? LESSON_EXAM_ICONS.dark;
}
