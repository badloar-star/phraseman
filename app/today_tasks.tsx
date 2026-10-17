// ═══════════════════════════════════════════════════════════════════════════
// today_tasks.tsx — экран «Сегодня»: кольцо дня наверху + те же три задачи строками (тап → в активность).
//
// зачем (владелец 17.10: «эти кружочки должны быть не на Главной, а когда нажимаем „смотреть все“ — там, внутри экрана,
// этот кружочек с заполнением»; решения координатора 17.10): вход — «Смотреть все» у блока «Сегодня» Главной (за флагом moments_v3).
// Кольцо — общий TodayRings (эталон v3 «Кольца и огонь»), монета ранга в центре; заполнение «до → после» с прошлого открытия
// (первое за день — от нуля), reduceMotion — сразу финал. Минимализм: без огня и недели. Ничего не пишет в прогресс и не начисляет.
// Место под кольцо зарезервировано с первого кадра — строки не прыгают, пока читается «что уже видели». Журнал — [TODAY-RING].
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { triLang } from '../constants/i18n';
import { V2, V2_TYPE } from '../constants/v2Style';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { PressableScale } from '../components/feedback/PressableScale';
import HomeV2TodayCard from '../components/home/v2/HomeV2TodayCard';
import type { TodayTask } from '../components/home/v2/home_v2_types';
import { todayRingColors, useStreakColors } from '../components/streak/moments/use_streak_colors';
import { useMomentsV3Enabled } from '../components/streak/moments/use_moments_v3_flag';
import { useV2Palette } from '../components/v2/useV2Palette';
import { useGuardedNav } from '../hooks/use-guarded-nav';
import { useTodayTasks } from '../hooks/use_today_tasks';
import { safeRouterBack } from './navigation_back';
import { filterTodayTasksForTarget } from './today_task_surface_filter';
import { readTodayRingFrom, rememberTodayRingSeen, type TodayRingProgress } from './today_ring_seen';

/**
 * Высота блока колец: кольцо 222 (макет Б) + отступы TodayRings 2/14 + отступы блока 26/12 (в макете 28 сверху / 26 снизу).
 * В RN minHeight включает padding. Плашки «День выполнен» на экране нет (координатор 17.10) — резерв под неё не нужен.
 */
const RINGS_BLOCK_HEIGHT = 222 + 2 + 14 + 26 + 12;
// зачем (emil-design-eng): блок колец не «выскакивает» после чтения «что уже видели» — мягкое появление 200 мс, место уже зарезервировано
const RINGS_ENTER = FadeIn.duration(200).easing(Easing.bezier(0.23, 1, 0.32, 1));

type RingFrom = Readonly<{ seenKey: string; from: TodayRingProgress }>;

function ringProgress(tasks: readonly TodayTask[]): TodayRingProgress {
  return [tasks[0]?.progress ?? 0, tasks[1]?.progress ?? 0, tasks[2]?.progress ?? 0];
}

