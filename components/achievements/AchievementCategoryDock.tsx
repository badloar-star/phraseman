import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ACHIEVEMENT_CATEGORY_DOCK_HYBRID } from '../../constants/motionHybrid';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotionPreference } from '../../hooks/use_reduce_motion';
import { useScreen } from '../../hooks/use-screen';
import { useTheme } from '../ThemeContext';

export type AchievementCategoryOption<T extends string = string> = {
  id: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props<T extends string> = {
  options: readonly AchievementCategoryOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  openLabel: string;
  closeLabel: string;
};

type OptionRowProps<T extends string> = {
  option: AchievementCategoryOption<T>;
  index: number;
  total: number;
  open: boolean;
  selected: boolean;
  reduceMotion: boolean;
  onPress: () => void;
};

function CategoryOptionRow<T extends string>({
  option,
  index,
  total,
  open,
  selected,
  reduceMotion,
  onPress,
}: OptionRowProps<T>) {
  const { theme: t, f } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    const target = open ? 1 : 0;
    if (reduceMotion) {
      progress.value = withTiming(target, {
        duration: ACHIEVEMENT_CATEGORY_DOCK_HYBRID.reducedMotionMs,
      });
      return () => cancelAnimation(progress);
    }

    const order = open ? total - index - 1 : index;
    progress.value = withDelay(
      order * ACHIEVEMENT_CATEGORY_DOCK_HYBRID.rowStaggerMs,
      withSpring(
        target,
        open
          ? ACHIEVEMENT_CATEGORY_DOCK_HYBRID.springOpen
          : ACHIEVEMENT_CATEGORY_DOCK_HYBRID.springClose,
      ),
    );
    return () => cancelAnimation(progress);
  }, [index, open, progress, reduceMotion, total]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduceMotion
      ? []
      : [
        {
          translateY:
            (1 - progress.value) * ACHIEVEMENT_CATEGORY_DOCK_HYBRID.rowTranslateY,
        },
        {
          scale:
            ACHIEVEMENT_CATEGORY_DOCK_HYBRID.rowScaleFrom
            + progress.value * (1 - ACHIEVEMENT_CATEGORY_DOCK_HYBRID.rowScaleFrom),
        },
      ],
  }));

  return (
    <Reanimated.View style={animatedStyle} pointerEvents={open ? 'auto' : 'none'}>
      <Pressable
        testID={`achievement-category-option-${option.id}`}
        accessibilityRole="button"
        accessibilityLabel={option.label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.option,
          {
            minHeight: ACHIEVEMENT_CATEGORY_DOCK_HYBRID.rowMinHeight,
            backgroundColor: selected ? t.accentBg : t.bgCard,
            borderColor: selected ? t.accent : t.border,
            opacity: pressed ? 0.84 : 1,
            shadowColor: t.cardShadow,
          },
        ]}
      >
        <View style={[styles.optionIcon, { backgroundColor: t.accentBg }]}>
          <Ionicons name={option.icon} size={18} color={t.accent} />
        </View>
        <Text
          numberOfLines={1}
          style={{ color: t.textPrimary, fontSize: f.body, fontWeight: selected ? '900' : '700', flex: 1 }}
        >
          {option.label}
        </Text>
        {selected ? <Ionicons name="checkmark" size={19} color={t.accent} /> : null}
      </Pressable>
    </Reanimated.View>
  );
}

