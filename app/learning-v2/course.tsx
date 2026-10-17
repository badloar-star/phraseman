import React from "react";
import { Redirect, usePathname } from "expo-router";
import LessonsTab from "../(tabs)/lessons";
import { LEARNING_V2_HIDDEN_REDIRECT, isLearningV2Hidden, logLearningV2Hidden } from "../learning_v2_visibility_switch";

/**
 * Learning V2 starts with the canonical lesson plaques.
 *
 * This route deliberately renders the same LessonsTab and the same LessonCard
 * as the ordinary learning screen. A selected V2 plaque expands its 56-session
 * map inline; opening another plaque collapses the previous one.
 */
export default function LearningV2CourseScreen() {
  // зачем (эмулятор 17.10: диплинк на занятие вёл на карту, LessonsTab монтировалась ×2; «сперва логи»): кто и с каким путём открыл карту курса
  const pathname = usePathname();
  React.useEffect(() => {
    console.log("[V2-DEEPLINK] course:mount", JSON.stringify({ pathname, atMs: Date.now() })); // guard-ok: строка на монтирование
    return () => console.log("[V2-DEEPLINK] course:unmount", JSON.stringify({ pathname })); // guard-ok: строка на уход
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: журнал монтирования
  }, []);
  // зачем (план Б 16.10): при скрытом V2 старая ссылка на курс ведёт на Главную, а не в пустой раздел.
  if (isLearningV2Hidden()) {
    logLearningV2Hidden("route_learning_v2_course", LEARNING_V2_HIDDEN_REDIRECT);
    return <Redirect href={LEARNING_V2_HIDDEN_REDIRECT} />;
  }
  return <LessonsTab presentation="push" initialPage="v2" />;
}
