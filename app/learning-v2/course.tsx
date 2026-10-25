import React from "react";
import { Redirect, useNavigation, usePathname } from "expo-router";
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
  const navigation = useNavigation();
  // зачем (координатор 25.10, iPhone 2.0.2: слева ~40 pt виден прошлый экран, Сезон сдвинут вправо; «сперва логи»): чем вошли на экран
  // (состав стека: push с Главной / replace после занятия), шли ли переходы и жесты стека и сколько длились. В сторе переходы мгновенные
  // (animation none, gestureEnabled false) — если строки transition/gesture появятся, значит переход всё же был.
  React.useEffect(() => {
    const mountedAt = Date.now();
    const stackOf = (): unknown => {
      try {
        const st = navigation.getState() as { index?: number; routes?: ReadonlyArray<{ name?: string }> } | undefined;
        return { index: st?.index ?? null, routes: (st?.routes ?? []).map((r) => r.name ?? "?") };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    };
    console.log("[NAV-TRANSITION] course:mount", JSON.stringify({ pathname, stack: stackOf(), canGoBack: navigation.canGoBack?.() ?? null })); // guard-ok: вход
    const events = ["transitionStart", "transitionEnd", "gestureStart", "gestureEnd", "gestureCancel", "focus", "blur", "beforeRemove"] as const;
    const subs = events.map((name) => (navigation.addListener as (n: string, cb: (e: { data?: { closing?: boolean } }) => void) => () => void)(name, (e) => {
      console.log(`[NAV-TRANSITION] course:${name}`, JSON.stringify({ closing: e?.data?.closing ?? null, sinceMountMs: Date.now() - mountedAt, stack: stackOf() })); // guard-ok: событие стека
    }));
    return () => { for (const off of subs) off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: подписка на время жизни экрана
  }, [navigation]);
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