export default function TodayTasksScreen() {
  const router = useRouter();
  const nav = useGuardedNav();
  const p = useV2Palette();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const ringsOn = useMomentsV3Enabled();
  const reduceMotion = useReducedMotion();
  const streakColors = useStreakColors(ringsOn);
  const doneColors = useMemo(() => (streakColors ? todayRingColors(streakColors) : null), [streakColors]);
  const todayTasks = useTodayTasks(lang, studyTarget);
  const tasks = useMemo(() => filterTodayTasksForTarget(todayTasks.tasks, studyTarget), [studyTarget, todayTasks.tasks]);
  // зачем: «до» привязано к дню И набору задач — если набор дня сменился (язык, Пик), кольцо не докручивается от чужих чисел
  const seenKey = `${todayTasks.dayKey}|${tasks.map((task) => task.kind).join(',')}`;
  const progress = ringProgress(tasks);
  const [ringFrom, setRingFrom] = useState<RingFrom | null>(null);
  const openedAtRef = useRef(Date.now());
  const loggedOpenRef = useRef(false);

  useEffect(() => {
    if (loggedOpenRef.current) return;
    loggedOpenRef.current = true;
    console.log('[TODAY-RING] screen:open', JSON.stringify({ ringsOn, dayKey: todayTasks.dayKey, studyTarget, tasks: tasks.map((task) => `${task.kind}:${task.progress}/${task.target}`) })); // guard-ok: одна строка на вход
  }, [ringsOn, studyTarget, tasks, todayTasks.dayKey]);

  useEffect(() => {
    if (!ringsOn) {
      console.log('[TODAY-RING] ring:skip флаг moments_v3 выключен — только строки'); // guard-ok: ранний выход
      return undefined;
    }
    if (ringFrom?.seenKey === seenKey) return undefined;
    let alive = true;
    void readTodayRingFrom(seenKey).then(({ from, source }) => {
      if (!alive) {
        console.log('[TODAY-RING] ring:from_dropped экран закрыт до чтения'); // guard-ok: ранний выход
        return;
      }
      console.log('[TODAY-RING] ring:from', JSON.stringify({ source, from, to: progress, readMs: Date.now() - openedAtRef.current })); // guard-ok: одна строка на набор дня
      setRingFrom({ seenKey, from });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: «до» читается раз на набор дня; прогресс внутри набора догоняет кольцо само
  }, [ringsOn, seenKey]);

  // зачем: показанное запоминается для следующего открытия — только после того, как кольцо получило «до» (иначе стёрли бы прирост)
  const progressKey = progress.join(',');
  useEffect(() => {
    if (!ringFrom || ringFrom.seenKey !== seenKey) return;
    rememberTodayRingSeen(seenKey, progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: запись на смену чисел, сам массив новый на каждый рендер
  }, [ringFrom, seenKey, progressKey]);

  const title = triLang(lang, { ru: 'Сегодня', uk: 'Сьогодні', en: 'Today', es: 'Hoy', 'pt-BR': 'Hoje', vi: 'Hôm nay', id: 'Hari ini', tr: 'Bugün', pl: 'Dziś' });
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  // зачем (скорость холодного старта): кольца, монета и звуки грузятся только на этом экране и только при включённом флаге
  const TodayRingsSlot = ringsOn ? (require('../components/streak/moments/TodayRingsSlot') as typeof import('../components/streak/moments/TodayRingsSlot')).default : null;
  const ringReady = ringFrom !== null && ringFrom.seenKey === seenKey;

  const openTask = (task: TodayTask) => {
    console.log('[TODAY-RING] task:open', JSON.stringify({ kind: task.kind, route: task.route, progress: task.progress, target: task.target, done: task.done })); // guard-ok: одна строка на тап
    // зачем: вкладки (Видео, Пик в «Сообществе») — переход на вкладку, остальное — защищённый от двойного тапа push
    if (task.route.startsWith('/(tabs)')) router.navigate(task.route as never);
    else nav.push(task.route as never);
  };

  return (
    <View testID="today-tasks-screen" style={[s.root, { backgroundColor: p.bg }]}>
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.header}>
          <PressableScale
            testID="today-tasks-back"
            onPress={() => safeRouterBack(router, '/(tabs)/home' as never)}
            variant="flat"
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            style={[s.back, { backgroundColor: p.control }]}
          >
            <Ionicons name="chevron-back" size={23} color={p.text} />
          </PressableScale>
          <Text accessibilityRole="header" numberOfLines={1} style={[s.title, { color: p.text }]}>{title}</Text>
        </View>
        <ScrollView contentContainerStyle={s.content} decelerationRate="fast">
          {TodayRingsSlot ? (
            <View testID="today-tasks-rings" style={s.rings}>
              {ringReady ? (
                <Animated.View entering={reduceMotion ? undefined : RINGS_ENTER}>
                  <TodayRingsSlot tasks={tasks} fromProgress={ringFrom.from} size={222} showDayDone={false} />
                </Animated.View>
              ) : null}
            </View>
          ) : null}
          <HomeV2TodayCard title={null} tasks={tasks} onOpenTask={openTask} doneColors={ringsOn ? doneColors : null} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 60, paddingHorizontal: V2.screenPad, flexDirection: 'row', alignItems: 'center', gap: V2.gap },
  back: { width: V2.iconButton, height: V2.iconButton, borderRadius: V2.iconButton / 2, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, ...V2_TYPE.title },
  content: { paddingHorizontal: V2.screenPad - 6, paddingTop: 8, paddingBottom: 32, gap: 8 },
  rings: { minHeight: RINGS_BLOCK_HEIGHT, paddingTop: 26, paddingBottom: 12 },
});
