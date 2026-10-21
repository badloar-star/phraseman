// ════════════════════════════════════════════════════════════════════════════
// LearningV2TaskChrome.tsx — общая «оболочка» заданий V2 по одобренному макету learning-v2-tasks-review.html:
// верхняя панель (закрыть + прогресс «n / N» + таблетки HUD), название задания (значок-плитка + одно жирное название) и подвал «Назад · Слова · Дальше».
//
// зачем (вердикт «Сверки» 21.10, координатор): в приложении были три белых сердечка в капсуле и молния без капсулы, крестик сливался с фоном,
// полоска прогресса не читалась на тёмной теме, «Слова» шли значком «Aa» с кружком-счётчиком. Здесь — чистая вёрстка по макету: никаких данных,
// энергии, попыток, наград — их передаёт плеер пропсами. Подключение в плеер (app/learning_v2_direct_session_player_v1.tsx) — отдельным шагом
// после коммита правок Learning V2: там сейчас чужие незакоммиченные изменения. Размеры и заливки — только из learning_v2_task_layout_tokens.ts.
// Отклонение от макета: текст таблеток 16 вместо 15 (правило проекта о двух кеглях 13/16).
// ════════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { hapticTap } from '../../hooks/use-haptics';
import { useLv2Glass } from './LearningV2Glass';
import {
  LV2_TASK_LAYOUT, lv2TaskPlateStyle, lv2TaskTitleTileColor, lv2TaskTrackColor,
} from './learning_v2_task_layout_tokens';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

// ── название задания: значок-плитка + одно жирное название (`.todo`) ──
export const LearningV2TaskTitle = memo(function LearningV2TaskTitle({ icon, title, trailing, testID }: Readonly<{
  icon: IonName;
  title: string;
  /** Справа в той же строке (таймер «Найди пары»). */
  trailing?: React.ReactNode;
  testID?: string;
}>) {
  const g = useLv2Glass();
  const L = LV2_TASK_LAYOUT.title;
  return (
    <View style={styles.titleRow} testID={testID}>
      <View style={styles.titleLeft}>
        <View style={[styles.titleTile, { backgroundColor: lv2TaskTitleTileColor(g) }]} accessible={false} importantForAccessibility="no-hide-descendants">
          <Ionicons name={icon} size={L.tileIcon} color={g.text} />
        </View>
        <Text accessibilityRole="header" style={[styles.titleText, { color: g.text }]} numberOfLines={2}>{title}</Text>
      </View>
      {trailing ?? null}
    </View>
  );
});

// ── таблетка HUD (`.hp`): значок или монета + число ──
export type LearningV2HudPillData = Readonly<{
  key: string;
  /** Значок Ionicons (сердце, молния). Если задана `image` — монета. */
  icon?: IonName;
  /** Цвет значка; по умолчанию цвет текста (молния), у сердца — красный токен темы. */
  iconTone?: 'text' | 'bad';
  image?: ImageSourcePropType;
  value: string | number;
  accessibilityLabel: string;
  testID?: string;
}>;

export const LearningV2HudPill = memo(function LearningV2HudPill({ pill }: Readonly<{ pill: LearningV2HudPillData }>) {
  const g = useLv2Glass();
  const L = LV2_TASK_LAYOUT.hud;
  return (
    <View style={[styles.pill, lv2TaskPlateStyle(g)]} accessible accessibilityLabel={pill.accessibilityLabel} testID={pill.testID}>
      {pill.image ? (
        <Image source={pill.image} style={styles.pillCoin} accessible={false} accessibilityIgnoresInvertColors />
      ) : pill.icon ? (
        <Ionicons name={pill.icon} size={L.icon} color={pill.iconTone === 'bad' ? g.bad : g.text} />
      ) : null}
      <Text style={[styles.pillText, { color: g.text }]}>{pill.value}</Text>
    </View>
  );
});

