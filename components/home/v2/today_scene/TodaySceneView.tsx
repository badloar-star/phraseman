// ═══════════════════════════════════════════════════════════════════════════
// TodaySceneView.tsx — экран «Сегодня» в стиле «Сцена», вариант A (чистый вид: что показывать, решают today_scene_state и today_scene_copy).
//
// зачем (эталон docs/design/v2-app/today-scene-concepts.html, вариант A; владелец 22.10 «отлично!»; координатор): сцена того же языка, что
// Главная — градиент тона темы (home_scene_tokens: белый ≥ 4,5:1 в любой теме), свет сверху, герой справа — САМИ кольца дня (картинок
// варианту A не нужно), крупное «N из 3», белая кнопка следующего задания; ниже панель «Задания дня» наезжает на сцену на 38.
// Кольца — существующий TodayRingsSlot («до → после» уже умеет), строки — свои (HomeV2TodayCard держит чужие правки, не трогаю).
// Лента истории дней в сцену придёт после коммита TodayActivityHistory её автором. Вечер — тёплый свет, статично, без пульсации.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useStableSafeAreaInsets } from '../../../../app/stable_safe_area_metrics';
import TodayRingsSlot from '../../../streak/moments/TodayRingsSlot';
import type { TodayRingsTask } from '../../../streak/moments/TodayRingsSlot';
import BackButton from '../../../v2/BackButton';
import { plateBoxShadow, useShadowGlass } from '../../../v2/ShadowSurface';
import V2Pressable from '../../../v2/V2Pressable';
import { useV2Palette } from '../../../v2/useV2Palette';
import type { TodayTask, TodayTaskKind } from '../home_v2_types';
import { useTheme } from '../../../ThemeContext';
import { homeSceneTokensForTheme } from '../scene/home_scene_tokens';
import type { TodaySceneCopy } from './today_scene_copy';
import type { TodaySceneDecision } from './today_scene_state';

const STAGE_MIN_HEIGHT = 540;
/** Панель «Задания дня» наезжает на сцену (.a-panel margin-top −38). */
const PANEL_OVERLAP = 38;
const ROW_ICON: Readonly<Record<TodayTaskKind, React.ComponentProps<typeof Ionicons>['name']>> = {
  lesson: 'book-outline', dialog: 'chatbubbles-outline', cards: 'copy-outline', video: 'play-circle-outline', mistakes: 'alert-circle-outline', spire_steps: 'trending-up-outline',
};

export type TodaySceneViewProps = Readonly<{
  decision: TodaySceneDecision;
  copy: TodaySceneCopy;
  tasks: readonly TodayTask[];
  /** Цвета колец и отметок строк (todayRingColors), три по порядку заданий. */
  ringColors: readonly [string, string, string];
  /** «До» для докрутки колец; undefined — первое за день, от нуля. */
  fromProgress?: readonly [number, number, number];
  onBack: () => void;
  backLabel: string;
  onOpenTask: (task: TodayTask) => void;
}>;

