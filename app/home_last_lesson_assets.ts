import type { ImageSourcePropType } from "react-native";

import type { ThemeMode } from "../constants/theme";

// Один утверждённый ассет продолжения: темы тонируют стекло вокруг него, но не
// меняют сам предмет. Так карточка не "переодевает" блокнот при смене темы.
const HOME_LAST_LESSON_ART = require("../assets/images/home_last_lesson/home-last-lesson-notepad.png");

const HOME_LAST_LESSON_IMAGES: Record<ThemeMode, ImageSourcePropType> = {
  indigo: HOME_LAST_LESSON_ART,
  sagePorcelain: HOME_LAST_LESSON_ART,
  midnight: HOME_LAST_LESSON_ART,
  ember: HOME_LAST_LESSON_ART,
  aurora: HOME_LAST_LESSON_ART,
  volt: HOME_LAST_LESSON_ART,
  dark: HOME_LAST_LESSON_ART,
  gold: HOME_LAST_LESSON_ART,
  olive: HOME_LAST_LESSON_ART,
};

export function getHomeLastLessonImage(
  themeMode: ThemeMode,
): ImageSourcePropType {
  return HOME_LAST_LESSON_IMAGES[themeMode];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