// ── плита-таблетка для готового HUD-узла плеера (энергия, руны) ──
// зачем (вердикт «Сверки» 21.10): в макете все три значения HUD — таблетки высотой 34 на плите карточки. Энергию (EnergyBar) и счётчик рун
// рисуют их собственные компоненты со своей логикой (поповер, измерение цели полёта монет) — мы их не переписываем, а кладём на плиту:
// плита 34 высотой по центру, узел поверх; зона нажатия узла (44) может быть выше плиты.
export const LearningV2HudPlate = memo(function LearningV2HudPlate({ children }: Readonly<{ children: React.ReactNode }>) {
  const g = useLv2Glass();
  return (
    <View style={styles.hudPlateWrap}>
      <View style={[styles.hudPlate, lv2TaskPlateStyle(g)]} pointerEvents="none" />
      {children}
    </View>
  );
});

// ── верхняя панель (`.tvtop`) ──
export const LearningV2TaskTopBar = memo(function LearningV2TaskTopBar({ closeLabel, onClose, progress, pills, paddingTop = 0 }: Readonly<{
  closeLabel: string;
  onClose: () => void;
  progress: Readonly<{ current: number; total: number }>;
  pills: readonly LearningV2HudPillData[];
  /** Отступ под строку состояния (insets.top + …) — задаёт экран. */
  paddingTop?: number;
}>) {
  const g = useLv2Glass();
  const P = LV2_TASK_LAYOUT.progress;
  const total = Math.max(1, progress.total);
  const current = Math.max(0, Math.min(progress.current, total));
  const percent = Math.max(P.minFill, Math.round((current / total) * 100));
  return (
    <View style={[styles.topBar, { paddingTop }]} testID="learning-v2-task-topbar">
      <Pressable
        testID="learning-v2-session-close"
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        hitSlop={10}
        onPress={onClose}
        style={({ pressed }) => [styles.close, lv2TaskPlateStyle(g), { opacity: pressed ? 0.72 : 1 }]}
      >
        <Ionicons name="close" size={LV2_TASK_LAYOUT.close.icon} color={g.text} />
      </Pressable>
      <View style={styles.progressColumn}>
        <View style={[styles.track, { backgroundColor: lv2TaskTrackColor(g) }]} testID="learning-v2-task-progress-track">
          <View style={[styles.fill, { backgroundColor: g.accentGraphic, width: `${percent}%` }]} />
        </View>
        <Text style={[styles.progressText, { color: g.secondary }]}>{`${current} / ${total}`}</Text>
      </View>
      <View style={styles.hud}>
        {pills.map((pill) => <LearningV2HudPill key={pill.key} pill={pill} />)}
      </View>
    </View>
  );
});

// ── подвал (`.foot`): «Назад · Слова · Дальше» ──
export type LearningV2TaskFooterProps = Readonly<{
  backLabel: string;
  wordsLabel: string;
  wordsA11yLabel: string;
  nextLabel: string;
  /** Подсвечен ли «Дальше» (ответ верный) — иначе приглушён. */
  nextActive: boolean;
  backDisabled: boolean;
  wordsDisabled: boolean;
  nextDisabled: boolean;
  onBack: () => void;
  onWords: () => void;
  onNext: () => void;
  paddingBottom: number;
  backgroundColor: string;
  /** Слот «Слов» для анимации-подскока и измерения цели полёта карточки (их держит плеер). */
  wordsSlotStyle?: StyleProp<ViewStyle>;
  /** Свойства обёртки значка «Слов» (ref для измерения, collapsable=false, testID). */
  wordsIconProps?: ViewProps & { ref?: React.Ref<View> };
}>;