const TodaySceneView = memo(function TodaySceneView({ decision, copy, tasks, ringColors, fromProgress, onBack, backLabel, onOpenTask }: TodaySceneViewProps) {
  const p = useV2Palette();
  const glass = useShadowGlass();
  const insets = useStableSafeAreaInsets();
  const evening = decision.state === 'evening';
  // зачем (владелец 22.10 «Сцена всегда как в макете»; эталон today-scene-concepts.html = home-scene-states.html): цвета сцены — токены темы УРОВНЯ «Максимум»
  // при любом положении ползунка насыщенности (homeSceneTokensForTheme; прежняя homeSceneTokens(accent) считала от акцента и расходилась с эталоном)
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const tokens = useMemo(() => homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance, evening), [liquidGlassThemeId, liquidGlassAppearance, evening]);
  const nextTask = decision.nextIndex === null ? null : tasks[decision.nextIndex] ?? null;
  const ringTasks: readonly TodayRingsTask[] = tasks.map((task) => ({ progress: task.progress, target: task.target }));
  return (
    <ScrollView testID="today-scene" style={[s.root, { backgroundColor: p.bg }]} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} bounces={false}>
      <View testID="today-scene-stage" style={[s.stage, { minHeight: STAGE_MIN_HEIGHT }]}>
        <LinearGradient colors={[tokens.sceneTop, tokens.sceneBottom]} start={{ x: 0.22, y: 0 }} end={{ x: 0.78, y: 1 }} style={StyleSheet.absoluteFill} />
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="todayLight" cx={evening ? '82%' : '18%'} cy="0%" rx="70%" ry="50%" fx={evening ? '82%' : '18%'} fy="0%">
              <Stop offset="0" stopColor={evening ? tokens.eveningGlow : tokens.sceneGlow} stopOpacity="1" />
              <Stop offset="1" stopColor={evening ? tokens.eveningGlow : tokens.sceneGlow} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="todayHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.2" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
            {evening ? (
              <RadialGradient id="todayEmber" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={tokens.sceneEmber} stopOpacity="1" />
                <Stop offset="1" stopColor={tokens.sceneEmber} stopOpacity="0" />
              </RadialGradient>
            ) : null}
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#todayLight)" />
          <Rect x="52%" y={70} width={270} height={270} fill="url(#todayHalo)" />
          {evening ? <Rect x={-40} y={STAGE_MIN_HEIGHT - 200} width={260} height={260} fill="url(#todayEmber)" /> : null}
        </Svg>
        {/* герой — сами кольца дня; место занято с первого кадра (200 × 200), кольца докручиваются внутри */}
        <View pointerEvents="none" testID="today-scene-rings" style={s.hero}>
          <TodayRingsSlot tasks={ringTasks} fromProgress={fromProgress} size={200} showDayDone={false} />
        </View>
        {/* зачем (эталон): у тёмной сцены затемнения низа нет — иначе стык с панелью сливается */}
        {tokens.scrim ? <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.40)']} style={s.scrim} /> : null}
        <View style={[s.top, { paddingTop: insets.top + 8 }]}>
          <BackButton testID="today-scene-back" screen="today_tasks" onPress={onBack} accessibilityLabel={backLabel} />
        </View>
        <View style={s.body}>
          {copy.kicker ? <Text testID="today-scene-kicker" style={s.kicker}>{copy.kicker}</Text> : null}
          <Text testID="today-scene-title" accessibilityRole="header" style={s.title}>{copy.title}</Text>
          {copy.warm ? (
            <View style={s.warmRow}>
              <Ionicons name="flame" size={16} color="#FFD0C4" />
              <Text testID="today-scene-warm" style={s.warm}>{copy.warm}</Text>
            </View>
          ) : null}
          {copy.line ? <Text testID="today-scene-line" style={s.line}>{copy.line}</Text> : null}
          {nextTask ? (
            <V2Pressable testID="today-scene-cta" accessibilityRole="button" accessibilityLabel={nextTask.title} onPress={() => onOpenTask(nextTask)} scaleTo={0.97} style={s.cta}>
              <Ionicons name="play" size={18} color="#121318" />
              <Text style={s.ctaText} numberOfLines={1}>{nextTask.title}</Text>
            </V2Pressable>
          ) : null}
        </View>
      </View>
      <View testID="today-scene-panel" style={[s.panel, { backgroundColor: p.card, boxShadow: plateBoxShadow(glass) }]}>
        <View style={s.panelHead}>
          <Text accessibilityRole="header" style={[s.panelTitle, { color: p.text }]}>{copy.panelTitle}</Text>
          <Text style={[s.panelCount, { color: p.textSecondary }]}>{copy.panelCount}</Text>
        </View>
        {tasks.map((task, index) => {
          const color = ringColors[Math.min(index, 2)];
          const done = task.done || (task.target > 0 && task.progress >= task.target);
          const urgent = evening && index === decision.nextIndex;
          return (
            <V2Pressable
              key={task.id}
              testID={`today-scene-row-${task.kind}`}
              accessibilityRole="button"
              accessibilityLabel={`${task.title}: ${task.progress}/${task.target}`}
              accessibilityState={{ selected: done }}
              onPress={() => onOpenTask(task)}
              scaleTo={0.97}
              style={[s.row, index < tasks.length - 1 ? { borderBottomColor: `${p.text.slice(0, 7)}12`, borderBottomWidth: StyleSheet.hairlineWidth } : null]} // shadow-ok: разделитель строк (нижняя линия, не обводка контейнера)
            >
              {done ? (
                <View style={[s.ck, { backgroundColor: color }]}><Ionicons name="checkmark" size={16} color="#FFFFFF" /></View>
              ) : (
                <View style={[s.ck, s.ckRing, { borderColor: color }]} /> // shadow-ok: guard-ok: кружок-индикатор невыполненного задания, не контейнер
              )}
              <View style={[s.ic, { backgroundColor: p.control }]}><Ionicons name={ROW_ICON[task.kind]} size={18} color={p.text} /></View>
              <View style={s.tx}>
                <Text style={[s.rowTitle, { color: done ? p.textSecondary : p.text }]} numberOfLines={2}>{task.title}</Text>
                {task.subtitle ? <Text style={[s.rowSub, { color: p.textSecondary }]} numberOfLines={1}>{task.subtitle}</Text> : null}
              </View>
              <Text style={[s.rowN, { color: urgent ? '#E8654A' : p.textSecondary }]}>{`${task.progress}/${task.target}`}</Text>
            </V2Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
});

export default TodaySceneView;

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: 40 },
  stage: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', justifyContent: 'space-between' },
  hero: { position: 'absolute', right: 22, top: 104, width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 },
  top: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 58 },
  // зачем (D145, владелец: шрифты 16/13 главнее макета; как у Главной в bd1ba46cd): подписи сцены 13/17, крупные строки и кнопка 16/21, заголовок 34 без изменений
  kicker: { color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 17 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6, marginTop: 4, fontVariant: ['tabular-nums'] },
  warmRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  warm: { color: '#FFD0C4', fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  line: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 17, marginTop: 10 },
  cta: { marginTop: 16, height: 54, borderRadius: 27, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 22 },
  ctaText: { color: '#121318', fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  panel: { marginTop: -PANEL_OVERLAP, marginHorizontal: 16, borderRadius: 28, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 6 },
  panelHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  panelTitle: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  panelCount: { fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  ckRing: { borderWidth: 2 }, // shadow-ok: guard-ok: typo-exempt: кружок-индикатор невыполненного задания, не контейнер
  ck: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ic: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tx: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  rowSub: { fontSize: 13, lineHeight: 17, marginTop: 1 },
  rowN: { fontSize: 16, lineHeight: 21, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
