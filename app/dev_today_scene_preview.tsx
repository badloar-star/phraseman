// ═══════════════════════════════════════════════════════════
// dev_today_scene_preview — DEV-превью «Сегодня» в стиле «Сцена» (вариант A) на моках (только разработка).
//
// зачем (координатор 22.10, Сверка): пять состояний снимаются по ссылке рядом с docs/design/v2-app/today-scene-concepts.html:
//   /dev_today_scene_preview?state=morning | day | eve | done | video &theme=dark|light
// По умолчанию state=day. Боевой экран не подменяется, ничего не читается из сети. Состояние выбирает НАСТОЯЩАЯ pickTodaySceneState.
// Тема меняется ТОЛЬКО в памяти процесса (app/dev_appearance_override.ts); уходя с экрана, возвращаем прежнее.
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { triLang } from '../constants/i18n';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { buildTodaySceneCopy } from '../components/home/v2/today_scene/today_scene_copy';
import { pickTodaySceneState } from '../components/home/v2/today_scene/today_scene_state';
import {
  TODAY_SCENE_PREVIEW_MINUTES_TO_MIDNIGHT,
  isTodayScenePreviewState,
  todayScenePreviewInput,
  todayScenePreviewTasks,
  type TodayScenePreviewState,
} from '../components/home/v2/today_scene/today_scene_preview_fixtures';
import type { TodayTask } from '../components/home/v2/home_v2_types';
import TodayActivityHistory from '../components/home/v2/TodayActivityHistory';
import TodaySceneView from '../components/home/v2/today_scene/TodaySceneView';
import { todaySceneDateLabel } from '../components/home/v2/today_scene/TodayScene';
import { todayRingColors, useStreakColors } from '../components/streak/moments/use_streak_colors';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { getDevAppearance, setDevAppearance } from './dev_appearance_override';
import { dismissToTabRoute, safeRouterBack } from './navigation_back';

function Inner() {
  const params = useLocalSearchParams<{ state?: string; theme?: string }>();
  const { lang } = useLang();
  const { isDark } = useTheme();
  const streakColors = useStreakColors(true);
  const state: TodayScenePreviewState = isTodayScenePreviewState(params.state) ? params.state : 'day';
  const wanted = params.theme === 'dark' || params.theme === 'light' ? params.theme : null;

  useEffect(() => {
    if (!wanted) return undefined;
    const before = getDevAppearance();
    setDevAppearance(wanted);
    return () => setDevAppearance(before);
  }, [wanted]);

  const router = useRouter();
  // зачем (аудит кнопок 22.10, F1: «ничего не нажимается»): кнопки превью ведут туда же, куда в настоящем экране «Сегодня» (app/today_tasks.tsx:119): вкладки — dismissTo, остальное — push
  const openTask = useCallback((task: TodayTask) => {
    console.log('[DEV-STATE] today_scene_preview task:open', JSON.stringify({ kind: task.kind, route: task.route })); // guard-ok: dev-маршрут, одна строка на тап
    if (task.route.startsWith('/(tabs)')) dismissToTabRoute(router, task.route);
    else router.push(task.route as never);
  }, [router]);
  const tasks = useMemo(() => todayScenePreviewTasks(state), [state]);
  const input = useMemo(() => todayScenePreviewInput(state), [state]);
  const decision = useMemo(() => pickTodaySceneState(input), [input]);
  const copy = useMemo(() => buildTodaySceneCopy({
    lang, decision, remainingKinds: tasks.filter((t) => !t.done).map((t) => t.kind), streakDays: input.streakDays,
    minutesToMidnight: TODAY_SCENE_PREVIEW_MINUTES_TO_MIDNIGHT, dateLabel: todaySceneDateLabel(lang, new Date(2026, 9, 21, 9, 10)),
  }), [lang, decision, tasks, input.streakDays]);
  const ringColors = useMemo<readonly [string, string, string]>(
    () => (streakColors ? todayRingColors(streakColors) : ['#7EF0C8', '#A08CFF', '#F0C551']), // theme-exempt: запасные цвета колец (эталон RC)
    [streakColors],
  );

  useEffect(() => {
    console.log(`[DEV-STATE] today_scene_preview route state=${state} fromParam=${String(params.state ?? 'нет→day')} theme=${wanted ?? (isDark ? 'dark' : 'light')} decision=${decision.state} reason=${decision.reason}`); // guard-ok: одна строка на смену состояния
  }, [state, params.state, wanted, isDark, decision]);

  return (
    <View style={{ flex: 1 }} testID="dev-today-scene-preview">
      <TodaySceneView
        key={`${state}|${wanted ?? 'app'}`}
        title={triLang(lang, { ru: 'Сегодня', uk: 'Сьогодні', en: 'Today', es: 'Hoy', 'pt-BR': 'Hoje', vi: 'Hôm nay', id: 'Hari ini', tr: 'Bugün', pl: 'Dziś' })}
        decision={decision}
        copy={copy}
        tasks={tasks}
        ringColors={ringColors}
        fromProgress={[0, 0, 0]}
        onBack={() => safeRouterBack(router, '/(tabs)/home' as never)}
        backLabel="Back"
        onOpenTask={openTask}
        history={<TodayActivityHistory dayKey="2026-10-21" tasks={tasks} />}
      />
    </View>
  );
}

export default function DevTodayScenePreview() {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href={'/(tabs)/home' as never} />;
  return <Inner />;
}
