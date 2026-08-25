import React from "react";
import { Redirect } from "expo-router";
import LessonsTab from "../(tabs)/lessons";
import { ENABLE_DEV_TOOLS } from "../config";

/**
 * Learning V2 starts with the canonical lesson plaques.
 *
 * This route deliberately renders the same LessonsTab and the same LessonCard
 * as the ordinary learning screen. A selected V2 plaque expands its 56-session
 * map inline; opening another plaque collapses the previous one.
 */
export default function LearningV2CourseScreen() {
  // зачем (владелец, 25.08): Learning V2 временно только владельцу в dev-сборке,
  // сессии курса ещё дописываются. Родительский _layout.tsx блокирует холодные
  // диплинки, но этот guard нужен и для router.push() изнутри приложения.
  if (!ENABLE_DEV_TOOLS) return <Redirect href="/(tabs)/home" />;
  return <LessonsTab presentation="push" initialPage="v2" />;
}
