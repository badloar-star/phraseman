import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { V2IconTile } from '../../v2/V2Glass';
import { HOME_PLATE_ALPHA, useHomePlateStyle } from './homePlate';
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
  // зачем: приказ владельца 11.10 19:2x — плашки Главной с фоном 50 % (альфа цвета фона), без блика/дымки; общий хук стекла остальных экранов не менялся: у внешней карточки «Сегодня» фона нет совсем (ни заливки, ни тени, ни блика), у строк — фон 50 %.
  const rowGlass = useHomePlateStyle(true);
  return (
    <View testID="home-v2-today" style={s.card}>
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
              <View
                style={[s.check, task.done ? { backgroundColor: p.iconTint, borderColor: p.iconTint } : { borderColor: p.textMuted }]} // guard-ok: D43 отметка-кружок
              >
                {task.done ? <Ionicons name="checkmark" size={14} color={p.card} /> : null}
              </View>
              <V2IconTile name={KIND_ICON[task.kind]} size={36} iconSize={19} bgAlpha={HOME_PLATE_ALPHA} />
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
            <View style={[s.check, { borderColor: p.textMuted }]} /* guard-ok: D43 отметка-кружок, как у заданий */ />
            <V2IconTile name="clipboard-outline" size={36} iconSize={19} bgAlpha={HOME_PLATE_ALPHA} />
            <View style={s.copy}>
              {/* зачем (владелец 13.10 12:30, скрин Главной uk): вопрос опроса приходит с сервера длинным и не вмещался — строка показывает короткую метку «Опрос» и подпись «1 вопрос · 1 мин» (hooks/use_home_survey_entry.ts, homeSurveyRowCopy), каждая в одну строку; сам вопрос — внутри листа после тапа */}
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
    // зачем (владелец 04.10, по скриншоту: «сделай контейнеры внутри шире»): боковой отступ блока
    // 12 → 6 — строки задач шире на 12 px; заголовок сдвинут, чтобы стоять на прежней линии.
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 16,
  },
  header: { ...V2_TYPE.overline, fontSize: 13, lineHeight: 17, letterSpacing: 1.6, marginLeft: 12, marginBottom: 12 },
  // зачем («Тень» 12.10): между строками-плашками ≥ 10, иначе тени слипаются
  list: { gap: 10 },
  row: {
    minHeight: 58,
    paddingVertical: 10, // зачем (13.10): строка с переносом текста (опрос) растёт, а не садится на нижний край; задачи в 2 строки по 37 px остаются 58
    borderRadius: V2.radius.row,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5, // shadow-ok: кружок-отметка задачи (индикатор выполнено/нет, как радио), не контейнер
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindIcon: { width: 24, textAlign: 'center' },
  copy: { flex: 1, minWidth: 0 },
  taskTitle: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  taskSubtitle: { ...V2_TYPE.caption, fontSize: 13, lineHeight: 17, marginTop: 1 },
  counter: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