export default function AchievementCategoryDock<T extends string>({
  options,
  selectedId,
  onSelect,
  openLabel,
  closeLabel,
}: Props<T>) {
  const { theme: t, f } = useTheme();
  // Unknown is treated as reduced motion so the menu never animates before the
  // operating-system preference has been read.
  const reduceMotion = useReduceMotionPreference() ?? true;
  const { height } = useWindowDimensions();
  const { bottomInset, insets } = useScreen();
  const [open, setOpen] = useState(false);
  const scrim = useSharedValue(0);
  const selected = options.find((option) => option.id === selectedId) ?? options[0];
  const dockBottom = bottomInset + ACHIEVEMENT_CATEGORY_DOCK_HYBRID.dockBottomGap;
  const menuBottom = dockBottom
    + ACHIEVEMENT_CATEGORY_DOCK_HYBRID.capsuleMinHeight
    + ACHIEVEMENT_CATEGORY_DOCK_HYBRID.menuGap;
  const menuMaxHeight = Math.min(
    ACHIEVEMENT_CATEGORY_DOCK_HYBRID.menuMaxHeight,
    Math.max(
      ACHIEVEMENT_CATEGORY_DOCK_HYBRID.menuMinHeight,
      height - insets.top - menuBottom - ACHIEVEMENT_CATEGORY_DOCK_HYBRID.headerClearance,
    ),
  );

  useEffect(() => {
    cancelAnimation(scrim);
    scrim.value = withTiming(open ? 1 : 0, {
      duration: reduceMotion
        ? ACHIEVEMENT_CATEGORY_DOCK_HYBRID.reducedMotionMs
        : ACHIEVEMENT_CATEGORY_DOCK_HYBRID.scrimMs,
    });
    return () => cancelAnimation(scrim);
  }, [open, reduceMotion, scrim]);

  useEffect(() => {
    if (!open) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false);
      return true;
    });
    return () => subscription.remove();
  }, [open]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrim.value * ACHIEVEMENT_CATEGORY_DOCK_HYBRID.scrimOpacity,
  }));

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => {
    void hapticTap();
    setOpen((current) => !current);
  }, []);
  const select = useCallback((id: T) => {
    void hapticTap();
    onSelect(id);
    setOpen(false);
  }, [onSelect]);
  const optionRows = useMemo(() => options.map((option, index) => (
    <CategoryOptionRow
      key={option.id}
      option={option}
      index={index}
      total={options.length}
      open={open}
      selected={option.id === selectedId}
      reduceMotion={reduceMotion}
      onPress={() => select(option.id)}
    />
  )), [open, options, reduceMotion, select, selectedId]);

  if (!selected) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      <Reanimated.View
        pointerEvents={open ? 'auto' : 'none'}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        style={[StyleSheet.absoluteFillObject, styles.scrim, scrimStyle]}
      >
        <Pressable
          testID="achievement-category-dock-scrim"
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={close}
          style={StyleSheet.absoluteFillObject}
        />
      </Reanimated.View>

      <View
        pointerEvents={open ? 'box-none' : 'none'}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        style={[styles.menuDock, { bottom: menuBottom }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: menuMaxHeight }}
          contentContainerStyle={{ gap: ACHIEVEMENT_CATEGORY_DOCK_HYBRID.rowGap }}
        >
          {optionRows}
        </ScrollView>
      </View>

      <View pointerEvents="box-none" style={[styles.capsuleDock, { bottom: dockBottom }]}>
        <Pressable
          testID="achievement-category-dock"
          accessibilityRole="button"
          accessibilityLabel={open ? closeLabel : openLabel}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          style={({ pressed }) => [
            styles.capsule,
            {
              minHeight: ACHIEVEMENT_CATEGORY_DOCK_HYBRID.capsuleMinHeight,
              paddingHorizontal: ACHIEVEMENT_CATEGORY_DOCK_HYBRID.capsuleHorizontalPadding,
              gap: ACHIEVEMENT_CATEGORY_DOCK_HYBRID.capsuleGap,
              backgroundColor: t.bgCard,
              borderColor: open ? t.accent : t.borderHighlight,
              opacity: pressed ? 0.86 : 1,
              shadowColor: t.shadowDark,
            },
          ]}
        >
          <View style={[styles.capsuleIcon, { backgroundColor: t.accentBg }]}>
            <Ionicons name={selected.icon} size={18} color={t.accent} />
          </View>
          <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
            {selected.label}
          </Text>
          <Ionicons name={open ? 'chevron-down' : 'chevron-up'} size={17} color={t.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: '#000000',
  },
  menuDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  option: {
    width: 244,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 7,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  capsule: {
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  capsuleIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
