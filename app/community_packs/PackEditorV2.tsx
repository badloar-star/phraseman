/**
 * Детали экрана «Новый набор / Изменить набор» — макет docs/design/v2-app/cards-section.html (кадры «Новый набор», «Новая карточка», «Изменить набор»).
 *
 * зачем (владелец: «в приложении запрещены любые различия с одобренными макетами»): шапка «крестик + заголовок слева», подпись над полем 13/600,
 * поле 56 высотой r14, переключатель «Только я / Все» вместо тумблера, строки карточек и «Добавить карточку» как карточки макета,
 * форма новой карточки — нижней шторкой. Только вид; данные, черновик, проверки и публикация остаются в community_pack_create.tsx.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { KitCard, KitIconTile, KitSurface } from '../../components/cards-grid/CardsKit';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { PlateFill, actionBoxShadow, nestedBoxShadow, plateBoxShadow } from '../../components/v2/ShadowSurface';
import { shadowSheetGradient } from '../../components/v2/shadow_sheet_paint';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { mixDark, themePair } from '../../components/mistakes-panel/panelPaint';
import SheetSwipeClose from '../../components/modal_fx/SheetSwipeClose';

/** Шапка: круглый «крестик» 42, заголовок слева 20/700, справа необязательное действие. */
export const EditorHeader = memo(function EditorHeader({ g, title, closeLabel, onClose, right }: Readonly<{ g: GlassTokens; title: string; closeLabel: string; onClose: () => void; right?: React.ReactNode }>) {
  return (
    <View style={styles.header}>
      <Pressable testID="ugc-pack-back" accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={6} onPress={onClose} style={({ pressed }) => [styles.round, { backgroundColor: g.hairlineSoft }, pressed && styles.pressed]}>
        <Ionicons name="close" size={20} color={g.text} />
      </Pressable>
      <Text accessibilityRole="header" style={[styles.headerTitle, { color: g.text }]}>{title}</Text>
      {right ?? null}
    </View>
  );
});

/** Подпись 13/600 над полем и поле-поверхность 56 высотой r14 с текстом 18. */
export const EditorField = memo(function EditorField({ g, label, children, tall }: Readonly<{ g: GlassTokens; label: string; children: React.ReactNode; tall?: boolean }>) {
  return (
    <View>
      <Text style={[styles.flab, { color: g.secondary }]}>{label}</Text>
      <KitSurface g={g} style={[styles.field, tall && styles.fieldTall]}>
        {children}
      </KitSurface>
    </View>
  );
});

/** «Кто видит»: два сегмента 40 высотой в плашке 50, активный — мятный. */
export const VisibilitySegment = memo(function VisibilitySegment({ g, label, value, onChange, disabled, privateLabel, publicLabel }: Readonly<{
  g: GlassTokens;
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  privateLabel: string;
  publicLabel: string;
}>) {
  const seg = (on: boolean, icon: keyof typeof Ionicons.glyphMap, text: string, next: boolean, testID: string) => (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(next)}
      // зачем (Макеты cards-066, №35): выбранный сегмент «Только я / Для всех» — заливка главной кнопки темы (ctaFill/ctaInk, в «Спокойно» светлая как в образце), а не приглушённый accent
      style={[styles.seg, on && { backgroundColor: g.ctaFill, boxShadow: actionBoxShadow(g) }, disabled && styles.segDisabled]}>
      <Ionicons name={icon} size={16} color={on ? g.ctaInk : g.secondary} />
      <Text style={[styles.segText, { color: on ? g.ctaInk : g.secondary }]}>{text}</Text>
    </Pressable>
  );
  return (
    <View testID="ugc-pack-public-toggle">
      <Text style={[styles.flab, { color: g.secondary }]}>{label}</Text>
      <KitSurface g={g} style={styles.segWrap}>
        {seg(!value, 'lock-closed', privateLabel, false, 'ugc-pack-visibility-private')}
        {seg(value, 'globe-outline', publicLabel, true, 'ugc-pack-visibility-public')}
      </KitSurface>
    </View>
  );
});

/**
 * «Уровень» A1–C1 (cards-v2 `lvls`): ряд кнопок-чипов, выбранный — мятный; повторное касание снимает выбор (уровень необязателен).
 * зачем (Карточки 2.0 12.10, данные Ядра ee01d089a): автор указывает уровень набора, он попадает в «40 · A2» стопки и в шапку набора.
 */
