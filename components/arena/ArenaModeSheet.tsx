import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { useArenaFontScale } from '../../hooks/use_arena_font_scale';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { hapticTap } from '../../hooks/use-haptics';

/**
 * Выбор режима матча — шторка по кнопке «Матч», как в «Карточках 2.1».
 *
 * Анимация: затемнение подложки, пружинный выезд листа, ступенчатое появление
 * карточек (по 45 мс друг за другом) и отдельная физика нажатия на каждой.
 * При Reduce Motion всё становится мгновенным, без единого движения.
 */

export type ArenaModeKey = 'quick' | 'ranked' | 'friend';

export type ArenaModeOption = Readonly<{
  key: ArenaModeKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  badge: string;
  accent?: boolean;
  disabled?: boolean;
}>;

const SPRING = { damping: 18, stiffness: 210, mass: 0.9 } as const;
const STAGGER_MS = 45;

function ModeRow({
  option,
  index,
  visible,
  reduceMotion,
  onPress,
}: {
  option: ArenaModeOption;
  index: number;
  visible: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const P = useTournamentPalette();
  // Высота строки числом не растёт вместе с системным шрифтом — при
  // крупном кегле строки наезжали друг на друга. См. use_arena_font_scale.
  const bodyLine = { lineHeight: 18 * useArenaFontScale() };
  const enter = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) { enter.value = visible ? 1 : 0; return; }
    enter.value = visible
      ? withDelay(index * STAGGER_MS, withSpring(1, SPRING))
      : withTiming(0, { duration: 120 });
  }, [enter, index, reduceMotion, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * 22 },
      { scale: (0.96 + enter.value * 0.04) * (1 - press.value * 0.03) },
    ],
  }));

  const tint = option.accent ? P.accent : P.text;
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${option.title}. ${option.body}`}
        accessibilityState={{ disabled: Boolean(option.disabled) }}
        testID={`arena-mode-${option.key}`}
        disabled={option.disabled}
        onPressIn={() => { press.value = reduceMotion ? 0 : withTiming(1, { duration: 90 }); }}
        onPressOut={() => { press.value = reduceMotion ? 0 : withSpring(0, SPRING); }}
        onPress={() => { void hapticTap(); onPress(); }}
        style={[
          styles.row,
          {
            backgroundColor: option.accent ? P.accentSoft : P.elev2,
            borderColor: option.accent ? P.accent : 'transparent',
            opacity: option.disabled ? 0.45 : 1,
          },
        ]}
      >
        <View style={[styles.iconPlate, { backgroundColor: option.accent ? P.accent : P.elev }]}>
          <Ionicons name={option.icon} size={23} color={option.accent ? P.accentText : tint} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: P.text }]}>{option.title}</Text>
          <Text style={[styles.body, bodyLine, { color: P.muted }]}>{option.body}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: P.elev }]}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.4} style={[styles.badgeText, { color: P.muted }]}>{option.badge}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ArenaModeSheetBase({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly ArenaModeOption[];
  onSelect: (key: ArenaModeKey) => void;
  onClose: () => void;
}) {
  const P = useTournamentPalette();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { height } = useWindowDimensions();
  const sheet = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) { sheet.value = visible ? 1 : 0; return; }
    sheet.value = visible
      ? withSpring(1, SPRING)
      : withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) });
  }, [reduceMotion, sheet, visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: sheet.value * 0.62 }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - sheet.value) * Math.min(340, height * 0.45) }],
    opacity: 0.4 + sheet.value * 0.6,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              backgroundColor: P.bg,
              paddingBottom: Math.max(18, insets.bottom + 10),
              // Потолок высоты и прокрутка списка: при крупном системном
              // шрифте четыре-пять режимов с описаниями перерастали экран, и
              // лист уезжал ВВЕРХ за верхний край — заголовок и первые режимы
              // становились недоступны совсем. Ручка и заголовок остаются
              // снаружи прокрутки, чтобы шторка читалась как шторка.
              maxHeight: height * 0.86,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: P.elev2 }]} />
          <Text style={[styles.sheetTitle, { color: P.text }]}>{title}</Text>
          <ScrollView style={styles.listScroll} contentContainerStyle={styles.list}>
            {options.map((option, index) => (
              <ModeRow
                key={option.key}
                option={option}
                index={index}
                visible={visible}
                reduceMotion={reduceMotion}
                onPress={() => onSelect(option.key)}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export const ArenaModeSheet = memo(ArenaModeSheetBase);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: '#000' },
  sheet: {
    // Тот же потолок ширины, что у содержимого экранов: на планшете шторка во
    // всю ширину выглядит чужой рядом с колонкой карточек.
    alignSelf: 'center',
    width: '100%',
    maxWidth: 620,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 14,
  },
  grabber: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  listScroll: { flexShrink: 1 },
  list: { gap: 10, paddingBottom: 2 },
  row: {
    minHeight: 76,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 12,
  },
  iconPlate: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16.5, fontWeight: '900' },
  body: { marginTop: 2, fontSize: 13, fontWeight: '600' },
  badge: { minHeight: 26, borderRadius: 999, paddingHorizontal: 10, justifyContent: 'center' },
  badgeText: { fontSize: 11.5, fontWeight: '800' },
});