export const LearningV2TaskFooter = memo(function LearningV2TaskFooter(p: LearningV2TaskFooterProps) {
  const g = useLv2Glass();
  const F = LV2_TASK_LAYOUT.footer;
  const press = (fn: () => void) => () => { void hapticTap(); fn(); };
  return (
    <View style={[styles.footer, { paddingBottom: p.paddingBottom, backgroundColor: p.backgroundColor }]} testID="learning-v2-task-footer">
      <Pressable
        testID="learning-v2-footer-back"
        accessibilityRole="button"
        accessibilityLabel={p.backLabel}
        disabled={p.backDisabled}
        accessibilityState={{ disabled: p.backDisabled }}
        onPress={press(p.onBack)}
        style={({ pressed }) => [styles.footerAction, { opacity: p.backDisabled ? F.offOpacity : pressed ? 0.62 : 1 }]}
      >
        <Ionicons name="arrow-undo" size={F.icon} color={g.text} />
        <Text style={[styles.footerLabel, { color: g.secondary }]}>{p.backLabel}</Text>
      </Pressable>
      <Animated.View style={[styles.footerSlot, p.wordsSlotStyle]}>
        <Pressable
          testID="learning-v2-footer-word-pocket"
          accessibilityRole="button"
          accessibilityLabel={p.wordsA11yLabel}
          disabled={p.wordsDisabled}
          accessibilityState={{ disabled: p.wordsDisabled }}
          onPress={press(p.onWords)}
          style={({ pressed }) => [styles.footerAction, { opacity: p.wordsDisabled ? F.offOpacity : pressed ? 0.62 : 1 }]}
        >
          {/* зачем (вердикт «Сверки»): «Слова» — значок-стопка без кружка-счётчика; число слов остаётся в a11y-подписи */}
          <View {...p.wordsIconProps} collapsable={false}>
            <Ionicons name="albums" size={F.icon} color={g.text} />
          </View>
          <Text style={[styles.footerLabel, { color: g.secondary }]}>{p.wordsLabel}</Text>
        </Pressable>
      </Animated.View>
      <Pressable
        testID="learning-v2-footer-next"
        accessibilityRole="button"
        accessibilityLabel={p.nextLabel}
        disabled={p.nextDisabled}
        accessibilityState={{ disabled: p.nextDisabled }}
        onPress={press(p.onNext)}
        style={({ pressed }) => [styles.footerAction, { opacity: p.nextDisabled ? F.offOpacity : pressed ? 0.62 : 1 }]}
      >
        <Ionicons name="play-forward" size={F.icon} color={p.nextActive ? g.text : g.secondary} />
        <Text style={[styles.footerLabel, { color: p.nextActive ? g.text : g.secondary }]}>{p.nextLabel}</Text>
      </Pressable>
    </View>
  );
});

const T = LV2_TASK_LAYOUT;
const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: T.title.marginTop },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: T.title.gap, flexShrink: 1, minWidth: 0 },
  titleTile: { width: T.title.tile, height: T.title.tile, borderRadius: T.title.tileRadius, alignItems: 'center', justifyContent: 'center' },
  titleText: { flexShrink: 1, fontSize: T.title.textSize, lineHeight: T.title.textLine, fontWeight: '800', letterSpacing: T.title.letterSpacing },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: T.topBar.gap, minHeight: T.topBar.minHeight, marginTop: T.topBar.marginTop, paddingHorizontal: 16 },
  close: { width: T.close.size, height: T.close.size, borderRadius: T.close.size / 2, alignItems: 'center', justifyContent: 'center' },
  progressColumn: { flex: 1, minWidth: 0 },
  track: { height: T.progress.height, borderRadius: T.progress.radius, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: T.progress.radius },
  progressText: { marginTop: T.progress.labelGap, fontSize: T.progress.labelSize, lineHeight: T.progress.labelLine, fontWeight: '700' },
  hud: { flexDirection: 'row', alignItems: 'center', gap: T.hud.groupGap },
  hudPlateWrap: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  hudPlate: { position: 'absolute', left: 0, right: 0, height: T.hud.pillHeight, borderRadius: T.hud.pillHeight / 2 },
  pill: { height: T.hud.pillHeight, paddingHorizontal: T.hud.padH, borderRadius: T.hud.pillHeight / 2, flexDirection: 'row', alignItems: 'center', gap: T.hud.gap },
  pillCoin: { width: T.hud.coin, height: T.hud.coin, borderRadius: T.hud.coin / 2 },
  pillText: { fontSize: 16, lineHeight: T.hud.textLine, fontWeight: '700', fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', paddingTop: T.footer.padTop, paddingHorizontal: T.footer.padH },
  footerAction: { flex: 1, minHeight: T.footer.item, alignItems: 'center', justifyContent: 'center', gap: T.footer.gap },
  footerSlot: { flex: 1 },
  footerLabel: { fontSize: T.footer.labelSize, lineHeight: T.footer.labelLine, fontWeight: '600' },
});
