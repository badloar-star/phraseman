// ═══════════════════════════════════════════════════════════════════════════
// TodayScene.tsx — «Сегодня» в стиле «Сцена»: данные экрана → состояние → тексты → TodaySceneView.
//
// зачем (эталон today-scene-concepts.html, вариант A; координатор 22.10): всё считается из заданий дня на телефоне, серии и часов —
// новых чтений базы нет. Журнал [TODAY-SCENE]: решение с причиной и тексты, чтобы по логу было видно, почему показано именно это состояние.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useSyncExternalStore } from 'react';

import { usePersonalProgressSnapshot } from '../../../../app/personal_progress_store';
import { peekStreakDayState, subscribeStreakDayState } from '../../../../app/streak_day_signal';
import type { Lang } from '../../../../constants/i18n';
import { todayRingColors, useStreakColors } from '../../../streak/moments/use_streak_colors';
import type { TodayTask } from '../home_v2_types';
import { minutesUntilMidnight } from '../scene/home_scene_state';
import TodayActivityHistory from '../TodayActivityHistory';
import TodaySceneView from './TodaySceneView';
import { buildTodaySceneCopy } from './today_scene_copy';
import { pickTodaySceneState } from './today_scene_state';

const LOG = '[TODAY-SCENE]';

// зачем: строка, а не объект — useSyncExternalStore требует устойчивого снимка (как на Главной)
function streakTodaySnapshot(): 'unknown' | 'counted' | 'pending' {
  const state = peekStreakDayState();
  if (state === null) return 'unknown';
  return state.counted ? 'counted' : 'pending';
}

export function todaySceneDateLabel(lang: Lang, now: Date): string | null {
  try {
    const raw = new Intl.DateTimeFormat(lang === 'pt-BR' ? 'pt-BR' : lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
    return raw.charAt(0).toLocaleUpperCase(lang) + raw.slice(1);
  } catch (error) {
    console.warn(LOG, 'date:intl_failed', JSON.stringify({ lang, message: error instanceof Error ? error.message : String(error) })); // guard-ok: причина, надпись с датой просто не показываем
    return null;
  }
}

type Props = Readonly<{
  lang: Lang;
  /** Заголовок экрана «Сегодня» справа от «назад» (28/34) — на языке интерфейса. */
  title: string;
  /** Ключ дня для ленты истории. */
  dayKey: string;
  tasks: readonly TodayTask[];
  fromProgress?: readonly [number, number, number];
  onBack: () => void;
  backLabel: string;
  onOpenTask: (task: TodayTask) => void;
}>;

export default function TodayScene({ lang, title, dayKey, tasks, fromProgress, onBack, backLabel, onOpenTask }: Props) {
  const personal = usePersonalProgressSnapshot();
  const streakToday = useSyncExternalStore(subscribeStreakDayState, streakTodaySnapshot);
  const streakColors = useStreakColors(true);
  const now = new Date();
  const hour = now.getHours();
  const streakDays = personal.streakCount;
  const dayCounted = streakToday === 'unknown' ? null : streakToday === 'counted';
  const tasksKey = tasks.map((t) => `${t.kind}:${t.progress}/${t.target}:${t.done ? 1 : 0}`).join(',');
  const decision = useMemo(
    () => pickTodaySceneState({ tasks, hour, streakDays, dayCounted }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: задания приходят новым массивом на каждый рендер, ключ — их содержимое
    [tasksKey, hour, streakDays, dayCounted],
  );
  const copy = useMemo(
    () => buildTodaySceneCopy({
      lang, decision, remainingKinds: tasks.filter((t) => !(t.done || (t.target > 0 && t.progress >= t.target))).map((t) => t.kind),
      streakDays, minutesToMidnight: minutesUntilMidnight(now), dateLabel: todaySceneDateLabel(lang, now),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: минуты до полуночи и дата меняются вместе с решением/часом
    [lang, decision, hour, streakDays],
  );
  useEffect(() => {
    console.log(LOG, 'decision', JSON.stringify({ state: decision.state, reason: decision.reason, next: decision.nextIndex, video: decision.hasVideoTask, title: copy.title, streakToday })); // guard-ok: одна строка на смену состояния
  }, [decision, copy.title, streakToday]);
  const ringColors = useMemo<readonly [string, string, string]>(
    () => (streakColors ? todayRingColors(streakColors) : ['#7EF0C8', '#A08CFF', '#F0C551']), // theme-exempt: запасные цвета колец, пока токены темы не готовы (эталон RC)
    [streakColors],
  );
  return (
    <TodaySceneView
      title={title} decision={decision} copy={copy} tasks={tasks} ringColors={ringColors} fromProgress={fromProgress}
      onBack={onBack} backLabel={backLabel} onOpenTask={onOpenTask}
      history={<TodayActivityHistory dayKey={dayKey} tasks={tasks} />}
    />
  );
}
