import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../../TapScale';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import type { TodayTask, TodayTaskKind } from './home_v2_types';

const KIND_ICON: Record<TodayTaskKind, React.ComponentProps<typeof Ionicons>['name']> = {
  lesson: 'book-outline',
  dialog: 'chatbubble-ellipses-outline',
  cards: 'copy-outline',
  video: 'play-circle-outline',
  mistakes: 'refresh-outline',
};

type Props = {
  title: string;
  tasks: readonly TodayTask[];
  onOpenTask: (task: TodayTask) => void;
};

/**
 * «СЕГОДНЯ» новой Главной (референс 2.0, D49): три задачи дня. Строка =
 * кружок-отметка, значок активности, название с подписью, счётчик progress/target.
 * «Показать все» владелец убрал: тап по задаче сразу ведёт в активность.
 */
export default function HomeV2TodayCard({ title, tasks, onOpenTask }: Props) {
  const p = useV2Palette();
  return (
    <View
      testID="home-v2-today"
      style={[s.card, { backgroundColor: p.card, borderColor: p.hairline }]} // guard-ok: D43
    >
      <Text accessibilityRole="header" style={[s.header, { color: p.textSecondary }]}>{title}</Text>
      <View style={s.list}>
        {tasks.map((task) => {
          const counter = `${Math.min(task.progress, task.target)}/${task.target}`;
          return (
            <TapScale
              key={task.id}
              testID={`home-v2-today-${task.kind}`}
              accessibilityRole="button"
              accessibilityState={{ checked: task.done }}
              accessibilityLabel={`${task.title}${task.subtitle ? `. ${task.subtitle}` : ''}. ${counter}`}
              onPress={() => onOpenTask(task)}
              scaleTo={0.98}
              style={[s.row, { backgroundColor: p.cardRaised, borderColor: p.hairline }]} // guard-ok: D43
            >
              <View
                style={[s.check, task.done ? { backgroundColor: p.text, borderColor: p.text } : { borderColor: p.textSecondary }]} // guard-ok: D43 отметка-кружок
              >
                {task.done ? <Ionicons name="checkmark" size={14} color={p.card} /> : null}
              </View>
              <Ionicons name={KIND_ICON[task.kind]} size={22} color={p.textSecondary} style={s.kindIcon} />
              <View style={s.copy}>
                <Text numberOfLines={1} style={[s.taskTitle, { color: p.text }]}>{task.title}</Text>
                {task.subtitle ? (
                  <Text numberOfLines={1} style={[s.taskSubtitle, { color: p.textSecondary }]}>{task.subtitle}</Text>
                ) : null}
              </View>
              <Text style={[s.counter, { color: p.textSecondary }]}>{counter}</Text>
            </TapScale>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: V2.radius.card,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    padding: 12,
    paddingTop: 16,
  },
  header: { ...V2_TYPE.overline, fontSize: 14, lineHeight: 18, letterSpacing: 1.6, marginLeft: 6, marginBottom: 12 },
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
  taskTitle: { fontSize: 15, lineHeight: 19, fontWeight: '700' },
  taskSubtitle: { ...V2_TYPE.caption, fontSize: 13, lineHeight: 17, marginTop: 1 },
  counter: { fontSize: 14, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