export const LevelChips = memo(function LevelChips({ g, label, value, onChange, levels }: Readonly<{
  g: GlassTokens;
  label: string;
  value: string | null;
  onChange: (next: string | null) => void;
  levels: readonly string[];
}>) {
  return (
    <View testID="ugc-pack-level">
      <Text style={[styles.flab, { color: g.secondary }]}>{label}</Text>
      <View style={styles.levelRow}>
        {levels.map((level) => {
          const on = level === value;
          return (
            <Pressable
              key={level}
              testID={`ugc-pack-level-${level}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(on ? null : level)}
              style={({ pressed }) => [styles.levelChip, { backgroundColor: on ? g.accent : g.plateFillFrom, boxShadow: on ? actionBoxShadow(g) : plateBoxShadow(g) }, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.levelChipText, { color: on ? g.accentInk : g.text }]}>{level}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

/** Строка «Добавить карточку» — карточка с плиткой «＋». */
export const AddCardRow = memo(function AddCardRow({ g, label, onPress, disabled, testID }: Readonly<{ g: GlassTokens; label: string; onPress: () => void; disabled?: boolean; testID?: string }>) {
  return (
    <KitCard g={g} onPress={onPress} disabled={disabled} testID={testID} accessibilityLabel={label} style={disabled ? styles.dim : undefined}>
      <View style={styles.cardRow}>
        <KitIconTile g={g} icon="add" />
        <Text style={[styles.cardRowTitle, { color: g.text }]}>{label}</Text>
      </View>
    </KitCard>
  );
});

/** Строка карточки набора: слово, перевод, шеврон; долгое нажатие — меню «Редактировать / Удалить». */
export const EditorCardRow = memo(function EditorCardRow({ g, front, back, onPress, onLongPress, testID }: Readonly<{ g: GlassTokens; front: string; back: string; onPress: () => void; onLongPress: () => void; testID?: string }>) {
  return (
    <KitCard g={g} onPress={onPress} onLongPress={onLongPress} testID={testID} accessibilityLabel={back ? `${front}, ${back}` : front} style={styles.cardRowOuter}>
      <View style={styles.cardRow}>
        <View style={styles.cardRowText}>
          <Text style={[styles.cardRowTitle, { color: g.text }]}>{front}</Text>
          {back ? <Text style={[styles.cardRowSub, { color: g.secondary }]}>{back}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={g.secondary} />
      </View>
    </KitCard>
  );
});

export type EditorListRow = Readonly<{ key: string; front: string; back: string }>;

const REORDER_GAP = 9;
const REORDER_ROW_MIN_H = 70; // зачем (R1_DIFF_ONE_FIX, cards-v2-023): макет `.erow2` min-height 70
const REORDER_TAG = '[PACK-REORDER]';

/** Строка «Изменить набор» (макет cards-v2 `.erow`): ручка переноса слева, слово и перевод, корзина справа. Ручка двигает строку вверх-вниз, остальные расступаются. */
const ReorderRow = memo(function ReorderRow({ g, index, count, row, step, active, target, ty, onPress, onLongPress, onDelete, finishMove, onDragState, deleteLabel, gripLabel, onMeasure }: Readonly<{
  g: GlassTokens;
  index: number;
  count: number;
  row: EditorListRow;
  step: SharedValue<number>;
  active: SharedValue<number>;
  target: SharedValue<number>;
  ty: SharedValue<number>;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  finishMove: (from: number, to: number) => void;
  onDragState: (dragging: boolean) => void;
  deleteLabel: string;
  gripLabel: string;
  onMeasure: (height: number) => void;
}>) {
  const style = useAnimatedStyle(() => {
    const a = active.value;
    const t = target.value;
    if (a === index) return { transform: [{ translateY: ty.value }, { scale: 1.02 }], zIndex: 5 };
    let shift = 0;
    if (a >= 0 && a < t && index > a && index <= t) shift = -step.value;
    else if (a >= 0 && a > t && index < a && index >= t) shift = step.value;
    return { transform: [{ translateY: a < 0 ? 0 : withTiming(shift, { duration: 160 }) }, { scale: 1 }], zIndex: 0 };
  });
  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart(() => {
      active.value = index;
      target.value = index;
      ty.value = 0;
      runOnJS(onDragState)(true);
    })
    .onUpdate((event) => {
      ty.value = event.translationY;
      const raw = Math.round(index + event.translationY / step.value);
      target.value = Math.max(0, Math.min(count - 1, raw));
    })
    .onEnd(() => {
      const to = target.value;
      ty.value = withTiming((to - index) * step.value, { duration: 140 }, (finished) => {
        if (finished) runOnJS(finishMove)(index, to);
      });
    })
    .onFinalize((_event, success) => {
      if (!success) {
        active.value = -1;
        target.value = -1;
        ty.value = 0;
        runOnJS(onDragState)(false);
      }
    });
  return (
    <Animated.View style={style} onLayout={(event) => { if (index === 0) onMeasure(event.nativeEvent.layout.height); }}>
      <View style={[styles.erow, { boxShadow: plateBoxShadow(g) }]}>
        <PlateFill g={g} radius={16} />
        <GestureDetector gesture={pan}>
          <View testID={`ugc-pack-grip-${index}`} accessible accessibilityRole="adjustable" accessibilityLabel={gripLabel} hitSlop={{ left: 8, right: 8 }} style={styles.grip}>
            <Ionicons name="reorder-three" size={20} color={g.mutedText} />
          </View>
        </GestureDetector>
        <Pressable testID={`ugc-pack-card-${index}`} accessibilityRole="button" accessibilityLabel={row.back ? `${row.front}, ${row.back}` : row.front} onPress={onPress} onLongPress={onLongPress} style={styles.erowText}>
          <Text style={[styles.cardRowTitle, { color: g.text }]}>{row.front}</Text>
          {row.back ? <Text style={[styles.cardRowSub, { color: g.secondary }]}>{row.back}</Text> : null}
        </Pressable>
        <Pressable testID={`ugc-pack-card-delete-${index}`} accessibilityRole="button" accessibilityLabel={deleteLabel} hitSlop={6} onPress={onDelete} style={[styles.erowTrash, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}>
          <Ionicons name="trash-outline" size={18} color={g.bad} />
        </Pressable>
      </View>
    </Animated.View>
  );
});

/**
 * Список карточек набора в режиме «Изменить» — строки с ручкой переноса и корзиной.
 * зачем (Карточки 2.0, макет cards-v2 «Изменить набор»): порядок карточек меняют перетаскиванием за ручку, удаляют корзиной в строке.
 * Строки одной высоты (мин. 72, зазор 9): шаг переноса считается по первой строке.
 */
export const EditorCardList = memo(function EditorCardList({ g, rows, onPress, onLongPress, onDelete, onMove, onDragState, deleteLabel, gripLabel }: Readonly<{
  g: GlassTokens;
  rows: readonly EditorListRow[];
  onPress: (index: number) => void;
  onLongPress: (index: number) => void;
  onDelete: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onDragState: (dragging: boolean) => void;
  deleteLabel: string;
  gripLabel: string;
}>) {
  const step = useSharedValue(REORDER_ROW_MIN_H + REORDER_GAP);
  const active = useSharedValue(-1);
  const target = useSharedValue(-1);
  const ty = useSharedValue(0);
  const onMeasure = useCallback((height: number) => { step.value = height + REORDER_GAP; }, [step]);
  const finishMove = useCallback((from: number, to: number) => {
    console.log(`${REORDER_TAG} перенос ${from} → ${to} из ${rows.length}`);
    if (from !== to) onMove(from, to);
    // зачем: сначала отдаём новый порядок, затем (через два кадра) снимаем смещения — иначе строки на кадр прыгают
    requestAnimationFrame(() => requestAnimationFrame(() => {
      active.value = -1;
      target.value = -1;
      ty.value = 0;
      onDragState(false);
    }));
  }, [active, onDragState, onMove, rows.length, target, ty]);
  return (
    <View style={styles.list}>
      {rows.map((row, index) => (
        <ReorderRow
          key={row.key}
          g={g}
          index={index}
          count={rows.length}
          row={row}
          step={step}
          active={active}
          target={target}
          ty={ty}
          onPress={() => onPress(index)}
          onLongPress={() => onLongPress(index)}
          onDelete={() => onDelete(index)}
          finishMove={finishMove}
          onDragState={onDragState}
          deleteLabel={deleteLabel}
          gripLabel={gripLabel}
          onMeasure={onMeasure}
        />
      ))}
    </View>
  );
});

/** Нижняя шторка формы карточки (kit «.sheet»): ручка, заголовок 22/700 + крестик 35, содержимое. Поднимается над клавиатурой. */
export const EditorSheet = memo(function EditorSheet({ g, visible, title, closeLabel, onClose, bottomInset, children }: Readonly<{
  g: GlassTokens;
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** Высота клавиатуры/нижней панели, на которую шторка поднимается. */
  bottomInset: number;
  children: React.ReactNode;
}>) {
  React.useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [onClose, visible]);
  if (!visible) return null;
  const [a] = themePair(g);
  // зачем (Темы, DIFF_COLOR_TRIAGE 249bad18d, Г4; координатор 13.10; как 4863c136d): в тёмном оформлении заливка шторки — нейтральный градиент «Тени», а не 17 % тона темы; светлое — прежняя заливка.
  const neutralFill = shadowSheetGradient(g.isLight);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="ugc-pack-card-sheet">
      <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(200)} style={styles.dimLayer}>
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      {/* зачем (координатор 14.10, «ручка ⇒ свайп»): свайп вниз закрывает лист карточки тем же onClose, что крестик и фон. Лист position:absolute — пока без следования за пальцем (PM-302) */}
      <SheetSwipeClose name="ugc-pack-card" onClose={onClose} follow={false}>
      <Animated.View
        entering={SlideInDown.duration(260).easing(Easing.bezier(0.23, 1, 0.32, 1))}
        exiting={SlideOutDown.duration(200)}
        style={[styles.sheet, { bottom: bottomInset, paddingBottom: bottomInset > 0 ? 18 : 28 }]}>
        <LinearGradient pointerEvents="none" colors={neutralFill ? [neutralFill[0], neutralFill[1]] : [`${mixDark(a, g.opaqueSheet, 0.17)}FF`, `${g.opaqueSheet}FF`]} /* зачем (R1, cards-024; правило «стекло 2.0 непрозрачное»): заливка шторки плотная — через неё не должны читаться строки списка под ней (раньше альфа 0,92/0,90) */ locations={[0, 0.55]} start={{ x: 0.42, y: 0.01 }} end={{ x: 0.58, y: 0.99 }} style={[StyleSheet.absoluteFill, styles.sheetFill]} />
        <View style={[styles.grab, { backgroundColor: `${g.text}40` }]} />
        <View style={styles.sheetHead}>
          <Text accessibilityRole="header" style={[styles.sheetTitle, { color: g.text }]}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={8} onPress={onClose} style={({ pressed }) => [styles.closeBtn, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }, pressed && styles.pressed]}>
            <Ionicons name="close" size={18} color={g.text} />
          </Pressable>
        </View>
        {children}
        {/* зачем (Тень 12.10): внутренняя кромка шторки убрана — шторку отделяет затемнение */}
      </Animated.View>
      </SheetSwipeClose>
    </View>
  );
});

const styles = StyleSheet.create({
  levelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  levelChip: { minWidth: 54, height: 40, borderRadius: 20, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  levelChipText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  pressed: { opacity: 0.82 },
  dim: { opacity: 0.45 },
  header: { marginTop: 4, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 46 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, minWidth: 0, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  flab: { marginLeft: 4, marginBottom: 8, fontSize: 13, lineHeight: 17, fontWeight: '600' },
  field: { minHeight: 56, paddingHorizontal: 16, justifyContent: 'center' },
  fieldTall: { minHeight: 96, paddingVertical: 14, justifyContent: 'flex-start' },
  segWrap: { height: 50, padding: 4, flexDirection: 'row', gap: 0 },
  seg: { flex: 1, height: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  segDisabled: { opacity: 0.6 },
  segText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  list: { gap: REORDER_GAP },
  // зачем (R1_DIFF_ONE_FIX, cards-v2-023): макет `.erow2` — отступы 10/14, ручка svg 20 тонкая; текст начинался на ≈10 px дальше (ручка 36 → 26: 8 + 26 + 12 = 46 как в макете), область нажатия расширена hitSlop
  erow: { minHeight: REORDER_ROW_MIN_H, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 8, paddingRight: 14 },
  grip: { width: 26, height: 44, alignItems: 'center', justifyContent: 'center' },
  erowText: { flex: 1, minWidth: 0, justifyContent: 'center' },
  erowTrash: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardRowOuter: { minHeight: 70 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 13, paddingLeft: 19, paddingRight: 16 },
  cardRowText: { flex: 1, minWidth: 0 },
  cardRowTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  cardRowSub: { fontSize: 16, lineHeight: 21 },
  dimLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' }, // theme-exempt: затемнение под шторкой — тёмный скрим в любой теме
  sheet: { position: 'absolute', left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 18 },
  sheetFill: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grab: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 20 },
  sheetTitle: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  closeBtn: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
