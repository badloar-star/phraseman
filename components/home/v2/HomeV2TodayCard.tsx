import React, { memo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { V2IconTile } from '../../v2/V2Glass';
import { HOME_PLATE_ALPHA, useHomePlateStyle } from './homePlate';
import type { TodayTask, TodayTaskKind } from './home_v2_types';
import { renderWindowEpoch, useRenderCause } from '../../../app/render_cause_probe';
import { useMomentsV3Enabled } from '../../streak/moments/use_moments_v3_flag';
import { plateBoxShadow, useShadowGlass } from '../../v2/ShadowSurface';
import HomeV2SeeAllButton from './HomeV2SeeAllButton';

const KIND_ICON: Record<TodayTaskKind, React.ComponentProps<typeof Ionicons>['name']> = {
  lesson: 'book-outline',
  dialog: 'chatbubble-ellipses-outline',
  cards: 'copy-outline',
  video: 'play-circle-outline',
  mistakes: 'refresh-outline',
  spire_steps: 'trending-up-outline',
};

type Props = {
  /** Заголовок блока; null — блок внутри экрана «Сегодня», где заголовок уже в шапке. */
  title: string | null;
  tasks: readonly TodayTask[];
  onOpenTask: (task: TodayTask) => void;
  /** Q90 (координатор 01.10): активный опрос — строка ПОД заданиями, тем же видом; null/нет — не рисуется. */
  surveyRow?: Readonly<{ title: string; subtitle?: string; onPress: () => void }> | null;
  /** «Смотреть все» справа от заголовка → экран «Сегодня» с кольцом дня (владелец 17.10); видна только за флагом moments_v3, нет — ссылки нет. */
  seeAll?: Readonly<{ label: string; onPress: () => void }> | null;
  /** Цвет отметки выполненной строки по индексу (цвета колец на экране «Сегодня»); нет — нейтральный. */
  doneColors?: readonly string[] | null;
  /** зачем (владелец 22.10, scenes-compact в.2; снимок Сверки home3): «Сцена» Главной — белая карточка r28 с заголовком «Сегодня · N из M» внутри, строки без плашек, разделители тонкой линией. */
  scene?: Readonly<{ count: string }> | null;
};

/**
 * «СЕГОДНЯ» новой Главной (референс 2.0, D49): три задачи дня. Строка =
 * кружок-отметка, значок активности, название с подписью, счётчик progress/target.
 * Тап по задаче сразу ведёт в активность. Владелец 17.10: кольца дня — не здесь, а на экране «Сегодня»
 * по ссылке «Смотреть все» (app/today_tasks.tsx); тот экран рисует эти же строки (title=null, doneColors — цвета колец).
 */
/**
 * зачем (координатор 17.10, скорость Главной): Главная пересобирает props на каждый свой рендер — новый массив tasks, новые onOpenTask/
 * surveyRow/seeAll — и карточка перерисовывалась впустую. Тонкая обёртка кладёт свежие props в ref, memo-вид сравнивает только ДАННЫЕ;
 * тап зовёт самый свежий обработчик из ref (как плитки HomeV2FeatureTiles) — устаревших замыканий нет.
 */
export default function HomeV2TodayCard(props: Props) {
  const latestRef = useRef<Props>(props);
  latestRef.current = props;
  return <HomeV2TodayCardView {...props} latestRef={latestRef} />;
}

function sameTodayCardData(a: ViewProps, b: ViewProps): boolean {
  if (a.title !== b.title || a.latestRef !== b.latestRef) return false;
  if ((a.scene?.count ?? null) !== (b.scene?.count ?? null)) return false;
  if ((a.surveyRow?.title ?? null) !== (b.surveyRow?.title ?? null) || (a.surveyRow?.subtitle ?? null) !== (b.surveyRow?.subtitle ?? null)) return false;
  if ((a.seeAll?.label ?? null) !== (b.seeAll?.label ?? null)) return false;
  const ac = a.doneColors ?? [];
  const bc = b.doneColors ?? [];
  if (ac.length !== bc.length || ac.some((c, i) => c !== bc[i])) return false;
  if (a.tasks.length !== b.tasks.length) return false;
  return a.tasks.every((t, i) => {
    const o = b.tasks[i];
    return t.id === o.id && t.kind === o.kind && t.title === o.title && t.subtitle === o.subtitle && t.progress === o.progress && t.target === o.target && t.done === o.done && t.route === o.route;
  });
}

type ViewProps = Props & Readonly<{ latestRef: React.MutableRefObject<Props> }>;

const HomeV2TodayCardView = memo(function HomeV2TodayCardView({ title, tasks, surveyRow, seeAll, doneColors, scene, latestRef }: ViewProps) {
  useRenderCause('home:today', () => ({ title, tasks, surveyRow, seeAll, doneColors }), renderWindowEpoch()); // зачем (координатор 15.10): причина каждой перерисовки в окне 10 с, [HOME-RENDERS]; в релизе пустая функция
  const p = useV2Palette();
  // зачем: приказ владельца 11.10 19:2x — плашки Главной с фоном 50 % (альфа цвета фона), без блика/дымки; общий хук стекла остальных экранов не менялся: у внешней карточки «Сегодня» фона нет совсем (ни заливки, ни тени, ни блика), у строк — фон 50 %.
  const rowGlass = useHomePlateStyle(true);
  const ringsScreenOn = useMomentsV3Enabled();
  const seeAllShown = ringsScreenOn ? seeAll : null;
  const g = useShadowGlass();
  if (scene && title !== null) {
    return (
      <View testID="home-v2-today" style={[s.sceneCard, { backgroundColor: g.opaqueCard, boxShadow: plateBoxShadow(g) }]}>
        <View style={s.sceneHead}>
          <Text accessibilityRole="header" style={[s.sceneTitle, { color: g.text }]}>{title}</Text>
          <Text style={[s.sceneCount, { color: g.secondary }]}>{scene.count}</Text>
          {seeAllShown ? <HomeV2SeeAllButton testID="home-v2-today-see-all" label={seeAllShown.label} onPress={() => latestRef.current.seeAll?.onPress()} rowHeight={17} /> : null}
        </View>
        {tasks.map((task, index) => {
          const doneColor = doneColors?.[index] ?? g.good;
          const counter = `${Math.min(task.progress, task.target)}/${task.target}`;
          return (
            <V2Pressable
              key={task.id}
              testID={`home-v2-today-${task.kind}`}
              accessibilityRole="button"
              accessibilityState={{ checked: task.done }}
              accessibilityLabel={`${task.title}${task.subtitle ? `. ${task.subtitle}` : ''}. ${counter}`}
              onPress={() => {
                console.log('[TODAY-TASKS] route', JSON.stringify({ kind: task.kind, route: task.route, done: task.done, progress: task.progress, target: task.target, scene: true }));
                latestRef.current.onOpenTask(task);
              }}
              scaleTo={0.98}
              style={[s.sceneRow, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${g.text.slice(0, 7)}12` } : null]} // shadow-ok: разделитель строк (линия сверху, не обводка контейнера)
            >
              <View style={[s.sceneIcon, { backgroundColor: g.opaqueControl }]}><Ionicons name={KIND_ICON[task.kind]} size={18} color={g.text} /></View>
              <View style={s.copy}>
                <Text style={[s.taskTitle, { color: g.text }]}>{task.title}</Text>
                {task.subtitle ? <Text style={[s.taskSubtitle, { color: g.secondary }]}>{task.subtitle}</Text> : null}
              </View>
              {task.done ? <Ionicons name="checkmark" size={18} color={doneColor} /> : <Text style={[s.counter, { color: g.secondary }]}>{counter}</Text>}
            </V2Pressable>
          );
        })}
        {surveyRow ? (
          <V2Pressable
            testID="home-v2-today-survey"
            accessibilityRole="button"
            accessibilityLabel={`${surveyRow.title}${surveyRow.subtitle ? `. ${surveyRow.subtitle}` : ''}`}
            onPress={() => latestRef.current.surveyRow?.onPress()}
            scaleTo={0.98}
            style={[s.sceneRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${g.text.slice(0, 7)}12` }]} // shadow-ok: разделитель строк
          >
            <View style={[s.sceneIcon, { backgroundColor: g.opaqueControl }]}><Ionicons name="clipboard-outline" size={18} color={g.text} /></View>
            <View style={s.copy}>
              <Text numberOfLines={1} style={[s.taskTitle, { color: g.text }]}>{surveyRow.title}</Text>
              {surveyRow.subtitle ? <Text numberOfLines={1} style={[s.taskSubtitle, { color: g.secondary }]}>{surveyRow.subtitle}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={g.secondary} />
          </V2Pressable>
        ) : null}
      </View>
    );
  }
  return (
    <View testID="home-v2-today" style={[s.card, title === null ? s.cardBare : null]}>
      {title !== null ? (
        <View style={s.headerRow}>
          <Text accessibilityRole="header" style={[s.header, { color: p.textSecondary }]}>{title}</Text>
          {seeAllShown ? (
            // зачем (владелец через координатора 18.10): кнопка-иконка без текста вместо ссылки «Смотреть все»; строка заголовка прежней высоты (17), зона нажатия 44
            <HomeV2SeeAllButton testID="home-v2-today-see-all" label={seeAllShown.label} onPress={() => latestRef.current.seeAll?.onPress()} rowHeight={17} />
          ) : null}
        </View>
      ) : null}
      <View style={s.list}>
        {tasks.map((task, index) => {
          const doneColor = doneColors?.[index] ?? p.iconTint;
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
                latestRef.current.onOpenTask(task);
              }}
              scaleTo={0.98}
              style={[s.row, rowGlass]}
            >
              <View
                style={[s.check, task.done ? { backgroundColor: doneColor, borderColor: doneColor } : { borderColor: p.textMuted }]} // guard-ok: D43 отметка-кружок
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
            onPress={() => latestRef.current.surveyRow?.onPress()}
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
}, sameTodayCardData);

const s = StyleSheet.create({
  card: {
    borderRadius: V2.radius.card,
    // зачем (владелец 04.10, по скриншоту: «сделай контейнеры внутри шире»): боковой отступ блока
    // 12 → 6 — строки задач шире на 12 px; заголовок сдвинут, чтобы стоять на прежней линии.
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 16,
  },
  cardBare: { paddingTop: 0 },
  // зачем (эталон scenes-compact .pn / .rw): карточка r28, поля 14/16/6; заголовок 20/26 700, счётчик 13; строка min 52, значок 36 r12, разделитель — линия сверху
  sceneCard: { borderRadius: 28, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 6 },
  sceneHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  sceneTitle: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  sceneCount: { fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'] },
  sceneRow: { minHeight: 52, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sceneIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // зачем (17.10; 18.10): заголовок и кнопка-иконка «Смотреть все» в одну строку — та же кнопка, что у ленты видео (HomeV2SeeAllButton)
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 12, marginRight: 8, marginBottom: 12, minHeight: 17 },
  header: { ...V2_TYPE.overline, fontSize: 13, lineHeight: 17, letterSpacing: 1.6 },
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
