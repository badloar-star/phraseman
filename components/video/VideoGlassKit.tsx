import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from '../SafeLinearGradient';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { nestedBoxShadow, PlateFill, plateBoxShadow, useShadowGlass } from '../v2/ShadowSurface';

const MEDIA_INK = '#FFFFFF'; // theme-exempt: белый значок/текст поверх видео — в любой теме

// зачем (владелец 2026-09-29): вкладка «Видео» переносится 1 в 1 по макету video.html
// (Liquid Glass). Общие кирпичи собраны здесь один раз: стеклянный блик плашки, круглая
// кнопка «play» поверх кадра, центрированное состояние (плитка + фраза + «Повторить»),
// плашка-заметка «нет сети / устарел». Токены — только liquidGlassTokens (13 тем);
// обводок нет (стиль «Тень», владелец 12.10): плашку отделяет градиент и тень (components/v2/ShadowSurface).

export type VideoGlassTokens = ReturnType<typeof liquidGlassTokens>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Материал плашки: лёгкий блюр + верхний блик (тот же, что в SettingsGlassRows); кромки нет — стиль «Тень». */
export function VideoGlassSheen({ tint }: { tint: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* зачем: владелец 18.10 — ореол текста от BlurView без blurTarget (на Android dimezis снимает экран вместе с текстом плашки
          и кладёт размытую копию под него). На Android живой блюр выключен, градиент-блик остаётся; iOS как было. */}
      {Platform.OS !== 'android' ? (
        <BlurView
          intensity={16}
          blurReductionFactor={3}
          experimentalBlurMethod="none"
          tint="systemUltraThinMaterialDark"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <LinearGradient colors={[tint, 'transparent']} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/** `.thumb .pl` макета: тёмный круг 44 (в узком ряду 28) с белым треугольником, слева-снизу кадра. */
export function VideoPlayBadge({ small = false }: { small?: boolean }) {
  const size = small ? 28 : 44;
  const g = useShadowGlass();
  return (
    <View
      pointerEvents="none"
      style={[
        styles.playBadge,
        small ? styles.playBadgeSmall : null,
        { width: size, height: size, borderRadius: size / 2, boxShadow: nestedBoxShadow(g) },
      ]}
    >
      <Ionicons name="play" size={small ? 14 : 22} color={MEDIA_INK} style={styles.playGlyph} />
    </View>
  );
}

/**
 * Центрированное состояние экрана (`empty` / `error` макета): плитка 61 с иконкой,
 * фраза 16/22 и, если нужна, кнопка «Повторить» (`.cta.sm`).
 */
export function VideoStateBlock({ g, icon, text, testID, actionLabel, actionTestID, actionDisabled, onAction, style }: {
  g: VideoGlassTokens;
  icon: IconName;
  text: string;
  testID?: string;
  actionLabel?: string;
  actionTestID?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View testID={testID} style={[styles.state, style]}>
      <View style={[styles.stateTile, { backgroundColor: g.opaqueControl }]}>
        <Ionicons name={icon} size={26} color={g.text} />
      </View>
      <Text style={[styles.stateText, { color: g.secondary }]}>{text}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          testID={actionTestID}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          disabled={actionDisabled}
          onPress={onAction}
          activeOpacity={0.85}
          style={[styles.stateAction, { backgroundColor: g.accent }, actionDisabled ? styles.stateActionDisabled : null]}
        >
          <Text style={[styles.stateActionText, { color: g.accentInk }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** `.note` макета: плашка «Показываем сохранённый каталог» / «Каталог давно не обновлялся». */
export function VideoNote({ g, icon, text, testID }: { g: VideoGlassTokens; icon: IconName; text: string; testID?: string }) {
  return (
    <View testID={testID} style={[styles.note, { boxShadow: plateBoxShadow(g) }]}>
      <PlateFill g={g} radius={14} />
      <Ionicons name={icon} size={20} color={g.text} />
      <Text style={[styles.noteText, { color: g.secondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  playBadge: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // theme-exempt: скрим/плашка поверх видео — тёмная в любой теме
  },
  playBadgeSmall: { left: 8, bottom: 7 },
  playGlyph: { marginLeft: 2 },
  state: { alignItems: 'center', paddingTop: 96, paddingHorizontal: 20 },
  stateTile: { width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stateText: { marginTop: 18, fontSize: 16, lineHeight: 22, textAlign: 'center', fontWeight: '500' },
  stateAction: { marginTop: 22, minHeight: 44, paddingHorizontal: 22, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stateActionDisabled: { opacity: 0.55 },
  stateActionText: { fontSize: 16, fontWeight: '600' },
  note: {
    minHeight: 44,
    borderRadius: 14,
    // зачем (Тень 12.10): overflow убран — иначе клип тени плашки; кромки нет
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  noteText: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '400' },
});
