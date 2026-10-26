import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { dismissToTabRoute } from "../navigation_back";
import { LEARNING_V2_HIDDEN_REDIRECT, isLearningV2Hidden, logLearningV2Hidden } from "../learning_v2_visibility_switch";

/** Legacy links return to the retained course tab instead of mounting a second hub. */
export default function LearningV2CourseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) forwarded.append(key, item);
    }
  }
  forwarded.set("courseEntry", "v2");
  const query = forwarded.toString();
  React.useEffect(() => {
    if (isLearningV2Hidden()) {
      logLearningV2Hidden("route_learning_v2_course", LEARNING_V2_HIDDEN_REDIRECT);
      router.replace(LEARNING_V2_HIDDEN_REDIRECT);
      return;
    }
    dismissToTabRoute(router, '/(tabs)/lessons' + (query ? '?' + query : ''));
  }, [query, router]);
  return null;
}
