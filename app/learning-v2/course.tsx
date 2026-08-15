import React from "react";
import LessonsTab from "../(tabs)/lessons";

/**
 * Learning V2 starts with the canonical lesson plaques.
 *
 * This route deliberately renders the same LessonsTab and the same LessonCard
 * as the ordinary learning screen. A selected V2 plaque expands its 56-session
 * map inline; opening another plaque collapses the previous one.
 */
export default function LearningV2CourseScreen() {
  return <LessonsTab presentation="push" initialPage="v2" />;
}
