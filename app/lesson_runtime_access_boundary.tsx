import React, { useEffect, useState, type ComponentType } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import LessonFirstFrame from '../modules/lesson_first_frame';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import {
  openLessonAccessGate,
  openLessonPremiumPaywall,
  resolveLessonRuntimeGate,
} from './lesson_premium_gate';
import type { RuntimeStudyTarget } from './target_storage_keys';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function useLessonRuntimeAccessAuthorization(
  router: ReturnType<typeof useRouter>,
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): boolean {
  const routeKey = `${studyTarget ?? 'en'}:${lessonId}`;
  const [authorizedRouteKey, setAuthorizedRouteKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAuthorizedRouteKey(null);
    // зачем (координатор 13.10; сперва логи): сколько мс шлюз держит экран на скелете и чем кончил. Только журнал — решение ниже не менялось.
    const startedAt = Date.now();
    console.log(`[LESSON-GATE-FIRSTFRAME] boundary ${routeKey}: проверка доступа идёт — рисуем скелет урока`); // guard-ok: одна строка на начало проверки

    void resolveLessonRuntimeGate(lessonId, studyTarget)
      .then(gate => {
        console.log(`[LESSON-GATE-FIRSTFRAME] boundary ${routeKey}: проверка заняла ${Date.now() - startedAt} мс → ${gate}${cancelled ? ' (экран уже ушёл)' : ''}`); // guard-ok: одна строка на конец проверки
        if (cancelled) return;
        if (gate === 'available') {
          setAuthorizedRouteKey(routeKey);
          return;
        }
        if (gate === 'premium_required') {
          openLessonPremiumPaywall(router, lessonId);
          return;
        }
        openLessonAccessGate(router, lessonId);
      })
      .catch((error: unknown) => {
        console.warn(`[LESSON-GATE-FIRSTFRAME] boundary ${routeKey}: проверка упала за ${Date.now() - startedAt} мс (${error instanceof Error ? error.message : String(error)}) → закрыто`); // guard-ok: catch пишет причину
        // Defense in depth: resolver is fail-closed, but an unexpected rejection
        // must still route to a lock surface and must never mount lesson content.
        if (!cancelled) openLessonAccessGate(router, lessonId);
      });

    return () => { cancelled = true; };
  }, [lessonId, routeKey, router, studyTarget]);

  return authorizedRouteKey === routeKey;
}

type LessonRuntimeAccessBoundaryOptions = {
  defaultLessonId?: number;
};

export function withLessonRuntimeAccessBoundary<P extends object>(
  Screen: ComponentType<P>,
  options: LessonRuntimeAccessBoundaryOptions = {},
): ComponentType<P> {
  function GuardedLessonScreen(props: P) {
    const router = useRouter();
    const params = useLocalSearchParams<{
      id?: string | string[];
      lessonId?: string | string[];
    }>();
    const rawLessonId = firstRouteParam(params.id) ?? firstRouteParam(params.lessonId);
    const parsedLessonId = Number(rawLessonId);
    const lessonId = Number.isInteger(parsedLessonId) && parsedLessonId > 0
      ? parsedLessonId
      : (options.defaultLessonId ?? 1);
    const { studyTarget } = useStudyTarget();
    const authorized = useLessonRuntimeAccessAuthorization(router, lessonId, studyTarget);
    const { theme: t } = useTheme();

    if (!authorized) {
      // зачем (координатор 13.10): раньше здесь был пустой `View` без фона (вспышка между списком и уроком). Теперь тот же скелет, что урок рисует сразу после шлюза (LessonFirstFrame), — фон и геометрия
      // совпадают с готовым экраном. Скелет ничего не разрешает: содержимое урока не монтируется, пока шлюз не ответил `available`.
      return (
        <View testID="lesson-runtime-access-pending" pointerEvents="none" style={{ flex: 1 }}>
          <LessonFirstFrame theme={t} />
        </View>
      );
    }

    return <Screen {...props} />;
  }

  GuardedLessonScreen.displayName = `LessonRuntimeAccessBoundary(${Screen.displayName ?? 'Screen'})`;
  return GuardedLessonScreen;
}

/* expo-router route shim: utility module is not an application screen */
export default function __RouteShim() { return null; }
