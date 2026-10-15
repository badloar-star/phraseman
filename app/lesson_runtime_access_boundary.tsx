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

/**
 * R58 #8 (аудит кнопок 15.10): шлюз брал Number(id), экраны — parseInt. Ссылка ?id=20abc давала шлюзу NaN → проверялся
 * урок 1 (открыт), а экран грузил урок 20 — обход замка Free. Один строгий разбор: только ^\d+$, иначе — отказ.
 */
export type LessonRouteIdParse =
  | Readonly<{ kind: 'absent' }>
  | Readonly<{ kind: 'ok'; id: number }>
  | Readonly<{ kind: 'invalid'; raw: string }>;

export function parseLessonRouteId(raw: string | undefined | null): LessonRouteIdParse {
  if (raw == null || raw === '') return { kind: 'absent' };
  const trimmed = String(raw).trim();
  if (!/^\d+$/.test(trimmed)) return { kind: 'invalid', raw: trimmed };
  const id = Number(trimmed);
  return Number.isSafeInteger(id) && id > 0 ? { kind: 'ok', id } : { kind: 'invalid', raw: trimmed };
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
    const parsedRoute = parseLessonRouteId(rawLessonId);
    const lessonId = parsedRoute.kind === 'ok' ? parsedRoute.id : (options.defaultLessonId ?? 1);
    const invalidRouteId = parsedRoute.kind === 'invalid' ? parsedRoute.raw : null;
    const { studyTarget } = useStudyTarget();
    const accessAuthorized = useLessonRuntimeAccessAuthorization(router, lessonId, studyTarget);
    // невалидный id — отказ: содержимое урока не монтируется ни при каком ответе шлюза
    const authorized = accessAuthorized && invalidRouteId === null;
    const { theme: t } = useTheme();
    useEffect(() => {
      if (invalidRouteId === null) return;
      console.warn(`[LESSON-GATE] invalid_route_id raw=${JSON.stringify(invalidRouteId)} screen=${Screen.displayName ?? 'Screen'} → вкладка «Уроки»`); // guard-ok: отказ логируется
      router.replace('/(tabs)/lessons' as never);
    }, [invalidRouteId, router]);

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
