import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityActionEvent,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { Achievement } from '../../app/achievements';
import { achievementNameForLang } from '../../app/achievements';
import {
  achievementShelfIndexFromOffset,
  achievementShelfIndicator,
  achievementShelfItemWidth,
  achievementShelfSideInset,
} from '../../app/achievement_shelf_model';
import { triLang } from '../../constants/i18n';
import { ACHIEVEMENT_SHELF_HYBRID } from '../../constants/motionHybrid';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotionPreference } from '../../hooks/use_reduce_motion';
import { LinearGradient } from '../SafeLinearGradient';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import AchievementShelfStageArt from './AchievementShelfStageArt';
import { achievementShelfMaterials } from './achievementShelfMaterials';

type Props = {
  items: readonly Achievement[];
  selectedId: string | null;
  viewportWidth: number;
  onSelected: (achievement: Achievement) => void;
  onOpen: (achievement: Achievement) => void;
  renderTrophy: (achievement: Achievement, size: number) => React.ReactNode;
  renderDetail: (achievement: Achievement) => React.ReactNode;
};

export default function AchievementShelfCarousel({
  items,
  selectedId,
  viewportWidth,
  onSelected,
  onOpen,
  renderTrophy,
  renderDetail,
}: Props) {
  const { theme: t, f, isDark } = useTheme();
  const { lang } = useLang();
  // Until the OS preference resolves, keep the first frame still. Otherwise a
  // reduce-motion user can briefly receive the entrance sweep on every mount.
  const reduceMotion = useReduceMotionPreference() ?? true;
  const materials = useMemo(() => achievementShelfMaterials(t, isDark), [isDark, t]);
  const reflectionProgress = useSharedValue(0);
  const detailProgress = useSharedValue(1);
  const listRef = useRef<Animated.FlatList<Achievement>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const lastHapticAt = useRef(Number.NEGATIVE_INFINITY);
  const itemWidth = achievementShelfItemWidth(viewportWidth);
  const sideInset = achievementShelfSideInset(viewportWidth, itemWidth);
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selectedId));
  const selectedItem = items[selectedIndex] ?? null;
  const itemsKey = useMemo(() => items.map((item) => item.id).join('|'), [items]);
  const indicator = achievementShelfIndicator(selectedIndex, items.length);

  useEffect(() => {
    cancelAnimation(reflectionProgress);
    reflectionProgress.value = 0;
    if (reduceMotion || !selectedId) {
      return () => cancelAnimation(reflectionProgress);
    }

    reflectionProgress.value = withDelay(
      ACHIEVEMENT_SHELF_HYBRID.reflectionDelayMs,
      withTiming(1, {
        duration: ACHIEVEMENT_SHELF_HYBRID.reflectionMs,
        easing: Easing.out(Easing.cubic),
      }),
    );
    return () => cancelAnimation(reflectionProgress);
  }, [reduceMotion, reflectionProgress, selectedId]);

  const reflectionStyle = useAnimatedStyle(() => ({
    opacity: Math.sin(Math.PI * reflectionProgress.value),
    transform: [{
      translateX: interpolate(
        reflectionProgress.value,
        [0, 1],
        [
          ACHIEVEMENT_SHELF_HYBRID.reflectionStartX,
          ACHIEVEMENT_SHELF_HYBRID.reflectionTravel,
        ],
      ),
    }],
  }));

  useEffect(() => {
    cancelAnimation(detailProgress);
    if (reduceMotion) {
      detailProgress.value = 1;
      return () => cancelAnimation(detailProgress);
    }
    detailProgress.value = 0;
    detailProgress.value = withTiming(1, {
      duration: ACHIEVEMENT_SHELF_HYBRID.detailFadeMs,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(detailProgress);
  }, [detailProgress, reduceMotion, selectedId]);

  const detailStyle = useAnimatedStyle(() => ({
    opacity: detailProgress.value,
    transform: reduceMotion
      ? []
      : [{
        translateY: (1 - detailProgress.value) * ACHIEVEMENT_SHELF_HYBRID.detailTranslateY,
      }],
  }));

  useEffect(() => {
    if (!items.length) return;
    const nextIndex = Math.max(0, items.findIndex((item) => item.id === selectedId));
    listRef.current?.scrollToOffset({ offset: nextIndex * itemWidth, animated: false });
  }, [itemWidth, itemsKey]);

  const selectIndex = useCallback((nextIndex: number, animated: boolean) => {
    const next = items[Math.max(0, Math.min(items.length - 1, nextIndex))];
    if (!next) return;

    listRef.current?.scrollToOffset({
      offset: Math.max(0, items.indexOf(next)) * itemWidth,
      animated: animated && !reduceMotion,
    });
    if (next.id !== selectedId) {
      const now = Date.now();
      if (now - lastHapticAt.current >= ACHIEVEMENT_SHELF_HYBRID.selectionHapticMinIntervalMs) {
        lastHapticAt.current = now;
        void hapticTap();
      }
      onSelected(next);
    }
  }, [itemWidth, items, onSelected, reduceMotion, selectedId]);

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    selectIndex(
      achievementShelfIndexFromOffset(event.nativeEvent.contentOffset.x, itemWidth, items.length),
      false,
    );
  }, [itemWidth, items.length, selectIndex]);

  const accessibilityActions = useMemo(() => [
    {
      name: 'increment' as const,
      label: triLang(lang, {
        ru: 'Следующая награда', uk: 'Наступна нагорода', es: 'Siguiente recompensa',
        'pt-BR': 'Próxima recompensa', vi: 'Phần thưởng tiếp theo', id: 'Hadiah berikutnya',
        tr: 'Sonraki ödül', pl: 'Następna nagroda',
      }),
    },
    {
      name: 'decrement' as const,
      label: triLang(lang, {
        ru: 'Предыдущая награда', uk: 'Попередня нагорода', es: 'Recompensa anterior',
        'pt-BR': 'Recompensa anterior', vi: 'Phần thưởng trước', id: 'Hadiah sebelumnya',
        tr: 'Önceki ödül', pl: 'Poprzednia nagroda',
      }),
    },
    {
      name: 'activate' as const,
      label: triLang(lang, {
        ru: 'Открыть награду', uk: 'Відкрити нагороду', es: 'Abrir recompensa',
        'pt-BR': 'Abrir recompensa', vi: 'Mở phần thưởng', id: 'Buka hadiah',
        tr: 'Ödülü aç', pl: 'Otwórz nagrodę',
      }),
    },
  ], [lang]);
  const accessibilityPosition = triLang(lang, {
    ru: `${selectedIndex + 1} из ${items.length}`,
    uk: `${selectedIndex + 1} з ${items.length}`,
    es: `${selectedIndex + 1} de ${items.length}`,
    'pt-BR': `${selectedIndex + 1} de ${items.length}`,
    vi: `${selectedIndex + 1} / ${items.length}`,
    id: `${selectedIndex + 1} dari ${items.length}`,
    tr: `${selectedIndex + 1} / ${items.length}`,
    pl: `${selectedIndex + 1} z ${items.length}`,
  });

  const onAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') selectIndex(selectedIndex + 1, true);
    if (event.nativeEvent.actionName === 'decrement') selectIndex(selectedIndex - 1, true);
    if (event.nativeEvent.actionName === 'activate' && selectedItem) onOpen(selectedItem);
  }, [onOpen, selectIndex, selectedIndex, selectedItem]);

  if (!selectedItem) return null;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.showcase,
          {
            borderColor: materials.border,
            backgroundColor: t.bgCard,
            shadowColor: materials.shadowDark,
          },
        ]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${achievementNameForLang(selectedItem, lang)}. ${accessibilityPosition}`}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={onAccessibilityAction}
      >
        <LinearGradient
          pointerEvents="none"
          colors={materials.stageGradient}
          locations={[0, 0.58, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AchievementShelfStageArt
          materials={materials}
          reflectionStyle={reflectionStyle}
        >
          <Animated.FlatList<Achievement>
            ref={listRef}
            horizontal
            data={items as Achievement[]}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={itemWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            bounces={items.length > 1}
            contentContainerStyle={{ paddingHorizontal: sideInset }}
            getItemLayout={(_, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMomentumScrollEnd}
            renderItem={({ item, index }) => {
              const inputRange = [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth];
              const opacity = reduceMotion
                ? (item.id === selectedId
                  ? ACHIEVEMENT_SHELF_HYBRID.selectedOpacity
                  : ACHIEVEMENT_SHELF_HYBRID.neighborOpacity)
                : scrollX.interpolate({
                  inputRange,
                  outputRange: [
                    ACHIEVEMENT_SHELF_HYBRID.neighborOpacity,
                    ACHIEVEMENT_SHELF_HYBRID.selectedOpacity,
                    ACHIEVEMENT_SHELF_HYBRID.neighborOpacity,
                  ],
                  extrapolate: 'clamp',
                });
              const scale = reduceMotion
                ? (item.id === selectedId
                  ? ACHIEVEMENT_SHELF_HYBRID.selectedScale
                  : ACHIEVEMENT_SHELF_HYBRID.neighborScale)
                : scrollX.interpolate({
                  inputRange,
                  outputRange: [
                    ACHIEVEMENT_SHELF_HYBRID.neighborScale,
                    ACHIEVEMENT_SHELF_HYBRID.selectedScale,
                    ACHIEVEMENT_SHELF_HYBRID.neighborScale,
                  ],
                  extrapolate: 'clamp',
                });

              return (
                <View style={[styles.item, { width: itemWidth }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: item.id === selectedId }}
                    onPress={() => item.id === selectedId ? onOpen(item) : selectIndex(index, true)}
                    style={styles.trophyPressable}
                  >
                    <Animated.View style={{ opacity, transform: [{ scale }] }}>
                      {renderTrophy(item, Math.min(180, Math.round(itemWidth * 0.9)))}
                    </Animated.View>
                  </Pressable>
                </View>
              );
            }}
          />
        </AchievementShelfStageArt>
      </View>

      <View style={styles.indicator}>
        {indicator.kind === 'dots' ? Array.from({ length: indicator.total }, (_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index === indicator.active ? t.accent : t.textGhost + '55' },
            ]}
          />
        )) : (
          <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800' }}>
            {indicator.label}
          </Text>
        )}
      </View>

      <Reanimated.View style={detailStyle}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen(selectedItem)}
          style={({ pressed }) => [styles.detail, { opacity: pressed ? 0.86 : 1 }]}
        >
          {renderDetail(selectedItem)}
        </Pressable>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  showcase: {
    height: 276,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  item: {
    height: 254,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 49,
  },
  trophyPressable: {
    minWidth: 150,
    minHeight: 184,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  indicator: {
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detail: {
    borderRadius: 20,
  },
});
