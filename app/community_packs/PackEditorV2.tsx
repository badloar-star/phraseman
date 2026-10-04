/**
 * Детали экрана «Новый набор / Изменить набор» — макет docs/design/v2-app/cards-section.html (кадры «Новый набор», «Новая карточка», «Изменить набор»).
 *
 * зачем (владелец: «в приложении запрещены любые различия с одобренными макетами»): шапка «крестик + заголовок слева», подпись над полем 13/600,
 * поле 56 высотой r14, переключатель «Только я / Все» вместо тумблера, строки карточек и «Добавить карточку» как карточки макета,
 * форма новой карточки — нижней шторкой. Только вид; данные, черновик, проверки и публикация остаются в community_pack_create.tsx.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { KitCard, KitIconTile, KitSurface } from '../../components/cards-grid/CardsKit';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { mixDark, themePair } from '../../components/mistakes-panel/panelPaint';

/** Шапка: круглый «крестик» 42, заголовок слева 20/700, справа необязательное действие. */
export const EditorHeader = memo(function EditorHeader({ g, title, closeLabel, onClose, right }: Readonly<{ g: GlassTokens; title: string; closeLabel: string; onClose: () => void; right?: React.ReactNode }>) {
  return (
    <View style={styles.header}>
      <Pressable testID="ugc-pack-back" accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={6} onPress={onClose} style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
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
      style={[styles.seg, on && { backgroundColor: g.accent, boxShadow: [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,0.12)' }, { offsetX: 0, offsetY: 4, blurRadius: 12, spreadDistance: -6, color: 'rgba(0,0,0,0.8)' }] }, disabled && styles.segDisabled]}>
      <Ionicons name={icon} size={16} color={on ? g.accentInk : g.secondary} />
      <Text style={[styles.segText, { color: on ? g.accentInk : g.secondary }]}>{text}</Text>
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
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="ugc-pack-card-sheet">
      <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(200)} style={styles.dimLayer}>
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(260).easing(Easing.bezier(0.23, 1, 0.32, 1))}
        exiting={SlideOutDown.duration(200)}
        style={[styles.sheet, { bottom: bottomInset, paddingBottom: bottomInset > 0 ? 18 : 28 }]}>
        <LinearGradient pointerEvents="none" colors={[`${mixDark(a, '#101014', 0.17)}EA`, 'rgba(16,16,20,0.9)']} locations={[0, 0.55]} start={{ x: 0.42, y: 0.01 }} end={{ x: 0.58, y: 0.99 }} style={[StyleSheet.absoluteFill, styles.sheetFill]} />
        <View style={styles.grab} />
        <View style={styles.sheetHead}>
          <Text accessibilityRole="header" style={[styles.sheetTitle, { color: g.text }]}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={8} onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
            <Ionicons name="close" size={18} color={g.text} />
          </Pressable>
        </View>
        {children}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.sheetFill, { boxShadow: [{ inset: true, offsetX: 0, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: 'rgba(255,255,255,0.2)' }, { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: 'rgba(255,255,255,0.05)' }] }]} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.82 },
  dim: { opacity: 0.45 },
  header: { marginTop: 4, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 46 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  headerTitle: { flex: 1, minWidth: 0, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  flab: { marginLeft: 4, marginBottom: 8, fontSize: 13, lineHeight: 16, fontWeight: '600' },
  field: { minHeight: 56, paddingHorizontal: 16, justifyContent: 'center' },
  fieldTall: { minHeight: 96, paddingVertical: 14, justifyContent: 'flex-start' },
  segWrap: { height: 50, padding: 4, flexDirection: 'row', gap: 0 },
  seg: { flex: 1, height: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  segDisabled: { opacity: 0.6 },
  segText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  cardRowOuter: { minHeight: 70 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 13, paddingLeft: 19, paddingRight: 16 },
  cardRowText: { flex: 1, minWidth: 0 },
  cardRowTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  cardRowSub: { fontSize: 15, lineHeight: 19 },
  dimLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 18 },
  sheetFill: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grab: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#4A4A4E', alignSelf: 'center', marginBottom: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 20 },
  sheetTitle: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  closeBtn: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
});
