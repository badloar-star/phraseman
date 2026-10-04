import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { V2GlassSheen, V2IconTile, useV2GlassStyle } from '../../v2/V2Glass';
import type { TodayTask, TodayTaskKind } from './home_v2_types';

const KIND_ICON: Record<TodayTaskKind, React.ComponentProps<typeof Ionicons>['name']> = {
  lesson: 'book-outline',
  dialog: 'chatbubble-ellipses-outline',
  cards: 'copy-outline',
  video: 'play-circle-outline',
  mistakes: 'refresh-outline',
  spire_steps: 'trending-up-outline',
};

type Props = {
  title: string;
  tasks: readonly TodayTask[];
  onOpenTask: (task: TodayTask) => void;
  /** Q90 (координатор 01.10): активный опрос — строка ПОД заданиями, тем же видом; null/нет — не рисуется. */
  surveyRow?: Readonly<{ title: string; subtitle?: string; onPress: () => void }> | null;
};

/**
 * «СЕГОДНЯ» новой Главной (референс 2.0, D49): три задачи дня. Строка =
 * кружок-отметка, значок активности, название с подписью, счётчик progress/target.
 * «Показать все» владелец убрал: тап по задаче сразу ведёт в активность.
 */
export default function HomeV2TodayCard({ title, tasks, onOpenTask, surveyRow }: Props) {
  const p = useV2Palette();
  const glass = useV2GlassStyle();
  const rowGlass = useV2GlassStyle(true);
  return (
    <View testID="home-v2-today" style={[s.card, glass]}>
      <V2GlassSheen seed={3} />
      <Text accessibilityRole="header" style={[s.header, { color: p.textSecondary }]}>{title}</Text>
      <View style={s.list}>
        {tasks.map((task, index) => {
          const counter = `${Math.min(task.progress, task.target)}/${task.target}`;
          return (
            <V2Pressable
              key={task.id}
              testID={`home-v2-today-${task.kind}`}
              accessibilityRole="button"
              accessibilityState={{ checked: task.done }}
              accessibilityLabel={`${task.title}${task.subtitle ? `. ${task.subtitle}` : ''}. ${counter}`}
              onPress={() => {
                // зачем (владелец 01.10: «задания дня должны открывать свой раздел»): лог маршрута каждого нажатия.
                console.log('[TODAY-TASKS] route', JSON.stringify({ kind: task.kind, route: task.route, done: task.done, progress: task.progress, target: task.target }));
                onOpenTask(task);
              }}
              scaleTo={0.98}
              style={[s.row, rowGlass]}
            >
              <V2GlassSheen seed={index + 1} />
              <View
                style={[s.check, task.done ? { backgroundColor: p.iconTint, borderColor: p.iconTint } : { borderColor: p.textMuted }]} // guard-ok: D43 отметка-кружок
              >
                {task.done ? <Ionicons name="checkmark" size={14} color={p.card} /> : null}
              </View>
              <V2IconTile name={KIND_ICON[task.kind]} size={36} iconSize={19} />
              <View style={s.copy}>
                <Text style={[s.taskTitle, { color: p.text }]}>{task.title}</Text>
                {task.subtitle ? (
                  <Text style={[s.taskSubtitle, { color: p.textSecondary }]}>{task.subtitle}</Text>
                ) : null}
              </View>
              <Text style={[s.counter, { color: p.textSecondary }]}>{counter}</Text>
            </V2Pressable>
          );
        })}
        {surveyRow ? (
          <V2Pressable
            testID="home-v2-today-survey"
            accessibilityRole="button"
            accessibilityLabel={`${surveyRow.title}${surveyRow.subtitle ? `. ${surveyRow.subtitle}` : ''}`}
            onPress={surveyRow.onPress}
            scaleTo={0.98}
            style={[s.row, rowGlass]}
          >
            <V2GlassSheen seed={tasks.length + 1} />
            <View style={[s.check, { borderColor: p.textMuted }]} /* guard-ok: D43 отметка-кружок, как у заданий */ />
            <V2IconTile name="clipboard-outline" size={36} iconSize={19} />
            <View style={s.copy}>
              <Text numberOfLines={1} style={[s.taskTitle, { color: p.text }]}>{surveyRow.title}</Text>
              {surveyRow.subtitle ? (
                <Text numberOfLines={1} style={[s.taskSubtitle, { color: p.textSecondary }]}>{surveyRow.subtitle}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={p.textSecondary} />
          </V2Pressable>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: V2.radius.card,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    // зачем (владелец 04.10, по скриншоту: «сделай контейнеры внутри шире»): боковой отступ блока
    // 12 → 6 — строки задач шире на 12 px; заголовок сдвинут, чтобы стоять на прежней линии.
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 16,
  },
  header: { ...V2_TYPE.overline, fontSize: 13, lineHeight: 17, letterSpacing: 1.6, marginLeft: 12, marginBottom: 12 },
  list: { gap: 6 },
  row: {
    minHeight: 58,
    borderRadius: V2.radius.row,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5, // guard-ok: D43 кружок-отметка задачи, как на референсе
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindIcon: { width: 24, textAlign: 'center' },
  copy: { flex: 1, minWidth: 0 },
  taskTitle: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  taskSubtitle: { ...V2_TYPE.caption, fontSize: 13, lineHeight: 17, marginTop: 1 },
  counter: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
